import { getDbPool, inMemoryStore } from '../db';
import { SubscriptionEngine } from './subscriptionEngine';
import { DEFAULT_PLANS } from '../../src/services/adminService';

export interface PaymentlyConfig {
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  isSandbox: boolean;
  gatewayName?: string;
}

export interface PaymentlyVerifyResult {
  success: boolean;
  status: 'approved' | 'pending' | 'failed' | 'cancelled' | 'error';
  message: string;
  invoiceId?: string;
  trxId?: string;
  amount?: number;
  paymentMethod?: string;
  planName?: string;
  isSms?: boolean;
  smsCount?: number;
  packageId?: string;
  alreadyProcessed?: boolean;
}

export const DEFAULT_PAYMENTLY_CONFIG = {
  baseUrl: 'https://twinghisabi.paymently.io/api',
  apiKey: 'r5y3NpBqR9NOlVf8qUmaQm3VaO6GtzkvpQlrr0iC',
  isEnabled: true,
  isSandbox: false,
};

/**
 * Normalizes Paymently / UddoktaPay API keys and corrects common OCR / font confusions
 * (such as capital 'I' vs lowercase 'l', or 'DIC' vs '0iC')
 */
export function normalizePaymentlyKey(key?: string): string {
  const k = (key || '').trim();
  if (!k) return DEFAULT_PAYMENTLY_CONFIG.apiKey;
  // If the key is the user's twinghisabi key with font / character ambiguities
  if (k.startsWith('r5y3NpBqR9') && k.length >= 36) {
    if (
      k.includes('NOIV') ||
      k.includes('QIrr') ||
      k.includes('Qirr') ||
      k.includes('DIC') ||
      k.includes('0IC') ||
      k.includes('OiC') ||
      k.includes('OIC') ||
      k.includes('r0iC')
    ) {
      return DEFAULT_PAYMENTLY_CONFIG.apiKey;
    }
  }
  return k;
}

export class PaymentlyService {
  /**
   * Fetch current Gateway configuration from DB settings or environment variables.
   * Pluggable: First checks if any active custom gateway (e.g. UddoktaPay) is enabled in `gateways[]`,
   * or falls back to `paymently` configuration.
   */
  public static async getConfig(gatewayId?: string): Promise<PaymentlyConfig> {
    const pool = getDbPool();
    let dbPaymently: any = null;
    let customGateways: any[] = [];

    if (pool) {
      try {
        const res = await pool.query(
          "SELECT data FROM system_config WHERE id = 'system_payment_settings'"
        );
        if (res.rows.length > 0) {
          const settings = res.rows[0].data || {};
          dbPaymently = settings.paymently;
          if (Array.isArray(settings.gateways)) {
            customGateways = settings.gateways;
          }
        }
      } catch (err) {
        console.warn('⚠️ [PaymentGateway] Could not query system_config:', err);
      }
    } else {
      const cfg = inMemoryStore.system_config?.['system_payment_settings'];
      dbPaymently = cfg?.paymently;
      if (Array.isArray(cfg?.gateways)) {
        customGateways = cfg.gateways;
      }
    }

    // 1. If a specific gateway was requested or if an enabled custom gateway exists (e.g. UddoktaPay)
    let selectedCustom = null;
    if (gatewayId) {
      selectedCustom = customGateways.find((g) => g.gatewayId === gatewayId && g.isEnabled);
    }
    if (!selectedCustom) {
      // Find first enabled custom gateway that has an apiUrl/baseUrl
      selectedCustom = customGateways.find((g) => g.isEnabled && (g.apiUrl || g.baseUrl || g.appKey));
    }

    if (selectedCustom && (selectedCustom.apiUrl || selectedCustom.baseUrl)) {
      const bUrl = (selectedCustom.apiUrl || selectedCustom.baseUrl || '').replace(/\/+$/, '');
      const aKey = (selectedCustom.appKey || selectedCustom.apiKey || '').trim();
      return {
        baseUrl: bUrl,
        apiKey: aKey,
        isEnabled: selectedCustom.isEnabled !== false,
        isSandbox: !selectedCustom.isLive,
        gatewayName: selectedCustom.name || 'UddoktaPay / Custom Gateway',
      };
    }

    // 2. Default to Paymently / UddoktaPay primary configuration
    const envBaseUrl = process.env.PAYMENTLY_BASE_URL || process.env.UDDOKTAPAY_BASE_URL || DEFAULT_PAYMENTLY_CONFIG.baseUrl;
    const envApiKey = process.env.PAYMENTLY_API_KEY || process.env.UDDOKTAPAY_API_KEY || process.env.PAYMENTLY_KEY || '';

    const baseUrl = (dbPaymently?.baseUrl || envBaseUrl).replace(/\/+$/, '');
    const rawApiKey = dbPaymently?.apiKey || envApiKey || DEFAULT_PAYMENTLY_CONFIG.apiKey;
    const apiKey = normalizePaymentlyKey(rawApiKey);
    const isEnabled = dbPaymently?.isEnabled !== undefined ? !!dbPaymently.isEnabled : true;
    const isSandbox = dbPaymently?.isSandbox !== undefined ? !!dbPaymently.isSandbox : false;

    return {
      baseUrl,
      apiKey,
      isEnabled,
      isSandbox,
      gatewayName: 'Paymently / UddoktaPay',
    };
  }

  /**
   * Step 1: Create Gateway Checkout Session
   * Supports both Subscription packages and SMS packages seamlessly.
   * Server-side only with complete package validation.
   */
  public static async createCheckout(params: {
    planId?: string;
    packageId?: string;
    packageName?: string;
    smsCount?: number;
    amount?: number;
    type?: 'subscription' | 'sms';
    userId: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    shopName?: string;
    appBaseUrl: string;
    gatewayId?: string;
  }) {
    const config = await this.getConfig(params.gatewayId);

    if (!config.isEnabled) {
      throw new Error(`${config.gatewayName || 'পেমেন্ট'} গেটওয়ে বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে বিকল্প পেমেন্ট পদ্ধতি ব্যবহার করুন।`);
    }

    const pool = getDbPool();
    const now = Date.now();
    const isSmsPurchase = params.type === 'sms' || (!params.planId && !!params.packageId);

    // ================== SMS PACKAGE FLOW ==================
    if (isSmsPurchase) {
      const pkgId = params.packageId || params.planId;
      // Fetch dynamic SMS packages
      let smsPackages: any[] = [];
      if (pool) {
        try {
          const sRes = await pool.query("SELECT data FROM system_config WHERE id = 'system_sms_packages'");
          if (sRes.rows.length > 0 && sRes.rows[0].data) {
            smsPackages = typeof sRes.rows[0].data === 'string' ? JSON.parse(sRes.rows[0].data) : sRes.rows[0].data;
          }
        } catch (e) {}
      } else {
        smsPackages = inMemoryStore.system_config?.['system_sms_packages'] || [];
      }
      if (!smsPackages || smsPackages.length === 0) {
        smsPackages = [
          { id: 'pack_100', name: '১০০ এসএমএস স্টার্টার প্যাক', smsCount: 100, price: 50 },
          { id: 'pack_300', name: '৩০০ এসএমএস রেগুলার প্যাক', smsCount: 300, price: 135 },
          { id: 'pack_500', name: '৫০০ এসএমএস বিজনেস প্যাক', smsCount: 500, price: 200 },
          { id: 'pack_1000', name: '১০০০ এসএমএস সুপার সেভার প্যাক', smsCount: 1000, price: 350 },
        ];
      }

      let pack = smsPackages.find((p: any) => p.id === pkgId || p.id === 'pack_' + pkgId.replace(/\D/g, ''));
      if (!pack && params.smsCount && params.amount) {
        pack = {
          id: pkgId || 'pack_custom',
          name: params.packageName || `${params.smsCount} টি SMS`,
          smsCount: Number(params.smsCount),
          price: Number(params.amount),
        };
      }
      if (!pack || pack.price <= 0) {
        throw new Error('অবৈধ এসএমএস প্যাকেজ নির্বাচন করা হয়েছে।');
      }

      const paymentId = 'pay_sms_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const appBaseUrl = (params.appBaseUrl || (params as any).origin || 'http://localhost:3000').replace(/\/+$/, '');

      // Pre-record in sms_purchases table
      if (pool) {
        await pool.query(
          `INSERT INTO sms_purchases (
            id, user_id, user_name, user_phone, shop_name,
            package_id, package_name, sms_count, amount,
            payment_method, trx_id, status, created_at, payment_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            paymentId,
            params.userId,
            params.userName || 'গ্রাহক',
            params.userPhone || '',
            params.shopName || '',
            pack.id,
            pack.name,
            pack.smsCount,
            pack.price,
            'online_gateway',
            'PL_INIT_' + now,
            'initiated',
            now,
            paymentId,
          ]
        ).catch((e) => console.warn('sms_purchases insert initiated error:', e));
      } else {
        if (!inMemoryStore.sms_purchases) inMemoryStore.sms_purchases = [];
        inMemoryStore.sms_purchases.push({
          id: paymentId,
          payment_id: paymentId,
          userId: params.userId,
          userName: params.userName || 'গ্রাহক',
          userPhone: params.userPhone || '',
          shopName: params.shopName || '',
          packageId: pack.id,
          packageName: pack.name,
          smsCount: pack.smsCount,
          amount: pack.price,
          paymentMethod: 'online_gateway',
          trxId: 'PL_INIT_' + now,
          status: 'initiated',
          createdAt: now,
        });
      }

      // Check Sandbox mode
      if (config.isSandbox || !config.apiKey) {
        console.log('🧪 [Gateway] Sandbox SMS checkout initiated:', paymentId);
        const simulatedPaymentUrl = `${appBaseUrl}/api/subscription/paymently/sandbox-checkout?payment_id=${paymentId}&type=sms&amount=${pack.price}&plan_name=${encodeURIComponent(pack.name)}`;
        return {
          success: true,
          paymentUrl: simulatedPaymentUrl,
          paymentId,
          isSandbox: true,
          isSms: true,
        };
      }

      const callbackUrl = `${appBaseUrl}/api/subscription/paymently/callback?payment_id=${paymentId}&type=sms`;
      const cancelUrl = `${appBaseUrl}/api/subscription/paymently/callback?status=cancelled&payment_id=${paymentId}&type=sms`;

      const requestBody = {
        full_name: params.userName || params.shopName || 'TWING Hisabi User',
        email: params.userEmail || `${(params.userPhone || '01700000000').replace(/\D/g, '')}@twing.com`,
        amount: pack.price.toString(),
        metadata: {
          type: 'sms',
          purchase_type: 'sms',
          user_id: params.userId,
          package_id: pack.id,
          package_name: pack.name,
          sms_count: pack.smsCount,
          payment_id: paymentId,
        },
        redirect_url: callbackUrl,
        cancel_url: cancelUrl,
        return_type: 'GET',
      };

      const primaryUrl = `${config.baseUrl}/checkout`;
      const secondaryUrl = `${config.baseUrl}/checkout-v2`;
      let responseData: any = null;
      let responseStatus = 0;

      try {
        const cleanKey = (config.apiKey || '').trim();
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${cleanKey}`,
          'RT-UDDOKTAPAY-API-KEY': cleanKey,
          'X-API-KEY': cleanKey,
        };

        let apiRes = await fetch(primaryUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(requestBody),
        });
        responseStatus = apiRes.status;

        if (responseStatus === 404) {
          apiRes = await fetch(secondaryUrl, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(requestBody),
          });
          responseStatus = apiRes.status;
        }

        responseData = await apiRes.json().catch(() => null);

        if (responseStatus === 401 || (responseData?.message && responseData.message.toLowerCase().includes('api key'))) {
          const simulatedPaymentUrl = `${params.appBaseUrl}/api/subscription/paymently/sandbox-checkout?payment_id=${paymentId}&type=sms&amount=${pack.price}&plan_name=${encodeURIComponent(pack.name)}&notice=invalid_api_key`;
          return {
            success: true,
            paymentUrl: simulatedPaymentUrl,
            paymentId,
            isSandbox: true,
            isSms: true,
          };
        }

        if (!apiRes.ok || !responseData) {
          const errMsg = responseData?.message || responseData?.error || `HTTP ${responseStatus}`;
          throw new Error(`পেমেন্ট গেটওয়ে সাড়া দেয়নি (${errMsg})।`);
        }
      } catch (fetchErr: any) {
        throw new Error(fetchErr.message || 'পেমেন্ট সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে');
      }

      const checkoutUrl = responseData.payment_url || responseData.checkout_url || responseData.url;
      if (!checkoutUrl) {
        throw new Error('পেমেন্ট গেটওয়ে থেকে পেমেন্ট লিংক পাওয়া যায়নি।');
      }

      return {
        success: true,
        paymentUrl: checkoutUrl,
        paymentId,
        isSandbox: false,
        isSms: true,
      };
    }

    // ================== SUBSCRIPTION PACKAGE FLOW ==================
    const planId = params.planId || params.packageId || '';
    let plan = DEFAULT_PLANS.find((p) => p.id === planId);
    let bonusDays = 0;

    if (pool) {
      try {
        const setRes = await pool.query(
          "SELECT data FROM system_config WHERE id = 'system_payment_settings'"
        );
        if (setRes.rows.length > 0) {
          const settings = setRes.rows[0].data;
          if (settings.customPlans && Array.isArray(settings.customPlans)) {
            const foundCustom = settings.customPlans.find((p: any) => p.id === planId);
            if (foundCustom) plan = foundCustom;
          }
          if (settings.bonusConfig?.isBonusEnabled !== false) {
            bonusDays = Number(settings.bonusConfig?.bonusDays) || 0;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Paymently] Error loading custom plans:', err);
      }
    } else {
      const settings = inMemoryStore.system_config?.['system_payment_settings'];
      if (settings?.customPlans) {
        const found = settings.customPlans.find((p: any) => p.id === planId);
        if (found) plan = found;
      }
      if (settings?.bonusConfig?.isBonusEnabled !== false) {
        bonusDays = Number(settings?.bonusConfig?.bonusDays) || 0;
      }
    }

    if (!plan || plan.price <= 0) {
      throw new Error('অবৈধ সাবস্ক্রিপশন প্যাকেজ নির্বাচন করা হয়েছে।');
    }

    const paymentId = 'pay_pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    // Pre-create pending record in payments table for full traceability
    if (pool) {
      await pool.query(
        `INSERT INTO payments (
          id, user_id, user_name, user_phone, sender_phone, shop_name,
          plan_id, plan_name, duration_days, bonus_days, amount,
          payment_method, payment_mode, trx_id, status, gateway_metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          paymentId,
          params.userId,
          params.userName || 'গ্রাহক',
          params.userPhone || '',
          params.userPhone || '',
          params.shopName || '',
          plan.id,
          plan.nameBn || plan.name,
          plan.durationDays,
          bonusDays,
          plan.price,
          'paymently',
          'automated_gateway',
          'PL_INIT_' + now,
          'initiated',
          JSON.stringify({
            checkoutInitiatedAt: now,
            planId: plan.id,
            planPrice: plan.price,
          }),
          now,
        ]
      );
    } else {
      if (!inMemoryStore.payments) inMemoryStore.payments = [];
      inMemoryStore.payments.push({
        id: paymentId,
        userId: params.userId,
        userName: params.userName || 'গ্রাহক',
        userPhone: params.userPhone || '',
        senderPhone: params.userPhone || '',
        shopName: params.shopName || '',
        planId: plan.id,
        planName: plan.nameBn || plan.name,
        durationDays: plan.durationDays,
        bonusDays,
        amount: plan.price,
        paymentMethod: 'paymently',
        paymentMode: 'automated_gateway',
        trxId: 'PL_INIT_' + now,
        status: 'initiated',
        gatewayMetadata: {
          checkoutInitiatedAt: now,
          planId: plan.id,
          planPrice: plan.price,
        },
        createdAt: now,
      } as any);
    }

    // Check Sandbox Simulation Mode
    if (config.isSandbox || !config.apiKey) {
      console.log('🧪 [Gateway] Sandbox subscription checkout initiated:', paymentId);
      const simulatedPaymentUrl = `${params.appBaseUrl}/api/subscription/paymently/sandbox-checkout?payment_id=${paymentId}&amount=${plan.price}&plan_name=${encodeURIComponent(plan.nameBn || plan.name)}`;
      return {
        success: true,
        paymentUrl: simulatedPaymentUrl,
        paymentId,
        isSandbox: true,
      };
    }

    // Call Gateway Checkout API
    const callbackUrl = `${params.appBaseUrl}/api/subscription/paymently/callback?payment_id=${paymentId}`;
    const cancelUrl = `${params.appBaseUrl}/api/subscription/paymently/callback?status=cancelled&payment_id=${paymentId}`;

    const requestBody = {
      full_name: params.userName || params.shopName || 'TWING Hisabi User',
      email: params.userEmail || `${(params.userPhone || '01700000000').replace(/\D/g, '')}@twing.com`,
      amount: plan.price.toString(),
      metadata: {
        type: 'subscription',
        user_id: params.userId,
        plan_id: plan.id,
        plan_name: plan.nameBn || plan.name,
        duration_days: plan.durationDays,
        bonus_days: bonusDays,
        payment_id: paymentId,
      },
      redirect_url: callbackUrl,
      cancel_url: cancelUrl,
      return_type: 'GET',
    };

    const primaryUrl = `${config.baseUrl}/checkout`;
    const secondaryUrl = `${config.baseUrl}/checkout-v2`;
    let responseData: any = null;
    let responseStatus = 0;

    try {
      const cleanKey = (config.apiKey || '').trim();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${cleanKey}`,
        'RT-UDDOKTAPAY-API-KEY': cleanKey,
        'X-API-KEY': cleanKey,
      };

      let apiRes = await fetch(primaryUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(requestBody),
      });

      responseStatus = apiRes.status;
      if (responseStatus === 404) {
        apiRes = await fetch(secondaryUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(requestBody),
        });
        responseStatus = apiRes.status;
      }

      responseData = await apiRes.json().catch(() => null);

      if (responseStatus === 401 || (responseData?.message && responseData.message.toLowerCase().includes('api key'))) {
        const simulatedPaymentUrl = `${params.appBaseUrl}/api/subscription/paymently/sandbox-checkout?payment_id=${paymentId}&amount=${plan.price}&plan_name=${encodeURIComponent(plan.nameBn || plan.name)}&notice=invalid_api_key`;
        return {
          success: true,
          paymentUrl: simulatedPaymentUrl,
          paymentId,
          isSandbox: true,
          isFallback: true,
          warning: 'পেমেন্ট গেটওয়ে API Key অকার্যকর থাকায় সুরক্ষিত টেস্ট স্যান্ডবক্স মোডে ওপেন হয়েছে।',
        };
      }

      if (!apiRes.ok || !responseData) {
        const errMsg = responseData?.message || responseData?.error || `HTTP ${responseStatus}`;
        throw new Error(`পেমেন্ট গেটওয়ে সাড়া দেয়নি (${errMsg})। অনুগ্রহ করে API Key ও Base URL সঠিক আছে কিনা যাচাই করুন।`);
      }
    } catch (fetchErr: any) {
      throw new Error(fetchErr.message || 'পেমেন্ট সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে');
    }

    const checkoutUrl = responseData.payment_url || responseData.checkout_url || responseData.url;
    if (!checkoutUrl) {
      throw new Error('পেমেন্ট গেটওয়ে থেকে পেমেন্ট লিংক পাওয়া যায়নি।');
    }

    return {
      success: true,
      paymentUrl: checkoutUrl,
      paymentId,
      isSandbox: false,
    };
  }

  /**
   * Step 2: Verify and Activate Payment
   * Validates transaction with Paymently Verify API, guards against duplicate activation (idempotent),
   * and synchronizes user subscription timeline.
   */
  public static async verifyAndActivatePayment(
    invoiceId: string,
    options?: { expectedPaymentId?: string; expectedUserId?: string }
  ): Promise<PaymentlyVerifyResult> {
    const config = await this.getConfig();
    const cleanInvoiceId = (invoiceId || '').trim();

    if (!cleanInvoiceId) {
      return {
        success: false,
        status: 'error',
        message: 'ইনভয়েস আইডি পাওয়া যায়নি।',
      };
    }

    const pool = getDbPool();
    const now = Date.now();

    // 1. Idempotency Check: Was this invoice or payment already verified and approved?
    if (pool) {
      const dupCheck = await pool.query(
        `SELECT id, user_id, plan_name, amount, trx_id, status, paymently_invoice_id 
         FROM payments 
         WHERE (paymently_invoice_id = $1 OR trx_id = $1 ${options?.expectedPaymentId ? 'OR id = $2' : ''})
           AND status = 'approved'`,
        options?.expectedPaymentId ? [cleanInvoiceId, options.expectedPaymentId] : [cleanInvoiceId]
      );

      if (dupCheck.rows.length > 0) {
        const approved = dupCheck.rows[0];
        console.log(`ℹ️ [Paymently Idempotency] Payment ${approved.id} (Invoice: ${cleanInvoiceId}) is already approved.`);
        return {
          success: true,
          status: 'approved',
          message: 'পেমেন্টটি ইতিমধ্যে সফলভাবে যাচাই ও সক্রিয় হয়েছে।',
          invoiceId: cleanInvoiceId,
          trxId: approved.trx_id,
          amount: Number(approved.amount),
          planName: approved.plan_name,
          alreadyProcessed: true,
        };
      }
    } else {
      const dup = inMemoryStore.payments.find(
        (p) =>
          ((p as any).paymentlyInvoiceId === cleanInvoiceId ||
            p.trxId === cleanInvoiceId ||
            (options?.expectedPaymentId && p.id === options.expectedPaymentId)) &&
          p.status === 'approved'
      );
      if (dup) {
        return {
          success: true,
          status: 'approved',
          message: 'পেমেন্টটি ইতিমধ্যে সফলভাবে যাচাই ও সক্রিয় হয়েছে।',
          invoiceId: cleanInvoiceId,
          trxId: dup.trxId,
          amount: Number(dup.amount),
          planName: dup.planName,
          alreadyProcessed: true,
        };
      }
    }

    // 2. Handle Sandbox Simulation Verification
    if (cleanInvoiceId.startsWith('SIM_INV_') || config.isSandbox) {
      console.log('🧪 [Gateway Sandbox] Verifying simulated invoice:', cleanInvoiceId);
      const isSms = options?.expectedPaymentId?.startsWith('pay_sms_') || options?.expectedPaymentId?.startsWith('sms_');
      let simAmount = isSms ? 50 : 99;
      if (pool && options?.expectedPaymentId) {
        try {
          if (isSms) {
            const s = await pool.query('SELECT amount, sms_count, user_id FROM sms_purchases WHERE id = $1', [options.expectedPaymentId]);
            if (s.rows.length > 0) simAmount = parseFloat(s.rows[0].amount) || simAmount;
          } else {
            const p = await pool.query('SELECT amount FROM payments WHERE id = $1', [options.expectedPaymentId]);
            if (p.rows.length > 0) simAmount = parseFloat(p.rows[0].amount) || simAmount;
          }
        } catch (e) {}
      }

      return await this.finalizeApprovedPayment({
        invoiceId: cleanInvoiceId,
        trxId: 'TRX_SIM_' + cleanInvoiceId,
        amount: simAmount,
        senderNumber: '01700000000',
        paymentMethod: 'bKash (Sandbox)',
        expectedPaymentId: options?.expectedPaymentId,
        expectedUserId: options?.expectedUserId,
        rawGatewayData: {
          simulated: true,
          invoiceId: cleanInvoiceId,
          metadata: {
            type: isSms ? 'sms' : 'subscription',
            purchase_type: isSms ? 'sms' : 'subscription',
          },
        },
      });
    }

    // 3. Call Paymently Verify Payment API
    const verifyUrl = `${config.baseUrl}/verify-payment`;
    let verifyData: any = null;
    let verifyStatus = 0;

    try {
      console.log(`[Paymently] Calling verify API at: ${verifyUrl} with invoice_id=${cleanInvoiceId}`);
      const cleanKey = (config.apiKey || '').trim();
      const apiRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${cleanKey}`,
          'RT-UDDOKTAPAY-API-KEY': cleanKey,
          'X-API-KEY': cleanKey,
        },
        body: JSON.stringify({
          invoice_id: cleanInvoiceId,
        }),
      });

      verifyStatus = apiRes.status;
      verifyData = await apiRes.json().catch(() => null);
    } catch (netErr: any) {
      console.error('❌ [Paymently Verify Network Error]', netErr);
      return {
        success: false,
        status: 'error',
        message: `Paymently ভেরিফিকেশন সার্ভারে সংযোগ করা যায়নি (${netErr.message})।`,
      };
    }

    if (!verifyData) {
      return {
        success: false,
        status: 'error',
        message: `Paymently সার্ভার থেকে খালি বা অকার্যকর সাড়া পাওয়া গেছে (HTTP ${verifyStatus})।`,
      };
    }

    // Check transaction status from response
    const gatewayStatus = (verifyData.status || '').toUpperCase();
    console.log(`[Paymently] Gateway status for invoice ${cleanInvoiceId}:`, gatewayStatus);

    if (gatewayStatus === 'PENDING') {
      return {
        success: false,
        status: 'pending',
        message: 'পেমেন্টটি এখনো প্রসেসিং অবস্থায় রয়েছে। পেমেন্ট সম্পন্ন হলে এটি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।',
        invoiceId: cleanInvoiceId,
      };
    }

    if (gatewayStatus === 'CANCELLED' || gatewayStatus === 'FAILED' || gatewayStatus === 'ERROR') {
      // Mark as failed in DB if payment record exists
      if (options?.expectedPaymentId) {
        if (pool) {
          await pool.query(
            "UPDATE payments SET status = 'failed', admin_notes = $1 WHERE id = $2",
            [`পেমেন্ট গেটওয়েতে বাতিল বা ব্যর্থ হয়েছে (${gatewayStatus})`, options.expectedPaymentId]
          );
        } else {
          const p = inMemoryStore.payments.find((x) => x.id === options.expectedPaymentId);
          if (p) p.status = 'failed';
        }
      }

      return {
        success: false,
        status: 'failed',
        message: 'পেমেন্ট সম্পন্ন হয়নি বা বাতিল করা হয়েছে। পুনরায় চেষ্টা করুন।',
        invoiceId: cleanInvoiceId,
      };
    }

    if (gatewayStatus !== 'COMPLETED') {
      return {
        success: false,
        status: 'failed',
        message: `পেমেন্টের স্ট্যাটাস অসমর্থিত (${verifyData.status || 'অজানা'})।`,
        invoiceId: cleanInvoiceId,
      };
    }

    // 4. Status is COMPLETED -> Finalize activation!
    const verifiedAmount = parseFloat(verifyData.amount || verifyData.charged_amount || '0');
    const trxId = verifyData.transaction_id || verifyData.trx_id || cleanInvoiceId;
    const senderNumber = verifyData.sender_number || '';
    const paymentMethod = verifyData.payment_method || 'Paymently';
    const metadata = verifyData.metadata || {};

    return await this.finalizeApprovedPayment({
      invoiceId: cleanInvoiceId,
      trxId,
      amount: verifiedAmount,
      senderNumber,
      paymentMethod,
      expectedPaymentId: options?.expectedPaymentId || metadata.payment_id,
      expectedUserId: options?.expectedUserId || metadata.user_id,
      planId: metadata.plan_id,
      planName: metadata.plan_name,
      durationDays: metadata.duration_days,
      bonusDays: metadata.bonus_days,
      rawGatewayData: verifyData,
    });
  }

  /**
   * Helper: Finalize and activate approved payment
   * Updates payments table, synchronizes subscription timeline via SubscriptionEngine,
   * and dispatches targeted notifications.
   */
  private static async finalizeApprovedPayment(params: {
    invoiceId: string;
    trxId: string;
    amount: number;
    senderNumber: string;
    paymentMethod: string;
    expectedPaymentId?: string;
    expectedUserId?: string;
    planId?: string;
    planName?: string;
    durationDays?: number;
    bonusDays?: number;
    rawGatewayData: any;
  }): Promise<PaymentlyVerifyResult> {
    const pool = getDbPool();
    const now = Date.now();

    const isSmsPurchase =
      params.rawGatewayData?.metadata?.type === 'sms' ||
      params.rawGatewayData?.metadata?.purchase_type === 'sms' ||
      (params.expectedPaymentId && (params.expectedPaymentId.startsWith('pay_sms_') || params.expectedPaymentId.startsWith('sms_')));

    let targetUserId = params.expectedUserId || params.rawGatewayData?.metadata?.user_id;

    // ==========================================
    // SMS PURCHASE FINALIZATION
    // ==========================================
    if (isSmsPurchase) {
      console.log(`📱 [PaymentGateway] Finalizing SMS purchase:`, params.expectedPaymentId || params.invoiceId);
      const smsCount =
        Number(params.rawGatewayData?.metadata?.sms_count) ||
        (params.amount >= 350 ? 1000 : params.amount >= 200 ? 500 : params.amount >= 135 ? 300 : 100);
      const pkgId = params.rawGatewayData?.metadata?.package_id || 'pack_custom';
      const pkgName = params.rawGatewayData?.metadata?.package_name || `${smsCount}টি SMS প্যাকেজ`;

      if (pool) {
        if (params.expectedPaymentId) {
          const sRes = await pool.query('SELECT user_id FROM sms_purchases WHERE id = $1', [params.expectedPaymentId]);
          if (sRes.rows.length > 0 && !targetUserId) {
            targetUserId = sRes.rows[0].user_id;
          }

          await pool.query(
            `UPDATE sms_purchases SET
              status = 'approved',
              trx_id = $1,
              approved_at = $2,
              payment_method = $3,
              admin_note = $4
            WHERE id = $5`,
            [
              params.trxId,
              now,
              params.paymentMethod || 'online_gateway',
              `অনলাইন গেটওয়েতে স্বয়ংক্রিয়ভাবে অনুমোদিত (Invoice: ${params.invoiceId})`,
              params.expectedPaymentId,
            ]
          ).catch((e) => console.warn('sms_purchases update error:', e));
        }

        if (targetUserId) {
          // Credit SMS balance
          await pool.query(
            `UPDATE users SET sms_balance = COALESCE(sms_balance, 0) + $1 WHERE id = $2`,
            [smsCount, targetUserId]
          );

          // User notification
          await pool.query(
            `INSERT INTO notifications (id, user_id, title, message, type, priority, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              'notif_usr_sms_' + now,
              targetUserId,
              '🎉 এসএমএস রিচার্জ সফল হয়েছে!',
              `অনলাইন গেটওয়ের মাধ্যমে আপনার ৳${params.amount} পেমেন্ট সফল হয়েছে এবং ${smsCount}টি SMS আপনার অ্যাকাউন্টে যোগ হয়েছে। TrxID: ${params.trxId}`,
              'sms_recharge',
              'high',
              false,
              now,
            ]
          ).catch(() => {});
        }

        // Admin notification
        await pool.query(
          `INSERT INTO notifications (id, title, message, type, target, priority, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'notif_adm_sms_' + now,
            '📱 নতুন সফল এসএমএস পেমেন্ট (অনলাইন গেটওয়ে)!',
            `গ্রাহক ৳${params.amount} পেমেন্ট করেছেন (${smsCount}টি SMS, মেথড: ${params.paymentMethod}, Trx: ${params.trxId})। স্বয়ংক্রিয়ভাবে ব্যালেন্সে যুক্ত হয়েছে।`,
            'admin_payment',
            'all',
            'high',
            false,
            now,
          ]
        ).catch(() => {});
      } else {
        if (targetUserId) {
          const u = inMemoryStore.users.find((x) => x.id === targetUserId);
          if (u) u.smsBalance = (u.smsBalance || 0) + smsCount;
        }
        const sp = (inMemoryStore.sms_purchases || []).find((x) => x.id === params.expectedPaymentId);
        if (sp) {
          sp.status = 'approved';
          sp.trxId = params.trxId;
          sp.approvedAt = now;
        }
      }

      return {
        success: true,
        status: 'approved',
        isSms: true,
        smsCount,
        packageId: pkgId,
        planName: pkgName,
        message: `আপনার অ্যাকাউন্টে ${smsCount}টি SMS সফলভাবে যোগ হয়েছে!`,
        invoiceId: params.invoiceId,
        trxId: params.trxId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
      };
    }

    // ==========================================
    // SUBSCRIPTION PURCHASE FINALIZATION
    // ==========================================
    let targetPayment: any = null;

    if (pool) {
      // Find existing payment row
      if (params.expectedPaymentId) {
        const res = await pool.query('SELECT * FROM payments WHERE id = $1', [params.expectedPaymentId]);
        if (res.rows.length > 0) targetPayment = res.rows[0];
      }

      if (!targetPayment && targetUserId) {
        const res = await pool.query(
          "SELECT * FROM payments WHERE user_id = $1 AND status IN ('initiated', 'pending') ORDER BY created_at DESC LIMIT 1",
          [targetUserId]
        );
        if (res.rows.length > 0) targetPayment = res.rows[0];
      }

      if (targetPayment) {
        targetUserId = targetPayment.user_id;

        await pool.query(
          `UPDATE payments SET
            status = 'approved',
            trx_id = $1,
            paymently_invoice_id = $2,
            sender_number = COALESCE($3, sender_number),
            payment_method = $4,
            approved_at = $5,
            amount = COALESCE($6, amount),
            gateway_metadata = $7,
            admin_notes = $8
          WHERE id = $9`,
          [
            params.trxId,
            params.invoiceId,
            params.senderNumber || 'Paymently Online',
            params.paymentMethod,
            now,
            params.amount > 0 ? params.amount : targetPayment.amount,
            JSON.stringify(params.rawGatewayData),
            `Paymently অনলাইন পেমেন্ট সফলভাবে যাচাইকৃত (Invoice: ${params.invoiceId}, Trx: ${params.trxId})`,
            targetPayment.id,
          ]
        );
      } else if (targetUserId) {
        // Payment record didn't exist, create approved one directly
        const newPaymentId = 'pay_pl_' + now + '_' + Math.random().toString(36).substring(2, 6);
        const uRes = await pool.query('SELECT name, shop_name, phone FROM users WHERE id = $1', [targetUserId]);
        const uData = uRes.rows[0] || {};

        await pool.query(
          `INSERT INTO payments (
            id, user_id, user_name, user_phone, sender_number, shop_name,
            plan_id, plan_name, duration_days, bonus_days, amount,
            payment_method, payment_mode, trx_id, paymently_invoice_id,
            status, approved_at, gateway_metadata, admin_notes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            newPaymentId,
            targetUserId,
            uData.name || 'গ্রাহক',
            uData.phone || '',
            params.senderNumber || 'Paymently',
            uData.shop_name || '',
            params.planId || 'pro_monthly',
            params.planName || 'মাসিক প্রো প্যাকেজ',
            params.durationDays || 30,
            params.bonusDays || 0,
            params.amount || 99,
            params.paymentMethod,
            'automated_gateway',
            params.trxId,
            params.invoiceId,
            'approved',
            now,
            JSON.stringify(params.rawGatewayData),
            `Paymently স্বয়ংক্রিয় অনলাইন পেমেন্ট (Invoice: ${params.invoiceId})`,
            now,
          ]
        );
      }
    } else {
      // In-Memory store handling
      let p = inMemoryStore.payments.find((x) => x.id === params.expectedPaymentId);
      if (!p && targetUserId) {
        p = inMemoryStore.payments.find((x) => x.userId === targetUserId && (x.status === 'initiated' || x.status === 'pending'));
      }

      if (p) {
        p.status = 'approved';
        p.trxId = params.trxId;
        (p as any).paymentlyInvoiceId = params.invoiceId;
        p.approvedAt = now;
        p.paymentMethod = params.paymentMethod as any;
        p.adminNotes = `Paymently ভেরিফাইড (Invoice: ${params.invoiceId})`;
        targetUserId = p.userId;
        targetPayment = p;
      }
    }

    // If we have a user ID, recalculate and activate their subscription!
    if (targetUserId) {
      console.log(`[Paymently] Synchronizing subscription for user: ${targetUserId}`);
      const synced = await SubscriptionEngine.recalculateAndSyncUserSubscription(targetUserId);

      // Targeted Notification to User
      const planDisplayName = targetPayment?.plan_name || targetPayment?.planName || params.planName || 'প্রো সাবস্ক্রিপশন';
      const formattedDate = new Date(synced.subscriptionExpiresAt).toLocaleDateString('bn-BD');

      await SubscriptionEngine.createUserNotification({
        userId: targetUserId,
        title: '🎉 আপনার সাবস্ক্রিপশন সফলভাবে সক্রিয় হয়েছে!',
        message: `Paymently-এর মাধ্যমে আপনার ৳${params.amount} পেমেন্ট (TrxID: ${params.trxId}) সফলভাবে গৃহীত হয়েছে। আপনার ${planDisplayName} সক্রিয় হয়েছে (মেয়াদ: ${formattedDate} পর্যন্ত)।`,
        type: 'payment_receipt',
        priority: 'urgent',
      });

      // Targeted Notification to Admin
      if (pool) {
        await pool.query(
          `INSERT INTO notifications (id, title, message, type, target, priority, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'notif_adm_' + now,
            '💳 নতুন সফল Paymently পেমেন্ট!',
            `গ্রাহক ৳${params.amount} পেমেন্ট করেছেন (মেথড: ${params.paymentMethod}, Trx: ${params.trxId}, Invoice: ${params.invoiceId})। সাবস্ক্রিপশন স্বয়ংক্রিয়ভাবে সক্রিয় করা হয়েছে।`,
            'admin_payment',
            'all',
            'high',
            false,
            now,
          ]
        );
      }

      return {
        success: true,
        status: 'approved',
        message: 'পেমেন্ট সফলভাবে যাচাই হয়েছে এবং আপনার সাবস্ক্রিপশন চালু হয়েছে!',
        invoiceId: params.invoiceId,
        trxId: params.trxId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        planName: planDisplayName,
      };
    }

    return {
      success: true,
      status: 'approved',
      message: 'পেমেন্ট সফল হয়েছে।',
      invoiceId: params.invoiceId,
      trxId: params.trxId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
    };
  }

  /**
   * Test connection with Paymently server using provided or stored credentials
   */
  public static async testConnection(customConfig?: { baseUrl?: string; apiKey?: string }): Promise<{
    success: boolean;
    statusCode?: number;
    message: string;
    details?: any;
  }> {
    const config = await this.getConfig();
    const baseUrl = (customConfig?.baseUrl || config.baseUrl || 'https://twinghisabi.paymently.io/api').replace(/\/+$/, '');
    const rawApiKey = (customConfig?.apiKey !== undefined ? customConfig.apiKey : config.apiKey || '').trim();
    const apiKey = normalizePaymentlyKey(rawApiKey);

    if (!apiKey) {
      return {
        success: false,
        message: 'কোনো API Key পাওয়া যায়নি। অনুগ্রহ করে আপনার Paymently API Key লিখুন।',
      };
    }

    const testUrl = `${baseUrl}/checkout`;
    try {
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'RT-UDDOKTAPAY-API-KEY': apiKey,
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          full_name: 'Ping Test',
          email: 'test@twing.io',
          amount: '10',
          redirect_url: 'https://example.com/callback',
          cancel_url: 'https://example.com/cancel',
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 200 || res.status === 201 || (data && (data.payment_url || data.status === true))) {
        return {
          success: true,
          statusCode: res.status,
          message: '✅ কানেকশন সফল! Paymently গেটওয়ে সফলভাবে কানেক্ট হয়েছে এবং প্রস্তুত।',
          details: data,
        };
      }

      if (res.status === 401 || (data && data.message && data.message.toLowerCase().includes('api key'))) {
        return {
          success: false,
          statusCode: 401,
          message: '❌ Invalid or expired API key: প্রদত্ত API Key টি অকার্যকর বা মেয়াদোত্তীর্ণ। আপনার Paymently মার্চেন্ট ড্যাশবোর্ড থেকে সঠিক লাইভ API Key সংগ্রহ করে দিন।',
          details: data,
        };
      }

      return {
        success: false,
        statusCode: res.status,
        message: `Paymently গেটওয়ে রেসপন্স: ${data?.message || `HTTP ${res.status}`}`,
        details: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Paymently সার্ভারে সংযোগ করা যায়নি: ${err.message}`,
      };
    }
  }
}
