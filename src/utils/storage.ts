import { Customer, Transaction, StoreProfile, DailyExpense, Product, OnlineStoreConfig, OnlineOrder } from '../types';
import { getFallbackProductImage } from './productImages';

export const DEFAULT_STORE: StoreProfile = {
  name: 'আমার দোকান',
  owner: 'দোকান মালিক',
  phone: '০১XXXXXXXXX',
  address: 'দোকানের ঠিকানা',
  footerNote: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।',
  currencySymbol: '৳',
  highDueLimit: 5000,
  tagadaTemplate:
    'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল।\n\nধন্যবাদ,\n{store}\nযোগাযোগ: {phone}',
  bkashNumber: '',
  nagadNumber: '',
  rocketNumber: '',
  themeColor: 'teal',
  enableSoundEffects: true,
  printPaperSize: 'thermal_80',
  showQrOnInvoice: true,
  defaultCreditLimit: 10000,
};

const STORAGE_KEYS = {
  CUSTOMERS: 'ibrahim_khata_customers_v2',
  TRANSACTIONS: 'ibrahim_khata_txs_v2',
  STORE: 'ibrahim_khata_store_v2',
  EXPENSES: 'ibrahim_khata_expenses_v2',
  PRODUCTS: 'ibrahim_khata_products_v2',
};

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Convert Bangla numerals (০-৯) to English (0-9)
export const normalizeToEnglishDigits = (str: string): string => {
  if (!str) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (d) => {
    const idx = banglaDigits.indexOf(d);
    return idx > -1 ? idx.toString() : d;
  });
};

// Utility to clean and normalize 11-digit phone numbers for accurate comparison
export const normalizePhoneNumber = (phoneStr: string): string => {
  if (!phoneStr) return '';
  const eng = normalizeToEnglishDigits(phoneStr);
  let cleaned = eng.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('8801') && cleaned.length >= 13) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

export function formatMoney(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US');
}

export function formatBanglaDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getCategoryLabel(cat?: string): string {
  switch (cat) {
    case 'vip':
      return 'ভিআইপি (VIP)';
    case 'wholesale':
      return 'পাইকারি';
    case 'retail':
      return 'খুচরা';
    case 'regular':
    default:
      return 'নিয়মিত';
  }
}

export function getExpenseCategoryLabel(cat?: string): string {
  switch (cat) {
    case 'shop_rent':
      return 'দোকান ভাড়া';
    case 'electricity':
      return 'বিদ্যুৎ বিল';
    case 'staff_salary':
      return 'স্টাফ বেতন';
    case 'tea_snacks':
      return 'আপ্যায়ন / চা-নাস্তা';
    case 'transport':
      return 'যাতায়াত / পরিবহন';
    case 'inventory_purchase':
      return 'মালামাল ক্রয়';
    case 'maintenance':
      return 'মেরামত / ডেকোরেশন';
    case 'other':
    default:
      return 'অন্যান্য খরচ';
  }
}

export function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'bkash':
      return 'বিকাশ (bKash)';
    case 'nagad':
      return 'নগদ (Nagad)';
    case 'rocket':
      return 'রকেট (Rocket)';
    case 'bank':
      return 'ব্যাংক ট্রান্সফার';
    case 'cash':
    default:
      return 'নগদ ক্যাশ';
  }
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    name: 'আব্দুর রহিম',
    phone: '01711223344',
    address: 'উত্তর পাড়া',
    balance: 1450,
    category: 'regular',
    creditLimit: 5000,
    updatedAt: Date.now() - 3600000 * 2,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'cust_2',
    name: 'মোঃ করিম উদ্দিন',
    phone: '01822334455',
    address: 'মাস্টার বাড়ি',
    balance: 3200,
    category: 'vip',
    creditLimit: 10000,
    updatedAt: Date.now() - 3600000 * 5,
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'cust_3',
    name: 'সালাম সওদাগর',
    phone: '01933445566',
    address: 'বাজার ঘাট',
    balance: 0,
    category: 'wholesale',
    creditLimit: 25000,
    updatedAt: Date.now() - 86400000,
    createdAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'cust_4',
    name: 'আল-আমিন মিয়া',
    phone: '01644556677',
    address: 'পশ্চিম পাড়া',
    balance: 850,
    category: 'retail',
    creditLimit: 3000,
    updatedAt: Date.now() - 1800000,
    createdAt: Date.now() - 86400000 * 3,
  },
];

const INITIAL_TRANSACTIONS: Record<string, Transaction[]> = {
  cust_1: [
    {
      id: 'tx_101',
      customerId: 'cust_1',
      type: 'sale',
      amount: 450,
      description: 'সয়াবিন তেল ২ লিটার, লবণ ১ কেজি',
      date: getTodayDateString(),
      time: '১০:৩০ AM',
      balanceAfter: 1450,
      paymentMethod: 'cash',
      receiptNo: 'REC-1001',
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'tx_102',
      customerId: 'cust_1',
      type: 'payment',
      amount: 500,
      description: 'নগদ জমা',
      date: getTodayDateString(),
      time: '০৩:১৫ PM',
      balanceAfter: 1000,
      paymentMethod: 'bkash',
      receiptNo: 'REC-1002',
      createdAt: Date.now() - 3600000 * 4,
    },
  ],
  cust_2: [
    {
      id: 'tx_201',
      customerId: 'cust_2',
      type: 'sale',
      amount: 3200,
      description: 'মিনিকেট চাল ৫০ কেজি বস্তা',
      date: getTodayDateString(),
      time: '১১:০০ AM',
      balanceAfter: 3200,
      paymentMethod: 'cash',
      receiptNo: 'REC-1003',
      createdAt: Date.now() - 3600000 * 5,
    },
  ],
  cust_4: [
    {
      id: 'tx_401',
      customerId: 'cust_4',
      type: 'sale',
      amount: 850,
      description: 'চিনি ৩ কেজি, মসুর ডাল ২ কেজি',
      date: getTodayDateString(),
      time: '০২:০০ PM',
      balanceAfter: 850,
      paymentMethod: 'cash',
      receiptNo: 'REC-1004',
      createdAt: Date.now() - 1800000,
    },
  ],
};

const INITIAL_EXPENSES: DailyExpense[] = [
  {
    id: 'exp_1',
    type: 'expense',
    category: 'tea_snacks',
    amount: 120,
    description: 'দোকানের চা-নাস্তা খরচ',
    date: getTodayDateString(),
    time: '১১:১৫ AM',
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'exp_2',
    type: 'expense',
    category: 'transport',
    amount: 250,
    description: 'মাল আনা রিকশা ভাড়া',
    date: getTodayDateString(),
    time: '০১:০০ PM',
    createdAt: Date.now() - 3600000 * 2,
  },
];

export function getActiveUserId(): string {
  try {
    const raw = localStorage.getItem('twing_user_data') || localStorage.getItem('twing_auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.userId)) return String(parsed.id || parsed.userId);
    }
  } catch {
    // ignore
  }
  return 'guest';
}

export function getUserStorageKey(baseKey: string, userId?: string): string {
  const uid = userId || getActiveUserId();
  return `khata_user_${uid}_${baseKey}`;
}

export function loadCustomers(userId?: string): Customer[] {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('customers', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading customers:', e);
    return [];
  }
}

export function saveCustomers(customers: Customer[], userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('customers', uid);
    localStorage.setItem(key, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers:', e);
  }
}

export function loadTransactions(userId?: string): Record<string, Transaction[]> {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('transactions', uid);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Error loading transactions:', e);
    return {};
  }
}

export function saveTransactions(txs: Record<string, Transaction[]>, userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('transactions', uid);
    localStorage.setItem(key, JSON.stringify(txs));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

export function loadStoreProfile(userId?: string): StoreProfile {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('store', uid);
    const raw = localStorage.getItem(key);

    let userShopName = '';
    let userName = '';
    let userPhone = '';
    try {
      const uRaw = localStorage.getItem('twing_user_data') || localStorage.getItem('twing_auth_user');
      if (uRaw) {
        const u = JSON.parse(uRaw);
        if (u && (u.id === uid || u.userId === uid || uid === 'guest' || !userId)) {
          userShopName = u.shopName || u.shop_name || '';
          userName = u.name || u.owner || '';
          userPhone = u.phone || '';
        }
      }
    } catch {
      // ignore
    }

    const fallbackStore: StoreProfile = {
      ...DEFAULT_STORE,
      name: userShopName || DEFAULT_STORE.name,
      owner: userName || DEFAULT_STORE.owner,
      phone: userPhone || DEFAULT_STORE.phone,
    };

    if (!raw) return fallbackStore;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallbackStore;

    // Check if parsed has generic placeholder defaults
    const isGenericName = !parsed.name || parsed.name === 'আমার দোকান' || parsed.name === 'TWING হিসাবি';
    const isGenericOwner = !parsed.owner || parsed.owner === 'দোকান মালিক' || parsed.owner === 'মালিক';
    const isGenericPhone = !parsed.phone || parsed.phone === '০১XXXXXXXXX' || parsed.phone === '০১৭০০০০০০০০';

    const effectiveName = !isGenericName ? parsed.name : (userShopName || parsed.name || DEFAULT_STORE.name);
    const effectiveOwner = !isGenericOwner ? parsed.owner : (userName || parsed.owner || DEFAULT_STORE.owner);
    const effectivePhone = !isGenericPhone ? parsed.phone : (userPhone || parsed.phone || DEFAULT_STORE.phone);

    return {
      ...DEFAULT_STORE,
      ...parsed,
      name: effectiveName,
      owner: effectiveOwner,
      phone: effectivePhone,
    };
  } catch (e) {
    console.error('Error loading store profile:', e);
    return DEFAULT_STORE;
  }
}

export function saveStoreProfile(profile: StoreProfile, userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('store', uid);

    // Guard: Prevent overwriting an established store profile with generic placeholder defaults
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        if (existing && existing.name && existing.name !== 'আমার দোকান' && profile.name === 'আমার দোকান') {
          profile = { ...profile, name: existing.name };
        }
        if (existing && existing.owner && existing.owner !== 'দোকান মালিক' && profile.owner === 'দোকান মালিক') {
          profile = { ...profile, owner: existing.owner };
        }
        if (existing && existing.phone && existing.phone !== '০১XXXXXXXXX' && profile.phone === '০১XXXXXXXXX') {
          profile = { ...profile, phone: existing.phone };
        }
      } catch {
        // ignore
      }
    }

    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving store profile:', e);
  }
}

export function loadDailyExpenses(userId?: string): DailyExpense[] {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('expenses', uid);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading expenses:', e);
    return [];
  }
}

export function saveDailyExpenses(expenses: DailyExpense[], userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('expenses', uid);
    localStorage.setItem(key, JSON.stringify(expenses));
  } catch (e) {
    console.error('Error saving expenses:', e);
  }
}
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'মিনিকেট চাল',
    category: 'চাল ও ডাল',
    unit: 'কেজি',
    buyPrice: 65,
    salePrice: 72,
    stock: 150,
    minStockAlert: 20,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    description: 'উন্নত মানের প্রিমিয়াম মিনিকেট চাল, রান্নায় ঝরঝরে ও সুস্বাদু।',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_2',
    name: 'সয়াবিন তেল (৫ লিটার)',
    category: 'তেল ও ঘি',
    unit: 'বোতল',
    buyPrice: 830,
    salePrice: 890,
    stock: 25,
    minStockAlert: 5,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    description: '১০০% বিশুদ্ধ পরিশোধিত সয়াবিন তেল, ভিটামিন এ ও ডি সমৃদ্ধ।',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_3',
    name: 'মসুর ডাল (দেশি)',
    category: 'চাল ও ডাল',
    unit: 'কেজি',
    buyPrice: 120,
    salePrice: 135,
    stock: 60,
    minStockAlert: 10,
    imageUrl: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=500&auto=format&fit=crop&q=80',
    description: 'দেশি চিকন মসুর ডাল, দ্রুত সেদ্ধ হয় এবং দারুণ স্বাদ।',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_4',
    name: 'সাদা চিনি',
    category: 'চিনি ও লবণ',
    unit: 'কেজি',
    buyPrice: 130,
    salePrice: 142,
    stock: 80,
    minStockAlert: 15,
    imageUrl: 'https://images.unsplash.com/photo-1622484216805-4c070b435ee9?w=500&auto=format&fit=crop&q=80',
    description: 'পরিষ্কার ও দানাদার ফ্রেশ রিফাইন্ড হোয়াইট সুগার।',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_5',
    name: 'আয়োডিনযুক্ত লবণ',
    category: 'চিনি ও লবণ',
    unit: 'প্যাকেট',
    buyPrice: 32,
    salePrice: 40,
    stock: 95,
    minStockAlert: 20,
    imageUrl: 'https://images.unsplash.com/photo-1626197031507-c17099753214?w=500&auto=format&fit=crop&q=80',
    description: 'ভ্যাকুয়াম ইভাপোরেটেড শতভাগ আয়োডিনযুক্ত টেবিল সল্ট।',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_6',
    name: 'চা পাতা (২০০ গ্রাম)',
    category: 'চা ও বিস্কুট',
    unit: 'প্যাকেট',
    buyPrice: 95,
    salePrice: 110,
    stock: 45,
    minStockAlert: 10,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    description: 'সিলেটের খাঁটি সতেজ বাগানের কড়া লিকার ও মনমাতানো সুবাসের চা।',
    updatedAt: Date.now(),
  },
];

export function loadProducts(userId?: string): Product[] {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('products', uid);
    const raw = localStorage.getItem(key);
    if (!raw) return INITIAL_PRODUCTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_PRODUCTS;
    // Ensure all products have images
    return parsed.map((p: Product) => {
      if (!p.imageUrl || p.imageUrl.trim() === '') {
        return {
          ...p,
          imageUrl: getFallbackProductImage(p.name, p.category),
        };
      }
      return p;
    });
  } catch (e) {
    console.error('Error loading products:', e);
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[], userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('products', uid);
    localStorage.setItem(key, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving products:', e);
  }
}

export function getDefaultOnlineStoreConfig(storeName?: string, phone?: string): OnlineStoreConfig {
  const cleanName = (storeName && storeName !== 'আমার দোকান' ? storeName : 'আমার অনলাইন স্টোর').trim();
  // generate slug
  const baseSlug = cleanName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 25) || 'twing-shop';

  return {
    isEnabled: true,
    storeSlug: baseSlug,
    storeName: cleanName,
    tagline: 'সেরা মানের পণ্য, দ্রুত হোম ডেলিভারি ও সুলভ মূল্য',
    category: 'জেনারেল স্টোর ও ফ্যাশন',
    phone: phone || '',
    whatsappPhone: phone || '',
    address: 'ঢাকা, বাংলাদেশ',
    customDomain: '',
    customDomainVerified: false,
    customDomainStatus: 'pending',
    themeColor: 'teal',
    announcement: '🎉 আমাদের অনলাইন শপে স্বাগতম! সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা!',
    deliveryInsideDhaka: 60,
    deliveryOutsideDhaka: 120,
    freeDeliveryAbove: 1500,
    acceptCOD: true,
    acceptBkash: true,
    bkashNumber: phone || '',
    acceptNagad: true,
    nagadNumber: phone || '',
    acceptRocket: false,
    rocketNumber: '',
    facebookUrl: '',
    publishedProductIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadOnlineStoreConfig(userId?: string, storeName?: string, phone?: string): OnlineStoreConfig {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('online_store_config', uid);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return getDefaultOnlineStoreConfig(storeName, phone);
    }
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultOnlineStoreConfig(storeName, phone),
      ...parsed,
    };
  } catch (e) {
    console.error('Error loading online store config:', e);
    return getDefaultOnlineStoreConfig(storeName, phone);
  }
}

export function saveOnlineStoreConfig(config: OnlineStoreConfig, userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('online_store_config', uid);
    localStorage.setItem(key, JSON.stringify({ ...config, updatedAt: Date.now() }));
  } catch (e) {
    console.error('Error saving online store config:', e);
  }
}

export function loadOnlineOrders(userId?: string): OnlineOrder[] {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('online_orders', uid);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading online orders:', e);
    return [];
  }
}

export function saveOnlineOrders(orders: OnlineOrder[], userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    const key = getUserStorageKey('online_orders', uid);
    localStorage.setItem(key, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving online orders:', e);
  }
}

export function resetAllData(userId?: string): void {
  try {
    const uid = userId || getActiveUserId();
    saveCustomers([], uid);
    saveTransactions({}, uid);
    saveStoreProfile(DEFAULT_STORE, uid);
    saveDailyExpenses([], uid);
    saveProducts([], uid);
    saveOnlineOrders([], uid);
  } catch (e) {
    console.error('Error resetting data:', e);
  }
}

