export const marketplaceAdminApi = {
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('ibrahim_auth_token') || sessionStorage.getItem('ibrahim_auth_token');
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

  async updateOrderStatus(orderId: string, payload: { overallStatus?: string; paymentStatus?: string }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
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

  async moderateProduct(productId: string, updates: { isListedOnMarketplace?: boolean; isFeaturedOnMarketplace?: boolean; marketplaceStatus?: string }): Promise<any> {
    const res = await fetch(`/api/marketplace/admin/products/${encodeURIComponent(productId)}/moderate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'পণ্য মডারেশন ব্যর্থ হয়েছে');
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
};
