import React from 'react';
import { Customer, Transaction } from '../types';
import { formatMoney, getTodayDateString } from '../utils/storage';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

interface DashboardSummaryProps {
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ customers, transactions }) => {
  const today = getTodayDateString();

  let totalDue = 0;
  let totalAdvance = 0;
  let customerWithDueCount = 0;

  customers.forEach((c) => {
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

  (Object.values(transactions) as Transaction[][]).forEach((txList) => {
    txList.forEach((t) => {
      if (t.date === today) {
        if (t.type === 'sale') todaySale += Number(t.amount || 0);
        if (t.type === 'payment') todayPaid += Number(t.amount || 0);
      }
    });
  });

  return (
    <section className="shrink-0 no-print">
      {/* Total Due Big Metric Card */}
      <div className="w-full bg-linear-to-br from-white via-white to-teal-50/40 rounded-2xl p-3.5 sm:p-5 shadow-xs sm:shadow-sm border border-slate-200/90 flex flex-col justify-between gap-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span>মোট বাকি পাওনা (সব কাস্টমার)</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#004D40] tracking-tight flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl text-teal-600 font-bold">৳</span>
              <span>{formatMoney(totalDue)}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {customerWithDueCount} জন কাস্টমারের কাছে বাকি রয়েছে
            </p>
          </div>

          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00695C] shrink-0 shadow-inner">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Today's Sales and Recovery Pills */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between gap-1 text-xs text-emerald-800 font-bold bg-emerald-50/90 border border-emerald-200/80 px-3 py-2 rounded-xl">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-600">আজকের জমা:</span>
            </span>
            <span className="text-emerald-700 font-black">৳ {formatMoney(todayPaid)}</span>
          </div>

          <div className="flex items-center justify-between gap-1 text-xs text-red-800 font-bold bg-red-50/90 border border-red-200/80 px-3 py-2 rounded-xl">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-slate-600">আজকের বাকি:</span>
            </span>
            <span className="text-red-700 font-black">৳ {formatMoney(todaySale)}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
