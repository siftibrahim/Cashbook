import React from 'react';
import { Product } from '../../types';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';
import { ShoppingCart, Plus, Minus, Heart, Eye } from 'lucide-react';

interface StorefrontProductCardProps {
  product: Product;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onViewProduct?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
}

export const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
  product,
  inCartQuantity = 0,
  onAddToCart,
  onUpdateQuantity,
  onViewProduct,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const inStock = product.stock > 0;

  // Calculate discount percentage if originalPrice exists
  const discount =
    product.discountPercent ||
    (product.originalPrice && product.originalPrice > product.salePrice
      ? Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 100)
      : null);

  const handleCardClick = () => {
    if (onViewProduct) {
      onViewProduct(product);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-500/40 transition-all flex flex-col justify-between overflow-hidden group relative ${
        onViewProduct ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top: Image, Wishlist Heart & Red Discount Pill */}
      <div>
        <div className="relative aspect-square bg-white flex items-center justify-center p-2.5 sm:p-3 overflow-hidden border-b border-slate-100">
          {/* Red Discount Pill (Top-Right, matching reference image) */}
          {discount && (
            <div className="absolute top-2 right-2 z-10 bg-rose-500 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
              -{discount}%
            </div>
          )}

          {/* Wishlist Heart Button (Top-Left) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleWishlist) onToggleWishlist(product.id);
            }}
            className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-xs transition active:scale-90 cursor-pointer"
            title={isWishlisted ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় রাখুন'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
              }`}
            />
          </button>

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
            className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
          />

          {/* Stock Out Overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-10">
              <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-md">
                স্টক শেষ
              </span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-2.5 sm:p-3 space-y-1">
          {/* Title */}
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-[#004D40] transition">
            {product.name}
          </h3>

          {/* Pricing */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900">
              ৳ {formatMoney(product.salePrice)}
            </span>
            {product.originalPrice && product.originalPrice > product.salePrice && (
              <span className="text-[11px] sm:text-xs text-slate-400 line-through">
                ৳ {formatMoney(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Solid Green Button matching reference image: 🛒 কার্ট নিন */}
      <div
        className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {inCartQuantity > 0 ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 shadow-2xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, -1);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 bg-white text-emerald-900 rounded-lg sm:rounded-xl flex items-center justify-center font-bold hover:bg-emerald-100 shadow-2xs transition active:scale-90 cursor-pointer"
              title="পরিমাণ কমান"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-black text-xs sm:text-sm text-emerald-950 px-1 sm:px-2">
              {inCartQuantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, 1);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 bg-[#00897B] text-white rounded-lg sm:rounded-xl flex items-center justify-center font-bold hover:bg-[#00796B] shadow-2xs transition active:scale-90 cursor-pointer"
              title="পরিমাণ বাড়ান"
            >
              <Plus className="w-3 h-3" />
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
            className={`w-full py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer ${
              inStock
                ? 'bg-[#00897B] hover:bg-[#00796B] text-white shadow-emerald-900/10'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{inStock ? 'কার্ট নিন' : 'মজুদ নেই'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
