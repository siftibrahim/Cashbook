import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  AppUser,
  PaymentRecord,
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
} from '../types/adminTypes';

export const ADMIN_EMAIL = 'siftibrahim@gmail.com';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    nameBn: 'ফ্রি ট্রায়াল (১৪ দিন)',
    price: 0,
    durationDays: 14,
    features: [
      'সর্বোচ্চ ৫০ জন কাস্টমার হিসাব',
      'দৈনিক ক্রয়-বিক্রয় ও ক্যাশবুক',
      'এসএমএস তাগাদা ও রিসিট ভিউ',
      'ক্লাউড ডাটাবেজ ব্যাকআপ',
    ],
    badge: 'ট্রায়াল',
  },
  {
    id: 'monthly',
    name: 'Monthly Standard',
    nameBn: 'মাসিক স্ট্যান্ডার্ড প্যাক',
    price: 199,
    originalPrice: 299,
    durationDays: 30,
    features: [
      'আনলিমিটেড কাস্টমার ও বাকি খাতা',
      'দ্রুত পিওএস (POS) প্রিন্ট ও ইনভয়েস',
      'প্রোডাক্ট স্টক ইনভেন্টরি ম্যানেজমেন্ট',
      'অটোমেটিক ক্লাউড সিঙ্ক ও ব্যাকআপ',
      '২৪/৭ কাস্টমার সাপোর্ট',
    ],
    badge: 'জনপ্রিয়',
    isPopular: true,
  },
  {
    id: 'half_yearly',
    name: '6 Months Saver',
    nameBn: '৬ মাসের সেভার প্যাক',
    price: 999,
    originalPrice: 1299,
    durationDays: 180,
    features: [
      'সব মাসিক ফিচার অন্তর্ভুক্ত',
      'আনলিমিটেড ডিভাইস এক্সেস',
      'এডভান্সড সেলস অ্যানালিটিক্স',
      'প্রাইওরিটি ফোন সাপোর্ট',
    ],
    badge: 'সাশ্রয়ী',
  },
  {
    id: 'yearly',
    name: 'Yearly Pro',
    nameBn: '১ বছরের প্রো প্যাক',
    price: 1699,
    originalPrice: 2499,
    durationDays: 365,
    features: [
      'সকল ফিচার আজীবন আপডেট',
      'বিশেষ বিজনেস ইনসাইট রিপোর্ট',
      'ফ্রি থার্মাল প্রিন্টার সেটআপ সাপোর্ট',
      'ডেডিকেটেড ভিআইপি সাপোর্ট',
    ],
    badge: 'সেরা অফার',
  },
  {
    id: 'lifetime',
    name: 'Lifetime Enterprise',
    nameBn: 'আজীবন লাইফটাইম প্যাক',
    price: 4999,
    originalPrice: 7999,
    durationDays: 3650, // 10 years
    features: [
      'কোনো মাসিক বা বাৎসরিক ফি নেই',
      'আনলিমিটেড শপ ও ইউজার এক্সেস',
      'কাস্টম ব্র্যান্ডিং ও ফিচার রিকোয়েস্ট',
      'আজীবন প্রিমিয়াম ক্লাউড ব্যাকআপ',
    ],
    badge: 'লাইফটাইম',
  },
];

const STORAGE_KEYS = {
  USERS: 'admin_users_cache_v2',
  PAYMENTS: 'admin_payments_cache_v2',
  NOTIFICATIONS: 'admin_notifications_cache_v2',
  ANNOUNCEMENTS: 'admin_announcements_cache_v2',
  APP_UPDATE: 'admin_app_update_cache_v2',
  LOGS: 'admin_activity_logs_cache_v2',
  SUPPORT_THREADS: 'admin_support_threads_cache_v2',
  SUPPORT_MESSAGES: 'admin_support_messages_cache_v2',
};

const NOW = Date.now();
const ONE_DAY_MS = 86400000;

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr_1',
    name: 'ইব্রাহিম খলিল',
    phone: '01306908115',
    email: 'siftibrahim@gmail.com',
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
    appVersion: '2.4.0',
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
    appVersion: '2.4.0',
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
    subscriptionStatus: 'expiring_soon',
    subscriptionExpiresAt: NOW + ONE_DAY_MS * 2,
    registeredAt: NOW - ONE_DAY_MS * 12,
    lastActiveAt: NOW - ONE_DAY_MS * 1,
    totalCustomers: 19,
    totalTransactions: 84,
    notes: 'মেয়াদ শেষ হওয়ার পথে, রিনিউ নোটিশ পাঠানো হয়েছে',
    appVersion: '2.3.9',
  },
  {
    id: 'usr_4',
    name: 'মোঃ শফিকুল আলম',
    phone: '01911223344',
    email: 'shafiq.pharma@gmail.com',
    shopName: 'জনসেবা ফার্মেসি',
    businessType: 'ঔষধ ও ফার্মেসি',
    address: 'হাসপাতাল মোড়, বগুড়া',
    role: 'user',
    status: 'expired',
    subscriptionPlan: 'মাসিক স্ট্যান্ডার্ড প্যাক',
    subscriptionStatus: 'expired',
    subscriptionExpiresAt: NOW - ONE_DAY_MS * 4,
    registeredAt: NOW - ONE_DAY_MS * 80,
    lastActiveAt: NOW - ONE_DAY_MS * 5,
    totalCustomers: 65,
    totalTransactions: 420,
    notes: 'সাবস্ক্রিপশনের মেয়াদ উত্তীর্ণ হয়েছে। পেমেন্টের অপেক্ষায়।',
    appVersion: '2.3.8',
  },
  {
    id: 'usr_5',
    name: 'ফারুক হোসেন',
    phone: '01655667788',
    email: 'faruk.textiles@gmail.com',
    shopName: 'ফারুক ক্লথ স্টোর',
    businessType: 'বস্ত্রালয় ও গার্মেন্টস',
    address: 'ইসলামপুর মার্কেট, ঢাকা',
    role: 'user',
    status: 'suspended',
    subscriptionPlan: 'ফ্রি ট্রায়াল (১৪ দিন)',
    subscriptionStatus: 'suspended',
    subscriptionExpiresAt: NOW - ONE_DAY_MS * 15,
    registeredAt: NOW - ONE_DAY_MS * 90,
    lastActiveAt: NOW - ONE_DAY_MS * 20,
    totalCustomers: 8,
    totalTransactions: 22,
    notes: 'অস্বাভাবিক অ্যাক্টিভিটির কারণে অ্যাডমিন কর্তৃক সাময়িক স্থগিত',
    appVersion: '2.2.0',
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
  {
    id: 'pay_103',
    userId: 'usr_4',
    userName: 'মোঃ শফিকুল আলম',
    userPhone: '01911223344',
    shopName: 'জনসেবা ফার্মেসি',
    planId: 'monthly',
    planName: 'মাসিক স্ট্যান্ডার্ড প্যাক (৩০ দিন)',
    durationDays: 30,
    amount: 199,
    paymentMethod: 'rocket',
    trxId: 'RC999FAKE0',
    senderNumber: '01911223344',
    status: 'rejected',
    createdAt: NOW - ONE_DAY_MS * 2,
    rejectedReason: 'ভুল TrxID প্রদান করা হয়েছে, অ্যাকাউন্টে টাকা ক্রেডিট হয়নি।',
  },
];

export const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif_1',
    title: 'স্বাগত বার্তা ও সিস্টেম আপডেট',
    message: 'ইব্রাহিম জেনারেল স্টোর খাতা অ্যাপ্লিকেশনে আপনাকে স্বাগতম। আপনার সকল হিসাব এখন সুরক্ষিত ক্লাউডে সিঙ্ক হচ্ছে।',
    type: 'general',
    target: 'all',
    priority: 'normal',
    createdAt: NOW - ONE_DAY_MS * 5,
    isRead: false,
  },
  {
    id: 'notif_2',
    title: 'সাবস্ক্রিপশন মেয়াদ সতর্কবার্তা',
    message: 'আপনার ফ্রি ট্রায়ালের মেয়াদ আর মাত্র ২ দিন বাকি আছে। নিরবচ্ছিন্ন সেবার জন্য এখনই প্যাকেজ রিনিউ করুন।',
    type: 'subscription_warning',
    target: 'specific',
    targetUserId: 'usr_3',
    targetUserName: 'আব্দুল কাদের',
    priority: 'high',
    createdAt: NOW - ONE_DAY_MS * 1,
    isRead: false,
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    title: '📢 নতুন আপডেট v2.4.0 প্রকাশিত হয়েছে!',
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
  versionName: '2.4.0',
  versionCode: 24,
  minRequiredVersion: '2.0.0',
  isForceUpdate: false,
  updateTitle: 'খাতা অ্যাপের নতুন সংস্করণ উপলব্ধ!',
  releaseNotes: '• নতুন অ্যাডমিন ম্যানেজমেন্ট কনসোল ও রিয়েলটাইম মনিটরিং\n• অফলাইন ও অনলাইন অটোমেটিক ডাটা সিঙ্ক\n• দ্রুত ইনভয়েস প্রিন্টিং ও পিওএস সেলস\n• পারফরম্যান্স ও সিকিউরিটি আরও বৃদ্ধি করা হয়েছে।',
  downloadUrl: 'https://ibrahim-general-store.web.app',
  updatedAt: NOW,
};

export const INITIAL_LOGS: AdminActivityLog[] = [
  {
    id: 'log_1',
    adminEmail: ADMIN_EMAIL,
    action: 'SYSTEM_BOOT',
    targetEntity: 'System',
    details: 'অ্যাডমিন ম্যানেজমেন্ট সিকিউর হাব ইনিশিয়ালাইজ করা হয়েছে।',
    timestamp: NOW - ONE_DAY_MS * 3,
  },
  {
    id: 'log_2',
    adminEmail: ADMIN_EMAIL,
    action: 'PAYMENT_APPROVED',
    targetEntity: 'Payment',
    targetId: 'pay_101',
    targetName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    details: '১৯৯ টাকার মাসিক পেমেন্ট অনুমোদন করা হয়েছে ও সাবস্ক্রিপশন ৩০ দিন বৃদ্ধি পেয়েছে।',
    timestamp: NOW - ONE_DAY_MS * 12,
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
  const adminEmail = auth.currentUser?.email || ADMIN_EMAIL;
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

  // 1. Cache
  const logs = getCached<AdminActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  const updatedLogs = [newLog, ...logs].slice(0, 200);
  setCached(STORAGE_KEYS.LOGS, updatedLogs);

  // 2. Cloud Firestore
  try {
    const docRef = doc(db, 'admin_activity_logs', newLog.id);
    await setDoc(docRef, newLog, { merge: true });
  } catch (err) {
    console.warn('Could not save activity log to cloud:', err);
  }
}

// ----------------------------------------------------
// 1. USERS MANAGEMENT
// ----------------------------------------------------
export function subscribeToAdminUsers(
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: Error) => void
) {
  // Initial fallback
  const cached = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  onUpdate(cached);

  const colRef = collection(db, 'admin_users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AppUser, 'id'>) });
        });
        list.sort((a, b) => (b.registeredAt || 0) - (a.registeredAt || 0));
        setCached(STORAGE_KEYS.USERS, list);
        onUpdate(list);
      } else {
        // Seed initial users if totally empty
        seedAdminUsers(cached);
      }
    },
    (err) => {
      console.warn('Firestore admin_users error:', err);
      if (onError) onError(err);
    }
  );
}

async function seedAdminUsers(users: AppUser[]) {
  try {
    const batch = writeBatch(db);
    users.forEach((u) => {
      const docRef = doc(db, 'admin_users', u.id);
      batch.set(docRef, u, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Failed to seed users in Firestore:', e);
  }
}

export async function saveAppUser(user: AppUser): Promise<void> {
  // Update cache
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

  // Cloud Firestore
  try {
    const docRef = doc(db, 'admin_users', user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.error('Failed to save user to cloud:', err);
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
  const users = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const target = users.find((u) => u.id === userId);
  if (!target) return;

  const currentExpiry = target.subscriptionExpiresAt > Date.now() ? target.subscriptionExpiresAt : Date.now();
  const newExpiry = currentExpiry + daysToAdd * ONE_DAY_MS;

  const updated: AppUser = {
    ...target,
    subscriptionExpiresAt: newExpiry,
    subscriptionStatus: 'active',
    status: 'active',
    subscriptionPlan: planName || target.subscriptionPlan,
  };

  await saveAppUser(updated);
  await logAdminActivity(
    'SUBSCRIPTION_EXTENDED',
    'Subscription',
    `ইউজার "${target.name}"-এর সাবস্ক্রিপশন মেয়াদ +${daysToAdd} দিন বাড়ানো হয়েছে (নতুন মেয়াদ: ${new Date(newExpiry).toLocaleDateString('bn-BD')})।`,
    userId,
    target.shopName
  );
}

export async function deleteAppUser(userId: string): Promise<void> {
  const users = getCached<AppUser[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  const target = users.find((u) => u.id === userId);
  const updatedUsers = users.filter((u) => u.id !== userId);
  setCached(STORAGE_KEYS.USERS, updatedUsers);

  try {
    const docRef = doc(db, 'admin_users', userId);
    await deleteDoc(docRef);
    if (target) {
      await logAdminActivity(
        'USER_DELETED',
        'User',
        `ইউজার "${target.name}" (${target.shopName}) স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
        userId,
        target.shopName
      );
    }
  } catch (err) {
    console.error('Failed to delete user:', err);
  }
}

export async function triggerUserPasswordReset(email: string, userName?: string): Promise<{ success: boolean; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    await logAdminActivity(
      'PASSWORD_RESET_SENT',
      'Security',
      `ইউজার "${userName || email}" (${email}) ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।`
    );
    return {
      success: true,
      message: `✅ ${email} ঠিকানায় পাসওয়ার্ড রিসেট লিংক সফলভাবে পাঠানো হয়েছে!`,
    };
  } catch (err: any) {
    console.error('Password reset email error:', err);
    return {
      success: false,
      message: `❌ রিসেট লিংক পাঠানো ব্যর্থ হয়েছে: ${err.message || 'অননুমোদিত ইমেইল'}`,
    };
  }
}

// ----------------------------------------------------
// 2. PAYMENTS MANAGEMENT
// ----------------------------------------------------
export function subscribeToAdminPayments(
  onUpdate: (payments: PaymentRecord[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  onUpdate(cached);

  const colRef = collection(db, 'admin_payments');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: PaymentRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<PaymentRecord, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCached(STORAGE_KEYS.PAYMENTS, list);
        onUpdate(list);
      } else {
        seedAdminPayments(cached);
      }
    },
    (err) => {
      console.warn('Firestore admin_payments error:', err);
      if (onError) onError(err);
    }
  );
}

async function seedAdminPayments(payments: PaymentRecord[]) {
  try {
    const batch = writeBatch(db);
    payments.forEach((p) => {
      const docRef = doc(db, 'admin_payments', p.id);
      batch.set(docRef, p, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Failed to seed payments:', e);
  }
}

export async function savePaymentRecord(payment: PaymentRecord): Promise<void> {
  const payments = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  const idx = payments.findIndex((p) => p.id === payment.id);
  let updated: PaymentRecord[];
  if (idx >= 0) {
    updated = [...payments];
    updated[idx] = payment;
  } else {
    updated = [payment, ...payments];
  }
  setCached(STORAGE_KEYS.PAYMENTS, updated);

  try {
    const docRef = doc(db, 'admin_payments', payment.id);
    await setDoc(docRef, payment, { merge: true });
  } catch (err) {
    console.error('Failed to save payment:', err);
  }
}

export async function approvePayment(paymentId: string, adminNote?: string): Promise<void> {
  const payments = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return;

  const updatedPayment: PaymentRecord = {
    ...payment,
    status: 'approved',
    approvedAt: Date.now(),
    adminNotes: adminNote || 'অ্যাডমিন কর্তৃক ভেরিফাই ও অনুমোদিত',
  };

  await savePaymentRecord(updatedPayment);

  // Automatically extend user's subscription
  if (payment.userId && payment.durationDays) {
    await extendUserSubscription(payment.userId, payment.durationDays, payment.planName);
  }

  await logAdminActivity(
    'PAYMENT_APPROVED',
    'Payment',
    `পেমেন্ট TrxID: ${payment.trxId} (টাকা: ৳${payment.amount}, মেথড: ${payment.paymentMethod}) অনুমোদিত হয়েছে।`,
    payment.id,
    payment.shopName
  );
}

export async function rejectPayment(paymentId: string, reason: string): Promise<void> {
  const payments = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return;

  const updatedPayment: PaymentRecord = {
    ...payment,
    status: 'rejected',
    rejectedReason: reason,
  };

  await savePaymentRecord(updatedPayment);
  await logAdminActivity(
    'PAYMENT_REJECTED',
    'Payment',
    `পেমেন্ট TrxID: ${payment.trxId} বাতিল করা হয়েছে। কারণ: ${reason}`,
    payment.id,
    payment.shopName
  );
}

export async function deletePaymentRecord(paymentId: string): Promise<void> {
  const payments = getCached<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  const updated = payments.filter((p) => p.id !== paymentId);
  setCached(STORAGE_KEYS.PAYMENTS, updated);

  try {
    const docRef = doc(db, 'admin_payments', paymentId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete payment doc:', err);
  }
}

// ----------------------------------------------------
// 3. NOTIFICATIONS MANAGEMENT
// ----------------------------------------------------
export function subscribeToAdminNotifications(
  onUpdate: (notifs: AdminNotification[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  onUpdate(cached);

  const colRef = collection(db, 'admin_notifications');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: AdminNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AdminNotification, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCached(STORAGE_KEYS.NOTIFICATIONS, list);
        onUpdate(list);
      } else {
        seedAdminNotifications(cached);
      }
    },
    (err) => {
      console.warn('Firestore notifications error:', err);
      if (onError) onError(err);
    }
  );
}

async function seedAdminNotifications(notifs: AdminNotification[]) {
  try {
    const batch = writeBatch(db);
    notifs.forEach((n) => {
      const docRef = doc(db, 'admin_notifications', n.id);
      batch.set(docRef, n, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Failed to seed notifications:', e);
  }
}

export async function sendAdminNotification(notif: AdminNotification): Promise<void> {
  const notifs = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = [notif, ...notifs];
  setCached(STORAGE_KEYS.NOTIFICATIONS, updated);

  try {
    const docRef = doc(db, 'admin_notifications', notif.id);
    await setDoc(docRef, notif, { merge: true });
    await logAdminActivity(
      'NOTIFICATION_SENT',
      'Notification',
      `নোটিফিকেশন পাঠানো হয়েছে: "${notif.title}" (টার্গেট: ${notif.target})`,
      notif.id
    );
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const notifs = getCached<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  const updated = notifs.filter((n) => n.id !== id);
  setCached(STORAGE_KEYS.NOTIFICATIONS, updated);

  try {
    const docRef = doc(db, 'admin_notifications', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

// ----------------------------------------------------
// 4. ANNOUNCEMENTS MANAGEMENT
// ----------------------------------------------------
export function subscribeToAnnouncements(
  onUpdate: (announcements: Announcement[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  onUpdate(cached);

  const colRef = collection(db, 'admin_announcements');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: Announcement[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Announcement, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCached(STORAGE_KEYS.ANNOUNCEMENTS, list);
        onUpdate(list);
      } else {
        seedAnnouncements(cached);
      }
    },
    (err) => {
      console.warn('Firestore announcements error:', err);
      if (onError) onError(err);
    }
  );
}

async function seedAnnouncements(announcements: Announcement[]) {
  try {
    const batch = writeBatch(db);
    announcements.forEach((a) => {
      const docRef = doc(db, 'admin_announcements', a.id);
      batch.set(docRef, a, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.warn('Failed to seed announcements:', e);
  }
}

export async function saveAnnouncement(announcement: Announcement): Promise<void> {
  const announcements = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  const idx = announcements.findIndex((a) => a.id === announcement.id);
  let updated: Announcement[];
  if (idx >= 0) {
    updated = [...announcements];
    updated[idx] = announcement;
  } else {
    updated = [announcement, ...announcements];
  }
  setCached(STORAGE_KEYS.ANNOUNCEMENTS, updated);

  try {
    const docRef = doc(db, 'admin_announcements', announcement.id);
    await setDoc(docRef, announcement, { merge: true });
    await logAdminActivity(
      'ANNOUNCEMENT_UPDATED',
      'Announcement',
      `ঘোষণা/নোটিশ আপডেট করা হয়েছে: "${announcement.title}" (সক্রিয়: ${announcement.isActive ? 'হ্যাঁ' : 'না'})`,
      announcement.id
    );
  } catch (err) {
    console.error('Failed to save announcement:', err);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const announcements = getCached<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  const updated = announcements.filter((a) => a.id !== id);
  setCached(STORAGE_KEYS.ANNOUNCEMENTS, updated);

  try {
    const docRef = doc(db, 'admin_announcements', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete announcement:', err);
  }
}

// ----------------------------------------------------
// 5. APP UPDATE MANAGEMENT
// ----------------------------------------------------
export function subscribeToAppUpdateConfig(
  onUpdate: (config: AppUpdateConfig) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AppUpdateConfig>(STORAGE_KEYS.APP_UPDATE, INITIAL_APP_UPDATE);
  onUpdate(cached);

  const docRef = doc(db, 'admin_config', 'app_update');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppUpdateConfig;
        setCached(STORAGE_KEYS.APP_UPDATE, data);
        onUpdate(data);
      } else {
        saveAppUpdateConfigToCloud(cached);
      }
    },
    (err) => {
      console.warn('Firestore app_update config error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveAppUpdateConfigToCloud(config: AppUpdateConfig): Promise<void> {
  setCached(STORAGE_KEYS.APP_UPDATE, config);
  try {
    const docRef = doc(db, 'admin_config', 'app_update');
    await setDoc(docRef, config, { merge: true });
    await logAdminActivity(
      'APP_UPDATE_CONFIG',
      'System',
      `অ্যাপ ভার্সন আপডেট কনফিগ সংরক্ষিত (v${config.versionName}, Force Update: ${config.isForceUpdate ? 'সক্রিয়' : 'বন্ধ'})`
    );
  } catch (err) {
    console.error('Failed to save app update config:', err);
  }
}

// ----------------------------------------------------
// 6. ACTIVITY LOGS
// ----------------------------------------------------
export function subscribeToActivityLogs(
  onUpdate: (logs: AdminActivityLog[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<AdminActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  onUpdate(cached);

  const colRef = collection(db, 'admin_activity_logs');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: AdminActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<AdminActivityLog, 'id'>) });
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setCached(STORAGE_KEYS.LOGS, list);
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Firestore logs error:', err);
      if (onError) onError(err);
    }
  );
}

export async function clearAllActivityLogs(): Promise<void> {
  setCached(STORAGE_KEYS.LOGS, []);
  try {
    const colRef = collection(db, 'admin_activity_logs');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
}

// ----------------------------------------------------
// 7. SIMPLE SUPPORT & DIRECT TEXT CHAT SYSTEM
// ----------------------------------------------------

export const INITIAL_SUPPORT_THREADS: SupportThread[] = [
  {
    id: 'usr_2',
    userId: 'usr_2',
    userName: 'মোঃ তারিকুল ইসলাম',
    userPhone: '01712345678',
    userEmail: 'tarikul.store@gmail.com',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    lastMessage: 'ভাইয়া, থার্মাল ব্লুটুথ প্রিন্টারের কাগজ সাইজ ৫৪ মিমি সেট করার নিয়মটি জানতে চাই।',
    lastSender: 'user',
    updatedAt: NOW - 1000 * 60 * 25,
    status: 'open',
    unreadAdminCount: 1,
    unreadUserCount: 0,
  },
  {
    id: 'usr_3',
    userId: 'usr_3',
    userName: 'আব্দুল কাদের',
    userPhone: '01898765432',
    userEmail: 'kader.trade@gmail.com',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    lastMessage: 'ধন্যবাদ ভাই, সাবস্ক্রিপশন চালু হয়েছে। অনেক ভালো সেবা!',
    lastSender: 'admin',
    updatedAt: NOW - 1000 * 60 * 180,
    status: 'closed',
    unreadAdminCount: 0,
    unreadUserCount: 0,
  },
];

export const INITIAL_SUPPORT_MESSAGES: SupportMessage[] = [
  {
    id: 'msg_sample_1',
    userId: 'usr_2',
    userName: 'মোঃ তারিকুল ইসলাম',
    userPhone: '01712345678',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    sender: 'user',
    senderName: 'মোঃ তারিকুল ইসলাম',
    text: 'আসসালামু আলাইকুম। অ্যাপে প্রিন্ট অপশনটি খুব চমৎকার।',
    createdAt: NOW - 1000 * 60 * 35,
    isReadByAdmin: true,
    isReadByUser: true,
  },
  {
    id: 'msg_sample_2',
    userId: 'usr_2',
    userName: 'মোঃ তারিকুল ইসলাম',
    userPhone: '01712345678',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    sender: 'admin',
    senderName: 'অ্যাডমিন সাপোর্ট',
    text: 'ওয়ালাইকুম আসসালাম! ধন্যবাদ। আপনার কোনো সমস্যায় আমরা সাহায্য করতে পারি কি?',
    createdAt: NOW - 1000 * 60 * 30,
    isReadByAdmin: true,
    isReadByUser: true,
  },
  {
    id: 'msg_sample_3',
    userId: 'usr_2',
    userName: 'মোঃ তারিকুল ইসলাম',
    userPhone: '01712345678',
    shopName: 'বিসমিল্লাহ ভ্যারাইটিজ স্টোর',
    sender: 'user',
    senderName: 'মোঃ তারিকুল ইসলাম',
    text: 'ভাইয়া, থার্মাল ব্লুটুথ প্রিন্টারের কাগজ সাইজ ৫৪ মিমি সেট করার নিয়মটি জানতে চাই।',
    createdAt: NOW - 1000 * 60 * 25,
    isReadByAdmin: false,
    isReadByUser: true,
  },
  {
    id: 'msg_sample_4',
    userId: 'usr_3',
    userName: 'আব্দুল কাদের',
    userPhone: '01898765432',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    sender: 'user',
    senderName: 'আব্দুল কাদের',
    text: 'আমি বিকাশে পেমেন্ট করেছি, সাবস্ক্রিপশন কবে চালু হবে?',
    createdAt: NOW - 1000 * 60 * 240,
    isReadByAdmin: true,
    isReadByUser: true,
  },
  {
    id: 'msg_sample_5',
    userId: 'usr_3',
    userName: 'আব্দুল কাদের',
    userPhone: '01898765432',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    sender: 'admin',
    senderName: 'অ্যাডমিন সাপোর্ট',
    text: 'আপনার পেমেন্ট ভেরিফাই করে সাবস্ক্রিপশন অবিলম্বে একটিভ করে দেয়া হয়েছে। ধন্যবাদ!',
    createdAt: NOW - 1000 * 60 * 200,
    isReadByAdmin: true,
    isReadByUser: true,
  },
  {
    id: 'msg_sample_6',
    userId: 'usr_3',
    userName: 'আব্দুল কাদের',
    userPhone: '01898765432',
    shopName: 'কাদের ট্রেডার্স ও পাইকারি আড়ত',
    sender: 'user',
    senderName: 'আব্দুল কাদের',
    text: 'ধন্যবাদ ভাই, সাবস্ক্রিপশন চালু হয়েছে। অনেক ভালো সেবা!',
    createdAt: NOW - 1000 * 60 * 180,
    isReadByAdmin: true,
    isReadByUser: true,
  },
];

/**
 * Subscribe to all support threads for Admin Panel
 */
export function subscribeToAllSupportThreads(
  onUpdate: (threads: SupportThread[]) => void,
  onError?: (err: Error) => void
) {
  const cached = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  onUpdate(cached);

  const colRef = collection(db, 'support_threads');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: SupportThread[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SupportThread, 'id'>) });
        });
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setCached(STORAGE_KEYS.SUPPORT_THREADS, list);
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Firestore support threads error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to user-specific support messages for User or Admin active chat
 */
export function subscribeToUserSupportMessages(
  userId: string,
  onUpdate: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void
) {
  // Load cached messages for this user
  const allCached = getCached<SupportMessage[]>(STORAGE_KEYS.SUPPORT_MESSAGES, INITIAL_SUPPORT_MESSAGES);
  const userCached = allCached.filter((m) => m.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
  onUpdate(userCached);

  const colRef = collection(db, 'support_messages');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<SupportMessage, 'id'>;
          if (data.userId === userId) {
            list.push({ id: docSnap.id, ...data });
          }
        });
        list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        // Merge into cache
        const currentAll = getCached<SupportMessage[]>(STORAGE_KEYS.SUPPORT_MESSAGES, INITIAL_SUPPORT_MESSAGES);
        const filteredOut = currentAll.filter((m) => m.userId !== userId);
        const merged = [...filteredOut, ...list];
        setCached(STORAGE_KEYS.SUPPORT_MESSAGES, merged);

        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Firestore support messages error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Send text message from User to Admin
 */
export async function sendUserSupportMessage(params: {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  shopName: string;
  text: string;
}): Promise<SupportMessage> {
  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const newMsg: SupportMessage = {
    id: msgId,
    userId: params.userId,
    userName: params.userName || 'গ্রাহক',
    userPhone: params.userPhone || '',
    shopName: params.shopName || 'দোকান',
    sender: 'user',
    senderName: params.userName || 'গ্রাহক',
    text: params.text.trim(),
    createdAt: now,
    isReadByAdmin: false,
    isReadByUser: true,
  };

  // Update local message cache
  const allMessages = getCached<SupportMessage[]>(STORAGE_KEYS.SUPPORT_MESSAGES, INITIAL_SUPPORT_MESSAGES);
  const updatedMessages = [...allMessages, newMsg];
  setCached(STORAGE_KEYS.SUPPORT_MESSAGES, updatedMessages);

  // Update local thread cache
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  const existingThreadIndex = allThreads.findIndex((t) => t.userId === params.userId);

  const updatedThread: SupportThread = {
    id: params.userId,
    userId: params.userId,
    userName: params.userName || 'গ্রাহক',
    userPhone: params.userPhone || '',
    userEmail: params.userEmail,
    shopName: params.shopName || 'দোকান',
    lastMessage: newMsg.text,
    lastSender: 'user',
    updatedAt: now,
    status: 'open',
    unreadAdminCount:
      existingThreadIndex >= 0
        ? (allThreads[existingThreadIndex].unreadAdminCount || 0) + 1
        : 1,
    unreadUserCount: 0,
  };

  let newThreadsList: SupportThread[];
  if (existingThreadIndex >= 0) {
    newThreadsList = [...allThreads];
    newThreadsList[existingThreadIndex] = updatedThread;
  } else {
    newThreadsList = [updatedThread, ...allThreads];
  }
  newThreadsList.sort((a, b) => b.updatedAt - a.updatedAt);
  setCached(STORAGE_KEYS.SUPPORT_THREADS, newThreadsList);

  // Persist to Cloud Firestore
  try {
    const msgDocRef = doc(db, 'support_messages', msgId);
    await setDoc(msgDocRef, newMsg);

    const threadDocRef = doc(db, 'support_threads', params.userId);
    await setDoc(threadDocRef, updatedThread, { merge: true });
  } catch (err) {
    console.warn('Could not write message to Firestore, cached locally:', err);
  }

  return newMsg;
}

/**
 * Send reply from Admin to User
 */
export async function sendAdminSupportReply(params: {
  userId: string;
  userName: string;
  userPhone: string;
  shopName: string;
  text: string;
  adminName?: string;
}): Promise<SupportMessage> {
  const msgId = 'msg_adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const newMsg: SupportMessage = {
    id: msgId,
    userId: params.userId,
    userName: params.userName || 'গ্রাহক',
    userPhone: params.userPhone || '',
    shopName: params.shopName || 'দোকান',
    sender: 'admin',
    senderName: params.adminName || 'অ্যাডমিন সাপোর্ট',
    text: params.text.trim(),
    createdAt: now,
    isReadByAdmin: true,
    isReadByUser: false,
  };

  // Update local message cache
  const allMessages = getCached<SupportMessage[]>(STORAGE_KEYS.SUPPORT_MESSAGES, INITIAL_SUPPORT_MESSAGES);
  const updatedMessages = [...allMessages, newMsg];
  setCached(STORAGE_KEYS.SUPPORT_MESSAGES, updatedMessages);

  // Update local thread cache
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  const existingThreadIndex = allThreads.findIndex((t) => t.userId === params.userId);

  const updatedThread: SupportThread = {
    id: params.userId,
    userId: params.userId,
    userName: params.userName,
    userPhone: params.userPhone,
    shopName: params.shopName,
    lastMessage: newMsg.text,
    lastSender: 'admin',
    updatedAt: now,
    status: 'open',
    unreadAdminCount: 0,
    unreadUserCount:
      existingThreadIndex >= 0
        ? (allThreads[existingThreadIndex].unreadUserCount || 0) + 1
        : 1,
  };

  let newThreadsList: SupportThread[];
  if (existingThreadIndex >= 0) {
    newThreadsList = [...allThreads];
    newThreadsList[existingThreadIndex] = updatedThread;
  } else {
    newThreadsList = [updatedThread, ...allThreads];
  }
  newThreadsList.sort((a, b) => b.updatedAt - a.updatedAt);
  setCached(STORAGE_KEYS.SUPPORT_THREADS, newThreadsList);

  // Persist to Cloud Firestore & Audit log
  try {
    const msgDocRef = doc(db, 'support_messages', msgId);
    await setDoc(msgDocRef, newMsg);

    const threadDocRef = doc(db, 'support_threads', params.userId);
    await setDoc(threadDocRef, updatedThread, { merge: true });

    await logAdminActivity(
      'SUPPORT_REPLY',
      'Support',
      `ইউজার ${params.userName} (${params.shopName})-কে সাপোর্ট মেসেজের উত্তর পাঠানো হয়েছে`
    );
  } catch (err) {
    console.warn('Could not write admin reply to Firestore, cached locally:', err);
  }

  return newMsg;
}

/**
 * Close or Reopen a Support conversation
 */
export async function updateSupportThreadStatus(
  userId: string,
  status: 'open' | 'closed'
): Promise<void> {
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  const updatedThreads = allThreads.map((t) => {
    if (t.userId === userId) {
      return { ...t, status, updatedAt: Date.now() };
    }
    return t;
  });
  setCached(STORAGE_KEYS.SUPPORT_THREADS, updatedThreads);

  try {
    const threadDocRef = doc(db, 'support_threads', userId);
    await setDoc(threadDocRef, { status, updatedAt: Date.now() }, { merge: true });

    await logAdminActivity(
      status === 'closed' ? 'SUPPORT_CLOSED' : 'SUPPORT_REOPENED',
      'Support',
      `সাপোর্ট কনভারসেশন (${userId}) ${status === 'closed' ? 'ক্লোজ / সম্পন্ন' : 'পুনরায় ওপেন'} করা হয়েছে`
    );
  } catch (err) {
    console.warn('Failed to update thread status in Firestore:', err);
  }
}

/**
 * Mark messages as read by Admin
 */
export async function markSupportMessagesAsReadByAdmin(userId: string): Promise<void> {
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  const updatedThreads = allThreads.map((t) => {
    if (t.userId === userId) {
      return { ...t, unreadAdminCount: 0 };
    }
    return t;
  });
  setCached(STORAGE_KEYS.SUPPORT_THREADS, updatedThreads);

  try {
    const threadDocRef = doc(db, 'support_threads', userId);
    await setDoc(threadDocRef, { unreadAdminCount: 0 }, { merge: true });
  } catch (err) {
    // silently catch
  }
}

/**
 * Mark messages as read by User
 */
export async function markSupportMessagesAsReadByUser(userId: string): Promise<void> {
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  const updatedThreads = allThreads.map((t) => {
    if (t.userId === userId) {
      return { ...t, unreadUserCount: 0 };
    }
    return t;
  });
  setCached(STORAGE_KEYS.SUPPORT_THREADS, updatedThreads);

  try {
    const threadDocRef = doc(db, 'support_threads', userId);
    await setDoc(threadDocRef, { unreadUserCount: 0 }, { merge: true });
  } catch (err) {
    // silently catch
  }
}

/**
 * Delete support conversation and messages
 */
export async function deleteSupportThread(userId: string): Promise<void> {
  const allThreads = getCached<SupportThread[]>(STORAGE_KEYS.SUPPORT_THREADS, INITIAL_SUPPORT_THREADS);
  setCached(
    STORAGE_KEYS.SUPPORT_THREADS,
    allThreads.filter((t) => t.userId !== userId)
  );

  const allMessages = getCached<SupportMessage[]>(STORAGE_KEYS.SUPPORT_MESSAGES, INITIAL_SUPPORT_MESSAGES);
  setCached(
    STORAGE_KEYS.SUPPORT_MESSAGES,
    allMessages.filter((m) => m.userId !== userId)
  );

  try {
    await deleteDoc(doc(db, 'support_threads', userId));
    const colRef = collection(db, 'support_messages');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.userId === userId) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();

    await logAdminActivity(
      'SUPPORT_DELETED',
      'Support',
      `ইউজারের (${userId}) সাপোর্ট চ্যাট হিস্টোরি সম্পূর্ণ মুছে ফেলা হয়েছে`
    );
  } catch (err) {
    console.warn('Failed to delete support thread from Firestore:', err);
  }
}

