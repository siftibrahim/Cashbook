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

export type AdminPaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank' | 'sslcommerz' | 'card' | 'cash' | 'other';
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
  // Bank Channel
  bankTransfer: {
    isEnabled: boolean;
    accounts: BankAccountDetails[];
  };
  // Gateways (Future-ready)
  gateways: PaymentGatewayConfig[];
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
  | 'users_view'
  | 'users_edit'
  | 'users_suspend'
  | 'users_delete'
  | 'shop_manage'
  | 'subscriptions_view'
  | 'subscriptions_extend'
  | 'payments_view'
  | 'payments_approve_reject'
  | 'payments_add_manual'
  | 'support_view'
  | 'support_reply'
  | 'reports_view'
  | 'notifications_manage'
  | 'announcements_manage'
  | 'app_update_manage'
  | 'settings_manage'
  | 'activity_logs_view';

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
    categoryName: 'ইউজার ম্যানেজমেন্ট',
    permissions: [
      { key: 'users_view', label: 'ইউজারদের তালিকা দেখা', description: 'সকল রেজিস্ট্রার্ড ইউজারদের তালিকা ও প্রোফাইল দেখতে পারবে' },
      { key: 'users_edit', label: 'ইউজার তথ্য এডিট করা', description: 'ইউজারের ফোন, নাম ও সাবস্ক্রিপশন তথ্য পরিবর্তন করতে পারবে' },
      { key: 'users_suspend', label: 'ইউজার সাসপেন্ড/এক্টিভ', description: 'ইউজারকে ব্যান বা আনব্যান করতে পারবে' },
      { key: 'users_delete', label: 'ইউজার ডিলিট করা', description: 'ইউজার অ্যাকাউন্ট পার্মানেন্ট মুছে ফেলতে পারবে' },
      { key: 'shop_manage', label: 'দোকান ডাটাবেজ ভিউ', description: 'ইউজারের দোকানের ক্যাশবুক ও কাস্টমার স্ট্যাটাস দেখতে পারবে' },
    ],
  },
  {
    categoryName: 'সাবস্ক্রিপশন ও বিলিং',
    permissions: [
      { key: 'subscriptions_view', label: 'সাবস্ক্রিপশন প্ল্যান দেখা', description: 'সকল সাবস্ক্রিপশন প্যাকেজ ও মেয়াদ দেখতে পারবে' },
      { key: 'subscriptions_extend', label: 'মেয়াদ বৃদ্ধি বা বাড়ানো', description: 'ম্যানুয়ালি ইউজারের সাবস্ক্রিপশন মেয়াদ বাড়াতে পারবে' },
    ],
  },
  {
    categoryName: 'পেমেন্ট ও ভেরিফিকেশন',
    permissions: [
      { key: 'payments_view', label: 'পেমেন্ট রিকোয়েস্ট দেখা', description: 'বিকাশ/নগদ/রকেটের পেমেন্ট ট্রানজেকশন দেখতে পারবে' },
      { key: 'payments_approve_reject', label: 'পেমেন্ট অনুমোদন ও বাতিল', description: 'পেমেন্ট ভেরিফাই করে অনুমোদন বা বাতিল করতে পারবে' },
      { key: 'payments_add_manual', label: 'ম্যানুয়াল পেমেন্ট এন্ট্রি', description: 'সরাসরি ক্যাশ বা অফলাইন পেমেন্ট এন্ট্রি দিতে পারবে' },
    ],
  },
  {
    categoryName: 'সাপোর্ট ও মেসেজিং',
    permissions: [
      { key: 'support_view', label: 'সাপোর্ট মেসেজ দেখা', description: 'ইউজারদের হেল্পডেস্ক মেসেজ পড়তে পারবে' },
      { key: 'support_reply', label: 'সাপোর্টে রিপ্লাই দেওয়া', description: 'ইউজারদের মেসেজের উত্তর পাঠাতে পারবে' },
    ],
  },
  {
    categoryName: 'নোটিফিকেশন ও ঘোষণা',
    permissions: [
      { key: 'notifications_manage', label: 'নোটিফিকেশন পাঠানো', description: 'ইউজারদের ইন-অ্যাপ নোটিফিকেশন পাঠাতে পারবে' },
      { key: 'announcements_manage', label: 'ব্যানার ও নোটিশ বোর্ড', description: 'অ্যাপের জন্য নোটিশ বা অফার ব্যানার যোগ করতে পারবে' },
    ],
  },
  {
    categoryName: 'সিস্টেম ও অডিট',
    permissions: [
      { key: 'app_update_manage', label: 'ভার্সন আপডেট কন্ট্রোল', description: 'অ্যাপ আপডেট বা ফোর্স আপডেট কনফিগার করতে পারবে' },
      { key: 'activity_logs_view', label: 'অ্যাক্টিভিটি ও অডিট লগ দেখা', description: 'সিস্টেমের সকল ক্রিয়াকলাপ ও অ্যাকশন ইতিহাস দেখতে পারবে' },
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
  phone: '01619665875',
  photoHelpNote: 'স্ক্রিনশট বা কোনো ছবি পাঠানোর প্রয়োজন হলে আমাদের অফিসিয়াল ইমেইল (twinginfobd@mail.com) অথবা ফোনে (01619665875) যোগাযোগ করুন।',
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

export type AdminTab =
  | 'dashboard'
  | 'payment_settings'
  | 'ads_management'
  | 'sms_gateway'
  | 'super_admin_security'
  | 'staff_management'
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'expired'
  | 'support'
  | 'notifications'
  | 'announcements'
  | 'app_update'
  | 'activity_logs';


