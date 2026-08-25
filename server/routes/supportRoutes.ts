import { Router, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/support/messages - Get support message history for logged-in user
 */
router.get('/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM support_messages WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      );
      const messages = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        shopName: row.shop_name,
        sender: row.sender,
        senderName: row.sender_name,
        text: row.text,
        createdAt: Number(row.created_at),
        isReadByAdmin: row.is_read_by_admin,
        isReadByUser: row.is_read_by_user,
      }));

      // Mark messages as read by user
      await pool.query('UPDATE support_messages SET is_read_by_user = TRUE WHERE user_id = $1', [userId]);

      return res.json({ messages });
    } else {
      const list = inMemoryStore.support_messages
        .filter(m => m.userId === userId)
        .sort((a, b) => a.createdAt - b.createdAt);
      list.forEach(m => { m.isReadByUser = true; });
      return res.json({ messages: list });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/support/send - Send a support message from user
 */
router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'মেসেজের বিবরণ লিখুন' });
    }

    const msgId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    const cleanText = text.trim();

    const pool = getDbPool();
    let userName = req.user?.email || 'User';
    let userPhone = '';
    let shopName = req.user?.shopName || 'Shop';

    if (pool) {
      const uRes = await pool.query('SELECT name, phone, shop_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        userName = uRes.rows[0].name;
        userPhone = uRes.rows[0].phone;
        shopName = uRes.rows[0].shop_name;
      }

      await pool.query(`
        INSERT INTO support_messages (
          id, user_id, user_name, user_phone, shop_name, sender, sender_name, text,
          is_read_by_admin, is_read_by_user, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        msgId, userId, userName, userPhone, shopName, 'user', userName, cleanText,
        false, true, now
      ]);
    } else {
      inMemoryStore.support_messages.push({
        id: msgId,
        userId,
        userName,
        userPhone,
        shopName,
        sender: 'user',
        senderName: userName,
        text: cleanText,
        isReadByAdmin: false,
        isReadByUser: true,
        createdAt: now,
      });
    }

    return res.json({
      message: '✅ মেসেজ পাঠানো হয়েছে',
      supportMessage: {
        id: msgId,
        userId,
        userName,
        userPhone,
        shopName,
        sender: 'user',
        senderName: userName,
        text: cleanText,
        createdAt: now,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
