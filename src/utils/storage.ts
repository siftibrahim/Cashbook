import { Customer, Transaction, StoreProfile, DailyExpense, Product } from '../types';

export const DEFAULT_STORE: StoreProfile = {
  name: 'ইব্রাহিম জেনারেল স্টোর',
  owner: 'ইব্রাহিম',
  phone: '০১৩০৬৯০৮১১৫',
  address: 'বাজার রোড, দোকান নং ১২',
  footerNote: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।',
  currencySymbol: '৳',
  highDueLimit: 5000,
  tagadaTemplate:
    'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল।\n\nধন্যবাদ,\n{store}\nযোগাযোগ: {phone}',
  bkashNumber: '01306908115',
  nagadNumber: '01306908115',
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

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return INITIAL_CUSTOMERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CUSTOMERS;
  } catch (e) {
    console.error('Error loading customers:', e);
    return INITIAL_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers:', e);
  }
}

export function loadTransactions(): Record<string, Transaction[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return INITIAL_TRANSACTIONS;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : INITIAL_TRANSACTIONS;
  } catch (e) {
    console.error('Error loading transactions:', e);
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(txs: Record<string, Transaction[]>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

export function loadStoreProfile(): StoreProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STORE, ...parsed };
  } catch (e) {
    console.error('Error loading store profile:', e);
    return DEFAULT_STORE;
  }
}

export function saveStoreProfile(profile: StoreProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving store profile:', e);
  }
}

export function loadDailyExpenses(): DailyExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return INITIAL_EXPENSES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_EXPENSES;
  } catch (e) {
    console.error('Error loading expenses:', e);
    return INITIAL_EXPENSES;
  }
}

export function saveDailyExpenses(expenses: DailyExpense[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
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
    updatedAt: Date.now(),
  },
];

export function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) return INITIAL_PRODUCTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS;
  } catch (e) {
    console.error('Error loading products:', e);
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving products:', e);
  }
}

export function resetAllData(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(DEFAULT_STORE));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  } catch (e) {
    console.error('Error resetting data:', e);
  }
}
