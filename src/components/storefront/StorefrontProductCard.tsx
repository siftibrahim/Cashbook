import React from 'react';
import { Product } from '../../types';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';
import { Heart, Eye, Zap } from 'lucide-react';

interface StorefrontProductCardProps {
  product: Product;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onViewProduct?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
}

export const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
  product,
  onAddToCart,
  onViewProduct,
  isWishlisted = false,
  onToggleWishlist,
}) => {
  const inStock = (product.stock || 0) > 0;
  const originalPrice = product.originalPrice || product.salePrice;
  const discountPercent =
    product.discountPercent ||
    (originalPrice > product.salePrice
      ? Math.round(((originalPrice - product.salePrice) / originalPrice) * 100)
      : 0);

  return (
    <div
      onClick={() => onViewProduct?.(product)}
      className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer relative"
    >
      {/* Product Image Area */}
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
        <img
          src={product.imageUrl || getFallbackProductImage(product.category)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getFallbackProductImage(product.category);
          }}
        />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-rose-600 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full shadow-xs">
            -{discountPercent}%
          </div>
        )}

        {/* Wishlist Button */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-500 hover:text-rose-600 shadow-2xs transition active:scale-90 cursor-pointer"
            title="পছন্দের তালিকা"
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </button>
        )}

        {/* Quick View Hover Indicator */}
        <div className="absolute inset-0 bg-emerald-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-emerald-950 text-xs font-black px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>বিস্তারিত</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Category Tag */}
          {product.category && (
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1">
              {product.category}
            </span>
          )}

          {/* Product Name */}
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 group-hover:text-emerald-800 transition-colors">
            {product.name}
          </h3>

          {/* Unit / Stock */}
          <div className="flex items-center gap-2 mt-1">
            {product.unit && (
              <span className="text-[11px] text-slate-400">প্রতি {product.unit}</span>
            )}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                inStock
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {inStock ? 'মজুদ আছে' : 'স্টক শেষ'}
            </span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm sm:text-base font-black text-emerald-800">
            ৳ {formatMoney(product.salePrice)}
          </span>
          {originalPrice > product.salePrice && (
            <span className="text-xs text-slate-400 line-through">
              ৳ {formatMoney(originalPrice)}
            </span>
          )}
        </div>

        {/* Direct Single Piece Order & Checkout */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={!inStock}
          className={`w-full py-2 px-3 rounded-xl sm:rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer ${
            inStock
              ? 'bg-[#004D40] hover:bg-[#00382E] text-white shadow-emerald-900/10'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
          title="পছন্দ হলে সরাসরি ১ পিস চেকআউট করুন"
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span>{inStock ? 'সরাসরি অর্ডার' : 'মজুদ নেই'}</span>
        </button>
      </div>
    </div>
  );
};
