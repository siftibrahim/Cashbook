export type UserRole = 'super_admin' | 'admin' | 'manager' | 'user';
export type UserStatus = 'active' | 'expired' | 'suspended' | 'pending';
export type SubStatus = 'trial' | 'active' | 'expiring_soon' | 'expired' | 'suspended';

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  shopName: string;
  businessType: string;
  address: string;
  role: UserRole;
  status: UserStatus;
  subscriptionPlan: string;
  subscriptionStatus: SubStatus;
  subscriptionExpiresAt: number; // Unix timestamp in ms
  registeredAt: number;
  lastActiveAt: number;
  totalCustomers: number;
  totalTransactions: number;
  smsBalance?: number;
  notes?: string;
  deviceInfo?: string;
  appVersion?: string;
  isOnlineStoreAllowed?: boolean;
  onlineStoreStatus?: 'active' | 'disabled' | 'requested';
  onlineStoreRequestedAt?: number;
  onlineStoreNote?: string;
  storeSlug?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameBn: string;
  price: number;
  originalPrice?: number;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
  isEnabled?: boolean;
  badge?: string;
}

export type AdminPaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bangla_qr' | 'bank' | 'sslcommerz' | 'card' | 'cash' | 'paymently' | 'other';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'failed' | 'refunded';
export type RefundStatus = 'none' | 'refund_pending' | 'refunded' | 'refund_rejected';
export type PaymentMode = 'manual_mfs' | 'bank_transfer' | 'automated_gateway' | 'cash_offline';

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  routingNumber: string;
  instructions?: string;
}

export interface MfsAccountDetails {
  number: string;
  accountType: 'personal' | 'merchant' | 'agent';
  instructions?: string;
}

export interface BanglaQrConfig {
  isEnabled: boolean;
  accountTitle: string; // যেমন: "TWING হিসাবি / সুপার এডমিন"
  merchantId: string; // যেমন: "01306908115"
  bankOrMfsName: string; // যেমন: "Mutual Trust Bank / বিকাশ বাংলা কিউআর / সেলফিন"
  terminalId?: string; // যেমন: "TWING-BQR-01"
  routingNumber?: string;
  qrCodeUrl?: string; // সরাসরি কিউআর কোডের ইমেজ লিংক বা আপলোড করা ডাটা
  qrPayload?: string; // EMVCo বা বাংলা কিউআর টেক্সট স্পেসিফিকেশন
  instructions?: string; // গ্রাহকদের জন্য পেমেন্ট নির্দেশিকা
}

export interface PaymentGatewayConfig {
  gatewayId: 'bkash_direct' | 'nagad_direct' | 'sslcommerz' | 'amarpay' | 'shurjopay';
  name: string;
  isEnabled: boolean;
  isLive: boolean; // Sandbox vs Live
  appKeyMasked?: string;
  appKey?: string;
  appSecret?: string;
  merchantNumber?: string;
  notes?: string;
}

export interface FreeTrialConfig {
  isTrialEnabled: boolean; // Enable/disable free trial on registration
  trialDays: number; // e.g. 14 days, can be adjusted
  trialPlanName?: string;
}

export interface BonusConfig {
  isBonusEnabled: boolean; // Enable/disable bonus days
  bonusDays: number; // e.g. 7 days, can be adjusted
  bonusTitle?: string;
  bonusDescription?: string;
}

export interface SystemPaymentSettings {
  id: 'system_payment_settings';
  // Master switch to enable/disable subscription system across the entire application
  isSubscriptionSystemEnabled?: boolean;
  // Free Trial Dynamic Settings
  trialConfig?: FreeTrialConfig;
  // Bonus Days Dynamic Settings
  bonusConfig?: BonusConfig;
  // MFS Channels
  bkash: {
    isEnabled: boolean;
    personal: MfsAccountDetails;
    merchant?: MfsAccountDetails;
  };
  nagad: {
    isEnabled: boolean;
    personal: MfsAccountDetails;
    merchant?: MfsAccountDetails;
  };
  rocket: {
    isEnabled: boolean;
    personal: MfsAccountDetails;
  };
  upay: {
    isEnabled: boolean;
    personal: MfsAccountDetails;
  };
  // 🇧🇩 Bangla QR Channel (Bangladesh Bank interoperable standard)
  banglaQr?: BanglaQrConfig;
  // Bank Channel
  bankTransfer: {
    isEnabled: boolean;
    accounts: BankAccountDetails[];
  };
  // Gateways (Future-ready)
  gateways: PaymentGatewayConfig[];
  // Paymently Gateway Integration
  paymently?: {
    isEnabled: boolean;
    baseUrl?: string;
    apiKeyMasked?: string;
    apiKey?: string;
    isConfigured?: boolean;
    isSandbox?: boolean;
  };
  // Dynamic Pricing Packages
  customPlans?: SubscriptionPlan[];
  updatedAt: number;
  updatedBy?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  senderPhone?: string;
  shopName: string;
  planId: string;
  planName: string;
  durationDays: number;
  bonusDays?: number;
  amount: number;
  paymentMethod: AdminPaymentMethod;
  paymentMode?: PaymentMode;
  trxId: string;
  invoiceId?: string;
  senderNumber: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    branchName?: string;
    depositSlipUrl?: string;
  };
  status: PaymentStatus;
  refundStatus?: RefundStatus;
  refundReason?: string;
  refundAmount?: number;
  refundProcessedAt?: number;
  gatewayMetadata?: {
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    verificationSource?: 'manual_admin' | 'webhook' | 'server_api';
    verifiedAt?: number;
  };
  createdAt: number;
  approvedAt?: number;
  adminNotes?: string;
  rejectedReason?: string;
}

export type NotificationType =
  | 'general'
  | 'subscription_warning'
  | 'subscription_expired'
  | 'update'
  | 'payment_receipt'
  | 'security';

export type NotificationTarget = 'all' | 'active' | 'expired' | 'specific';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  targetUserId?: string;
  targetUserName?: string;
  priority: PriorityLevel;
  createdAt: number;
  isRead?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'success' | 'alert';
  isActive: boolean;
  showAsPopup: boolean;
  createdAt: number;
  expiresAt?: number;
  actionButtonText?: string;
  actionButtonUrl?: string;
}

export interface AppUpdateConfig {
  id: string;
  versionName: string;
  versionCode: number;
  minRequiredVersion: string;
  isForceUpdate: boolean;
  updateTitle: string;
  releaseNotes: string;
  downloadUrl: string;
  updatedAt: number;
}

export interface AdminActivityLog {
  id: string;
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  targetName?: string;
  details: string;
  timestamp: number;
}

export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopName: string;
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  createdAt: number;
  isReadByAdmin: boolean;
  isReadByUser: boolean;
}

export interface SupportThread {
  id: string; // Same as userId
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  shopName: string;
  lastMessage: string;
  lastSender: 'user' | 'admin';
  updatedAt: number;
  status: 'open' | 'closed';
  unreadAdminCount: number;
  unreadUserCount: number;
}

export type StaffPermission =
  | '*'
  | 'users_view'
  | 'users_edit'
  | 'users_suspend'
  | 'users_delete'
  | 'shop_manage'
  | 'online_store_manage'
  | 'marketplace_manage'
  | 'subscriptions_view'
  | 'subscriptions_extend'
  | 'payments_view'
  | 'payments_approve_reject'
  | 'payments_add_manual'
  | 'sms_purchases_manage'
  | 'payment_settings_manage'
  | 'sms_gateway_manage'
  | 'tagada_templates_manage'
  | 'ads_manage'
  | 'dashboard_banners_manage'
  | 'support_view'
  | 'support_reply'
  | 'reports_view'
  | 'notifications_manage'
  | 'announcements_manage'
  | 'app_update_manage'
  | 'settings_manage'
  | 'activity_logs_view'
  | 'database_view'
  | 'staff_manage';

export interface StaffPermissionCategory {
  categoryName: string;
  permissions: {
    key: StaffPermission;
    label: string;
    description: string;
  }[];
}

export const ALL_STAFF_PERMISSION_CATEGORIES: StaffPermissionCategory[] = [
  {
    categoryName: 'ইউজার ম্যানেজমেন্ট ও দোকান নিয়ন্ত্রণ',
    permissions: [
      { key: 'users_view', label: 'ইউজারদের তালিকা ও প্রোফাইল দেখা', description: 'সকল রেজিস্ট্রার্ড ইউজারদের তালিকা, দোকান ও স্টোর প্রোফাইল দেখতে পারবে' },
      { key: 'users_edit', label: 'ইউজার তথ্য এডিট ও সংশোধন', description: 'ইউজারের ফোন, নাম ও সাবস্ক্রিপশন তথ্য পরিবর্তন করতে পারবে' },
      { key: 'users_suspend', label: 'ইউজার সাসপেন্ড বা ব্যান/আনব্যান', description: 'ইউজার অ্যাকাউন্ট সাময়িক ব্লক বা পুনরায় চালু করতে পারবে' },
      { key: 'users_delete', label: 'ইউজার অ্যাকাউন্ট ডিলিট করা', description: 'ইউজার অ্যাকাউন্ট স্থায়ীভাবে সিস্টেম থেকে মুছে ফেলতে পারবে' },
      { key: 'shop_manage', label: 'দোকান ডাটাবেজ ও খাতা ভিউ', description: 'ইউজারের দোকানের ক্যাশবুক, কাস্টমার হিসাব ও ট্রানজেকশন দেখতে পারবে' },
      { key: 'online_store_manage', label: 'অনলাইন স্টোর ম্যানেজমেন্ট', description: 'অনলাইন স্টোরের আবেদন অনুমোদন, বাতিল ও শপ সেটিংস দেখতে পারবে' },
    ],
  },
  {
    categoryName: 'সেন্ট্রাল মার্কেটপ্লেস মল',
    permissions: [
      { key: 'marketplace_manage', label: 'সেন্ট্রাল মল ও মাস্টার অর্ডার', description: 'সেন্ট্রাল মার্কেটপ্লেসের সকল মাস্টার অর্ডার, প্রোডাক্ট ভেরিফিকেশন ও পেআউট নিয়ন্ত্রণ করতে পারবে' },
    ],
  },
  {
    categoryName: 'সাবস্ক্রিপশন ও বিলিং প্যাকেজ',
    permissions: [
      { key: 'subscriptions_view', label: 'সাবস্ক্রিপশন প্যাকেজ ও মেয়াদ মনিটরিং', description: 'সকল সাবস্ক্রিপশন প্যাকেজ, ফি ও মেয়াদোত্তীর্ণদের তালিকা দেখতে পারবে' },
      { key: 'subscriptions_extend', label: 'মেয়াদ বৃদ্ধি বা বাড়ানো', description: 'ম্যানুয়ালি ইউজারের সাবস্ক্রিপশন মেয়াদ বাড়াতে পারবে' },
    ],
  },
  {
    categoryName: 'পেমেন্ট ও গেটওয়ে সেটিংস',
    permissions: [
      { key: 'payments_view', label: 'পেমেন্ট রিকোয়েস্ট দেখা', description: 'বিকাশ, নগদ, রকেটের সাবস্ক্রিপশন পেমেন্ট ট্রানজেকশন দেখতে পারবে' },
      { key: 'payments_approve_reject', label: 'পেমেন্ট অনুমোদন ও বাতিল', description: 'টাকা জমা যাচাই করে পেমেন্ট এপ্রুভ বা রিজেক্ট করতে পারবে' },
      { key: 'payments_add_manual', label: 'ম্যানুয়াল বা ক্যাশ পেমেন্ট এন্ট্রি', description: 'সরাসরি অফলাইন বা ক্যাশ পেমেন্ট রেকর্ড যুক্ত করতে পারবে' },
      { key: 'payment_settings_manage', label: 'পেমেন্ট চ্যানেল সেটিংস', description: 'বিকাশ, নগদ, রকেট, বাংলা কিউআর ও ব্যাংক একাউন্ট নম্বর কনফিগার করতে পারবে' },
    ],
  },
  {
    categoryName: 'এসএমএস ও তাগাদা ম্যানেজমেন্ট',
    permissions: [
      { key: 'sms_gateway_manage', label: 'এসএমএস গেটওয়ে কনফিগারেশন', description: 'এসএমএস প্রভাইডার, এপিআই কী, ইউজারনেম ও সেন্ডার আইডি সেট করতে পারবে' },
      { key: 'sms_purchases_manage', label: 'SMS পেমেন্ট রিকোয়েস্ট ম্যানেজ', description: 'ইউজারদের কেনা এসএমএস বান্ডেল পেমেন্ট অনুমোদন বা বাতিল করতে পারবে' },
      { key: 'tagada_templates_manage', label: 'তাগাদা মেসেজ ও টেমপ্লেট', description: 'বকেয়া তাগাদার ডিফল্ট এসএমএস মেসেজ টেমপ্লেট পরিবর্তন করতে পারবে' },
    ],
  },
  {
    categoryName: 'বিজ্ঞাপন ও ব্যানার কন্ট্রোল',
    permissions: [
      { key: 'ads_manage', label: 'বিজ্ঞাপন ও অ্যাড সেটিংস', description: 'অ্যাপের ব্যানার বিজ্ঞাপন ও স্পন্সর কনফিগারেশন পরিচালনা করতে পারবে' },
      { key: 'dashboard_banners_manage', label: 'ড্যাশবোর্ড প্রোমো ব্যানার', description: 'ইউজার ড্যাশবোর্ডের অফার ও প্রোমোশনাল ব্যানার পরিবর্তন করতে পারবে' },
    ],
  },
  {
    categoryName: 'কাস্টমার সাপোর্ট ও হেল্পডেস্ক',
    permissions: [
      { key: 'support_view', label: 'সাপোর্ট মেসেজ দেখা', description: 'ইউজারদের পাঠানো হেল্পডেস্ক মেসেজ ও অভিযোগ পড়তে পারবে' },
      { key: 'support_reply', label: 'সাপোর্টে রিপ্লাই ও সমাধান দেওয়া', description: 'ইউজারদের চ্যাট মেসেজের সরাসরি উত্তর পাঠাতে পারবে' },
    ],
  },
  {
    categoryName: 'নোটিফিকেশন ও ঘোষণা',
    permissions: [
      { key: 'notifications_manage', label: 'পুশ নোটিফিকেশন পাঠানো', description: 'ইউজারদের ইন-অ্যাপ নোটিফিকেশন ও জরুরি বার্তা পাঠাতে পারবে' },
      { key: 'announcements_manage', label: 'ব্যানার ও নোটিশ বোর্ড', description: 'অ্যাপের জন্য নোটিশ, আপডেট ঘোষণা বা অফার ব্যানার যোগ করতে পারবে' },
    ],
  },
  {
    categoryName: 'রিপোর্ট, অ্যানালিটিক্স ও সেটিংস',
    permissions: [
      { key: 'reports_view', label: 'রিপোর্ট ও ড্যাশবোর্ড অ্যানালিটিক্স', description: 'রাজস্ব, সাবস্ক্রিপশন সেলস ও ব্যবহারকারীর অ্যানালিটিক্স দেখতে পারবে' },
      { key: 'settings_manage', label: 'সিস্টেম ও জেনারেল সেটিংস', description: 'সাধারণ সিস্টেম সেটিংস পরিবর্তন করতে পারবে' },
    ],
  },
  {
    categoryName: 'সিস্টেম ডাটা, অডিট ও স্টাফ কন্ট্রোল',
    permissions: [
      { key: 'app_update_manage', label: 'ভার্সন আপডেট কন্ট্রোল', description: 'অ্যাপ আপডেট বা ফোর্স আপডেট ভার্সন কনফিগার করতে পারবে' },
      { key: 'activity_logs_view', label: 'অ্যাক্টিভিটি ও অডিট লগ দেখা', description: 'সিস্টেমের সকল স্টাফ ও অ্যাডমিনের কাজের ইতিহাস দেখতে পারবে' },
      { key: 'database_view', label: 'লাইভ ডাটাবেজ ভিউয়ার', description: 'সিস্টেম ডাটা, ব্যাকআপ ও লাইভ ডাটাবেজ টেবিল পর্যবেক্ষণ করতে পারবে' },
      { key: 'staff_manage', label: 'স্টাফ অ্যাকাউন্ট ও পারমিশন কন্ট্রোল', description: 'অন্যান্য স্টাফদের অ্যাকাউন্ট তৈরি, এডিট ও পারমিশন পরিচালনা করতে পারবে' },
    ],
  },
];

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: 'staff' | 'manager';
  status: 'active' | 'disabled';
  permissions: StaffPermission[];
  createdAt: number;
  lastActiveAt?: number;
  notes?: string;
  createdBy?: string;
}

export interface AdminSession {
  role: 'super_admin' | 'staff';
  email: string;
  staffData?: StaffMember;
}

export const SUPPORT_CONTACT = {
  email: 'twinginfobd@mail.com',
  phone: '01306908115',
  photoHelpNote: 'স্ক্রিনশট বা কোনো ছবি পাঠানোর প্রয়োজন হলে আমাদের অফিসিয়াল ইমেইল (twinginfobd@mail.com) অথবা ফোনে (01306908115) যোগাযোগ করুন।',
};

export interface SmsGatewayConfig {
  provider: 'greenweb' | 'bulksmsbd' | 'alphasms' | 'mimsms' | 'custom';
  apiKey: string;
  senderId: string;
  username?: string;
  customUrl?: string;
  isEnabled: boolean;
  maskedApiKey?: string;
  hasApiKey?: boolean;
}

export interface CustomAdItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  imageUrl?: string;
  targetUrl: string;
  ctaText: string;
  isActive?: boolean;
}

export interface SystemAdSettings {
  id?: 'system_ad_settings';
  isAdsEnabled: boolean; // Master switch: বিজ্ঞাপন চালু / বন্ধ
  adProvider: 'admob' | 'custom' | 'google_adsense';
  admobAppId?: string;
  admobBannerUnitId?: string;
  admobInterstitialUnitId?: string;
  bannerAdEnabled: boolean; // Switch: বটম ব্যানার বিজ্ঞাপন
  dashboardCardAdEnabled: boolean; // Switch: ড্যাশবোর্ড স্পন্সরড কার্ড বিজ্ঞাপন
  footerBannerAdEnabled: boolean; // Switch: ফুটার নন-ইনট্রুসিভ স্লিম ব্যানার
  customAds: CustomAdItem[];
  updatedAt: number;
  updatedBy?: string;
}

export interface UserSmsLog {
  id: string;
  userId: string;
  customerName?: string;
  customerPhone: string;
  message: string;
  smsType: 'tagada' | 'deposit' | 'custom';
  status: 'sent' | 'delivered' | 'failed';
  costSms: number;
  createdAt: number;
}

export interface SmsPackageItem {
  id: string;
  name: string;
  smsCount: number;
  price: number;
  badge?: string;
  isPopular?: boolean;
  ratePerSms: string;
}

export interface SmsPurchaseRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopName: string;
  smsCount: number;
  amount: number;
  paymentMethod: string;
  trxId: string;
  status: 'pending' | 'confirmed' | 'approved' | 'rejected';
  createdAt: number;
  approvedAt?: number | null;
}

export type BannerActionType = 'none' | 'subscription' | 'sms' | 'support' | 'url' | 'tel';

export interface DashboardBannerItem {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  imageUrl?: string;
  bgGradient: 'emerald' | 'teal' | 'indigo' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';
  textColor?: 'dark' | 'light';
  actionType: BannerActionType;
  actionUrl?: string;
  actionText?: string;
  isActive: boolean;
  order: number;
}

export interface DashboardBannerSettings {
  isEnabled: boolean;
  autoPlay: boolean;
  intervalSeconds: number;
  banners: DashboardBannerItem[];
  updatedAt: number;
}

export interface AdminOnlineStoreItem {
  userId: string;
  userName: string;
  shopName: string;
  phone: string;
  email: string;
  subscriptionPlan: string;
  subscriptionExpiresAt: number;
  isOnlineStoreAllowed: boolean;
  onlineStoreStatus: 'active' | 'disabled' | 'requested';
  onlineStoreRequestedAt: number;
  onlineStoreNote: string;
  storeSlug: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  isEnabled: boolean;
  themeColor: string;
  category: string;
  bannerTitle: string;
  acceptCod: boolean;
  acceptBkash: boolean;
  acceptNagad: boolean;
  acceptRocket: boolean;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
  logoUrl?: string;
  publishedProductsCount: number;
  updatedAt: number;
}

export type AdminTab =
  | 'dashboard'
  | 'dashboard_banners'
  | 'payment_settings'
  | 'ads_management'
  | 'sms_gateway'
  | 'tagada_templates'
  | 'sms_purchases'
  | 'super_admin_security'
  | 'staff_management'
  | 'users'
  | 'online_stores'
  | 'subscriptions'
  | 'payments'
  | 'expired'
  | 'support'
  | 'notifications'
  | 'announcements'
  | 'app_update'
  | 'live_db_viewer'
  | 'data_management'
  | 'central_marketplace'
  | 'activity_logs';


