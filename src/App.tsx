import React, { useState, useEffect, useRef } from 'react';
import {
  Customer,
  Transaction,
  CustomerFilter,
  StoreProfile,
  DailyExpense,
  CustomerCategory,
  PaymentMethod,
  InvoiceItem,
  Product,
  NavTab,
} from './types';
import {
  loadCustomers,
  saveCustomers,
  loadTransactions,
  saveTransactions,
  loadStoreProfile,
  saveStoreProfile,
  loadDailyExpenses,
  saveDailyExpenses,
  loadProducts,
  saveProducts,
  getTodayDateString,
  getCurrentTimeString,
  DEFAULT_STORE,
} from './utils/storage';
import {
  authApi,
  getAuthToken,
  getStoredUser,
  setStoredUser,
  customerApi,
  transactionApi,
  expenseApi,
  storeApi,
  productApi,
  notificationApi,
  subscriptionApi,
} from './services/apiService';
import {
  subscribeToStoreProfile,
  subscribeToCustomers,
  subscribeToTransactions,
  subscribeToExpenses,
  saveCustomerToCloud,
  deleteCustomerFromCloud,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  saveExpenseToCloud,
  deleteExpenseFromCloud,
  saveStoreProfileToCloud,
  syncAllToCloud,
} from './services/firestoreSync';
import { playPaymentChime, playSaleTone, triggerConfettiCelebration } from './utils/audio';

import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { PosSalesView } from './components/PosSalesView';
import { InventoryView } from './components/InventoryView';
import { CustomerList } from './components/CustomerList';
import { CustomerDetail } from './components/CustomerDetail';
import { CustomerModal, normalizePhoneNumber } from './components/CustomerModal';
import { TransactionModal } from './components/TransactionModal';
import { TagadaModal } from './components/TagadaModal';
import { ReportModal } from './components/ReportModal';
import { BackupModal } from './components/BackupModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { DailyCashbookModal } from './components/DailyCashbookModal';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { SalesHistoryModal } from './components/SalesHistoryModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AnnouncementDisplay } from './components/AnnouncementDisplay';
import { AppUpdateModal } from './components/AppUpdateModal';
import { UserSupportModal } from './components/support/UserSupportModal';
import { UserSubscriptionModal } from './components/UserSubscriptionModal';
import { SubscriptionLockScreen } from './components/SubscriptionLockScreen';
import { UserNotificationModal } from './components/UserNotificationModal';
import {
  subscribeToUserSupportMessages,
  subscribeToAnnouncements,
  subscribeToAppUpdateConfig,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  ADMIN_EMAIL,
} from './services/adminService';
import { SupportMessage, Announcement, AppUpdateConfig, AdminSession, AdminNotification } from './types/adminTypes';
import { Store, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [store, setStore] = useState<StoreProfile>(loadStoreProfile);
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>(loadTransactions);
  const [expenses, setExpenses] = useState<DailyExpense[]>(loadDailyExpenses);
  const [products, setProducts] = useState<Product[]>(loadProducts);

  // Active Bottom Tab State
  const [activeTab, setActiveTab] = useState<NavTab>('customers');

  // Authentication State: Mandatory Auth Gatekeeper
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('ibrahim_user_role') || 'প্রধান অ্যাডমিন: ইব্রাহিম';
  });
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'sale' | 'payment'>('sale');

  const [isTagadaModalOpen, setIsTagadaModalOpen] = useState(false);
  const [tagadaCustomer, setTagadaCustomer] = useState<Customer | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isCashbookModalOpen, setIsCashbookModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [userNotifications, setUserNotifications] = useState<AdminNotification[]>([]);
  const [userSupportMessages, setUserSupportMessages] = useState<SupportMessage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [appConfig, setAppConfig] = useState<AppUpdateConfig | null>(null);

  // POS Invoice Modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceTx, setInvoiceTx] = useState<Transaction | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);

  // Sales History & Transaction Edit Modal state
  const [isSalesHistoryModalOpen, setIsSalesHistoryModalOpen] = useState(false);
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingTxCustomer, setEditingTxCustomer] = useState<Customer | null>(null);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type?: 'danger' | 'warning' | 'info';
    action: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    action: () => {},
  });

  // Toast state
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);
  const isInitialSyncDone = useRef(false);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Load current user's specific data from PostgreSQL backend
  const loadUserAccountData = async (uid?: string) => {
    const user = getStoredUser();
    const userId = uid || user?.id || 'guest';
    try {
      const [storeData, custList, txMap, expList, prodList] = await Promise.all([
        storeApi.getProfile().catch(() => null),
        customerApi.getAll().catch(() => []),
        transactionApi.getAll().catch(() => ({ map: {} })),
        expenseApi.getAll().catch(() => []),
        productApi.getAll().catch(() => []),
      ]);

      if (storeData && storeData.name) {
        setStore(storeData);
        saveStoreProfile(storeData, userId);
      } else if (user?.shopName) {
        const customStore = {
          ...DEFAULT_STORE,
          name: user.shopName,
          owner: user.name || 'দোকানদার',
          phone: user.phone || '০১৭০০০০০০০০',
        };
        setStore(customStore);
        saveStoreProfile(customStore, userId);
      }

      const loadedCusts = Array.isArray(custList) ? custList : [];
      setCustomers(loadedCusts);
      saveCustomers(loadedCusts, userId);

      const loadedTxs = txMap && txMap.map ? txMap.map : {};
      setTransactions(loadedTxs);
      saveTransactions(loadedTxs, userId);

      const loadedExp = Array.isArray(expList) ? expList : [];
      setExpenses(loadedExp);
      saveDailyExpenses(loadedExp, userId);

      const loadedProds = Array.isArray(prodList) ? prodList : [];
      setProducts(loadedProds);
      saveProducts(loadedProds, userId);

      setIsCloudSynced(true);
    } catch (err) {
      console.warn('Failed to load user account data:', err);
    }
  };

  // Listen to Auth state via JWT session check & local session recovery
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        try {
          const res = await authApi.getCurrentUser().catch(() => null);
          const currentUser = res?.user || storedUser;

          if (currentUser) {
            setIsLoggedIn(true);
            localStorage.setItem('ibrahim_is_logged_in', 'true');

            // 👑 Distinguish Staff vs Super Admin vs Regular Store Owner
            if (
              currentUser.role === 'staff' ||
              currentUser.role === 'manager' ||
              (Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0)
            ) {
              setAdminSession({
                role: 'staff',
                email: currentUser.email,
                staffData: currentUser,
              });
              setUserRole('স্টাফ অ্যাকাউন্ট');
              setIsAdminPanelOpen(true);
            } else if (
              currentUser.role === 'super_admin' ||
              currentUser.email === ADMIN_EMAIL ||
              currentUser.email === 'siftibrahim@gmail.com'
            ) {
              setAdminSession({
                role: 'super_admin',
                email: currentUser.email,
              });
              setUserRole('প্রধান সুপার অ্যাডমিন');
              await loadUserAccountData(currentUser.id);
            } else {
              setUserRole('দোকান মালিক');
              await loadUserAccountData(currentUser.id);
            }
          } else {
            authApi.logout();
            setIsLoggedIn(false);
            setAdminSession(null);
            setIsAdminPanelOpen(false);
          }
        } catch (err) {
          console.warn('Auth check catch:', err);
          authApi.logout();
          setIsLoggedIn(false);
          setAdminSession(null);
          setIsAdminPanelOpen(false);
        }
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('ibrahim_is_logged_in');
        localStorage.removeItem('ibrahim_user_role');
        setAdminSession(null);
        setIsAdminPanelOpen(false);
      }
      setIsAuthChecking(false);
    };
    checkAuth();
  }, []);

  // Save to LocalStorage as instant local cache
  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoreProfile(store);
  }, [store]);

  useEffect(() => {
    saveDailyExpenses(expenses);
  }, [expenses]);

  // Real-time PostgreSQL Backend Subscriptions (Scoped to Authenticated User)
  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. Subscribe to Store Profile
    const unsubStore = subscribeToStoreProfile(
      (cloudProfile) => {
        if (cloudProfile && cloudProfile.name) {
          setStore((prev) => ({ ...prev, ...cloudProfile }));
          setIsCloudSynced(true);
        }
      },
      () => setIsCloudSynced(false)
    );

    // 2. Subscribe to Customers (Strict per-user data)
    const unsubCustomers = subscribeToCustomers(
      (cloudCustomers) => {
        setCustomers(cloudCustomers || []);
        setIsCloudSynced(true);
      },
      () => setIsCloudSynced(false)
    );

    // 3. Subscribe to Transactions (Strict per-user data)
    const unsubTransactions = subscribeToTransactions(
      (cloudTxs) => {
        setTransactions(cloudTxs || {});
        setIsCloudSynced(true);
      },
      () => setIsCloudSynced(false)
    );

    // 4. Subscribe to Daily Expenses
    const unsubExpenses = subscribeToExpenses(
      (cloudExpenses) => {
        setExpenses(cloudExpenses || []);
        setIsCloudSynced(true);
      },
      () => setIsCloudSynced(false)
    );

    return () => {
      unsubStore();
      unsubCustomers();
      unsubTransactions();
      unsubExpenses();
    };
  }, [isLoggedIn]);

  const currentUserId = store.id || getStoredUser()?.id || 'usr_1';

  // Support messages, announcements, app update and notification polling
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubSupport = subscribeToUserSupportMessages(currentUserId, (msgs) => {
      setUserSupportMessages(msgs);
    });
    const unsubAnnouncements = subscribeToAnnouncements((anns) => {
      setAnnouncements(anns);
    });
    const unsubAppConfig = subscribeToAppUpdateConfig((cfg) => {
      if (cfg) setAppConfig(cfg);
    });

    const fetchNotifs = async () => {
      try {
        const notifs = await notificationApi.getNotifications();
        if (Array.isArray(notifs)) {
          setUserNotifications(notifs);
        }
      } catch (err) {
        console.warn('Notification fetch error:', err);
      }
    };
    fetchNotifs();
    const notifInterval = setInterval(fetchNotifs, 8000);

    // Initial subscription status check and periodic refresh
    handleRefreshSubscriptionStatus();
    const subCheckInterval = setInterval(handleRefreshSubscriptionStatus, 15000);

    return () => {
      unsubSupport();
      unsubAnnouncements();
      unsubAppConfig();
      clearInterval(notifInterval);
      clearInterval(subCheckInterval);
    };
  }, [isLoggedIn, currentUserId]);

  const unreadNotificationsCount = userNotifications.filter((n) => !n.isRead).length;

  const unreadSupportRepliesCount = userSupportMessages.filter(
    (m) => m.sender === 'admin' && !m.isReadByUser
  ).length;

  const handleLoginSuccess = async (email: string, roleName: string) => {
    setIsLoggedIn(true);
    const user = getStoredUser();
    if (roleName === 'staff' || user?.role === 'staff' || user?.role === 'manager' || (Array.isArray(user?.permissions) && user.permissions.length > 0)) {
      setUserRole('স্টাফ অ্যাকাউন্ট');
      setAdminSession({
        role: 'staff',
        email,
        staffData: user,
      });
      setIsAdminPanelOpen(true);
      showToast(`👋 স্বাগতম ${user?.name || 'স্টাফ মেম্বার'}!`);
      return;
    }

    if (user?.id) {
      await loadUserAccountData(user.id);
    }
    const isSuper = roleName === 'super_admin' || email === ADMIN_EMAIL || user?.role === 'super_admin';
    const resolvedRole = isSuper ? 'প্রধান সুপার অ্যাডমিন' : 'দোকান মালিক';
    setUserRole(resolvedRole);
    localStorage.setItem('ibrahim_is_logged_in', 'true');
    localStorage.setItem('ibrahim_user_role', resolvedRole);
    showToast('☁️ আপনার দোকানে সফলভাবে লগইন হয়েছে!');
  };

  // Perform Log Out with confirmation and clear state
  const handleLogout = async () => {
    try {
      authApi.logout();
    } catch (err) {
      console.warn('SignOut error:', err);
    }
    setIsLoggedIn(false);
    localStorage.removeItem('ibrahim_is_logged_in');
    localStorage.removeItem('ibrahim_user_role');
    setCustomers([]);
    setTransactions({});
    setExpenses([]);
    setProducts([]);
    setStore(DEFAULT_STORE);
    setActiveCustomerId(null);
    setIsAdminPanelOpen(false);
    setAdminSession(null);
    setIsSettingsModalOpen(false);
    setIsAdminLoginModalOpen(false);
    setIsSupportModalOpen(false);
    setIsSubscriptionModalOpen(false);
    setIsNotificationModalOpen(false);
    setIsAnalyticsModalOpen(false);
    setIsCashbookModalOpen(false);
    setIsInvoiceModalOpen(false);
    setIsSalesHistoryModalOpen(false);
    setIsEditTxModalOpen(false);
    setIsCustomerModalOpen(false);
    setIsTxModalOpen(false);
    setIsTagadaModalOpen(false);
    setIsReportModalOpen(false);
    setIsBackupModalOpen(false);
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    showToast('✅ সফলভাবে লগআউট করা হয়েছে!');
  };

  const triggerLogoutConfirm = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'লগআউট নিশ্চিতকরণ',
      message: 'আপনি কি নিশ্চিত যে খাতা অ্যাপ থেকে সম্পূর্ণ লগআউট করতে চান?',
      confirmText: 'হ্যাঁ, লগআউট করুন',
      type: 'danger',
      action: handleLogout,
    });
  };

  const currentUser = getStoredUser();
  const isSuperAdmin = userRole === 'প্রধান সুপার অ্যাডমিন' || currentUser?.role === 'super_admin' || currentUser?.email === ADMIN_EMAIL;
  const isStaffMember = userRole === 'স্টাফ অ্যাকাউন্ট' || currentUser?.role === 'staff' || currentUser?.role === 'manager';
  const userSubExpiry = (store as any)?.subscriptionExpiresAt || (currentUser as any)?.subscriptionExpiresAt;
  const isSubscriptionExpired = !isSuperAdmin && !isStaffMember && userSubExpiry && Number(userSubExpiry) < Date.now();

  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    hasPending: boolean;
    record: any;
  }>({ hasPending: false, record: null });

  const handleRefreshSubscriptionStatus = async () => {
    try {
      const statusData: any = await subscriptionApi.getMyStatus();
      if (statusData) {
        if (statusData.subscriptionExpiresAt) {
          setStore((prev) => ({
            ...prev,
            subscriptionExpiresAt: statusData.subscriptionExpiresAt,
            subscriptionPlan: statusData.subscriptionPlan || (prev as any)?.subscriptionPlan,
            subscriptionStatus: statusData.subscriptionStatus || (prev as any)?.subscriptionStatus,
          }));
          
          const curU = getStoredUser();
          if (curU) {
            setStoredUser({
              ...curU,
              subscriptionExpiresAt: statusData.subscriptionExpiresAt,
              subscriptionPlan: statusData.subscriptionPlan || curU.subscriptionPlan,
              subscriptionStatus: statusData.subscriptionStatus || curU.subscriptionStatus,
            });
          }
        }
        setPendingPaymentInfo({
          hasPending: Boolean(statusData.hasPendingPayment),
          record: statusData.pendingPayment || null,
        });
      }
    } catch (err) {
      console.warn('Status refresh error:', err);
    }
  };

  const activeCustomer = customers.find((c) => c.id === activeCustomerId) || null;
  const activeTxList = activeCustomerId ? transactions[activeCustomerId] || [] : [];

  // Reset to default demo data
  const triggerResetConfirm = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'ডাটা রিসেট নিশ্চিতকরণ',
      message: 'আপনি কি নিশ্চিত যে ডেমো ডাটা রিসেট করতে চান? এটি ক্লাউড ডাটাবেজেও রিসেট হবে।',
      confirmText: 'হ্যাঁ, রিসেট করুন',
      type: 'warning',
      action: async () => {
        const defaultCusts = loadCustomers();
        const defaultTxs = loadTransactions();
        const defaultExp = loadDailyExpenses();
        setStore(DEFAULT_STORE);
        setCustomers(defaultCusts);
        setTransactions(defaultTxs);
        setExpenses(defaultExp);
        setActiveCustomerId(null);
        await syncAllToCloud(DEFAULT_STORE, defaultCusts, defaultTxs, defaultExp);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        showToast('ডাটা সফলভাবে রিসেট ও ক্লাউডে সিঙ্ক হয়েছে!');
      },
    });
  };

  // Customer handlers
  const handleSaveCustomer = async (data: {
    name: string;
    phone: string;
    address: string;
    openingBalance: number;
    category?: CustomerCategory;
    creditLimit?: number;
    notes?: string;
  }) => {
    const rawPhone = data.phone?.trim() || '';
    if (rawPhone) {
      const normPhone = normalizePhoneNumber(rawPhone);
      const duplicate = customers.find((c) => {
        if (editingCustomer && c.id === editingCustomer.id) return false;
        const cNorm = normalizePhoneNumber(c.phone || '');
        return cNorm.length >= 6 && cNorm === normPhone;
      });

      if (duplicate) {
        showToast(`⚠️ এই মোবাইল নম্বর দিয়ে (${duplicate.name}) ইতিমধ্যে একজন কাস্টমার আছেন!`);
        return;
      }
    }

    if (editingCustomer) {
      const updatedCust: Customer = {
        ...editingCustomer,
        name: data.name.trim(),
        phone: rawPhone,
        address: data.address.trim(),
        category: data.category || 'regular',
        creditLimit: data.creditLimit || store.defaultCreditLimit || 10000,
        notes: data.notes?.trim() || '',
        updatedAt: Date.now(),
      };
      setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? updatedCust : c)));
      await saveCustomerToCloud(updatedCust);
      showToast('কাস্টমার তথ্য ক্লাউডে আপডেট হয়েছে!');
    } else {
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const newId = `cust_${Date.now()}_${uniqueSuffix}`;
      const newCust: Customer = {
        id: newId,
        name: data.name.trim(),
        phone: rawPhone,
        address: data.address.trim(),
        balance: data.openingBalance || 0,
        category: data.category || 'regular',
        creditLimit: data.creditLimit || store.defaultCreditLimit || 10000,
        notes: data.notes?.trim() || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setCustomers((prev) => [newCust, ...prev]);
      await saveCustomerToCloud(newCust);

      if (data.openingBalance > 0) {
        const openingTx: Transaction = {
          id: `tx_${Date.now()}_${uniqueSuffix}`,
          customerId: newId,
          type: 'sale',
          amount: data.openingBalance,
          description: 'পূর্বের বাকি (প্রারম্ভিক জের)',
          date: getTodayDateString(),
          time: getCurrentTimeString(),
          balanceAfter: data.openingBalance,
          createdAt: Date.now(),
        };
        setTransactions((prev) => ({
          ...prev,
          [newId]: [openingTx],
        }));
        await saveTransactionToCloud(openingTx);
      }

      showToast('নতুন কাস্টমার ক্লাউডে সফলভাবে যুক্ত হয়েছে!');
    }

    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const triggerDeleteCustomerConfirm = () => {
    if (!activeCustomerId || !activeCustomer) return;
    setConfirmConfig({
      isOpen: true,
      title: 'কাস্টমার মুছে ফেলার নিশ্চিতকরণ',
      message: `আপনি কি নিশ্চিত "${activeCustomer.name}" এবং তার সমস্ত লেনদেনের হিসাব মুছে ফেলতে চান?`,
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      type: 'danger',
      action: async () => {
        const targetId = activeCustomerId;
        setCustomers((prev) => prev.filter((c) => c.id !== targetId));
        setTransactions((prev) => {
          const copy = { ...prev };
          delete copy[targetId];
          return copy;
        });
        setActiveCustomerId(null);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        await deleteCustomerFromCloud(targetId);
        showToast('কাস্টমার ক্লাউড থেকে মুছে ফেলা হয়েছে!');
      },
    });
  };

  // Transaction handlers (Sale = Dilam, Payment = Pelam)
  const handleSaveTransaction = async (data: {
    amount: number;
    description: string;
    date: string;
    paymentMethod?: PaymentMethod;
    items?: InvoiceItem[];
  }) => {
    if (!activeCustomerId || !activeCustomer) return;

    const currentBal = Number(activeCustomer.balance || 0);
    const newBal = txType === 'sale' ? currentBal + data.amount : currentBal - data.amount;

    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      customerId: activeCustomerId,
      type: txType,
      amount: data.amount,
      description: data.description,
      date: data.date,
      time: getCurrentTimeString(),
      balanceAfter: newBal,
      paymentMethod: data.paymentMethod || 'cash',
      items: data.items,
      createdAt: Date.now(),
    };

    const updatedCustomer: Customer = {
      ...activeCustomer,
      balance: newBal,
      updatedAt: Date.now(),
    };

    // Update local state
    setCustomers((prev) =>
      prev.map((c) => (c.id === activeCustomerId ? updatedCustomer : c))
    );

    setTransactions((prev) => ({
      ...prev,
      [activeCustomerId]: [newTx, ...(prev[activeCustomerId] || [])],
    }));

    setIsTxModalOpen(false);

    // Audio Feedback
    if (store.enableSoundEffects !== false) {
      if (txType === 'payment') {
        playPaymentChime();
        if (newBal <= 0) {
          triggerConfettiCelebration();
        }
      } else {
        playSaleTone();
      }
    }

    // Sync to Firebase Cloud
    await Promise.all([
      saveTransactionToCloud(newTx),
      saveCustomerToCloud(updatedCustomer),
    ]);

    showToast(
      txType === 'sale'
        ? '৳ বাকি হিসাব ক্লাউডে যোগ হয়েছে!'
        : '৳ টাকা জমা ক্লাউডে সংরক্ষিত হয়েছে!'
    );
  };

  const triggerDeleteTransactionConfirm = (txId: string, customCustId?: string) => {
    const targetCustId = customCustId || activeCustomerId;
    const targetCustomer = customers.find((c) => c.id === targetCustId) || activeCustomer;
    if (!targetCustId || !targetCustomer) return;

    setConfirmConfig({
      isOpen: true,
      title: 'লেনদেন মুছে ফেলা',
      message: 'আপনি কি এই লেনদেনটি বাতিল বা মুছে ফেলতে চান?',
      confirmText: 'হ্যাঁ, মুছুন',
      type: 'danger',
      action: async () => {
        const txList = transactions[targetCustId] || [];
        const targetTx = txList.find((t) => t.id === txId);
        if (!targetTx) return;

        const oldDueEffect =
          targetTx.type === 'sale'
            ? (targetTx.dueAmount !== undefined ? Number(targetTx.dueAmount) : Number(targetTx.amount))
            : -Number(targetTx.amount);

        const newBal = Number(targetCustomer.balance || 0) - oldDueEffect;

        const updatedCustomer: Customer = {
          ...targetCustomer,
          balance: newBal,
          updatedAt: Date.now(),
        };

        setCustomers((prev) =>
          prev.map((c) => (c.id === targetCustId ? updatedCustomer : c))
        );

        setTransactions((prev) => ({
          ...prev,
          [targetCustId]: (prev[targetCustId] || []).filter((t) => t.id !== txId),
        }));

        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

        await Promise.all([
          deleteTransactionFromCloud(txId),
          saveCustomerToCloud(updatedCustomer),
        ]);

        showToast('লেনদেন সফলভাবে মুছে ফেলা হয়েছে!');
      },
    });
  };

  // Open Edit Transaction Modal
  const handleOpenEditTransaction = (tx: Transaction, customCust?: Customer) => {
    const cust =
      customCust ||
      customers.find((c) => c.id === tx.customerId) ||
      activeCustomer || {
        id: tx.customerId,
        name: 'খুচরা খরিদ্দার',
        phone: '',
        address: 'দোকান কাউন্টার',
        balance: 0,
        category: 'retail' as CustomerCategory,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    setEditingTx(tx);
    setEditingTxCustomer(cust);
    setIsEditTxModalOpen(true);
  };

  // Save edited transaction and adjust balance
  const handleSaveEditedTransaction = async (
    updatedTx: Transaction,
    oldTransaction: Transaction
  ) => {
    const customerId = updatedTx.customerId;
    const cust =
      customers.find((c) => c.id === customerId) ||
      editingTxCustomer || {
        id: customerId,
        name: 'খুচরা খরিদ্দার',
        phone: '',
        address: 'দোকান কাউন্টার',
        balance: 0,
        category: 'retail' as CustomerCategory,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

    const currentBal = Number(cust.balance || 0);

    // Calculate exact old balance impact
    const oldDueEffect =
      oldTransaction.type === 'sale'
        ? (oldTransaction.dueAmount !== undefined ? Number(oldTransaction.dueAmount) : Number(oldTransaction.amount))
        : -Number(oldTransaction.amount);

    // Customer balance without the old transaction
    const balWithoutOld = currentBal - oldDueEffect;

    // Calculate new transaction impact
    const newDueEffect =
      updatedTx.type === 'sale'
        ? (updatedTx.dueAmount !== undefined ? Number(updatedTx.dueAmount) : Number(updatedTx.amount))
        : -Number(updatedTx.amount);

    const newBal = balWithoutOld + newDueEffect;

    const finalTx: Transaction = {
      ...updatedTx,
      balanceAfter: newBal,
    };

    const updatedCustomer: Customer = {
      ...cust,
      balance: newBal,
      updatedAt: Date.now(),
    };

    // Update transactions list
    const currentList = transactions[customerId] || [];
    const updatedList = currentList.map((t) => (t.id === finalTx.id ? finalTx : t));

    const newTransactions = {
      ...transactions,
      [customerId]: updatedList,
    };

    const newCustomers = customers.map((c) => (c.id === customerId ? updatedCustomer : c));

    setTransactions(newTransactions);
    setCustomers(newCustomers);
    saveTransactions(newTransactions);
    saveCustomers(newCustomers);

    await Promise.all([
      saveTransactionToCloud(finalTx),
      saveCustomerToCloud(updatedCustomer),
    ]);

    showToast('লেনদেন ও কাস্টমার ব্যালেন্স সফলভাবে সংশোধন করা হয়েছে!');
  };

  // Daily Expense Handlers
  const handleAddExpense = async (expenseData: DailyExpense | Omit<DailyExpense, 'id' | 'createdAt'>) => {
    const newExp: DailyExpense = 'id' in expenseData
      ? expenseData
      : {
          ...expenseData,
          id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: Date.now(),
        };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveDailyExpenses(updated);
    await saveExpenseToCloud(newExp);
    showToast(newExp.type === 'expense' ? 'দোকান খরচ যুক্ত হয়েছে!' : 'অন্যান্য আয় যুক্ত হয়েছে!');
  };

  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveDailyExpenses(updated);
    await deleteExpenseFromCloud(id);
    showToast('ক্যাশ খাতা থেকে এন্ট্রি মুছে ফেলা হয়েছে!');
  };

  // Open POS Digital Invoice Modal for a transaction
  const handleOpenInvoice = (tx: Transaction, customCust?: Customer) => {
    const cust = customCust || customers.find((c) => c.id === tx.customerId) || activeCustomer;
    setInvoiceTx(tx);
    setInvoiceCustomer(cust);
    setIsInvoiceModalOpen(true);
  };

  // Product Management Handlers
  const handleAddProduct = (prod: Product) => {
    const updated = [prod, ...products];
    setProducts(updated);
    saveProducts(updated);
  };

  const handleUpdateProduct = (prod: Product) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    saveProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'পণ্য মুছে ফেলতে চান?',
      message: 'এই পণ্যটি তালিকা থেকে স্থায়ীভাবে মুছে ফেলা হবে।',
      confirmText: 'হ্যাঁ, মুছুন',
      type: 'danger',
      action: () => {
        const updated = products.filter((p) => p.id !== id);
        setProducts(updated);
        saveProducts(updated);
        showToast('পণ্য মুছে ফেলা হয়েছে!');
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // POS Complete Sale Handler
  const handleCompletePosSale = async (params: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    items: InvoiceItem[];
    totalAmount: number;
    discount: number;
    netAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
  }) => {
    let targetCustId = params.customerId;
    const now = Date.now();
    const today = getTodayDateString();
    const time = getCurrentTimeString();
    let currentCusts = [...customers];

    if (!targetCustId) {
      // Check if phone matches an existing customer in customer list
      const normPhone = normalizePhoneNumber(params.customerPhone || '');
      const existingCust = normPhone.length === 11
        ? currentCusts.find((c) => normalizePhoneNumber(c.phone || '') === normPhone && c.id !== 'cust_counter_cash')
        : undefined;

      if (existingCust) {
        targetCustId = existingCust.id;
      } else if (params.dueAmount > 0) {
        // Automatically create and add new customer to the due customer list only if there is dueAmount
        const custNameClean = params.customerName && params.customerName !== 'খুচরা খরিদ্দার' && params.customerName !== 'নগদ খরিদ্দার'
          ? params.customerName.trim()
          : 'নতুন বাকি কাস্টমার';
        const newCust: Customer = {
          id: `cust_${now}`,
          name: custNameClean,
          phone: params.customerPhone ? params.customerPhone.trim() : '',
          address: 'দোকান কাউন্টার',
          balance: 0, // will be incremented below with saleTx
          category: 'regular',
          createdAt: now,
          updatedAt: now,
        };
        targetCustId = newCust.id;
        currentCusts = [newCust, ...currentCusts];
      } else {
        // 100% Cash Counter Sale (পরিশোধিত খুচরা বিক্রি): do NOT add to customer list.
        // Record with a virtual/system counter ID for transaction history and receipt printing
        targetCustId = 'cust_counter_cash';
      }
    }

    if (targetCustId) {
      const isCounterSaleWithoutDue = targetCustId === 'cust_counter_cash' && params.dueAmount <= 0;
      const cust = currentCusts.find((c) => c.id === targetCustId);
      const prevBal = Number(cust?.balance || 0);
      const newBal = prevBal + params.dueAmount;

      const saleTx: Transaction = {
        id: `tx_${now}`,
        customerId: targetCustId,
        type: 'sale',
        amount: params.netAmount,
        subtotal: params.totalAmount,
        discount: params.discount,
        netAmount: params.netAmount,
        paidAmount: params.paidAmount,
        dueAmount: params.dueAmount,
        prevBalance: prevBal,
        description: `পিওএস বিক্রি (${params.items.length} পণ্য)`,
        date: today,
        time,
        balanceAfter: newBal,
        createdAt: now,
        items: params.items,
        paymentMethod: params.paymentMethod,
        receiptNo: `INV-${now.toString().slice(-6)}`,
      };

      let newTxList = [...(transactions[targetCustId] || []), saleTx];

      if (params.paidAmount > 0) {
        const payTx: Transaction = {
          id: `tx_${now + 1}`,
          customerId: targetCustId,
          type: 'payment',
          amount: params.paidAmount,
          description: `নগদ জমা (মেমো #${saleTx.receiptNo})`,
          date: today,
          time,
          balanceAfter: newBal,
          createdAt: now + 1,
          paymentMethod: params.paymentMethod,
        };
        newTxList.push(payTx);
        await saveTransactionToCloud(payTx);
      }

      await saveTransactionToCloud(saleTx);

      const updatedTxs = { ...transactions, [targetCustId]: newTxList };
      setTransactions(updatedTxs);
      saveTransactions(updatedTxs);

      // Only save to customer list and cloud if this is NOT a cash counter sale or if it's a real customer
      if (!isCounterSaleWithoutDue) {
        const updatedCustomers = currentCusts.map((c) =>
          c.id === targetCustId ? { ...c, balance: newBal, updatedAt: now } : c
        );
        setCustomers(updatedCustomers);
        saveCustomers(updatedCustomers);

        const updatedRecord = updatedCustomers.find((c) => c.id === targetCustId);
        if (updatedRecord) {
          await saveCustomerToCloud(updatedRecord);
        }
      }
    }

    if (store.enableSoundEffects) {
      playSaleTone();
    }
  };

  // Restore backup and push to Cloud
  const handleRestoreData = async (
    newCustomers: Customer[],
    newTxs: Record<string, Transaction[]>,
    newExpenses?: DailyExpense[]
  ) => {
    setCustomers(newCustomers);
    setTransactions(newTxs);
    if (newExpenses) {
      setExpenses(newExpenses);
    }
    setActiveCustomerId(null);
    await syncAllToCloud(store, newCustomers, newTxs, newExpenses || expenses);
    showToast('ব্যাকআপ সফলভাবে ক্লাউডে সিঙ্ক হয়েছে!');
  };

  const handleSaveStore = async (updatedStore: StoreProfile) => {
    setStore(updatedStore);
    saveStoreProfile(updatedStore);
    await saveStoreProfileToCloud(updatedStore);
    showToast('দোকানের সেটিংস ক্লাউডে সংরক্ষিত হয়েছে!');
  };

  if (isAuthChecking) {
    return (
      <div className="w-full h-[100dvh] bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white p-7 rounded-3xl shadow-xl border border-slate-200 text-center flex flex-col items-center gap-3 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[#004D40] text-white flex items-center justify-center shadow-lg font-black text-2xl border-2 border-teal-600">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{store.name}</h2>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 mt-2 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200">
            <Loader2 className="w-4 h-4 animate-spin text-[#004D40]" />
            <span>নিরাপত্তা যাচাই করা হচ্ছে...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-2 md:p-4 text-slate-800 font-sans antialiased overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm pointer-events-none flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900/95 text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-xl text-center border border-slate-700 animate-in fade-in slide-in-from-top-2"
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-4xl h-full flex flex-col bg-white sm:rounded-3xl shadow-xl sm:border sm:border-slate-200/80 overflow-hidden relative">
        {!isLoggedIn ? (
          <AuthScreen
            store={store}
            onLoginSuccess={handleLoginSuccess}
            onAdminLoginSuccess={(adminEmail, session) => {
              handleLoginSuccess(adminEmail, session?.role === 'staff' ? 'staff' : 'admin');
              setAdminSession(session || { role: 'super_admin', email: adminEmail });
              setIsAdminPanelOpen(true);
            }}
          />
        ) : (
          <>
            {/* Header Navbar: Store Name, Phone, Settings and Logout */}
            <Navbar
              store={store}
              onLogout={triggerLogoutConfirm}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenNotifications={() => setIsNotificationModalOpen(true)}
              onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
            />

            {/* In-app Announcement Ticker & Popups */}
            <AnnouncementDisplay announcements={announcements} />

            {/* View Switching or Subscription Lock Screen */}
            {isSubscriptionExpired ? (
              <SubscriptionLockScreen
                store={store}
                hasPendingPayment={pendingPaymentInfo.hasPending}
                pendingPayment={pendingPaymentInfo.record}
                onOpenRenewModal={() => setIsSubscriptionModalOpen(true)}
                onRefreshStatus={handleRefreshSubscriptionStatus}
                onLogout={triggerLogoutConfirm}
                onOpenSupport={() => setIsSupportModalOpen(true)}
              />
            ) : activeCustomerId && activeCustomer ? (
              <CustomerDetail
                customer={activeCustomer}
                transactions={activeTxList}
                onBack={() => setActiveCustomerId(null)}
                onOpenTransaction={(type) => {
                  setTxType(type);
                  setIsTxModalOpen(true);
                }}
                onOpenEditCustomer={() => {
                  setEditingCustomer(activeCustomer);
                  setIsCustomerModalOpen(true);
                }}
                onOpenNewCustomer={() => {
                  setEditingCustomer(null);
                  setIsCustomerModalOpen(true);
                }}
                onDeleteCustomer={triggerDeleteCustomerConfirm}
                onDeleteTransaction={triggerDeleteTransactionConfirm}
                onEditTransaction={(tx) => handleOpenEditTransaction(tx, activeCustomer)}
                onOpenTagada={() => {
                  setTagadaCustomer(activeCustomer);
                  setIsTagadaModalOpen(true);
                }}
                onOpenReport={() => setIsReportModalOpen(true)}
                onOpenInvoice={handleOpenInvoice}
              />
            ) : (
              <main
                id="main-scroll-container"
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50/70 p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 smooth-scroll-container pb-3 sm:pb-4"
              >
                {activeTab === 'dashboard' && (
                  <DashboardView
                    customers={customers}
                    transactions={transactions}
                    store={store}
                    onOpenNewCustomer={() => {
                      setEditingCustomer(null);
                      setIsCustomerModalOpen(true);
                    }}
                    onNavigateToTab={(tab) => {
                      setActiveCustomerId(null);
                      if (tab === 'cashbook') {
                        setIsCashbookModalOpen(true);
                      } else {
                        setActiveTab(tab);
                      }
                    }}
                    onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
                    onOpenCashbook={() => setIsCashbookModalOpen(true)}
                    onOpenReport={() => setIsReportModalOpen(true)}
                    onOpenSalesHistory={() => setIsSalesHistoryModalOpen(true)}
                    onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                    pendingPaymentInfo={pendingPaymentInfo}
                    onRefreshSubscriptionStatus={handleRefreshSubscriptionStatus}
                    onSelectCustomer={(id) => setActiveCustomerId(id)}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerList
                    customers={customers}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filter={filter}
                    onFilterChange={setFilter}
                    onSelectCustomer={(id) => setActiveCustomerId(id)}
                    onOpenNewCustomer={() => {
                      setEditingCustomer(null);
                      setIsCustomerModalOpen(true);
                    }}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onOpenReport={() => setIsReportModalOpen(true)}
                    onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
                    onOpenCashbook={() => setIsCashbookModalOpen(true)}
                    highDueLimit={store.highDueLimit}
                    onQuickTagada={(e, c) => {
                      e.stopPropagation();
                      setTagadaCustomer(c);
                      setIsTagadaModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'pos' && (
                  <PosSalesView
                    customers={customers}
                    products={products}
                    store={store}
                    onCompleteSale={handleCompletePosSale}
                    onOpenSalesHistory={() => setIsSalesHistoryModalOpen(true)}
                    onOpenInvoiceModal={(data) => {
                      const finalCustomerBal =
                        data.customerBalanceAfter !== undefined
                          ? data.customerBalanceAfter
                          : (data.prevBalance || 0) + data.dueAmount;

                      setInvoiceTx({
                        id: `tx_${Date.now()}`,
                        customerId: data.customerId || 'pos_instant',
                        type: 'sale',
                        amount: data.netAmount,
                        description: 'পিওএস বিক্রয়',
                        subtotal: data.totalAmount,
                        discount: data.discount,
                        netAmount: data.netAmount,
                        paidAmount: data.paidAmount,
                        dueAmount: data.dueAmount,
                        prevBalance: data.prevBalance || 0,
                        date: data.date,
                        time: data.time,
                        balanceAfter: finalCustomerBal,
                        createdAt: Date.now(),
                        items: data.items,
                        receiptNo: data.receiptNo,
                        paymentMethod: data.paymentMethod,
                      });
                      setInvoiceCustomer({
                        id: data.customerId || 'pos_instant',
                        name: data.customerName,
                        phone: data.customerPhone,
                        address: data.customerAddress,
                        balance: finalCustomerBal,
                        category: 'retail',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                      setIsInvoiceModalOpen(true);
                    }}
                    onShowToast={showToast}
                  />
                )}

                {activeTab === 'inventory' && (
                  <InventoryView
                    products={products}
                    store={store}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onShowToast={showToast}
                  />
                )}
              </main>
            )}

            {/* Bottom Navigation Bar */}
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveCustomerId(null);
                if (tab === 'support') {
                  setIsSupportModalOpen(true);
                } else if (tab === 'cashbook') {
                  setIsCashbookModalOpen(true);
                } else {
                  setActiveTab(tab);
                }
              }}
              customerDueCount={customers.filter((c) => Number(c.balance || 0) > 0).length}
              lowStockCount={products.filter((p) => Number(p.stock || 0) <= Number(p.minStock || 5)).length}
              unreadSupportCount={unreadSupportRepliesCount}
              onOpenSupport={() => setIsSupportModalOpen(true)}
            />
          </>
        )}
      </div>

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        editCustomer={editingCustomer}
        existingCustomers={customers}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
      />

      {/* Transaction Entry Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        type={txType}
        customer={activeCustomer}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
      />

      {/* Quick Tagada SMS/WhatsApp Modal */}
      <TagadaModal
        isOpen={isTagadaModalOpen}
        customer={tagadaCustomer}
        store={store}
        onClose={() => {
          setIsTagadaModalOpen(false);
          setTagadaCustomer(null);
        }}
        onShowToast={showToast}
      />

      {/* General Ledger Statement Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        customer={activeCustomer}
        transactions={activeTxList}
        store={store}
        onClose={() => setIsReportModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Backup Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        customers={customers}
        transactions={transactions}
        store={store}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreData={handleRestoreData}
        onShowToast={showToast}
      />

      {/* Comprehensive Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        store={store}
        customers={customers}
        transactions={transactions}
        expenses={expenses}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveStore={handleSaveStore}
        onRestoreData={handleRestoreData}
        onResetData={triggerResetConfirm}
        onShowToast={showToast}
        onOpenAdmin={() => {
          const u = getStoredUser();
          if (u?.role === 'super_admin' || u?.email === ADMIN_EMAIL) {
            setIsAdminLoginModalOpen(true);
          } else {
            showToast('⚠️ শুধুমাত্র সুপার অ্যাডমিনের এই প্যানেলে প্রবেশের অনুমতি রয়েছে।');
          }
        }}
        onOpenSupport={() => setIsSupportModalOpen(true)}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />

      {/* Admin Login & PIN Verification Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onAdminAuthenticated={(session) => {
          setAdminSession(session || { role: 'super_admin', email: ADMIN_EMAIL });
          setIsAdminPanelOpen(true);
        }}
        onShowToast={showToast}
      />

      {/* User Support & Direct Help Desk Modal */}
      <UserSupportModal
        isOpen={isSupportModalOpen}
        store={store}
        onClose={() => setIsSupportModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Version 2.0: Interactive Financial Analytics Dashboard */}
      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        customers={customers}
        transactions={transactions}
        expenses={expenses}
        store={store}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      {/* Version 2.0: Daily Cashbook & Store Expense Drawer */}
      <DailyCashbookModal
        isOpen={isCashbookModalOpen}
        expenses={expenses}
        transactions={transactions}
        store={store}
        onClose={() => setIsCashbookModalOpen(false)}
        onAddExpense={handleAddExpense}
        onDeleteExpense={handleDeleteExpense}
        onShowToast={showToast}
      />

      {/* Version 2.0: Digital Invoice & POS Thermal Slip Modal */}
      <InvoicePrintModal
        isOpen={isInvoiceModalOpen}
        customer={invoiceCustomer}
        transaction={invoiceTx}
        store={store}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceTx(null);
          setInvoiceCustomer(null);
        }}
        onShowToast={showToast}
      />

      {/* Complete Sales & Payment History Modal */}
      <SalesHistoryModal
        isOpen={isSalesHistoryModalOpen}
        customers={customers}
        transactions={transactions}
        store={store}
        onClose={() => setIsSalesHistoryModalOpen(false)}
        onOpenInvoice={handleOpenInvoice}
        onOpenEditTransaction={(tx, cust) => handleOpenEditTransaction(tx, cust)}
        onDeleteTransaction={(txId, custId) => triggerDeleteTransactionConfirm(txId, custId)}
        onShowToast={showToast}
      />

      {/* Direct Transaction / Memo Edit & Correction Modal */}
      <EditTransactionModal
        isOpen={isEditTxModalOpen}
        transaction={editingTx}
        customer={editingTxCustomer}
        currencySymbol={store.currencySymbol || '৳'}
        onClose={() => {
          setIsEditTxModalOpen(false);
          setEditingTx(null);
          setEditingTxCustomer(null);
        }}
        onSave={handleSaveEditedTransaction}
        onDelete={(txId) => {
          if (editingTxCustomer) {
            triggerDeleteTransactionConfirm(txId, editingTxCustomer.id);
          }
        }}
        onShowToast={showToast}
      />

      {/* User Notifications Modal */}
      <UserNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={userNotifications}
        onMarkAsRead={async (id) => {
          await markNotificationAsRead(id);
          setUserNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
          );
        }}
        onMarkAllAsRead={async () => {
          await markAllNotificationsAsRead();
          setUserNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        onOpenSupport={() => setIsSupportModalOpen(true)}
      />

      {/* User Subscription & Plan Renewal Modal */}
      <UserSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        store={store}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Complete Admin / Staff Management Console */}
      {isAdminPanelOpen &&
        (adminSession !== null ||
          getStoredUser()?.role === 'staff' ||
          getStoredUser()?.role === 'manager' ||
          getStoredUser()?.email === ADMIN_EMAIL ||
          getStoredUser()?.role === 'super_admin') && (
          <AdminPanel
            onClose={() => {
              const currentUser = getStoredUser();
              if (
                adminSession?.role === 'staff' ||
                currentUser?.role === 'staff' ||
                currentUser?.role === 'manager'
              ) {
                // If staff exits the panel, trigger clean logout
                triggerLogoutConfirm();
              } else {
                setIsAdminPanelOpen(false);
                setAdminSession(null);
              }
            }}
            onLogout={triggerLogoutConfirm}
            currentUserEmail={adminSession?.email || getStoredUser()?.email || undefined}
            adminSession={
              adminSession ||
              (getStoredUser()?.role === 'staff' || getStoredUser()?.role === 'manager'
                ? {
                    role: 'staff',
                    email: getStoredUser()?.email || '',
                    staffData: getStoredUser(),
                  }
                : undefined)
            }
          />
        )}

      {/* Confirmation Modal (Highest Level Overlay) */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
