import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudOff,
  Cloud,
  ChevronRight,
  X,
  ShieldCheck,
  Smartphone,
  Printer,
} from 'lucide-react';
import {
  subscribeSyncStatus,
  getCurrentSyncStatus,
  performFullCloudSync,
  SyncStatus,
} from '../../services/offlineSyncService';

interface NetworkStatusBannerProps {
  onShowToast?: (msg: string) => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ onShowToast }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getCurrentSyncStatus());
  const [showReconnectedAlert, setShowReconnectedAlert] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  // Track previous online state to trigger reconnection animation
  const prevOnlineRef = useRef<boolean>(syncStatus.isOnline);
  const reconnectedTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => {
      // Reconnected
      setShowReconnectedAlert(true);
      if (reconnectedTimeoutRef.current) clearTimeout(reconnectedTimeoutRef.current);
      reconnectedTimeoutRef.current = setTimeout(() => {
        setShowReconnectedAlert(false);
      }, 4000);
      performFullCloudSync().catch(() => {});
    };

    const handleOffline = () => {
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeSyncStatus((newStatus) => {
      if (!prevOnlineRef.current && newStatus.isOnline) {
        // Transitioned from offline to online
        setShowReconnectedAlert(true);
        if (reconnectedTimeoutRef.current) clearTimeout(reconnectedTimeoutRef.current);
        reconnectedTimeoutRef.current = setTimeout(() => {
          setShowReconnectedAlert(false);
        }, 4000);
      }
      prevOnlineRef.current = newStatus.isOnline;
      setSyncStatus(newStatus);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      if (reconnectedTimeoutRef.current) clearTimeout(reconnectedTimeoutRef.current);
    };
  }, []);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const res = await performFullCloudSync();
      setRetryResult(res.message);
      if (onShowToast) onShowToast(res.message);
      if (res.success) {
        setTimeout(() => {
          setIsModalOpen(false);
          setRetryResult(null);
        }, 1500);
      }
    } catch (e: any) {
      setRetryResult('ইন্টারনেট এখনো সংযোগ করা সম্ভব হয়নি।');
    } finally {
      setIsRetrying(false);
    }
  };

  const isOffline = !syncStatus.isOnline;

  return (
    <>
      {/* Floating Animated Network Bar */}
      <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md pointer-events-none no-print">
        <AnimatePresence mode="wait">
          {/* OFFLINE STATE ANIMATED BANNER */}
          {isOffline && (
            <motion.div
              key="offline-banner"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-gradient-to-r from-rose-950/95 via-slate-900/95 to-amber-950/95 text-white p-3 rounded-2xl shadow-2xl border border-rose-500/40 backdrop-blur-md flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* Pulsing Aura Border */}
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-rose-500/10 pointer-events-none"
              />

              {/* Left: Animated WifiOff Icon with pulse ring */}
              <div className="flex items-center gap-3 min-w-0 relative z-10">
                <div className="relative shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0.2, 0.7] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl bg-rose-500/40"
                  />
                  <div className="w-10 h-10 rounded-xl bg-rose-900/80 border border-rose-400/50 flex items-center justify-center text-rose-300">
                    <motion.div
                      animate={{ rotate: [-4, 4, -4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <WifiOff className="w-5 h-5 text-rose-300" />
                    </motion.div>
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                      অফলাইন মোড সক্রিয়
                    </h4>
                  </div>
                  <p className="text-[11px] text-rose-200/90 font-medium truncate">
                    {syncStatus.pendingCount > 0
                      ? `${syncStatus.pendingCount}টি নতুন এন্ট্রি লোকালি সেভ আছে`
                      : 'ইন্টারনেট ছাড়াই খাতা ও বিক্রি চালু আছে'}
                  </p>
                </div>
              </div>

              {/* Right: Action Button to Open Offline Info Modal */}
              <div className="flex items-center gap-1.5 shrink-0 relative z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white transition flex items-center gap-1 border border-white/20 cursor-pointer shadow-xs"
                >
                  <span>বিবরণ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* RECONNECTED CELEBRATION ANIMATED BANNER */}
          {!isOffline && showReconnectedAlert && (
            <motion.div
              key="reconnected-banner"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-gradient-to-r from-emerald-900/95 via-[#004D40]/95 to-teal-900/95 text-white p-3 rounded-2xl shadow-2xl border border-emerald-400/50 backdrop-blur-md flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <motion.div
                  initial={{ scale: 0.6, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-300/60 flex items-center justify-center text-emerald-200 shrink-0"
                >
                  <Wifi className="w-5 h-5 text-emerald-200" />
                </motion.div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                      সংযোগ ফিরে এসেছে!
                    </h4>
                  </div>
                  <p className="text-[11px] text-emerald-200/90 font-medium truncate">
                    ক্লাউড সিঙ্ক সফলভাবে সম্পন্ন হচ্ছে
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReconnectedAlert(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FULL OFFLINE DIAGNOSTIC & HELP MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="bg-white text-slate-800 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                    <CloudOff className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800">
                      অফলাইন মোড স্ট্যাটাস
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      TwingHisabi অফলাইন সুরক্ষা ব্যবস্থা
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Card */}
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-amber-900">
                    বর্তমানে আপনার ডিভাইসটি অফলাইনে রয়েছে
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed font-medium">
                  আপনার কোনো লেনদেন বা বিক্রি ব্যাহত হবে না। আপনি নতুন কাস্টমার যোগ, দ্রুত ক্যাশ ও বাকি বিক্রি, মেমো প্রিন্ট ইত্যাদি সবকিছু স্বাভাবিকভাবেই করতে পারবেন।
                </p>
              </div>

              {/* Features Checklist */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ডিভাইসের লোকাল স্টোরেজে ডাটা ১০০% নিরাপদ</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                  <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ক্যাশ মেমো ও ব্লুটুথ থার্মাল প্রিন্ট পুরোপুরি চালু</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700">
                  <Cloud className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>ইন্টারনেট পেলেই স্বয়ংক্রিয়ভাবে ক্লাউডে ব্যাকআপ হবে</span>
                </div>
              </div>

              {/* Pending Sync Count */}
              <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-500" />
                  সিঙ্কের অপেক্ষায় থাকা এন্ট্রি:
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#004D40] text-white text-[11px] font-black">
                  {syncStatus.pendingCount} টি
                </span>
              </div>

              {/* Retry Result Alert */}
              {retryResult && (
                <div className="mt-3 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 text-center animate-in fade-in">
                  {retryResult}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleManualRetry}
                  disabled={isRetrying}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#004D40] hover:bg-[#00382E] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-98"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'সংযোগ পরীক্ষা হচ্ছে...' : 'পুনরায় সংযোগ পরীক্ষা করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  ঠিক আছে
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
