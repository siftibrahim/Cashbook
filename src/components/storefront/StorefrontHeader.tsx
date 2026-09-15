import React from 'react';
import { Menu, Bell, ShoppingCart, User, Search, ShoppingBag } from 'lucide-react';

interface StorefrontHeaderProps {
  storeName?: string;
  logoUrl?: string;
  cartCount: number;
  notificationCount?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCart: () => void;
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onLogoClick?: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  storeName,
  logoUrl,
  cartCount,
  notificationCount = 3,
  searchQuery,
  onSearchChange,
  onOpenCart,
  onOpenMenu,
  onOpenNotifications,
  onOpenProfile,
  onLogoClick,
}) => {
  const isDefaultOrBikroy =
    !storeName ||
    storeName === 'আমার দোকান' ||
    storeName.toLowerCase().includes('bikroy') ||
    storeName.toLowerCase().includes('twing');

  return (
    <header className="bg-white border-b border-slate-200/90 px-2.5 sm:px-4 py-2 sticky top-0 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Hamburger Menu Icon */}
          <button
            type="button"
            onClick={onOpenMenu}
            id="storefront-hamburger-btn"
            className="p-1.5 -ml-1 rounded-xl text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            title="মেন্যু খুলুন"
            aria-label="মেন্যু"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Logo & Store Brand */}
          <div
            onClick={onLogoClick}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
            title="হোমপেজে যান"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName || 'Store Logo'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#FBBF24] text-slate-950 flex items-center justify-center shadow-xs shrink-0 border border-amber-400">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 fill-slate-900/20 stroke-[2.2]" />
              </div>
            )}

            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-baseline">
                {isDefaultOrBikroy ? (
                  <span className="text-base sm:text-lg font-black tracking-tight">
                    <span className="text-slate-900">Bikroy</span>
                    <span className="text-[#F97316]">Hub</span>
                  </span>
                ) : (
                  <span className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[110px] sm:max-w-[160px]">
                    {storeName}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate hidden xs:inline">
                সবার জন্য সেরা পণ্য
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar (Matching Reference Image) */}
        <div className="flex-1 max-w-xl mx-1 sm:mx-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none stroke-[2.2]" />
            <input
              type="text"
              id="storefront-header-search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-full focus:outline-hidden focus:ring-2 focus:ring-[#00695C]/30 focus:border-[#00695C] transition placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Right: Notifications, Cart & Profile Icons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Notification Icon with Badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            id="storefront-header-bell"
            className="relative p-1.5 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            title="বিজ্ঞপ্তি ও অফার"
            aria-label="বিজ্ঞপ্তি"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {notificationCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Cart Icon with Badge */}
          <button
            type="button"
            onClick={onOpenCart}
            id="storefront-header-cart"
            className="relative p-1.5 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            title="কার্ট দেখুন"
            aria-label="কার্ট"
          >
            <ShoppingCart className="w-5 h-5 stroke-[2]" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile / Account Avatar Icon */}
          <button
            type="button"
            onClick={onOpenProfile}
            id="storefront-header-profile"
            className="p-1.5 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            title="গ্রাহক প্রোফাইল"
            aria-label="গ্রাহক প্রোফাইল"
          >
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300">
              <User className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
