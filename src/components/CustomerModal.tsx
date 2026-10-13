import React, { useState, useEffect } from 'react';
import { Customer, CustomerCategory } from '../types';
import { UserPlus, UserCheck, X, Phone, AlertCircle, CheckCircle2, Tag, ShieldAlert } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    phone: string;
    address: string;
    openingBalance: number;
    category?: CustomerCategory;
    creditLimit?: number;
    notes?: string;
  }) => void;
  editCustomer: Customer | null;
  existingCustomers: Customer[];
}

// Convert Bangla numerals (০-৯) to English (0-9)
export const normalizeToEnglishDigits = (str: string): string => {
  if (!str) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (d) => banglaDigits.indexOf(d).toString());
};

// Utility to normalize 11-digit phone numbers for accurate comparison
export const normalizePhoneNumber = (phoneStr: string): string => {
  if (!phoneStr) return '';
  const eng = normalizeToEnglishDigits(phoneStr);
  let cleaned = eng.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('8801') && cleaned.length >= 13) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editCustomer: initialEditCustomer,
  existingCustomers,
}) => {
  const [currentEditCustomer, setCurrentEditCustomer] = useState<Customer | null>(initialEditCustomer);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [category, setCategory] = useState<CustomerCategory>('regular');
  const [creditLimit, setCreditLimit] = useState('10000');
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setCurrentEditCustomer(initialEditCustomer);
  }, [initialEditCustomer, isOpen]);

  useEffect(() => {
    if (currentEditCustomer) {
      setName(currentEditCustomer.name || '');
      setPhone(currentEditCustomer.phone || '');
      setAddress(currentEditCustomer.address || '');
      setCategory(currentEditCustomer.category || 'regular');
      setCreditLimit(currentEditCustomer.creditLimit?.toString() || '10000');
      setNotes(currentEditCustomer.notes || '');
      setOpeningBalance('0');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setCategory('regular');
      setCreditLimit('10000');
      setNotes('');
      setOpeningBalance('0');
    }
    setPhoneError(null);
    setDuplicateCustomer(null);
  }, [currentEditCustomer, isOpen]);

  // Real-time 11-digit & duplicate validation
  useEffect(() => {
    const rawPhone = phone.trim();
    if (!rawPhone) {
      setPhoneError('কাস্টমারের ১১ ডিজিটের মোবাইল নম্বর প্রদান বাধ্যতামূলক');
      setDuplicateCustomer(null);
      return;
    }

    const normPhone = normalizePhoneNumber(rawPhone);

    // Check duplicate phone in existing customer list
    const dup = existingCustomers.find((c) => {
      if (currentEditCustomer && c.id === currentEditCustomer.id) return false;
      const cNorm = normalizePhoneNumber(c.phone || '');
      return cNorm.length === 11 && cNorm === normPhone;
    });

    if (dup) {
      setDuplicateCustomer(dup);
      setPhoneError(`❌ এই ১১ ডিজিটের মোবাইল নম্বরটি (${dup.name}) কাস্টমারের জন্য ব্যবহৃত হয়েছে। একটি মোবাইল নম্বর দিয়ে কেবল ১ জন কাস্টমার অ্যাড করা যাবে।`);
    } else {
      setDuplicateCustomer(null);
      if (normPhone.length !== 11 || !normPhone.startsWith('01')) {
        setPhoneError('মোবাইল নম্বরটি অবশ্যই সঠিক ১১ ডিজিটের হতে হবে (যেমন: 017XXXXXXXX)');
      } else {
        setPhoneError(null);
      }
    }
  }, [phone, existingCustomers, currentEditCustomer]);

  if (!isOpen) return null;

  const rawPhone = phone.trim();
  const normPhone = normalizePhoneNumber(rawPhone);
  const isPhoneValid = normPhone.length === 11 && normPhone.startsWith('01') && !duplicateCustomer;
  const isFormValid = name.trim().length > 0 && isPhoneValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onSave({
      name: name.trim(),
      phone: rawPhone,
      address: address.trim(),
      openingBalance: parseFloat(openingBalance) || 0,
      category,
      creditLimit: parseFloat(creditLimit) || 10000,
      notes: notes.trim(),
    });
  };

  const handlePhoneChange = (val: string) => {
    const eng = normalizeToEnglishDigits(val);
    const cleaned = eng.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(cleaned);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain flex flex-col">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00695C] flex items-center justify-center">
              {currentEditCustomer ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {currentEditCustomer ? 'কাস্টমার তথ্য সংশোধন' : 'নতুন কাস্টমার যোগ করুন'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ১১ ডিজিট মোবাইল নম্বর যাচাইকৃত খাতা এন্ট্রি
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 pb-36 sm:pb-2 flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              কাস্টমারের নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onFocus={handleInputFocus}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: আব্দুর রহিম"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-medium bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                ১১ ডিজিটের মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              {normPhone && (
                <span
                  className={`text-[11px] font-bold ${
                    normPhone.length === 11 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {normPhone.length}/11 ডিজিট
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="tel"
                required
                maxLength={11}
                value={phone}
                onFocus={handleInputFocus}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="যেমন: 01711223344"
                className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm font-bold tracking-wider ${
                  duplicateCustomer
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-500'
                    : isPhoneValid
                    ? 'border-emerald-500 bg-emerald-50/30 text-slate-800 focus:ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-800 focus:ring-teal-500'
                } focus:outline-none focus:ring-2`}
              />
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <div className="absolute right-3 top-3">
                {duplicateCustomer ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : isPhoneValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : null}
              </div>
            </div>

            {phoneError && (
              <div
                className={`mt-1.5 p-2 rounded-xl text-xs font-semibold flex items-start gap-1.5 ${
                  duplicateCustomer
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{phoneError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমার শ্রেণি / ক্যাটাগরি</label>
              <select
                value={category}
                onFocus={handleInputFocus}
                onChange={(e) => setCategory(e.target.value as CustomerCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-bold bg-white"
              >
                <option value="regular">নিয়মিত (Regular)</option>
                <option value="vip">ভিআইপি (VIP)</option>
                <option value="retail">খুচরা কাস্টমার</option>
                <option value="wholesale">পাইকারি কাস্টমার</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">সর্বোচ্চ বাকি সীমা (Credit Limit)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={creditLimit}
                onFocus={handleInputFocus}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="যেমন: 10000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-bold bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা / গ্রাম / এলাকা</label>
            <input
              type="text"
              value={address}
              onFocus={handleInputFocus}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="যেমন: উত্তর পাড়া, মাস্টার বাড়ি"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-medium bg-white"
            />
          </div>

          {!currentEditCustomer && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পূর্বের বকেয়া বাকি (যদি থাকে ৳)
              </label>
              <input
                type="number"
                min="0"
                value={openingBalance}
                onFocus={handleInputFocus}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-bold bg-white"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                নতুন কাস্টমারের ক্ষেত্রে আগের কোনো বাকি থাকলে এখানে লিখুন।
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কাস্টমার সম্পর্কে বিশেষ নোট (ঐচ্ছিক)</label>
            <input
              type="text"
              value={notes}
              onFocus={handleInputFocus}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: মাসের ১০ তারিখে বেতন পেলে পরিশোধ করেন"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm text-slate-800 font-medium bg-white"
            />
          </div>

          <div className="flex gap-2.5 pt-3 sticky bottom-0 bg-white/95 backdrop-blur-xs py-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer ${
                isFormValid
                  ? 'bg-[#00695C] hover:bg-[#004D40] text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {currentEditCustomer ? 'তথ্য আপডেট করুন' : 'কাস্টমার সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
