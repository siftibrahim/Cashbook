import re

with open('server/routes/marketplaceRoutes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. helper insertion around line 454
for i, line in enumerate(lines[:500]):
    if 'function getVerifiedDevicesStore():' in line:
        helper_idx = i
        break

new_helper_lines = [
    "/**\n",
    " * Vendor Payout Holds Store & Loader\n",
    " * Super Admin can hold/freeze any vendor's payment account or individual transactions\n",
    " */\n",
    "export function getVendorPayoutHoldsStore(): Record<string, { isHeld: boolean; reason?: string; heldAt: number; heldBy?: string }> {\n",
    "  if (!(inMemoryStore as any).vendor_payout_holds) {\n",
    "    (inMemoryStore as any).vendor_payout_holds = {};\n",
    "  }\n",
    "  return (inMemoryStore as any).vendor_payout_holds;\n",
    "}\n\n",
    "export async function loadVendorPayoutHolds(): Promise<Record<string, { isHeld: boolean; reason?: string; heldAt: number; heldBy?: string }>> {\n",
    "  const store = getVendorPayoutHoldsStore();\n",
    "  const pool = getDbPool();\n",
    "  if (pool) {\n",
    "    try {\n",
    "      const res = await pool.query(\"SELECT data FROM marketplace_settings WHERE id = 'vendor_payout_holds'\").catch(() => ({ rows: [] }));\n",
    "      if (res.rows.length > 0 && res.rows[0].data) {\n",
    "        const parsed = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;\n",
    "        Object.assign(store, parsed);\n",
    "      }\n",
    "    } catch (e) {\n",
    "      console.warn('Vendor payout holds load error:', e);\n",
    "    }\n",
    "  }\n",
    "  return store;\n",
    "}\n\n",
]

lines[helper_idx:helper_idx] = new_helper_lines

content = "".join(lines)

# 2. Update route 3.5 (/toggle-product) with blocked product check
old_toggle_part = """      const prod = checkRes.rows[0];
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

new_toggle_part = """      const prod = checkRes.rows[0];
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

assert old_toggle_part in content, "old_toggle_part not found"
content = content.replace(old_toggle_part, new_toggle_part, 1)

# 3. Delete duplicate route 6 (/toggle-product)
dup_search = re.search(r'/\*\*\s*\*\s*6\.\s*POST /api/marketplace/toggle-product.*?\n\s*\}\);\n', content, re.DOTALL)
assert dup_search is not None, "duplicate toggle-product route not found"
content = content[:dup_search.start()] + "// [Merged into Route 3.5 above]\n" + content[dup_search.end():]

# 4. In admin/overview, include vendorPayoutHolds
old_admin_overview_return = """      return res.json({
        success: true,
        masterOrders,
        subOrders,
        products,
        categories,
        settings,
      });
    } else {
      // InMemoryStore Fallback"""

new_admin_overview_return = """      const vendorPayoutHolds = await loadVendorPayoutHolds();
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

assert old_admin_overview_return in content, "old_admin_overview_return not found"
content = content.replace(old_admin_overview_return, new_admin_overview_return, 1)

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

# 5. In suborder payout, support vendorPayoutStatus === 'held'
old_suborder_update = """    if (pool) {
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

new_suborder_update = """    const effectiveNote = noteText || (vendorPayoutStatus === 'held' ? 'অ্যাডমিন কর্তৃক পেমেন্ট সাময়িক স্থগিত (HOLD)' : null);
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

assert old_suborder_update in content, "old_suborder_update not found"
content = content.replace(old_suborder_update, new_suborder_update, 1)

# 6. Replace route 10 with enhanced moderate + delete + batch + vendor hold routes
old_moderate_full = re.search(r'/\*\*\s*\*\s*10\.\s*POST /api/marketplace/admin/products/:productId/moderate.*?\n\s*\}\);\n', content, re.DOTALL)
assert old_moderate_full is not None, "old_moderate_full not found"

new_moderate_and_more = """/**
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
});
"""

content = content[:old_moderate_full.start()] + new_moderate_and_more + content[old_moderate_full.end():]

# 7. Update wallet calculation
old_wallet_calc_pattern = """      // Pending withdrawal requests amount (in process)
      const pendingWithdrawalAmount = payoutRequests
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      // Available balance is delivered money minus what is already settled minus what is currently pending review
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

new_wallet_calc_pattern = """      // Held orders (orders with suspicious activity or dispute)
      const heldOrders = nonCancelledOrders.filter(o => o.vendorPayoutStatus === 'held' || o.vendorPayoutStatus === 'hold');
      const heldSales = heldOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Payout requests currently on hold
      const onHoldWithdrawalAmount = payoutRequests
        .filter(p => p.status === 'hold' || p.status === 'on_hold')
        .reduce((sum, p) => sum + p.amount, 0);

      const vendorHolds = await loadVendorPayoutHolds();
      const isPayoutHeld = Boolean(vendorHolds[userId]?.isHeld);
      const payoutHoldReason = vendorHolds[userId]?.reason || '';

      // Pending withdrawal requests amount (in process)
      const pendingWithdrawalAmount = payoutRequests
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0);

      // Available balance is delivered money minus what is already settled minus held minus pending/on_hold review
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

assert old_wallet_calc_pattern in content, "old_wallet_calc_pattern not found"
content = content.replace(old_wallet_calc_pattern, new_wallet_calc_pattern, 1)

# In-memory wallet calculation update
old_mem_wallet_calc = """      const pendingWithdrawalAmount = payoutRequests
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

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

new_mem_wallet_calc = """      const heldOrders = nonCancelledOrders.filter((o: any) => o.vendorPayoutStatus === 'held' || o.vendorPayoutStatus === 'hold');
      const heldSales = heldOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

      const onHoldWithdrawalAmount = payoutRequests
        .filter((p: any) => p.status === 'hold' || p.status === 'on_hold')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const vendorHolds = await loadVendorPayoutHolds();
      const isPayoutHeld = Boolean(vendorHolds[userId]?.isHeld);
      const payoutHoldReason = vendorHolds[userId]?.reason || '';

      const pendingWithdrawalAmount = payoutRequests
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

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

assert old_mem_wallet_calc in content, "old_mem_wallet_calc not found"
content = content.replace(old_mem_wallet_calc, new_mem_wallet_calc, 1)

# 8. Payout request availability check
old_payout_req_check = """      const available = Math.max(0, deliveredSales - settledSales - pendingWithdrawals);

      if (numAmount > available) {"""

new_payout_req_check = """      const vendorHolds = await loadVendorPayoutHolds();
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

assert old_payout_req_check in content, "old_payout_req_check not found"
content = content.replace(old_payout_req_check, new_payout_req_check, 1)

# 9. Payout process endpoint support 'hold' and 'unhold'
old_process_validation = """    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'সঠিক অ্যাকশন (approve বা reject) নির্বাচন করুন' });
    }"""

new_process_validation = """    if (!action || !['approve', 'reject', 'hold', 'unhold'].includes(action)) {
      return res.status(400).json({ error: 'সঠিক অ্যাকশন (approve, reject, hold বা unhold) নির্বাচন করুন' });
    }"""

assert old_process_validation in content, "old_process_validation not found"
content = content.replace(old_process_validation, new_process_validation, 1)

old_pg_action_block = """        return res.json({
          success: true,
          message: `ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক করা হয়েছে (TrxID: ${cleanTrx})। ক্যাশবুক ও নোটিফিকেশন আপডেট সম্পন্ন।`,
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
        `, [adminNote || 'বাতিল করা হয়েছে', now, id]);"""

new_pg_action_block = """        return res.json({
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
          `আপনার ৳${amount.toLocaleString('en-US')} উত্তোলনের আবেদনটি সুপার অ্যাডমিন কর্তৃক সাময়িক স্থগিত (Hold) রাখা হয়েছে। কারণ: ${adminNote || 'তদন্ত বা যাচাই চলছে'}।`,
          targetUserId,
          now,
        ]).catch(() => {});

        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি সাময়িকভাবে হোল্ড / স্থগিত রাখা হয়েছে।',
        });
      } else if (action === 'unhold') {
        // Unhold Payout Request back to pending
        await pool.query(`
          UPDATE vendor_payout_requests
          SET status = 'pending',
              admin_note = $1,
              processed_at = NULL,
              updated_at = $2
          WHERE id = $3
        `, [adminNote || 'হোল্ড প্রত্যাহার করা হয়েছে', now, id]);

        const notifId = 'notif_payout_unh_' + now;
        await pool.query(`
          INSERT INTO notifications (
            id, title, message, type, target, target_user_id, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payout', 'user', $4, 1, false, $5)
        `, [
          notifId,
          '▶️ পেআউট আবেদন আনহোল্ড করা হয়েছে',
          `আপনার ৳${amount.toLocaleString('en-US')} উত্তোলনের আবেদনের সাময়িক স্থগিতাদেশ প্রত্যাহার করা হয়েছে এবং এটি অপেক্ষমাণ রয়েছে।`,
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
        `, [adminNote || 'বাতিল করা হয়েছে', now, id]);"""

assert old_pg_action_block in content, "old_pg_action_block not found"
content = content.replace(old_pg_action_block, new_pg_action_block, 1)

old_mem_action_block = """        return res.json({
          success: true,
          message: `ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক করা হয়েছে (TrxID: ${cleanTrx})।`,
        });
      } else {
        payoutReq.status = 'rejected';
        payoutReq.adminNote = adminNote || 'বাতিল করা হয়েছে';
        saveInMemoryStoreToDisk();
        return res.json({
          success: true,
          message: 'পেআউট আবেদনটি বাতিল মার্ক করা হয়েছে।',
        });
      }"""

new_mem_action_block = """        return res.json({
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
      }"""

assert old_mem_action_block in content, "old_mem_action_block not found"
content = content.replace(old_mem_action_block, new_mem_action_block, 1)

with open('server/routes/marketplaceRoutes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: marketplaceRoutes.ts updated cleanly with all features!")
