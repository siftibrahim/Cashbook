import React, { useMemo } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { DashboardSummary } from './DashboardSummary';
import { formatMoney, formatBanglaDate, getTodayDateString } from '../utils/storage';
import { AdCard } from './ads/AdCard';
import {
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Wallet,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Store,
  CreditCard,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  Send,
  Package,
  Users,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface DashboardViewProps {
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  onOpenNewCustomer: () => void;
  onNavigateToTab: (tab: 'customers' | 'pos' | 'inventory' | 'cashbook') => void;
  onOpenAnalytics: () => void;
  onOpenCashbook: () => void;
  onOpenReport: () => void;
  onOpenSalesHistory?: () => void;
  onOpenSubscription?: () => void;
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
  onOpenNewCustomer,
  onNavigateToTab,
  onOpenAnalytics,
  onOpenCashbook,
  onOpenReport,
  onOpenSalesHistory,
  onOpenSubscription,
  onOpenSms,
  smsBalance = 0,
  pendingSmsPurchaseInfo,
  onRefreshSmsStatus,
  isSubscriptionSystemEnabled = true,
  pendingPaymentInfo,
  onRefreshSubscriptionStatus,
  onSelectCustomer,
}) => {
  const today = getTodayDateString();

  // Collect all recent transactions
  const allTransactions: { tx: Transaction; customer: Customer }[] = [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeTransactions = transactions && typeof transactions === 'object' ? transactions : {};

  const customerMap = new Map<string, Customer>();
  safeCustomers.forEach((c) => {
    if (c && c.id) customerMap.set(c.id, c);
  });

  Object.entries(safeTransactions).forEach(([custId, txList]) => {
    const cust = customerMap.get(custId) || {
      id: custId,
      name: 'কাস্টমার',
      phone: '',
      address: '',
      balance: 0,
      category: 'regular',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (Array.isArray(txList)) {
      txList.forEach((tx) => {
        if (tx) {
          allTransactions.push({ tx, customer: cust });
        }
      });
    }
  });

  allTransactions.sort((a, b) => (b.tx?.createdAt || 0) - (a.tx?.createdAt || 0));
  const recentTxs = allTransactions.slice(0, 8);

  const currency = store.currencySymbol || '৳';

  // Subscription calculation
  const rawSubExpiry = (store as any)?.subscriptionExpiresAt;
  const expiresAt = useMemo(() => {
    return rawSubExpiry ? Number(rawSubExpiry) : Date.now() + 14 * 86400000;
  }, [rawSubExpiry]);
  const daysLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
  const isExpired = Date.now() > expiresAt;
  const currentPlan = (store as any)?.subscriptionPlan || '১৪ দিনের ফ্রি ট্রায়াল';

  return (
    <div className="flex-1 flex flex-col gap-5 sm:gap-6 pb-8 text-slate-800">
      {/* Modern Generation Welcome Header Banner */}
      <section className="bg-gradient-to-r from-[#004D40] via-[#005B4D] to-teal-800 text-white rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Store className="w-7 h-7 sm:w-8 sm:h-8 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                  {store.name || 'আমার ব্যবসা প্রতিষ্ঠান'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>লাইভ খাতা</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100 font-medium mt-1 flex items-center gap-2">
                <span>প্রোপাইটর: <strong>{store.owner || 'দোকানদার'}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-300" />
                  <span>{formatBanglaDate(today)}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenNewCustomer}
              className="px-4 py-2.5 rounded-2xl bg-white text-[#004D40] hover:bg-teal-50 active:scale-95 font-black text-xs sm:text-sm shadow-sm transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4 text-[#004D40]" />
              <span>+ নতুন কাস্টমার</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('pos')}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 font-black text-xs sm:text-sm shadow-sm transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <ShoppingCart className="w-4 h-4 text-slate-950" />
              <span>পিওএস বিক্রয়</span>
            </button>
          </div>
        </div>
      </section>

      {/* Top Due Metric Hero Card (Zoomed & Clean) */}
      <DashboardSummary customers={customers} transactions={transactions} />

      {/* Subscription Plan & Status Banner (Only when Subscription System is Enabled) */}
      {isSubscriptionSystemEnabled && onOpenSubscription && (
        <>
          {pendingPaymentInfo?.hasPending ? (
            /* CASE A: PENDING PAYMENT VERIFICATION BANNER */
            <section className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/70 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-400/40">
                  <Clock className="w-6 h-6 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-200 text-amber-950 text-xs font-black uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                      <span>পেমেন্ট ভেরিফিকেশন চলছে...</span>
                    </span>
                    {pendingPaymentInfo.record?.trxId && (
                      <span className="text-xs font-mono font-bold text-amber-950 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300">
                        TrxID: {pendingPaymentInfo.record.trxId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-amber-950 font-semibold leading-relaxed">
                    {pendingPaymentInfo.record?.planName ? `${pendingPaymentInfo.record.planName} (৳${formatMoney(pendingPaymentInfo.record.amount)}) - ` : ''}
                    সুপার অ্যাডমিন পেমেন্ট চেক করে অনুমোদন করলেই আপনার সাবস্ক্রিপশন চালু হয়ে যাবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                {onRefreshSubscriptionStatus && (
                  <button
                    type="button"
                    onClick={() => onRefreshSubscriptionStatus()}
                    title="স্ট্যাটাস রিফ্রেশ করুন"
                    className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">রিফ্রেশ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>পেমেন্ট বিস্তারিত / পরিবর্তন</span>
                </button>
              </div>
            </section>
          ) : (
            /* CASE B: STANDARD SUBSCRIPTION STATUS BANNER */
            <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-slate-900">
                      প্যাকেজ: <span className="text-teal-800 font-extrabold">{currentPlan}</span>
                    </span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      isExpired 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                        : daysLeft <= 3 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isExpired
                        ? '⚠️ মেয়াদ উত্তীর্ণ'
                        : daysLeft <= 3
                        ? `⚠️ মেয়াদ শেষ হতে ${daysLeft} দিন বাকি`
                        : `✅ সক্রিয় (${daysLeft} দিন বাকি)`}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    {isExpired
                      ? 'আপনার অ্যাকাউন্টের মেয়াদ শেষ হয়েছে। হিসাবের সকল সেবা চালু রাখতে সাবস্ক্রিপশন রিনিউ করুন।'
                      : daysLeft <= 3
                      ? 'মেয়াদ শেষ হওয়ার আগেই সাবস্ক্রিপশন রিনিউ করে নিরবচ্ছিন্ন সেবা উপভোগ করুন।'
                      : 'আপনার অ্যাকাউন্টের সাবস্ক্রিপশন সক্রিয় রয়েছে। মেয়াদ শেষ হওয়ার ৩ দিন আগে রিনিউ চালু হবে।'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSubscription}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 active:scale-95 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
              >
                <CreditCard className="w-4 h-4 text-amber-300" />
                <span>
                  {isExpired ? 'এখনই রিনিউ করুন' : daysLeft <= 3 ? 'প্যাকেজ রিনিউ করুন' : 'সাবস্ক্রিপশন বিবরণ'}
                </span>
              </button>
            </section>
          )}
        </>
      )}

      {/* SMS Purchase & Balance Status Banner */}
      {pendingSmsPurchaseInfo?.hasPending ? (
        /* CASE A: SMS PURCHASE PENDING */
        <section className="bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-teal-500/60 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-700 flex items-center justify-center font-bold shrink-0 border border-teal-400/40">
              <Clock className="w-6 h-6 text-teal-600 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-200 text-teal-950 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                  <span>এসএমএস প্যাক পেন্ডিং (অনুমোদনের অপেক্ষায়)...</span>
                </span>
                {pendingSmsPurchaseInfo.record?.trxId && (
                  <span className="text-xs font-mono font-bold text-teal-950 bg-teal-100/90 px-2.5 py-0.5 rounded-lg border border-teal-300">
                    TrxID: {pendingSmsPurchaseInfo.record.trxId}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-teal-950 font-semibold leading-relaxed">
                {pendingSmsPurchaseInfo.record?.smsCount || 0}টি SMS (৳{formatMoney(pendingSmsPurchaseInfo.record?.amount || 0)}) - সুপার অ্যাডমিন পেমেন্ট চেক করলেই প্রোফাইলে এসএমএস ব্যালেন্স যুক্ত হবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {onRefreshSmsStatus && (
              <button
                type="button"
                onClick={() => onRefreshSmsStatus()}
                title="স্ট্যাটাস রিফ্রেশ করুন"
                className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-teal-200/80 hover:bg-teal-300 text-teal-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">রিফ্রেশ</span>
              </button>
            )}
            {onOpenSms && (
              <button
                type="button"
                onClick={onOpenSms}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>এসএমএস বক্স</span>
              </button>
            )}
          </div>
        </section>
      ) : (
        /* CASE B: SMS SERVICE READY & COUNTING */
        <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-slate-900">
                  তাগাদা এসএমএস ব্যালেন্স:{' '}
                  <span className="text-teal-700 font-black text-base sm:text-lg">{smsBalance}টি SMS</span>
                </span>
                {pendingSmsPurchaseInfo?.latestConfirmed && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    সাকসেসফুল ({pendingSmsPurchaseInfo.latestConfirmed.smsCount}টি ক্রয়কৃত)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                কাস্টমারদের বাকি তাগাদা এসএমএস পাঠালে এখান থেকে অটো কাউন্ট হয়ে প্রতি এসএমএসে ১টি ব্যালেন্স কমবে।
              </p>
            </div>
          </div>

          {onOpenSms && (
            <button
              type="button"
              onClick={onOpenSms}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>এসএমএস পাঠান / রিচার্জ</span>
            </button>
          )}
        </section>
      )}

      {/* Modern Gen-Z Bento Quick Action Hub */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            <span>কুইক অ্যাকশন মেনু</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">সহজ এক ট্যাপে কাজ শুরু করুন</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="p-4 rounded-2xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#004D40] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-black text-teal-950">+ নতুন কাস্টমার</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('pos')}
            className="p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-black text-amber-950">বিক্রয় ও পিওএস</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('inventory')}
            className="p-4 rounded-2xl bg-cyan-50/70 hover:bg-cyan-100/80 border border-cyan-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-black text-cyan-950">পণ্য ও মালামাল</span>
          </button>

          <button
            type="button"
            onClick={onOpenCashbook}
            className="p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-black text-emerald-950">দৈনিক ক্যাশবুক</span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs sm:text-sm font-black text-indigo-950">বাকি খাতা রিপোর্ট</span>
          </button>

          {onOpenSms ? (
            <button
              type="button"
              onClick={onOpenSms}
              className="p-4 rounded-2xl bg-teal-50/70 hover:bg-teal-100/80 border border-teal-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-black text-teal-950">তাগাদা এসএমএস</span>
            </button>
          ) : isSubscriptionSystemEnabled && onOpenSubscription ? (
            <button
              type="button"
              onClick={onOpenSubscription}
              className="p-4 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/90 flex flex-col items-center justify-center gap-2 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
                <Sparkles className="w-6 h-6 text-amber-200" />
              </div>
              <span className="text-xs sm:text-sm font-black text-purple-950">সাবস্ক্রিপশন</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* Store Quick Stats Grid (Clean 3-Bento layout) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigateToTab('customers')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-teal-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs sm:text-sm mb-1.5">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>মোট কাস্টমার তালিকা</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">
            {safeCustomers.filter((c) => c && c.id !== 'cust_counter_cash').length} জন
          </p>
          <p className="text-xs text-teal-700 font-bold mt-1">কাস্টমারদের বাকি দেখতে ট্যাপ করুন →</p>
        </div>

        <div
          onClick={onOpenAnalytics}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-indigo-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs sm:text-sm mb-1.5">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>আর্থিক অ্যানালিটিক্স</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-900">চার্ট ও রিপোর্ট</p>
          <p className="text-xs text-indigo-600 font-bold mt-1">মাসিক ট্রেন্ড ও বিশ্লেষণ দেখুন →</p>
        </div>

        <div
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-cyan-500 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-xs sm:text-sm mb-1.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>পণ্য ও ইনভেন্টরি</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">মজুদ ও দাম</p>
          <p className="text-xs text-cyan-700 font-bold mt-1">স্টক লিস্ট ও বারকোড পরিচালনা →</p>
        </div>
      </section>

      {/* Sponsored Banner / Ad Card */}
      <AdCard />

      {/* Recent Activity List (Zoomed, High-Contrast & Clear) */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              <span>সাম্প্রতিক লেনদেনসমূহ</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              কাস্টমারদের সর্বশেষ বেচাকেনা ও জমার তথ্য
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSalesHistory ? onOpenSalesHistory : () => onNavigateToTab('customers')}
            className="text-xs sm:text-sm font-black text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-teal-50 px-3.5 py-1.5 rounded-xl border border-teal-200/80 transition"
          >
            <span>সব দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm font-medium">
            এখনও কোনো লেনদেন লিপিবদ্ধ করা হয়নি। কাস্টমার তৈরি করে বা পিওএস বিক্রয় করে হিসাব শুরু করুন।
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTxs.map(({ tx, customer }) => {
              const isPayment = tx.type === 'payment';
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className="p-4 sm:p-5 hover:bg-slate-50 flex items-center justify-between gap-3 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm shadow-2xs ${
                        isPayment ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPayment ? (
                        <ArrowDownLeft className="w-6 h-6" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-black text-slate-900 truncate">
                        {customer.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            isPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isPayment ? 'জমা পেয়েছেন' : 'বাকি বিক্রি'}
                        </span>
                        <span>•</span>
                        <span>{tx.date}</span>
                        {tx.time && <span>{tx.time}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-base sm:text-lg font-black ${
                        isPayment ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isPayment ? '+' : '-'} ৳ {formatMoney(tx.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold">বিস্তারিত খাতা খুলুন →</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
