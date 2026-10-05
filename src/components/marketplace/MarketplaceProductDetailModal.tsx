import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Heart,
  Share2,
  Store,
  ChevronRight,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  Phone,
  MapPin,
  Package,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { MarketplaceProduct } from '../../types';
import { formatMoney } from '../../utils/storage';
import { enhanceProductPhoto } from '../../utils/productStudioEnhancer';
import { marketplaceApi } from '../../services/marketplaceService';
import { triggerConfettiCelebration } from '../../utils/audio';
import { ProductStudioModal } from '../studio/ProductStudioModal';

interface MarketplaceProductDetailModalProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: MarketplaceProduct, quantity: number) => void;
  onBuyNow: (product: MarketplaceProduct, quantity: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onVisitVendor?: (vendorId: string, vendorName: string) => void;
  relatedProducts?: MarketplaceProduct[];
  onSelectProduct?: (product: MarketplaceProduct) => void;
  onShowToast?: (msg: string) => void;
}

export const MarketplaceProductDetailModal: React.FC<MarketplaceProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  isWishlisted,
  onToggleWishlist,
  onVisitVendor,
  relatedProducts = [],
  onSelectProduct,
  onShowToast,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [isCopied, setIsCopied] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(() => product?.imageUrl || '');
  const [isStudioEditorOpen, setIsStudioEditorOpen] = useState(false);

  React.useEffect(() => {
    if (product) {
      setCurrentImageUrl(product.imageUrl || '');
    }
  }, [product?.id, product?.imageUrl]);

  if (!isOpen || !product) return null;

  const discount = product.discountPercent || (product.originalPrice && product.originalPrice > product.salePrice
    ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
    : 0);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} - TWING Marketplace-এ মাত্র ৳${formatMoney(product.salePrice)} টাকায়!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white border border-[#0b63e5]/30 text-[#0b63e5] text-xs font-bold">
                {product.category || 'পণ্য বিস্তারিত'}
              </span>
              {discount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black">
                  -{discount}% ছাড়
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer relative"
                title="শেয়ার করুন"
              >
                <Share2 className="w-4 h-4" />
                {isCopied && (
                  <span className="absolute -bottom-7 right-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
                    লিংক কপি হয়েছে!
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                className={`p-2 rounded-full transition cursor-pointer ${
                  isWishlisted ? 'text-rose-500 bg-white border border-rose-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="পছন্দের তালিকা"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Top Grid: Image + Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image Gallery */}
              <div className="flex flex-col gap-3">
                <div className="relative aspect-square w-full rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-3 shadow-2xs">
                  <img
                    src={currentImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'}
                    alt={product.name}
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {currentImageUrl && (
                    <button
                      type="button"
                      onClick={() => setIsStudioEditorOpen(true)}
                      className="absolute top-3 right-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 backdrop-blur-xs transition cursor-pointer"
                      title="এআই দিয়ে এই পণ্যের ছবির ব্যাকগ্রাউন্ড মুছে সুন্দর স্টুডিও লুক দিন"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>✨ এআই স্টুডিও এডিট</span>
                    </button>
                  )}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                      -{discount}% ছাড়
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/70 text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs">
                    <Package className="w-3.5 h-3.5 text-[#0b63e5]" />
                    <span>কোড: {product.sku || product.id.slice(-6)}</span>
                  </div>
                </div>
              </div>

              {/* Product Info & Actions */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                    {product.name}
                  </h1>

                  {/* Rating & Reviews */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {(product.rating || 4.8).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({product.reviewCount || 89} রিভিউ)
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ইন স্টক ({product.stock} {product.unit || 'পিস'} অবশিষ্ট)
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-baseline gap-3 shadow-2xs">
                    <div className="text-2xl sm:text-3xl font-black text-[#0b63e5]">
                      ৳ {formatMoney(product.salePrice)}
                    </div>
                    {product.originalPrice && product.originalPrice > product.salePrice && (
                      <div className="text-sm font-semibold text-slate-400 line-through">
                        ৳ {formatMoney(product.originalPrice)}
                      </div>
                    )}
                    {discount > 0 && (
                      <span className="text-xs font-bold text-rose-600 bg-white px-2 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
                        ৳ {formatMoney((product.originalPrice || product.salePrice) - product.salePrice)} সাশ্রয়
                      </span>
                    )}
                  </div>

                  {/* TWING Hisabi Verified Vendor Details Box */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 rounded-2xl border border-emerald-200/80 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-emerald-300 text-emerald-700 flex items-center justify-center font-black shadow-xs shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {product.vendorShopName || 'টুইং অনুমোদিত ভেন্ডোর শপ'}
                          </span>
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                            ✓ TWING হিসাবি ভেরিফাইড
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {product.vendorAddress || 'বাংলাদেশ'} · অনুমোদিত মার্চেন্ট
                        </p>
                      </div>
                    </div>
                    {onVisitVendor && (
                      <button
                        type="button"
                        onClick={() => onVisitVendor(product.vendorId, product.vendorShopName || 'ভেরিফাইড শপ')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition cursor-pointer shadow-2xs shrink-0 ml-2"
                      >
                        শপ ভিজিট করুন
                      </button>
                    )}
                  </div>

                  {/* Trust guarantees list */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>সারা দেশে ক্যাশ অন ডেলিভারি</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0b63e5] shrink-0" />
                      <span>১০০% আসল ও নিরাপদ পণ্য</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>৭ দিনের সহজ রিটার্ন পলিসি</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>যাচাইকৃত মার্চেন্ট ওয়্যারহাউস</span>
                    </div>
                  </div>
                </div>

                {/* Quantity and Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">পরিমাণ:</span>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-l-xl transition cursor-pointer disabled:opacity-30"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-xs sm:text-sm text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                        disabled={quantity >= (product.stock || 99)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-r-xl transition cursor-pointer disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">
                      মোট: ৳ {formatMoney(product.salePrice * quantity)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => onAddToCart(product, quantity)}
                      className="py-3 px-4 bg-white hover:bg-blue-50 text-[#0b63e5] font-bold text-xs sm:text-sm rounded-2xl border border-blue-200 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98 shadow-2xs"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>কার্টে যোগ করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyNow(product, quantity)}
                      className="py-3 px-4 bg-[#0b63e5] hover:bg-[#094ec2] text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>এখনই কিনুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Tabs: Description / Specifications / Customer Reviews */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex border-b border-slate-200 gap-6 text-xs sm:text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('desc')}
                  className={`pb-2.5 cursor-pointer transition relative ${
                    activeTab === 'desc'
                      ? 'text-[#0b63e5] border-b-2 border-[#0b63e5]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  পণ্যের বিবরণ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`pb-2.5 cursor-pointer transition relative ${
                    activeTab === 'specs'
                      ? 'text-[#0b63e5] border-b-2 border-[#0b63e5]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  স্পেসিফিকেশন
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2.5 cursor-pointer transition relative ${
                    activeTab === 'reviews'
                      ? 'text-[#0b63e5] border-b-2 border-[#0b63e5]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  গ্রাহক রিভিউ ({product.reviewCount || 89})
                </button>
              </div>

              <div className="py-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {activeTab === 'desc' && (
                  <div className="space-y-3">
                    <p>{product.description || 'এই পণ্যটি আসল ও প্রামাণিক উপাদান দ্বারা প্রস্তুতকৃত। ডেলিভারি গ্রহণের সময় পণ্য যাচাই করে মূল্য পরিশোধ করতে পারবেন।'}</p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 shadow-2xs">
                      <p className="font-bold text-slate-800">✅ ভেন্ডর প্রতিশ্রুতি:</p>
                      <p>• প্রতিটি পণ্য প্রেরণের পূর্বে গুণগত মান পরীক্ষা করা হয়।</p>
                      <p>• ট্র্যাকিং আইডির মাধ্যমে রিয়েল-টাইমে ডেলিভারি আপডেট দেখা যায়।</p>
                    </div>
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between shadow-2xs">
                      <span className="text-slate-500">ক্যাটাগরি</span>
                      <span className="font-bold text-slate-800">{product.category}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between shadow-2xs">
                      <span className="text-slate-500">একক (Unit)</span>
                      <span className="font-bold text-slate-800">{product.unit || 'পিস'}</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between shadow-2xs">
                      <span className="text-slate-500">মজুদ স্ট্যাটাস</span>
                      <span className="font-bold text-emerald-600">রেডি স্টক</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between shadow-2xs">
                      <span className="text-slate-500">ওয়ারেন্টি</span>
                      <span className="font-bold text-slate-800">৭ দিনের রিপ্লেসমেন্ট</span>
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-3">
                    {[
                      { name: 'আরিফুল ইসলাম', rating: 5, date: '২ দিন আগে', text: 'খুবই চমৎকার পণ্য! ডেলিভারি অনেক দ্রুত পেয়েছি। প্যাকেজিং দারুণ ছিল।' },
                      { name: 'নাজমুল হাসান', rating: 5, date: '১ সপ্তাহ আগে', text: '১০০% অরিজিনাল কোয়ালিটি। ছবির সাথে হুবহু মিল পেয়েছি।' },
                      { name: 'সালমা আক্তার', rating: 4, date: '২ সপ্তাহ আগে', text: 'ভেন্ডর খুব ভালো ব্যবহার করেছেন। ধন্যবাদ TWING Marketplace!' },
                    ].map((rev, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{rev.name}</span>
                          <span className="text-[10px] text-slate-400">{rev.date}</span>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-slate-600">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-black text-slate-900">সম্পর্কিত অন্যান্য পণ্য</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {relatedProducts.slice(0, 4).map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => onSelectProduct && onSelectProduct(rel)}
                      className="p-2.5 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white hover:shadow-md transition cursor-pointer flex flex-col justify-between shadow-2xs"
                    >
                      <div className="aspect-square w-full rounded-xl bg-white border border-slate-100 overflow-hidden mb-2">
                        <img
                          src={rel.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80'}
                          alt={rel.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{rel.name}</div>
                      <div className="text-xs font-black text-[#0b63e5] mt-1">৳ {formatMoney(rel.salePrice)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {isStudioEditorOpen && product && (
        <ProductStudioModal
          isOpen={isStudioEditorOpen}
          onClose={() => setIsStudioEditorOpen(false)}
          product={{
            id: product.id,
            name: product.name,
            imageUrl: currentImageUrl,
            category: product.category,
          }}
          onSuccess={(updatedImg) => {
            setCurrentImageUrl(updatedImg);
            product.imageUrl = updatedImg;
            marketplaceApi.updateProductImage(product.id, updatedImg).catch(() => {});
            if (onShowToast) {
              onShowToast(`✨ '${product.name}'-এর ছবি আকর্ষণীয় স্টুডিও লুকে রূপান্তরিত হয়েছে!`);
            }
          }}
          onShowToast={onShowToast}
        />
      )}
    </AnimatePresence>
  );
};
