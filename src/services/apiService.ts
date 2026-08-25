/**
 * Twing Ledger Backend API Client
 * Replaces Firebase with Node.js Express + Neon PostgreSQL Backend
 */

import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';
import {
  AppUser,
  PaymentRecord,
  SystemPaymentSettings,
  AdminNotification,
  Announcement,
  AppUpdateConfig,
  AdminActivityLog,
  SupportMessage,
  SupportThread,
  StaffMember,
  AdminSession,
} from '../types/adminTypes';

const API_BASE = '/api';
const TOKEN_KEY = 'twing_jwt_token';
const USER_KEY = 'twing_user_data';

// Helper to get JWT token
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Universal fetch wrapper with Bearer token
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// ---------------- AUTH API ----------------
export const authApi = {
  async register(params: {
    name: string;
    shopName: string;
    phone: string;
    email: string;
    password: string;
    businessType?: string;
    address?: string;
  }) {
    const res = await apiRequest<{ token: string; user: any; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async login(email: string, password: string) {
    const res = await apiRequest<{ token: string; user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async adminLogin(params: { email?: string; password?: string; pin?: string; authType?: 'password' | 'pin' }) {
    const res = await apiRequest<{ token: string; user: any; message: string }>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.user);
    }
    return res;
  },

  async staffLogin(identifier: string, password: string) {
    const res = await apiRequest<{ token: string; staff: any; message: string }>('/auth/staff-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser(res.staff);
    }
    return res;
  },

  async getCurrentUser() {
    return apiRequest<{ user: any }>('/auth/me');
  },

  async changePassword(email: string, newPassword: string) {
    return apiRequest<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  },

  async forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async sendResetOtp(params: { phone?: string; identifier?: string }) {
    return apiRequest<{
      success: boolean;
      message: string;
      phone: string;
      maskedPhone: string;
      otpId?: string;
      expiresInSeconds?: number;
      isSuperAdmin?: boolean;
      isSimulated?: boolean;
    }>('/auth/send-reset-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async verifyResetOtp(phone: string, otp: string) {
    return apiRequest<{
      success: boolean;
      message: string;
      resetSessionToken?: string;
      phone: string;
    }>('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  },

  async resetPasswordWithOtp(params: { phone: string; otp: string; newPassword: string }) {
    return apiRequest<{
      success: boolean;
      message: string;
      phone: string;
    }>('/auth/reset-password-with-otp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  logout() {
    removeAuthToken();
  },
};

// ---------------- CUSTOMERS API ----------------
export const customerApi = {
  async getAll(): Promise<Customer[]> {
    const res = await apiRequest<{ customers: Customer[] }>('/customers');
    return res.customers || [];
  },

  async save(customer: Customer): Promise<Customer> {
    const res = await apiRequest<{ customer: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
    return res.customer;
  },

  async delete(customerId: string): Promise<void> {
    await apiRequest(`/customers/${customerId}`, { method: 'DELETE' });
  },
};

// ---------------- TRANSACTIONS API ----------------
export const transactionApi = {
  async getAll(customerId?: string): Promise<{ list: Transaction[]; map: Record<string, Transaction[]> }> {
    const url = customerId ? `/transactions?customerId=${customerId}` : '/transactions';
    const res = await apiRequest<{ transactions: Transaction[]; transactionsMap: Record<string, Transaction[]> }>(url);
    return {
      list: res.transactions || [],
      map: res.transactionsMap || {},
    };
  },

  async save(tx: Transaction): Promise<Transaction> {
    const res = await apiRequest<{ transaction: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    return res.transaction;
  },

  async delete(txId: string): Promise<void> {
    await apiRequest(`/transactions/${txId}`, { method: 'DELETE' });
  },
};

// ---------------- EXPENSES / CASHBOOK API ----------------
export const expenseApi = {
  async getAll(): Promise<DailyExpense[]> {
    const res = await apiRequest<{ expenses: DailyExpense[] }>('/expenses');
    return res.expenses || [];
  },

  async save(expense: DailyExpense): Promise<void> {
    await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async delete(expenseId: string): Promise<void> {
    await apiRequest(`/expenses/${expenseId}`, { method: 'DELETE' });
  },
};

// ---------------- STORE PROFILE API ----------------
export const storeApi = {
  async getProfile(): Promise<StoreProfile> {
    const res = await apiRequest<{ profile: StoreProfile }>('/store/profile');
    return res.profile;
  },

  async saveProfile(profile: StoreProfile): Promise<void> {
    await apiRequest('/store/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  async syncAll(
    store: StoreProfile,
    customers: Customer[],
    transactions: Record<string, Transaction[]>,
    expenses: DailyExpense[] = []
  ): Promise<void> {
    await apiRequest('/store/sync-all', {
      method: 'POST',
      body: JSON.stringify({ store, customers, transactions, expenses }),
    });
  },
};

// ---------------- PRODUCTS & INVENTORY API ----------------
export const productApi = {
  async getAll(): Promise<any[]> {
    try {
      const res = await apiRequest<{ products: any[] }>('/products').catch(() => null);
      return res?.products || [];
    } catch {
      return [];
    }
  },
};

// ---------------- SUBSCRIPTIONS & USER PAYMENTS API ----------------
export const subscriptionApi = {
  async getPlans() {
    const res = await apiRequest<{ plans: any[] }>('/subscription/plans');
    return res.plans || [];
  },

  async getPaymentSettings(): Promise<SystemPaymentSettings> {
    const res = await apiRequest<{ settings: SystemPaymentSettings }>('/subscription/payment-settings');
    return res.settings;
  },

  async getMyStatus(): Promise<{
    subscriptionExpiresAt: number;
    isExpired: boolean;
    daysRemaining: number;
    msRemaining: number;
    hasPendingPayment: boolean;
    pendingPayment?: any;
    status: 'active' | 'expired' | 'pending_verification';
  }> {
    return apiRequest('/subscription/my-status');
  },

  async submitPayment(paymentData: Partial<PaymentRecord>): Promise<void> {
    await apiRequest('/subscription/submit-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  async getMyPayments(): Promise<PaymentRecord[]> {
    const res = await apiRequest<{ payments: PaymentRecord[] }>('/subscription/my-payments');
    return res.payments || [];
  },
};

// ---------------- SUPPORT API ----------------
export const supportApi = {
  async getMessages(): Promise<SupportMessage[]> {
    const res = await apiRequest<{ messages: SupportMessage[] }>('/support/messages');
    return res.messages || [];
  },

  async sendMessage(text: string): Promise<SupportMessage> {
    const res = await apiRequest<{ supportMessage: SupportMessage }>('/support/send', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return res.supportMessage;
  },
};

// ---------------- NOTIFICATIONS, ANNOUNCEMENTS, APP UPDATE ----------------
export const notificationApi = {
  async getNotifications(): Promise<AdminNotification[]> {
    try {
      const res = await apiRequest<{ notifications: AdminNotification[] }>('/notifications');
      return res.notifications || [];
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      return [];
    }
  },

  async sendNotification(notif: Partial<AdminNotification>): Promise<AdminNotification | null> {
    try {
      const res = await apiRequest<{ message: string; notification: AdminNotification }>('/notifications', {
        method: 'POST',
        body: JSON.stringify(notif),
      });
      return res.notification;
    } catch (err) {
      console.error('Failed to send notification:', err);
      return null;
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiRequest('/notifications/read-all', {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      await apiRequest(`/notifications/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  async getAnnouncements(): Promise<Announcement[]> {
    try {
      const res = await apiRequest<{ announcements: Announcement[] }>('/notifications/announcements');
      return res.announcements || [];
    } catch (err) {
      return [];
    }
  },

  async saveAnnouncement(ann: Partial<Announcement>): Promise<void> {
    try {
      await apiRequest('/notifications/announcements', {
        method: 'POST',
        body: JSON.stringify(ann),
      });
    } catch (err) {
      console.error('Failed to save announcement:', err);
    }
  },

  async deleteAnnouncement(id: string): Promise<void> {
    try {
      await apiRequest(`/notifications/announcements/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  },

  async getAppUpdate(): Promise<AppUpdateConfig> {
    const res = await apiRequest<{ config: AppUpdateConfig }>('/notifications/app-update');
    return res.config;
  },

  async saveAppUpdate(config: AppUpdateConfig): Promise<void> {
    await apiRequest('/notifications/app-update', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
};

// ---------------- ADMIN & STAFF API ----------------
export const adminApi = {
  async getUsers(): Promise<AppUser[]> {
    const res = await apiRequest<{ users: AppUser[] }>('/admin/users');
    return res.users || [];
  },

  async updateUser(userId: string, data: Partial<AppUser>): Promise<void> {
    await apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async extendSubscription(userId: string, days: number, planName?: string): Promise<void> {
    await apiRequest(`/admin/users/${userId}/extend-subscription`, {
      method: 'POST',
      body: JSON.stringify({ days, planName }),
    });
  },

  async deleteUser(userId: string): Promise<void> {
    await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  async getPayments(): Promise<PaymentRecord[]> {
    const res = await apiRequest<{ payments: PaymentRecord[] }>('/admin/payments');
    return res.payments || [];
  },

  async approvePayment(paymentId: string, adminNotes?: string): Promise<void> {
    await apiRequest(`/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    });
  },

  async rejectPayment(paymentId: string, rejectedReason?: string): Promise<void> {
    await apiRequest(`/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectedReason }),
    });
  },

  async getPaymentSettings(): Promise<SystemPaymentSettings> {
    const res = await apiRequest<{ settings: SystemPaymentSettings }>('/admin/payment-settings');
    return res.settings;
  },

  async updatePaymentSettings(settings: SystemPaymentSettings): Promise<void> {
    await apiRequest('/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getStaff(): Promise<StaffMember[]> {
    const res = await apiRequest<{ staff: StaffMember[] }>('/admin/staff');
    return res.staff || [];
  },

  async createStaff(staffData: Partial<StaffMember>): Promise<void> {
    await apiRequest('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },

  async updateStaff(staffId: string, staffData: Partial<StaffMember>): Promise<void> {
    await apiRequest(`/admin/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
  },

  async deleteStaff(staffId: string): Promise<void> {
    await apiRequest(`/admin/staff/${staffId}`, { method: 'DELETE' });
  },

  async getSupportThreads(): Promise<SupportThread[]> {
    const res = await apiRequest<{ threads: SupportThread[] }>('/admin/support/threads');
    return res.threads || [];
  },

  async getSupportMessages(userId: string): Promise<SupportMessage[]> {
    const res = await apiRequest<{ messages: SupportMessage[] }>(`/admin/support/${userId}/messages`);
    return res.messages || [];
  },

  async replySupport(userId: string, text: string): Promise<void> {
    await apiRequest('/admin/support/reply', {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    });
  },

  async getActivityLogs(): Promise<AdminActivityLog[]> {
    const res = await apiRequest<{ logs: AdminActivityLog[] }>('/admin/activity-logs');
    return res.logs || [];
  },
};
