import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Customer, Transaction, StoreProfile, DailyExpense, Product, OnlineStoreConfig } from '../types';
import { formatMoney, getTodayDateString, formatBanglaDate } from '../utils/storage';
import { DateWiseReportModal } from './DateWiseReportModal';
import { InventoryReportModal } from './InventoryReportModal';
import heroBannerImg from '../assets/images/store_banner_hero_1788852324640.jpg';
import {
  TopUpIcon,
  DueBookIcon,
  CashBookIcon,
  AccountsBookIcon,
  BillPayIcon,
  OnlineStoreIcon,
  SaleCoinsIcon,
  SalesPrinterIcon,
  CustomerDirectoryIcon,
  StockCalculationIcon,
  ReportAnalyticsIcon,
  ShopSettingsIcon,
} from './ServiceIcons';
import {
  Store,
  UserPlus,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Wallet,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  FileText,
  Receipt,
  Landmark,
  Package,
  Smartphone,
  CircleDollarSign,
  TrendingUp,
  Settings,
  Boxes,
  Truck,
  PackagePlus,
  BarChart3,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import { DashboardBannerSettings, DashboardBannerItem } from '../types/adminTypes';
import { subscribeToDashboardBanners, INITIAL_DASHBOARD_BANNER_SETTINGS } from '../services/adminService';
import { BANNER_GRADIENTS } from './admin/DashboardBannersTab';


interface DashboardViewProps {
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  expenses?: DailyExpense[];
  products?: Product[];
  onOpenNewCustomer: () => void;
  onNavigateToTab: (tab: 'customers' | 'pos' | 'inventory' | 'cashbook') => void;
  onOpenAnalytics: () => void;
  onOpenCashbook: () => void;
  onOpenReport: () => void;
  onOpenInventoryReport?: () => void;
  onOpenSalesHistory?: () => void;
  onOpenSubscription?: () => void;
  onOpenSettings?: () => void;
  onOpenOnlineStore?: () => void;
  onlineStoreConfig?: OnlineStoreConfig;
  onOpenNewProduct?: () => void;
  onOpenSms?: () => void;
  smsBalance?: number;
  pendingSmsPurchaseInfo?: { hasPending: boolean; record?: any; latestConfirmed?: any };
  onRefreshSmsStatus?: () => void | Promise<any>;
  isSubscriptionSystemEnabled?: boolean;
  pendingPaymentInfo?: { hasPending: boolean; record?: any };
  onRefreshSubscriptionStatus?: () => void | Promise<any>;
  onSelectCustomer: (customerId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  transactions,
  store,
  expenses = [],
  products = [],
  onOpenNewCustomer,
  onNavigateToTab,
  onOpenCashbook,
  onOpenReport,
  onOpenInventoryReport,
  onOpenSalesHistory,
  onOpenSettings,
  onOpenOnlineStore,
  onlineStoreConfig,
  onOpenSms,
  onOpenSubscription,
}) => {
  const isOnlineStoreAllowed = onlineStoreConfig?.isStoreAllowedByAdmin === true && onlineStoreConfig?.adminStoreStatus === 'active';
  const isOnlineStorePending = onlineStoreConfig?.adminStoreStatus === 'requested';
  const onlineStoreBadge = isOnlineStorePending ? 'পেন্ডিং' : isOnlineStoreAllowed ? 'সক্রিয়' : 'অনুমতি';
  const onlineStoreBadgeClass = isOnlineStorePending
    ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
    : isOnlineStoreAllowed
    ? 'bg-emerald-500 text-white font-bold'
    : 'bg-rose-500 text-white font-bold';

  const today = getTodayDateString();
  const [isDateReportModalOpen, setIsDateReportModalOpen] = useState(false);
  const [isInventoryReportOpen, setIsInventoryReportOpen] = useState(false);
  const [metricViewMode, setMetricViewMode] = useState<'today' | 'date_range'>('today');

  // Super Admin controlled dashboard promo banner subscription
  const [dashboardBanners, setDashboardBanners] = useState<DashboardBannerSettings>(INITIAL_DASHBOARD_BANNER_SETTINGS);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    const unsub = subscribeToDashboardBanners((settings) => {
      if (settings && Array.isArray(settings.banners)) {
        setDashboardBanners(settings);
      }
    });
    return () => unsub();
  }, []);

  const activeBanners = (dashboardBanners?.banners || []).filter((b) => b.isActive !== false);
  const currentBanner: DashboardBannerItem =
    activeBanners[activeBannerIndex] ||
    activeBanners[0] ||
    INITIAL_DASHBOARD_BANNER_SETTINGS.banners[0];

  useEffect(() => {
    if (!dashboardBanners?.autoPlay || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, (dashboardBanners.intervalSeconds || 6) * 1000);
    return () => clearInterval(interval);
  }, [dashboardBanners?.autoPlay, dashboardBanners?.intervalSeconds, activeBanners.length]);

  const handleBannerAction = (banner: DashboardBannerItem) => {
    if (!banner.actionType || banner.actionType === 'none') {
      if (banner.actionUrl) {
        window.open(banner.actionUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    if (banner.actionType === 'url' && banner.actionUrl) {
      window.open(banner.actionUrl, '_blank', 'noopener,noreferrer');
    } else if (banner.actionType === 'tel' && banner.actionUrl) {
      window.location.href = banner.actionUrl.startsWith('tel:') ? banner.actionUrl : `tel:${banner.actionUrl}`;
    } else if (banner.actionType === 'subscription') {
      if (onOpenSubscription) onOpenSubscription();
    } else if (banner.actionType === 'sms') {
      if (onOpenSms) onOpenSms();
    } else if (banner.actionType === 'support') {
      const supportBtn = document.getElementById('floating-support-btn') || document.querySelector('[data-tab="support"]');
      if (supportBtn) (supportBtn as HTMLElement).click();
    }
  };


  // Helper to normalize any date format to YYYY-MM-DD
  const normalizeToISO = (d: string): string => {
    if (!d) return '';
    const clean = d.trim();
    if (clean.includes('/') || (clean.includes('-') && clean.split('-')[0].length <= 2)) {
      const parts = clean.includes('/') ? clean.split('/') : clean.split('-');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    return clean;
  };

  const isDateInRange = (dateStr: string, start: string, end: string): boolean => {
    if (!dateStr) return false;
    const iso = normalizeToISO(dateStr);
    const s = normalizeToISO(start);
    const e = normalizeToISO(end);
    if (!iso) return false;
    if (s && iso < s) return false;
    if (e && iso > e) return false;
    return true;
  };

  // Date formatting helpers
  const formatHyphenDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatSlashDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Date range filter state (default: 1st of current month to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(today);

  // Quick preset helper
  const handleSetPreset = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toStr(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(toStr(past));
      setEndDate(toStr(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toStr(firstDay));
      setEndDate(toStr(now));
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toStr(firstDay));
      setEndDate(toStr(lastDay));
    }
  };

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeTransactions = transactions && typeof transactions === 'object' ? transactions : {};

  // Compute real today metrics
  const todayMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let totalVolume = 0;
    const todayIso = normalizeToISO(today);

    Object.values(safeTransactions).forEach((txList) => {
      if (!Array.isArray(txList)) return;
      txList.forEach((tx) => {
        if (tx && normalizeToISO(tx.date) === todayIso) {
          totalVolume += Number(tx.amount || 0);
          if (tx.type === 'payment') {
            income += Number(tx.amount || 0);
          } else if (tx.type === 'sale') {
            if (tx.paidAmount) {
              income += Number(tx.paidAmount || 0);
            }
          }
        }
      });
    });

    (expenses || []).forEach((exp) => {
      if (exp && normalizeToISO(exp.date) === todayIso) {
        totalVolume += Number(exp.amount || 0);
        if (exp.type === 'expense') {
          expense += Number(exp.amount || 0);
        } else if (exp.type === 'income') {
          income += Number(exp.amount || 0);
        }
      }
    });

    const totalCustomers = safeCustomers.filter((c) => c && c.id !== 'cust_counter_cash').length;

    return {
      income,
      expense,
      totalVolume,
      totalCustomers: totalCustomers || safeCustomers.length,
    };
  }, [safeTransactions, expenses, safeCustomers, today]);

  // Overall customer dues (মোট বাকি পাওনা)
  const totalDue = useMemo(() => {
    return safeCustomers.reduce((acc, c) => {
      if (!c) return acc;
      const bal = Number(c.balance || 0);
      return bal > 0 ? acc + bal : acc;
    }, 0);
  }, [safeCustomers]);

  // Overall total collection (মোট আদায়)
  const totalCollected = useMemo(() => {
    let collected = 0;
    Object.values(safeTransactions).forEach((txList) => {
      if (!Array.isArray(txList)) return;
      txList.forEach((tx) => {
        if (!tx) return;
        if (tx.type === 'payment') {
          collected += Number(tx.amount || 0);
        } else if (tx.type === 'sale') {
          if (tx.paidAmount) {
            collected += Number(tx.paidAmount || 0);
          }
        }
      });
    });
    return collected;
  }, [safeTransactions]);

  // Compute comprehensive Date Range metrics based on startDate and endDate
  const dateRangeMetrics = useMemo(() => {
    let income = 0; // cash in (payment received + paid portion of sales + other income)
    let expense = 0; // cash out (expenses)
    let totalSales = 0; // all product sales (both cash and due)
    let cashSales = 0;
    let dueSales = 0;
    let txCount = 0;
    let totalVolume = 0;

    Object.values(safeTransactions).forEach((txList) => {
      if (!Array.isArray(txList)) return;
      txList.forEach((tx) => {
        if (!tx || !tx.date) return;
        if (isDateInRange(tx.date, startDate, endDate)) {
          txCount++;
          const amt = Number(tx.amount || 0);
          totalVolume += amt;

          if (tx.type === 'payment') {
            income += amt;
          } else if (tx.type === 'sale') {
            totalSales += amt;
            const paid = Number(tx.paidAmount || 0);
            const due = amt > paid ? amt - paid : 0;
            cashSales += paid;
            dueSales += due;
            if (paid > 0) {
              income += paid;
            }
          }
        }
      });
    });

    (expenses || []).forEach((exp) => {
      if (!exp || !exp.date) return;
      if (isDateInRange(exp.date, startDate, endDate)) {
        txCount++;
        const amt = Number(exp.amount || 0);
        totalVolume += amt;
        if (exp.type === 'expense') {
          expense += amt;
        } else if (exp.type === 'income') {
          income += amt;
        }
      }
    });

    const netProfit = income - expense;

    return {
      income,
      expense,
      totalSales,
      cashSales,
      dueSales,
      netProfit,
      totalVolume,
      txCount,
    };
  }, [safeTransactions, expenses, startDate, endDate]);

  // 12 Service Items matching the uploaded screenshot
  const serviceItems = [
    {
      id: 'top_up',
      title: 'টপ আপ',
      icon: TopUpIcon,
      action: onOpenSms ? onOpenSms : () => {},
    },
    {
      id: 'due_book',
      title: 'বাকির খাতা',
      icon: DueBookIcon,
      action: () => onNavigateToTab('customers'),
    },
    {
      id: 'cash_book',
      title: 'বুক',
      icon: CashBookIcon,
      action: onOpenCashbook,
    },
    {
      id: 'accounts_book',
      title: 'হিসাব খাতা',
      icon: AccountsBookIcon,
      action: () => setIsDateReportModalOpen(true),
    },
    {
      id: 'bill_pay',
      title: 'বিল পে',
      icon: BillPayIcon,
      action: onOpenCashbook,
    },
    {
      id: 'online_store',
      title: 'অনলাইন স্টোর',
      icon: OnlineStoreIcon,
      action: onOpenOnlineStore ? onOpenOnlineStore : () => onNavigateToTab('inventory'),
      badge: onlineStoreBadge,
      badgeClass: onlineStoreBadgeClass,
    },
    {
      id: 'pos_sale',
      title: 'বেচা-বিক্রি',
      icon: SaleCoinsIcon,
      action: () => onNavigateToTab('pos'),
    },
    {
      id: 'sales_book',
      title: 'বিক্রির খাতা',
      icon: SalesPrinterIcon,
      action: onOpenSalesHistory ? onOpenSalesHistory : () => onNavigateToTab('pos'),
    },
    {
      id: 'customer_list',
      title: 'গ্রাহক তালিকা',
      icon: CustomerDirectoryIcon,
      action: () => onNavigateToTab('customers'),
    },
    {
      id: 'stock_calc',
      title: 'স্টকের হিসাব',
      icon: StockCalculationIcon,
      action: () => onNavigateToTab('inventory'),
    },
    {
      id: 'inventory_report',
      title: 'ইনভেন্টরি রিপোর্ট',
      icon: ReportAnalyticsIcon,
      action: () => {
        if (onOpenInventoryReport) {
          onOpenInventoryReport();
        } else {
          setIsInventoryReportOpen(true);
        }
      },
    },
    {
      id: 'shop_settings',
      title: 'সেটিংস',
      icon: ShopSettingsIcon,
      action: onOpenSettings ? onOpenSettings : () => {},
    },
  ];

  const currentTheme = BANNER_GRADIENTS[currentBanner.bgGradient || 'teal'] || BANNER_GRADIENTS.teal;
  const hasBannerAction = Boolean(
    (currentBanner.actionType && currentBanner.actionType !== 'none') ||
    currentBanner.actionUrl ||
    currentBanner.actionText
  );

  return (
    <div
      id="dashboard-root-view"
      className="w-full flex flex-col gap-2 sm:gap-2.5 select-none text-slate-800"
    >
      {/* 1. Super Admin Controlled Promo Hero Banner */}
      {dashboardBanners?.isEnabled !== false && (
        <section
          id="dashboard-promo-banner"
          onClick={() => hasBannerAction ? handleBannerAction(currentBanner) : undefined}
          className={`${currentTheme.bg} ${currentTheme.border} border rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs overflow-hidden shrink-0 h-[78px] sm:h-[90px] ${
            hasBannerAction ? 'cursor-pointer hover:shadow-xs transition' : ''
          }`}
        >
          <div className="flex flex-col justify-between h-full py-0.5 min-w-0 flex-1 pr-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white shadow-2xs border border-white flex items-center justify-center text-[#064e3b] shrink-0">
                <Store className="w-4 h-4 text-[#064e3b]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`text-[10px] sm:text-[11px] font-bold ${currentTheme.sub} leading-none truncate`}>
                    {currentBanner.badgeText || 'আপনার ব্যবসার সঙ্গী'}
                  </p>
                  {hasBannerAction && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerAction(currentBanner);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 hover:bg-white text-[9.5px] sm:text-[10px] font-black text-emerald-950 border border-emerald-300/80 shadow-2xs cursor-pointer active:scale-95 transition-all"
                    >
                      <span>{currentBanner.actionText || 'অফারটি দেখুন'}</span>
                      <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-700" />
                    </button>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight mt-0.5 truncate">
                  {currentBanner.title || 'আপনার ব্যবসার বিশ্বস্ত ডিজিটাল সঙ্গী'}
                </h2>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-auto">
              <p className={`text-[10px] sm:text-xs ${currentTheme.sub} font-medium leading-none truncate`}>
                {currentBanner.subtitle || 'সহজে হিসাব রাখুন, এগিয়ে যান'}
              </p>
              {/* Pagination Dots */}
              <div className="flex items-center gap-1 shrink-0">
                {activeBanners.length > 1 ? (
                  activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBannerIndex(idx);
                      }}
                      aria-label={`স্লাইড ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer ${
                        idx === activeBannerIndex
                          ? `w-2.5 h-1.5 rounded-full ${currentTheme.dotActive}`
                          : `w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive} hover:opacity-80`
                      }`}
                    />
                  ))
                ) : (
                  <>
                    <span className={`w-2.5 h-1.5 rounded-full ${currentTheme.dotActive}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`} />
                    <span className={`w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side retail grocery illustration or Super Admin uploaded image */}
          <div className="h-full shrink-0 flex items-center pl-2">
            <img
              src={currentBanner.imageUrl || heroBannerImg}
              alt="Promo Banner"
              className="w-24 xs:w-28 sm:w-36 h-full object-cover rounded-xl shadow-2xs border border-white/95 bg-white"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>
      )}

      {/* 2. Store Profile & Quick Action Bar */}
      <section
        id="dashboard-store-profile-bar"
        className="bg-white rounded-xl p-2 sm:p-2.5 border border-[#e2ede8] shadow-2xs flex items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#e8f7f2] border border-[#d2efe6] text-[#064e3b] flex items-center justify-center shrink-0">
            <Store className="w-4.5 h-4.5 text-[#064e3b]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap leading-tight">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {store.name || 'আমার দোকান'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f7f0] text-[#065f46] text-[9.5px] font-bold border border-[#bbf0da] leading-none">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span>সক্রিয় খাতা</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-none mt-1 truncate">
              প্রোপাইটার: <strong className="text-slate-700">{store.owner || 'দোকান মালিক'}</strong> &nbsp;|&nbsp; 📅 {formatSlashDate(today)}
            </p>
          </div>
        </div>

        {/* 2 Action Buttons with animated spring taps */}
        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button
            type="button"
            id="quick-add-customer-btn"
            onClick={onOpenNewCustomer}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#c8f0e5] hover:bg-[#b8e8db] text-[#053d33] font-black text-[10.5px] sm:text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs border border-[#aee2d4]"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#064e3b]" />
            <span>+ নতুন কাস্টমার</span>
          </motion.button>
          <motion.button
            type="button"
            id="quick-pos-sale-btn"
            onClick={() => onNavigateToTab('pos')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#c8f0e5] hover:bg-[#b8e8db] text-[#053d33] font-black text-[10.5px] sm:text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs border border-[#aee2d4]"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-[#064e3b]" />
            <span>পণ্য বিক্রয়</span>
          </motion.button>
        </div>
      </section>

      {/* 3. The 4 Metric Cards Grid with Mode Toggle */}
      <section id="dashboard-metric-cards-section" className="space-y-1.5 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold text-slate-600">
            {metricViewMode === 'today' ? 'আজকের সার্বিক হিসাব' : `হিসাব (${formatHyphenDate(startDate)} হতে ${formatHyphenDate(endDate)})`}
          </span>
          <div className="flex items-center gap-1 bg-[#e4f2ed] p-0.5 rounded-lg border border-[#cbe6dd]">
            <button
              type="button"
              onClick={() => setMetricViewMode('today')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                metricViewMode === 'today'
                  ? 'bg-[#004D40] text-white shadow-2xs'
                  : 'text-[#064e3b] hover:text-slate-900'
              }`}
            >
              আজকের হিসাব
            </button>
            <button
              type="button"
              onClick={() => setMetricViewMode('date_range')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                metricViewMode === 'date_range'
                  ? 'bg-[#004D40] text-white shadow-2xs'
                  : 'text-[#064e3b] hover:text-slate-900'
              }`}
            >
              তারিখ অনুযায়ী
            </button>
          </div>
        </div>

        <div id="dashboard-metric-cards-grid" className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {metricViewMode === 'today' ? (
            <>
              {/* Card 1: মোট বাকি (Total Due) */}
              <div
                onClick={() => onNavigateToTab('customers')}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] hover:border-rose-300 shadow-xs hover:shadow-md transition flex flex-col justify-between text-center cursor-pointer group"
                title="বকেয়া বাকি দেখতে ক্লিক করুন"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-amber-300 group-hover:scale-105 transition flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">মোট বাকি</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-rose-700 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(totalDue)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-rose-600 font-bold leading-none mt-0.5 truncate">
                    বকেয়া পাওনা
                  </p>
                </div>
              </div>

              {/* Card 2: মোট আদায় (Total Collected) */}
              <div
                onClick={onOpenCashbook}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] hover:border-emerald-300 shadow-xs hover:shadow-md transition flex flex-col justify-between text-center cursor-pointer group"
                title="ক্যাশবুকে আদায়ের হিসাব দেখতে ক্লিক করুন"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-emerald-300 group-hover:scale-105 transition flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">মোট আদায়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-emerald-700 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(totalCollected)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    সর্বমোট ক্যাশ ইন
                  </p>
                </div>
              </div>

              {/* Card 3: আজকের আয় */}
              <div
                onClick={onOpenCashbook}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] hover:border-emerald-300 shadow-xs hover:shadow-md transition flex flex-col justify-between text-center cursor-pointer group"
                title="আজকের আয় দেখতে ক্লিক করুন"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-white group-hover:scale-105 transition flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">আজকের আয়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(todayMetrics.income)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    ক্যাশ ইন / আদায়
                  </p>
                </div>
              </div>

              {/* Card 4: আজকের ব্যয় */}
              <div
                onClick={onOpenCashbook}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] hover:border-rose-300 shadow-xs hover:shadow-md transition flex flex-col justify-between text-center cursor-pointer group"
                title="আজকের খরচ দেখতে ক্লিক করুন"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-white group-hover:scale-105 transition flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">আজকের ব্যয়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(todayMetrics.expense)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-rose-700 font-bold leading-none mt-0.5 truncate">
                    দোকান খরচ
                  </p>
                </div>
              </div>

              {/* Card 5: মোট লেনদেন */}
              <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] shadow-xs flex flex-col justify-between text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">মোট লেনদেন</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(todayMetrics.totalVolume)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    আজকের ভলিউম
                  </p>
                </div>
              </div>

              {/* Card 6: সর্বমোট খাতা */}
              <div
                onClick={() => onNavigateToTab('customers')}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-[#d2e8de] hover:border-teal-300 shadow-xs hover:shadow-md transition flex flex-col justify-between text-center cursor-pointer group"
                title="কাস্টমার তালিকা দেখতে ক্লিক করুন"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-white group-hover:scale-105 transition flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">সর্বমোট খাতা</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-slate-900 tracking-tight mt-0.5 leading-tight">
                    {todayMetrics.totalCustomers}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    কাস্টমার সংখ্যা
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Mode: Date Range Metrics */}
              {/* Card 1: মোট বাকি */}
              <div
                onClick={() => onNavigateToTab('customers')}
                className="bg-white rounded-xl p-1.5 sm:p-2 border border-rose-200 shadow-xs flex flex-col justify-between text-center cursor-pointer"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#004D40] text-amber-300 flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <CircleDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-700 leading-tight truncate">মোট বাকি</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-rose-700 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(totalDue)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-rose-600 font-bold leading-none mt-0.5 truncate">
                    বকেয়া পাওনা
                  </p>
                </div>
              </div>

              {/* Card 2: মোট আদায় (Date range collected) */}
              <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-emerald-200 shadow-xs flex flex-col justify-between text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-emerald-800 leading-tight truncate">মোট আদায়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-emerald-800 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(dateRangeMetrics.income)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-600 font-bold leading-none mt-0.5 truncate">
                    উক্ত তারিখে আদায়
                  </p>
                </div>
              </div>

              {/* Card 3: মোট আয় */}
              <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-emerald-300 shadow-xs flex flex-col justify-between text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-emerald-800 leading-tight truncate">মোট আয়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-emerald-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(dateRangeMetrics.income)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-bold leading-none mt-0.5 truncate">
                    আদায় ও ক্যাশ
                  </p>
                </div>
              </div>

              {/* Card 4: মোট ব্যয় */}
              <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-rose-300 shadow-xs flex flex-col justify-between text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-700 text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-rose-800 leading-tight truncate">মোট ব্যয়</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-rose-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(dateRangeMetrics.expense)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-rose-700 font-bold leading-none mt-0.5 truncate">
                    দোকান খরচ
                  </p>
                </div>
              </div>

              {/* Card 5: নিট লাভ / ক্যাশ */}
              <div
                className={`rounded-xl p-1.5 sm:p-2 border shadow-xs flex flex-col justify-between text-center ${
                  dateRangeMetrics.netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-400' : 'bg-rose-50/70 border-rose-400'
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs ${
                    dateRangeMetrics.netProfit >= 0 ? 'bg-emerald-800' : 'bg-rose-800'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-800 leading-tight truncate">নিট উদ্বৃত্ত</p>
                  <p
                    className={`text-xs sm:text-sm md:text-base font-black tracking-tight mt-0.5 leading-tight ${
                      dateRangeMetrics.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    ৳ {formatMoney(dateRangeMetrics.netProfit)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-slate-600 font-bold leading-none mt-0.5 truncate">
                    হাতে ক্যাশ
                  </p>
                </div>
              </div>

              {/* Card 6: মোট পণ্য বিক্রি */}
              <div className="bg-white rounded-xl p-1.5 sm:p-2 border border-teal-300 shadow-xs flex flex-col justify-between text-center">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-teal-800 text-white flex items-center justify-center font-black mx-auto mb-1 shadow-xs">
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
                </div>
                <div>
                  <p className="text-[9.5px] sm:text-[10.5px] font-bold text-teal-800 leading-tight truncate">মোট বিক্রি</p>
                  <p className="text-xs sm:text-sm md:text-base font-black text-teal-900 tracking-tight mt-0.5 leading-tight">
                    ৳ {formatMoney(dateRangeMetrics.totalSales)}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-teal-700 font-bold leading-none mt-0.5 truncate">
                    {dateRangeMetrics.txCount} টি লেনদেন
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. তারিখ অনুযায়ী হিসাব (Interactive Range Calculator & Reporter) */}
      <section
        id="dashboard-date-range-section"
        className="bg-white rounded-xl p-2.5 sm:p-3 border border-[#d3ebe0] shadow-xs shrink-0 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#004D40] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h4 className="text-xs sm:text-[13px] font-black text-slate-900 leading-tight">
                তারিখ অনুযায়ী হিসাব
              </h4>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                তারিখ পরিবর্তন করলেই স্বয়ংক্রিয় হিসাব আপডেট হবে
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => handleSetPreset('today')}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f8f5] hover:bg-teal-100 text-[#064e3b] transition cursor-pointer"
            >
              আজ
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('yesterday')}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f8f5] hover:bg-teal-100 text-[#064e3b] transition cursor-pointer"
            >
              গতকাল
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('7days')}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f8f5] hover:bg-teal-100 text-[#064e3b] transition cursor-pointer"
            >
              গত ৭ দিন
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('thisMonth')}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f8f5] hover:bg-teal-100 text-[#064e3b] transition cursor-pointer"
            >
              এই মাস
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('lastMonth')}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f8f5] hover:bg-teal-100 text-[#064e3b] transition cursor-pointer"
            >
              গত মাস
            </button>
          </div>
        </div>

        {/* Date Inputs row + Action Button */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          {/* Start Date */}
          <div className="relative bg-[#edf7f4] border border-[#cbe6dd] rounded-lg px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:border-teal-400 transition">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pointer-events-none truncate">
              <Calendar className="w-3.5 h-3.5 text-[#064e3b] shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block leading-none">শুরু</span>
                <span className="truncate leading-tight">{formatHyphenDate(startDate)}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* End Date */}
          <div className="relative bg-[#edf7f4] border border-[#cbe6dd] rounded-lg px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:border-teal-400 transition">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pointer-events-none truncate">
              <Calendar className="w-3.5 h-3.5 text-[#064e3b] shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block leading-none">শেষ</span>
                <span className="truncate leading-tight">{formatHyphenDate(endDate)}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none shrink-0" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={() => setIsDateReportModalOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-[#004D40] hover:bg-[#00382E] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" />
            <span>বিস্তারিত বিবরণী দেখুন →</span>
          </button>
        </div>

        {/* Live Calculation Results Strip */}
        <div className="bg-[#f7faf8] rounded-lg p-2 border border-[#e1ede6] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1">
            <span className="text-[10px] text-slate-500 font-bold block">মোট আয় (ক্যাশ ইন)</span>
            <span className="font-black text-emerald-800 text-xs sm:text-sm">৳ {formatMoney(dateRangeMetrics.income)}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-slate-500 font-bold block">মোট খরচ</span>
            <span className="font-black text-rose-800 text-xs sm:text-sm">৳ {formatMoney(dateRangeMetrics.expense)}</span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-slate-500 font-bold block">নিট উদ্বৃত্ত</span>
            <span className={`font-black text-xs sm:text-sm ${dateRangeMetrics.netProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              ৳ {formatMoney(dateRangeMetrics.netProfit)}
            </span>
          </div>
          <div className="p-1">
            <span className="text-[10px] text-slate-500 font-bold block">মোট বিক্রি ({dateRangeMetrics.txCount}টি)</span>
            <span className="font-black text-teal-900 text-xs sm:text-sm">৳ {formatMoney(dateRangeMetrics.totalSales)}</span>
          </div>
        </div>
      </section>

      {/* 5. প্রয়োজনীয় সেবা - 3-Column Grid Matching the Uploaded Screenshot */}
      <section
        id="dashboard-services-grid"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#e8f7f2] text-[#064e3b] flex items-center justify-center border border-[#bcebda]">
              <LayoutGrid className="w-3.5 h-3.5 text-[#064e3b]" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 leading-none tracking-tight">
              প্রয়োজনীয় সেবা
            </h3>
          </div>
          <span className="text-[10.5px] font-bold text-[#064e3b] bg-[#e4f7f1] px-2.5 py-0.5 rounded-full border border-[#b8edd9]">
            ১২টি সেবা
          </span>
        </div>

        {/* Responsive Service Grid: 3 cols on mobile, 4 cols on tablet, 6 cols on desktop/Smart TV */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 border-t border-slate-100">
          {serviceItems.map((item) => {
            const IconComponent = item.icon;

            return (
              <motion.button
                key={item.id}
                type="button"
                id={`service-btn-${item.id}`}
                onClick={item.action}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.90 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                className="relative flex flex-col items-center justify-center p-3 sm:p-4 text-center cursor-pointer transition-colors duration-150 hover:bg-[#f7faf8] active:bg-[#edf5f1] border-r border-b border-slate-100"
              >
                {item.badge && (
                  <span
                    className={`absolute top-2 right-2 text-[9.5px] font-black px-1.5 py-0.5 rounded-full shadow-2xs leading-none z-10 ${
                      (item as any).badgeClass || 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Center Icon Illustration */}
                <div className="relative flex items-center justify-center transition-transform group-hover:scale-105">
                  <IconComponent className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xs" />
                </div>

                {/* Center Bengali Label */}
                <span className="mt-2 text-xs sm:text-[13px] font-bold text-slate-800 tracking-tight leading-snug">
                  {item.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Date-wise Detailed Business Report Modal */}
      <DateWiseReportModal
        isOpen={isDateReportModalOpen}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        customers={safeCustomers}
        transactions={safeTransactions}
        expenses={expenses || []}
        store={store}
        onClose={() => setIsDateReportModalOpen(false)}
      />

      {/* Inventory & Stock Report Modal */}
      <InventoryReportModal
        isOpen={isInventoryReportOpen}
        onClose={() => setIsInventoryReportOpen(false)}
        products={products || []}
        store={store}
        onNavigateToInventory={() => onNavigateToTab('inventory')}
      />
    </div>
  );
};
