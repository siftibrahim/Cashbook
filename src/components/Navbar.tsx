import React from 'react';
import { StoreProfile } from '../types';
import { Phone, LogOut, Settings, Store, Bell, Sparkles } from 'lucide-react';

interface NavbarProps {
  store: StoreProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenSubscription?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onLogout,
  onOpenSettings,
  onOpenNotifications,
  onOpenSubscription,
  unreadNotificationsCount = 0,
}) => {
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-gradient-to-r from-[#002820] via-[#004D40] to-[#00382E] text-white px-3 sm:px-5 py-2.5 sm:py-3 min-h-[62px] sm:min-h-[66px] flex items-center justify-between shadow-lg shrink-0 no-print border-b-2 border-teal-500/40 select-none transition-all"
    >
      {/* Left: Store Branding with Icon & Info */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 pr-2">
        {/* Store Avatar Badge */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-teal-400/30 to-teal-700/50 border border-teal-300/40 flex items-center justify-center text-teal-100 shrink-0 shadow-md ring-2 ring-white/10">
          <Store className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200" />
        </div>

        {/* Store Name & Info */}
        <div className="flex flex-col min-w-0 justify-center">
          {/* Row 1: Store Name + Online Status (Always Visible, never clipped) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-white truncate drop-shadow-sm max-w-[120px] xs:max-w-[160px] sm:max-w-[280px]">
              {store.name || 'TWING হিসাবি'}
            </h1>

            {/* Online Status Pill - Guaranteed Shrink-0 */}
            <div className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] text-emerald-300 font-bold shrink-0 bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-500/40 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="leading-none">অনলাইন</span>
            </div>
          </div>

          {/* Row 2: Phone Number / Subtitle */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] sm:text-xs text-teal-200 font-medium overflow-hidden">
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                title={`কল করুন: ${store.phone}`}
                className="inline-flex items-center gap-1 hover:text-white transition shrink-0 font-bold text-teal-100"
              >
                <Phone className="w-3 h-3 text-teal-300 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{store.phone}</span>
              </a>
            ) : (
              <span className="text-teal-200 font-medium">ডিজিটাল খাতা</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons Group (Subscription, Notifications, Settings, Logout) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Subscription / Plan Upgrade Button */}
        {onOpenSubscription && (
          <button
            type="button"
            onClick={onOpenSubscription}
            id="nav-subscription-btn"
            title="সাবস্ক্রিপশন ও পেমেন্ট প্যাকেজ"
            className="h-8.5 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-600/35 hover:from-amber-500/40 hover:to-amber-600/50 active:scale-95 text-amber-200 hover:text-white flex items-center justify-center gap-1 transition border border-amber-400/40 shadow-xs cursor-pointer text-xs font-bold ring-1 ring-amber-300/20"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse shrink-0" />
            <span className="hidden xs:inline text-[11px]">প্যাকেজ</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            id="nav-notifications-btn"
            title="বিজ্ঞপ্তি ও নোটিফিকেশন"
            className="relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#004D40] shadow-xs animate-pulse">
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
            className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
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
          className="h-8.5 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-rose-500/25 hover:bg-rose-600 active:scale-95 text-rose-200 hover:text-white flex items-center justify-center gap-1 transition border border-rose-400/40 shadow-xs cursor-pointer text-xs font-bold"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="hidden md:inline text-[11px]">লগআউট</span>
        </button>
      </div>
    </header>
  );
};


