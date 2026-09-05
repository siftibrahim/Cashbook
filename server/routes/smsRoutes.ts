import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { sendSmsNotification } from '../services/smsService';

const router = Router();

// Default SMS Packages available for purchase
export const DEFAULT_SMS_PACKAGES = [
  {
    id: 'pack_100',
    name: '১০০ এসএমএস স্টার্টার প্যাক',
    smsCount: 100,
    price: 50,
    badge: 'স্টার্টার',
    ratePerSms: '৳০.৫০/এসএমএস',
    description: 'ছোট দোকানের জন্য সেরা বাকি তাগাদা প্যাক। মেয়াদ আজীবন।',
    isPopular: false,
    isEnabled: true,
    features: ['১০০টি সরাসরি গেটওয়ে এসএমএস', 'আজীবন মেয়াদ', 'ইনস্ট্যান্ট ডেলিভারি রিপোর্ট'],
  },
  {
    id: 'pack_300',
    name: '৩০০ এসএমএস রেগুলার প্যাক',
    smsCount: 300,
    price: 135,
    badge: 'জনপ্রিয় অফার',
    isPopular: true,
    isEnabled: true,
    ratePerSms: '৳০.৪৫/এসএমএস',
    description: 'মাঝারি দোকানের নিয়মিত বকেয়া আদায়ের জন্য সবচেয়ে জনপ্রিয়।',
    features: ['৩০০টি সরাসরি গেটওয়ে এসএমএস', '১০% অতিরিক্ত সাশ্রয়ী', 'আজীবন মেয়াদ', 'ইনস্ট্যান্ট ডেলিভারি রিপোর্ট'],
  },
  {
    id: 'pack_500',
    name: '৫০০ এসএমএস বিজনেস প্যাক',
    smsCount: 500,
    price: 200,
    badge: 'সেরা ভ্যালু',
    ratePerSms: '৳০.৪০/এসএমএস',
    description: 'দ্রুত বাকি আদায়ের জন্য সেরা ভ্যালু বিজনেস প্যাকেজ।',
    isPopular: false,
    isEnabled: true,
    features: ['৫০০টি সরাসরি গেটওয়ে এসএমএস', '২০% বেশি সাশ্রয়', 'আজীবন মেয়াদ', 'ইনস্ট্যান্ট ডেলিভারি রিপোর্ট'],
  },
  {
    id: 'pack_1000',
    name: '১০০০ এসএমএস সুপার সেভার প্যাক',
    smsCount: 1000,
    price: 350,
    badge: 'সুপার সেভার',
    ratePerSms: '৳০.৩৫/এসএমএস',
    description: 'বড় পাইকারি ও খুচরা দোকানের জন্য সবচেয়ে লাভজনক সুপার সেভার প্যাক।',
    isPopular: false,
    isEnabled: true,
    features: ['১০০০টি সরাসরি গেটওয়ে এসএমএস', '৩০% সর্বোচ্চ সাশ্রয়', 'আজীবন মেয়াদ', 'ভিআইপি ডেলিভারি চ্যানেল'],
  },
];

export const SMS_PACKAGES = DEFAULT_SMS_PACKAGES;

/**
 * Fetch dynamic SMS packages configured by Super Admin
 */
export async function getDynamicSmsPackages(pool: any = getDbPool()): Promise<any[]> {
  try {
    if (pool) {
      const res = await pool.query("SELECT data FROM system_config WHERE id = 'system_sms_packages'");
      if (res.rows.length > 0 && res.rows[0].data) {
        const pkgs = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
        if (Array.isArray(pkgs) && pkgs.length > 0) return pkgs;
      }
    } else if (inMemoryStore.system_config?.['system_sms_packages']) {
      const pkgs = inMemoryStore.system_config['system_sms_packages'];
      if (Array.isArray(pkgs) && pkgs.length > 0) return pkgs;
    }
  } catch (e) {
    console.warn('Error reading dynamic SMS packages:', e);
  }
  return DEFAULT_SMS_PACKAGES;
}

// All routes require user authentication
router.use(authenticateUser);

/**
 * GET /api/sms/balance
 * Returns current user's SMS balance, total sent count, pending purchase, and latest confirmed purchase
 */
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    let balance = 0;
    let totalSent = 0;
    let pendingPurchase: any = null;
    let latestConfirmed: any = null;

    if (pool) {
      const uRes = await pool.query('SELECT sms_balance FROM users WHERE id = $1', [userId]);
      balance = uRes.rows.length > 0 ? (uRes.rows[0].sms_balance ?? 0) : 0;

      const logRes = await pool.query('SELECT COUNT(*) as total_sent FROM sms_logs WHERE user_id = $1', [userId]);
      totalSent = parseInt(logRes.rows[0]?.total_sent || '0', 10);

      const pRes = await pool.query(
        "SELECT id, sms_count, amount, payment_method, trx_id, created_at, status FROM sms_purchases WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (pRes.rows.length > 0) {
        const row = pRes.rows[0];
        pendingPurchase = {
          id: row.id,
          smsCount: row.sms_count,
          amount: parseFloat(row.amount),
          paymentMethod: row.payment_method,
          trxId: row.trx_id,
          createdAt: Number(row.created_at),
          status: row.status,
        };
      }

      const confRes = await pool.query(
        "SELECT id, sms_count, amount, payment_method, trx_id, approved_at, status FROM sms_purchases WHERE user_id = $1 AND (status = 'confirmed' OR status = 'approved') ORDER BY approved_at DESC LIMIT 1",
        [userId]
      );
      if (confRes.rows.length > 0) {
        const crow = confRes.rows[0];
        latestConfirmed = {
          id: crow.id,
          smsCount: crow.sms_count,
          amount: parseFloat(crow.amount),
          paymentMethod: crow.payment_method,
          trxId: crow.trx_id,
          approvedAt: crow.approved_at ? Number(crow.approved_at) : null,
          status: crow.status,
        };
      }
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      balance = u ? (u.smsBalance ?? 0) : 0;
      totalSent = (inMemoryStore.sms_logs || []).filter(x => x.userId === userId).length;

      const userPurchases = (inMemoryStore.sms_purchases || []).filter(x => x.userId === userId);
      const pending = userPurchases.find(x => x.status === 'pending');
      if (pending) {
        pendingPurchase = {
          id: pending.id,
          smsCount: pending.smsCount,
          amount: pending.amount,
          paymentMethod: pending.paymentMethod,
          trxId: pending.trxId,
          createdAt: pending.createdAt,
          status: pending.status,
        };
      }

      const confirmed = userPurchases.find(x => x.status === 'confirmed' || x.status === 'approved');
      if (confirmed) {
        latestConfirmed = {
          id: confirmed.id,
          smsCount: confirmed.smsCount,
          amount: confirmed.amount,
          paymentMethod: confirmed.paymentMethod,
          trxId: confirmed.trxId,
          approvedAt: confirmed.approvedAt,
          status: confirmed.status,
        };
      }
    }

    return res.json({
      balance,
      totalSent,
      hasPendingPurchase: Boolean(pendingPurchase),
      pendingPurchase,
      latestConfirmed,
    });
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
router.get('/packages', async (req, res) => {
  try {
    const pkgs = await getDynamicSmsPackages();
    return res.json({ packages: pkgs });
  } catch (err: any) {
    return res.json({ packages: DEFAULT_SMS_PACKAGES });
  }
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
    const pool = getDbPool();
    const dynamicPackages = await getDynamicSmsPackages(pool);
    const pack = dynamicPackages.find((p: any) => p.id === packageId);
    if (!pack) {
      return res.status(400).json({ error: 'অবৈধ এসএমএস প্যাকেজ' });
    }
    if (!trxId || !paymentMethod) {
      return res.status(400).json({ error: 'পেমেন্ট মাধ্যম এবং TrxID প্রদান করুন' });
    }

    // 1. Check if user already has a pending SMS purchase
    if (pool) {
      const pendRes = await pool.query(
        "SELECT id, trx_id FROM sms_purchases WHERE user_id = $1 AND status = 'pending' LIMIT 1",
        [userId]
      );
      if (pendRes.rows.length > 0) {
        return res.status(400).json({
          error: 'আপনার ইতিমধ্যে একটি এসএমএস প্যাকেজ ক্রয়ের অনুরোধ পেন্ডিং আছে (TrxID: ' + pendRes.rows[0].trx_id + ')। সুপার অ্যাডমিন অনুমোদন করার পর অথবা বাতিল হওয়ার পর পুনরায় চেষ্টা করুন।',
        });
      }

      // 2. Check exclusivity: User cannot purchase a new SMS package until current SMS balance is finished (0)
      const uBalRes = await pool.query('SELECT sms_balance FROM users WHERE id = $1', [userId]);
      const curBal = uBalRes.rows.length > 0 ? (uBalRes.rows[0].sms_balance ?? 0) : 0;
      if (curBal > 0) {
        return res.status(400).json({
          error: `আপনার বর্তমান প্যাকেজে এখনও ${curBal}টি SMS অবশিষ্ট রয়েছে। নিয়ম অনুযায়ী বর্তমান প্যাকেজের সকল SMS শেষ (০ টি) হওয়ার পরই কেবল নতুন প্যাকেজ কেনা যাবে।`,
        });
      }
    } else {
      const userPurchases = (inMemoryStore.sms_purchases || []).filter(x => x.userId === userId);
      const pend = userPurchases.find(x => x.status === 'pending');
      if (pend) {
        return res.status(400).json({
          error: 'আপনার ইতিমধ্যে একটি এসএমএস প্যাকেজ ক্রয়ের অনুরোধ পেন্ডিং আছে (TrxID: ' + pend.trxId + ')। সুপার অ্যাডমিন অনুমোদন করার পর অথবা বাতিল হওয়ার পর পুনরায় চেষ্টা করুন।',
        });
      }

      const u = inMemoryStore.users.find(x => x.id === userId);
      const curBal = u ? (u.smsBalance ?? 0) : 0;
      if (curBal > 0) {
        return res.status(400).json({
          error: `আপনার বর্তমান প্যাকেজে এখনও ${curBal}টি SMS অবশিষ্ট রয়েছে। নিয়ম অনুযায়ী বর্তমান প্যাকেজের সকল SMS শেষ (০ টি) হওয়ার পরই কেবল নতুন প্যাকেজ কেনা যাবে।`,
        });
      }
    }

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

/**
 * GET /api/sms/my-purchases
 * Returns user's SMS purchase orders with real-time status (pending, confirmed, rejected)
 */
router.get('/my-purchases', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM sms_purchases WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      const purchases = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        shopName: row.shop_name,
        smsCount: row.sms_count,
        amount: parseFloat(row.amount),
        paymentMethod: row.payment_method,
        trxId: row.trx_id,
        status: row.status, // 'pending' | 'confirmed' | 'approved' | 'rejected'
        createdAt: Number(row.created_at),
        approvedAt: row.approved_at ? Number(row.approved_at) : null,
      }));
      return res.json({ purchases });
    } else {
      const list = (inMemoryStore.sms_purchases || [])
        .filter(x => x.userId === userId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.json({ purchases: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
