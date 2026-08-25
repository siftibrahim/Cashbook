import { getDbPool } from './db';
import bcrypt from 'bcryptjs';

/**
 * Migrate exported Firebase/Firestore JSON ledger data to PostgreSQL
 */
export async function migrateDataToPostgres(data: {
  users?: any[];
  stores?: any[];
  customers?: any[];
  transactions?: any[];
  expenses?: any[];
  payments?: any[];
  staff?: any[];
}) {
  const pool = getDbPool();
  if (!pool) {
    throw new Error('DATABASE_URL is not configured for PostgreSQL migration');
  }

  const client = await pool.connect();
  const summary = {
    usersMigrated: 0,
    customersMigrated: 0,
    transactionsMigrated: 0,
    expensesMigrated: 0,
    paymentsMigrated: 0,
  };

  try {
    await client.query('BEGIN');

    // 1. Migrate Users
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        const passHash = u.passwordHash || await bcrypt.hash('123456', 10);
        await client.query(`
          INSERT INTO users (
            id, name, phone, email, password_hash, shop_name, business_type, address,
            role, status, subscription_plan, subscription_status, subscription_expires_at,
            registered_at, last_active_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            shop_name = EXCLUDED.shop_name,
            subscription_plan = EXCLUDED.subscription_plan,
            subscription_expires_at = EXCLUDED.subscription_expires_at
        `, [
          u.id || ('usr_' + Date.now()),
          u.name || 'দোকানদার',
          u.phone || '০১৭০০০০০০০০',
          u.email,
          passHash,
          u.shopName || 'জেনারেল স্টোর',
          u.businessType || 'জেনারেল স্টোর',
          u.address || 'বাংলাদেশ',
          u.role || 'user',
          u.status || 'active',
          u.subscriptionPlan || 'ফ্রি ট্রায়াল (১৪ দিন)',
          u.subscriptionStatus || 'trial',
          u.subscriptionExpiresAt || (Date.now() + 14 * 86400000),
          u.registeredAt || Date.now(),
          u.lastActiveAt || Date.now(),
        ]);
        summary.usersMigrated++;
      }
    }

    // 2. Migrate Customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        await client.query(`
          INSERT INTO customers (
            id, user_id, name, phone, address, balance, category, credit_limit, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            balance = EXCLUDED.balance,
            updated_at = EXCLUDED.updated_at
        `, [
          c.id,
          c.userId || 'usr_super_admin',
          c.name,
          c.phone || '',
          c.address || '',
          c.balance || 0,
          c.category || 'regular',
          c.creditLimit || 10000,
          c.notes || '',
          c.createdAt || Date.now(),
          c.updatedAt || Date.now(),
        ]);
        summary.customersMigrated++;
      }
    }

    // 3. Migrate Transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const tx of data.transactions) {
        await client.query(`
          INSERT INTO transactions (
            id, user_id, customer_id, type, amount, description, date, time, balance_after,
            payment_method, items, receipt_no, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            balance_after = EXCLUDED.balance_after
        `, [
          tx.id,
          tx.userId || 'usr_super_admin',
          tx.customerId,
          tx.type,
          tx.amount,
          tx.description || '',
          tx.date,
          tx.time,
          tx.balanceAfter || 0,
          tx.paymentMethod || 'cash',
          JSON.stringify(tx.items || []),
          tx.receiptNo || null,
          tx.createdAt || Date.now(),
        ]);
        summary.transactionsMigrated++;
      }
    }

    // 4. Migrate Expenses
    if (data.expenses && Array.isArray(data.expenses)) {
      for (const e of data.expenses) {
        await client.query(`
          INSERT INTO expenses (id, user_id, type, category, amount, description, date, time, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          e.id,
          e.userId || 'usr_super_admin',
          e.type,
          e.category,
          e.amount,
          e.description || '',
          e.date,
          e.time,
          e.createdAt || Date.now(),
        ]);
        summary.expensesMigrated++;
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration to PostgreSQL completed successfully!', summary);
    return { success: true, summary };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
