import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();

// Protect with user auth
router.use(authenticateUser);

/**
 * GET /api/transactions - Get all transactions for logged in user (grouped or flat)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { customerId } = req.query;
    const pool = getDbPool();

    if (pool) {
      let queryText = 'SELECT * FROM transactions WHERE user_id = $1';
      const params: any[] = [userId];

      if (customerId) {
        queryText += ' AND customer_id = $2';
        params.push(customerId);
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await pool.query(queryText, params);
      const list = result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        type: row.type,
        amount: parseFloat(row.amount) || 0,
        description: row.description || '',
        date: row.date,
        time: row.time,
        balanceAfter: parseFloat(row.balance_after) || 0,
        paymentMethod: row.payment_method,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
        receiptNo: row.receipt_no,
        subtotal: row.subtotal ? parseFloat(row.subtotal) : undefined,
        discount: row.discount ? parseFloat(row.discount) : undefined,
        netAmount: row.net_amount ? parseFloat(row.net_amount) : undefined,
        paidAmount: row.paid_amount ? parseFloat(row.paid_amount) : undefined,
        dueAmount: row.due_amount ? parseFloat(row.due_amount) : undefined,
        prevBalance: row.prev_balance ? parseFloat(row.prev_balance) : undefined,
        createdAt: Number(row.created_at),
      }));

      // Return both flat list and map by customerId
      const map: Record<string, any[]> = {};
      list.forEach(tx => {
        if (!map[tx.customerId]) map[tx.customerId] = [];
        map[tx.customerId].push(tx);
      });

      return res.json({ transactions: list, transactionsMap: map });
    } else {
      let list = inMemoryStore.transactions.filter(t => t.userId === userId);
      if (customerId) {
        list = list.filter(t => t.customerId === customerId);
      }
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const map: Record<string, any[]> = {};
      list.forEach(tx => {
        if (!map[tx.customerId]) map[tx.customerId] = [];
        map[tx.customerId].push(tx);
      });

      return res.json({ transactions: list, transactionsMap: map });
    }
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/transactions - Add or Update a Transaction (Atomic balance update)
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      id,
      customerId,
      type,
      amount,
      description,
      date,
      time,
      balanceAfter,
      paymentMethod,
      items,
      receiptNo,
      subtotal,
      discount,
      netAmount,
      paidAmount,
      dueAmount,
      prevBalance,
    } = req.body;

    if (!customerId || !type || amount === undefined) {
      return res.status(400).json({ error: 'কাস্টমার, ট্রানজেকশন টাইপ এবং টাকার পরিমাণ আবশ্যক' });
    }

    const txId = id || 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const cleanAmount = parseFloat(amount) || 0;
    const cleanBalanceAfter = parseFloat(balanceAfter) || 0;

    const pool = getDbPool();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Ensure user exists
        await client.query(`
          INSERT INTO users (id, name, phone, email, password_hash, shop_name, subscription_expires_at, registered_at, last_active_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [userId, req.user?.name || 'ইউজার', '01700000000', req.user?.email || `${userId}@app.com`, 'auto_hash', req.user?.shopName || 'দোকান', Date.now() + 3650 * 86400000, Date.now(), Date.now()]);

        // Ensure customer exists if customerId is specified
        if (customerId) {
          const custCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
          if (custCheck.rows.length === 0) {
            await client.query(`
              INSERT INTO customers (id, user_id, name, phone, address, balance, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING
            `, [customerId, userId, 'কাস্টমার', '', '', cleanBalanceAfter, now, now]);
          }
        }

        // Insert / Update transaction
        await client.query(`
          INSERT INTO transactions (
            id, user_id, customer_id, type, amount, description, date, time, balance_after,
            payment_method, items, receipt_no, subtotal, discount, net_amount,
            paid_amount, due_amount, prev_balance, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            date = EXCLUDED.date,
            time = EXCLUDED.time,
            balance_after = EXCLUDED.balance_after,
            payment_method = EXCLUDED.payment_method,
            items = EXCLUDED.items,
            receipt_no = EXCLUDED.receipt_no,
            subtotal = EXCLUDED.subtotal,
            discount = EXCLUDED.discount,
            net_amount = EXCLUDED.net_amount,
            paid_amount = EXCLUDED.paid_amount,
            due_amount = EXCLUDED.due_amount,
            prev_balance = EXCLUDED.prev_balance
        `, [
          txId, userId, customerId, type, cleanAmount, description || '',
          date || new Date().toISOString().split('T')[0],
          time || new Date().toLocaleTimeString(),
          cleanBalanceAfter, paymentMethod || 'cash',
          JSON.stringify(items || []), receiptNo || null,
          subtotal || null, discount || null, netAmount || null,
          paidAmount || null, dueAmount || null, prevBalance || null,
          now
        ]);

        // Update customer's latest balance and updatedAt
        if (customerId) {
          await client.query(`
            UPDATE customers
            SET balance = $1, updated_at = $2
            WHERE id = $3 AND user_id = $4
          `, [cleanBalanceAfter, now, customerId, userId]);
        }

        // Update user total transactions count
        const txCountRes = await client.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
        const totalTx = parseInt(txCountRes.rows[0].count, 10);
        await client.query('UPDATE users SET total_transactions = $1 WHERE id = $2', [totalTx, userId]);

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      // In-memory update
      const newTx = {
        id: txId,
        userId,
        customerId,
        type,
        amount: cleanAmount,
        description: description || '',
        date: date || new Date().toISOString().split('T')[0],
        time: time || new Date().toLocaleTimeString(),
        balanceAfter: cleanBalanceAfter,
        paymentMethod: paymentMethod || 'cash',
        items: items || [],
        receiptNo,
        subtotal,
        discount,
        netAmount,
        paidAmount,
        dueAmount,
        prevBalance,
        createdAt: now,
      };

      const idx = inMemoryStore.transactions.findIndex(t => t.id === txId);
      if (idx >= 0) inMemoryStore.transactions[idx] = newTx;
      else inMemoryStore.transactions.push(newTx);

      const cust = inMemoryStore.customers.find(c => c.id === customerId);
      if (cust) {
        cust.balance = cleanBalanceAfter;
        cust.updatedAt = now;
      }
    }

    return res.json({
      message: '✅ লেনদেন সফলভাবে সংরক্ষিত হয়েছে',
      transaction: {
        id: txId,
        customerId,
        type,
        amount: cleanAmount,
        description: description || '',
        date,
        time,
        balanceAfter: cleanBalanceAfter,
        paymentMethod,
        items,
        receiptNo,
        createdAt: now,
      },
    });
  } catch (err: any) {
    console.error('Error saving transaction:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/transactions/:id - Delete a transaction
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const txId = req.params.id;

    const pool = getDbPool();
    if (pool) {
      await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [txId, userId]);
      
      const countRes = await pool.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
      const totalTx = parseInt(countRes.rows[0].count, 10);
      await pool.query('UPDATE users SET total_transactions = $1 WHERE id = $2', [totalTx, userId]);
    } else {
      inMemoryStore.transactions = inMemoryStore.transactions.filter(t => !(t.id === txId && (t.userId === userId || !t.userId)));
    }

    return res.json({ message: '✅ লেনদেন মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    console.error('Error deleting transaction:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
