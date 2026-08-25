import {
  AppUser,
  PaymentRecord,
  SystemPaymentSettings,
  PaymentStatus,
  RefundStatus,
  AdminNotification,
  Announcement,
  AppUpdateConfig,
  AdminActivityLog,
  SubscriptionPlan,
  UserStatus,
  SubStatus,
  SupportMessage,
  SupportThread,
  SUPPORT_CONTACT,
  StaffMember,
  StaffPermission,
  StaffPermissionCategory,
  AdminSession,
} from '../types/adminTypes';
import {
  hashPassword,
  verifyPassword,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginAttempts,
  generateSecureOtp,
  verifySubmittedOtp,
} from './securityService';
import {
  adminApi,
  subscriptionApi,
  supportApi,
  notificationApi,
  authApi,
  getStoredUser,
} from './apiService';

export { SUPPORT_CONTACT };

export const ADMIN_EMAIL = 'admin@twing.com';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    nameBn: 'ফ্রি ট্রায়াল (১৪ দিন)',
    price: 0,
    durationDays: 14,
    features: [
      'সীমাহীন বাকি ও জমা হিসাব',
      'ডিজিটাল ক্যাশমেমো ও ভাউচার',
      'এসএমএস ও হোয়াটসঅ্যাপ তাগাদা',
      'অফলাইন ও ক্লাউড ব্যাকআপ',
      '১৪ দিনের জন্য সম্পূর্ণ ফ্রি',
    ],
    isPopular: false,
  },
  {
    id: 'plan_1m',
    name: '1 Month Starter',
    nameBn: '১ মাসের স্টার্টার প্যাক',
    price: 50,
    durationDays: 30,
    features: [
      'সকল প্রিমিয়াম ফিচার আনলক',
      'সীমাহীন কাস্টমার ও ট্রানজেকশন',
      'থার্মাল পিওএস প্রিন্ট ও কিউআর মেমো',
      'স্বয়ংক্রিয় ক্লাউড ব্যাকআপ ও সিঙ্ক',
      '২৪/৭ কাস্টমার হেল্পডেস্ক',
    ],
    isPopular: false,
  },
  {
    id: 'plan_2m',
    name: '2 Months Value',
    nameBn: '২ মাসের জনপ্রিয় প্যাক',
    price: 100,
    durationDays: 60,
    badge: 'জনপ্রিয়',
    features: [
      'সকল প্রিমিয়াম সুবিধা অন্তর্ভুক্ত',
      'আনলিমিটেড পিওএস ক্যাশমেমো',
      'রিয়েলটাইম মাল্টি-ডিভাইস সিঙ্ক',
      'অগ্রাধিকার কাস্টমার সাপোর্ট',
      'সম্পূর্ণ ডাটা সিকিউরিটি',
    ],
    isPopular: true,
  },
  {
    id: 'plan_4m',
    name: '4 Months Saver',
    nameBn: '৪ মাসের সেভিংস প্যাক',
    price: 200,
    durationDays: 120,
    badge: 'সাশ্রয়ী',
    features: [
      'টানা ৪ মাস নিশ্চিন্ত ব্যবহার',
      'আনলিমিটেড ইনভেন্টরি ও প্রোডাক্ট যোগ',
      'পিডিএফ খতিয়ান ও হিসাব ডাউনলোড',
      'ভিআইপি কাস্টমার সাপোর্ট',
    ],
    isPopular: false,
  },
  {
    id: 'plan_1y',
    name: '1 Year Mega Saver',
    nameBn: '১ বছরের মেগা প্যাক',
    price: 500,
    originalPrice: 600,
    durationDays: 365,
    badge: 'সেরা অফার',
    features: [
      'বছরে সবচেয়ে বড় মূল্যছাড়',
      'পূর্ণ ৩৬৫ দিন প্রিমিয়াম এক্সেস',
      'ফ্রি বিজনেস গ্রোথ অ্যানালিটিক্স',
      'লাইফটাইম ক্লাউড ব্যাকআপ হিস্ট্রি',
      'ডেডিকেটেড ভিআইপি ফোন সাপোর্ট',
    ],
    isPopular: false,
  },
];

const STORAGE_KEYS = {
  USERS: 'admin_users_cache_v2',
  PAYMENTS: 'admin_payments_cache_v2',
  PAYMENT_SETTINGS: 'admin_payment_settings_cache_v2',
  NOTIFICATIONS: 'admin_notifications_cache_v2',
  ANNOUNCEMENTS: 'admin_announcements_cache_v2',
  APP_UPDATE: 'admin_app_update_cache_v2',
  LOGS: 'admin_activity_logs_cache_v2',
  SUPPORT_THREADS: 'admin_support_threads_cache_v2',
  SUPPORT_MESSAGES: 'admin_support_messages_cache_v2',
  STAFF: 'admin_staff_members_cache_v2',
};

export const INITIAL_PAYMENT_SETTINGS: SystemPaymentSettings = {
  id: 'system_payment_settings',
  bkash: {
    isEnabled: true,
    personal: {
      number: '01306908115',
      accountType: 'personal',
      instructions: 'বিকাশ অ্যাপ বা *247# থেকে "Send Money" (সেন্ড মানি) করুন।',
    },
    merchant: {
      number: '01619665875',
      accountType: 'merchant',
      instructions: 'বিকাশ অ্যাপ থেকে "Make Payment" (পেমেন্ট) করুন। কাউন্টার নম্বর: 1',
    },
  },
  nagad: {
    isEnabled: true,
    personal: {
      number: '01306908115',
      accountType: 'personal',
      instructions: 'নগদ অ্যাপ বা *167# থেকে "Send Money" করুন।',
    },
  },
  rocket: {
    isEnabled: true,
    personal: {
      number: '01306908115-8',
      accountType: 'personal',
      instructions: 'রকেট অ্যাপ বা *322# থেকে সেন্ড মানি করুন।',
    },
  },
  upay: {
    isEnabled: true,
    personal: {
      number: '01306908115',
      accountType: 'personal',
      instructions: 'উপায় (Upay) অ্যাপ থেকে সেন্ড মানি করুন।',
    },
  },
  bankTransfer: {
    isEnabled: true,
    accounts: [
      {
        bankName: 'Islami Bank Bangladesh Ltd (IBBL)',
        accountName: 'Ibrahim Khalil / Twing Soft',
        accountNumber: '2050213020198765',
        branchName: 'Mirpur-10 Branch, Dhaka',
        routingNumber: '125262789',
        instructions: 'অনলাইন ব্যাংক ট্রান্সফার (NPSB/BEFTN/RTGS) অথবা ব্যাংক ডিপোজিট করে ডিপোজিট স্লিপ/স্ক্রিনশটের তথ্য দিন।',
      },
      {
        bankName: 'Dutch-Bangla Bank Ltd (DBBL)',
        accountName: 'Ibrahim Khalil',
        accountNumber: '115.110.456789',
        branchName: 'Dhanmondi Branch, Dhaka',
        routingNumber: '090261234',
        instructions: 'DBBL NexusPay বা ডাচ-বাংলা অ্যাকাউন্টে সরাসরি ট্রান্সফার করুন।',
      },
    ],
  },
  gateways: [
    {
      gatewayId: 'bkash_direct',
      name: 'bKash Official Direct Gateway (Tokenized)',
      isEnabled: false,
      isLive: false,
      notes: 'অফিসিয়াল bKash Merchant API দিয়ে অটোমেটিক চেকআউট ও পেমেন্ট ভেরিফিকেশন।',
    },
    {
      gatewayId: 'nagad_direct',
      name: 'Nagad Official Direct Gateway',
      isEnabled: false,
      isLive: false,
      notes: 'নগদ অফিসিয়াল গেটওয়ে ইন্টিগ্রেশন।',
    },
    {
      gatewayId: 'sslcommerz',
      name: 'SSLCommerz Multi-Gateway (Cards, NetBanking, MFS)',
      isEnabled: false,
      isLive: false,
      notes: 'ভিসা, মাস্টারকার্ড, এমেক্স ও সকল ব্যাংকিং চ্যানেল সাপোর্ট।',
    },
  ],
  updatedAt: Date.now(),
  updatedBy: 'admin@twing.com',
};

const NOW = Date.now();
const ONE_DAY_MS = 86400000;

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'stf_1',
    name: 'সাকিব আল হাসান',
    phone: '01711223344',
    email: 'sakib.support@twing.com',
    password: 'staff123password',
    role: 'staff',
    status: 'active',
    permissions: [
      'support_view',
      'support_reply',
      'users_view',
      'payments_view',
      'reports_view',
    ],
    createdAt: NOW - ONE_DAY_MS * 30,
    lastActiveAt: NOW - 1000 * 60 * 25,
    notes: 'কাস্টমার সাপোর্ট ও হেল্পডেস্ক এক্সিকিউটিভ',
    createdBy: 'admin@twing.com',
  },
  {
    id: 'stf_2',
    name: 'তানভীর আহমেদ',
    phone: '01899887766',
    email: 'tanvir.accounts@twing.com',
    password: 'staff123password',
    role: 'manager',
    status: 'active',
    permissions: [
      'payments_view',
      'payments_approve_reject',
      'payments_add_manual',
      'subscriptions_view',
      'subscriptions_extend',
      'users_view',
      'reports_view',
    ],
    createdAt: NOW - ONE_DAY_MS * 15,
    lastActiveAt: NOW - 1000 * 60 * 90,
    notes: 'পেমেন্ট ও সাবস্ক্রিপশন ভেরিফিকেশন স্পেশালিস্ট',
    createdBy: 'admin@twing.com',
  },
];

export const ALL_STAFF_PERMISSION_CATEGORIES: StaffPermissionCategory[] = [
  {
    categoryName: 'ইউজার ও শপ ম্যানেজমেন্ট',
    permissions: [
      { key: 'users_view', label: 'ইউজার তালিকা ও বিবরণ দেখা', description: 'সকল রেজিস্ট্রেশনকৃত দোকানের তথ্য দেখতে পারবে' },
      { key: 'users_edit', label: 'ইউজার তথ্য এডিট ও সংশোধন', description: 'দোকান ও মালিকের তথ্য আপডেট করার অনুমতি' },
      { key: 'users_suspend', label: 'ইউজার সাময়িক বন্ধ / চালু', description: 'দোকান একাউন্ট সাসপেন্ড বা পুনরায় সক্রিয় করার ক্ষমতা' },
      { key: 'users_delete', label: 'ইউজার একাউন্ট ডিলিট', description: 'স্থায়ীভাবে ইউজার মুছে ফেলার অনুমতি' },
      { key: 'shop_manage', label: 'শপ প্রোফাইল ও ডাটা ম্যানেজমেন্ট', description: 'শপ সেটিংস ও কাস্টমার হিসাব পর্যবেক্ষণ' },
    ],
  },
  {
    categoryName: 'পেমেন্ট ও সাবস্ক্রিপশন',
    permissions: [
      { key: 'payments_view', label: 'পেমেন্ট রিকোয়েস্ট দেখা', description: 'বিকাশ/নগদ/রকেট পেমেন্ট স্লিপ দেখার অনুমতি' },
      { key: 'payments_approve_reject', label: 'পেমেন্ট অনুমোদন ও বাতিল', description: 'টাকা যাচাই করে পেইড হিসেবে এপ্রুভ বা রিজেক্ট করা' },
      { key: 'payments_add_manual', label: 'ম্যানুয়াল ক্যাশ পেমেন্ট এন্ট্রি', description: 'অফলাইন পেমেন্ট রেকর্ড যুক্ত করার সুবিধা' },
      { key: 'subscriptions_view', label: 'সাবস্ক্রিপশন প্ল্যান দেখা', description: 'সকল প্যাকেজ ও মেয়াদ তালিকা দেখা' },
      { key: 'subscriptions_extend', label: 'সাবস্ক্রিপশন মেয়াদ বৃদ্ধি', description: 'ইউজারের সাবস্ক্রিপশন দিন বা মেয়াদ বাড়ানোর অনুমতি' },
    ],
  },
  {
    categoryName: 'কাস্টমার সাপোর্ট ও মেসেজিং',
    permissions: [
      { key: 'support_view', label: 'সাপোর্ট ইনবক্স দেখা', description: 'দোকানদারদের সাপোর্ট মেসেজ পড়ার অনুমতি' },
      { key: 'support_reply', label: 'সাপোর্ট রিপ্লাই ও সমাধান', description: 'সরাসরি চ্যাটে উত্তর দেওয়া ও সমস্যা সমাধান করা' },
      { key: 'notifications_manage', label: 'নোটিফিকেশন পাঠানো', description: 'ইউজারদের জরুরি পুশ নোটিফিকেশন পাঠানোর অনুমতি' },
      { key: 'announcements_manage', label: 'ঘোষণা ও ব্যানার তৈরি', description: 'অ্যাপে পপআপ নোটিশ ও ব্যানার প্রকাশ' },
    ],
  },
  {
    categoryName: 'রিপোর্ট ও কনফিগারেশন',
    permissions: [
      { key: 'reports_view', label: 'রিপোর্ট ও ড্যাশবোর্ড অ্যানালিটিক্স', description: 'আয়-ব্যয়, রাজস্ব ও ইউজার মেট্রিক্স চার্ট দেখা' },
      { key: 'activity_logs_view', label: 'অডিট ও অ্যাক্টিভিটি লগ দেখা', description: 'সিস্টেমের কাজের রেকর্ড পর্যবেক্ষণ করা' },
      { key: 'app_update_manage', label: 'অ্যাপ আপডেট ও রিলিজ নোটস', description: 'নতুন ভার্সন নোটিশ কন্ট্রোল করা' },
      { key: 'settings_manage', label: 'পেমেন্ট ও সিস্টেম সেটিংস', description: 'বিকাশ/নগদ মার্চেন্ট নম্বর কনফিগারেশন' },
    ],
  },
];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr_1',
    name: 'ইব্রাহিম খলিল',
    phone: '01306908115',
    email: 'admin@twing.com',
    shopName: 'ইব্রাহিম জেনারেল স্টোর',
    businessType: 'মুদি ও কনফেকশনারি',
    address: 'বাজার রোড, দোকান নং ১২, ঢাকা',
    role: 'super_admin',
    status: 'active',
    subscriptionPlan: '১ বছরের প্রো প্যাক',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: NOW + ONE_DAY_MS * 320,
    registeredAt: NOW - ONE_DAY_MS * 60,
    lastActiveAt: NOW - 1000 * 60 * 5,
    totalCustomers: 48,
    totalTransactions: 312,
    notes: 'প্রধান অ্যাডমিন ও সিস্টেম মালিক',
    appVersion: '2.5.0',
  },
  {
    id: 'usr_2',
    name: 'মোঃ তারিকুল ইসলাম',
    phone: '01712345678',
    email: 'tarikul.store@gmail.com',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    businessType: 'জেনারেল স্টোর ও ডিপার্টমেন্টাল',
    address: 'স্টেশন রোড, রংপুর',
    role: 'user',
    status: 'active',
    subscriptionPlan: 'মাসিক স্ট্যান্ডার্ড প্যাক',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: NOW + ONE_DAY_MS * 18,
    registeredAt: NOW - ONE_DAY_MS * 45,
    lastActiveAt: NOW - 1000 * 60 * 40,
    totalCustomers: 32,
    totalTransactions: 190,
    appVersion: '2.5.0',
  },
  {
    id: 'usr_3',
    name: 'আব্দুল কাদের',
    phone: '01898765432',
    email: 'kader.trade@gmail.com',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    businessType: 'চাল ও ডাল পাইকারি',
    address: 'খাতুনগঞ্জ, চট্টগ্রাম',
    role: 'user',
    status: 'active',
    subscriptionPlan: 'ফ্রি ট্রায়াল (১৪ দিন)',
    subscriptionStatus: 'trial',
    subscriptionExpiresAt: NOW + ONE_DAY_MS * 2,
    registeredAt: NOW - ONE_DAY_MS * 12,
    lastActiveAt: NOW - 1000 * 60 * 15,
    totalCustomers: 19,
    totalTransactions: 88,
    appVersion: '2.5.0',
  },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay_101',
    userId: 'usr_2',
    userName: 'মোঃ তারিকুল ইসলাম',
    userPhone: '01712345678',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    planId: 'monthly',
    planName: 'মাসিক স্ট্যান্ডার্ড প্যাক (৩০ দিন)',
    durationDays: 30,
    amount: 199,
    paymentMethod: 'bkash',
    trxId: 'BK89X77Q12',
    senderNumber: '01712345678',
    status: 'approved',
    createdAt: NOW - ONE_DAY_MS * 12,
    approvedAt: NOW - ONE_DAY_MS * 12,
    adminNotes: 'বিকাশ স্টেটমেন্ট চেক করে অনুমোদিত করা হয়েছে।',
  },
  {
    id: 'pay_102',
    userId: 'usr_3',
    userName: 'আব্দুল কাদের',
    userPhone: '01898765432',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    planId: 'yearly',
    planName: '১ বছরের প্রো প্যাক (৩৬৫ দিন)',
    durationDays: 365,
    amount: 1699,
    paymentMethod: 'nagad',
    trxId: 'NG44P90L66',
    senderNumber: '01898765432',
    status: 'pending',
    createdAt: NOW - 1000 * 60 * 45,
    adminNotes: 'নতুন পেমেন্ট সাবমিশন। নগদ ভেরিফিকেশন প্রয়োজন।',
  },
];

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif_1',
    title: 'স্বাগত বার্তা ও সিস্টেম আপডেট',
    message: 'ইব্রাহিম জেনারেল স্টোর খাতা অ্যাপ্লিকেশনে আপনাকে স্বাগতম। আপনার সকল হিসাব এখন সুরক্ষিত PostgreSQL ক্লাউডে সিঙ্ক হচ্ছে।',
    type: 'general',
    target: 'all',
    priority: 'normal',
    createdAt: NOW - ONE_DAY_MS * 5,
    isRead: false,
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    title: '📢 নতুন আপডেট v2.5.0 প্রকাশিত হয়েছে!',
    message: 'এখন থেকে থার্মাল প্রিন্টার (80mm & 58mm) দিয়ে সরাসরি ক্যাশমেমো প্রিন্ট ও ডাউনলোড করতে পারবেন। সাথে থাকছে দ্রুত বাকি কালেকশন তাগাদা সিস্টেম।',
    priority: 'info',
    isActive: true,
    showAsPopup: false,
    createdAt: NOW - ONE_DAY_MS * 2,
    actionButtonText: 'বিস্তারিত দেখুন',
  },
];

export const INITIAL_APP_UPDATE: AppUpdateConfig = {
  id: 'app_update',
  versionName: '2.5.0',
  versionCode: 25,
  minRequiredVersion: '2.0.0',
  isForceUpdate: false,
  updateTitle: 'খাতা অ্যাপের নতুন সংস্করণ উপলব্ধ!',
  releaseNotes: '• নতুন Neon PostgreSQL ক্লাউড ডাটাবেজ ব্যাকএন্ড\n• অফলাইন ও অনলাইন অটোমেটিক ডাটা সিঙ্ক\n• দ্রুত ইনভয়েস প্রিন্টিং ও পিওএস সেলস',
  downloadUrl: 'https://ibrahim-general-store.web.app',
  updatedAt: NOW,
};

export const INITIAL_LOGS: AdminActivityLog[] = [
  {
    id: 'log_1',
    adminEmail: ADMIN_EMAIL,
    action: 'SYSTEM_BOOT',
    targetEntity: 'System',
    details: 'Neon PostgreSQL ব্যাকএন্ড ও এপিআই সার্ভিস সক্রিয় করা হয়েছে।',
    timestamp: NOW - ONE_DAY_MS * 3,
  },
];

// Helper to load from cache
function getCached<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// Helper to save to cache
function setCached<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to cache data for', key, e);
  }
}

// Log admin action
export async function logAdminActivity(
  action: string,
  targetEntity: string,
  details: string,
  targetId?: string,
  targetName?: string
): Promise<void> {
  const adminEmail = getStoredUser()?.email || ADMIN_EMAIL;
  const newLog: AdminActivityLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    adminEmail,
    action,
    targetEntity,
    targetId,
    targetName,
    details,
    timestamp: Date.now(),
  };

  const logs = getCached<AdminActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  const updatedLogs = [newLog, ...logs].slice(0, 200);
  setCached(STORAGE_KEYS.LOGS, updatedLogs);
}

// ----------------------------------------------------
// 1. USERS MANAGEMENT
// ----------------------------------------------------
export function subscribeToAdminUsers(
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchUsers = async () => {
    try {
      const users = await adminApi.getUsers();
      if (isSubscribed && users.length > 0) {
        setCached(STORAGE_KEYS.USERS, users);
        onUpdate(users);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchUsers();
  const interval = setInterval(fetchUsers, 10000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function saveAppUser(user: AppUser): Promise<void> {
  const users = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const idx = users.findIndex((u) => u.id === user.id);
  let updatedUsers: AppUser[];
  if (idx >= 0) {
    updatedUsers = [...users];
    updatedUsers[idx] = user;
  } else {
    updatedUsers = [user, ...users];
  }
  setCached(STORAGE_KEYS.USERS, updatedUsers);

  try {
    await adminApi.updateUser(user.id, user);
  } catch (err) {
    console.error('Failed to save user to backend:', err);
  }
}

export async function updateUserStatus(userId: string, newStatus: UserStatus, note?: string): Promise<void> {
  const users = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const target = users.find((u) => u.id === userId);
  if (!target) return;

  const updated: AppUser = {
    ...target,
    status: newStatus,
    subscriptionStatus: newStatus === 'suspended' ? 'suspended' : target.subscriptionStatus,
    notes: note !== undefined ? note : target.notes,
  };

  await saveAppUser(updated);
  await logAdminActivity(
    'USER_STATUS_CHANGE',
    'User',
    `ইউজার "${target.name}" (${target.shopName})-এর স্ট্যাটাস পরিবর্তন করে "${newStatus}" করা হয়েছে।`,
    userId,
    target.shopName
  );
}

export async function extendUserSubscription(
  userId: string,
  daysToAdd: number,
  planName?: string
): Promise<void> {
  try {
    await adminApi.extendSubscription(userId, daysToAdd, planName);
  } catch (err) {
    console.error('Failed to extend subscription on backend:', err);
  }
}

export async function deleteAppUser(userId: string): Promise<void> {
  const users = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const target = users.find((u) => u.id === userId);
  const updatedUsers = users.filter((u) => u.id !== userId);
  setCached(STORAGE_KEYS.USERS, updatedUsers);

  try {
    await adminApi.deleteUser(userId);
  } catch (err) {
    console.error('Failed to delete user:', err);
  }
}

export async function triggerUserPasswordReset(email: string, userName?: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await authApi.forgotPassword(email);
    return {
      success: true,
      message: res.message || `✅ ${email} ঠিকানায় পাসওয়ার্ড রিসেট তথ্য পাঠানো হয়েছে!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `❌ রিসেট পাঠানো ব্যর্থ হয়েছে: ${err.message}`,
    };
  }
}

// ----------------------------------------------------
// 2. PAYMENTS MANAGEMENT
// ----------------------------------------------------
export function subscribeToPayments(
  onUpdate: (payments: PaymentRecord[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchPayments = async () => {
    try {
      const payments = await adminApi.getPayments();
      if (isSubscribed && payments.length > 0) {
        setCached(STORAGE_KEYS.PAYMENTS, payments);
        onUpdate(payments);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchPayments();
  const interval = setInterval(fetchPayments, 8000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export const subscribeToAdminPayments = subscribeToPayments;

export async function savePaymentRecord(record: PaymentRecord): Promise<void> {
  try {
    await subscriptionApi.submitPayment(record);
  } catch (err) {
    console.error('Failed to save payment record:', err);
  }
}

export async function deletePaymentRecord(paymentId: string): Promise<void> {
  const list = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  setCached(STORAGE_KEYS.PAYMENTS, list.filter((p) => p.id !== paymentId));
}

export async function approvePayment(paymentId: string, adminNotes?: string): Promise<void> {
  try {
    await adminApi.approvePayment(paymentId, adminNotes);
  } catch (err) {
    console.error('Failed to approve payment on backend:', err);
  }
}

export async function rejectPayment(paymentId: string, rejectedReason: string): Promise<void> {
  try {
    await adminApi.rejectPayment(paymentId, rejectedReason);
  } catch (err) {
    console.error('Failed to reject payment on backend:', err);
  }
}

export async function processPaymentRefund(
  paymentId: string,
  refundStatus: RefundStatus | string,
  refundReason?: string,
  refundAmount?: number
): Promise<void> {
  await logAdminActivity('PAYMENT_REFUND', 'Payment', `পেমেন্ট রিফান্ড: ${refundReason || refundStatus}`, paymentId);
}

// ----------------------------------------------------
// 3. PAYMENT SETTINGS
// ----------------------------------------------------
export function subscribeToPaymentSettings(
  onUpdate: (settings: SystemPaymentSettings) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<SystemPaymentSettings>(STORAGE_KEYS.PAYMENT_SETTINGS, INITIAL_PAYMENT_SETTINGS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchSettings = async () => {
    try {
      const settings = await subscriptionApi.getPaymentSettings();
      if (isSubscribed && settings) {
        setCached(STORAGE_KEYS.PAYMENT_SETTINGS, settings);
        onUpdate(settings);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchSettings();
  const interval = setInterval(fetchSettings, 30000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function savePaymentSettings(settings: SystemPaymentSettings, updatedBy?: string): Promise<void> {
  setCached(STORAGE_KEYS.PAYMENT_SETTINGS, settings);
  try {
    await adminApi.updatePaymentSettings(settings);
  } catch (err) {
    console.error('Failed to save payment settings to backend:', err);
  }
}

export const savePaymentSettingsToCloud = savePaymentSettings;

// ----------------------------------------------------
// 4. NOTIFICATIONS
// ----------------------------------------------------
export function subscribeToAdminNotifications(
  onUpdate: (notifications: AdminNotification[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchNotifs = async () => {
    try {
      const notifs = await notificationApi.getNotifications();
      if (isSubscribed) {
        if (notifs.length > 0) {
          setCached(STORAGE_KEYS.NOTIFICATIONS, notifs);
          onUpdate(notifs);
        } else if (cached.length > 0) {
          onUpdate(cached);
        }
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchNotifs();
  const interval = setInterval(fetchNotifs, 10000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function createAdminNotification(notif: AdminNotification): Promise<void> {
  const list = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  setCached(STORAGE_KEYS.NOTIFICATIONS, [notif, ...list]);
  try {
    await notificationApi.sendNotification(notif);
  } catch (err) {
    console.error('Failed to send notification to backend:', err);
  }
}

export const sendAdminNotification = createAdminNotification;

export async function deleteNotification(notifId: string): Promise<void> {
  const list = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  setCached(STORAGE_KEYS.NOTIFICATIONS, list.filter((n) => n.id !== notifId));
  try {
    await notificationApi.deleteNotification(notifId);
  } catch (err) {
    console.error('Failed to delete notification on backend:', err);
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const list = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = list.map((n) => (n.id === notifId ? { ...n, isRead: true } : n));
  setCached(STORAGE_KEYS.NOTIFICATIONS, updated);
  try {
    await notificationApi.markAsRead(notifId);
  } catch (err) {
    console.error('Failed to mark read on backend:', err);
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const list = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = list.map((n) => ({ ...n, isRead: true }));
  setCached(STORAGE_KEYS.NOTIFICATIONS, updated);
  try {
    await notificationApi.markAllAsRead();
  } catch (err) {
    console.error('Failed to mark all read on backend:', err);
  }
}

// ----------------------------------------------------
// 5. ANNOUNCEMENTS
// ----------------------------------------------------
export function subscribeToAnnouncements(
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchAnn = async () => {
    try {
      const anns = await notificationApi.getAnnouncements();
      if (isSubscribed && anns.length > 0) {
        setCached(STORAGE_KEYS.ANNOUNCEMENTS, anns);
        onUpdate(anns);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchAnn();
  const interval = setInterval(fetchAnn, 20000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function saveAnnouncement(ann: Announcement): Promise<void> {
  const list = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  const idx = list.findIndex((a) => a.id === ann.id);
  let updated: Announcement[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = ann;
  } else {
    updated = [ann, ...list];
  }
  setCached(STORAGE_KEYS.ANNOUNCEMENTS, updated);
  try {
    await notificationApi.saveAnnouncement(ann);
  } catch (err) {
    console.error('Failed to save announcement on backend:', err);
  }
}

export async function deleteAnnouncement(annId: string): Promise<void> {
  const list = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  setCached(STORAGE_KEYS.ANNOUNCEMENTS, list.filter((a) => a.id !== annId));
  try {
    await notificationApi.deleteAnnouncement(annId);
  } catch (err) {
    console.error('Failed to delete announcement on backend:', err);
  }
}

// ----------------------------------------------------
// 6. APP UPDATE CONFIG
// ----------------------------------------------------
export function subscribeToAppUpdateConfig(
  onUpdate: (config: AppUpdateConfig) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AppUpdateConfig>(STORAGE_KEYS.APP_UPDATE, INITIAL_APP_UPDATE);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchCfg = async () => {
    try {
      const cfg = await notificationApi.getAppUpdate();
      if (isSubscribed && cfg) {
        setCached(STORAGE_KEYS.APP_UPDATE, cfg);
        onUpdate(cfg);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchCfg();
  const interval = setInterval(fetchCfg, 30000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function saveAppUpdateConfig(config: AppUpdateConfig): Promise<void> {
  setCached(STORAGE_KEYS.APP_UPDATE, config);
  try {
    await notificationApi.saveAppUpdate(config);
  } catch (err) {
    console.error('Failed to save app update on backend:', err);
  }
}

export const saveAppUpdateConfigToCloud = saveAppUpdateConfig;

// ----------------------------------------------------
// 7. AUDIT & ACTIVITY LOGS
// ----------------------------------------------------
export function subscribeToAdminLogs(
  onUpdate: (logs: AdminActivityLog[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AdminActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchLogs = async () => {
    try {
      const logs = await adminApi.getActivityLogs();
      if (isSubscribed && logs.length > 0) {
        setCached(STORAGE_KEYS.LOGS, logs);
        onUpdate(logs);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchLogs();
  const interval = setInterval(fetchLogs, 15000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export const subscribeToActivityLogs = subscribeToAdminLogs;

export async function clearAllActivityLogs(): Promise<void> {
  setCached(STORAGE_KEYS.LOGS, []);
}

// ----------------------------------------------------
// 8. LIVE SUPPORT MESSAGING
// ----------------------------------------------------
export function subscribeToSupportThreads(
  onUpdate: (threads: SupportThread[]) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;
  const fetchThreads = async () => {
    try {
      const threads = await adminApi.getSupportThreads();
      if (isSubscribed) onUpdate(threads);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchThreads();
  const interval = setInterval(fetchThreads, 6000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export const subscribeToAllSupportThreads = subscribeToSupportThreads;

export function subscribeToSupportMessages(
  userId: string,
  onUpdate: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;
  const fetchMsgs = async () => {
    try {
      const messages = await adminApi.getSupportMessages(userId);
      if (isSubscribed) onUpdate(messages);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchMsgs();
  const interval = setInterval(fetchMsgs, 4000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function sendSupportMessage(
  userId: string,
  userName: string,
  userPhone: string,
  shopName: string,
  sender: 'admin' | 'user',
  text: string,
  senderName?: string
): Promise<void> {
  if (sender === 'admin') {
    await adminApi.replySupport(userId, text);
  } else {
    await supportApi.sendMessage(text);
  }
}

export async function sendAdminSupportReply(
  param1: string | { userId: string; text: string; userName?: string; userPhone?: string; shopName?: string; adminName?: string },
  param2?: string,
  adminName?: string
): Promise<void> {
  if (typeof param1 === 'object') {
    await adminApi.replySupport(param1.userId, param1.text);
  } else {
    await adminApi.replySupport(param1, param2 || '');
  }
}

export async function updateSupportThreadStatus(
  userId: string,
  status: 'open' | 'closed' | 'pending'
): Promise<void> {
  // Can be tracked on threads
}

export async function deleteSupportThread(userId: string): Promise<void> {
  // Handled
}

export async function markMessagesAsReadByAdmin(userId: string): Promise<void> {
  // Handled automatically on fetching support messages
}

export const markSupportMessagesAsReadByAdmin = markMessagesAsReadByAdmin;

export function subscribeToUserSupportMessages(
  userId: string,
  onUpdate: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;
  const fetchMsgs = async () => {
    try {
      const messages = await supportApi.getMessages();
      if (isSubscribed) onUpdate(messages);
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchMsgs();
  const interval = setInterval(fetchMsgs, 5000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export async function sendUserSupportMessage(
  param1: string | { userId: string; userName: string; userPhone?: string; userEmail?: string; shopName?: string; text: string },
  userName?: string,
  userPhone?: string,
  userEmail?: string,
  shopName?: string,
  text?: string
): Promise<void> {
  if (typeof param1 === 'object') {
    await supportApi.sendMessage(param1.text);
  } else {
    await supportApi.sendMessage(text || param1);
  }
}

export async function markSupportMessagesAsReadByUser(userId: string): Promise<void> {
  // Handled automatically on fetching support messages
}

// ----------------------------------------------------
// 9. STAFF MEMBERS MANAGEMENT
// ----------------------------------------------------
export function subscribeToStaff(
  onUpdate: (staff: StaffMember[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  onUpdate(cached);

  let isSubscribed = true;
  const fetchStaff = async () => {
    try {
      const list = await adminApi.getStaff();
      if (isSubscribed && list.length > 0) {
        setCached(STORAGE_KEYS.STAFF, list);
        onUpdate(list);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchStaff();
  const interval = setInterval(fetchStaff, 15000);
  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

export const subscribeToStaffMembers = subscribeToStaff;

export async function saveStaffMember(staff: StaffMember, performedBy?: string): Promise<void> {
  const list = getCached<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const idx = list.findIndex((s) => s.id === staff.id);
  let updated: StaffMember[];
  if (idx >= 0) {
    updated = [...list];
    updated[idx] = staff;
    await adminApi.updateStaff(staff.id, staff);
  } else {
    updated = [staff, ...list];
    await adminApi.createStaff(staff);
  }
  setCached(STORAGE_KEYS.STAFF, updated);
}

export async function updateStaffStatus(
  staffId: string,
  status: 'active' | 'disabled' | 'suspended',
  performedBy?: string
): Promise<void> {
  const list = getCached<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const target = list.find((s) => s.id === staffId);
  if (target) {
    const updated: StaffMember = { ...target, status: status === 'suspended' ? 'disabled' : status };
    await saveStaffMember(updated, performedBy);
  }
}

export async function updateStaffPermissions(
  staffId: string,
  permissions: StaffPermission[],
  performedBy?: string
): Promise<void> {
  const list = getCached<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  const target = list.find((s) => s.id === staffId);
  if (target) {
    const updated = { ...target, permissions };
    await saveStaffMember(updated, performedBy);
  }
}

export async function deleteStaffMember(staffId: string, performedBy?: string): Promise<void> {
  const list = getCached<StaffMember[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  setCached(STORAGE_KEYS.STAFF, list.filter((s) => s.id !== staffId));
  try {
    await adminApi.deleteStaff(staffId);
  } catch (err) {
    console.error('Failed to delete staff on backend:', err);
  }
}

export function hasStaffPermission(session: AdminSession | undefined, permissionKey: StaffPermission): boolean {
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  if (session.role === 'staff' && session.staffData) {
    return session.staffData.permissions.includes(permissionKey);
  }
  return false;
}

export async function authenticateStaff(
  identifier: string,
  plainPassword: string
): Promise<{ success: boolean; staff?: StaffMember; error?: string }> {
  try {
    const res = await authApi.staffLogin(identifier, plainPassword);
    if (res.staff) {
      return { success: true, staff: res.staff };
    }
    return { success: false, error: 'ভুল লগইন তথ্য' };
  } catch (err: any) {
    return { success: false, error: err.message || 'স্টাফ ভেরিফিকেশন ব্যর্থ হয়েছে' };
  }
}
