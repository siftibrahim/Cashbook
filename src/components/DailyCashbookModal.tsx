import React, { useState, useMemo } from 'react';
import { DailyExpense, StoreProfile, Transaction, ExpenseCategory } from '../types';
import {
  formatMoney,
  getTodayDateString,
  getCurrentTimeString,
  getExpenseCategoryLabel,
  formatBanglaDate,
} from '../utils/storage';
import {
  X,
  PlusCircle,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  Receipt,
  Printer,
  ShoppingBag,
} from 'lucide-react';

interface DailyCashbookModalProps {
  isOpen: boolean;
  expenses: DailyExpense[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  onClose: () => void;
  onAddExpense?: (expense: DailyExpense) => void;
  onSaveExpense?: (expense: DailyExpense) => void;
  onDeleteExpense?: (id: string) => void;
  onShowToast?: (msg: string) => void;
}

export const DailyCashbookModal: React.FC<DailyCashbookModalProps> = ({
  isOpen,
  expenses,
  transactions,
  store,
  onClose,
  onAddExpense,
  onSaveExpense,
  onDeleteExpense,
  onShowToast,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Expense form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<ExpenseCategory>('tea_snacks');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Daily Customer Cash Collection
  const dailyCustomerCollection = useMemo(() => {
    let sum = 0;
    (Object.values(transactions || {}) as Transaction[][]).forEach((txList) => {
      if (Array.isArray(txList)) {
        txList.forEach((tx) => {
          if (tx.date === selectedDate && tx.type === 'payment') {
            sum += Number(tx.amount || 0);
          }
        });
      }
    });
    return sum;
  }, [transactions, selectedDate]);

  // Filtered expenses for selected date
  const dateExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === selectedDate);
  }, [expenses, selectedDate]);

  // Calculation for the selected date
  const summary = useMemo(() => {
    let totalExpenses = 0;
    let otherIncome = 0;

    dateExpenses.forEach((e) => {
      if (e.type === 'expense') totalExpenses += Number(e.amount || 0);
      if (e.type === 'income') otherIncome += Number(e.amount || 0);
    });

    const totalCashIn = dailyCustomerCollection + otherIncome;
    const netCashInHand = totalCashIn - totalExpenses;

    return {
      dailyCustomerCollection,
      otherIncome,
      totalCashIn,
      totalExpenses,
      netCashInHand,
    };
  }, [dailyCustomerCollection, dateExpenses]);

  if (!isOpen) return null;

  const currency = store.currencySymbol || '৳';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) {
      onShowToast('সঠিক টাকার পরিমাণ লিখুন!');
      return;
    }

    const newRecord: DailyExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      category,
      amount: numAmt,
      description: description.trim() || getExpenseCategoryLabel(category),
      date: selectedDate,
      time: getCurrentTimeString(),
      createdAt: Date.now(),
    };

    const saveFn = onAddExpense || onSaveExpense;
    if (saveFn) {
      saveFn(newRecord);
    }
    setAmount('');
    setDescription('');
    setIsAddOpen(false);
    if (onShowToast) {
      onShowToast(type === 'expense' ? 'দোকান খরচ যুক্ত হয়েছে!' : 'অন্যান্য আয় যুক্ত হয়েছে!');
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>দৈনিক ক্যাশ খাতা ও দোকান খরচ</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-800/80 border border-teal-600 text-teal-200">
                  Daily Cashbook
                </span>
              </h2>
              <p className="text-xs text-teal-100 font-medium">ক্যাশ ইন, ক্যাশ আউট এবং নিট ক্যাশ ড্রয়ার হিসাব</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              title="প্রিন্ট ভাউচার"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60 pb-36 sm:pb-6 overscroll-contain">
          {/* Date Selector and Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">তারিখ নির্বাচন:</label>
              <input
                type="date"
                value={selectedDate}
                onFocus={handleInputFocus}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className="px-2.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition cursor-pointer"
              >
                আজ
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="px-4 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAddOpen ? 'ফর্ম লুকান' : '+ নতুন খরচ / আয় এন্ট্রি'}</span>
            </button>
          </div>

          {/* Add Expense Form Accordion */}
          {isAddOpen && (
            <form onSubmit={handleSave} className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-teal-600/30 shadow-md space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-700" />
                  <span>নতুন খরচ বা আয় যোগ করুন</span>
                </h4>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      type === 'expense' ? 'bg-red-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    দোকান খরচ
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      type === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    অন্যান্য আয়
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {type === 'expense' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">খরচের খাত</label>
                    <select
                      value={category}
                      onFocus={handleInputFocus}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="tea_snacks">আপ্যায়ন / চা-নাস্তা</option>
                      <option value="transport">যাতায়াত / পরিবহন</option>
                      <option value="shop_rent">দোকান ভাড়া</option>
                      <option value="electricity">বিদ্যুৎ বিল</option>
                      <option value="staff_salary">স্টাফ বেতন</option>
                      <option value="inventory_purchase">মালামাল ক্রয়</option>
                      <option value="maintenance">মেরামত / ডেকোরেশন</option>
                      <option value="other">অন্যান্য খরচ</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">আয়ের খাত</label>
                    <select
                      value={category}
                      onFocus={handleInputFocus}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="other">অন্যান্য নগদ আয়</option>
                      <option value="inventory_purchase">পুরাতন মালামাল বিক্রয়</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">টাকার পরিমাণ ({currency})</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={amount}
                    onFocus={handleInputFocus}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="যেমন: ১৫০"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">বিবরণ / নোট (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={description}
                    onFocus={handleInputFocus}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="যেমন: গেস্ট আপ্যায়ন"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          )}

          {/* Daily Cash Drawer Summary Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট ক্যাশ ইন (আদায় + আয়)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg sm:text-xl font-black text-emerald-600">
                {currency} {formatMoney(summary.totalCashIn)}
              </p>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                কাস্টমার জমা: {currency} {formatMoney(summary.dailyCustomerCollection)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500">মোট দোকান খরচ (ক্যাশ আউট)</span>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-lg sm:text-xl font-black text-red-600">
                {currency} {formatMoney(summary.totalExpenses)}
              </p>
              <div className="text-[11px] text-slate-400 font-medium mt-1">
                মোট {dateExpenses.filter((e) => e.type === 'expense').length}টি খরচের এন্ট্রি
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-xs ${
              summary.netCashInHand >= 0
                ? 'bg-teal-50/80 border-teal-200 text-teal-900'
                : 'bg-red-50/80 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">দিনের অবশিষ্ট ক্যাশ (Drawer)</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-lg sm:text-xl font-black">
                {currency} {formatMoney(summary.netCashInHand)}
              </p>
              <div className="text-[11px] font-medium mt-1 opacity-80">
                তারিখ: {formatBanglaDate(selectedDate)}
              </div>
            </div>
          </div>

          {/* Daily Expense & Income List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-teal-700" />
                <span>তারিখভিত্তিক খরচ ও আয়ের তালিকা ({formatBanglaDate(selectedDate)})</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                মোট রেকর্ড: {dateExpenses.length}টি
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {dateExpenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  এই তারিখে এখনো কোনো খরচ বা অন্যান্য আয়ের এন্ট্রি করা হয়নি।
                </div>
              ) : (
                dateExpenses.map((exp) => (
                  <div key={exp.id} className="p-3 sm:p-3.5 hover:bg-slate-50 flex items-center justify-between transition">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          exp.type === 'expense' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {exp.type === 'expense' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          {exp.description}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
                            {getExpenseCategoryLabel(exp.category)}
                          </span>
                          <span>সময়: {exp.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <p
                        className={`text-sm sm:text-base font-black ${
                          exp.type === 'expense' ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {exp.type === 'expense' ? '-' : '+'} {currency} {formatMoney(exp.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        title="মুছে ফেলুন"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3.5 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-500 font-medium">ক্লাউড সিনক্রোনাইজড ক্যাশ খাতা</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            সম্পন্ন
          </button>
        </div>
      </div>
    </div>
  );
};
