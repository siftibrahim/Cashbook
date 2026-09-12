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
  acceptCOD: boolean;
  acceptBkash: boolean;
  bkashNumber?: string;
  acceptNagad: boolean;
  nagadNumber?: string;
  acceptRocket: boolean;
  rocketNumber?: string;
  facebookUrl?: string;
  publishedProductIds?: string[];
  bannerUrl?: string;
  logoUrl?: string;
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
  deliveryArea: 'inside_dhaka' | 'outside_dhaka' | 'store_pickup';
  deliveryCharge: number;
  items: OnlineOrderItem[];
  subtotal: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'rocket';
  paymentStatus: 'unpaid' | 'paid' | 'partial';
  orderStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  courierName?: string;
  courierTrackingCode?: string;
  codCollectedAmount?: number;
  collectedAt?: number;
  createdAt: number;
  updatedAt: number;
}

