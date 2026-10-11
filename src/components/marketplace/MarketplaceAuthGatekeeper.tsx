import React, { useState } from 'react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { MarketplaceAuthModal } from './MarketplaceAuthModal';
import { ArrowLeft, ShoppingBag, ShieldCheck, Sparkles, Users, LogIn, UserPlus } from 'lucide-react';

export interface MarketplaceAuthGatekeeperProps {
  onSuccess: (user: CustomerProfile) => void;
  onBackToDashboard?: () => void;
}

export const MarketplaceAuthGatekeeper: React.FC<MarketplaceAuthGatekeeperProps> = ({
  onSuccess,
  onBackToDashboard,
}) => {
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>('login');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-[#1877F2] selection:text-white">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">ড্যাশবোর্ডে ফিরুন</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black text-[#1877F2] tracking-tight leading-none">
              TWING
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
              Central Marketplace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            className="px-3.5 py-1.5 text-xs font-black text-[#1877F2] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
          >
            লগইন
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('register')}
            className="px-3.5 py-1.5 text-xs font-black text-white bg-[#1877F2] hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            রেজিস্ট্রেশন
          </button>
        </div>
      </header>

      {/* Main Hero & CTA */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#1877F2] to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 ring-8 ring-blue-50">
          <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-2 max-w-xl">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            সেন্ট্রাল মার্কেটপ্লেসে আপনাকে স্বাগতম
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            হাজারো বিক্রেতা ও ক্রেতাদের সোশ্যাল প্ল্যাটফর্ম। নিজের পণ্য বিক্রি করুন, অর্ডার ট্র্যাক করুন এবং বন্ধুদের সাথে নিরাপদে কেনাকাটা করুন।
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-2xl text-left">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-black text-xs text-slate-900">সুরক্ষিত প্রোফাইল</h4>
            <p className="text-[11px] text-slate-500">সহজ মোবাইল ও পিন ভেরিফিকেশন দিয়ে দ্রুত একাউন্ট তৈরি।</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h4 className="font-black text-xs text-slate-900">পণ্য বেচাকেনা</h4>
            <p className="text-[11px] text-slate-500">ছবি তুলে সরাসরি মার্কেটপ্লেসে পণ্য আপলোড ও বিক্রি করুন।</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="font-black text-xs text-slate-900">সোশ্যাল নেটওয়ার্ক</h4>
            <p className="text-[11px] text-slate-500">বন্ধু যুক্ত করুন, পোস্ট শেয়ার করুন ও লাইভ ইনবক্স চ্যাট।</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setAuthModalMode('login')}
            className="px-6 py-3 bg-[#1877F2] hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন করুন</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('register')}
            className="px-6 py-3 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 text-xs sm:text-sm font-black rounded-2xl border border-slate-200 shadow-2xs transition flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#1877F2]" />
            <span>নতুন অ্যাকাউন্ট তৈরি করুন</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/60 bg-white">
        &copy; {new Date().getFullYear()} TWING Central Marketplace. All rights reserved.
      </footer>

      {/* Auth Modal Popup */}
      {authModalMode && (
        <MarketplaceAuthModal
          isOpen={true}
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={(user) => {
            setAuthModalMode(null);
            onSuccess(user);
          }}
        />
      )}
    </div>
  );
};

export default MarketplaceAuthGatekeeper;
