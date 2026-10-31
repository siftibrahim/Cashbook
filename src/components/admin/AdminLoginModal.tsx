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
  PhoneCall,
  Smartphone,
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
  const [showPassword, setShowPassword] = useState(false);

  // Staff state
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 2FA State
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [twoFaOtp, setTwoFaOtp] = useState('');
  const [twoFaSessionToken, setTwoFaSessionToken] = useState('');
  const [twoFaMaskedPhone, setTwoFaMaskedPhone] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);

  const [twoFaRole, setTwoFaRole] = useState<'super_admin' | 'staff'>('super_admin');
  const [twoFaStaffId, setTwoFaStaffId] = useState('');
  const [twoFaStaffData, setTwoFaStaffData] = useState<any>(null);
  const [twoFaSimulatedOtp, setTwoFaSimulatedOtp] = useState('');

  // Super Admin Password Reset via SMS OTP
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<'input' | 'otp' | 'new_password' | 'done'>('input');
  const [resetIdentifier, setResetIdentifier] = useState('01306908115');
  const [resetResolvedPhone, setResetResolvedPhone] = useState('01306908115');
  const [resetMaskedPhone, setResetMaskedPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [showResetNewPass, setShowResetNewPass] = useState(false);

  // Super Admin Direct OTP Login state (Fixed mobile: 01306908115)
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  const [directOtpSent, setDirectOtpSent] = useState(false);
  const [directOtp, setDirectOtp] = useState('');
  const [directSessionToken, setDirectSessionToken] = useState('');
  const [directMaskedPhone, setDirectMaskedPhone] = useState('013****8115');

  const handleSendDirectOtp = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await authApi.sendSuperAdminLoginOtp('01306908115');
      setDirectOtpSent(true);
      setDirectSessionToken(res.sessionToken || '');
      setDirectMaskedPhone(res.maskedPhone || '013****8115');
      setDirectOtp('');
      onShowToast(res.message || '✅ ৬ ডিজিটের লগইন OTP পাঠানো হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP পাঠাতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDirectOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanOtp = toEnglishDigits(directOtp.trim());
    if (!cleanOtp) {
      setErrorMsg('৬ ডিজিটের OTP কোড লিখুন');
      return;
    }
    setLoading(true);
    try {
      const fp = getOrGenerateFingerprint();
      const res = await authApi.verifySuperAdminLoginOtp({
        otp: cleanOtp,
        sessionToken: directSessionToken,
        trustDevice,
        deviceFingerprint: fp,
        deviceName: navigator.userAgent.slice(0, 100),
      });

      if (res.deviceFingerprint) {
        localStorage.setItem('twing_device_fingerprint', res.deviceFingerprint);
      }

      onShowToast(res.message || '🎉 সুপার অ্যাডমিন প্যানেলে সফলভাবে প্রবেশ করা হয়েছে!');
      onAdminAuthenticated({
        role: 'super_admin',
        email: res.user?.email || 'siftraihan@gmail.com',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ OTP কোড!');
    } finally {
      setLoading(false);
    }
  };

  const toEnglishDigits = (str: string) => {
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return (str || '').replace(/[০-৯]/g, (d) => String(bn.indexOf(d)));
  };

  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const target = toEnglishDigits(resetIdentifier.trim());
    if (!target) {
      setErrorMsg('মোবাইল নম্বর বা ইমেইল এড্রেস লিখুন');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendResetOtp({ phone: target, identifier: target });
      setResetMaskedPhone(res.maskedPhone || target);
      setResetResolvedPhone(res.phone || target);
      setResetStep('otp');
      setResetOtp('');
      onShowToast(res.message || '✅ আপনার মোবাইলে ৬-সংখ্যার OTP কোড পাঠানো হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP পাঠাতে ব্যর্থ হয়েছে। সঠিক তথ্য দিন।');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanOtp = toEnglishDigits(resetOtp.trim());
    if (!cleanOtp) {
      setErrorMsg('৬ ডিজিটের OTP কোড লিখুন');
      return;
    }
    setLoading(true);
    try {
      const target = resetResolvedPhone || toEnglishDigits(resetIdentifier.trim());
      const res = await authApi.verifyResetOtp(target, cleanOtp);
      if (res.phone) setResetResolvedPhone(res.phone);
      setResetStep('new_password');
      onShowToast('✅ OTP সফলভাবে যাচাই হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ OTP কোড!');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanNew = toEnglishDigits(resetNewPass.trim());
    const cleanConfirm = toEnglishDigits(resetConfirmPass.trim());
    if (cleanNew.length < 4) {
      setErrorMsg('নতুন পাসওয়ার্ড ন্যূনতম ৪ অক্ষরের হতে হবে');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMsg('উভয় পাসওয়ার্ড হুবহু একই হতে হবে!');
      return;
    }
    setLoading(true);
    try {
      const target = resetResolvedPhone || toEnglishDigits(resetIdentifier.trim());
      const cleanOtp = toEnglishDigits(resetOtp.trim());
      const res = await authApi.resetPasswordWithOtp({
        phone: target,
        otp: cleanOtp,
        newPassword: cleanNew,
      });
      setResetStep('done');
      setPassword(cleanNew);
      if (!email.trim()) {
        setEmail(target);
      }
      onShowToast(res.message || '🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!');
    } catch (err: any) {
      setErrorMsg(err.message || 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getOrGenerateFingerprint = () => {
    let fp = localStorage.getItem('twing_device_fingerprint');
    if (!fp) {
      fp = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('twing_device_fingerprint', fp);
    }
    return fp;
  };

  const handleSuperAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetIdentifier = email.trim();
    if (!targetIdentifier) {
      setErrorMsg('সুপার অ্যাডমিন মোবাইল নম্বর বা ইমেইল লিখুন');
      return;
    }
    const rateLimit = checkLoginRateLimit(targetIdentifier);
    if (rateLimit.isLocked) {
      setErrorMsg(`⚠️ অতিরিক্ত ভুল চেষ্টার কারণে একাউন্টটি লক করা হয়েছে। দয়া করে ${rateLimit.remainingMinutes} মিনিট পর চেষ্টা করুন।`);
      return;
    }

    setLoading(true);

    try {
      const fp = getOrGenerateFingerprint();
      const res = await authApi.adminLogin({
        identifier: targetIdentifier,
        email: targetIdentifier.includes('@') ? targetIdentifier.toLowerCase() : undefined,
        phone: !targetIdentifier.includes('@') ? targetIdentifier : undefined,
        password,
        authType: 'password',
        deviceFingerprint: fp,
      });

      if (res.requires2FA) {
        setTwoFaRole('super_admin');
        setShow2FAStep(true);
        setTwoFaSessionToken(res.twoFaSessionToken || '');
        setTwoFaMaskedPhone(res.maskedPhone || '013****8115');
        setTwoFaOtp('');
        onShowToast('🔐 আপনার নিবন্ধিত মোবাইল নম্বরে 2FA OTP কোড পাঠানো হয়েছে!');
        return;
      }

      setErrorMsg('সুপার অ্যাডমিন সিকিউরিটির জন্য ২FA ওটিপি যাচাই প্রয়োজন।');
    } catch (err: any) {
      console.warn('Admin sign-in error:', err);
      const attempt = recordFailedLoginAttempt(targetIdentifier);
      if (attempt.isLockedNow) {
        setErrorMsg('❌ ৫ বার ভুল পাসওয়ার্ড দেওয়ায় সিকিউরিটির জন্য একাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে!');
      } else {
        setErrorMsg(err.message || `মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। (বাকি সুযোগ: ${attempt.attemptsLeft} বার)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanOtp = twoFaOtp.trim();
    if (!cleanOtp) {
      setErrorMsg('৬ ডিজিটের OTP কোড লিখুন');
      return;
    }

    setLoading(true);
    try {
      const fp = getOrGenerateFingerprint();
      const res = await authApi.verifyAdmin2FA({
        otp: cleanOtp,
        twoFaSessionToken,
        role: twoFaRole,
        staffId: twoFaStaffId,
        trustDevice,
        deviceFingerprint: fp,
        deviceName: navigator.userAgent.slice(0, 100),
      });

      if (res.deviceFingerprint) {
        localStorage.setItem('twing_device_fingerprint', res.deviceFingerprint);
      }

      if (twoFaRole === 'staff' || res.role === 'staff') {
        onShowToast(res.message || '✅ 2FA যাচাইকরণ সফল! স্বাগতম স্টাফ প্যানেল।');
        onAdminAuthenticated({
          role: 'staff',
          email: res.staff?.email || staffIdentifier,
          staffData: res.staff || twoFaStaffData,
        });
      } else {
        onShowToast(res.message || '✅ 2FA যাচাইকরণ সফল! স্বাগতম সুপার অ্যাডমিন।');
        onAdminAuthenticated({ role: 'super_admin', email: email.trim().toLowerCase() || ADMIN_EMAIL });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '❌ ভুল অথবা মেয়াদোত্তীর্ণ OTP কোড!');
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
      const res = await authApi.staffLogin(cleanIdentifier, cleanPass);
      if (res.requires2FA) {
        setTwoFaRole('staff');
        setTwoFaStaffId(res.staffId || '');
        setTwoFaStaffData(res.staff);
        setShow2FAStep(true);
        setTwoFaSessionToken(res.twoFaSessionToken || '');
        setTwoFaMaskedPhone(res.maskedPhone || '013****8115');
        setTwoFaOtp('');
        onShowToast(res.message || '🔐 আপনার নিবন্ধিত মোবাইল নম্বরে 2FA OTP কোড পাঠানো হয়েছে!');
        return;
      }

      if (!res.staff) {
        setErrorMsg('স্টাফ লগইন ব্যর্থ হয়েছে');
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
      setErrorMsg(err.message || 'স্টাফ লগইনে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
            {isResetMode ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-950">
                    <KeyRound className="w-4 h-4 text-teal-700" />
                    <span>সুপার অ্যাডমিন পাসওয়ার্ড রিসেট</span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    নিবন্ধিত মোবাইল নম্বর বা ইমেইলে OTP কোড পাঠিয়ে সুরক্ষিতভাবে নতুন পাসওয়ার্ড সেট করুন।
                  </p>
                </div>

                {resetStep === 'input' && (
                  <form onSubmit={handleSendResetOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        সুপার অ্যাডমিন মোবাইল বা ইমেইল <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="01306908115 বা siftraihan@gmail.com"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      <span>৬ ডিজিটের OTP কোড পাঠান</span>
                    </button>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(false);
                          setErrorMsg('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ← লগইনে ফিরে যান
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === 'otp' && (
                  <form onSubmit={handleVerifyResetOtp} className="space-y-3">
                    <div className="text-xs text-slate-600">
                      আপনার মোবাইল নম্বর (<span className="font-bold text-teal-900">{resetMaskedPhone}</span>)-এ পাঠানো ৬ ডিজিটের OTP কোডটি লিখুন:
                    </div>
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="৬ ডিজিটের ওটিপি লিখুন"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-teal-500 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || resetOtp.length < 4}
                      className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>OTP কোড যাচাই করুন</span>
                    </button>
                    <div className="flex justify-between items-center text-xs pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => setResetStep('input')}
                        className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ← নম্বর পরিবর্তন
                      </button>
                      <button
                        type="button"
                        onClick={handleSendResetOtp}
                        className="text-teal-700 font-bold hover:underline cursor-pointer"
                      >
                        OTP পুনরায় পাঠান
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === 'new_password' && (
                  <form onSubmit={handleSaveNewPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        নতুন পাসওয়ার্ড <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showResetNewPass ? 'text' : 'password'}
                          required
                          value={resetNewPass}
                          onChange={(e) => setResetNewPass(e.target.value)}
                          placeholder="ন্যূনতম ৪ অক্ষরের নতুন পাসওয়ার্ড"
                          className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetNewPass(!showResetNewPass)}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showResetNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        নতুন পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showResetNewPass ? 'text' : 'password'}
                        required
                        value={resetConfirmPass}
                        onChange={(e) => setResetConfirmPass(e.target.value)}
                        placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || resetNewPass.length < 4}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      <span>নতুন পাসওয়ার্ড সংরক্ষণ করুন</span>
                    </button>
                  </form>
                )}

                {resetStep === 'done' && (
                  <div className="space-y-3 text-center py-2 animate-in zoom-in-95">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      🎉 পাসওয়ার্ড সফলভাবে রিসেট হয়েছে! আপনার নতুন পাসওয়ার্ড স্বয়ংক্রিয়ভাবে যোগ করা হয়েছে।
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetStep('input');
                        setErrorMsg('');
                      }}
                      className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                    >
                      <span>লগইন করুন</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in">
                {/* Fixed Super Admin Mobile Number Card */}
                <div className="p-3 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border border-teal-500/30 rounded-2xl text-teal-100 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-sm">
                      👑
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">সুপার অ্যাডমিন ফিক্সড নম্বর</div>
                      <div className="text-xs sm:text-sm font-black text-white tracking-widest">01306908115</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    🔒 নির্দিষ্ট নম্বর
                  </span>
                </div>

                {/* Sub-Tabs: Direct OTP Login vs Password Login */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('otp');
                      setErrorMsg('');
                    }}
                    className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-[#004D40] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>📲 ওটিপি দিয়ে সরাসরি লগইন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setErrorMsg('');
                    }}
                    className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      loginMethod === 'password'
                        ? 'bg-[#004D40] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>🔑 পাসওয়ার্ড দিয়ে লগইন</span>
                  </button>
                </div>

                {/* MODE 1: DIRECT OTP LOGIN (NO PASSWORD NEEDED) */}
                {loginMethod === 'otp' && (
                  <div className="space-y-3 pt-0.5">
                    {!directOtpSent ? (
                      <div className="space-y-3 animate-in fade-in">
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs leading-relaxed">
                          সুপার অ্যাডমিনের নির্দিষ্ট মোবাইল নম্বরে (<span className="font-bold text-teal-950">01306908115</span>) ৬ ডিজিটের ওটিপি পাঠিয়ে পাসওয়ার্ড ছাড়াই সরাসরি ড্যাশবোর্ডে প্রবেশ করুন।
                        </div>

                        <button
                          type="button"
                          onClick={handleSendDirectOtp}
                          disabled={loading}
                          className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>OTP পাঠানো হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <PhoneCall className="w-4 h-4" />
                              <span>৬ ডিজিটের লগইন OTP পাঠান</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleVerifyDirectOtp} className="space-y-3 animate-in fade-in">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
                          মোবাইল নম্বরে (<span className="font-bold text-amber-950">{directMaskedPhone}</span>) পাঠানো ৬ ডিজিটের ওটিপি কোডটি লিখুন:
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ৬ ডিজিটের OTP কোড <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            autoFocus
                            value={directOtp}
                            onChange={(e) => setDirectOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="৬ ডিজিটের ওটিপি লিখুন"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-teal-500 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="checkbox"
                            id="trustDeviceCheckDirect"
                            checked={trustDevice}
                            onChange={(e) => setTrustDevice(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                          <label htmlFor="trustDeviceCheckDirect" className="text-xs font-bold text-slate-700 cursor-pointer">
                            এই ডিভাইসটি ট্রাস্টেড হিসেবে সংরক্ষণ করুন (৯০ দিন)
                          </label>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || directOtp.length < 4}
                          className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>যাচাই হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>সরাসরি সুপার অ্যাডমিন ড্যাশবোর্ডে প্রবেশ</span>
                            </>
                          )}
                        </button>

                        <div className="flex justify-between items-center text-xs pt-1 px-1">
                          <button
                            type="button"
                            onClick={() => setDirectOtpSent(false)}
                            className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            ← পিছনে যান
                          </button>
                          <button
                            type="button"
                            onClick={handleSendDirectOtp}
                            className="text-teal-700 font-bold hover:underline cursor-pointer"
                          >
                            OTP পুনরায় পাঠান
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* MODE 2: PASSWORD + 2FA LOGIN */}
                {loginMethod === 'password' && (
                  show2FAStep ? (
                    <form onSubmit={handleVerify2FASubmit} className="space-y-3 animate-in fade-in">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                          <span>টু-ফ্যাক্টর অথেনটিকেশন (2FA)</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          অ্যাডমিন সিকিউরিটির জন্য আপনার ভেরিফাইড মোবাইল নম্বরে (<span className="font-bold text-amber-900">{twoFaMaskedPhone}</span>) একটি ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ৬ ডিজিটের 2FA OTP কোড <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={twoFaOtp}
                          onChange={(e) => setTwoFaOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="৬ ডিজিটের ওটিপি লিখুন"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-teal-500 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="trustDeviceCheck"
                          checked={trustDevice}
                          onChange={(e) => setTrustDevice(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <label htmlFor="trustDeviceCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                          এই ডিভাইসটি ট্রাস্টেড হিসেবে সংরক্ষণ করুন (৯০ দিন)
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || twoFaOtp.length < 4}
                        className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50 mt-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>যাচাই হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>2FA ভেরিফাই ও প্রবেশ</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShow2FAStep(false);
                            setTwoFaOtp('');
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          ← পাসওয়ার্ড পরিবর্তন বা ফিরে যান
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSuperAdminPasswordSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          সুপার অ্যাডমিন মোবাইল নম্বর বা ইমেইল <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={email || '01306908115'}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="01306908115 বা siftibrahim@gmail.com"
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

                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetMode(true);
                            setResetStep('input');
                            setErrorMsg('');
                            setResetIdentifier(email.trim() || '01306908115');
                          }}
                          className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                        >
                          পাসওয়ার্ড ভুলে গেছেন? (OTP দিয়ে রিসেট)
                        </button>
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
                  )
                )}
              </div>
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

