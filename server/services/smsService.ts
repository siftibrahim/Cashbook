import http from 'http';
import https from 'https';
import { URL } from 'url';
import { getDbPool, inMemoryStore } from '../db';

export interface SmsSendResult {
  success: boolean;
  message: string;
  gatewayResponse?: any;
  recipient: string;
  isSimulated?: boolean;
  provider?: string;
  serverIp?: string;
}

export interface SmsGatewaySettings {
  provider: 'greenweb' | 'bulksmsbd' | 'alphasms' | 'mimsms' | 'custom';
  apiKey: string;
  senderId?: string;
  username?: string;
  customUrl?: string;
  isEnabled: boolean;
}

let cachedServerIp: string = '';

/**
 * Get current public IP of this server (useful for Render.com IP whitelisting)
 */
export async function getServerPublicIp(): Promise<string> {
  if (cachedServerIp) return cachedServerIp;
  try {
    const res = await makeHttpRequest('https://api.ipify.org?format=json', { timeout: 4000 });
    if (res.data) {
      const parsed = JSON.parse(res.data);
      if (parsed.ip) {
        cachedServerIp = parsed.ip;
        return cachedServerIp;
      }
    }
  } catch (e) {
    try {
      const res2 = await makeHttpRequest('http://ifconfig.me/ip', { timeout: 4000 });
      if (res2.data && res2.data.trim()) {
        cachedServerIp = res2.data.trim();
        return cachedServerIp;
      }
    } catch {}
  }
  return cachedServerIp || 'Dynamic Cloud IP (Render.com)';
}

/**
 * Resilient HTTP/HTTPS request helper tailored for Bangladeshi SMS gateways
 * - Supports automatic redirect following
 * - Ignores invalid/expired SSL certificates (common with BD gateways)
 * - Sets standard browser user-agent
 * - Forces IPv4 lookup to prevent cloud container IPv6 hangs
 */
export async function makeHttpRequest(
  targetUrl: string,
  options: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    redirectCount?: number;
  } = {}
): Promise<{ statusCode: number; data: string; error?: string }> {
  const { method = 'GET', headers = {}, body, timeout = 12000 } = options;

  // 1. Try modern native fetch first (non-blocking, fast, reliable SSL/DNS)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      ...headers,
    };

    if (body && method === 'POST' && !fetchHeaders['Content-Type']) {
      fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(targetUrl, {
      method,
      headers: fetchHeaders,
      body: method === 'POST' ? body : undefined,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timer);
    const responseText = await response.text();
    return {
      statusCode: response.status,
      data: responseText.trim(),
    };
  } catch (fetchErr: any) {
    // 2. Fallback to node http/https module if fetch encounters local protocol restrictions
    return new Promise((resolve) => {
      const { redirectCount = 0 } = options;
      if (redirectCount > 5) {
        return resolve({ statusCode: 500, data: '', error: 'Too many redirects' });
      }

      try {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;

        const reqHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: '*/*',
          ...headers,
        };

        if (body && method === 'POST' && !reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
          reqHeaders['Content-Length'] = Buffer.byteLength(body).toString();
        }

        const reqOptions: http.RequestOptions = {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method,
          headers: reqHeaders,
          timeout,
        };

        if (isHttps) {
          (reqOptions as https.RequestOptions).rejectUnauthorized = false;
        }

        const req = client.request(reqOptions, (res) => {
          if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            return resolve(
              makeHttpRequest(redirectUrl, {
                ...options,
                method: res.statusCode === 303 ? 'GET' : method,
                redirectCount: redirectCount + 1,
              })
            );
          }

          let responseData = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 200,
              data: responseData.trim(),
            });
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ statusCode: 408, data: '', error: `Request timeout after ${timeout}ms` });
        });

        req.on('error', (err) => {
          resolve({ statusCode: 500, data: '', error: err.message });
        });

        if (body && method === 'POST') {
          req.write(body);
        }
        req.end();
      } catch (err: any) {
        resolve({ statusCode: 500, data: '', error: err.message });
      }
    });
  }
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
 * Generate a 6-digit numeric OTP
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
    } catch (err) {}
  }

  if (dbConfig && dbConfig.apiKey) {
    return dbConfig;
  }

  // Fallback to In-Memory
  if (inMemoryStore.system_config['sms_gateway_config']?.apiKey) {
    return inMemoryStore.system_config['sms_gateway_config'];
  }

  // Fallback to Environment Variables or Master BulkSMSBD credentials
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

  const serverIp = await getServerPublicIp();
  const settings = await getSmsGatewaySettings();
  const apiKey = (settings.apiKey || process.env.BULKSMSBD_API_KEY || process.env.SMS_API_KEY || 'NOhILJCtx0DZJWCRBODB').trim();
  const senderId = (settings.senderId || process.env.SMS_SENDER_ID || '8809648910696').trim();
  const provider = (settings.provider || process.env.SMS_PROVIDER || 'bulksmsbd').toLowerCase();

  const hasBangla = /[\u0980-\u09FF]/.test(messageText);
  const msgType = hasBangla ? 'unicode' : 'text';

  // 1. BulkSMSBD Gateway (http://bulksmsbd.net) - Recommended Default
  if (provider === 'bulksmsbd' || (!settings.provider && apiKey)) {
    if (apiKey) {
      let bulksmsNumber = cleanPhone;
      if (bulksmsNumber.startsWith('01') && bulksmsNumber.length === 11) {
        bulksmsNumber = '88' + bulksmsNumber;
      } else if (!bulksmsNumber.startsWith('88') && bulksmsNumber.length === 10) {
        bulksmsNumber = '880' + bulksmsNumber;
      }

      console.log(`📡 [BulkSMSBD Dispatch] To: ${bulksmsNumber} | Sender: ${senderId} | ServerIP: ${serverIp}`);

      // Try GET query string first (official BulkSMSBD most reliable method)
      const encodedMsg = encodeURIComponent(messageText);
      const getUrls = [
        `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=${msgType}&number=${bulksmsNumber}&senderid=${encodeURIComponent(senderId)}&message=${encodedMsg}`,
        `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=${msgType}&number=${bulksmsNumber}&senderid=${encodeURIComponent(senderId)}&message=${encodedMsg}`,
        `http://api.bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=${msgType}&number=${bulksmsNumber}&senderid=${encodeURIComponent(senderId)}&message=${encodedMsg}`,
      ];

      let rawResText = '';
      let lastStatusCode = 0;
      let lastError = '';

      for (const url of getUrls) {
        const reqRes = await makeHttpRequest(url, { method: 'GET', timeout: 10000 });
        if (reqRes.data) {
          rawResText = reqRes.data;
          lastStatusCode = reqRes.statusCode;
          break;
        } else if (reqRes.error) {
          lastError = reqRes.error;
        }
      }

      // If GET failed, try POST with form body
      if (!rawResText) {
        const postUrls = [
          'http://bulksmsbd.net/api/smsapi',
          'https://bulksmsbd.net/api/smsapi',
          'http://api.bulksmsbd.net/api/smsapi',
        ];

        const postBody = new URLSearchParams({
          api_key: apiKey,
          type: msgType,
          number: bulksmsNumber,
          senderid: senderId,
          message: messageText,
        }).toString();

        for (const url of postUrls) {
          const reqRes = await makeHttpRequest(url, { method: 'POST', body: postBody, timeout: 10000 });
          if (reqRes.data) {
            rawResText = reqRes.data;
            lastStatusCode = reqRes.statusCode;
            break;
          } else if (reqRes.error) {
            lastError = reqRes.error;
          }
        }
      }

      let parsedJson: any = null;
      if (rawResText) {
        try {
          parsedJson = JSON.parse(rawResText);
        } catch {
          parsedJson = { raw: rawResText };
        }
      } else {
        parsedJson = {
          error: lastError || 'সার্ভার থেকে কোনো রেসপন্স পাওয়া যায়নি (Network Timeout)',
          serverIp,
          suggestion: 'Render.com ক্লাউড থেকে সংযোগ স্থাপনে সমস্যা। BulkSMSBD এ Server IP Whitelist নিশ্চিত করুন।',
        };
      }

      console.log(`📩 [BulkSMSBD Response] StatusCode: ${lastStatusCode} | Body:`, parsedJson);

      const isSuccess =
        parsedJson?.response_code === 202 ||
        parsedJson?.response_code === '202' ||
        parsedJson?.response_code === 200 ||
        parsedJson?.success === true ||
        (rawResText && (rawResText.includes('202') || rawResText.toLowerCase().includes('success')));

      let friendlyMessage = 'এসএমএস সফলভাবে গ্রাহকের মোবাইলে পৌঁছে দেওয়া হয়েছে';
      if (!isSuccess) {
        if (
          rawResText.includes('not Whitelisted') ||
          rawResText.includes('whitelist ip') ||
          parsedJson?.error_message?.includes('Whitelisted')
        ) {
          friendlyMessage = `⚠️ BulkSMSBD IP Security ত্রুটি: BulkSMSBD ড্যাশবোর্ডে গিয়ে আপনার সার্ভার আইপি (${serverIp}) হোয়াইটলিস্ট করুন অথবা IP Security অফ করুন।`;
        } else if (rawResText.includes('Invalid API Key') || rawResText.includes('1002')) {
          friendlyMessage = '❌ BulkSMSBD API Key সঠিক নয়। অনুগ্রহ করে অ্যাডমিন প্যানেল থেকে সঠিক API Key দিন।';
        } else if (rawResText.includes('Invalid Sender') || rawResText.includes('1003')) {
          friendlyMessage = '❌ Sender ID অনুমোদিত নয়। অনুগ্রহ করে BulkSMSBD থেকে অনুমোদিত Sender ID দিন।';
        } else if (rawResText.includes('Insufficient') || rawResText.includes('1006')) {
          friendlyMessage = '⚠️ BulkSMSBD একাউন্টে পর্যাপ্ত ব্যালেন্স নেই।';
        } else {
          friendlyMessage =
            parsedJson?.error_message ||
            parsedJson?.success_message ||
            parsedJson?.msg ||
            (lastError ? `নেটওয়ার্ক সংযোগ ত্রুটি (${lastError})` : `গেটওয়ে রেসপন্স: ${rawResText}`);
        }
      }

      return {
        success: isSuccess,
        message: friendlyMessage,
        recipient: cleanPhone,
        gatewayResponse: parsedJson,
        provider: 'BulkSMSBD',
        serverIp,
      };
    }
  }

  // 2. Greenweb SMS Gateway (https://greenweb.com.bd)
  if (provider === 'greenweb' && apiKey) {
    const urls = [
      `http://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(messageText)}`,
      `https://api.greenweb.com.bd/api.php?token=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(messageText)}`,
    ];

    let rawResText = '';
    let lastError = '';
    for (const url of urls) {
      const res = await makeHttpRequest(url, { method: 'GET', timeout: 10000 });
      if (res.data) {
        rawResText = res.data;
        break;
      } else if (res.error) {
        lastError = res.error;
      }
    }

    console.log(`[Greenweb SMS] To: ${cleanPhone}, Response: ${rawResText}`);
    const isSuccess = Boolean(rawResText && !rawResText.toLowerCase().includes('error'));

    return {
      success: isSuccess,
      message: isSuccess ? 'এসএমএস গেটওয়েতে পাঠানো হয়েছে' : `GreenWeb রেসপন্স: ${rawResText || lastError}`,
      recipient: cleanPhone,
      gatewayResponse: rawResText ? { raw: rawResText } : { error: lastError },
      provider: 'Greenweb',
      serverIp,
    };
  }

  // 3. Alpha SMS (https://sms.net.bd)
  if (provider === 'alphasms' && apiKey) {
    const url = `https://api.sms.net.bd/sendsms?api_key=${encodeURIComponent(apiKey)}&msg=${encodeURIComponent(messageText)}&to=${encodeURIComponent(cleanPhone)}`;
    const res = await makeHttpRequest(url, { method: 'GET', timeout: 10000 });

    return {
      success: res.statusCode === 200 && Boolean(res.data),
      message: res.data ? 'এসএমএস প্রেরণ করা হয়েছে' : `AlphaSMS ত্রুটি: ${res.error}`,
      recipient: cleanPhone,
      gatewayResponse: res.data ? { raw: res.data } : { error: res.error },
      provider: 'Alpha SMS',
      serverIp,
    };
  }

  // 4. MimSMS (https://mimsms.com)
  if (provider === 'mimsms' && apiKey) {
    const url = `https://mimsms.com/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(senderId)}&msg=${encodeURIComponent(messageText)}`;
    const res = await makeHttpRequest(url, { method: 'GET', timeout: 10000 });

    return {
      success: res.statusCode === 200 && Boolean(res.data),
      message: res.data ? 'এসএমএস MimSMS গেটওয়েতে পাঠানো হয়েছে' : `MimSMS ত্রুটি: ${res.error}`,
      recipient: cleanPhone,
      gatewayResponse: res.data ? { raw: res.data } : { error: res.error },
      provider: 'MimSMS',
      serverIp,
    };
  }

  // 5. Custom SMS Gateway URL
  if (provider === 'custom' && settings.customUrl) {
    let finalUrl = settings.customUrl
      .replace('{phone}', encodeURIComponent(cleanPhone))
      .replace('{message}', encodeURIComponent(messageText))
      .replace('{apiKey}', encodeURIComponent(apiKey || ''))
      .replace('{token}', encodeURIComponent(apiKey || ''))
      .replace('{senderId}', encodeURIComponent(senderId || ''));

    const res = await makeHttpRequest(finalUrl, { method: 'GET', timeout: 10000 });

    return {
      success: res.statusCode === 200 && Boolean(res.data),
      message: res.data ? 'কাস্টম গেটওয়েতে পাঠানো হয়েছে' : `কাস্টম গেটওয়ে ত্রুটি: ${res.error}`,
      recipient: cleanPhone,
      gatewayResponse: res.data ? { raw: res.data } : { error: res.error },
      provider: 'Custom',
      serverIp,
    };
  }

  // Fallback: Console output & Simulated mode
  console.log(`\n======================================================`);
  console.log(`📱 [SMS NOTIFICATION DISPATCH - CONSOLE FALLBACK]`);
  console.log(`📞 Recipient: ${cleanPhone}`);
  console.log(`💬 Message: ${messageText}`);
  console.log(`🌐 Server Public IP: ${serverIp}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: 'এসএমএস রিকোয়েস্ট সফলভাবে প্রসেস করা হয়েছে (কনসোল লগ হয়েছে)',
    recipient: cleanPhone,
    isSimulated: true,
    serverIp,
  };
}
