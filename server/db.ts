import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

// Neon PostgreSQL Database Pool
let pool: pg.Pool | null = null;
let isDbConnected = false;

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
};

export function getDbPool(): pg.Pool | null {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_SJpztX3oWI8m@ep-dark-resonance-aygiq6u3-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  if (!dbUrl) {
    console.warn('⚠️ [DB Warning] DATABASE_URL environment variable is not set. Using secure in-memory storage fallback.');
    return null;
  }

  try {
    // Neon PostgreSQL requires SSL
    const isNeonOrCloud = dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production';
    
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isNeonOrCloud ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected PostgreSQL pool error:', err);
    });

    return pool;
  } catch (err) {
    console.error('❌ Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

export async function query(text: string, params?: any[]): Promise<pg.QueryResult<any>> {
  const p = getDbPool();
  if (!p) {
    throw new Error('DATABASE_URL_NOT_CONFIGURED');
  }
  return p.query(text, params);
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
  
  // Seed Super Admin in users table
  await client.query(`
    INSERT INTO users (
      id, name, phone, email, password_hash, shop_name, business_type, address, role, status, subscription_plan, subscription_status, subscription_expires_at, registered_at, last_active_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) ON CONFLICT (email) DO NOTHING;
  `, [
    'usr_super_admin',
    'ইব্রাহিম (সুপার অ্যাডমিন)',
    '01619665875',
    adminEmail,
    defaultPassHash,
    'ইব্রাহিম জেনারেল স্টোর',
    'জেনারেল স্টোর',
    'ঢাকা, বাংলাদেশ',
    'super_admin',
    'active',
    'আজীবন আনলিমিটেড (সুপার অ্যাডমিন)',
    'active',
    Date.now() + 3650 * 86400000,
    Date.now(),
    Date.now(),
  ]);

  // Seed default payment config
  const initialPaymentSettings = {
    id: 'system_payment_settings',
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
          accountName: 'Ibrahim General Store',
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
}

function seedDefaultDataInMemory() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@twing.com';
  inMemoryStore.users = [
    {
      id: 'usr_super_admin',
      name: 'ইব্রাহিম (সুপার অ্যাডমিন)',
      phone: '01619665875',
      email: adminEmail,
      password_hash: '$2a$10$wN35i7t77b8H5hJ9uW7CGeL7O0Zl9KqXgN0vL3Z3zP8M9.5/cKzG', // admin123
      shopName: 'ইব্রাহিম জেনারেল স্টোর',
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
}
