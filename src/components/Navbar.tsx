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
  Menu,
  X,
  ChevronRight,
  Database,
  MessageSquare,
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
  isSubscriptionSystemEnabled?: boolean;
  smsBalance?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onLogout,
  onOpenSettings,
  onOpenNotifications,
  onOpenSubscription,
  onOpenPermissions,
  onOpenSms,
  unreadNotificationsCount = 0,
  isSubscriptionSystemEnabled = true,
  smsBalance,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSyncClick = async () => {
    if (syncStatus.isSyncing) return;
    setSyncMsg('সিঙ্ক চলছে...');
    const result = await performFullCloudSync();
    setSyncMsg(result.message);
    setTimeout(() => {
      setSyncMsg(null);
    }, 4000);
  };

  return (
    <>
      <header
        id="main-app-header"
        className="sticky top-0 left-0 right-0 z-40 w-full bg-gradient-to-r from-[#002820] via-[#004D40] to-[#00382E] text-white px-3 sm:px-5 py-2.5 sm:py-3 min-h-[58px] sm:min-h-[64px] flex items-center justify-between shadow-md shrink-0 no-print border-b border-teal-500/40 select-none"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Left: Store Branding with Icon & Info */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
          {/* Store Avatar Badge */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-teal-400/30 to-teal-700/50 border border-teal-300/40 flex items-center justify-center text-teal-100 shrink-0 shadow-md ring-1 ring-white/20">
            <Store className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200" />
          </div>

          {/* Store Name & Info */}
          <div className="flex flex-col min-w-0 justify-center">
            {/* Row 1: Store Name + Dynamic Online/Offline Status */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight leading-tight text-white truncate drop-shadow-xs max-w-[130px] xs:max-w-[200px] sm:max-w-[340px]">
                {store.name || 'TWING হিসাবি'}
              </h1>

              {/* Offline-First Status Pill */}
              <button
                type="button"
                onClick={handleManualSyncClick}
                id="nav-online-status-pill"
                title={
                  syncStatus.isSyncing
                    ? 'ক্লাউডে সিঙ্ক হচ্ছে...'
                    : !syncStatus.isOnline
                    ? 'অফলাইন মোড'
                    : 'অনলাইন ও ক্লাউড সুরক্ষিত'
                }
                className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-full border shadow-xs transition cursor-pointer active:scale-95 ${
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
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-300 shrink-0" />
                    <span className="leading-none">সিঙ্ক...</span>
                  </>
                ) : !syncStatus.isOnline ? (
                  <>
                    <WifiOff className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span className="leading-none">অফলাইন</span>
                  </>
                ) : syncStatus.pendingCount > 0 ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 text-orange-300 shrink-0" />
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
            <div className="flex items-center gap-1 mt-0.5 text-[10.5px] sm:text-xs text-teal-200 font-medium overflow-hidden">
              {store.phone ? (
                <a
                  href={`tel:${store.phone}`}
                  title={`কল করুন: ${store.phone}`}
                  className="inline-flex items-center gap-1 hover:text-white transition shrink-0 font-bold text-teal-100"
                >
                  <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-300 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">{store.phone}</span>
                </a>
              ) : (
                <span className="text-teal-200/90 font-medium">ডিজিটাল খাতা ও ক্যাশবুক</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Clean Action Bar (Notifications + Main Menu Button) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications Icon Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              id="nav-notifications-btn"
              title="বিজ্ঞপ্তি ও নোটিফিকেশন"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition border border-white/15 shadow-xs cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#004D40] shadow-xs animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Clean Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            id="nav-main-menu-btn"
            title="অ্যাপ মেনু খুলুন"
            className="h-9 sm:h-10 px-3 rounded-2xl bg-teal-500/25 hover:bg-teal-500/40 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center gap-1.5 transition border border-teal-400/40 shadow-xs cursor-pointer font-bold text-xs"
          >
            <Menu className="w-4.5 h-4.5 text-teal-300" />
            <span className="text-xs font-black">মেনু</span>
          </button>
        </div>
      </header>

      {/* Sync Toast Notification */}
      {syncMsg && (
        <div
          id="nav-sync-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl border border-teal-500/50 flex items-center gap-2 animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Clean Mobile-Friendly Slide-Over Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          {/* Backdrop dismiss */}
          <div className="fixed inset-0" onClick={() => setIsMenuOpen(false)} />

          {/* Drawer Panel */}
          <div
            className="relative w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white truncate max-w-[170px]">
                      {store.name || 'TWING হিসাবি'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {store.phone || 'অফলাইন-ফার্স্ট খাতা'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu Options List */}
              <div className="mt-5 space-y-2">
                {/* Subscription Packages (Hidden when disabled by Super Admin) */}
                {isSubscriptionSystemEnabled && onOpenSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSubscription();
                    }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-transparent hover:bg-amber-500/25 border border-amber-500/30 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-300 block">
                          সাবস্ক্রিপশন ও প্যাকেজ
                        </span>
                        <span className="text-[10px] text-amber-200/80 block">
                          মেয়াদ বৃদ্ধি ও প্রিমিয়াম ফিচার
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* SMS Tagada & Recharge Service */}
                {onOpenSms && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSms();
                    }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-teal-500/15 to-transparent hover:bg-teal-500/25 border border-teal-500/30 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-teal-300 block">
                            তাগাদা এসএমএস
                          </span>
                          {smsBalance !== undefined && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                              {smsBalance} টি
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-teal-200/80 block">
                          প্যাকেজ ক্রয় ও বাকি তাগাদা পাঠান
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* Store Settings */}
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-800 text-teal-400">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          দোকান সেটিংস
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          প্রোফাইল, ক্যাশমেমো ও প্রিন্টার
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* Permissions & Security */}
                {onOpenPermissions && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenPermissions();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          অ্যাপ পারমিশন ও নিরাপত্তা
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ক্যামেরা, এসএমএস ও স্টোরেজ
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* Cloud Sync Action */}
                <button
                  type="button"
                  onClick={async () => {
                    await handleManualSyncClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 text-sky-400">
                      <RefreshCw
                        className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        ক্লাউড ডাটা সিঙ্ক
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {syncStatus.isOnline
                          ? 'সব ডাটা সেন্ট্রাল সার্ভারের সাথে মিলান'
                          : 'অফলাইন — ইন্টারনেট পেলেই সিঙ্ক হবে'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </button>
              </div>
            </div>

            {/* Drawer Footer: Logout */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট করুন</span>
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-2.5">
                TWING হিসাবি v2.4.0 • সর্বস্বত্ব সংরক্ষিত
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
