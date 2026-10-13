import React, { useState, useEffect } from 'react';
import {
  Lock,
  Sparkles,
  CreditCard,
  PhoneCall,
  RotateCcw,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { StoreProfile } from '../types';
import { PaymentRecord, SubscriptionPlan, SystemPaymentSettings } from '../types/adminTypes';
import { DEFAULT_PLANS, subscribeToPaymentSettings } from '../services/adminService';
import { formatMoney } from '../utils/storage';

interface SubscriptionLockScreenProps {
  store: StoreProfile;
  isExpired?: boolean;
  hasPendingPayment?: boolean;
  pendingPayment?: Partial<PaymentRecord> | null;
  onOpenRenewModal: () => void;
  onRefreshStatus: () => Promise<void>;
  onLogout: () => void;
  onOpenSupport?: () => void;
  onOpenSupportModal?: () => void;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  store,
  isExpired = true,
  hasPendingPayment = false,
  pendingPayment,
  onOpenRenewModal,
  onRefreshStatus,
  onLogout,
  onOpenSupport,
  onOpenSupportModal,
}) => {
  const handleSupportOpen = onOpenSupport || onOpenSupportModal || (() => {});
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [settings, setSettings] = useState<SystemPaymentSettings | null>(null);

  useEffect(() => {
    const unsub = subscribeToPaymentSettings((data) => {
      if (data) {
        setSettings(data);
        if (data.customPlans && data.customPlans.length > 0) {
          setPlans(data.customPlans);
        }
      }
    });
    return () => unsub();
  }, []);

  // Auto-poll every 5 seconds to auto-unlock as soon as Super Admin approves
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await onRefreshStatus();
      } catch (err) {
        // silent background check
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onRefreshStatus]);

  const handleRefresh = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    try {
      await onRefreshStatus();
      setLastCheckMessage('✅ সার্ভার থেকে সর্বশেষ স্ট্যাটাস চেক করা হয়েছে');
    } catch (err) {
      setLastCheckMessage('সার্ভার থেকে তথ্য রিফ্রেশ করা যায়নি');
    } finally {
      setIsChecking(false);
      setTimeout(() => setLastCheckMessage(null), 4000);
    }
  };

  return (
    <div
      id="subscription-glass-lock-screen"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300"
    >
      <div className="w-full max-w-lg bg-slate-900/95 border-2 border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden backdrop-blur-xl">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {hasPendingPayment ? (
          /* PENDING VERIFICATION STATE OVER GLASS */
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4 shadow-lg ring-4 ring-amber-500/10">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-amber-400" style={{ animationDuration: '4s' }} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
              <FileCheck className="w-3.5 h-3.5" />
              <span>পেমেন্ট ভেরিফিকেশন হচ্ছে...</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              আপনার পেমেন্ট ভেরিফিকেশন প্রক্রিয়াধীন রয়েছে
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto mb-5">
              প্রিয় <span className="text-amber-300 font-bold">{store.name || store.shopName || 'গ্রাহক'}</span>, আপনার পাঠানো পেমেন্ট তথ্য জমা নেওয়া হয়েছে। সুপার অ্যাডমিন অনুমোদন করলেই স্বয়ংক্রিয়ভাবে স্ক্রিন আনলক হয়ে যাবে।
            </p>

            {pendingPayment && (
              <div className="bg-slate-950/80 border border-amber-500/30 p-4 rounded-2xl mb-5 text-left text-xs space-y-1.5 shadow-inner">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">প্যাকেজ:</span>
                  <span className="font-bold text-white">{pendingPayment.planName || 'প্রিমিয়াম প্যাক'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">টাকা ও মাধ্যম:</span>
                  <span className="font-black text-emerald-400">৳{pendingPayment.amount} ({pendingPayment.paymentMethod?.toUpperCase()})</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="font-mono font-bold text-amber-300">{pendingPayment.trxId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">প্রেরক নম্বর:</span>
                  <span className="font-mono text-slate-200">{pendingPayment.senderNumber || pendingPayment.senderPhone}</span>
                </div>
              </div>
            )}

            <div className="p-3 bg-teal-950/50 border border-teal-800/60 rounded-xl text-teal-200 text-xs flex items-center justify-center gap-2 mb-5">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400 shrink-0" />
              <span>প্রতি ৫ সেকেন্ড পর পর স্বয়ংক্রিয়ভাবে স্ট্যাটাস চেক হচ্ছে...</span>
            </div>
          </>
        ) : (
          /* EXPIRED STATE OVER GLASS */
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-4 shadow-lg ring-4 ring-rose-500/10">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>মেয়াদ সমাপ্ত (Subscription Expired)</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়েছে
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto mb-5">
              প্রিয় <span className="text-white font-bold">{store.name || store.shopName || 'গ্রাহক'}</span>, আপনার অ্যাকাউন্টের সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে। অ্যাপের হিসাব, বাকি খাতা ও সকল ফিচার নিরবচ্ছিন্ন চালু রাখতে প্যাকেজ রিনিউ করুন।
            </p>

            {/* Packages Summary */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl mb-5 text-left space-y-2 text-xs shadow-inner">
              {plans.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold">{p.nameBn}:</span>
                  <span className="font-black text-teal-400">৳{formatMoney(p.price)} / {p.durationDays} দিন</span>
                </div>
              ))}
              {settings?.bonusConfig?.isBonusEnabled !== false && (settings?.bonusConfig?.bonusDays ?? 7) > 0 && (
                <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-amber-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{settings?.bonusConfig?.bonusTitle || 'স্পেশাল অফার'}: সাথে আরও +{settings?.bonusConfig?.bonusDays || 7} দিন ফ্রি বোনাস!</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Status refresh message if any */}
        {lastCheckMessage && (
          <div className="mb-4 text-xs font-bold text-teal-300 bg-teal-950/80 p-2.5 rounded-xl border border-teal-700 animate-in fade-in">
            {lastCheckMessage}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onOpenRenewModal}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
          >
            <CreditCard className="w-4 h-4" />
            <span>{hasPendingPayment ? 'পেমেন্ট তথ্য পরিবর্তন / অন্য প্যাকেজ' : 'প্যাকেজ রিনিউ করুন ও চালু করুন'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isChecking}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-teal-400' : ''}`} />
              <span>{isChecking ? 'যাচাই হচ্ছে...' : 'পেমেন্ট চেক করুন'}</span>
            </button>

            <button
              type="button"
              onClick={handleSupportOpen}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-teal-300 hover:text-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>হেল্পলাইন সাপোর্ট</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-rose-400 font-semibold inline-flex items-center gap-1 cursor-pointer pt-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>অন্য অ্যাকাউন্টে লগইন / লগআউট</span>
          </button>
        </div>
      </div>
    </div>
  );
};

