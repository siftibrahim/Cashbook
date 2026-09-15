import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Star,
  Rocket,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Share2,
  MessageCircle,
  Heart,
} from 'lucide-react';
import { Product, OnlineStoreConfig } from '../../types';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';

interface StorefrontProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  inCartQuantity?: number;
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  config: OnlineStoreConfig;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
}

export const StorefrontProductDetailModal: React.FC<StorefrontProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  inCartQuantity = 0,
  onAddToCart,
  onBuyNow,
  config,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  if (!isOpen || !product) return null;

  const inStock = product.stock > 0;
  const discount =
    product.discountPercent ||
    (product.originalPrice && product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : null);

  const deliveryBadge = product.deliveryTime || '১২-২৪ ঘণ্টা';
  const rating = product.rating || 4.9;
  const reviewCount = product.reviewCount || (product.salePrice > 500 ? 181 : 94);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: `${product.name} - মাত্র ৳${formatMoney(product.salePrice)} তে কিনুন!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.href} - ${product.name}`);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const handleAskWhatsApp = () => {
    const phone = (config.whatsappPhone || config.phone || '').replace(/[^0-9]/g, '');
    if (!phone) {
      alert('ভেন্ডরের WhatsApp নম্বর পাওয়া যায়নি।');
      return;
    }
    const msg = `আসসালামু আলাইকুম, আমি "${product.name}" (মূল্য: ৳${formatMoney(product.salePrice)}) সম্পর্কে বিস্তারিত জানতে চাই।`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-100"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
              {product.category || 'সাধারণ পণ্য'}
            </span>
            {inStock ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                স্টকে আছে ({product.stock} {product.unit})
              </span>
            ) : (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                স্টক শেষ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleWishlist && (
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title={isWishlisted ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় রাখুন'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-slate-500'
                  }`}
                />
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="শেয়ার করুন"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Product Image Stage */}
          <div className="relative aspect-4/3 sm:aspect-16/10 bg-[#F9FAFB] rounded-2xl p-4 flex items-center justify-center border border-slate-100 overflow-hidden">
            {discount && (
              <div
                className="absolute top-0 left-4 z-10 bg-[#2563EB] text-white text-xs font-black px-2.5 pt-1.5 pb-3 shadow-md text-center flex flex-col items-center justify-center"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
                  minWidth: '46px',
                }}
              >
                <span>{discount}%</span>
                <span className="text-[9px] font-extrabold uppercase">OFF</span>
              </div>
            )}

            <img
              src={product.imageUrl || getFallbackProductImage(product.name, product.category)}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const fallback = getFallbackProductImage(product.name, product.category);
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
              className="max-h-full max-w-full object-contain rounded-xl drop-shadow-sm hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Product Title & Ratings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-slate-800 text-xs font-bold">
                <Rocket className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                <span>{deliveryBadge} ডেলিভারি</span>
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold bg-amber-50/50 px-2 py-0.5 rounded-full">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{rating}</span>
                <span className="text-slate-400 font-normal">({reviewCount} রিভিউ)</span>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {product.name}
            </h2>

            {/* Price Box */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#004D40]">
                ৳ {formatMoney(product.salePrice)}
              </span>
              {product.originalPrice && product.originalPrice > product.salePrice && (
                <span className="text-sm sm:text-base text-slate-400 line-through">
                  ৳ {formatMoney(product.originalPrice)}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                / {product.unit || 'পিস'}
              </span>
            </div>
          </div>

          {/* Highlights & Guarantees */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <div className="space-y-1">
              <Truck className="w-4 h-4 text-teal-700 mx-auto" />
              <div className="text-[11px] font-bold text-slate-800">হোম ডেলিভারি</div>
              <div className="text-[10px] text-slate-500">সারা বাংলাদেশে</div>
            </div>
            <div className="space-y-1 border-x border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="text-[11px] font-bold text-slate-800">১০০% আসল পণ্য</div>
              <div className="text-[10px] text-slate-500">গ্যারান্টিযুক্ত</div>
            </div>
            <div className="space-y-1">
              <RotateCcw className="w-4 h-4 text-blue-600 mx-auto" />
              <div className="text-[11px] font-bold text-slate-800">ক্যাশ অন ডেলিভারি</div>
              <div className="text-[10px] text-slate-500">পণ্য দেখে পেমেন্ট</div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              পণ্যের বিবরণ ও স্পেসিফিকেশন:
            </h4>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-line">
              {product.description ||
                `${product.name} একটি প্রিমিয়াম কোয়ালিটি পণ্য। এটি দৈনন্দিন ব্যবহার ও দীর্ঘস্থায়িত্ব নিশ্চিত করার জন্য তৈরি। নির্ভরযোগ্য মানের নিশ্চয়তা এবং দ্রুত ডেলিভারির সাথে অর্ডার করুন।`}
            </div>
          </div>

          {/* Vendor Help & WhatsApp button */}
          <button
            type="button"
            onClick={handleAskWhatsApp}
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>পণ্য সম্পর্কে ভেন্ডরের সাথে সরাসরি WhatsApp-এ কথা বলুন</span>
          </button>
        </div>

        {/* Footer Actions (Sticky Bottom) */}
        <div className="p-4 border-t border-slate-100 bg-white shadow-lg space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">পরিমাণ:</span>
              <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  type="button"
                  disabled={selectedQuantity <= 1}
                  onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-700 font-bold shadow-2xs hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-black text-slate-900">
                  {selectedQuantity}
                </span>
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={() => setSelectedQuantity((q) => q + 1)}
                  className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-700 font-bold shadow-2xs hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total calculation */}
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-semibold">মোট মূল্য</div>
              <div className="text-base sm:text-lg font-black text-[#004D40]">
                ৳ {formatMoney(product.salePrice * selectedQuantity)}
              </div>
            </div>
          </div>

          {/* Action Buttons: Add to Cart + Buy Now */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => {
                onAddToCart(product, selectedQuantity);
                onClose();
              }}
              className="py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-teal-50 hover:bg-teal-100 text-[#004D40] border border-[#004D40]/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>কার্টে যোগ করুন</span>
            </button>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => {
                onBuyNow(product, selectedQuantity);
                onClose();
              }}
              className="py-3 px-4 rounded-2xl font-black text-xs sm:text-sm bg-[#004D40] hover:bg-[#00382E] text-white shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
            >
              <span>এখনই কিনুন</span>
            </button>
          </div>
        </div>

        {/* Share toast */}
        {showCopiedToast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>লিংক কপি করা হয়েছে!</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
