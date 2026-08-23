import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  Store,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Loader2,
  Globe,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { BangladeshClock } from './BangladeshClock';

interface AuthScreenProps {
  store: StoreProfile;
  onLoginSuccess: (email: string, role: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ store, onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('siftibrahim@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMsg('অনুগ্রহ করে অ্যাডমিন ইমেইল প্রদান করুন');
      return;
    }

    if (tab === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg(`✅ ${cleanEmail} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! আপনার ইনবক্স চেক করুন।`);
      } catch (err: any) {
        console.error('Password reset error:', err);
        setErrorMsg('❌ রিসেট লিংক পাঠানো যায়নি। সঠিক অনুমোদিত ইমেইল দিন।');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড প্রদান করুন');
      return;
    }

    setLoading(true);

    try {
      // Direct Firebase Authentication Sign In for permitted users
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const loggedUserEmail = userCredential.user.email || cleanEmail;
      setSuccessMsg('✅ অ্যাডমিন যাচাই সফল! অ্যাপে প্রবেশ করা হচ্ছে...');
      setTimeout(() => {
        onLoginSuccess(loggedUserEmail, `ম্যানেজার: ${store.owner || 'ইব্রাহিম'}`);
      }, 500);
    } catch (err: any) {
      console.error('Firebase Auth Error:', err.code, err.message);

      // Strict error messaging
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/wrong-password':
          setErrorMsg('❌ ইমেইল অথবা পাসওয়ার্ড সঠিক নয়! আপনার ফায়ারবেস অথেনটিকেশনে সেট করা পাসওয়ার্ডটি সঠিকভাবে লিখুন অথবা নিচে "পাসওয়ার্ড ভুলে গেছেন?" এ ক্লিক করে রিসেট লিংক নিন।');
          break;
        case 'auth/invalid-email':
          setErrorMsg('❌ সঠিক ফরম্যাটে ইমেইল লিখুন (যেমন: siftibrahim@gmail.com)');
          break;
        case 'auth/too-many-requests':
          setErrorMsg('❌ একাধিকবার ভুল চেষ্টা করায় সাময়িক ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।');
          break;
        case 'auth/network-request-failed':
          setErrorMsg('❌ ইন্টারনেট সংযোগে সমস্যা হচ্ছে। আপনার নেট কানেকশন চেক করুন।');
          break;
        default:
          setErrorMsg(`❌ লগইন ব্যর্থ: ${err.message || 'অননুমোদিত চেষ্টা'}`);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-3 sm:p-6 bg-slate-900/5 min-h-[600px]">
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#004D40] text-white shadow-lg mb-2.5 font-black text-2xl border-2 border-teal-600">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{store.name}</h1>

          {/* Realtime Bangladesh Clock */}
          <div className="flex justify-center mt-1.5">
            <BangladeshClock compact={true} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-[#004D40] border border-teal-200 rounded-full text-xs font-bold mt-2.5 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#004D40]" />
            <span>সুরক্ষিত অ্যাডমিন প্যানেল</span>
          </div>
        </div>

        {/* Auth Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90">
          {/* Header Title */}
          <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#004D40] flex items-center justify-center font-bold">
                <LogIn className="w-4 h-4" />
              </div>
              <h2 className="font-black text-slate-800 text-base">
                {tab === 'login' ? 'অ্যাডমিন লগইন' : 'পাসওয়ার্ড রিসেট'}
              </h2>
            </div>
            <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>রেজিস্ট্রেশন বন্ধ</span>
            </span>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mb-4 text-xs bg-red-50 text-red-700 p-3.5 rounded-2xl border border-red-200 font-bold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Success Message Box */}
          {successMsg && (
            <div className="mb-4 text-xs bg-emerald-50 text-emerald-700 p-3.5 rounded-2xl border border-emerald-200 font-bold flex items-start gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                অ্যাডমিন ইমেইল <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={handleInputFocus}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siftibrahim@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            {tab === 'login' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    অ্যাডমিন পাসওয়ার্ড <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-teal-700 hover:underline font-bold"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onFocus={handleInputFocus}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#004D40] hover:bg-[#00382e] active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm cursor-pointer mt-2 border border-teal-800"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{tab === 'login' ? 'অ্যাডমিন হিসেবে প্রবেশ করুন' : 'পাসওয়ার্ড রিসেট লিংক পাঠান'}</span>
                </>
              )}
            </button>
          </form>

          {tab === 'reset' && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="text-xs text-[#004D40] hover:underline font-bold"
              >
                ← লগইন স্ক্রিনে ফিরে যান
              </button>
            </div>
          )}
        </div>

        {/* Security Rule Note */}
        <div className="text-center text-[11px] text-slate-600 mt-4 space-y-1 bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-center gap-1.5 font-bold text-[#004D40]">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>ক্লাউড কন্ট্রোল পলিসি</span>
          </div>
          <p className="text-slate-500">
            বাইরে থেকে নতুন কোনো ইউজার অ্যাকাউন্ট রেজিস্টার করতে পারবে না। ফায়ারবেস কনসোল থেকে আপনি যাদের ইমেইল অ্যাড করবেন শুধুমাত্র তারাই লগইন করতে পারবে।
          </p>
        </div>
      </div>
    </div>
  );
};
