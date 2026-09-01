import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Mail,
  Phone,
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { adminApi } from '../../services/apiService';

interface SuperAdminSecurityTabProps {
  currentUserEmail?: string;
  onShowToast: (msg: string) => void;
  onUpdateEmailSuccess?: (newEmail: string) => void;
}

export const SuperAdminSecurityTab: React.FC<SuperAdminSecurityTabProps> = ({
  currentUserEmail,
  onShowToast,
  onUpdateEmailSuccess,
}) => {
  const [name, setName] = useState('সুপার অ্যাডমিন');
  const [email, setEmail] = useState(currentUserEmail || 'siftibrahim@gmail.com');
  const [phone, setPhone] = useState('01619665875');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterPin, setMasterPin] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await adminApi.getSuperAdminProfile();
      if (profile) {
        if (profile.name) setName(profile.name);
        if (profile.email) setEmail(profile.email);
        if (profile.phone) setPhone(profile.phone);
      }
    } catch (err: any) {
      console.warn('Failed to load super admin profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      onShowToast('অনুগ্রহ করে সঠিক জিমেইল / ইমেইল ঠিকানা প্রদান করুন');
      return;
    }

    if (password && password.length < 6) {
      onShowToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    if (password && password !== confirmPassword) {
      onShowToast('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মেলেনি');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        masterPin: masterPin.trim(),
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await adminApi.updateSuperAdminCredentials(payload);
      onShowToast(res.message || '✅ সুপার অ্যাডমিন জিমেইল ও ক্রেডেনশিয়ালস সফলভাবে আপডেট হয়েছে!');
      setPassword('');
      setConfirmPassword('');
      if (onUpdateEmailSuccess && res.updatedEmail) {
        onUpdateEmailSuccess(res.updatedEmail);
      }
    } catch (err: any) {
      onShowToast(`❌ পরিবর্তন ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
        <span>সুপার অ্যাডমিন প্রোফাইল লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#131E36] to-slate-900 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 p-0.5 shadow-lg flex items-center justify-center text-slate-950 shrink-0 font-black text-xl">
            👑
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>সুপার অ্যাডমিন সিকিউরিটি ও জিমেইল সেটিংস</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black border border-amber-500/40">
                Master Credentials
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              সুপার অ্যাডমিন ইমেইল (Gmail), লগইন পাসওয়ার্ড ও মাস্টার পিন পরিবর্তন করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>রোল: Super Admin</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl bg-[#0D1424] border border-slate-800 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Admin Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>সুপার অ্যাডমিনের নাম</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="সুপার অ্যাডমিন"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Admin Email / Gmail */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>অ্যাডমিন জিমেইল / ইমেইল (লগইন ইউজারনেম) *</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siftibrahim@gmail.com"
              required
              className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs text-indigo-200 font-bold focus:outline-none focus:border-indigo-400"
            />
            <p className="text-[10px] text-slate-400">
              এই জিমেইলটি দিয়েই আপনি অ্যাডমিন প্যানেলে লগইন করবেন।
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              <span>ফোন নম্বর</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01619665875"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Master PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>মাস্টার পিন (Emergency PIN)</span>
            </label>
            <input
              type="text"
              value={masterPin}
              onChange={(e) => setMasterPin(e.target.value)}
              placeholder="1234"
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono font-black focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400">
              জরুরি পিন দিয়ে যেকোনো সময় অ্যাডমিন প্যানেলে সরাসরি প্রবেশ করতে পারবেন।
            </p>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>নতুন মাস্টার পাসওয়ার্ড (ঐচ্ছিক)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {showPassword ? 'লুকান' : 'দেখান'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড পরিবর্তন না করতে চাইলে খালি রাখুন"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>পাসওয়ার্ড নিশ্চিত করুন</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>সুপার অ্যাডমিন তথ্য আপডেট করুন</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
