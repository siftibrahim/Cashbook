import React, { useState, useMemo } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

interface AnalyticsModalProps {
  isOpen: boolean;
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  expenses?: any[];
  store: StoreProfile;
  onClose: () => void;
}

type TimeRange = '7days' | '30days' | 'all';

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  customers,
  transactions,
  store,
  onClose,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');

  // Flatten all transactions
  const allTxs = useMemo(() => {
    const list: Transaction[] = [];
    (Object.values(transactions || {}) as Transaction[][]).forEach((txList) => {
      if (Array.isArray(txList)) {
        list.push(...txList);
      }
    });
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [transactions]);

  // Key KPI metrics
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const dueCustomers = customers.filter((c) => Number(c.balance || 0) > 0);
    const totalDue = customers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
    const totalAdvance = customers.reduce((sum, c) => sum + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);

    let totalSales = 0;
    let totalPayments = 0;

    allTxs.forEach((tx) => {
      if (tx.type === 'sale') totalSales += Number(tx.amount || 0);
      if (tx.type === 'payment') totalPayments += Number(tx.amount || 0);
    });

    const recoveryRate = totalSales > 0 ? Math.min(100, Math.round((totalPayments / totalSales) * 100)) : 100;

    return {
      totalCustomers,
      dueCustomersCount: dueCustomers.length,
      paidCustomersCount: totalCustomers - dueCustomers.length,
      totalDue,
      totalAdvance,
      totalSales,
      totalPayments,
      recoveryRate,
    };
  }, [customers, allTxs]);

  // Daily Chart Data for the selected range
  const chartData = useMemo(() => {
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 60;
    const result: Array<{ date: string; displayDate: string; sale: number; payment: number }> = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const displayDate = `${day}/${month}`;

      let daySale = 0;
      let dayPayment = 0;

      allTxs.forEach((tx) => {
        if (tx.date === dateKey) {
          if (tx.type === 'sale') daySale += Number(tx.amount || 0);
          if (tx.type === 'payment') dayPayment += Number(tx.amount || 0);
        }
      });

      result.push({
        date: dateKey,
        displayDate,
        sale: daySale,
        payment: dayPayment,
      });
    }

    return result;
  }, [allTxs, timeRange]);

  // Top Debtors (শীর্ষ ৫ বাকিদার)
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter((c) => Number(c.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      .slice(0, 5);
  }, [customers]);

  // Payment Methods breakdown
  const paymentMethodsBreakdown = useMemo(() => {
    let cash = 0;
    let bkash = 0;
    let nagad = 0;
    let other = 0;

    allTxs
      .filter((tx) => tx.type === 'payment')
      .forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.paymentMethod === 'bkash') bkash += amt;
        else if (tx.paymentMethod === 'nagad') nagad += amt;
        else if (tx.paymentMethod === 'rocket' || tx.paymentMethod === 'bank' || tx.paymentMethod === 'other') other += amt;
        else cash += amt;
      });

    const total = cash + bkash + nagad + other || 1;
    return [
      { label: 'নগদ ক্যাশ', amount: cash, percent: Math.round((cash / total) * 100), color: 'bg-emerald-600' },
      { label: 'বিকাশ (bKash)', amount: bkash, percent: Math.round((bkash / total) * 100), color: 'bg-pink-600' },
      { label: 'নগদ (Nagad)', amount: nagad, percent: Math.round((nagad / total) * 100), color: 'bg-orange-600' },
      { label: 'অন্যান্য / ব্যাংক', amount: other, percent: Math.round((other / total) * 100), color: 'bg-indigo-600' },
    ];
  }, [allTxs]);

  if (!isOpen) return null;

  const currency = store.currencySymbol || '৳';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-inner">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>দোকানের স্মার্ট অ্যানালিটিক্স ও রিপোর্ট</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-800/80 border border-teal-600 text-teal-200">
                  Version 2.0
                </span>
              </h2>
              <p className="text-xs text-teal-100 font-medium">আদায়, বাকি ও বিক্রির আধুনিক চিত্র</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              title="প্রিন্ট রিপোর্ট"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/60">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট বাকি পাওনা</span>
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-black text-red-600">
                {currency} {formatMoney(stats.totalDue)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {stats.dueCustomersCount} জন কাস্টমার
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট জমা / আদায়</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-black text-emerald-600">
                {currency} {formatMoney(stats.totalPayments)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                আদায়ের হার: <span className="font-bold text-emerald-700">{stats.recoveryRate}%</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট বিক্রয় / বাকি দেওয়া</span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-black text-slate-800">
                {currency} {formatMoney(stats.totalSales)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                সর্বমোট লেনদেন: {allTxs.length}টি
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট কাস্টমার</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-black text-slate-800">
                {stats.totalCustomers} জন
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                পরিশোধিত: {stats.paidCustomersCount} জন
              </p>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  <span>দৈনিক বিক্রয় ও আদায় ট্রেন্ড (Sales vs Collection)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">প্রতিদিনের টাকার প্রবাহ ও তুলনামূলক চিত্র</p>
              </div>

              {/* Time Range Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTimeRange('7days')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    timeRange === '7days' ? 'bg-[#00695C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  গত ৭ দিন
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('30days')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    timeRange === '30days' ? 'bg-[#00695C] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  গত ৩০ দিন
                </button>
              </div>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    formatter={(value: any) => [`${currency} ${formatMoney(Number(value || 0))}`, '']}
                    labelFormatter={(label) => `তারিখ: ${label}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (value === 'sale' ? 'বিক্রয় / বাকি দেওয়া' : 'টাকা জমা / আদায়')}
                  />
                  <Bar dataKey="sale" fill="#E11D48" radius={[6, 6, 0, 0]} name="sale" />
                  <Bar dataKey="payment" fill="#059669" radius={[6, 6, 0, 0]} name="payment" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Debtors & Payment Method Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Debtors */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>শীর্ষ ৫ জন বাকিদার (Top Debtors)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3">যাদের কাছে সবচেয়ে বেশি টাকা পাওনা রয়েছে</p>

                {topDebtors.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">কোনো বকেয়া নেই! সব হিসাব পরিশোধিত।</div>
                ) : (
                  <div className="space-y-2.5">
                    {topDebtors.map((deb, idx) => {
                      const percentage = Math.min(100, Math.round((Number(deb.balance) / (stats.totalDue || 1)) * 100));
                      return (
                        <div key={deb.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] flex items-center justify-center font-black">
                                {idx + 1}
                              </span>
                              <span>{deb.name}</span>
                            </span>
                            <span className="text-red-600 font-black">
                              {currency} {formatMoney(deb.balance)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-red-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" />
                  <span>পেমেন্ট মাধ্যম অনুপাত (Payment Channels)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-3">কাস্টমাররা যে মাধ্যমে টাকা পরিশোধ করছেন</p>

                <div className="space-y-3">
                  {paymentMethodsBreakdown.map((pm) => (
                    <div key={pm.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-700">{pm.label}</span>
                        <span className="text-slate-900 font-black">
                          {currency} {formatMoney(pm.amount)} ({pm.percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`${pm.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${pm.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>সব তথ্য ফায়ারবেস ক্লাউডে স্বয়ংক্রিয়ভাবে সংরক্ষিত ও ব্যাকআপ করা হচ্ছে।</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3.5 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">ডিজিটাল খাতা অ্যানালিটিক্স ইঞ্জিন</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
