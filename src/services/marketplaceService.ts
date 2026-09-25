import { MarketplaceProduct, MarketplaceCategory, MarketplaceMasterOrder } from '../types';
import { getAuthToken } from './apiService';

function getVendorAuthToken(): string {
  return (
    getAuthToken() ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('twing_jwt_token') ||
        localStorage.getItem('ibrahim_auth_token') ||
        sessionStorage.getItem('twing_jwt_token') ||
        sessionStorage.getItem('ibrahim_auth_token')
      : '') ||
    ''
  );
}

export interface MarketplaceFeedParams {
  search?: string;
  category?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'discount' | 'rating';
  inStockOnly?: boolean;
  limit?: number;
}

export interface MarketplaceCheckoutPayload {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryCity: string;
  paymentMethod: string;
  paymentTrxId?: string;
  senderPhone?: string;
  notes?: string;
  isPhoneVerified?: boolean;
  items: {
    productId: string;
    vendorId: string;
    name: string;
    salePrice: number;
    quantity: number;
    unit?: string;
    imageUrl?: string;
  }[];
}

export const marketplaceApi = {
  async getFeed(params: MarketplaceFeedParams = {}): Promise<{ success: boolean; products: MarketplaceProduct[]; count: number }> {
    try {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.category) query.set('category', params.category);
      if (params.sort) query.set('sort', params.sort);
      if (params.inStockOnly !== undefined) query.set('inStockOnly', String(params.inStockOnly));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`/api/marketplace/feed?${query.toString()}`);
      if (!res.ok) throw new Error('মার্কেটপ্লেস ফিড লোড করা যায়নি');
      return await res.json();
    } catch (err: any) {
      console.warn('Marketplace feed fetch fallback:', err.message);
      return { success: false, products: [], count: 0 };
    }
  },

  async getCategories(): Promise<{ success: boolean; categories: MarketplaceCategory[] }> {
    try {
      const res = await fetch('/api/marketplace/categories');
      if (!res.ok) throw new Error('ক্যাটাগরি লোড করা যায়নি');
      return await res.json();
    } catch (err: any) {
      console.warn('Marketplace categories fetch fallback:', err.message);
      return { success: false, categories: [] };
    }
  },

  async getFeatured(): Promise<any> {
    try {
      const res = await fetch('/api/marketplace/featured');
      if (!res.ok) throw new Error('ফিচার্ড অফার লোড করা যায়নি');
      return await res.json();
    } catch (err: any) {
      return { success: false, heroBanners: [], guarantees: [] };
    }
  },

  async checkout(payload: MarketplaceCheckoutPayload): Promise<{
    success: boolean;
    masterOrder?: MarketplaceMasterOrder;
    subOrders?: any[];
    checkoutSession?: {
      paymentUrl?: string;
      paymentId?: string;
      isSandbox?: boolean;
      sessionData?: any;
    } | null;
    message?: string;
    error?: string;
  }> {
    const res = await fetch('/api/marketplace/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'অর্ডার সম্পন্ন হতে ব্যর্থ হয়েছে');
    }
    return data;
  },

  async trackOrder(orderNumber: string): Promise<{ success: boolean; order?: any; error?: string }> {
    const res = await fetch(`/api/marketplace/track/${encodeURIComponent(orderNumber.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'অর্ডার পাওয়া যায়নি');
    }
    return data;
  },

  async getSettings(): Promise<{ success: boolean; settings?: any }> {
    try {
      const res = await fetch('/api/marketplace/settings');
      if (!res.ok) throw new Error('মার্কেটপ্লেস সেটিংস লোড করা যায়নি');
      return await res.json();
    } catch (err: any) {
      console.warn('Marketplace settings fetch error:', err.message);
      return { success: false };
    }
  },

  async createPaymentlySession(orderData: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
  }): Promise<{
    success: boolean;
    paymentUrl: string;
    paymentId: string;
    isSandbox?: boolean;
  }> {
    const res = await fetch('/api/marketplace/paymently/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'অনলাইন পেমেন্ট সেশন তৈরিতে সমস্যা হয়েছে');
    }
    return data;
  },

  async checkPaymentStatus(orderId: string): Promise<{
    success: boolean;
    orderId: string;
    orderNumber: string;
    paymentStatus: string;
    overallStatus: string;
    trxId?: string;
    amount: number;
    isPaid: boolean;
  }> {
    const res = await fetch(`/api/marketplace/paymently/status/${encodeURIComponent(orderId)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'পেমেন্ট স্ট্যাটাস চেক করা যায়নি');
    }
    return data;
  },

  async verifyPaymentInvoice(invoiceId: string, orderId?: string): Promise<{
    success: boolean;
    status: string;
    message: string;
    trxId?: string;
    amount?: number;
  }> {
    const res = await fetch('/api/marketplace/paymently/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, orderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'ইনভয়েস ভেরিফিকেশন ব্যর্থ হয়েছে');
    }
    return data;
  },

  async toggleProductListing(productId: string, isListedOnMarketplace: boolean): Promise<any> {
    const token = getVendorAuthToken();
    const res = await fetch('/api/marketplace/toggle-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ productId, isListedOnMarketplace }),
    });
    return await res.json();
  },

  async getVendorWallet(): Promise<{
    success: boolean;
    totalSales: number;
    deliveredSales: number;
    settledSales: number;
    pendingDeliverySales: number;
    pendingWithdrawalAmount: number;
    availableForWithdrawal: number;
    deliveredOrdersCount: number;
    pendingOrdersCount: number;
    payoutRequests: any[];
    error?: string;
  }> {
    const token = getVendorAuthToken();
    const res = await fetch('/api/marketplace/vendor/wallet', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ওয়ালেট হিসাব লোড করা যায়নি');
    return data;
  },

  async createPayoutRequest(payload: {
    amount: number;
    paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'bank';
    accountNumber: string;
    accountType?: string;
    bankName?: string;
    branchName?: string;
    requestNote?: string;
  }): Promise<{ success: boolean; message: string; requestId?: string; error?: string }> {
    const token = getVendorAuthToken();
    const res = await fetch('/api/marketplace/vendor/payout-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'উইথড্র আবেদন ব্যর্থ হয়েছে');
    return data;
  },

  async sendOtp(phone: string): Promise<{
    success: boolean;
    message: string;
    expiresInSeconds?: number;
    demoOtp?: string;
    error?: string;
  }> {
    const res = await fetch('/api/marketplace/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে');
    return data;
  },

  async verifyOtp(phone: string, otp: string): Promise<{
    success: boolean;
    verified: boolean;
    phone?: string;
    message: string;
    error?: string;
  }> {
    const res = await fetch('/api/marketplace/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ওটিপি যাচাইয়ে ত্রুটি হয়েছে');
    return data;
  },
};
