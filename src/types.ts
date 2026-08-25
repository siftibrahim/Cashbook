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
  name: string;
  owner: string;
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

export type NavTab = 'dashboard' | 'customers' | 'pos' | 'inventory' | 'cashbook' | 'support';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert?: number;
  updatedAt: number;
}
