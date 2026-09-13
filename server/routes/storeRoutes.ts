import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres } from '../db';
import { AuthenticatedRequest, authenticateUser, optionalAuth } from '../authMiddleware';
import { SubscriptionEngine } from '../services/subscriptionEngine';

const router = Router();

/**
 * GET /api/store/profile
 */
router.get('/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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
      let profileRow = result.rows.length > 0 ? result.rows[0] : null;

      // If store profile not found or has default placeholder, check users table for user-specific data
      if (!profileRow || profileRow.name === 'আমার দোকান' || profileRow.owner === 'দোকান মালিক' || profileRow.phone === '০১XXXXXXXXX') {
        const uRes = await pool.query('SELECT name, phone, shop_name, address FROM users WHERE id = $1', [userId]);
        if (uRes.rows.length > 0) {
          const u = uRes.rows[0];
          const realShopName = u.shop_name || (profileRow && profileRow.name !== 'আমার দোকান' ? profileRow.name : '') || req.user?.shopName || 'আমার দোকান';
          const realOwner = u.name || (profileRow && profileRow.owner !== 'দোকান মালিক' ? profileRow.owner : '') || 'মালিক';
          const realPhone = u.phone || (profileRow && profileRow.phone !== '০১XXXXXXXXX' ? profileRow.phone : '') || '০১৭০০০০০০০০';
          const realAddress = u.address || profileRow?.address || 'বাংলাদেশ';

          if (!profileRow) {
            const storeId = 'store_' + userId;
            try {
              await pool.query(`
                INSERT INTO store_profiles (id, user_id, name, owner, phone, address, currency_symbol, theme_color)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  owner = EXCLUDED.owner,
                  phone = EXCLUDED.phone
              `, [storeId, userId, realShopName, realOwner, realPhone, realAddress, '৳', 'teal']);
            } catch (e) {
              console.warn('Auto-create store profile failed:', e);
            }
          }

          return res.json({
            profile: {
              name: realShopName,
              owner: realOwner,
              phone: realPhone,
              address: realAddress,
              footerNote: profileRow?.footer_note || '',
              currencySymbol: profileRow?.currency_symbol || '৳',
              highDueLimit: profileRow ? (parseFloat(profileRow.high_due_limit) || 5000) : 5000,
              tagadaTemplate: profileRow?.tagada_template || '',
              bkashNumber: profileRow?.bkash_number || '',
              nagadNumber: profileRow?.nagad_number || '',
              rocketNumber: profileRow?.rocket_number || '',
              themeColor: profileRow?.theme_color || 'teal',
              enableSoundEffects: profileRow ? (profileRow.enable_sound_effects !== false) : true,
              printPaperSize: profileRow?.print_paper_size || 'thermal_80',
              showQrOnInvoice: profileRow ? (profileRow.show_qr_on_invoice !== false) : true,
              defaultCreditLimit: profileRow ? (parseFloat(profileRow.default_credit_limit) || 10000) : 10000,
              subscriptionExpiresAt: subExpiresAt,
              subscriptionPlan: subPlan,
              subscriptionStatus: subStatus,
            },
          });
        }
      }

      if (profileRow) {
        return res.json({
          profile: {
            name: profileRow.name,
            owner: profileRow.owner,
            phone: profileRow.phone,
            address: profileRow.address || '',
            footerNote: profileRow.footer_note || '',
            currencySymbol: profileRow.currency_symbol || '৳',
            highDueLimit: parseFloat(profileRow.high_due_limit) || 5000,
            tagadaTemplate: profileRow.tagada_template || '',
            bkashNumber: profileRow.bkash_number || '',
            nagadNumber: profileRow.nagad_number || '',
            rocketNumber: profileRow.rocket_number || '',
            themeColor: profileRow.theme_color || 'teal',
            enableSoundEffects: profileRow.enable_sound_effects !== false,
            printPaperSize: profileRow.print_paper_size || 'thermal_80',
            showQrOnInvoice: profileRow.show_qr_on_invoice !== false,
            defaultCreditLimit: parseFloat(profileRow.default_credit_limit) || 10000,
            subscriptionExpiresAt: subExpiresAt,
            subscriptionPlan: subPlan,
            subscriptionStatus: subStatus,
          },
        });
      }
    } else {
      const s = inMemoryStore.stores.find(x => x.userId === userId);
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

      const memUser = inMemoryStore.users.find(u => u.id === userId);
      if (memUser) {
        const memShopName = memUser.shopName || memUser.shop_name || req.user?.shopName || 'আমার দোকান';
        const memOwner = memUser.name || 'মালিক';
        const memPhone = memUser.phone || '০১৭০০০০০০০০';
        const newStore = {
          id: 'store_' + userId,
          userId,
          name: memShopName,
          owner: memOwner,
          phone: memPhone,
          address: memUser.address || 'বাংলাদেশ',
          currencySymbol: '৳',
          themeColor: 'teal',
          subscriptionExpiresAt: subExpiresAt,
          subscriptionPlan: subPlan,
          subscriptionStatus: subStatus,
        };
        inMemoryStore.stores.push(newStore);
        return res.json({ profile: newStore });
      }
    }

    const fallbackUser = inMemoryStore.users.find(u => u.id === userId);
    return res.json({
      profile: {
        name: fallbackUser?.shopName || fallbackUser?.shop_name || req.user?.shopName || 'আমার দোকান',
        owner: fallbackUser?.name || 'মালিক',
        phone: fallbackUser?.phone || '০১৭০০০০০০০০',
        address: fallbackUser?.address || 'বাংলাদেশ',
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
router.put('/profile', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/sync-all', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
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

// Helper to format DB row to OnlineOrder object
function mapDbRowToOrder(r: any) {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerAddress: r.customer_address || '',
    deliveryArea: r.delivery_area || 'inside_dhaka',
    deliveryCharge: parseFloat(r.delivery_charge) || 0,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
    subtotal: parseFloat(r.subtotal) || 0,
    totalAmount: parseFloat(r.total_amount) || 0,
    paymentMethod: r.payment_method || 'cod',
    paymentStatus: r.payment_status || 'unpaid',
    orderStatus: r.order_status || 'pending',
    trxId: r.trx_id || '',
    senderPhone: r.sender_phone || '',
    paymentAmount: r.payment_amount ? parseFloat(r.payment_amount) : undefined,
    paymentProof: r.payment_proof || '',
    paymentRejectReason: r.payment_reject_reason || '',
    paymentReviewedAt: r.payment_reviewed_at ? parseInt(r.payment_reviewed_at, 10) : undefined,
    notes: r.notes || '',
    courierName: r.courier_name || '',
    courierTrackingCode: r.courier_tracking_code || '',
    codCollectedAmount: r.cod_collected_amount ? parseFloat(r.cod_collected_amount) : undefined,
    collectedAt: r.collected_at ? parseInt(r.collected_at, 10) : undefined,
    createdAt: parseInt(r.created_at, 10) || Date.now(),
    updatedAt: parseInt(r.updated_at, 10) || Date.now(),
  };
}

/**
 * GET /api/store/orders - Get all orders for authenticated vendor
 */
router.get('/orders', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM online_orders WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      const orders = result.rows.map(mapDbRowToOrder);
      return res.json({ orders });
    } else {
      const memoryOrders = (inMemoryStore.online_orders || [])
        .filter((o) => o.userId === userId || !o.userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ orders: memoryOrders });
    }
  } catch (err: any) {
    console.error('Error fetching online orders:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/orders - Place a new customer order (Public or Vendor)
 */
router.post('/orders', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body;
    const pool = getDbPool();

    // Determine target vendor user ID
    let targetUserId = req.user?.userId || body.userId || body.vendorId;

    if (!targetUserId) {
      // Fallback: look up user from DB or inMemoryStore
      if (pool) {
        if (body.storeSlug) {
          const sRes = await pool.query('SELECT user_id FROM store_profiles WHERE id LIKE $1 LIMIT 1', [`%${body.storeSlug}%`]);
          if (sRes.rows.length > 0) targetUserId = sRes.rows[0].user_id;
        }
        if (!targetUserId) {
          const uRes = await pool.query('SELECT id FROM users ORDER BY registered_at ASC LIMIT 1');
          if (uRes.rows.length > 0) targetUserId = uRes.rows[0].id;
        }
      } else {
        if (inMemoryStore.users.length > 0) {
          targetUserId = inMemoryStore.users[0].id;
        }
      }
    }

    if (!targetUserId) {
      targetUserId = 'default_vendor';
    }

    const orderId = body.id || `online_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = body.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
    const customerName = (body.customerName || 'অনলাইন গ্রাহক').trim();
    const customerPhone = (body.customerPhone || '').trim();
    const customerAddress = (body.customerAddress || '').trim();
    const deliveryArea = body.deliveryArea || 'inside_dhaka';
    const deliveryCharge = parseFloat(body.deliveryCharge) || 0;
    const items = Array.isArray(body.items) ? body.items : [];
    const subtotal = parseFloat(body.subtotal) || 0;
    const totalAmount = parseFloat(body.totalAmount) || 0;
    const paymentMethod = body.paymentMethod || 'cod';

    // If customer paid via bKash / Nagad / Rocket, set status to pending_verification so vendor can review!
    let paymentStatus = body.paymentStatus;
    if (!paymentStatus) {
      paymentStatus = paymentMethod === 'cod' ? 'unpaid' : 'pending_verification';
    }

    const orderStatus = body.orderStatus || 'pending';
    const trxId = (body.trxId || '').trim();
    const senderPhone = (body.senderPhone || '').trim();
    const paymentAmount = body.paymentAmount ? parseFloat(body.paymentAmount) : (paymentMethod !== 'cod' ? totalAmount : undefined);
    const paymentProof = body.paymentProof || '';
    const notes = (body.notes || '').trim();
    const now = Date.now();

    if (pool) {
      await pool.query(`
        INSERT INTO online_orders (
          id, user_id, order_number, customer_name, customer_phone, customer_address,
          delivery_area, delivery_charge, items, subtotal, total_amount, payment_method,
          payment_status, order_status, trx_id, sender_phone, payment_amount, payment_proof,
          notes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          customer_address = EXCLUDED.customer_address,
          total_amount = EXCLUDED.total_amount,
          payment_status = EXCLUDED.payment_status,
          trx_id = EXCLUDED.trx_id,
          sender_phone = EXCLUDED.sender_phone,
          updated_at = EXCLUDED.updated_at
      `, [
        orderId, targetUserId, orderNumber, customerName, customerPhone, customerAddress,
        deliveryArea, deliveryCharge, JSON.stringify(items), subtotal, totalAmount, paymentMethod,
        paymentStatus, orderStatus, trxId, senderPhone, paymentAmount || null, paymentProof,
        notes, now, now
      ]);

      // Create notification for vendor
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const payText = paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : `${paymentMethod.toUpperCase()}${trxId ? ` (TrxID: ${trxId})` : ''}`;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          notifId,
          `🛍️ নতুন অনলাইন অর্ডার #${orderNumber}`,
          `গ্রাহক ${customerName} (${customerPhone}) ৳${totalAmount} টাকার অর্ডার দিয়েছেন। পেমেন্ট: ${payText}`,
          'store_order',
          'user',
          targetUserId,
          'high',
          false,
          now
        ]);
      } catch (ne) {
        console.warn('Notification insert notice:', ne);
      }
    } else {
      if (!inMemoryStore.online_orders) inMemoryStore.online_orders = [];
      const orderObj = {
        id: orderId,
        userId: targetUserId,
        orderNumber,
        customerName,
        customerPhone,
        customerAddress,
        deliveryArea,
        deliveryCharge,
        items,
        subtotal,
        totalAmount,
        paymentMethod,
        paymentStatus,
        orderStatus,
        trxId,
        senderPhone,
        paymentAmount,
        paymentProof,
        notes,
        createdAt: now,
        updatedAt: now,
      };
      const existingIdx = inMemoryStore.online_orders.findIndex((o) => o.id === orderId);
      if (existingIdx >= 0) inMemoryStore.online_orders[existingIdx] = orderObj;
      else inMemoryStore.online_orders.unshift(orderObj);
    }

    const createdOrder = {
      id: orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerAddress,
      deliveryArea,
      deliveryCharge,
      items,
      subtotal,
      totalAmount,
      paymentMethod,
      paymentStatus,
      orderStatus,
      trxId,
      senderPhone,
      paymentAmount,
      paymentProof,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    return res.status(201).json({
      message: '✅ নতুন অনলাইন অর্ডার সফলভাবে গ্রহণ করা হয়েছে!',
      order: createdOrder,
    });
  } catch (err: any) {
    console.error('Error creating online order:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/store/orders/:orderId/payment - Vendor verifies (accepts or rejects) payment
 */
router.put('/orders/:orderId/payment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { action, rejectReason } = req.body; // action: 'accept' | 'reject' | 'reset'
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    if (!action || !['accept', 'reject', 'reset'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'accept', 'reject', or 'reset'" });
    }

    let targetPaymentStatus = 'pending_verification';
    let newOrderStatus: string | null = null;
    let finalRejectReason: string | null = null;

    if (action === 'accept') {
      targetPaymentStatus = 'paid';
      // Automatically advance pending orders to confirmed when payment is verified
      newOrderStatus = 'confirmed';
    } else if (action === 'reject') {
      targetPaymentStatus = 'rejected';
      finalRejectReason = (rejectReason || 'ভুল TrxID বা অ্যাকাউন্টে টাকা পাওয়া যায়নি').trim();
    } else if (action === 'reset') {
      targetPaymentStatus = 'pending_verification';
    }

    if (pool) {
      let updateQuery = `
        UPDATE online_orders
        SET payment_status = $1,
            payment_reject_reason = $2,
            payment_reviewed_at = $3,
            updated_at = $4
      `;
      const queryParams: any[] = [targetPaymentStatus, finalRejectReason, now, now];

      if (newOrderStatus) {
        updateQuery += `, order_status = CASE WHEN order_status = 'pending' THEN $5 ELSE order_status END WHERE id = $6 AND user_id = $7 RETURNING *`;
        queryParams.push(newOrderStatus, orderId, userId);
      } else {
        updateQuery += ` WHERE id = $5 AND user_id = $6 RETURNING *`;
        queryParams.push(orderId, userId);
      }

      const result = await pool.query(updateQuery, queryParams);

      if (result.rows.length === 0) {
        // Retry without user_id check in case order was created as default_vendor
        const fallbackRes = await pool.query(
          `UPDATE online_orders SET payment_status = $1, payment_reject_reason = $2, payment_reviewed_at = $3, updated_at = $4 WHERE id = $5 RETURNING *`,
          [targetPaymentStatus, finalRejectReason, now, now, orderId]
        );
        if (fallbackRes.rows.length === 0) {
          return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
        }
        return res.json({
          message: action === 'accept' ? '✅ পেমেন্ট সফলভাবে অনুমোদিত হয়েছে!' : '❌ পেমেন্ট বাতিল/রিজেক্ট করা হয়েছে।',
          order: mapDbRowToOrder(fallbackRes.rows[0]),
        });
      }

      return res.json({
        message: action === 'accept' ? '✅ পেমেন্ট সফলভাবে অনুমোদিত হয়েছে!' : '❌ পেমেন্ট বাতিল/রিজেক্ট করা হয়েছে।',
        order: mapDbRowToOrder(result.rows[0]),
      });
    } else {
      const order = (inMemoryStore.online_orders || []).find((o) => o.id === orderId);
      if (!order) {
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
      }
      order.paymentStatus = targetPaymentStatus;
      order.paymentRejectReason = finalRejectReason || undefined;
      order.paymentReviewedAt = now;
      order.updatedAt = now;
      if (newOrderStatus && order.orderStatus === 'pending') {
        order.orderStatus = newOrderStatus;
      }
      return res.json({
        message: action === 'accept' ? '✅ পেমেন্ট সফলভাবে অনুমোদিত হয়েছে!' : '❌ পেমেন্ট বাতিল/রিজেক্ট করা হয়েছে।',
        order,
      });
    }
  } catch (err: any) {
    console.error('Error updating order payment:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/store/orders/:orderId/status - Vendor updates overall order status
 */
router.put('/orders/:orderId/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      const result = await pool.query(
        'UPDATE online_orders SET order_status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
        [orderStatus, now, orderId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি' });
      }
      return res.json({ order: mapDbRowToOrder(result.rows[0]) });
    } else {
      const order = (inMemoryStore.online_orders || []).find((o) => o.id === orderId);
      if (order) {
        order.orderStatus = orderStatus;
        order.updatedAt = now;
        return res.json({ order });
      }
      return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/store/orders/track/:orderNumber - Customer tracks order and payment status
 */
router.get('/orders/track/:orderNumber', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        'SELECT * FROM online_orders WHERE order_number = $1 OR id = $1 LIMIT 1',
        [orderNumber]
      );
      if (result.rows.length > 0) {
        return res.json({ order: mapDbRowToOrder(result.rows[0]) });
      }
      return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
    } else {
      const order = (inMemoryStore.online_orders || []).find(
        (o) => o.orderNumber === orderNumber || o.id === orderNumber
      );
      if (order) return res.json({ order });
      return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
