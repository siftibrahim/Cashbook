import { Router, Request, Response } from 'express';
import { getDbPool, inMemoryStore } from '../db';
import { cleanDomainString, extractSubdomainFromHost } from '../utils/domainResolver';

const router = Router();


// Helper to sanitize public store configuration
function sanitizePublicConfig(row: any, fallbackStoreProfile?: any) {
  return {
    storeSlug: row.store_slug || row.storeSlug || '',
    storeName: row.store_name || row.storeName || fallbackStoreProfile?.name || 'অনলাইন স্টোর',
    tagline: row.tagline || 'আপনার বিশ্বস্ত অনলাইন শপ',
    category: row.category || fallbackStoreProfile?.category || 'general',
    phone: row.phone || fallbackStoreProfile?.phone || '',
    whatsappPhone: row.whatsapp_phone || row.whatsappPhone || row.phone || fallbackStoreProfile?.phone || '',
    address: row.address || fallbackStoreProfile?.address || '',
    themeColor: row.theme_color || row.themeColor || fallbackStoreProfile?.themeColor || 'teal',
    announcement: row.announcement || '',
    deliveryInsideDhaka: parseFloat(row.delivery_inside_dhaka ?? row.deliveryInsideDhaka ?? 60),
    deliveryOutsideDhaka: parseFloat(row.delivery_outside_dhaka ?? row.deliveryOutsideDhaka ?? 120),
    freeDeliveryAbove: row.free_delivery_above ? parseFloat(row.free_delivery_above) : (row.freeDeliveryAbove ? parseFloat(row.freeDeliveryAbove) : undefined),
    minOrderAmount: row.min_order_amount ? parseFloat(row.min_order_amount) : (row.minOrderAmount ? parseFloat(row.minOrderAmount) : undefined),
    deliveryTimeEstimate: row.delivery_time_estimate || row.deliveryTimeEstimate || '২-৩ কর্মদিবস',
    acceptCOD: row.accept_cod !== false && row.acceptCOD !== false,
    acceptBkash: Boolean(row.accept_bkash ?? row.acceptBkash),
    bkashNumber: row.bkash_number || row.bkashNumber || fallbackStoreProfile?.bkashNumber || '',
    bkashType: row.bkash_type || row.bkashType || 'personal',
    acceptNagad: Boolean(row.accept_nagad ?? row.acceptNagad),
    nagadNumber: row.nagad_number || row.nagadNumber || fallbackStoreProfile?.nagadNumber || '',
    nagadType: row.nagad_type || row.nagadType || 'personal',
    acceptRocket: Boolean(row.accept_rocket ?? row.acceptRocket),
    rocketNumber: row.rocket_number || row.rocketNumber || fallbackStoreProfile?.rocketNumber || '',
    rocketType: row.rocket_type || row.rocketType || 'personal',
    paymentInstructions: row.payment_instructions || row.paymentInstructions || '',
    bannerUrl: row.banner_url || row.bannerUrl || '',
    bannerTitle: row.banner_title || row.bannerTitle || '',
    bannerSubtitle: row.banner_subtitle || row.bannerSubtitle || '',
    bannerTag: row.banner_tag || row.bannerTag || '',
    bannerDiscountText: row.banner_discount_text || row.bannerDiscountText || '',
    bannerStyle: row.banner_style || row.bannerStyle || 'gradient',
    banners: Array.isArray(row.banners)
      ? row.banners
      : (typeof row.banners === 'string'
          ? JSON.parse(row.banners || '[]')
          : (row.banners || [])),
    logoUrl: row.logo_url || row.logoUrl || '',
    supportWhatsAppMessage: row.support_whatsapp_message || row.supportWhatsAppMessage || '',
    supportHours: row.support_hours || row.supportHours || 'সকাল ৯টা - রাত ১০টা',
    facebookUrl: row.facebook_url || row.facebookUrl || '',
    publishedProductIds: Array.isArray(row.published_product_ids)
      ? row.published_product_ids
      : (typeof row.published_product_ids === 'string'
          ? JSON.parse(row.published_product_ids || '[]')
          : (row.publishedProductIds || [])),
    customDomain: row.custom_domain || row.customDomain || '',
    customDomainVerified: Boolean(row.custom_domain_verified ?? row.customDomainVerified),
    isEnabled: row.is_enabled !== false && row.isEnabled !== false,
  };
}

/**
 * Resolve target vendor record from Postgres or inMemoryStore
 */
export async function resolveStoreVendor(identifier: string): Promise<{ userId: string; storeConfig: any } | null> {
  const cleanId = cleanDomainString(identifier);
  if (!cleanId) return null;

  const pool = getDbPool();
  if (pool) {
    // 1. Match by custom_domain (exact or without www)
    let res = await pool.query(
      `SELECT * FROM online_store_configs 
       WHERE (LOWER(custom_domain) = $1 OR LOWER(custom_domain) = $2) 
         AND custom_domain_verified = true 
       LIMIT 1`,
      [cleanId.toLowerCase(), cleanId.toLowerCase().replace(/^www\./, '')]
    );
    if (res.rows.length > 0) {
      return { userId: res.rows[0].user_id, storeConfig: res.rows[0] };
    }

    // 2. Match by store_slug (exact)
    res = await pool.query(
      'SELECT * FROM online_store_configs WHERE LOWER(store_slug) = $1 LIMIT 1',
      [cleanId.toLowerCase()]
    );
    if (res.rows.length > 0) {
      return { userId: res.rows[0].user_id, storeConfig: res.rows[0] };
    }

    // 3. Subdomain extraction: If identifier is "tanjinhub.twinghisabi.site" or "foo.mybrand.com"
    if (cleanId.includes('.')) {
      const subSlug = cleanId.split('.')[0].toLowerCase();
      if (subSlug && subSlug !== 'www' && subSlug !== 'app' && subSlug !== 'admin' && subSlug !== 'api') {
        res = await pool.query(
          'SELECT * FROM online_store_configs WHERE LOWER(store_slug) = $1 LIMIT 1',
          [subSlug]
        );
        if (res.rows.length > 0) {
          return { userId: res.rows[0].user_id, storeConfig: res.rows[0] };
        }
      }
    }

    // 4. Path-style extraction: If identifier is "shop/tanjinhub" or "store/tanjinhub"
    if (cleanId.includes('/')) {
      const parts = cleanId.split('/').filter(Boolean);
      const last = parts[parts.length - 1].toLowerCase();
      if (last) {
        res = await pool.query(
          'SELECT * FROM online_store_configs WHERE LOWER(store_slug) = $1 LIMIT 1',
          [last]
        );
        if (res.rows.length > 0) {
          return { userId: res.rows[0].user_id, storeConfig: res.rows[0] };
        }
      }
    }

    // 5. Match by user_id directly
    res = await pool.query(
      'SELECT * FROM online_store_configs WHERE user_id = $1 LIMIT 1',
      [cleanId]
    );
    if (res.rows.length > 0) {
      return { userId: res.rows[0].user_id, storeConfig: res.rows[0] };
    }

    // 6. Fallback check: match user in users / store_profiles
    const targetSlug = cleanId.includes('.') ? cleanId.split('.')[0].toLowerCase() : cleanId.toLowerCase();
    const spRes = await pool.query(
      `SELECT sp.*, u.shop_name, u.email, u.id as matched_user_id 
       FROM users u 
       LEFT JOIN store_profiles sp ON sp.user_id = u.id 
       WHERE u.id = $1 
          OR LOWER(REPLACE(u.shop_name, ' ', '')) = $2 
          OR LOWER(REPLACE(COALESCE(sp.name, ''), ' ', '')) = $2 
          OR LOWER(SPLIT_PART(u.email, '@', 1)) = $2 
       LIMIT 1`,
      [cleanId, targetSlug]
    );
    if (spRes.rows.length > 0) {
      const sp = spRes.rows[0];
      const autoSlug = targetSlug || (sp.shop_name || sp.name || 'store')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `store-${sp.matched_user_id.slice(-4)}`;

      return {
        userId: sp.matched_user_id,
        storeConfig: {
          user_id: sp.matched_user_id,
          store_slug: autoSlug,
          store_name: sp.name || sp.shop_name || 'অনলাইন স্টোর',
          phone: sp.phone || '',
          whatsapp_phone: sp.phone || '',
          address: sp.address || '',
          theme_color: sp.theme_color || 'teal',
          category: sp.category || 'general',
          is_enabled: true,
          accept_cod: true,
          delivery_inside_dhaka: 60,
          delivery_outside_dhaka: 120,
        },
      };
    }
  } else {
    // Memory store lookup
    const configs = inMemoryStore.online_store_configs || [];

    // 1. By custom_domain
    let found = configs.find(
      (c) =>
        c.customDomain &&
        (cleanDomainString(c.customDomain).toLowerCase() === cleanId.toLowerCase() ||
          cleanDomainString(c.customDomain).toLowerCase().replace(/^www\./, '') === cleanId.toLowerCase()) &&
        c.customDomainVerified
    );
    if (found) return { userId: found.userId || found.user_id, storeConfig: found };

    // 2. By store_slug
    found = configs.find(
      (c) => c.storeSlug && c.storeSlug.toLowerCase() === cleanId.toLowerCase()
    );
    if (found) return { userId: found.userId || found.user_id, storeConfig: found };

    // 3. Subdomain extraction: If identifier is "tanjinhub.twinghisabi.site"
    if (cleanId.includes('.')) {
      const subSlug = cleanId.split('.')[0].toLowerCase();
      if (subSlug && subSlug !== 'www' && subSlug !== 'app' && subSlug !== 'admin' && subSlug !== 'api') {
        found = configs.find(
          (c) => c.storeSlug && c.storeSlug.toLowerCase() === subSlug
        );
        if (found) return { userId: found.userId || found.user_id, storeConfig: found };
      }
    }

    // 4. By user_id
    found = configs.find((c) => (c.userId || c.user_id) === cleanId);
    if (found) return { userId: found.userId || found.user_id, storeConfig: found };

    // 5. Check memory stores/users fallback
    const targetSlug = cleanId.includes('.') ? cleanId.split('.')[0].toLowerCase() : cleanId.toLowerCase();
    const sp = (inMemoryStore.stores || []).find((s) => s.userId === cleanId || s.id === cleanId);
    if (sp) {
      return {
        userId: sp.userId,
        storeConfig: {
          user_id: sp.userId,
          store_slug: targetSlug || `store-${sp.userId}`,
          store_name: sp.name,
          phone: sp.phone,
          address: sp.address,
          theme_color: sp.themeColor || 'teal',
          is_enabled: true,
        },
      };
    }
  }

  return null;
}

/**
 * Enforces Tenant Isolation and resolves the authorized store vendor for the request.
 * If the request arrives on a vendor subdomain (e.g. tanjinhub.twinghisabi.site),
 * the subdomain is canonical and strictly bound. Cross-tenant access is forbidden.
 */
export async function getVerifiedStoreContext(
  req: Request,
  identifier?: string
): Promise<{ error?: string; status?: number; resolved?: { userId: string; storeConfig: any } }> {
  const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
  const hostInfo = extractSubdomainFromHost(rawHost);

  let targetToResolve = identifier || '';

  // 1. PRIMARY CANONICAL RESOLUTION: Dynamic Wildcard Subdomain (e.g. tanjinhub.twinghisabi.site)
  if (hostInfo.isSubdomain && hostInfo.slug) {
    const hostResolved = await resolveStoreVendor(hostInfo.slug);
    if (!hostResolved) {
      return {
        error: `"${hostInfo.slug}.twinghisabi.site" সাব-ডোমেনে কোনো সক্রিয় অনলাইন স্টোর পাওয়া যায়নি।`,
        status: 404,
      };
    }

    // If identifier is empty, 'current', 'self', 'default' or matches the host slug, grant access
    if (
      !targetToResolve ||
      targetToResolve === 'current' ||
      targetToResolve === 'self' ||
      targetToResolve === 'default' ||
      targetToResolve.toLowerCase() === hostInfo.slug.toLowerCase()
    ) {
      return { resolved: hostResolved };
    }

    // STRICT CROSS-TENANT SECURITY:
    // If the client requested another vendor's identifier while on this subdomain, verify they match!
    const requestedResolved = await resolveStoreVendor(targetToResolve);
    if (!requestedResolved || requestedResolved.userId !== hostResolved.userId) {
      return {
        error: 'টেন্যান্ট সুরক্ষা নিরাপত্তা সতর্কতা: এই সাব-ডোমেন থেকে অন্য কোনো ভেন্ডরের স্টোর ডেটা অ্যাক্সেস করা সম্পূর্ণ নিষিদ্ধ।',
        status: 403,
      };
    }

    return { resolved: hostResolved };
  }

  // 2. Custom Domain (e.g. myshopbd.com)
  if (hostInfo.isCustomDomain) {
    const hostResolved = await resolveStoreVendor(hostInfo.cleanHost);
    if (!hostResolved) {
      return {
        error: `কাস্টম ডোমেন "${hostInfo.cleanHost}"-এর সাথে কোনো সক্রিয় অনলাইন স্টোর সংযুক্ত নেই।`,
        status: 404,
      };
    }

    if (
      !targetToResolve ||
      targetToResolve === 'current' ||
      targetToResolve === 'self' ||
      targetToResolve === 'default' ||
      cleanDomainString(targetToResolve).toLowerCase() === hostInfo.cleanHost.toLowerCase()
    ) {
      return { resolved: hostResolved };
    }

    const requestedResolved = await resolveStoreVendor(targetToResolve);
    if (!requestedResolved || requestedResolved.userId !== hostResolved.userId) {
      return {
        error: 'টেন্যান্ট সুরক্ষা সতর্কতা: এই কাস্টম ডোমেন থেকে অন্য কোনো ভেন্ডরের স্টোর ডেটা অ্যাক্সেস করা সম্পূর্ণ নিষিদ্ধ।',
        status: 403,
      };
    }

    return { resolved: hostResolved };
  }

  // 3. Root Domain or Platform Host (e.g. twinghisabi.site, localhost, *.run.app, *.onrender.com)
  if (
    !targetToResolve ||
    targetToResolve === 'current' ||
    targetToResolve === 'self' ||
    targetToResolve === 'default'
  ) {
    targetToResolve = (req.query.slug || req.query.shop || req.query.store || req.query.vendor || '') as string;
  }

  if (!targetToResolve) {
    // If testing without params in dev/preview mode, fallback to first active store
    const pool = getDbPool();
    if (pool) {
      const first = await pool.query('SELECT * FROM online_store_configs WHERE is_enabled = true LIMIT 1');
      if (first.rows.length > 0) {
        targetToResolve = first.rows[0].store_slug || first.rows[0].user_id;
      }
    } else if ((inMemoryStore.online_store_configs || []).length > 0) {
      targetToResolve = inMemoryStore.online_store_configs[0].storeSlug || inMemoryStore.online_store_configs[0].userId;
    }
  }

  if (!targetToResolve) {
    return {
      error: 'কোনো অনলাইন স্টোর পাওয়া যায়নি। অনুগ্রহ করে সঠিক স্টোর লিংক প্রদান করুন।',
      status: 404,
    };
  }

  const resolved = await resolveStoreVendor(targetToResolve);
  if (!resolved) {
    return {
      error: 'অনুরোধকৃত অনলাইন স্টোরটি খুঁজে পাওয়া যায়নি।',
      status: 404,
    };
  }

  return { resolved };
}

/**
 * GET /api/public/store/resolve
 * Deterministically resolves a store via Host header (Subdomain / Custom Domain)
 * or query fallback on root domain
 */
router.get('/resolve', async (req: Request, res: Response) => {
  try {
    const rawHost = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
    const hostInfo = extractSubdomainFromHost(rawHost);

    const requestedSlug = (req.query.slug || req.query.shop || req.query.store || req.query.domain || req.query.vendor || '') as string;
    const ctx = await getVerifiedStoreContext(req, requestedSlug);

    if (ctx.error || !ctx.resolved) {
      return res.status(ctx.status || 404).json({
        found: false,
        error: ctx.error || 'অনলাইন স্টোর পাওয়া যায়নি।',
        hostInfo,
      });
    }

    const publicConfig = sanitizePublicConfig(ctx.resolved.storeConfig);
    const canonicalUrl = publicConfig.customDomainVerified && publicConfig.customDomain
      ? `https://${publicConfig.customDomain}`
      : `https://${publicConfig.storeSlug || 'shop'}.twinghisabi.site`;

    return res.json({
      found: true,
      store: publicConfig,
      vendorId: ctx.resolved.userId,
      canonicalUrl,
      subdomain: publicConfig.storeSlug,
    });
  } catch (err: any) {
    console.error('Error in public store resolve:', err);
    return res.status(500).json({ found: false, error: err.message });
  }
});

/**
 * GET /api/public/store/:identifier/products
 * Returns strictly the public, published products of this vendor
 * Enforces tenant isolation and never exposes cost price or other vendors' data
 */
router.get('/:identifier/products', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const ctx = await getVerifiedStoreContext(req, identifier);

    if (ctx.error || !ctx.resolved) {
      return res.status(ctx.status || 404).json({ error: ctx.error });
    }

    const targetUserId = ctx.resolved.userId;
    const storeConfig = ctx.resolved.storeConfig;
    const publishedIds: string[] = Array.isArray(storeConfig.published_product_ids)
      ? storeConfig.published_product_ids
      : (typeof storeConfig.published_product_ids === 'string'
          ? JSON.parse(storeConfig.published_product_ids || '[]')
          : (storeConfig.publishedProductIds || []));

    const pool = getDbPool();
    if (pool) {
      const result = await pool.query(
        `SELECT id, name, category, unit, sale_price, stock, sku, qr_code, image_url, description, rating, discount_percent, is_published_online
         FROM products
         WHERE user_id = $1 AND (is_published_online IS NOT FALSE)
         ORDER BY updated_at DESC`,
        [targetUserId]
      );

      let products = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category || 'সাধারণ',
        unit: row.unit || 'পিস',
        salePrice: parseFloat(row.sale_price) || 0,
        stock: parseFloat(row.stock) || 0,
        sku: row.sku || '',
        qrCode: row.qr_code || '',
        imageUrl: row.image_url || '',
        description: row.description || '',
        rating: row.rating ? parseFloat(row.rating) : 5.0,
        discountPercent: row.discount_percent ? parseFloat(row.discount_percent) : 0,
        isPublishedOnline: row.is_published_online !== false,
      }));

      if (publishedIds.length > 0) {
        products = products.filter((p) => publishedIds.includes(p.id));
      }

      return res.json({ products });
    } else {
      const memoryProducts = (inMemoryStore.products || [])
        .filter((p) => p.userId === targetUserId && p.isPublishedOnline !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'সাধারণ',
          unit: p.unit || 'পিস',
          salePrice: parseFloat(p.salePrice) || 0,
          stock: parseFloat(p.stock) || 0,
          sku: p.sku || '',
          qrCode: p.qrCode || '',
          imageUrl: p.imageUrl || '',
          description: p.description || '',
          rating: p.rating ? parseFloat(p.rating) : 5.0,
          discountPercent: p.discountPercent ? parseFloat(p.discountPercent) : 0,
          isPublishedOnline: p.isPublishedOnline !== false,
        }));

      let filtered = memoryProducts;
      if (publishedIds.length > 0) {
        filtered = filtered.filter((p) => publishedIds.includes(p.id));
      }

      return res.json({ products: filtered });
    }
  } catch (err: any) {
    console.error('Error fetching public store products:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/public/store/:identifier/products/:productId
 * Returns a single product strictly isolated to this vendor's catalog
 */
router.get('/:identifier/products/:productId', async (req: Request, res: Response) => {
  try {
    const { identifier, productId } = req.params;
    const ctx = await getVerifiedStoreContext(req, identifier);

    if (ctx.error || !ctx.resolved) {
      return res.status(ctx.status || 404).json({ error: ctx.error });
    }

    const targetUserId = ctx.resolved.userId;
    const pool = getDbPool();

    if (pool) {
      const result = await pool.query(
        `SELECT id, name, category, unit, sale_price, stock, sku, qr_code, image_url, description, rating, discount_percent, is_published_online
         FROM products
         WHERE id = $1 AND user_id = $2 AND (is_published_online IS NOT FALSE)
         LIMIT 1`,
        [productId, targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি।' });
      }

      const row = result.rows[0];
      return res.json({
        product: {
          id: row.id,
          name: row.name,
          category: row.category || 'সাধারণ',
          unit: row.unit || 'পিস',
          salePrice: parseFloat(row.sale_price) || 0,
          stock: parseFloat(row.stock) || 0,
          sku: row.sku || '',
          qrCode: row.qr_code || '',
          imageUrl: row.image_url || '',
          description: row.description || '',
          rating: row.rating ? parseFloat(row.rating) : 5.0,
          discountPercent: row.discount_percent ? parseFloat(row.discount_percent) : 0,
          isPublishedOnline: row.is_published_online !== false,
        },
      });
    } else {
      const p = (inMemoryStore.products || []).find(
        (prod) => prod.id === productId && prod.userId === targetUserId && prod.isPublishedOnline !== false
      );
      if (!p) return res.status(404).json({ error: 'পণ্যটি পাওয়া যায়নি।' });
      return res.json({ product: p });
    }
  } catch (err: any) {
    console.error('Error fetching single product:', err);
    return res.status(500).json({ error: err.message });
  }
});


/**
 * POST /api/public/store/:identifier/orders
 * Public customer places an order strictly for this specific vendor
 */
router.post('/:identifier/orders', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const ctx = await getVerifiedStoreContext(req, identifier);

    if (ctx.error || !ctx.resolved) {
      return res.status(ctx.status || 404).json({ error: ctx.error || 'স্টোরটি বর্তমানে অর্ডার গ্রহণের জন্য প্রস্তুত নয়।' });
    }

    const targetUserId = ctx.resolved.userId;
    const body = req.body;


    const customerName = (body.customerName || '').trim();
    const customerPhone = (body.customerPhone || '').trim();
    const customerAddress = (body.customerAddress || '').trim();

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ error: 'গ্রাহকের নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা আবশ্যক।' });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'কার্টে কমপক্ষে একটি পণ্য থাকা আবশ্যক।' });
    }

    const now = Date.now();
    const orderId = body.id || `online_ord_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = body.orderNumber || `ORD-${now.toString().slice(-6)}`;
    const deliveryArea = body.deliveryArea || 'inside_dhaka';
    const deliveryCharge = parseFloat(body.deliveryCharge) || 0;
    const subtotal = parseFloat(body.subtotal) || 0;
    const totalAmount = parseFloat(body.totalAmount) || (subtotal + deliveryCharge);
    const paymentMethod = body.paymentMethod || 'cod';

    // Verification check for mobile banking payments
    const isMobileBanking = ['bkash', 'nagad', 'rocket'].includes(paymentMethod);
    const paymentStatus = isMobileBanking ? 'pending_verification' : 'unpaid';
    const trxId = body.trxId ? String(body.trxId).trim() : undefined;
    const senderPhone = body.senderPhone ? String(body.senderPhone).trim() : customerPhone;
    const notes = body.notes ? String(body.notes).trim() : '';

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
      orderStatus: 'pending',
      trxId: trxId || null,
      senderPhone: senderPhone || null,
      paymentAmount: totalAmount,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    };

    const pool = getDbPool();
    if (pool) {
      await pool.query(
        `INSERT INTO online_orders (
          id, user_id, order_number, customer_name, customer_phone, customer_address,
          delivery_area, delivery_charge, items, subtotal, total_amount, payment_method,
          payment_status, order_status, trx_id, sender_phone, payment_amount, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          orderId,
          targetUserId,
          orderNumber,
          customerName,
          customerPhone,
          customerAddress,
          deliveryArea,
          deliveryCharge,
          JSON.stringify(items),
          subtotal,
          totalAmount,
          paymentMethod,
          paymentStatus,
          'pending',
          trxId || null,
          senderPhone || null,
          totalAmount,
          notes || null,
          now,
          now,
        ]
      );

      // Create an in-app notification for the vendor
      try {
        const notifId = `notif_order_${now}_${Math.random().toString(36).substring(2, 6)}`;
        await pool.query(
          `INSERT INTO notifications (id, title, message, type, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, $5)`,
          [
            notifId,
            `নতুন অনলাইন অর্ডার: ${orderNumber}`,
            `${customerName} (${customerPhone}) ৳${totalAmount.toLocaleString('en-US')} টাকার একটি নতুন অনলাইন অর্ডার দিয়েছেন।`,
            'order',
            now,
          ]
        );
      } catch (e) {
        // Notification failure is non-blocking
      }
    } else {
      if (!inMemoryStore.online_orders) inMemoryStore.online_orders = [];
      inMemoryStore.online_orders.unshift(orderObj);
    }

    return res.status(201).json({
      success: true,
      message: '✅ আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে!',
      order: {
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
        orderStatus: 'pending',
        trxId,
        senderPhone,
        notes,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (err: any) {
    console.error('Error placing public store order:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/public/store/:identifier/orders/track/:orderNumber
 * Public customer tracks an order by orderNumber strictly within this store
 */
router.get('/:identifier/orders/track/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { identifier, orderNumber } = req.params;
    const ctx = await getVerifiedStoreContext(req, identifier);

    if (ctx.error || !ctx.resolved) {
      return res.status(ctx.status || 404).json({ error: ctx.error || 'স্টোরটি পাওয়া যায়নি।' });
    }

    const targetUserId = ctx.resolved.userId;
    const pool = getDbPool();


    if (pool) {
      const result = await pool.query(
        `SELECT id, order_number, customer_name, customer_phone, customer_address,
                delivery_area, delivery_charge, items, subtotal, total_amount, payment_method,
                payment_status, order_status, trx_id, sender_phone, payment_reject_reason,
                courier_name, courier_tracking_code, created_at, updated_at
         FROM online_orders
         WHERE (order_number = $1 OR id = $1) AND user_id = $2
         LIMIT 1`,
        [orderNumber, targetUserId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর দিন।' });
      }

      const row = result.rows[0];
      return res.json({
        order: {
          id: row.id,
          orderNumber: row.order_number,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerAddress: row.customer_address,
          deliveryArea: row.delivery_area,
          deliveryCharge: parseFloat(row.delivery_charge) || 0,
          items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
          subtotal: parseFloat(row.subtotal) || 0,
          totalAmount: parseFloat(row.total_amount) || 0,
          paymentMethod: row.payment_method,
          paymentStatus: row.payment_status,
          orderStatus: row.order_status,
          trxId: row.trx_id,
          senderPhone: row.sender_phone,
          paymentRejectReason: row.payment_reject_reason,
          courierName: row.courier_name,
          courierTrackingCode: row.courier_tracking_code,
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
        },
      });
    } else {
      const order = (inMemoryStore.online_orders || []).find(
        (o) => (o.orderNumber === orderNumber || o.id === orderNumber) && o.userId === targetUserId
      );

      if (!order) {
        return res.status(404).json({ error: 'অর্ডারটি পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর দিন।' });
      }

      return res.json({ order });
    }
  } catch (err: any) {
    console.error('Error tracking customer order:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
