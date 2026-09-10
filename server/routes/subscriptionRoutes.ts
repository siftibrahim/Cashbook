import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { DEFAULT_PLANS } from '../../src/services/adminService';
import { PaymentGatewayManager } from '../services/paymentProviders';
import { SubscriptionEngine } from '../services/subscriptionEngine';
import { PaymentlyService } from '../services/paymentlyService';

const router = Router();

/**
 * GET /api/subscription/plans (Public / Authenticated)
 * Returns dynamic plans configured by Admin or standard default tiers (৳50, ৳100, ৳200, ৳500)
 */
router.get('/plans', async (req, res) => {
  try {
    const pool = getDbPool();
    let settingsData: any = null;

    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'");
      if (result.rows.length > 0 && result.rows[0].data) {
        settingsData = typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data;
      }
    } else if (inMemoryStore.system_config['system_payment_settings']) {
      settingsData = inMemoryStore.system_config['system_payment_settings'];
    }

    const allPlans = settingsData?.customPlans?.length > 0 ? settingsData.customPlans : DEFAULT_PLANS;
    // Filter enabled plans
    const enabledPlans = allPlans.filter((p: any) => p.isEnabled !== false);

    return res.json({
      plans: enabledPlans.length > 0 ? enabledPlans : DEFAULT_PLANS,
      trialConfig: settingsData?.trialConfig || { isTrialEnabled: true, trialDays: 14, trialPlanName: 'ফ্রি ট্রায়াল (১৪ দিন)' },
      bonusConfig: settingsData?.bonusConfig || { isBonusEnabled: true, bonusDays: 7, bonusTitle: 'স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)' },
    });
  } catch (err: any) {
    return res.json({ plans: DEFAULT_PLANS });
  }
});

/**
 * GET /api/subscription/payment-settings (Public/Authenticated)
 */
router.get('/payment-settings', async (req, res) => {
  try {
    const pool = getDbPool();
    let rawSettings: any = null;

    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'");
      if (result.rows.length > 0 && result.rows[0].data) {
        rawSettings = typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data;
      }
    } else if (inMemoryStore.system_config['system_payment_settings']) {
      rawSettings = inMemoryStore.system_config['system_payment_settings'];
    }

    if (!rawSettings) {
      rawSettings = {
        id: 'system_payment_settings',
        trialConfig: { isTrialEnabled: true, trialDays: 14, trialPlanName: 'ফ্রি ট্রায়াল (১৪ দিন)' },
        bonusConfig: { isBonusEnabled: true, bonusDays: 7, bonusTitle: 'স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)', bonusDescription: 'যেকোনো প্যাকেজ রিনিউ বা সাবস্ক্রিপশন নিলে সাথে আরও ৭ দিন বোনাস মেয়াদ যুক্ত হবে।' },
        bkash: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'বিকাশ অ্যাপ থেকে Send Money করুন' } },
        nagad: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'নগদ অ্যাপ থেকে Send Money করুন' } },
        rocket: { isEnabled: true, personal: { number: '01306908115-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে Send Money করুন' } },
        upay: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে Send Money করুন' } },
        bankTransfer: { isEnabled: true, accounts: [] },
        gateways: [],
        customPlans: DEFAULT_PLANS,
      };
    }

    const plConfig = await PaymentlyService.getConfig();

    const sanitizedSettings = {
      ...rawSettings,
      paymently: {
        isEnabled: plConfig.isEnabled,
        baseUrl: plConfig.baseUrl,
        isConfigured: !!plConfig.apiKey,
        isSandbox: plConfig.isSandbox,
        apiKeyMasked: plConfig.apiKey
          ? `${plConfig.apiKey.substring(0, 4)}••••••••${plConfig.apiKey.substring(plConfig.apiKey.length - 4)}`
          : undefined,
      },
    };

    return res.json({ settings: sanitizedSettings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscription/my-status (Authenticated)
 * Returns live subscription status, validity date, and pending requests
 */
router.get('/my-status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'ব্যবহারকারী অনুমোদিত নয়' });
    }

    const status = await SubscriptionEngine.getUserStatus(userId);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/subscription/submit-payment (Authenticated User submits TrxID)
 */
router.post('/submit-payment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'ব্যবহারকারী অনুমোদিত নয়' });
    }

    const {
      planId,
      planName,
      durationDays,
      amount,
      paymentMethod,
      paymentMode,
      trxId,
      senderNumber,
      bankDetails,
      userNote,
    } = req.body;

    if (!planId || !amount || !trxId || !senderNumber || !paymentMethod) {
      return res.status(400).json({ error: 'সকল প্রয়োজনীয় পেমেন্ট তথ্য (প্যাকেজ, টাকা, ট্রানজেকশন আইডি ও প্রেরক নম্বর) প্রদান করুন' });
    }

    const cleanTrx = trxId.trim().toUpperCase();
    const cleanSender = senderNumber.trim();
    const cleanAmount = parseFloat(amount) || 0;

    // Strict 11-digit mobile validation for MFS (bKash, Nagad, Rocket, Upay)
    if (['bkash', 'nagad', 'rocket', 'upay'].includes(paymentMethod)) {
      const strippedNum = cleanSender.replace(/[\s-]/g, '');
      const bdPhoneRegex = /^01[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(strippedNum) || strippedNum.length !== 11) {
        return res.status(400).json({
          error: 'মোবাইল নম্বর অবশ্যই সঠিক ১১ ডিজিটের হতে হবে (যেমন: 017XXXXXXXX)।'
        });
      }
    }

    // Strict TrxID validation
    if (cleanTrx.length < 6) {
      return res.status(400).json({
        error: 'অনুগ্রহ করে সঠিক Transaction ID (TrxID) দিন (কমপক্ষে ৬-১০ ডিজিটের অক্ষর/সংখ্যা)।'
      });
    }

    const pool = getDbPool();
    const now = Date.now();

    // Check if user ALREADY has a pending payment request (Duplicate Pending Protection)
    if (pool) {
      const pendingCheck = await pool.query(
        "SELECT id, trx_id, plan_name, amount FROM payments WHERE user_id = $1 AND status = 'pending'",
        [userId]
      );
      if (pendingCheck.rows.length > 0) {
        const p = pendingCheck.rows[0];
        return res.status(400).json({
          error: `আপনার ইতিমধ্যে একটি পেমেন্ট ভেরিফিকেশন অপেক্ষমাণ রয়েছে (TrxID: ${p.trx_id}, ৳${p.amount})। সুপার অ্যাডমিন যাচাই করার পর নতুন অনুরোধ করা যাবে।`
        });
      }

      // Check duplicate TrxID across all pending & approved records
      const dupCheck = await pool.query(
        "SELECT id, status, shop_name, user_id FROM payments WHERE UPPER(trx_id) = $1 AND status IN ('pending', 'approved')",
        [cleanTrx]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({
          error: `এই Transaction ID (${cleanTrx}) ইতিমধ্যে একবার ব্যবহার বা সাবমিট করা হয়েছে। একই TrxID বারবার ব্যবহার করা যাবে না। অনুগ্রহ করে আপনার সঠিক TrxID দিন।`
        });
      }
    } else {
      const userPending = (inMemoryStore.payments || []).find(p => p.userId === userId && p.status === 'pending');
      if (userPending) {
        return res.status(400).json({
          error: `আপনার ইতিমধ্যে একটি পেমেন্ট ভেরিফিকেশন অপেক্ষমাণ রয়েছে (TrxID: ${userPending.trxId})। সুপার অ্যাডমিন যাচাই করা পর্যন্ত অপেক্ষা করুন।`
        });
      }

      const dup = (inMemoryStore.payments || []).find(
        p => p.trxId?.toUpperCase() === cleanTrx && ['pending', 'approved'].includes(p.status)
      );
      if (dup) {
        return res.status(400).json({
          error: `এই Transaction ID (${cleanTrx}) ইতিমধ্যে একবার ব্যবহার বা সাবমিট করা হয়েছে। একই TrxID বারবার ব্যবহার করা যাবে না।`
        });
      }
    }

    // Dynamic bonus days calculation from system_payment_settings
    let bonusDays = 0;
    if (pool) {
      try {
        const cfgRes = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings' LIMIT 1");
        if (cfgRes.rows.length > 0 && cfgRes.rows[0].data) {
          const cfg = typeof cfgRes.rows[0].data === 'string' ? JSON.parse(cfgRes.rows[0].data) : cfgRes.rows[0].data;
          if (cfg?.bonusConfig?.isBonusEnabled !== false) {
            bonusDays = parseInt(cfg?.bonusConfig?.bonusDays, 10);
            if (isNaN(bonusDays) || bonusDays < 0) bonusDays = 7;
          } else {
            bonusDays = 0;
          }
        } else {
          bonusDays = 7;
        }
      } catch (e) {
        bonusDays = 7;
      }
    } else if (inMemoryStore.system_config['system_payment_settings']?.bonusConfig) {
      const bCfg = inMemoryStore.system_config['system_payment_settings'].bonusConfig;
      if (bCfg.isBonusEnabled !== false) {
        bonusDays = parseInt(bCfg.bonusDays, 10);
        if (isNaN(bonusDays) || bonusDays < 0) bonusDays = 7;
      } else {
        bonusDays = 0;
      }
    } else {
      bonusDays = 7;
    }

    const planDuration = parseInt(durationDays, 10) || (cleanAmount === 100 ? 60 : (cleanAmount === 200 ? 120 : (cleanAmount === 50 ? 30 : 30)));

    const paymentId = 'pay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    let userName = req.user?.email || 'User';
    let userPhone = '';
    let shopName = req.user?.shopName || 'Shop';

    if (pool) {
      const uRes = await pool.query('SELECT name, phone, shop_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        userName = uRes.rows[0].name;
        userPhone = uRes.rows[0].phone;
        shopName = uRes.rows[0].shop_name;
      }

      await pool.query(`
        INSERT INTO payments (
          id, user_id, user_name, user_phone, sender_phone, sender_number, shop_name,
          plan_id, plan_name, duration_days, bonus_days, amount, payment_method, payment_mode,
          trx_id, bank_details, admin_notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        paymentId, userId, userName, userPhone, cleanSender, cleanSender, shopName,
        planId, planName || planId, planDuration, bonusDays, cleanAmount, paymentMethod, paymentMode || 'manual_mfs',
        cleanTrx, JSON.stringify(bankDetails || {}), userNote ? `গ্রাহক নোট: ${userNote}` : null, 'pending', now
      ]);

      // 1. Notify Admin ONLY (Target = 'admin', so regular users NEVER see this)
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'notif_admin_' + now,
        'নতুন পেমেন্ট অনুরোধ (ভেরিফিকেশন অপেক্ষমাণ)',
        `${shopName} (${userName}) ৳${cleanAmount} পেমেন্ট সাবমিট করেছেন। TrxID: ${cleanTrx} (${planName || 'প্যাকেজ'})`,
        'payment_receipt',
        'admin',
        null,
        'high',
        false,
        now
      ]);

      // 2. Targeted Notification for THIS specific user ONLY
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'notif_user_' + now,
        '⏳ পেমেন্ট ভেরিফিকেশন হচ্ছে',
        `আপনার ৳${cleanAmount} টাকার পেমেন্ট তথ্য (TrxID: ${cleanTrx}) জমা হয়েছে। সুপার অ্যাডমিন যাচাই করলেই আপনার অ্যাকাউন্টে সাবস্ক্রিপশনটি সক্রিয় হবে।${bonusDays > 0 ? ` (বোনাস +${bonusDays} দিন অন্তর্ভুক্ত হবে)` : ''}`,
        'payment_receipt',
        'specific',
        userId,
        userName,
        'high',
        false,
        now
      ]);
    } else {
      const payRecord = {
        id: paymentId,
        userId,
        userName,
        userPhone,
        senderNumber: cleanSender,
        shopName,
        planId,
        planName: planName || planId,
        durationDays: planDuration,
        bonusDays,
        amount: cleanAmount,
        paymentMethod,
        paymentMode: paymentMode || 'manual_mfs',
        trxId: cleanTrx,
        bankDetails,
        adminNotes: userNote ? `গ্রাহক নোট: ${userNote}` : undefined,
        status: 'pending',
        createdAt: now,
      };
      inMemoryStore.payments.push(payRecord);

      // Targeted Notifications in memory
      if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
      // Admin notification (target: admin)
      inMemoryStore.notifications.unshift({
        id: 'notif_admin_' + now,
        title: 'নতুন পেমেন্ট অনুরোধ (ভেরিফিকেশন অপেক্ষমাণ)',
        message: `${shopName} (${userName}) ৳${cleanAmount} পেমেন্ট সাবমিট করেছেন। TrxID: ${cleanTrx} (${planName || 'প্যাকেজ'})`,
        type: 'payment_receipt',
        target: 'admin',
        priority: 'high',
        isRead: false,
        createdAt: now,
      });
      // User targeted notification (target: specific)
      inMemoryStore.notifications.unshift({
        id: 'notif_user_' + now,
        title: '⏳ পেমেন্ট ভেরিফিকেশন হচ্ছে',
        message: `আপনার ৳${cleanAmount} টাকার পেমেন্ট তথ্য (TrxID: ${cleanTrx}) জমা হয়েছে। সুপার অ্যাডমিন যাচাই করলেই আপনার অ্যাকাউন্টে সাবস্ক্রিপশনটি সক্রিয় হবে।${bonusDays > 0 ? ` (বোনাস +${bonusDays} দিন অন্তর্ভুক্ত হবে)` : ''}`,
        type: 'payment_receipt',
        target: 'specific',
        targetUserId: userId,
        targetUserName: userName,
        priority: 'high',
        isRead: false,
        createdAt: now,
      });
    }

    return res.status(201).json({
      message: '✅ আপনার পেমেন্ট তথ্য সফলভাবে জমা হয়েছে! সুপার অ্যাডমিন দ্রুত যাচাই করে অনুমোদন করবেন।',
      paymentId,
      bonusDays,
    });
  } catch (err: any) {
    console.error('Payment Submission Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscription/my-payments (Authenticated User's payment history)
 */
router.get('/my-payments', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      const payments = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        senderNumber: row.sender_number || row.sender_phone,
        shopName: row.shop_name,
        planId: row.plan_id,
        planName: row.plan_name,
        durationDays: row.duration_days,
        amount: parseFloat(row.amount) || 0,
        paymentMethod: row.payment_method,
        paymentMode: row.payment_mode,
        trxId: row.trx_id,
        status: row.status,
        createdAt: Number(row.created_at),
        approvedAt: row.approved_at ? Number(row.approved_at) : undefined,
        rejectedReason: row.rejected_reason,
        refundReason: row.refund_reason,
        refundAmount: row.refund_amount ? parseFloat(row.refund_amount) : undefined,
        adminNotes: row.admin_notes,
      }));
      return res.json({ payments });
    } else {
      const list = inMemoryStore.payments
        .filter(p => p.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ payments: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * ---------------- PAYMENTLY PAYMENT GATEWAY ROUTES ----------------
 */

/**
 * 1. POST /api/subscription/paymently/checkout (Authenticated)
 * Initiates Paymently Checkout session for chosen subscription package
 */
router.post('/paymently/checkout', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'ব্যবহারকারী অনুমোদিত নয়' });
    }

    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'সাবস্ক্রিপশন প্ল্যান আইডি প্রদান করুন' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const appBaseUrl = `${protocol}://${host}`;

    const checkout = await PaymentlyService.createCheckout({
      planId,
      userId,
      userEmail: req.user?.email,
      userName: req.user?.name,
      userPhone: req.user?.phone,
      shopName: req.user?.shopName,
      appBaseUrl,
    });

    return res.json(checkout);
  } catch (err: any) {
    console.error('Paymently Checkout Error:', err);
    return res.status(400).json({ error: err.message || 'পেমেন্ট সেশন তৈরিতে ত্রুটি হয়েছে' });
  }
});

/**
 * 2. GET & POST /api/subscription/paymently/callback
 * Redirect handler after customer finishes payment on Paymently checkout
 */
const handlePaymentlyCallback = async (req: any, res: Response) => {
  try {
    const invoiceId = (req.query.invoice_id || req.query.invoiceId || req.body?.invoice_id || '') as string;
    const paymentId = (req.query.payment_id || req.query.paymentId || req.body?.payment_id || '') as string;
    const statusParam = (req.query.status || req.body?.status || '') as string;
    const isSmsType = req.query.type === 'sms' || paymentId.startsWith('pay_sms_') || paymentId.startsWith('sms_');

    if (statusParam.toLowerCase() === 'cancelled') {
      if (paymentId) {
        const pool = getDbPool();
        if (isSmsType) {
          if (pool) {
            await pool.query(
              "UPDATE sms_purchases SET status = 'cancelled', admin_note = 'গ্রাহক গেটওয়ে পেজে পেমেন্ট বাতিল করেছেন' WHERE id = $1 AND status IN ('initiated', 'pending')",
              [paymentId]
            ).catch(() => {});
          } else {
            const sp = (inMemoryStore.sms_purchases || []).find((x: any) => x.id === paymentId);
            if (sp && (sp.status === 'initiated' || sp.status === 'pending')) sp.status = 'cancelled';
          }
        } else {
          if (pool) {
            await pool.query(
              "UPDATE payments SET status = 'cancelled', admin_notes = 'গ্রাহক গেটওয়ে পেজে পেমেন্ট বাতিল করেছেন' WHERE id = $1 AND status IN ('initiated', 'pending')",
              [paymentId]
            );
          } else {
            const p = inMemoryStore.payments.find((x) => x.id === paymentId);
            if (p && (p.status === 'initiated' || p.status === 'pending')) {
              p.status = 'cancelled';
            }
          }
        }
      }
      return res.redirect(`/?payment_status=cancelled&payment_id=${encodeURIComponent(paymentId)}${isSmsType ? '&type=sms' : ''}`);
    }

    if (!invoiceId) {
      if (paymentId) {
        const pool = getDbPool();
        if (isSmsType) {
          if (pool) {
            await pool.query(
              "UPDATE sms_purchases SET status = 'cancelled', admin_note = 'পেমেন্ট ইনভয়েস ছাড়া সেশন সমাপ্ত / বাতিল' WHERE id = $1 AND status IN ('initiated', 'pending')",
              [paymentId]
            ).catch(() => {});
          }
        } else {
          if (pool) {
            await pool.query(
              "UPDATE payments SET status = 'cancelled', admin_notes = 'পেমেন্ট ইনভয়েস ছাড়া সেশন সমাপ্ত / বাতিল' WHERE id = $1 AND status IN ('initiated', 'pending')",
              [paymentId]
            );
          }
        }
      }
      return res.redirect(`/?payment_status=cancelled&message=${encodeURIComponent('পেমেন্ট সেশন সম্পন্ন করা হয়নি')}${isSmsType ? '&type=sms' : ''}`);
    }

    // Verify with Paymently Verify API before activating subscription or SMS!
    const verifyResult = await PaymentlyService.verifyAndActivatePayment(invoiceId, {
      expectedPaymentId: paymentId,
    });

    if (verifyResult.success && verifyResult.status === 'approved') {
      const trx = verifyResult.trxId || invoiceId;
      const amount = verifyResult.amount || '';
      const plan = encodeURIComponent(verifyResult.planName || (verifyResult.isSms ? `${verifyResult.smsCount}টি SMS` : 'প্রো প্যাকেজ'));
      const isSmsQuery = verifyResult.isSms ? `&type=sms&sms_count=${verifyResult.smsCount || ''}` : '';
      return res.redirect(
        `/?payment_status=success&invoice_id=${encodeURIComponent(invoiceId)}&trx_id=${encodeURIComponent(trx)}&amount=${amount}&plan=${plan}${isSmsQuery}`
      );
    } else if (verifyResult.status === 'pending') {
      return res.redirect(
        `/?payment_status=pending&invoice_id=${encodeURIComponent(invoiceId)}&message=${encodeURIComponent(verifyResult.message)}${verifyResult.isSms ? '&type=sms' : ''}`
      );
    } else {
      return res.redirect(
        `/?payment_status=failed&invoice_id=${encodeURIComponent(invoiceId)}&message=${encodeURIComponent(verifyResult.message)}${verifyResult.isSms ? '&type=sms' : ''}`
      );
    }
  } catch (err: any) {
    console.error('Payment Callback Processing Error:', err);
    return res.redirect(
      `/?payment_status=failed&message=${encodeURIComponent(err.message || 'পেমেন্ট যাচাইকরণে ত্রুটি হয়েছে')}`
    );
  }
};

router.get('/paymently/callback', handlePaymentlyCallback);
router.post('/paymently/callback', handlePaymentlyCallback);

/**
 * 3. POST /api/subscription/paymently/verify (Authenticated)
 * Manual or programmatic verify endpoint
 */
router.post('/paymently/verify', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { invoiceId, paymentId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID প্রদান করুন' });
    }

    const result = await PaymentlyService.verifyAndActivatePayment(invoiceId, {
      expectedPaymentId: paymentId,
      expectedUserId: req.user?.userId,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'যাচাইকরণে সমস্যা হয়েছে' });
  }
});

/**
 * 3b. GET /api/subscription/paymently/status/:paymentId (Authenticated)
 * Poll status of an initiated payment
 */
router.get('/paymently/status/:paymentId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.paymentId;
    const userId = req.user?.userId;
    const pool = getDbPool();

    let payment: any = null;
    if (pool) {
      const q = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
      if (q.rows.length > 0) {
        payment = q.rows[0];
      }
    } else {
      payment = inMemoryStore.payments.find((p) => p.id === paymentId);
    }

    if (!payment) {
      return res.status(404).json({ error: 'পেমেন্ট রেকর্ড পাওয়া যায়নি' });
    }

    const userStatus = await SubscriptionEngine.getUserStatus(userId!);

    return res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      planName: payment.plan_name || payment.planName,
      amount: payment.amount,
      trxId: payment.trx_id || payment.trxId,
      isSubscribed: !userStatus.isExpired,
      subscriptionStatus: userStatus.subscriptionStatus,
      subscriptionExpiresAt: userStatus.subscriptionExpiresAt,
      daysRemaining: userStatus.daysRemaining,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3c. POST /api/subscription/paymently/cancel (Authenticated)
 * User actively cancels or closes an uncompleted gateway checkout session
 */
router.post('/paymently/cancel', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.body || {};
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'অননুমোদিত অ্যাক্সেস' });
    }

    const pool = getDbPool();
    if (pool) {
      if (paymentId) {
        await pool.query(
          "UPDATE payments SET status = 'cancelled', admin_notes = 'গ্রাহক পেমেন্ট সেশন বাতিল করেছেন' WHERE id = $1 AND user_id = $2 AND status IN ('initiated', 'pending')",
          [paymentId, userId]
        );
      } else {
        await pool.query(
          "UPDATE payments SET status = 'cancelled', admin_notes = 'গ্রাহক পেমেন্ট সেশন বাতিল করেছেন' WHERE user_id = $1 AND (status = 'initiated' OR (status = 'pending' AND (payment_mode = 'automated_gateway' OR trx_id LIKE 'PL_INIT_%')))",
          [userId]
        );
      }
    } else {
      (inMemoryStore.payments || []).forEach((p) => {
        if (
          p.userId === userId &&
          (p.id === paymentId || p.status === 'initiated' || (p.status === 'pending' && (p.paymentMode === 'automated_gateway' || String(p.trxId || '').startsWith('PL_INIT_'))))
        ) {
          p.status = 'cancelled';
        }
      });
    }

    // Return fresh user status
    const status = await SubscriptionEngine.getUserStatus(userId);
    return res.json({ success: true, message: 'পেমেন্ট সেশন সফলভাবে বাতিল করা হয়েছে', status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'পেমেন্ট সেশন বাতিল করা যায়নি' });
  }
});

/**
 * 4. POST /api/subscription/paymently/webhook
 * Automated background instant IPN / Webhook from Paymently
 */
router.post('/paymently/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[PAYMENTLY WEBHOOK] Incoming IPN notification:', payload);

    const invoiceId = payload.invoice_id || payload.invoiceId || payload.order_id;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Missing invoice_id in webhook' });
    }

    const result = await PaymentlyService.verifyAndActivatePayment(invoiceId, {
      expectedPaymentId: payload.metadata?.payment_id,
      expectedUserId: payload.metadata?.user_id,
    });

    return res.json({ success: true, result });
  } catch (err: any) {
    console.error('[PAYMENTLY WEBHOOK ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 5. POST /api/subscription/paymently/test-connection (Authenticated)
 * Admin connection tester for Paymently gateway
 */
router.post('/paymently/test-connection', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { baseUrl, apiKey } = req.body || {};
    const result = await PaymentlyService.testConnection({ baseUrl, apiKey });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 6. GET /api/subscription/paymently/sandbox-checkout
 * Developer & Sandbox simulation UI for testing Paymently integration
 */
router.get('/paymently/sandbox-checkout', (req, res) => {
  const { payment_id, amount, plan_name, notice, warning } = req.query;
  const simInvoiceId = 'SIM_INV_' + Date.now();
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const appBaseUrl = `${protocol}://${host}`;

  const hasKeyWarning = notice === 'invalid_api_key' || warning === 'invalid_key';

  const successUrl = `${appBaseUrl}/api/subscription/paymently/callback?invoice_id=${simInvoiceId}&payment_id=${encodeURIComponent(String(payment_id || ''))}`;
  const cancelUrl = `${appBaseUrl}/api/subscription/paymently/callback?status=cancelled&payment_id=${encodeURIComponent(String(payment_id || ''))}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Paymently Sandbox Gateway - TWING Hisabi</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
        .badge { display: inline-block; background: #0d9488; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
        .warn-banner { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 14px; padding: 12px; font-size: 12px; color: #fbbf24; text-align: left; margin-bottom: 18px; line-height: 1.5; }
        h2 { margin: 0 0 8px; font-size: 22px; color: #fff; }
        p { color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
        .details { background: #0f172a; border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e293b; }
        .row:last-child { border: none; font-weight: bold; font-size: 15px; color: #38bdf8; }
        .btn-success { display: block; width: 100%; background: #0d9488; color: white; border: none; padding: 14px; border-radius: 14px; font-size: 14px; font-weight: bold; cursor: pointer; text-decoration: none; margin-bottom: 10px; box-sizing: border-box; }
        .btn-cancel { display: block; width: 100%; background: #334155; color: #cbd5e1; border: none; padding: 12px; border-radius: 14px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; box-sizing: border-box; }
        .btn-success:hover { background: #0f766e; }
        .btn-cancel:hover { background: #475569; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">Paymently Gateway Sandbox</span>
        ${
          hasKeyWarning
            ? `<div class="warn-banner">
                ⚠️ <strong>দৃষ্টি আকর্ষণ:</strong> লাইভ Paymently API Key অকার্যকর (Invalid/expired) বা সেট করা নেই। ইউজার ফ্লো সচল রাখতে এটি টেস্ট স্যান্ডবক্স মোডে ওপেন হয়েছে। লাইভ করতে সুপার অ্যাডমিন প্যানেল থেকে সঠিক API Key দিন।
               </div>`
            : ''
        }
        <h2>পেমেন্ট সম্পন্ন করুন</h2>
        <p>এটি একটি নিরাপদ টেস্ট স্যান্ডবক্স পরিবেশ। এখানে কোনো আসল অর্থ চার্জ হবে না।</p>
        <div class="details">
          <div class="row"><span>প্যাকেজ:</span> <span>${plan_name || 'সাবস্ক্রিপশন'}</span></div>
          <div class="row"><span>রেফারেন্স:</span> <span>${payment_id || 'pay_test'}</span></div>
          <div class="row"><span>সিমুলেটেড ইনভয়েস:</span> <span style="font-family:monospace;font-size:11px;">${simInvoiceId}</span></div>
          <div class="row"><span>মোট পরিশোধযোগ্য:</span> <span>৳${amount || 99}</span></div>
        </div>
        <a href="${successUrl}" class="btn-success">✅ সফল টেস্ট পেমেন্ট সম্পন্ন করুন (Simulate Success)</a>
        <a href="${cancelUrl}" class="btn-cancel">❌ পেমেন্ট বাতিল করুন (Simulate Cancel)</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /api/subscription/webhook/:provider (Automated Payment Gateway Webhook Callback)
 */
router.post('/webhook/:provider', async (req, res) => {
  try {
    const provider = req.params.provider;
    const payload = req.body;
    console.log(`[PAYMENT WEBHOOK] Received webhook from ${provider}:`, payload);

    // Verify through Gateway manager
    const verification = await PaymentGatewayManager.verifyAutomatedPayment(provider, payload);
    if (!verification.success || verification.status !== 'approved') {
      return res.status(400).json({ error: verification.message });
    }

    // Auto-approve and activate user subscription if valid
    return res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/subscription/ad-settings
 * Returns public ad configuration so client knows whether ads are enabled and which ad formats to display
 */
router.get('/ad-settings', async (req, res) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_ad_settings'");
      if (result.rows.length > 0 && result.rows[0].data) {
        const data = typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data;
        return res.json({ settings: data });
      }
    } else if (inMemoryStore.system_config['system_ad_settings']) {
      return res.json({ settings: inMemoryStore.system_config['system_ad_settings'] });
    }

    const defaultAds = {
      isAdsEnabled: true,
      adProvider: 'admob',
      admobAppId: 'ca-app-pub-3940256099942544~3347511713',
      admobBannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
      admobInterstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
      bannerAdEnabled: true,
      dashboardCardAdEnabled: true,
      footerBannerAdEnabled: true,
      customAds: [
        {
          id: 'ad_scanner_machine',
          title: '🛍️ সুপার শপ ও ফার্মেসি বারকোড ও কিউআর স্ক্যানার',
          description: 'দ্রুত ক্যাশ ও পিওএস বিক্রয়ের জন্য হাই-স্পিড বারকোড স্ক্যানার এবং থার্মাল প্রিন্টার অফার।',
          badge: 'প্রস্তাবিত পার্টনার',
          targetUrl: 'https://wa.me/8801306908115',
          ctaText: 'অফার জানুন',
          isActive: true,
        },
      ],
      updatedAt: Date.now(),
    };
    return res.json({ settings: defaultAds });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
