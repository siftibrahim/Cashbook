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
  badge?: string;
}

export type AdminPaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash' | 'other';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopName: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  paymentMethod: AdminPaymentMethod;
  trxId: string;
  senderNumber: string;
  status: PaymentStatus;
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

export const SUPPORT_CONTACT = {
  email: 'twinginfobd@mail.com',
  phone: '01619665875',
  photoHelpNote: 'স্ক্রিনশট বা কোনো ছবি পাঠানোর প্রয়োজন হলে আমাদের অফিসিয়াল ইমেইল (twinginfobd@mail.com) অথবা ফোনে (01619665875) যোগাযোগ করুন।',
};

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'expired'
  | 'support'
  | 'notifications'
  | 'announcements'
  | 'app_update'
  | 'activity_logs';

