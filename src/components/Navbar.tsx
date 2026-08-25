import React from 'react';
import { StoreProfile } from '../types';
import { Phone, LogOut, Settings, Store, Bell, Sparkles } from 'lucide-react';

interface NavbarProps {
  store: StoreProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onLogout,
  onOpenSettings,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-30 bg-gradient-to-r from-[#00382E] via-[#004D40] to-[#005B4C] text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-md shrink-0 no-print border-b border-teal-600/40 select-none"
    >
      {/* Left: Store Branding with Icon & Info */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
        {/* Store Avatar Badge */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-500/25 border border-teal-300/30 flex items-center justify-center text-teal-100 shrink-0 shadow-inner ring-1 ring-white/10">
          <Store className="w-5 h-5 text-teal-200" />
        </div>

        {/* Store Name & Clean Status / Phone Row */}
        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-snug text-white truncate drop-shadow-xs max-w-[140px] xs:max-w-[180px] sm:max-w-[280px]">
              {store.name || 'ইব্রাহিম জেনারেল স্টোর'}
            </h1>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[10.5px] sm:text-xs text-teal-200/90 font-medium overflow-hidden">
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                title={`কল করুন: ${store.phone}`}
                className="inline-flex items-center gap-1 hover:text-white transition shrink-0 font-semibold"
              >
                <Phone className="w-3 h-3 text-teal-300 shrink-0" />
                <span className="truncate max-w-[110px] sm:max-w-[150px]">{store.phone}</span>
              </a>
            ) : (
              <span className="text-teal-300/80">দোকান খাতা</span>
            )}

            <span className="text-teal-600/80 text-[10px] shrink-0">•</span>

            <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-teal-200 font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>অনলাইন</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Action Buttons Group (Notifications, Settings, Logout) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Notifications Icon Button */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            id="nav-notifications-btn"
            title="বিজ্ঞপ্তি ও নোটিফিকেশন"
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center border-2 border-[#004D40] shadow-xs animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* Settings Icon Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            id="nav-settings-btn"
            title="দোকান সেটিংস"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          id="nav-logout-btn"
          title="লগআউট করুন"
          className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-rose-500/20 hover:bg-rose-600 active:scale-95 text-rose-200 hover:text-white flex items-center justify-center gap-1.5 transition border border-rose-400/30 shadow-xs cursor-pointer text-xs font-bold"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">লগআউট</span>
        </button>
      </div>
    </header>
  );
};
