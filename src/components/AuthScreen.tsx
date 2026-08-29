import React, { useState, useEffect } from 'react';
import { StoreProfile } from '../types';
import { StaffMember, AdminSession } from '../types/adminTypes';
import {
  Store,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Key,
  UserPlus,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  Shield,
  UserCheck,
  KeyRound,
  Smartphone,
  RefreshCw,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import { ADMIN_EMAIL } from '../services/adminService';
import { authApi } from '../services/apiService';
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginAttempts,
} from '../services/securityService';

interface AuthScreenProps {
  store: StoreProfile;
  onLoginSuccess: (email: string, role: string) => void;
  onAdminLoginSuccess?: (email: string, session?: AdminSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  store,
  onLoginSuccess,
  onAdminLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'shop-login' | 'shop-register' | 'admin' | 'reset'>('shop-login');
  const [adminSubTab, setAdminSubTab] = useState<'super' | 'staff'>('super');
  
  // Shop login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shop registration state
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Super Admin login state
  const [adminPin, setAdminPin] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminAuthType, setAdminAuthType] = useState<'password' | 'pin'>('password');

  // Super Admin 2FA State
  const [showAdmin2FA, setShowAdmin2FA] = useState(false);
  const [admin2FASessionToken, setAdmin2FASessionToken] = useState('');
  const [admin2FAMaskedPhone, setAdmin2FAMaskedPhone] = useState('');
  const [admin2FAOtp, setAdmin2FAOtp] = useState('');
  const [admin2FACountdown, setAdmin2FACountdown] = useState(0);

  // Staff login state
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // OTP Password Reset State (User & Super Admin)
  const [resetStep, setResetStep] = useState<'phone' | 'otp' | 'new_password' | 'success'>('phone');
  const [resetTarget, setResetTarget] = useState('');
  const [resetMaskedPhone, setResetMaskedPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);
  const [showResetConfirmPass, setShowResetConfirmPass] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [isResetForAdmin, setIsResetForAdmin] = useState(false);

  // Status & feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = setInterval(() => {
      setResetCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCountdown]);

  // Admin 2FA Countdown timer
  useEffect(() => {
    if (admin2FACountdown <= 0) return;
    const timer = setInterval(() => {
      setAdmin2FACountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [admin2FACountdown]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  // 1. Regular Shop Login Handler
  const handleShopLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('অনুগ্রহ করে ইমেইল এড্রেস প্রদান করুন');
      return;
    }
    if (!password) {
      setErrorMsg('অনুগ্রহ করে পাসওয়ার্ড প্রদান করুন');
      return;
    }

    const rateLimit = checkLoginRateLimit(cleanEmail);
    if (rateLimit.isLocked) {
      setErrorMsg(`⚠️ অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্টটি সাময়িক লক করা হয়েছে। দয়া করে ${rateLimit.remainingMinutes} মিনিট পর চেষ্টা করুন।`);
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(cleanEmail, password);
      clearLoginAttempts(cleanEmail);
      setSuccessMsg('✅ দোকানে সফলভাবে প্রবেশ করা হয়েছে!');
      setTimeout(() => {
        onLoginSuccess(res.user?.email || cleanEmail, `দোকানদার`);
      }, 400);
    } catch (err: any) {
      console.error('Shop Auth Error:', err);

      const attempt = recordFailedLoginAttempt(cleanEmail);
      if (attempt.isLockedNow) {
        setErrorMsg('❌ ৫ বার ভুল চেষ্টা করায় অ্যাকাউন্টটি ১৫ মিনিটের জন্য লক করা হয়েছে!');
      } else {
        setErrorMsg(`❌ ${err.message || 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়!'} (বাকি সুযোগ: ${attempt.attemptsLeft} বার)`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. New Shop Registration Handler
  const handleShopRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = regEmail.trim();
    if (!regShopName.trim()) {
      setErrorMsg('দোকানের নাম লিখুন');
      return;
    }
    if (!cleanEmail) {
      setErrorMsg('ইমেইল এড্রেস লিখুন');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        name: regOwnerName.trim() || regShopName.trim(),
        shopName: regShopName.trim(),
        phone: regPhone.trim() || '০১৭০০০০০০০০',
        email: cleanEmail,
        password: regPassword,
      });

      setSuccessMsg(res.message || '🎉 আপনার নতুন দোকান সফলভাবে খোলা হয়েছে! স্বাগতম...');
      setTimeout(() => {
        onLoginSuccess(cleanEmail, regOwnerName.trim() || 'মালিক');
      }, 500);
    } catch (err: any) {
      console.error('Registration Error:', err);
      setErrorMsg(err.message || 'দোকান তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  // 3. Super Admin Login Handler
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    setLoading(true);
    try {
      if (adminAuthType === 'pin') {
        const cleanPin = adminPin.trim();
        const res = await authApi.adminLogin({ pin: cleanPin, authType: 'pin' });
        if (res.requires2FA) {
          setShowAdmin2FA(true);
          setAdmin2FASessionToken(res.twoFaSessionToken || '');
          setAdmin2FAMaskedPhone(res.maskedPhone || '013****8115');
          setAdmin2FACountdown(60);
          setSuccessMsg('🔐 সুপার অ্যাডমিনের নিবন্ধিত নম্বরে ২FA ওটিপি কোড পাঠানো হয়েছে!');
          return;
        }
        setErrorMsg('সুপার অ্যাডমিন সিকিউরিটির জন্য ২FA ওটিপি যাচাই প্রয়োজন।');
      } else {
        const cleanAdminEmail = adminEmail.trim() || ADMIN_EMAIL;
        const res = await authApi.adminLogin({
          email: cleanAdminEmail,
          password: adminPassword,
          authType: 'password',
        });
        if (res.requires2FA) {
          setShowAdmin2FA(true);
          setAdmin2FASessionToken(res.twoFaSessionToken || '');
          setAdmin2FAMaskedPhone(res.maskedPhone || '013****8115');
          setAdmin2FACountdown(60);
          setSuccessMsg('🔐 সুপার অ্যাডমিনের নিবন্ধিত নম্বরে ২FA ওটিপি কোড পাঠানো হয়েছে!');
          return;
        }
        setErrorMsg('সুপার অ্যাডমিন সিকিউরিটির জন্য ২FA ওটিপি যাচাই প্রয়োজন।');
      }
    } catch (err: any) {
      console.warn('Super admin sign-in error:', err);
      setErrorMsg(err.message || '❌ সুপার অ্যাডমিন যাচাই ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdmin2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = admin2FAOtp.trim();
    if (!cleanOtp) {
      setErrorMsg('অনুগ্রহ করে মোবাইলে প্রাপ্ত ৬-সংখ্যার OTP কোড লিখুন');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyAdmin2FA({
        otp: cleanOtp,
        twoFaSessionToken: admin2FASessionToken,
      });

      if (!res.token) {
        setErrorMsg('❌ 2FA যাচাইকরণ ব্যর্থ হয়েছে। সঠিক ওটিপি দিন।');
        setLoading(false);
        return;
      }

      setSuccessMsg('✅ ২FA যাচাইকরণ সফল! সুপার অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করছেন...');
      setTimeout(() => {
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(res.user?.email || ADMIN_EMAIL, {
            role: 'super_admin',
            email: res.user?.email || ADMIN_EMAIL,
          });
        } else {
          onLoginSuccess(res.user?.email || ADMIN_EMAIL, 'admin');
        }
      }, 400);
    } catch (err: any) {
      console.warn('Verify Admin 2FA Error:', err);
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ 2FA OTP কোড!');
    } finally {
      setLoading(false);
    }
  };

  const handleResendAdmin2FAOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (adminAuthType === 'pin') {
        const cleanPin = adminPin.trim();
        const res = await authApi.adminLogin({ pin: cleanPin, authType: 'pin' });
        setAdmin2FASessionToken(res.twoFaSessionToken || '');
        setAdmin2FACountdown(60);
        setSuccessMsg('✅ নতুন ২FA ওটিপি কোড পাঠানো হয়েছে!');
      } else {
        const cleanAdminEmail = adminEmail.trim() || ADMIN_EMAIL;
        const res = await authApi.adminLogin({
          email: cleanAdminEmail,
          password: adminPassword,
          authType: 'password',
        });
        setAdmin2FASessionToken(res.twoFaSessionToken || '');
        setAdmin2FACountdown(60);
        setSuccessMsg('✅ নতুন ২FA ওটিপি কোড পাঠানো হয়েছে!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ওটিপি পুনরায় পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // 4. Staff Login Handler
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanIdentifier = staffIdentifier.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanIdentifier) {
      setErrorMsg('অনুগ্রহ করে স্টাফ ইমেইল বা ফোন নম্বর দিন');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('অনুগ্রহ করে স্টাফ পাসওয়ার্ড দিন');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.staffLogin(cleanIdentifier, cleanPass);
      if (!res.staff) {
        setErrorMsg('❌ স্টাফ ভেরিফিকেশন ব্যর্থ হয়েছে');
        setLoading(false);
        return;
      }

      setSuccessMsg(`✅ স্বাগতম ${res.staff.name}! আপনার স্টাফ ড্যাশবোর্ড লোড হচ্ছে...`);
      setTimeout(() => {
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(res.staff.email, {
            role: 'staff',
            email: res.staff.email,
            staffData: res.staff,
          });
        } else {
          onLoginSuccess(res.staff.email, 'staff');
        }
      }, 400);
    } catch (err: any) {
      console.error('Staff login error:', err);
      setErrorMsg(err.message || '❌ স্টাফ লগইনে ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  // 5. Mobile SMS OTP Password Reset Handlers (User & Super Admin)
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const target = resetTarget.trim();
    if (!target) {
      setErrorMsg('অনুগ্রহ করে আপনার রেজিস্টার্ড মোবাইল নম্বর লিখুন');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendResetOtp({ phone: target, identifier: target });
      setResetMaskedPhone(res.maskedPhone || target);
      setIsResetForAdmin(!!res.isSuperAdmin);
      setSuccessMsg(res.message || '✅ আপনার মোবাইলে ৬-সংখ্যার OTP কোড পাঠানো হয়েছে!');
      setResetStep('otp');
      setResetCountdown(60);
    } catch (err: any) {
      console.error('Send OTP Error:', err);
      setErrorMsg(err.message || 'OTP পাঠাতে ব্যর্থ হয়েছে। সঠিক মোবাইল নম্বর দিন।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanOtp = resetOtp.trim();
    if (!cleanOtp) {
      setErrorMsg('অনুগ্রহ করে ৬-সংখ্যার OTP কোড লিখুন');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyResetOtp(resetTarget, cleanOtp);
      setSuccessMsg(res.message || '✅ OTP সফলভাবে যাচাই হয়েছে!');
      setResetStep('new_password');
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ OTP কোড!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (resetNewPass.length < 6) {
      setErrorMsg('নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setErrorMsg('উভয় পাসওয়ার্ড হুবহু একই হতে হবে!');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPasswordWithOtp({
        phone: resetTarget,
        otp: resetOtp,
        newPassword: resetNewPass,
      });
      setSuccessMsg(res.message || '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!');
      setResetStep('success');
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      setErrorMsg(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    handleSendResetOtp(e);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-3 sm:p-6 bg-[#030712] min-h-[600px] w-full text-slate-100 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Main Card Container */}
        <div className="bg-[#0B132B]/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80 backdrop-blur-md">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-900/30 mb-3 border-2 border-emerald-300/30">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              TWING হিসাবি
            </h1>
            <p className="text-xs sm:text-sm text-emerald-300/90 mt-1 font-semibold">
              সহজ, নিরাপদ ও ক্লাউড ব্যাকআপযুক্ত ডিজিটাল বাকির খাতা
            </p>
          </div>

          {/* 3 Main Segmented Tabs */}
          {activeTab !== 'reset' && (
            <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('shop-login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-center ${
                  activeTab === 'shop-login'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                দোকান লগইন
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('shop-register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-center ${
                  activeTab === 'shop-register'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                নতুন দোকান (ফ্রি)
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1 ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>অ্যাডমিন</span>
              </button>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-4 text-xs bg-rose-950/60 text-rose-300 p-3.5 rounded-2xl border border-rose-800/80 font-bold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Success Message Box */}
          {successMsg && (
            <div className="mb-4 text-xs bg-emerald-950/60 text-emerald-300 p-3.5 rounded-2xl border border-emerald-800/80 font-bold flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* ----------------- TAB 1: SHOP LOGIN ----------------- */}
          {activeTab === 'shop-login' && (
            <form onSubmit={handleShopLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ইমেইল এড্রেস (Email) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onFocus={handleInputFocus}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shop@example.com"
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-white placeholder-slate-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    পাসওয়ার্ড (Password) <span className="text-emerald-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onFocus={handleInputFocus}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 pr-11 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-white placeholder-slate-500 tracking-wider transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>দোকানে প্রবেশ করুন</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ----------------- TAB 2: SHOP REGISTRATION ----------------- */}
          {activeTab === 'shop-register' && (
            <form onSubmit={handleShopRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  দোকানের নাম <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={regShopName}
                    onFocus={handleInputFocus}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="যেমন: ভাই ভাই স্টোর"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    প্রোপ্রাইটরের নাম
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={regOwnerName}
                      onFocus={handleInputFocus}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="আপনার নাম"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onFocus={handleInputFocus}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="০১XXXXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ইমেইল এড্রেস <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onFocus={handleInputFocus}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="myemail@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  গোপন পাসওয়ার্ড <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onFocus={handleInputFocus}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="ন্যূনতম ৬ অক্ষরের পাসওয়ার্ড"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>দোকান তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-slate-950" />
                    <span>বিনামূল্যে দোকান তৈরি করুন</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ----------------- TAB 3: INDEPENDENT ADMIN & STAFF PORTAL LOGIN ----------------- */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {/* Admin Sub-Tabs (Super Admin vs Staff Login) */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setAdminSubTab('super');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    adminSubTab === 'super'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>👑 সুপার অ্যাডমিন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminSubTab('staff');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    adminSubTab === 'staff'
                      ? 'bg-blue-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>👤 স্টাফ লগইন</span>
                </button>
              </div>

              {/* SUPER ADMIN SUB-TAB */}
              {adminSubTab === 'super' && (
                <div className="space-y-3.5 animate-in fade-in">
                  {showAdmin2FA ? (
                    <div className="space-y-3.5 animate-in fade-in">
                      {/* 2FA Banner */}
                      <div className="p-3.5 bg-amber-950/50 border border-amber-500/50 rounded-2xl flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm mt-0.5">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <span>🔐 ২-ধাপের নিরাপত্তা যাচাই (2FA OTP)</span>
                          </h4>
                          <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                            সুপার অ্যাডমিনের নিবন্ধিত নম্বরে (<span className="font-mono font-bold text-white">{admin2FAMaskedPhone || '013****8115'}</span>) পাঠানো ৬-সংখ্যার OTP কোডটি লিখুন।
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleVerifyAdmin2FASubmit} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                            ৬-সংখ্যার OTP কোড দিন <span className="text-amber-400">*</span>
                          </label>
                          <div className="relative">
                            <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                            <input
                              type="text"
                              required
                              maxLength={6}
                              autoFocus
                              value={admin2FAOtp}
                              onFocus={handleInputFocus}
                              onChange={(e) => setAdmin2FAOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••••"
                              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-amber-500/60 rounded-2xl text-center text-xl tracking-[0.4em] font-mono font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 text-center mt-1">
                            কোডের মেয়াদ: ৫ মিনিট
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdmin2FA(false);
                              setAdmin2FAOtp('');
                              setErrorMsg('');
                            }}
                            className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>আগের ধাপে ফিরুন</span>
                          </button>

                          {admin2FACountdown > 0 ? (
                            <span className="text-slate-400 text-[11px] font-mono">
                              পুনরায় কোড: {admin2FACountdown} সেকেন্ড
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendAdmin2FAOtp}
                              className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>পুনরায় OTP পাঠান</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading || admin2FAOtp.length < 6}
                          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                              <span>OTP যাচাই করা হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-slate-950" />
                              <span>OTP যাচাই করে ড্যাশবোর্ডে প্রবেশ</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <>
                      {/* Banner */}
                      <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-300">
                            👑 সুপার অ্যাডমিন এক্সেস
                          </h4>
                          <p className="text-[11px] text-amber-200/80">
                            সম্পূর্ণ সিস্টেম, স্টাফ ও ইউজার কন্ট্রোল।
                          </p>
                        </div>
                      </div>

                      {/* Super admin form */}
                      <form onSubmit={handleSuperAdminLogin} className="space-y-3">
                        {adminAuthType === 'password' ? (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                সুপার অ্যাডমিন ইমেইল <span className="text-amber-400">*</span>
                              </label>
                              <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                  type="email"
                                  required
                                  value={adminEmail}
                                  onFocus={handleInputFocus}
                                  onChange={(e) => setAdminEmail(e.target.value)}
                                  placeholder="admin@twing.com"
                                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-1">
                                অ্যাডমিন পাসওয়ার্ড <span className="text-amber-400">*</span>
                              </label>
                              <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                  type={showAdminPassword ? 'text' : 'password'}
                                  required
                                  value={adminPassword}
                                  onFocus={handleInputFocus}
                                  onChange={(e) => setAdminPassword(e.target.value)}
                                  placeholder="পাসওয়ার্ড লিখুন"
                                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                                >
                                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">
                              অ্যাডমিন সিক্রেট পিন <span className="text-amber-400">*</span>
                            </label>
                            <div className="relative">
                              <Key className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                              <input
                                type="password"
                                required
                                autoFocus
                                maxLength={6}
                                value={adminPin}
                                onChange={(e) => setAdminPin(e.target.value)}
                                placeholder="PIN দিন"
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-amber-600/40 rounded-2xl text-center text-lg tracking-widest font-mono font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* Switch between PIN & Password & OTP Reset */}
                        <div className="flex flex-col gap-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminAuthType(adminAuthType === 'password' ? 'pin' : 'password');
                                setErrorMsg('');
                              }}
                              className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>{adminAuthType === 'password' ? 'মাস্টার পিন দিয়ে লগইন' : 'ইমেইল ও পাসওয়ার্ড দিয়ে লগইন'}</span>
                            </button>
                          </div>

                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget('01306908115');
                                setIsResetForAdmin(true);
                                setResetStep('phone');
                                setActiveTab('reset');
                                setErrorMsg('');
                                setSuccessMsg('');
                              }}
                              className="text-[11px] text-amber-400 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>সুপার অ্যাডমিন পাসওয়ার্ড রিসেট (মোবাইল OTP)</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-1"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                              <span>যাচাই হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4 text-slate-950" />
                              <span>🔑 পাসওয়ার্ড দিয়ে ২FA OTP পাঠান</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {/* STAFF SUB-TAB */}
              {adminSubTab === 'staff' && (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* Banner */}
                  <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-blue-300">
                        👤 স্টাফ এক্সেস
                      </h4>
                      <p className="text-[11px] text-blue-200/80">
                        অনুমোদিত পারমিশন অনুযায়ী কন্ট্রোল ও ম্যানেজমেন্ট।
                      </p>
                    </div>
                  </div>

                  {/* Staff login form */}
                  <form onSubmit={handleStaffLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        স্টাফ ইমেইল বা ফোন নম্বর <span className="text-blue-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={staffIdentifier}
                          onFocus={handleInputFocus}
                          onChange={(e) => setStaffIdentifier(e.target.value)}
                          placeholder="staff@twing.com বা 017XXXXXXXX"
                          className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        স্টাফ পাসওয়ার্ড <span className="text-blue-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          type={showStaffPassword ? 'text' : 'password'}
                          required
                          value={staffPassword}
                          onFocus={handleInputFocus}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder="স্টাফ পাসওয়ার্ড লিখুন"
                          className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-900/90 border border-slate-750 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStaffPassword(!showStaffPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-blue-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>যাচাই হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 text-slate-950" />
                          <span>👤 স্টাফ প্যানেলে প্রবেশ</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ----------------- TAB 4: MOBILE SMS OTP PASSWORD RESET ----------------- */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center pb-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-2 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-base sm:text-lg">
                  মোবাইল SMS ওটিপি দিয়ে পাসওয়ার্ড রিসেট
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                  সুপার অ্যাডমিন ও সাধারণ ইউজার উভয়ই তাদের রেজিস্টার্ড নম্বরে SMS OTP কোড পাবেন
                </p>
              </div>

              {/* Progress Steps Pill */}
              <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-[11px] font-bold">
                <div className={`flex-1 text-center py-1 rounded-lg transition ${resetStep === 'phone' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'}`}>
                  ১. মোবাইল নম্বর
                </div>
                <div className={`flex-1 text-center py-1 rounded-lg transition ${resetStep === 'otp' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'}`}>
                  ২. OTP কোড
                </div>
                <div className={`flex-1 text-center py-1 rounded-lg transition ${resetStep === 'new_password' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'}`}>
                  ৩. নতুন পাসওয়ার্ড
                </div>
              </div>

              {/* STEP 1: PHONE / IDENTIFIER INPUT */}
              {resetStep === 'phone' && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      আপনার নিবন্ধিত (Registered) মোবাইল নম্বর <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        value={resetTarget}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetTarget(e.target.value)}
                        placeholder="অ্যাকাউন্ট খোলার সময় দেওয়া ১১ ডিজিটের মোবাইল নম্বর"
                        className="w-full pl-10 pr-4 py-3.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-700 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500 tracking-wide font-medium"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      💡 আপনি যে মোবাইল নম্বর দিয়ে অ্যাকাউন্ট খুলেছেন শুধুমাত্র সেই নম্বরেই ৬-সংখ্যার OTP মেসেজ পাঠানো হবে।
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>SMS ওটিপি পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 text-slate-950" />
                        <span>📩 মোবাইলে OTP কোড পাঠান</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP VERIFICATION */}
              {resetStep === 'otp' && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-3.5">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">মোবাইল SMS প্রেরিত:</span>
                      <span className="font-mono text-white font-bold">{resetMaskedPhone || resetTarget}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      মোবাইলের ইনবক্স চেক করে ৬-সংখ্যার OTP কোডটি নিচে লিখুন (মেয়াদ: ৫ মিনিট)।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                      ৬-সংখ্যার OTP কোড দিন <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={resetOtp}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-emerald-500/50 rounded-2xl text-center text-xl tracking-[0.4em] font-mono font-black text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setResetStep('phone')}
                      className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>নম্বর পরিবর্তন</span>
                    </button>

                    {resetCountdown > 0 ? (
                      <span className="text-slate-400 text-[11px] font-mono">
                        পুনরায় কোড: {resetCountdown} সেকেন্ড
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendResetOtp()}
                        className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>পুনরায় OTP পাঠান</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || resetOtp.length < 6}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>OTP যাচাই করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>OTP যাচাই করে সামনে বাড়ুন</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: SET NEW PASSWORD */}
              {resetStep === 'new_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-xs text-slate-300">
                    <p className="font-bold text-emerald-400">✅ OTP সফলভাবে যাচাই হয়েছে!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      এবার আপনার অ্যাকাউন্টের জন্য নতুন একটি শক্তিশালী পাসওয়ার্ড নির্ধারণ করুন।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      নতুন পাসওয়ার্ড (New Password) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetNewPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoFocus
                        value={resetNewPass}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                        className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPass(!showResetNewPass)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showResetNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetConfirmPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={resetConfirmPass}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                        className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPass(!showResetConfirmPass)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showResetConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || resetNewPass.length < 6 || resetNewPass !== resetConfirmPass}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>পাসওয়ার্ড আপডেট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-950" />
                        <span>🔒 নতুন পাসওয়ার্ড সেভ করুন</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 4: SUCCESS VIEW */}
              {resetStep === 'success' && (
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      আপনার নতুন পাসওয়ার্ডটি এখন সক্রিয় রয়েছে। অনুগ্রহ করে নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isResetForAdmin) {
                        setActiveTab('admin');
                        setAdminSubTab('super');
                        setAdminEmail(resetTarget || '');
                        setAdminPassword(resetNewPass);
                      } else {
                        setActiveTab('shop-login');
                        setPassword(resetNewPass);
                      }
                      setResetStep('phone');
                      setResetOtp('');
                      setResetNewPass('');
                      setResetConfirmPass('');
                      setErrorMsg('');
                      setSuccessMsg('✅ নতুন পাসওয়ার্ড স্বয়ংক্রিয়ভাবে ইনপুটে বসানো হয়েছে। লগইন বাটনে ক্লিক করুন।');
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black rounded-2xl shadow-lg text-sm cursor-pointer"
                  >
                    লগইন পেজে যান
                  </button>
                </div>
              )}

              {/* Back to Login Links */}
              {resetStep !== 'success' && (
                <div className="text-center pt-2 flex items-center justify-center gap-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('shop-login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>দোকান লগইনে ফিরে যান</span>
                  </button>

                  <span className="text-slate-600">|</span>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      setAdminSubTab('super');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    অ্যাডমিন লগইন
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
