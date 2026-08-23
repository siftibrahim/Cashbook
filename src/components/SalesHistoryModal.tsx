import React, { useState, useMemo } from 'react';
import { Customer, Transaction, StoreProfile, PaymentMethod } from '../types';
import {
  formatMoney,
  formatBanglaDate,
  getPaymentMethodLabel,
  getTodayDateString,
} from '../utils/storage';
import {
  X,
  History,
  Search,
  Printer,
  Edit2,
  Trash2,
  Receipt,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  User,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
} from 'lucide-react';

interface SalesHistoryModalProps {
  isOpen: boolean;
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  onClose: () => void;
  onOpenInvoice: (tx: Transaction, customer: Customer) => void;
  onOpenEditTransaction: (tx: Transaction, customer: Customer) => void;
  onDeleteTransaction: (txId: string, customerId: string) => void;
  onShowToast: (msg: string) => void;
}

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  isOpen,
  customers,
  transactions,
  store,
  onClose,
  onOpenInvoice,
  onOpenEditTransaction,
  onDeleteTransaction,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_sales' | 'due_sales' | 'payments'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState(getTodayDateString());

  // Customer map for fast lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Flatten all transactions with their associated customer
  const allTxList = useMemo(() => {
    const list: Array<{ tx: Transaction; customer: Customer }> = [];
    const today = getTodayDateString();

    Object.entries(transactions || {}).forEach(([customerId, txs]) => {
      const cust = customerMap.get(customerId) || {
        id: customerId,
        name: 'খুচরা খরিদ্দার',
        phone: '',
        address: 'দোকান কাউন্টার',
        balance: 0,
        createdAt: 0,
        updatedAt: 0,
      };

      if (Array.isArray(txs)) {
        txs.forEach((tx) => {
          list.push({ tx, customer: cust });
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => (b.tx.createdAt || 0) - (a.tx.createdAt || 0));
  }, [transactions, customerMap]);

  // Date filter logic
  const filteredByDateAndType = useMemo(() => {
    const today = getTodayDateString();
    const todayDate = new Date();

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const weekAgoDate = new Date(todayDate);
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgo = weekAgoDate.toISOString().split('T')[0];

    const monthAgoDate = new Date(todayDate);
    monthAgoDate.setDate(monthAgoDate.getDate() - 30);
    const monthAgo = monthAgoDate.toISOString().split('T')[0];

    return allTxList.filter(({ tx, customer }) => {
      // 1. Date Filter
      if (dateFilter === 'today' && tx.date !== today) return false;
      if (dateFilter === 'yesterday' && tx.date !== yesterday) return false;
      if (dateFilter === 'week' && tx.date < weekAgo) return false;
      if (dateFilter === 'month' && tx.date < monthAgo) return false;
      if (dateFilter === 'custom' && tx.date !== customDate) return false;

      // 2. Type Filter
      const isSale = tx.type === 'sale';
      const isPaid = tx.type === 'payment';
      const isDueSale = isSale && (Number(tx.dueAmount) > 0 || (tx.paidAmount === 0 && tx.amount > 0));
      const isCashSale = isSale && (Number(tx.paidAmount) >= Number(tx.amount) || Number(tx.dueAmount) === 0);

      if (typeFilter === 'cash_sales' && !isCashSale) return false;
      if (typeFilter === 'due_sales' && !isDueSale) return false;
      if (typeFilter === 'payments' && !isPaid) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = customer.name.toLowerCase().includes(q);
        const matchesPhone = customer.phone.toLowerCase().includes(q);
        const matchesReceipt = (tx.receiptNo || '').toLowerCase().includes(q);
        const matchesDesc = (tx.description || '').toLowerCase().includes(q);
        const matchesItem = tx.items?.some((it) => it.name.toLowerCase().includes(q));

        if (!matchesName && !matchesPhone && !matchesReceipt && !matchesDesc && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [allTxList, dateFilter, customDate, typeFilter, searchQuery]);

  // Aggregate Metrics for filtered data
  const metrics = useMemo(() => {
    let totalSalesVolume = 0;
    let totalCashReceived = 0;
    let totalDueGenerated = 0;
    let totalInvoices = 0;

    filteredByDateAndType.forEach(({ tx }) => {
      if (tx.type === 'sale') {
        totalSalesVolume += Number(tx.amount || 0);
        totalInvoices += 1;
        if (tx.paidAmount !== undefined) {
          totalCashReceived += Number(tx.paidAmount || 0);
          totalDueGenerated += Number(tx.dueAmount || 0);
        } else {
          totalDueGenerated += Number(tx.amount || 0);
        }
      } else if (tx.type === 'payment') {
        totalCashReceived += Number(tx.amount || 0);
      }
    });

    return {
      totalSalesVolume,
      totalCashReceived,
      totalDueGenerated,
      totalInvoices,
    };
  }, [filteredByDateAndType]);

  if (!isOpen) return null;

  const currency = store.currencySymbol || '৳';

  return (
    <div
      id="sales-history-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <History className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight">
                বিক্রয় ও পেমেন্ট হিস্ট্রি (ক্যাশ ও বাকি মেমো)
              </h3>
              <p className="text-xs text-teal-100/90 font-medium">
                সমস্ত নগদ ও বাকি বিক্রি দেখুন, রসিদ প্রিন্ট করুন বা সংশোধন করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Metrics Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              মোট বিক্রয় মূল্য
            </span>
            <p className="text-sm sm:text-lg font-black text-slate-800 mt-0.5">
              {currency}{formatMoney(metrics.totalSalesVolume)}
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-emerald-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              মোট নগদ / ক্যাশ আদায়
            </span>
            <p className="text-sm sm:text-lg font-black text-emerald-700 mt-0.5">
              {currency}{formatMoney(metrics.totalCashReceived)}
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-red-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
              মোট বাকি বিক্রয়
            </span>
            <p className="text-sm sm:text-lg font-black text-red-600 mt-0.5">
              {currency}{formatMoney(metrics.totalDueGenerated)}
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-teal-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
              মোট মেমো সংখ্যা
            </span>
            <p className="text-sm sm:text-lg font-black text-teal-800 mt-0.5">
              {metrics.totalInvoices} টি
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="রসিদ নং, কাস্টমারের নাম, ফোন বা পণ্যের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Filter Select */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                সব
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateFilter === 'today' ? 'bg-white text-teal-800 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('yesterday')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateFilter === 'yesterday' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                গতকাল
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('week')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateFilter === 'week' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                ৭ দিন
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('month')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateFilter === 'month' ? 'bg-white text-slate-800 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                এই মাস
              </button>
            </div>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            )}
          </div>
        </div>

        {/* Type Filter Tabs */}
        <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-[#004D40] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>সব এন্ট্রি ({allTxList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('cash_sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === 'cash_sales'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>💵 নগদ বিক্রয়</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('due_sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === 'due_sales'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>🔴 বাকি বিক্রয়</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('payments')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              typeFilter === 'payments'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-teal-800 border border-teal-200 hover:bg-teal-50'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>🟢 পেমেন্ট জমা</span>
          </button>
        </div>

        {/* Transaction Invoices List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {filteredByDateAndType.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#004D40] flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-800">কোনো লেনদেন বা মেমো পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-400 mt-1">
                উপরের ফিল্টার পরিবর্তন করুন অথবা নতুন বিক্রি সম্পন্ন করুন।
              </p>
            </div>
          ) : (
            filteredByDateAndType.map(({ tx, customer }) => {
              const isSale = tx.type === 'sale';
              const paid = Number(tx.paidAmount ?? (isSale ? 0 : tx.amount));
              const due = Number(tx.dueAmount ?? (isSale ? tx.amount : 0));
              const isFullyPaid = isSale && due === 0;
              const isPartial = isSale && paid > 0 && due > 0;
              const isFullyDue = isSale && (paid === 0 || tx.paidAmount === undefined);

              return (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-400/80 transition p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSale
                          ? isFullyPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {isSale ? (
                        <Receipt className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {tx.receiptNo && (
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            #{tx.receiptNo}
                          </span>
                        )}
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {customer.name}
                        </h4>
                        {customer.phone && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({customer.phone})
                          </span>
                        )}

                        {/* Status Badges */}
                        {isSale ? (
                          isFullyPaid ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              নগদ পরিশোধিত
                            </span>
                          ) : isPartial ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              আংশিক জমা
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              বাকি বিক্রি
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                            টাকা জমা
                          </span>
                        )}
                      </div>

                      {/* Description & items */}
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        {tx.description || (isSale ? 'পিওএস বিক্রি' : 'নগদ জমা পরিশোধ')}
                      </p>

                      {tx.items && tx.items.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tx.items.slice(0, 3).map((it, idx) => (
                            <span
                              key={it.id || idx}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                            >
                              {it.name} ({it.quantity}{it.unit})
                            </span>
                          ))}
                          {tx.items.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">
                              +{tx.items.length - 3} আরও
                            </span>
                          )}
                        </div>
                      )}

                      {/* Date, Time & Payment Method */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1 font-medium text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatBanglaDate(tx.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {tx.time}
                        </span>
                        {tx.paymentMethod && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {getPaymentMethodLabel(tx.paymentMethod)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount and Action buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isSale ? 'মোট মূল্য' : 'জমা পরিমাণ'}
                      </div>
                      <div
                        className={`text-sm sm:text-base font-black ${
                          isSale ? 'text-slate-900' : 'text-emerald-700'
                        }`}
                      >
                        {currency}{formatMoney(tx.amount)}
                      </div>
                      {isSale && paid > 0 && due > 0 && (
                        <div className="text-[10px] text-slate-500 font-medium">
                          জমা: <span className="text-emerald-700 font-bold">{currency}{formatMoney(paid)}</span> • বাকি: <span className="text-red-600 font-bold">{currency}{formatMoney(due)}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Print button */}
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(tx, customer)}
                        title="রসিদ দেখুন / প্রিন্ট করুন"
                        className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#004D40] transition cursor-pointer active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => onOpenEditTransaction(tx, customer)}
                        title="লেনদেন সংশোধন / পরিবর্তন"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`আপনি কি নিশ্চিত যে এই লেনদেনটি (${currency}${formatMoney(tx.amount)}) বাতিল / মুছে ফেলতে চান?`)) {
                            onDeleteTransaction(tx.id, customer.id);
                          }
                        }}
                        title="লেনদেন বাতিল / মুছুন"
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            মোট প্রদর্শিত এন্ট্রি: <strong>{filteredByDateAndType.length}</strong> টি
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#004D40] hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
