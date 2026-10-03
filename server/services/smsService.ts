import http from 'http';
import https from 'https';
import { URL } from 'url';
import { getDbPool, inMemoryStore, saveInMemoryStoreToDisk } from '../db';

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
  let cleaned = normalizeBanglaDigits(String(rawPhone).trim());
  cleaned = cleaned.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('+88')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('88')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('+0')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = '0' + cleaned.substring(1);
  }

  cleaned = cleaned.replace(/\D/g, '');

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

export interface DeductSmsOptions {
  customerName?: string;
  smsType?: string; // 'marketplace_order' | 'order_confirm' | 'order_status' | 'shipping'
  orderNumber?: string;
  vendorShopName?: string;
  fallbackToSystemIfNoBalance?: boolean;
}

export interface DeductSmsResult {
  success: boolean;
  deducted: boolean;
  message: string;
  costSms: number;
  remainingBalance: number;
  gatewayResponse?: any;
}

/**
 * Deduct 1 SMS from vendor account balance and send customer confirmation/status SMS
 * - Checks vendor's current SMS balance (users.sms_balance)
 * - If balance < 1: skips sending and sends alert notification to vendor to recharge SMS pack
 * - If balance >= 1: sends real SMS, deducts 1 SMS, and records in sms_logs
 */
export async function deductVendorSmsAndSend(
  vendorId: string | undefined | null,
  recipientPhone: string,
  messageText: string,
  options: DeductSmsOptions = {}
): Promise<DeductSmsResult> {
  const cleanPhone = normalizePhone(recipientPhone);
  if (!cleanPhone || cleanPhone.length < 11) {
    return {
      success: false,
      deducted: false,
      message: 'ভুল মোবাইল নম্বর ফরম্যাট',
      costSms: 0,
      remainingBalance: 0,
    };
  }

  const pool = getDbPool();
  const now = Date.now();
  let matchedUserId = (vendorId || '').trim();
  let currentBalance = 0;
  let vendorName = options.vendorShopName || 'ভেন্ডর';

  // 1. Resolve vendor user ID and current balance
  if (pool) {
    try {
      let uRes = await pool.query(
        'SELECT id, name, shop_name, phone, sms_balance FROM users WHERE id = $1 OR phone = $1 OR shop_name = $1 LIMIT 1',
        [matchedUserId]
      );
      if (uRes.rows.length === 0 && (!matchedUserId || matchedUserId === 'vendor_official' || matchedUserId === 'default_vendor')) {
        // Fallback to active vendor only if vendorId is generic or demo
        uRes = await pool.query(
          "SELECT id, name, shop_name, phone, sms_balance FROM users WHERE role != 'super_admin' ORDER BY id ASC LIMIT 1"
        );
      }
      if (uRes.rows.length > 0) {
        matchedUserId = uRes.rows[0].id;
        vendorName = uRes.rows[0].shop_name || uRes.rows[0].name || vendorName;
        currentBalance = uRes.rows[0].sms_balance !== null && uRes.rows[0].sms_balance !== undefined
          ? Number(uRes.rows[0].sms_balance)
          : 0;
      } else {
        return {
          success: false,
          deducted: false,
          message: 'নির্দিষ্ট ভেন্ডর অ্যাকাউন্ট খুঁজে পাওয়া যায়নি',
          costSms: 0,
          remainingBalance: 0,
        };
      }
    } catch (e: any) {
      console.warn('deductVendorSmsAndSend DB user lookup error:', e?.message || e);
    }
  } else {
    let u = (inMemoryStore.users || []).find((x: any) => x.id === matchedUserId || x.phone === matchedUserId || x.shopName === matchedUserId);
    if (!u && (!matchedUserId || matchedUserId === 'vendor_official' || matchedUserId === 'default_vendor')) {
      u = (inMemoryStore.users || []).find((x: any) => x.role !== 'super_admin') || (inMemoryStore.users || [])[0];
    }
    if (u) {
      matchedUserId = u.id;
      vendorName = u.shopName || u.name || vendorName;
      currentBalance = u.smsBalance !== null && u.smsBalance !== undefined ? Number(u.smsBalance) : 0;
    } else {
      return {
        success: false,
        deducted: false,
        message: 'নির্দিষ্ট ভেন্ডর অ্যাকাউন্ট খুঁজে পাওয়া যায়নি',
        costSms: 0,
        remainingBalance: 0,
      };
    }
  }

  // 2. Enforce vendor balance check: must have at least 1 SMS
  if (currentBalance < 1) {
    console.warn(`⚠️ [Vendor SMS Low/Empty] ভেন্ডর '${matchedUserId}' (${vendorName}) এর পর্যাপ্ত এসএমএস ব্যালেন্স নেই (${currentBalance} টি)।`);

    const isMarketplaceOrderConfirm = Boolean(
      options.fallbackToSystemIfNoBalance ||
      options.smsType === 'marketplace_order' ||
      options.smsType === 'marketplace_payment_approved' ||
      options.smsType === 'marketplace_cod_confirmed' ||
      (options.smsType && options.smsType.startsWith('marketplace_'))
    );

    // If it's a Central Marketplace customer order confirmation:
    // Send via platform system gateway so customer ALWAYS receives their order confirmation!
    if (isMarketplaceOrderConfirm) {
      console.log(`ℹ️ [Central Marketplace SMS Fallback] ভেন্ডর '${matchedUserId}' এর এসএমএস ব্যালেন্স নেই। সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${options.orderNumber || ''} এর কাস্টমার (${cleanPhone})-কে প্ল্যাটফর্ম গেটওয়ে দিয়ে কনফার্মেশন পাঠানো হচ্ছে।`);
      const fallbackResult = await sendSmsNotification(cleanPhone, messageText);

      // Notify vendor in-app that they have 0 balance and CANNOT send tracking updates until recharged
      const notifId = `notif_low_sms_${now}_${Math.random().toString(36).substring(2, 6)}`;
      const notifMsg = `⚠️ আপনার এসএমএস ব্যালেন্স শেষ (০ টি)! সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${options.orderNumber || ''} এর কনফার্মেশন কাস্টমারকে পাঠানো হলেও, নতুন কোনো প্রোডাক্ট ট্র্যাকিং বা কুরিয়ার আপডেট দিতে অবিলম্বে মেসেজ রিচার্জ করুন।`;

      if (pool && matchedUserId) {
        await pool.query(`
          INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
          VALUES ($1, '⚠️ এসএমএস ব্যালেন্স শেষ! ট্র্যাকিং আপডেট বন্ধ', $2, 'sms', 'user', $3, 'high', FALSE, $4)
        `, [notifId, notifMsg, matchedUserId, now]).catch(() => {});
      } else if (matchedUserId) {
        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: notifId,
          title: '⚠️ এসএমএস ব্যালেন্স শেষ! ট্র্যাকিং আপডেট বন্ধ',
          message: notifMsg,
          type: 'sms',
          target: 'user',
          target_user_id: matchedUserId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });
        saveInMemoryStoreToDisk();
      }

      return {
        success: fallbackResult.success,
        deducted: false,
        message: 'সেন্ট্রাল প্ল্যাটফর্ম ব্যাকআপ দিয়ে কাস্টমারকে কনফার্মেশন পাঠানো হয়েছে (ভেন্ডর ব্যালেন্স শূন্য)',
        costSms: 0,
        remainingBalance: 0,
        gatewayResponse: fallbackResult.gatewayResponse,
      };
    }

    // Otherwise (e.g. personal store orders): notify vendor and skip sending
    const notifId = `notif_low_sms_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const notifMsg = `আপনার এসএমএস ব্যালেন্স শেষ (${currentBalance} টি)! অর্ডার #${options.orderNumber || ''} এর কাস্টমার (${cleanPhone})-কে স্বয়ংক্রিয় এসএমএস পাঠানো যায়নি। অনুগ্রহ করে ড্যাশবোর্ড থেকে এসএমএস প্যাকেজ রিচার্জ করুন।`;

    if (pool && matchedUserId) {
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, '⚠️ এসএমএস ব্যালেন্স শেষ!', $2, 'sms', 'user', $3, 'high', FALSE, $4)
      `, [notifId, notifMsg, matchedUserId, now]).catch(() => {});
    } else if (matchedUserId) {
      if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
      inMemoryStore.notifications.unshift({
        id: notifId,
        title: '⚠️ এসএমএস ব্যালেন্স শেষ!',
        message: notifMsg,
        type: 'sms',
        target: 'user',
        target_user_id: matchedUserId,
        priority: 'high',
        isRead: false,
        createdAt: now,
      });
      saveInMemoryStoreToDisk();
    }

    return {
      success: false,
      deducted: false,
      message: `ভেন্ডরের পর্যাপ্ত এসএমএস ব্যালেন্স নেই (বর্তমান ব্যালেন্স: ${currentBalance} টি)`,
      costSms: 0,
      remainingBalance: currentBalance,
    };
  }

  // 3. Dispatch real SMS via gateway
  const sendResult = await sendSmsNotification(cleanPhone, messageText);

  // 4. Deduct 1 SMS from vendor balance atomically and write log
  let newBalance = Math.max(0, currentBalance - 1);
  const logId = 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  if (pool && matchedUserId) {
    try {
      const updRes = await pool.query(
        'UPDATE users SET sms_balance = GREATEST(0, COALESCE(sms_balance, 0) - 1) WHERE id = $1 RETURNING sms_balance',
        [matchedUserId]
      );
      if (updRes.rows.length > 0 && updRes.rows[0].sms_balance !== undefined) {
        newBalance = Number(updRes.rows[0].sms_balance);
      }
      await pool.query(`
        INSERT INTO sms_logs (id, user_id, customer_name, customer_phone, message, sms_type, status, cost_sms, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
      `, [
        logId,
        matchedUserId,
        options.customerName || 'সেন্ট্রাল মল গ্রাহক',
        cleanPhone,
        messageText,
        options.smsType || 'marketplace_order',
        sendResult.success ? 'sent' : 'failed',
        now,
      ]);
    } catch (dbErr: any) {
      console.warn('deductVendorSmsAndSend DB update error:', dbErr?.message || dbErr);
    }
  }

  // Also sync in-memory store
  if (matchedUserId) {
    const memUser = (inMemoryStore.users || []).find((x: any) => x.id === matchedUserId);
    if (memUser) memUser.smsBalance = newBalance;

    if (!inMemoryStore.sms_logs) inMemoryStore.sms_logs = [];
    inMemoryStore.sms_logs.unshift({
      id: logId,
      userId: matchedUserId,
      customerName: options.customerName || 'সেন্ট্রাল মল গ্রাহক',
      customerPhone: cleanPhone,
      message: messageText,
      smsType: options.smsType || 'marketplace_order',
      status: sendResult.success ? 'sent' : 'failed',
      costSms: 1,
      createdAt: now,
    });
    saveInMemoryStoreToDisk();
  }

  console.log(`✅ [Vendor SMS Deducted] 1 SMS deducted from vendor '${matchedUserId}' (${vendorName}). Remaining balance: ${newBalance}. Status: ${sendResult.success ? 'Sent' : 'Failed'}`);

  return {
    success: sendResult.success,
    deducted: true,
    message: sendResult.message,
    costSms: 1,
    remainingBalance: newBalance,
    gatewayResponse: sendResult.gatewayResponse,
  };
}
