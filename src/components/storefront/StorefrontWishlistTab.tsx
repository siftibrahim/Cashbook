import React from 'react';
import { Heart, ShoppingBag, Trash2, ArrowRight, Package } from 'lucide-react';
import { Product } from '../../types';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';

interface StorefrontWishlistTabProps {
  products: Product[];
  wishlistIds: string[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onExplore: () => void;
}

export const StorefrontWishlistTab: React.FC<StorefrontWishlistTabProps> = ({
  products,
  wishlistIds,
  onRemoveFromWishlist,
  onAddToCart,
  onViewProduct,
  onExplore,
}) => {
  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  if (wishlistedProducts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center shadow-xs">
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.8]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            আপনার পছন্দের তালিকা খালি!
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            যেকোনো পণ্যের পাশে থাকা লাভ (❤️) আইকনে ট্যাপ করে আপনার পছন্দের তালিকা তৈরি করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
        >
          <span>পণ্য ব্রাউজ করুন</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <span>পছন্দের তালিকা</span>
          </h2>
          <p className="text-xs text-slate-500">{wishlistedProducts.length} টি সংরক্ষিত পণ্য রয়েছে</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wishlistedProducts.map((product) => {
          const inStock = product.stock > 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-slate-200 p-3.5 flex gap-3 shadow-2xs hover:shadow-md transition"
            >
              <div
                onClick={() => onViewProduct(product)}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 border border-slate-100 p-1 shrink-0 overflow-hidden cursor-pointer flex items-center justify-center"
              >
                <img
                  src={product.imageUrl || getFallbackProductImage(product.name, product.category)}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain hover:scale-105 transition"
                />
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h4
                      onClick={() => onViewProduct(product)}
                      className="font-bold text-xs sm:text-sm text-slate-900 truncate hover:text-[#004D40] cursor-pointer"
                    >
                      {product.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onRemoveFromWishlist(product.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="তালিকা থেকে সরান"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{product.category}</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-black text-sm text-slate-900">
                      ৳ {formatMoney(product.salePrice)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.salePrice && (
                      <span className="text-xs text-slate-400 line-through">
                        ৳ {formatMoney(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    disabled={!inStock}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      inStock
                        ? 'bg-[#004D40] hover:bg-[#00382E] text-white shadow-2xs active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{inStock ? 'কার্টে নিন' : 'স্টক শেষ'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
