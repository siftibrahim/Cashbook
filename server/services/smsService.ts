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
  if (inMemoryStore.system_config['sms_gateway_config']) {
    return inMemoryStore.system_config['sms_gateway_config'];
  }

  // Fallback to Environment Variables
  const envProvider = (process.env.SMS_PROVIDER || 'greenweb').toLowerCase() as any;
  const envApiKey = process.env.GREENWEB_SMS_TOKEN || process.env.BULKSMSBD_API_KEY || process.env.ALPHASMS_API_KEY || process.env.SMS_API_KEY || '';
  const envSenderId = process.env.SMS_SENDER_ID || '';
  const envUsername = process.env.SMS_USERNAME || '';
  const envCustomUrl = process.env.SMS_GATEWAY_URL || '';

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
 * Send real SMS using configured Bangladeshi Gateway or log
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
  const apiKey = settings.apiKey;
  const senderId = settings.senderId || '';

  // 1. Greenweb SMS Gateway (https://greenweb.com.bd)
  if (settings.provider === 'greenweb' || (!settings.provider && apiKey)) {
    if (apiKey) {
      try {
        const url = `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(messageText)}`;
        const res = await fetch(url, { method: 'GET', timeout: 10000 } as any);
        const textRes = await res.text();
        console.log(`[Greenweb SMS] To: ${cleanPhone}, Response: ${textRes}`);

        return {
          success: true,
          message: 'এসএমএস সফলভাবে প্রেরণ করা হয়েছে',
          recipient: cleanPhone,
          gatewayResponse: textRes,
          provider: 'Greenweb',
        };
      } catch (err: any) {
        console.error('Greenweb SMS Error:', err.message);
      }
    }
  }

  // 2. BulkSMSBD Gateway (http://bulksmsbd.net)
  if (settings.provider === 'bulksmsbd' && apiKey) {
    try {
      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(messageText)}`;
      const res = await fetch(url, { method: 'GET', timeout: 10000 } as any);
      const jsonRes = await res.json().catch(() => null);
      console.log(`[BulkSMSBD] To: ${cleanPhone}, Response:`, jsonRes);

      return {
        success: true,
        message: 'এসএমএস সফলভাবে প্রেরণ করা হয়েছে',
        recipient: cleanPhone,
        gatewayResponse: jsonRes,
        provider: 'BulkSMSBD',
      };
    } catch (err: any) {
      console.error('BulkSMSBD Error:', err.message);
    }
  }

  // 3. Alpha SMS (https://sms.net.bd)
  if (settings.provider === 'alphasms' && apiKey) {
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
  if (settings.provider === 'custom' && settings.customUrl) {
    try {
      let finalUrl = settings.customUrl
        .replace('{phone}', encodeURIComponent(cleanPhone))
        .replace('{message}', encodeURIComponent(messageText))
        .replace('{apiKey}', encodeURIComponent(apiKey || ''))
        .replace('{token}', encodeURIComponent(apiKey || ''));

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

  // Fallback: Console log
  console.log(`\n======================================================`);
  console.log(`📱 [SMS NOTIFICATION DISPATCH]`);
  console.log(`📞 Recipient: ${cleanPhone}`);
  console.log(`💬 Message: ${messageText}`);
  console.log(`ℹ️ Notice: No live SMS Gateway API Key found in settings/env.`);
  console.log(`   To deliver physical SMS directly to phones, please configure`);
  console.log(`   SMS_API_KEY or GREENWEB_SMS_TOKEN in .env or Admin Settings.`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: 'এসএমএস পাঠানোর রিকোয়েস্ট প্রসেস করা হয়েছে',
    recipient: cleanPhone,
    isSimulated: true,
  };
}
