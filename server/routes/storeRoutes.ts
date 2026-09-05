import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { SubscriptionEngine } from '../services/subscriptionEngine';

const router = Router();
router.use(authenticateUser);

/**
 * GET /api/store/profile
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    let subExpiresAt = Date.now() + 14 * 86400000;
    let subPlan = '১৪ দিনের ফ্রি ট্রায়াল';
    let subStatus = 'trial';

    if (userId) {
      try {
        const synced = await SubscriptionEngine.recalculateAndSyncUserSubscription(userId);
        subExpiresAt = synced.subscriptionExpiresAt;
        subPlan = synced.subscriptionPlan;
        subStatus = synced.subscriptionStatus;
      } catch (e) {
        // fallback
      }
    }

    if (pool) {
      const result = await pool.query('SELECT * FROM store_profiles WHERE user_id = $1', [userId]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return res.json({
          profile: {
            name: row.name,
            owner: row.owner,
            phone: row.phone,
            address: row.address || '',
            footerNote: row.footer_note || '',
            currencySymbol: row.currency_symbol || '৳',
            highDueLimit: parseFloat(row.high_due_limit) || 5000,
            tagadaTemplate: row.tagada_template || '',
            bkashNumber: row.bkash_number || '',
            nagadNumber: row.nagad_number || '',
            rocketNumber: row.rocket_number || '',
            themeColor: row.theme_color || 'teal',
            enableSoundEffects: row.enable_sound_effects !== false,
            printPaperSize: row.print_paper_size || 'thermal_80',
            showQrOnInvoice: row.show_qr_on_invoice !== false,
            defaultCreditLimit: parseFloat(row.default_credit_limit) || 10000,
            subscriptionExpiresAt: subExpiresAt,
            subscriptionPlan: subPlan,
            subscriptionStatus: subStatus,
          },
        });
      }
    } else {
      const s = inMemoryStore.stores.find(x => x.userId === userId || !x.userId);
      if (s) {
        return res.json({
          profile: {
            ...s,
            subscriptionExpiresAt: subExpiresAt,
            subscriptionPlan: subPlan,
            subscriptionStatus: subStatus,
          },
        });
      }
    }

    return res.json({
      profile: {
        name: req.user?.shopName || 'TWING হিসাবি',
        owner: 'মালিক',
        phone: '০১৭০০০০০০০০',
        address: 'বাংলাদেশ',
        currencySymbol: '৳',
        themeColor: 'teal',
        subscriptionExpiresAt: subExpiresAt,
        subscriptionPlan: subPlan,
        subscriptionStatus: subStatus,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/store/profile - Save or update Store Profile
 */
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      name,
      owner,
      phone,
      address,
      footerNote,
      currencySymbol,
      highDueLimit,
      tagadaTemplate,
      bkashNumber,
      nagadNumber,
      rocketNumber,
      themeColor,
      enableSoundEffects,
      printPaperSize,
      showQrOnInvoice,
      defaultCreditLimit,
    } = req.body;

    const pool = getDbPool();
    const validUserId = pool ? await ensureUserExistsInPostgres(pool, userId, req.user) : userId;
    const storeId = 'store_' + validUserId;

    if (pool) {
      await pool.query(`
        INSERT INTO store_profiles (
          id, user_id, name, owner, phone, address, footer_note, currency_symbol,
          high_due_limit, tagada_template, bkash_number, nagad_number, rocket_number,
          theme_color, enable_sound_effects, print_paper_size, show_qr_on_invoice, default_credit_limit,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          owner = EXCLUDED.owner,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          footer_note = EXCLUDED.footer_note,
          currency_symbol = EXCLUDED.currency_symbol,
          high_due_limit = EXCLUDED.high_due_limit,
          tagada_template = EXCLUDED.tagada_template,
          bkash_number = EXCLUDED.bkash_number,
          nagad_number = EXCLUDED.nagad_number,
          rocket_number = EXCLUDED.rocket_number,
          theme_color = EXCLUDED.theme_color,
          enable_sound_effects = EXCLUDED.enable_sound_effects,
          print_paper_size = EXCLUDED.print_paper_size,
          show_qr_on_invoice = EXCLUDED.show_qr_on_invoice,
          default_credit_limit = EXCLUDED.default_credit_limit,
          updated_at = NOW()
      `, [
        storeId, validUserId, name, owner || name, phone, address || '', footerNote || '',
        currencySymbol || '৳', highDueLimit || 5000, tagadaTemplate || '',
        bkashNumber || '', nagadNumber || '', rocketNumber || '', themeColor || 'teal',
        enableSoundEffects !== false, printPaperSize || 'thermal_80',
        showQrOnInvoice !== false, defaultCreditLimit || 10000
      ]);

      // Update shop_name on users table too
      if (name) {
        await pool.query('UPDATE users SET shop_name = $1 WHERE id = $2', [name, validUserId]);
      }
    } else {
      const idx = inMemoryStore.stores.findIndex(s => s.userId === validUserId || s.id === storeId);
      const profileData = {
        id: storeId,
        userId: validUserId,
        name,
        owner,
        phone,
        address,
        footerNote,
        currencySymbol,
        highDueLimit,
        tagadaTemplate,
        bkashNumber,
        nagadNumber,
        rocketNumber,
        themeColor,
        enableSoundEffects,
        printPaperSize,
        showQrOnInvoice,
        defaultCreditLimit,
      };
      if (idx >= 0) inMemoryStore.stores[idx] = profileData;
      else inMemoryStore.stores.push(profileData);
    }

    return res.json({ message: '✅ দোকান প্রোফাইল সফলভাবে আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/sync-all - Bulk Sync ledger data
 */
router.post('/sync-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { store, customers, transactions, expenses, products } = req.body;
    const pool = getDbPool();

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Ensure User row exists
        await client.query(`
          INSERT INTO users (
            id, name, phone, email, password_hash, shop_name,
            subscription_expires_at, registered_at, last_active_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          userId,
          req.user?.name || 'ব্যবহারকারী',
          '01700000000',
          req.user?.email || `${userId}@app.com`,
          'auto_hash',
          store?.name || req.user?.shopName || 'দোকান',
          Date.now() + 3650 * 86400000,
          Date.now(),
          Date.now()
        ]);

        // 2. Store profile
        if (store) {
          await client.query(`
            INSERT INTO store_profiles (id, user_id, name, owner, phone, address, currency_symbol, theme_color)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              owner = EXCLUDED.owner,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              currency_symbol = EXCLUDED.currency_symbol,
              theme_color = EXCLUDED.theme_color
          `, [
            'store_' + userId,
            userId,
            store.name || 'TWING হিসাবি',
            store.owner || store.name || 'মালিক',
            store.phone || '০১৭০০০০০০০০',
            store.address || '',
            store.currencySymbol || '৳',
            store.themeColor || 'teal'
          ]);
        }

        // 3. Customers
        if (Array.isArray(customers)) {
          for (const c of customers) {
            if (!c || !c.id) continue;
            await client.query(`
              INSERT INTO customers (
                id, user_id, name, phone, address, balance, category, credit_limit, notes, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
              c.id,
              userId,
              c.name || 'কাস্টমার',
              c.phone || '',
              c.address || '',
              parseFloat(c.balance) || 0,
              c.category || 'regular',
              parseFloat(c.creditLimit) || 10000,
              c.notes || '',
              c.createdAt || Date.now(),
              c.updatedAt || Date.now()
            ]);
          }
        }

        // 4. Transactions
        if (transactions) {
          const txList = Array.isArray(transactions) ? transactions : Object.values(transactions).flat();
          for (const tx of txList as any[]) {
            if (!tx || !tx.id) continue;
            await client.query(`
              INSERT INTO transactions (
                id, user_id, customer_id, type, amount, description, date, time, balance_after,
                payment_method, items, receipt_no, subtotal, discount, net_amount,
                paid_amount, due_amount, prev_balance, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
              tx.id,
              userId,
              tx.customerId || null,
              tx.type || 'due',
              parseFloat(tx.amount) || 0,
              tx.description || '',
              tx.date || new Date().toISOString().split('T')[0],
              tx.time || new Date().toLocaleTimeString(),
              parseFloat(tx.balanceAfter) || 0,
              tx.paymentMethod || 'cash',
              JSON.stringify(tx.items || []),
              tx.receiptNo || null,
              tx.subtotal ? parseFloat(tx.subtotal) : null,
              tx.discount ? parseFloat(tx.discount) : null,
              tx.netAmount ? parseFloat(tx.netAmount) : null,
              tx.paidAmount ? parseFloat(tx.paidAmount) : null,
              tx.dueAmount ? parseFloat(tx.dueAmount) : null,
              tx.prevBalance ? parseFloat(tx.prevBalance) : null,
              tx.createdAt || Date.now()
            ]);
          }
        }

        // 5. Expenses
        if (Array.isArray(expenses)) {
          for (const exp of expenses) {
            if (!exp || !exp.id) continue;
            await client.query(`
              INSERT INTO expenses (id, user_id, type, category, amount, description, date, time, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type,
                category = EXCLUDED.category,
                amount = EXCLUDED.amount,
                description = EXCLUDED.description,
                date = EXCLUDED.date,
                time = EXCLUDED.time
            `, [
              exp.id,
              userId,
              exp.type || 'expense',
              exp.category || 'অন্যান্য',
              parseFloat(exp.amount) || 0,
              exp.description || '',
              exp.date || new Date().toISOString().split('T')[0],
              exp.time || new Date().toLocaleTimeString(),
              exp.createdAt || Date.now()
            ]);
          }
        }

        // 6. Products
        if (Array.isArray(products)) {
          for (const p of products) {
            if (!p || !p.name) continue;
            const prodId = p.id || 'prod_' + Math.random().toString(36).substring(2, 8);
            const assignedSku = p.sku ? p.sku.trim() : `PRD-${Date.now().toString().slice(-6)}`;
            await client.query(`
              INSERT INTO products (
                id, user_id, name, category, unit, buy_price, sale_price, stock, min_stock_alert, sku, qr_code, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                unit = EXCLUDED.unit,
                buy_price = EXCLUDED.buy_price,
                sale_price = EXCLUDED.sale_price,
                stock = EXCLUDED.stock,
                min_stock_alert = EXCLUDED.min_stock_alert,
                sku = EXCLUDED.sku,
                qr_code = EXCLUDED.qr_code,
                updated_at = EXCLUDED.updated_at
            `, [
              prodId,
              userId,
              p.name.trim(),
              p.category || 'সাধারণ',
              p.unit || 'পিস',
              parseFloat(p.buyPrice) || 0,
              parseFloat(p.salePrice) || 0,
              parseFloat(p.stock) || 0,
              parseFloat(p.minStockAlert) || 5,
              assignedSku,
              p.qrCode || '',
              p.updatedAt || Date.now()
            ]);
          }
        }

        // Update counts
        const custCountRes = await client.query('SELECT COUNT(*) FROM customers WHERE user_id = $1', [userId]);
        const totalCust = parseInt(custCountRes.rows[0].count, 10);

        const txCountRes = await client.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
        const totalTx = parseInt(txCountRes.rows[0].count, 10);

        await client.query('UPDATE users SET total_customers = $1, total_transactions = $2 WHERE id = $3', [totalCust, totalTx, userId]);

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    return res.json({ message: '✅ সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও সিঙ্ক সফল হয়েছে!' });
  } catch (err: any) {
    console.error('Sync-all error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
