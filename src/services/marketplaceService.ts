import { MarketplaceProduct, MarketplaceCategory, MarketplaceMasterOrder } from '../types';

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

  async toggleProductListing(productId: string, isListedOnMarketplace: boolean): Promise<any> {
    const token = localStorage.getItem('ibrahim_auth_token') || sessionStorage.getItem('ibrahim_auth_token');
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
};
