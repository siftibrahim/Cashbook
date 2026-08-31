import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser, optionalAuth } from '../authMiddleware';

const router = Router();

/**
 * 1. GET /api/notifications - User's notifications (Personal + Broadcast with Strict ID Targeting)
 */
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userEmail = req.user?.email || '';
    const pool = getDbPool();
    const now = Date.now();

    if (!userId) {
      return res.status(401).json({ error: 'ব্যবহারকারী সনাক্তকরণ ব্যর্থ হয়েছে' });
    }

    const isAdmin = userRole === 'super_admin' || userRole === 'staff' || userRole === 'manager' || userEmail === 'siftibrahim@gmail.com' || userEmail === 'admin@twing.com';

    if (pool) {
      // 1. Fetch user profile for accurate active/expired status and phone matching
      let userPhone = '';
      let isActive = true;
      let isExpired = false;

      try {
        const uRes = await pool.query(
          'SELECT phone, email, subscription_expires_at, subscription_status, subscription_plan FROM users WHERE id = $1',
          [userId]
        );
        if (uRes.rows.length > 0) {
          const uRow = uRes.rows[0];
          userPhone = uRow.phone || '';
          const exp = Number(uRow.subscription_expires_at || 0);
          const plan = uRow.subscription_plan || 'free';
          
          if (plan === 'lifetime') {
            isActive = true;
            isExpired = false;
          } else if (exp > 0) {
            isExpired = exp < now;
            isActive = exp >= now;
          } else {
            isActive = true;
            isExpired = false;
          }

          // Check if subscription expires soon (<= 3 days) and send targeted warning if needed
          const msLeft = exp - now;
          const daysLeft = Math.ceil(msLeft / 86400000);
          if (msLeft > 0 && daysLeft <= 3 && plan !== 'lifetime' && plan !== 'free') {
            const lastWarn = await pool.query(
              "SELECT id FROM notifications WHERE target_user_id = $1 AND type = 'subscription_warning' AND created_at > $2",
              [userId, now - 20 * 3600000]
            );
            if (lastWarn.rows.length === 0) {
              const warnId = 'notif_exp_' + now;
              await pool.query(`
                INSERT INTO notifications (id, title, message, type, target, target_user_id, priority, is_read, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              `, [
                warnId,
                '⚠️ সাবস্ক্রিপশন মেয়াদ শেষ হচ্ছে!',
                `আপনার সাবস্ক্রিপশনের মেয়াদ আর মাত্র ${daysLeft === 1 ? '১ দিন' : daysLeft + ' দিন'} বাকি রয়েছে! নিরবচ্ছিন্ন সেবা অব্যাহত রাখতে এখনই প্যাকেজ রিনিউ করুন।`,
                'subscription_warning',
                'specific',
                userId,
                'high',
                false,
                now
              ]);
            }
          }
        }
      } catch (checkErr) {
        // Non-blocking
      }

      // 2. Query only notifications meant for THIS user ID, global broadcast, or matching status
      const result = await pool.query(
        `SELECT n.*,
                COALESCE(r.read_at IS NOT NULL OR (n.target = 'specific' AND n.is_read = TRUE), FALSE) as is_read_by_user
         FROM notifications n
         LEFT JOIN user_notification_reads r ON r.notification_id = n.id AND r.user_id = $1
         LEFT JOIN user_notification_dismissed d ON d.notification_id = n.id AND d.user_id = $1
         WHERE d.notification_id IS NULL AND (
           (n.target = 'all')
           OR (n.target = 'specific' AND (n.target_user_id = $1 OR (n.target_user_id = $2 AND $2 != '') OR (n.target_user_id = $3 AND $3 != '')))
           OR (n.target = 'active' AND $4 = TRUE)
           OR (n.target = 'expired' AND $5 = TRUE)
           OR (n.target = 'admin' AND $6 = TRUE)
         )
         ORDER BY n.created_at DESC 
         LIMIT 100`,
        [userId, userPhone, userEmail, isActive, isExpired, isAdmin]
      );

      const notifications = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || 'general',
        target: row.target || 'all',
        targetUserId: row.target_user_id || undefined,
        targetUserName: row.target_user_name || undefined,
        priority: row.priority || 'normal',
        isRead: Boolean(row.is_read_by_user),
        createdAt: Number(row.created_at),
      }));

      return res.json({ notifications });
    } else {
      // In-memory fallback with strict ID matching
      const list = (inMemoryStore.notifications || [])
        .filter(n => {
          if (n.target === 'all') return true;
          if (n.target === 'specific') return n.targetUserId === userId || n.targetUserId === userEmail;
          if (n.target === 'admin') return isAdmin;
          return false;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ notifications: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 1.1 GET /api/notifications/admin-all - All Sent Notifications for Admin Panel History
 */
router.get('/admin-all', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email || '';
    const isAdmin = userRole === 'super_admin' || userRole === 'staff' || userRole === 'manager' || userEmail === 'siftibrahim@gmail.com' || userEmail === 'admin@twing.com';

    if (!isAdmin) {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন বা অনুমোদিত স্টাফদের জন্য প্রযোজ্য' });
    }

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        `SELECT * FROM notifications 
         ORDER BY created_at DESC 
         LIMIT 200`
      );
      const notifications = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || 'general',
        target: row.target || 'all',
        targetUserId: row.target_user_id || undefined,
        targetUserName: row.target_user_name || undefined,
        priority: row.priority || 'normal',
        isRead: Boolean(row.is_read),
        createdAt: Number(row.created_at),
      }));
      return res.json({ notifications });
    } else {
      const list = (inMemoryStore.notifications || []).sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ notifications: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 2. POST /api/notifications - Create / Broadcast Notification (Admin or Staff)
 */
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type, target, targetUserId, targetUserName, priority } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'শিরোনাম ও বার্তা আবশ্যক' });
    }

    const notifId = req.body.id || 'notif_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const notifType = type || 'general';
    const notifTarget = target || 'all';
    const notifPriority = priority || 'normal';
    const pool = getDbPool();

    let resolvedUserName = targetUserName || null;
    let resolvedUserId = (notifTarget === 'specific' && targetUserId) ? targetUserId : null;

    if (pool) {
      // If sending to a specific user, ensure user name is resolved for admin view
      if (notifTarget === 'specific' && resolvedUserId && !resolvedUserName) {
        try {
          const uRes = await pool.query('SELECT name, shop_name, phone FROM users WHERE id = $1 OR phone = $1 OR email = $1', [resolvedUserId]);
          if (uRes.rows.length > 0) {
            resolvedUserName = uRes.rows[0].name || uRes.rows[0].shop_name || uRes.rows[0].phone;
          }
        } catch (uErr) {
          // ignore
        }
      }

      await pool.query(
        `INSERT INTO notifications (
          id, title, message, type, target, target_user_id, target_user_name, priority, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          type = EXCLUDED.type,
          target = EXCLUDED.target,
          target_user_id = EXCLUDED.target_user_id,
          target_user_name = EXCLUDED.target_user_name,
          priority = EXCLUDED.priority,
          created_at = EXCLUDED.created_at
        `,
        [notifId, title.trim(), message.trim(), notifType, notifTarget, resolvedUserId, resolvedUserName, notifPriority, false, now]
      );
    }

    if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
    inMemoryStore.notifications = inMemoryStore.notifications.filter(n => n.id !== notifId);
    inMemoryStore.notifications.unshift({
      id: notifId,
      title: title.trim(),
      message: message.trim(),
      type: notifType,
      target: notifTarget,
      targetUserId: resolvedUserId || undefined,
      targetUserName: resolvedUserName || undefined,
      priority: notifPriority,
      isRead: false,
      createdAt: now,
    });

    return res.status(201).json({
      message: '✅ নোটিফিকেশন সফলভাবে তৈরি ও পাঠানো হয়েছে',
      notification: {
        id: notifId,
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        target: notifTarget,
        targetUserId: resolvedUserId || undefined,
        targetUserName: resolvedUserName || undefined,
        priority: notifPriority,
        isRead: false,
        createdAt: now,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. PATCH /api/notifications/:id/read - Mark single notification as read for current user
 */
router.patch('/:id/read', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifId = req.params.id;
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    if (pool && userId) {
      // Record user's read status
      await pool.query(
        `INSERT INTO user_notification_reads (user_id, notification_id, read_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, notification_id) DO NOTHING`,
        [userId, notifId, now]
      );

      // If targeted notification, also mark the notification row
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND target_user_id = $2',
        [notifId, userId]
      );
    }

    if (inMemoryStore.notifications) {
      const found = inMemoryStore.notifications.find(n => n.id === notifId);
      if (found) found.isRead = true;
    }

    return res.json({ message: 'নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. POST /api/notifications/read-all - Mark all notifications as read for current user
 */
router.post('/read-all', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    if (pool && userId) {
      // Mark all visible notifications as read in user_notification_reads
      await pool.query(
        `INSERT INTO user_notification_reads (user_id, notification_id, read_at)
         SELECT $1, n.id, $2
         FROM notifications n
         WHERE n.target = 'all' OR n.target_user_id = $1
         ON CONFLICT (user_id, notification_id) DO NOTHING`,
        [userId, now]
      );

      // Update specific ones
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE target_user_id = $1',
        [userId]
      );
    }

    if (inMemoryStore.notifications) {
      inMemoryStore.notifications.forEach(n => {
        if (n.target === 'all' || n.targetUserId === userId) {
          n.isRead = true;
        }
      });
    }

    return res.json({ message: 'সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 5. DELETE /api/notifications/:id - Delete / Dismiss a notification
 */
router.delete('/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifId = req.params.id;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'super_admin' || userRole === 'staff' || userRole === 'manager';
    const pool = getDbPool();
    const now = Date.now();

    if (pool && userId) {
      if (isAdmin) {
        // Admin deletes completely
        await pool.query('DELETE FROM notifications WHERE id = $1', [notifId]);
        await pool.query('DELETE FROM user_notification_reads WHERE notification_id = $1', [notifId]);
        await pool.query('DELETE FROM user_notification_dismissed WHERE notification_id = $1', [notifId]);
      } else {
        // Regular user dismisses from their view
        await pool.query(
          `INSERT INTO user_notification_dismissed (user_id, notification_id, dismissed_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, notification_id) DO NOTHING`,
          [userId, notifId, now]
        );
        // If it was their personal notification, delete it
        await pool.query(
          'DELETE FROM notifications WHERE id = $1 AND target_user_id = $2',
          [notifId, userId]
        );
      }
    }

    if (inMemoryStore.notifications) {
      inMemoryStore.notifications = inMemoryStore.notifications.filter(n => n.id !== notifId);
    }

    return res.json({ message: '✅ নোটিফিকেশন মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6. GET /api/notifications/announcements - Active Announcements (Public)
 */
router.get('/announcements', async (req, res) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM announcements WHERE is_active = TRUE ORDER BY created_at DESC'
      );
      const announcements = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        priority: row.priority,
        isActive: row.is_active,
        showAsPopup: row.show_as_popup,
        actionButtonText: row.action_button_text,
        actionButtonUrl: row.action_button_url,
        expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
        createdAt: Number(row.created_at),
      }));
      return res.json({ announcements });
    } else {
      const list = inMemoryStore.announcements.filter(a => a.isActive !== false);
      return res.json({ announcements: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 7. POST /api/notifications/announcements - Create/Update Announcement
 */
router.post('/announcements', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ann = req.body;
    if (!ann.title || !ann.message) {
      return res.status(400).json({ error: 'ঘোষণার শিরোনাম ও বার্তা আবশ্যক' });
    }

    const annId = ann.id || 'ann_' + Date.now().toString(36);
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO announcements (
          id, title, message, priority, is_active, show_as_popup,
          action_button_text, action_button_url, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          priority = EXCLUDED.priority,
          is_active = EXCLUDED.is_active,
          show_as_popup = EXCLUDED.show_as_popup,
          action_button_text = EXCLUDED.action_button_text,
          action_button_url = EXCLUDED.action_button_url,
          expires_at = EXCLUDED.expires_at
      `, [
        annId, ann.title, ann.message, ann.priority || 'info', ann.isActive !== false,
        Boolean(ann.showAsPopup), ann.actionButtonText || '', ann.actionButtonUrl || '',
        ann.expiresAt ? Number(ann.expiresAt) : null, now
      ]);
    }

    const existingIdx = inMemoryStore.announcements.findIndex(a => a.id === annId);
    const annObj = {
      id: annId,
      title: ann.title,
      message: ann.message,
      priority: ann.priority || 'info',
      isActive: ann.isActive !== false,
      showAsPopup: Boolean(ann.showAsPopup),
      actionButtonText: ann.actionButtonText,
      actionButtonUrl: ann.actionButtonUrl,
      expiresAt: ann.expiresAt,
      createdAt: now,
    };
    if (existingIdx >= 0) {
      inMemoryStore.announcements[existingIdx] = annObj;
    } else {
      inMemoryStore.announcements.unshift(annObj);
    }

    return res.status(201).json({ message: '✅ ঘোষণা সংরক্ষিত হয়েছে', announcement: annObj });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8. DELETE /api/notifications/announcements/:id - Delete Announcement
 */
router.delete('/announcements/:id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const annId = req.params.id;
    const pool = getDbPool();

    if (pool) {
      await pool.query('DELETE FROM announcements WHERE id = $1', [annId]);
    }
    inMemoryStore.announcements = inMemoryStore.announcements.filter(a => a.id !== annId);

    return res.json({ message: '✅ ঘোষণা মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. GET /api/notifications/app-update - Current App Version & Update Status (Public)
 */
router.get('/app-update', async (req, res) => {
  try {
    const pool = getDbPool();
    if (pool) {
      const result = await pool.query("SELECT data FROM system_config WHERE id = 'app_update_config'");
      if (result.rows.length > 0) {
        return res.json({ config: result.rows[0].data });
      }
    } else if (inMemoryStore.system_config['app_update_config']) {
      return res.json({ config: inMemoryStore.system_config['app_update_config'] });
    }

    return res.json({
      config: {
        id: 'app_update_config',
        versionName: '2.5.0',
        versionCode: 25,
        minRequiredVersion: '2.0.0',
        isForceUpdate: false,
        updateTitle: '✨ নতুন আপডেট উপলব্ধ (v2.5.0)',
        releaseNotes: '• দ্রুত পিওএস প্রিন্টিং\n• উন্নত ক্লাউড ব্যাকআপ ও নোটিফিকেশন সিস্টেম',
        downloadUrl: 'https://play.google.com/store',
        updatedAt: Date.now(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10. POST /api/notifications/app-update - Save App Update Config
 */
router.post('/app-update', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = req.body;
    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO system_config (id, data, updated_at, updated_by)
        VALUES ('app_update_config', $1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `, [JSON.stringify(config), now, req.user?.email || 'admin']);
    } else {
      inMemoryStore.system_config['app_update_config'] = config;
    }

    return res.json({ message: '✅ অ্যাপ আপডেট কনফিগারেশন সংরক্ষিত হয়েছে', config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
