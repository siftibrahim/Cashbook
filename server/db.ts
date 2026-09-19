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

  // If MySQL connection string, return clean trimmed URL
  if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
    return url;
  }

  // 1. Remove invalid / truncated / unsupported query parameters
  url = url.replace(/[?&]channel_[^&]*/gi, '');
  url = url.replace(/[?&]channel_binding=[^&]*/gi, '');
  
  // 2. Remove broken or repetitive verify-full strings
  url = url.replace(/verify-full[a-zA-Z0-9_\-]*/gi, 'no-verify');

  // 3. Remove sslmode parameters from query string to avoid node-postgres parsing conflict
  // We handle SSL directly in Pool config with { rejectUnauthorized: false }
  url = url.replace(/[?&]sslmode=[^&]*/gi, '');

  // 4. Clean up dangling ? or & or ?& or &&
  url = url.replace(/\?&/g, '?');
  url = url.replace(/&&+/g, '&');
  if (url.endsWith('?') || url.endsWith('&')) {
    url = url.slice(0, -1);
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
let isDbQuotaExceeded = false;
let heartbeatInterval: NodeJS.Timeout | null = null;

const LOCAL_DB_PATH = path.join(process.cwd(), 'server', 'data', 'local-db.json');

// In-memory store fallback when DATABASE_URL is not yet provided or Neon quota is exceeded
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
  sms_logs: any[];
  sms_purchases: any[];
  online_orders: any[];
  online_store_configs: any[];
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
  sms_logs: [],
  sms_purchases: [],
  online_orders: [],
  online_store_configs: [],
};

/**
 * Persists inMemoryStore to server/data/local-db.json for zero data-loss resilience
 */
export function saveInMemoryStoreToDisk() {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Could not save inMemoryStore to disk:', err);
  }
}

/**
 * Loads persistent storage from server/data/local-db.json
 */
export function loadInMemoryStoreFromDisk(): boolean {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          if (Array.isArray((inMemoryStore as any)[key]) && Array.isArray(data[key])) {
            (inMemoryStore as any)[key] = data[key];
          } else if (typeof (inMemoryStore as any)[key] === 'object' && typeof data[key] === 'object') {
            (inMemoryStore as any)[key] = { ...(inMemoryStore as any)[key], ...data[key] };
          }
        });
        console.log(`✅ Loaded ${inMemoryStore.users?.length || 0} user(s) from persistent local storage.`);
        return true;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not load inMemoryStore from disk:', err);
  }
  return false;
}

// Initial load on server boot
loadInMemoryStoreFromDisk();

// Helper to create an optimized, resilient pool for Neon serverless
function createNeonPool(connectionString: string): pg.Pool {
  const sanitized = sanitizePostgresUrl(connectionString);
  const isLocal = sanitized.includes('@localhost') || sanitized.includes('@127.0.0.1');
  const isCloudOrSsl = !isLocal || sanitized.includes('cockroachlabs.cloud') || sanitized.includes('neon.tech') || sanitized.includes('supabase') || sanitized.includes('sslmode');

  const newPool = new Pool({
    connectionString: sanitized,
    ssl: isCloudOrSsl ? { rejectUnauthorized: false } : false,
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
  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }
}

export function getIsDbQuotaExceeded(): boolean {
  return isDbQuotaExceeded;
}

export function markDbQuotaExceeded(err?: any) {
  if (err?.code === '53000' || err?.message?.includes('compute time quota') || !err) {
    if (!isDbQuotaExceeded) {
      console.warn('⚠️ [Neon Quota Exceeded] Serverless compute quota reached (Code 53000). Routing to resilient local storage.');
      isDbQuotaExceeded = true;
      if (pool) {
        try {
          pool.end().catch(() => {});
        } catch {}
        pool = null;
      }
      isDbConnected = false;
      saveInMemoryStoreToDisk();
    }
  }
}

export function getDbPool(): pg.Pool | null {
  if (isDbQuotaExceeded) {
    // Quota reached on Neon, fail fast to resilient local persistent store
    return null;
  }
  if (pool) return pool;

  const dbUrl = getStoredDbUrl();
  if (!dbUrl) {
    return null;
  }

  try {
    pool = createNeonPool(dbUrl);
    startDbHeartbeat();
    return pool;
  } catch (err) {
    console.warn('⚠️ Could not initialize PostgreSQL pool:', err);
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

  const isMysql = cleanUrl.startsWith('mysql://') || cleanUrl.startsWith('mysql2://');
  const isPostgres = cleanUrl.startsWith('postgres://') || cleanUrl.startsWith('postgresql://');

  if (!isMysql && !isPostgres) {
    throw new Error('অবৈধ ডাটাবেজ ইউআরএল ফরম্যাট! URL অবশ্যই postgresql:// অথবা mysql:// দিয়ে শুরু হতে হবে।');
  }

  // Handle MySQL connection
  if (isMysql) {
    try {
      const mysql = await import('mysql2/promise');
      const testMysqlPool = mysql.createPool(cleanUrl);
      const [rows] = await testMysqlPool.query('SELECT DATABASE() as db_name');
      const dbName = (rows as any)?.[0]?.db_name || 'mysql_database';
      await testMysqlPool.end();

      process.env.DATABASE_URL = cleanUrl;
      try {
        const dir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify({ databaseUrl: cleanUrl, dbType: 'mysql', updatedAt: new Date().toISOString() }, null, 2));
      } catch (saveErr) {
        console.warn('Could not write to db-config.json:', saveErr);
      }

      return {
        success: true,
        message: '✅ আপনার নিজস্ব MySQL ডাটাবেজে সফলভাবে সংযুক্ত হয়েছে!',
        databaseName: dbName,
        userCount: inMemoryStore.users?.length || 0,
      };
    } catch (mErr: any) {
      console.warn('⚠️ Failed to connect to MySQL database:', mErr?.message || mErr);
      throw new Error(`MySQL ডাটাবেজ কানেকশন ব্যর্থ হয়েছে: ${mErr.message}`);
    }
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
    isDbQuotaExceeded = false;
    pool = createNeonPool(cleanUrl);
    startDbHeartbeat();

    await initializeDatabaseSchema();

    const isCockroach = cleanUrl.includes('cockroachlabs.cloud');
    const dbType = isCockroach ? 'CockroachDB' : (cleanUrl.includes('neon.tech') ? 'Neon PostgreSQL' : 'PostgreSQL');

    return {
      success: true,
      message: `✅ ${dbType} ডাটাবেজে সফলভাবে সংযুক্ত হয়েছে!`,
      databaseName: res.rows[0]?.db_name || 'defaultdb',
      userCount,
    };
  } catch (err: any) {
    if (testPool) {
      try { await testPool.end(); } catch {}
    }
    const isQuota = err?.code === '53000' || err?.message?.includes('compute time quota');
    if (isQuota) {
      markDbQuotaExceeded(err);
      console.warn('⚠️ [Neon Compute Quota] Project has exceeded compute time quota:', err?.message || err);
      throw new Error('আপনার Neon ডাটাবেজের ফ্রি কম্পিউট সময় কোটা (Compute Time Quota) শেষ হয়ে গেছে। Neon কনসোলে গিয়ে প্ল্যান আপগ্রেড করুন অথবা নতুন ডাটাবেজ URL দিন। আপনার সব তথ্য লোকাল ব্যাকআপে সুরক্ষিত রয়েছে।');
    }
    console.warn('⚠️ Failed to connect to provided Neon database:', err?.message || err);
    throw new Error(`ডাটাবেজ কানেকশন ব্যর্থ হয়েছে: ${err.message}`);
  }
}

/**
 * Resilient query wrapper with automatic 1-time retry on transient Neon scale-to-zero / socket disconnect
 */
export async function query(text: string, params?: any[]): Promise<pg.QueryResult<any>> {
  let p = getDbPool();
  if (!p) {
    console.warn('⚠️ [AI Studio Mock] DB not connected — returning mock empty result for query');
    return {
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    } as any;
  }

  try {
    return await p.query(text, params);
  } catch (err: any) {
    if (err?.code === '53000' || err?.message?.includes('compute time quota')) {
      markDbQuotaExceeded(err);
      console.warn('⚠️ [Neon Quota in query] Switching to in-memory fallback.');
      return {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any;
    }

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

  let client: pg.PoolClient | null = null;
  try {
    client = await p.connect();
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
        user_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'সাধারণ',
        unit VARCHAR(50) DEFAULT 'পিস',
        buy_price NUMERIC(12, 2) DEFAULT 0,
        sale_price NUMERIC(12, 2) DEFAULT 0,
        stock NUMERIC(12, 2) DEFAULT 0,
        min_stock_alert NUMERIC(12, 2) DEFAULT 5,
        updated_at BIGINT NOT NULL
      );
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
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
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_note TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS paymently_invoice_id VARCHAR(255);
      CREATE INDEX IF NOT EXISTS idx_payments_paymently_invoice_id ON payments(paymently_invoice_id);
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

    // 14. Online Store Orders & Customer Payments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS online_orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        order_number VARCHAR(50) NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        delivery_area VARCHAR(50) DEFAULT 'inside_dhaka',
        delivery_charge NUMERIC(12, 2) DEFAULT 0,
        items JSONB DEFAULT '[]'::jsonb,
        subtotal NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cod',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        order_status VARCHAR(50) DEFAULT 'pending',
        trx_id VARCHAR(100),
        sender_phone VARCHAR(50),
        payment_amount NUMERIC(12, 2),
        payment_proof TEXT,
        payment_reject_reason TEXT,
        payment_reviewed_at BIGINT,
        notes TEXT,
        courier_name VARCHAR(100),
        courier_tracking_code VARCHAR(100),
        cod_collected_amount NUMERIC(12, 2),
        collected_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_online_orders_user ON online_orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_online_orders_created ON online_orders(created_at DESC);
    `);

    // 15. Multi-Tenant Online Store Configuration & Custom Domain Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS online_store_configs (
        user_id VARCHAR(100) PRIMARY KEY,
        store_slug VARCHAR(100) UNIQUE NOT NULL,
        store_name VARCHAR(255) NOT NULL,
        tagline TEXT,
        category VARCHAR(100),
        phone VARCHAR(50),
        whatsapp_phone VARCHAR(50),
        address TEXT,
        custom_domain VARCHAR(255) UNIQUE,
        custom_domain_verified BOOLEAN DEFAULT FALSE,
        custom_domain_status VARCHAR(50) DEFAULT 'pending',
        custom_domain_verified_at BIGINT,
        theme_color VARCHAR(50) DEFAULT 'teal',
        announcement TEXT,
        delivery_inside_dhaka NUMERIC(12, 2) DEFAULT 60,
        delivery_outside_dhaka NUMERIC(12, 2) DEFAULT 120,
        free_delivery_above NUMERIC(12, 2),
        min_order_amount NUMERIC(12, 2),
        delivery_time_estimate VARCHAR(100),
        accept_cod BOOLEAN DEFAULT TRUE,
        accept_bkash BOOLEAN DEFAULT FALSE,
        bkash_number VARCHAR(50),
        bkash_type VARCHAR(50) DEFAULT 'personal',
        accept_nagad BOOLEAN DEFAULT FALSE,
        nagad_number VARCHAR(50),
        nagadType VARCHAR(50) DEFAULT 'personal',
        accept_rocket BOOLEAN DEFAULT FALSE,
        rocket_number VARCHAR(50),
        rocket_type VARCHAR(50) DEFAULT 'personal',
        payment_instructions TEXT,
        banner_url TEXT,
        banner_title TEXT,
        banner_subtitle TEXT,
        banner_tag TEXT,
        banner_discount_text TEXT,
        banner_style VARCHAR(50) DEFAULT 'gradient',
        logo_url TEXT,
        support_whatsapp_message TEXT,
        support_hours VARCHAR(100),
        facebook_url TEXT,
        published_product_ids JSONB DEFAULT '[]'::jsonb,
        banners JSONB DEFAULT '[]'::jsonb,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_online_store_configs_slug ON online_store_configs(store_slug);
      CREATE INDEX IF NOT EXISTS idx_online_store_configs_domain ON online_store_configs(custom_domain);

      CREATE TABLE IF NOT EXISTS media_storage (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255),
        data TEXT NOT NULL,
        size_bytes INT,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_media_storage_user_id ON media_storage(user_id);
    `);

    // Schema Evolution Safety: Ensure columns exist on already created tables
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_customers INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_transactions INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS app_version TEXT;
      
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published_online BOOLEAN DEFAULT TRUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0;
      
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

      -- Schema for SMS Balance, SMS Logs, and SMS Purchases
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_balance INT DEFAULT 20;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_code TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC(12, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published_online BOOLEAN DEFAULT TRUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

      -- SMS Logs Table
      CREATE TABLE IF NOT EXISTS sms_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        message TEXT,
        sms_type VARCHAR(50) DEFAULT 'tagada',
        status VARCHAR(50) DEFAULT 'sent',
        cost_sms INT DEFAULT 1,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

      -- SMS Purchases Table
      CREATE TABLE IF NOT EXISTS sms_purchases (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255),
        user_phone VARCHAR(50),
        shop_name VARCHAR(255),
        sms_count INT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'bkash',
        trx_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'approved',
        created_at BIGINT NOT NULL,
        approved_at BIGINT
      );
      CREATE INDEX IF NOT EXISTS idx_sms_purchases_user_id ON sms_purchases(user_id);

      -- Drop strict foreign key constraints to ensure offline/sync/staff operations never crash
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
      ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
      ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
      ALTER TABLE store_profiles DROP CONSTRAINT IF EXISTS store_profiles_user_id_fkey;
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
      ALTER TABLE sms_logs DROP CONSTRAINT IF EXISTS sms_logs_user_id_fkey;
      ALTER TABLE online_store_configs DROP CONSTRAINT IF EXISTS online_store_configs_user_id_fkey;

      -- Ensure all multi-tenant columns exist on online_store_configs
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT 'teal';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS tagline TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS category VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS custom_domain_verified_at BIGINT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS announcement TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS delivery_inside_dhaka NUMERIC(12, 2) DEFAULT 60;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS delivery_outside_dhaka NUMERIC(12, 2) DEFAULT 120;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS free_delivery_above NUMERIC(12, 2);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12, 2);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS delivery_time_estimate VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_cod BOOLEAN DEFAULT TRUE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_bkash BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bkash_number VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bkash_type VARCHAR(50) DEFAULT 'personal';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_nagad BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS nagad_number VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS nagad_type VARCHAR(50) DEFAULT 'personal';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_rocket BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS rocket_number VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS rocket_type VARCHAR(50) DEFAULT 'personal';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_url TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_title TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_subtitle TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_tag TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_discount_text TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_style VARCHAR(50) DEFAULT 'gradient';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banners JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS support_whatsapp_message TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS facebook_url TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS published_product_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS created_at BIGINT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS updated_at BIGINT;
      ALTER TABLE sms_purchases DROP CONSTRAINT IF EXISTS sms_purchases_user_id_fkey;
      ALTER TABLE support_messages DROP CONSTRAINT IF EXISTS support_messages_user_id_fkey;
      ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
      ALTER TABLE subscription_audit_logs DROP CONSTRAINT IF EXISTS subscription_audit_logs_user_id_fkey;

      -- SMS Logs Table
      CREATE TABLE IF NOT EXISTS sms_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        message TEXT,
        sms_type VARCHAR(50) DEFAULT 'tagada',
        status VARCHAR(50) DEFAULT 'sent',
        cost_sms INT DEFAULT 1,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

      -- SMS Purchases Table
      CREATE TABLE IF NOT EXISTS sms_purchases (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255),
        user_phone VARCHAR(50),
        shop_name VARCHAR(255),
        sms_count INT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'bkash',
        trx_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'approved',
        created_at BIGINT NOT NULL,
        approved_at BIGINT
      );
      ALTER TABLE sms_purchases ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
      ALTER TABLE sms_purchases ADD COLUMN IF NOT EXISTS package_id VARCHAR(64);
      ALTER TABLE sms_purchases ADD COLUMN IF NOT EXISTS package_name VARCHAR(255);
      ALTER TABLE sms_purchases ADD COLUMN IF NOT EXISTS gateway_id VARCHAR(64);
      ALTER TABLE sms_purchases ADD COLUMN IF NOT EXISTS admin_note TEXT;
      CREATE INDEX IF NOT EXISTS idx_sms_purchases_user_id ON sms_purchases(user_id);
    `);

    // Seed default admin and system configs if not present
    await seedDefaultDataInPostgres(client);

    client.release();
    client = null;
    isDbConnected = true;
    console.log('✅ PostgreSQL Schema and initial seeds ready!');
  } catch (err: any) {
    if (client) {
      try { client.release(); } catch {}
      client = null;
    }
    const isQuota = err?.code === '53000' || err?.message?.includes('compute time quota');
    if (isQuota) {
      console.warn('⚠️ [Neon Quota Notice] Serverless compute quota reached (Code 53000). Activating persistent local storage fallback.');
      markDbQuotaExceeded(err);
      if (pool) {
        try { await pool.end(); } catch {}
        pool = null;
      }
      isDbConnected = false;
      seedDefaultDataInMemory();
      return;
    }
    
    console.warn('⚠️ Database schema initialization note (non-fatal):', err?.message || err);
    // Verify if database connection is still working
    try {
      if (pool) {
        await pool.query('SELECT 1');
        isDbConnected = true;
        console.log('✅ PostgreSQL connection verified healthy despite minor schema notice.');
        return;
      }
    } catch (testErr) {
      console.warn('Database health check failed:', testErr);
    }

    console.log('ℹ️ Activating resilient in-memory storage fallback with disk persistence.');
    if (pool) {
      try {
        await pool.end();
      } catch {}
      pool = null;
    }
    isDbConnected = false;
    seedDefaultDataInMemory();
  }
}

async function seedDefaultDataInPostgres(client: pg.PoolClient) {
  const adminEmail = process.env.ADMIN_EMAIL || 'siftibrahim@gmail.com';
  
  // Seed Super Admin in users table safely and restore correct identity
  try {
    // 0. Ensure any regular user with 01306908115 is completely removed so the number belongs exclusively to Super Admin
    await client.query(`
      DELETE FROM users 
      WHERE (
        phone = '01306908115' 
        OR email LIKE '01306908115@%' 
        OR phone LIKE '%1306908115%'
      ) AND id != 'usr_super_admin' AND role != 'super_admin'
    `);

    // If a user with adminEmail or phone exists under a different ID, harmonize it
    // 0. Remove any regular user account associated with the super admin phone number 01306908115
    try {
      const conflictingUsers = await client.query(`
        SELECT id FROM users 
        WHERE (phone = '01306908115' OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = '01306908115')
          AND id NOT IN ('usr_super_admin', 'usr_super_admin_2')
          AND role != 'super_admin'
      `);
      for (const u of conflictingUsers.rows) {
        await client.query(`DELETE FROM transactions WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM customers WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM products WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM expenses WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM payments WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM sms_purchases WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM user_sms_logs WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM notifications WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM store_profiles WHERE user_id = $1`, [u.id]).catch(() => {});
        await client.query(`DELETE FROM users WHERE id = $1`, [u.id]).catch(() => {});
        console.log(`🧹 Cleaned up non-admin user ${u.id} associated with 01306908115`);
      }
    } catch (cleanErr) {
      console.warn('⚠️ User cleanup check error:', cleanErr);
    }

    const existingAdminByEmail = await client.query(
      `SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1) OR phone = '01306908115' OR phone = '01619665875' LIMIT 1`,
      [adminEmail.toLowerCase()]
    );
    if (existingAdminByEmail.rows.length > 0 && existingAdminByEmail.rows[0].id !== 'usr_super_admin') {
      try {
        await client.query(`UPDATE users SET id = 'usr_super_admin', role = 'super_admin', phone = '01306908115' WHERE id = $1`, [existingAdminByEmail.rows[0].id]);
      } catch {
        await client.query(`UPDATE users SET email = $1, phone = '01306908115' WHERE id = $2`, [`admin_${existingAdminByEmail.rows[0].id.slice(-6)}@twing.com`, existingAdminByEmail.rows[0].id]);
      }
    }

    // 1. Ensure usr_super_admin exists with genuine super admin credentials without hardcoded default password
    await client.query(`
      INSERT INTO users (
        id, name, phone, email, password_hash, shop_name, business_type, address, role, status, subscription_plan, subscription_status, subscription_expires_at, registered_at, last_active_at
      ) VALUES (
        'usr_super_admin',
        'ইব্রাহিম খলিল (সুপার অ্যাডমিন)',
        '01306908115',
        $1,
        '',
        'TWING হিসাবি',
        'জেনারেল স্টোর',
        'ঢাকা, বাংলাদেশ',
        'super_admin',
        'active',
        'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
        'active',
        $2,
        $3,
        $3
      ) ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        name = 'ইব্রাহিম খলিল (সুপার অ্যাডমিন)',
        email = CASE WHEN users.email LIKE '%admin%' OR users.email LIKE '%siftibrahim%' THEN users.email ELSE $1 END,
        phone = '01306908115',
        status = 'active';
    `, [
      adminEmail,
      Date.now() + 3650 * 86400000,
      Date.now(),
    ]);

    // Seed/Update super admin security config (no default masterPin)
    await client.query(`
      INSERT INTO system_config (id, data, updated_at, updated_by)
      VALUES ('super_admin_security', $1, $2, 'usr_super_admin')
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `, [
      JSON.stringify({
        phone: '01306908115',
        email: adminEmail,
        masterPin: '',
        is2FAEnabled: true,
        updatedAt: Date.now(),
      }),
      Date.now(),
    ]);

    // 2. Data Integrity Clean-up: If any other user account was accidentally marked as super_admin, restore role to 'user'
    await client.query(`
      UPDATE users 
      SET role = 'user' 
      WHERE id != 'usr_super_admin' 
        AND phone NOT IN ('01306908115', '01619665875') 
        AND LOWER(email) NOT IN ('admin@twing.com', 'siftibrahim@gmail.com') 
        AND role = 'super_admin'
    `);
  } catch (seedUserErr) {
    console.warn('⚠️ Super admin seed check warning:', seedUserErr);
  }

  // Seed default payment config
  const initialPaymentSettings = {
    id: 'system_payment_settings',
    isSubscriptionSystemEnabled: true,
    bkash: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'বিকাশ অ্যাপ বা *247# ডায়াল করে "Send Money" করুন।' },
    },
    nagad: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'নগদ অ্যাপ বা *167# ডায়াল করে "Send Money" করুন।' },
    },
    rocket: {
      isEnabled: true,
      personal: { number: '01306908115-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে "Send Money" করুন।' },
    },
    upay: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে "Send Money" করুন।' },
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
    paymently: {
      isEnabled: true,
      baseUrl: 'https://twinghisabi.paymently.io/api',
      apiKey: 'r5y3NpBqR9NOlVf8qUmaQm3VaO6GtzkvpQlrr0iC',
      isSandbox: false,
    },
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

  // Seed default Ads & Monetization config
  const defaultAdSettings = {
    id: 'system_ad_settings',
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
    updatedBy: adminEmail,
  };

  await client.query(`
    INSERT INTO system_config (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING;
  `, ['system_ad_settings', JSON.stringify(defaultAdSettings), Date.now(), adminEmail]);

  const defaultBannerSettings = {
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

  await client.query(`
    INSERT INTO system_config (id, data, updated_at, updated_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING;
  `, ['dashboard_banner_settings', JSON.stringify(defaultBannerSettings), Date.now(), adminEmail]);
}

function seedDefaultDataInMemory() {
  const adminEmail = process.env.ADMIN_EMAIL || 'siftibrahim@gmail.com';

  const existingAdmin = inMemoryStore.users.find(u => u.id === 'usr_super_admin');
  if (!existingAdmin) {
    inMemoryStore.users.unshift({
      id: 'usr_super_admin',
      name: 'ইব্রাহিম খলিল (সুপার অ্যাডমিন)',
      phone: '01306908115',
      email: adminEmail,
      password_hash: '',
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
    });
  } else {
    // Preserve existing admin and their real password intact!
    existingAdmin.phone = '01306908115';
    existingAdmin.role = 'super_admin';
  }

  inMemoryStore.system_config['super_admin_security'] = {
    id: 'super_admin_security',
    phone: '01306908115',
    email: 'siftibrahim@gmail.com',
    masterPin: '',
    is2FAEnabled: true,
    updatedAt: Date.now(),
  };

  inMemoryStore.system_config['system_payment_settings'] = {
    id: 'system_payment_settings',
    bkash: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'বিকাশ অ্যাপ থেকে "Send Money" করুন।' },
    },
    nagad: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'নগদ অ্যাপ থেকে "Send Money" করুন।' },
    },
    rocket: {
      isEnabled: true,
      personal: { number: '01306908115-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে "Send Money" করুন।' },
    },
    upay: {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে "Send Money" করুন।' },
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
    paymently: {
      isEnabled: true,
      baseUrl: 'https://twinghisabi.paymently.io/api',
      apiKey: 'r5y3NpBqR9NOlVf8qUmaQm3VaO6GtzkvpQlrr0iC',
      isSandbox: false,
    },
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

  inMemoryStore.system_config['system_ad_settings'] = {
    id: 'system_ad_settings',
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

  inMemoryStore.system_config['dashboard_banner_settings'] = {
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

  inMemoryStore.staff = [];
  saveInMemoryStoreToDisk();
}

/**
 * Ensures that a user record exists in PostgreSQL for foreign key and data consistency.
 * Returns the effective user ID.
 */
export async function ensureUserExistsInPostgres(
  poolOrClient: pg.Pool | pg.PoolClient,
  userId: string,
  userPayload?: { email?: string; name?: string; phone?: string; shopName?: string; role?: string }
): Promise<string> {
  if (!userId) return userId;
  try {
    const userRes = await poolOrClient.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (userRes.rows.length > 0) {
      return userId;
    }

    // If userId not found directly, see if a user with matching email exists
    const rawEmail = userPayload?.email ? userPayload.email.trim().toLowerCase() : '';
    if (rawEmail) {
      const emailRes = await poolOrClient.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [rawEmail]);
      if (emailRes.rows.length > 0) {
        return emailRes.rows[0].id;
      }
    }

    // Auto-create user record with safe fallback values
    const now = Date.now();
    const name = userPayload?.name || (userId === 'usr_super_admin' ? 'সুপার অ্যাডমিন' : 'দোকানদার');
    const phone = userPayload?.phone || '01306908115';
    const shopName = userPayload?.shopName || (userId === 'usr_super_admin' ? 'TWING হিসাবি' : 'আমার দোকান');
    const role = userPayload?.role || (userId === 'usr_super_admin' ? 'super_admin' : 'user');
    const safeEmail = rawEmail || `user_${userId.replace(/[^a-zA-Z0-9_]/g, '')}@twing.com`;
    const passHash = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(36), 10);

    await poolOrClient.query(`
      INSERT INTO users (
        id, name, phone, email, password_hash, shop_name, role, status,
        subscription_plan, subscription_status, subscription_expires_at, registered_at, last_active_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'ফ্রি ট্রায়াল (১৪ দিন)', 'active', $8, $9, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      userId,
      name,
      phone,
      safeEmail,
      passHash,
      shopName,
      role,
      now + 365 * 86400000,
      now
    ]);
    return userId;
  } catch (err) {
    console.warn('⚠️ ensureUserExistsInPostgres non-fatal warning:', err);
    return userId;
  }
}
