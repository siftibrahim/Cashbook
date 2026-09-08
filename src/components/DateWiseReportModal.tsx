import React, { useState, useMemo } from 'react';
import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';
import {
  formatMoney,
  formatBanglaDate,
  getTodayDateString,
  getPaymentMethodLabel,
  getExpenseCategoryLabel,
} from '../utils/storage';
import { executeSafePrint, downloadReceiptPDF } from '../utils/printHelper';
import {
  X,
  Printer,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  Filter,
  Users,
  ShoppingBag,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface DateWiseReportModalProps {
  isOpen: boolean;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  expenses: DailyExpense[];
  store: StoreProfile;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type TabFilter = 'all' | 'income' | 'expense' | 'sales';

export const DateWiseReportModal: React.FC<DateWiseReportModalProps> = ({
  isOpen,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  customers,
  transactions,
  expenses,
  store,
  onClose,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

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

  // Quick date presets
  const handleSetPreset = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toStr(now);
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toStr(y);
      onStartDateChange(yStr);
      onEndDateChange(yStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      onStartDateChange(toStr(past));
      onEndDateChange(toStr(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      onStartDateChange(toStr(firstDay));
      onEndDateChange(toStr(now));
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      onStartDateChange(toStr(firstDay));
      onEndDateChange(toStr(lastDay));
    }
  };

  // Customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    (customers || []).forEach((c) => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [customers]);

  // Compile all ledger items within date range
  const {
    ledgerItems,
    totalIncome,
    totalExpense,
    totalSales,
    cashSales,
    dueSales,
    netBalance,
  } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let sales = 0;
    let cSales = 0;
    let dSales = 0;

    interface LedgerEntry {
      id: string;
      category: 'payment' | 'sale' | 'expense' | 'other_income';
      date: string;
      time: string;
      timestamp: number;
      title: string;
      subtitle: string;
      description: string;
      amount: number;
      cashPortion: number;
      duePortion: number;
      method: string;
    }

    const items: LedgerEntry[] = [];

    // 1. Process customer transactions
    Object.entries(transactions || {}).forEach(([customerId, txList]) => {
      if (!Array.isArray(txList)) return;
      const cust = customerMap.get(customerId);
      const custName =
        cust?.name ||
        (customerId === 'cust_counter_cash' ? 'কাউন্টার নগদ ক্রেতা' : 'সাধারণ কাস্টমার');
      const custPhone = cust?.phone || '';

      txList.forEach((tx) => {
        if (!tx || !tx.date) return;
        if (isDateInRange(tx.date, startDate, endDate)) {
          const amt = Number(tx.amount || 0);

          if (tx.type === 'payment') {
            inc += amt;
            items.push({
              id: tx.id,
              category: 'payment',
              date: tx.date,
              time: tx.time || '',
              timestamp: tx.createdAt || 0,
              title: custName,
              subtitle: custPhone ? `ফোন: ${custPhone}` : 'বাকি আদায়',
              description: tx.description || 'বাকি আদায় / পেমেন্ট',
              amount: amt,
              cashPortion: amt,
              duePortion: 0,
              method: tx.paymentMethod ? getPaymentMethodLabel(tx.paymentMethod) : 'ক্যাশ',
            });
          } else if (tx.type === 'sale') {
            sales += amt;
            const paid = Number(tx.paidAmount || 0);
            const due = amt > paid ? amt - paid : 0;
            cSales += paid;
            dSales += due;
            if (paid > 0) inc += paid;

            items.push({
              id: tx.id,
              category: 'sale',
              date: tx.date,
              time: tx.time || '',
              timestamp: tx.createdAt || 0,
              title: custName,
              subtitle:
                due > 0
                  ? `নগদ: ৳${formatMoney(paid)} | বাকি: ৳${formatMoney(due)}`
                  : 'সম্পূর্ণ নগদ বিক্রয়',
              description:
                tx.description ||
                (tx.items && tx.items.length > 0
                  ? tx.items.map((i) => `${i.name} (${i.quantity})`).join(', ')
                  : 'পণ্য বিক্রয়'),
              amount: amt,
              cashPortion: paid,
              duePortion: due,
              method: tx.paymentMethod ? getPaymentMethodLabel(tx.paymentMethod) : 'ক্যাশ',
            });
          }
        }
      });
    });

    // 2. Process daily expenses
    (expenses || []).forEach((e) => {
      if (!e || !e.date) return;
      if (isDateInRange(e.date, startDate, endDate)) {
        const amt = Number(e.amount || 0);
        if (e.type === 'expense') {
          exp += amt;
          items.push({
            id: e.id,
            category: 'expense',
            date: e.date,
            time: e.time || '',
            timestamp: e.createdAt || 0,
            title: getExpenseCategoryLabel(e.category),
            subtitle: 'দোকান খরচ',
            description: e.description || 'সাধারণ খরচ',
            amount: amt,
            cashPortion: amt,
            duePortion: 0,
            method: 'ক্যাশ',
          });
        } else if (e.type === 'income') {
          inc += amt;
          items.push({
            id: e.id,
            category: 'other_income',
            date: e.date,
            time: e.time || '',
            timestamp: e.createdAt || 0,
            title: getExpenseCategoryLabel(e.category) || 'অন্যান্য আয়',
            subtitle: 'অতিরিক্ত ক্যাশ-ইন',
            description: e.description || 'অন্যান্য আয়',
            amount: amt,
            cashPortion: amt,
            duePortion: 0,
            method: 'ক্যাশ',
          });
        }
      }
    });

    // Sort newest to oldest
    items.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.timestamp - a.timestamp;
    });

    return {
      ledgerItems: items,
      totalIncome: inc,
      totalExpense: exp,
      totalSales: sales,
      cashSales: cSales,
      dueSales: dSales,
      netBalance: inc - exp,
    };
  }, [customers, transactions, expenses, startDate, endDate, customerMap]);

  // Filtered by tab and search
  const filteredItems = useMemo(() => {
    return ledgerItems.filter((item) => {
      // Tab filter
      if (activeFilter === 'income' && item.category !== 'payment' && item.category !== 'other_income') {
        return false;
      }
      if (activeFilter === 'expense' && item.category !== 'expense') {
        return false;
      }
      if (activeFilter === 'sales' && item.category !== 'sale') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchSub = item.subtitle.toLowerCase().includes(q);
        const matchAmt = item.amount.toString().includes(q);
        return matchTitle || matchDesc || matchSub || matchAmt;
      }

      return true;
    });
  }, [ledgerItems, activeFilter, searchQuery]);

  if (!isOpen) return null;

  // Safe printing handler
  const handlePrint = () => {
    setIsPrinting(true);
    onShowToast?.('🖨️ প্রিন্ট ডায়ালগ প্রস্তুত করা হচ্ছে...');
    setTimeout(() => {
      executeSafePrint(() => {
        setIsPrinting(false);
      });
    }, 150);
  };

  // Safe PDF download
  const handleDownloadPDF = async () => {
    setIsPdfDownloading(true);
    const filename = `Hisab_Statement_${startDate}_to_${endDate}`;
    await downloadReceiptPDF('print-datewise-report-container', filename, onShowToast);
    setIsPdfDownloading(false);
  };

  return (
    <div
      id="datewise-report-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      <div
        id="datewise-report-modal-content"
        className="bg-[#f8faf9] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto"
      >
        {/* Modal Header */}
        <div className="bg-[#033b31] px-4 py-3 sm:px-6 sm:py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-800/80 border border-emerald-600 flex items-center justify-center text-emerald-200 shrink-0 shadow-inner">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                তারিখ অনুযায়ী হিসাব বিবরণী
              </h2>
              <p className="text-[11px] sm:text-xs text-teal-200 font-medium">
                {store.name} • {formatBanglaDate(startDate)} হতে {formatBanglaDate(endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              title="প্রিন্ট করুন"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isPdfDownloading}
              title="PDF ডাউনলোড"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e5c50] hover:bg-[#136e60] text-teal-100 font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar & Quick Presets */}
        <div className="bg-white border-b border-slate-200 p-3 sm:px-6 sm:py-3 shrink-0 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="flex items-center gap-1.5 bg-[#edf7f4] border border-[#d0ede3] rounded-lg px-2.5 py-1.5 flex-1 relative">
                <Calendar className="w-3.5 h-3.5 text-[#064e3b] shrink-0" />
                <div className="text-[11px] sm:text-xs">
                  <span className="text-slate-500 font-medium block text-[9px] leading-none">হতে</span>
                  <span className="font-bold text-slate-800">{formatBanglaDate(startDate)}</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <span className="text-slate-400 font-black text-xs">—</span>

              <div className="flex items-center gap-1.5 bg-[#edf7f4] border border-[#d0ede3] rounded-lg px-2.5 py-1.5 flex-1 relative">
                <Calendar className="w-3.5 h-3.5 text-[#064e3b] shrink-0" />
                <div className="text-[11px] sm:text-xs">
                  <span className="text-slate-500 font-medium block text-[9px] leading-none">পর্যন্ত</span>
                  <span className="font-bold text-slate-800">{formatBanglaDate(endDate)}</span>
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetPreset('today')}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition cursor-pointer"
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('yesterday')}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition cursor-pointer"
              >
                গতকাল
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('7days')}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition cursor-pointer"
              >
                গত ৭ দিন
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('thisMonth')}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition cursor-pointer"
              >
                এই মাস
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('lastMonth')}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition cursor-pointer"
              >
                গত মাস
              </button>
            </div>
          </div>
        </div>

        {/* Summary Metric 4 Cards */}
        <div className="p-3 sm:p-5 pb-2 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: মোট জমা / আয় */}
            <div className="bg-white rounded-xl p-3 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600">মোট ক্যাশ ইন (আদায়+আয়)</span>
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-800 tracking-tight">
                ৳ {formatMoney(totalIncome)}
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5">কাস্টমার আদায় ও অন্যান্য ক্যাশ</p>
            </div>

            {/* Card 2: মোট খরচ */}
            <div className="bg-white rounded-xl p-3 border border-rose-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600">মোট ক্যাশ আউট (খরচ)</span>
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-rose-800 tracking-tight">
                ৳ {formatMoney(totalExpense)}
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5">দোকান পরিচালনা ও কেনাকাটা</p>
            </div>

            {/* Card 3: নিট উদ্বৃত্ত / লাভ */}
            <div
              className={`rounded-xl p-3 border shadow-2xs ${
                netBalance >= 0
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700">নিট ক্যাশ উদ্বৃত্ত</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    netBalance >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <p
                className={`text-base sm:text-lg font-black tracking-tight ${
                  netBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                ৳ {formatMoney(netBalance)}
              </p>
              <p className="text-[9.5px] text-slate-600 mt-0.5">
                {netBalance >= 0 ? 'হাতে নগদ উদ্বৃত্ত' : 'ঘাটতি'}
              </p>
            </div>

            {/* Card 4: মোট পণ্য বিক্রি */}
            <div className="bg-white rounded-xl p-3 border border-teal-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-600">মোট পণ্য বিক্রয়</span>
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-base sm:text-lg font-black text-teal-900 tracking-tight">
                ৳ {formatMoney(totalSales)}
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5 truncate">
                নগদ: ৳{formatMoney(cashSales)} • বাকি: ৳{formatMoney(dueSales)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filters & Search Input */}
        <div className="px-3 sm:px-5 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সব লেনদেন ({ledgerItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('income')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeFilter === 'income'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              আদায় ও আয়
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('expense')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeFilter === 'expense'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              দোকান খরচ
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('sales')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeFilter === 'sales'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              পণ্য বিক্রয়
            </button>
          </div>

          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="কাস্টমার বা বিবরণ খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 bg-slate-50 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Printable & Scrollable Ledger Items List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-1">অন্য কোনো তারিখ বেছে নিয়ে আবার হিসাব দেখুন</p>
            </div>
          ) : (
            <div
              id="print-datewise-report-container"
              className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none"
            >
              {/* Print Header (Visible on print/PDF) */}
              <div className="hidden print:block p-4 border-b border-slate-300 text-center">
                <h1 className="text-xl font-black text-slate-900">{store.name}</h1>
                <p className="text-xs text-slate-600">{store.address} • ফোন: {store.phone}</p>
                <h2 className="text-sm font-bold text-slate-800 mt-2 underline">
                  তারিখ অনুযায়ী হিসাব বিবরণী ({formatBanglaDate(startDate)} হতে {formatBanglaDate(endDate)})
                </h2>
                <div className="grid grid-cols-4 gap-2 mt-3 text-left text-xs">
                  <div className="p-2 border rounded">মোট আদায়/আয়: ৳{formatMoney(totalIncome)}</div>
                  <div className="p-2 border rounded">মোট খরচ: ৳{formatMoney(totalExpense)}</div>
                  <div className="p-2 border rounded">নিট উদ্বৃত্ত: ৳{formatMoney(netBalance)}</div>
                  <div className="p-2 border rounded">মোট বিক্রি: ৳{formatMoney(totalSales)}</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3">তারিখ ও সময়</th>
                    <th className="py-2.5 px-3">খাত / কাস্টমার</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">বিবরণ</th>
                    <th className="py-2.5 px-3 text-center">ধরন</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id + idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatBanglaDate(item.date)}</div>
                        <div className="text-[10px] text-slate-400">{item.time || ''}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[10.5px] text-slate-500">{item.subtitle}</div>
                      </td>
                      <td className="py-2 px-3 hidden sm:table-cell max-w-xs truncate text-slate-600">
                        {item.description}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {item.category === 'payment' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            আদায় (জমা)
                          </span>
                        )}
                        {item.category === 'expense' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            খরচ
                          </span>
                        )}
                        {item.category === 'sale' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            পণ্য বিক্রি
                          </span>
                        )}
                        {item.category === 'other_income' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            অন্যান্য আয়
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-xs sm:text-sm ${
                            item.category === 'payment' || item.category === 'other_income'
                              ? 'text-emerald-700'
                              : item.category === 'expense'
                              ? 'text-rose-700'
                              : 'text-slate-900'
                          }`}
                        >
                          ৳ {formatMoney(item.amount)}
                        </span>
                        {item.category === 'sale' && item.duePortion > 0 && (
                          <div className="text-[9.5px] text-rose-600 font-bold">
                            বাকি: ৳{formatMoney(item.duePortion)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Total Summary Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 gap-2">
                <div>মোট হিসাব এন্ট্রি: {filteredItems.length} টি</div>
                <div className="flex items-center gap-4 text-xs font-black">
                  <span className="text-emerald-700">মোট আদায়/আয়: ৳{formatMoney(totalIncome)}</span>
                  <span className="text-rose-700">মোট খরচ: ৳{formatMoney(totalExpense)}</span>
                  <span className={netBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}>
                    নিট ক্যাশ: ৳{formatMoney(netBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            সর্বমোট {ledgerItems.length} টি লেনদেন সংরক্ষিত
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="sm:hidden px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
