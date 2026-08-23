import React, { useState } from 'react';
import { Customer, Product, StoreProfile, InvoiceItem, PaymentMethod } from '../types';
import {
  formatMoney,
  getTodayDateString,
  getCurrentTimeString,
  normalizeToEnglishDigits,
  normalizePhoneNumber,
} from '../utils/storage';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Printer,
  Share2,
  CheckCircle,
  User,
  Package,
  CreditCard,
  Banknote,
  Percent,
  Search,
  Check,
  ChevronDown,
  X,
  Phone,
  Store,
  UserCheck,
  RotateCcw,
  Sparkles,
  History,
  AlertCircle,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';

interface PosSalesViewProps {
  customers: Customer[];
  products: Product[];
  store: StoreProfile;
  onCompleteSale: (params: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    items: InvoiceItem[];
    totalAmount: number;
    discount: number;
    netAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
  }) => void;
  onOpenInvoiceModal: (data: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: InvoiceItem[];
    totalAmount: number;
    discount: number;
    netAmount: number;
    paidAmount: number;
    dueAmount: number;
    prevBalance?: number;
    customerBalanceAfter?: number;
    paymentMethod: PaymentMethod;
    receiptNo: string;
    date: string;
    time: string;
  }) => void;
  onOpenSalesHistory?: () => void;
  onShowToast: (msg: string) => void;
}

export const PosSalesView: React.FC<PosSalesViewProps> = ({
  customers,
  products,
  store,
  onCompleteSale,
  onOpenInvoiceModal,
  onOpenSalesHistory,
  onShowToast,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerFilterTab, setCustomerFilterTab] = useState<'all' | 'due' | 'clear'>('all');
  const [walkInName, setWalkInName] = useState('খুচরা খরিদ্দার');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [detectedExistingCustomer, setDetectedExistingCustomer] = useState<Customer | null>(null);

  // Cart items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      name: 'মিনিকেট চাল',
      quantity: 5,
      unit: 'কেজি',
      price: 72,
      total: 360,
    },
    {
      id: 'item_2',
      name: 'সয়াবিন তেল (৫ লিটার)',
      quantity: 1,
      unit: 'বোতল',
      price: 890,
      total: 890,
    },
  ]);

  // Discount & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash');
  const [notes, setNotes] = useState('');

  // Add Item Inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('কেজি');
  const [newItemPrice, setNewItemPrice] = useState('');

  const currency = store.currencySymbol || '৳';

  // Subtotal calculation
  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const netAmount = Math.max(0, subtotal - Number(discount || 0));
  const dueAmount = Math.max(0, netAmount - Number(paidAmount || 0));

  const handleWalkInPhoneChange = (val: string) => {
    const eng = normalizeToEnglishDigits(val);
    const cleaned = eng.replace(/[^0-9]/g, '').slice(0, 11);
    setWalkInPhone(cleaned);

    if (cleaned.length >= 3) {
      const matched = customers.find((c) => {
        const cNorm = normalizePhoneNumber(c.phone || '');
        return cNorm.length === 11 && cNorm === cleaned;
      });
      setDetectedExistingCustomer(matched || null);
    } else {
      setDetectedExistingCustomer(null);
    }
  };

  const handleSelectProduct = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const existingIndex = items.findIndex((i) => i.name === prod.name);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: `item_${Date.now()}_${Math.random()}`,
          name: prod.name,
          quantity: 1,
          unit: prod.unit,
          price: prod.salePrice,
          total: prod.salePrice,
        },
      ]);
    }
    onShowToast(`'${prod.name}' কার্টে যুক্ত করা হয়েছে`);
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) {
      onShowToast('পণ্যের নাম লিখুন');
      return;
    }
    const price = Number(newItemPrice || 0);
    const qty = Math.max(0.1, Number(newItemQty || 1));
    if (price <= 0) {
      onShowToast('পণ্যের সঠিক দর/মূল্য দিন');
      return;
    }

    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        name: newItemName.trim(),
        quantity: qty,
        unit: newItemUnit || 'টি',
        price: price,
        total: qty * price,
      },
    ]);

    setNewItemName('');
    setNewItemPrice('');
    setNewItemQty('1');
    onShowToast('পণ্য কার্টে যুক্ত হয়েছে');
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].price;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      onShowToast('কার্টে কোনো পণ্য নেই!');
      return;
    }

    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    let finalCustId = selectedCustomerId;
    let custName = selectedCust ? selectedCust.name : walkInName.trim();
    let custPhone = selectedCust ? selectedCust.phone : walkInPhone.trim();
    const custAddress = selectedCust ? selectedCust.address : 'দোকান কাউন্টার';

    const normPhone = normalizePhoneNumber(custPhone);

    // If no customer is directly selected, check if entered phone belongs to an existing customer
    if (!selectedCust && normPhone.length === 11) {
      const matched = customers.find((c) => {
        const cNorm = normalizePhoneNumber(c.phone || '');
        return cNorm.length === 11 && cNorm === normPhone;
      });
      if (matched) {
        finalCustId = matched.id;
        custName = matched.name;
        custPhone = matched.phone;
      }
    }

    // Validation for due sales (বাকি বিক্রি)
    if (dueAmount > 0) {
      if (!finalCustId) {
        // It's a new customer taking due
        if (!custName || custName === 'খুচরা খরিদ্দার') {
          onShowToast('❌ বাকি বিক্রির জন্য কাস্টমারের নাম লিখুন!');
          return;
        }
        if (!normPhone || normPhone.length !== 11 || !normPhone.startsWith('01')) {
          onShowToast('❌ বাকি বিক্রির জন্য সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
          return;
        }
      }
    }

    const matchedCust = customers.find((c) => c.id === finalCustId);
    const prevBalance = matchedCust ? Number(matchedCust.balance || 0) : 0;
    const finalBalanceAfter = prevBalance + dueAmount;

    onCompleteSale({
      customerId: finalCustId || undefined,
      customerName: custName || 'খুচরা খরিদ্দার',
      customerPhone: custPhone,
      items,
      totalAmount: subtotal,
      discount,
      netAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      notes,
    });

    // Also trigger instant invoice modal preview with complete breakdown
    onOpenInvoiceModal({
      customerId: finalCustId || undefined,
      customerName: custName || 'খুচরা খরিদ্দার',
      customerPhone: custPhone,
      customerAddress: custAddress,
      items,
      totalAmount: subtotal,
      discount,
      netAmount,
      paidAmount,
      dueAmount,
      prevBalance,
      customerBalanceAfter: finalBalanceAfter,
      paymentMethod,
      receiptNo: `INV-${Date.now().toString().slice(-6)}`,
      date: getTodayDateString(),
      time: getCurrentTimeString(),
    });

    if (dueAmount > 0 && !matchedCust) {
      onShowToast(`নতুন কাস্টমার '${custName}' বাকি তালিকায় যুক্ত হয়েছে ও মেমো তৈরি হয়েছে!`);
    } else {
      onShowToast('বিক্রি সফলভাবে সম্পন্ন হয়েছে ও মেমো তৈরি হয়েছে!');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pb-8">
      {/* Top Banner */}
      <div className="bg-[#004D40] text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-teal-200" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black leading-tight">বিক্রয় ও পিওএস কাউন্টার</h2>
            <p className="text-xs text-teal-100/80 font-medium">দ্রুত ক্যাশ মেমো ও বাকি বিল তৈরি করুন</p>
          </div>
        </div>

        {onOpenSalesHistory && (
          <button
            type="button"
            onClick={onOpenSalesHistory}
            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-white/10 cursor-pointer shadow-xs"
          >
            <History className="w-4 h-4 text-teal-300" />
            <span>বিক্রয় হিস্ট্রি</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Product Selector & Fast Items (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Quick Product Chips */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-teal-700" />
              <span>জনপ্রিয় পণ্য তালিকা (ট্যাপ করে কার্টে নিন)</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectProduct(prod.id)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <span>{prod.name}</span>
                  <span className="text-teal-700 font-black">
                    {currency}
                    {prod.salePrice}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Add Item Form */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-teal-700" />
              <span>নতুন বা কাস্টম পণ্য যোগ করুন</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="পণ্যের নাম (যেমন: চিনি, তেল)..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder={`দর (${currency})`}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                />
              </div>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="পরিমাণ"
                  className="w-16 px-2 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none text-center"
                />
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="flex-1 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>যোগ</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-teal-700" />
                <span>বিল আইটেম তালিকা ({items.length})</span>
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  কার্ট খালি করুন
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                কার্টে কোনো পণ্য নেই। উপরের তালিকা থেকে পণ্য সিলেক্ট করুন।
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {currency}
                        {item.price} × {item.quantity} {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Qty Counter */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-black text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs sm:text-sm font-black text-slate-900 w-16 text-right">
                        {currency}
                        {formatMoney(item.total)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Customer Picker & Invoice Summary (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Customer Picker Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-700" />
                <span>ক্রেতা / খরিদ্দার নির্বাচন</span>
              </h3>
              {selectedCustomerId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setWalkInName('খুচরা খরিদ্দার');
                    setWalkInPhone('');
                    onShowToast('খুচরা / নগদ খরিদ্দার সিলেক্ট করা হয়েছে');
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>খুচরা ক্রেতায় ফিরুন</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  নগদ খরিদ্দার
                </span>
              )}
            </div>

            {/* Selected Customer Trigger / Preview */}
            {selectedCustomerId ? (
              (() => {
                const cust = customers.find((c) => c.id === selectedCustomerId);
                if (!cust) return null;
                const bal = Number(cust.balance || 0);
                return (
                  <div
                    onClick={() => setIsCustomerPickerOpen(true)}
                    className="p-3 bg-gradient-to-r from-teal-50/90 to-emerald-50/70 border border-teal-300 rounded-xl cursor-pointer hover:border-teal-400 transition shadow-2xs group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#004D40] text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {cust.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-slate-800 group-hover:text-teal-900 transition">
                              {cust.name}
                            </h4>
                            {cust.category && (
                              <span className="text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                {cust.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone || 'ফোন নম্বর নেই'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md border ${
                            bal > 0
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {bal > 0 ? `বাকি: ${currency}${formatMoney(bal)}` : 'পরিশোধিত'}
                        </span>
                        <p className="text-[10px] text-teal-700 font-bold mt-0.5 flex items-center justify-end gap-0.5">
                          <span>পরিবর্তন</span>
                          <ChevronDown className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerPickerOpen(true)}
                  className="w-full p-2.5 bg-slate-50 hover:bg-teal-50/70 border border-dashed border-slate-300 hover:border-teal-400 rounded-xl flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#004D40] flex items-center justify-center font-bold">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                        খাতা থেকে কাস্টমার নির্বাচন করুন
                      </p>
                      <p className="text-[10px] text-slate-500">বাকি বা নির্দিষ্ট কাস্টমারের হিসাবে বিক্রির জন্য</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs group-hover:bg-teal-700 group-hover:text-white transition">
                    তালিকা দেখুন
                  </span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      খুচরা ক্রেতার নাম: {dueAmount > 0 && <span className="text-red-500 font-bold">*</span>}
                    </label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="ক্রেতার নাম লিখুন..."
                      className="w-full px-2.5 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] font-bold text-slate-500">
                        মোবাইল নম্বর (১১ ডিজিট): {dueAmount > 0 && <span className="text-red-500 font-bold">*</span>}
                      </label>
                      <span className={`text-[10px] font-bold ${walkInPhone.length === 11 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {walkInPhone.length}/১১
                      </span>
                    </div>
                    <input
                      type="tel"
                      maxLength={11}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={walkInPhone}
                      onChange={(e) => handleWalkInPhoneChange(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className={`w-full px-2.5 py-2 text-xs font-mono font-medium border rounded-xl bg-white focus:outline-none focus:ring-1 ${
                        detectedExistingCustomer
                          ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/40 text-amber-900 font-bold'
                          : walkInPhone.length === 11
                          ? 'border-emerald-300 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Detected Existing Customer Alert & 1-Click Link Button */}
                {detectedExistingCustomer && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-amber-900 leading-tight">
                          এই মোবাইল নম্বরে পূর্বে নিবন্ধিত কাস্টমার পাওয়া গেছে:
                        </p>
                        <p className="font-black text-slate-800 mt-0.5">
                          {detectedExistingCustomer.name} • বর্তমান বাকি:{' '}
                          <span className={Number(detectedExistingCustomer.balance || 0) > 0 ? 'text-red-600 font-black' : 'text-emerald-600'}>
                            {currency}{formatMoney(Number(detectedExistingCustomer.balance || 0))}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(detectedExistingCustomer.id);
                        setDetectedExistingCustomer(null);
                        onShowToast(`'${detectedExistingCustomer.name}' কাস্টমার হিসেবে যুক্ত করা হয়েছে`);
                      }}
                      className="w-full py-1.5 px-3 bg-[#004D40] hover:bg-[#00382E] active:scale-[0.99] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-teal-200" />
                      <span>এই কাস্টমারের হিসাবে বিক্রি ও বাকি যোগ করুন</span>
                    </button>
                  </div>
                )}

                {/* Helpful Note for New Due Customer */}
                {dueAmount > 0 && !detectedExistingCustomer && (
                  <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl text-[11px] text-teal-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#004D40] shrink-0" />
                    <span>
                      <strong>নতুন কাস্টমার:</strong> নাম ও ১১ ডিজিটের নম্বর লিখলে এই বিক্রির পর স্বয়ংক্রিয়ভাবে বাকি খাতায় নতুন কাস্টমার যুক্ত হবে।
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Calculation Box */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>মোট পণ্যের দাম (Subtotal):</span>
                <span className="font-bold text-slate-900">
                  {currency} {formatMoney(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>ছাড় / ডিসকাউন্ট:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">- {currency}</span>
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value || 0)))}
                    placeholder="০"
                    className="w-20 px-2 py-0.5 text-xs font-bold border border-slate-200 rounded-lg text-right focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between text-sm font-black text-[#004D40] pt-1.5 border-t border-slate-100">
                <span>নিট প্রদেয় বিল:</span>
                <span>
                  {currency} {formatMoney(netAmount)}
                </span>
              </div>
            </div>

            {/* Payment Received Input */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>নগদ জমা পেয়েছেন:</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-emerald-700">{currency}</span>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value || 0)))}
                    className="w-24 px-2 py-1 text-xs font-black border border-emerald-300 bg-emerald-50 rounded-lg text-right text-emerald-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Fill Full Paid button */}
              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => setPaidAmount(netAmount)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 cursor-pointer"
                >
                  সম্পূর্ণ পরিশোধ
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmount(0)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-md hover:bg-red-200 cursor-pointer"
                >
                  পুরোটা বাকি
                </button>
              </div>

              {/* Due Balance Display */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  dueAmount > 0
                    ? 'bg-red-50/80 border-red-200 text-red-800'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                }`}
              >
                <span>{dueAmount > 0 ? 'বকেয়া বাকি থাকবে:' : 'সম্পূর্ণ পরিশোধিত (পরিশোধ)'}</span>
                <span className="font-black text-sm">
                  {currency} {formatMoney(dueAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                পেমেন্ট মাধ্যম:
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                {[
                  { id: 'cash', label: 'ক্যাশ' },
                  { id: 'bkash', label: 'বিকাশ' },
                  { id: 'nagad', label: 'নগদ' },
                  { id: 'bank', label: 'ব্যাংক' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-1.5 rounded-lg border text-center transition cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-[#004D40] text-white border-teal-800 shadow-xs font-black'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={items.length === 0}
              className="w-full py-3 bg-[#004D40] hover:bg-[#00382E] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer mt-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>বিক্রি সম্পন্ন করুন ও মেমো প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern High-Craft Customer Selection Modal / Bottom-Sheet */}
      {isCustomerPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#004D40] flex items-center justify-center font-bold shadow-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">খরিদ্দার / ক্রেতা নির্বাচন করুন</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    মোট {customers.length} জন কাস্টমার তালিকাভুক্ত
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Tabs */}
            <div className="p-3 bg-white border-b border-slate-100 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                  autoFocus
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-slate-800"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              {(() => {
                const validPickerCusts = (customers || []).filter((c) => c && c.id !== 'cust_counter_cash');
                return (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setCustomerFilterTab('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        customerFilterTab === 'all'
                          ? 'bg-[#004D40] text-white border-teal-800 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      সবাই ({validPickerCusts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFilterTab('due')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        customerFilterTab === 'due'
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-red-50/70 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      বাকি আছে ({validPickerCusts.filter((c) => Number(c.balance || 0) > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFilterTab('clear')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        customerFilterTab === 'clear'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      পরিশোধিত ({validPickerCusts.filter((c) => Number(c.balance || 0) <= 0).length})
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Customer Options List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 smooth-scroll-container">
              {/* Option: Walk-in Retail Customer */}
              {(!customerSearchQuery || 'নগদ খুচরা খরিদ্দার walk in'.toLowerCase().includes(customerSearchQuery.toLowerCase())) && (
                <div
                  onClick={() => {
                    setSelectedCustomerId('');
                    setWalkInName('খুচরা খরিদ্দার');
                    setIsCustomerPickerOpen(false);
                    onShowToast('নগদ / খুচরা খরিদ্দার নির্বাচিত হয়েছে');
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    !selectedCustomerId
                      ? 'bg-teal-50 border-teal-500 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-[#004D40] flex items-center justify-center font-black">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-slate-800">নগদ / খুচরা খরিদ্দার</h4>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          নগদ মেমো
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">তাৎক্ষণিক সাধারণ ক্যাশ সেল</p>
                    </div>
                  </div>
                  {!selectedCustomerId && (
                    <div className="w-6 h-6 rounded-full bg-[#004D40] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              )}

              {/* Registered Customers List */}
              {(() => {
                const query = customerSearchQuery.trim().toLowerCase();
                const filtered = customers.filter((c) => {
                  if (c.id === 'cust_counter_cash') return false;
                  const bal = Number(c.balance || 0);
                  if (customerFilterTab === 'due' && bal <= 0) return false;
                  if (customerFilterTab === 'clear' && bal > 0) return false;
                  if (!query) return true;
                  return (
                    c.name.toLowerCase().includes(query) ||
                    (c.phone && c.phone.toLowerCase().includes(query)) ||
                    (c.address && c.address.toLowerCase().includes(query))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-600">কোনো কাস্টমার পাওয়া যায়নি</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">সঠিক নাম বা নম্বর লিখুন</p>
                    </div>
                  );
                }

                return filtered.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const bal = Number(cust.balance || 0);
                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setIsCustomerPickerOpen(false);
                        onShowToast(`'${cust.name}' নির্বাচিত হয়েছে`);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-teal-50/90 border-teal-500 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                            bal > 0 ? 'bg-red-700' : 'bg-[#004D40]'
                          }`}
                        >
                          {cust.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-black text-slate-800">{cust.name}</h4>
                            {cust.category && (
                              <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                {cust.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone || 'ফোন নম্বর নেই'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span
                            className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md border ${
                              bal > 0
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {bal > 0 ? `বাকি: ${currency}${formatMoney(bal)}` : 'পরিশোধিত'}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#004D40] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-500">ট্যাপ করে নির্বাচন সম্পন্ন করুন</span>
              <button
                type="button"
                onClick={() => setIsCustomerPickerOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
