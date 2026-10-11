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
  OnlineStoreConfig,
  OnlineOrder,
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
  loadOnlineStoreConfig,
  saveOnlineStoreConfig,
  loadOnlineOrders,
  saveOnlineOrders,
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
  userSmsApi,
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
  saveProductToCloud,
  deleteProductFromCloud,
  saveStoreProfileToCloud,
  syncAllToCloud,
} from './services/syncService';
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
import { AppPermissionsModal } from './components/AppPermissionsModal';
import { UserSmsModal } from './components/sms/UserSmsModal';
import { QrGeneratorModal } from './components/qr/QrGeneratorModal';
import { ProductScannerModal } from './components/scanner/ProductScannerModal';
import { OnlineStoreModal } from './components/OnlineStoreModal';
import { OnlineStorefrontModal } from './components/OnlineStorefrontModal';
import { PublicStorefrontPage } from './components/PublicStorefrontPage';
import { CentralMarketplacePage } from './components/marketplace/CentralMarketplacePage';
import { detectPublicStoreContext } from './utils/storefrontDetector';
import { AdBanner } from './components/ads/AdBanner';
import {
  subscribeToUserSupportMessages,
  subscribeToAnnouncements,
  subscribeToAppUpdateConfig,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteAdminNotification,
  ADMIN_EMAIL,
  isSuperAdminUser,
} from './services/adminService';
import { SupportMessage, Announcement, AppUpdateConfig, AdminSession, AdminNotification } from './types/adminTypes';
import { Store, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSplashIntro } from './components/animations/AppSplashIntro';
import { NetworkStatusBanner } from './components/animations/NetworkStatusBanner';
import { AnimatedToastContainer } from './components/animations/AnimatedToastContainer';
import { CelebrationOverlay, CelebrationData } from './components/animations/CelebrationOverlay';

export const App: React.FC = () => {
  const [store, setStore] = useState<StoreProfile>(() => {
    const user = getStoredUser();
    return loadStoreProfile(user?.id);
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const user = getStoredUser();
    return loadCustomers(user?.id);
  });
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>(() => {
    const user = getStoredUser();
    return loadTransactions(user?.id);
  });
  const [expenses, setExpenses] = useState<DailyExpense[]>(() => {
    const user = getStoredUser();
    return loadDailyExpenses(user?.id);
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const user = getStoredUser();
    return loadProducts(user?.id);
  });

  // Active Bottom Tab State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Authentication State: Mandatory Auth Gatekeeper
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    return Boolean(getAuthToken() && getStoredUser());
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return Boolean(getAuthToken() && getStoredUser());
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('ibrahim_user_role') || 'দোকানদার';
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
  const [isOnlineStoreModalOpen, setIsOnlineStoreModalOpen] = useState(false);
  const [isMarketplaceViewOpen, setIsMarketplaceViewOpen] = useState(false);
  const [publicStoreContext, setPublicStoreContext] = useState(() => detectPublicStoreContext());
  const [isMerchantAdminViewForced, setIsMerchantAdminViewForced] = useState(false);
  const [isOnlineStorefrontOpen, setIsOnlineStorefrontOpen] = useState(false);
  const [onlineStoreConfig, setOnlineStoreConfig] = useState<OnlineStoreConfig>(() => {
    const user = getStoredUser();
    return loadOnlineStoreConfig(user?.id, store?.name, store?.phone);
  });
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => {
    const user = getStoredUser();
    return loadOnlineOrders(user?.id);
  });
  const [isUserSmsModalOpen, setIsUserSmsModalOpen] = useState(false);
  const [smsPrefillPhone, setSmsPrefillPhone] = useState('');
  const [smsPrefillMessage, setSmsPrefillMessage] = useState('');
  const [smsCustomerName, setSmsCustomerName] = useState('');
  const [smsDueAmount, setSmsDueAmount] = useState<number | undefined>(undefined);
  const [smsActiveTab, setSmsActiveTab] = useState<'send' | 'packages' | 'history'>('send');

  // QR Generator state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrCustomer, setQrCustomer] = useState<Customer | null>(null);
  const [qrPaymentAmount, setQrPaymentAmount] = useState<number | undefined>(undefined);

  // Scanner state
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'pos' | 'inventory' | 'lookup'>('pos');

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isFirstInstallPrompt, setIsFirstInstallPrompt] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('twing_impersonator_backup'));
  });

  const handleExitImpersonation = () => {
    const backupStr = localStorage.getItem('twing_impersonator_backup');
    if (backupStr) {
      try {
        const backup = JSON.parse(backupStr);
        if (backup.token) localStorage.setItem('twing_auth_token', backup.token);
        if (backup.user) localStorage.setItem('twing_auth_user', backup.user);
      } catch (e) {
        console.error('Failed to parse admin impersonator backup', e);
      }
    }
    localStorage.removeItem('twing_impersonator_backup');
    window.location.reload();
  };
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
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const isInitialSyncDone = useRef(false);
  const toastSeqRef = useRef(0);

  // App Opening Splash Animation state
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    return !sessionStorage.getItem('twing_splash_completed');
  });

  // Celebration Animation Modal State
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  const showToast = (message: string) => {
    toastSeqRef.current += 1;
    const id = `toast_${Date.now()}_${toastSeqRef.current}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const handleOpenSms = (params?: {
    phone?: string;
    message?: string;
    customerName?: string;
    dueAmount?: number;
    tab?: 'send' | 'packages' | 'history';
  }) => {
    setSmsPrefillPhone(params?.phone || '');
    setSmsPrefillMessage(params?.message || '');
    setSmsCustomerName(params?.customerName || '');
    setSmsDueAmount(params?.dueAmount);
    setSmsActiveTab(params?.tab || 'send');
    setIsUserSmsModalOpen(true);
  };

  const handleOpenProductQr = (prod: Product) => {
    setQrProduct(prod);
    setQrCustomer(null);
    setQrPaymentAmount(undefined);
    setIsQrModalOpen(true);
  };

  const handleOpenCustomerQr = (cust: Customer) => {
    setQrCustomer(cust);
    setQrProduct(null);
    setQrPaymentAmount(undefined);
    setIsQrModalOpen(true);
  };

  const handleOpenPaymentQr = (amount?: number) => {
    setQrProduct(null);
    setQrCustomer(null);
    setQrPaymentAmount(amount);
    setIsQrModalOpen(true);
  };

  const handleOpenScanner = (mode: 'pos' | 'inventory' | 'lookup' = 'pos') => {
    setScannerMode(mode);
    setIsScannerModalOpen(true);
  };

  const handleProductScanned = (product: Product) => {
    setIsScannerModalOpen(false);
    if (scannerMode === 'pos') {
      setScannedProductForPos(product);
      setActiveTab('pos');
      showToast(`✅ বিক্রয় কার্টে যোগ হয়েছে: ${product.name} (৳${product.salePrice})`);
    } else {
      setHighlightedProductId(product.id);
      setActiveTab('inventory');
      showToast(`📦 পণ্য ইনভেন্টরিতে চিহ্নিত হয়েছে: ${product.name}`);
    }
  };

  // Load current user's specific data from PostgreSQL backend
  const loadUserAccountData = async (uid?: string) => {
    const user = getStoredUser();
    const userId = uid || user?.id || 'guest';
    try {
      const [storeData, custList, txMap, expList, prodList, subStatus, smsData, remoteStoreConfig, remoteOrders] = await Promise.all([
        storeApi.getProfile().catch(() => null),
        customerApi.getAll().catch(() => []),
        transactionApi.getAll().catch(() => ({ map: {} })),
        expenseApi.getAll().catch(() => []),
        productApi.getAll().catch(() => []),
        subscriptionApi.getMyStatus().catch(() => null),
        userSmsApi.getBalance().catch(() => ({ balance: 0, totalSent: 0, hasPendingPurchase: false, pendingPurchase: null, latestConfirmed: null })),
        storeApi.getOnlineConfig().catch(() => null),
        storeApi.getOrders().catch(() => []),
      ]);

      if (smsData) {
        setUserSmsBalance(smsData.balance || 0);
        setPendingSmsPurchaseInfo({
          hasPending: Boolean(smsData.hasPendingPurchase),
          record: smsData.pendingPurchase || null,
          latestConfirmed: smsData.latestConfirmed || null,
        });
      }

      if (subStatus) {
        if (typeof subStatus.isSubscriptionSystemEnabled === 'boolean') {
          setIsSubscriptionSystemEnabled(subStatus.isSubscriptionSystemEnabled);
        }
        setPendingPaymentInfo({
          hasPending: Boolean(subStatus.hasPendingPayment),
          record: subStatus.pendingPayment || null,
        });
      }

      const userShopName = user?.shopName || (user as any)?.shop_name;
      const userName = user?.name || (user as any)?.owner;
      const userPhone = user?.phone;

      if (storeData && storeData.name && storeData.name !== 'আমার দোকান' && storeData.name !== 'TWING হিসাবি') {
        const resolvedStore = {
          ...storeData,
          owner: (storeData.owner && storeData.owner !== 'দোকান মালিক' && storeData.owner !== 'মালিক') ? storeData.owner : (userName || storeData.owner || 'মালিক'),
          phone: (storeData.phone && storeData.phone !== '০১XXXXXXXXX' && storeData.phone !== '০১৭০০০০০০০০') ? storeData.phone : (userPhone || storeData.phone || '০১৭০০০০০০০০'),
        };
        setStore(resolvedStore);
        saveStoreProfile(resolvedStore, userId);
      } else if (userShopName) {
        const customStore: StoreProfile = {
          ...DEFAULT_STORE,
          ...(storeData || {}),
          name: userShopName,
          owner: (storeData?.owner && storeData.owner !== 'দোকান মালিক' && storeData.owner !== 'মালিক')
            ? storeData.owner
            : (userName || 'মালিক'),
          phone: (storeData?.phone && storeData.phone !== '০১XXXXXXXXX' && storeData.phone !== '০১৭০০০০০০০০')
            ? storeData.phone
            : (userPhone || '০১৭০০০০০০০০'),
        };
        setStore(customStore);
        saveStoreProfile(customStore, userId);
      } else if (storeData) {
        setStore(storeData);
        saveStoreProfile(storeData, userId);
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

      if (remoteStoreConfig && remoteStoreConfig.storeSlug) {
        setOnlineStoreConfig(remoteStoreConfig);
        saveOnlineStoreConfig(remoteStoreConfig, userId);
      } else {
        const loadedStoreConfig = loadOnlineStoreConfig(userId, userShopName || storeData?.name, userPhone || storeData?.phone);
        setOnlineStoreConfig(loadedStoreConfig);
      }

      if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
        setOnlineOrders(remoteOrders);
        saveOnlineOrders(remoteOrders, userId);
      } else {
        const loadedOnlineOrders = loadOnlineOrders(userId);
        setOnlineOrders(loadedOnlineOrders);
      }

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
              setIsAuthChecking(false);
            } else if (isSuperAdminUser(currentUser)) {
              setAdminSession({
                role: 'super_admin',
                email: currentUser.email,
              });
              setUserRole('প্রধান সুপার অ্যাডমিন');
              setIsAdminPanelOpen(true);
              setIsAuthChecking(false);
            } else {
              currentUser.role = 'user';
              setStoredUser(currentUser);
              setUserRole('দোকান মালিক');
              setAdminSession(null);
              setIsAdminPanelOpen(false);
              // Unblock UI immediately so user sees their store instantly
              setIsAuthChecking(false);
              // Sync account data asynchronously in background
              loadUserAccountData(currentUser.id).catch(() => {});
            }
          } else {
            authApi.logout();
            setIsLoggedIn(false);
            setAdminSession(null);
            setIsAdminPanelOpen(false);
            setIsAuthChecking(false);
          }
        } catch (err) {
          console.warn('Auth check catch:', err);
          if (storedUser) {
            // Keep active offline session on Smart TV / transient network disconnect
            setIsLoggedIn(true);
            setUserRole('দোকান মালিক');
            setIsAuthChecking(false);
          } else {
            authApi.logout();
            setIsLoggedIn(false);
            setAdminSession(null);
            setIsAdminPanelOpen(false);
            setIsAuthChecking(false);
          }
        }
      } else {
        // No active session: show AuthScreen
        setIsLoggedIn(false);
        setAdminSession(null);
        setIsAdminPanelOpen(false);
        setIsAuthChecking(false);
      }
    };

    // Safety fallback: guaranteed unblock after at most 1.5 seconds
    const safetyTimer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 1500);

    checkAuth().finally(() => {
      clearTimeout(safetyTimer);
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  // Sync public storefront detection on browser history / back / forward
  useEffect(() => {
    const handlePopState = () => {
      setPublicStoreContext(detectPublicStoreContext());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for Paymently callback URL parameters on return
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment_status');
      if (paymentStatus) {
        const invoiceId = params.get('invoice_id');
        const trxId = params.get('trx_id');
        const amount = params.get('amount');
        const plan = params.get('plan');
        const message = params.get('message');

        const type = params.get('type');
        const orderId = params.get('order_id');

        if (paymentStatus === 'success') {
          if (type === 'marketplace') {
            showToast(`🎉 আপনার সেন্ট্রাল মার্কেটপ্লেস অর্ডার (${orderId || ''}) এর পেমেন্ট সফল হয়েছে!`);
          } else {
            showToast(
              `🎉 পেমেন্ট সফল হয়েছে! আপনার ${plan || 'সাবস্ক্রিপশন'} প্যাকেজ (৳${amount || ''}) সফলভাবে সক্রিয় করা হয়েছে। TrxID: ${trxId || invoiceId}`
            );
            const currentUser = getStoredUser();
            if (currentUser?.id) {
              loadUserAccountData(currentUser.id);
            }
          }
        } else if (paymentStatus === 'pending') {
          showToast(`⏳ ${message || 'পেমেন্ট প্রসেসিং হচ্ছে। অনুমোদিত হলে স্বয়ংক্রিয়ভাবে সক্রিয় হবে।'}`);
        } else if (paymentStatus === 'cancelled') {
          if (type === 'marketplace' && orderId) {
            import('./services/marketplaceService').then(({ marketplaceApi }) => {
              marketplaceApi.cancelOrder(orderId, 'পেমেন্ট গেটওয়েতে গ্রাহক পেমেন্ট বাতিল করেছেন').catch(() => {});
            });
            try {
              const raw = localStorage.getItem('twing_mkt_customer_orders_v1');
              if (raw) {
                const list = JSON.parse(raw);
                const updated = list.map((o: any) =>
                  o.id === orderId || o.orderNumber === orderId
                    ? { ...o, overallStatus: 'cancelled', paymentStatus: 'cancelled' }
                    : o
                );
                localStorage.setItem('twing_mkt_customer_orders_v1', JSON.stringify(updated));
              }
            } catch {}
            showToast('⚠️ পেমেন্ট বাতিল করা হয়েছে এবং সেন্ট্রাল মার্কেটপ্লেস অর্ডারটি বাতিল করা হয়েছে। স্টক পুনরুদ্ধার করা হয়েছে।');
          } else {
            showToast('⚠️ পেমেন্ট বাতিল করা হয়েছে। আপনি যেকোনো সময় পুনরায় চেষ্টা করতে পারেন।');
          }
        } else if (paymentStatus === 'failed') {
          if (type === 'marketplace' && orderId) {
            import('./services/marketplaceService').then(({ marketplaceApi }) => {
              marketplaceApi.cancelOrder(orderId, 'পেমেন্ট গেটওয়েতে পেমেন্ট ব্যর্থ হয়েছে').catch(() => {});
            });
            try {
              const raw = localStorage.getItem('twing_mkt_customer_orders_v1');
              if (raw) {
                const list = JSON.parse(raw);
                const updated = list.map((o: any) =>
                  o.id === orderId || o.orderNumber === orderId
                    ? { ...o, overallStatus: 'cancelled', paymentStatus: 'cancelled' }
                    : o
                );
                localStorage.setItem('twing_mkt_customer_orders_v1', JSON.stringify(updated));
              }
            } catch {}
            showToast(`❌ ${message || 'পেমেন্ট ব্যর্থ হয়েছে এবং অর্ডারটি বাতিল করা হয়েছে।'}`);
          } else {
            showToast(`❌ ${message || 'পেমেন্ট সম্পন্ন হয়নি বা ব্যর্থ হয়েছে।'}`);
          }
        }

        // Clean query parameters from address bar without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // Listen for global SMS recharge request and balance update events
  useEffect(() => {
    const handleRechargeEvent = (e: any) => {
      const tab = e?.detail?.tab || 'packages';
      handleOpenSms({ tab });
    };

    const handleBalanceRefresh = () => {
      userSmsApi.getBalance().then((smsData) => {
        if (smsData) {
          setUserSmsBalance(smsData.balance || 0);
          setPendingSmsPurchaseInfo({
            hasPending: Boolean(smsData.hasPendingPurchase),
            record: smsData.pendingPurchase || null,
            latestConfirmed: smsData.latestConfirmed || null,
          });
        }
      }).catch(() => {});
    };

    window.addEventListener('twing_open_sms_recharge', handleRechargeEvent);
    window.addEventListener('twing_sms_balance_updated', handleBalanceRefresh);
    return () => {
      window.removeEventListener('twing_open_sms_recharge', handleRechargeEvent);
      window.removeEventListener('twing_sms_balance_updated', handleBalanceRefresh);
    };
  }, []);

  // Save to LocalStorage as instant local cache
  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    if (isLoggedIn) {
      saveStoreProfile(store);
    }
  }, [store, isLoggedIn]);

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
          const user = getStoredUser();
          const userShop = user?.shopName || (user as any)?.shop_name;
          const isGeneric = cloudProfile.name === 'আমার দোকান' || cloudProfile.name === 'TWING হিসাবি';
          const resolvedName = (!isGeneric || !userShop) ? cloudProfile.name : userShop;
          setStore((prev) => ({ ...prev, ...cloudProfile, name: resolvedName }));
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

  const handleLoginSuccess = async (email: string, roleName: string, loggedInUser?: any) => {
    const user = loggedInUser || getStoredUser();

    // CRITICAL: Immediately prepare and set user-specific profile, shop name, owner, and records
    // BEFORE setting isLoggedIn(true). This completely eliminates any flash of default placeholder data
    // and guarantees that only the logged-in user's profile is rendered on the screen.
    if (user) {
      const uid = user.id || user.userId;
      const userShopName = user.shopName || user.shop_name;
      const userName = user.name || user.owner;
      const userPhone = user.phone;
      const cachedStore = uid ? loadStoreProfile(uid) : null;

      const instantStore: StoreProfile = {
        ...DEFAULT_STORE,
        ...(cachedStore || {}),
        name: (cachedStore?.name && cachedStore.name !== 'আমার দোকান' && cachedStore.name !== 'TWING হিসাবি')
          ? cachedStore.name
          : (userShopName || cachedStore?.name || DEFAULT_STORE.name),
        owner: (cachedStore?.owner && cachedStore.owner !== 'দোকান মালিক' && cachedStore.owner !== 'মালিক')
          ? cachedStore.owner
          : (userName || cachedStore?.owner || DEFAULT_STORE.owner),
        phone: (cachedStore?.phone && cachedStore.phone !== '০১XXXXXXXXX' && cachedStore.phone !== '০১৭০০০০০০০০')
          ? cachedStore.phone
          : (userPhone || cachedStore?.phone || DEFAULT_STORE.phone),
      };

      setStore(instantStore);
      if (uid) {
        saveStoreProfile(instantStore, uid);
        setCustomers(loadCustomers(uid));
        setTransactions(loadTransactions(uid));
        setExpenses(loadDailyExpenses(uid));
        setProducts(loadProducts(uid));
      }
    }

    setIsLoggedIn(true);
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
    const isSuper = roleName === 'super_admin' || isSuperAdminUser(user) || isSuperAdminUser({ email, phone: user?.phone, id: user?.id, role: roleName });
    const resolvedRole = isSuper ? 'প্রধান সুপার অ্যাডমিন' : 'দোকান মালিক';
    if (!isSuper && user) {
      user.role = 'user';
      setStoredUser(user);
    }
    setUserRole(resolvedRole);
    if (!isSuper) {
      setIsAdminPanelOpen(false);
      setAdminSession(null);
    }
    localStorage.setItem('ibrahim_is_logged_in', 'true');
    localStorage.setItem('ibrahim_user_role', resolvedRole);
    showToast('☁️ আপনার দোকানে সফলভাবে লগইন হয়েছে!');

    // Show app permissions popup on dashboard if not accepted yet
    const hasAcceptedPermissions = localStorage.getItem('twing_permissions_accepted_v2');
    if (!hasAcceptedPermissions) {
      setTimeout(() => {
        setIsFirstInstallPrompt(true);
        setIsPermissionsModalOpen(true);
      }, 500);
    }
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
    setIsOnlineStoreModalOpen(false);
    setIsOnlineStorefrontOpen(false);
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
  const isSuperAdmin = userRole === 'প্রধান সুপার অ্যাডমিন' || isSuperAdminUser(currentUser);
  const isStaffMember = userRole === 'স্টাফ অ্যাকাউন্ট' || currentUser?.role === 'staff' || currentUser?.role === 'manager';
  const userSubExpiry = (store as any)?.subscriptionExpiresAt || (currentUser as any)?.subscriptionExpiresAt;

  const [userSmsBalance, setUserSmsBalance] = useState<number>(0);
  const [pendingSmsPurchaseInfo, setPendingSmsPurchaseInfo] = useState<{
    hasPending: boolean;
    record?: any;
    latestConfirmed?: any;
  }>({ hasPending: false });
  const [isSubscriptionSystemEnabled, setIsSubscriptionSystemEnabled] = useState<boolean>(true);
  const [scannedProductForPos, setScannedProductForPos] = useState<Product | null>(null);
  const [initialSkuForInventory, setInitialSkuForInventory] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  const isSubscriptionExpired = isSubscriptionSystemEnabled && !isSuperAdmin && !isStaffMember && userSubExpiry && Number(userSubExpiry) < Date.now();

  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    hasPending: boolean;
    record: any;
  }>({ hasPending: false, record: null });

  const handleRefreshSmsStatus = async () => {
    try {
      const data = await userSmsApi.getBalance();
      if (data) {
        setUserSmsBalance(data.balance || 0);
        setPendingSmsPurchaseInfo({
          hasPending: Boolean(data.hasPendingPurchase),
          record: data.pendingPurchase || null,
          latestConfirmed: data.latestConfirmed || null,
        });
      }
    } catch (e) {
      console.warn('SMS status refresh error:', e);
    }
  };

  const handleRefreshSubscriptionStatus = async () => {
    try {
      const statusData: any = await subscriptionApi.getMyStatus();
      if (statusData) {
        if (typeof statusData.isSubscriptionSystemEnabled === 'boolean') {
          setIsSubscriptionSystemEnabled(statusData.isSubscriptionSystemEnabled);
        }
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
      await handleRefreshSmsStatus();
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
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    // Audio & Visual Celebration Feedback
    if (store.enableSoundEffects !== false) {
      if (txType === 'payment') {
        playPaymentChime();
        if (newBal <= 0) {
          triggerConfettiCelebration();
          setCelebrationData({
            isOpen: true,
            type: 'due_clear',
            title: 'বকেয়া সম্পূর্ণ পরিশোধ হয়েছে! 🎉',
            amount: data.amount,
            subtitle: `${activeCustomer.name}-এর সমস্ত বকেয়া বাকি পরিশোধ সম্পন্ন হয়েছে`,
          });
        } else {
          setCelebrationData({
            isOpen: true,
            type: 'payment',
            title: 'টাকা জমা সফল হয়েছে! ৳',
            amount: data.amount,
            subtitle: `${activeCustomer.name}-এর ব্যালেন্স হালনাগাদ করা হয়েছে`,
          });
        }
      } else {
        playSaleTone();
        setCelebrationData({
          isOpen: true,
          type: 'sale',
          title: 'বাকি বিক্রি সম্পন্ন হয়েছে!',
          amount: data.amount,
          subtitle: `${activeCustomer.name}-এর খাতায় বাকি যোগ করা হয়েছে`,
        });
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
  const handleAddProduct = async (prod: Product) => {
    const updated = [prod, ...products];
    setProducts(updated);
    saveProducts(updated, currentUser?.id);
    await saveProductToCloud(prod);
  };

  const handleUpdateProduct = async (prod: Product) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    saveProducts(updated, currentUser?.id);
    await saveProductToCloud(prod);
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'পণ্য মুছে ফেলতে চান?',
      message: 'এই পণ্যটি তালিকা থেকে স্থায়ীভাবে মুছে ফেলা হবে।',
      confirmText: 'হ্যাঁ, মুছুন',
      type: 'danger',
      action: async () => {
        const updated = products.filter((p) => p.id !== id);
        setProducts(updated);
        saveProducts(updated, currentUser?.id);
        await deleteProductFromCloud(id);
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
      if (params.paidAmount >= params.netAmount && params.netAmount > 0) {
        playPaymentChime();
        triggerConfettiCelebration();
      } else {
        playSaleTone();
      }
    }

    setCelebrationData({
      isOpen: true,
      type: 'sale',
      title: 'POS বিক্রি সফল হয়েছে! 🎉',
      amount: params.netAmount,
      subtitle: `মোট ${params.items.length}টি পণ্যের বিক্রি ও ক্যাশ মেমো প্রস্তুত`,
    });
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

  // Online Store & E-commerce Handlers
  const handleUpdateOnlineStoreConfig = (newConfig: OnlineStoreConfig) => {
    const user = getStoredUser();
    setOnlineStoreConfig(newConfig);
    saveOnlineStoreConfig(newConfig, user?.id);
    showToast('অনলাইন স্টোর সেটিংস সংরক্ষিত হয়েছে!');
  };

  const handleUpdateOnlineOrders = (newOrders: OnlineOrder[]) => {
    const user = getStoredUser();
    setOnlineOrders(newOrders);
    saveOnlineOrders(newOrders, user?.id);
  };

  const handlePlaceOnlineOrder = (order: OnlineOrder) => {
    const newOrders = [order, ...onlineOrders];
    handleUpdateOnlineOrders(newOrders);
    playSaleTone();
    showToast(`🛍️ নতুন অনলাইন অর্ডার #${order.orderNumber} সফলভাবে গ্রহণ করা হয়েছে!`);
  };

  const handleConvertOnlineOrderToSale = async (order: OnlineOrder) => {
    const now = Date.now();
    const user = getStoredUser();
    let targetCust = customers.find(
      (c) => c.phone && order.customerPhone && normalizePhoneNumber(c.phone) === normalizePhoneNumber(order.customerPhone)
    );

    if (!targetCust) {
      targetCust = {
        id: `cust_${now}`,
        name: order.customerName,
        phone: order.customerPhone,
        address: order.customerAddress,
        category: 'regular',
        balance: 0,
        createdAt: now,
        updatedAt: now,
      };
      const updatedCusts = [targetCust, ...customers];
      setCustomers(updatedCusts);
      saveCustomers(updatedCusts, user?.id);
      await saveCustomerToCloud(targetCust);
    }

    const prevBalance = targetCust.balance || 0;
    const balanceAfter = order.paymentMethod === 'cod' ? prevBalance + order.totalAmount : prevBalance;

    const newTx: Transaction = {
      id: `