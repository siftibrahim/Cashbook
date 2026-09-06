import { getDbPool, inMemoryStore } from '../db';
import { SubscriptionEngine } from './subscriptionEngine';
import { DEFAULT_PLANS } from '../../src/services/adminService';

export interface PaymentlyConfig {
  baseUrl: string;
  apiKey: string;
  isEnabled: boolean;
  isSandbox: boolean;
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
  alreadyProcessed?: boolean;
}

export class PaymentlyService {
  /**
   * Fetch current Paymently gateway configuration from DB settings or environment variables
   */
  public static async getConfig(): Promise<PaymentlyConfig> {
    const pool = getDbPool();
    let dbConfig: any = null;

    if (pool) {
      try {
        const res = await pool.query(
          "SELECT data FROM system_config WHERE id = 'system_payment_settings'"
        );
        if (res.rows.length > 0) {
          dbConfig = res.rows[0].data?.paymently;
        }
      } catch (err) {
        console.warn('⚠️ [Paymently] Could not query system_config:', err);
      }
    } else {
      const cfg = inMemoryStore.system_config?.['system_payment_settings'];
      dbConfig = cfg?.paymently;
    }

    const envBaseUrl = process.env.PAYMENTLY_BASE_URL || 'https://twinghisabi.paymently.io/api';
    const envApiKey = process.env.PAYMENTLY_API_KEY || process.env.PAYMENTLY_KEY || '';

    const baseUrl = (dbConfig?.baseUrl || envBaseUrl).replace(/\/+$/, '');
    const apiKey = dbConfig?.apiKey || envApiKey;
    const isEnabled = dbConfig?.isEnabled !== undefined ? !!dbConfig.isEnabled : true;
    const isSandbox = !!dbConfig?.isSandbox;

    return {
      baseUrl,
      apiKey,
      isEnabled,
      isSandbox,
    };
  }

  /**
   * Step 1: Create Paymently Checkout Session
   * Server-side only with complete package validation
   */
  public static async createCheckout(params: {
    planId: string;
    userId: string;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    shopName?: string;
    appBaseUrl: string;
  }) {
    const config = await this.getConfig();

    if (!config.isEnabled) {
      throw new Error('Paymently গেটওয়ে বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে বিকল্প পেমেন্ট পদ্ধতি ব্যবহার করুন।');
    }

    // 1. Resolve & Validate Plan Server-Side (Never trust client pricing)
    let plan = DEFAULT_PLANS.find((p) => p.id === params.planId);
    let bonusDays = 0;

    const pool = getDbPool();
    if (pool) {
      try {
        const setRes = await pool.query(
          "SELECT data FROM system_config WHERE id = 'system_payment_settings'"
        );
        if (setRes.rows.length > 0) {
          const settings = setRes.rows[0].data;
          if (settings.customPlans && Array.isArray(settings.customPlans)) {
            const foundCustom = settings.customPlans.find((p: any) => p.id === params.planId);
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
        const found = settings.customPlans.find((p: any) => p.id === params.planId);
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
    const now = Date.now();

    // 2. Pre-create pending record in payments table for full traceability
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
          'pending',
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
        status: 'pending',
        gatewayMetadata: {
          checkoutInitiatedAt: now,
          planId: plan.id,
          planPrice: plan.price,
        },
        createdAt: now,
      } as any);
    }

    // 3. Check for Sandbox Simulation Mode (if enabled by admin)
    if (config.isSandbox || !config.apiKey) {
      console.log('🧪 [Paymently] Sandbox/Simulation checkout initiated for payment:', paymentId);
      const simulatedPaymentUrl = `${params.appBaseUrl}/api/subscription/paymently/sandbox-checkout?payment_id=${paymentId}&amount=${plan.price}&plan_name=${encodeURIComponent(plan.nameBn || plan.name)}`;
      return {
        success: true,
        paymentUrl: simulatedPaymentUrl,
        paymentId,
        isSandbox: true,
      };
    }

    // 4. Call Paymently Checkout API
    const callbackUrl = `${params.appBaseUrl}/api/subscription/paymently/callback?payment_id=${paymentId}`;
    const cancelUrl = `${params.appBaseUrl}/api/subscription/paymently/callback?status=cancelled&payment_id=${paymentId}`;

    const requestBody = {
      full_name: params.userName || params.shopName || 'TWING Hisabi User',
      email: params.userEmail || `${(params.userPhone || '01700000000').replace(/\D/g, '')}@twing.com`,
      amount: plan.price.toString(),
      metadata: {
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

    // Try primary /checkout and fallback to /checkout-v2 if needed
    const primaryUrl = `${config.baseUrl}/checkout`;
    const secondaryUrl = `${config.baseUrl}/checkout-v2`;

    let responseData: any = null;
    let responseStatus = 0;

    try {
      console.log(`[Paymently] Calling checkout API at: ${primaryUrl}`);
      let apiRes = await fetch(primaryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'X-API-KEY': config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      responseStatus = apiRes.status;

      // If primary returned 404, attempt checkout-v2
      if (responseStatus === 404) {
        console.log(`[Paymently] 404 on ${primaryUrl}, trying: ${secondaryUrl}`);
        apiRes = await fetch(secondaryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'X-API-KEY': config.apiKey,
          },
          body: JSON.stringify(requestBody),
        });
        responseStatus = apiRes.status;
      }

      responseData = await apiRes.json().catch(() => null);

      if (!apiRes.ok || !responseData) {
        const errMsg = responseData?.message || responseData?.error || `HTTP ${responseStatus}`;
        console.error('❌ [Paymently Checkout Error]', responseStatus, responseData);
        throw new Error(`Paymently গেটওয়ে সাড়া দেয়নি (${errMsg})। অনুগ্রহ করে API Key ও Base URL সঠিক আছে কিনা যাচাই করুন।`);
      }
    } catch (fetchErr: any) {
      console.error('❌ [Paymently Network Error]', fetchErr.message);
      throw new Error(
        fetchErr.message.includes('Paymently গেটওয়ে')
          ? fetchErr.message
          : `Paymently সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে (${fetchErr.message})।`
      );
    }

    const checkoutUrl = responseData.payment_url || responseData.checkout_url || responseData.url;

    if (!checkoutUrl) {
      console.error('❌ [Paymently Missing URL]', responseData);
      throw new Error('Paymently থেকে পেমেন্ট লিংক পাওয়া যায়নি। অ্যাডমিন প্যানেল থেকে গেটওয়ে সেটিংস যাচাই করুন।');
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
      console.log('🧪 [Paymently Sandbox] Verifying simulated invoice:', cleanInvoiceId);
      return await this.finalizeApprovedPayment({
        invoiceId: cleanInvoiceId,
        trxId: 'TRX_SIM_' + cleanInvoiceId,
        amount: 99,
        senderNumber: '01700000000',
        paymentMethod: 'bKash (Sandbox)',
        expectedPaymentId: options?.expectedPaymentId,
        expectedUserId: options?.expectedUserId,
        rawGatewayData: { simulated: true, invoiceId: cleanInvoiceId },
      });
    }

    // 3. Call Paymently Verify Payment API
    const verifyUrl = `${config.baseUrl}/verify-payment`;
    let verifyData: any = null;
    let verifyStatus = 0;

    try {
      console.log(`[Paymently] Calling verify API at: ${verifyUrl} with invoice_id=${cleanInvoiceId}`);
      const apiRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'X-API-KEY': config.apiKey,
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

    let targetPayment: any = null;
    let targetUserId = params.expectedUserId;

    if (pool) {
      // Find existing payment row
      if (params.expectedPaymentId) {
        const res = await pool.query('SELECT * FROM payments WHERE id = $1', [params.expectedPaymentId]);
        if (res.rows.length > 0) targetPayment = res.rows[0];
      }

      if (!targetPayment && targetUserId) {
        const res = await pool.query(
          "SELECT * FROM payments WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
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
        p = inMemoryStore.payments.find((x) => x.userId === targetUserId && x.status === 'pending');
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
}
