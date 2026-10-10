import React, { useState, useEffect } from 'react';
import {
  Lock,
  Phone,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  RotateCcw,
  Edit2,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { playPaymentChime, triggerConfettiCelebration } from '../../utils/audio';

interface MarketplaceAuthGatekeeperProps {
  onSuccess: (user: CustomerProfile) => void;
  onBackToDashboard?: () => void;
}

const BD_CITIES = [
  'ঢাকা',
  'চট্টগ্রাম',
  'সিলেট',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'রংপুর',
  'ময়মনসিংহ',
  'কুমিল্লা',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
];

export const MarketplaceAuthGatekeeper: React.FC<MarketplaceAuthGatekeeperProps> = ({
  onSuccess,
  onBackToDashboard,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Login Form States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [login2FaPin, setLogin2FaPin] = useState('');
  const [needs2Fa, setNeeds2Fa] = useState(false);

  // Register Form States
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLocation, setRegLocation] = useState('ঢাকা');
  const [regOtp, setRegOtp] = useState('');
  const [regSimulatedOtp, setRegSimulatedOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Forgot Password States
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState('');

  // Status & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for registration OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [otpCountdown]);

  const formatPhoneInput = (val: string) => {
    return val.replace(/[^\d]/g, '').slice(0, 11);
  };


  // -------------------------------------------------------------
  // Handle Login Submit
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginPhone.trim()) {
      setErrorMessage('অনুগ্রহ করে মোবাইল নম্বর লিখুন।');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await marketplaceSocialService.login(
        loginPhone.trim(),
        loginPassword,
        login2FaPin || undefined
      );

      if (res.success && res.user) {
        setSuccessMessage(`🎉 স্বাগতম ${res.user.name}!`);
        playPaymentChime();
        triggerConfettiCelebration();
        setTimeout(() => {
          onSuccess(res.user!);
        }, 500);
      } else if (res.needs2Fa) {
        setNeeds2Fa(true);
        setErrorMessage(res.error || 'এই অ্যাকাউন্টে ২-ফ্যাক্টর সিকিউরিটি পিন প্রয়োজন।');
      } else {
        setErrorMessage(res.error || 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Step 1: Send OTP to Mobile Number for Registration
  // -------------------------------------------------------------
  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    const cleanPhone = regPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('পাসওয়ার্ড দুটি মেলেনি! পুনরায় সঠিকভাবে লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await marketplaceSocialService.sendRegisterOtp(cleanPhone);
      if (res.success) {
        setRegSimulatedOtp(res.otp || '123456');
        setRegStep('otp');
        setOtpCountdown(60);
        setSuccessMessage(`📩 ${cleanPhone} নম্বরে ৬ ডিজিটের ভেরিফিকেশন ওটিপি পাঠানো হয়েছে।`);
      } else {
        setErrorMessage(res.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend registration OTP
  const handleResendRegisterOtp = async () => {
    if (otpCountdown > 0) return;
    setErrorMessage('');
    setIsLoading(true);
    try {
      const cleanPhone = regPhone.replace(/[^\d]/g, '');
      const res = await marketplaceSocialService.sendRegisterOtp(cleanPhone);
      if (res.success) {
        setRegSimulatedOtp(res.otp || '123456');
        setOtpCountdown(60);
        setSuccessMessage('📩 নতুন ওটিপি কোড পুনরায় পাঠানো হয়েছে।');
      } else {
        setErrorMessage(res.error || 'ওটিপি পুনরায় পাঠানো যায়নি।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Step 2: Verify OTP and Complete Registration
  // -------------------------------------------------------------
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = regOtp.replace(/[^\d]/g, '').trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('অনুগ্রহ করে ৬ ডিজিটের ওটিপি কোডটি লিখুন।');
      return;
    }

    const cleanPhone = regPhone.replace(/[^\d]/g, '');

    setIsLoading(true);
    try {
      const res = await marketplaceSocialService.register({
        name: regName.trim(),
        phone: cleanPhone,
        password: regPassword,
        location: regLocation,
        role: 'customer',
        otp: cleanOtp,
      });

      if (res.success && res.user) {
        setSuccessMessage('🎉 অভিনন্দন! মোবাইল নম্বর সফলভাবে ভেরিফাই হয়েছে এবং অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে!');
        playPaymentChime();
        triggerConfettiCelebration();
        setTimeout(() => {
          onSuccess(res.user!);
        }, 600);
      } else {
        setErrorMessage(res.error || 'ভেরিফিকেশন ব্যর্থ হয়েছে। কোডটি পুনরায় যাচাই করুন।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Forgot Password Handlers
  // -------------------------------------------------------------
  const handleRequestForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotPhone || forgotPhone.length !== 11) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      return;
    }
    setSimulatedOtpNotice('আপনার মোবাইলে ওটিপি পাঠানো হয়েছে: 123456');
    setForgotStep('verify');
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (forgotOtp !== '123456') {
      setErrorMessage('ভুল ওটিপি কোড! অনুগ্রহ করে ১২৩৪৫৬ দিন।');
      return;
    }
    if (forgotNewPass.length < 6) {
      setErrorMessage('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsLoading(true);
    try {
      setSuccessMessage('🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! এখন লগইন করুন।');
      playPaymentChime();
      setTimeout(() => {
        setMode('login');
        setLoginPhone(forgotPhone);
        setForgotStep('request');
        setForgotOtp('');
        setForgotNewPass('');
        setSimulatedOtpNotice('');
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col justify-center items-center p-4 font-sans text-slate-800 antialiased selection:bg-[#1877F2] selection:text-white">
      {/* Brand Header: TWING Central Marketplace */}
      <div className="text-center mb-6 max-w-md w-full">
        <h1 className="text-4xl sm:text-5xl font-black text-[#1877F2] tracking-wider leading-none select-none">
          TWING
        </h1>
        <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-widest mt-1.5 select-none">
          Central Marketplace
        </p>
        <p className="text-xs text-slate-500 font-medium mt-2">
          {mode === 'login'
            ? 'মার্কেটপ্লেসে প্রবেশ করতে অনুগ্রহ করে লগইন করুন'
            : mode === 'register'
            ? 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন ও মোবাইল নম্বর ভেরিফিকেশন'
            : 'পাসওয়ার্ড পুনরুদ্ধার'}
        </p>
      </div>

      {/* Main Auth Box */}
      <div className="w-full max-w-[430px] bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Registration Sub-header banner when in Register mode */}
        {mode === 'register' && (
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-100 shrink-0" />
              <div>
                <h2 className="text-sm font-black leading-tight">নতুন অ্যাকাউন্ট রেজিস্ট্রেশন</h2>
                <p className="text-[11px] text-emerald-100 font-medium">
                  {regStep === 'form' ? 'সঠিক তথ্য দিয়ে একাউন্ট তৈরি করুন' : 'মোবাইল নম্বর ওটিপি ভেরিফিকেশন'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setRegStep('form');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="text-xs font-bold text-white/90 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>লগইন</span>
            </button>
          </div>
        )}

        <div className="p-5 sm:p-7 space-y-4">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. LOGIN FORM (No registration tabs beside login)       */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(formatPhoneInput(e.target.value))}
                    placeholder="017XXXXXXXX"
                    maxLength={11}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    পাসওয়ার্ড <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                      setSuccessMessage('');
                      setForgotPhone(loginPhone);
                    }}
                    className="text-[11px] font-bold text-[#1877F2] hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {needs2Fa && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-blue-900">
                    🛡️ ২-ফ্যাক্টর সিকিউরিটি পিন (৬ ডিজিট)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={login2FaPin}
                    onChange={(e) => setLogin2FaPin(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-center text-sm font-black tracking-widest outline-hidden"
                    autoFocus
                  />
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <span>লগইন হচ্ছে...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>লগইন করুন</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">
                  অথবা
                </span>
              </div>

              {/* CREATE ACCOUNT TRIGGER BUTTON KEPT PROMINENTLY AT THE BOTTOM */}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegStep('form');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="w-full py-3 bg-[#42b72a] hover:bg-green-600 active:scale-[0.99] text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন অ্যাকাউন্ট তৈরি করুন</span>
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* 2. REGISTRATION FORM WITH MOBILE NUMBER VERIFICATION    */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <div>
              {regStep === 'form' ? (
                /* Step 1: User fills profile data */
                <form onSubmit={handleSendRegisterOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="যেমন: তানভীর আহমেদ"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-rose-500">*</span> (১১ ডিজিট)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(formatPhoneInput(e.target.value))}
                        placeholder="017XXXXXXXX"
                        maxLength={11}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 outline-hidden"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔒 রেজিস্ট্রেশনের জন্য এই নম্বরে একটি ৬ ডিজিটের ভেরিফিকেশন ওটিপি পাঠানো হবে।
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        পাসওয়ার্ড <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        নিশ্চিত করুন <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="পুনরায় পাসওয়ার্ড"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      শহর / জেলা
                    </label>
                    <select
                      value={regLocation}
                      onChange={(e) => setRegLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 outline-hidden"
                    >
                      {BD_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 mt-1"
                  >
                    {isLoading ? (
                      <span>ওটিপি কোড পাঠানো হচ্ছে...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>মোবাইল নম্বর ভেরিফাই ও এগিয়ে যান →</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-xs font-bold text-[#1877F2] hover:underline cursor-pointer"
                    >
                      ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন →
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP Verification Screen */
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  {/* Phone Header Indicator */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-[11px] font-bold text-emerald-700">ভেরিফিকেশন নম্বর:</div>
                        <div className="text-sm font-black tracking-wide">{regPhone}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep('form');
                        setRegOtp('');
                        setErrorMessage('');
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-emerald-300 shadow-2xs cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>পরিবর্তন</span>
                    </button>
                  </div>

                  {/* Simulated SMS Alert Banner */}
                  {regSimulatedOtp && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black flex items-center gap-1">
                          <span>📩 SMS নোটিফিকেশন:</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">
                          লাইভ কোড
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                        <span className="text-xs font-medium text-slate-600">ভেরিফিকেশন ওটিপি:</span>
                        <span className="text-sm font-black tracking-widest text-[#1877F2]">
                          {regSimulatedOtp}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRegOtp(regSimulatedOtp)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          কোড বসান
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6-Digit Code Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                      মোবাইলে পাঠানো ৬ ডিজিটের ওটিপি কোড লিখুন <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="123456"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-black tracking-widest text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition outline-hidden"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {/* Verify & Complete Button */}
                  <button
                    type="submit"
                    disabled={isLoading || regOtp.length !== 6}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span>ভেরিফাই হচ্ছে...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ভেরিফাই ও অ্যাকাউন্ট তৈরি সম্পন্ন করুন</span>
                      </>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setRegStep('form')}
                      className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      ← তথ্যে ফিরে যান
                    </button>
                    {otpCountdown > 0 ? (
                      <span className="text-slate-400 font-medium text-[11px]">
                        পুনরায় পাঠাতে অপেক্ষা: <b className="text-slate-600">{otpCountdown}s</b>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendRegisterOtp}
                        className="text-[#1877F2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>পুনরায় ওটিপি পাঠান</span>
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. FORGOT PASSWORD                                      */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-3.5">
              {forgotStep === 'request' ? (
                <form onSubmit={handleRequestForgotOtp} className="space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    পাসওয়ার্ড রিসেট করতে আপনার ১১ ডিজিটের মোবাইল নম্বরটি লিখুন।
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(formatPhoneInput(e.target.value))}
                      placeholder="017XXXXXXXX"
                      maxLength={11}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-hidden"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
                  >
                    ওটিপি কোড পাঠান
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyForgotOtp} className="space-y-3">
                  {simulatedOtpNotice && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl">
                      {simulatedOtpNotice}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ৬ ডিজিটের ওটিপি কোড <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="123456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-widest text-slate-900 outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      নতুন পাসওয়ার্ড <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-hidden"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    পাসওয়ার্ড পরিবর্তন করুন
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-[#1877F2] hover:underline cursor-pointer"
                >
                  ← লগইন পেজে ফিরে যান
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return to Dashboard link if available */}
      {onBackToDashboard && (
        <button
          type="button"
          onClick={onBackToDashboard}
          className="mt-6 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <span>দোকানের ড্যাশবোর্ডে ফিরে যান</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
