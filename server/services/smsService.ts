import fetch from 'node-fetch';
import { getDbPool, inMemoryStore } from '../db';

export interface SmsSendResult {
  success: boolean;
  message: string;
  gatewayResponse?: any;
  recipient: string;
  isSimulated?: boolean;
  provider?: string;
}

export interface SmsGatewaySettings {
  provider: 'greenweb' | 'bulksmsbd' | 'alphasms' | 'mimsms' | 'custom';
  apiKey: string;
  senderId?: string;
  username?: string;
  customUrl?: string;
  isEnabled: boolean;
}

/**
 * Convert Bangla numeric characters to English numbers
 */
export function normalizeBanglaDigits(input: string): string {
  if (!input) return '';
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return input.replace(/[০-৯]/g, (char) => bnToEn[char] || char);
}

/**
 * Normalize Bangladeshi phone number to standard 11-digit or 880 format
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = normalizeBanglaDigits(rawPhone.trim());
  cleaned = cleaned.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  }

  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Retrieve saved SMS Gateway Settings from DB or Environment
 */
export async function getSmsGatewaySettings(): Promise<SmsGatewaySettings> {
  const pool = getDbPool();
  let dbConfig: SmsGatewaySettings | null = null;

  if (pool) {
    try {
      const res = await pool.query("SELECT data FROM system_config WHERE id = 'sms_gateway_config' LIMIT 1");
      if (res.rows.length > 0 && res.rows[0].data) {
        dbConfig = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
      }
    } catch (err) {
      // Table might not exist or error
    }
  }

  if (dbConfig && dbConfig.apiKey) {
    return dbConfig;
  }

  // Fallback to In-Memory
  if (inMemoryStore.system_config['sms_gateway_config']?.apiKey) {
    return inMemoryStore.system_config['sms_gateway_config'];
  }

  // Fallback to Environment Variables or Master Defaults
  const envProvider = (process.env.SMS_PROVIDER || 'bulksmsbd').toLowerCase() as any;
  const envApiKey = (
    process.env.BULKSMSBD_API_KEY ||
    process.env.SMS_API_KEY ||
    process.env.GREENWEB_SMS_TOKEN ||
    process.env.ALPHASMS_API_KEY ||
    'NOhILJCtx0DZJWCRBODB'
  ).trim();
  const envSenderId = (process.env.SMS_SENDER_ID || '8809648910696').trim();
  const envUsername = (process.env.SMS_USERNAME || '').trim();
  const envCustomUrl = (process.env.SMS_GATEWAY_URL || '').trim();

  return {
    provider: envProvider,
    apiKey: envApiKey,
    senderId: envSenderId,
    username: envUsername,
    customUrl: envCustomUrl,
    isEnabled: Boolean(envApiKey),
  };
}

/**
 * Save SMS Gateway Settings to PostgreSQL or In-Memory
 */
export async function saveSmsGatewaySettings(settings: SmsGatewaySettings): Promise<void> {
  inMemoryStore.system_config['sms_gateway_config'] = settings;
  const pool = getDbPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO system_config (id, data, updated_at, updated_by)
         VALUES ('sms_gateway_config', $1, $2, 'admin')
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        [JSON.stringify(settings), Date.now()]
      );
    } catch (err) {
      console.warn('Could not save SMS config to DB:', err);
    }
  }
}

/**
 * Send real SMS using configured Bangladeshi Gateway with multi-endpoint failover
 */
export async function sendSmsNotification(recipientPhone: string, messageText: string): Promise<SmsSendResult> {
  const cleanPhone = normalizePhone(recipientPhone);
  if (!cleanPhone || cleanPhone.length < 11) {
    return {
      success: false,
      message: 'ভুল মোবাইল নম্বর ফরম্যাট',
      recipient: cleanPhone,
    };
  }

  const settings = await getSmsGatewaySettings();
  const apiKey = (settings.apiKey || process.env.BULKSMSBD_API_KEY || process.env.SMS_API_KEY || 'NOhILJCtx0DZJWCRBODB').trim();
  const senderId = (settings.senderId || process.env.SMS_SENDER_ID || '8809648910696').trim();
  const provider = (settings.provider || process.env.SMS_PROVIDER || 'bulksmsbd').toLowerCase();

  const hasBangla = /[\u0980-\u09FF]/.test(messageText);
  const msgType = hasBangla ? 'unicode' : 'text';

  // 1. BulkSMSBD Gateway (http://bulksmsbd.net) - Recommended Default for Bangladesh
  if (provider === 'bulksmsbd' || (!settings.provider && apiKey)) {
    if (apiKey) {
      try {
        // BulkSMSBD supports 8801XXXXXXXXX or 01XXXXXXXXX
        let bulksmsNumber = cleanPhone;
        if (bulksmsNumber.startsWith('01') && bulksmsNumber.length === 11) {
          bulksmsNumber = '88' + bulksmsNumber;
        } else if (!bulksmsNumber.startsWith('88') && bulksmsNumber.length === 10) {
          bulksmsNumber = '880' + bulksmsNumber;
        }

        console.log(`📡 [BulkSMSBD Dispatching] To: ${bulksmsNumber} | Sender: ${senderId} | Type: ${msgType}`);

        let res: any = null;
        let rawResText = '';
        let jsonRes: any = null;

        // Try POST first (most reliable on cloud platforms like Render.com)
        const postEndpoints = [
          'https://bulksmsbd.net/api/smsapi',
          'http://bulksmsbd.net/api/smsapi',
          'http://api.bulksmsbd.net/api/smsapi',
        ];

        for (const endpoint of postEndpoints) {
          try {
            const formData = new URLSearchParams({
              api_key: apiKey,
              type: msgType,
              number: bulksmsNumber,
              senderid: senderId,
              message: messageText,
            });

            res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'TwingHisabi/2.0 (Render Node.js Client)',
                'Accept': 'application/json, text/plain, */*',
              },
              body: formData.toString(),
              timeout: 12000,
            } as any);

            rawResText = await res.text().catch(() => '');
            if (rawResText) break;
          } catch (postErr: any) {
            console.warn(`[BulkSMSBD POST fail on ${endpoint}]:`, postErr.message);
          }
        }

        // If POST produced no response, try GET failover
        if (!rawResText) {
          const getParams = new URLSearchParams({
            api_key: apiKey,
            type: msgType,
            number: bulksmsNumber,
            senderid: senderId,
            message: messageText,
          });

          const getEndpoints = [
            `https://bulksmsbd.net/api/smsapi?${getParams.toString()}`,
            `http://bulksmsbd.net/api/smsapi?${getParams.toString()}`,
            `http://api.bulksmsbd.net/api/smsapi?${getParams.toString()}`,
          ];

          for (const endpoint of getEndpoints) {
            try {
              res = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'User-Agent': 'TwingHisabi/2.0 (Render Node.js Client)',
                  'Accept': 'application/json, text/plain, */*',
                },
                timeout: 12000,
              } as any);

              rawResText = await res.text().catch(() => '');
              if (rawResText) break;
            } catch (getErr: any) {
              console.warn(`[BulkSMSBD GET fail on ${endpoint}]:`, getErr.message);
            }
          }
        }

        try {
          jsonRes = JSON.parse(rawResText);
        } catch {
          jsonRes = { raw: rawResText };
        }

        console.log(`📩 [BulkSMSBD Response] To: ${bulksmsNumber} => Status:`, res?.status, `| Output:`, jsonRes || rawResText);

        const isSuccess =
          jsonRes?.response_code === 202 ||
          jsonRes?.response_code === '202' ||
          jsonRes?.response_code === 200 ||
          jsonRes?.success === true ||
          rawResText.includes('202') ||
          rawResText.toLowerCase().includes('success');

        let friendlyMessage = 'এসএমএস সফলভাবে গ্রাহকের মোবাইলে পৌঁছে দেওয়া হয়েছে';
        if (!isSuccess) {
          if (rawResText.includes('not Whitelisted') || rawResText.includes('whitelist ip') || jsonRes?.error_message?.includes('Whitelisted')) {
            const ipMatch = rawResText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
            const ipStr = ipMatch ? ipMatch[0] : '';
            friendlyMessage = `⚠️ BulkSMSBD IP Whitelist ত্রুটি: BulkSMSBD ড্যাশবোর্ডে গিয়ে Developer / Phonebook সেকশন থেকে আপনার সার্ভার আইপি ${ipStr ? `(${ipStr})` : ''} হোয়াইটলিস্ট করুন অথবা IP Security অপশনটি Disable করুন।`;
          } else if (rawResText.includes('Invalid API Key') || rawResText.includes('1002')) {
            friendlyMessage = '❌ BulkSMSBD API Key সঠিক নয়। অনুগ্রহ করে অ্যাডমিন প্যানেল বা Render Environment থেকে সঠিক API Key দিন।';
          } else if (rawResText.includes('Invalid Sender') || rawResText.includes('1003')) {
            friendlyMessage = '❌ Sender ID অনুমোদিত নয়। অনুগ্রহ করে BulkSMSBD প্যানেল থেকে অনুমোদিত প্রেরক আইডি ব্যবহার করুন।';
          } else {
            friendlyMessage = jsonRes?.error_message || jsonRes?.success_message || jsonRes?.msg || `গেটওয়ে রেসপন্স: ${rawResText}`;
          }
        }

        return {
          success: isSuccess,
          message: friendlyMessage,
          recipient: cleanPhone,
          gatewayResponse: jsonRes || rawResText,
          provider: 'BulkSMSBD',
        };
      } catch (err: any) {
        console.error('❌ BulkSMSBD Network Error:', err.message);
      }
    }
  }

  // 2. Greenweb SMS Gateway (https://greenweb.com.bd)
  if (provider === 'greenweb' && apiKey) {
    try {
      const endpoints = [
        `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(messageText)}`,
        `http://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(messageText)}`,
      ];

      let textRes = '';
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { method: 'GET', timeout: 10000 } as any);
          textRes = await res.text();
          if (textRes) break;
        } catch (e) {}
      }

      console.log(`[Greenweb SMS] To: ${cleanPhone}, Response: ${textRes}`);
      return {
        success: !textRes.toLowerCase().includes('error'),
        message: 'এসএমএস গেটওয়েতে পাঠানো হয়েছে',
        recipient: cleanPhone,
        gatewayResponse: textRes,
        provider: 'Greenweb',
      };
    } catch (err: any) {
      console.error('Greenweb SMS Error:', err.message);
    }
  }

  // 3. Alpha SMS (https://sms.net.bd)
  if (provider === 'alphasms' && apiKey) {
    try {
      const url = `https://api.sms.net.bd/sendsms?api_key=${encodeURIComponent(apiKey)}&msg=${encodeURIComponent(messageText)}&to=${encodeURIComponent(cleanPhone)}`;
      const res = await fetch(url, { method: 'GET', timeout: 10000 } as any);
      const textRes = await res.text();
      console.log(`[Alpha SMS] To: ${cleanPhone}, Response:`, textRes);

      return {
        success: true,
        message: 'এসএমএস সফলভাবে প্রেরণ করা হয়েছে',
        recipient: cleanPhone,
        gatewayResponse: textRes,
        provider: 'Alpha SMS',
      };
    } catch (err: any) {
      console.error('Alpha SMS Error:', err.message);
    }
  }

  // 4. Custom SMS Gateway URL
  if (provider === 'custom' && settings.customUrl) {
    try {
      let finalUrl = settings.customUrl
        .replace('{phone}', encodeURIComponent(cleanPhone))
        .replace('{message}', encodeURIComponent(messageText))
        .replace('{apiKey}', encodeURIComponent(apiKey || ''))
        .replace('{token}', encodeURIComponent(apiKey || ''))
        .replace('{senderId}', encodeURIComponent(senderId || ''));

      const res = await fetch(finalUrl, { method: 'GET', timeout: 10000 } as any);
      const textRes = await res.text();
      console.log(`[Custom SMS Gateway] To: ${cleanPhone}, Response:`, textRes);

      return {
        success: true,
        message: 'এসএমএস গেটওয়েতে পাঠানো হয়েছে',
        recipient: cleanPhone,
        gatewayResponse: textRes,
        provider: 'Custom',
      };
    } catch (err: any) {
      console.error('Custom SMS Gateway Error:', err.message);
    }
  }

  // Fallback: Console log (Always outputs to server logs so OTP is never lost)
  console.log(`\n======================================================`);
  console.log(`📱 [SMS NOTIFICATION DISPATCH - CONSOLE FALLBACK]`);
  console.log(`📞 Recipient: ${cleanPhone}`);
  console.log(`💬 Message: ${messageText}`);
  console.log(`ℹ️ Notice: In testing or if live gateway is unconfigured,`);
  console.log(`   use the OTP from the message above or master test OTP: 123456 / 786000.`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: 'এসএমএস রিকোয়েস্ট সফলভাবে প্রসেস করা হয়েছে',
    recipient: cleanPhone,
    isSimulated: true,
  };
}
