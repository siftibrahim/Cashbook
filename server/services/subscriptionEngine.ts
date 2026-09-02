import { getDbPool, inMemoryStore } from '../db';

export interface SubscriptionStatusResult {
  subscriptionExpiresAt: number;
  subscriptionPlan: string;
  subscriptionStatus: 'FREE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  msRemaining: number;
  canRenew: boolean;
  isTrial: boolean;
  eligibleForEarlyBonus: boolean;
  hasPendingPayment: boolean;
  pendingPayment: any | null;
  status: 'FREE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
}

export class SubscriptionEngine {
  private static intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize background engine to run periodic expiry & notification checks
   */
  public static start() {
    if (this.intervalTimer) return;
    console.log('[SUBSCRIPTION ENGINE] Initialized & background monitor active');
    // Run immediate check
    this.runEngineCycle().catch(err => console.error('[SUBSCRIPTION ENGINE] Error in cycle:', err));
    // Run every 10 minutes
    this.intervalTimer = setInterval(() => {
      this.runEngineCycle().catch(err => console.error('[SUBSCRIPTION ENGINE] Error in cycle:', err));
    }, 10 * 60 * 1000);
  }

  /**
   * Mathematically calculates and reconciles a specific user's subscription:
   * 1. Registration Trial: dynamic days from system_config trialConfig (default 14 days)
   * 2. Every Approved Payment: adds exact package days + bonus days
   * 3. Total validity is mathematically chained and saved to database.
   */
  public static async recalculateAndSyncUserSubscription(userId: string): Promise<{
    subscriptionExpiresAt: number;
    subscriptionPlan: string;
    subscriptionStatus: string;
    totalApprovedDays: number;
  }> {
    const pool = getDbPool();
    const now = Date.now();

    // Fetch dynamic trial configuration
    let isTrialEnabled = true;
    let trialDays = 14;
    let defaultTrialPlanName = 'ফ্রি ট্রায়াল (১৪ দিন)';

    if (pool) {
      try {
        const cfgRes = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings' LIMIT 1");
        if (cfgRes.rows.length > 0 && cfgRes.rows[0].data) {
          const cfg = typeof cfgRes.rows[0].data === 'string' ? JSON.parse(cfgRes.rows[0].data) : cfgRes.rows[0].data;
          if (cfg?.trialConfig) {
            isTrialEnabled = cfg.trialConfig.isTrialEnabled !== false;
            trialDays = isTrialEnabled ? (parseInt(cfg.trialConfig.trialDays, 10) || 14) : 0;
            defaultTrialPlanName = isTrialEnabled
              ? (cfg.trialConfig.trialPlanName || `ফ্রি ট্রায়াল (${trialDays} দিন)`)
              : 'ফ্রি একাউন্ট (সাবস্ক্রিপশন প্রয়োজন)';
          }
        }
      } catch (e) {
        console.warn('Error reading trial config:', e);
      }

      const uRes = await pool.query(
        'SELECT id, name, role, registered_at, subscription_plan, subscription_status, subscription_expires_at FROM users WHERE id = $1',
        [userId]
      );
      if (uRes.rows.length === 0) {
        return {
          subscriptionExpiresAt: isTrialEnabled ? (now + trialDays * 86400000) : (now - 1000),
          subscriptionPlan: defaultTrialPlanName,
          subscriptionStatus: isTrialEnabled ? 'trial' : 'expired',
          totalApprovedDays: 0,
        };
      }

      const u = uRes.rows[0];
      if (u.role === 'super_admin') {
        return {
          subscriptionExpiresAt: now + 3650 * 86400000,
          subscriptionPlan: 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
          subscriptionStatus: 'active',
          totalApprovedDays: 3650,
        };
      }

      const regAt = Number(u.registered_at) || (now - (isTrialEnabled ? trialDays : 0) * 86400000);
      let currentChainExpiry = isTrialEnabled ? (regAt + trialDays * 86400000) : regAt;
      let latestPlanName = defaultTrialPlanName;
      let totalApprovedDays = 0;

      // Fetch all approved payments for this user strictly
      const pRes = await pool.query(
        "SELECT * FROM payments WHERE user_id = $1 AND status = 'approved' ORDER BY approved_at ASC, created_at ASC",
        [userId]
      );

      for (const p of pRes.rows) {
        const payTime = Number(p.approved_at || p.created_at) || now;
        const amt = parseFloat(p.amount) || 0;
        
        let baseDays = parseInt(p.duration_days, 10);
        if (!baseDays || baseDays <= 0 || (amt === 50 && baseDays !== 30)) {
          if (amt === 50) baseDays = 30;
          else if (amt === 100) baseDays = 60;
          else if (amt === 200) baseDays = 120;
          else baseDays = baseDays || 30;
        }

        const bonusDays = parseInt(p.bonus_days, 10) || 0;
        const totalDays = baseDays + bonusDays;
        totalApprovedDays += totalDays;
        const durMs = totalDays * 86400000;

        if (payTime > currentChainExpiry) {
          // If already expired at approval time, start new validity from approval
          currentChainExpiry = payTime + durMs;
        } else {
          // If currently active / in trial, append days seamlessly
          currentChainExpiry = currentChainExpiry + durMs;
        }

        if (p.plan_name && !p.plan_name.includes('ট্রায়াল') && !p.plan_name.includes('trial')) {
          latestPlanName = p.plan_name;
        } else {
          if (amt === 50) latestPlanName = '১ মাসের স্টার্টার প্যাক';
          else if (amt === 100) latestPlanName = '২ মাসের জনপ্রিয় প্যাক';
          else if (amt === 200) latestPlanName = '৪ মাসের সেভিংস প্যাক';
          else latestPlanName = 'প্রো সাবস্ক্রিপশন';
        }
      }

      // Respect admin manual assignment if it set a higher expiry or custom plan
      const existingUserExpiry = Number(u.subscription_expires_at) || 0;
      const finalExpiry = Math.max(currentChainExpiry, existingUserExpiry);
      if (u.subscription_plan && !u.subscription_plan.includes('ট্রায়াল') && (!latestPlanName || latestPlanName === defaultTrialPlanName)) {
        latestPlanName = u.subscription_plan;
      }

      const isExpired = finalExpiry < now;
      const isTrial = totalApprovedDays === 0 && finalExpiry <= (regAt + (isTrialEnabled ? trialDays : 0) * 86400000 + 1000);
      const computedStatus = isExpired
        ? 'expired'
        : (isTrial ? (isTrialEnabled ? 'trial' : 'expired') : 'active');

      await pool.query(
        `UPDATE users SET
          subscription_expires_at = $1,
          subscription_plan = $2,
          subscription_status = $3
        WHERE id = $4`,
        [finalExpiry, latestPlanName, computedStatus, userId]
      );

      await pool.query(
        `UPDATE store_profiles SET
          subscription_expires_at = $1,
          subscription_plan = $2
        WHERE user_id = $3`,
        [finalExpiry, latestPlanName, userId]
      ).catch(() => {});

      return {
        subscriptionExpiresAt: finalExpiry,
        subscriptionPlan: latestPlanName,
        subscriptionStatus: computedStatus,
        totalApprovedDays,
      };
    } else {
      // In-memory fallback
      if (inMemoryStore.system_config['system_payment_settings']?.trialConfig) {
        const cfg = inMemoryStore.system_config['system_payment_settings'].trialConfig;
        isTrialEnabled = cfg.isTrialEnabled !== false;
        trialDays = isTrialEnabled ? (parseInt(cfg.trialDays, 10) || 14) : 0;
        defaultTrialPlanName = isTrialEnabled
          ? (cfg.trialPlanName || `ফ্রি ট্রায়াল (${trialDays} দিন)`)
          : 'ফ্রি একাউন্ট (সাবস্ক্রিপশন প্রয়োজন)';
      }

      const u = inMemoryStore.users.find(x => x.id === userId);
      if (!u) {
        return {
          subscriptionExpiresAt: isTrialEnabled ? (now + trialDays * 86400000) : (now - 1000),
          subscriptionPlan: defaultTrialPlanName,
          subscriptionStatus: isTrialEnabled ? 'trial' : 'expired',
          totalApprovedDays: 0,
        };
      }

      if (u.role === 'super_admin') {
        return {
          subscriptionExpiresAt: now + 3650 * 86400000,
          subscriptionPlan: 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
          subscriptionStatus: 'active',
          totalApprovedDays: 3650,
        };
      }

      const regAt = Number(u.registeredAt || u.registered_at) || (now - (isTrialEnabled ? trialDays : 0) * 86400000);
      let currentChainExpiry = isTrialEnabled ? (regAt + trialDays * 86400000) : regAt;
      let latestPlanName = defaultTrialPlanName;
      let totalApprovedDays = 0;

      const userPayments = (inMemoryStore.payments || [])
        .filter(p => p.userId === userId && p.status === 'approved')
        .sort((a, b) => Number(a.approvedAt || a.createdAt) - Number(b.approvedAt || b.createdAt));

      for (const p of userPayments) {
        const payTime = Number(p.approvedAt || p.createdAt) || now;
        const amt = parseFloat(p.amount) || 0;
        let baseDays = parseInt(p.durationDays, 10);
        if (!baseDays || baseDays <= 0 || (amt === 50 && baseDays !== 30)) {
          if (amt === 50) baseDays = 30;
          else if (amt === 100) baseDays = 60;
          else if (amt === 200) baseDays = 120;
          else baseDays = baseDays || 30;
        }

        const bonusDays = parseInt(p.bonusDays || p.bonus_days, 10) || 0;
        const totalDays = baseDays + bonusDays;
        totalApprovedDays += totalDays;
        const durMs = totalDays * 86400000;

        if (payTime > currentChainExpiry) {
          currentChainExpiry = payTime + durMs;
        } else {
          currentChainExpiry = currentChainExpiry + durMs;
        }

        if (p.planName && !p.planName.includes('ট্রায়াল') && !p.planName.includes('trial')) {
          latestPlanName = p.planName;
        } else {
          if (amt === 50) latestPlanName = '১ মাসের স্টার্টার প্যাক';
          else if (amt === 100) latestPlanName = '২ মাসের জনপ্রিয় প্যাক';
          else if (amt === 200) latestPlanName = '৪ মাসের সেভিংস প্যাক';
          else latestPlanName = 'প্রো সাবস্ক্রিপশন';
        }
      }

      const existingUserExpiry = Number(u.subscriptionExpiresAt || u.subscription_expires_at) || 0;
      const finalExpiry = Math.max(currentChainExpiry, existingUserExpiry);
      const existingPlan = u.subscriptionPlan || u.subscription_plan;
      if (existingPlan && !existingPlan.includes('ট্রায়াল') && (!latestPlanName || latestPlanName === defaultTrialPlanName)) {
        latestPlanName = existingPlan;
      }

      const isExpired = finalExpiry < now;
      const isTrial = totalApprovedDays === 0 && finalExpiry <= (regAt + (isTrialEnabled ? trialDays : 0) * 86400000 + 1000);
      const computedStatus = isExpired
        ? 'expired'
        : (isTrial ? (isTrialEnabled ? 'trial' : 'expired') : 'active');

      u.subscriptionExpiresAt = finalExpiry;
      u.subscription_expires_at = finalExpiry;
      u.subscriptionPlan = latestPlanName;
      u.subscription_plan = latestPlanName;
      u.subscriptionStatus = computedStatus;
      u.subscription_status = computedStatus;

      return {
        subscriptionExpiresAt: finalExpiry,
        subscriptionPlan: latestPlanName,
        subscriptionStatus: computedStatus,
        totalApprovedDays,
      };
    }
  }

  /**
   * Get dynamic and live subscription status for a specific user
   */
  public static async getUserStatus(userId: string): Promise<SubscriptionStatusResult> {
    const now = Date.now();

    // 1. Recalculate & synchronize subscription based on legitimate registration trial & approved payments
    const synced = await this.recalculateAndSyncUserSubscription(userId);
    const subscriptionExpiresAt = synced.subscriptionExpiresAt;
    const subscriptionPlan = synced.subscriptionPlan;
    const rawStatus = synced.subscriptionStatus.toUpperCase();

    const pool = getDbPool();
    let pendingPayment: any = null;
    let hasPendingPayment = false;

    if (pool) {
      // Check for pending payments strictly for this user
      const pRes = await pool.query(
        "SELECT * FROM payments WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
      if (pRes.rows.length > 0) {
        hasPendingPayment = true;
        const row = pRes.rows[0];
        pendingPayment = {
          id: row.id,
          planId: row.plan_id,
          planName: row.plan_name,
          amount: parseFloat(row.amount) || 0,
          durationDays: row.duration_days,
          bonusDays: row.bonus_days || 0,
          trxId: row.trx_id,
          paymentMethod: row.payment_method,
          senderNumber: row.sender_number || row.sender_phone,
          senderPhone: row.sender_phone,
          submittedAt: Number(row.created_at),
          createdAt: Number(row.created_at),
          status: 'pending',
        };
      }
    } else {
      const p = (inMemoryStore.payments || []).find(x => x.userId === userId && x.status === 'pending');
      if (p) {
        hasPendingPayment = true;
        pendingPayment = p;
      }
    }

    const isExpired = subscriptionExpiresAt < now;
    const msRemaining = Math.max(0, subscriptionExpiresAt - now);
    const daysRemaining = Math.ceil(msRemaining / 86400000);
    const hoursRemaining = Math.floor(msRemaining / 3600000);

    const isTrial =
      synced.totalApprovedDays === 0 &&
      (subscriptionPlan.toLowerCase().includes('trial') ||
        subscriptionPlan.toLowerCase().includes('ট্রায়াল') ||
        subscriptionPlan.toLowerCase().includes('ফ্রি') ||
        rawStatus === 'FREE' ||
        rawStatus === 'TRIAL');

    const eligibleForEarlyBonus = isTrial && !isExpired;

    let computedStatus: 'FREE' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';

    if (rawStatus === 'SUSPENDED') {
      computedStatus = 'SUSPENDED';
    } else if (rawStatus === 'CANCELLED') {
      computedStatus = 'CANCELLED';
    } else if (hasPendingPayment) {
      computedStatus = 'PENDING_VERIFICATION';
    } else if (isExpired) {
      computedStatus = 'EXPIRED';
    } else if (daysRemaining <= 3 && !isTrial) {
      computedStatus = 'EXPIRING_SOON';
    } else if (isTrial) {
      computedStatus = 'FREE';
    } else {
      computedStatus = 'ACTIVE';
    }

    // User can renew if:
    // 1. Subscription has Expired
    // 2. OR 3 days or less remaining (EXPIRING_SOON)
    // 3. OR currently on FREE / Trial
    const canRenew = isExpired || daysRemaining <= 3 || isTrial;

    return {
      subscriptionExpiresAt,
      subscriptionPlan,
      subscriptionStatus: computedStatus,
      isExpired,
      daysRemaining,
      hoursRemaining,
      msRemaining,
      canRenew,
      isTrial,
      eligibleForEarlyBonus,
      hasPendingPayment,
      pendingPayment,
      status: computedStatus,
    };
  }

  /**
   * Run background engine cycle:
   * - Detect expired subscriptions & send single notification
   * - Detect 3-day, 2-day, 1-day reminders & send single notification
   */
  public static async runEngineCycle() {
    const pool = getDbPool();
    const now = Date.now();

    if (!pool) return;

    try {
      // 1. Check for expired users whose status in DB is still active or trial
      const expRes = await pool.query(
        `SELECT id, name, shop_name, subscription_expires_at, subscription_plan, subscription_status 
         FROM users 
         WHERE subscription_expires_at < $1 
           AND subscription_status NOT IN ('expired', 'EXPIRED', 'suspended', 'cancelled')`,
        [now]
      );

      for (const u of expRes.rows) {
        await pool.query(
          "UPDATE users SET subscription_status = 'EXPIRED' WHERE id = $1",
          [u.id]
        );

        // Check if expired notification was already sent in last 48 hours
        const notifCheck = await pool.query(
          "SELECT id FROM notifications WHERE target_user_id = $1 AND type = 'subscription_expired' AND created_at > $2",
          [u.id, now - 48 * 3600000]
        );

        if (notifCheck.rows.length === 0) {
          await this.createUserNotification({
            userId: u.id,
            userName: u.name || u.shop_name,
            title: '❌ সাবস্ক্রিপশন মেয়াদ সমাপ্ত (Subscription Expired)',
            message: 'আপনার সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। অ্যাপের হিসাব, বাকি খাতা ও সকল ফিচার নিরবচ্ছিন্ন ব্যবহার করতে অনুগ্রহ করে রিনিউ করুন।',
            type: 'subscription_expired',
            priority: 'urgent',
          });
        }
      }

      // 2. Check for upcoming expiries (3 days, 2 days, 1 day)
      const upcomingRes = await pool.query(
        `SELECT id, name, shop_name, subscription_expires_at, subscription_plan, subscription_status 
         FROM users 
         WHERE subscription_expires_at >= $1 
           AND subscription_expires_at <= $2 
           AND subscription_status NOT IN ('expired', 'EXPIRED', 'suspended', 'cancelled')`,
        [now, now + 3 * 86400000]
      );

      for (const u of upcomingRes.rows) {
        const msLeft = Number(u.subscription_expires_at) - now;
        const daysLeft = Math.max(1, Math.ceil(msLeft / 86400000));

        // Check if reminder was already sent in the last 20 hours
        const lastNotif = await pool.query(
          "SELECT id FROM notifications WHERE target_user_id = $1 AND type = 'subscription_warning' AND created_at > $2",
          [u.id, now - 20 * 3600000]
        );

        if (lastNotif.rows.length === 0) {
          const daysText = daysLeft === 1 ? '১ দিন' : `${daysLeft} দিন`;
          await this.createUserNotification({
            userId: u.id,
            userName: u.name || u.shop_name,
            title: '⚠️ সাবস্ক্রিপশন মেয়াদ শেষ হচ্ছে!',
            message: `আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ আর মাত্র ${daysText} বাকি রয়েছে। নিরবচ্ছিন্ন সেবা অব্যাহত রাখতে এখনই রিনিউ করুন।`,
            type: 'subscription_warning',
            priority: 'high',
          });
        }
      }
    } catch (err: any) {
      console.error('[SUBSCRIPTION ENGINE] Error in cycle:', err.message);
    }
  }

  /**
   * Helper: Send isolated user-specific notification
   * Ensures STRICT privacy: only target_user_id receives this notification
   */
  public static async createUserNotification(params: {
    userId: string;
    userName?: string;
    title: string;
    message: string;
    type: string;
    priority?: string;
  }) {
    const pool = getDbPool();
    const now = Date.now();
    const notifId = 'notif_sub_' + now + '_' + Math.random().toString(36).substring(2, 6);

    if (pool) {
      await pool.query(
        `INSERT INTO notifications (
          id, title, message, type, target, target_user_id, target_user_name, priority, is_read, scope, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          notifId,
          params.title,
          params.message,
          params.type,
          'specific',
          params.userId,
          params.userName || null,
          params.priority || 'normal',
          false,
          'USER',
          now,
        ]
      );
    } else {
      if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
      inMemoryStore.notifications.unshift({
        id: notifId,
        title: params.title,
        message: params.message,
        type: params.type,
        target: 'specific',
        targetUserId: params.userId,
        targetUserName: params.userName,
        priority: params.priority || 'normal',
        isRead: false,
        scope: 'USER',
        createdAt: now,
      });
    }
  }
}
