import { getDbPool, inMemoryStore, saveInMemoryStoreToDisk } from '../db';
import bcrypt from 'bcryptjs';

export interface DataImportResult {
  success: boolean;
  message: string;
  imported: {
    users: number;
    stores: number;
    customers: number;
    transactions: number;
    expenses: number;
    products: number;
    payments: number;
  };
  postgresSynced: boolean;
}

/**
 * Normalizes user object from either camelCase or snake_case
 */
export function normalizeUser(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || ('usr_' + Math.random().toString(36).substring(2, 9)),
    name: raw.name || raw.shopName || raw.shop_name || 'দোকানদার',
    phone: raw.phone || raw.mobile || '',
    email: raw.email || `${raw.phone || Math.random().toString(36).substring(2, 8)}@user.com`,
    passwordHash: raw.passwordHash || raw.password_hash || '$2a$10$wH1qY6H5lKjN57n.Xf0jMe3U2Y5eW5e.Yq2L5a5b5c5d5e5f5g',
    shopName: raw.shopName || raw.shop_name || raw.name || 'দোকান',
    businessType: raw.businessType || raw.business_type || 'জেনারেল স্টোর',
    address: raw.address || '',
    role: raw.role || 'user',
    status: raw.status || 'active',
    subscriptionPlan: raw.subscriptionPlan || raw.subscription_plan || 'ফ্রি ট্রায়াল (১৪ দিন)',
    subscriptionStatus: raw.subscriptionStatus || raw.subscription_status || 'trial',
    subscriptionExpiresAt: Number(raw.subscriptionExpiresAt || raw.subscription_expires_at) || (Date.now() + 14 * 86400000),
    registeredAt: Number(raw.registeredAt || raw.registered_at) || Date.now(),
    lastActiveAt: Number(raw.lastActiveAt || raw.last_active_at) || Date.now(),
  };
}

/**
 * Normalizes customer object from either camelCase or snake_case
 */
export function normalizeCustomer(raw: any, defaultUserId: string = 'usr_super_admin'): any {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || ('cust_' + Math.random().toString(36).substring(2, 10)),
    userId: raw.userId || raw.user_id || defaultUserId,
    name: raw.name || 'নামহীন কাস্টমার',
    phone: raw.phone || raw.mobile || '',
    address: raw.address || '',
    balance: Number(raw.balance) || 0,
    category: raw.category || 'regular',
    creditLimit: Number(raw.creditLimit || raw.credit_limit) || 10000,
    notes: raw.notes || '',
    createdAt: Number(raw.createdAt || raw.created_at) || Date.now(),
    updatedAt: Number(raw.updatedAt || raw.updated_at) || Date.now(),
  };
}

/**
 * Normalizes transaction object from either camelCase or snake_case
 */
export function normalizeTransaction(raw: any, defaultUserId: string = 'usr_super_admin'): any {
  if (!raw || typeof raw !== 'object') return null;
  const now = Date.now();
  const dateStr = raw.date || new Date(now).toISOString().split('T')[0];
  const timeStr = raw.time || new Date(now).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  let items = raw.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  return {
    id: raw.id || ('tx_' + Math.random().toString(36).substring(2, 11)),
    userId: raw.userId || raw.user_id || defaultUserId,
    customerId: raw.customerId || raw.customer_id || '',
    type: raw.type || (Number(raw.amount) >= 0 ? 'give' : 'get'),
    amount: Math.abs(Number(raw.amount)) || 0,
    description: raw.description || raw.note || raw.details || '',
    date: dateStr,
    time: timeStr,
    balanceAfter: Number(raw.balanceAfter || raw.balance_after) || 0,
    paymentMethod: raw.paymentMethod || raw.payment_method || 'cash',
    items,
    receiptNo: raw.receiptNo || raw.receipt_no || null,
    createdAt: Number(raw.createdAt || raw.created_at) || now,
  };
}

/**
 * Normalizes product object
 */
export function normalizeProduct(raw: any, defaultUserId: string = 'usr_super_admin'): any {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw.id || ('prod_' + Math.random().toString(36).substring(2, 10)),
    userId: raw.userId || raw.user_id || defaultUserId,
    name: raw.name || 'পণ্য',
    price: Number(raw.price) || 0,
    costPrice: Number(raw.costPrice || raw.cost_price) || 0,
    stock: Number(raw.stock) || 0,
    category: raw.category || 'জেনারেল',
    barcode: raw.barcode || '',
    sku: raw.sku || '',
    unit: raw.unit || 'পিস',
    minStockAlert: Number(raw.minStockAlert || raw.min_stock_alert) || 5,
    createdAt: Number(raw.createdAt || raw.created_at) || Date.now(),
    updatedAt: Number(raw.updatedAt || raw.updated_at) || Date.now(),
  };
}

/**
 * Normalizes expense object
 */
export function normalizeExpense(raw: any, defaultUserId: string = 'usr_super_admin'): any {
  if (!raw || typeof raw !== 'object') return null;
  const now = Date.now();
  return {
    id: raw.id || ('exp_' + Math.random().toString(36).substring(2, 10)),
    userId: raw.userId || raw.user_id || defaultUserId,
    type: raw.type || 'expense',
    category: raw.category || 'অন্যান্য',
    amount: Math.abs(Number(raw.amount)) || 0,
    description: raw.description || '',
    date: raw.date || new Date(now).toISOString().split('T')[0],
    time: raw.time || new Date(now).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    createdAt: Number(raw.createdAt || raw.created_at) || now,
  };
}

/**
 * Gets high-level summary of all data in the system
 */
export async function getSystemDataSummary() {
  const pool = getDbPool();
  let dbCounts: Record<string, number> | null = null;

  if (pool) {
    try {
      const res = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM customers) as customers_count,
          (SELECT COUNT(*) FROM transactions) as transactions_count,
          (SELECT COUNT(*) FROM expenses) as expenses_count,
          (SELECT COUNT(*) FROM products) as products_count,
          (SELECT COUNT(*) FROM payments) as payments_count
      `);
      if (res.rows[0]) {
        dbCounts = {
          users: parseInt(res.rows[0].users_count || '0', 10),
          customers: parseInt(res.rows[0].customers_count || '0', 10),
          transactions: parseInt(res.rows[0].transactions_count || '0', 10),
          expenses: parseInt(res.rows[0].expenses_count || '0', 10),
          products: parseInt(res.rows[0].products_count || '0', 10),
          payments: parseInt(res.rows[0].payments_count || '0', 10),
        };
      }
    } catch (err) {
      console.warn('⚠️ Could not query Postgres table counts:', err);
    }
  }

  const localCounts = {
    users: inMemoryStore.users?.length || 0,
    stores: inMemoryStore.stores?.length || 0,
    customers: inMemoryStore.customers?.length || 0,
    transactions: inMemoryStore.transactions?.length || 0,
    expenses: inMemoryStore.expenses?.length || 0,
    products: inMemoryStore.products?.length || 0,
    payments: inMemoryStore.payments?.length || 0,
    sms_logs: inMemoryStore.sms_logs?.length || 0,
    sms_purchases: inMemoryStore.sms_purchases?.length || 0,
  };

  return {
    databaseConnected: !!pool,
    postgresCounts: dbCounts,
    activeCounts: localCounts,
    timestamp: Date.now(),
  };
}

/**
 * Exports complete master backup
 */
export async function exportMasterBackup() {
  return {
    version: '1.0',
    appName: 'Twing Hisabi',
    exportedAt: Date.now(),
    exportedDate: new Date().toISOString(),
    data: {
      users: inMemoryStore.users || [],
      stores: inMemoryStore.stores || [],
      customers: inMemoryStore.customers || [],
      transactions: inMemoryStore.transactions || [],
      expenses: inMemoryStore.expenses || [],
      products: inMemoryStore.products || [],
      payments: inMemoryStore.payments || [],
      system_config: inMemoryStore.system_config || {},
      announcements: inMemoryStore.announcements || [],
    },
  };
}

/**
 * Imports full master backup or bulk tables with merge or replace mode
 */
export async function importMasterBackup(
  payload: any,
  mode: 'merge' | 'replace' = 'merge'
): Promise<DataImportResult> {
  const result: DataImportResult = {
    success: true,
    message: '',
    imported: {
      users: 0,
      stores: 0,
      customers: 0,
      transactions: 0,
      expenses: 0,
      products: 0,
      payments: 0,
    },
    postgresSynced: false,
  };

  // Support both wrapped { data: { ... } } and direct { users: [...], customers: [...] }
  const root = payload?.data ? payload.data : payload;
  if (!root || typeof root !== 'object') {
    throw new Error('অবৈধ ব্যাকআপ ডাটা ফরম্যাট। ব্যাকআপ অবজেক্ট পাওয়া যায়নি।');
  }

  // 1. Process Users
  if (Array.isArray(root.users)) {
    const validUsers = root.users.map(normalizeUser).filter(Boolean);
    if (mode === 'replace') {
      // Keep super admin if not present
      const superAdmin = inMemoryStore.users.find((u) => u.id === 'usr_super_admin' || u.role === 'super_admin');
      inMemoryStore.users = validUsers;
      if (superAdmin && !inMemoryStore.users.some((u) => u.id === superAdmin.id)) {
        inMemoryStore.users.unshift(superAdmin);
      }
    } else {
      for (const u of validUsers) {
        const idx = inMemoryStore.users.findIndex((x) => x.id === u.id || (x.email && x.email === u.email));
        if (idx >= 0) {
          inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...u };
        } else {
          inMemoryStore.users.push(u);
        }
      }
    }
    result.imported.users = validUsers.length;
  }

  // 2. Process Stores
  if (Array.isArray(root.stores)) {
    if (mode === 'replace') {
      inMemoryStore.stores = root.stores;
    } else {
      for (const s of root.stores) {
        const idx = inMemoryStore.stores.findIndex((x) => x.id === s.id);
        if (idx >= 0) inMemoryStore.stores[idx] = { ...inMemoryStore.stores[idx], ...s };
        else inMemoryStore.stores.push(s);
      }
    }
    result.imported.stores = root.stores.length;
  }

  // 3. Process Customers
  if (Array.isArray(root.customers)) {
    const validCustomers = root.customers.map((c: any) => normalizeCustomer(c)).filter(Boolean);
    if (mode === 'replace') {
      inMemoryStore.customers = validCustomers;
    } else {
      for (const c of validCustomers) {
        const idx = inMemoryStore.customers.findIndex((x) => x.id === c.id);
        if (idx >= 0) inMemoryStore.customers[idx] = { ...inMemoryStore.customers[idx], ...c };
        else inMemoryStore.customers.push(c);
      }
    }
    result.imported.customers = validCustomers.length;
  }

  // 4. Process Transactions
  if (Array.isArray(root.transactions)) {
    const validTransactions = root.transactions.map((t: any) => normalizeTransaction(t)).filter(Boolean);
    if (mode === 'replace') {
      inMemoryStore.transactions = validTransactions;
    } else {
      for (const t of validTransactions) {
        const idx = inMemoryStore.transactions.findIndex((x) => x.id === t.id);
        if (idx >= 0) inMemoryStore.transactions[idx] = { ...inMemoryStore.transactions[idx], ...t };
        else inMemoryStore.transactions.push(t);
      }
    }
    result.imported.transactions = validTransactions.length;
  }

  // 5. Process Products
  if (Array.isArray(root.products)) {
    const validProducts = root.products.map((p: any) => normalizeProduct(p)).filter(Boolean);
    if (mode === 'replace') {
      inMemoryStore.products = validProducts;
    } else {
      for (const p of validProducts) {
        const idx = inMemoryStore.products.findIndex((x) => x.id === p.id);
        if (idx >= 0) inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...p };
        else inMemoryStore.products.push(p);
      }
    }
    result.imported.products = validProducts.length;
  }

  // 6. Process Expenses
  if (Array.isArray(root.expenses)) {
    const validExpenses = root.expenses.map((e: any) => normalizeExpense(e)).filter(Boolean);
    if (mode === 'replace') {
      inMemoryStore.expenses = validExpenses;
    } else {
      for (const e of validExpenses) {
        const idx = inMemoryStore.expenses.findIndex((x) => x.id === e.id);
        if (idx >= 0) inMemoryStore.expenses[idx] = { ...inMemoryStore.expenses[idx], ...e };
        else inMemoryStore.expenses.push(e);
      }
    }
    result.imported.expenses = validExpenses.length;
  }

  // 7. System config
  if (root.system_config && typeof root.system_config === 'object') {
    inMemoryStore.system_config = {
      ...inMemoryStore.system_config,
      ...root.system_config,
    };
  }

  // Immediate permanent save to local disk
  saveInMemoryStoreToDisk();

  // Try syncing to Postgres if pool is available
  const pool = getDbPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Sync customers
        for (const c of inMemoryStore.customers) {
          await client.query(`
            INSERT INTO customers (id, user_id, name, phone, address, balance, category, credit_limit, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              balance = EXCLUDED.balance,
              updated_at = EXCLUDED.updated_at
          `, [c.id, c.userId, c.name, c.phone, c.address, c.balance, c.category, c.creditLimit, c.notes, c.createdAt, c.updatedAt]);
        }

        // Sync transactions
        for (const t of inMemoryStore.transactions) {
          await client.query(`
            INSERT INTO transactions (id, user_id, customer_id, type, amount, description, date, time, balance_after, payment_method, items, receipt_no, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              amount = EXCLUDED.amount,
              balance_after = EXCLUDED.balance_after
          `, [t.id, t.userId, t.customerId, t.type, t.amount, t.description, t.date, t.time, t.balanceAfter, t.paymentMethod, JSON.stringify(t.items || []), t.receiptNo, t.createdAt]);
        }

        // Sync products
        for (const p of inMemoryStore.products) {
          await client.query(`
            INSERT INTO products (id, user_id, name, price, cost_price, stock, category, barcode, sku, unit, min_stock_alert, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              price = EXCLUDED.price,
              cost_price = EXCLUDED.cost_price,
              stock = EXCLUDED.stock,
              updated_at = EXCLUDED.updated_at
          `, [p.id, p.userId, p.name, p.price, p.costPrice, p.stock, p.category, p.barcode, p.sku, p.unit, p.minStockAlert, p.createdAt, p.updatedAt]);
        }

        await client.query('COMMIT');
        result.postgresSynced = true;
      } catch (e) {
        await client.query('ROLLBACK');
        console.warn('⚠️ Postgres table sync had a note (data is safely kept in local storage):', e);
      } finally {
        client.release();
      }
    } catch (e) {
      console.warn('⚠️ Postgres client connection note during import:', e);
    }
  }

  result.message = `সফলভাবে ইমপোর্ট হয়েছে: ${result.imported.customers} কাস্টমার, ${result.imported.transactions} লেনদেন, ${result.imported.products} পণ্য, ${result.imported.users} ইউজার।`;
  return result;
}

/**
 * Imports a specific table (e.g. from Neon Table JSON dump or query result)
 */
export async function importSpecificTable(
  tableName: string,
  rawRows: any[],
  mode: 'merge' | 'replace' = 'merge',
  defaultUserId: string = 'usr_super_admin'
): Promise<DataImportResult> {
  if (!Array.isArray(rawRows)) {
    throw new Error('টেবিলের ডাটা একটি অ্যারে (Array) হতে হবে');
  }

  // Auto detect if requested
  let detectedTable = tableName.toLowerCase().trim();
  if (detectedTable === 'auto' && rawRows.length > 0) {
    const sample = rawRows[0];
    if (sample.balance !== undefined || sample.credit_limit !== undefined || sample.creditLimit !== undefined) {
      detectedTable = 'customers';
    } else if (sample.balance_after !== undefined || sample.balanceAfter !== undefined || sample.payment_method !== undefined) {
      detectedTable = 'transactions';
    } else if (sample.price !== undefined || sample.stock !== undefined || sample.cost_price !== undefined) {
      detectedTable = 'products';
    } else if (sample.shop_name !== undefined || sample.shopName !== undefined || sample.subscription_plan !== undefined) {
      detectedTable = 'users';
    } else if (sample.category !== undefined && sample.amount !== undefined) {
      detectedTable = 'expenses';
    } else {
      detectedTable = 'customers';
    }
  }

  const payload: any = {};
  payload[detectedTable] = rawRows;
  return await importMasterBackup(payload, mode);
}

/**
 * Direct Live Database-to-Database Migration (e.g. from Neon PostgreSQL to CockroachDB)
 */
export async function migrateFromRemoteDatabase(sourceUrl: string) {
  const { Pool } = await import('pg');
  const { sanitizePostgresUrl } = await import('../db');
  const cleanUrl = sanitizePostgresUrl(sourceUrl);
  if (!cleanUrl) {
    throw new Error('বৈধ Database Connection URL প্রদান করুন');
  }

  const isLocal = cleanUrl.includes('@localhost') || cleanUrl.includes('@127.0.0.1');
  const srcPool = new Pool({
    connectionString: cleanUrl,
    ssl: !isLocal ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 20000,
  });

  const destPool = getDbPool();
  if (!destPool) {
    throw new Error('বর্তমান ডাটাবেজ (Destination Database) সংযুক্ত নেই');
  }

  const srcClient = await srcPool.connect();
  const summary: Record<string, number> = {
    users: 0,
    customers: 0,
    transactions: 0,
    products: 0,
    expenses: 0,
    payments: 0,
  };

  try {
    // 1. Users
    try {
      const uRes = await srcClient.query('SELECT * FROM users');
      for (const u of uRes.rows) {
        await destPool.query(`
          INSERT INTO users (
            id, name, phone, email, password_hash, shop_name, business_type, address,
            role, status, subscription_plan, subscription_status, subscription_expires_at,
            registered_at, last_active_at, total_customers, total_transactions, sms_balance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
            shop_name = EXCLUDED.shop_name,
            business_type = EXCLUDED.business_type,
            address = EXCLUDED.address,
            subscription_plan = EXCLUDED.subscription_plan,
            subscription_status = EXCLUDED.subscription_status,
            subscription_expires_at = EXCLUDED.subscription_expires_at,
            sms_balance = EXCLUDED.sms_balance
        `, [
          u.id, u.name, u.phone, u.email, u.password_hash || '', u.shop_name, u.business_type, u.address,
          u.role, u.status, u.subscription_plan, u.subscription_status, u.subscription_expires_at,
          u.registered_at, u.last_active_at, u.total_customers || 0, u.total_transactions || 0, u.sms_balance || 20
        ]);
        summary.users++;
      }
    } catch (e: any) {
      console.warn('Source users fetch note:', e.message);
    }

    // 2. Customers
    try {
      const cRes = await srcClient.query('SELECT * FROM customers');
      for (const c of cRes.rows) {
        await destPool.query(`
          INSERT INTO customers (
            id, user_id, name, phone, address, balance, category, credit_limit, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            balance = EXCLUDED.balance,
            category = EXCLUDED.category,
            credit_limit = EXCLUDED.credit_limit,
            notes = EXCLUDED.notes,
            updated_at = EXCLUDED.updated_at
        `, [
          c.id, c.user_id, c.name, c.phone, c.address, c.balance, c.category, c.credit_limit, c.notes, c.created_at, c.updated_at
        ]);
        summary.customers++;
      }
    } catch (e: any) {
      console.warn('Source customers fetch note:', e.message);
    }

    // 3. Transactions
    try {
      const tRes = await srcClient.query('SELECT * FROM transactions');
      for (const t of tRes.rows) {
        await destPool.query(`
          INSERT INTO transactions (
            id, user_id, customer_id, type, amount, description, date, time, balance_after, payment_method, items, receipt_no, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            balance_after = EXCLUDED.balance_after
        `, [
          t.id, t.user_id, t.customer_id, t.type, t.amount, t.description, t.date, t.time, t.balance_after, t.payment_method, JSON.stringify(t.items || []), t.receipt_no, t.created_at
        ]);
        summary.transactions++;
      }
    } catch (e: any) {
      console.warn('Source transactions fetch note:', e.message);
    }

    // 4. Products
    try {
      const pRes = await srcClient.query('SELECT * FROM products');
      for (const p of pRes.rows) {
        await destPool.query(`
          INSERT INTO products (
            id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            buy_price = EXCLUDED.buy_price,
            sale_price = EXCLUDED.sale_price,
            stock = EXCLUDED.stock,
            updated_at = EXCLUDED.updated_at
        `, [
          p.id, p.user_id, p.name, p.category, p.unit, p.buy_price || 0, p.sale_price || 0, p.stock || 0, p.min_stock_alert || 5, p.updated_at || Date.now()
        ]);
        summary.products++;
      }
    } catch (e: any) {
      console.warn('Source products fetch note:', e.message);
    }

    // 5. Expenses
    try {
      const exRes = await srcClient.query('SELECT * FROM expenses');
      for (const ex of exRes.rows) {
        await destPool.query(`
          INSERT INTO expenses (
            id, user_id, type, category, amount, description, date, time, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description
        `, [
          ex.id, ex.user_id, ex.type, ex.category, ex.amount, ex.description, ex.date, ex.time, ex.created_at
        ]);
        summary.expenses++;
      }
    } catch (e: any) {
      console.warn('Source expenses fetch note:', e.message);
    }

    // 6. Payments
    try {
      const payRes = await srcClient.query('SELECT * FROM payments');
      for (const pay of payRes.rows) {
        await destPool.query(`
          INSERT INTO payments (
            id, user_id, user_name, user_phone, sender_phone, sender_number, shop_name, plan_id, plan_name,
            duration_days, bonus_days, amount, payment_method, payment_mode, trx_id, bank_details, status,
            created_at, approved_at, admin_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO NOTHING
        `, [
          pay.id, pay.user_id, pay.user_name, pay.user_phone, pay.sender_phone, pay.sender_number, pay.shop_name,
          pay.plan_id, pay.plan_name, pay.duration_days || 30, pay.bonus_days || 0, pay.amount, pay.payment_method,
          pay.payment_mode, pay.trx_id, JSON.stringify(pay.bank_details || {}), pay.status, pay.created_at,
          pay.approved_at, pay.admin_notes
        ]);
        summary.payments++;
      }
    } catch (e: any) {
      console.warn('Source payments fetch note:', e.message);
    }

  } finally {
    srcClient.release();
    try { await srcPool.end(); } catch {}
  }

  return {
    success: true,
    message: `মাইগ্রেশন সফল! ${summary.users} ইউজার, ${summary.customers} কাস্টমার, ${summary.transactions} লেনদেন, ${summary.products} পণ্য, ${summary.expenses} খরচ CockroachDB-তে স্থানান্তরিত হয়েছে।`,
    summary,
  };
}
