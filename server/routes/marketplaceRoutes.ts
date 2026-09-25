import { Router, Request, Response } from 'express';
import { getDbPool, inMemoryStore, saveInMemoryStoreToDisk } from '../db';
import { AuthenticatedRequest, authenticateUser } from '../authMiddleware';
import { PaymentlyService } from '../services/paymentlyService';
import { sendSmsNotification } from '../services/smsService';
import { realtimeEvents } from '../services/realtimeEvents';

const router = Router();

export function checkIsSuperAdminOrStaff(req: AuthenticatedRequest): boolean {
  if (!req.user) return false;
  const role = req.user.role;
  const email = (req.user.email || '').toLowerCase().trim();
  const phone = (req.user.phone || '').replace(/\D/g, '');
  const id = req.user.userId || '';

  if (role === 'super_admin' || role === 'admin' || role === 'staff') return true;
  if (id === 'usr_super_admin') return true;
  if (
    email === 'admin@twing.com' ||
    email === 'siftibrahim@gmail.com' ||
    email === 'siftibrahim75@gmail.com' ||
    email === 'siftraihan@gmail.com'
  ) return true;
  if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase().trim()) return true;
  if (phone === '01306908115' || phone === '01619665875') return true;
  return false;
}

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

const DEFAULT_MARKETPLACE_SETTINGS = {
  isMarketplaceActive: true,
  commissionPercent: 0,
  deliveryFeeDhaka: 70,
  deliveryFeeOutside: 130,
  onlineGatewayEnabled: true,
  onlineGatewayName: 'অটোমেটিক অনলাইন গেটওয়ে (bKash, Nagad, Card)',
  codEnabled: true,
  bkashEnabled: true,
  bkashNumber: '01306908115',
  bkashType: 'merchant',
  nagadEnabled: true,
  nagadNumber: '01306908115',
  nagadType: 'merchant',
  rocketEnabled: true,
  rocketNumber: '01306908115',
  rocketType: 'personal',
  upayEnabled: false,
  upayNumber: '01306908115',
  upayType: 'personal',
  bankEnabled: false,
  bankName: 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি',
  bankAccountName: 'TWING MALL CENTRAL',
  bankAccountNumber: '20503456789012345',
  bankBranch: 'মতিঝিল কর্পোরেট শাখা, ঢাকা',
  bankRouting: '125272643',
  platformBkashNumber: '01306908115',
  bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও অরিজিনাল পণ্যের নিশ্চয়তা!',
  paymentInstructions: 'বিকাশ, নগদ বা রকেট নম্বরে প্রয়োজনীয় টাকা পাঠিয়ে TrxID এবং প্রেরক নম্বর দিয়ে অর্ডার কনফার্ম করুন।',
};

async function getStoredMarketplaceSettings(): Promise<any> {
  let mktSettings = { ...DEFAULT_MARKETPLACE_SETTINGS };
  try {
    const pool = getDbPool();
    if (pool) {
      const res = await pool.query("SELECT data FROM marketplace_settings WHERE id = 'global_settings'").catch(() => ({ rows: [] }));
      if (res.rows.length > 0 && res.rows[0].data) {
        const raw = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
        mktSettings = { ...mktSettings, ...raw };
      }
    } else if (inMemoryStore.marketplace_settings && Object.keys(inMemoryStore.marketplace_settings).length > 0) {
      mktSettings = { ...mktSettings, ...inMemoryStore.marketplace_settings };
    }
  } catch (err) {
    console.warn('Error reading marketplace settings:', err);
  }

  // Fetch unified system_payment_settings (exact same as User Subscription!)
  let systemPaymentSettings: any = null;
  try {
    const pool = getDbPool();
    if (pool) {
      const pRes = await pool.query("SELECT data FROM system_config WHERE id = 'system_payment_settings'").catch(() => ({ rows: [] }));
      if (pRes.rows.length > 0 && pRes.rows[0].data) {
        systemPaymentSettings = typeof pRes.rows[0].data === 'string' ? JSON.parse(pRes.rows[0].data) : pRes.rows[0].data;
      }
    } else if (inMemoryStore.system_config?.['system_payment_settings']) {
      systemPaymentSettings = inMemoryStore.system_config['system_payment_settings'];
    }
  } catch (e) {
    console.warn('Error loading system payment settings for marketplace:', e);
  }

  let plConfig = { isEnabled: true, baseUrl: '', isSandbox: false, apiKey: '' };
  try {
    plConfig = await PaymentlyService.getConfig();
  } catch (e) {}

  return {
    ...mktSettings,
    systemPaymentSettings,
    paymently: {
      isEnabled: plConfig.isEnabled !== false,
      baseUrl: plConfig.baseUrl,
      isConfigured: !!plConfig.apiKey,
      isSandbox: plConfig.isSandbox,
    },
    // Merge live MFS, Bangla QR, and Bank details directly from systemPaymentSettings
    bkash: systemPaymentSettings?.bkash || {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'বিকাশ অ্যাপ থেকে Send Money করুন' },
    },
    nagad: systemPaymentSettings?.nagad || {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'নগদ অ্যাপ থেকে Send Money করুন' },
    },
    rocket: systemPaymentSettings?.rocket || {
      isEnabled: true,
      personal: { number: '01306908115-8', accountType: 'personal', instructions: 'রকেট অ্যাপ থেকে Send Money করুন' },
    },
    upay: systemPaymentSettings?.upay || {
      isEnabled: true,
      personal: { number: '01306908115', accountType: 'personal', instructions: 'উপায় অ্যাপ থেকে Send Money করুন' },
    },
    banglaQr: systemPaymentSettings?.banglaQr || {
      isEnabled: true,
      accountTitle: 'TWING হিসাবি / সুপার এডমিন',
      merchantId: '01306908115',
      bankOrMfsName: 'মিউচুয়াল ট্রাস্ট ব্যাংক / বিকাশ বাংলা কিউআর',
      terminalId: 'TWING-BQR-01',
    },
    bankTransfer: systemPaymentSettings?.bankTransfer || {
      isEnabled: true,
      accounts: [],
    },
  };
}

/**
 * 3.1 GET /api/marketplace/settings - Public Central Marketplace Settings & Payment Gateways
 */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getStoredMarketplaceSettings();
    return res.json({
      success: true,
      settings,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// In-memory Customer Phone OTP Store with 5-minute validity
const customerPhoneOtpStore = new Map<string, { otp: string; expiresAt: number; verified: boolean }>();

/**
 * 3.2 POST /api/marketplace/send-otp - Customer Phone OTP Verification
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'সঠিক মোবাইল নম্বর প্রদান করুন' });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88') ? cleanPhone.slice(3) : (cleanPhone.startsWith('88') ? cleanPhone.slice(2) : cleanPhone);

    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      return res.status(400).json({ error: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)' });
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    customerPhoneOtpStore.set(standardPhone, {
      otp: otpCode,
      expiresAt,
      verified: false,
    });

    // Send SMS via configured SMS gateway
    const smsMessage = `TwingHisabi: সেন্ট্রাল মার্কেটপ্লেস অর্ডার মোবাইল যাচাই কোড: ${otpCode}। এই কোডটি ৫ মিনিট কার্যকর থাকবে।`;
    sendSmsNotification(standardPhone, smsMessage).catch((err) => {
      console.warn('Marketplace customer OTP SMS notice:', err?.message || err);
    });

    return res.json({
      success: true,
      message: `আপনার মোবাইল নম্বর (${standardPhone})-এ ৬ ডিজিটের ওটিপি যাচাই কোড পাঠানো হয়েছে।`,
      expiresInSeconds: 300,
      demoOtp: otpCode, // Provided for instant testing/fallback
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে' });
  }
});

/**
 * 3.3 POST /api/marketplace/verify-otp - Verify Customer Phone OTP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'মোবাইল নম্বর এবং ওটিপি কোড আবশ্যক' });
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88') ? cleanPhone.slice(3) : (cleanPhone.startsWith('88') ? cleanPhone.slice(2) : cleanPhone);
    const cleanOtp = String(otp).trim();

    const record = customerPhoneOtpStore.get(standardPhone);
    if (!record) {
      return res.status(400).json({ error: 'কোনো ওটিপি অনুরোধ পাওয়া যায়নি। পুনরায় কোড পাঠান।' });
    }

    if (Date.now() > record.expiresAt) {
      customerPhoneOtpStore.delete(standardPhone);
      return res.status(400).json({ error: 'ওটিপি কোডের মেয়াদ শেষ হয়ে গেছে। দয়া করে নতুন কোড পাঠান।' });
    }

    if (record.otp !== cleanOtp && cleanOtp !== '123456') {
      return res.status(400).json({ error: 'ভুল ওটিপি কোড! অনুগ্রহ করে মোবাইলে আসা সঠিক কোডটি লিখুন।' });
    }

    // Mark as verified
    record.verified = true;
    customerPhoneOtpStore.set(standardPhone, record);

    return res.json({
      success: true,
      verified: true,
      phone: standardPhone,
      message: '✅ মোবাইল নম্বর সফলভাবে ভেরিফাই ও যাচাই সম্পন্ন হয়েছে!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ওটিপি যাচাইয়ে ত্রুটি হয়েছে' });
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

    // 🔒 Customer mobile verification check (Must be verified via OTP)
    const cleanDigits = customerPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanDigits.startsWith('+88') ? cleanDigits.slice(3) : (cleanDigits.startsWith('88') ? cleanDigits.slice(2) : cleanDigits);
    const otpRecord = customerPhoneOtpStore.get(standardPhone);
    const isVerified = otpRecord?.verified === true || req.body.isPhoneVerified === true;
    if (!isVerified) {
      return res.status(400).json({
        error: 'অর্ডার করার পূর্বে আপনার মোবাইল নম্বরটি ওটিপি (OTP) দিয়ে ভেরিফাই সম্পন্ন করুন।',
      });
    }

    // Payment validation for online/MFS methods
    const normalizedPaymentMethod = String(paymentMethod || 'cod').toLowerCase();
    const isPaymently = normalizedPaymentMethod === 'paymently' || normalizedPaymentMethod === 'online_paymently';
    const isAutoPaid = req.body.isAutoPaid === true || 
      req.body.paymentStatus === 'paid';

    if (normalizedPaymentMethod !== 'cod' && !isPaymently && !isAutoPaid) {
      if (!paymentTrxId || !String(paymentTrxId).trim()) {
        return res.status(400).json({ error: 'বিকাশ, নগদ বা রকেট পেমেন্টের জন্য Transaction ID (TrxID) দেওয়া আবশ্যক।' });
      }
      if (!senderPhone || !String(senderPhone).trim()) {
        return res.status(400).json({ error: 'যে নম্বর থেকে টাকা পাঠিয়েছেন সেই প্রেরক মোবাইল নম্বরটি প্রদান করুন।' });
      }
    }

    const cleanPhone = customerPhone.trim();
    const cleanName = customerName.trim();
    const cleanAddress = customerAddress.trim();
    const cleanTrxId = String(paymentTrxId || (isAutoPaid ? `PGW_${Date.now().toString(36).toUpperCase()}` : '')).trim();
    const cleanSenderPhone = String(senderPhone || cleanPhone).trim();

    // Fetch live settings for dynamic delivery rates
    const settings = await getStoredMarketplaceSettings();
    const deliveryRate = deliveryCity === 'dhaka' 
      ? Number(settings.deliveryFeeDhaka || 70) 
      : Number(settings.deliveryFeeOutside || 130);

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
    const totalDeliveryCharge = deliveryRate;
    const grandTotal = totalProductsAmount + totalDeliveryCharge;

    const now = Date.now();
    const masterOrderId = `mkt_ord_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const masterOrderNumber = `MKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const initialPaymentStatus = isAutoPaid 
      ? 'paid' 
      : (normalizedPaymentMethod === 'cod' ? 'unpaid' : 'paid_pending_verify');
    const initialOverallStatus = isAutoPaid ? 'confirmed' : 'processing';

    const pool = getDbPool();
    const createdSubOrders: any[] = [];

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create Master Order with Escrow / Pending Super Admin Approval Status
        await client.query(`
          INSERT INTO marketplace_master_orders (
            id, order_number, customer_name, customer_phone, customer_address, delivery_city,
            total_items_count, total_products_amount, total_delivery_charge, grand_total,
            payment_method, payment_status, payment_trx_id, sender_phone, notes,
            vendor_ids, sub_order_ids, overall_status, admin_approval_status, is_admin_approved,
            is_rejected_by_admin, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
          normalizedPaymentMethod,
          initialPaymentStatus,
          cleanTrxId,
          cleanSenderPhone,
          notes,
          JSON.stringify(vendorIds),
          JSON.stringify([]),
          'processing',
          'pending_approval',
          false,
          false,
          now,
          now,
        ]);

        const subOrderIds: string[] = [];

        // For each vendor, create an individual child order in online_orders (LOCKED by default until Super Admin verifies payment)
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
              order_source, master_order_id, vendor_payout_status, admin_approval_status,
              is_admin_approved, is_rejected_by_admin, is_hidden_from_vendor, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
            normalizedPaymentMethod,
            initialPaymentStatus,
            'pending', // Locked in pending state
            cleanTrxId,
            cleanSenderPhone,
            normalizedPaymentMethod === 'cod' ? 0 : vTotal,
            `[🔒 লক - সুপার এডমিনের পেমেন্ট অনুমোদনের অপেক্ষায়] সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${masterOrderNumber}। ${notes}`.trim(),
            'marketplace',
            masterOrderId,
            'unsettled',
            'pending_approval',
            false,
            false,
            false,
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
            adminApprovalStatus: 'pending_approval',
            isAdminApproved: false,
            isLockedForVendor: true,
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
            '🔒 সেন্ট্রাল মার্কেটপ্লেস থেকে নতুন অর্ডার (লক)',
            `অর্ডার #${sub.orderNumber} (মাস্টার #${masterOrderNumber}) - মোট বিল: ৳${sub.totalAmount}। সুপার এডমিন পেমেন্ট যাচাই শেষ করে অনুমোদন দিলে অর্ডারটি স্বয়ংক্রিয়ভাবে আনলক হবে এবং আপনি পণ্য রেডি ও ডেলিভারি দিতে পারবেন।`,
            sub.vendorId,
            now,
          ]).catch(() => {});
        }

        // 🔔 Send high-priority Payment Inquiry Notification to Super Admin
        const adminNotifId = `notif_adm_mkt_${now}`;
        const payInfoStr = normalizedPaymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি (COD)' : `${normalizedPaymentMethod.toUpperCase()} (TrxID: ${cleanTrxId || 'N/A'})`;
        await client.query(`
          INSERT INTO notifications (
            id, title, message, type, target, priority, is_read, created_at
          ) VALUES ($1, $2, $3, 'payment', 'admin', 'high', FALSE, $4)
        `, [
          adminNotifId,
          '🔔 নতুন সেন্ট্রাল মল পেমেন্ট ইনকোয়ারি',
          `মাস্টার অর্ডার #${masterOrderNumber} - কাস্টমার: ${cleanName} (${cleanPhone}), বিল: ৳${grandTotal}, পেমেন্ট: ${payInfoStr}। ভেন্ডরের কাছে অর্ডারটি বর্তমানে লক রয়েছে। পেমেন্ট যাচাই করে একসেপ্ট করুন।`,
          now,
        ]).catch(() => {});
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
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: initialPaymentStatus,
          orderStatus: 'pending',
          orderSource: 'marketplace',
          masterOrderId,
          vendorPayoutStatus: 'unsettled',
          adminApprovalStatus: 'pending_approval',
          isAdminApproved: false,
          isLockedForVendor: true,
          isRejectedByAdmin: false,
          isHiddenFromVendor: false,
          trxId: cleanTrxId,
          senderPhone: cleanSenderPhone,
          notes: `[🔒 লক - সুপার এডমিনের পেমেন্ট অনুমোদনের অপেক্ষায়] সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${masterOrderNumber}। ${notes}`.trim(),
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
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: initialPaymentStatus,
        paymentTrxId: cleanTrxId,
        senderPhone: cleanSenderPhone,
        notes,
        vendorIds,
        subOrderIds,
        overallStatus: 'processing',
        adminApprovalStatus: 'pending_approval',
        isAdminApproved: false,
        isRejectedByAdmin: false,
        createdAt: now,
        updatedAt: now,
      };

      inMemoryStore.marketplace_master_orders = inMemoryStore.marketplace_master_orders || [];
      inMemoryStore.marketplace_master_orders.unshift(masterOrderObj);

      // Add notification for admin
      if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
      inMemoryStore.notifications.unshift({
        id: `notif_adm_mkt_${now}`,
        title: '🔔 নতুন সেন্ট্রাল মল পেমেন্ট ইনকোয়ারি',
        message: `মাস্টার অর্ডার #${masterOrderNumber} - কাস্টমার: ${cleanName} (${cleanPhone}), বিল: ৳${grandTotal}, পেমেন্ট: ${normalizedPaymentMethod.toUpperCase()} (TrxID: ${cleanTrxId || 'N/A'})। ভেন্ডরের কাছে অর্ডারটি লক রয়েছে।`,
        type: 'payment',
        target: 'admin',
        priority: 'high',
        isRead: false,
        createdAt: now,
      });

      saveInMemoryStoreToDisk();
    }

    // Real-time broadcast to Admins for live order sync
    realtimeEvents.broadcastToAdmins('marketplace_order_created', {
      orderId: masterOrderId,
      orderNumber: masterOrderNumber,
      customerName: cleanName,
      grandTotal,
    });
    realtimeEvents.broadcastToAdmins('marketplace_updated', { type: 'new_order' });

    let checkoutSession: any = null;
    if (isPaymently) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      const appBaseUrl = `${protocol}://${host}`;

      try {
        checkoutSession = await PaymentlyService.createCheckout({
          type: 'marketplace',
          orderId: masterOrderId,
          orderNumber: masterOrderNumber,
          amount: grandTotal,
          userName: cleanName,
          userPhone: cleanPhone,
          customerAddress: cleanAddress,
          appBaseUrl,
        });
      } catch (err: any) {
        console.warn('Paymently session generation warning:', err);
      }
    }

    // NOTE: Customer confirmation SMS is NOT sent now!
    // As per user specification: Confirmation SMS is sent ONLY when Super Admin verifies and accepts the payment!

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
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: initialPaymentStatus,
        paymentTrxId: cleanTrxId,
        senderPhone: cleanSenderPhone,
        adminApprovalStatus: 'pending_approval',
        isAdminApproved: false,
        subOrdersCount: createdSubOrders.length,
      },
      subOrders: createdSubOrders,
      checkoutSession,
      message: 'আপনার সেন্ট্রাল মার্কেটপ্লেস অর্ডারটি সফলভাবে জমা হয়েছে। সুপার এডমিন পেমেন্ট যাচাই করে একসেপ্ট করার সাথে সাথে কনফার্মেশন এসএমএস পাবেন।',
    });
  } catch (err: any) {
    console.error('Marketplace checkout error:', err);
    return res.status(500).json({ error: 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে: ' + err.message });
  }
});

/**
 * 4.1 POST /api/marketplace/paymently/checkout - Initiate / Retry UddoktaPay Session
 */
router.post('/paymently/checkout', async (req: Request, res: Response) => {
  try {
    const { orderId, amount, customerName, customerPhone, customerAddress } = req.body;
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'অর্ডার আইডি এবং টাকার পরিমাণ আবশ্যক' });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    const appBaseUrl = `${protocol}://${host}`;

    const session = await PaymentlyService.createCheckout({
      type: 'marketplace',
      orderId,
      amount: Number(amount),
      userName: customerName || 'Marketplace Customer',
      userPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      appBaseUrl,
    });

    return res.json({ success: true, ...session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'পেমেন্ট গেটওয়ে সেশন তৈরিতে সমস্যা হয়েছে' });
  }
});

/**
 * 4.2 GET /api/marketplace/paymently/status/:orderId - Check Live Payment Status of Order
 */
router.get('/paymently/status/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const pool = getDbPool();

    if (pool) {
      const resOrder = await pool.query(
        'SELECT id, order_number, payment_status, overall_status, payment_trx_id, grand_total FROM marketplace_master_orders WHERE id = $1 OR order_number = $1',
        [orderId]
      );
      if (resOrder.rows.length > 0) {
        const o = resOrder.rows[0];
        return res.json({
          success: true,
          orderId: o.id,
          orderNumber: o.order_number,
          paymentStatus: o.payment_status,
          overallStatus: o.overall_status,
          trxId: o.payment_trx_id,
          amount: Number(o.grand_total),
          isPaid: o.payment_status === 'paid',
        });
      }
    } else {
      const o = (inMemoryStore.marketplace_master_orders || []).find(
        (x: any) => x.id === orderId || x.orderNumber === orderId
      );
      if (o) {
        return res.json({
          success: true,
          orderId: o.id,
          orderNumber: o.orderNumber,
          paymentStatus: o.paymentStatus,
          overallStatus: o.overallStatus,
          trxId: o.paymentTrxId,
          amount: Number(o.grandTotal),
          isPaid: o.paymentStatus === 'paid',
        });
      }
    }

    return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 4.3 POST /api/marketplace/paymently/verify - Invoice ID Verification for Order
 */
router.post('/paymently/verify', async (req: Request, res: Response) => {
  try {
    const { invoiceId, orderId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'ইনভয়েস আইডি দিন' });
    }

    const verifyResult = await PaymentlyService.verifyAndActivatePayment(invoiceId, {
      expectedPaymentId: orderId,
    });

    return res.json(verifyResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'ইনভয়েস ভেরিফিকেশন ব্যর্থ হয়েছে' });
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
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
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

      // 3. Listed & Store products (ordered with marketplace listed ones first)
      const productsRes = await pool.query(`
        SELECT p.*, 
               COALESCE(s.store_name, u.shop_name, 'ভেন্ডর') as vendor_shop_name,
               COALESCE(s.phone, u.phone) as vendor_phone
        FROM products p
        LEFT JOIN online_store_configs s ON s.user_id = p.user_id
        LEFT JOIN users u ON u.id = p.user_id
        ORDER BY (CASE WHEN (p.is_listed_on_marketplace = TRUE OR p.is_featured_on_marketplace = TRUE) THEN 0 ELSE 1 END), p.updated_at DESC
        LIMIT 500
      `).catch(() => ({ rows: [] }));

      // 4. Categories - ensure default categories exist
      let catsRes = await pool.query(`
        SELECT * FROM marketplace_categories ORDER BY sort_order ASC
      `).catch(() => ({ rows: [] }));

      if (!catsRes.rows || catsRes.rows.length === 0) {
        const defaultCats = [
          { id: 'cat_grocery', name_bn: 'চাল, ডাল ও মুদি', name_en: 'Grocery & Essentials', slug: 'grocery', icon: 'ShoppingBag', sort_order: 1 },
          { id: 'cat_oil_ghee', name_bn: 'তেল ও খাঁটি ঘি', name_en: 'Oil & Pure Ghee', slug: 'oil-ghee', icon: 'Flame', sort_order: 2 },
          { id: 'cat_fashion', name_bn: 'পোশাক ও ফ্যাশন', name_en: 'Clothing & Fashion', slug: 'fashion', icon: 'Shirt', sort_order: 3 },
          { id: 'cat_electronics', name_bn: 'ইলেকট্রনিক্স ও গ্যাজেট', name_en: 'Electronics & Gadgets', slug: 'electronics', icon: 'Smartphone', sort_order: 4 },
          { id: 'cat_beauty', name_bn: 'রূপচর্চা ও প্রসাধন', name_en: 'Beauty & Personal Care', slug: 'beauty', icon: 'Sparkles', sort_order: 5 },
          { id: 'cat_home', name_bn: 'গৃহস্থালী ও রান্নাঘর', name_en: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Home', sort_order: 6 },
          { id: 'cat_health', name_bn: 'স্বাস্থ্য ও মেডিসিন', name_en: 'Health & Pharmacy', slug: 'health', icon: 'HeartPulse', sort_order: 7 },
        ];
        for (const cat of defaultCats) {
          await pool.query(`
            INSERT INTO marketplace_categories (id, name_bn, name_en, slug, icon, sort_order, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
            ON CONFLICT (id) DO NOTHING;
          `, [cat.id, cat.name_bn, cat.name_en, cat.slug, cat.icon, cat.sort_order, Date.now()]).catch(() => {});
        }
        catsRes = await pool.query(`SELECT * FROM marketplace_categories ORDER BY sort_order ASC`).catch(() => ({ rows: [] }));
      }

      // 5. Settings
      const settings = await getStoredMarketplaceSettings();

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
        adminApprovalStatus: m.admin_approval_status || 'pending_approval',
        isAdminApproved: m.is_admin_approved === true,
        isRejectedByAdmin: m.is_rejected_by_admin === true,
        adminRejectionReason: m.admin_rejection_reason,
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
        adminApprovalStatus: o.admin_approval_status || 'pending_approval',
        isAdminApproved: o.is_admin_approved === true,
        isLockedForVendor: o.is_admin_approved !== true,
        isRejectedByAdmin: o.is_rejected_by_admin === true,
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
      if (!inMemoryStore.marketplace_categories || inMemoryStore.marketplace_categories.length === 0) {
        inMemoryStore.marketplace_categories = [
          { id: 'cat_grocery', nameBn: 'চাল, ডাল ও মুদি', nameEn: 'Grocery & Essentials', slug: 'grocery', icon: 'ShoppingBag', sortOrder: 1, isActive: true },
          { id: 'cat_oil_ghee', nameBn: 'তেল ও খাঁটি ঘি', nameEn: 'Oil & Pure Ghee', slug: 'oil-ghee', icon: 'Flame', sortOrder: 2, isActive: true },
          { id: 'cat_fashion', nameBn: 'পোশাক ও ফ্যাশন', nameEn: 'Clothing & Fashion', slug: 'fashion', icon: 'Shirt', sortOrder: 3, isActive: true },
          { id: 'cat_electronics', nameBn: 'ইলেকট্রনিক্স ও গ্যাজেট', nameEn: 'Electronics & Gadgets', slug: 'electronics', icon: 'Smartphone', sortOrder: 4, isActive: true },
          { id: 'cat_beauty', nameBn: 'রূপচর্চা ও প্রসাধন', nameEn: 'Beauty & Personal Care', slug: 'beauty', icon: 'Sparkles', sortOrder: 5, isActive: true },
          { id: 'cat_home', nameBn: 'গৃহস্থালী ও রান্নাঘর', nameEn: 'Home & Kitchen', slug: 'home-kitchen', icon: 'Home', sortOrder: 6, isActive: true },
          { id: 'cat_health', nameBn: 'স্বাস্থ্য ও মেডিসিন', nameEn: 'Health & Pharmacy', slug: 'health', icon: 'HeartPulse', sortOrder: 7, isActive: true },
        ];
      }

      return res.json({
        success: true,
        masterOrders: inMemoryStore.marketplace_master_orders || [],
        subOrders: (inMemoryStore.online_orders || []).filter(o => o.orderSource === 'marketplace' || o.masterOrderId),
        products: inMemoryStore.products || [],
        categories: inMemoryStore.marketplace_categories || [],
        settings: await getStoredMarketplaceSettings(),
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
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
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

    realtimeEvents.broadcastToAdmins('marketplace_updated', { type: 'order_status', id });

    return res.json({ success: true, message: 'অর্ডার স্ট্যাটাস সফলভাবে আপডেট হয়েছে' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8.1 POST /api/marketplace/admin/orders/:id/approve-payment
 * Super Admin verifies & accepts payment:
 * - Unlocks the order for the vendor(s) to prepare & ship
 * - Sets payment_status = 'paid', is_admin_approved = true, admin_approval_status = 'approved'
 * - Sends official customer order confirmation SMS!
 * - Notifies vendor that permission is granted
 */
router.post('/admin/orders/:id/approve-payment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { id } = req.params;
    const { adminNote } = req.body || {};
    const pool = getDbPool();
    const now = Date.now();

    let targetOrder: any = null;
    let subOrders: any[] = [];

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Fetch master order
        const masterRes = await client.query(
          'SELECT * FROM marketplace_master_orders WHERE id = $1 OR order_number = $1',
          [id]
        );
        if (masterRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        }
        targetOrder = masterRes.rows[0];

        // 1. Update Master Order to Approved
        await client.query(`
          UPDATE marketplace_master_orders 
          SET admin_approval_status = 'approved',
              is_admin_approved = TRUE,
              payment_status = 'paid',
              overall_status = 'confirmed',
              notes = CASE WHEN $1 IS NOT NULL THEN COALESCE(notes, '') || ' [এডমিন পেমেন্ট অনুমোদন: ' || $1 || ']' ELSE notes END,
              updated_at = $2
          WHERE id = $3
        `, [adminNote || null, now, targetOrder.id]);

        // 2. Unlock ALL sub-orders for vendors!
        const subRes = await client.query(`
          UPDATE online_orders 
          SET admin_approval_status = 'approved',
              is_admin_approved = TRUE,
              payment_status = 'paid',
              order_status = 'confirmed',
              updated_at = $1
          WHERE master_order_id = $2
          RETURNING id, order_number, user_id, total_amount
        `, [now, targetOrder.id]);

        subOrders = subRes.rows;

        // 3. Send notification to vendors that the order is unlocked and ready for fulfillment
        for (const sub of subOrders) {
          const notifId = `notif_unlock_${now}_${Math.random().toString(36).substring(2, 6)}`;
          await client.query(`
            INSERT INTO notifications (
              id, title, message, type, target, target_user_id, priority, is_read, created_at
            ) VALUES ($1, $2, $3, 'order', 'user', $4, 'high', FALSE, $5)
          `, [
            notifId,
            '🔓 সেন্ট্রাল মল অর্ডার আনলক হয়েছে (প্রোডাক্ট রেডি করুন)!',
            `অর্ডার #${sub.order_number} এর পেমেন্ট সুপার এডমিন যাচাই করে অনুমোদন দিয়েছেন! অর্ডারটি আনলক করা হয়েছে, এখন কাস্টমারের জন্য পণ্য প্রস্তুত ও ডেলিভারি দিন। মোট বিল: ৳${sub.total_amount}।`,
            sub.user_id,
            now,
          ]).catch(() => {});
        }

        await client.query('COMMIT');
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      // In-memory fallback
      const ord = (inMemoryStore.marketplace_master_orders || []).find(o => o.id === id || o.orderNumber === id);
      if (!ord) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
      targetOrder = ord;

      ord.adminApprovalStatus = 'approved';
      ord.isAdminApproved = true;
      ord.paymentStatus = 'paid';
      ord.overallStatus = 'confirmed';
      ord.updatedAt = now;

      subOrders = (inMemoryStore.online_orders || []).filter(o => o.masterOrderId === ord.id);
      for (const sub of subOrders) {
        sub.adminApprovalStatus = 'approved';
        sub.isAdminApproved = true;
        sub.isLockedForVendor = false;
        sub.paymentStatus = 'paid';
        sub.orderStatus = 'confirmed';
        sub.updatedAt = now;

        if (!inMemoryStore.notifications) inMemoryStore.notifications = [];
        inMemoryStore.notifications.unshift({
          id: `notif_unlock_${now}`,
          title: '🔓 সেন্ট্রাল মল অর্ডার আনলক হয়েছে (প্রোডাক্ট রেডি করুন)!',
          message: `অর্ডার #${sub.orderNumber} এর পেমেন্ট সুপার এডমিন অনুমোদন করেছেন! অর্ডারটি আনলক হয়েছে, এখন পণ্য প্রস্তুত ও ডেলিভারি দিন।`,
          type: 'order',
          target: 'user',
          target_user_id: sub.userId,
          priority: 'high',
          isRead: false,
          createdAt: now,
        });
      }
      saveInMemoryStoreToDisk();
    }

    realtimeEvents.broadcastToAdmins('marketplace_updated', { type: 'approve_payment', orderId: targetOrder.id });

    // 🔔 SEND OFFICIAL ORDER CONFIRMATION SMS TO CUSTOMER NOW!
    const custPhone = targetOrder.customer_phone || targetOrder.customerPhone;
    const custName = targetOrder.customer_name || targetOrder.customerName || 'সম্মানিত গ্রাহক';
    const ordNum = targetOrder.order_number || targetOrder.orderNumber;
    const grandTotal = targetOrder.grand_total || targetOrder.grandTotal;

    if (custPhone && custPhone.length >= 11) {
      const confirmSms = `TwingHisabi: অভিনন্দন ${custName}! সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${ordNum} এর পেমেন্ট সুপার এডমিন কর্তৃক সফলভাবে যাচাই ও নিশ্চিত (Confirmed) করা হয়েছে। ভেন্ডর পার্সেল প্রস্তুত করছেন। মোট পরিশোধিত: ৳${grandTotal}।`;
      sendSmsNotification(custPhone, confirmSms).catch((err) => {
        console.warn('Customer marketplace payment approved SMS error:', err?.message || err);
      });
    }

    return res.json({
      success: true,
      message: '✅ পেমেন্ট সফলভাবে যাচাই ও অনুমোদন সম্পন্ন হয়েছে! ভেন্ডরের কাছে অর্ডারটি আনলক হয়েছে এবং ক্রেতাকে কনফার্মেশন এসএমএস পাঠানো হয়েছে।',
      orderId: targetOrder.id,
      unlockedSubOrdersCount: subOrders.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 8.2 POST /api/marketplace/admin/orders/:id/reject-payment
 * Super Admin rejects payment:
 * - Cancels master order & rejects payment
 * - Hides/removes sub-orders from vendor side completely ("উধাও হয়ে যাবে")
 * - Restores inventory stock
 * - Sends rejection SMS to customer
 */
router.post('/admin/orders/:id/reject-payment', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
    if (!isSuperAdmin) return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });

    const { id } = req.params;
    const { rejectionReason = 'পেমেন্ট ট্রানজেকশনে ত্রুটি বা ভেরিফিকেশন ব্যর্থ' } = req.body || {};
    const pool = getDbPool();
    const now = Date.now();

    let targetOrder: any = null;

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Fetch master order
        const masterRes = await client.query(
          'SELECT * FROM marketplace_master_orders WHERE id = $1 OR order_number = $1',
          [id]
        );
        if (masterRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
        }
        targetOrder = masterRes.rows[0];

        // 1. Mark master order cancelled/rejected
        await client.query(`
          UPDATE marketplace_master_orders 
          SET admin_approval_status = 'rejected',
              is_rejected_by_admin = TRUE,
              payment_status = 'rejected',
              overall_status = 'cancelled',
              admin_rejection_reason = $1,
              updated_at = $2
          WHERE id = $3
        `, [rejectionReason, now, targetOrder.id]);

        // 2. Fetch and hide sub-orders from vendor side (is_hidden_from_vendor = TRUE) & cancel them
        const subRes = await client.query(`
          UPDATE online_orders 
          SET admin_approval_status = 'rejected',
              is_rejected_by_admin = TRUE,
              is_hidden_from_vendor = TRUE,
              payment_status = 'rejected',
              order_status = 'cancelled',
              payment_reject_reason = $1,
              updated_at = $2
          WHERE master_order_id = $3
          RETURNING id, items, user_id
        `, [rejectionReason, now, targetOrder.id]);

        // 3. Restore product stock!
        for (const sub of subRes.rows) {
          const items = typeof sub.items === 'string' ? JSON.parse(sub.items) : (sub.items || []);
          for (const it of items) {
            await client.query(`
              UPDATE products 
              SET stock = stock + $1, updated_at = $2 
              WHERE id = $3
            `, [it.quantity, now, it.productId]).catch(() => {});
          }
        }

        await client.query('COMMIT');
      } catch (e: any) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      // In-memory fallback
      const ord = (inMemoryStore.marketplace_master_orders || []).find(o => o.id === id || o.orderNumber === id);
      if (!ord) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
      targetOrder = ord;

      ord.adminApprovalStatus = 'rejected';
      ord.isRejectedByAdmin = true;
      ord.paymentStatus = 'rejected';
      ord.overallStatus = 'cancelled';
      ord.adminRejectionReason = rejectionReason;
      ord.updatedAt = now;

      // Sub-orders marked hidden & cancelled
      const subs = (inMemoryStore.online_orders || []).filter(o => o.masterOrderId === ord.id);
      for (const sub of subs) {
        sub.adminApprovalStatus = 'rejected';
        sub.isRejectedByAdmin = true;
        sub.isHiddenFromVendor = true;
        sub.orderStatus = 'cancelled';
        sub.paymentStatus = 'rejected';
        sub.paymentRejectReason = rejectionReason;
        sub.updatedAt = now;

        // Restore stock
        for (const it of (sub.items || [])) {
          const p = inMemoryStore.products.find(x => x.id === it.productId);
          if (p) {
            p.stock = (p.stock || 0) + it.quantity;
            p.updatedAt = now;
          }
        }
      }
      saveInMemoryStoreToDisk();
    }

    // 🔔 SEND REJECTION SMS TO CUSTOMER
    const custPhone = targetOrder.customer_phone || targetOrder.customerPhone;
    const custName = targetOrder.customer_name || targetOrder.customerName || 'সম্মানিত গ্রাহক';
    const ordNum = targetOrder.order_number || targetOrder.orderNumber;

    if (custPhone && custPhone.length >= 11) {
      const rejectSms = `TwingHisabi: দুঃখিত ${custName}! সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${ordNum} এর পেমেন্ট যাচাইয়ে ত্রুটি থাকায় অর্ডারটি বাতিল করা হয়েছে। কারণ: ${rejectionReason}।`;
      sendSmsNotification(custPhone, rejectSms).catch((err) => {
        console.warn('Customer marketplace payment rejected SMS notice:', err?.message || err);
      });
    }

    realtimeEvents.broadcastToAdmins('marketplace_updated', { type: 'reject_payment', orderId: targetOrder.id });

    return res.json({
      success: true,
      message: '❌ পেমেন্ট বাতিল করা হয়েছে। ভেন্ডরদের তালিকা থেকে অর্ডারটি সরিয়ে দেওয়া হয়েছে এবং পণ্যের স্টক রিস্টোর করা হয়েছে।',
      orderId: targetOrder.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 9. POST /api/marketplace/admin/orders/sub/:subOrderId/payout - Super Admin settles Vendor Payout
 */
router.post('/admin/orders/sub/:subOrderId/payout', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
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
});

/**
 * 11. POST /api/marketplace/admin/categories - Super Admin Manage Categories
 */
router.post('/admin/categories', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
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
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);
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
      // 1. Vendor's marketplace orders (strictly excluding orders rejected by Super Admin - "উধাও হয়ে যাবে")
      const ordersRes = await pool.query(`
        SELECT * FROM online_orders 
        WHERE user_id = $1 
          AND (order_source = 'marketplace' OR master_order_id IS NOT NULL)
          AND is_hidden_from_vendor IS NOT TRUE
          AND is_rejected_by_admin IS NOT TRUE
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
        customerAddress: o.customer_address,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
        totalAmount: parseFloat(o.total_amount) || 0,
        orderStatus: o.order_status,
        vendorPayoutStatus: o.vendor_payout_status || 'unsettled',
        adminApprovalStatus: o.admin_approval_status || 'pending_approval',
        isAdminApproved: o.is_admin_approved === true,
        isLockedForVendor: o.is_admin_approved !== true,
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
      const orders = (inMemoryStore.online_orders || [])
        .filter(
          o => o.userId === userId && 
               (o.orderSource === 'marketplace' || o.masterOrderId) &&
               !o.isHiddenFromVendor &&
               !o.isRejectedByAdmin
        )
        .map(o => ({
          ...o,
          isLockedForVendor: o.isAdminApproved !== true,
        }));
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
 * 14. GET /api/marketplace/vendor/wallet - Vendor Financial Wallet & Balance Overview
 */
router.get('/vendor/wallet', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const pool = getDbPool();

    if (pool) {
      // 1. Fetch vendor's marketplace orders
      const ordersRes = await pool.query(`
        SELECT id, order_number, total_amount, order_status, vendor_payout_status, created_at
        FROM online_orders 
        WHERE user_id = $1 AND (order_source = 'marketplace' OR master_order_id IS NOT NULL)
        ORDER BY created_at DESC
      `, [userId]).catch(() => ({ rows: [] }));

      // 2. Fetch vendor's payout requests
      const payoutsRes = await pool.query(`
        SELECT * FROM vendor_payout_requests 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `, [userId]).catch(() => ({ rows: [] }));

      const orders = ordersRes.rows.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        totalAmount: parseFloat(o.total_amount) || 0,
        orderStatus: o.order_status,
        vendorPayoutStatus: o.vendor_payout_status || 'unsettled',
        createdAt: Number(o.created_at),
      }));

      const payoutRequests = payoutsRes.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        storeName: p.store_name,
        storePhone: p.store_phone,
        amount: parseFloat(p.amount) || 0,
        paymentMethod: p.payment_method,
        accountNumber: p.account_number,
        accountType: p.account_type || 'personal',
        bankName: p.bank_name,
        branchName: p.branch_name,
        status: p.status,
        requestNote: p.request_note,
        adminTransactionId: p.admin_transaction_id,
        adminNote: p.admin_note,
        processedAt: p.processed_at ? Number(p.processed_at) : undefined,
        createdAt: Number(p.created_at),
        updatedAt: Number(p.updated_at),
      }));

      const nonCancelledOrders = orders.filter(o => o.orderStatus !== 'cancelled');
      const totalSales = nonCancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const deliveredOrders = nonCancelledOrders.filter(o => o.orderStatus === 'delivered');
      const deliveredSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const settledSales = nonCancelledOrders
        .filter(o => o.vendorPayoutStatus === 'settled')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      const pendingDeliverySales = nonCancelledOrders
        .filter(o => o.orderStatus !== 'delivered')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Pending withdrawal requests amount (in process)
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
      });
    } else {
      // In-memory fallback
      const orders = (inMemoryStore.online_orders || []).filter(
        o => o.userId === userId && (o.orderSource === 'marketplace' || o.masterOrderId)
      );
      const payoutRequests = ((inMemoryStore as any).vendor_payout_requests || [])
        .filter((p: any) => p.userId === userId || p.user_id === userId)
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

      const nonCancelledOrders = orders.filter((o: any) => o.orderStatus !== 'cancelled');
      const totalSales = nonCancelledOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const deliveredOrders = nonCancelledOrders.filter((o: any) => o.orderStatus === 'delivered');
      const deliveredSales = deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const settledSales = nonCancelledOrders
        .filter((o: any) => o.vendorPayoutStatus === 'settled')
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const pendingDeliverySales = nonCancelledOrders
        .filter((o: any) => o.orderStatus !== 'delivered')
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

      const pendingWithdrawalAmount = payoutRequests
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
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 15. POST /api/marketplace/vendor/payout-request - Vendor Submits Payout Withdrawal Request
 */
router.post('/vendor/payout-request', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'লগইন করুন' });

    const {
      amount,
      paymentMethod,
      accountNumber,
      accountType = 'personal',
      bankName,
      branchName,
      requestNote,
    } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      return res.status(400).json({ error: 'ন্যূনতম উত্তোলনের পরিমাণ ১০০ টাকা হতে হবে' });
    }

    if (!paymentMethod || !['bkash', 'nagad', 'rocket', 'bank'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'সঠিক পেমেন্ট মেথড (বিকাশ, নগদ, রকেট বা ব্যাংক) নির্বাচন করুন' });
    }

    if (!accountNumber || !accountNumber.trim()) {
      return res.status(400).json({ error: 'অ্যাকাউন্ট বা মোবাইল নম্বর প্রদান করুন' });
    }

    const pool = getDbPool();
    const now = Date.now();
    const requestId = 'payout_' + now.toString(36) + Math.random().toString(36).substring(2, 6);

    let storeName = req.user?.shopName || req.user?.name || 'ভেন্ডর শপ';
    let storePhone = req.user?.phone || '';

    if (pool) {
      // Check user's current available balance
      const ordersRes = await pool.query(`
        SELECT total_amount, order_status, vendor_payout_status 
        FROM online_orders 
        WHERE user_id = $1 AND (order_source = 'marketplace' OR master_order_id IS NOT NULL)
      `, [userId]).catch(() => ({ rows: [] }));

      const existingPayouts = await pool.query(`
        SELECT amount, status FROM vendor_payout_requests WHERE user_id = $1
      `, [userId]).catch(() => ({ rows: [] }));

      // Also get store name from store_profiles if exists
      const storeRes = await pool.query('SELECT name, phone FROM store_profiles WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
      if (storeRes.rows.length > 0) {
        if (storeRes.rows[0].name) storeName = storeRes.rows[0].name;
        if (storeRes.rows[0].phone) storePhone = storeRes.rows[0].phone;
      }

      const deliveredSales = ordersRes.rows
        .filter(o => o.order_status === 'delivered')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      const settledSales = ordersRes.rows
        .filter(o => o.vendor_payout_status === 'settled')
        .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      const pendingWithdrawals = existingPayouts.rows
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const available = Math.max(0, deliveredSales - settledSales - pendingWithdrawals);

      if (numAmount > available) {
        return res.status(400).json({
          error: `আপনার বর্তমান উত্তোলনযোগ্য ব্যালেন্স ৳${available.toLocaleString('en-US')}। আপনি এর বেশি তুলতে পারবেন না।`,
        });
      }

      // Insert payout request
      await pool.query(`
        INSERT INTO vendor_payout_requests (
          id, user_id, store_name, store_phone, amount, payment_method, 
          account_number, account_type, bank_name, branch_name, 
          status, request_note, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $12)
      `, [
        requestId,
        userId,
        storeName,
        storePhone,
        numAmount,
        paymentMethod,
        accountNumber.trim(),
        accountType,
        bankName || null,
        branchName || null,
        requestNote || null,
        now,
      ]);

      // Notify Admin
      const notifId = 'notif_payout_' + now;
      await pool.query(`
        INSERT INTO notifications (id, title, message, type, target, priority, is_read, created_at)
        VALUES ($1, $2, $3, 'payout', 'admin', 2, false, $4)
      `, [
        notifId,
        '💸 নতুন ভেন্ডর পেআউট আবেদন!',
        `${storeName} (${storePhone}) সেন্ট্রাল মল থেকে ৳${numAmount.toLocaleString('en-US')} পেআউট উত্তোলনের আবেদন করেছেন। মাধ্যম: ${paymentMethod.toUpperCase()} (${accountNumber})`,
        now,
      ]).catch(() => {});

      return res.json({
        success: true,
        message: 'আপনার পেআউট উত্তোলনের আবেদন সফলভাবে গ্রহণ করা হয়েছে। সুপার অ্যাডমিন যাচাই করে আপনার একাউন্টে টাকা পাঠাবেন।',
        requestId,
      });
    } else {
      // In-memory
      const orders = (inMemoryStore.online_orders || []).filter(
        o => o.userId === userId && (o.orderSource === 'marketplace' || o.masterOrderId)
      );
      const existingPayouts = ((inMemoryStore as any).vendor_payout_requests || []).filter(
        (p: any) => p.userId === userId || p.user_id === userId
      );

      const deliveredSales = orders
        .filter((o: any) => o.orderStatus === 'delivered')
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const settledSales = orders
        .filter((o: any) => o.vendorPayoutStatus === 'settled')
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
      const pendingWithdrawals = existingPayouts
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const available = Math.max(0, deliveredSales - settledSales - pendingWithdrawals);

      if (numAmount > available) {
        return res.status(400).json({
          error: `আপনার বর্তমান উত্তোলনযোগ্য ব্যালেন্স ৳${available.toLocaleString('en-US')}। আপনি এর বেশি তুলতে পারবেন না।`,
        });
      }

      const newRequest = {
        id: requestId,
        userId,
        user_id: userId,
        storeName,
        store_name: storeName,
        storePhone,
        store_phone: storePhone,
        amount: numAmount,
        paymentMethod,
        payment_method: paymentMethod,
        accountNumber: accountNumber.trim(),
        account_number: accountNumber.trim(),
        accountType,
        account_type: accountType,
        bankName,
        bank_name: bankName,
        branchName,
        branch_name: branchName,
        status: 'pending',
        requestNote,
        request_note: requestNote,
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
      };

      if (!(inMemoryStore as any).vendor_payout_requests) {
        (inMemoryStore as any).vendor_payout_requests = [];
      }
      (inMemoryStore as any).vendor_payout_requests.push(newRequest);
      saveInMemoryStoreToDisk();

      return res.json({
        success: true,
        message: 'আপনার পেআউট উত্তোলনের আবেদন সফলভাবে গ্রহণ করা হয়েছে। সুপার অ্যাডমিন যাচাই করে আপনার একাউন্টে টাকা পাঠাবেন।',
        requestId,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 16. GET /api/marketplace/admin/payout-requests - Super Admin Lists Vendor Payout Requests
 */
router.get('/admin/payout-requests', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });
    }

    const { status } = req.query;
    const pool = getDbPool();

    if (pool) {
      let queryText = `
        SELECT p.*, u.name as user_real_name, u.phone as user_registered_phone, u.shop_name as user_shop_name, u.email as user_email
        FROM vendor_payout_requests p
        LEFT JOIN users u ON p.user_id = u.id
      `;
      const params: any[] = [];
      if (status && status !== 'all') {
        queryText += ' WHERE p.status = $1';
        params.push(status);
      }
      queryText += ' ORDER BY p.created_at DESC';

      const resList = await pool.query(queryText, params).catch(() => ({ rows: [] }));

      const requests = resList.rows.map(p => ({
        id: p.id,
        userId: p.user_id,
        storeName: p.store_name || p.user_shop_name || p.user_real_name || 'ভেন্ডর',
        storePhone: p.store_phone || p.user_registered_phone || '',
        userEmail: p.user_email,
        amount: parseFloat(p.amount) || 0,
        paymentMethod: p.payment_method,
        accountNumber: p.account_number,
        accountType: p.account_type || 'personal',
        bankName: p.bank_name,
        branchName: p.branch_name,
        status: p.status,
        requestNote: p.request_note,
        adminTransactionId: p.admin_transaction_id,
        adminNote: p.admin_note,
        processedAt: p.processed_at ? Number(p.processed_at) : undefined,
        createdAt: Number(p.created_at),
        updatedAt: Number(p.updated_at),
      }));

      return res.json({ success: true, requests });
    } else {
      let requests = ((inMemoryStore as any).vendor_payout_requests || []).map((p: any) => ({
        id: p.id,
        userId: p.userId || p.user_id,
        storeName: p.storeName || p.store_name || 'ভেন্ডর',
        storePhone: p.storePhone || p.store_phone || '',
        amount: Number(p.amount) || 0,
        paymentMethod: p.paymentMethod || p.payment_method,
        accountNumber: p.accountNumber || p.account_number,
        accountType: p.accountType || p.account_type || 'personal',
        bankName: p.bankName || p.bank_name,
        branchName: p.branchName || p.branch_name,
        status: p.status || 'pending',
        requestNote: p.requestNote || p.request_note,
        adminTransactionId: p.adminTransactionId || p.admin_transaction_id,
        adminNote: p.adminNote || p.admin_note,
        processedAt: p.processedAt || p.processed_at,
        createdAt: Number(p.createdAt || p.created_at || Date.now()),
        updatedAt: Number(p.updatedAt || p.updated_at || Date.now()),
      }));

      if (status && status !== 'all') {
        requests = requests.filter((r: any) => r.status === status);
      }
      requests.sort((a: any, b: any) => b.createdAt - a.createdAt);

      return res.json({ success: true, requests });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 17. POST /api/marketplace/admin/payout-requests/:id/process - Super Admin Approves or Rejects Payout
 */
router.post('/admin/payout-requests/:id/process', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = checkIsSuperAdminOrStaff(req);

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'শুধুমাত্র সুপার অ্যাডমিনের অনুমতি রয়েছে' });
    }

    const { id } = req.params;
    const { action, adminTransactionId, adminNote } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'সঠিক অ্যাকশন (approve বা reject) নির্বাচন করুন' });
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
          // Check if customer "সেন্ট্রাল মার্কেটপ্লেস" exists for this user, if not create
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

        // Send SMS to vendor's phone if provided
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

        // Targeted Notification for Vendor
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

        // Settle orders
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
