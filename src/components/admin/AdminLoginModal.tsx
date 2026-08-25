import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  UserCheck,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { ADMIN_EMAIL, authenticateStaff } from '../../services/adminService';
import { AdminSession } from '../../types/adminTypes';
import { authApi } from '../../services/apiService';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginAttempts,
} from '../../services/securityService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminAuthenticated: (session?: AdminSession) => void;
  onShowToast: (msg: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onAdminAuthenticated,
  onShowToast,
}) => {
  const [adminType, setAdminType] = useState<'super' | 'staff'>('super');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'pin' | 'password'>('password');

  // Staff state
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSuperAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const superAdminIdentifier = 'super_admin_pin_auth';
    const rateLimit = checkLoginRateLimit(superAdminIdentifier);
    if (rateLimit.isLocked) {
      setErrorMsg(`⚠️ অতিরিক্ত ভুল চেষ্টার কারণে পিন লগইন লক করা হয়েছে। দয়া করে ${rateLimit.remainingMinutes} মিনিট পর চেষ্টা করুন।`);
      return;
    }

    setLoading(true);
    try {
      const cleanPin = pin.trim();
      const res = await authApi.adminLogin({ pin: cleanPin, authType: 'pin' });
      clearLoginAttempts(superAdminIdentifier);
      onShowToast(res.message || '✅ সুপার অ্যাডমিন ভেরিফিকেশন সফল!');
      onAdminAuthenticated({ role: 'super_admin', email: ADMIN_EMAIL });
      onClose();
    } catch (err: any) {
      const attempt = recordFailedLoginAttempt(superAdminIdentifier);
      if (attempt.isLockedNow) {
        setErrorMsg('❌ ৫ বার ভুল পিন দেওয়ায় সিকিউরিটির জন্য ১৫ মিনিটের লক সক্রিয় করা হয়েছে!');
      } else {
        setErrorMsg(`ভুল অ্যাডমিন পিন কোড! সঠিক সিক্রেট পিন দিন। (বাকি সুযোগ: ${attempt.attemptsLeft} বার)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuperAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetEmail = email.trim().toLowerCase() || ADMIN_EMAIL;
    const rateLimit = checkLoginRateLimit(targetEmail);
    if (rateLimit.isLocked) {
      setErrorMsg(`⚠️ অতিরিক্ত ভুল চেষ্টার কারণে একাউন্টটি লক করা হয়েছে। দয়া করে ${rateLimit.remainingMinutes} মিনিট পর চেষ্টা করুন।`);
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.adminLogin({
        email: targetEmail,
        password,
        authType: 'password',
      });
      clearLoginAttempts(targetEmail);
      onShowToast(res.message || '✅ সুপার অ্যাডমিন কনসোলে সফলভাবে প্রবেশ করেছেন!');
      onAdminAuthenticated({ role: 'super_admin', email: targetEmail });
      onClose();
    } catch (err: any) {
      console.warn('Admin sign-in error:', err);
      const attempt = recordFailedLoginAttempt(targetEmail);
      if (attempt.isLockedNow) {
        setErrorMsg('❌ ৫ বার ভুল পাসওয়ার্ড দেওয়ায় সিকিউরিটির জন্য একাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে!');
      } else {
        setErrorMsg(`ইমেইল বা পাসওয়ার্ড সঠিক নয়। (বাকি সুযোগ: ${attempt.attemptsLeft} বার)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanIdentifier = staffIdentifier.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanIdentifier || !cleanPass) {
      setErrorMsg('স্টাফ ইমেইল/ফোন ও পাসওয়ার্ড দিন');
      return;
    }

    setLoading(true);
    try {
      const res = await authenticateStaff(cleanIdentifier, cleanPass);
      if (!res.success || !res.staff) {
        setErrorMsg(res.error || 'স্টাফ লগইন ব্যর্থ হয়েছে');
        setLoading(false);
        return;
      }

      onShowToast(`✅ স্বাগতম ${res.staff.name}! স্টাফ প্যানেলে প্রবেশ করছেন...`);
      onAdminAuthenticated({
        role: 'staff',
        email: res.staff.email,
        staffData: res.staff,
      });
      onClose();
    } catch (err: any) {
      console.error('Staff login modal error:', err);
      setErrorMsg('স্টাফ লগইনে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#004D40] border border-teal-200 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                অ্যাডমিন ও স্টাফ ভেরিফিকেশন
              </h3>
              <p className="text-[11px] text-slate-500">
                শুধুমাত্র সিস্টেম মালিক ও অনুমোদিত স্টাফদের জন্য
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Type Sub-Tabs (Super Admin vs Staff) */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setAdminType('super');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              adminType === 'super'
                ? 'bg-[#004D40] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>👑 সুপার অ্যাডমিন</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAdminType('staff');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              adminType === 'staff'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>👤 স্টাফ লগইন</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SUPER ADMIN FORM */}
        {adminType === 'super' && (
          <div className="space-y-3 pt-1">
            {/* PIN vs Password Selector */}
            <div className="flex justify-center gap-3 text-xs font-bold text-slate-500 pb-1">
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`cursor-pointer ${mode === 'password' ? 'text-teal-800 underline' : 'hover:text-slate-800'}`}
              >
                ইমেইল ও পাসওয়ার্ড
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setMode('pin')}
                className={`cursor-pointer ${mode === 'pin' ? 'text-teal-800 underline' : 'hover:text-slate-800'}`}
              >
                মাস্টার পিন
              </button>
            </div>

            {mode === 'password' ? (
              <form onSubmit={handleSuperAdminPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সুপার অ্যাডমিন ইমেইল <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@twing.com বা রেজিস্টার্ড ইমেইল"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অ্যাডমিন পাসওয়ার্ড <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="পাসওয়ার্ড লিখুন"
                      className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>যাচাই হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <span>সুপার অ্যাডমিন প্যানেলে প্রবেশ</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSuperAdminPinSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    মাস্টার পিন কোড দিন <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      autoFocus
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="PIN লিখুন (যেমন: 7860)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-base tracking-widest font-mono font-black focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    ডিফল্ট মাস্টার অ্যাডমিন পিন: 7860
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
                >
                  <span>পিন যাচাই ও প্রবেশ</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* STAFF FORM */}
        {adminType === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="space-y-3 pt-1">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-bold">
              👤 স্টাফ অ্যাকাউন্ট দিয়ে লগইন করলে শুধুমাত্র আপনার অনুমোদিত ফিচারসমূহ প্রদর্শিত হবে।
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                স্টাফ ইমেইল বা ফোন নম্বর <span className="text-blue-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={staffIdentifier}
                  onChange={(e) => setStaffIdentifier(e.target.value)}
                  placeholder="staff@twing.com বা 017XXXXXXXX"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                স্টাফ পাসওয়ার্ড <span className="text-blue-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showStaffPassword ? 'text' : 'password'}
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="স্টাফ পাসওয়ার্ড লিখুন"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowStaffPassword(!showStaffPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>স্টাফ প্যানেলে প্রবেশ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

