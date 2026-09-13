import React from 'react';
import { Store, ShoppingBag, MessageCircle } from 'lucide-react';

interface StorefrontHeaderProps {
  storeName?: string;
  logoUrl?: string;
  cartCount: number;
  onOpenCart: () => void;
  onOpenSupport: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  storeName,
  logoUrl,
  cartCount,
  onOpenCart,
  onOpenSupport,
}) => {
  // Brand name styling - if default, shows bikroyhub brand or vendor's custom store name
  const isDefaultOrBikroy = !storeName || storeName === 'আমার দোকান' || storeName.toLowerCase().includes('bikroy');

  return (
    <header className="bg-white border-b border-slate-200/80 px-3.5 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Logo/Icon & Ecommerce Name */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName || 'Store Logo'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#004D40] text-amber-300 flex items-center justify-center shadow-xs shrink-0 border border-teal-700/40">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-300/20" />
            </div>
          )}

          <div className="min-w-0 flex items-baseline">
            {isDefaultOrBikroy ? (
              <span className="text-base sm:text-xl font-black tracking-tight select-none truncate">
                <span className="text-[#004D40]">bikroy</span>
                <span className="text-[#F97316]">hub</span>
              </span>
            ) : (
              <span className="text-base sm:text-lg font-black text-slate-900 truncate tracking-tight">
                {storeName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Only Support Menu (Chat with Vendor) & Cart Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Vendor Support Menu Button (Customer can chat directly with Vendor) */}
          <button
            type="button"
            onClick={onOpenSupport}
            id="storefront-support-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title="ভেন্ডরের সাথে সাপোর্ট চ্যাট করুন"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <MessageCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11px] sm:text-xs font-black">সাপোর্ট চ্যাট</span>
          </button>

          {/* Cart Menu Button */}
          <button
            type="button"
            onClick={onOpenCart}
            id="storefront-cart-pill"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-[#004D40] hover:bg-[#00382E] text-white text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
            title="শপিং কার্ট দেখুন"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-xs font-black">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
