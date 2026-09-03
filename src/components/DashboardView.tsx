import React, { useMemo } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { DashboardSummary } from './DashboardSummary';
import { formatMoney, formatBanglaDate } from '../utils/storage';
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
  Zap,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
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
  pendingPaymentInfo,
  onRefreshSubscriptionStatus,
  onSelectCustomer,
}) => {
  // Collect all recent transactions
  const allTransactions: { tx: Transaction; customer: Customer }[] = [];
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  Object.entries(transactions).forEach(([custId, txList]) => {
    const cust = customerMap.get(custId);
    if (cust && Array.isArray(txList)) {
      txList.forEach((tx) => {
        allTransactions.push({ tx, customer: cust });
      });
    }
  });

  allTransactions.sort((a, b) => (b.tx.createdAt || 0) - (a.tx.createdAt || 0));
  const recentTxs = allTransactions.slice(0, 8);

  const currency = store.currencySymbol || '৳';

  // Subscription calculation
  const rawSubExpiry = (store as any)?.subscriptionExpiresAt;
  const expiresAt = useMemo(() => {
    return rawSubExpiry ? Number(rawSubExpiry) : (Date.now() + 14 * 86400000);
  }, [rawSubExpiry]);
  const daysLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
  const isExpired = Date.now() > expiresAt;
  const currentPlan = (store as any)?.subscriptionPlan || '১৪ দিনের ফ্রি ট্রায়াল';

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-5 pb-6">
      {/* Top Due Metric Card */}
      <DashboardSummary
        customers={customers}
        transactions={transactions}
      />

      {/* Subscription Plan & Status Banner */}
      {onOpenSubscription && (
        <>
          {pendingPaymentInfo?.hasPending ? (
            /* CASE A: PENDING PAYMENT VERIFICATION BANNER */
            <section className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/60 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-400/40">
                  <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                      <span>পেমেন্ট ভেরিফিকেশন চলছে...</span>
                    </span>
                    {pendingPaymentInfo.record?.trxId && (
                      <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                        TrxID: {pendingPaymentInfo.record.trxId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-950 font-semibold leading-relaxed">
                    {pendingPaymentInfo.record?.planName ? `${pendingPaymentInfo.record.planName} (৳${formatMoney(pendingPaymentInfo.record.amount)}) - ` : ''}
                    সুপার অ্যাডমিন অনুমোদন করলেই আপনার সাবস্ক্রিপশন স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {onRefreshSubscriptionStatus && (
                  <button
                    type="button"
                    onClick={() => onRefreshSubscriptionStatus()}
                    title="স্ট্যাটাস রিফ্রেশ করুন"
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">রিফ্রেশ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>পেমেন্ট বিস্তারিত / পরিবর্তন</span>
                </button>
              </div>
            </section>
          ) : (
            /* CASE B: STANDARD SUBSCRIPTION STATUS BANNER */
            <section className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 border border-amber-300/40 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-400/30">
                  <Sparkles className="w-5 h-5 animate-pulse text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">প্যাকেজ: <span className="font-extrabold text-teal-800">{currentPlan}</span></span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
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
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isExpired
                      ? 'আপনার অ্যাকাউন্টের মেয়াদ শেষ হয়েছে। হিসাবের সকল সেবা চালু রাখতে সাবস্ক্রিপশন রিনিউ করুন।'
                      : daysLeft <= 3
                      ? 'মেয়াদ শেষ হওয়ার আগেই সাবস্ক্রিপশন রিনিউ করে নিরবচ্ছিন্ন সেবা উপভোগ করুন।'
                      : 'আপনার অ্যাকাউন্টের সাবস্ক্রিপশন সক্রিয় রয়েছে। মেয়াদ শেষ হওয়ার ৩ দিন আগে রিনিউ অপশন চালু হবে।'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSubscription}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#004D40] to-teal-700 hover:from-[#00382E] hover:to-teal-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0"
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

      {/* Quick Action Hub */}
      <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#004D40]" />
          <span>কুইক অ্যাকশন মেনু</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="p-3 rounded-xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#004D40] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-teal-900">+ নতুন কাস্টমার</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('pos')}
            className="p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-amber-900">বিক্রয় ও পিওএস</span>
          </button>

          <button
            type="button"
            onClick={onOpenCashbook}
            className="p-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-900">দৈনিক ক্যাশবুক</span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="p-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-indigo-900">বাকি খাতা রিপোর্ট</span>
          </button>

          {onOpenSubscription && (
            <button
              type="button"
              onClick={onOpenSubscription}
              className="p-3 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <Sparkles className="w-4 h-4 text-amber-200" />
              </div>
              <span className="text-xs font-bold text-purple-900">প্যাকেজ ও সাবস্ক্রিপশন</span>
            </button>
          )}

          {onOpenSms && (
            <button
              type="button"
              onClick={onOpenSms}
              className="p-3 rounded-xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/90 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 cursor-pointer shadow-2xs group"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-teal-900">এসএমএস প্যাক</span>
            </button>
          )}
        </div>
      </section>

      {/* Store Quick Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div
          onClick={() => onNavigateToTab('customers')}
          className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-teal-400 transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-[11px] mb-1">
            <span>মোট কাস্টমার</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800">
            {customers.filter((c) => c && c.id !== 'cust_counter_cash').length} জন
          </p>
          <p className="text-[10px] text-teal-700 font-bold mt-0.5">তালিকায় যেতে ট্যাপ করুন</p>
        </div>

        <div
          onClick={onOpenAnalytics}
          className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-indigo-400 transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-[11px] mb-1">
            <span>আর্থিক অ্যানালিটিক্স</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-700">চার্ট ও রিপোর্ট</p>
          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">গ্রাফ ও ট্রেন্ড দেখতে ট্যাপ করুন</p>
        </div>

        <div
          onClick={() => onNavigateToTab('inventory')}
          className="col-span-2 sm:col-span-1 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between text-slate-500 font-bold text-[11px] mb-1">
            <span>পণ্য ও মালামাল</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-800">মজুদ ও রেট</p>
          <p className="text-[10px] text-amber-600 font-bold mt-0.5">স্টক লিস্ট খুলুন</p>
        </div>
      </section>

      {/* Sponsored Ad Card */}
      <AdCard />

      {/* Recent Activity List */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-teal-700" />
            <span>সাম্প্রতিক লেনদেনসমূহ</span>
          </h3>
          <button
            type="button"
            onClick={onOpenSalesHistory ? onOpenSalesHistory : () => onNavigateToTab('customers')}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-0.5 cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60"
          >
            <span>সকল হিস্ট্রি দেখুন</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            এখনও কোনো লেনদেন লিপিবদ্ধ করা হয়নি।
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTxs.map(({ tx, customer }) => {
              const isPayment = tx.type === 'payment';
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className="p-3 sm:p-3.5 hover:bg-slate-50 flex items-center justify-between gap-2 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isPayment ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isPayment ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {customer.name}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{formatBanglaDate(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.time}</span>
                        {tx.description && <span>• {tx.description}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs sm:text-sm font-black ${
                        isPayment ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isPayment ? '+ ' : '- '}
                      {currency} {formatMoney(tx.amount)}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isPayment ? 'জমা পেয়েছেন' : 'বাকি দিয়েছেন'}
                    </span>
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
