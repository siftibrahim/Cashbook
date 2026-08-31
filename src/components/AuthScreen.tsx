import React, { useState, useEffect } from 'react';
import { StoreProfile } from '../types';
import { AdminSession } from '../types/adminTypes';
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
  User,
  Phone,
  CheckCircle2,
  UserCheck,
  KeyRound,
  Smartphone,
  RefreshCw,
  ArrowLeft,
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
  // Tabs: 'login' (Unified for User, Super Admin, Staff), 'register', 'reset'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'reset'>('login');

  // Unified Login state (User, Super Admin, Staff)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA OTP State (for Super Admin & Staff)
  const [show2FA, setShow2FA] = useState(false);
  const [twoFaRole, setTwoFaRole] = useState<'super_admin' | 'staff'>('super_admin');
  const [twoFaStaffId, setTwoFaStaffId] = useState('');
  const [twoFaStaffName, setTwoFaStaffName] = useState('');
  const [twoFaPhone, setTwoFaPhone] = useState('');
  const [twoFaMaskedPhone, setTwoFaMaskedPhone] = useState('');
  const [twoFaSessionToken, setTwoFaSessionToken] = useState('');
  const [twoFaOtp, setTwoFaOtp] = useState('');
  const [twoFaCountdown, setTwoFaCountdown] = useState(0);

  // Shop registration state (11-digit Phone, PIN, Shop Name, Owner Name & SMS OTP)
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [regOtp, setRegOtp] = useState('');
  const [regSessionToken, setRegSessionToken] = useState('');
  const [regMaskedPhone, setRegMaskedPhone] = useState('');
  const [regCountdown, setRegCountdown] = useState(0);

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

  // Registration OTP Countdown timer
  useEffect(() => {
    if (regCountdown <= 0) return;
    const timer = setInterval(() => {
      setRegCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [regCountdown]);

  // OTP Countdown timer for Password Reset
  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = setInterval(() => {
      setResetCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCountdown]);

  // 2FA Countdown timer for Admin/Staff
  useEffect(() => {
    if (twoFaCountdown <= 0) return;
    const timer = setInterval(() => {
      setTwoFaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [twoFaCountdown]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  // -------------------------------------------------------------
  // 1. UNIFIED LOGIN HANDLER (User, Super Admin, Staff)
  // -------------------------------------------------------------
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMsg('অনুগ্রহ করে মোবাইল নম্বর, ইমেইল বা ইউজারনেম দিন');
      return;
    }
    if (!password) {
      setErrorMsg('অনুগ্রহ করে গোপন পাসওয়ার্ড অথবা পিন লিখুন');
      return;
    }

    const rateLimit = checkLoginRateLimit(cleanIdentifier.toLowerCase());
    if (rateLimit.isLocked) {
      setErrorMsg(`⚠️ অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্টটি সাময়িক লক করা হয়েছে। দয়া করে ${rateLimit.remainingMinutes} মিনিট পর চেষ্টা করুন।`);
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(cleanIdentifier, password);

      // Check if 2FA OTP is required (Super Admin or Staff)
      if (res.requires2FA) {
        clearLoginAttempts(cleanIdentifier.toLowerCase());
        setShow2FA(true);
        setTwoFaRole(res.role === 'staff' ? 'staff' : 'super_admin');
        setTwoFaStaffId(res.staffId || '');
        setTwoFaStaffName(res.staffName || '');
        setTwoFaPhone(res.phone || '');
        setTwoFaMaskedPhone(res.maskedPhone || '013****8115');
        setTwoFaSessionToken(res.twoFaSessionToken || '');
        setTwoFaCountdown(60);
        setSuccessMsg(res.message || '🔐 আপনার নিবন্ধিত মোবাইল নম্বরে ৬-সংখ্যার ২FA ওটিপি কোড পাঠানো হয়েছে!');
        return;
      }

      // Regular User direct login
      clearLoginAttempts(cleanIdentifier.toLowerCase());
      setSuccessMsg('✅ দোকানে সফলভাবে প্রবেশ করা হয়েছে!');
      setTimeout(() => {
        onLoginSuccess(res.user?.email || cleanIdentifier, 'দোকানদার');
      }, 400);
    } catch (err: any) {
      console.error('Unified Auth Error:', err);

      const attempt = recordFailedLoginAttempt(cleanIdentifier.toLowerCase());
      if (attempt.isLockedNow) {
        setErrorMsg('❌ ৫ বার ভুল চেষ্টা করায় অ্যাকাউন্টটি ১৫ মিনিটের জন্য লক করা হয়েছে!');
      } else {
        setErrorMsg(`❌ ${err.message || 'মোবাইল নম্বর/ইমেইল অথবা পাসওয়ার্ড/পিন সঠিক নয়!'} (বাকি সুযোগ: ${attempt.attemptsLeft} বার)`);
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. 2FA OTP VERIFICATION HANDLER (Super Admin & Staff)
  // -------------------------------------------------------------
  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = twoFaOtp.trim();
    if (!cleanOtp) {
      setErrorMsg('অনুগ্রহ করে মোবাইলে প্রাপ্ত ৬-সংখ্যার OTP কোড লিখুন');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyAdmin2FA({
        otp: cleanOtp,
        twoFaSessionToken,
        role: twoFaRole,
        staffId: twoFaStaffId,
        phone: twoFaPhone,
      });

      if (!res.token) {
        setErrorMsg('❌ 2FA যাচাইকরণ ব্যর্থ হয়েছে। সঠিক ওটিপি দিন।');
        setLoading(false);
        return;
      }

      if (twoFaRole === 'staff' || res.role === 'staff') {
        const staffEmail = res.staff?.email || identifier || 'staff@twing.com';
        setSuccessMsg(`✅ ২FA যাচাইকরণ সফল! স্বাগতম ${res.staff?.name || twoFaStaffName || 'স্টাফ মেম্বার'}!`);
        setTimeout(() => {
          if (onAdminLoginSuccess) {
            onAdminLoginSuccess(staffEmail, {
              role: 'staff',
              email: staffEmail,
              staffData: res.staff,
            });
          } else {
            onLoginSuccess(staffEmail, 'staff');
          }
        }, 400);
      } else {
        const adminMail = res.user?.email || ADMIN_EMAIL;
        setSuccessMsg('✅ ২FA যাচাইকরণ সফল! সুপার অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করছেন...');
        setTimeout(() => {
          if (onAdminLoginSuccess) {
            onAdminLoginSuccess(adminMail, {
              role: 'super_admin',
              email: adminMail,
            });
          } else {
            onLoginSuccess(adminMail, 'admin');
          }
        }, 400);
      }
    } catch (err: any) {
      console.warn('Verify 2FA Error:', err);
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ 2FA OTP কোড!');
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FAOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const cleanIdentifier = identifier.trim();
      const res = await authApi.login(cleanIdentifier, password);
      if (res.twoFaSessionToken) {
        setTwoFaSessionToken(res.twoFaSessionToken);
      }
      setTwoFaCountdown(60);
      setSuccessMsg('✅ নতুন ২FA ওটিপি কোড পাঠানো হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || 'ওটিপি পুনরায় পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // Helper for Bengali to English digits
  const toEnglishDigits = (str: string) => {
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return str.replace(/[০-৯]/g, (d) => String(bn.indexOf(d)));
  };

  // -------------------------------------------------------------
  // 3. NEW SHOP REGISTRATION HANDLERS (11-digit Mobile, PIN & SMS OTP)
  // -------------------------------------------------------------
  const handleSendRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanShop = regShopName.trim();
    const cleanOwner = regOwnerName.trim();
    const cleanPhone = toEnglishDigits(regPhone.trim()).replace(/\D/g, '');
    const cleanPin = regPin.trim();

    if (!cleanShop) {
      setErrorMsg('অনুগ্রহ করে দোকানের নাম লিখুন');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      setErrorMsg('❌ অনুগ্রহ করে ১১-সংখ্যার সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (!cleanPin || cleanPin.length < 4) {
      setErrorMsg('গোপন পিন ন্যূনতম ৪ সংখ্যার হতে হবে');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.sendRegistrationOtp({
        shopName: cleanShop,
        name: cleanOwner,
        phone: cleanPhone,
      });

      setRegPhone(cleanPhone);
      setRegSessionToken(res.sessionToken || '');
      setRegMaskedPhone(res.maskedPhone || cleanPhone);
      setRegStep('otp');
      setRegOtp('');
      setRegCountdown(60);
      setSuccessMsg(res.message || '✅ আপনার মোবাইলে ৬-সংখ্যার OTP ভেরিফিকেশন কোড পাঠানো হয়েছে!');
    } catch (err: any) {
      console.error('Send Reg OTP Error:', err);
      setErrorMsg(err.message || 'OTP পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে মোবাইল নম্বরটি পরীক্ষা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = toEnglishDigits(regOtp.trim()).replace(/\D/g, '');
    if (!cleanOtp) {
      setErrorMsg('অনুগ্রহ করে মোবাইলে প্রাপ্ত ৬-সংখ্যার OTP কোড লিখুন');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = toEnglishDigits(regPhone.trim()).replace(/\D/g, '');
      const cleanShop = regShopName.trim();
      const cleanOwner = regOwnerName.trim() || cleanShop;
      const cleanPin = regPin.trim();

      const res = await authApi.register({
        shopName: cleanShop,
        name: cleanOwner,
        phone: cleanPhone,
        pin: cleanPin,
        password: cleanPin,
        otp: cleanOtp,
        sessionToken: regSessionToken,
      });

      setSuccessMsg(res.message || '🎉 আপনার নতুন দোকান সফলভাবে খোলা হয়েছে! স্বাগতম...');
      setTimeout(() => {
        onLoginSuccess(res.user?.phone || cleanPhone, cleanOwner || 'দোকানদার');
      }, 500);
    } catch (err: any) {
      console.error('Verify & Register Error:', err);
      setErrorMsg(err.message || 'দোকান তৈরিতে সমস্যা হয়েছে। সঠিক ওটিপি দিন।');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const cleanShop = regShopName.trim();
      const cleanOwner = regOwnerName.trim();
      const cleanPhone = toEnglishDigits(regPhone.trim()).replace(/\D/g, '');

      const res = await authApi.sendRegistrationOtp({
        shopName: cleanShop,
        name: cleanOwner,
        phone: cleanPhone,
      });
      if (res.sessionToken) {
        setRegSessionToken(res.sessionToken);
      }
      setRegCountdown(60);
      setSuccessMsg('✅ নতুন ভেরিফিকেশন ওটিপি কোড পাঠানো হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || 'ওটিপি পুনরায় পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. MOBILE SMS OTP PASSWORD RESET HANDLERS
  // -------------------------------------------------------------
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

    if (resetNewPass.length < 4) {
      setErrorMsg('নতুন পিন ন্যূনতম ৪ সংখ্যার হতে হবে');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setErrorMsg('উভয় পিন হুবহু একই হতে হবে!');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPasswordWithOtp({
        phone: resetTarget,
        otp: resetOtp,
        newPassword: resetNewPass,
      });
      setSuccessMsg(res.message || '🎉 পিন সফলভাবে পরিবর্তিত হয়েছে!');
      setResetStep('success');
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      setErrorMsg(err.message || 'পিন রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full overflow-y-auto smooth-scroll-container flex flex-col justify-start sm:justify-center items-center p-3.5 sm:p-6 py-6 bg-[#030712] text-slate-100 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md my-auto">
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

          {/* 2 Main Segmented Tabs (Unified Login & Registration) */}
          {activeTab !== 'reset' && (
            <div className="flex bg-slate-900/90 p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setShow2FA(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>প্রবেশ / লগইন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setShow2FA(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 sm:py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>নতুন দোকান (ফ্রি)</span>
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

          {/* ----------------- TAB 1: UNIFIED LOGIN & 2FA VERIFICATION ----------------- */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {show2FA ? (
                /* 2FA OTP Screen for Super Admin & Staff */
                <div className="space-y-3.5 animate-in fade-in">
                  <div
                    className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                      twoFaRole === 'super_admin'
                        ? 'bg-amber-950/50 border-amber-500/50'
                        : 'bg-blue-950/50 border-blue-500/50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 shadow-sm mt-0.5 ${
                        twoFaRole === 'super_admin'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-blue-500 text-slate-950'
                      }`}
                    >
                      {twoFaRole === 'super_admin' ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <UserCheck className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-black flex items-center gap-1.5 ${
                          twoFaRole === 'super_admin' ? 'text-amber-300' : 'text-blue-300'
                        }`}
                      >
                        <span>
                          {twoFaRole === 'super_admin'
                            ? '👑 সুপার অ্যাডমিন ২FA ভেরিফিকেশন'
                            : `👤 স্টাফ ২FA ভেরিফিকেশন (${twoFaStaffName || 'স্টাফ মেম্বার'})`}
                        </span>
                      </h4>
                      <p
                        className={`text-[11px] mt-0.5 leading-relaxed ${
                          twoFaRole === 'super_admin' ? 'text-amber-200/90' : 'text-blue-200/90'
                        }`}
                      >
                        প্যানেলে প্রবেশের পূর্বে আপনার নিবন্ধিত নম্বরে (
                        <span className="font-mono font-bold text-white">
                          {twoFaMaskedPhone || '013****8115'}
                        </span>
                        ) পাঠানো ৬-সংখ্যার OTP কোডটি লিখুন।
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleVerify2FASubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                        ৬-সংখ্যার OTP কোড দিন <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound
                          className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                            twoFaRole === 'super_admin' ? 'text-amber-400' : 'text-blue-400'
                          }`}
                        />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          autoFocus
                          value={twoFaOtp}
                          onFocus={handleInputFocus}
                          onChange={(e) => setTwoFaOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-900 border rounded-2xl text-center text-xl tracking-[0.4em] font-mono font-black focus:outline-none focus:ring-2 ${
                            twoFaRole === 'super_admin'
                              ? 'border-amber-500/60 text-amber-300 focus:ring-amber-500'
                              : 'border-blue-500/60 text-blue-300 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShow2FA(false);
                          setTwoFaOtp('');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>আগের ধাপে ফিরুন</span>
                      </button>

                      {twoFaCountdown > 0 ? (
                        <span className="text-slate-400 text-[11px] font-mono">
                          পুনরায় কোড: {twoFaCountdown} সেকেন্ড
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend2FAOtp}
                          className={`hover:underline font-bold flex items-center gap-1 cursor-pointer text-[11px] ${
                            twoFaRole === 'super_admin' ? 'text-amber-400' : 'text-blue-400'
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>পুনরায় OTP পাঠান</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || twoFaOtp.length < 6}
                      className={`w-full py-3.5 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2 ${
                        twoFaRole === 'super_admin'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-amber-950/40'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-950/40'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                          <span>OTP যাচাই করা হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>
                            {twoFaRole === 'super_admin'
                              ? 'OTP যাচাই করে সুপার অ্যাডমিন প্যানেলে প্রবেশ'
                              : 'OTP যাচাই করে স্টাফ প্যানেলে প্রবেশ'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Unified Login Form for User, Super Admin, and Staff */
                <form onSubmit={handleUnifiedLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      ১১ ডিজিটের মোবাইল নম্বর <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onFocus={handleInputFocus}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="যেমন: ০১XXXXXXXXX"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-white placeholder-slate-500 transition tracking-wide"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        গোপন পিন (PIN) <span className="text-emerald-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('reset');
                          setResetTarget(identifier);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                      >
                        পিন ভুলে গেছেন?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onFocus={handleInputFocus}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="গোপন পিন লিখুন"
                        className="w-full pl-10 pr-11 py-3 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-white placeholder-slate-500 tracking-wider transition"
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
                        <span>লগইন করুন / প্রবেশ করুন</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ----------------- TAB 2: SHOP REGISTRATION (11-digit Mobile, PIN & SMS OTP) ----------------- */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              {regStep === 'form' ? (
                <form onSubmit={handleSendRegOtp} className="space-y-3.5">
                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3 text-xs text-slate-300">
                    <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>মোবাইল নম্বর ও পিন দিয়ে সহজ রেজিস্ট্রেশন</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      ইমেইলের প্রয়োজন নেই। শুধুমাত্র ১১ ডিজিটের মোবাইল নম্বর ও গোপন পিন দিয়ে দোকান খুলুন।
                    </p>
                  </div>

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
                        placeholder="যেমন: ভাই ভাই স্টোর / মেসার্স ট্রেডার্স"
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      আপনার নাম (মালিক / প্রোপ্রাইটর)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={regOwnerName}
                        onFocus={handleInputFocus}
                        onChange={(e) => setRegOwnerName(e.target.value)}
                        placeholder="যেমন: মো: রফিকুল ইসলাম"
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ১১ ডিজিটের মোবাইল নম্বর <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        maxLength={15}
                        value={regPhone}
                        onFocus={handleInputFocus}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="০১XXXXXXXXX (১১ ডিজিট)"
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500 font-medium tracking-wide"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 এই নম্বরে তাৎক্ষণিক SMS-এর মাধ্যমে ৬-সংখ্যার ভেরিফিকেশন কোড পাঠানো হবে।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      গোপন পিন (PIN) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showRegPin ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={regPin}
                        onFocus={handleInputFocus}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="৪ থেকে ৬ সংখ্যার গোপন পিন"
                        className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm bg-slate-900/90 border border-slate-750 rounded-2xl focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500 tracking-wider font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPin(!showRegPin)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
                        <span>SMS কোড পাঠানো হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 text-slate-950" />
                        <span>মোবাইলে SMS OTP পাঠান ও এগিয়ে যান</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: SMS OTP Verification for Registration */
                <form onSubmit={handleVerifyRegOtpAndRegister} className="space-y-3.5">
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4" />
                        <span>SMS কোড প্রেরিত নম্বর:</span>
                      </span>
                      <span className="font-mono text-white font-bold text-sm bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-750">
                        {regMaskedPhone || regPhone}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      মোবাইলের SMS ইনবক্স চেক করে ৬-সংখ্যার OTP কোডটি নিচে লিখুন।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                      ৬-সংখ্যার OTP কোড লিখুন <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={regOtp}
                        onFocus={handleInputFocus}
                        onChange={(e) => setRegOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-emerald-500/50 rounded-2xl text-center text-xl tracking-[0.4em] font-mono font-black text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep('form');
                        setRegOtp('');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>তথ্য পরিবর্তন</span>
                    </button>

                    {regCountdown > 0 ? (
                      <span className="text-slate-400 text-[11px] font-mono">
                        পুনরায় কোড: {regCountdown} সেকেন্ড
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendRegOtp}
                        className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>পুনরায় OTP পাঠান</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || regOtp.length < 6}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>দোকান অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>OTP যাচাই করে দোকান চালু করুন</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ----------------- TAB 3: MOBILE SMS OTP PASSWORD RESET ----------------- */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center pb-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-2 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-base sm:text-lg">
                  মোবাইল SMS ওটিপি দিয়ে পিন রিসেট
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                  সুপার অ্যাডমিন, স্টাফ ও সাধারণ ইউজার তাদের রেজিস্টার্ড নম্বরে SMS OTP কোড পাবেন
                </p>
              </div>

              {/* Progress Steps Pill */}
              <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-[11px] font-bold">
                <div
                  className={`flex-1 text-center py-1 rounded-lg transition ${
                    resetStep === 'phone' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  ১. মোবাইল নম্বর
                </div>
                <div
                  className={`flex-1 text-center py-1 rounded-lg transition ${
                    resetStep === 'otp' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400'
                  }`}
                >
                  ২. OTP কোড
                </div>
                <div
                  className={`flex-1 text-center py-1 rounded-lg transition ${
                    resetStep === 'new_password'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'text-slate-400'
                  }`}
                >
                  ৩. নতুন পিন
                </div>
              </div>

              {/* STEP 1: PHONE INPUT */}
              {resetStep === 'phone' && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      আপনার নিবন্ধিত মোবাইল নম্বর বা ইমেইল <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={resetTarget}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetTarget(e.target.value)}
                        placeholder="১১ ডিজিটের মোবাইল নম্বর লিখুন"
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
                      মোবাইলের ইনবক্স চেক করে ৬-সংখ্যার OTP কোডটি নিচে লিখুন (মেয়াদ: ১৫ মিনিট)।
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

              {/* STEP 3: SET NEW PIN */}
              {resetStep === 'new_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-xs text-slate-300">
                    <p className="font-bold text-emerald-400">✅ OTP সফলভাবে যাচাই হয়েছে!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      এবার আপনার অ্যাকাউন্টের জন্য নতুন একটি গোপন পিন নির্ধারণ করুন।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      নতুন গোপন পিন (New PIN) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetNewPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        autoFocus
                        value={resetNewPass}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="৪ বা ৬ সংখ্যার নতুন পিন"
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
                      পিন নিশ্চিত করুন (Confirm PIN) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type={showResetConfirmPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={resetConfirmPass}
                        onFocus={handleInputFocus}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="একই পিন পুনরায় লিখুন"
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
                    disabled={loading || resetNewPass.length < 4 || resetNewPass !== resetConfirmPass}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>পিন আপডেট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-950" />
                        <span>🔒 নতুন পিন সেভ করুন</span>
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
                    <h4 className="text-lg font-black text-white">পিন সফলভাবে পরিবর্তিত হয়েছে!</h4>
                    <p className="text-xs text-slate-300 mt-1">
                      আপনার নতুন পিনটি এখন সক্রিয় রয়েছে। অনুগ্রহ করে নতুন পিন দিয়ে লগইন করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setPassword(resetNewPass);
                      setResetStep('phone');
                      setResetOtp('');
                      setResetNewPass('');
                      setResetConfirmPass('');
                      setErrorMsg('');
                      setSuccessMsg('✅ নতুন পিন স্বয়ংক্রিয়ভাবে ইনপুটে বসানো হয়েছে। লগইন বাটনে ক্লিক করুন।');
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
                      setActiveTab('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>লগইন পেজে ফিরে যান</span>
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
