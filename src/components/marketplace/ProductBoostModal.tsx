import React, { useState } from 'react';
import {
  X,
  Zap,
  Sparkles,
  Flame,
  Crown,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  Phone,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CustomerProductItem, CustomerProfile } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';

interface ProductBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CustomerProductItem | any;
  currentProfile: CustomerProfile;
  onShowToast: (msg: string) => void;
  onBoostSubmitted?: () => void;
}

interface BoostPackage {
  id: 'boost_3d' | 'boost_7d' | 'boost_15d' | 'boost_30d';
  title: string;
  days: number;
  amount: number;
  reach: string;
  badge: string;
  isPopular?: boolean;
  icon: string;
  bgGradient: string;
  textColor: string;
  features: string[];
}

const BOOST_PACKAGES: BoostPackage[] = [
  {
    id: 'boost_3d',
    title: 'বেসিক বুস্ট',
    days: 3,
    amount: 150,
    reach: '৩,০০০+ মানুষ',
    badge: 'কুইক স্টার্ট',
    icon: '⚡',
    bgGradient: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600',
    features: ['৩ দিন স্পনসরড প্রদর্শন', 'ক্যাটাগরি পেজের শীর্ষে অবস্থান', 'সেন্ট্রাল ফিডে রিকমেন্ডেশন'],
  },
  {
    id: 'boost_7d',
    title: 'সুপার বুস্ট (জনপ্রিয়)',
    days: 7,
    amount: 300,
    reach: '৮,৫০০+ মানুষ',
    badge: 'সেরা চয়েস 🔥',
    isPopular: true,
    icon: '🔥',
    bgGradient: 'from-amber-500 to-rose-600',
    textColor: 'text-amber-600',
    features: [
      '৭ দিন প্রিমিয়াম স্পনসরড ব্যাজ',
      'সার্চ রেজাল্ট ও ফিডের একদম শীর্ষে',
      'সোশ্যাল নোটিফিকেশন হাইলাইট',
      '২ গুণ বেশি বিক্রির সম্ভাবনা',
    ],
  },
  {
    id: 'boost_15d',
    title: 'মেগা বুস্ট',
    days: 15,
    amount: 550,
    reach: '২০,০০০+ মানুষ',
    badge: 'উচ্চ বিক্রি',
    icon: '🚀',
    bgGradient: 'from-purple-600 to-pink-600',
    textColor: 'text-purple-600',
    features: [
      '১৫ দিন একটানা স্পনসরড র‍্যাংক',
      'হোমপেজ ফিচার সেকশনে প্রদর্শন',
      'মার্কেটপ্লেস ও ফিড উভয় জায়গায় পিন',
      'বিশেষ গোল্ডেন হাইলাইট ফ্রেম',
    ],
  },
  {
    id: 'boost_30d',
    title: 'ভিআইপি আলটিমেট বুস্ট',
    days: 30,
    amount: 950,
    reach: '৫০,০০০+ মানুষ',
    badge: 'ভিআইপি পার্টনার 👑',
    icon: '👑',
    bgGradient: 'from-emerald-600 to-teal-700',
    textColor: 'text-emerald-600',
    features: [
      'সম্পূর্ণ ৩০ দিন টপ স্পনসরড স্লট',
      'সুপার এডমিন প্রমোট অগ্রাধিকার',
      'সোশ্যাল পেজ ও হোম ব্যানার ফিচার',
      'আনলিমিটেড ক্রেতা চ্যাট এনগেজমেন্ট',
    ],
  },
];

// Super Admin Payment accounts
const ADMIN_PAYMENT_NUMBERS = {
  bkash: '01812345678',
  nagad: '01711223344',
  rocket: '01998877665',
};

export const ProductBoostModal: React.FC<ProductBoostModalProps> = ({
  isOpen,
  onClose,
  product,
  currentProfile,
  onShowToast,
  onBoostSubmitted,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage>(BOOST_PACKAGES[1]);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState(currentProfile.phone || '');
  const [trxId, setTrxId] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const handleCopyNumber = (number: string, key: string) => {
    navigator.clipboard?.writeText(number);
    setCopiedKey(key);
    onShowToast(`নম্বর (${number}) কপি করা হয়েছে`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitBoost = (e: React.FormEvent) => {
    e.preventDefault();

    if (!senderNumber.trim()) {
      onShowToast('⚠️ যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন');
      return;
    }
    if (!trxId.trim()) {
      onShowToast('⚠️ পেমেন্টের ট্রানজেকশন আইডি (TrxID) লিখুন');
      return;
    }

    setIsSubmitting(true);
    try {
      marketplaceSocialService.createBoostRequest({
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || (product.images && product.images[0]) || '',
        productPrice: Number(product.salePrice || 0),
        packageId: selectedPackage.id,
        packageName: selectedPackage.title,
        days: selectedPackage.days,
        amount: selectedPackage.amount,
        paymentMethod,
        senderNumber: senderNumber.trim(),
        trxId: trxId.trim().toUpperCase(),
      });

      onShowToast(
        `🎉 বুস্ট রিকোয়েস্ট সফল হয়েছে! সুপার এডমিন পেমেন্ট যাচাই করে অনুমোদন করলেই পণ্যটি স্পনসরড হয়ে যাবে।`
      );
      if (onBoostSubmitted) onBoostSubmitted();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner border border-white/30">
                🚀
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg leading-tight">
                  পণ্য প্রমোট ও বুস্ট করুন
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  সেন্ট্রাল মার্কেটপ্লেসে হাজারো ক্রেতার কাছে আপনার পণ্য তুলে ধরুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Product Brief Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5">
            <img
              src={product.imageUrl || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'}
              alt={product.name}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block mb-0.5">
                নির্বাচিত পণ্য
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                {product.name}
              </h4>
              <p className="text-xs font-black text-[#1877F2]">
                ৳ {formatMoney(product.salePrice)}
              </p>
            </div>
            {product.isPromoted && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[11px] font-black shrink-0 shadow-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>ইতিমধ্যে বুস্টেড</span>
              </span>
            )}
          </div>

          {/* Section 1: Boost Packages */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 flex items-center justify-between">
              <span>১. বুস্ট প্যাকেজ নির্বাচন করুন:</span>
              <span className="text-[11px] font-normal text-slate-500">
                (মেয়াদ ও রিচ অনুযায়ী পছন্দ করুন)
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BOOST_PACKAGES.map((pkg) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {pkg.isPopular && (
                      <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        {pkg.badge}
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pkg.icon}</span>
                        <div>
                          <h5 className="font-black text-xs sm:text-sm text-slate-900 leading-tight">
                            {pkg.title}
                          </h5>
                          <span className="text-[11px] text-slate-500 font-bold">
                            {pkg.days} দিন মেয়াদ • {pkg.reach}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-black text-amber-600 block">
                          ৳{pkg.amount}
                        </span>
                      </div>
                    </div>

                    <ul className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Payment to Super Admin */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-200 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>২. সুপার এডমিনের নম্বরে পেমেন্ট করুন</span>
                </h5>
                <p className="text-[11px] text-slate-500">
                  নির্ধারিত ৳{selectedPackage.amount} টাকা সেন্ড মানি করুন
                </p>
              </div>

              {/* Method Selector */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {method === 'bkash' ? 'বিকাশ' : method === 'nagad' ? 'নগদ' : 'রকেট'}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Details Box */}
            <div className="p-3 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {paymentMethod.toUpperCase()} পার্সোনাল নম্বর:
                </span>
                <p className="font-mono font-black text-sm text-slate-900">
                  {ADMIN_PAYMENT_NUMBERS[paymentMethod]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopyNumber(ADMIN_PAYMENT_NUMBERS[paymentMethod], paymentMethod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  copiedKey === paymentMethod
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {copiedKey === paymentMethod ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === paymentMethod ? 'কপি হয়েছে' : 'নম্বর কপি'}</span>
              </button>
            </div>

            {/* Payment Input Form */}
            <form onSubmit={handleSubmitBoost} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    যে নম্বর থেকে টাকা পাঠিয়েছেন: *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="যেমন: 01712345678"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    পেমেন্ট TrxID (ট্রানজেকশন আইডি): *
                  </label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="যেমন: 9J3K8L2M"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>
                  {isSubmitting
                    ? 'আবেদন পাঠানো হচ্ছে...'
                    : `৳${selectedPackage.amount} দিয়ে বুস্ট রিকোয়েস্ট পাঠান ➔`}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
