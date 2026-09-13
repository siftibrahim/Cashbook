import React from 'react';
import { Product } from '../../types';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';
import { Star, ShoppingBag, Plus, Minus, Rocket, Eye } from 'lucide-react';

interface StorefrontProductCardProps {
  product: Product;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onViewProduct?: (product: Product) => void;
}

export const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
  product,
  inCartQuantity = 0,
  onAddToCart,
  onUpdateQuantity,
  onViewProduct,
}) => {
  const inStock = product.stock > 0;
  
  // Calculate discount percent if original price exists
  const discount = product.discountPercent || (
    product.originalPrice && product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : null
  );

  const deliveryBadge = product.deliveryTime || '১২-২৪ ঘণ্টা';
  const rating = product.rating || 4.9;
  const reviewCount = product.reviewCount || (product.salePrice > 500 ? 181 : 94);

  const handleCardClick = () => {
    if (onViewProduct) {
      onViewProduct(product);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col justify-between overflow-hidden group relative ${
        onViewProduct ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Section: Image, Bookmark Ribbon, Delivery Tag */}
      <div>
        <div className="relative aspect-square bg-[#FBFBFB] flex items-center justify-center p-3 overflow-hidden border-b border-slate-100/80">
          {/* Blue Bookmark Ribbon Badge (Exact match to screenshot top-left) */}
          {discount && (
            <div
              className="absolute top-0 left-3 z-10 bg-[#2563EB] text-white text-[10px] sm:text-[11px] font-black px-2 pt-1.5 pb-2.5 shadow-sm text-center tracking-tight flex flex-col items-center justify-center"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
                minWidth: '42px',
              }}
            >
              <span>{discount}%</span>
              <span className="text-[8px] sm:text-[9px] font-extrabold leading-none uppercase">OFF</span>
            </div>
          )}

          {/* Quick View Floating Hint */}
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs p-1.5 rounded-full shadow-xs text-slate-700 hover:text-teal-800">
            <Eye className="w-3.5 h-3.5" />
          </div>

          {/* Product Image */}
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
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
          />

          {/* Stock Out Overlay if not in stock */}
          {!inStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-10">
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-md">
                স্টক শেষ
              </span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-3 sm:p-3.5 space-y-1.5">
          {/* Fast Delivery Pill (🚀 ১২-২৪ ঘণ্টা matching screenshot) */}
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50/90 border border-amber-200/80 text-slate-800 text-[10px] sm:text-[11px] font-bold shadow-2xs">
              <Rocket className="w-3 h-3 text-amber-600 fill-amber-600" />
              <span>{deliveryBadge}</span>
            </span>
          </div>

          {/* Product Title (2 lines clamp) */}
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-[#004D40] transition">
            {product.name}
          </h3>

          {/* Reviews and 5 Yellow Stars (⭐⭐⭐⭐⭐ (181)) */}
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              ({reviewCount})
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Price & Action */}
      <div
        className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-sm sm:text-base font-black text-slate-900">
            ৳ {formatMoney(product.salePrice)}
          </span>
          {product.originalPrice && product.originalPrice > product.salePrice && (
            <span className="text-xs text-slate-400 line-through">
              ৳ {formatMoney(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Quantity controller or Add to Cart button */}
        {inCartQuantity > 0 ? (
          <div className="flex items-center justify-between bg-teal-50 border border-teal-300 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, -1);
              }}
              className="w-7 h-7 bg-white text-teal-900 rounded-xl flex items-center justify-center font-bold hover:bg-teal-100 shadow-2xs transition active:scale-90 cursor-pointer"
              title="পরিমাণ কমান"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-xs sm:text-sm text-teal-950 px-2">
              {inCartQuantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, 1);
              }}
              className="w-7 h-7 bg-[#004D40] text-white rounded-xl flex items-center justify-center font-bold hover:bg-[#00382E] shadow-2xs transition active:scale-90 cursor-pointer"
              title="পরিমাণ বাড়ান"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={!inStock}
            className={`w-full py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer ${
              inStock
                ? 'bg-[#004D40] hover:bg-[#00382E] text-white shadow-teal-950/10'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{inStock ? 'অর্ডার করুন' : 'মজুদ নেই'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
