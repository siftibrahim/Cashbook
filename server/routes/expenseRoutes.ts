import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/expenses
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      const expenses = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        category: row.category,
        amount: parseFloat(row.amount) || 0,
        description: row.description || '',
        date: row.date,
        time: row.time,
        createdAt: Number(row.created_at),
      }));
      return res.json({ expenses });
    } else {
      const list = inMemoryStore.expenses
        .filter(e => e.userId === userId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.json({ expenses: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/expenses - Add or update expense
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, type, category, amount, description, date, time } = req.body;

    const expId = id || 'exp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const cleanAmount = parseFloat(amount) || 0;

    const pool = getDbPool();
    if (pool) {
      const validUserId = await ensureUserExistsInPostgres(pool, userId, req.user);
      await pool.query(`
        INSERT INTO expenses (id, user_id, type, category, amount, description, date, time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          date = EXCLUDED.date,
          time = EXCLUDED.time
      `, [expId, validUserId, type, category, cleanAmount, description || '', date, time, now]);
    } else {
      const newExp = {
        id: expId,
        userId,
        type,
        category,
        amount: cleanAmount,
        description: description || '',
        date,
        time,
        createdAt: now,
      };
      const idx = inMemoryStore.expenses.findIndex(e => e.id === expId);
      if (idx >= 0) inMemoryStore.expenses[idx] = newExp;
      else inMemoryStore.expenses.push(newExp);
    }

    return res.json({ message: '✅ খরচ/আয় সংরক্ষিত হয়েছে', id: expId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const expId = req.params.id;
    const pool = getDbPool();

    if (pool) {
      await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [expId, userId]);
    } else {
      inMemoryStore.expenses = inMemoryStore.expenses.filter(e => !(e.id === expId && (e.userId === userId || !e.userId)));
    }

    return res.json({ message: '✅ এন্ট্রি মুছে ফেলা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
