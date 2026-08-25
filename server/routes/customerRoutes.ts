import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();

// Protect all customer routes with user authentication
router.use(authenticateUser);

/**
 * GET /api/customers - List all customers for logged in user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM customers WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      const customers = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone || '',
        address: row.address || '',
        balance: parseFloat(row.balance) || 0,
        category: row.category || 'regular',
        creditLimit: parseFloat(row.credit_limit) || 10000,
        notes: row.notes || '',
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }));
      return res.json({ customers });
    } else {
      const list = inMemoryStore.customers
        .filter(c => c.userId === userId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return res.json({ customers: list });
    }
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/customers - Add or Update Customer
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, name, phone, address, balance, category, creditLimit, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'কাস্টমারের নাম আবশ্যক' });
    }

    const customerId = id || 'cust_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const cleanBalance = parseFloat(balance) || 0;
    const cleanCreditLimit = parseFloat(creditLimit) || 10000;

    const pool = getDbPool();
    if (pool) {
      await pool.query(`
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
        customerId, userId, name.trim(), phone || '', address || '',
        cleanBalance, category || 'regular', cleanCreditLimit, notes || '',
        now, now
      ]);

      // Update total customers count on user
      const countRes = await pool.query('SELECT COUNT(*) FROM customers WHERE user_id = $1', [userId]);
      const totalCust = parseInt(countRes.rows[0].count, 10);
      await pool.query('UPDATE users SET total_customers = $1 WHERE id = $2', [totalCust, userId]);
    } else {
      const idx = inMemoryStore.customers.findIndex(c => c.id === customerId);
      const custObj = {
        id: customerId,
        userId,
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        balance: cleanBalance,
        category: category || 'regular',
        creditLimit: cleanCreditLimit,
        notes: notes || '',
        createdAt: idx >= 0 ? inMemoryStore.customers[idx].createdAt : now,
        updatedAt: now,
      };

      if (idx >= 0) {
        inMemoryStore.customers[idx] = custObj;
      } else {
        inMemoryStore.customers.push(custObj);
      }
    }

    return res.json({
      message: '✅ কাস্টমার তথ্য সংরক্ষিত হয়েছে',
      customer: {
        id: customerId,
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        balance: cleanBalance,
        category: category || 'regular',
        creditLimit: cleanCreditLimit,
        notes: notes || '',
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (err: any) {
    console.error('Error saving customer:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/customers/:id - Delete Customer and their transactions
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const customerId = req.params.id;

    const pool = getDbPool();
    if (pool) {
      // Cascading delete deletes transactions automatically
      await pool.query('DELETE FROM customers WHERE id = $1 AND user_id = $2', [customerId, userId]);
      await pool.query('DELETE FROM transactions WHERE customer_id = $1 AND user_id = $2', [customerId, userId]);
      
      const countRes = await pool.query('SELECT COUNT(*) FROM customers WHERE user_id = $1', [userId]);
      const totalCust = parseInt(countRes.rows[0].count, 10);
      await pool.query('UPDATE users SET total_customers = $1 WHERE id = $2', [totalCust, userId]);
    } else {
      inMemoryStore.customers = inMemoryStore.customers.filter(c => !(c.id === customerId && (c.userId === userId || !c.userId)));
      inMemoryStore.transactions = inMemoryStore.transactions.filter(t => !(t.customerId === customerId && (t.userId === userId || !t.userId)));
    }

    return res.json({ message: '✅ কাস্টমার এবং তার সকল লেনদেন ডিলিট করা হয়েছে' });
  } catch (err: any) {
    console.error('Error deleting customer:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
