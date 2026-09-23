export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'other';

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: 'sale' | 'payment'; // sale = দিলাম (বাকি বৃদ্ধি), payment = পেলাম (টাকা জমা)
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  balanceAfter: number;
  createdAt: number;
  paymentMethod?: PaymentMethod;
  items?: InvoiceItem[];
  receiptNo?: string;
  subtotal?: number;
  discount?: number;
  netAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  prevBalance?: number;
  deliveryCharge?: number;
  updatedAt?: number;
}

export type CustomerCategory = 'regular' | 'vip' | 'retail' | 'wholesale';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number; // Positive = Customer owes store (বাকি), Negative = Advance (অগ্রিম)
  category?: CustomerCategory;
  creditLimit?: number; // সর্বোচ্চ বাকি সীমা
  notes?: string;
  updatedAt: number;
  createdAt: number;
}

export type ExpenseCategory =
  | 'shop_rent'
  | 'electricity'
  | 'staff_salary'
  | 'tea_snacks'
  | 'transport'
  | 'inventory_purchase'
  | 'maintenance'
  | 'other';

export interface DailyExpense {
  id: string;
  type: 'expense' | 'income'; // expense = দোকান খরচ, income = অন্যান্য আয়
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  time: string;
  createdAt: number;
}

export type PrintPaperSize = 'thermal_80' | 'thermal_58' | 'a4';
export type ThemeColor = 'teal' | 'emerald' | 'indigo' | 'amber' | 'navy';

export interface StoreProfile {
  id?: string;
  name: string;
  shopName?: string;
  owner: string;
  ownerName?: string;
  email?: string;
  phone: string;
  address: string;
  footerNote?: string;
  currencySymbol?: string;
  highDueLimit?: number;
  tagadaTemplate?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  themeColor?: ThemeColor;
  enableSoundEffects?: boolean;
  printPaperSize?: PrintPaperSize;
  showQrOnInvoice?: boolean;
  defaultCreditLimit?: number;
}

export interface AppSettings {
  currencySymbol: string;
  highDueLimit: number;
  tagadaTemplate: string;
  footerNote: string;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  themeColor?: ThemeColor;
  enableSoundEffects?: boolean;
  printPaperSize?: PrintPaperSize;
  showQrOnInvoice?: boolean;
  defaultCreditLimit?: number;
}

export type CustomerFilter = 'all' | 'due' | 'paid' | 'vip' | 'wholesale';
export type CustomerSortOption = 'recent_activity' | 'due_desc' | 'due_asc' | 'name_asc';

export interface TagadaTemplate {
  id: string;
  title: string;
  message: string;
  category?: 'regular' | 'urgent' | 'short' | 'reminder' | 'custom';
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type NavTab = 'dashboard' | 'customers' | 'pos' | 'inventory' | 'cashbook' | 'support';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  salePrice: number;
  originalPrice?: number; // MRP / Regular price for discount ribbon
  discountPercent?: number; // e.g. 46 for 46% OFF
  rating?: number; // e.g. 4.9
  reviewCount?: number; // e.g. 181
  deliveryTime?: string; // e.g. '১২-২৪ ঘণ্টা'
  stock: number;
  minStock?: number;
  minStockAlert?: number;
  sku?: string; // Product code / Barcode / QR Code identifier (e.g. PRD-101)
  qrCode?: string; // Base64 data or QR payload
  imageUrl?: string;
  description?: string;
  isPublishedOnline?: boolean;
  updatedAt: number;
}

export interface StoreBanner {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  tag?: string;
  discountText?: string;
  linkUrl?: string;
  active?: boolean;
}

export interface OnlineStoreConfig {
  isEnabled: boolean;
  storeSlug: string;
  storeName: string;
  tagline: string;
  category: string;
  phone: string;
  whatsappPhone: string;
  address: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  customDomainStatus?: 'pending' | 'verified' | 'failed';
  customDomainVerifiedAt?: number;
  themeColor: 'teal' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'navy';
  announcement: string;
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
  freeDeliveryAbove?: number;
  minOrderAmount?: number;
  deliveryTimeEstimate?: string;
  acceptCOD: boolean;
  acceptBkash: boolean;
  bkashNumber?: string;
  bkashType?: 'personal' | 'merchant' | 'agent';
  acceptNagad: boolean;
  nagadNumber?: string;
  nagadType?: 'personal' | 'merchant';
  acceptRocket: boolean;
  rocketNumber?: string;
  rocketType?: 'personal' | 'merchant';
  acceptUpay?: boolean;
  upayNumber?: string;
  upayType?: 'personal' | 'merchant';
  acceptBank?: boolean;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranchName?: string;
  bankRoutingNumber?: string;
  vendorPaymentQrUrl?: string;
  acceptBanglaQr?: boolean;
  banglaQrNumber?: string;
  paymentInstructions?: string;
  bannerUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerTag?: string;
  bannerDiscountText?: string;
  bannerStyle?: 'neon' | 'image' | 'gradient';
  banners?: StoreBanner[];
  coupons?: Coupon[];
  logoUrl?: string;
  supportWhatsAppMessage?: string;
  supportHours?: string;
  estimatedDeliveryDays?: string;
  facebookUrl?: string;
  publishedProductIds?: string[];
  vendorId?: string;
  isStoreAllowedByAdmin?: boolean;
  adminStoreStatus?: 'active' | 'disabled' | 'requested';
  adminStoreNote?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface OnlineOrderItem {
  id?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  total: number;
  sku?: string;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
  area?: string;
  couponCode?: string;
  discountAmount?: number;
  deliveryArea: 'inside_dhaka' | 'outside_dhaka' | 'store_pickup';
  deliveryCharge: number;
  items: OnlineOrderItem[];
  subtotal: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank' | 'bangla_qr';
  paymentStatus: 'unpaid' | 'paid' | 'partial' | 'pending_verification' | 'rejected';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trxId?: string;
  senderPhone?: string;
  paymentAmount?: number;
  paymentProof?: string;
  paymentRejectReason?: string;
  paymentReviewedAt?: number;
  notes?: string;
  courierName?: string;
  courierTrackingCode?: string;
  codCollectedAmount?: number;
  collectedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  expiryDate?: string;
  usageLimit?: number;
  usedCount?: number;
  isActive: boolean;
  description?: string;
}

