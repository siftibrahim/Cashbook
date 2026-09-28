import sys

with open('server/routes/marketplaceRoutes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Verify initial lines
assert 'function getVerifiedDevicesStore():' in lines[454], f"Line 454 mismatch: {lines[454]}"
assert '3.5 POST /api/marketplace/toggle-product' in lines[647], f"Line 647 mismatch: {lines[647]}"
assert '6. POST /api/marketplace/toggle-product' in lines[1396], f"Line 1396 mismatch: {lines[1396]}"
assert '9. POST /api/marketplace/admin/orders/sub/:subOrderId/payout' in lines[2086], f"Line 2086 mismatch: {lines[2086]}"
assert '10. POST /api/marketplace/admin/products/:productId/moderate' in lines[2126], f"Line 2126 mismatch: {lines[2126]}"
assert '11. POST /api/marketplace/admin/categories' in lines[2170], f"Line 2170 mismatch: {lines[2170]}"
assert '17. POST /api/marketplace/admin/payout-requests/:id/process' in lines[2757], f"Line 2757 mismatch: {lines[2757]}"
assert 'GET /api/marketplace/sitemap.xml' in lines[2994], f"Line 2994 mismatch: {lines[2994]}"

# 1. Replace Route 17 (process payout requests) [lines 2756 to 2992]
new_process_payout = """/**
 * 17. POST /api/marketplace/admin/payout-requests/:id/process - Super Admin Approves, Rejects, Holds, or Unholds Payout
 */
router.post('/admin/payout-requests/:id/process', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });
    }

    const { id } = req.params;
    const { action, adminTransactionId, adminNote } = req.body;

    if (!action || !['approve', 'reject', 'hold', 'unhold'].includes(action)) {
      return res.status(400).json({ error: 'সঠিক অ্যাকশন (approve, reject, hold বা unhold) নির্বাচন করুন' });
    }

    if (action === 'approve' && (!adminTransactionId || !adminTransactionId.trim())) {
      return res.status(400).json({ error: 'বিকাশ/নগদ/ব্যাংক ট্রান্সফার TrxID প্রদান আবশ্যক' });
    }

    const now = Date.now();
    const pool = getDbPool();

    if (pool) {
      // 1. Fetch the request
      const reqRes = await pool.query('SELECT * FROM vendor_payout_requests WHERE id = $1', [id]);
      if (reqRes.rows.length === 0) {
        return res.status(404).json({ error: 'পেআউট আবেদনটি পাওয়া যায়নি' });
      }

      const payoutReq = reqRes.rows[0];
      const targetUserId = payoutReq.user_id;
      const amount = parseFloat(payoutReq.amount) || 0;
      const cleanTrx = (adminTransactionId || '').trim();

      if (action === 'approve') {
        // Update request status to approved
        await pool.query(`
          UPDATE vendor_payout_requests
          SET status = 'approved',
              admin_transaction_id = $1,
              admin_note = $2,
              processed_at = $3,
              updated_at = $3
          WHERE id = $4
        `, [cleanTrx, adminNote || null, now, id]);

        // Mark unsettled delivered orders of this vendor as settled up to this amount
        try {
          const deliveredOrders = await pool.query(`
            SELECT id, total_amount FROM online_orders 
            WHERE user_id = $1 
              AND (order_source = 'marketplace' OR master_order_id IS NOT NULL)
              AND order_status = 'delivered'
              AND (vendor_payout_status IS NULL OR vendor_payout_status != 'settled')
            ORDER BY created_at ASC
          `, [targetUserId]);

          let remainingToSettle = amount;
          for (const ord of deliveredOrders.rows) {
            if (remainingToSettle <= 0) break;
            const ordAmt = parseFloat(ord.total_amount) || 0;
            await pool.query(`
              UPDATE online_orders 
              SET vendor_payout_status = 'settled',
                  updated_at = $1
              WHERE id = $2
            `, [now, ord.id]);
            remainingToSettle -= ordAmt;
          }
        } catch (e) {
          console.warn('Order payout status update notice:', e);
        }

        // Auto-Ledger integration: Record in Digital Khata for Vendor
        try {
          const custCheck = await pool.query(`
            SELECT id, balance FROM customers 
            WHERE user_id = $1 AND (name ILIKE '%সেন্ট্রাল মার্কেটপ্লেস%' OR phone = '01700000000')
            LIMIT 1
          `, [targetUserId]);

          let mktCustomerId = '';
          let currentBalance = 0;
          if (custCheck.rows.length > 0) {
            mktCustomerId = custCheck.rows[0].id;
            currentBalance = parseFloat(custCheck.rows[0].balance) || 0;
          } else {
            mktCustomerId = 'cust_mkt_' + targetUserId.substring(0, 8);
            await pool.query(`
              INSERT INTO customers (id, user_id, name, phone, address, balance, created_at, updated_at)
              VALUES ($1, $2, 'সেন্ট্রাল মার্কেটপ্লেস মল', '01700000000', 'ঢাকা, বাংলাদেশ', 0, $3, $3)
              ON CONFLICT (id) DO NOTHING
            `, [mktCustomerId, targetUserId, now]);
          }

          // Add transaction
          const txId = 'tx_payout_' + now.toString(36) + Math.random().toString(36).substring(2, 6);
          const dateStr = new Date(now).toISOString().split('T')[0];
          const timeStr = new Date(now).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
          const newBal = currentBalance - amount;

          await pool.query(`
            INSERT INTO transactions (
              id, user_id, customer_id, type, amount, description, 
              date, time, balance_after, payment_method, created_at
            ) VALUES ($1, $2, $3, 'payment', $4, $5, $6, $7, $8, $9, $10)
          `, [
            txId,
            targetUserId,
            mktCustomerId,
            amount,
            `সেন্ট্রাল মল পেআউট জমা (TrxID: ${cleanTrx})${adminNote ? ` [নোট: ${adminNote}]` : ''}`,
            dateStr,
            timeStr,
            newBal,
            payoutReq.payment_method || 'bkash',
            now,
          ]);

          // Update customer balance
          await pool.query(`
            UPDATE customers SET balance = $1, updated_at = $2 WHERE id = $3
          `, [newBal, now, mktCustomerId]);
        } catch (e) {
          console.warn('Auto-ledger transaction creation notice:', e);
        }

        // Targeted Notification for Vendor
        const notifId = 'notif_payout_ok_' + now;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payout', 'user', $4, 2, false, $5)
        `, [
          notifId,
          '🎉 সেন্ট্রাল মার্কেটপ্লেস পেআউট পরিশোধ সম্পন্ন!',
          `আপনার ৳${amount.toLocaleString('en-US')} উত্তোলনের আবেদন সফলভাবে পরিশোধ করা হয়েছে। মাধ্যম: ${(payoutReq.payment_method || 'bKash').toUpperCase()} (${payoutReq.account_number}), TrxID: ${cleanTrx}। টাকাটি আপনার ডিজিটাল ক্যাশবুকে স্বয়ংক্রিয়ভাবে জমা যুক্ত করা হয়েছে।`,
          targetUserId,
          now,
        ]).catch(() => {});

        // Send SMS to vendor
        const vendorTargetPhone = payoutReq.store_phone || payoutReq.account_number;
        if (vendorTargetPhone && vendorTargetPhone.length >= 11) {
          const smsText = `TwingHisabi: আপনার সেন্ট্রাল মল পেআউট ৳${amount} পরিশোধ সম্পন্ন হয়েছে। TrxID: ${cleanTrx}। টাকাটি আপনার ক্যাশবুকে জমা হয়েছে।`;
          sendSmsNotification(vendorTargetPhone, smsText).catch((err) => {
            console.warn('Vendor payout SMS notification notice:', err?.message || err);
          });
        }

        return res.json({
          success: true,
          message: `ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক করা হয়েছে (TrxID: ${cleanTrx})। ক্যাশবুক ও নোটিফিকেশন আপডেট সম্পন্ন।`,
        });
      } else if (action === 'hold') {
        // Hold Payout Request
        await pool.query(`
          UPDATE vendor_payout_requests
          SET status = 'hold',
              admin_note = $1,
              processed_at = $2,
              updated_at = $2
          WHERE id = $3
        `, [adminNote || 'অ্যাডমিন কর্তৃক পেমেন্ট সাময়িক স্থগিত রাখা হয়েছে', now, id]);

        const notifId = 'notif_payout_hold_' + now;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payout', 'user', $4, 2, false, $5)
        `, [
          notifId,
          '⏸️ পেআউট আবেদন সাময়িকভাবে স্থগিত (Hold) রাখা হয়েছে',
          `আপনার ৳${amount.toLocaleString('en-US')} উত্তোলনের আবেদনটি সুপার অ্যাডমিন কর্তৃক সাময়িক স্থগিত (Hold) রাখা হয়েছে। কারণ/নোট: ${adminNote || 'তদন্ত বা তথ্য যাচাই চলছে'}।`,
          targetUserId,
          now,
        ]).catch(() => {});

        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি সাময়িকভাবে হোল্ড / স্থগিত রাখা হয়েছে।',
        });
      } else if (action === 'unhold') {
        // Unhold Payout Request
        await pool.query(`
          UPDATE vendor_payout_requests
          SET status = 'pending',
              admin_note = $1,
              processed_at = NULL,
              updated_at = $2
          WHERE id = $3
        `, [adminNote || 'হোল্ড তুলে নেওয়া হয়েছে, আবেদনটি পুনরায় অপেক্ষমাণ রয়েছে', now, id]);

        const notifId = 'notif_payout_unh_' + now;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payout', 'user', $4, 1, false, $5)
        `, [
          notifId,
          '▶️ পেআউট আবেদন আনহোল্ড করা হয়েছে',
          `আপনার ৳${amount.toLocaleString('en-US')} উত্তোলনের আবেদনের সাময়িক স্থগিতাদেশ প্রত্যাহার করা হয়েছে এবং এটি প্রক্রিয়াকরণের জন্য অপেক্ষমাণ রয়েছে।`,
          targetUserId,
          now,
        ]).catch(() => {});

        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি আনহোল্ড করা হয়েছে এবং অপেক্ষমাণ তালিকায় ফিরিয়ে নেওয়া হয়েছে।',
        });
      } else {
        // Reject Payout Request
        await pool.query(`
          UPDATE vendor_payout_requests
          SET status = 'rejected',
              admin_note = $1,
              processed_at = $2,
              updated_at = $2
          WHERE id = $3
        `, [adminNote || 'বাতিল করা হয়েছে', now, id]);

        const notifId = 'notif_payout_rej_' + now;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payout', 'user', $4, 1, false, $5)
        `, [
          notifId,
          '⚠️ পেআউট উত্তোলনের আবেদন বাতিল হয়েছে',
          `আপনার ৳${amount.toLocaleString('en-US')} পেআউট আবেদনটি সুপার অ্যাডমিন কর্তৃক বাতিল করা হয়েছে। কারণ: ${adminNote || 'তথ্য অসম্পূর্ণ বা ত্রুটিপূর্ণ'}। আপনার একাউন্টে ব্যালেন্স বহাল রয়েছে।`,
          targetUserId,
          now,
        ]).catch(() => {});

        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি বাতিল মার্ক করা হয়েছে এবং ভেন্ডরকে নোটিফিকেশন পাঠানো হয়েছে।',
        });
      }
    } else {
      // In-memory fallback
      const requests = (inMemoryStore as any).vendor_payout_requests || [];
      const payoutReq = requests.find((r: any) => r.id === id);
      if (!payoutReq) {
        return res.status(404).json({ error: 'পেআউট আবেদনটি পাওয়া যায়নি' });
      }

      const cleanTrx = (adminTransactionId || '').trim();
      payoutReq.processedAt = now;
      payoutReq.updatedAt = now;

      if (action === 'approve') {
        payoutReq.status = 'approved';
        payoutReq.adminTransactionId = cleanTrx;
        payoutReq.adminNote = adminNote || null;

        const orders = (inMemoryStore.online_orders || []).filter(
          (o: any) => (o.userId === payoutReq.userId || o.user_id === payoutReq.userId) && o.orderStatus === 'delivered'
        );
        let rem = payoutReq.amount;
        for (const ord of orders) {
          if (rem <= 0) break;
          ord.vendorPayoutStatus = 'settled';
          ord.updatedAt = now;
          rem -= (Number(ord.totalAmount) || 0);
        }
        saveInMemoryStoreToDisk();
        return res.json({
          success: true,
          message: `ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক করা হয়েছে (TrxID: ${cleanTrx})।`,
        });
      } else if (action === 'hold') {
        payoutReq.status = 'hold';
        payoutReq.adminNote = adminNote || 'পেমেন্ট সাময়িক স্থগিত রাখা হয়েছে';
        saveInMemoryStoreToDisk();
        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি সাময়িকভাবে স্থগিত (Hold) করা হয়েছে।',
        });
      } else if (action === 'unhold') {
        payoutReq.status = 'pending';
        payoutReq.adminNote = adminNote || null;
        saveInMemoryStoreToDisk();
        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি আনহোল্ড করা হয়েছে।',
        });
      } else {
        payoutReq.status = 'rejected';
        payoutReq.adminNote = adminNote || 'বাতিল করা হয়েছে';
        saveInMemoryStoreToDisk();
        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি বাতিল মার্ক করা হয়েছে।',
        });
      }
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
"""

lines[2756:2992] = [new_process_payout + "\n"]

# Write intermediate to safely recalculate indexes or use string replaces
content = "".join(lines)

# 2. In Route 15 (vendor/payout-request), check for vendor hold and deduct held orders
old_pr_check = """      const available = Math.max(0, deliveredSales - settledSales - pendingWithdrawals);

      if (numAmount > available) {"""

new_pr_check = """      const vendorHolds = await loadVendorPayoutHolds();
      if (vendorHolds[userId]?.isHeld) {
        return res.status(403).json({
          error: `আপনার পেআউট অ্যাকাউন্ট সাময়িকভাবে স্থগিত (Hold) রাখা হয়েছে (${vendorHolds[userId]?.reason || 'অ্যাডমিন তদন্তাধীন'})। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।`,
        });
      }

      const heldSales = ordersRes.rows
        .filter(o => o.vendor_payout_status === 'held' || o.vendor_payout_status === 'hold')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

      const onHoldWithdrawals = existingPayouts.rows
        .filter(p => p.status === 'hold' || p.status === 'on_hold')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const available = Math.max(0, deliveredSales - settledSales - heldSales - pendingWithdrawals - onHoldWithdrawals);

      if (numAmount > available) {"""

assert old_pr_check in content, "old_pr_check not found"
content = content.replace(old_pr_check, new_pr_check, 1)

# 3. In Route 14 (vendor/wallet), deduct held sales and return held status
old_wallet_pg = """      // Available balance is delivered money minus what is already settled minus what is currently pending review
      const availableForWithdrawal = Math.max(0, deliveredSales - settledSales - pendingWithdrawalAmount);

      return res.json({
        success: true,
        totalSales,
        deliveredSales,
        settledSales,
        pendingDeliverySales,
        pendingWithdrawalAmount,
        availableForWithdrawal,
        deliveredOrdersCount: deliveredOrders.length,
        pendingOrdersCount: nonCancelledOrders.length - deliveredOrders.length,
        payoutRequests,
      });"""

new_wallet_pg = """      const heldOrders = nonCancelledOrders.filter(o => o.vendorPayoutStatus === 'held' || o.vendorPayoutStatus === 'hold');
      const heldSales = heldOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      const onHoldWithdrawalAmount = payoutRequests
        .filter(p => p.status === 'hold' || p.status === 'on_hold')
        .reduce((sum, p) => sum + p.amount, 0);

      const vendorHolds = await loadVendorPayoutHolds();
      const isPayoutHeld = Boolean(vendorHolds[userId]?.isHeld);
      const payoutHoldReason = vendorHolds[userId]?.reason || '';

      const availableForWithdrawal = isPayoutHeld
        ? 0
        : Math.max(0, deliveredSales - settledSales - heldSales - pendingWithdrawalAmount - onHoldWithdrawalAmount);

      return res.json({
        success: true,
        totalSales,
        deliveredSales,
        settledSales,
        heldSales,
        isPayoutHeld,
        payoutHoldReason,
        pendingDeliverySales,
        pendingWithdrawalAmount,
        onHoldWithdrawalAmount,
        availableForWithdrawal,
        deliveredOrdersCount: deliveredOrders.length,
        pendingOrdersCount: nonCancelledOrders.length - deliveredOrders.length,
        payoutRequests,
      });"""

assert old_wallet_pg in content, "old_wallet_pg not found"
content = content.replace(old_wallet_pg, new_wallet_pg, 1)

old_wallet_mem = """      const availableForWithdrawal = Math.max(0, deliveredSales - settledSales - pendingWithdrawalAmount);

      return res.json({
        success: true,
        totalSales,
        deliveredSales,
        settledSales,
        pendingDeliverySales,
        pendingWithdrawalAmount,
        availableForWithdrawal,
        deliveredOrdersCount: deliveredOrders.length,
        pendingOrdersCount: nonCancelledOrders.length - deliveredOrders.length,
        payoutRequests,
      });"""

new_wallet_mem = """      const heldOrders = nonCancelledOrders.filter((o: any) => o.vendorPayoutStatus === 'held' || o.vendorPayoutStatus === 'hold');
      const heldSales = heldOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

      const onHoldWithdrawalAmount = payoutRequests
        .filter((p: any) => p.status === 'hold' || p.status === 'on_hold')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const vendorHolds = await loadVendorPayoutHolds();
      const isPayoutHeld = Boolean(vendorHolds[userId]?.isHeld);
      const payoutHoldReason = vendorHolds[userId]?.reason || '';

      const availableForWithdrawal = isPayoutHeld
        ? 0
        : Math.max(0, deliveredSales - settledSales - heldSales - pendingWithdrawalAmount - onHoldWithdrawalAmount);

      return res.json({
        success: true,
        totalSales,
        deliveredSales,
        settledSales,
        heldSales,
        isPayoutHeld,
        payoutHoldReason,
        pendingDeliverySales,
        pendingWithdrawalAmount,
        onHoldWithdrawalAmount,
        availableForWithdrawal,
        deliveredOrdersCount: deliveredOrders.length,
        pendingOrdersCount: nonCancelledOrders.length - deliveredOrders.length,
        payoutRequests,
      });"""

assert old_wallet_mem in content, "old_wallet_mem not found"
content = content.replace(old_wallet_mem, new_wallet_mem, 1)

# 4. Replace Route 10 with enhanced moderate + delete + batch + vendor hold
old_moderate_target = """/**
 * 10. POST /api/marketplace/admin/products/:productId/moderate - Super Admin Moderates Vendor Product
 */
router.post('/admin/products/:productId/moderate', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { productId } = req.params;
    const { isListedOnMarketplace, isFeaturedOnMarketplace, marketplaceStatus } = req.body;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE products 
        SET is_listed_on_marketplace = COALESCE($1, is_listed_on_marketplace),
            is_featured_on_marketplace = COALESCE($2, is_featured_on_marketplace),
            marketplace_status = COALESCE($3, marketplace_status),
            updated_at = $4
        WHERE id = $5
      `, [
        isListedOnMarketplace !== undefined ? Boolean(isListedOnMarketplace) : null,
        isFeaturedOnMarketplace !== undefined ? Boolean(isFeaturedOnMarketplace) : null,
        marketplaceStatus || null,
        Date.now(),
        productId,
      ]);
    } else {
      const p = (inMemoryStore.products || []).find(x => x.id === productId);
      if (p) {
        if (isListedOnMarketplace !== undefined) p.isListedOnMarketplace = Boolean(isListedOnMarketplace);
        if (isFeaturedOnMarketplace !== undefined) p.isFeaturedOnMarketplace = Boolean(isFeaturedOnMarketplace);
        if (marketplaceStatus) p.marketplaceStatus = marketplaceStatus;
        p.updatedAt = Date.now();
        saveInMemoryStoreToDisk();
      }
    }

    return res.json({ success: true, message: 'পণ্যের মার্কেটপ্লেস স্ট্যাটাস আপডেট করা হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});"""

new_moderate_suite = """/**
 * 10. POST /api/marketplace/admin/products/:productId/moderate - Super Admin Moderates Vendor Product
 */
router.post('/admin/products/:productId/moderate', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { productId } = req.params;
    let { isListedOnMarketplace, isFeaturedOnMarketplace, marketplaceStatus } = req.body;
    const now = Date.now();

    // 🔒 Enforce status consistency
    if (marketplaceStatus === 'blocked') {
      isListedOnMarketplace = false;
      isFeaturedOnMarketplace = false;
    } else if (marketplaceStatus === 'approved') {
      isListedOnMarketplace = true;
    } else if (marketplaceStatus === 'unlisted') {
      isListedOnMarketplace = false;
    }

    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE products 
        SET is_listed_on_marketplace = COALESCE($1, is_listed_on_marketplace),
            is_featured_on_marketplace = COALESCE($2, is_featured_on_marketplace),
            marketplace_status = COALESCE($3, marketplace_status),
            updated_at = $4
        WHERE id = $5
      `, [
        isListedOnMarketplace !== undefined ? Boolean(isListedOnMarketplace) : null,
        isFeaturedOnMarketplace !== undefined ? Boolean(isFeaturedOnMarketplace) : null,
        marketplaceStatus || null,
        now,
        productId,
      ]);
    } else {
      const p = (inMemoryStore.products || []).find(x => x.id === productId);
      if (p) {
        if (isListedOnMarketplace !== undefined) p.isListedOnMarketplace = Boolean(isListedOnMarketplace);
        if (isFeaturedOnMarketplace !== undefined) p.isFeaturedOnMarketplace = Boolean(isFeaturedOnMarketplace);
        if (marketplaceStatus) p.marketplaceStatus = marketplaceStatus;
        p.updatedAt = now;
        saveInMemoryStoreToDisk();
      }
    }

    let msg = 'পণ্যের মার্কেটপ্লেস স্ট্যাটাস আপডেট করা হয়েছে';
    if (marketplaceStatus === 'blocked') msg = '🚫 পণ্যটি সেন্ট্রাল মার্কেটপ্লেস থেকে ব্লক / স্থগিত করা হয়েছে।';
    else if (marketplaceStatus === 'approved') msg = '✅ পণ্যটি সেন্ট্রাল মলে সফলভাবে পাবলিশ ও অনুমোদন করা হয়েছে।';
    else if (marketplaceStatus === 'unlisted') msg = 'পণ্যটি সেন্ট্রাল মল থেকে আনপাবলিশ করা হয়েছে।';

    return res.json({ success: true, message: msg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10a. DELETE /api/marketplace/admin/products/:productId - Super Admin Deletes Product (Permanent or Unlist)
 */
router.delete('/admin/products/:productId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { productId } = req.params;
    const permanent = req.query.permanent === 'true';
    const pool = getDbPool();
    const now = Date.now();

    if (pool) {
      if (permanent) {
        await pool.query('DELETE FROM products WHERE id = $1', [productId]);
      } else {
        await pool.query(`
          UPDATE products 
          SET is_listed_on_marketplace = FALSE,
              is_featured_on_marketplace = FALSE,
              marketplace_status = 'unlisted',
              updated_at = $1
          WHERE id = $2
        `, [now, productId]);
      }
    } else {
      if (permanent) {
        inMemoryStore.products = (inMemoryStore.products || []).filter(p => p.id !== productId);
      } else {
        const p = (inMemoryStore.products || []).find(x => x.id === productId);
        if (p) {
          p.isListedOnMarketplace = false;
          p.isFeaturedOnMarketplace = false;
          p.marketplaceStatus = 'unlisted';
          p.updatedAt = now;
        }
      }
      saveInMemoryStoreToDisk();
    }

    return res.json({
      success: true,
      message: permanent
        ? '🗑️ পণ্যটি সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।'
        : 'পণ্যটি সেন্ট্রাল মার্কেটপ্লেস থেকে সফলভাবে সরিয়ে দেওয়া হয়েছে।',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10b. POST /api/marketplace/admin/products/batch - Super Admin Batch Moderation/Deletion of Products
 */
router.post('/admin/products/batch', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { action, productIds = [], adminNote, permanent = false } = req.body;
    const pool = getDbPool();
    const now = Date.now();

    if (action === 'delete_all_marketplace' || action === 'remove_all_marketplace') {
      if (pool) {
        await pool.query(`
          UPDATE products 
          SET is_listed_on_marketplace = FALSE,
              is_featured_on_marketplace = FALSE,
              marketplace_status = 'unlisted',
              updated_at = $1
          WHERE is_listed_on_marketplace = TRUE OR is_featured_on_marketplace = TRUE
        `, [now]);
      } else {
        (inMemoryStore.products || []).forEach(p => {
          p.isListedOnMarketplace = false;
          p.isFeaturedOnMarketplace = false;
          p.marketplaceStatus = 'unlisted';
          p.updatedAt = now;
        });
        saveInMemoryStoreToDisk();
      }
      return res.json({ success: true, message: 'সেন্ট্রাল মলের সকল পণ্য সফলভাবে আনপাবলিশ / রিমুভ করা হয়েছে।' });
    }

    if (action === 'permanent_delete_all_marketplace') {
      if (pool) {
        await pool.query(`
          DELETE FROM products 
          WHERE is_listed_on_marketplace = TRUE OR marketplace_status = 'approved'
        `);
      } else {
        inMemoryStore.products = (inMemoryStore.products || []).filter(
          p => !p.isListedOnMarketplace && p.marketplaceStatus !== 'approved'
        );
        saveInMemoryStoreToDisk();
      }
      return res.json({ success: true, message: 'মার্কেটপ্লেসের সকল পণ্য স্থায়ীভাবে মুছে ফেলা হয়েছে।' });
    }

    if (action === 'publish_all') {
      if (pool) {
        await pool.query(`
          UPDATE products 
          SET is_listed_on_marketplace = TRUE,
              marketplace_status = 'approved',
              updated_at = $1
          WHERE is_published_online = TRUE AND (marketplace_status != 'blocked' OR marketplace_status IS NULL)
        `, [now]);
      } else {
        (inMemoryStore.products || []).forEach(p => {
          if (p.isPublishedOnline !== false && p.marketplaceStatus !== 'blocked') {
            p.isListedOnMarketplace = true;
            p.marketplaceStatus = 'approved';
            p.updatedAt = now;
          }
        });
        saveInMemoryStoreToDisk();
      }
      return res.json({ success: true, message: 'সকল ভেন্ডর পাবলিক পণ্য সেন্ট্রাল মার্কেটপ্লেসে পাবলিশ করা হয়েছে।' });
    }

    if (action === 'block_all') {
      if (pool) {
        await pool.query(`
          UPDATE products 
          SET is_listed_on_marketplace = FALSE,
              is_featured_on_marketplace = FALSE,
              marketplace_status = 'blocked',
              updated_at = $1
        `, [now]);
      } else {
        (inMemoryStore.products || []).forEach(p => {
          p.isListedOnMarketplace = false;
          p.isFeaturedOnMarketplace = false;
          p.marketplaceStatus = 'blocked';
          p.updatedAt = now;
        });
        saveInMemoryStoreToDisk();
      }
      return res.json({ success: true, message: 'সকল পণ্য সফলভাবে ব্লক / স্থগিত করা হয়েছে।' });
    }

    if (Array.isArray(productIds) && productIds.length > 0) {
      if (action === 'selected_delete') {
        if (pool) {
          if (permanent) {
            await pool.query('DELETE FROM products WHERE id = ANY($1::text[])', [productIds]);
          } else {
            await pool.query(`
              UPDATE products 
              SET is_listed_on_marketplace = FALSE,
                  is_featured_on_marketplace = FALSE,
                  marketplace_status = 'unlisted',
                  updated_at = $1
              WHERE id = ANY($2::text[])
            `, [now, productIds]);
          }
        } else {
          if (permanent) {
            const set = new Set(productIds);
            inMemoryStore.products = (inMemoryStore.products || []).filter(p => !set.has(p.id));
          } else {
            const set = new Set(productIds);
            (inMemoryStore.products || []).forEach(p => {
              if (set.has(p.id)) {
                p.isListedOnMarketplace = false;
                p.isFeaturedOnMarketplace = false;
                p.marketplaceStatus = 'unlisted';
                p.updatedAt = now;
              }
            });
          }
          saveInMemoryStoreToDisk();
        }
        return res.json({ success: true, message: `নির্বাচিত ${productIds.length}টি পণ্য সফলভাবে মুছে দেওয়া হয়েছে।` });
      }

      if (action === 'selected_publish') {
        if (pool) {
          await pool.query(`
            UPDATE products 
            SET is_listed_on_marketplace = TRUE,
                marketplace_status = 'approved',
                updated_at = $1
            WHERE id = ANY($2::text[])
          `, [now, productIds]);
        } else {
          const set = new Set(productIds);
          (inMemoryStore.products || []).forEach(p => {
            if (set.has(p.id)) {
              p.isListedOnMarketplace = true;
              p.marketplaceStatus = 'approved';
              p.updatedAt = now;
            }
          });
          saveInMemoryStoreToDisk();
        }
        return res.json({ success: true, message: `নির্বাচিত ${productIds.length}টি পণ্য সেন্ট্রাল মলে পাবলিশ করা হয়েছে।` });
      }

      if (action === 'selected_block') {
        if (pool) {
          await pool.query(`
            UPDATE products 
            SET is_listed_on_marketplace = FALSE,
                is_featured_on_marketplace = FALSE,
                marketplace_status = 'blocked',
                updated_at = $1
            WHERE id = ANY($2::text[])
          `, [now, productIds]);
        } else {
          const set = new Set(productIds);
          (inMemoryStore.products || []).forEach(p => {
            if (set.has(p.id)) {
              p.isListedOnMarketplace = false;
              p.isFeaturedOnMarketplace = false;
              p.marketplaceStatus = 'blocked';
              p.updatedAt = now;
            }
          });
          saveInMemoryStoreToDisk();
        }
        return res.json({ success: true, message: `নির্বাচিত ${productIds.length}টি পণ্য সফলভাবে ব্লক করা হয়েছে।` });
      }
    }

    return res.status(400).json({ error: 'সঠিক অ্যাকশন নির্বাচন করুন' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10c. POST /api/marketplace/admin/vendors/:vendorId/hold-payout - Super Admin Freezes/Holds Vendor Payout
 */
router.post('/admin/vendors/:vendorId/hold-payout', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { vendorId } = req.params;
    const { isHeld, reason } = req.body;
    const holds = await loadVendorPayoutHolds();
    const now = Date.now();

    if (isHeld) {
      holds[vendorId] = {
        isHeld: true,
        reason: reason || 'অ্যাডমিন কর্তৃক তদন্তাধীন স্থগিত',
        heldAt: now,
        heldBy: req.user?.phone || req.user?.userId,
      };
    } else {
      delete holds[vendorId];
    }

    const pool = getDbPool();
    if (pool) {
      await pool.query(`
        INSERT INTO marketplace_settings (id, data, updated_at)
        VALUES ('vendor_payout_holds', $1, $2)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
      `, [JSON.stringify(holds), now]).catch(() => {});
    }
    saveInMemoryStoreToDisk();

    return res.json({
      success: true,
      isHeld: Boolean(isHeld),
      message: isHeld
        ? '⏸️ ভেন্ডরের পেআউট সফলভাবে হোল্ড / ফ্রিজ করা হয়েছে।'
        : '▶️ ভেন্ডরের পেআউট হোল্ড মুক্ত করা হয়েছে।',
      holds,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});"""

assert old_moderate_target in content, "old_moderate_target not found"
content = content.replace(old_moderate_target, new_moderate_suite, 1)

# 5. In Route 9 (suborder payout), support vendorPayoutStatus === 'held'
old_suborder_target = """    if (pool) {
      await pool.query(`
        UPDATE online_orders 
        SET vendor_payout_status = $1::text,
            notes = CASE 
              WHEN $2::text IS NOT NULL AND $2::text != '' 
              THEN COALESCE(notes, '') || ' [পেআউট নোট: ' || $2::text || ']' 
              ELSE notes 
            END,
            updated_at = $3::bigint
        WHERE id = $4::text OR order_number = $4::text
      `, [vendorPayoutStatus, noteText, Date.now(), subOrderId]);
    } else {
      const sub = (inMemoryStore.online_orders || []).find(o => o.id === subOrderId || o.orderNumber === subOrderId);
      if (sub) {
        sub.vendorPayoutStatus = vendorPayoutStatus;
        sub.updatedAt = Date.now();
        saveInMemoryStoreToDisk();
      }
    }
    return res.json({ success: true, message: 'ভেন্ডর পেআউট স্ট্যাটাস আপডেট হয়েছে' });"""

new_suborder_suite = """    const effectiveNote = noteText || (vendorPayoutStatus === 'held' ? 'অ্যাডমিন কর্তৃক পেমেন্ট সাময়িক স্থগিত (HOLD)' : null);
    if (pool) {
      await pool.query(`
        UPDATE online_orders 
        SET vendor_payout_status = $1::text,
            notes = CASE 
              WHEN $2::text IS NOT NULL AND $2::text != '' 
              THEN COALESCE(notes, '') || ' [পেআউট নোট: ' || $2::text || ']' 
              ELSE notes 
            END,
            updated_at = $3::bigint
        WHERE id = $4::text OR order_number = $4::text
      `, [vendorPayoutStatus, effectiveNote, Date.now(), subOrderId]);
    } else {
      const sub = (inMemoryStore.online_orders || []).find(o => o.id === subOrderId || o.orderNumber === subOrderId);
      if (sub) {
        sub.vendorPayoutStatus = vendorPayoutStatus;
        if (effectiveNote) sub.notes = (sub.notes ? sub.notes + ' ' : '') + `[পেআউট: ${effectiveNote}]`;
        sub.updatedAt = Date.now();
        saveInMemoryStoreToDisk();
      }
    }
    return res.json({ 
      success: true, 
      message: vendorPayoutStatus === 'held' 
        ? '⏸️ ভেন্ডর সাব-অর্ডারের পেমেন্ট সাময়িকভাবে হোল্ডে রাখা হয়েছে।' 
        : vendorPayoutStatus === 'settled'
          ? '✅ ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক করা হয়েছে।'
          : 'ভেন্ডর পেআউট বকেয়া মার্ক করা হয়েছে।'
    });"""

assert old_suborder_target in content, "old_suborder_target not found"
content = content.replace(old_suborder_target, new_suborder_suite, 1)

# 6. In admin/overview, include vendorPayoutHolds
old_admin_overview = """      return res.json({
        success: true,
        masterOrders,
        subOrders,
        products,
        categories,
        settings,
      });
    } else {
      // InMemoryStore Fallback"""

new_admin_overview = """      const vendorPayoutHolds = await loadVendorPayoutHolds();
      return res.json({
        success: true,
        masterOrders,
        subOrders,
        products,
        categories,
        settings,
        vendorPayoutHolds,
      });
    } else {
      // InMemoryStore Fallback"""

assert old_admin_overview in content, "old_admin_overview not found"
content = content.replace(old_admin_overview, new_admin_overview, 1)

old_mem_overview = """      return res.json({
        success: true,
        masterOrders: inMemoryStore.marketplace_master_orders || [],
        subOrders: (inMemoryStore.online_orders || []).filter(o => o.orderSource === 'marketplace' || o.masterOrderId),
        products: inMemoryStore.products || [],
        categories: inMemoryStore.marketplace_categories || [],
        settings: await getStoredMarketplaceSettings(),
      });"""

new_mem_overview = """      const vendorPayoutHolds = await loadVendorPayoutHolds();
      const memProducts = (inMemoryStore.products || []).map(p => ({
        ...p,
        marketplaceStatus: p.marketplaceStatus || (p.isListedOnMarketplace ? 'approved' : 'unlisted'),
      }));
      return res.json({
        success: true,
        masterOrders: inMemoryStore.marketplace_master_orders || [],
        subOrders: (inMemoryStore.online_orders || []).filter(o => o.orderSource === 'marketplace' || o.masterOrderId),
        products: memProducts,
        categories: inMemoryStore.marketplace_categories || [],
        settings: await getStoredMarketplaceSettings(),
        vendorPayoutHolds,
      });"""

assert old_mem_overview in content, "old_mem_overview not found"
content = content.replace(old_mem_overview, new_mem_overview, 1)

# 7. Remove duplicate route 6
dup_target = """/**
 * 6. POST /api/marketplace/toggle-product - Vendor toggles marketplace listing
 */
router.post('/toggle-product', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, isListedOnMarketplace } = req.body;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });
    if (!productId) return res.status(400).json({ error: 'পণ্য আইডি আবশ্যক' });
    const pool = getDbPool();
    const isListed = Boolean(isListedOnMarketplace);

    if (pool) {
      const updateRes = await pool.query(`
        UPDATE products 
        SET is_listed_on_marketplace = $1, updated_at = $2 
        WHERE id = $3 AND user_id = $4
        RETURNING id, name, is_listed_on_marketplace
      `, [isListed, Date.now(), productId, userId]);

      if (updateRes.rows.length === 0) {
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি অথবা আপনার অ্যাক্সেস নেই।' });
      }

      return res.json({
        success: true,
        product: updateRes.rows[0],
        message: isListed
          ? 'পণ্যটি সেন্ট্রাল মার্কেটপ্লেসে সফলভাবে প্রদর্শিত হয়েছে।'
          : 'পণ্যটি সেন্ট্রাল মার্কেটপ্লেস থেকে সরানো হয়েছে।',
      });
    } else {
      const p = (inMemoryStore.products || []).find(x => x.id === productId && x.userId === userId);
      if (!p) return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি।' });

      p.isListedOnMarketplace = isListed;
      p.updatedAt = Date.now();
      saveInMemoryStoreToDisk();

      return res.json({
        success: true,
        product: p,
        message: isListed
          ? 'পণ্যটি সেন্ট্রাল মার্কেটপ্লেসে সফলভাবে প্রদর্শিত হয়েছে।'
          : 'পণ্যটি সেন্ট্রাল মার্কেটপ্লেস থেকে সরানো হয়েছে।',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});"""

assert dup_target in content, "dup_target not found"
content = content.replace(dup_target, "// [Merged into Route 3.5 above]", 1)

# 8. Update Route 3.5 to check for blocked product
old_toggle_body = """    if (pool) {
      const checkRes = await pool.query('SELECT user_id, is_published_online FROM products WHERE id = $1', [productId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      }
      const prod = checkRes.rows[0];
      const isSuperAdmin = checkIsSuperAdminOrStaff(req);
      if (prod.user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'এই পণ্যটি পরিবর্তনের অনুমতি নেই' });
      }

      await pool.query(`
        UPDATE products 
        SET is_listed_on_marketplace = $1,
            marketplace_status = 'approved',
            is_published_online = CASE WHEN $1 = TRUE THEN TRUE ELSE is_published_online END,
            updated_at = $2
        WHERE id = $3
      `, [isListed, now, productId]);
    } else {
      const p = (inMemoryStore.products || []).find(x => x.id === productId);
      if (!p) return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      const isSuperAdmin = checkIsSuperAdminOrStaff(req);
      if (p.userId !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'এই পণ্যটি পরিবর্তনের অনুমতি নেই' });
      }
      p.isListedOnMarketplace = isListed;
      p.marketplaceStatus = 'approved';
      if (isListed) {
        p.isPublishedOnline = true;
      }
      p.updatedAt = now;
      saveInMemoryStoreToDisk();
    }"""

new_toggle_body = """    if (pool) {
      const checkRes = await pool.query('SELECT user_id, is_published_online, marketplace_status FROM products WHERE id = $1', [productId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      }
      const prod = checkRes.rows[0];
      const isSuperAdmin = checkIsSuperAdminOrStaff(req);
      if (prod.user_id !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'এই পণ্যটি পরিবর্তনের অনুমতি নেই' });
      }

      // 🚫 If admin has blocked this product, vendor cannot turn it on
      if (prod.marketplace_status === 'blocked' && !isSuperAdmin) {
        return res.status(403).json({
          error: 'এই পণ্যটি সুপার অ্যাডমিন কর্তৃক সাময়িকভাবে ব্লক বা স্থগিত রাখা হয়েছে। আনব্লক করতে অ্যাডমিন বা সাপোর্টের সাথে যোগাযোগ করুন।',
        });
      }

      const nextStatus = isListed ? 'approved' : (prod.marketplace_status === 'blocked' ? 'blocked' : 'unlisted');

      await pool.query(`
        UPDATE products 
        SET is_listed_on_marketplace = $1,
            marketplace_status = $2,
            is_published_online = CASE WHEN $1 = TRUE THEN TRUE ELSE is_published_online END,
            updated_at = $3
        WHERE id = $4
      `, [isListed, nextStatus, now, productId]);
    } else {
      const p = (inMemoryStore.products || []).find(x => x.id === productId);
      if (!p) return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি' });
      const isSuperAdmin = checkIsSuperAdminOrStaff(req);
      if (p.userId !== userId && !isSuperAdmin) {
        return res.status(403).json({ error: 'এই পণ্যটি পরিবর্তনের অনুমতি নেই' });
      }

      if (p.marketplaceStatus === 'blocked' && !isSuperAdmin) {
        return res.status(403).json({
          error: 'এই পণ্যটি সুপার অ্যাডমিন কর্তৃক সাময়িকভাবে ব্লক বা স্থগিত রাখা হয়েছে। আনব্লক করতে অ্যাডমিন বা সাপোর্টের সাথে যোগাযোগ করুন।',
        });
      }

      p.isListedOnMarketplace = isListed;
      p.marketplaceStatus = isListed ? 'approved' : (p.marketplaceStatus === 'blocked' ? 'blocked' : 'unlisted');
      if (isListed) {
        p.isPublishedOnline = true;
      }
      p.updatedAt = now;
      saveInMemoryStoreToDisk();
    }"""

assert old_toggle_body in content, "old_toggle_body not found"
content = content.replace(old_toggle_body, new_toggle_body, 1)

# 9. Insert helper functions
helper_target = "function getVerifiedDevicesStore(): Record<string, { verifiedAt: number; deviceToken?: string }> {"
new_helper_code = """/**
 * Vendor Payout Holds Store & Loader
 * Super Admin can hold/freeze any vendor's payment account or individual transactions
 */
export function getVendorPayoutHoldsStore(): Record<string, { isHeld: boolean; reason?: string; heldAt: number; heldBy?: string }> {
  if (!(inMemoryStore as any).vendor_payout_holds) {
    (inMemoryStore as any).vendor_payout_holds = {};
  }
  return (inMemoryStore as any).vendor_payout_holds;
}

export async function loadVendorPayoutHolds(): Promise<Record<string, { isHeld: boolean; reason?: string; heldAt: number; heldBy?: string }>> {
  const store = getVendorPayoutHoldsStore();
  const pool = getDbPool();
  if (pool) {
    try {
      const res = await pool.query("SELECT data FROM marketplace_settings WHERE id = 'vendor_payout_holds'").catch(() => ({ rows: [] }));
      if (res.rows.length > 0 && res.rows[0].data) {
        const parsed = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
        Object.assign(store, parsed);
      }
    } catch (e) {
      console.warn('Vendor payout holds load error:', e);
    }
  }
  return store;
}

function getVerifiedDevicesStore(): Record<string, { verifiedAt: number; deviceToken?: string }> {"""

assert helper_target in content, "helper_target not found"
content = content.replace(helper_target, new_helper_code, 1)

with open('server/routes/marketplaceRoutes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: All backend routes, holds, and controls patched flawlessly!")
