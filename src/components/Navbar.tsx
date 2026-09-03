import React, { useState, useEffect } from 'react';
import { StoreProfile } from '../types';
import {
  Phone,
  LogOut,
  Settings,
  Store,
  Bell,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  QrCode,
} from 'lucide-react';
import {
  subscribeSyncStatus,
  performFullCloudSync,
  SyncStatus,
  getCurrentSyncStatus,
} from '../services/offlineSyncService';

interface NavbarProps {
  store: StoreProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenSubscription?: () => void;
  onOpenPermissions?: () => void;
  onOpenSms?: () => void;
  onOpenQrCode?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onLogout,
  onOpenSettings,
  onOpenNotifications,
  onOpenSubscription,
  onOpenPermissions,
  onOpenSms,
  onOpenQrCode,
  unreadNotificationsCount = 0,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncStatus.isSyncing) return;
    setSyncMsg('সিঙ্ক চলছে...');
    const result = await performFullCloudSync();
    setSyncMsg(result.message);
    setTimeout(() => {
      setSyncMsg(null);
    }, 4000);
  };

  return (
    <header
      id="main-app-header"
      className="sticky top-0 left-0 right-0 z-40 w-full bg-gradient-to-r from-[#002820] via-[#004D40] to-[#00382E] text-white px-3 sm:px-5 py-2 sm:py-3 min-h-[58px] sm:min-h-[64px] flex items-center justify-between shadow-md shrink-0 no-print border-b border-teal-500/40 select-none"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Left: Store Branding with Icon & Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-1.5">
        {/* Store Avatar Badge */}
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-teal-400/30 to-teal-700/50 border border-teal-300/40 flex items-center justify-center text-teal-100 shrink-0 shadow-md ring-1 ring-white/20">
          <Store className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-teal-200" />
        </div>

        {/* Store Name & Info */}
        <div className="flex flex-col min-w-0 justify-center">
          {/* Row 1: Store Name + Dynamic Online/Offline/Sync Status */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-xs sm:text-base font-black tracking-tight leading-tight text-white truncate drop-shadow-xs max-w-[105px] xs:max-w-[150px] sm:max-w-[300px]">
              {store.name || 'TWING হিসাবি'}
            </h1>

            {/* Offline-First Dynamic Status Pill */}
            <button
              type="button"
              onClick={handleManualSyncClick}
              id="nav-online-status-pill"
              title={
                syncStatus.isSyncing
                  ? 'ক্লাউডে সিঙ্ক হচ্ছে...'
                  : !syncStatus.isOnline
                  ? '📶 অফলাইন মোড — লোকাল মেমরিতে সুরক্ষিত আছে'
                  : syncStatus.pendingCount > 0
                  ? `সিঙ্ক বাকি: ${syncStatus.pendingCount}টি ডাটা (ক্লিক করে এখনই সিঙ্ক করুন)`
                  : 'অনলাইন ও সুরক্ষিত (ক্লিক করে সিঙ্ক করুন)'
              }
              className={`inline-flex items-center gap-1 text-[9.5px] sm:text-[10.5px] font-bold shrink-0 px-1.5 py-0.5 rounded-md border shadow-xs transition cursor-pointer active:scale-95 ${
                syncStatus.isSyncing
                  ? 'bg-sky-950/90 text-sky-200 border-sky-400/50'
                  : !syncStatus.isOnline
                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                  : syncStatus.pendingCount > 0
                  ? 'bg-orange-950/90 text-orange-300 border-orange-500/50 animate-pulse'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {syncStatus.isSyncing ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin text-sky-300 shrink-0" />
                  <span className="leading-none">সিঙ্ক হচ্ছে...</span>
                </>
              ) : !syncStatus.isOnline ? (
                <>
                  <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                  <span className="leading-none">অফলাইন</span>
                </>
              ) : syncStatus.pendingCount > 0 ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-300 shrink-0" />
                  <span className="leading-none">সিঙ্ক ({syncStatus.pendingCount})</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="leading-none">অনলাইন</span>
                </>
              )}
            </button>
          </div>

          {/* Row 2: Phone Number / Subtitle */}
          <div className="flex items-center gap-1 mt-0.5 text-[10px] sm:text-xs text-teal-200 font-medium overflow-hidden">
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                title={`কল করুন: ${store.phone}`}
                className="inline-flex items-center gap-1 hover:text-white transition shrink-0 font-bold text-teal-100"
              >
                <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-300 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{store.phone}</span>
              </a>
            ) : (
              <span className="text-teal-200 font-medium">অফলাইন-ফার্স্ট ডিজিটাল খাতা</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action Buttons Group (Subscription, Notifications, Settings, Logout) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Subscription / Plan Upgrade Button */}
        {onOpenSubscription && (
          <button
            type="button"
            onClick={onOpenSubscription}
            id="nav-subscription-btn"
            title="সাবস্ক্রিপশন ও পেমেন্ট প্যাকেজ"
            className="h-8 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-amber-600/35 hover:from-amber-500/40 hover:to-amber-600/50 active:scale-95 text-amber-200 hover:text-white flex items-center justify-center gap-1 transition border border-amber-400/40 shadow-xs cursor-pointer text-xs font-bold ring-1 ring-amber-300/20"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse shrink-0" />
            <span className="hidden xs:inline text-[10.5px] sm:text-[11px]">প্যাকেজ</span>
          </button>
        )}

        {/* SMS Recharge / Balance Button */}
        {onOpenSms && (
          <button
            type="button"
            onClick={onOpenSms}
            id="nav-sms-btn"
            title="এসএমএস ব্যালেন্স, কাস্টম এসএমএস ও রিচার্জ প্যাক"
            className="h-8 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 active:scale-95 text-teal-200 hover:text-white flex items-center justify-center gap-1 transition border border-teal-400/30 shadow-xs cursor-pointer text-xs font-bold"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-300 shrink-0" />
            <span className="hidden xs:inline text-[10.5px] sm:text-[11px]">এসএমএস</span>
          </button>
        )}

        {/* QR Code Generator & Scanner Access */}
        {onOpenQrCode && (
          <button
            type="button"
            onClick={onOpenQrCode}
            id="nav-qr-btn"
            title="কিউআর কোড জেনারেটর (পণ্য, পেমেন্ট, কাস্টমার)"
            className="h-8 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/35 active:scale-95 text-teal-200 hover:text-white flex items-center justify-center gap-1 transition border border-teal-400/30 shadow-xs cursor-pointer text-xs font-bold"
          >
            <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-300 shrink-0" />
            <span className="hidden sm:inline text-[10.5px] sm:text-[11px]">কিউআর</span>
          </button>
        )}

        {/* Notifications Icon Button */}
        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            id="nav-notifications-btn"
            title="বিজ্ঞপ্তি ও নোটিফিকেশন"
            className="relative w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[17px] sm:h-[17px] px-1 rounded-full bg-rose-500 text-white text-[8.5px] sm:text-[9px] font-black flex items-center justify-center border-2 border-[#004D40] shadow-xs animate-pulse">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        {/* Permissions & Security Shield Button */}
        {onOpenPermissions && (
          <button
            type="button"
            onClick={onOpenPermissions}
            id="nav-permissions-btn"
            title="অ্যাপ পারমিশন ও গুগল প্রাইভেসি পলিসি"
            className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-xl bg-teal-800/40 hover:bg-teal-700/60 active:scale-95 text-teal-200 hover:text-white flex items-center justify-center transition border border-teal-400/30 shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-teal-300" />
          </button>
        )}

        {/* Settings Icon Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            id="nav-settings-btn"
            title="দোকান সেটিংস"
            className="w-8 h-8 sm:w-9.5 sm:h-9.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
          </button>
        )}

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          id="nav-logout-btn"
          title="লগআউট করুন"
          className="h-8 sm:h-9.5 px-2 sm:px-2.5 rounded-xl bg-rose-500/25 hover:bg-rose-600 active:scale-95 text-rose-200 hover:text-white flex items-center justify-center gap-1 transition border border-rose-400/40 shadow-xs cursor-pointer text-xs font-bold"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="hidden md:inline text-[11px]">লগআউট</span>
        </button>
      </div>

      {/* Sync Toast overlay message if user manually triggers sync */}
      {syncMsg && (
        <div
          id="nav-sync-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-teal-500/50 flex items-center gap-2 animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{syncMsg}</span>
        </div>
      )}
    </header>
  );
};
