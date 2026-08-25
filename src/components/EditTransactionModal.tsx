import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Transaction, PaymentMethod, InvoiceItem } from '../types';
import { formatMoney, getPaymentMethodLabel, getTodayDateString, getCurrentTimeString } from '../utils/storage';
import {
  X,
  Edit3,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Receipt,
  Plus,
  Minus,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  customer: Customer | null;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (
    updatedTx: Transaction,
    oldTransaction: Transaction
  ) => void;
  onDelete: (txId: string) => void;
  onShowToast: (msg: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  customer,
  currencySymbol = '৳',
  onClose,
  onSave,
  onDelete,
  onShowToast,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (transaction) {
      const hasItems = Array.isArray(transaction.items) && transaction.items.length > 0;
      const initialItems = hasItems ? JSON.parse(JSON.stringify(transaction.items)) : [];
      setItems(initialItems);

      // Determine initial subtotal and total
      const initialSubtotal = hasItems
        ? initialItems.reduce((s: number, it: InvoiceItem) => s + (Number(it.total) || 0), 0)
        : (transaction.subtotal || transaction.amount || 0);

      setAmount(initialSubtotal.toString());
      setDescription(transaction.description || '');
      setDate(transaction.date || getTodayDateString());
      setTime(transaction.time || getCurrentTimeString());
      setPaymentMethod(transaction.paymentMethod || 'cash');

      const disc = transaction.discount !== undefined ? transaction.discount.toString() : '0';
      setDiscount(disc);

      const paid =
        transaction.paidAmount !== undefined
          ? transaction.paidAmount.toString()
          : transaction.type === 'payment'
          ? transaction.amount.toString()
          : '0';
      setPaidAmount(paid);
    }
  }, [transaction]);

  if (!isOpen || !transaction || !customer) return null;

  const isSale = transaction.type === 'sale';

  // Subtotal from items or direct input
  const itemsSubtotal = items.length > 0
    ? items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    : Math.max(0, Number(amount) || 0);

  const numDiscount = Math.max(0, Number(discount) || 0);
  const netBillAmount = Math.max(0, itemsSubtotal - numDiscount);
  const numPaid = Math.max(0, Number(paidAmount) || 0);

  // Remaining due for this sale
  const newDueForThisTx = isSale ? Math.max(0, netBillAmount - numPaid) : 0;

  // Calculate old impact on customer balance
  const oldBalanceImpact =
    transaction.type === 'sale'
      ? (transaction.dueAmount !== undefined ? Number(transaction.dueAmount) : Number(transaction.amount))
      : -Number(transaction.amount);

  const currentCustomerBalance = Number(customer.balance) || 0;

  // Customer balance excluding this transaction
  const customerBalanceWithoutThisTx = currentCustomerBalance - oldBalanceImpact;

  // New projected customer balance
  const newProjectedBalance = isSale
    ? customerBalanceWithoutThisTx + newDueForThisTx
    : customerBalanceWithoutThisTx - Math.max(0, Number(amount) || 0);

  const balanceDelta = newProjectedBalance - currentCustomerBalance;

  // Quantity modification
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      const newSub = updated.reduce((s, it) => s + it.total, 0);
      setAmount(newSub.toString());
      return;
    }
    const updated = [...items];
    const unitPrice = Number(updated[index].price) || 0;
    updated[index].quantity = newQty;
    updated[index].total = newQty * unitPrice;
    setItems(updated);
    const newSub = updated.reduce((s, it) => s + it.total, 0);
    setAmount(newSub.toString());
  };

  // Unit price modification
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    const priceVal = Math.max(0, newPrice);
    updated[index].price = priceVal;
    updated[index].total = updated[index].quantity * priceVal;
    setItems(updated);
    const newSub = updated.reduce((s, it) => s + it.total, 0);
    setAmount(newSub.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSale && netBillAmount <= 0) {
      onShowToast('অনুগ্রহ করে সঠিক বিক্রয় মূল্য নির্ধারণ করুন!');
      return;
    }
    if (!isSale && (Number(amount) || 0) <= 0) {
      onShowToast('অনুগ্রহ করে সঠিক জমার পরিমাণ লিখুন!');
      return;
    }

    const updatedTx: Transaction = {
      ...transaction,
      amount: isSale ? netBillAmount : (Number(amount) || 0),
      subtotal: isSale ? itemsSubtotal : undefined,
      discount: isSale && numDiscount > 0 ? numDiscount : undefined,
      netAmount: isSale ? netBillAmount : undefined,
      paidAmount: isSale ? numPaid : undefined,
      dueAmount: isSale ? newDueForThisTx : undefined,
      description: description.trim() || (isSale ? (items.length > 0 ? `পিওএস বিক্রি (${items.length} পণ্য)` : 'পণ্য বিক্রয়') : 'নগদ জমা পরিশোধ'),
      date: date || getTodayDateString(),
      time: time || getCurrentTimeString(),
      paymentMethod,
      items: items.length > 0 ? items : undefined,
      balanceAfter: newProjectedBalance,
    };

    onSave(updatedTx, transaction);
    onShowToast('লেনদেন ও কাস্টমার ব্যালেন্স সফলভাবে সংশোধন করা হয়েছে!');
    onClose();
  };

  return (
    <div
      id="edit-transaction-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#004D40] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight">
                লেনদেন সংশোধন ও ব্যালেন্স সমন্বয়
              </h3>
              <p className="text-xs text-teal-100/90 font-medium">
                {customer.name} • {isSale ? '৳ দিলাম (বাকি হিসাব)' : '৳ পেলাম (টাকা জমা)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Transaction Type & Receipt No Banner */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-black ${
                  isSale ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isSale ? '৳ দিলাম (বাকি বিক্রি)' : '৳ পেলাম (জমা পরিশোধ)'}
              </span>
              {transaction.receiptNo && (
                <span className="font-mono text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                  #{transaction.receiptNo}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              সময়: {transaction.time || ''}
            </span>
          </div>

          {/* If items exist (POS Memo), show itemized list */}
          {items.length > 0 ? (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-teal-700" />
                  মেমোর পণ্যসমূহ ({items.length} টি)
                </span>
                <span className="text-slate-600 text-xs font-bold">
                  সাবটোটাল: {currencySymbol}{formatMoney(itemsSubtotal)}
                </span>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-slate-500">দর ({currencySymbol}):</span>
                        <input
                          type="number"
                          step="any"
                          value={item.price}
                          onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-xs text-center focus:ring-1 focus:ring-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 active:scale-95 transition cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-black text-slate-800 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                          className="w-7 h-7 bg-teal-50 hover:bg-teal-100 text-teal-800 flex items-center justify-center font-bold active:scale-95 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="w-20 text-right font-black text-slate-900 text-xs">
                        {currencySymbol}{formatMoney(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Direct Amount Input for non-itemized sales or payments */
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                {isSale ? 'মোট বিক্রয় মূল্য' : 'জমার পরিমাণ'} ({currencySymbol}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {/* If it is a Sale, show Discount & Cash Paid inputs to accurately calculate due */}
          {isSale && (
            <div className="grid grid-cols-2 gap-3 bg-teal-50/40 p-3 rounded-2xl border border-teal-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  বিশেষ ছাড় / ডিসকাউন্ট ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                  নগদ জমা পেয়েছি ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>

              {/* Net bill and Remaining Due summary banner */}
              <div className="col-span-2 pt-2 border-t border-teal-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  নিট বিল: <strong>{currencySymbol}{formatMoney(netBillAmount)}</strong>
                </span>
                <span className="font-black text-red-600">
                  নতুন বকেয়া/বাকি: {currencySymbol}{formatMoney(newDueForThisTx)}
                </span>
              </div>
            </div>
          )}

          {/* Description / Memo Note */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              বিবরণ / পণ্যের নোট
            </label>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="যেমন: মিনিকেট চাল ৫ কেজি, ডাল..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                তারিখ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                সময়
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:30 AM"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              পেমেন্ট মাধ্যম
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'bkash', 'nagad', 'bank'] as PaymentMethod[]).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                    paymentMethod === pm
                      ? 'bg-teal-50 border-[#004D40] text-[#004D40] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {getPaymentMethodLabel(pm)}
                </button>
              ))}
            </div>
          </div>

          {/* Balance Impact Live Calculation Preview */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                কাস্টমার ব্যালেন্স লাইভ প্রভাব
              </h4>
              {balanceDelta !== 0 && (
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    balanceDelta > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {balanceDelta > 0 ? `+${currencySymbol}${formatMoney(balanceDelta)} বাকি বৃদ্ধি` : `${currencySymbol}${formatMoney(Math.abs(balanceDelta))} বাকি হ্রাস`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">বর্তমান মোট ব্যালেন্স</span>
                <span className="font-bold text-slate-800 text-sm">{currencySymbol}{formatMoney(currentCustomerBalance)}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">সংশোধনের পর নতুন বাকি</span>
                <span
                  className={`font-black text-sm ${
                    newProjectedBalance > 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {currencySymbol}{formatMoney(newProjectedBalance)}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>লেনদেন মুছুন</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-[#004D40] hover:bg-teal-900 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>পরিবর্তন সংরক্ষণ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-red-200 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">লেনদেন মুছে ফেলার নিশ্চিতকরণ</h4>
                <p className="text-xs text-red-600 font-bold">{currencySymbol}{formatMoney(transaction.amount)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে এই লেনদেনটি বাতিল বা মুছে ফেলতে চান? এটি কাস্টমারের মোট বাকি হিসাব থেকে স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(transaction.id);
                  onClose();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
