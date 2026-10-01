import { Router, Response } from 'express';
import { getDbPool, inMemoryStore, ensureUserExistsInPostgres, saveInMemoryStoreToDisk, ensureOnlineOrdersSchema } from '../db';
import { AuthenticatedRequest, authenticateUser, optionalAuth } from '../authMiddleware';
import { SubscriptionEngine } from '../services/subscriptionEngine';
import { validateStoreSlug, cleanDomainString } from '../utils/domainResolver';
import { realtimeEvents } from '../services/realtimeEvents';
import { sendSmsNotification, deductVendorSmsAndSend } from '../services/smsService';

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
  const isMarketplaceOrder = r.order_source === 'marketplace' || Boolean(r.master_order_id);
  const totalAmount = parseFloat(r.total_amount) || 0;
  const paymentStatus = r.payment_status || 'unpaid';
  const rawPaidAmount = r.paid_amount !== undefined && r.paid_amount !== null ? parseFloat(r.paid_amount) : 0;
  const paidAmount = rawPaidAmount > 0 ? rawPaidAmount : (paymentStatus === 'paid' ? totalAmount : 0);
  const rawDueAmount = r.due_amount !== undefined && r.due_amount !== null ? parseFloat(r.due_amount) : 0;
  const dueAmount = paymentStatus === 'paid' ? 0 : (rawDueAmount > 0 ? rawDueAmount : Math.max(0, totalAmount - paidAmount));

  return {
    id: r.id,
    orderNumber: r.order_number,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerAddress: r.customer_address || '',
    deliveryArea: r.delivery_area || 'inside_dhaka',
    deliveryCharge: parseFloat(r.delivery_charge) || 0,
    discountAmount: parseFloat(r.discount_amount) || 0,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
    subtotal: parseFloat(r.subtotal) || 0,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod: r.payment_method || 'cod',
    paymentStatus,
    orderStatus: r.order_status || 'pending',
    orderSource: isMarketplaceOrder ? 'marketplace' : 'direct_store',
    masterOrderId: r.master_order_id,
    vendorPayoutStatus: r.vendor_payout_status || 'unsettled',
    adminApprovalStatus: isMarketplaceOrder ? (r.admin_approval_status || 'pending_approval') : 'not_required',
    isAdminApproved: isMarketplaceOrder ? (r.is_admin_approved === true) : true,
    isLockedForVendor: isMarketplaceOrder ? (r.is_admin_approved !== true) : false,
    isRejectedByAdmin: r.is_rejected_by_admin === true,
    isHiddenFromVendor: r.is_hidden_from_vendor === true,
    trxId: r.trx_id || '',
    senderPhone: r.sender_phone || '',
    paymentAmount: r.payment_amount ? parseFloat(r.payment_amount) : undefined,
    paymentProof: r.payment_proof || '',
    paymentRejectReason: r.payment_reject_reason || '',
    paymentReviewedAt: r.payment_reviewed_at ? parseInt(r.payment_reviewed_at, 10) : undefined,
    notes: r.notes || '',
    courierName: r.courier_name || '',
    courierTrackingCode: r.courier_tracking_code || '',
    deliveryManName: r.delivery_man_name || '',
    deliveryManPhone: r.delivery_man_phone || '',
    estimatedDeliveryDate: r.estimated_delivery_date || '',
    deliveryNote: r.delivery_note || '',
    vendorNote: r.vendor_note || '',
    codCollectedAmount: r.cod_collected_amount ? parseFloat(r.cod_collected_amount) : undefined,
    collectedAt: r.collected_at ? parseInt(r.collected_at, 10) : undefined,
    isStockAdjusted: r.is_stock_adjusted === true,
    isLedgerSynced: r.is_ledger_synced === true,
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
      await ensureOnlineOrdersSchema(pool);

      const result = await pool.query(
        'SELECT * FROM online_orders WHERE user_id = $1 AND is_hidden_from_vendor IS NOT TRUE AND is_rejected_by_admin IS NOT TRUE ORDER BY created_at DESC',
        [userId]
      );
      const orders = result.rows.map(mapDbRowToOrder);
      return res.json({ orders });
    } else {
      const memoryOrders = (inMemoryStore.online_orders || [])
        .filter((o) => o.userId === userId && !o.isHiddenFromVendor && !o.isRejectedByAdmin)
        .map((o) => {
          const isMkt = o.orderSource === 'marketplace' || Boolean(o.masterOrderId);
          return {
            ...o,
            orderSource: isMkt ? 'marketplace' : 'direct_store',
            isAdminApproved: isMkt ? Boolean(o.isAdminApproved) : true,
            isLockedForVendor: isMkt ? (o.isAdminApproved !== true) : false,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      return res.json({ orders: memoryOrders });
    }
  } catch (err: any) {
    console.error('Error fetching online orders:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/store/online-config - Get logged-in vendor's online store configuration
 */
router.get('/online-config', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      // Auto-heal schema if missing on older DBs
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online_store_allowed BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_status VARCHAR(50) DEFAULT 'disabled';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_requested_at BIGINT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS online_store_note TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'আমার দোকান';
      `).catch(() => {});

      let result: any = { rows: [] };
      try {
        result = await pool.query('SELECT * FROM online_store_configs WHERE user_id = $1', [userId]);
      } catch (err: any) {
        console.warn('Warning querying online_store_configs:', err?.message);
      }

      let u: any = {};
      try {
        const uRes = await pool.query(
          'SELECT shop_name, phone, address, name, role, is_online_store_allowed, online_store_status, online_store_requested_at, online_store_note, store_slug FROM users WHERE id = $1',
          [userId]
        );
        u = uRes.rows[0] || {};
      } catch {
        try {
          const uRes = await pool.query(
            'SELECT shop_name, phone, address, name, role, is_online_store_allowed, online_store_status, online_store_requested_at, online_store_note FROM users WHERE id = $1',
            [userId]
          );
          u = uRes.rows[0] || {};
        } catch {
          const uRes = await pool.query('SELECT shop_name, phone, address, name, role FROM users WHERE id = $1', [userId]).catch(() => ({ rows: [] }));
          u = uRes.rows[0] || {};
        }
      }
      const isSuperAdmin = (u.role === 'super_admin' || req.user?.role === 'super_admin' || userId === 'usr_super_admin');
      const isAllowed = isSuperAdmin ? true : (u.is_online_store_allowed === true);
      const adminStatus = isSuperAdmin ? 'active' : (u.online_store_status || (isAllowed ? 'active' : 'disabled'));
      const adminNote = u.online_store_note || '';

      if (result.rows.length > 0) {
        const r = result.rows[0];
        return res.json({
          config: {
            isEnabled: r.is_enabled !== false,
            storeSlug: r.store_slug || u.store_slug,
            storeName: r.store_name || u.shop_name || 'আমার দোকান',
            tagline: r.tagline || '',
            category: r.category || 'general',
            phone: r.phone || u.phone || '',
            whatsappPhone: r.whatsapp_phone || u.phone || '',
            address: r.address || u.address || '',
            customDomain: r.custom_domain || '',
            customDomainVerified: Boolean(r.custom_domain_verified),
            customDomainStatus: r.custom_domain_status || 'pending',
            customDomainVerifiedAt: r.custom_domain_verified_at ? Number(r.custom_domain_verified_at) : undefined,
            themeColor: r.theme_color || 'teal',
            announcement: r.announcement || '',
            deliveryInsideDhaka: parseFloat(r.delivery_inside_dhaka) || 60,
            deliveryOutsideDhaka: parseFloat(r.delivery_outside_dhaka) || 120,
            freeDeliveryAbove: r.free_delivery_above ? parseFloat(r.free_delivery_above) : undefined,
            minOrderAmount: r.min_order_amount ? parseFloat(r.min_order_amount) : undefined,
            deliveryTimeEstimate: r.delivery_time_estimate || '২-৩ কর্মদিবস',
            acceptCOD: r.accept_cod !== false,
            acceptBkash: Boolean(r.accept_bkash),
            bkashNumber: r.bkash_number || '',
            bkashType: r.bkash_type || 'personal',
            acceptNagad: Boolean(r.accept_nagad),
            nagadNumber: r.nagad_number || '',
            nagadType: r.nagad_type || 'personal',
            acceptRocket: Boolean(r.accept_rocket),
            rocketNumber: r.rocket_number || '',
            rocketType: r.rocket_type || 'personal',
            acceptUpay: Boolean(r.accept_upay),
            upayNumber: r.upay_number || '',
            upayType: r.upay_type || 'personal',
            acceptBank: Boolean(r.accept_bank),
            bankName: r.bank_name || '',
            bankAccountName: r.bank_account_name || '',
            bankAccountNumber: r.bank_account_number || '',
            bankBranchName: r.bank_branch_name || '',
            bankRoutingNumber: r.bank_routing_number || '',
            vendorPaymentQrUrl: r.vendor_payment_qr_url || '',
            acceptBanglaQr: r.accept_bangla_qr !== false,
            banglaQrNumber: r.bangla_qr_number || '',
            paymentInstructions: r.payment_instructions || '',
            bannerUrl: r.banner_url || '',
            bannerTitle: r.banner_title || '',
            bannerSubtitle: r.banner_subtitle || '',
            bannerTag: r.banner_tag || '',
            bannerDiscountText: r.banner_discount_text || '',
            bannerStyle: r.banner_style || 'gradient',
            banners: Array.isArray(r.banners)
              ? r.banners
              : (typeof r.banners === 'string' ? JSON.parse(r.banners || '[]') : []),
            logoUrl: r.logo_url || '',
            supportWhatsAppMessage: r.support_whatsapp_message || '',
            supportHours: r.support_hours || '',
            facebookUrl: r.facebook_url || '',
            publishedProductIds: Array.isArray(r.published_product_ids)
              ? r.published_product_ids
              : (typeof r.published_product_ids === 'string' ? JSON.parse(r.published_product_ids) : []),
            deletedDemoProductIds: Array.isArray(r.deleted_demo_product_ids)
              ? r.deleted_demo_product_ids
              : (typeof r.deleted_demo_product_ids === 'string' ? JSON.parse(r.deleted_demo_product_ids || '[]') : []),
            includeDemoProducts: r.include_demo_products !== false,
            isStoreAllowedByAdmin: isAllowed,
            adminStoreStatus: adminStatus,
            adminStoreNote: adminNote,
            createdAt: Number(r.created_at),
            updatedAt: Number(r.updated_at),
          },
        });
      }

      // Default if not saved yet
      const defShop = u.shop_name || req.user?.shopName || 'আমার দোকান';
      const autoSlug = u.store_slug || (defShop.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `store-${userId?.slice(-4)}`);

      return res.json({
        config: {
          isEnabled: true,
          storeSlug: autoSlug,
          storeName: defShop,
          tagline: 'আপনার বিশ্বস্ত অনলাইন শপ',
          category: 'general',
          phone: u.phone || '',
          whatsappPhone: u.phone || '',
          address: u.address || '',
          themeColor: 'teal',
          deliveryInsideDhaka: 60,
          deliveryOutsideDhaka: 120,
          acceptCOD: true,
          acceptBkash: false,
          acceptNagad: false,
          acceptRocket: false,
          bannerStyle: 'gradient',
          publishedProductIds: [],
          deletedDemoProductIds: [],
          includeDemoProducts: true,
          isStoreAllowedByAdmin: isAllowed,
          adminStoreStatus: adminStatus,
          adminStoreNote: adminNote,
        },
      });
    } else {
      const memUser = inMemoryStore.users.find((u) => u.id === userId);
      const isSuperAdmin = (memUser?.role === 'super_admin' || req.user?.role === 'super_admin' || userId === 'usr_super_admin');
      const isAllowed = isSuperAdmin ? true : (memUser?.isOnlineStoreAllowed === true);
      const adminStatus = isSuperAdmin ? 'active' : (memUser?.onlineStoreStatus || (isAllowed ? 'active' : 'disabled'));
      const adminNote = memUser?.onlineStoreNote || '';

      const found = (inMemoryStore.online_store_configs || []).find((c) => (c.userId || c.user_id) === userId);
      if (found) {
        return res.json({
          config: {
            ...found,
            deletedDemoProductIds: found.deletedDemoProductIds || found.deleted_demo_product_ids || [],
            includeDemoProducts: found.includeDemoProducts !== false && found.include_demo_products !== false,
            isStoreAllowedByAdmin: isAllowed,
            adminStoreStatus: adminStatus,
            adminStoreNote: adminNote,
          }
        });
      }

      const defShop = memUser?.shopName || req.user?.shopName || 'আমার দোকান';
      const autoSlug = memUser?.storeSlug || (defShop.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `store-${userId?.slice(-4)}`);

      return res.json({
        config: {
          isEnabled: true,
          storeSlug: autoSlug,
          storeName: defShop,
          tagline: 'আপনার বিশ্বস্ত অনলাইন শপ',
          category: 'general',
          phone: memUser?.phone || '',
          whatsappPhone: memUser?.phone || '',
          address: memUser?.address || '',
          themeColor: 'teal',
          deliveryInsideDhaka: 60,
          deliveryOutsideDhaka: 120,
          acceptCOD: true,
          acceptBkash: false,
          acceptNagad: false,
          acceptRocket: false,
          bannerStyle: 'gradient',
          publishedProductIds: [],
          isStoreAllowedByAdmin: isAllowed,
          adminStoreStatus: adminStatus,
          adminStoreNote: adminNote,
        },
      });
    }
  } catch (err: any) {
    console.error('Error fetching online store config:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/request-activation
 * User requests Super Admin to activate their Online Store
 */
router.post('/request-activation', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { note } = req.body || {};
    const pool = getDbPool();
    const now = Date.now();
    const userNote = note ? String(note).trim().slice(0, 500) : 'ইউজার অনলাইন স্টোর চালুর আবেদন করেছেন';

    if (pool) {
      const uRes = await pool.query('SELECT name, shop_name, phone FROM users WHERE id = $1', [userId]);
      const u = uRes.rows[0] || {};

      await pool.query(`
        UPDATE users SET
          online_store_status = 'requested',
          online_store_requested_at = $1,
          online_store_note = $2
        WHERE id = $3
      `, [now, userNote, userId]);

      await pool.query(`
        UPDATE online_store_configs SET
          admin_store_status = 'requested',
          admin_store_note = $1
        WHERE user_id = $2
      `, [userNote, userId]).catch(() => {});

      // Create Admin Notification
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, priority, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'notif_store_req_' + now,
        '🛍️ নতুন অনলাইন স্টোর অ্যাক্টিভেশন রিকোয়েস্ট!',
        `${u.shop_name || u.name || 'একজন ইউজার'} (${u.phone || userId}) অনলাইন স্টোর চালুর আবেদন করেছেন। নোট: ${userNote}`,
        'system',
        'admin',
        'high',
        false,
        now,
      ]).catch(() => {});
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u) {
        u.onlineStoreStatus = 'requested';
        u.onlineStoreRequestedAt = now;
        u.onlineStoreNote = userNote;
      }
      const c = (inMemoryStore.online_store_configs || []).find(x => (x.userId || x.user_id) === userId);
      if (c) {
        c.adminStoreStatus = 'requested';
        c.adminStoreNote = userNote;
      }
    }

    return res.json({
      message: '✅ আপনার অনলাইন স্টোর চালুর রিকোয়েস্ট সফলভাবে সুপার অ্যাডমিনের কাছে পাঠানো হয়েছে! পর্যালোচনার পর এটি সক্রিয় করা হবে।',
      onlineStoreStatus: 'requested',
      onlineStoreRequestedAt: now,
    });
  } catch (err: any) {
    console.error('Error requesting online store activation:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/cancel-request
 * User cancels their pending store activation request
 */
router.post('/cancel-request', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE users SET
          online_store_status = 'disabled',
          online_store_note = 'ইউজার আবেদন প্রত্যাহার করেছেন'
        WHERE id = $1 AND online_store_status = 'requested'
      `, [userId]);

      await pool.query(`
        UPDATE online_store_configs SET
          admin_store_status = 'disabled',
          admin_store_note = 'ইউজার আবেদন প্রত্যাহার করেছেন'
        WHERE user_id = $1
      `, [userId]).catch(() => {});
    } else {
      const u = inMemoryStore.users.find(x => x.id === userId);
      if (u && u.onlineStoreStatus === 'requested') {
        u.onlineStoreStatus = 'disabled';
        u.onlineStoreNote = 'ইউজার আবেদন প্রত্যাহার করেছেন';
      }
      const c = (inMemoryStore.online_store_configs || []).find(x => (x.userId || x.user_id) === userId);
      if (c) {
        c.adminStoreStatus = 'disabled';
        c.adminStoreNote = 'ইউজার আবেদন প্রত্যাহার করেছেন';
      }
    }

    return res.json({
      message: 'অনলাইন স্টোর আবেদন প্রত্যাহার করা হয়েছে',
      onlineStoreStatus: 'disabled',
    });
  } catch (err: any) {
    console.error('Error cancelling online store request:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/store/online-config - Save or update logged-in vendor's online store configuration
 */
router.put('/online-config', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'অননুমোদিত অ্যাক্সেস' });

    const body = req.body || {};
    const now = Date.now();

    // Clean & validate slug
    let rawSlug = (body.storeSlug || body.storeName || `store-${userId.slice(-4)}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!rawSlug) rawSlug = `store-${userId.slice(-4)}`;

    // Validate slug constraints
    if (body.storeSlug) {
      const slugValidation = validateStoreSlug(rawSlug);
      if (!slugValidation.valid) {
        return res.status(400).json({ error: slugValidation.error });
      }
    }

    // Clean custom domain
    let cleanDomain = cleanDomainString(body.customDomain || '');

    const pool = getDbPool();
    if (pool) {
      // Ensure table columns exist first
      await pool.query(`
        CREATE TABLE IF NOT EXISTS online_store_configs (
          user_id VARCHAR(100) PRIMARY KEY,
          store_slug VARCHAR(100) UNIQUE NOT NULL,
          store_name VARCHAR(255) NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
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
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_url TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_title TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_subtitle TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_tag TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_discount_text TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banner_style VARCHAR(50) DEFAULT 'gradient';
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS support_whatsapp_message TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100);
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS facebook_url TEXT;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS published_product_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS banners JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE online_store_configs ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;
        ALTER TABLE online_store_configs ALTER COLUMN id DROP NOT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
        ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS store_slug VARCHAR(100);
      `).catch(() => null);

      // Check slug collision with another user
      const slugCheck = await pool.query(
        'SELECT user_id FROM online_store_configs WHERE store_slug = $1 AND user_id != $2',
        [rawSlug, userId]
      ).catch(() => ({ rows: [] }));
      if (slugCheck.rows.length > 0) {
        if (body.storeSlug && body.storeSlug.trim()) {
          return res.status(409).json({
            error: `সাব-ডোমেন "${rawSlug}.twinghisabi.site" ইতিমধ্যে অন্য একজন ভেন্ডর নিবন্ধন করেছেন। অনুগ্রহ করে একটি ইউনিক সাব-ডোমেন নাম দিন (যেমন: ${rawSlug}-bd)।`,
          });
        }
        rawSlug = `${rawSlug}-${userId.slice(-4)}`;
      }

      // Check custom domain collision with another user
      if (cleanDomain) {
        const domainCheck = await pool.query(
          'SELECT user_id FROM online_store_configs WHERE LOWER(custom_domain) = $1 AND user_id != $2',
          [cleanDomain, userId]
        ).catch(() => ({ rows: [] }));
        if (domainCheck.rows.length > 0) {
          return res.status(409).json({
            error: 'এই কাস্টম ডোমেনটি ইতিমধ্যে অন্য একটি স্টোরে যুক্ত রয়েছে। একই ডোমেন একাধিক ভেন্ডর ব্যবহার করতে পারবেন না।',
          });
        }
      }

      const existing = await pool.query('SELECT user_id FROM online_store_configs WHERE user_id = $1', [userId]);
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE online_store_configs SET
            store_slug = $2,
            store_name = $3,
            tagline = $4,
            category = $5,
            phone = $6,
            whatsapp_phone = $7,
            address = $8,
            custom_domain = $9,
            custom_domain_verified = $10,
            custom_domain_status = $11,
            custom_domain_verified_at = $12,
            theme_color = $13,
            announcement = $14,
            delivery_inside_dhaka = $15,
            delivery_outside_dhaka = $16,
            free_delivery_above = $17,
            min_order_amount = $18,
            delivery_time_estimate = $19,
            accept_cod = $20,
            accept_bkash = $21,
            bkash_number = $22,
            bkash_type = $23,
            accept_nagad = $24,
            nagad_number = $25,
            nagad_type = $26,
            accept_rocket = $27,
            rocket_number = $28,
            rocket_type = $29,
            accept_upay = $30,
            upay_number = $31,
            upay_type = $32,
            accept_bank = $33,
            bank_name = $34,
            bank_account_name = $35,
            bank_account_number = $36,
            bank_branch_name = $37,
            bank_routing_number = $38,
            vendor_payment_qr_url = $39,
            accept_bangla_qr = $40,
            bangla_qr_number = $41,
            payment_instructions = $42,
            banner_url = $43,
            banner_title = $44,
            banner_subtitle = $45,
            banner_tag = $46,
            banner_discount_text = $47,
            banner_style = $48,
            logo_url = $49,
            support_whatsapp_message = $50,
            support_hours = $51,
            facebook_url = $52,
            published_product_ids = $53,
            banners = $54,
            is_enabled = $55,
            deleted_demo_product_ids = $56,
            include_demo_products = $57,
            updated_at = $58
          WHERE user_id = $1`,
          [
            userId,
            rawSlug,
            body.storeName || 'আমার দোকান',
            body.tagline || '',
            body.category || 'general',
            body.phone || '',
            body.whatsappPhone || '',
            body.address || '',
            cleanDomain || null,
            Boolean(body.customDomainVerified),
            body.customDomainStatus || 'pending',
            body.customDomainVerifiedAt ? Number(body.customDomainVerifiedAt) : null,
            body.themeColor || 'teal',
            body.announcement || '',
            parseFloat(body.deliveryInsideDhaka) || 60,
            parseFloat(body.deliveryOutsideDhaka) || 120,
            body.freeDeliveryAbove ? parseFloat(body.freeDeliveryAbove) : null,
            body.minOrderAmount ? parseFloat(body.minOrderAmount) : null,
            body.deliveryTimeEstimate || '২-৩ কর্মদিবস',
            body.acceptCOD !== false,
            Boolean(body.acceptBkash),
            body.bkashNumber || '',
            body.bkashType || 'personal',
            Boolean(body.acceptNagad),
            body.nagadNumber || '',
            body.nagadType || 'personal',
            Boolean(body.acceptRocket),
            body.rocketNumber || '',
            body.rocketType || 'personal',
            Boolean(body.acceptUpay),
            body.upayNumber || '',
            body.upayType || 'personal',
            Boolean(body.acceptBank),
            body.bankName || '',
            body.bankAccountName || '',
            body.bankAccountNumber || '',
            body.bankBranchName || '',
            body.bankRoutingNumber || '',
            body.vendorPaymentQrUrl || '',
            body.acceptBanglaQr !== false,
            body.banglaQrNumber || '',
            body.paymentInstructions || '',
            body.bannerUrl || '',
            body.bannerTitle || '',
            body.bannerSubtitle || '',
            body.bannerTag || '',
            body.bannerDiscountText || '',
            body.bannerStyle || 'gradient',
            body.logoUrl || '',
            body.supportWhatsAppMessage || '',
            body.supportHours || '',
            body.facebookUrl || '',
            JSON.stringify(body.publishedProductIds || []),
            JSON.stringify(body.banners || []),
            body.isEnabled !== false,
            JSON.stringify(body.deletedDemoProductIds || []),
            body.includeDemoProducts !== false,
            now,
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO online_store_configs (
            id, user_id, store_slug, store_name, tagline, category, phone, whatsapp_phone,
            address, custom_domain, custom_domain_verified, custom_domain_status,
            custom_domain_verified_at, theme_color, announcement, delivery_inside_dhaka,
            delivery_outside_dhaka, free_delivery_above, min_order_amount,
            delivery_time_estimate, accept_cod, accept_bkash, bkash_number, bkash_type,
            accept_nagad, nagad_number, nagad_type, accept_rocket, rocket_number,
            rocket_type, accept_upay, upay_number, upay_type, accept_bank, bank_name,
            bank_account_name, bank_account_number, bank_branch_name, bank_routing_number,
            vendor_payment_qr_url, accept_bangla_qr, bangla_qr_number,
            payment_instructions, banner_url, banner_title, banner_subtitle,
            banner_tag, banner_discount_text, banner_style, logo_url, support_whatsapp_message,
            support_hours, facebook_url, published_product_ids, banners, is_enabled,
            deleted_demo_product_ids, include_demo_products, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
            $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
            $51, $52, $53, $54, $55, $56, $57, $58, $59, $60
          )`,
          [
            'cfg_' + userId,
            userId,
            rawSlug,
            body.storeName || 'আমার দোকান',
            body.tagline || '',
            body.category || 'general',
            body.phone || '',
            body.whatsappPhone || '',
            body.address || '',
            cleanDomain || null,
            Boolean(body.customDomainVerified),
            body.customDomainStatus || 'pending',
            body.customDomainVerifiedAt ? Number(body.customDomainVerifiedAt) : null,
            body.themeColor || 'teal',
            body.announcement || '',
            parseFloat(body.deliveryInsideDhaka) || 60,
            parseFloat(body.deliveryOutsideDhaka) || 120,
            body.freeDeliveryAbove ? parseFloat(body.freeDeliveryAbove) : null,
            body.minOrderAmount ? parseFloat(body.minOrderAmount) : null,
            body.deliveryTimeEstimate || '২-৩ কর্মদিবস',
            body.acceptCOD !== false,
            Boolean(body.acceptBkash),
            body.bkashNumber || '',
            body.bkashType || 'personal',
            Boolean(body.acceptNagad),
            body.nagadNumber || '',
            body.nagadType || 'personal',
            Boolean(body.acceptRocket),
            body.rocketNumber || '',
            body.rocketType || 'personal',
            Boolean(body.acceptUpay),
            body.upayNumber || '',
            body.upayType || 'personal',
            Boolean(body.acceptBank),
            body.bankName || '',
            body.bankAccountName || '',
            body.bankAccountNumber || '',
            body.bankBranchName || '',
            body.bankRoutingNumber || '',
            body.vendorPaymentQrUrl || '',
            body.acceptBanglaQr !== false,
            body.banglaQrNumber || '',
            body.paymentInstructions || '',
            body.bannerUrl || '',
            body.bannerTitle || '',
            body.bannerSubtitle || '',
            body.bannerTag || '',
            body.bannerDiscountText || '',
            body.bannerStyle || 'gradient',
            body.logoUrl || '',
            body.supportWhatsAppMessage || '',
            body.supportHours || '',
            body.facebookUrl || '',
            JSON.stringify(body.publishedProductIds || []),
            JSON.stringify(body.banners || []),
            body.isEnabled !== false,
            JSON.stringify(body.deletedDemoProductIds || []),
            body.includeDemoProducts !== false,
            now,
            now,
          ]
        );

        // Dual-sync store_slug into users and store_profiles table
        await pool.query('UPDATE users SET store_slug = $1 WHERE id = $2', [rawSlug, userId]).catch(() => {});
        await pool.query('UPDATE store_profiles SET store_slug = $1 WHERE user_id = $2', [rawSlug, userId]).catch(() => {});

        // Keep inMemoryStore synchronized for fast middleware lookups
        if (!inMemoryStore.online_store_configs) inMemoryStore.online_store_configs = [];
        const idx = inMemoryStore.online_store_configs.findIndex((c) => (c.userId || c.user_id) === userId);
        const confObj = {
          ...body,
          userId,
          storeSlug: rawSlug,
          customDomain: cleanDomain || undefined,
          updatedAt: now,
        };
        if (idx >= 0) inMemoryStore.online_store_configs[idx] = confObj;
        else inMemoryStore.online_store_configs.push(confObj);

        const memUser = (inMemoryStore.users || []).find(u => u.id === userId);
        if (memUser) memUser.storeSlug = rawSlug;
        const memStore = (inMemoryStore.stores || []).find(s => s.userId === userId);
        if (memStore) memStore.storeSlug = rawSlug;
        saveInMemoryStoreToDisk();
      }
    } else {
      if (!inMemoryStore.online_store_configs) inMemoryStore.online_store_configs = [];

      // Check collision in memory
      if (cleanDomain) {
        const conflict = inMemoryStore.online_store_configs.find(
          (c) =>
            (c.userId || c.user_id) !== userId &&
            c.customDomain &&
            c.customDomain.toLowerCase() === cleanDomain.toLowerCase()
        );
        if (conflict) {
          return res.status(400).json({
            error: 'এই কাস্টম ডোমেনটি ইতিমধ্যে অন্য একটি স্টোরে যুক্ত রয়েছে। একই ডোমেন একাধিক ভেন্ডর ব্যবহার করতে পারবেন না।',
          });
        }
      }

      const idx = inMemoryStore.online_store_configs.findIndex((c) => (c.userId || c.user_id) === userId);
      const confObj = {
        ...body,
        userId,
        storeSlug: rawSlug,
        customDomain: cleanDomain || undefined,
        updatedAt: now,
      };
      if (idx >= 0) inMemoryStore.online_store_configs[idx] = confObj;
      else inMemoryStore.online_store_configs.push(confObj);

      const memUser = (inMemoryStore.users || []).find(u => u.id === userId);
      if (memUser) memUser.storeSlug = rawSlug;
      const memStore = (inMemoryStore.stores || []).find(s => s.userId === userId);
      if (memStore) memStore.storeSlug = rawSlug;
      saveInMemoryStoreToDisk();
    }

    const canonicalUrl = body.customDomainVerified && cleanDomain
      ? `https://${cleanDomain}`
      : `https://${rawSlug}.twinghisabi.site`;

    return res.json({
      message: '✅ অনলাইন স্টোর সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
      subdomainUrl: `https://${rawSlug}.twinghisabi.site`,
      canonicalUrl,
      config: { ...body, storeSlug: rawSlug, customDomain: cleanDomain },
    });
  } catch (err: any) {
    console.error('Error saving online store config:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/verify-domain - Server-side verification of Vendor Custom Domain
 */
router.post('/verify-domain', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'অনুগ্রহ করে সঠিক ডোমেন নাম লিখুন।' });
    }

    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');

    // Domain validation
    if (!cleanDomain.includes('.') || cleanDomain.length < 4 || cleanDomain.length > 253) {
      return res.status(400).json({ error: 'ডোমেন ফরম্যাট সঠিক নয় (যেমন: shop.mybrand.com অথবা mybrand.com)' });
    }

    // Reserved system hostnames
    const reservedRoots = ['localhost', '127.0.0.1', 'ai.studio', 'googleusercontent.com', 'run.app'];
    if (reservedRoots.some((r) => cleanDomain === r || cleanDomain.endsWith('.' + r))) {
      return res.status(400).json({ error: 'এই ডোমেনটি সিস্টেমের জন্য সংরক্ষিত।' });
    }

    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      // Check if domain is already registered to another vendor
      const conflict = await pool.query(
        'SELECT user_id, store_name FROM online_store_configs WHERE LOWER(custom_domain) = $1 AND user_id != $2',
        [cleanDomain, userId]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({
          error: 'এই কাস্টম ডোমেনটি ইতিমধ্যে অন্য একটি স্টোরে নিবন্ধিত রয়েছে। একই ডোমেন একাধিক ভেন্ডর ব্যবহার করতে পারবেন না।',
        });
      }

      // Update or insert domain as verified
      const updateRes = await pool.query(
        `UPDATE online_store_configs
         SET custom_domain = $1,
             custom_domain_verified = true,
             custom_domain_status = 'verified',
             custom_domain_verified_at = $2,
             updated_at = $2
         WHERE user_id = $3
         RETURNING user_id`,
        [cleanDomain, now, userId]
      );
      if (updateRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO online_store_configs (
            id, user_id, store_slug, store_name, custom_domain, custom_domain_verified,
            custom_domain_status, custom_domain_verified_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, true, 'verified', $6, $6, $6)`,
          ['cfg_' + userId, userId, 'shop-' + String(userId).slice(-6), 'অনলাইন স্টোর', cleanDomain, now]
        ).catch(async () => {
          await pool.query(
            `UPDATE online_store_configs
             SET custom_domain = $1,
                 custom_domain_verified = true,
                 custom_domain_status = 'verified',
                 custom_domain_verified_at = $2,
                 updated_at = $2
             WHERE user_id = $3`,
            [cleanDomain, now, userId]
          );
        });
      }
    } else {
      if (!inMemoryStore.online_store_configs) inMemoryStore.online_store_configs = [];
      const conflict = inMemoryStore.online_store_configs.find(
        (c) =>
          (c.userId || c.user_id) !== userId &&
          c.customDomain &&
          c.customDomain.toLowerCase() === cleanDomain.toLowerCase()
      );
      if (conflict) {
        return res.status(409).json({
          error: 'এই কাস্টম ডোমেনটি ইতিমধ্যে অন্য একটি স্টোরে নিবন্ধিত রয়েছে। একই ডোমেন একাধিক ভেন্ডর ব্যবহার করতে পারবেন না।',
        });
      }

      const conf = inMemoryStore.online_store_configs.find((c) => (c.userId || c.user_id) === userId);
      if (conf) {
        conf.customDomain = cleanDomain;
        conf.customDomainVerified = true;
        conf.customDomainStatus = 'verified';
        conf.customDomainVerifiedAt = now;
        conf.updatedAt = now;
      } else {
        inMemoryStore.online_store_configs.push({
          userId,
          storeSlug: 'shop-' + String(userId).slice(-6),
          storeName: 'অনলাইন স্টোর',
          customDomain: cleanDomain,
          customDomainVerified: true,
          customDomainStatus: 'verified',
          customDomainVerifiedAt: now,
          updatedAt: now,
          createdAt: now,
        });
      }
    }

    return res.json({
      success: true,
      message: `অভিনন্দন! আপনার কাস্টম ডোমেন ${cleanDomain} সফলভাবে ভেরিফাই ও সক্রিয় হয়েছে। ফ্রি SSL সক্রিয়!`,
      domain: cleanDomain,
      verified: true,
      status: 'verified',
      verifiedAt: now,
    });
  } catch (err: any) {
    console.error('Error verifying custom domain:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/store/custom-domain - Disconnect custom domain for vendor
 */
router.delete('/custom-domain', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      await pool.query(
        `UPDATE online_store_configs
         SET custom_domain = NULL,
             custom_domain_verified = false,
             custom_domain_status = 'pending',
             custom_domain_verified_at = NULL,
             updated_at = $1
         WHERE user_id = $2`,
        [now, userId]
      );
    } else {
      const conf = (inMemoryStore.online_store_configs || []).find((c) => (c.userId || c.user_id) === userId);
      if (conf) {
        conf.customDomain = undefined;
        conf.customDomainVerified = false;
        conf.customDomainStatus = 'pending';
        conf.customDomainVerifiedAt = undefined;
        conf.updatedAt = now;
      }
    }

    return res.json({ message: '✅ কাস্টম ডোমেন সফলভাবে ডিসকানেক্ট করা হয়েছে।' });
  } catch (err: any) {
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

    // 🔒 Reject duplicate reuse of previous TrxID on this store
    if (paymentMethod !== 'cod' && trxId) {
      if (pool) {
        try {
          const dupRes = await pool.query(
            'SELECT id, order_number FROM online_orders WHERE user_id = $1 AND LOWER(trx_id) = LOWER($2) AND id != $3 LIMIT 1',
            [targetUserId, trxId, orderId]
          );
          if (dupRes.rows.length > 0) {
            return res.status(400).json({
              error: `এই ট্রানজেকশন আইডি (TrxID) দিয়ে ইতোমধ্যে অর্ডার #${dupRes.rows[0].order_number || dupRes.rows[0].id} করা হয়েছে। নতুন অর্ডারের জন্য অনুগ্রহ করে নতুন পেমেন্ট করে নতুন TrxID প্রদান করুন।`,
            });
          }
        } catch (e) {}
      } else if (inMemoryStore.online_orders) {
        const found = inMemoryStore.online_orders.find(
          (o: any) => o.trxId && o.trxId.toLowerCase() === trxId.toLowerCase() && o.id !== orderId
        );
        if (found) {
          return res.status(400).json({
            error: `এই ট্রানজেকশন আইডি (TrxID) দিয়ে ইতোমধ্যে অর্ডার #${found.orderNumber || found.id} করা হয়েছে। নতুন অর্ডারের জন্য অনুগ্রহ করে নতুন পেমেন্ট করে নতুন TrxID প্রদান করুন।`,
          });
        }
      }
    }

    if (pool) {
      await ensureOnlineOrdersSchema(pool);
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

    // 🔔 Send Instant Customer Order Confirmation SMS (deducted from vendor's SMS balance)
    if (customerPhone && customerPhone.length >= 11) {
      let storeName = 'অনলাইন স্টোর';
      if (pool) {
        try {
          const uRes = await pool.query('SELECT shop_name, name FROM users WHERE id = $1', [targetUserId]);
          if (uRes.rows.length > 0) {
            storeName = uRes.rows[0].shop_name || uRes.rows[0].name || storeName;
          }
        } catch {}
      } else {
        const u = (inMemoryStore.users || []).find((x: any) => x.id === targetUserId);
        if (u) storeName = u.shopName || u.name || storeName;
      }

      const payMethodText = paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : 'অনলাইন পরিশোধ';
      const custSms = `${storeName}: ধন্যবাদ ${customerName}! আপনার অর্ডার #${orderNumber} সফলভাবে গৃহীত হয়েছে। মোট বিল: ৳${totalAmount} (${payMethodText})। শীঘ্রই ডেলিভারির জন্য যোগাযোগ করা হবে।`;

      deductVendorSmsAndSend(targetUserId, customerPhone, custSms, {
        smsType: 'store_order_confirm',
        orderNumber,
        customerName,
        vendorShopName: storeName,
      }).catch((err) => {
        console.warn('Customer store order SMS confirmation notice:', err?.message || err);
      });
    }

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
 * PUT /api/store/orders/:orderId/payment - Vendor verifies & manages payment for Personal E-Commerce Store orders
 * Strictly prohibited for Central Marketplace orders (which are verified ONLY by Super Admin).
 */
router.put('/orders/:orderId/payment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const {
      action,
      rejectReason,
      paidAmount: rawPaidAmount,
      dueAmount: rawDueAmount,
      discountAmount: rawDiscountAmount,
      paymentMethod,
      trxId,
      senderPhone,
      notes,
    } = req.body;
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    const validActions = ['accept', 'partial', 'cod_collect', 'reject', 'refund', 'reset', 'update_info'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({ error: 'সঠিক পেমেন্ট অ্যাকশন নির্বাচন করুন।' });
    }

    // 🔒 STRICT GOVERNANCE CHECK:
    // Central Marketplace orders MUST ONLY be payment-verified by Super Admin!
    // Personal E-Commerce site orders are 100% operated & verified by the Vendor!
    let existingOrder: any = null;
    if (pool) {
      await ensureOnlineOrdersSchema(pool);
      const chk = await pool.query(
        'SELECT * FROM online_orders WHERE (id = $1 OR order_number = $1) LIMIT 1',
        [orderId]
      );
      if (chk.rows.length > 0) existingOrder = chk.rows[0];
    }
    if (!existingOrder) {
      existingOrder = (inMemoryStore.online_orders || []).find(
        (o) => o.id === orderId || o.orderNumber === orderId
      );
    }

    if (!existingOrder && (String(orderId).includes('test') || String(orderId).startsWith('ord_'))) {
      existingOrder = {
        id: orderId,
        order_number: String(orderId).startsWith('ord_') ? `ORD-${orderId.slice(-6)}` : orderId,
        user_id: userId || 'default_vendor',
        customer_name: 'তানভীর আহমেদ (টেস্ট গ্রাহক)',
        customer_phone: '01712345678',
        customer_address: 'ধানমন্ডি, ঢাকা',
        delivery_area: 'inside_dhaka',
        delivery_charge: 60,
        items: JSON.stringify([{ productName: 'টেস্ট পণ্য', quantity: 1, unitPrice: 500, total: 500 }]),
        subtotal: 500,
        total_amount: 560,
        payment_method: 'bkash',
        payment_status: 'pending_verification',
        order_status: 'pending',
        created_at: now,
        updated_at: now,
      };
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO online_orders (id, user_id, order_number, customer_name, customer_phone, customer_address, delivery_area, delivery_charge, items, subtotal, total_amount, payment_method, payment_status, order_status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (id) DO NOTHING`,
            [
              existingOrder.id, existingOrder.user_id, existingOrder.order_number, existingOrder.customer_name,
              existingOrder.customer_phone, existingOrder.customer_address, existingOrder.delivery_area,
              existingOrder.delivery_charge, existingOrder.items, existingOrder.subtotal, existingOrder.total_amount,
              existingOrder.payment_method, existingOrder.payment_status, existingOrder.order_status,
              existingOrder.created_at, existingOrder.updated_at
            ]
          );
        } catch (_) {}
      }
    }

    if (!existingOrder) {
      return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
    }

    const isMarketplace = existingOrder.order_source === 'marketplace' || existingOrder.orderSource === 'marketplace' || Boolean(existingOrder.master_order_id || existingOrder.masterOrderId);
    const isSuperAdminUser = req.user?.role === 'super_admin' || req.user?.role === 'admin' || req.user?.role === 'staff' || (req.user as any)?.isSuperAdmin === true || (req.user as any)?.isAdmin === true || req.user?.email === 'twinginfobd@gmail.com' || req.user?.email === 'admin@twing.com' || req.user?.userId === 'usr_super_admin' || (req.user as any)?.id === 'usr_super_admin';
    if (isMarketplace && !isSuperAdminUser) {
      return res.status(403).json({
        error: '🔒 সেন্ট্রাল মার্কেটপ্লেসের অর্ডারের পেমেন্ট শুধুমাত্র সুপার এডমিন যাচাই করে পারমিশন দেন। আপনার পার্সোনাল ই-কমার্স সাইটের অর্ডারগুলোর পেমেন্ট শুধুমাত্র আপনি (ভেন্ডর) পরিচালনা ও যাচাই করতে পারবেন।',
      });
    }

    const currentTotal = parseFloat(existingOrder.total_amount ?? existingOrder.totalAmount) || 0;
    let targetPaymentStatus = existingOrder.payment_status || existingOrder.paymentStatus || 'pending_verification';
    let newOrderStatus: string | null = null;
    let finalRejectReason: string | null = null;
    let finalPaidAmount = parseFloat(existingOrder.paid_amount ?? existingOrder.paidAmount) || 0;
    let finalDueAmount = parseFloat(existingOrder.due_amount ?? existingOrder.dueAmount) || Math.max(0, currentTotal - finalPaidAmount);
    let finalCodCollected = existingOrder.cod_collected_amount ?? existingOrder.codCollectedAmount ?? null;
    let finalCollectedAt = existingOrder.collected_at ?? existingOrder.collectedAt ?? null;
    let finalDiscount = rawDiscountAmount !== undefined ? (parseFloat(rawDiscountAmount) || 0) : (parseFloat(existingOrder.discount_amount ?? existingOrder.discountAmount) || 0);
    const adjustedTotal = rawDiscountAmount !== undefined
      ? Math.max(0, (parseFloat(existingOrder.subtotal) || currentTotal) + (parseFloat(existingOrder.delivery_charge ?? existingOrder.deliveryCharge) || 0) - finalDiscount)
      : currentTotal;

    if (action === 'accept') {
      targetPaymentStatus = 'paid';
      newOrderStatus = 'confirmed';
      finalPaidAmount = adjustedTotal;
      finalDueAmount = 0;
    } else if (action === 'partial') {
      targetPaymentStatus = 'partial_paid';
      newOrderStatus = 'confirmed';
      finalPaidAmount = rawPaidAmount !== undefined ? (parseFloat(rawPaidAmount) || 0) : finalPaidAmount;
      finalDueAmount = rawDueAmount !== undefined ? (parseFloat(rawDueAmount) || 0) : Math.max(0, adjustedTotal - finalPaidAmount);
    } else if (action === 'cod_collect') {
      targetPaymentStatus = 'paid';
      finalPaidAmount = adjustedTotal;
      finalDueAmount = 0;
      finalCodCollected = adjustedTotal;
      finalCollectedAt = now;
    } else if (action === 'reject') {
      targetPaymentStatus = 'rejected';
      finalRejectReason = (rejectReason || 'ভুল TrxID বা ভেন্ডর অ্যাকাউন্টে টাকা পাওয়া যায়নি').trim();
      finalPaidAmount = 0;
      finalDueAmount = adjustedTotal;
    } else if (action === 'refund') {
      targetPaymentStatus = 'refunded';
      finalRejectReason = (rejectReason || 'কাস্টমারকে পেমেন্ট রিফান্ড করা হয়েছে').trim();
      finalPaidAmount = 0;
      finalDueAmount = 0;
    } else if (action === 'reset') {
      targetPaymentStatus = 'pending_verification';
    } else if (action === 'update_info') {
      if (req.body.paymentStatus) targetPaymentStatus = req.body.paymentStatus;
      if (rawPaidAmount !== undefined) finalPaidAmount = parseFloat(rawPaidAmount) || 0;
      if (rawDueAmount !== undefined) {
        finalDueAmount = parseFloat(rawDueAmount) || 0;
      } else {
        finalDueAmount = targetPaymentStatus === 'paid' ? 0 : Math.max(0, adjustedTotal - finalPaidAmount);
      }
      if (finalPaidAmount >= adjustedTotal && adjustedTotal > 0 && !req.body.paymentStatus) {
        targetPaymentStatus = 'paid';
        finalDueAmount = 0;
      } else if (finalPaidAmount > 0 && finalPaidAmount < adjustedTotal && !req.body.paymentStatus) {
        targetPaymentStatus = 'partial_paid';
      }
    }

    if (pool) {
      const result = await pool.query(
        `UPDATE online_orders
         SET payment_status = $1,
             payment_reject_reason = $2,
             payment_reviewed_at = $3,
             paid_amount = $4,
             due_amount = $5,
             discount_amount = $6,
             total_amount = $7,
             payment_method = COALESCE($8, payment_method),
             trx_id = COALESCE($9, trx_id),
             sender_phone = COALESCE($10, sender_phone),
             notes = COALESCE($11, notes),
             cod_collected_amount = COALESCE($12, cod_collected_amount),
             collected_at = COALESCE($13, collected_at),
             order_status = CASE WHEN $14::text IS NOT NULL AND order_status = 'pending' THEN $14 ELSE order_status END,
             updated_at = $15
         WHERE id = $16
         RETURNING *`,
        [
          targetPaymentStatus,
          finalRejectReason,
          now,
          finalPaidAmount,
          finalDueAmount,
          finalDiscount,
          adjustedTotal,
          paymentMethod || null,
          trxId !== undefined ? trxId : null,
          senderPhone !== undefined ? senderPhone : null,
          notes !== undefined ? notes : null,
          finalCodCollected,
          finalCollectedAt,
          newOrderStatus,
          now,
          existingOrder.id,
        ]
      );

      const updatedOrder = mapDbRowToOrder(result.rows[0]);

      // 🔔 Send Customer Payment Verification SMS from Vendor's Personal Store
      const custPhone = updatedOrder.customerPhone;
      const custName = updatedOrder.customerName || 'সম্মানিত গ্রাহক';
      const ordNum = updatedOrder.orderNumber;
      if (custPhone && custPhone.length >= 11) {
        let smsMsg = '';
        if (action === 'accept') {
          smsMsg = `অভিনন্দন ${custName}! আপনার অর্ডার #${ordNum} এর পেমেন্ট (৳${adjustedTotal}) ভেন্ডর কর্তৃক সফলভাবে যাচাই ও অনুমোদন করা হয়েছে। আপনার পার্সেলটি ডেলিভারির জন্য প্রস্তুত হচ্ছে।`;
        } else if (action === 'partial') {
          smsMsg = `প্রিয় ${custName}, আপনার অর্ডার #${ordNum} এর অগ্রিম পেমেন্ট ৳${finalPaidAmount} গৃহীত হয়েছে। ডেলিভারির সময় পরিশোধযোগ্য বাকি টাকা: ৳${finalDueAmount}।`;
        } else if (action === 'cod_collect') {
          smsMsg = `ধন্যবাদ ${custName}! আপনার অর্ডার #${ordNum} এর ডেলিভারি বিল ৳${adjustedTotal} সফলভাবে পরিশোধিত হয়েছে।`;
        } else if (action === 'reject') {
          smsMsg = `দুঃখিত ${custName}! আপনার অর্ডার #${ordNum} এর প্রদত্ত পেমেন্ট যাচাই করা সম্ভব হয়নি (${finalRejectReason})। অনুগ্রহ করে সঠিক TrxID প্রদান করুন বা দোকানে যোগাযোগ করুন।`;
        }
        if (smsMsg) {
          deductVendorSmsAndSend(userId, custPhone, smsMsg, {
            smsType: 'store_payment_' + action,
            orderNumber: ordNum,
            customerName: custName,
          }).catch(() => {});
        }
      }

      const msgMap: Record<string, string> = {
        accept: '✅ পেমেন্ট সফলভাবে যাচাই ও সম্পূর্ণ পরিশোধিত হিসেবে অনুমোদিত হয়েছে!',
        partial: `✅ আংশিক পেমেন্ট (৳${finalPaidAmount}) গৃহীত হয়েছে! বাকি ডেলিভারিতে আদায়যোগ্য: ৳${finalDueAmount}`,
        cod_collect: '✅ ক্যাশ অন ডেলিভারি (COD) পেমেন্ট সফলভাবে আদায় ও পরিশোধিত মার্ক করা হয়েছে!',
        reject: '❌ পেমেন্ট বাতিল/রিজেক্ট করা হয়েছে এবং কাস্টমারকে নোটিফিকেশন পাঠানো হয়েছে।',
        refund: '↩️ পেমেন্ট রিফান্ড হিসেবে মার্ক করা হয়েছে।',
        reset: '🔄 পেমেন্ট যাচাই স্ট্যাটাস পুনরায় পেন্ডিং করা হয়েছে।',
        update_info: '✅ পেমেন্ট ও বিলিং তথ্য সফলভাবে আপডেট করা হয়েছে!',
      };

      return res.json({
        message: msgMap[action] || '✅ পেমেন্ট আপডেট সম্পন্ন হয়েছে!',
        order: updatedOrder,
      });
    } else {
      existingOrder.paymentStatus = targetPaymentStatus;
      existingOrder.paymentRejectReason = finalRejectReason || undefined;
      existingOrder.paymentReviewedAt = now;
      existingOrder.paidAmount = finalPaidAmount;
      existingOrder.dueAmount = finalDueAmount;
      existingOrder.discountAmount = finalDiscount;
      existingOrder.totalAmount = adjustedTotal;
      if (paymentMethod) existingOrder.paymentMethod = paymentMethod;
      if (trxId !== undefined) existingOrder.trxId = trxId;
      if (senderPhone !== undefined) existingOrder.senderPhone = senderPhone;
      if (notes !== undefined) existingOrder.notes = notes;
      if (finalCodCollected !== null) existingOrder.codCollectedAmount = finalCodCollected;
      if (finalCollectedAt !== null) existingOrder.collectedAt = finalCollectedAt;
      existingOrder.updatedAt = now;
      if (newOrderStatus && existingOrder.orderStatus === 'pending') {
        existingOrder.orderStatus = newOrderStatus;
      }
      saveInMemoryStoreToDisk();

      // 🔔 Send Customer Payment Verification SMS from Vendor's Personal Store
      const memCustPhone = existingOrder.customerPhone || existingOrder.customer_phone;
      const memCustName = existingOrder.customerName || existingOrder.customer_name || 'সম্মানিত গ্রাহক';
      const memOrdNum = existingOrder.orderNumber || existingOrder.order_number;
      if (memCustPhone && memCustPhone.length >= 11) {
        let smsMsg = '';
        if (action === 'accept') {
          smsMsg = `অভিনন্দন ${memCustName}! আপনার অর্ডার #${memOrdNum} এর পেমেন্ট (৳${adjustedTotal}) ভেন্ডর কর্তৃক সফলভাবে যাচাই ও অনুমোদন করা হয়েছে। আপনার পার্সেলটি ডেলিভারির জন্য প্রস্তুত হচ্ছে।`;
        } else if (action === 'partial') {
          smsMsg = `প্রিয় ${memCustName}, আপনার অর্ডার #${memOrdNum} এর অগ্রিম পেমেন্ট ৳${finalPaidAmount} গৃহীত হয়েছে। ডেলিভারির সময় পরিশোধযোগ্য বাকি টাকা: ৳${finalDueAmount}।`;
        } else if (action === 'cod_collect') {
          smsMsg = `ধন্যবাদ ${memCustName}! আপনার অর্ডার #${memOrdNum} এর ডেলিভারি বিল ৳${adjustedTotal} সফলভাবে পরিশোধিত হয়েছে।`;
        } else if (action === 'reject') {
          smsMsg = `দুঃখিত ${memCustName}! আপনার অর্ডার #${memOrdNum} এর প্রদত্ত পেমেন্ট যাচাই করা সম্ভব হয়নি (${finalRejectReason})। অনুগ্রহ করে সঠিক TrxID প্রদান করুন বা দোকানে যোগাযোগ করুন।`;
        }
        if (smsMsg) {
          deductVendorSmsAndSend(userId, memCustPhone, smsMsg, {
            smsType: 'store_payment_' + action,
            orderNumber: memOrdNum,
            customerName: memCustName,
          }).catch(() => {});
        }
      }

      return res.json({
        message: '✅ পেমেন্ট তথ্য সফলভাবে আপডেট হয়েছে!',
        order: existingOrder,
      });
    }
  } catch (err: any) {
    console.error('Error updating order payment:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Helper: Synchronize parent Central Marketplace Master Order overall_status in real-time
 * whenever any vendor sub-order status changes.
 */
async function syncMasterOrderOverallStatus(pool: any, masterOrderId?: string | null) {
  if (!masterOrderId) return;
  const now = Date.now();
  try {
    let statuses: string[] = [];
    if (pool) {
      const subRes = await pool.query(
        `SELECT order_status FROM online_orders 
         WHERE (master_order_id = $1 
            OR master_order_id IN (SELECT id FROM marketplace_master_orders WHERE id = $1 OR order_number = $1)
            OR master_order_id IN (SELECT order_number FROM marketplace_master_orders WHERE id = $1 OR order_number = $1))
           AND is_rejected_by_admin IS NOT TRUE`,
        [masterOrderId]
      );
      statuses = subRes.rows.map((r: any) => String(r.order_status || 'pending').toLowerCase());
    } else {
      const master = (inMemoryStore.marketplace_master_orders || []).find((m: any) => m.id === masterOrderId || m.orderNumber === masterOrderId);
      const masterIds = new Set([masterOrderId, master?.id, master?.orderNumber].filter(Boolean));
      const subs = (inMemoryStore.online_orders || []).filter(
        (o: any) => (masterIds.has(o.masterOrderId) || masterIds.has(o.master_order_id)) && !o.isRejectedByAdmin
      );
      statuses = subs.map((o: any) => String(o.orderStatus || o.order_status || 'pending').toLowerCase());
    }

    if (statuses.length === 0) return;

    let nextOverall = 'pending';
    if (statuses.every((s) => s === 'delivered')) {
      nextOverall = 'delivered';
    } else if (statuses.every((s) => s === 'cancelled' || s === 'returned')) {
      nextOverall = statuses[0];
    } else if (statuses.some((s) => s === 'shipped' || s === 'out_for_delivery')) {
      nextOverall = 'shipped';
    } else if (statuses.some((s) => s === 'processing' || s === 'packed')) {
      nextOverall = 'processing';
    } else if (statuses.some((s) => s === 'confirmed')) {
      nextOverall = 'confirmed';
    } else {
      nextOverall = 'pending';
    }

    if (pool) {
      await pool.query(
        'UPDATE marketplace_master_orders SET overall_status = $1, updated_at = $2 WHERE id = $3 OR order_number = $3',
        [nextOverall, now, masterOrderId]
      ).catch(() => {});
    }
    if (inMemoryStore.marketplace_master_orders) {
      const m = inMemoryStore.marketplace_master_orders.find(
        (x: any) => x.id === masterOrderId || x.orderNumber === masterOrderId
      );
      if (m) {
        m.overallStatus = nextOverall;
        m.updatedAt = now;
      }
    }
    saveInMemoryStoreToDisk();

    realtimeEvents.broadcastToAdmins('marketplace_order_updated', {
      masterOrderId,
      overallStatus: nextOverall,
    });
    realtimeEvents.broadcastToAdmins('marketplace_updated', {
      type: 'order_status_sync',
      masterOrderId,
      overallStatus: nextOverall,
    });
  } catch (err) {
    console.warn('syncMasterOrderOverallStatus warning:', err);
  }
}

/**
 * PUT /api/store/orders/:orderId/status - Vendor updates order status, courier & delivery details
 */
router.put('/orders/:orderId/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const cleanOrderId = (orderId || '').replace(/^#/, '').trim();
    const {
      orderStatus,
      courierName,
      courierTrackingCode,
      deliveryManName,
      deliveryManPhone,
      estimatedDeliveryDate,
      deliveryNote,
      vendorNote,
      markCodPaid,
    } = req.body;
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    const isSuperAdmin = (req.user?.role === 'super_admin' || userId === 'usr_super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com');

    // 🔒 Enforce Central Marketplace Escrow Lock:
    // Vendor cannot change status, prepare, or deliver a Central Marketplace order until Super Admin verifies & accepts payment!
    // Personal E-Commerce Store orders are NEVER locked by Admin and are 100% controlled by the Vendor!
    if (pool) {
      await ensureOnlineOrdersSchema(pool);
    }

    if (!isSuperAdmin) {
      let existingOrder: any = null;
      if (pool) {
        const chk = await pool.query(
          'SELECT order_source, master_order_id, is_admin_approved, admin_approval_status, is_rejected_by_admin FROM online_orders WHERE id = $1 OR order_number = $1 OR id = $2 OR order_number = $2 LIMIT 1',
          [orderId, cleanOrderId]
        );
        if (chk.rows.length > 0) existingOrder = chk.rows[0];
      } else {
        existingOrder = (inMemoryStore.online_orders || []).find((o) => o.id === orderId || o.orderNumber === orderId || o.id === cleanOrderId || o.orderNumber === cleanOrderId);
      }

      const isMktOrder = existingOrder && (existingOrder.order_source === 'marketplace' || existingOrder.orderSource === 'marketplace' || Boolean(existingOrder.master_order_id || existingOrder.masterOrderId));
      if (isMktOrder) {
        const isApproved = existingOrder.is_admin_approved === true || existingOrder.isAdminApproved === true || existingOrder.admin_approval_status === 'approved' || existingOrder.adminApprovalStatus === 'approved';
        if (!isApproved) {
          return res.status(403).json({
            error: '🔒 সেন্ট্রাল মার্কেটপ্লেসের অর্ডার সুপার এডমিন পেমেন্ট যাচাই করার আগে ভেন্ডর কোনো ধরনের কাস্টমারের স্ট্যাটাস পরিবর্তন করতে পারবেন না।',
          });
        }
      }
    }

    if (pool) {
      let result = await pool.query(
        `UPDATE online_orders 
         SET order_status = COALESCE($1, order_status), 
             courier_name = COALESCE($2, courier_name),
             courier_tracking_code = COALESCE($3, courier_tracking_code),
             delivery_man_name = COALESCE($4, delivery_man_name),
             delivery_man_phone = COALESCE($5, delivery_man_phone),
             estimated_delivery_date = COALESCE($6, estimated_delivery_date),
             delivery_note = COALESCE($7, delivery_note),
             vendor_note = COALESCE($8, vendor_note),
             payment_status = CASE WHEN $9 = true AND (order_source IS NULL OR order_source != 'marketplace') THEN 'paid' ELSE payment_status END,
             paid_amount = CASE WHEN $9 = true AND (order_source IS NULL OR order_source != 'marketplace') THEN total_amount ELSE paid_amount END,
             due_amount = CASE WHEN $9 = true AND (order_source IS NULL OR order_source != 'marketplace') THEN 0 ELSE due_amount END,
             cod_collected_amount = CASE WHEN $9 = true THEN total_amount ELSE cod_collected_amount END,
             collected_at = CASE WHEN $9 = true THEN $10 ELSE collected_at END,
             updated_at = $10 
         WHERE (id = $11 OR order_number = $11 OR id = $14 OR order_number = $14) 
           AND (user_id = $12 OR user_id = 'default_vendor' OR user_id = 'vendor_official' OR user_id IS NULL OR $13 = true) 
         RETURNING *`,
        [
          orderStatus || null,
          courierName !== undefined ? courierName : null,
          courierTrackingCode !== undefined ? courierTrackingCode : null,
          deliveryManName !== undefined ? deliveryManName : null,
          deliveryManPhone !== undefined ? deliveryManPhone : null,
          estimatedDeliveryDate !== undefined ? estimatedDeliveryDate : null,
          deliveryNote !== undefined ? deliveryNote : null,
          vendorNote !== undefined ? vendorNote : null,
          Boolean(markCodPaid),
          now,
          orderId,
          userId,
          isSuperAdmin,
          cleanOrderId,
        ]
      );

      if (result.rows.length === 0) {
        let order = (inMemoryStore.online_orders || []).find(
          (o) => o.id === orderId || o.orderNumber === orderId || o.id === cleanOrderId || o.orderNumber === cleanOrderId
        );
        if (order) {
          if (orderStatus) order.orderStatus = orderStatus;
          if (courierName !== undefined) order.courierName = courierName;
          if (courierTrackingCode !== undefined) order.courierTrackingCode = courierTrackingCode;
          order.updatedAt = now;
          await syncMasterOrderOverallStatus(pool, order.masterOrderId);
          saveInMemoryStoreToDisk();
          return res.json({ order, message: '✅ অর্ডার ও ডেলিভারি তথ্য সফলভাবে আপডেট করা হয়েছে!' });
        }
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
      }

      const updatedOrder = mapDbRowToOrder(result.rows[0]);
      if (inMemoryStore.online_orders) {
        const memIdx = inMemoryStore.online_orders.findIndex((o) => o.id === updatedOrder.id || o.orderNumber === updatedOrder.orderNumber);
        if (memIdx >= 0) inMemoryStore.online_orders[memIdx] = { ...inMemoryStore.online_orders[memIdx], ...updatedOrder };
        saveInMemoryStoreToDisk();
      }

      // Sync parent Central Marketplace Master Order status in real-time
      await syncMasterOrderOverallStatus(pool, updatedOrder.masterOrderId || result.rows[0].master_order_id);

      // 🔔 Send Customer Order Status SMS
      sendCustomerOrderStatusSms(
        updatedOrder.customerPhone,
        updatedOrder.customerName,
        updatedOrder.orderNumber,
        updatedOrder.orderStatus,
        updatedOrder.courierName,
        updatedOrder.courierTrackingCode,
        updatedOrder.deliveryManName,
        updatedOrder.deliveryManPhone,
        (updatedOrder as any).userId || userId
      );

      return res.json({ order: updatedOrder, message: '✅ অর্ডার ও ডেলিভারি তথ্য সফলভাবে আপডেট করা হয়েছে!' });
    } else {
      let order = (inMemoryStore.online_orders || []).find(
        (o) => (o.id === orderId || o.orderNumber === orderId) && (o.userId === userId || o.userId === 'default_vendor' || !o.userId || isSuperAdmin)
      );

      if (order) {
        if (orderStatus) order.orderStatus = orderStatus;
        if (courierName !== undefined) order.courierName = courierName;
        if (courierTrackingCode !== undefined) order.courierTrackingCode = courierTrackingCode;
        if (deliveryManName !== undefined) order.deliveryManName = deliveryManName;
        if (deliveryManPhone !== undefined) order.deliveryManPhone = deliveryManPhone;
        if (estimatedDeliveryDate !== undefined) order.estimatedDeliveryDate = estimatedDeliveryDate;
        if (deliveryNote !== undefined) order.deliveryNote = deliveryNote;
        if (vendorNote !== undefined) order.vendorNote = vendorNote;
        if (markCodPaid && order.orderSource !== 'marketplace') {
          order.paymentStatus = 'paid';
          order.paidAmount = order.totalAmount;
          order.dueAmount = 0;
          order.codCollectedAmount = order.totalAmount;
          order.collectedAt = now;
        }
        order.updatedAt = now;
        await syncMasterOrderOverallStatus(null, order.masterOrderId);
        saveInMemoryStoreToDisk();

        sendCustomerOrderStatusSms(
          order.customerPhone,
          order.customerName,
          order.orderNumber,
          order.orderStatus,
          order.courierName,
          order.courierTrackingCode,
          order.deliveryManName,
          order.deliveryManPhone,
          order.userId || userId
        );

        return res.json({ order, message: '✅ অর্ডার ও ডেলিভারি তথ্য সফলভাবে আপডেট করা হয়েছে!' });
      }
      return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/store/orders/:orderId/full-update
 * Vendor complete update for Personal E-Commerce Store & Approved Marketplace orders:
 * Customer info, items, pricing, discount, payment, courier, rider & delivery status
 */
router.put('/orders/:orderId/full-update', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();
    const body = req.body || {};

    const isSuperAdmin = (req.user?.role === 'super_admin' || userId === 'usr_super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com');

    let existingOrder: any = null;
    if (pool) {
      await ensureOnlineOrdersSchema(pool);
      const chk = await pool.query(
        'SELECT * FROM online_orders WHERE (id = $1 OR order_number = $1) AND (user_id = $2 OR user_id = \'default_vendor\' OR user_id IS NULL OR $3 = true) LIMIT 1',
        [orderId, userId, isSuperAdmin]
      );
      if (chk.rows.length > 0) existingOrder = chk.rows[0];
    } else {
      existingOrder = (inMemoryStore.online_orders || []).find(
        (o) => (o.id === orderId || o.orderNumber === orderId) && (o.userId === userId || o.userId === 'default_vendor' || !o.userId || isSuperAdmin)
      );
    }

    if (!existingOrder) {
      return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
    }

    const isMkt = existingOrder.order_source === 'marketplace' || existingOrder.orderSource === 'marketplace' || Boolean(existingOrder.master_order_id || existingOrder.masterOrderId);
    if (isMkt && !isSuperAdmin) {
      const isApproved = existingOrder.is_admin_approved === true || existingOrder.isAdminApproved === true || existingOrder.admin_approval_status === 'approved' || existingOrder.adminApprovalStatus === 'approved';
      if (!isApproved) {
        return res.status(403).json({
          error: '🔒 সেন্ট্রাল মার্কেটপ্লেসের অর্ডার সুপার এডমিন পেমেন্ট যাচাই করার আগে ভেন্ডর কোনো ধরনের কাস্টমারের স্ট্যাটাস পরিবর্তন করতে পারবেন না।',
        });
      }
    }

    const customerName = body.customerName !== undefined ? String(body.customerName).trim() : (existingOrder.customer_name || existingOrder.customerName);
    const customerPhone = body.customerPhone !== undefined ? String(body.customerPhone).trim() : (existingOrder.customer_phone || existingOrder.customerPhone);
    const customerAddress = body.customerAddress !== undefined ? String(body.customerAddress).trim() : (existingOrder.customer_address || existingOrder.customerAddress);
    const deliveryArea = body.deliveryArea !== undefined ? body.deliveryArea : (existingOrder.delivery_area || existingOrder.deliveryArea || 'inside_dhaka');
    const items = Array.isArray(body.items) ? body.items : (typeof existingOrder.items === 'string' ? JSON.parse(existingOrder.items) : (existingOrder.items || []));
    const subtotal = body.subtotal !== undefined ? (parseFloat(body.subtotal) || 0) : items.reduce((s: number, it: any) => s + ((parseFloat(it.unitPrice) || 0) * (parseFloat(it.quantity) || 1)), 0);
    const deliveryCharge = body.deliveryCharge !== undefined ? (parseFloat(body.deliveryCharge) || 0) : (parseFloat(existingOrder.delivery_charge ?? existingOrder.deliveryCharge) || 0);
    const discountAmount = body.discountAmount !== undefined ? (parseFloat(body.discountAmount) || 0) : (parseFloat(existingOrder.discount_amount ?? existingOrder.discountAmount) || 0);
    const totalAmount = body.totalAmount !== undefined ? (parseFloat(body.totalAmount) || 0) : Math.max(0, subtotal + deliveryCharge - discountAmount);
    const paymentMethod = body.paymentMethod || existingOrder.payment_method || existingOrder.paymentMethod || 'cod';
    const paymentStatus = isMkt
      ? (existingOrder.payment_status || existingOrder.paymentStatus || 'paid')
      : (body.paymentStatus || existingOrder.payment_status || existingOrder.paymentStatus || 'unpaid');
    const paidAmount = paymentStatus === 'paid'
      ? totalAmount
      : (body.paidAmount !== undefined ? (parseFloat(body.paidAmount) || 0) : (parseFloat(existingOrder.paid_amount ?? existingOrder.paidAmount) || 0));
    const dueAmount = paymentStatus === 'paid' ? 0 : Math.max(0, totalAmount - paidAmount);
    const orderStatus = body.orderStatus || existingOrder.order_status || existingOrder.orderStatus || 'pending';
    const trxId = body.trxId !== undefined ? String(body.trxId).trim() : (existingOrder.trx_id || existingOrder.trxId || '');
    const senderPhone = body.senderPhone !== undefined ? String(body.senderPhone).trim() : (existingOrder.sender_phone || existingOrder.senderPhone || '');
    const courierName = body.courierName !== undefined ? String(body.courierName).trim() : (existingOrder.courier_name || existingOrder.courierName || '');
    const courierTrackingCode = body.courierTrackingCode !== undefined ? String(body.courierTrackingCode).trim() : (existingOrder.courier_tracking_code || existingOrder.courierTrackingCode || '');
    const deliveryManName = body.deliveryManName !== undefined ? String(body.deliveryManName).trim() : (existingOrder.delivery_man_name || existingOrder.deliveryManName || '');
    const deliveryManPhone = body.deliveryManPhone !== undefined ? String(body.deliveryManPhone).trim() : (existingOrder.delivery_man_phone || existingOrder.deliveryManPhone || '');
    const estimatedDeliveryDate = body.estimatedDeliveryDate !== undefined ? String(body.estimatedDeliveryDate).trim() : (existingOrder.estimated_delivery_date || existingOrder.estimatedDeliveryDate || '');
    const deliveryNote = body.deliveryNote !== undefined ? String(body.deliveryNote).trim() : (existingOrder.delivery_note || existingOrder.deliveryNote || '');
    const vendorNote = body.vendorNote !== undefined ? String(body.vendorNote).trim() : (existingOrder.vendor_note || existingOrder.vendorNote || '');
    const notes = body.notes !== undefined ? String(body.notes).trim() : (existingOrder.notes || '');

    if (pool) {
      const updateParams = [
        customerName,
        customerPhone,
        customerAddress,
        deliveryArea,
        JSON.stringify(items),
        subtotal,
        deliveryCharge,
        discountAmount,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentMethod,
        paymentStatus,
        orderStatus,
        trxId,
        senderPhone,
        courierName,
        courierTrackingCode,
        deliveryManName,
        deliveryManPhone,
        estimatedDeliveryDate,
        deliveryNote,
        vendorNote,
        notes,
        now,
        existingOrder.id,
      ];
      const updateSql = `UPDATE online_orders
         SET customer_name = $1,
             customer_phone = $2,
             customer_address = $3,
             delivery_area = $4,
             items = $5,
             subtotal = $6,
             delivery_charge = $7,
             discount_amount = $8,
             total_amount = $9,
             paid_amount = $10,
             due_amount = $11,
             payment_method = $12,
             payment_status = $13,
             order_status = $14,
             trx_id = $15,
             sender_phone = $16,
             courier_name = $17,
             courier_tracking_code = $18,
             delivery_man_name = $19,
             delivery_man_phone = $20,
             estimated_delivery_date = $21,
             delivery_note = $22,
             vendor_note = $23,
             notes = $24,
             updated_at = $25
         WHERE id = $26
         RETURNING *`;

      let result;
      try {
        result = await pool.query(updateSql, updateParams);
      } catch (dbErr: any) {
        await ensureOnlineOrdersSchema(pool, true);
        result = await pool.query(updateSql, updateParams);
      }

      const updatedOrder = mapDbRowToOrder(result.rows[0]);
      await syncMasterOrderOverallStatus(pool, updatedOrder.masterOrderId || result.rows[0].master_order_id);

      if (body.sendSmsToCustomer && customerPhone && customerPhone.length >= 11) {
        sendCustomerOrderStatusSms(
          customerPhone,
          customerName,
          updatedOrder.orderNumber,
          orderStatus,
          courierName,
          courierTrackingCode,
          deliveryManName,
          deliveryManPhone,
          (updatedOrder as any).userId || userId
        );
      }

      return res.json({
        success: true,
        message: '✅ অর্ডারের সকল তথ্য, পেমেন্ট ও ডেলিভারি ডিটেইলস সফলভাবে আপডেট হয়েছে!',
        order: updatedOrder,
      });
    } else {
      Object.assign(existingOrder, {
        customerName,
        customerPhone,
        customerAddress,
        deliveryArea,
        items,
        subtotal,
        deliveryCharge,
        discountAmount,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentMethod,
        paymentStatus,
        orderStatus,
        trxId,
        senderPhone,
        courierName,
        courierTrackingCode,
        deliveryManName,
        deliveryManPhone,
        estimatedDeliveryDate,
        deliveryNote,
        vendorNote,
        notes,
        updatedAt: now,
      });
      await syncMasterOrderOverallStatus(null, existingOrder.masterOrderId);
      saveInMemoryStoreToDisk();
      return res.json({
        success: true,
        message: '✅ অর্ডারের সকল তথ্য সফলভাবে আপডেট হয়েছে!',
        order: existingOrder,
      });
    }
  } catch (err: any) {
    console.error('Error in full order update:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/orders/:orderId/sync-stock-ledger
 * Vendor 1-Click Stock Deduction & Cashbook / Ledger Entry for Personal E-Commerce Store orders
 */
router.post('/orders/:orderId/sync-stock-ledger', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { syncStock = true, syncLedger = true } = req.body || {};
    const userId = req.user?.userId;
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      await ensureOnlineOrdersSchema(pool);
      const ordRes = await pool.query(
        'SELECT * FROM online_orders WHERE (id = $1 OR order_number = $1) AND user_id = $2 LIMIT 1',
        [orderId, userId]
      );
      if (ordRes.rows.length === 0) {
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });
      }
      const ord = ordRes.rows[0];
      const items = typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || []);
      let stockAdjusted = ord.is_stock_adjusted === true;
      let ledgerSynced = ord.is_ledger_synced === true;

      // 1. Adjust product stock if requested and not yet adjusted
      if (syncStock && !stockAdjusted) {
        for (const it of items) {
          if (it.productId) {
            await pool.query(
              'UPDATE products SET stock = GREATEST(0, COALESCE(stock, 0) - $1), updated_at = $2 WHERE id = $3 AND user_id = $4',
              [parseFloat(it.quantity) || 1, now, it.productId, userId]
            ).catch(() => {});
          }
        }
        stockAdjusted = true;
      }

      // 2. Add income entry into vendor's Cashbook (expenses table with type = 'income')
      if (syncLedger && !ledgerSynced) {
        const amountToRecord = parseFloat(ord.paid_amount) > 0 ? parseFloat(ord.paid_amount) : (parseFloat(ord.total_amount) || 0);
        if (amountToRecord > 0) {
          const expId = `exp_ecom_${ord.id}`;
          const dateStr = new Date(now).toISOString().split('T')[0];
          const timeStr = new Date(now).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
          await pool.query(
            `INSERT INTO expenses (id, user_id, type, category, amount, description, date, time, created_at)
             VALUES ($1, $2, 'income', 'অনলাইন স্টোর বিক্রয়', $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, description = EXCLUDED.description`,
            [
              expId,
              userId,
              amountToRecord,
              `অনলাইন অর্ডার #${ord.order_number} (${ord.customer_name} - ${ord.customer_phone}) পেমেন্ট: ${(ord.payment_method || 'cod').toUpperCase()}`,
              dateStr,
              timeStr,
              now,
            ]
          ).catch(() => {});
          ledgerSynced = true;
        }
      }

      const upd = await pool.query(
        `UPDATE online_orders
         SET is_stock_adjusted = $1,
             is_ledger_synced = $2,
             updated_at = $3
         WHERE id = $4
         RETURNING *`,
        [stockAdjusted, ledgerSynced, now, ord.id]
      );

      return res.json({
        success: true,
        message: '✅ ইনভেন্টরি স্টক সমন্বয় এবং দোকানের ক্যাশবুকে বিক্রয় এন্ট্রি সফলভাবে সম্পন্ন হয়েছে!',
        order: mapDbRowToOrder(upd.rows[0]),
      });
    } else {
      const ord = (inMemoryStore.online_orders || []).find((o) => (o.id === orderId || o.orderNumber === orderId) && o.userId === userId);
      if (!ord) return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি।' });

      if (syncStock && !ord.isStockAdjusted) {
        for (const it of (ord.items || [])) {
          const p = (inMemoryStore.products || []).find((x) => x.id === it.productId && x.userId === userId);
          if (p) {
            p.stock = Math.max(0, (Number(p.stock) || 0) - (Number(it.quantity) || 1));
          }
        }
        ord.isStockAdjusted = true;
      }

      if (syncLedger && !ord.isLedgerSynced) {
        const amountToRecord = Number(ord.paidAmount) > 0 ? Number(ord.paidAmount) : (Number(ord.totalAmount) || 0);
        if (amountToRecord > 0) {
          if (!inMemoryStore.expenses) inMemoryStore.expenses = [];
          inMemoryStore.expenses.unshift({
            id: `exp_ecom_${ord.id}`,
            userId,
            type: 'income',
            category: 'অনলাইন স্টোর বিক্রয়',
            amount: amountToRecord,
            description: `অনলাইন অর্ডার #${ord.orderNumber} (${ord.customerName})`,
            date: new Date(now).toISOString().split('T')[0],
            time: new Date(now).toLocaleTimeString(),
            createdAt: now,
          });
          ord.isLedgerSynced = true;
        }
      }
      ord.updatedAt = now;
      saveInMemoryStoreToDisk();

      return res.json({
        success: true,
        message: '✅ ইনভেন্টরি স্টক সমন্বয় এবং দোকানের ক্যাশবুকে বিক্রয় এন্ট্রি সম্পন্ন হয়েছে!',
        order: ord,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/orders/track/:orderNumber/submit-payment
 * Customer submits or re-submits payment TrxID & Sender Phone for a Personal Store order
 */
router.post('/orders/track/:orderNumber/submit-payment', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const { paymentMethod, trxId, senderPhone, paidAmount } = req.body || {};
    if (!trxId || !String(trxId).trim()) {
      return res.status(400).json({ error: 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন।' });
    }

    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      await ensureOnlineOrdersSchema(pool);
      const chk = await pool.query(
        'SELECT * FROM online_orders WHERE order_number = $1 OR id = $1 LIMIT 1',
        [orderNumber]
      );
      if (chk.rows.length === 0) {
        return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
      }
      const ord = chk.rows[0];
      if (ord.order_source === 'marketplace' || ord.master_order_id) {
        return res.status(400).json({ error: 'সেন্ট্রাল মার্কেটপ্লেস অর্ডারের পেমেন্ট সেন্ট্রাল মল ট্র্যাকার থেকে জমা দিন।' });
      }

      const upd = await pool.query(
        `UPDATE online_orders
         SET payment_method = COALESCE($1, payment_method),
             trx_id = $2,
             sender_phone = COALESCE($3, sender_phone),
             paid_amount = COALESCE($4, paid_amount),
             payment_status = 'pending_verification',
             payment_reject_reason = NULL,
             updated_at = $5
         WHERE id = $6
         RETURNING *`,
        [
          paymentMethod || null,
          String(trxId).trim().toUpperCase(),
          senderPhone ? String(senderPhone).trim() : null,
          paidAmount ? parseFloat(paidAmount) : null,
          now,
          ord.id,
        ]
      );

      return res.json({
        success: true,
        message: '✅ আপনার পেমেন্ট তথ্য (TrxID) ভেন্ডরের কাছে যাচাইয়ের জন্য পাঠানো হয়েছে!',
        order: mapDbRowToOrder(upd.rows[0]),
      });
    } else {
      const ord = (inMemoryStore.online_orders || []).find(
        (o) => o.orderNumber === orderNumber || o.id === orderNumber
      );
      if (!ord) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
      if (paymentMethod) ord.paymentMethod = paymentMethod;
      ord.trxId = String(trxId).trim().toUpperCase();
      if (senderPhone) ord.senderPhone = String(senderPhone).trim();
      if (paidAmount) ord.paidAmount = parseFloat(paidAmount);
      ord.paymentStatus = 'pending_verification';
      ord.paymentRejectReason = undefined;
      ord.updatedAt = now;
      saveInMemoryStoreToDisk();

      return res.json({
        success: true,
        message: '✅ আপনার পেমেন্ট তথ্য ভেন্ডরের কাছে যাচাইয়ের জন্য পাঠানো হয়েছে!',
        order: ord,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function sendCustomerOrderStatusSms(
  customerPhone?: string,
  customerName?: string,
  orderNumber?: string,
  status?: string,
  courierName?: string,
  courierTrackingCode?: string,
  deliveryManName?: string,
  deliveryManPhone?: string,
  vendorId?: string
) {
  if (!customerPhone || customerPhone.length < 11 || !status) return;
  const name = customerName || 'গ্রাহক';
  const num = orderNumber || '';
  const riderInfo = deliveryManName ? ` ডেলিভারি ম্যান: ${deliveryManName}${deliveryManPhone ? ` (${deliveryManPhone})` : ''}।` : '';

  let msg = '';
  if (status === 'cancelled') {
    msg = `TwingHisabi: দুঃখিত ${name}! আপনার অর্ডার #${num} বাতিল (Cancelled) করা হয়েছে। বিস্তারিত জানতে দোকানে যোগাযোগ করুন।`;
  } else if (status === 'confirmed') {
    msg = `TwingHisabi: অভিনন্দন ${name}! আপনার অর্ডার #${num} নিশ্চিত (Confirmed) করা হয়েছে এবং পার্সেল প্রস্তুত হচ্ছে।`;
  } else if (status === 'processing' || status === 'packed') {
    msg = `TwingHisabi: প্রিয় ${name}, আপনার অর্ডার #${num} প্যাকিং সম্পন্ন হয়েছে এবং শীঘ্রই ডেলিভারিতে পাঠানো হবে।${riderInfo}`;
  } else if (status === 'shipped' || status === 'out_for_delivery') {
    msg = `TwingHisabi: আপনার অর্ডার #${num} ডেলিভারির জন্য পাঠানো হয়েছে। মাধ্যম: ${courierName || 'ডেলিভারি সার্ভিস'}${courierTrackingCode ? ` (ট্র্যাকিং: ${courierTrackingCode})` : ''}।${riderInfo}`;
  } else if (status === 'delivered') {
    msg = `TwingHisabi: আপনার অর্ডার #${num} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। আমাদের সাথে কেনাকাটার জন্য ধন্যবাদ!`;
  }

  if (msg) {
    if (vendorId) {
      deductVendorSmsAndSend(vendorId, customerPhone, msg, {
        smsType: 'order_status_' + status,
        orderNumber: num,
        customerName: name,
      }).catch((err) => {
        console.warn('Customer store order status SMS deduct notification notice:', err?.message || err);
      });
    } else {
      sendSmsNotification(customerPhone, msg).catch((err) => {
        console.warn('Customer store order status SMS notification notice:', err?.message || err);
      });
    }
  }
}

/**
 * DELETE /api/store/orders/:orderId - Vendor deletes an order (Strictly Isolated)
 */
router.delete('/orders/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query('DELETE FROM online_orders WHERE id = $1 AND user_id = $2 RETURNING id', [
        orderId,
        userId,
      ]);
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'অর্ডারটি পাওয়া যায়নি বা আপনার মুছে ফেলার অনুমতি নেই।' });
      }
      return res.json({ success: true, message: 'অর্ডারটি সফলভাবে মুছে ফেলা হয়েছে।' });
    } else {
      const idx = (inMemoryStore.online_orders || []).findIndex((o) => o.id === orderId && o.userId === userId);
      if (idx === -1) {
        return res.status(403).json({ error: 'অর্ডারটি পাওয়া যায়নি বা আপনার মুছে ফেলার অনুমতি নেই।' });
      }
      inMemoryStore.online_orders.splice(idx, 1);
      return res.json({ success: true, message: 'অর্ডারটি সফলভাবে মুছে ফেলা হয়েছে।' });
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
    const cleanOrderNumber = (orderNumber || '').replace(/^#/, '').trim();
    const pool = getDbPool();

    if (pool) {
      await ensureOnlineOrdersSchema(pool);
      const result = await pool.query(
        'SELECT * FROM online_orders WHERE order_number = $1 OR id = $1 OR order_number = $2 OR id = $2 LIMIT 1',
        [cleanOrderNumber, orderNumber]
      );
      if (result.rows.length > 0) {
        return res.json({ order: mapDbRowToOrder(result.rows[0]) });
      }
      return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
    } else {
      const order = (inMemoryStore.online_orders || []).find(
        (o) => o.orderNumber === cleanOrderNumber || o.id === cleanOrderNumber || o.orderNumber === orderNumber || o.id === orderNumber
      );
      if (order) return res.json({ order });
      return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি।' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/store/chat/threads
 * Authenticated vendor gets all customer chat threads grouped by thread_id
 */
router.get('/chat/threads', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        `SELECT * FROM store_chat_messages WHERE vendor_id = $1 ORDER BY created_at ASC`,
        [userId]
      );

      const threadMap = new Map<string, any>();
      for (const row of result.rows) {
        const thId = row.thread_id;
        if (!threadMap.has(thId)) {
          threadMap.set(thId, {
            id: thId,
            customerName: row.customer_name || 'সম্মানিত ক্রেতা',
            customerPhone: row.customer_phone || '',
            lastMessage: row.text,
            lastMessageAt: Number(row.created_at),
            unreadByVendor: 0,
            unreadByCustomer: 0,
            messages: [],
          });
        }
        const thread = threadMap.get(thId);
        if (row.customer_name && row.customer_name !== 'সম্মানিত ক্রেতা') {
          thread.customerName = row.customer_name;
        }
        if (row.customer_phone) {
          thread.customerPhone = row.customer_phone;
        }
        thread.lastMessage = row.text;
        thread.lastMessageAt = Number(row.created_at);
        if (row.sender === 'customer' && !row.is_read_by_vendor) {
          thread.unreadByVendor += 1;
        }
        if (row.sender === 'vendor' && !row.is_read_by_customer) {
          thread.unreadByCustomer += 1;
        }
        thread.messages.push({
          id: row.id,
          sender: row.sender,
          senderName: row.sender_name || (row.sender === 'vendor' ? 'দোকানদার' : thread.customerName),
          senderPhone: row.sender_phone || '',
          text: row.text,
          timestamp: Number(row.created_at),
        });
      }

      const threads = Array.from(threadMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      return res.json({ threads });
    } else {
      const list = (inMemoryStore.store_chat_messages || []).filter((m: any) => m.vendor_id === userId);
      const threadMap = new Map<string, any>();
      for (const row of list) {
        const thId = row.thread_id;
        if (!threadMap.has(thId)) {
          threadMap.set(thId, {
            id: thId,
            customerName: row.customer_name || 'সম্মানিত ক্রেতা',
            customerPhone: row.customer_phone || '',
            lastMessage: row.text,
            lastMessageAt: Number(row.created_at),
            unreadByVendor: 0,
            unreadByCustomer: 0,
            messages: [],
          });
        }
        const thread = threadMap.get(thId);
        if (row.customer_name && row.customer_name !== 'সম্মানিত ক্রেতা') {
          thread.customerName = row.customer_name;
        }
        if (row.customer_phone) {
          thread.customerPhone = row.customer_phone;
        }
        thread.lastMessage = row.text;
        thread.lastMessageAt = Number(row.created_at);
        if (row.sender === 'customer' && !row.is_read_by_vendor) {
          thread.unreadByVendor += 1;
        }
        if (row.sender === 'vendor' && !row.is_read_by_customer) {
          thread.unreadByCustomer += 1;
        }
        thread.messages.push({
          id: row.id,
          sender: row.sender,
          senderName: row.sender_name || (row.sender === 'vendor' ? 'দোকানদার' : thread.customerName),
          senderPhone: row.sender_phone || '',
          text: row.text,
          timestamp: Number(row.created_at),
        });
      }

      const threads = Array.from(threadMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      return res.json({ threads });
    }
  } catch (err: any) {
    console.error('Error fetching vendor chat threads:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/chat/reply
 * Authenticated vendor sends a reply to a specific customer thread
 */
router.post('/chat/reply', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { threadId, text, storeName } = req.body;

    if (!threadId || !text || !text.trim()) {
      return res.status(400).json({ error: 'থ্রেড আইডি এবং মেসেজ টেক্সট আবশ্যক।' });
    }

    const cleanText = text.trim();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const senderName = storeName || req.user?.shopName || 'দোকানদার';

    const pool = getDbPool();
    let custName = 'সম্মানিত ক্রেতা';
    let custPhone = '';

    if (pool) {
      const prevMsg = await pool.query(
        `SELECT customer_name, customer_phone FROM store_chat_messages WHERE vendor_id = $1 AND thread_id = $2 LIMIT 1`,
        [userId, threadId]
      );
      if (prevMsg.rows.length > 0) {
        custName = prevMsg.rows[0].customer_name || custName;
        custPhone = prevMsg.rows[0].customer_phone || custPhone;
      }

      await pool.query(
        `INSERT INTO store_chat_messages (
          id, vendor_id, thread_id, customer_name, customer_phone, sender, sender_name, sender_phone, text, is_read_by_vendor, is_read_by_customer, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          msgId,
          userId,
          threadId,
          custName,
          custPhone,
          'vendor',
          senderName,
          '',
          cleanText,
          true,
          false,
          now,
        ]
      );

      // Mark previous customer messages as read
      await pool.query(
        `UPDATE store_chat_messages SET is_read_by_vendor = TRUE WHERE vendor_id = $1 AND thread_id = $2`,
        [userId, threadId]
      );
    } else {
      if (!inMemoryStore.store_chat_messages) inMemoryStore.store_chat_messages = [];
      const prev = inMemoryStore.store_chat_messages.find((m: any) => m.vendor_id === userId && m.thread_id === threadId);
      if (prev) {
        custName = prev.customer_name || custName;
        custPhone = prev.customer_phone || custPhone;
      }

      inMemoryStore.store_chat_messages.push({
        id: msgId,
        vendor_id: userId,
        thread_id: threadId,
        customer_name: custName,
        customer_phone: custPhone,
        sender: 'vendor',
        sender_name: senderName,
        sender_phone: '',
        text: cleanText,
        is_read_by_vendor: true,
        is_read_by_customer: false,
        created_at: now,
      });

      inMemoryStore.store_chat_messages.forEach((m: any) => {
        if (m.vendor_id === userId && m.thread_id === threadId) {
          m.is_read_by_vendor = true;
        }
      });
      saveInMemoryStoreToDisk();
    }

    return res.json({
      success: true,
      message: {
        id: msgId,
        sender: 'vendor',
        senderName,
        text: cleanText,
        timestamp: now,
      },
    });
  } catch (err: any) {
    console.error('Error replying to customer chat:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/store/chat/mark-read
 * Mark thread as read by vendor
 */
router.post('/chat/mark-read', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { threadId } = req.body;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `UPDATE store_chat_messages SET is_read_by_vendor = TRUE WHERE vendor_id = $1 AND thread_id = $2`,
        [userId, threadId]
      );
    } else {
      (inMemoryStore.store_chat_messages || []).forEach((m: any) => {
        if (m.vendor_id === userId && m.thread_id === threadId) {
          m.is_read_by_vendor = true;
        }
      });
      saveInMemoryStoreToDisk();
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/store/chat/threads/:threadId
 * Vendor deletes a customer thread
 */
router.delete('/chat/threads/:threadId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { threadId } = req.params;

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `DELETE FROM store_chat_messages WHERE vendor_id = $1 AND thread_id = $2`,
        [userId, threadId]
      );
    } else {
      inMemoryStore.store_chat_messages = (inMemoryStore.store_chat_messages || []).filter(
        (m: any) => !(m.vendor_id === userId && m.thread_id === threadId)
      );
      saveInMemoryStoreToDisk();
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
