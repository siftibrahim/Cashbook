import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Lock,
  User,
  MapPin,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Camera,
  RotateCcw,
  Edit2,
  Check,
} from 'lucide-react';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { playPaymentChime, triggerConfettiCelebration } from '../../utils/audio';

interface MarketplaceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomerProfile) => void;
  initialMode?: 'login' | 'register';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
];

const BD_CITIES = [
  'ঢাকা',
  'উত্তরা, ঢাকা',
  'ধানমন্ডি, ঢাকা',
  'মিরপুর, ঢাকা',
  'গুলশান, ঢাকা',
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

export const MarketplaceAuthModal: React.FC<MarketplaceAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Login Form States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [login2FaPin, setLogin2FaPin] = useState('');
  const [needs2Fa, setNeeds2Fa] = useState(false);

  // Register Form States
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLocation, setRegLocation] = useState('ঢাকা');
  const [regAddress, setRegAddress] = useState('');
  const [regRole, setRegRole] = useState<'customer' | 'seller' | 'creator'>('customer');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
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

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (otpCountdown > 0) {
      timer = setTimeout(() => {
        setOtpCountdown((p) => p - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [otpCountdown]);

  if (!isOpen) return null;

  // Format Bangladesh phone to 11 digits
  const formatPhoneInput = (val: string) => {
    return val.replace(/[^\d]/g, '').slice(0, 11);
  };

  // -------------------------------------------------------------
  // Handle Login Submission
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginPhone.trim()) {
      setErrorMessage('অনুগ্রহ করে মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const res = await marketplaceSocialService.login(loginPhone.trim(), loginPassword, login2FaPin || undefined);
      if (res.success && res.user) {
        setSuccessMessage('🎉 সফলভাবে লগইন হয়েছে!');
        playPaymentChime();
        triggerConfettiCelebration();
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 600);
      } else if (res.needs2Fa) {
        setNeeds2Fa(true);
        setErrorMessage(res.error || 'এই অ্যাকাউন্টে ২-ফ্যাক্টর নিরাপত্তা পিন প্রয়োজন।');
      } else {
        setErrorMessage(res.error || 'লগইন ব্যর্থ হয়েছে। মোবাইল নম্বর ও পাসওয়ার্ড যাচাই করুন।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দেওয়া যায়নি।');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Register Step 1: Send OTP to Phone
  // -------------------------------------------------------------
  const handleSendRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।');
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
      setErrorMessage('পাসওয়ার্ড দুটি মিলছে না! পুনরায় যাচাই করুন।');
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
  // Handle Register Step 2: Verify OTP and Register Account
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
        username: regUsername.trim() || undefined,
        phone: cleanPhone,
        password: regPassword,
        location: regLocation,
        address: regAddress.trim() || undefined,
        role: regRole,
        avatar: selectedAvatar,
        otp: cleanOtp,
      });

      if (res.success && res.user) {
        setSuccessMessage('🎉 অভিনন্দন! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
        playPaymentChime();
        triggerConfettiCelebration();
        setTimeout(() => {
          onSuccess(res.user!);
          onClose();
        }, 700);
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
  // Handle Forgot Password
  // -------------------------------------------------------------
  const handleRequestForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotPhone || forgotPhone.length !== 11) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      return;
    }
    const testOtp = '123456';
    setSimulatedOtpNotice(`আপনার মোবাইলে ৬ ডিজিটের ওটিপি পাঠানো হয়েছে: ${testOtp}`);
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
      // Auto login with new password or switch to login tab
      setSuccessMessage('পাসওয়ার্ড সফলভাবে সেট হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
      setTimeout(() => {
        setLoginPhone(forgotPhone);
        setMode('login');
        setForgotStep('request');
        setErrorMessage('');
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Facebook-style branding */}
        <div className="bg-gradient-to-r from-[#1877F2] to-blue-700 p-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div>
            <div className="text-2xl font-black tracking-wider leading-none">
              TWING
            </div>
            <div className="text-[10px] font-extrabold text-blue-100 uppercase tracking-widest mt-1">
              Central Marketplace
            </div>
            <p className="text-xs text-blue-100 font-medium mt-2">
              {mode === 'login'
                ? 'মার্কেটপ্লেসে লগইন করুন'
                : mode === 'register'
                ? 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন'
                : 'পাসওয়ার্ড পুনরুদ্ধার'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  মোবাইল নম্বর অথবা ইউজারনেম <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="017XXXXXXXX অথবা @username"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 ডেমো টেস্ট অ্যাকাউন্ট: 01711223344 / 01812345678 (পাসওয়ার্ড: 123456)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700">
                    পাসওয়ার্ড <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage('');
                    }}
                    className="text-[11px] font-bold text-[#1877F2] hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড লিখুন"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2FA Pin if challenged */}
              {needs2Fa && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-black text-blue-900">
                    🛡️ ২-ফ্যাক্টর নিরাপত্তা পিন কোড
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={login2FaPin}
                    onChange={(e) => setLogin2FaPin(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="৬ ডিজিটের পিন লিখুন"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-center text-sm font-black tracking-widest text-slate-900 outline-hidden"
                    autoFocus
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
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

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">
                  অথবা
                </span>
              </div>

              {/* Create Account Trigger Button (Signature Green at bottom) */}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegStep('form');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="w-full py-2.5 bg-[#42b72a] hover:bg-green-600 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন অ্যাকাউন্ট তৈরি করুন</span>
              </button>
            </form>
          )}

          {/* 2. REGISTRATION MODE WITH MOBILE NUMBER OTP VERIFICATION */}
          {mode === 'register' && (
            <div>
              {regStep === 'form' ? (
                <form onSubmit={handleSendRegisterOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="যেমন: তানভীর আহমেদ"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-rose-500">*</span> (১১ ডিজিট)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(formatPhoneInput(e.target.value))}
                        placeholder="017XXXXXXXX"
                        maxLength={11}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔒 রেজিস্ট্রেশনের জন্য এই নম্বরে একটি ৬ ডিজিটের ভেরিফিকেশন ওটিপি পাঠানো হবে।
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      ইউজারনেম (Username)
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      placeholder="@username (ঐচ্ছিক)"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        পাসওয়ার্ড <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        নিশ্চিত করুন <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="একই পাসওয়ার্ড"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        শহর / জেলা
                      </label>
                      <select
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                      >
                        {BD_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        অ্যাকাউন্ট টাইপ
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                      >
                        <option value="customer">সাধারণ ক্রেতা</option>
                        <option value="seller">অনলাইন সেলার</option>
                        <option value="creator">কন্টেন্ট ক্রিয়েটর</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      প্রোফাইল অ্যাভাটার
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {PRESET_AVATARS.map((av, idx) => (
                        <img
                          key={idx}
                          src={av}
                          alt="avatar"
                          onClick={() => setSelectedAvatar(av)}
                          className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition ${
                            selectedAvatar === av
                              ? 'border-emerald-600 ring-2 ring-emerald-300 scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
                  >
                    {isLoading ? (
                      <span>ওটিপি পাঠানো হচ্ছে...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>মোবাইল নম্বর ভেরিফাই ও এগিয়ে যান →</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-500 font-medium">
                    ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="font-black text-[#1877F2] hover:underline cursor-pointer"
                    >
                      লগইন করুন
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: OTP Verification Screen */
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-[10px] font-bold text-emerald-700">ভেরিফিকেশন নম্বর:</div>
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

                  {regSimulatedOtp && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black">📩 SMS নোটিফিকেশন:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">
                          লাইভ কোড
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-blue-200">
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
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-center text-lg font-black tracking-widest text-slate-800 focus:bg-white focus:border-emerald-600 outline-hidden"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || regOtp.length !== 6}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {forgotStep === 'request' ? (
                <form onSubmit={handleRequestForgotOtp} className="space-y-3.5">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    আপনার রেজিস্ট্রেশনকৃত মোবাইল নম্বরটি লিখুন। আমরা পাসওয়ার্ড রিসেটের ওটিপি ভেরিফিকেশন কোড পাঠাবো।
                  </p>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(formatPhoneInput(e.target.value))}
                      placeholder="017XXXXXXXX"
                      maxLength={11}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 outline-hidden"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer"
                  >
                    ওটিপি কোড পাঠান
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyForgotOtp} className="space-y-3.5">
                  {simulatedOtpNotice && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl">
                      {simulatedOtpNotice}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      ৬ ডিজিটের ওটিপি কোড <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="123456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center text-sm font-black tracking-widest text-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      নতুন পাসওয়ার্ড <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    পাসওয়ার্ড রিসেট সম্পন্ন করুন
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
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
    </div>
  );
};
