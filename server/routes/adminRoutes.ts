import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDbPool, inMemoryStore, setAndConnectDatabaseUrl, getIsDbQuotaExceeded, markDbQuotaExceeded } from '../db';
import {
  AuthenticatedRequest,
  requireAdminOrStaff,
  requireSuperAdmin,
} from '../authMiddleware';
import { DEFAULT_PLANS } from '../../src/services/adminService';
import {
  getSmsGatewaySettings,
  saveSmsGatewaySettings,
  sendSmsNotification,
  getServerPublicIp,
  SmsGatewaySettings,
} from '../services/smsService';
import { SubscriptionEngine } from '../services/subscriptionEngine';
import { DEFAULT_SMS_PACKAGES, getDynamicSmsPackages, DEFAULT_TAGADA_TEMPLATES, getDynamicTagadaTemplates } from './smsRoutes';
import { DEFAULT_PAYMENTLY_CONFIG, normalizePaymentlyKey } from '../services/paymentlyService';
import { realtimeEvents } from '../services/realtimeEvents';

const router = Router();

// All admin routes require admin or staff authentication
router.use(requireAdminOrStaff);

/**
 * 1. GET /api/admin/users - List all users / shops
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      // Fetch users with resilient fallback from Neon PostgreSQL (excluding super_admin accounts)
      let rows: any[] = [];
      try {
        const result = await pool.query(`
          SELECT 
            u.*,
            COALESCE((SELECT COUNT(*) FROM customers c WHERE c.user_id = u.id), 0) as total_customers,
            COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id), 0) as total_transactions
          FROM users u 
          WHERE u.role != 'super_admin' AND u.id != 'usr_super_admin' AND LOWER(TRIM(u.email)) NOT IN ('siftibrahim@gmail.com', 'admin@twing.com')
          ORDER BY COALESCE(u.registered_at, 0) DESC
        `);
        rows = result.rows;
      } catch (subErr) {
        console.warn('Fallback basic user query in /api/admin/users:', subErr);
        const basicResult = await pool.query(`
          SELECT * FROM users 
          WHERE role != 'super_admin' AND id != 'usr_super_admin' AND LOWER(TRIM(email)) NOT IN ('siftibrahim@gmail.com', 'admin@twing.com')
          ORDER BY registered_at DESC
        `);
        rows = basicResult.rows;
      }

      const users = rows.map((row: any) => ({
        id: String(row.id || ''),
        name: row.name || 'ইউজার',
        phone: row.phone || '',
        email: row.email || '',
        shopName: row.shop_name || 'আমার দোকান',
        businessType: row.business_type || 'জেনারেল স্টোর',
        address: row.address || 'বাংলাদেশ',
        role: row.role || 'user',
        status: row.status || 'active',
        subscriptionPlan: row.subscription_plan || 'ফ্রি ট্রায়াল (১৪ দিন)',
        subscriptionStatus: row.subscription_status || 'active',
        subscriptionExpiresAt: row.subscription_expires_at !== null && row.subscription_expires_at !== undefined ? Number(row.subscription_expires_at) : 0,
        registeredAt: Number(row.registered_at) || Date.now(),
        lastActiveAt: Number(row.last_active_at) || Date.now(),
        smsBalance: row.sms_balance !== null && row.sms_balance !== undefined ? Number(row.sms_balance) : 0,
        totalCustomers: parseInt(row.total_customers || '0', 10),
        totalTransactions: parseInt(row.total_transactions || '0', 10),
        notes: row.notes || '',
        deviceInfo: row.device_info || '',
        appVersion: row.app_version || '2.5.0',
        isOnlineStoreAllowed: row.is_online_store_allowed !== false,
        onlineStoreStatus: row.online_store_status || 'active',
        onlineStoreRequestedAt: Number(row.online_store_requested_at) || 0,
        onlineStoreNote: row.online_store_note || '',
      }));

      return res.json({ users, isPostgresConnected: true, totalCount: users.length });
    } else {
      const filteredInMemory = inMemoryStore.users
        .filter(u => u.role !== 'super_admin' && u.id !== 'usr_super_admin' && u.email !== 'siftibrahim@gmail.com' && u.email !== 'admin@twing.com')
        .map(u => ({
          ...u,
          isOnlineStoreAllowed: u.isOnlineStoreAllowed !== false,
          onlineStoreStatus: u.onlineStoreStatus || 'active',
          onlineStoreRequestedAt: Number(u.onlineStoreRequestedAt) || 0,
          onlineStoreNote: u.onlineStoreNote || '',
        }));
      return res.json({ users: filteredInMemory, isPostgresConnected: false, totalCount: filteredInMemory.length });
    }
  } catch (err: any) {
    console.error('❌ Error fetching users from DB in /api/admin/users:', err);
    return res.status(500).json({ error: err.message, users: inMemoryStore.users, isPostgresConnected: false });
  }
});

/**
 * POST /api/admin/set-database-url - Connect & configure live Neon PostgreSQL
 */
router.post('/set-database-url', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { databaseUrl } = req.body;
    if (!databaseUrl) {
      return res.status(400).json({ error: 'DATABASE_URL (Connection String) প্রদান করুন' });
    }

    const result = await setAndConnectDatabaseUrl(databaseUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'ডাটাবেজে কানেক্ট করা সম্ভব হয়নি' });
  }
});

/**
 * GET /api/admin/db-status - Check Neon PostgreSQL connection status
 */
router.get('/db-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isQuota = getIsDbQuotaExceeded();
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        connected: false,
        message: isQuota
          ? '⚠️ Neon ডাটাবেজের ফ্রি কম্পিউট সময় কোটা (Compute Time Quota) শেষ। বর্তমানে লোকাল ডিস্ক ও ইন-মেমোরি স্টোরেজে চলছে।'
          : 'DATABASE_URL এনভায়রনমেন্ট ভেরিয়েবল সেট করা নেই। ইন-মেমোরি মোডে চলছে।',
        provider: isQuota ? 'Local Storage (Quota Exceeded)' : 'In-Memory Fallback',
        userCount: inMemoryStore.users.length,
        isQuotaExceeded: isQuota,
      });
    }

    const dbUrl = process.env.DATABASE_URL || '';
    const isCockroach = dbUrl.includes('cockroachlabs.cloud');
    const providerName = isCockroach ? 'CockroachDB Cloud' : (dbUrl.includes('neon.tech') ? 'Neon PostgreSQL' : 'PostgreSQL');

    const check = await pool.query('SELECT current_database(), count(*) as user_count FROM users');
    return res.json({
      connected: true,
      message: `✅ ${providerName} ডাটাবেজে সফলভাবে সংযুক্ত রয়েছে!`,
      provider: providerName,
      databaseName: check.rows[0]?.current_database || 'defaultdb',
      userCount: parseInt(check.rows[0]?.user_count || '0', 10),
      isQuotaExceeded: false,
    });
  } catch (err: any) {
    const isQuota = err?.code === '53000' || err?.message?.includes('compute time quota');
    if (isQuota) {
      markDbQuotaExceeded(err);
    }
    return res.json({
      connected: false,
      message: isQuota
        ? '⚠️ Neon ডাটাবেজের ফ্রি কম্পিউট কোটা শেষ। বর্তমানে লোকাল নিরাপদ স্টোরেজে চলছে।'
        : `❌ ডাটাবেজ কানেকশন এরর: ${err.message}`,
      provider: isQuota ? 'Local Storage (Quota Exceeded)' : 'Disconnected',
      userCount: inMemoryStore.users.length,
      isQuotaExceeded: isQuota,
    });
  }
});

/**
 * 2. PUT /api/admin/users/:id - Update user details, status, or plan
 */
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { name, phone, shopName, status, role, subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, notes } = req.body;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE users SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          shop_name = COALESCE($3, shop_name),
          status = COALESCE($4, status),
          role = COALESCE($5, role),
          subscription_plan = COALESCE($6, subscription_plan),
          subscription_status = COALESCE($7, subscription_status),
          subscription_expires_at = COALESCE($8, subscription_expires_at),
          notes = COALESCE($9, notes),
          updated_at = NOW()
        WHERE id = $10
      `, [name, phone, shopName, status, role, subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, notes, userId]);

      // Sync store profile if name/shopName/subscription was updated
      if (shopName || subscriptionPlan || subscriptionExpiresAt) {
        await pool.query(`
          UPDATE store_profiles SET
            name = COALESCE($1, name),
            subscription_plan = COALESCE($2, subscription_plan),
            subscription_expires_at = COALESCE($3, subscription_expires_at)
          WHERE user_id = $4
        `, [shopName, subscriptionPlan, subscriptionExpiresAt, userId]).catch(() => {});
      }

      // Log admin activity
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'log_' + Date.now(),
        req.user?.email || 'admin',
        'UPDATE_USER',
        'User',
        userId,
        name || shopName || userId,
        `ইউজার প্রোফাইল ও স্ট্যাটাস (${status || 'updated'}) পরিবর্তন করা হয়েছে`,
        Date.now(),
      ]);

      try {
        await SubscriptionEngine.recalculateAndSyncUserSubscription(userId);
      } catch (syncErr) {
        console.warn('Subscription sync warning on PUT /users/:id:', syncErr);
      }
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        if (name) u.name = name;
        if (phone) u.phone = phone;
        if (shopName) u.shopName = shopName;
        if (status) u.status = status;
        if (role) u.role = role;
        if (subscriptionPlan) u.subscriptionPlan = subscriptionPlan;
        if (subscriptionStatus) u.subscriptionStatus = subscriptionStatus;
        if (subscriptionExpiresAt) u.subscriptionExpiresAt = subscriptionExpiresAt;
        if (notes) u.notes = notes;
      }
    }

    return res.json({ message: '✅ ইউজারের তথ্য সফলভাবে আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. POST /api/admin/users/:id/extend-subscription
 * Extends or reduces user subscription validity
 */
router.post('/users/:id/extend-subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { days, planName, exactDays } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const uRes = await pool.query('SELECT id, name, phone, shop_name, email, subscription_expires_at, subscription_plan, subscription_status FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি' });

      const u = uRes.rows[0];
      const currentExpiry = Number(u.subscription_expires_at) || now;
      let newExpiry = currentExpiry;
      let parsedDays = 0;

      if (exactDays !== undefined && exactDays !== null) {
        parsedDays = parseInt(exactDays, 10);
        newExpiry = parsedDays <= 0 ? now - 1000 : now + (parsedDays * 86400000);
      } else {
        parsedDays = parseInt(days, 10);
        if (isNaN(parsedDays)) parsedDays = 30;
        
        if (parsedDays < 0) {
          // Decreasing days
          newExpiry = currentExpiry + (parsedDays * 86400000);
          if (newExpiry <= now) {
            newExpiry = now - 1000;
          }
        } else {
          // Increasing days: if already expired, extend from now; else extend from currentExpiry
          newExpiry = Math.max(now, currentExpiry) + (parsedDays * 86400000);
        }
      }

      const isExpired = newExpiry <= now;
      const newStatus = isExpired ? 'expired' : 'active';
      const effectivePlanName = planName || u.subscription_plan || (isExpired ? 'মেয়াদ শেষ (রিনিউ প্রয়োজন)' : 'স্পেশাল প্রিমিয়াম প্যাক');

      // 1. Update users table
      await pool.query(`
        UPDATE users SET
          subscription_expires_at = $1,
          subscription_status = $2,
          subscription_plan = $3,
          status = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [newExpiry, newStatus, effectivePlanName, newStatus, userId]);

      // 2. Update store_profiles table
      await pool.query(`
        UPDATE store_profiles SET
          subscription_expires_at = $1,
          subscription_plan = $2
        WHERE user_id = $3
      `, [newExpiry, effectivePlanName, userId]).catch(() => {});

      // 3. If expired or decreased below now, mark pending/active subscriptions & past payments as reset
      if (isExpired) {
        await pool.query(
          "UPDATE payments SET status = 'reset' WHERE user_id = $1 AND status = 'approved'",
          [userId]
        ).catch(() => {});
        await pool.query(
          "UPDATE subscriptions SET status = 'EXPIRED', end_date = $1 WHERE user_id = $2",
          [newExpiry, userId]
        ).catch(() => {});
      } else if (parsedDays > 0) {
        // Record approved grant record for audit log
        const paymentId = 'grant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const trxId = 'ADMIN_GRANT_' + Date.now().toString().slice(-6);
        await pool.query(`
          INSERT INTO payments (
            id, user_id, user_name, user_phone, sender_phone, shop_name,
            plan_id, plan_name, duration_days, bonus_days, amount,
            payment_method, payment_mode, trx_id, status, approved_at, admin_notes, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18
          )
        `, [
          paymentId,
          userId,
          u.name || 'ইউজার',
          u.phone || '',
          u.phone || '',
          u.shop_name || 'আমার দোকান',
          'plan_admin_grant',
          effectivePlanName,
          parsedDays,
          0,
          0,
          'admin_grant',
          'manual',
          trxId,
          'approved',
          now,
          `সুপার অ্যাডমিন (${req.user?.email || 'super_admin'}) কর্তৃক মেয়াদ পরিবর্তন (${parsedDays > 0 ? '+' : ''}${parsedDays} দিন)`,
          now,
        ]).catch((pErr) => {
          console.warn('Could not insert grant payment record in DB:', pErr);
        });
      }

      // 4. Activity Log
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'log_' + Date.now(),
        req.user?.email || 'admin',
        'EXTEND_SUBSCRIPTION',
        'User',
        userId,
        u.name || u.shop_name || userId,
        `সাবস্ক্রিপশন মেয়াদ পরিবর্তন (${parsedDays > 0 ? '+' : ''}${parsedDays} দিন)। নতুন মেয়াদ: ${new Date(newExpiry).toLocaleDateString('bn-BD')} (${newStatus})`,
        Date.now(),
      ]);

      // 5. Trigger SubscriptionEngine to sync
      try {
        await SubscriptionEngine.recalculateAndSyncUserSubscription(userId);
      } catch (syncErr) {
        console.warn('Subscription sync warning on extend-subscription:', syncErr);
      }

      return res.json({
        message: `✅ ইউজারের সাবস্ক্রিপশন মেয়াদ সফলভাবে ${parsedDays >= 0 ? 'বাড়ানো' : 'কমানো'} হয়েছে (${parsedDays > 0 ? '+' : ''}${parsedDays} দিন)`,
        subscriptionExpiresAt: newExpiry,
        subscriptionPlan: effectivePlanName,
        subscriptionStatus: newStatus,
      });
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        const cur = Number(u.subscriptionExpiresAt || u.subscription_expires_at) || now;
        let parsedDays = parseInt(days, 10);
        if (isNaN(parsedDays)) parsedDays = 30;

        let newExpiry = cur;
        if (exactDays !== undefined) {
          parsedDays = parseInt(exactDays, 10);
          newExpiry = parsedDays <= 0 ? now - 1000 : now + (parsedDays * 86400000);
        } else if (parsedDays < 0) {
          newExpiry = cur + (parsedDays * 86400000);
          if (newExpiry <= now) newExpiry = now - 1000;
        } else {
          newExpiry = Math.max(now, cur) + (parsedDays * 86400000);
        }

        const isExpired = newExpiry <= now;
        const newStatus = isExpired ? 'expired' : 'active';
        const effectivePlanName = planName || u.subscriptionPlan || (isExpired ? 'মেয়াদ শেষ (রিনিউ প্রয়োজন)' : 'স্পেশাল প্রিমিয়াম প্যাক');

        u.subscriptionExpiresAt = newExpiry;
        u.subscription_expires_at = newExpiry;
        u.subscriptionStatus = newStatus;
        u.subscription_status = newStatus;
        u.status = newStatus;
        u.subscriptionPlan = effectivePlanName;
        u.subscription_plan = effectivePlanName;

        const store = inMemoryStore.stores.find(s => s.userId === userId);
        if (store) {
          store.subscriptionExpiresAt = newExpiry;
          store.subscriptionPlan = effectivePlanName;
        }

        if (isExpired) {
          (inMemoryStore.payments || []).forEach(p => {
            if (p.userId === userId) p.status = 'reset';
          });
        }

        return res.json({
          message: `✅ ইউজারের সাবস্ক্রিপশন মেয়াদ সফলভাবে ${parsedDays >= 0 ? 'বাড়ানো' : 'কমানো'} হয়েছে (${parsedDays > 0 ? '+' : ''}${parsedDays} দিন)`,
          subscriptionExpiresAt: newExpiry,
          subscriptionPlan: effectivePlanName,
          subscriptionStatus: newStatus,
        });
      }
      return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. DELETE /api/admin/users/:id - Delete User Account
 */
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const pool = getDbPool();

    if (pool) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['log_' + Date.now(), req.user?.email || 'admin', 'DELETE_USER', 'User', userId, `ইউজার অ্যাকাউন্ট এবং এর সকল তথ্য স্থায়ীভাবে মুছে ফেলা হয়েছে`, Date.now()]);
    } else {
      inMemoryStore.users = inMemoryStore.users.filter(u => u.id !== userId);
    }

    return res.json({ message: '✅ ইউজার অ্যাকাউন্ট মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 5. GET /api/admin/payments - List all payment requests
 */
router.get('/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
      const payments = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        senderNumber: row.sender_number,
        shopName: row.shop_name,
        planId: row.plan_id,
        planName: row.plan_name,
        durationDays: row.duration_days,
        amount: parseFloat(row.amount) || 0,
        paymentMethod: row.payment_method,
        paymentMode: row.payment_mode,
        trxId: row.trx_id,
        bankDetails: typeof row.bank_details === 'string' ? JSON.parse(row.bank_details) : row.bank_details,
        status: row.status,
        refundStatus: row.refund_status,
        refundReason: row.refund_reason,
        refundAmount: row.refund_amount ? parseFloat(row.refund_amount) : undefined,
        createdAt: Number(row.created_at),
        approvedAt: row.approved_at ? Number(row.approved_at) : undefined,
        adminNotes: row.admin_notes,
        rejectedReason: row.rejected_reason,
      }));
      return res.json({ payments });
    } else {
      return res.json({ payments: inMemoryStore.payments });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. POST /api/admin/payments/:id/approve - Approve payment & extend user subscription
 */
router.post('/payments/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { adminNotes, activateOnlineStore } = req.body;
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      const pRes = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'পেমেন্ট রেকর্ড পাওয়া যায়নি' });

      const p = pRes.rows[0];
      const baseDays = parseInt(p.duration_days, 10) || 30;
      const bonusDays = parseInt(p.bonus_days, 10) || 0;
      const totalDays = baseDays + bonusDays;
      const durationMs = totalDays * 86400000;

      // Update payment record
      await pool.query(`
        UPDATE payments SET
          status = 'approved',
          approved_at = $1,
          admin_notes = COALESCE($2, admin_notes)
        WHERE id = $3
      `, [now, adminNotes, paymentId]);

      // Automatically recalculate and synchronize exact user subscription timeline
      const synced = await SubscriptionEngine.recalculateAndSyncUserSubscription(p.user_id);

      // If online store activation requested with payment
      if (activateOnlineStore) {
        await pool.query(`
          UPDATE users SET
            is_online_store_allowed = true,
            online_store_status = 'active',
            online_store_note = COALESCE(online_store_note, 'পেমেন্ট অনুমোদনের সাথে অনলাইন স্টোর সক্রিয় করা হয়েছে')
          WHERE id = $1
        `, [p.user_id]).catch(() => {});

        await pool.query(`
          UPDATE online_store_configs SET
            is_store_allowed_by_admin = true,
            admin_store_status = 'active',
            admin_store_note = 'পেমেন্ট অনুমোদনের সাথে অনলাইন স্টোর সক্রিয় করা হয়েছে'
          WHERE user_id = $1
        `, [p.user_id]).catch(() => {});

        realtimeEvents.broadcastToUser(p.user_id, 'online_store_status_changed', {
          isAllowed: true,
          status: 'active',
          note: 'পেমেন্ট অনুমোদনের সাথে অনলাইন স্টোর সক্রিয় করা হয়েছে',
        });
      }

      // Notify User specifically (Targeted Notification)
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'notif_' + now,
        '🎉 আপনার সাবস্ক্রিপশন সফলভাবে সক্রিয় হয়েছে!',
        `আপনার ৳${p.amount} পেমেন্ট (TrxID: ${p.trx_id}) সফলভাবে অনুমোদিত হয়েছে। ${p.plan_name} প্ল্যান ${totalDays} দিনের জন্য সফলভাবে চালু হয়েছে${bonusDays > 0 ? ` (বোনাস: +${bonusDays} দিন অন্তর্ভুক্ত)` : ''}।`,
        'payment_receipt',
        'specific',
        p.user_id,
        p.user_name || p.shop_name,
        'high',
        false,
        now,
      ]);

      // Activity Log
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'log_' + now,
        req.user?.email || 'admin',
        'APPROVE_PAYMENT',
        'Payment',
        paymentId,
        p.shop_name,
        `৳${p.amount} পেমেন্ট অনুমোদন করা হয়েছে (Trx: ${p.trx_id}, মোট: ${totalDays} দিন, মেয়াদ: ${new Date(synced.subscriptionExpiresAt).toLocaleDateString('bn-BD')})`,
        now,
      ]);
    } else {
      const p = inMemoryStore.payments.find(x => x.id === paymentId);
      if (p) {
        p.status = 'approved';
        p.approvedAt = now;
        if (adminNotes) p.adminNotes = adminNotes;

        await SubscriptionEngine.recalculateAndSyncUserSubscription(p.userId);

        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: 'notif_' + now,
          title: '🎉 আপনার সাবস্ক্রিপশন সফলভাবে সক্রিয় হয়েছে!',
          message: `আপনার ৳${p.amount} পেমেন্ট (TrxID: ${p.trxId}) অনুমোদিত হয়েছে। সাবস্ক্রিপশন চালু হয়েছে।`,
          type: 'payment_receipt',
          target: 'specific',
          targetUserId: p.userId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });

        realtimeEvents.broadcastToUser(p.userId, 'payment_approved', {
          paymentId,
          amount: p.amount,
          trxId: p.trxId,
          status: 'approved',
        });
      }
    }

    return res.json({ message: '✅ পেমেন্ট অনুমোদন এবং ইউজারের সাবস্ক্রিপশন চালু হয়েছে!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 7. POST /api/admin/payments/:id/reject
 */
router.post('/payments/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { rejectedReason } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const pRes = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
      if (pRes.rows.length > 0) {
        const p = pRes.rows[0];
        await pool.query(`
          UPDATE payments SET
            status = 'rejected',
            rejected_reason = $1
          WHERE id = $2
        `, [rejectedReason || 'ভুল বা অসঙ্গতিপূর্ণ ট্রানজেকশন আইডি', paymentId]);

        // Send targeted notification to that specific user
        await pool.query(`
          INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          'notif_rej_' + now,
          '⚠️ পেমেন্ট অনুরোধ বাতিল করা হয়েছে',
          `আপনার ৳${p.amount} পেমেন্ট অনুরোধ (TrxID: ${p.trx_id}) বাতিল করা হয়েছে। কারণ: ${rejectedReason || 'ভুল ট্রানজেকশন আইডি বা অসঙ্গতিপূর্ণ তথ্য'}। দয়া করে সঠিক তথ্য দিয়ে পুনরায় সাবমিট করুন।`,
          'warning',
          'specific',
          p.user_id,
          p.user_name || p.shop_name,
          'high',
          false,
          now,
        ]);

        realtimeEvents.broadcastToUser(p.user_id, 'payment_rejected', {
          paymentId,
          amount: p.amount,
          trxId: p.trx_id,
          status: 'rejected',
          reason: rejectedReason || 'ভুল বা অসঙ্গতিপূর্ণ ট্রানজেকশন আইডি',
        });
      }
    } else {
      const p = inMemoryStore.payments.find(x => x.id === paymentId);
      if (p) {
        p.status = 'rejected';
        p.rejectedReason = rejectedReason || 'ভুল তথ্য';

        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: 'notif_rej_' + now,
          title: '⚠️ পেমেন্ট অনুরোধ বাতিল করা হয়েছে',
          message: `আপনার ৳${p.amount} পেমেন্ট অনুরোধ (TrxID: ${p.trxId}) বাতিল করা হয়েছে। কারণ: ${rejectedReason || 'ভুল তথ্য'}`,
          type: 'warning',
          target: 'specific',
          targetUserId: p.userId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });

        realtimeEvents.broadcastToUser(p.userId, 'payment_rejected', {
          paymentId,
          amount: p.amount,
          trxId: p.trxId,
          status: 'rejected',
          reason: rejectedReason || 'ভুল তথ্য',
        });
      }
    }

    return res.json({ message: '✅ পেমেন্ট রিকোয়েস্ট বাতিল করা হয়েছে এবং গ্রাহককে নোটিফাই করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 7.1 DELETE /api/admin/payments/:id - Delete payment record
 */
router.delete('/payments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const pool = getDbPool();

    if (pool) {
      await pool.query('DELETE FROM payments WHERE id = $1', [paymentId]);
    } else {
      inMemoryStore.payments = (inMemoryStore.payments || []).filter(x => x.id !== paymentId);
    }

    return res.json({ success: true, message: 'পেমেন্ট রেকর্ড মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    console.error('Error deleting payment:', err);
    return res.status(500).json({ error: err.message || 'পেমেন্ট মুছতে ব্যর্থ হয়েছে' });
  }
});

/**
 * 7.2 POST /api/admin/payments/:id/refund - Process refund for payment
 */
router.post('/payments/:id/refund', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentId = req.params.id;
    const { refundStatus, refundReason, refundAmount } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      await pool.query(`
        UPDATE payments SET
          refund_status = $1,
          refund_reason = $2,
          refund_amount = $3,
          updated_at = $4
        WHERE id = $5
      `, [refundStatus || 'completed', refundReason || 'এডমিন কর্তৃক রিফান্ড', refundAmount || 0, now, paymentId]);
    } else {
      const p = (inMemoryStore.payments || []).find(x => x.id === paymentId);
      if (p) {
        p.refundStatus = refundStatus || 'completed';
        p.refundReason = refundReason;
        p.refundAmount = refundAmount;
        p.updatedAt = now;
      }
    }

    return res.json({ success: true, message: 'রিফান্ড সফলভাবে সম্পন্ন হয়েছে' });
  } catch (err: any) {
    console.error('Error processing refund:', err);
    return res.status(500).json({ error: err.message || 'রিফান্ড প্রক্রিয়াকরণ ব্যর্থ হয়েছে' });
  }
});

/**
 * 8. GET & PUT /api/admin/payment-settings
 */
router.get('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    let settings: any = {};
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'");
      if (result.rows.length > 0) {
        settings = typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data;
      }
    } else if (inMemoryStore.system_config['system_payment_settings']) {
      settings = inMemoryStore.system_config['system_payment_settings'];
    }

    const envApiKey = process.env.PAYMENTLY_API_KEY || process.env.PAYMENTLY_KEY || '';
    const envBaseUrl = process.env.PAYMENTLY_BASE_URL || DEFAULT_PAYMENTLY_CONFIG.baseUrl;

    const rawKey = settings.paymently?.apiKey || envApiKey || DEFAULT_PAYMENTLY_CONFIG.apiKey;
    const finalApiKey = normalizePaymentlyKey(rawKey);

    const mergedPaymently = {
      isEnabled: settings.paymently?.isEnabled !== undefined ? !!settings.paymently.isEnabled : true,
      baseUrl: settings.paymently?.baseUrl || envBaseUrl,
      apiKey: finalApiKey,
      isSandbox: settings.paymently?.isSandbox !== undefined ? !!settings.paymently.isSandbox : false,
      isConfigured: true,
    };

    return res.json({
      settings: {
        ...settings,
        paymently: mergedPaymently,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = req.body;
    if (settings.paymently) {
      if (settings.paymently.apiKey) {
        settings.paymently.apiKey = normalizePaymentlyKey(settings.paymently.apiKey);
      }
      if (!settings.paymently.baseUrl) {
        settings.paymently.baseUrl = DEFAULT_PAYMENTLY_CONFIG.baseUrl;
      }
    }
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ('system_payment_settings', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(settings), now, req.user?.email || 'admin']);
    } else {
      inMemoryStore.system_config['system_payment_settings'] = settings;
    }

    return res.json({ message: '✅ পেমেন্ট গেটওয়ে ও নম্বর সফলভাবে সংরক্ষিত হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. Staff Management Routes (Super Admin)
 */
router.get('/staff', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query('SELECT id, name, phone, email, role, status, permissions, created_at, last_active_at, notes FROM staff');
      const staff = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        role: row.role,
        status: row.status,
        permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
        createdAt: Number(row.created_at),
        lastActiveAt: row.last_active_at ? Number(row.last_active_at) : undefined,
        notes: row.notes,
      }));
      return res.json({ staff });
    } else {
      return res.json({ staff: inMemoryStore.staff });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/staff', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, password, permissions, role, notes } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'নাম, ফোন, ইমেইল ও পাসওয়ার্ড আবশ্যক' });
    }

    const staffId = 'stf_' + Date.now().toString(36);
    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO staff (
          id, name, phone, email, password_hash, role, status, permissions, created_by, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        staffId, name.trim(), phone.trim(), email.trim().toLowerCase(), passwordHash,
        role || 'staff', 'active', JSON.stringify(permissions || []),
        req.user?.email || 'admin', notes || '', now
      ]);
    } else {
      inMemoryStore.staff.push({
        id: staffId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role || 'staff',
        status: 'active',
        permissions: permissions || [],
        createdBy: req.user?.email,
        notes: notes || '',
        createdAt: now,
      });
    }

    return res.status(201).json({ message: '✅ নতুন স্টাফ সদস্য সফলভাবে তৈরি হয়েছে', staffId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/staff/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staffId = req.params.id;
    const { name, phone, email, password, role, permissions, status, notes } = req.body;
    const pool = getDbPool();

    let passwordHash = undefined;
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (pool) {
      await pool.query(`
        UPDATE staff SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          password_hash = COALESCE($4, password_hash),
          role = COALESCE($5, role),
          permissions = COALESCE($6, permissions),
          status = COALESCE($7, status),
          notes = COALESCE($8, notes)
        WHERE id = $9
      `, [
        name ? name.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        passwordHash,
        role || null,
        permissions ? JSON.stringify(permissions) : null,
        status || null,
        notes || null,
        staffId
      ]);
    } else {
      const s = inMemoryStore.staff.find(x => x.id === staffId);
      if (s) {
        if (name) s.name = name.trim();
        if (phone) s.phone = phone.trim();
        if (email) s.email = email.trim().toLowerCase();
        if (password) s.password = password.trim();
        if (passwordHash) s.password_hash = passwordHash;
        if (role) s.role = role;
        if (permissions) s.permissions = permissions;
        if (status) s.status = status;
        if (notes) s.notes = notes;
      }
    }

    return res.json({ message: '✅ স্টাফ তথ্য, ইমেইল ও পাসওয়ার্ড সফলভাবে আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/staff/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staffId = req.params.id;
    const pool = getDbPool();
    if (pool) {
      await pool.query('DELETE FROM staff WHERE id = $1', [staffId]);
    } else {
      inMemoryStore.staff = inMemoryStore.staff.filter(s => s.id !== staffId);
    }
    return res.json({ message: '✅ স্টাফ রিমুভ করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin Profile & Credentials Management
 */
router.get('/super-admin/profile', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    let superAdminUser: any = null;

    if (pool) {
      const dbRes = await pool.query(
        "SELECT id, name, phone, email, role, shop_name FROM users WHERE role = 'super_admin' OR id = 'usr_super_admin' ORDER BY registered_at ASC LIMIT 1"
      );
      if (dbRes.rows.length > 0) {
        superAdminUser = dbRes.rows[0];
      }

      try {
        const secRes = await pool.query("SELECT data FROM system_config WHERE id = 'super_admin_security' LIMIT 1");
        if (secRes.rows.length > 0 && secRes.rows[0].data) {
          const cfg = typeof secRes.rows[0].data === 'string' ? JSON.parse(secRes.rows[0].data) : secRes.rows[0].data;
          if (cfg?.email && !superAdminUser) {
            superAdminUser = {
              id: 'usr_super_admin',
              name: cfg.name || 'সুপার অ্যাডমিন',
              email: cfg.email,
              phone: cfg.phone || '01306908115',
              role: 'super_admin',
            };
          }
        }
      } catch (e) {}
    }

    if (!superAdminUser) {
      superAdminUser = inMemoryStore.users.find(u => u.role === 'super_admin' || u.id === 'usr_super_admin') || {
        id: 'usr_super_admin',
        name: 'সুপার অ্যাডমিন',
        email: req.user?.email || 'admin@twing.com',
        phone: '01306908115',
        role: 'super_admin',
      };
    }

    return res.json({
      id: superAdminUser.id,
      name: superAdminUser.name,
      email: superAdminUser.email,
      phone: superAdminUser.phone,
      role: superAdminUser.role,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/super-admin/credentials', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    const pool = getDbPool();

    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPhone = phone ? phone.trim() : undefined;
    const cleanName = name ? name.trim() : undefined;
    const now = Date.now();

    if (pool) {
      // 1. Check if super admin exists in users table
      const userRes = await pool.query(
        "SELECT id FROM users WHERE role = 'super_admin' OR id = 'usr_super_admin' LIMIT 1"
      );

      if (userRes.rows.length > 0) {
        if (passwordHash) {
          await pool.query(`
            UPDATE users SET
              name = COALESCE($1, name),
              email = COALESCE($2, email),
              phone = COALESCE($3, phone),
              password_hash = $4,
              last_active_at = $5
            WHERE role = 'super_admin' OR id = 'usr_super_admin'
          `, [cleanName || null, cleanEmail || null, cleanPhone || null, passwordHash, now]);
        } else {
          await pool.query(`
            UPDATE users SET
              name = COALESCE($1, name),
              email = COALESCE($2, email),
              phone = COALESCE($3, phone),
              last_active_at = $4
            WHERE role = 'super_admin' OR id = 'usr_super_admin'
          `, [cleanName || null, cleanEmail || null, cleanPhone || null, now]);
        }
      } else {
        const hashToSave = passwordHash || (await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10));
        await pool.query(`
          INSERT INTO users (
            id, name, phone, email, password_hash, shop_name, business_type, address, role, status, subscription_plan, subscription_status, subscription_expires_at, registered_at, last_active_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'সুপার অ্যাডমিন ড্যাশবোর্ড', 'জেনারেল স্টোর', 'বাংলাদেশ', 'super_admin', 'active', 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)', 'active', 9999999999999, $6, $6
          )
        `, [
          'usr_super_admin',
          cleanName || 'সুপার অ্যাডমিন',
          cleanPhone || '01306908115',
          cleanEmail || 'admin@twing.com',
          hashToSave,
          now,
        ]);
      }

      // 2. Save credentials in system_config
      const secData: any = {
        updatedAt: now,
      };
      if (cleanEmail) secData.email = cleanEmail;
      if (cleanPhone) secData.phone = cleanPhone;
      if (cleanName) secData.name = cleanName;

      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ('super_admin_security', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(secData), now, req.user?.email || cleanEmail || 'super_admin']);
    } else {
      let u = inMemoryStore.users.find(x => x.role === 'super_admin' || x.id === 'usr_super_admin');
      if (u) {
        if (cleanName) u.name = cleanName;
        if (cleanEmail) u.email = cleanEmail;
        if (cleanPhone) u.phone = cleanPhone;
        if (passwordHash) u.password_hash = passwordHash;
        u.last_active_at = now;
      } else {
        inMemoryStore.users.push({
          id: 'usr_super_admin',
          name: cleanName || 'সুপার অ্যাডমিন',
          phone: cleanPhone || '01306908115',
          email: cleanEmail || 'admin@twing.com',
          password_hash: passwordHash || (await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10)),
          role: 'super_admin',
          status: 'active',
          subscriptionPlan: 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: 9999999999999,
          registeredAt: now,
          lastActiveAt: now,
        });
      }
      inMemoryStore.system_config['super_admin_security'] = {
        email: cleanEmail,
        phone: cleanPhone,
        name: cleanName,
        updatedAt: now,
      };
    }

    return res.json({
      message: '✅ সুপার অ্যাডমিন ইমেইল ও পাসওয়ার্ড ডাটাবেজে সফলভাবে সংরক্ষিত হয়েছে!',
      updatedEmail: cleanEmail,
    });
  } catch (err: any) {
    console.error('Error updating super admin credentials:', err);
    return res.status(500).json({ error: err.message || 'ক্রেডেনশিয়াল আপডেট করতে ত্রুটি হয়েছে' });
  }
});

/**
 * 10. Support Threads & Replies (Admin)
 */
router.get('/support/threads', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(`
        SELECT
          user_id,
          user_name,
          user_phone,
          shop_name,
          MAX(created_at) as last_updated,
          COUNT(*) FILTER (WHERE is_read_by_admin = FALSE) as unread_count
        FROM support_messages
        GROUP BY user_id, user_name, user_phone, shop_name
        ORDER BY last_updated DESC
      `);

      const threads = await Promise.all(result.rows.map(async (row) => {
        const lastMsgRes = await pool.query(
          'SELECT text, sender, created_at FROM support_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
          [row.user_id]
        );
        const lastMsg = lastMsgRes.rows[0];

        return {
          id: row.user_id,
          userId: row.user_id,
          userName: row.user_name || 'User',
          userPhone: row.user_phone || '',
          shopName: row.shop_name || 'Shop',
          lastMessage: lastMsg ? lastMsg.text : '',
          lastSender: lastMsg ? lastMsg.sender : 'user',
          updatedAt: Number(row.last_updated),
          status: 'open',
          unreadAdminCount: parseInt(row.unread_count || '0', 10),
          unreadUserCount: 0,
        };
      }));

      return res.json({ threads });
    } else {
      // In-memory support grouping
      const threadsMap: Record<string, any> = {};
      inMemoryStore.support_messages.forEach(m => {
        if (!threadsMap[m.userId]) {
          threadsMap[m.userId] = {
            id: m.userId,
            userId: m.userId,
            userName: m.userName,
            userPhone: m.userPhone,
            shopName: m.shopName,
            lastMessage: m.text,
            lastSender: m.sender,
            updatedAt: m.createdAt,
            status: 'open',
            unreadAdminCount: m.isReadByAdmin ? 0 : 1,
            unreadUserCount: 0,
          };
        } else {
          threadsMap[m.userId].lastMessage = m.text;
          threadsMap[m.userId].lastSender = m.sender;
          threadsMap[m.userId].updatedAt = Math.max(threadsMap[m.userId].updatedAt, m.createdAt);
          if (!m.isReadByAdmin) threadsMap[m.userId].unreadAdminCount++;
        }
      });
      return res.json({ threads: Object.values(threadsMap) });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/support/:userId/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM support_messages WHERE user_id = $1 ORDER BY created_at ASC',
        [targetUserId]
      );
      await pool.query('UPDATE support_messages SET is_read_by_admin = TRUE WHERE user_id = $1', [targetUserId]);

      const messages = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        shopName: row.shop_name,
        sender: row.sender,
        senderName: row.sender_name,
        text: row.text,
        createdAt: Number(row.created_at),
        isReadByAdmin: true,
        isReadByUser: row.is_read_by_user,
      }));
      return res.json({ messages });
    } else {
      const list = inMemoryStore.support_messages.filter(m => m.userId === targetUserId);
      list.forEach(m => { m.isReadByAdmin = true; });
      return res.json({ messages: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/support/reply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: 'ইউজার আইডি ও উত্তর লিখুন' });
    }

    const msgId = 'msg_' + Date.now().toString(36);
    const now = Date.now();
    const adminSenderName = req.user?.email === 'siftibrahim@gmail.com' ? 'সুপার অ্যাডমিন' : 'হেল্পডেস্ক সাপোর্ট';
    const pool = getDbPool();

    if (pool) {
      const uRes = await pool.query('SELECT name, phone, shop_name FROM users WHERE id = $1', [userId]);
      const u = uRes.rows[0] || {};

      await pool.query(`
        INSERT INTO support_messages (
          id, user_id, user_name, user_phone, shop_name, sender, sender_name, text,
          is_read_by_admin, is_read_by_user, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        msgId, userId, u.name || 'User', u.phone || '', u.shop_name || 'Shop',
        'admin', adminSenderName, text.trim(), true, false, now
      ]);
    } else {
      inMemoryStore.support_messages.push({
        id: msgId,
        userId,
        userName: 'User',
        userPhone: '',
        shopName: 'Shop',
        sender: 'admin',
        senderName: adminSenderName,
        text: text.trim(),
        isReadByAdmin: true,
        isReadByUser: false,
        createdAt: now,
      });
    }

    return res.json({ message: '✅ রিপ্লাই পাঠানো হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 11. Admin Activity Logs
 */
router.get('/activity-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query('SELECT * FROM admin_activity_logs ORDER BY timestamp DESC LIMIT 100');
      const logs = result.rows.map(row => ({
        id: row.id,
        adminEmail: row.admin_email,
        action: row.action,
        targetEntity: row.target_entity,
        targetId: row.target_id,
        targetName: row.target_name,
        details: row.details,
        timestamp: Number(row.timestamp),
      }));
      return res.json({ logs });
    } else {
      return res.json({ logs: inMemoryStore.admin_activity_logs });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 12. SMS Gateway Configuration (Super Admin)
 */
router.get('/sms-config', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await getSmsGatewaySettings();
    const serverIp = await getServerPublicIp();
    return res.json({
      provider: config.provider || 'bulksmsbd',
      senderId: config.senderId || '',
      username: config.username || '',
      customUrl: config.customUrl || '',
      isEnabled: config.isEnabled,
      hasApiKey: Boolean(config.apiKey),
      maskedApiKey: config.apiKey
        ? config.apiKey.substring(0, 4) + '****' + config.apiKey.substring(config.apiKey.length - 4)
        : '',
      serverIp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sms-config', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { provider, apiKey, senderId, username, customUrl, isEnabled } = req.body;
    const current = await getSmsGatewaySettings();

    const newSettings: SmsGatewaySettings = {
      provider: provider || current.provider || 'bulksmsbd',
      apiKey: apiKey !== undefined ? apiKey : current.apiKey,
      senderId: senderId !== undefined ? senderId : current.senderId,
      username: username !== undefined ? username : current.username,
      customUrl: customUrl !== undefined ? customUrl : current.customUrl,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
    };

    await saveSmsGatewaySettings(newSettings);
    const serverIp = await getServerPublicIp();
    return res.json({ message: '✅ SMS গেটওয়ে সেটিংস সংরক্ষিত হয়েছে', settings: newSettings, serverIp });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sms-test', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'মোবাইল নম্বর প্রদান করুন' });
    }

    const testMsg = message || `ইব্রাহিম খাতা: টেস্ট এসএমএস সফল হয়েছে! সময়: ${new Date().toLocaleTimeString('bn-BD')}`;
    const result = await sendSmsNotification(phone, testMsg);

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Super Admin Tagada Message Templates Management
 */
router.get('/tagada-templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await getDynamicTagadaTemplates();
    return res.json({ templates });
  } catch (err: any) {
    return res.json({ templates: DEFAULT_TAGADA_TEMPLATES });
  }
});

router.post('/tagada-templates', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates)) {
      return res.status(400).json({ error: 'টেমপ্লেট তালিকা সঠিকভাবে প্রদান করুন' });
    }

    const pool = getDbPool();
    const now = Date.now();
    const updatedBy = req.user?.email || 'super_admin';

    if (pool) {
      await pool.query(
        `INSERT INTO system_config (id, data, updated_at, updated_by)
         VALUES ('system_tagada_templates', $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           data = EXCLUDED.data,
           updated_at = EXCLUDED.updated_at,
           updated_by = EXCLUDED.updated_by`,
        [JSON.stringify(templates), now, updatedBy]
      );
    } else {
      if (!inMemoryStore.system_config) inMemoryStore.system_config = {};
      inMemoryStore.system_config['system_tagada_templates'] = templates;
    }

    return res.json({
      success: true,
      message: '✅ তাগাদা মেসেজ টেমপ্লেট সফলভাবে সংরক্ষিত হয়েছে!',
      templates,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 13. POST /api/admin/users/:id/reset-subscription
 * Resets user's subscription:
 * - 'trial': sets subscription back to 14 days default trial
 * - 'expired' or default: sets subscription to expired (yesterday / 0 days)
 * - 'custom': sets subscription to custom days from now
 */
router.post('/users/:id/reset-subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { mode, customDays, note, planName } = req.body || {};
    const pool = getDbPool();
    const now = Date.now();

    let newExpiry = now - 1000;
    let newPlan = planName || 'মেয়াদ শেষ (রিনিউ প্রয়োজন)';
    let newStatus = 'expired';

    if (mode === 'trial') {
      newExpiry = now + 14 * 86400000;
      newPlan = planName || 'ফ্রি ট্রায়াল (১৪ দিন)';
      newStatus = 'trial';
    } else if (mode === 'custom') {
      const days = parseInt(customDays, 10);
      const validDays = isNaN(days) ? 0 : days;
      if (validDays > 0) {
        newExpiry = now + validDays * 86400000;
        newPlan = planName || `কাস্টম প্ল্যান (${validDays} দিন)`;
        newStatus = 'active';
      } else {
        newExpiry = now - 1000;
        newPlan = planName || 'মেয়াদ শেষ (রিনিউ প্রয়োজন)';
        newStatus = 'expired';
      }
    } else {
      // mode === 'expired' or package removal
      newExpiry = now - 1000;
      newPlan = planName || 'মেয়াদ শেষ (রিনিউ প্রয়োজন)';
      newStatus = 'expired';
    }

    if (pool) {
      // 1. Update users table
      await pool.query(`
        UPDATE users SET
          subscription_expires_at = $1,
          subscription_plan = $2,
          subscription_status = $3,
          status = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [newExpiry, newPlan, newStatus, newStatus === 'expired' ? 'expired' : 'active', userId]);

      // 2. Update store_profiles table
      await pool.query(`
        UPDATE store_profiles SET
          subscription_expires_at = $1,
          subscription_plan = $2
        WHERE user_id = $3
      `, [newExpiry, newPlan, userId]).catch(() => {});

      // 3. Mark past approved payments as 'reset' so calculations don't resurrect validity
      await pool.query(`
        UPDATE payments SET status = 'reset', admin_notes = 'এডমিন কর্তৃক সাবস্ক্রিপশন রিসেট করা হয়েছে'
        WHERE user_id = $1
      `, [userId]).catch(() => {});

      // 4. Invalidate any active subscriptions in subscriptions table
      await pool.query(`
        UPDATE subscriptions SET status = 'EXPIRED', end_date = $1, auto_renew = false
        WHERE user_id = $2
      `, [newExpiry, userId]).catch(() => {});

      // 5. Activity log
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        req.user?.email || 'admin',
        'RESET_SUBSCRIPTION',
        'user',
        userId,
        userId,
        `সাবস্ক্রিপশন রিসেট: মোড=${mode || 'expired'}, প্ল্যান=${newPlan}${note ? ', নোট: ' + note : ''}`,
        now,
      ]).catch(() => {});

      // 6. Trigger SubscriptionEngine sync
      try {
        await SubscriptionEngine.recalculateAndSyncUserSubscription(userId);
      } catch (syncErr) {
        console.warn('SubscriptionEngine sync warning on reset-subscription:', syncErr);
      }
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.subscriptionExpiresAt = newExpiry;
        u.subscription_expires_at = newExpiry;
        u.subscriptionPlan = newPlan;
        u.subscription_plan = newPlan;
        u.subscriptionStatus = newStatus;
        u.subscription_status = newStatus;
        u.status = newStatus === 'expired' ? 'expired' : 'active';
      }

      const store = inMemoryStore.stores.find(s => s.userId === userId);
      if (store) {
        store.subscriptionExpiresAt = newExpiry;
        store.subscriptionPlan = newPlan;
      }

      (inMemoryStore.payments || []).forEach(p => {
        if (p.userId === userId) {
          p.status = 'reset';
        }
      });
    }

    // Broadcast subscription reset in real-time
    realtimeEvents.broadcastToUser(userId, 'subscription_reset', {
      subscriptionExpiresAt: newExpiry,
      subscriptionPlan: newPlan,
      subscriptionStatus: newStatus,
      isExpired: newStatus === 'expired',
      daysLeft: Math.max(0, Math.ceil((newExpiry - Date.now()) / 86400000)),
    });

    return res.json({
      message: '✅ ইউজারের সাবস্ক্রিপশন সফলভাবে রিসেট করা হয়েছে',
      subscriptionExpiresAt: newExpiry,
      subscriptionPlan: newPlan,
      subscriptionStatus: newStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/toggle-online-store
 * Super Admin switch to enable or disable Online Store for a user
 */
router.post('/users/:id/toggle-online-store', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { isAllowed, note } = req.body;
    const pool = getDbPool();
    const allowed = isAllowed !== false;
    const newStatus = allowed ? 'active' : 'disabled';
    const now = Date.now();

    if (pool) {
      await pool.query(`
        UPDATE users SET
          is_online_store_allowed = $1,
          online_store_status = $2,
          online_store_note = COALESCE($3, online_store_note)
        WHERE id = $4
      `, [allowed, newStatus, note || (allowed ? 'সুপার অ্যাডমিন কর্তৃক অনলাইন স্টোর সক্রিয়' : 'সুপার অ্যাডমিন কর্তৃক অনলাইন স্টোর নিষ্ক্রিয়'), userId]);

      await pool.query(`
        UPDATE online_store_configs SET
          is_store_allowed_by_admin = $1,
          admin_store_status = $2,
          admin_store_note = COALESCE($3, admin_store_note)
        WHERE user_id = $4
      `, [allowed, newStatus, note || (allowed ? 'সুপার অ্যাডমিন কর্তৃক অনলাইন স্টোর সক্রিয়' : 'সুপার অ্যাডমিন কর্তৃক অনলাইন স্টোর নিষ্ক্রিয়'), userId]).catch(() => {});

      // In-app Notification to user
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'notif_store_status_' + now,
        allowed ? '🛍️ অনলাইন স্টোর সক্রিয় করা হয়েছে!' : '⚠️ অনলাইন স্টোর সাময়িকভাবে স্থগিত',
        allowed
          ? 'সুপার অ্যাডমিন আপনার অনলাইন স্টোর সার্ভিস সফলভাবে অনুমোদন ও চালু করেছেন। এখন আপনি লাইভ সাব-ডোমেন ও ই-কমার্স অর্ডার সেবা ব্যবহার করতে পারবেন।'
          : `সুপার অ্যাডমিন আপনার অনলাইন স্টোর সাময়িকভাবে নিষ্ক্রিয় করেছেন${note ? ': ' + note : '।' }`,
        'system',
        'specific',
        userId,
        'high',
        false,
        now,
      ]).catch(() => {});

      // Admin activity log
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        'log_' + now,
        req.user?.email || 'admin',
        'TOGGLE_ONLINE_STORE',
        'User',
        userId,
        `অনলাইন স্টোর স্ট্যাটাস পরিবর্তন: ${allowed ? 'চালু (Active)' : 'বন্ধ (Disabled)'}${note ? ', নোট: ' + note : ''}`,
        now,
      ]).catch(() => {});
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.isOnlineStoreAllowed = allowed;
        u.onlineStoreStatus = newStatus;
        u.onlineStoreNote = note || (allowed ? 'সুপার অ্যাডমিন কর্তৃক সক্রিয়' : 'সুপার অ্যাডমিন কর্তৃক নিষ্ক্রিয়');
      }
      const c = (inMemoryStore.online_store_configs || []).find(x => (x.userId || x.user_id) === userId);
      if (c) {
        c.isStoreAllowedByAdmin = allowed;
        c.adminStoreStatus = newStatus;
        c.adminStoreNote = note || '';
      }
    }

    // Broadcast instant update to user's frontend session
    realtimeEvents.broadcastToUser(userId, 'online_store_status_changed', {
      isAllowed: allowed,
      status: newStatus,
      note: note || '',
    });

    return res.json({
      message: allowed ? '✅ অনলাইন স্টোর সফলভাবে সক্রিয় করা হয়েছে' : '⚠️ অনলাইন স্টোর নিষ্ক্রিয় করা হয়েছে',
      isOnlineStoreAllowed: allowed,
      onlineStoreStatus: newStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/approve-store-request
 * Super Admin approves user's online store request
 */
router.post('/users/:id/approve-store-request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      await pool.query(`
        UPDATE users SET
          is_online_store_allowed = true,
          online_store_status = 'active',
          online_store_note = 'সুপার অ্যাডমিন রিকোয়েস্ট অনুমোদন করেছেন'
        WHERE id = $1
      `, [userId]);

      await pool.query(`
        UPDATE online_store_configs SET
          is_store_allowed_by_admin = true,
          admin_store_status = 'active',
          admin_store_note = 'সুপার অ্যাডমিন রিকোয়েস্ট অনুমোদন করেছেন'
        WHERE user_id = $1
      `, [userId]).catch(() => {});

      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'notif_store_approved_' + now,
        '🎉 আপনার অনলাইন স্টোর রিকোয়েস্ট অনুমোদিত হয়েছে!',
        'সুপার অ্যাডমিন আপনার অনলাইন স্টোর ব্যবহারের আবেদন সফলভাবে অনুমোদন করেছেন। আপনার ই-কমার্স স্টোর এখন সম্পূর্ণ সক্রিয়!',
        'system',
        'specific',
        userId,
        'high',
        false,
        now,
      ]).catch(() => {});

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['log_' + now, req.user?.email || 'admin', 'APPROVE_STORE_REQUEST', 'User', userId, 'অনলাইন স্টোর রিকোয়েস্ট অনুমোদন করা হয়েছে', now]).catch(() => {});
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.isOnlineStoreAllowed = true;
        u.onlineStoreStatus = 'active';
        u.onlineStoreNote = 'সুপার অ্যাডমিন রিকোয়েস্ট অনুমোদন করেছেন';
      }
      const c = (inMemoryStore.online_store_configs || []).find(x => (x.userId || x.user_id) === userId);
      if (c) {
        c.isStoreAllowedByAdmin = true;
        c.adminStoreStatus = 'active';
      }
    }

    realtimeEvents.broadcastToUser(userId, 'online_store_status_changed', {
      isAllowed: true,
      status: 'active',
      note: 'সুপার অ্যাডমিন রিকোয়েস্ট অনুমোদন করেছেন',
    });

    return res.json({
      message: '✅ অনলাইন স্টোর রিকোয়েস্ট সফলভাবে অনুমোদন করা হয়েছে',
      isOnlineStoreAllowed: true,
      onlineStoreStatus: 'active',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/reject-store-request
 * Super Admin rejects user's online store request
 */
router.post('/users/:id/reject-store-request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    const pool = getDbPool();
    const rejectReason = reason || 'সুপার অ্যাডমিন কর্তৃক আবেদন বাতিল করা হয়েছে';
    const now = Date.now();

    if (pool) {
      await pool.query(`
        UPDATE users SET
          is_online_store_allowed = false,
          online_store_status = 'disabled',
          online_store_note = $1
        WHERE id = $2
      `, [rejectReason, userId]);

      await pool.query(`
        UPDATE online_store_configs SET
          is_store_allowed_by_admin = false,
          admin_store_status = 'disabled',
          admin_store_note = $1
        WHERE user_id = $2
      `, [rejectReason, userId]).catch(() => {});

      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        'notif_store_rejected_' + now,
        'অনলাইন স্টোর আবেদন সংক্রান্ত নোটিশ',
        `আপনার অনলাইন স্টোর অ্যাক্টিভেশন রিকোয়েস্ট পর্যালোচনা শেষে বাতিল করা হয়েছে। কারণ: ${rejectReason}`,
        'system',
        'specific',
        userId,
        'normal',
        false,
        now,
      ]).catch(() => {});
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.isOnlineStoreAllowed = false;
        u.onlineStoreStatus = 'disabled';
        u.onlineStoreNote = rejectReason;
      }
      const c = (inMemoryStore.online_store_configs || []).find(x => (x.userId || x.user_id) === userId);
      if (c) {
        c.isStoreAllowedByAdmin = false;
        c.adminStoreStatus = 'disabled';
        c.adminStoreNote = rejectReason;
      }
    }

    realtimeEvents.broadcastToUser(userId, 'online_store_status_changed', {
      isAllowed: false,
      status: 'disabled',
      note: rejectReason,
    });

    return res.json({
      message: 'অনলাইন স্টোর রিকোয়েস্ট বাতিল করা হয়েছে',
      isOnlineStoreAllowed: false,
      onlineStoreStatus: 'disabled',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/online-store-requests
 * List users who requested online store activation
 */
router.get('/online-store-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(`
        SELECT id, name, shop_name, phone, email, online_store_status,
               online_store_requested_at, online_store_note, is_online_store_allowed,
               subscription_plan, subscription_expires_at
        FROM users
        WHERE online_store_status = 'requested'
        ORDER BY online_store_requested_at DESC NULLS LAST
      `);
      return res.json({ requests: result.rows });
    } else {
      const list = (inMemoryStore.users || []).filter(u => u.onlineStoreStatus === 'requested');
      return res.json({ requests: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 14. POST /api/admin/impersonate/:userId
 * Allow Super Admin & authorized Staff to login as any user
 */
router.post('/impersonate/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const pool = getDbPool();

    let targetUser: any = null;
    let targetStore: any = null;

    if (pool) {
      const uRes = await pool.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
      if (uRes.rows.length === 0) {
        return res.status(404).json({ error: 'টার্গেট ইউজার খুঁজে পাওয়া যায়নি' });
      }
      const row = uRes.rows[0];
      targetUser = {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        shopName: row.shop_name,
        businessType: row.business_type,
        address: row.address,
        role: row.role,
        status: row.status,
        subscriptionPlan: row.subscription_plan,
        subscriptionStatus: row.subscription_status,
        subscriptionExpiresAt: Number(row.subscription_expires_at),
        registeredAt: Number(row.registered_at),
        lastActiveAt: Number(row.last_active_at),
        smsBalance: row.sms_balance !== null && row.sms_balance !== undefined ? Number(row.sms_balance) : 0,
      };

      const sRes = await pool.query('SELECT * FROM store_profiles WHERE user_id = $1', [targetUserId]);
      if (sRes.rows.length > 0) {
        const s = sRes.rows[0];
        targetStore = {
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          address: s.address,
          currency: s.currency,
          taxRate: parseFloat(s.tax_rate) || 0,
          invoiceFooter: s.invoice_footer,
          logoUrl: s.logo_url,
          enableSmsAlerts: s.enable_sms_alerts,
          isOnlineStoreActive: s.is_online_store_active,
          subscriptionPlan: s.subscription_plan,
          subscriptionExpiresAt: Number(s.subscription_expires_at),
          qrCodeImage: s.qr_code_image,
        };
      }
    } else {
      const u = inMemoryStore.users.find(x => x.id === targetUserId);
      if (!u) return res.status(404).json({ error: 'টার্গেট ইউজার খুঁজে পাওয়া যায়নি' });
      targetUser = { ...u };
      const s = inMemoryStore.stores.find(x => x.userId === targetUserId);
      if (s) targetStore = { ...s };
    }

    // Generate JWT token for target user with impersonation metadata
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role || 'user',
        isImpersonated: true,
        impersonatedBy: req.user?.email || 'admin',
      },
      process.env.JWT_SECRET || 'twing_jwt_secret_key_2025_pos_cloud',
      { expiresIn: '12h' }
    );

    return res.json({
      message: `✅ আপনি সফলভাবে ${targetUser.name || targetUser.shopName}-এর অ্যাকাউন্টে প্রবেশ করছেন`,
      token,
      user: targetUser,
      store: targetStore,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 15. AdMob & Ads Monetization Settings (Admin)
 */
router.get('/ad-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'system_ad_settings'");
      if (result.rows.length > 0) {
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

router.put('/ad-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = req.body;
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ('system_ad_settings', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(settings), now, req.user?.email || 'admin']);
    } else {
      inMemoryStore.system_config['system_ad_settings'] = settings;
    }

    return res.json({ message: '✅ বিজ্ঞাপন ও মনিটাইজেশন সেটিংস সংরক্ষিত হয়েছে!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 16. SMS Management (Admin)
 */
router.post('/users/:id/add-sms', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { amount, note } = req.body;
    const smsCount = parseInt(amount, 10) || 0;
    const pool = getDbPool();

    if (pool) {
      const uRes = await pool.query('SELECT sms_balance, name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
      const currentBalance = uRes.rows[0].sms_balance || 0;
      const newBalance = Math.max(0, currentBalance + smsCount);

      await pool.query('UPDATE users SET sms_balance = $1 WHERE id = $2', [newBalance, userId]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + Date.now(),
        req.user?.email || 'admin',
        'ADD_SMS_BALANCE',
        'user',
        userId,
        uRes.rows[0].name || userId,
        `${smsCount > 0 ? '+' : ''}${smsCount} এসএমএস ব্যালেন্স যোগ করা হয়েছে। নতুন ব্যালেন্স: ${newBalance}টি${note ? ', নোট: ' + note : ''}`,
        Date.now(),
      ]).catch(() => {});

      return res.json({ message: `✅ ইউজারের এসএমএস ব্যালেন্স আপডেট হয়েছে (${newBalance}টি)`, newBalance });
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.smsBalance = Math.max(0, (u.smsBalance ?? 0) + smsCount);
        return res.json({ message: `✅ এসএমএস ব্যালেন্স আপডেট হয়েছে (${u.smsBalance}টি)`, newBalance: u.smsBalance });
      }
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sms-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(`
        SELECT l.*, u.name as user_name, u.shop_name
        FROM sms_logs l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 100
      `);
      const logs = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || 'ইউজার',
        shopName: row.shop_name || 'দোকান',
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
      return res.json({ logs: inMemoryStore.sms_logs || [] });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sms-purchases', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query('SELECT * FROM sms_purchases ORDER BY created_at DESC LIMIT 100');
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
        status: row.status,
        createdAt: Number(row.created_at),
        approvedAt: row.approved_at ? Number(row.approved_at) : null,
      }));
      return res.json({ purchases });
    } else {
      return res.json({ purchases: inMemoryStore.sms_purchases || [] });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sms-purchases/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseId = req.params.id;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const pRes = await pool.query('SELECT * FROM sms_purchases WHERE id = $1', [purchaseId]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'অনুরোধ পাওয়া যায়নি' });
      const p = pRes.rows[0];
      if (p.status === 'approved' || p.status === 'confirmed') {
        return res.json({ message: 'ইতিমধ্যেই অনুমোদিত হয়েছে' });
      }

      await pool.query('UPDATE sms_purchases SET status = $1, approved_at = $2 WHERE id = $3', ['confirmed', now, purchaseId]);
      const updUser = await pool.query(
        'UPDATE users SET sms_balance = COALESCE(sms_balance, 0) + $1 WHERE id = $2 RETURNING sms_balance, name',
        [p.sms_count, p.user_id]
      );
      const newBal = updUser.rows[0]?.sms_balance || p.sms_count;

      // Send User Notification as specified in Requirement 6
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'notif_sms_' + now,
        '✅ এসএমএস পেমেন্ট সফল হয়েছে',
        `আপনার পেমেন্ট কনফার্ম হয়েছে। একাউন্টে ${p.sms_count}টি SMS যোগ হয়েছে। বর্তমান SMS Balance: ${newBal}টি।`,
        'success',
        'specific',
        p.user_id,
        p.user_name || p.shop_name,
        'high',
        false,
        now,
      ]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        req.user?.email || 'admin',
        'APPROVE_SMS_PURCHASE',
        'sms_purchase',
        purchaseId,
        p.user_name || p.shop_name,
        `৳${p.amount} মূল্যের ${p.sms_count}টি এসএমএস অনুমোদন করা হয়েছে (TrxID: ${p.trx_id})`,
        now,
      ]).catch(() => {});

      return res.json({
        message: `✅ এসএমএস পেমেন্ট কনফার্ম করা হয়েছে এবং ইউজারের ব্যালেন্সে ${p.sms_count}টি SMS যোগ হয়েছে! বর্তমান ব্যালেন্স: ${newBal}টি`,
        newBalance: newBal,
      });
    } else {
      const p = (inMemoryStore.sms_purchases || []).find(x => x.id === purchaseId);
      if (p) {
        p.status = 'confirmed';
        p.approvedAt = now;
        const u = inMemoryStore.users.find(x => x.id === p.userId);
        const newBal = ((u?.smsBalance ?? 10) + p.smsCount);
        if (u) u.smsBalance = newBal;

        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: 'notif_sms_' + now,
          title: '✅ এসএমএস পেমেন্ট সফল হয়েছে',
          message: `আপনার পেমেন্ট কনফার্ম হয়েছে। একাউন্টে ${p.smsCount}টি SMS যোগ হয়েছে। বর্তমান SMS Balance: ${newBal}টি।`,
          type: 'success',
          target: 'specific',
          targetUserId: p.userId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });

        return res.json({
          message: `✅ এসএমএস পেমেন্ট কনফার্ম করা হয়েছে এবং ${p.smsCount}টি SMS যোগ হয়েছে`,
          newBalance: newBal,
        });
      }
      return res.status(404).json({ error: 'অনুরোধ পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/sms-purchases/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const purchaseId = req.params.id;
    const { reason } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const pRes = await pool.query('SELECT * FROM sms_purchases WHERE id = $1', [purchaseId]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'অনুরোধ পাওয়া যায়নি' });
      const p = pRes.rows[0];

      await pool.query('UPDATE sms_purchases SET status = $1 WHERE id = $2', ['rejected', purchaseId]);

      // Send User Notification for rejection
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'notif_sms_rej_' + now,
        '❌ এসএমএস পেমেন্ট বাতিল হয়েছে',
        `আপনার TrxID: ${p.trx_id} এর ${p.sms_count}টি এসএমএস পেমেন্ট বাতিল করা হয়েছে। ${reason ? 'কারণ: ' + reason : 'ভুল ট্রানজেকশন আইডি বা অর্থ প্রাপ্তি নিশ্চিত না হওয়ার কারণে এমনটি হয়েছে। প্রয়োজনে সাপোর্টে যোগাযোগ করুন।'}`,
        'warning',
        'specific',
        p.user_id,
        p.user_name || p.shop_name,
        'high',
        false,
        now,
      ]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        req.user?.email || 'admin',
        'REJECT_SMS_PURCHASE',
        'sms_purchase',
        purchaseId,
        p.user_name || p.shop_name,
        `এসএমএস রিকোয়েস্ট বাতিল করা হয়েছে (TrxID: ${p.trx_id})${reason ? ', কারণ: ' + reason : ''}`,
        now,
      ]).catch(() => {});

      return res.json({ message: '❌ এসএমএস পেমেন্ট বাতিল করা হয়েছে এবং গ্রাহককে নোটিফিকেশন পাঠানো হয়েছে' });
    } else {
      const p = (inMemoryStore.sms_purchases || []).find(x => x.id === purchaseId);
      if (p) {
        p.status = 'rejected';
        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: 'notif_sms_rej_' + now,
          title: '❌ এসএমএস পেমেন্ট বাতিল হয়েছে',
          message: `আপনার TrxID: ${p.trxId} এর ${p.smsCount}টি এসএমএস পেমেন্ট বাতিল করা হয়েছে। ${reason ? 'কারণ: ' + reason : 'ভুল তথ্য বা ট্রানজেকশন।' }`,
          type: 'warning',
          target: 'specific',
          targetUserId: p.userId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });
        return res.json({ message: '❌ এসএমএস পেমেন্ট বাতিল করা হয়েছে' });
      }
      return res.status(404).json({ error: 'অনুরোধ পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:userId/set-sms-balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { balance, note } = req.body;
    const exactBalance = Math.max(0, parseInt(balance, 10) || 0);
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const uRes = await pool.query('SELECT name, shop_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });

      await pool.query('UPDATE users SET sms_balance = $1 WHERE id = $2', [exactBalance, userId]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        req.user?.email || 'admin',
        'SET_EXACT_SMS_BALANCE',
        'user',
        userId,
        uRes.rows[0].name || userId,
        `এসএমএস ব্যালেন্স সরাসরি সংশোধন করে ${exactBalance}টি করা হয়েছে${note ? ', নোট: ' + note : ''}`,
        now,
      ]).catch(() => {});

      return res.json({
        message: `✅ ইউজারের এসএমএস ব্যালেন্স সংশোধন করা হয়েছে (${exactBalance}টি)`,
        balance: exactBalance,
      });
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.smsBalance = exactBalance;
        return res.json({ message: `✅ ব্যালেন্স সংশোধন করা হয়েছে (${exactBalance}টি)`, balance: exactBalance });
      }
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/sms-packages
 * Get all configured SMS packages
 */
router.get('/sms-packages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    const packages = await getDynamicSmsPackages(pool);
    return res.json({ packages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/sms-packages
 * Super Admin updates SMS packages (add, remove, change count, change price)
 */
router.put('/sms-packages', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { packages } = req.body;
    if (!Array.isArray(packages)) {
      return res.status(400).json({ error: 'প্যাকেজ তালিকা অ্যারে হতে হবে' });
    }

    const pool = getDbPool();
    const now = Date.now();
    const adminEmail = req.user?.email || 'admin@twing.com';

    if (pool) {
      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
        SET data = $2, updated_at = $3, updated_by = $4
      `, [
        'system_sms_packages',
        JSON.stringify(packages),
        now,
        adminEmail,
      ]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        adminEmail,
        'UPDATE_SMS_PACKAGES',
        'system_sms_packages',
        'system_sms_packages',
        'এসএমএস প্যাকেজ সেটিংস',
        `সুপার অ্যাডমিন এসএমএস প্যাকেজ তালিকা আপডেট করেছেন (${packages.length}টি প্যাকেজ)`,
        now,
      ]).catch(() => {});
    } else {
      if (!inMemoryStore.system_config) inMemoryStore.system_config = {};
      inMemoryStore.system_config['system_sms_packages'] = packages;
    }

    return res.json({
      success: true,
      message: '✅ এসএমএস প্যাকেজ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
      packages,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/:userId/reset-sms
 * Reset a user's SMS balance to 0 (প্যাকেজ রিসেট)
 */
router.post('/users/:userId/reset-sms', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const pool = getDbPool();
    const now = Date.now();
    const adminEmail = req.user?.email || 'admin';

    if (pool) {
      const uRes = await pool.query('SELECT name, shop_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });

      await pool.query('UPDATE users SET sms_balance = 0 WHERE id = $1', [userId]);
      await pool.query("UPDATE sms_purchases SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending'", [userId]).catch(() => {});

      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'notif_reset_' + now,
        '⚠️ এসএমএস প্যাকেজ রিসেট হয়েছে',
        `সুপার অ্যাডমিন আপনার এসএমএস প্যাকেজ ব্যালেন্স রিসেট করেছেন। নতুন প্যাকেজ ক্রয় করতে পারেন।${reason ? ' কারণ: ' + reason : ''}`,
        'warning',
        'specific',
        userId,
        uRes.rows[0].name || userId,
        'high',
        false,
        now,
      ]);

      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'act_' + now,
        adminEmail,
        'RESET_USER_SMS',
        'user',
        userId,
        uRes.rows[0].name || userId,
        `ইউজারের এসএমএস ব্যালেন্স রিসেট (০) করা হয়েছে${reason ? '. কারণ: ' + reason : ''}`,
        now,
      ]).catch(() => {});

      return res.json({ message: '✅ ইউজারের এসএমএস প্যাকেজ ও ব্যালেন্স সম্পূর্ণ রিসেট (০) করা হয়েছে', balance: 0 });
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.smsBalance = 0;
        (inMemoryStore.sms_purchases || []).forEach(p => {
          if (p.userId === userId && p.status === 'pending') {
            p.status = 'cancelled';
          }
        });
        return res.json({ message: '✅ ইউজারের এসএমএস প্যাকেজ রিসেট (০) করা হয়েছে', balance: 0 });
      }
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dashboard-banners
 * Returns dashboard hero banner settings
 */
router.get('/dashboard-banners', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'dashboard_banner_settings'");
      if (result.rows.length > 0 && result.rows[0].data) {
        const data = typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data;
        return res.json({ settings: data });
      }
    } else if (inMemoryStore.system_config?.['dashboard_banner_settings']) {
      return res.json({ settings: inMemoryStore.system_config['dashboard_banner_settings'] });
    }

    const defaultBanners = {
      isEnabled: true,
      autoPlay: true,
      intervalSeconds: 5,
      banners: [
        {
          id: 'banner_store_companion',
          title: 'আপনার ব্যবসার বিশ্বস্ত ডিজিটাল সঙ্গী',
          subtitle: 'সহজে নির্ভুল বাকির হিসাব রাখুন, নিরাপদে ব্যবসা এগিয়ে নিন',
          badgeText: 'খাতা স্পেশাল',
          imageUrl: '',
          bgGradient: 'emerald',
          textColor: 'dark',
          actionType: 'none',
          isActive: true,
          order: 1,
        },
        {
          id: 'banner_sms_tagada',
          title: 'এক ক্লিকে বকেয়া আদায়ের তাগাদা পাঠান',
          subtitle: 'গ্রাহকের মোবাইলে বাংলায় সরাসরি তাগাদা এসএমএস পৌঁছে যাবে',
          badgeText: 'স্মার্ট মেসেজ',
          imageUrl: '',
          bgGradient: 'teal',
          textColor: 'dark',
          actionType: 'sms',
          actionText: 'এসএমএস পাঠান',
          isActive: true,
          order: 2,
        },
        {
          id: 'banner_premium_upgrade',
          title: 'আনলিমিটেড ক্লাউড ব্যাকআপ ও প্রিমিয়াম সুবিধা',
          subtitle: 'মাত্র ৫০ টাকা থেকে সাবস্ক্রিপশন নিয়ে নিশ্চিত থাকুন আজীবন',
          badgeText: 'প্রো অফার',
          imageUrl: '',
          bgGradient: 'amber',
          textColor: 'dark',
          actionType: 'subscription',
          actionText: 'প্যাকেজ দেখুন',
          isActive: true,
          order: 3,
        },
      ],
      updatedAt: Date.now(),
    };
    return res.json({ settings: defaultBanners });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/dashboard-banners
 * Updates dashboard hero banner settings
 */
router.post('/dashboard-banners', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: 'ব্যানার সেটিংস পাওয়া যায়নি' });
    }
    const pool = getDbPool();
    const now = Date.now();
    const updatedSettings = {
      ...settings,
      updatedAt: now,
    };

    if (pool) {
      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ('dashboard_banner_settings', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(updatedSettings), now, req.user?.email || 'admin']);
    }

    if (!inMemoryStore.system_config) inMemoryStore.system_config = {};
    inMemoryStore.system_config['dashboard_banner_settings'] = updatedSettings;

    return res.json({
      success: true,
      message: '✅ ড্যাশবোর্ড হিরো ব্যানার সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
      settings: updatedSettings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SUPER ADMIN: SYSTEM DATA & MASTER BACKUP/IMPORT
// ==========================================

import {
  getSystemDataSummary,
  exportMasterBackup,
  importMasterBackup,
  importSpecificTable,
  migrateFromRemoteDatabase,
} from '../services/adminDataService';

/**
 * GET /api/admin/data/summary
 * Retrieves record counts across active storage and Postgres
 */
router.get('/data/summary', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await getSystemDataSummary();
    return res.json(summary);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ডাটা সামারি লোড করতে ব্যর্থ' });
  }
});

/**
 * GET /api/admin/data/export-full
 * Exports entire system database as master JSON
 */
router.get('/data/export-full', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const master = await exportMasterBackup();
    return res.json(master);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'মাস্টার ব্যাকআপ এক্সপোর্ট ব্যর্থ' });
  }
});

/**
 * POST /api/admin/data/import-full
 * Imports master backup JSON (from Neon/file/backup) into storage
 */
router.post('/data/import-full', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, mode } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'কোনো ব্যাকআপ ডাটা পাওয়া যায়নি' });
    }
    const result = await importMasterBackup(data, mode || 'merge');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ডাটা ইমপোর্ট ব্যর্থ হয়েছে' });
  }
});

/**
 * POST /api/admin/data/import-table
 * Imports a specific table (e.g. from Neon JSON table export)
 */
router.post('/data/import-table', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tableName, rows, mode } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'টেবিল ডাটা একটি অ্যারে (Array) আকারে দিতে হবে' });
    }
    const result = await importSpecificTable(tableName || 'auto', rows, mode || 'merge');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'টেবিল ডাটা ইমপোর্ট ব্যর্থ হয়েছে' });
  }
});

/**
 * POST /api/admin/data/migrate-remote
 * Direct 1-Click Migration from remote Neon / PostgreSQL to CockroachDB
 */
router.post('/data/migrate-remote', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceUrl } = req.body;
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      return res.status(400).json({ error: 'সোর্স ডাটাবেজের (Neon) কানেকশন লিঙ্ক প্রদান করুন' });
    }
    const result = await migrateFromRemoteDatabase(sourceUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'রিমোট ডাটা মাইগ্রেশন ব্যর্থ হয়েছে' });
  }
});

// ============================================================================
// LIVE DATABASE VIEWER ENDPOINTS (লাইভ ডাটাবেজ ভিউয়ার)
// ============================================================================

/**
 * GET /api/admin/live-db/overview
 * Real-time connection status, health, and table counts directly from CockroachDB
 */
router.get('/live-db/overview', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getDbPool();
  const startTime = Date.now();

  if (!pool) {
    return res.json({
      connected: false,
      storageType: 'in-memory',
      database: 'local_memory',
      cluster: 'N/A',
      region: 'N/A',
      latencyMs: 0,
      dbEngine: 'In-Memory Store (DB Disconnected)',
      tables: [
        { name: 'users', rowCount: inMemoryStore.users?.length || 0, columnCount: 15 },
        { name: 'customers', rowCount: inMemoryStore.customers?.length || 0, columnCount: 10 },
        { name: 'transactions', rowCount: inMemoryStore.transactions?.length || 0, columnCount: 12 },
        { name: 'products', rowCount: inMemoryStore.products?.length || 0, columnCount: 11 },
        { name: 'expenses', rowCount: inMemoryStore.expenses?.length || 0, columnCount: 9 },
        { name: 'payments', rowCount: inMemoryStore.payments?.length || 0, columnCount: 14 },
      ],
      totalRows: (inMemoryStore.users?.length || 0) + (inMemoryStore.customers?.length || 0) + (inMemoryStore.transactions?.length || 0),
      timestamp: Date.now(),
    });
  }

  try {
    // 1. Check latency and get DB version
    const verRes = await pool.query('SELECT version() as ver, current_database() as db, current_user as usr');
    const latencyMs = Date.now() - startTime;
    const dbName = verRes.rows[0]?.db || 'defaultdb';
    const rawVersion = verRes.rows[0]?.ver || 'CockroachDB';
    const isCockroach = rawVersion.toLowerCase().includes('cockroach');

    // 2. Fetch all public tables and their column counts
    const tablesRes = await pool.query(`
      SELECT 
        t.table_name,
        COUNT(c.column_name) as col_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
      GROUP BY t.table_name
      ORDER BY t.table_name ASC
    `);

    const tableList = tablesRes.rows;

    // 3. Query row counts for each table
    const tablesWithCounts = await Promise.all(
      tableList.map(async (row: any) => {
        const tName = row.table_name;
        try {
          // CockroachDB supports safe count query
          const countRes = await pool.query(`SELECT count(*) as cnt FROM "${tName}"`);
          return {
            name: tName,
            rowCount: parseInt(countRes.rows[0]?.cnt || '0', 10),
            columnCount: parseInt(row.col_count || '0', 10),
          };
        } catch (e: any) {
          return {
            name: tName,
            rowCount: 0,
            columnCount: parseInt(row.col_count || '0', 10),
            error: e.message,
          };
        }
      })
    );

    const totalRows = tablesWithCounts.reduce((acc, t) => acc + t.rowCount, 0);

    return res.json({
      connected: true,
      storageType: 'cockroachdb_cloud',
      database: dbName,
      cluster: 'twinghisabi-32789',
      host: 'twinghisabi-32789.j77.aws-ap-southeast-3.cockroachlabs.cloud',
      port: 26257,
      region: 'AWS ap-southeast-3 (Jakarta)',
      ssl: 'TLS v1.3 Verified',
      latencyMs,
      dbEngine: isCockroach ? 'CockroachDB Serverless (PostgreSQL Compatible)' : 'PostgreSQL',
      versionSummary: rawVersion.split(' ')[0] + ' ' + (rawVersion.split(' ')[1] || ''),
      tables: tablesWithCounts,
      totalRows,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error fetching live-db overview:', err);
    return res.status(500).json({
      connected: false,
      error: err.message || 'ডাটাবেজ ওভারভিউ লোড করতে ব্যর্থ',
    });
  }
});

/**
 * GET /api/admin/live-db/table/:tableName
 * Paginated rows, schema, and search for any table
 */
router.get('/live-db/table/:tableName', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { tableName } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const limit = Math.min(100, Math.max(5, parseInt(req.query.limit as string || '25', 10)));
  const offset = (page - 1) * limit;
  const search = (req.query.search as string || '').trim();
  const sortBy = (req.query.sortBy as string || '').trim();
  const sortOrder = (req.query.sortOrder as string || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const pool = getDbPool();
  if (!pool) {
    return res.status(503).json({ error: 'CockroachDB ডাটাবেজের সাথে সংযোগ বিচ্ছিন্ন' });
  }

  try {
    // 1. Verify that table exists in public schema (prevents SQL injection)
    const tableVerify = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [tableName]
    );

    if (tableVerify.rows.length === 0) {
      return res.status(404).json({ error: `টেবিল '${tableName}' ডাটাবেজে পাওয়া যায়নি` });
    }

    // 2. Fetch table column definitions
    const colRes = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position ASC
    `, [tableName]);

    const columns = colRes.rows.map((c: any) => ({
      name: c.column_name,
      type: c.data_type,
      isNullable: c.is_nullable === 'YES',
      defaultVal: c.column_default,
    }));

    const columnNames = columns.map(c => c.name);

    // 3. Build search condition across text/varchar/uuid columns
    const textColumns = columns
      .filter(c => ['character varying', 'text', 'uuid', 'character'].some(t => c.type.includes(t)))
      .map(c => c.name);

    let whereClause = '';
    const queryParams: any[] = [];

    if (search && textColumns.length > 0) {
      const searchConditions = textColumns.map(col => {
        queryParams.push(`%${search}%`);
        return `CAST("${col}" AS TEXT) ILIKE $${queryParams.length}`;
      });
      whereClause = `WHERE ${searchConditions.join(' OR ')}`;
    }

    // 4. Count total matching rows
    const countSql = `SELECT count(*) as total FROM "${tableName}" ${whereClause}`;
    const countRes = await pool.query(countSql, queryParams);
    const totalCount = parseInt(countRes.rows[0]?.total || '0', 10);

    // 5. Build order clause
    let orderClause = '';
    if (sortBy && columnNames.includes(sortBy)) {
      orderClause = `ORDER BY "${sortBy}" ${sortOrder}`;
    } else if (columnNames.includes('registered_at')) {
      orderClause = `ORDER BY "registered_at" DESC`;
    } else if (columnNames.includes('created_at')) {
      orderClause = `ORDER BY "created_at" DESC`;
    } else if (columnNames.includes('updated_at')) {
      orderClause = `ORDER BY "updated_at" DESC`;
    } else if (columnNames.includes('id')) {
      orderClause = `ORDER BY "id" DESC`;
    }

    // 6. Fetch paginated rows
    const dataSql = `SELECT * FROM "${tableName}" ${whereClause} ${orderClause} LIMIT ${limit} OFFSET ${offset}`;
    const dataRes = await pool.query(dataSql, queryParams);

    // 7. Sanitize sensitive fields (e.g. password_hash)
    const sanitizedRows = dataRes.rows.map((r: any) => {
      const clone = { ...r };
      if (clone.password_hash) {
        clone.password_hash = '🔒 [Bcrypt Hash Secured]';
      }
      return clone;
    });

    return res.json({
      tableName,
      columns,
      rows: sanitizedRows,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err: any) {
    console.error(`Error querying table ${tableName}:`, err);
    return res.status(500).json({ error: err.message || 'টেবিল ডাটা ফেচ করতে সমস্যা হয়েছে' });
  }
});

/**
 * POST /api/admin/live-db/query
 * Safe Read-Only SQL Query Runner (SELECT only)
 */
router.post('/live-db/query', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { sql } = req.body;
  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    return res.status(400).json({ error: 'এসকিউএল কুয়েরি লিখুন' });
  }

  const cleanSql = sql.trim();
  const upper = cleanSql.toUpperCase();

  // STRICT SAFETY ENFORCEMENT: Only allow SELECT, EXPLAIN, WITH
  const isAllowedStart = upper.startsWith('SELECT') || upper.startsWith('EXPLAIN') || upper.startsWith('WITH');
  const forbiddenKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'CREATE', 'REPLACE', 'SET', 'COPY'];
  
  const containsForbidden = forbiddenKeywords.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(cleanSql);
  });

  if (!isAllowedStart || containsForbidden) {
    return res.status(403).json({
      error: '⚠️ নিরাপত্তা সীমাবদ্ধতা: লাইভ ভিউয়ারে শুধুমাত্র পাঠযোগ্য (Read-Only) SELECT কুয়েরি চালানোর অনুমতি রয়েছে। কোনো ডাটা পরিবর্তন বা ডিলিট করা নিষিদ্ধ।',
    });
  }

  const pool = getDbPool();
  if (!pool) {
    return res.status(503).json({ error: 'CockroachDB ডাটাবেজ অফলাইন' });
  }

  const startTime = Date.now();
  try {
    // Append limit if not present to avoid browser memory crash
    let safeSql = cleanSql;
    if (!upper.includes('LIMIT')) {
      safeSql += ' LIMIT 100';
    }

    const queryRes = await pool.query(safeSql);
    const executionTimeMs = Date.now() - startTime;

    const columns = queryRes.fields?.map(f => f.name) || [];
    const rows = queryRes.rows.map((r: any) => {
      const clone = { ...r };
      if (clone.password_hash) clone.password_hash = '🔒 [Bcrypt Hash Secured]';
      return clone;
    });

    return res.json({
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs,
    });
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    return res.status(400).json({
      error: err.message || 'কুয়েরি এক্সিকিউট করতে ত্রুটি হয়েছে',
      executionTimeMs,
    });
  }
});

export default router;
