import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MapPin,
  CreditCard,
  User,
} from 'lucide-react';
import { CustomerProductItem, LinkedProduct } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';

interface MarketplaceQuickBuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: CustomerProductItem | LinkedProduct | null;
  onOrderSuccess: (orderId: string, message: string) => void;
}

export const MarketplaceQuickBuyModal: React.FC<MarketplaceQuickBuyModalProps> = ({
  isOpen,
  onClose,
  product,
  onOrderSuccess,
}) => {
  const currentProfile = marketplaceSocialService.getCurrentProfile();

  const [buyerName, setBuyerName] = useState(currentProfile.name || '');
  const [buyerPhone, setBuyerPhone] = useState(currentProfile.phone || '');
  const [buyerAddress, setBuyerAddress] = useState(currentProfile.address || currentProfile.location || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const price = (product as any).salePrice || 0;
  const deliveryCharge = 60; // Standard inside Dhaka or flat delivery
  const total = price + deliveryCharge;

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!buyerName.trim()) {
      setErrorMsg('আপনার নাম লিখুন।');
      return;
    }

    if (!buyerPhone.trim() || buyerPhone.length < 10) {
      setErrorMsg('সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!buyerAddress.trim()) {
      setErrorMsg('ডেলিভারি ঠিকানা প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = marketplaceSocialService.purchaseCustomerProduct({
        productId: product.id,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerAddress: buyerAddress.trim(),
        paymentMethod:
          paymentMethod === 'cod'
            ? 'ক্যাশ অন ডেলিভারি (COD)'
            : paymentMethod === 'bkash'
            ? 'বিকাশ (bKash)'
            : paymentMethod === 'nagad'
            ? 'নগদ (Nagad)'
            : 'রকেট (Rocket)',
      });

      setIsSubmitting(false);
      onOrderSuccess(res.orderId, res.message);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'অর্ডার করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#1877F2] to-blue-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base">সরাসরি অর্ডার ও চেকআউট</h3>
                <p className="text-[11px] text-blue-100">বিক্রেতা সরাসরি অর্ডার পেয়ে ডেলিভারি প্রস্তুত করবেন</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Product Summary */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
              <img
                src={product.imageUrl || (product as any).images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-xs text-slate-900 line-clamp-1">{product.name}</h4>
              <p className="text-[11px] text-slate-500">
                বিক্রেতা: {(product as any).sellerName || 'ভেরিফাইড সেলার'}
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-black text-[#1877F2]">৳ {formatMoney(price)}</span>
                <span className="text-[11px] text-slate-400">+ ডেলিভারি ৳{deliveryCharge}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmOrder} className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="আপনার নাম লিখুন..."
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মোবাইল নম্বর <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পূর্ণ ডেলিভারি ঠিকানা <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <textarea
                  rows={2}
                  placeholder="বাসা নম্বর, রোড, এলাকা ও জেলা..."
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পেমেন্ট মেথড বেছে নিন
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cod', label: 'ক্যাশ অন ডেলিভারি', desc: 'পণ্য পেয়ে মূল্য দিন' },
                  { id: 'bkash', label: 'বিকাশ (bKash)', desc: 'অনলাইন ওয়ালেট' },
                  { id: 'nagad', label: 'নগদ (Nagad)', desc: 'ডাক বিভাগ ওয়ালেট' },
                  { id: 'rocket', label: 'রকেট (Rocket)', desc: 'ডিবিবিএল' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPaymentMethod(item.id as any)}
                    className={`p-2.5 text-left rounded-xl border transition cursor-pointer ${
                      paymentMethod === item.id
                        ? 'border-[#1877F2] bg-blue-50/70 text-[#1877F2]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="font-black text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total calculation */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>পণ্যের মূল্য:</span>
                <span className="font-bold">৳ {formatMoney(price)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-bold">৳ {formatMoney(deliveryCharge)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200 text-sm">
                <span>সর্বমোট:</span>
                <span className="text-[#1877F2]">৳ {formatMoney(total)}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-black text-white bg-[#1877F2] hover:bg-blue-700 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'অর্ডার হচ্ছে...' : 'অর্ডার নিশ্চিত করুন'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
