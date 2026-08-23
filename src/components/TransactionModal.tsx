import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod, InvoiceItem } from '../types';
import { getTodayDateString, formatMoney } from '../utils/storage';
import {
  MinusCircle,
  PlusCircle,
  X,
  CreditCard,
  Plus,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  type: 'sale' | 'payment';
  customer: Customer | null;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    description: string;
    date: string;
    paymentMethod?: PaymentMethod;
    items?: InvoiceItem[];
  }) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  type,
  customer,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isItemized, setIsItemized] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Item row input state
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState('কেজি');
  const [itemPrice, setItemPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      setDate(getTodayDateString());
      setPaymentMethod('cash');
      setIsItemized(false);
      setItems([]);
      setItemName('');
      setItemQty('1');
      setItemPrice('');
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const isSale = type === 'sale';
  const currentBalance = Number(customer.balance || 0);
  const enteredAmount = parseFloat(amount) || 0;
  const newBalance = isSale ? currentBalance + enteredAmount : currentBalance - enteredAmount;
  const creditLimit = customer.creditLimit || 10000;
  const isLimitBreached = isSale && newBalance > creditLimit;

  // Handle adding an item to itemized list
  const handleAddItem = (e: React.MouseEvent) => {
    e.preventDefault();
    const qty = parseFloat(itemQty) || 1;
    const price = parseFloat(itemPrice) || 0;
    if (!itemName.trim() || price <= 0) return;

    const total = qty * price;
    const newItem: InvoiceItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: itemName.trim(),
      quantity: qty,
      unit: itemUnit,
      price,
      total,
    };

    const nextItems = [...items, newItem];
    setItems(nextItems);

    // Auto calculate total sum
    const totalSum = nextItems.reduce((acc, curr) => acc + curr.total, 0);
    setAmount(totalSum.toString());

    // Generate descriptive text
    const desc = nextItems.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ');
    setDescription(desc);

    // Reset inputs
    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    const nextItems = items.filter((it) => it.id !== id);
    setItems(nextItems);
    const totalSum = nextItems.reduce((acc, curr) => acc + curr.total, 0);
    setAmount(totalSum.toString());
    const desc = nextItems.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ');
    setDescription(desc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    onSave({
      amount: numAmount,
      description: description.trim() || (isSale ? 'বাকি বিক্রয়' : 'নগদ জমা'),
      date: date || getTodayDateString(),
      paymentMethod,
      items: isItemized && items.length > 0 ? items : undefined,
    });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                isSale ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {isSale ? <MinusCircle className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isSale ? '৳ বাকি দেওয়া (হিসাব বৃদ্ধি)' : '৳ টাকা জমা পেলাম (আদায়)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                কাস্টমার: <span className="font-bold text-slate-700">{customer.name}</span> (বর্তমান বাকি: ৳{formatMoney(currentBalance)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Credit Limit Warning Alert */}
        {isLimitBreached && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              সতর্কতা: এই কাস্টমারের বাকির সীমা ৳{formatMoney(creditLimit)} অতিক্রম করবে! (মোট বাকি হবে ৳{formatMoney(newBalance)})
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-36 sm:pb-2 flex-1">
          {/* Payment Method Selector for Payments */}
          {!isSale && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>টাকা প্রাপ্তির মাধ্যম / পেমেন্ট চ্যানেল</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'cash', label: 'নগদ ক্যাশ' },
                  { id: 'bkash', label: 'বিকাশ' },
                  { id: 'nagad', label: 'নগদ' },
                  { id: 'rocket', label: 'রকেট' },
                  { id: 'bank', label: 'ব্যাংক' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition cursor-pointer border ${
                      paymentMethod === pm.id
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Itemized Bill for Sales */}
          {isSale && (
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                <span>পণ্যভিত্তিক হিসাব তৈরি করুন (Itemized Bill)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsItemized(!isItemized)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isItemized ? 'bg-[#00695C] text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isItemized ? 'সক্রিয়' : 'সাধারণ নোট'}
              </button>
            </div>
          )}

          {/* Itemized Builder Area */}
          {isSale && isItemized && (
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-3">
              <div className="grid grid-cols-12 gap-1.5">
                <div className="col-span-4">
                  <input
                    type="text"
                    placeholder="পণ্যের নাম"
                    value={itemName}
                    onFocus={handleInputFocus}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="পরিমাণ"
                    value={itemQty}
                    onFocus={handleInputFocus}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-center focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={itemUnit}
                    onFocus={handleInputFocus}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-1 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="কেজি">কেজি</option>
                    <option value="বস্তা">বস্তা</option>
                    <option value="লিটার">লিটার</option>
                    <option value="পিস">পিস</option>
                    <option value="প্যাকেট">প্যাকেট</option>
                    <option value="ডজন">ডজন</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="দর (৳)"
                    value={itemPrice}
                    onFocus={handleInputFocus}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full h-full min-h-[30px] bg-[#00695C] text-white rounded-lg flex items-center justify-center hover:bg-[#004D40] transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="divide-y divide-teal-100 bg-white rounded-lg border border-teal-100 max-h-36 overflow-y-auto">
                  {items.map((it) => (
                    <div key={it.id} className="p-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{it.name}</span>
                        <span className="text-slate-500 text-[11px] ml-1.5">
                          ({it.quantity} {it.unit} × ৳{it.price})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">৳{formatMoney(it.total)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              টাকার মোট পরিমাণ (৳) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-lg font-black text-slate-400">৳</span>
              <input
                type="number"
                required
                min="1"
                step="any"
                autoFocus={!isItemized}
                value={amount}
                onFocus={handleInputFocus}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="০"
                className={`w-full pl-9 pr-4 py-2.5 text-xl font-black rounded-xl border focus:outline-none focus:ring-2 ${
                  isSale
                    ? 'border-red-200 focus:ring-red-500 text-red-600'
                    : 'border-emerald-200 focus:ring-emerald-500 text-emerald-600'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              লেনদেনের বিবরণ / মালের নাম
            </label>
            <input
              type="text"
              value={description}
              onFocus={handleInputFocus}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isSale ? 'যেমন: সয়াবিন তেল, চিনি, মসুর ডাল' : 'যেমন: বিকাশ মারফত পরিশোধ'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-medium bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ</label>
            <input
              type="date"
              value={date}
              onFocus={handleInputFocus}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-medium bg-white"
            />
          </div>

          {/* Balance Preview */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-600 font-medium">এই লেনদেনের পর মোট বাকি হবে:</span>
            <span
              className={`font-black text-sm ${
                newBalance > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              ৳ {formatMoney(newBalance)}
            </span>
          </div>

          <div className="flex gap-2.5 pt-2 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95 ${
                isSale
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
