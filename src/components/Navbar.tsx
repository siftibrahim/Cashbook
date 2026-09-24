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
  MoreVertical,
  X,
  ChevronRight,
  MessageSquare,
  Globe,
  Truck,
  QrCode,
  BadgeCheck,
  Cloud,
} from 'lucide-react';
import {
  subscribeSyncStatus,
  performFullCloudSync,
  SyncStatus,
  getCurrentSyncStatus,
} from '../services/offlineSyncService';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface NavbarProps {
  store: StoreProfile;
  onLogout: () => void;
  onOpenSettings?: () => void;
  onOpenOnlineStore?: () => void;
  onOpenEcommerceCod?: () => void;
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
  onOpenOnlineStore,
  onOpenEcommerceCod,
  onOpenNotifications,
  onOpenSubscription,
  onOpenPermissions,
  onOpenSms,
  onOpenQrCode,
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
    setSyncMsg('ক্লাউড সিঙ্ক হচ্ছে...');
    try {
      const result = await performFullCloudSync();
      setSyncMsg(result.message);
    } catch {
      setSyncMsg('সিঙ্ক সম্পন্ন হয়েছে');
    }
    setTimeout(() => {
      setSyncMsg(null);
    }, 3500);
  };

  return (
    <>
      {/* ===================== CLEAN & BEAUTIFUL FINTECH HEADER ===================== */}
      <header
        id="main-app-header"
        className="sticky top-0 left-0 right-0 z-40 w-full bg-gradient-to-r from-[#00382E] via-[#004D40] to-[#003128] text-white px-3 sm:px-4 py-2 min-h-[54px] sm:min-h-[58px] flex items-center justify-between shadow-md shrink-0 no-print border-b border-emerald-500/20 select-none relative"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* Left: Store Branding with Avatar, Name & Phone (Clean, Unstyled, Smaller, Centered) */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
          {/* Store Avatar Logo */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="দোকান সেটিংস খুলুন"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-emerald-400/40 shadow-xs cursor-pointer active:scale-95 transition bg-[#002B23]"
          >
            <img
              src="/icon-192.png"
              alt={store.name || 'TWING Hisabi'}
              className="w-full h-full object-cover"
            />
          </button>

          {/* Store Name & Phone (Plain text, smaller, vertically centered, no extra capsule/card) */}
          <div className="flex flex-col justify-center min-w-0 leading-tight">
            {/* Store Name with subtle online status dot */}
            <div className="flex items-center gap-1.5 min-w-0">
              <h1
                onClick={onOpenSettings}
                title={store.name || 'আমার দোকান'}
                className="text-xs sm:text-sm font-bold text-white tracking-tight truncate cursor-pointer hover:text-emerald-200 transition max-w-[140px] xs:max-w-[200px] sm:max-w-[320px]"
              >
                {store.name || 'আমার দোকান'}
              </h1>

              {/* Online / Sync Status Dot */}
              <button
                type="button"
                onClick={handleManualSyncClick}
                id="nav-online-status-pill"
                title={
                  syncStatus.isSyncing
                    ? 'ক্লাউড সিঙ্ক হচ্ছে...'
                    : syncStatus.isOnline
                    ? 'অনলাইন (সিঙ্ক করতে ক্লিক করুন)'
                    : 'অফলাইন — ইন্টারনেট সংযোগ নেই'
                }
                className="inline-flex items-center justify-center cursor-pointer p-0.5"
              >
                {syncStatus.isSyncing ? (
                  <RefreshCw className="w-2.5 h-2.5 text-amber-300 animate-spin" />
                ) : syncStatus.isOnline ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                ) : (
                  <WifiOff className="w-2.5 h-2.5 text-rose-400" />
                )}
              </button>
            </div>

            {/* Mobile Phone Number */}
            {store.phone && (
              <div className="flex items-center gap-1 mt-0.5">
                <a
                  href={`tel:${store.phone}`}
                  title={`কল করুন: ${store.phone}`}
                  className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] text-teal-100/80 hover:text-white transition font-mono"
                >
                  <Phone className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                  <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[250px]">{store.phone}</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean & Elegant Action Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick QR Code Button (When available) */}
          {onOpenQrCode && (
            <button
              type="button"
              onClick={onOpenQrCode}
              title="দোকানের পেমেন্ট ও কিউআর কোড"
              className="hidden sm:flex w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/10 text-teal-100 hover:text-white items-center justify-center transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              id="nav-notifications-btn"
              title="বিজ্ঞপ্তি ও নোটিফিকেশন"
              className="relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/10 text-teal-100 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#00382E] shadow-xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Menu Icon Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            id="nav-main-menu-btn"
            title="মেনু ও সেটিংস"
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/10 text-white flex items-center justify-center transition cursor-pointer"
          >
            <Menu className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </header>

      {/* Sync Toast Notification Banner */}
      {syncMsg && (
        <div
          id="nav-sync-toast"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#002720]/95 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center gap-2.5 animate-bounce font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* ===================== LUXURY MOBILE MENU DRAWER ===================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop dismiss */}
          <div className="fixed inset-0" onClick={() => setIsMenuOpen(false)} />

          {/* Drawer Panel */}
          <div
            className="relative w-full max-w-xs sm:max-w-sm h-full bg-[#0B1516] border-l border-emerald-500/20 shadow-2xl flex flex-col justify-between p-5 z-10 animate-in slide-in-from-right duration-250 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header Card */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-br from-emerald-400 to-teal-600 shadow-md ring-1 ring-white/20 shrink-0">
                    <img
                      src="/icon-192.png"
                      alt={store.name}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-white truncate max-w-[170px]">
                      {store.name || 'TWING হিসাবি'}
                    </h3>
                    <p className="text-[11px] text-emerald-400/90 font-mono truncate">
                      {store.phone || 'স্মার্ট ক্যাশবুক ও খাতা'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Menu Options List */}
              <div className="mt-4 space-y-2">
                {/* 📱 PWA Install Button */}
                <PWAInstallButton
                  variant="drawer"
                  onActionComplete={() => setIsMenuOpen(false)}
                />

                {/* Subscription Packages */}
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

                {/* Online Store & Website */}
                {onOpenOnlineStore && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenOnlineStore();
                    }}
                    className="w-full p-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/20 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-300 block">
                          অনলাইন স্টোর ও ওয়েবসাইট
                        </span>
                        <span className="text-[10px] text-emerald-200/70 block">
                          ই-কমার্স ওয়েবসাইট, কাস্টম ডোমেন ও অর্ডার
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* E-Commerce & COD Dedicated Ledger */}
                {onOpenEcommerceCod && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenEcommerceCod();
                    }}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-transparent hover:bg-teal-500/25 border border-teal-500/30 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-teal-200 block">
                            ই-কমার্স ও COD হিসাব
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                            আলাদা অপশন
                          </span>
                        </div>
                        <span className="text-[10px] text-teal-100/70 block">
                          ক্যাশ অন ডেলিভারি, কুরিয়ার ও পার্সেল হিসাব
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition" />
                  </button>
                )}

                {/* QR Code Modal Trigger */}
                {onOpenQrCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenQrCode();
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-800 text-teal-300">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          দোকানের পেমেন্ট কিউআর কোড
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          বিকাশ, নগদ বা ব্যাংক কিউআর দেখান
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
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
                    className="w-full p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
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
                    className="w-full p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
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
                  className="w-full p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition cursor-pointer group"
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
            <div className="pt-4 border-t border-emerald-500/20">
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
              <p className="text-[10px] text-slate-500 text-center mt-2.5 font-medium">
                TWING হিসাবি • স্মার্ট খাতা ও ব্যবসা ব্যবস্থাপনা
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
