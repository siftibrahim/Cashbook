import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { sendSmsNotification } from '../services/smsService';

const router = Router();

// SMS Packages available for purchase
export const SMS_PACKAGES = [
  {
    id: 'pack_100',
    name: '১০০ এসএমএস স্টার্টার প্যাক',
    smsCount: 100,
    price: 50,
    badge: 'স্টার্টার',
    ratePerSms: '৳০.৫০/এসএমএস',
  },
  {
    id: 'pack_300',
    name: '৩০০ এসএমএস রেগুলার প্যাক',
    smsCount: 300,
    price: 135,
    badge: 'জনপ্রিয় অফার',
    isPopular: true,
    ratePerSms: '৳০.৪৫/এসএমএস',
  },
  {
    id: 'pack_500',
    name: '৫০০ এসএমএস বিজনেস প্যাক',
    smsCount: 500,
    price: 200,
    badge: 'সেরা ভ্যালু',
    ratePerSms: '৳০.৪০/এসএমএস',
  },
  {
    id: 'pack_1000',
    name: '১০০০ এসএমএস সুপার সেভার প্যাক',
    smsCount: 1000,
    price: 350,
    badge: 'সুপার সেভার',
    ratePerSms: '৳০.৩৫/এসএমএস',
  },
];

// All routes require user authentication
router.use(authenticateUser);

/**
 * GET /api/sms/balance
 * Returns current user's SMS balance and total sent count
 */
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    if (pool) {
      const uRes = await pool.query('SELECT sms_balance FROM users WHERE id = $1', [userId]);
      const balance = uRes.rows.length > 0 ? (uRes.rows[0].sms_balance ?? 20) : 20;

      const logRes = await pool.query('SELECT COUNT(*) as total_sent FROM sms_logs WHERE user_id = $1', [userId]);
      const totalSent = parseInt(logRes.rows[0]?.total_sent || '0', 10);

      return res.json({ balance, totalSent });
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      const balance = u ? (u.smsBalance ?? 20) : 20;
      const totalSent = (inMemoryStore.sms_logs || []).filter(x => x.userId === userId).length;
      return res.json({ balance, totalSent });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sms/logs
 * Returns user's SMS history
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM sms_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      const logs = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        message: row.message,
        smsType: row.sms_type,
        status: row.status,
        costSms: row.cost_sms,
        createdAt: Number(row.created_at),
      }));
      return res.json({ logs });
    } else {
      const list = (inMemoryStore.sms_logs || [])
        .filter(x => x.userId === userId)
        .slice(0, 50);
      return res.json({ logs: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sms/send
 * Sends Tagada or payment confirmation SMS to customer
 */
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const { customerName, customerPhone, message, smsType } = req.body;

    if (!customerPhone || !message) {
      return res.status(400).json({ error: 'মোবাইল নম্বর ও মেসেজ আবশ্যক' });
    }

    const pool = getDbPool();
    let currentBalance = 20;

    if (pool) {
      const uRes = await pool.query('SELECT sms_balance FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
      currentBalance = uRes.rows[0].sms_balance ?? 20;
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) currentBalance = u.smsBalance ?? 20;
    }

    if (currentBalance < 1) {
      return res.status(400).json({
        error: 'আপনার এসএমএস ব্যালেন্স শেষ হয়ে গেছে। অনুগ্রহ করে নতুন এসএমএস প্যাকেজ কিনুন।',
        balance: currentBalance,
      });
    }

    // Dispatch SMS via gateway service
    const smsResult = await sendSmsNotification(customerPhone, message);

    // Deduct 1 SMS from balance
    const newBalance = Math.max(0, currentBalance - 1);
    const logId = 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    if (pool) {
      await pool.query('UPDATE users SET sms_balance = $1 WHERE id = $2', [newBalance, userId]);
      await pool.query(`
        INSERT INTO sms_logs (id, user_id, customer_name, customer_phone, message, sms_type, status, cost_sms, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        logId,
        userId,
        customerName || 'গ্রাহক',
        customerPhone,
        message,
        smsType || 'tagada',
        smsResult.success ? 'sent' : 'failed',
        1,
        now,
      ]);
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) u.smsBalance = newBalance;

      if (!inMemoryStore.sms_logs) inMemoryStore.sms_logs = [];
      inMemoryStore.sms_logs.unshift({
        id: logId,
        userId,
        customerName: customerName || 'গ্রাহক',
        customerPhone,
        message,
        smsType: smsType || 'tagada',
        status: smsResult.success ? 'sent' : 'failed',
        costSms: 1,
        createdAt: now,
      });
    }

    return res.json({
      success: true,
      message: smsResult.message || '✅ গ্রাহকের মোবাইলে সফলভাবে এসএমএস পাঠানো হয়েছে!',
      newBalance,
      smsResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sms/packages
 */
router.get('/packages', (req, res) => {
  return res.json({ packages: SMS_PACKAGES });
});

/**
 * POST /api/sms/purchase
 * User submits an SMS pack order with payment details
 */
router.post('/purchase', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const { packageId, paymentMethod, trxId, senderNumber } = req.body;
    const pack = SMS_PACKAGES.find(p => p.id === packageId);
    if (!pack) {
      return res.status(400).json({ error: 'অবৈধ এসএমএস প্যাকেজ' });
    }
    if (!trxId || !paymentMethod) {
      return res.status(400).json({ error: 'পেমেন্ট মাধ্যম এবং TrxID প্রদান করুন' });
    }

    const pool = getDbPool();
    const purchaseId = 'smspay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    let userName = 'User';
    let userPhone = '';
    let shopName = 'Shop';

    if (pool) {
      const uRes = await pool.query('SELECT name, phone, shop_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        userName = uRes.rows[0].name || '';
        userPhone = uRes.rows[0].phone || '';
        shopName = uRes.rows[0].shop_name || '';
      }

      await pool.query(`
        INSERT INTO sms_purchases (
          id, user_id, user_name, user_phone, shop_name, sms_count, amount, payment_method, trx_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
      `, [
        purchaseId,
        userId,
        userName,
        senderNumber || userPhone,
        shopName,
        pack.smsCount,
        pack.price,
        paymentMethod,
        trxId.trim(),
        now,
      ]);
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        userName = u.name;
        userPhone = u.phone;
        shopName = u.shopName;
      }

      if (!inMemoryStore.sms_purchases) inMemoryStore.sms_purchases = [];
      inMemoryStore.sms_purchases.unshift({
        id: purchaseId,
        userId,
        userName,
        userPhone: senderNumber || userPhone,
        shopName,
        smsCount: pack.smsCount,
        amount: pack.price,
        paymentMethod,
        trxId: trxId.trim(),
        status: 'pending',
        createdAt: now,
      });
    }

    return res.json({
      message: '✅ আপনার এসএমএস প্যাকেজ ক্রয়ের অনুরোধ গ্রহণ করা হয়েছে! অ্যাডমিন দ্রুত যাচাই করে ব্যালেন্স যুক্ত করবেন।',
      purchaseId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
