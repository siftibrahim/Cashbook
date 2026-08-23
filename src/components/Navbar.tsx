import React from 'react';
import { StoreProfile } from '../types';
import { Phone, LogOut, Settings, Store, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  store: StoreProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#004D40] text-white px-3.5 sm:px-5 py-2.5 flex justify-between items-center shadow-md shrink-0 no-print border-b border-teal-700/60 select-none">
      {/* Left: Store Identity with Icon & Info */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {/* Store Icon Badge */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600/50 border border-teal-400/40 flex items-center justify-center text-white shrink-0 shadow-inner">
          <Store className="w-5 h-5 text-teal-200" />
        </div>

        {/* Store Name & Phone Number */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-white truncate drop-shadow-xs">
              {store.name || 'ইব্রাহিম জেনারেল স্টোর'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-900/80 text-teal-300 border border-teal-600/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>ভেরিফাইড</span>
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <a
              href={store.phone ? `tel:${store.phone}` : '#'}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-teal-100 hover:text-white font-semibold transition"
            >
              <Phone className="w-3 h-3 text-teal-300 shrink-0" />
              <span className="tracking-wide">{store.phone || '০১৭০৬৯০৮১ contest'}</span>
            </a>

            <div className="flex items-center gap-1 pl-1.5 border-l border-teal-700/80 text-[10px] text-teal-200/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>অনলাইন সিঙ্ক</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Action Buttons (Settings & Logout) */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            id="nav-settings-btn"
            title="দোকান ও অ্যাপ সেটিংস"
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold flex items-center gap-1.5 transition border border-white/20 shadow-xs cursor-pointer text-xs sm:text-sm"
          >
            <Settings className="w-4 h-4 text-teal-200" />
            <span className="hidden sm:inline">সেটিংস</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          id="nav-logout-btn"
          title="লগআউট করুন"
          className="bg-red-500/95 hover:bg-red-600 active:scale-95 px-3 py-1.5 sm:py-2 rounded-xl text-white font-bold flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm cursor-pointer border border-red-400"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>লগআউট</span>
        </button>
      </div>
    </header>
  );
};


