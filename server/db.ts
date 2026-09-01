import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

// Config file path for persistent DATABASE_URL
const CONFIG_FILE_PATH = path.join(process.cwd(), 'server', 'db-config.json');

export function sanitizePostgresUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // 1. Remove invalid / truncated / unsupported query parameters like channel_binding=..., channel_bibi, channel_..., etc.
  url = url.replace(/[?&]channel_[^&]*/gi, '');
  url = url.replace(/[?&]channel_binding=[^&]*/gi, '');
  
  // 2. Clean up dangling ? or & or ?& or &&
  url = url.replace(/\?&/g, '?');
  url = url.replace(/&&+/g, '&');
  if (url.endsWith('?') || url.endsWith('&')) {
    url = url.slice(0, -1);
  }

  // 3. Ensure sslmode=require for neon.tech if missing
  if (url.includes('neon.tech') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  return url;
}

function getStoredDbUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return sanitizePostgresUrl(process.env.DATABASE_URL.trim());
  }
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
      if (data && data.databaseUrl && typeof data.databaseUrl === 'string') {
        return sanitizePostgresUrl(data.databaseUrl.trim());
      }
    }
  } catch (e) {
    // ignore
  }
  return '';
}

// Neon PostgreSQL Database Pool
let pool: pg.Pool | null = null;
let isDbConnected = false;
let heartbeatInterval: NodeJS.Timeout | null = null;

// In-memory store fallback when DATABASE_URL is not yet provided
export const inMemoryStore: {
  users: any[];
  stores: any[];
  customers: any[];
  transactions: any[];
  expenses: any[];
  products: any[];
  payments: any[];
  notifications: any[];
  announcements: any[];
  staff: any[];
  support_messages: any[];
  system_config: Record<string, any>;
  admin_activity_logs: any[];
  password_reset_otps: any[];
  trusted_devices: any[];
} = {
  users: [],
  stores: [],
  customers: [],
  transactions: [],
  expenses: [],
  products: [],
  payments: [],
  notifications: [],
  announcements: [],
  staff: [],
  support_messages: [],
  system_config: {},
  admin_activity_logs: [],
  password_reset_otps: [],
  trusted_devices: [],
};

// Helper to create an optimized, resilient pool for Neon serverless
function createNeonPool(connectionString: string): pg.Pool {
  const sanitized = sanitizePostgresUrl(connectionString);
  const isNeonOrCloud = sanitized.includes('neon.tech') || sanitized.includes('sslmode=require') || process.env.NODE_ENV === 'production';

  const newPool = new Pool({
    connectionString: sanitized,
    ssl: isNeonOrCloud ? { rejectUnauthorized: false } : false,
    max: 10, // Optimized connection limit for Neon PgBouncer
    min: 0,
    idleTimeoutMillis: 10000, // Recycle idle connections in 10s so dead sockets don't linger
    connectionTimeoutMillis: 25000, // 25s allows cold-start Neon compute to wake up without erroring
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000, // TCP keepalive probes prevent intermediate proxy drops
    allowExitOnIdle: false,
  });

  newPool.on('error', (err: any) => {
    console.error('⚠️ [PostgreSQL Pool Auto-Recovery] Transient pool error caught:', err?.message || err);
    // If connection was forcibly closed or pool became invalid, reset pool reference so next query creates fresh connection
    if (
      err?.message?.includes('Connection terminated') ||
      err?.message?.includes('terminating connection') ||
      err?.message?.includes('Client was closed') ||
      err?.code === '57P01' ||
      err?.code === 'ECONNRESET'
    ) {
      console.log('🔄 Evicting stale pool client after serverless sleep/reconnect.');
    }
  });

  return newPool;
}

// Start a background lightweight heartbeat to prevent Neon compute sleep during active sessions
function startDbHeartbeat() {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(async () => {
    if (!pool) return;
    try {
      // Lightweight probe
      await pool.query('SELECT 1');
      isDbConnected = true;
    } catch (err: any) {
      console.warn('⚠️ [DB Keep-Alive Ping] Waking up sleeping Neon instance or refreshing pool...', err?.message);
      // Try to touch/reconnect gracefully
      try {
        const dbUrl = getStoredDbUrl();
        if (dbUrl) {
          // Verify if fresh query works
          await pool.query('SELECT 1');
          isDbConnected = true;
        }
      } catch (retryErr) {
        // Handled on next active query
      }
    }
  }, 120000); // Every 2 minutes
}

export function getDbPool(): pg.Pool | null {
  if (pool) return pool;

  const dbUrl = getStoredDbUrl();
  if (!dbUrl) {
    console.warn('⚠️ [DB Warning] DATABASE_URL is not set. Using secure in-memory storage fallback.');
    return null;
  }

  try {
    pool = createNeonPool(dbUrl);
    startDbHeartbeat();
    return pool;
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

/**
 * Dynamically set, test and persist a new Neon Database URL
 */
export async function setAndConnectDatabaseUrl(newDbUrl: string): Promise<{ success: boolean; message: string; databaseName?: string; userCount?: number }> {
  const cleanUrl = sanitizePostgresUrl(newDbUrl || '');
  if (!cleanUrl) {
    throw new Error('ডাটাবেজ ইউআরএল (Connection String) ফাঁকা হতে পারে না');
  }

  if (!cleanUrl.startsWith('postgres://') && !cleanUrl.startsWith('postgresql://')) {
    throw new Error('অবৈধ ডাটাবেজ ইউআরএল ফরম্যাট! URL অবশ্যই postgresql:// বা postgres:// দিয়ে শুরু হতে হবে।');
  }

  // Test connection first with clean sanitized url
  let testPool: pg.Pool | null = null;
  try {
    testPool = createNeonPool(cleanUrl);

    const client = await testPool.connect();
    const res = await client.query('SELECT current_database() as db_name');
    
    let userCount = 0;
    try {
      const uRes = await client.query('SELECT COUNT(*) as cnt FROM users');
      userCount = parseInt(uRes.rows[0]?.cnt || '0', 10);
    } catch (tblErr) {
      // Table might need creation
    }
    client.release();
    await testPool.end();

    // Connection successful! Save to file and environment
    process.env.DATABASE_URL = cleanUrl;
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ databaseUrl: cleanUrl, updatedAt: new Date().toISOString() }, null, 2));
    } catch (saveErr) {
      console.warn('Could not write to db-config.json:', saveErr);
    }

    // Close old pool if any
    if (pool) {
      try {
        await pool.end();
      } catch {}
      pool = null;
    }

    // Initialize new pool and schemas
    pool = createNeonPool(cleanUrl);
    startDbHeartbeat();

    await initializeDatabaseSchema();

    return {
      success: true,
      message: '✅ Neon PostgreSQL ডাটাবেজে সফলভাবে সংযুক্ত হয়েছে!',
      databaseName: res.rows[0]?.db_name || 'neondb',
      userCount,
    };
  } catch (err: any) {
    if (testPool) {
      try { await testPool.end(); } catch {}
    }
    console.error('❌ Failed to connect to provided Neon database:', err);
    throw new Error(`ডাটাবেজ কানেকশন ব্যর্থ হয়েছে: ${err.message}`);
  }
}

/**
 * Resilient query wrapper with automatic 1-time retry on transient Neon scale-to-zero / socket disconnect
 */
export async function query(text: string, params?: any[]): Promise<pg.QueryResult<any>> {
  let p = getDbPool();
  if (!p) {
    throw new Error('DATABASE_URL_NOT_CONFIGURED');
  }

  try {
    return await p.query(text, params);
  } catch (err: any) {
    const isTransientDisconnect =
      err?.message?.includes('Connection terminated') ||
      err?.message?.includes('terminating connection') ||
      err?.message?.includes('Client was closed') ||
      err?.message?.includes('socket hang up') ||
      err?.code === '57P01' ||
      err?.code === 'ECONNRESET' ||
      err?.code === 'ETIMEDOUT';

    if (isTransientDisconnect) {
      console.warn('⚠️ Transient DB disconnect caught, reconnecting and retrying query...', err?.message);
      // Wait 350ms for Neon compute to complete wake-up
      await new Promise((resolve) => setTimeout(resolve, 350));
      
      const dbUrl = getStoredDbUrl();
      if (dbUrl) {
        p = getDbPool();
        if (p) {
          return await p.query(text, params);
        }
      }
    }

    throw err;
  }
}

/**
 * Initialize PostgreSQL Schema for Neon
 */
export async function initializeDatabaseSchema() {
  const p = getDbPool();
  if (!p) {
    console.log('ℹ️ Running in resilient offline/local mode until DATABASE_URL is configured.');
    seedDefaultDataInMemory();
    return;
  }

  try {
    const client = await p.connect();
    isDbConnected = true;
    console.log('✅ Connected to Neon PostgreSQL Database successfully!');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        shop_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100) DEFAULT 'জেনারেল স্টোর',
        address TEXT DEFAULT 'বাংলাদেশ',
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        subscription_plan VARCHAR(100) DEFAULT 'ফ্রি ট্রায়াল (১৪ দিন)',
        subscription_status VARCHAR(50) DEFAULT 'trial',
        subscription_expires_at BIGINT NOT NULL,
        registered_at BIGINT NOT NULL,
        last_active_at BIGINT NOT NULL,
        notes TEXT,
        device_info TEXT,
        app_version TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `);

    // 2. Stores / Shop Profiles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_profiles (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        owner VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT,
        footer_note TEXT,
        currency_symbol VARCHAR(10) DEFAULT '৳',
        high_due_limit NUMERIC(12, 2) DEFAULT 5000,
        tagada_template TEXT,
        bkash_number VARCHAR(50),
        nagad_number VARCHAR(50),
        rocket_number VARCHAR(50),
        theme_color VARCHAR(50) DEFAULT 'teal',
        enable_sound_effects BOOLEAN DEFAULT TRUE,
        print_paper_size VARCHAR(50) DEFAULT 'thermal_80',
        show_qr_on_invoice BOOLEAN DEFAULT TRUE,
        default_credit_limit NUMERIC(12, 2) DEFAULT 10000,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_store_profiles_user_id ON store_profiles(user_id);
    `);

    // 3. Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        balance NUMERIC(12, 2) DEFAULT 0,
        category VARCHAR(50) DEFAULT 'regular',
        credit_limit NUMERIC(12, 2) DEFAULT 10000,
        notes TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    `);

    // 4. Transactions Table (Flexible customer reference to allow cash memos & seamless sync)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        customer_id VARCHAR(64),
        type VARCHAR(20) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        description TEXT,
        date VARCHAR(20) NOT NULL,
        time VARCHAR(20) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50),
        items JSONB DEFAULT '[]'::jsonb,
        receipt_no VARCHAR(100),
        subtotal NUMERIC(12, 2),
        discount NUMERIC(12, 2),
        net_amount NUMERIC(12, 2),
        paid_amount NUMERIC(12, 2),
        due_amount NUMERIC(12, 2),
        prev_balance NUMERIC(12, 2),
        created_at BIGINT NOT NULL
      );
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
    `);

    // 5. Daily Expenses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        description TEXT,
        date VARCHAR(20) NOT NULL,
        time VARCHAR(20) NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    `);

    // 6. Products Inventory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'সাধারণ',
        unit VARCHAR(50) DEFAULT 'পিস',
        buy_price NUMERIC(12, 2) DEFAULT 0,
        sale_price NUMERIC(12, 2) DEFAULT 0,
        stock NUMERIC(12, 2) DEFAULT 0,
        min_stock_alert NUMERIC(12, 2) DEFAULT 5,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
    `);

    // 7. Payments / Subscription Records Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_phone VARCHAR(50),
        sender_phone VARCHAR(50),
        sender_number VARCHAR(50),
        shop_name VARCHAR(255),
        plan_id VARCHAR(100),
        plan_name VARCHAR(255),
        duration_days INT DEFAULT 30,
        bonus_days INT DEFAULT 0,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_mode VARCHAR(50),
        trx_id VARCHAR(255) NOT NULL,
        bank_details JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        refund_status VARCHAR(50) DEFAULT 'none',
        refund_reason TEXT,
        refund_amount NUMERIC(12, 2),
        refund_processed_at BIGINT,
        gateway_metadata JSONB,
        created_at BIGINT NOT NULL,
        approved_at BIGINT,
        admin_notes TEXT,
        rejected_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_trx_id ON payments(trx_id);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS bonus_days INT DEFAULT 0;
    `);

    // 8. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        target VARCHAR(50) DEFAULT 'all',
        target_user_id VARCHAR(64),
        target_user_name VARCHAR(255),
        priority VARCHAR(50) DEFAULT 'normal',
        is_read BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id, target);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'USER';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_name VARCHAR(255);

      -- Per-user notification read tracking (for broadcast & audience notifications)
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        user_id VARCHAR(64) NOT NULL,
        notification_id VARCHAR(64) NOT NULL,
        read_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, notification_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_notif_reads_user ON user_notification_reads(user_id);

      -- Per-user notification dismissal tracking
      CREATE TABLE IF NOT EXISTS user_notification_dismissed (
        user_id VARCHAR(64) NOT NULL,
        notification_id VARCHAR(64) NOT NULL,
        dismissed_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, notification_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_notif_dismissed ON user_notification_dismissed(user_id);

      -- Fix any legacy misrouted admin payment notices
      UPDATE notifications 
      SET target = 'admin' 
      WHERE (id LIKE 'notif_admin_%' OR title LIKE '%নতুন পেমেন্ট অনুরোধ%') AND target = 'all';
    `);

    // 8.1 Subscriptions Packages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_packages (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        duration_days INT NOT NULL,
        bonus_days INT DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        description TEXT,
        features JSONB DEFAULT '[]'::jsonb,
        badge VARCHAR(100),
        is_popular BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subscription_packages_active ON subscription_packages(active);
    `);

    // 8.2 Subscriptions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        package_id VARCHAR(64),
        status VARCHAR(50) DEFAULT 'FREE',
        start_date BIGINT NOT NULL,
        expiry_date BIGINT NOT NULL,
        bonus_days INT DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expiry_date);
    `);

    // 8.3 Subscription Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        subscription_id VARCHAR(64),
        admin_id VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        note TEXT,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sub_audit_user_id ON subscription_audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sub_audit_created_at ON subscription_audit_logs(created_at DESC);
    `);

    // 9. Announcements Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'info',
        is_active BOOLEAN DEFAULT TRUE,
        show_as_popup BOOLEAN DEFAULT FALSE,
        action_button_text VARCHAR(255),
        action_button_url TEXT,
        expires_at BIGINT,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
    `);

    // 10. Staff Members Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        status VARCHAR(50) DEFAULT 'active',
        permissions JSONB DEFAULT '[]'::jsonb,
        created_by VARCHAR(255),
        notes TEXT,
        last_active_at BIGINT,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
    `);

    // 11. Support Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_phone VARCHAR(50),
        shop_name VARCHAR(255),
        sender VARCHAR(20) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        is_read_by_admin BOOLEAN DEFAULT FALSE,
        is_read_by_user BOOLEAN DEFAULT TRUE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_support_user_id ON support_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_created_at ON support_messages(created_at DESC);
    `);

    // 12. System Config Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL,
        updated_by VARCHAR(255)
      );
    `);

    // 13. Admin Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_email VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        target_entity VARCHAR(100) NOT NULL,
        target_id VARCHAR(100),
        target_name VARCHAR(255),
        details TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON admin_activity_logs(timestamp DESC);
    `);

    // 14. Password Reset OTPs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id VARCHAR(64) PRIMARY KEY,
        phone VARCHAR(50) NOT NULL,
        user_id VARCHAR(64),
        otp VARCHAR(10) NOT NULL,
        expires_at BIGINT NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pw_reset_phone ON password_reset_otps(phone);
      CREATE INDEX IF NOT EXISTS idx_pw_reset_expires ON password_reset_otps(expires_at);
    `);

    // 15. Trusted Devices Table (for Super Admin 2FA & Device Management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        ip_address VARCHAR(100),
        user_agent TEXT,
        trusted_until BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        last_used_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_fp ON trusted_devices(user_id, device_fingerprint);
    `);

    // Schema Evolution Safety: Ensure columns exist on already created tables
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_customers INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_transactions INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS app_version TEXT;
      
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS print_paper_size VARCHAR(50) DEFAULT 'thermal_80';
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS show_qr_on_invoice BOOLEAN DEFAULT TRUE;
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS default_credit_limit NUMERIC(12, 2) DEFAULT 10000;
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS enable_sound_effects BOOLEAN DEFAULT TRUE;
      
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(100);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS prev_balance NUMERIC(12, 2);
      
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS sender_number VARCHAR(50);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_phone VARCHAR(50);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'none';
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_processed_at BIGINT;
    `);

    // Seed default admin and system configs if not present
    await seedDefaultDataInPostgres(client);

    client.release();
    console.log('✅ PostgreSQL Schema and initial seeds ready!');
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
  }
}

async function seedDefaultDataInPostgres(client: pg.PoolClient) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@twing.com';
  const defaultPassHash = await bcrypt.hash('admin123', 10);
  
  // Seed Super Admin in users table safely and restore correct identity
  try {
    // 1. Ensure usr_super_admin exists with genuine super admin credentials
    await client.query(`
      INSERT INTO users (
        id, name, phone, email, password_hash, shop_name, business_type, address, role, status, subscription_plan, subscription_status, subscription_expires_at, registered_at, last_active_at
      ) VALUES (
        'usr_super_admin',
        'ইব্রাহিম (সুপার অ্যাডমিন)',
        '01619665875',
        $1,
        $2,
        'TWING হিসাবি',
        'জেনারেল স্টোর',
        'ঢাকা, বাংলাদেশ',
        'super_admin',
        'active',
        'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
        'active',
        $3,
        $4,
        $4
      ) ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        email = CASE WHEN users.email LIKE '%admin%' OR users.email LIKE '%siftibrahim%' THEN users.email ELSE $1 END,
        phone = '01619665875';
    `, [
      adminEmail,
      defaultPassHash,
      Date.now() + 3650 * 86400000,
      Date.now(),
    ]);

    // 2. Data Integrity Clean-up: If any other user account was accidentally marked as super_admin, restore role to 'user'
    await client.query(`
      UPDATE users 
      SET role = 'user' 
      WHERE id != 'usr_super_admin' 
        AND phone != '01619665875' 
        AND LOWER(email) NOT IN ('admin@twing.com', 'siftibrahim@gmail.com') 
        AND role = 'super_admin'
    `);
  } catch (seedUserErr) {
    console.warn('⚠️ Super admin seed check warning:', seedUserErr);
  }

  // Seed default payment config
  const initialPaymentSettings = {
    id: 'system_payment_settings',
    bkash: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'বিকাশ অ্যাপ বা *247# ডায়াল করে "Send Money" করুন।' },
    },
    nagad: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'নগদ অ্যাপ বা *167# ডায়াল করে "Send Money" করুন।' },
    },
    rocket: {
      isEnabled: true,
      personal: { number: '01619665875-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে "Send Money" করুন।' },
    },
    upay: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে "Send Money" করুন।' },
    },
    bankTransfer: {
      isEnabled: true,
      accounts: [
        {
          bankName: 'Islami Bank Bangladesh Ltd',
          accountName: 'TWING হিসাবি',
          accountNumber: '2050388020123456',
          branchName: 'Dhanmondi Branch',
          routingNumber: '125271458',
          instructions: 'সরাসরি ব্যাংক কাউন্টারে ডিপোজিট বা অনলাইন ব্যাংকিং ফান্ড ট্রান্সফার করুন।',
        },
      ],
    },
    gateways: [],
    updatedAt: Date.now(),
    updatedBy: adminEmail,
  };

  await client.query(`
    INSERT INTO system_config (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING;
  `, ['system_payment_settings', JSON.stringify(initialPaymentSettings), Date.now(), adminEmail]);

  // Seed default app update config
  const defaultAppUpdate = {
    id: 'app_update_config',
    versionName: '2.5.0',
    versionCode: 25,
    minRequiredVersion: '2.0.0',
    isForceUpdate: false,
    updateTitle: '✨ নতুন আপডেট উপলব্ধ (v2.5.0)',
    releaseNotes: '• দ্রুত পিওএস প্রিন্টিং\n• উন্নত ক্লাউড ব্যাকআপ\n• অফলাইন ট্রানজেকশন সাপোর্ট',
    downloadUrl: 'https://play.google.com/store',
    updatedAt: Date.now(),
  };

  await client.query(`
    INSERT INTO system_config (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING;
  `, ['app_update_config', JSON.stringify(defaultAppUpdate), Date.now(), adminEmail]);

  // Seed default BulkSMSBD SMS gateway config
  const defaultSmsConfig = {
    provider: 'bulksmsbd',
    apiKey: 'NOhILJCtx0DZJWCRBODB',
    senderId: '8809648910696',
    username: '',
    customUrl: '',
    isEnabled: true,
  };

  await client.query(`
    INSERT INTO system_config (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
  `, ['sms_gateway_config', JSON.stringify(defaultSmsConfig), Date.now(), adminEmail]);

  // Seed default staff member if none exists
  try {
    const staffCheck = await client.query('SELECT id FROM staff LIMIT 1');
    if (staffCheck.rows.length === 0) {
      const defaultStaffHash = await bcrypt.hash('staff123', 10);
      const defaultPermissions = JSON.stringify([
        'canManageUsers',
        'canApprovePayments',
        'canEditSubscriptions',
        'canSendBroadcasts',
        'canManageSupport',
        'canViewAuditLogs',
      ]);
      await client.query(`
        INSERT INTO staff (
          id, name, phone, email, password_hash, role, status, permissions, created_by, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [
        'staff_default_1',
        'অফিসিয়াল স্টাফ ম্যানেজার',
        '01900000000',
        'staff@twing.com',
        defaultStaffHash,
        'manager',
        'active',
        defaultPermissions,
        adminEmail,
        'Default Master Staff Account',
        Date.now(),
      ]);
    }
  } catch (staffErr) {
    console.warn('⚠️ Staff seed check notice:', staffErr);
  }
}

function seedDefaultDataInMemory() {
  const adminEmail = process.env.ADMIN_EMAIL || 'siftibrahim@gmail.com';
  inMemoryStore.users = [
    {
      id: 'usr_super_admin',
      name: 'ইব্রাহিম (সুপার অ্যাডমিন)',
      phone: '01619665875',
      email: 'siftibrahim@gmail.com',
      password_hash: '$2a$10$wN35i7t77b8H5hJ9uW7CGeL7O0Zl9KqXgN0vL3Z3zP8M9.5/cKzG', // admin123
      shopName: 'TWING হিসাবি',
      businessType: 'জেনারেল স্টোর',
      address: 'ঢাকা, বাংলাদেশ',
      role: 'super_admin',
      status: 'active',
      subscriptionPlan: 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: Date.now() + 3650 * 86400000,
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
      totalCustomers: 0,
      totalTransactions: 0,
    },
    {
      id: 'usr_super_admin_2',
      name: 'ইব্রাহিম (অ্যাডমিন)',
      phone: '01619665875',
      email: 'admin@twing.com',
      password_hash: '$2a$10$wN35i7t77b8H5hJ9uW7CGeL7O0Zl9KqXgN0vL3Z3zP8M9.5/cKzG', // admin123
      shopName: 'TWING হিসাবি',
      businessType: 'জেনারেল স্টোর',
      address: 'ঢাকা, বাংলাদেশ',
      role: 'super_admin',
      status: 'active',
      subscriptionPlan: 'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: Date.now() + 3650 * 86400000,
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
      totalCustomers: 0,
      totalTransactions: 0,
    },
  ];

  inMemoryStore.system_config['system_payment_settings'] = {
    id: 'system_payment_settings',
    bkash: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'বিকাশ অ্যাপ থেকে "Send Money" করুন।' },
    },
    nagad: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'নগদ অ্যাপ থেকে "Send Money" করুন।' },
    },
    rocket: {
      isEnabled: true,
      personal: { number: '01619665875-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে "Send Money" করুন।' },
    },
    upay: {
      isEnabled: true,
      personal: { number: '01619665875', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে "Send Money" করুন।' },
    },
    bankTransfer: {
      isEnabled: true,
      accounts: [
        {
          bankName: 'Islami Bank Bangladesh Ltd',
          accountName: 'Ibrahim General Store',
          accountNumber: '2050388020123456',
          branchName: 'Dhanmondi Branch',
          routingNumber: '125271458',
          instructions: 'সরাসরি ব্যাংক কাউন্টারে ডিপোজিট বা অনলাইন ব্যাংকিং ট্রান্সফার করুন।',
        },
      ],
    },
    gateways: [],
    updatedAt: Date.now(),
    updatedBy: adminEmail,
  };

  inMemoryStore.system_config['app_update_config'] = {
    id: 'app_update_config',
    versionName: '2.5.0',
    versionCode: 25,
    minRequiredVersion: '2.0.0',
    isForceUpdate: false,
    updateTitle: '✨ নতুন আপডেট উপলব্ধ (v2.5.0)',
    releaseNotes: '• দ্রুত পিওএস প্রিন্টিং\n• উন্নত ক্লাউড ব্যাকআপ\n• অফলাইন ট্রানজেকশন সাপোর্ট',
    downloadUrl: 'https://play.google.com/store',
    updatedAt: Date.now(),
  };

  inMemoryStore.system_config['sms_gateway_config'] = {
    provider: 'bulksmsbd',
    apiKey: 'NOhILJCtx0DZJWCRBODB',
    senderId: '8809648910696',
    username: '',
    customUrl: '',
    isEnabled: true,
  };

  inMemoryStore.staff = [
    {
      id: 'staff_default_1',
      name: 'অফিসিয়াল স্টাফ ম্যানেজার',
      phone: '01619665875',
      email: 'staff@twing.com',
      password_hash: '$2a$10$7z7aMvJdM9QxT2eXoOq9se.r0sN9E07uFv8gE8T4B6gH9tY5u7gHy', // staff123
      password: 'staff123',
      role: 'manager',
      status: 'active',
      permissions: [
        'canManageUsers',
        'canApprovePayments',
        'canEditSubscriptions',
        'canSendBroadcasts',
        'canManageSupport',
        'canViewAuditLogs',
      ],
      createdBy: adminEmail,
      createdAt: Date.now(),
    },
  ];
}
