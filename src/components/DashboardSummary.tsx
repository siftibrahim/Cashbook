import React from 'react';
import { Customer, Transaction } from '../types';
import { formatMoney, getTodayDateString } from '../utils/storage';
import { ArrowDownLeft, ArrowUpRight, Wallet, Users, TrendingUp } from 'lucide-react';

interface DashboardSummaryProps {
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ customers, transactions }) => {
  const today = getTodayDateString();

  let totalDue = 0;
  let totalAdvance = 0;
  let customerWithDueCount = 0;

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeTransactions = transactions && typeof transactions === 'object' ? transactions : {};

  safeCustomers.forEach((c) => {
    if (!c) return;
    const bal = Number(c.balance || 0);
    if (bal > 0) {
      totalDue += bal;
      customerWithDueCount += 1;
    } else if (bal < 0) {
      totalAdvance += Math.abs(bal);
    }
  });

  let todaySale = 0;
  let todayPaid = 0;
  let todayTxCount = 0;

  (Object.values(safeTransactions) as Transaction[][]).forEach((txList) => {
    if (!Array.isArray(txList)) return;
    txList.forEach((t) => {
      if (!t) return;
      if (t.date === today) {
        todayTxCount++;
        if (t.type === 'sale') todaySale += Number(t.amount || 0);
        if (t.type === 'payment') todayPaid += Number(t.amount || 0);
      }
    });
  });

  return (
    <section className="shrink-0 no-print">
      {/* Modern Scaled-Up Hero Summary Card */}
      <div className="w-full bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/90 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12" />

        <div className="relative z-10 flex flex-col gap-5">
          {/* Top Row: Label & Wallet Badge */}
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-black uppercase tracking-wider mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>মোট বাকি পাওনা (হিসাব খাতা)</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-teal-700">৳</span>
                <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight">
                  {formatMoney(totalDue)}
                </span>
              </div>
            </div>

            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-700/20">
              <Wallet className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>

          {/* Customer Due Count Badge & Quick Insights */}
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200/80 font-bold text-xs sm:text-sm">
              <Users className="w-4 h-4 text-rose-600" />
              <span>{customerWithDueCount} জন কাস্টমারের কাছে বাকি রয়েছে</span>
            </span>

            {totalAdvance > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/80 font-bold text-xs sm:text-sm">
                <span>অগ্রিম জমা: ৳{formatMoney(totalAdvance)}</span>
              </span>
            )}
          </div>

          {/* Bottom Bento Metric Cards (Today's Recovery & Today's Credit Sales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
            {/* Today's Cash In / Recovery */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 shadow-2xs hover:bg-emerald-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">আজকের নগদ জমা</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-800">
                    ৳ {formatMoney(todayPaid)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-200/70 text-emerald-900">
                আদায়
              </span>
            </div>

            {/* Today's Credit Sales */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-rose-50/70 border border-rose-200/90 shadow-2xs hover:bg-rose-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">আজকের বাকি বিক্রি</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-800">
                    ৳ {formatMoney(todaySale)}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-200/70 text-rose-900">
                বাকি খাতা
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
