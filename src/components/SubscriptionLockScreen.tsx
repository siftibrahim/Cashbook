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
} from 'lucide-react';
import { StoreProfile } from '../types';
import { SUPPORT_CONTACT } from '../services/adminService';

interface SubscriptionLockScreenProps {
  store: StoreProfile;
  onOpenRenewModal: () => void;
  onRefreshStatus: () => Promise<void>;
  onLogout: () => void;
  onOpenSupport: () => void;
}

export const SubscriptionLockScreen: React.FC<SubscriptionLockScreenProps> = ({
  store,
  onOpenRenewModal,
  onRefreshStatus,
  onLogout,
  onOpenSupport,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    try {
      await onRefreshStatus();
      setLastCheckMessage('স্ট্যাটাস আপডেট করা হয়েছে');
    } catch (err) {
      setLastCheckMessage('সার্ভার থেকে তথ্য রিফ্রেশ করা যায়নি');
    } finally {
      setIsChecking(false);
      setTimeout(() => setLastCheckMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Shield Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-5 shadow-lg">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>মেয়াদ সমাপ্ত (Subscription Expired)</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়েছে
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          প্রিয় <span className="text-white font-bold">{store.shopName || 'গ্রাহক'}</span>, আপনার অ্যাকাউন্টের ফ্রি ট্রায়াল বা সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে। অ্যাপের হিসাব, বাকি খাতা ও সকল ফিচার নিরবচ্ছিন্ন চালু রাখতে প্যাকেজ রিনিউ করুন।
        </p>

        {/* Packages Summary banner */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-6 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold">১ মাসের স্টার্টার প্যাক:</span>
            <span className="font-black text-teal-400">৳৫০ / ৩০ দিন</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold">২ মাসের জনপ্রিয় প্যাক:</span>
            <span className="font-black text-teal-400">৳১০০ / ৬০ দিন</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold">৪ মাসের সেভিংস প্যাক:</span>
            <span className="font-black text-teal-400">৳২০০ / ১২০ দিন</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold">১ বছরের মেগা প্যাক:</span>
            <span className="font-black text-emerald-400">৳৫০০ / ৩৬৫ দিন</span>
          </div>
        </div>

        {/* Status refresh message if any */}
        {lastCheckMessage && (
          <div className="mb-4 text-xs font-bold text-teal-300 bg-teal-950/60 p-2.5 rounded-xl border border-teal-800 animate-in fade-in">
            {lastCheckMessage}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onOpenRenewModal}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
          >
            <CreditCard className="w-4 h-4" />
            <span>প্যাকেজ রিনিউ করুন ও চালু করুন</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isChecking}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-teal-400' : ''}`} />
              <span>{isChecking ? 'যাচাই হচ্ছে...' : 'পেমেন্ট চেক করুন'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSupport}
              className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-teal-300 hover:text-teal-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>হেল্পলাইন সাপোর্ট</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-rose-400 font-semibold inline-flex items-center gap-1 cursor-pointer pt-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>অন্য অ্যাকাউন্টে লগইন / লগআউট</span>
          </button>
        </div>
      </div>
    </div>
  );
};
