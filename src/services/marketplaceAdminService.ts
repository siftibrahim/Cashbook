import { getAuthToken } from './apiService';

export const marketplaceAdminApi = {
  getAuthHeaders(): Record<string, string> {
    const token =
      getAuthToken() ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('twing_jwt_token') ||
          localStorage.getItem('ibrahim_auth_token') ||
          sessionStorage.getItem('twing_jwt_token') ||
          sessionStorage.getItem('ibrahim_auth_token')
        : '') ||
      '';
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  },

  async getOverview(): Promise<any> {
    const res = await fetch('/api/marketplace/admin/overview', {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'অ্যাডমিন ওভারভিউ লোড করা যায়নি' }));
      throw new Error(err.error || 'অ্যাডমিন ওভারভিউ লোড করা যায়নি');
    }
    return await res.json();
  },

  async updateOrderStatus(orderId: string, payload: {
    overallStatus?: string;
    paymentStatus?: string;
    courierName?: string;
    courierTrackingCode?: string;
    returnReason?: string;
    refundAmount?: number;
  }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
    return data;
  },

  async approveOrderPayment(orderId: string, payload: { adminNote?: string } = {}): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/orders/${encodeURIComponent(orderId)}/approve-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পেমেন্ট অনুমোদন ব্যর্থ হয়েছে');
    return data;
  },

  async rejectOrderPayment(orderId: string, payload: { rejectionReason?: string } = {}): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/orders/${encodeURIComponent(orderId)}/reject-payment`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পেমেন্ট বাতিল ব্যর্থ হয়েছে');
    return data;
  },

  async settleVendorPayout(subOrderId: string, payload: { vendorPayoutStatus: string; adminNote?: string }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/orders/sub/${encodeURIComponent(subOrderId)}/payout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পেআউট আপডেট ব্যর্থ হয়েছে');
    return data;
  },

  async moderateProduct(productId: string, updates: { 
    isListedOnMarketplace?: boolean; 
    isFeaturedOnMarketplace?: boolean; 
    marketplaceStatus?: string;
    adminNote?: string;
  }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/products/${encodeURIComponent(productId)}/moderate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পণ্য মডারেশন ব্যর্থ হয়েছে');
    return data;
  },

  async deleteProduct(productId: string, permanent: boolean = false): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/products/${encodeURIComponent(productId)}?permanent=${permanent ? 'true' : 'false'}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পণ্য মুছে ফেলতে ব্যর্থ হয়েছে');
    return data;
  },

  async batchProductsAction(payload: { 
    action: 'publish_all' | 'unpublish_all' | 'block_all' | 'permanent_delete_all_marketplace' | 'remove_all_marketplace' | 'selected_publish' | 'selected_block' | 'selected_delete'; 
    productIds?: string[]; 
    permanent?: boolean;
    adminNote?: string;
  }): Promise<any> {
    const res = await fetch('/api/marketplace/admin/products/batch', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ব্যাচ অপারেশন ব্যর্থ হয়েছে');
    return data;
  },

  async toggleVendorPayoutHold(vendorId: string, payload: { isHeld: boolean; reason?: string }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/vendors/${encodeURIComponent(vendorId)}/hold-payout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ভেন্ডর পেআউট হোল্ড আপডেট ব্যর্থ হয়েছে');
    return data;
  },

  async saveCategory(payload: any): Promise<any> {
    const res = await fetch('/api/marketplace/admin/categories', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ক্যাটাগরি সেভ করা যায়নি');
    return data;
  },

  async saveSettings(settings: any): Promise<any> {
    const res = await fetch('/api/marketplace/admin/settings', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'সেটিংস সেভ করা যায়নি');
    return data;
  },

  async getVendorSummary(): Promise<any> {
    const res = await fetch('/api/marketplace/vendor/summary', {
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ভেন্ডর সামারি লোড করা যায়নি');
    return data;
  },

  async getPayoutRequests(status?: string): Promise<{ success: boolean; requests: any[] }> {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/marketplace/admin/payout-requests${query}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পেআউট আবেদন তালিকা লোড করা যায়নি');
    return data;
  },

  async getVendorBalances(): Promise<{
    success: boolean;
    summary: {
      totalVendorsCount: number;
      totalOrdersCount?: number;
      totalDeliveredOrdersCount?: number;
      totalSoldProductsCount?: number;
      totalSoldUnitsCount?: number;
      totalGrossSales: number;
      totalDeliveredSales: number;
      totalPlatformCommissionProfit?: number;
      totalDeliveryMarginProfit?: number;
      totalPlatformProfit?: number;
      thisMonthProfit?: number;
      defaultCommissionPercent?: number;
      platformDeliveryMargin?: number;
      monthlyProfitBreakdown?: any[];
      totalSettledAmount: number;
      totalDueToVendors: number;
      totalPendingWithdrawals: number;
      allSoldProducts?: any[];
    };
    vendors: any[];
  }> {
    const res = await fetch('/api/marketplace/admin/vendor-balances', {
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ভেন্ডর ব্যালেন্স ও প্রাপ্য তালিকা লোড করা যায়নি');
    return data;
  },

  async setVendorCommission(vendorId: string, commissionPercent: number): Promise<{ success: boolean; message: string; vendorId: string; commissionPercent: number }> {
    const res = await fetch('/api/marketplace/admin/vendor-commission', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ vendorId, commissionPercent }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'কমিশন রেট সংরক্ষণ করা যায়নি');
    return data;
  },

  async recordVendorPayout(vendorId: string, payload: {
    amount: number;
    paymentMethod?: string;
    accountNumber?: string;
    transactionId: string;
    note?: string;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    const res = await fetch(`/api/marketplace/admin/vendors/${encodeURIComponent(vendorId)}/record-payout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ভেন্ডর পেআউট নিষ্পত্তি ব্যর্থ হয়েছে');
    return data;
  },

  async processPayoutRequest(id: string, payload: {
    action: 'approve' | 'reject' | 'hold' | 'unhold';
    adminTransactionId?: string;
    adminNote?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/marketplace/admin/payout-requests/${encodeURIComponent(id)}/process`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পেআউট প্রসেস করা যায়নি');
    return data;
  },
};
