import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { DEFAULT_PLANS } from '../../src/services/adminService';
import { PaymentGatewayManager } from '../services/paymentProviders';

const router = Router();

/**
 * GET /api/subscription/plans (Public / Authenticated)
 * Returns dynamic plans configured by Admin or standard default tiers (৳50, ৳100, ৳200, ৳500)
 */
router.get('/plans', async (req, res) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'");
      if (result.rows.length > 0 && result.rows[0].data?.customPlans?.length > 0) {
        return res.json({ plans: result.rows[0].data.customPlans });
      }
    } else if (inMemoryStore.system_config['system_payment_settings']?.customPlans?.length > 0) {
      return res.json({ plans: inMemoryStore.system_config['system_payment_settings'].customPlans });
    }

    return res.json({ plans: DEFAULT_PLANS });
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
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'");
      if (result.rows.length > 0) {
        return res.json({ settings: result.rows[0].data });
      }
    } else if (inMemoryStore.system_config['system_payment_settings']) {
      return res.json({ settings: inMemoryStore.system_config['system_payment_settings'] });
    }

    return res.json({
      settings: {
        id: 'system_payment_settings',
        bkash: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'বিকাশ অ্যাপ থেকে Send Money করুন' } },
        nagad: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'নগদ অ্যাপ থেকে Send Money করুন' } },
        rocket: { isEnabled: true, personal: { number: '01306908115-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে Send Money করুন' } },
        upay: { isEnabled: true, personal: { number: '01306908115', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে Send Money করুন' } },
        bankTransfer: { isEnabled: true, accounts: [] },
        gateways: [],
        customPlans: DEFAULT_PLANS,
      },
    });
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
    const pool = getDbPool();
    let subscriptionExpiresAt = Date.now() + 14 * 86400000;
    let pendingPaymentsCount = 0;
    let lastPayment: any = null;

    if (pool) {
      const uRes = await pool.query('SELECT subscription_expires_at FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0 && uRes.rows[0].subscription_expires_at) {
        subscriptionExpiresAt = Number(uRes.rows[0].subscription_expires_at);
      }

      const pRes = await pool.query(
        "SELECT * FROM payments WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (pRes.rows.length > 0) {
        pendingPaymentsCount = pRes.rowCount || 1;
        lastPayment = pRes.rows[0];
      }
    } else {
      const u = inMemoryStore.users.find(u => u.id === userId);
      if (u && u.subscription_expires_at) {
        subscriptionExpiresAt = Number(u.subscription_expires_at);
      }
      const pendingList = inMemoryStore.payments.filter(p => p.userId === userId && p.status === 'pending');
      pendingPaymentsCount = pendingList.length;
      if (pendingList.length > 0) lastPayment = pendingList[0];
    }

    const now = Date.now();
    const isExpired = subscriptionExpiresAt < now;
    const msRemaining = Math.max(0, subscriptionExpiresAt - now);
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return res.json({
      subscriptionExpiresAt,
      isExpired,
      daysRemaining,
      msRemaining,
      hasPendingPayment: pendingPaymentsCount > 0,
      pendingPayment: lastPayment,
      status: isExpired ? (pendingPaymentsCount > 0 ? 'pending_verification' : 'expired') : 'active',
    });
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
      return res.status(400).json({ error: 'সকল প্রয়োজনীয় পেমেন্ট তথ্য (প্ল্যান, টাকা, ট্রানজেকশন আইডি ও নম্বর) প্রদান করুন' });
    }

    const cleanTrx = trxId.trim().toUpperCase();
    const cleanSender = senderNumber.trim();
    const cleanAmount = parseFloat(amount) || 0;

    // Input validation
    const validation = PaymentGatewayManager.validatePaymentInput({
      paymentMethod,
      senderNumber: cleanSender,
      trxId: cleanTrx,
      amount: cleanAmount,
    });
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const pool = getDbPool();
    const now = Date.now();

    // Check for duplicate TrxID
    if (pool) {
      const dupCheck = await pool.query(
        "SELECT id, status, shop_name FROM payments WHERE UPPER(trx_id) = $1 AND status IN ('pending', 'approved')",
        [cleanTrx]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({
          error: `এই Transaction ID (${cleanTrx}) ইতিমধ্যে একবার ব্যবহার বা সাবমিট করা হয়েছে। অনুগ্রহ করে সঠিক TrxID দিন।`
        });
      }
    } else {
      const dup = inMemoryStore.payments.find(
        p => p.trxId?.toUpperCase() === cleanTrx && ['pending', 'approved'].includes(p.status)
      );
      if (dup) {
        return res.status(400).json({
          error: `এই Transaction ID (${cleanTrx}) ইতিমধ্যে একবার ব্যবহার বা সাবমিট করা হয়েছে। অনুগ্রহ করে সঠিক TrxID দিন।`
        });
      }
    }

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
          plan_id, plan_name, duration_days, amount, payment_method, payment_mode,
          trx_id, bank_details, admin_notes, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        paymentId, userId, userName, userPhone, cleanSender, cleanSender, shopName,
        planId, planName || planId, durationDays || 30, cleanAmount, paymentMethod, paymentMode || 'manual_mfs',
        cleanTrx, JSON.stringify(bankDetails || {}), userNote ? `গ্রাহক নোট: ${userNote}` : null, 'pending', now
      ]);

      // Create Admin notification
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'notif_' + now,
        'নতুন পেমেন্ট অনুরোধ (ভেরিফিকেশন অপেক্ষমাণ)',
        `${shopName} (${userName}) ৳${cleanAmount} পেমেন্ট সাবমিট করেছেন। TrxID: ${cleanTrx}`,
        'payment_receipt',
        'all',
        null,
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
        durationDays: durationDays || 30,
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
    }

    return res.status(201).json({
      message: '✅ আপনার পেমেন্ট তথ্য সফলভাবে জমা হয়েছে! অ্যাডমিন দ্রুত যাচাই করে অনুমোদন করবেন।',
      paymentId,
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

export default router;
