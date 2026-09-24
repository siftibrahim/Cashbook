import { Router, Request, Response } from 'express';
import { getDbPool, inMemoryStore, saveInMemoryStoreToDisk } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';

const router = Router();

// Default showcase images for fallback if needed
const SHOWCASE_PRODUCTS = [
  {
    id: 'mkt_showcase_ghee',
    name: 'খাঁটি গাওয়া ঘি (প্রিমিয়াম কোয়ালিটি)',
    category: 'তেল ও খাঁটি ঘি',
    unit: 'কেজি',
    buyPrice: 1100,
    salePrice: 1450,
    originalPrice: 1750,
    discountPercent: 17,
    rating: 4.9,
    reviewCount: 142,
    stock: 45,
    isPublishedOnline: true,
    isListedOnMarketplace: true,
    isFeaturedOnMarketplace: true,
    imageUrl: 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?w=500&auto=format&fit=crop&q=80',
    description: 'গ্রামের গাভীর খাঁটি দুধ থেকে তৈরি সুস্বাদু ও পুষ্টিকর গাওয়া ঘি। ১০০% ভেজালমুক্ত ও ল্যাব টেস্টেড।',
    vendorShopName: 'তানজিনা অর্গানিক শপ',
    vendorSlug: 'tanjina',
    vendorPhone: '01711000001',
    vendorAddress: 'মিরপুর-১০, ঢাকা',
    updatedAt: Date.now(),
  },
  {
    id: 'mkt_showcase_honey',
    name: 'সুন্দরবনের প্রাকৃতিক খলিসা ফুলের মধু',
    category: 'তেল ও খাঁটি ঘি',
    unit: 'কেজি',
    buyPrice: 750,
    salePrice: 980,
    originalPrice: 1250,
    discountPercent: 22,
    rating: 4.8,
    reviewCount: 96,
    stock: 60,
    isPublishedOnline: true,
    isListedOnMarketplace: true,
    isFeaturedOnMarketplace: true,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80',
    description: 'সরাসরি সুন্দরবনের মৌয়ালদের থেকে সংগৃহীত খাঁটি মধু। কোনো চিনি বা রাসায়নিক মিশ্রণ নেই।',
    vendorShopName: 'মৌবন ন্যাচারালস',
    vendorSlug: 'moubon',
    vendorPhone: '01811000002',
    vendorAddress: 'খুলনা সদর, খুলনা',
    updatedAt: Date.now(),
  },
  {
    id: 'mkt_showcase_smartwatch',
    name: 'T500 প্লাস ব্লুটুথ কলিং স্মার্ট ওয়াচ',
    category: 'ইলেকট্রনিক্স ও গ্যাজেট',
    unit: 'পিস',
    buyPrice: 1150,
    salePrice: 1590,
    originalPrice: 2200,
    discountPercent: 28,
    rating: 4.7,
    reviewCount: 215,
    stock: 35,
    isPublishedOnline: true,
    isListedOnMarketplace: true,
    isFeaturedOnMarketplace: true,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
    description: 'ফুল এইচডি ডিসপ্লে, হার্ট রেট ও স্লিপ মনিটরিং, ওয়াটারপ্রুফ এবং দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ।',
    vendorShopName: 'ইভা গ্যাজেট পয়েন্ট',
    vendorSlug: 'evagadgets',
    vendorPhone: '01911000003',
    vendorAddress: 'মতিঝিল, ঢাকা',
    updatedAt: Date.now(),
  },
  {
    id: 'mkt_showcase_sari',
    name: 'টাঙ্গাইল হ্যান্ডলুম জামদানি কটন শাড়ি',
    category: 'পোশাক ও ফ্যাশন',
    unit: 'পিস',
    buyPrice: 1400,
    salePrice: 1950,
    originalPrice: 2600,
    discountPercent: 25,
    rating: 4.9,
    reviewCount: 78,
    stock: 20,
    isPublishedOnline: true,
    isListedOnMarketplace: true,
    isFeaturedOnMarketplace: true,
    imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80',
    description: 'ঐতিহ্যবাহী তাঁতের নিখুঁত কাজের আরামদায়ক পিওর কটন শাড়ি। উৎসব কিংবা দৈনন্দিন ব্যবহারে দারুণ মানানসই।',
    vendorShopName: 'রূপসী বাংলা ফ্যাশন',
    vendorSlug: 'rupashibangla',
    vendorPhone: '01611000004',
    vendorAddress: 'টাঙ্গাইল',
    updatedAt: Date.now(),
  },
];

const CATEGORY_SLUG_MAP: Record<string, string[]> = {
  'rice-pulses': ['চাল', 'ডাল', 'মুদি'],
  'oil-ghee': ['তেল', 'ঘি', 'গাওয়া'],
  'fashion': ['পোশাক', 'ফ্যাশন', 'শাড়ি', 'কটন'],
  'gadgets': ['গ্যাজেট', 'ইলেকট্রনিক্স', 'স্মার্ট', 'ওয়াচ'],
  'beauty': ['রূপচর্চা', 'প্রসাধন'],
  'health': ['স্বাস্থ্য', 'ওষুধ', 'মধু', 'ন্যাচারাল'],
  'kitchen': ['গৃহস্থালি', 'কিচেন'],
  'spices': ['মশলা', 'মধু', 'অর্গানিক'],
};

/**
 * 1. GET /api/marketplace/feed - Central Marketplace Multi-Vendor Product Feed
 */
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { search, category, sort, inStockOnly, limit = 60 } = req.query;
    const pool = getDbPool();

    let products: any[] = [];

    if (pool) {
      const conditions: string[] = [
        '(p.is_listed_on_marketplace = TRUE OR p.is_featured_on_marketplace = TRUE)',
      ];
      const params: any[] = [];

      if (inStockOnly !== 'false') {
        conditions.push('p.stock > 0');
      }

      if (category && category !== 'all') {
        const catStr = String(category).toLowerCase();
        const keywords = CATEGORY_SLUG_MAP[catStr] || [catStr];
        const orConds = keywords.map(kw => {
          params.push(`%${kw}%`);
          return `(p.category ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.marketplace_category_id = $${params.length})`;
        });
        conditions.push(`(${orConds.join(' OR ')})`);
      }

      if (search && typeof search === 'string' && search.trim()) {
        params.push(`%${search.trim()}%`);
        const searchIdx = params.length;
        conditions.push(`(p.name ILIKE $${searchIdx} OR p.description ILIKE $${searchIdx} OR s.store_name ILIKE $${searchIdx})`);
      }

      let orderBy = 'p.is_featured_on_marketplace DESC, p.updated_at DESC';
      if (sort === 'price_asc') orderBy = 'p.sale_price ASC';
      else if (sort === 'price_desc') orderBy = 'p.sale_price DESC';
      else if (sort === 'discount') orderBy = 'p.discount_percent DESC NULLS LAST';
      else if (sort === 'rating') orderBy = 'p.rating DESC NULLS LAST';

      params.push(Number(limit));
      const limitIdx = params.length;

      const queryText = `
        SELECT 
          p.id, p.user_id, p.name, p.category, p.unit, p.buy_price, p.sale_price, 
          p.original_price, p.discount_percent, p.stock, p.sku, p.qr_code, p.image_url, 
          p.description, p.rating, p.review_count, p.is_published_online, 
          p.is_listed_on_marketplace, p.is_featured_on_marketplace, p.marketplace_category_id,
          p.updated_at,
          COALESCE(s.store_name, u.shop_name, 'ভেন্ডর শপ') as vendor_shop_name,
          COALESCE(s.store_slug, u.phone, p.user_id) as vendor_slug,
          COALESCE(s.phone, u.phone, '') as vendor_phone,
          COALESCE(s.address, u.address, 'বাংলাদেশ') as vendor_address,
          s.logo_url as vendor_logo_url,
          s.theme_color as vendor_theme_color
        FROM products p
        LEFT JOIN online_store_configs s ON s.user_id = p.user_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT $${limitIdx}
      `;

      const result = await pool.query(queryText, params).catch(err => {
        console.warn('⚠️ Marketplace query fallback:', err.message);
        return { rows: [] };
      });

      products = (result.rows || []).map(r => ({
        id: r.id,
        vendorId: r.user_id,
        name: r.name,
        category: r.category || 'সাধারণ',
        unit: r.unit || 'পিস',
        buyPrice: parseFloat(r.buy_price) || 0,
        salePrice: parseFloat(r.sale_price) || 0,
        originalPrice: r.original_price ? parseFloat(r.original_price) : undefined,
        discountPercent: r.discount_percent ? parseFloat(r.discount_percent) : undefined,
        stock: parseFloat(r.stock) || 0,
        sku: r.sku || r.id,
        imageUrl: r.image_url || '',
        description: r.description || '',
        rating: r.rating ? parseFloat(r.rating) : 4.9,
        reviewCount: r.review_count ? parseInt(r.review_count, 10) : 24,
        isPublishedOnline: r.is_published_online !== false,
        isListedOnMarketplace: r.is_listed_on_marketplace === true,
        isFeaturedOnMarketplace: r.is_featured_on_marketplace === true,
        updatedAt: Number(r.updated_at),
        vendorShopName: r.vendor_shop_name,
        vendorSlug: r.vendor_slug,
        vendorPhone: r.vendor_phone,
        vendorAddress: r.vendor_address,
        vendorLogoUrl: r.vendor_logo_url,
        vendorThemeColor: r.vendor_theme_color || 'teal',
      }));
    } else {
      // InMemoryStore Fallback
      const allMem = inMemoryStore.products || [];
      const catKeywords = category && category !== 'all' ? (CATEGORY_SLUG_MAP[String(category).toLowerCase()] || [String(category).toLowerCase()]) : [];
      const filtered = allMem.filter(p => {
        const isListed = p.isListedOnMarketplace || p.isFeaturedOnMarketplace;
        if (!isListed) return false;
        if (inStockOnly !== 'false' && (p.stock || 0) <= 0) return false;
        if (catKeywords.length > 0) {
          const pCat = (p.category || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          const matchesCat = catKeywords.some(kw => pCat.includes(kw) || pName.includes(kw));
          if (!matchesCat) return false;
        }
        if (search && typeof search === 'string') {
          const s = search.toLowerCase();
          return (p.name || '').toLowerCase().includes(s) || (p.description || '').toLowerCase().includes(s);
        }
        return true;
      });

      products = filtered.map(p => {
        const u = inMemoryStore.users.find(x => x.id === p.userId);
        const s = inMemoryStore.online_store_configs.find(x => x.userId === p.userId);
        return {
          ...p,
          vendorId: p.userId,
          vendorShopName: s?.storeName || u?.shopName || 'ভেন্ডর শপ',
          vendorSlug: s?.storeSlug || u?.phone || p.userId,
          vendorPhone: s?.phone || u?.phone || '',
          vendorAddress: s?.address || u?.address || 'বাংলাদেশ',
          vendorLogoUrl: s?.logoUrl || '',
          vendorThemeColor: s?.themeColor || 'teal',
        };
      });
    }

    // If no products have been flagged on marketplace yet, include showcase products so the marketplace is stunning on first launch
    if (products.length === 0) {
      let showcase = [...SHOWCASE_PRODUCTS];
      if (category && category !== 'all') {
        const catStr = String(category).toLowerCase();
        const keywords = CATEGORY_SLUG_MAP[catStr] || [catStr];
        const matched = showcase.filter(p => {
          const pCat = (p.category || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          return keywords.some(k => pCat.includes(k) || pName.includes(k));
        });
        if (matched.length > 0) {
          showcase = matched;
        }
      }
      if (search && typeof search === 'string') {
        const s = search.toLowerCase();
        const matchedSearch = showcase.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
        if (matchedSearch.length > 0) {
          showcase = matchedSearch;
        }
      }
      products = showcase.map(p => ({
        ...p,
        vendorId: 'vendor_official',
      }));
    }

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err: any) {
    console.error('Marketplace feed error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 2. GET /api/marketplace/categories - Marketplace Category Catalog
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    let categories: any[] = [];

    if (pool) {
      const result = await pool.query(`
        SELECT c.*, 
               COUNT(p.id) as product_count
        FROM marketplace_categories c
        LEFT JOIN products p ON (p.category ILIKE '%' || c.name_bn || '%' OR p.marketplace_category_id = c.id)
          AND (p.is_listed_on_marketplace = TRUE OR p.is_featured_on_marketplace = TRUE)
          AND p.stock > 0
        WHERE c.is_active = TRUE
        GROUP BY c.id
        ORDER BY c.sort_order ASC
      `).catch(() => ({ rows: [] }));

      categories = (result.rows || []).map(r => ({
        id: r.id,
        nameBn: r.name_bn,
        nameEn: r.name_en,
        slug: r.slug,
        icon: r.icon,
        imageUrl: r.image_url,
        sortOrder: r.sort_order,
        productCount: parseInt(r.product_count, 10) || 0,
      }));
    }

    if (categories.length === 0) {
      const defaultCats = [
        { id: 'cat_rice_dal', nameBn: 'চাল ও ডাল', nameEn: 'Rice & Pulses', slug: 'rice-pulses', icon: '🌾' },
        { id: 'cat_oil_ghee', nameBn: 'তেল ও খাঁটি ঘি', nameEn: 'Oil & Pure Ghee', slug: 'oil-ghee', icon: '🫙' },
        { id: 'cat_fashion', nameBn: 'পোশাক ও ফ্যাশন', nameEn: 'Fashion & Apparel', slug: 'fashion', icon: '👕' },
        { id: 'cat_gadgets', nameBn: 'গ্যাজেট ও ইলেকট্রনিক্স', nameEn: 'Gadgets & Electronics', slug: 'gadgets', icon: '📱' },
        { id: 'cat_beauty', nameBn: 'রূপচর্চা ও প্রসাধন', nameEn: 'Beauty & Cosmetics', slug: 'beauty', icon: '✨' },
        { id: 'cat_health', nameBn: 'স্বাস্থ্য ও ওষুধ', nameEn: 'Health & Wellness', slug: 'health', icon: '💊' },
        { id: 'cat_kitchen', nameBn: 'গৃহস্থালি ও কিচেন', nameEn: 'Home & Kitchen', slug: 'kitchen', icon: '🍳' },
        { id: 'cat_spices', nameBn: 'মশলা ও অর্গানিক ফুড', nameEn: 'Spices & Organics', slug: 'spices', icon: '🍯' },
      ];

      const memCats = inMemoryStore.marketplace_categories && inMemoryStore.marketplace_categories.length > 0
        ? inMemoryStore.marketplace_categories
        : defaultCats;

      categories = memCats.map((c: any, idx: number) => ({
        id: c.id || `cat_${idx}`,
        nameBn: c.nameBn || c.name_bn,
        nameEn: c.nameEn || c.name_en,
        slug: c.slug,
        icon: c.icon,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder || c.sort_order || idx,
        productCount: 15,
      }));
    }

    return res.json({ success: true, categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 3. GET /api/marketplace/featured - Hero banners, flash deals, top stats
 */
router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const heroBanners = [
      {
        id: 'banner_mega_deal',
        title: 'TWING সেন্ট্রাল মেগা মার্কেটপ্লেস',
        subtitle: 'সারা দেশের সেরা সেরা বিশ্বস্ত ভেন্ডরদের খাঁটি পণ্য সরাসরি আপনার ঠিকানায়!',
        tag: 'দেশসেরা অফার',
        discountText: '৫০% পর্যন্ত ছাড়',
        bgGradient: 'from-teal-900 via-emerald-800 to-teal-950',
        badge: 'ভেরিফায়েড বিক্রেতা',
      },
      {
        id: 'banner_organic',
        title: '১০০% খাঁটি ও নির্ভেজাল গ্রামীণ খাদ্যপণ্য',
        subtitle: 'ঘি, সুন্দরবনের মধু, সরিষার তেল ও প্রিমিয়াম চাল-ডাল পাচ্ছেন সেরা মূল্যে।',
        tag: 'ন্যাচারাল ফ্রেশ',
        discountText: 'ফ্রি হোম ডেলিভারি',
        bgGradient: 'from-amber-900 via-orange-800 to-amber-950',
        badge: 'অর্গানিক কোয়ালিটি',
      },
      {
        id: 'banner_tech_lifestyle',
        title: 'স্মার্ট লাইফস্টাইল ও ইলেকট্রনিক্স গ্যাজেটস',
        subtitle: 'অরিজিনাল স্মার্টওয়াচ, ইয়ারবাডস এবং টেক এক্সেসরিজ আকর্ষণীয় ওয়ারেন্টির সাথে।',
        tag: 'টেক ধামাকা',
        discountText: 'ক্যাশ অন ডেলিভারি',
        bgGradient: 'from-indigo-950 via-slate-900 to-blue-950',
        badge: 'ইন-স্টক গ্যারান্টি',
      }
    ];

    return res.json({
      success: true,
      heroBanners,
      guarantees: [
        { title: '১০০% খাঁটি পণ্যের নিশ্চয়তা', desc: 'প্রতিটি বিক্রেতা ও পণ্যের মান যাচাইকৃত' },
        { title: 'সারা দেশে দ্রুত ডেলিভারি', desc: 'ঢাকা সিটিতে ২৪ ঘণ্টা, ঢাকার বাইরে ৪৮-৭২ ঘণ্টা' },
        { title: 'ক্যাশ অন ডেলিভারি সুবিধা', desc: 'পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সুযোগ' },
        { title: 'সহজ রিটার্ন পলিসি', desc: 'পণ্য ক্ষতিগ্রস্থ হলে দ্রুত পরিবর্তন সুবিধা' },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4. POST /api/marketplace/checkout - Multi-Vendor Atomic Order Splitting Engine
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      deliveryCity = 'dhaka',
      paymentMethod = 'cod',
      paymentTrxId = '',
      senderPhone = '',
      notes = '',
      items = [],
    } = req.body;

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ error: 'গ্রাহকের নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা আবশ্যক।' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'কার্টে কমপক্ষে একটি পণ্য থাকা আবশ্যক।' });
    }

    const cleanPhone = customerPhone.trim();
    const cleanName = customerName.trim();
    const cleanAddress = customerAddress.trim();

    // Group items by vendorId
    const vendorItemsMap: Record<string, any[]> = {};
    let totalProductsAmount = 0;

    for (const item of items) {
      const vId = item.vendorId || item.userId || 'vendor_official';
      if (!vendorItemsMap[vId]) {
        vendorItemsMap[vId] = [];
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = parseFloat(item.salePrice || item.price) || 0;
      const subtotal = qty * unitPrice;
      totalProductsAmount += subtotal;

      vendorItemsMap[vId].push({
        productId: item.id || item.productId,
        name: item.name,
        unit: item.unit || 'পিস',
        unitPrice,
        quantity: qty,
        subtotal,
        imageUrl: item.imageUrl || '',
      });
    }

    const vendorIds = Object.keys(vendorItemsMap);
    const vendorCount = vendorIds.length;

    // Delivery calculation: flat standard rate for central marketplace order
    const deliveryRate = deliveryCity === 'dhaka' ? 70 : 130;
    const totalDeliveryCharge = deliveryRate;
    const grandTotal = totalProductsAmount + totalDeliveryCharge;

    const now = Date.now();
    const masterOrderId = `mkt_ord_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const masterOrderNumber = `MKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const pool = getDbPool();
    const createdSubOrders: any[] = [];

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create Master Order
        await client.query(`
          INSERT INTO marketplace_master_orders (
            id, order_number, customer_name, customer_phone, customer_address, delivery_city,
            total_items_count, total_products_amount, total_delivery_charge, grand_total,
            payment_method, payment_status, payment_trx_id, sender_phone, notes,
            vendor_ids, sub_order_ids, overall_status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          masterOrderId,
          masterOrderNumber,
          cleanName,
          cleanPhone,
          cleanAddress,
          deliveryCity,
          items.length,
          totalProductsAmount,
          totalDeliveryCharge,
          grandTotal,
          paymentMethod,
          paymentMethod === 'cod' ? 'unpaid' : 'paid_pending_verify',
          paymentTrxId,
          senderPhone,
          notes,
          JSON.stringify(vendorIds),
          JSON.stringify([]),
          'processing',
          now,
          now,
        ]);

        const subOrderIds: string[] = [];

        // For each vendor, create an individual child order in online_orders
        for (const vId of vendorIds) {
          const vItems = vendorItemsMap[vId];
          const vSubtotal = vItems.reduce((acc, curr) => acc + curr.subtotal, 0);
          // Split delivery charge proportionally across vendors
          const vDeliveryShare = Math.round(totalDeliveryCharge / vendorCount);
          const vTotal = vSubtotal + vDeliveryShare;

          const childOrderId = `ord_${now}_${Math.random().toString(36).substring(2, 7)}`;
          const childOrderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
          subOrderIds.push(childOrderId);

          await client.query(`
            INSERT INTO online_orders (
              id, user_id, order_number, customer_name, customer_phone, customer_address,
              delivery_area, delivery_charge, items, subtotal, total_amount, payment_method,
              payment_status, order_status, trx_id, sender_phone, payment_amount, notes,
              order_source, master_order_id, vendor_payout_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          `, [
            childOrderId,
            vId,
            childOrderNumber,
            cleanName,
            cleanPhone,
            cleanAddress,
            deliveryCity,
            vDeliveryShare,
            JSON.stringify(vItems),
            vSubtotal,
            vTotal,
            paymentMethod,
            paymentMethod === 'cod' ? 'unpaid' : 'paid_pending_verify',
            'pending',
            paymentTrxId,
            senderPhone,
            paymentMethod === 'cod' ? 0 : vTotal,
            `সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${masterOrderNumber}। ${notes}`.trim(),
            'marketplace',
            masterOrderId,
            'unsettled',
            now,
            now,
          ]);

          createdSubOrders.push({
            id: childOrderId,
            orderNumber: childOrderNumber,
            vendorId: vId,
            items: vItems,
            totalAmount: vTotal,
            status: 'pending',
          });
        }

        // Update master order with sub_order_ids
        await client.query(`
          UPDATE marketplace_master_orders 
          SET sub_order_ids = $1 
          WHERE id = $2
        `, [JSON.stringify(subOrderIds), masterOrderId]);

        await client.query('COMMIT');

        // Post-commit: Deduct inventory stock and send in-app notifications
        for (const sub of createdSubOrders) {
          for (const it of sub.items) {
            await client.query(`
              UPDATE products 
              SET stock = GREATEST(0, stock - $1), updated_at = $2 
              WHERE id = $3 AND user_id = $4
            `, [it.quantity, now, it.productId, sub.vendorId]).catch(() => {});
          }

          const notifId = `notif_${now}_${Math.random().toString(36).substring(2, 6)}`;
          await client.query(`
            INSERT INTO notifications (
              id, title, message, type, target, target_user_id, is_read, created_at
            ) VALUES ($1, $2, $3, 'order', 'user', $4, FALSE, $5)
          `, [
            notifId,
            '🛍️ সেন্ট্রাল মার্কেটপ্লেস থেকে নতুন অর্ডার!',
            `অর্ডার #${sub.orderNumber} (মাস্টার #${masterOrderNumber}) - মোট বিল: ৳${sub.totalAmount}। কাস্টমার: ${cleanName} (${cleanPhone})।`,
            sub.vendorId,
            now,
          ]).catch(() => {});
        }
      } catch (dbErr: any) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    } else {
      // InMemoryStore Fallback
      const subOrderIds: string[] = [];

      for (const vId of vendorIds) {
        const vItems = vendorItemsMap[vId];
        const vSubtotal = vItems.reduce((acc, curr) => acc + curr.subtotal, 0);
        const vDeliveryShare = Math.round(totalDeliveryCharge / vendorCount);
        const vTotal = vSubtotal + vDeliveryShare;
        const childOrderId = `ord_${now}_${Math.random().toString(36).substring(2, 7)}`;
        const childOrderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

        subOrderIds.push(childOrderId);

        const subOrderObj = {
          id: childOrderId,
          userId: vId,
          orderNumber: childOrderNumber,
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerAddress: cleanAddress,
          deliveryArea: deliveryCity,
          deliveryCharge: vDeliveryShare,
          items: vItems,
          subtotal: vSubtotal,
          totalAmount: vTotal,
          paymentMethod,
          paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'paid_pending_verify',
          orderStatus: 'pending',
          orderSource: 'marketplace',
          masterOrderId,
          vendorPayoutStatus: 'unsettled',
          notes,
          createdAt: now,
          updatedAt: now,
        };

        inMemoryStore.online_orders.unshift(subOrderObj);
        createdSubOrders.push(subOrderObj);

        // Deduct memory stock
        for (const it of vItems) {
          const p = inMemoryStore.products.find(x => x.id === it.productId);
          if (p) {
            p.stock = Math.max(0, (p.stock || 0) - it.quantity);
            p.updatedAt = now;
          }
        }
      }

      const masterOrderObj = {
        id: masterOrderId,
        orderNumber: masterOrderNumber,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerAddress: cleanAddress,
        deliveryCity,
        totalItemsCount: items.length,
        totalProductsAmount,
        totalDeliveryCharge,
        grandTotal,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'paid_pending_verify',
        paymentTrxId,
        senderPhone,
        notes,
        vendorIds,
        subOrderIds,
        overallStatus: 'processing',
        createdAt: now,
        updatedAt: now,
      };

      inMemoryStore.marketplace_master_orders = inMemoryStore.marketplace_master_orders || [];
      inMemoryStore.marketplace_master_orders.unshift(masterOrderObj);
      saveInMemoryStoreToDisk();
    }

    return res.status(201).json({
      success: true,
      masterOrder: {
        id: masterOrderId,
        orderNumber: masterOrderNumber,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerAddress: cleanAddress,
        deliveryCity,
        totalProductsAmount,
        totalDeliveryCharge,
        grandTotal,
        paymentMethod,
        subOrdersCount: createdSubOrders.length,
      },
      subOrders: createdSubOrders,
      message: 'আপনার সেন্ট্রাল মার্কেটপ্লেস অর্ডার সফলভাবে গৃহীত হয়েছে!',
    });
  } catch (err: any) {
    console.error('Marketplace checkout error:', err);
    return res.status(500).json({ error: 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে: ' + err.message });
  }
});

/**
 * 5. GET /api/marketplace/track/:orderNumber - Live Order Tracking
 */
router.get('/track/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) {
      return res.status(400).json({ error: 'অর্ডার নম্বর আবশ্যক' });
    }

    const cleanOrderNumber = orderNumber.trim();
    const pool = getDbPool();

    if (pool) {
      const masterRes = await pool.query(`
        SELECT * FROM marketplace_master_orders 
        WHERE order_number = $1 OR id = $1 OR customer_phone = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [cleanOrderNumber]);

      if (masterRes.rows.length === 0) {
        return res.status(404).json({ error: 'অর্ডারের কোনো তথ্য পাওয়া যায়নি।' });
      }

      const m = masterRes.rows[0];

      // Fetch sub-orders
      const subRes = await pool.query(`
        SELECT o.*, 
               COALESCE(s.store_name, u.shop_name, 'ভেন্ডর') as vendor_shop_name,
               COALESCE(s.phone, u.phone) as vendor_phone
        FROM online_orders o
        LEFT JOIN online_store_configs s ON s.user_id = o.user_id
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.master_order_id = $1
        ORDER BY o.created_at ASC
      `, [m.id]);

      const subOrders = (subRes.rows || []).map(r => ({
        id: r.id,
        orderNumber: r.order_number,
        vendorShopName: r.vendor_shop_name,
        vendorPhone: r.vendor_phone,
        status: r.order_status,
        paymentStatus: r.payment_status,
        totalAmount: parseFloat(r.total_amount) || 0,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        createdAt: Number(r.created_at),
      }));

      return res.json({
        success: true,
        order: {
          id: m.id,
          orderNumber: m.order_number,
          customerName: m.customer_name,
          customerPhone: m.customer_phone,
          customerAddress: m.customer_address,
          deliveryCity: m.delivery_city,
          totalProductsAmount: parseFloat(m.total_products_amount) || 0,
          totalDeliveryCharge: parseFloat(m.total_delivery_charge) || 0,
          grandTotal: parseFloat(m.grand_total) || 0,
          paymentMethod: m.payment_method,
          paymentStatus: m.payment_status,
          overallStatus: m.overall_status,
          createdAt: Number(m.created_at),
          subOrders,
        },
      });
    } else {
      const m = (inMemoryStore.marketplace_master_orders || []).find(
        x => x.orderNumber === cleanOrderNumber || x.id === cleanOrderNumber || x.customerPhone === cleanOrderNumber
      );
      if (!m) {
        return res.status(404).json({ error: 'অর্ডারের কোনো তথ্য পাওয়া যায়নি।' });
      }
      const subs = (inMemoryStore.online_orders || []).filter(o => o.masterOrderId === m.id);
      return res.json({
        success: true,
        order: {
          ...m,
          subOrders: subs,
        },
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
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
});

/**
 * 7. GET /api/marketplace/admin/overview - Super Admin Central Marketplace Overview
 */
router.get('/admin/overview', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });
    }

    const pool = getDbPool();

    if (pool) {
      // 1. Master Orders
      const ordersRes = await pool.query(`
        SELECT * FROM marketplace_master_orders 
        ORDER BY created_at DESC 
        LIMIT 200
      `).catch(() => ({ rows: [] }));

      // 2. Sub-orders with vendor info
      const subOrdersRes = await pool.query(`
        SELECT o.*, 
               COALESCE(s.store_name, u.shop_name, 'ভেন্ডর') as vendor_shop_name,
               COALESCE(s.phone, u.phone) as vendor_phone
        FROM online_orders o
        LEFT JOIN online_store_configs s ON s.user_id = o.user_id
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.order_source = 'marketplace' OR o.master_order_id IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 500
      `).catch(() => ({ rows: [] }));

      // 3. Listed products
      const productsRes = await pool.query(`
        SELECT p.*, 
               COALESCE(s.store_name, u.shop_name, 'ভেন্ডর') as vendor_shop_name,
               COALESCE(s.phone, u.phone) as vendor_phone
        FROM products p
        LEFT JOIN online_store_configs s ON s.user_id = p.user_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.is_listed_on_marketplace = TRUE OR p.is_featured_on_marketplace = TRUE
        ORDER BY p.updated_at DESC
        LIMIT 300
      `).catch(() => ({ rows: [] }));

      // 4. Categories
      const catsRes = await pool.query(`
        SELECT * FROM marketplace_categories ORDER BY sort_order ASC
      `).catch(() => ({ rows: [] }));

      // 5. Settings
      const settingsRes = await pool.query(`
        SELECT data FROM marketplace_settings WHERE id = 'global_settings'
      `).catch(() => ({ rows: [] }));

      const settings = settingsRes.rows[0]?.data || {
        isMarketplaceActive: true,
        commissionPercent: 0,
        deliveryFeeDhaka: 70,
        deliveryFeeOutside: 130,
        platformBkashNumber: '01306908115',
        bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও অরিজিনাল পণ্যের নিশ্চয়তা!',
      };

      const masterOrders = ordersRes.rows.map(m => ({
        id: m.id,
        orderNumber: m.order_number,
        customerName: m.customer_name,
        customerPhone: m.customer_phone,
        customerAddress: m.customer_address,
        deliveryCity: m.delivery_city,
        totalItemsCount: m.total_items_count,
        totalProductsAmount: parseFloat(m.total_products_amount) || 0,
        totalDeliveryCharge: parseFloat(m.total_delivery_charge) || 0,
        grandTotal: parseFloat(m.grand_total) || 0,
        paymentMethod: m.payment_method,
        paymentStatus: m.payment_status,
        paymentTrxId: m.payment_trx_id,
        senderPhone: m.sender_phone,
        overallStatus: m.overall_status,
        vendorIds: typeof m.vendor_ids === 'string' ? JSON.parse(m.vendor_ids) : (m.vendor_ids || []),
        subOrderIds: typeof m.sub_order_ids === 'string' ? JSON.parse(m.sub_order_ids) : (m.sub_order_ids || []),
        createdAt: Number(m.created_at),
        updatedAt: Number(m.updated_at),
      }));

      const subOrders = subOrdersRes.rows.map(o => ({
        id: o.id,
        userId: o.user_id,
        masterOrderId: o.master_order_id,
        orderNumber: o.order_number,
        vendorShopName: o.vendor_shop_name,
        vendorPhone: o.vendor_phone,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
        subtotal: parseFloat(o.subtotal) || 0,
        totalAmount: parseFloat(o.total_amount) || 0,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        vendorPayoutStatus: o.vendor_payout_status || 'unsettled',
        createdAt: Number(o.created_at),
      }));

      const products = productsRes.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        category: p.category,
        salePrice: parseFloat(p.sale_price) || 0,
        stock: parseFloat(p.stock) || 0,
        imageUrl: p.image_url,
        isListedOnMarketplace: p.is_listed_on_marketplace === true,
        isFeaturedOnMarketplace: p.is_featured_on_marketplace === true,
        marketplaceStatus: p.marketplace_status || 'approved',
        vendorShopName: p.vendor_shop_name,
        vendorPhone: p.vendor_phone,
        updatedAt: Number(p.updated_at),
      }));

      const categories = catsRes.rows.map(c => ({
        id: c.id,
        nameBn: c.name_bn,
        nameEn: c.name_en,
        slug: c.slug,
        icon: c.icon,
        sortOrder: c.sort_order,
        isActive: c.is_active !== false,
      }));

      return res.json({
        success: true,
        masterOrders,
        subOrders,
        products,
        categories,
        settings,
      });
    } else {
      // InMemoryStore Fallback
      return res.json({
        success: true,
        masterOrders: inMemoryStore.marketplace_master_orders || [],
        subOrders: (inMemoryStore.online_orders || []).filter(o => o.orderSource === 'marketplace' || o.masterOrderId),
        products: (inMemoryStore.products || []).filter(p => p.isListedOnMarketplace || p.isFeaturedOnMarketplace),
        categories: inMemoryStore.marketplace_categories || [],
        settings: inMemoryStore.marketplace_settings || {
          isMarketplaceActive: true,
          commissionPercent: 0,
          deliveryFeeDhaka: 70,
          deliveryFeeOutside: 130,
          platformBkashNumber: '01306908115',
          bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও অরিজিনাল পণ্যের নিশ্চয়তা!',
        },
      });
    }
  } catch (err: any) {
    console.error('Admin marketplace overview error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8. POST /api/marketplace/admin/orders/:id/status - Super Admin updates Master Order status
 */
router.post('/admin/orders/:id/status', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { id } = req.params;
    const { overallStatus, paymentStatus } = req.body;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE marketplace_master_orders 
        SET overall_status = COALESCE($1, overall_status),
            payment_status = COALESCE($2, payment_status),
            updated_at = $3
        WHERE id = $4 OR order_number = $4
      `, [overallStatus || null, paymentStatus || null, Date.now(), id]);
    } else {
      const ord = (inMemoryStore.marketplace_master_orders || []).find(o => o.id === id || o.orderNumber === id);
      if (ord) {
        if (overallStatus) ord.overallStatus = overallStatus;
        if (paymentStatus) ord.paymentStatus = paymentStatus;
        ord.updatedAt = Date.now();
        saveInMemoryStoreToDisk();
      }
    }

    return res.json({ success: true, message: 'অর্ডার স্ট্যাটাস সফলভাবে আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. POST /api/marketplace/admin/orders/sub/:subOrderId/payout - Super Admin settles Vendor Payout
 */
router.post('/admin/orders/sub/:subOrderId/payout', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { subOrderId } = req.params;
    const { vendorPayoutStatus, adminNote } = req.body;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        UPDATE online_orders 
        SET vendor_payout_status = $1,
            notes = CASE WHEN $2 IS NOT NULL THEN COALESCE(notes, '') || ' [পেআউট নোট: ' || $2 || ']' ELSE notes END,
            updated_at = $3
        WHERE id = $4 OR order_number = $4
      `, [vendorPayoutStatus, adminNote || null, Date.now(), subOrderId]);
    } else {
      const sub = (inMemoryStore.online_orders || []).find(o => o.id === subOrderId || o.orderNumber === subOrderId);
      if (sub) {
        sub.vendorPayoutStatus = vendorPayoutStatus;
        sub.updatedAt = Date.now();
        saveInMemoryStoreToDisk();
      }
    }

    return res.json({ success: true, message: 'ভেন্ডর পেআউট স্ট্যাটাস আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10. POST /api/marketplace/admin/products/:productId/moderate - Super Admin Moderates Vendor Product
 */
router.post('/admin/products/:productId/moderate', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
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
});

/**
 * 11. POST /api/marketplace/admin/categories - Super Admin Manage Categories
 */
router.post('/admin/categories', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { id, nameBn, nameEn, slug, icon, sortOrder, isActive, action = 'save' } = req.body;
    const pool = getDbPool();
    const catId = id || `cat_${Date.now()}`;

    if (action === 'delete') {
      if (pool) {
        await pool.query('DELETE FROM marketplace_categories WHERE id = $1', [id]);
      } else {
        inMemoryStore.marketplace_categories = (inMemoryStore.marketplace_categories || []).filter(c => c.id !== id);
        saveInMemoryStoreToDisk();
      }
      return res.json({ success: true, message: 'ক্যাটাগরি মুছে ফেলা হয়েছে' });
    }

    if (pool) {
      await pool.query(`
        INSERT INTO marketplace_categories (id, name_bn, name_en, slug, icon, sort_order, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name_bn = EXCLUDED.name_bn,
          name_en = EXCLUDED.name_en,
          slug = EXCLUDED.slug,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active
      `, [
        catId,
        nameBn || 'নতুন ক্যাটাগরি',
        nameEn || '',
        slug || `cat-${Date.now()}`,
        icon || 'ShoppingBag',
        Number(sortOrder) || 0,
        isActive !== false,
        Date.now(),
      ]);
    } else {
      inMemoryStore.marketplace_categories = inMemoryStore.marketplace_categories || [];
      const idx = inMemoryStore.marketplace_categories.findIndex(c => c.id === catId);
      const catObj = {
        id: catId,
        nameBn: nameBn || 'নতুন ক্যাটাগরি',
        nameEn: nameEn || '',
        slug: slug || `cat-${Date.now()}`,
        icon: icon || 'ShoppingBag',
        sortOrder: Number(sortOrder) || 0,
        isActive: isActive !== false,
        createdAt: Date.now(),
      };
      if (idx >= 0) inMemoryStore.marketplace_categories[idx] = catObj;
      else inMemoryStore.marketplace_categories.push(catObj);
      saveInMemoryStoreToDisk();
    }

    return res.json({ success: true, message: 'ক্যাটাগরি সফলভাবে সংরক্ষিত হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 12. POST /api/marketplace/admin/settings - Super Admin Save Settings
 */
router.post('/admin/settings', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.email === 'siftibrahim@gmail.com' || req.user?.email === 'siftibrahim75@gmail.com';
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const settings = req.body;
    const pool = getDbPool();

    if (pool) {
      await pool.query(`
        INSERT INTO marketplace_settings (id, data, updated_at)
        VALUES ('global_settings', $1, $2)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at
      `, [JSON.stringify(settings), Date.now()]);
    } else {
      inMemoryStore.marketplace_settings = settings;
      saveInMemoryStoreToDisk();
    }

    return res.json({ success: true, message: 'মার্কেটপ্লেস সেটিংস সফলভাবে সংরক্ষিত হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 13. GET /api/marketplace/vendor/summary - Vendor View Marketplace Status & Orders
 */
router.get('/vendor/summary', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();

    if (pool) {
      // 1. Vendor's marketplace orders
      const ordersRes = await pool.query(`
        SELECT * FROM online_orders 
        WHERE user_id = $1 AND (order_source = 'marketplace' OR master_order_id IS NOT NULL)
        ORDER BY created_at DESC
      `, [userId]).catch(() => ({ rows: [] }));

      // 2. Vendor's marketplace products
      const prodsRes = await pool.query(`
        SELECT id, name, sale_price, stock, image_url, is_listed_on_marketplace, is_featured_on_marketplace, marketplace_status
        FROM products 
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `, [userId]).catch(() => ({ rows: [] }));

      const orders = ordersRes.rows.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        masterOrderId: o.master_order_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
        totalAmount: parseFloat(o.total_amount) || 0,
        orderStatus: o.order_status,
        vendorPayoutStatus: o.vendor_payout_status || 'unsettled',
        createdAt: Number(o.created_at),
      }));

      const products = prodsRes.rows.map(p => ({
        id: p.id,
        name: p.name,
        salePrice: parseFloat(p.sale_price) || 0,
        stock: parseFloat(p.stock) || 0,
        imageUrl: p.image_url,
        isListedOnMarketplace: p.is_listed_on_marketplace === true,
        isFeaturedOnMarketplace: p.is_featured_on_marketplace === true,
        marketplaceStatus: p.marketplace_status || 'approved',
      }));

      return res.json({
        success: true,
        orders,
        products,
        listedCount: products.filter(p => p.isListedOnMarketplace).length,
        totalSales: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      });
    } else {
      const orders = (inMemoryStore.online_orders || []).filter(
        o => o.userId === userId && (o.orderSource === 'marketplace' || o.masterOrderId)
      );
      const prods = (inMemoryStore.products || []).filter(p => p.userId === userId);
      return res.json({
        success: true,
        orders,
        products: prods,
        listedCount: prods.filter(p => p.isListedOnMarketplace).length,
        totalSales: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/marketplace/sitemap.xml
 * Dynamic XML sitemap containing all active marketplace products for Google Search Console & indexing
 */
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const pool = getDbPool();
    let products: any[] = [];

    if (pool) {
      const dbRes = await pool.query(
        `SELECT id, name, updated_at 
         FROM products 
         WHERE is_listed_on_marketplace = true AND is_published_online = true AND stock > 0
         ORDER BY updated_at DESC LIMIT 1000`
      );
      products = dbRes.rows;
    } else {
      products = (inMemoryStore.products || []).filter(
        (p: any) => p.isListedOnMarketplace && p.isPublishedOnline
      );
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url>\n    <loc>https://centralmarketplace.twinghisabi.site/</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    products.forEach((p) => {
      const pid = p.id;
      const lastmod = p.updated_at ? new Date(Number(p.updated_at)).toISOString().split('T')[0] : '2026-09-24';
      xml += `  <url>\n    <loc>https://centralmarketplace.twinghisabi.site/?product=${pid}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += `</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (e: any) {
    return res.status(500).send('Error generating marketplace sitemap');
  }
});

export default router;
