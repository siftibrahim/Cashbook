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
  store_chat_messages: any[];
  marketplace_master_orders: any[];
  marketplace_customers: any[];
  marketplace_categories: any[];
  marketplace_settings: any;
  vendor_payout_requests: any[];
  marketplace_users: any[];
  marketplace_verification_requests: any[];
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
  store_chat_messages: [],
  marketplace_master_orders: [],
  marketplace_customers: [],
  marketplace_categories: [],
  marketplace_settings: {},
  vendor_payout_requests: [],
  marketplace_users: [],
  marketplace_verification_requests: [],
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
    connectionTimeoutMillis: 5000, // Fast failover so unreachable external hosts fail fast to inMemoryStore
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

let onlineOrdersSchemaEnsured = false;

/**
 * Self-healing schema helper for online_orders & marketplace_master_orders
 * Ensures all columns (including discount_amount, paid_amount, due_amount, delivery details,
 * and marketplace vs personal store governance columns) exist before any query/update.
 */
export async function ensureOnlineOrdersSchema(poolOrClient?: any, force = false): Promise<void> {
  if (onlineOrdersSchemaEnsured && !force) return;
  const target = poolOrClient || getDbPool();
  if (!target) return;

  try {
    await target.query(`
      CREATE TABLE IF NOT EXISTS online_orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        order_number VARCHAR(50) NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        delivery_area VARCHAR(50) DEFAULT 'inside_dhaka',
        delivery_charge NUMERIC(12, 2) DEFAULT 0,
        discount_amount NUMERIC(12, 2) DEFAULT 0,
        items JSONB DEFAULT '[]'::jsonb,
        subtotal NUMERIC(12, 2) DEFAULT 0,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        paid_amount NUMERIC(12, 2) DEFAULT 0,
        due_amount NUMERIC(12, 2) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'cod',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        order_status VARCHAR(50) DEFAULT 'pending',
        order_source VARCHAR(30) DEFAULT 'direct_store',
        master_order_id VARCHAR(100),
        vendor_payout_status VARCHAR(30) DEFAULT 'unsettled',
        admin_approval_status VARCHAR(50) DEFAULT 'pending_approval',
        is_admin_approved BOOLEAN DEFAULT FALSE,
        is_locked_for_vendor BOOLEAN DEFAULT FALSE,
        is_rejected_by_admin BOOLEAN DEFAULT FALSE,
        admin_rejection_reason TEXT,
        is_hidden_from_vendor BOOLEAN DEFAULT FALSE,
        trx_id VARCHAR(100),
        sender_phone VARCHAR(50),
        payment_amount NUMERIC(12, 2),
        payment_proof TEXT,
        payment_reject_reason TEXT,
        payment_reviewed_at BIGINT,
        notes TEXT,
        courier_name VARCHAR(100),
        courier_tracking_code VARCHAR(100),
        delivery_man_name VARCHAR(150),
        delivery_man_phone VARCHAR(50),
        estimated_delivery_date VARCHAR(100),
        delivery_note TEXT,
        vendor_note TEXT,
        cod_collected_amount NUMERIC(12, 2),
        collected_at BIGINT,
        is_stock_adjusted BOOLEAN DEFAULT FALSE,
        is_ledger_synced BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );

      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_area VARCHAR(50) DEFAULT 'inside_dhaka';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(30) DEFAULT 'direct_store';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS master_order_id VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS vendor_payout_status VARCHAR(30) DEFAULT 'unsettled';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50) DEFAULT 'pending_approval';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_admin_approved BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_locked_for_vendor BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_rejected_by_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_hidden_from_vendor BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS trx_id VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12, 2);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_proof TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_reject_reason TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS payment_reviewed_at BIGINT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS courier_tracking_code VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_name VARCHAR(150);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_phone VARCHAR(50);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS estimated_delivery_date VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_note TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS vendor_note TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS cod_collected_amount NUMERIC(12, 2);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS collected_at BIGINT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_stock_adjusted BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_ledger_synced BOOLEAN DEFAULT FALSE;
    `);
    const requiredCols = [
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_locked_for_vendor BOOLEAN DEFAULT FALSE",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_admin_approved BOOLEAN DEFAULT FALSE",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50) DEFAULT 'pending_approval'",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100)",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS courier_tracking_code VARCHAR(100)",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_name VARCHAR(150)",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_phone VARCHAR(50)",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS estimated_delivery_date VARCHAR(100)",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_note TEXT",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS vendor_note TEXT",
    ];
    for (const q of requiredCols) {
      await target.query(q).catch(() => {});
    }
    onlineOrdersSchemaEnsured = true;
  } catch (err) {
    console.warn('⚠️ ensureOnlineOrdersSchema notice:', (err as any)?.message || err);
    const fallbackCols = [
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2) DEFAULT 0",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_locked_for_vendor BOOLEAN DEFAULT FALSE",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_admin_approved BOOLEAN DEFAULT FALSE",
      "ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50) DEFAULT 'pending_approval'",
    ];
    for (const q of fallbackCols) {
      await target.query(q).catch(() => {});
    }
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
        logo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
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
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(64);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_name VARCHAR(255);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'USER';
      CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id, target);

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
    await ensureOnlineOrdersSchema(client, true);
    await client.query(`
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
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS id VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
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

      -- Storefront Live Customer-Vendor Chat Messages Table
      CREATE TABLE IF NOT EXISTS store_chat_messages (
        id VARCHAR(100) PRIMARY KEY,
        vendor_id VARCHAR(100) NOT NULL,
        thread_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(150),
        customer_phone VARCHAR(50),
        sender VARCHAR(20) NOT NULL,
        sender_name VARCHAR(150),
        sender_phone VARCHAR(50),
        text TEXT NOT NULL,
        is_read_by_vendor BOOLEAN DEFAULT FALSE,
        is_read_by_customer BOOLEAN DEFAULT TRUE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_store_chat_vendor ON store_chat_messages(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_store_chat_thread ON store_chat_messages(vendor_id, thread_id);
      CREATE INDEX IF NOT EXISTS idx_store_chat_created ON store_chat_messages(created_at ASC);
    `);

    // Schema Evolution Safety: Ensure columns exist on already created tables
    await client.query(`
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS deleted_demo_product_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS include_demo_products BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_customers INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_transactions INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS app_version TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online_store_allowed BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_status VARCHAR(50) DEFAULT 'disabled';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_requested_at BIGINT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_note TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);

      -- Ensure Super Admin always has online store access enabled
      UPDATE users SET is_online_store_allowed = TRUE, online_store_status = 'active'
      WHERE role = 'super_admin' OR id = 'usr_super_admin' OR LOWER(email) IN ('siftibrahim@gmail.com', 'admin@twing.com');
      
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published_online BOOLEAN DEFAULT TRUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.0;
      
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS print_paper_size VARCHAR(50) DEFAULT 'thermal_80';
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS show_qr_on_invoice BOOLEAN DEFAULT TRUE;
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS default_credit_limit NUMERIC(12, 2) DEFAULT 10000;
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS enable_sound_effects BOOLEAN DEFAULT TRUE;
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
      ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
      
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
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'আমার দোকান';
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
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_upay BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS upay_number VARCHAR(50);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS upay_type VARCHAR(50) DEFAULT 'personal';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_bank BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(150);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bank_branch_name VARCHAR(150);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(100);
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS vendor_payment_qr_url TEXT;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS accept_bangla_qr BOOLEAN DEFAULT TRUE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS bangla_qr_number VARCHAR(50);
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
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS is_store_allowed_by_admin BOOLEAN DEFAULT TRUE;
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS admin_store_status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS admin_store_note TEXT;
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

      -- ========================================================
      -- Central Multi-Vendor Marketplace Schema Evolution
      -- ========================================================
      -- 1. Products Marketplace Fields
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_listed_on_marketplace BOOLEAN DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_status VARCHAR(30) DEFAULT 'approved';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured_on_marketplace BOOLEAN DEFAULT FALSE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_category_id VARCHAR(64);

      CREATE INDEX IF NOT EXISTS idx_products_mkt_feed 
      ON products(is_listed_on_marketplace, marketplace_status, stock);

      -- 2. Online Orders Multi-Vendor Support & Personal E-Commerce Vendor Suite
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(30) DEFAULT 'direct_store';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS master_order_id VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS vendor_payout_status VARCHAR(30) DEFAULT 'unsettled';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50) DEFAULT 'pending_approval';
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_admin_approved BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_locked_for_vendor BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_rejected_by_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_hidden_from_vendor BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_name VARCHAR(150);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_man_phone VARCHAR(50);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS estimated_delivery_date VARCHAR(100);
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS delivery_note TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS vendor_note TEXT;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_stock_adjusted BOOLEAN DEFAULT FALSE;
      ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_ledger_synced BOOLEAN DEFAULT FALSE;

      -- Personal store orders are 100% vendor-operated (never locked by admin)
      UPDATE online_orders
      SET is_admin_approved = TRUE,
          admin_approval_status = 'not_required'
      WHERE (order_source IS NULL OR order_source = 'direct_store')
        AND master_order_id IS NULL
        AND is_admin_approved IS NOT TRUE;

      CREATE INDEX IF NOT EXISTS idx_online_orders_master ON online_orders(master_order_id);
      CREATE INDEX IF NOT EXISTS idx_online_orders_src ON online_orders(order_source);
      CREATE INDEX IF NOT EXISTS idx_online_orders_admin_app ON online_orders(admin_approval_status, is_admin_approved);

      -- 3. Central Marketplace Master Orders Table
      CREATE TABLE IF NOT EXISTS marketplace_master_orders (
        id VARCHAR(100) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT NOT NULL,
        delivery_city VARCHAR(50) DEFAULT 'dhaka',
        total_items_count INT NOT NULL DEFAULT 1,
        total_products_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total_delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        payment_trx_id VARCHAR(100),
        sender_phone VARCHAR(50),
        notes TEXT,
        vendor_ids JSONB DEFAULT '[]'::jsonb,
        sub_order_ids JSONB DEFAULT '[]'::jsonb,
        overall_status VARCHAR(50) DEFAULT 'processing',
        admin_approval_status VARCHAR(50) DEFAULT 'pending_approval',
        is_admin_approved BOOLEAN DEFAULT FALSE,
        is_rejected_by_admin BOOLEAN DEFAULT FALSE,
        admin_rejection_reason TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS admin_approval_status VARCHAR(50) DEFAULT 'pending_approval';
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS is_admin_approved BOOLEAN DEFAULT FALSE;
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS is_rejected_by_admin BOOLEAN DEFAULT FALSE;
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS courier_tracking_code VARCHAR(100);
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
      ALTER TABLE marketplace_master_orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_mkt_orders_phone ON marketplace_master_orders(customer_phone);
      CREATE INDEX IF NOT EXISTS idx_mkt_orders_created ON marketplace_master_orders(created_at DESC);

      -- 3.5 Central Marketplace Customers Table (Unique Phone, Passwordless Phone+OTP / Google)
      CREATE TABLE IF NOT EXISTS marketplace_customers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        google_id VARCHAR(255),
        picture TEXT,
        address TEXT DEFAULT '',
        city VARCHAR(50) DEFAULT 'dhaka',
        device_token VARCHAR(255),
        is_verified BOOLEAN DEFAULT TRUE,
        verified_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mkt_cust_phone_uniq ON marketplace_customers(phone);
      CREATE INDEX IF NOT EXISTS idx_mkt_cust_email ON marketplace_customers(email);
      CREATE INDEX IF NOT EXISTS idx_mkt_cust_google ON marketplace_customers(google_id);

      -- 4. Central Marketplace Categories Table
      CREATE TABLE IF NOT EXISTS marketplace_categories (
        id VARCHAR(64) PRIMARY KEY,
        name_bn VARCHAR(150) NOT NULL,
        name_en VARCHAR(150),
        slug VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(100),
        image_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mkt_cats_slug ON marketplace_categories(slug);

      -- 5. Central Marketplace Settings Table
      CREATE TABLE IF NOT EXISTS marketplace_settings (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL
      );

      -- 6. Central Marketplace Vendor Payout Requests Table
      CREATE TABLE IF NOT EXISTS vendor_payout_requests (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        store_name VARCHAR(255),
        store_phone VARCHAR(50),
        amount NUMERIC(12, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_type VARCHAR(50) DEFAULT 'personal',
        bank_name VARCHAR(100),
        branch_name VARCHAR(100),
        status VARCHAR(30) DEFAULT 'pending',
        request_note TEXT,
        admin_transaction_id VARCHAR(100),
        admin_note TEXT,
        processed_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_payout_user ON vendor_payout_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_payout_status ON vendor_payout_requests(status);
      CREATE INDEX IF NOT EXISTS idx_payout_created ON vendor_payout_requests(created_at DESC);

      -- 7. Central Marketplace Social & Registered Users Table (Persistent User Database)
      CREATE TABLE IF NOT EXISTS marketplace_users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar TEXT,
        cover_photo TEXT,
        bio TEXT,
        address TEXT DEFAULT '',
        location VARCHAR(150) DEFAULT '',
        role VARCHAR(50) DEFAULT 'customer',
        joined_date VARCHAR(50),
        followers_count INT DEFAULT 0,
        following_count INT DEFAULT 0,
        friends_count INT DEFAULT 0,
        rating NUMERIC(3, 1) DEFAULT 5.0,
        total_sales INT DEFAULT 0,
        total_orders INT DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_status VARCHAR(50) DEFAULT 'unverified',
        verification_data JSONB,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_pin VARCHAR(10),
        privacy_settings JSONB,
        notification_settings JSONB,
        blocked_user_ids JSONB DEFAULT '[]',
        friend_ids JSONB DEFAULT '[]',
        active_sessions JSONB DEFAULT '[]',
        last_active_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mkt_users_phone ON marketplace_users(phone);
      CREATE INDEX IF NOT EXISTS idx_mkt_users_username ON marketplace_users(username);

      -- 8. Advanced ID Verification Requests Table (Meta Blue Badge System)
      CREATE TABLE IF NOT EXISTS marketplace_verification_requests (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(150) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        doc_number VARCHAR(100),
        full_name VARCHAR(150) NOT NULL,
        dob VARCHAR(50),
        doc_front TEXT NOT NULL,
        doc_back TEXT,
        selfie TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        submitted_at BIGINT NOT NULL,
        reviewed_at BIGINT,
        reviewed_by VARCHAR(100)
      );
      CREATE INDEX IF NOT EXISTS idx_mkt_verif_user ON marketplace_verification_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_mkt_verif_status ON marketplace_verification_requests(status);
    `);

    // Seed default admin and system configs if not present
    await seedDefaultDataInPostgres(client);

    // Sync all database users to inMemoryStore so local cache is always pristine and identical to DB
    try {
      const dbUsersRes = await client.query('SELECT * FROM users');
      if (dbUsersRes.rows.length > 0) {
        inMemoryStore.users = dbUsersRes.rows.map(u => ({
          id: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          password_hash: u.password_hash,
          shop_name: u.shop_name,
          business_type: u.business_type,
          address: u.address,
          role: u.role,
          status: u.status,
          subscriptionPlan: u.subscription_plan,
          subscriptionStatus: u.subscription_status,
          subscriptionExpiresAt: Number(u.subscription_expires_at) || 0,
          registered_at: Number(u.registered_at) || 0,
          last_active_at: Number(u.last_active_at) || 0,
          notes: u.notes,
        }));
        saveInMemoryStoreToDisk();
        console.log(`✅ Synced ${dbUsersRes.rows.length} real database user(s) into local store cache.`);
      }
    } catch (syncErr) {
      console.warn('⚠️ Sync DB users to local store warning:', syncErr);
    }

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

    // Seed/Update super admin security config (strictly password + 2FA, no PIN)
    await client.query(`
      INSERT INTO system_config (id, data, updated_at, updated_by)
      VALUES ('super_admin_security', $1, $2, 'usr_super_admin')
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `, [
      JSON.stringify({
        phone: '01306908115',
        email: adminEmail,
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
    banglaQr: {
      isEnabled: true,
      accountTitle: 'TWING হিসাবি / সুপার এডমিন',
      merchantId: '01306908115',
      bankOrMfsName: 'মিউচুয়াল ট্রাস্ট ব্যাংক / বিকাশ বাংলা কিউআর',
      terminalId: 'TWING-BQR-01',
      routingNumber: '',
      qrCodeUrl: '',
      qrPayload: '',
      instructions: 'যেকোনো ব্যাংক বা এমএফএস অ্যাপ (বিকাশ, নগদ, সেলফিন, সিটিটাচ ইত্যাদি) দিয়ে বাংলা কিউআর স্ক্যান করে পেমেন্ট সম্পন্ন করুন এবং ট্রানজেকশন আইডি দিন।',
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

  // Seed default Central Marketplace Categories
  const defaultMarketplaceCategories = [
    { id: 'cat_grocery', name_bn: 'চাল, ডাল ও মুদি', name_en: 'Grocery & Essentials', slug: 'grocery', icon: 'ShoppingBag', sort_order: 1 },
    { id: 'cat_oil_ghee', name_bn: 'তেল ও খাঁটি ঘি', name_en: 'Oil & Pure Ghee', slug: 'oil-ghee', icon: 'Flame', sort_order: 2 },
    { id: 'cat_fashion', name_bn: 'পোশাক ও ফ্যাশন', name_en: 'Clothing & Fashion', slug: 'fashion', icon: 'Shirt', sort_order: 3 },
    { id: 'cat_electronics', name_bn: 'ইলেকট্রনিক্স ও গ্যাজেট', name_en: 'Electronics & Gadgets', slug: 'electronics', icon: 'Smartphone', sort_order: 4 },
    { id: 'cat_beauty', name_bn: 'রূপচর্চা ও প্রসাধন', name_en: 'Beauty & Personal Care', slug: 'beauty', icon: 'Sparkles', sort_order: 5 },
    { id: 'cat_home', name_bn: 'গৃহস্থালী ও রান্নাঘর', name_en: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Home', sort_order: 6 },
    { id: 'cat_health', name_bn: 'স্বাস্থ্য ও মেডিসিন', name_en: 'Health & Pharmacy', slug: 'health', icon: 'HeartPulse', sort_order: 7 },
  ];

  for (const cat of defaultMarketplaceCategories) {
    await client.query(`
      INSERT INTO marketplace_categories (id, name_bn, name_en, slug, icon, sort_order, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [cat.id, cat.name_bn, cat.name_en, cat.slug, cat.icon, cat.sort_order, Date.now()]).catch(() => {});
  }
}

function seedDefaultDataInMemory() {
  const adminEmail = process.env.ADMIN_EMAIL || 'siftibrahim@gmail.com';

  const defaultMarketplaceCategories = [
    { id: 'cat_grocery', name_bn: 'চাল, ডাল ও মুদি', name_en: 'Grocery & Essentials', slug: 'grocery', icon: 'ShoppingBag', sort_order: 1 },
    { id: 'cat_oil_ghee', name_bn: 'তেল ও খাঁটি ঘি', name_en: 'Oil & Pure Ghee', slug: 'oil-ghee', icon: 'Flame', sort_order: 2 },
    { id: 'cat_fashion', name_bn: 'পোশাক ও ফ্যাশন', name_en: 'Clothing & Fashion', slug: 'fashion', icon: 'Shirt', sort_order: 3 },
    { id: 'cat_electronics', name_bn: 'ইলেকট্রনিক্স ও গ্যাজেট', name_en: 'Electronics & Gadgets', slug: 'electronics', icon: 'Smartphone', sort_order: 4 },
    { id: 'cat_beauty', name_bn: 'রূপচর্চা ও প্রসাধন', name_en: 'Beauty & Personal Care', slug: 'beauty', icon: 'Sparkles', sort_order: 5 },
    { id: 'cat_home', name_bn: 'গৃহস্থালী ও রান্নাঘর', name_en: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Home', sort_order: 6 },
    { id: 'cat_health', name_bn: 'স্বাস্থ্য ও মেডিসিন', name_en: 'Health & Pharmacy', slug: 'health', icon: 'HeartPulse', sort_order: 7 },
  ];

  if (!inMemoryStore.marketplace_categories || inMemoryStore.marketplace_categories.length === 0) {
    inMemoryStore.marketplace_categories = defaultMarketplaceCategories.map(c => ({
      id: c.id,
      nameBn: c.name_bn,
      nameEn: c.name_en,
      slug: c.slug,
      icon: c.icon,
      sortOrder: c.sort_order,
      isActive: true,
      createdAt: Date.now(),
    }));
  }

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
    banglaQr: {
      isEnabled: true,
      accountTitle: 'TWING হিসাবি / সুপার এডমিন',
      merchantId: '01306908115',
      bankOrMfsName: 'মিউচুয়াল ট্রাস্ট ব্যাংক / বিকাশ বাংলা কিউআর',
      terminalId: 'TWING-BQR-01',
      routingNumber: '',
      qrCodeUrl: '',
      qrPayload: '',
      instructions: 'যেকোনো ব্যাংক বা এমএফএস অ্যাপ (বিকাশ, নগদ, সেলফিন, সিটিটাচ ইত্যাদি) দিয়ে বাংলা কিউআর স্ক্যান করে পেমেন্ট সম্পন্ন করুন এবং ট্রানজেকশন আইডি দিন।',
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
  if (!Array.isArray(inMemoryStore.admin_activity_logs) || inMemoryStore.admin_activity_logs.length === 0) {
    inMemoryStore.admin_activity_logs = [
      {
        id: 'log_system_init',
        adminEmail: 'siftibrahim@gmail.com',
        action: 'SYSTEM_BOOT',
        targetEntity: 'System',
        targetId: 'system_core',
        targetName: 'TWING হিসাবি ক্লাউড',
        details: 'সুপার অ্যাডমিন সিকিউরিটি, সেন্ট্রাল মার্কেটপ্লেস ও অডিট ইঞ্জিন সক্রিয় করা হয়েছে।',
        timestamp: Date.now() - 3600000,
      },
    ];
  }
  saveInMemoryStoreToDisk();
}

export interface AuditLogEntryInput {
  id?: string;
  adminEmail?: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  targetName?: string;
  details: string;
  timestamp?: number;
}

/**
 * Unified helper to record Super Admin & Staff Audit Logs in both PostgreSQL and Local Persistent Store
 */
export async function recordAdminAuditLog(entry: AuditLogEntryInput): Promise<any> {
  const now = entry.timestamp || Date.now();
  const id = entry.id || `log_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const adminEmail = (entry.adminEmail || 'admin@twing.com').trim();
  const action = (entry.action || 'ADMIN_ACTION').trim();
  const targetEntity = (entry.targetEntity || 'System').trim();
  const targetId = entry.targetId ? String(entry.targetId).trim() : '';
  const targetName = entry.targetName ? String(entry.targetName).trim() : '';
  const details = (entry.details || '').trim();

  const logRecord = {
    id,
    adminEmail,
    action,
    targetEntity,
    targetId,
    targetName,
    details,
    timestamp: now,
  };

  // 1. Always record in inMemoryStore & persist to disk for zero data loss
  try {
    if (!Array.isArray(inMemoryStore.admin_activity_logs)) {
      inMemoryStore.admin_activity_logs = [];
    }
    inMemoryStore.admin_activity_logs = [
      logRecord,
      ...inMemoryStore.admin_activity_logs.filter((x: any) => x && x.id !== id),
    ].slice(0, 500);
    saveInMemoryStoreToDisk();
  } catch (memErr) {
    console.warn('Could not write audit log to inMemoryStore:', memErr);
  }

  // 2. Also insert into PostgreSQL if connected
  const activePool = getDbPool();
  if (activePool) {
    try {
      await activePool.query(
        `INSERT INTO admin_activity_logs (id, admin_email, action, target_entity, target_id, target_name, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [id, adminEmail, action, targetEntity, targetId || null, targetName || null, details, now]
      );
    } catch (dbErr) {
      console.warn('Could not write audit log to PostgreSQL:', dbErr);
    }
  }

  return logRecord;
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

/**
 * Seed initial Central Marketplace Social & Commerce Users with password hashes
 */
export async function seedDefaultMarketplaceUsers(): Promise<void> {
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  const defaultUsers = [
    {
      id: 'user_current',
      name: 'সিফাত রায়হান',
      username: '@sifat_raihan',
      phone: '01711223344',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1200&q=80',
      bio: 'সেন্ট্রাল মার্কেটপ্লেস ক্রেতা ও প্রযুক্তিপ্রেমী 🛍️ | নতুন গ্যাজেট ও অনলাইন শপিং ভালোবাসি।',
      address: 'বাড়ি ১২, রোড ৭, সেক্টর ৪, উত্তরা',
      location: 'উত্তরা, ঢাকা',
      role: 'customer',
      joinedDate: 'মার্চ ২০২৪',
      followersCount: 248,
      followingCount: 112,
      friendsCount: 42,
      friendIds: ['user_tanvir', 'user_nadia'],
      isVerified: true,
      verificationStatus: 'verified',
      verificationData: {
        docType: 'nid',
        docNumber: '19951234567890',
        fullName: 'সিফাত রায়হান',
        dob: '1995-04-12',
        submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        verifiedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
      },
      rating: 4.9,
      totalSales: 18,
      totalOrders: 34,
      blockedUserIds: [],
      twoFactorEnabled: false,
      privacySettings: { postVisibility: 'public', requestVisibility: 'everyone', showPhone: true },
      notificationSettings: { messageSound: true, comments: true, orders: true },
      activeSessions: [
        { id: 'sess_1', deviceName: 'Chrome / Windows 11', ip: '103.114.98.22', loginAt: new Date().toISOString(), isCurrent: true }
      ],
      createdAt: Date.now() - 86400000 * 60,
      updatedAt: Date.now(),
    },
    {
      id: 'user_tanvir',
      name: 'তানভীর আহমেদ',
      username: '@tanvir_gadgets',
      phone: '01812345678',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      bio: 'প্রিমিয়াম গ্যাজেট ও ইলেকট্রনিক্স ডিলার 💻✨ | বিশ্বস্ত কেনাকাটায় টুইংহিসাবি মার্কেটপ্লেস।',
      address: 'দোকান ৪৫, লেভেল ৩, ইসিএস কম্পিউটার সিটি, মাল্টিপ্ল্যান',
      location: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
      role: 'seller',
      joinedDate: 'জানুয়ারি ২০২৪',
      followersCount: 1250,
      followingCount: 89,
      friendsCount: 156,
      friendIds: ['user_current', 'user_shuvo'],
      isVerified: true,
      verificationStatus: 'verified',
      verificationData: {
        docType: 'nid',
        docNumber: '19909876543210',
        fullName: 'তানভীর আহমেদ',
        dob: '1990-11-20',
        submittedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
        verifiedAt: new Date(Date.now() - 86400000 * 59).toISOString(),
      },
      rating: 5.0,
      totalSales: 142,
      totalOrders: 12,
      blockedUserIds: [],
      twoFactorEnabled: true,
      privacySettings: { postVisibility: 'public', requestVisibility: 'everyone', showPhone: true },
      notificationSettings: { messageSound: true, comments: true, orders: true },
      activeSessions: [
        { id: 'sess_tanvir', deviceName: 'iPhone 15 Pro / Safari', ip: '103.114.98.45', loginAt: new Date().toISOString(), isCurrent: true }
      ],
      createdAt: Date.now() - 86400000 * 90,
      updatedAt: Date.now(),
    },
    {
      id: 'user_nadia',
      name: 'নাদিয়া সুলতানা',
      username: '@nadia_crafts',
      phone: '01998877665',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
      bio: 'হ্যান্ডমেড হোম ডেকর ও অর্গানিক কিচেন আইটেমস 🌿🏡 | সারা বাংলাদেশে হোম ডেলিভারি!',
      address: 'ব্লক বি, লালমাটিয়া',
      location: 'মোহাম্মদপুর, ঢাকা',
      role: 'seller',
      joinedDate: 'ফেব্রুয়ারি ২০২৪',
      followersCount: 890,
      followingCount: 310,
      friendsCount: 88,
      friendIds: ['user_current'],
      isVerified: true,
      verificationStatus: 'verified',
      rating: 4.8,
      totalSales: 84,
      totalOrders: 45,
      blockedUserIds: [],
      createdAt: Date.now() - 86400000 * 75,
      updatedAt: Date.now(),
    },
    {
      id: 'user_shuvo',
      name: 'শুভ রহমান',
      username: '@shuvo_fashion',
      phone: '01677889900',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
      bio: 'প্রিমিয়াম ড্রপ শোল্ডার টি-শার্ট ও উইন্টার কালেকশন 👕🔥 | ক্যাশ অন ডেলিভারি সুবিধা।',
      address: 'জিইসি মোড়, চট্টগ্রাম',
      location: 'চট্টগ্রাম',
      role: 'seller',
      joinedDate: 'এপ্রিল ২০২৪',
      followersCount: 520,
      followingCount: 140,
      friendsCount: 35,
      friendIds: ['user_tanvir'],
      isVerified: false,
      verificationStatus: 'pending',
      rating: 4.7,
      totalSales: 39,
      totalOrders: 19,
      blockedUserIds: [],
      createdAt: Date.now() - 86400000 * 45,
      updatedAt: Date.now(),
    },
    {
      id: 'user_ayesha',
      name: 'আয়েশা খাতুন',
      username: '@ayesha_kitchen',
      phone: '01755667788',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
      bio: 'হোমমেড অর্গানিক মশলা ও পিউরিফাইড ঘি 🍯👩‍🍳 | পরিবারের সুস্বাস্থ্য আমাদের অঙ্গীকার।',
      address: 'মিরপুর ১০, ঢাকা',
      location: 'মিরপুর, ঢাকা',
      role: 'seller',
      joinedDate: 'মে ২০২৪',
      followersCount: 640,
      followingCount: 180,
      friendsCount: 55,
      friendIds: [],
      isVerified: true,
      verificationStatus: 'verified',
      rating: 4.9,
      totalSales: 65,
      totalOrders: 28,
      blockedUserIds: [],
      createdAt: Date.now() - 86400000 * 35,
      updatedAt: Date.now(),
    },
    {
      id: 'user_fahim',
      name: 'ফাহিম হাসান',
      username: '@fahim_tech',
      phone: '01899112233',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      coverPhoto: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      bio: 'টেক রিভিউয়ার ও স্মার্ট গ্যাজেট কালেক্টর 📱🎧 | সাশ্রয়ী কেনাকাটায় সবসময় পাশে।',
      address: 'বনানী, ঢাকা',
      location: 'বনানী, ঢাকা',
      role: 'customer',
      joinedDate: 'মার্চ ২০২৪',
      followersCount: 1100,
      followingCount: 220,
      friendsCount: 94,
      friendIds: [],
      isVerified: true,
      verificationStatus: 'verified',
      rating: 4.8,
      totalSales: 48,
      totalOrders: 51,
      blockedUserIds: [],
      createdAt: Date.now() - 86400000 * 50,
      updatedAt: Date.now(),
    },
  ];

  for (const user of defaultUsers) {
    const cleanDigits = user.phone.replace(/[^\d]/g, '').slice(-10);
    const exists = inMemoryStore.marketplace_users.find(
      (u: any) => u.phone && u.phone.replace(/[^\d]/g, '').slice(-10) === cleanDigits
    );
    if (!exists) {
      inMemoryStore.marketplace_users.push(user);
    }
  }

  // Seed default verification requests if empty
  if (!Array.isArray(inMemoryStore.marketplace_verification_requests) || inMemoryStore.marketplace_verification_requests.length === 0) {
    inMemoryStore.marketplace_verification_requests = [
      {
        id: 'verif_shuvo_01',
        userId: 'user_shuvo',
        userName: 'শুভ রহমান',
        userPhone: '01677889900',
        docType: 'nid',
        docNumber: '19985544332211',
        fullName: 'শুভ রহমান',
        dob: '1998-02-14',
        docFront: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
        docBack: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
        selfie: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        status: 'pending',
        adminNotes: 'কাগজপত্র জমা দেওয়া হয়েছে, এনআইডি এবং সেলফি যাচাই প্রক্রিয়াধীন।',
        submittedAt: Date.now() - 3600000 * 4,
      },
    ];
  }

  saveInMemoryStoreToDisk();
}

export function getClean10Digits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '').slice(-10);
}

export async function findMarketplaceUserByPhone(phone: string): Promise<any | null> {
  const digits = getClean10Digits(phone);
  if (!digits) return null;
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }
  const match = inMemoryStore.marketplace_users.find(
    (u: any) => u.phone && getClean10Digits(u.phone) === digits
  );
  if (match) return match;

  const pool = getDbPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM marketplace_users WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = $1 LIMIT 1`,
        [digits]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const u = {
          id: row.id,
          name: row.name,
          username: row.username,
          phone: row.phone,
          password_hash: row.password_hash,
          avatar: row.avatar,
          coverPhoto: row.cover_photo,
          bio: row.bio,
          address: row.address,
          location: row.location,
          role: row.role || 'customer',
          joinedDate: row.joined_date,
          followersCount: row.followers_count || 0,
          followingCount: row.following_count || 0,
          friendsCount: row.friends_count || 0,
          rating: Number(row.rating || 5.0),
          totalSales: row.total_sales || 0,
          totalOrders: row.total_orders || 0,
          isVerified: row.is_verified || false,
          verificationStatus: row.verification_status || 'unverified',
          verificationData: row.verification_data || null,
          twoFactorEnabled: row.two_factor_enabled || false,
          twoFactorPin: row.two_factor_pin,
          privacySettings: row.privacy_settings,
          notificationSettings: row.notification_settings,
          blockedUserIds: row.blocked_user_ids || [],
          friendIds: row.friend_ids || [],
          activeSessions: row.active_sessions || [],
          createdAt: Number(row.created_at || Date.now()),
          updatedAt: Number(row.updated_at || Date.now()),
        };
        inMemoryStore.marketplace_users.push(u);
        return u;
      }
    } catch (e) {
      console.debug('findMarketplaceUserByPhone DB check:', e);
    }
  }
  return null;
}

export async function findMarketplaceUserByUsername(username: string): Promise<any | null> {
  if (!username) return null;
  const cleanU = username.trim().toLowerCase().replace(/^@/, '');
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }
  const match = inMemoryStore.marketplace_users.find(
    (u: any) => u.username && u.username.trim().toLowerCase().replace(/^@/, '') === cleanU
  );
  if (match) return match;

  const pool = getDbPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM marketplace_users WHERE LOWER(REPLACE(username, '@', '')) = $1 LIMIT 1`,
        [cleanU]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      console.debug('findMarketplaceUserByUsername DB notice:', e);
    }
  }
  return null;
}

export async function findMarketplaceUserById(id: string): Promise<any | null> {
  if (!id) return null;
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }
  const match = inMemoryStore.marketplace_users.find((u: any) => u.id === id);
  if (match) return match;

  const pool = getDbPool();
  if (pool) {
    try {
      const res = await pool.query(`SELECT * FROM marketplace_users WHERE id = $1 LIMIT 1`, [id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {}
  }
  return null;
}

export async function saveMarketplaceUser(user: any): Promise<any> {
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }
  const cleanDigits = getClean10Digits(user.phone);
  const existingIdx = inMemoryStore.marketplace_users.findIndex(
    (u: any) => u.id === user.id || (u.phone && getClean10Digits(u.phone) === cleanDigits)
  );

  const merged = {
    ...user,
    updatedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    inMemoryStore.marketplace_users[existingIdx] = {
      ...inMemoryStore.marketplace_users[existingIdx],
      ...merged,
    };
  } else {
    inMemoryStore.marketplace_users.push({
      ...merged,
      createdAt: merged.createdAt || Date.now(),
    });
  }
  saveInMemoryStoreToDisk();

  // Also write to Postgres if connected
  const pool = getDbPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO marketplace_users (
          id, name, username, phone, password_hash, avatar, cover_photo, bio, address, location,
          role, joined_date, followers_count, following_count, friends_count, rating, total_sales,
          total_orders, is_verified, verification_status, verification_data, two_factor_enabled,
          two_factor_pin, privacy_settings, notification_settings, blocked_user_ids, friend_ids,
          active_sessions, last_active_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22,
          $23, $24, $25, $26, $27,
          $28, $29, $30, $31
        ) ON CONFLICT (phone) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          password_hash = COALESCE(EXCLUDED.password_hash, marketplace_users.password_hash),
          avatar = COALESCE(EXCLUDED.avatar, marketplace_users.avatar),
          cover_photo = COALESCE(EXCLUDED.cover_photo, marketplace_users.cover_photo),
          bio = COALESCE(EXCLUDED.bio, marketplace_users.bio),
          address = COALESCE(EXCLUDED.address, marketplace_users.address),
          location = COALESCE(EXCLUDED.location, marketplace_users.location),
          is_verified = EXCLUDED.is_verified,
          verification_status = EXCLUDED.verification_status,
          verification_data = COALESCE(EXCLUDED.verification_data, marketplace_users.verification_data),
          two_factor_enabled = EXCLUDED.two_factor_enabled,
          privacy_settings = COALESCE(EXCLUDED.privacy_settings, marketplace_users.privacy_settings),
          notification_settings = COALESCE(EXCLUDED.notification_settings, marketplace_users.notification_settings),
          blocked_user_ids = COALESCE(EXCLUDED.blocked_user_ids, marketplace_users.blocked_user_ids),
          friend_ids = COALESCE(EXCLUDED.friend_ids, marketplace_users.friend_ids),
          updated_at = EXCLUDED.updated_at`,
        [
          merged.id,
          merged.name,
          merged.username,
          merged.phone,
          merged.password_hash || '',
          merged.avatar || '',
          merged.coverPhoto || '',
          merged.bio || '',
          merged.address || '',
          merged.location || '',
          merged.role || 'customer',
          merged.joinedDate || 'মার্চ ২০২৪',
          merged.followersCount || 0,
          merged.followingCount || 0,
          merged.friendsCount || 0,
          merged.rating || 5.0,
          merged.totalSales || 0,
          merged.totalOrders || 0,
          merged.isVerified || false,
          merged.verificationStatus || 'unverified',
          JSON.stringify(merged.verificationData || null),
          merged.twoFactorEnabled || false,
          merged.twoFactorPin || null,
          JSON.stringify(merged.privacySettings || {}),
          JSON.stringify(merged.notificationSettings || {}),
          JSON.stringify(merged.blockedUserIds || []),
          JSON.stringify(merged.friendIds || []),
          JSON.stringify(merged.activeSessions || []),
          Date.now(),
          merged.createdAt || Date.now(),
          Date.now(),
        ]
      );
    } catch (dbErr) {
      console.warn('saveMarketplaceUser DB error:', dbErr);
    }
  }

  return merged;
}

export function getAllMarketplaceUsersList(): any[] {
  if (!Array.isArray(inMemoryStore.marketplace_users)) {
    inMemoryStore.marketplace_users = [];
  }
  return inMemoryStore.marketplace_users;
}

export async function saveVerificationRequest(record: any): Promise<any> {
  if (!Array.isArray(inMemoryStore.marketplace_verification_requests)) {
    inMemoryStore.marketplace_verification_requests = [];
  }
  const existingIdx = inMemoryStore.marketplace_verification_requests.findIndex((r: any) => r.id === record.id);
  if (existingIdx >= 0) {
    inMemoryStore.marketplace_verification_requests[existingIdx] = {
      ...inMemoryStore.marketplace_verification_requests[existingIdx],
      ...record,
    };
  } else {
    inMemoryStore.marketplace_verification_requests.unshift(record);
  }
  saveInMemoryStoreToDisk();

  const pool = getDbPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO marketplace_verification_requests (
          id, user_id, user_name, user_phone, doc_type, doc_number, full_name, dob,
          doc_front, doc_back, selfie, status, admin_notes, submitted_at, reviewed_at, reviewed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          admin_notes = EXCLUDED.admin_notes,
          reviewed_at = EXCLUDED.reviewed_at,
          reviewed_by = EXCLUDED.reviewed_by`,
        [
          record.id,
          record.userId,
          record.userName,
          record.userPhone,
          record.docType,
          record.docNumber || null,
          record.fullName,
          record.dob || null,
          record.docFront,
          record.docBack || null,
          record.selfie,
          record.status || 'pending',
          record.adminNotes || null,
          record.submittedAt || Date.now(),
          record.reviewedAt || null,
          record.reviewedBy || null,
        ]
      );
    } catch (e) {
      console.warn('saveVerificationRequest DB error:', e);
    }
  }

  return record;
}

export function getVerificationRequestsList(): any[] {
  if (!Array.isArray(inMemoryStore.marketplace_verification_requests)) {
    inMemoryStore.marketplace_verification_requests = [];
  }
  return inMemoryStore.marketplace_verification_requests;
}

