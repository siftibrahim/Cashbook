import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDbPool, inMemoryStore, setAndConnectDatabaseUrl } from '../db';
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
  SmsGatewaySettings,
} from '../services/smsService';
import { SubscriptionEngine } from '../services/subscriptionEngine';

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
      // Fetch users with resilient fallback from Neon PostgreSQL
      let rows: any[] = [];
      try {
        const result = await pool.query(`
          SELECT 
            u.*,
            COALESCE((SELECT COUNT(*) FROM customers c WHERE c.user_id = u.id), 0) as total_customers,
            COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id), 0) as total_transactions
          FROM users u 
          ORDER BY COALESCE(u.registered_at, 0) DESC
        `);
        rows = result.rows;
      } catch (subErr) {
        console.warn('Fallback basic user query in /api/admin/users:', subErr);
        const basicResult = await pool.query('SELECT * FROM users ORDER BY registered_at DESC');
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
        subscriptionExpiresAt: Number(row.subscription_expires_at) || (Date.now() + 14 * 86400000),
        registeredAt: Number(row.registered_at) || Date.now(),
        lastActiveAt: Number(row.last_active_at) || Date.now(),
        totalCustomers: parseInt(row.total_customers || '0', 10),
        totalTransactions: parseInt(row.total_transactions || '0', 10),
        notes: row.notes || '',
        deviceInfo: row.device_info || '',
        appVersion: row.app_version || '2.5.0',
      }));

      return res.json({ users, isPostgresConnected: true, totalCount: users.length });
    } else {
      return res.json({ users: inMemoryStore.users, isPostgresConnected: false, totalCount: inMemoryStore.users.length });
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
    const pool = getDbPool();
    if (!pool) {
      return res.json({
        connected: false,
        message: 'DATABASE_URL এনভায়রনমেন্ট ভেরিয়েবল সেট করা নেই। ইন-মেমোরি মোডে চলছে।',
        provider: 'In-Memory Fallback',
        userCount: inMemoryStore.users.length,
      });
    }

    const check = await pool.query('SELECT current_database(), count(*) as user_count FROM users');
    return res.json({
      connected: true,
      message: '✅ Neon PostgreSQL ডাটাবেজে সফলভাবে সংযুক্ত রয়েছে!',
      provider: 'Neon PostgreSQL',
      databaseName: check.rows[0]?.current_database || 'neondb',
      userCount: parseInt(check.rows[0]?.user_count || '0', 10),
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      message: `❌ ডাটাবেজ কানেকশন এরর: ${err.message}`,
      provider: 'Disconnected',
      userCount: inMemoryStore.users.length,
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
 */
router.post('/users/:id/extend-subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { days, planName } = req.body;
    const additionalMs = (parseInt(days, 10) || 30) * 86400000;
    const pool = getDbPool();

    if (pool) {
      const uRes = await pool.query('SELECT subscription_expires_at FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length === 0) return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি' });

      const currentExpiry = Number(uRes.rows[0].subscription_expires_at);
      const newExpiry = Math.max(Date.now(), currentExpiry) + additionalMs;

      await pool.query(`
        UPDATE users SET
          subscription_expires_at = $1,
          subscription_status = 'active',
          subscription_plan = COALESCE($2, subscription_plan),
          status = 'active',
          updated_at = NOW()
        WHERE id = $3
      `, [newExpiry, planName, userId]);

      // Activity Log
      await pool.query(`
        INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'log_' + Date.now(),
        req.user?.email || 'admin',
        'EXTEND_SUBSCRIPTION',
        'User',
        userId,
        userId,
        `সাবস্ক্রিপশনের মেয়াদ ${days} দিন বৃদ্ধি করা হয়েছে। নতুন মেয়াদ: ${new Date(newExpiry).toLocaleDateString('bn-BD')}`,
        Date.now(),
      ]);
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        const cur = u.subscriptionExpiresAt || Date.now();
        u.subscriptionExpiresAt = Math.max(Date.now(), cur) + additionalMs;
        u.subscriptionStatus = 'active';
        u.status = 'active';
        if (planName) u.subscriptionPlan = planName;
      }
    }

    return res.json({ message: `✅ সাবস্ক্রিপশনের মেয়াদ সফলভাবে ${days} দিন বাড়ানো হয়েছে!` });
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
    const { adminNotes } = req.body;
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
      }
    }

    return res.json({ message: '✅ পেমেন্ট রিকোয়েস্ট বাতিল করা হয়েছে এবং গ্রাহককে নোটিফাই করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8. GET & PUT /api/admin/payment-settings
 */
router.get('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
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
    return res.json({ settings: {} });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/payment-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = req.body;
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
    let masterPin = '1234';

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
          if (cfg?.masterPin) masterPin = String(cfg.masterPin);
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
      if (inMemoryStore.system_config['super_admin_security']?.masterPin) {
        masterPin = String(inMemoryStore.system_config['super_admin_security'].masterPin);
      }
    }

    return res.json({
      id: superAdminUser.id,
      name: superAdminUser.name,
      email: superAdminUser.email,
      phone: superAdminUser.phone,
      role: superAdminUser.role,
      masterPin,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/super-admin/credentials', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, password, masterPin } = req.body;
    const pool = getDbPool();

    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length >= 6) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPhone = phone ? phone.trim() : undefined;
    const cleanName = name ? name.trim() : undefined;
    const cleanPin = masterPin ? String(masterPin).trim() : undefined;
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
        const hashToSave = passwordHash || (await bcrypt.hash('admin123', 10));
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

      // 2. Save master pin or credentials in system_config
      const secData: any = {
        updatedAt: now,
      };
      if (cleanEmail) secData.email = cleanEmail;
      if (cleanPhone) secData.phone = cleanPhone;
      if (cleanName) secData.name = cleanName;
      if (cleanPin) secData.masterPin = cleanPin;

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
          password_hash: passwordHash || (await bcrypt.hash('admin123', 10)),
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
        masterPin: cleanPin,
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
    return res.json({
      provider: config.provider,
      senderId: config.senderId || '',
      username: config.username || '',
      customUrl: config.customUrl || '',
      isEnabled: config.isEnabled,
      hasApiKey: Boolean(config.apiKey),
      maskedApiKey: config.apiKey
        ? config.apiKey.substring(0, 4) + '****' + config.apiKey.substring(config.apiKey.length - 4)
        : '',
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
      provider: provider || current.provider || 'greenweb',
      apiKey: apiKey !== undefined ? apiKey : current.apiKey,
      senderId: senderId !== undefined ? senderId : current.senderId,
      username: username !== undefined ? username : current.username,
      customUrl: customUrl !== undefined ? customUrl : current.customUrl,
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
    };

    await saveSmsGatewaySettings(newSettings);
    return res.json({ message: '✅ SMS গেটওয়ে সেটিংস সংরক্ষিত হয়েছে', settings: newSettings });
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

export default router;
