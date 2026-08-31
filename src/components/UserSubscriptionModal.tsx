import React, { useState, useEffect, useMemo } from 'react';
import {
  SubscriptionPlan,
  AdminPaymentMethod,
  PaymentRecord,
  SystemPaymentSettings,
  BankAccountDetails,
} from '../types/adminTypes';
import {
  DEFAULT_PLANS,
  subscribeToPaymentSettings,
  savePaymentRecord,
  INITIAL_PAYMENT_SETTINGS,
} from '../services/adminService';
import { subscriptionApi, getStoredUser } from '../services/apiService';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Smartphone,
  Copy,
  Check,
  Send,
  AlertCircle,
  FileText,
  HelpCircle,
  ArrowRight,
  Info,
  History,
  RotateCcw,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import { formatMoney } from '../utils/storage';
import { StoreProfile } from '../types';
import { DigitalReceiptModal } from './DigitalReceiptModal';

interface UserSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: StoreProfile;
  userId?: string;
  shopName?: string;
  userName?: string;
  userPhone?: string;
  currentPlanName?: string;
  currentExpiresAt?: number;
  onShowToast: (msg: string) => void;
}

export const UserSubscriptionModal: React.FC<UserSubscriptionModalProps> = ({
  isOpen,
  onClose,
  store,
  userId: propUserId,
  shopName: propShopName,
  userName: propUserName,
  userPhone: propUserPhone,
  currentPlanName = 'স্ট্যান্ডার্ড এক্সেস',
  currentExpiresAt: propExpiresAt,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [step, setStep] = useState<'select_plan' | 'select_method' | 'submit_trx' | 'success'>('select_plan');
  
  // Available Plans
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(DEFAULT_PLANS[1] || DEFAULT_PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState<AdminPaymentMethod>('bkash');
  const [selectedBankAccountIndex, setSelectedBankAccountIndex] = useState<number>(0);
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [trxId, setTrxId] = useState<string>('');
  const [userNote, setUserNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Real-time payment settings synced from Admin
  const [settings, setSettings] = useState<SystemPaymentSettings>(INITIAL_PAYMENT_SETTINGS);
  
  // My Payment History
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);

  // Live Subscription Expiry & Countdown (Scoped strictly to Authenticated User)
  const storedUser = getStoredUser();
  const effectiveUserId = propUserId || storedUser?.id || store?.id || 'usr_default';
  const effectiveShopName = propShopName || storedUser?.shopName || store?.shopName || 'আমার দোকান';
  const effectiveUserName = propUserName || storedUser?.name || store?.ownerName || 'গ্রাহক';
  const effectiveUserPhone = propUserPhone || storedUser?.phone || store?.phone || '';
  
  const [subscriptionServerStatus, setSubscriptionServerStatus] = useState<any | null>(null);
  const [isModifyingPending, setIsModifyingPending] = useState(false);

  const rawExpiresAt = subscriptionServerStatus?.subscriptionExpiresAt || (store as any)?.subscriptionExpiresAt || storedUser?.subscriptionExpiresAt || propExpiresAt;
  const effectiveExpiresAt = useMemo(() => {
    return Number(rawExpiresAt) || (Date.now() + 14 * 86400000);
  }, [rawExpiresAt]);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Fetch status from server
  const fetchMySubscriptionStatus = async () => {
    try {
      const data = await subscriptionApi.getMyStatus();
      if (data) {
        setSubscriptionServerStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch subscription status:', err);
    }
  };

  // Update countdown timer every second
  useEffect(() => {
    if (!isOpen) return;
    fetchMySubscriptionStatus();

    const calculateTimeLeft = () => {
      const difference = effectiveExpiresAt - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [isOpen, effectiveExpiresAt]);

  // Sync settings and plans
  useEffect(() => {
    const unsub = subscribeToPaymentSettings((data) => {
      if (data) {
        setSettings(data);
        if (data.customPlans && data.customPlans.length > 0) {
          setPlans(data.customPlans);
        }
      }
    });

    if (effectiveUserPhone && !senderNumber) {
      setSenderNumber(effectiveUserPhone);
    }

    return () => unsub();
  }, [effectiveUserPhone]);

  // Load payment history
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const list = await subscriptionApi.getMyPayments();
      setMyPayments(list);
    } catch (err) {
      console.warn('Failed to load user payments:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    onShowToast(`📋 ${label} কপি করা হয়েছে: ${text}`);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      onShowToast('❌ অনুগ্রহ করে সঠিক Transaction ID (TrxID) দিন');
      return;
    }
    if (!senderNumber.trim()) {
      onShowToast('❌ যে নম্বর বা অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন তা দিন');
      return;
    }

    if (paymentMethod !== 'bank') {
      const cleanDigits = senderNumber.replace(/\D/g, '');
      if (cleanDigits.length !== 11 || !cleanDigits.startsWith('01')) {
        onShowToast('❌ অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const cleanTrx = trxId.trim().toUpperCase();

      const newRecord: Partial<PaymentRecord> = {
        userId: effectiveUserId,
        shopName: effectiveShopName,
        userName: effectiveUserName,
        userPhone: effectiveUserPhone || senderNumber,
        senderNumber: senderNumber.trim(),
        senderPhone: senderNumber.trim(),
        planId: selectedPlan.id,
        planName: selectedPlan.nameBn,
        amount: selectedPlan.price,
        paymentMethod,
        paymentMode: paymentMethod === 'bank' ? 'bank_transfer' : 'manual_mfs',
        trxId: cleanTrx,
        durationDays: selectedPlan.durationDays,
        status: 'pending',
        adminNotes: userNote ? `গ্রাহক নোট: ${userNote}` : undefined,
        bankDetails:
          paymentMethod === 'bank' && settings.bankTransfer?.accounts[selectedBankAccountIndex]
            ? settings.bankTransfer.accounts[selectedBankAccountIndex]
            : undefined,
      };

      await subscriptionApi.submitPayment(newRecord);
      setIsModifyingPending(false);
      setStep('success');
      loadHistory();
      fetchMySubscriptionStatus();
      onShowToast('🎉 পেমেন্ট রিকোয়েস্ট জমা হয়েছে! সুপার অ্যাডমিন ভেরিফাই করে একসেপ্ট করলেই আপনার সাবস্ক্রিপশন চালু হবে।');
    } catch (err: any) {
      console.error(err);
      onShowToast(`❌ ${err.message || 'পেমেন্ট জমাদানে সমস্যা হয়েছে'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodDetails = () => {
    if (paymentMethod === 'bkash') {
      return {
        name: 'bKash (বিকাশ)',
        color: 'from-pink-600 to-rose-600',
        personalNum: settings.bkash?.personal?.number || '01306908115',
        instructions: settings.bkash?.personal?.instructions || 'বিকাশ অ্যাপ থেকে "Send Money" করুন।',
      };
    }
    if (paymentMethod === 'nagad') {
      return {
        name: 'Nagad (নগদ)',
        color: 'from-orange-600 to-amber-600',
        personalNum: settings.nagad?.personal?.number || '01306908115',
        instructions: settings.nagad?.personal?.instructions || 'নগদ অ্যাপ থেকে "Send Money" করুন।',
      };
    }
    if (paymentMethod === 'rocket') {
      return {
        name: 'Rocket (রকেট)',
        color: 'from-purple-600 to-indigo-600',
        personalNum: settings.rocket?.personal?.number || '01306908115-8',
        instructions: settings.rocket?.personal?.instructions || 'রকেট অ্যাপ থেকে "Send Money" করুন।',
      };
    }
    if (paymentMethod === 'upay') {
      return {
        name: 'Upay (উপায়)',
        color: 'from-cyan-600 to-blue-600',
        personalNum: settings.upay?.personal?.number || '01306908115',
        instructions: settings.upay?.personal?.instructions || 'উপায় অ্যাপ থেকে সেন্ড মানি করুন।',
      };
    }
    return null;
  };

  const methodInfo = getMethodDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                সাবস্ক্রিপশন ও প্রিমিয়াম প্যাকেজ
              </h3>
              <p className="text-xs text-slate-500">
                দোকান: <span className="font-bold text-slate-800">{effectiveShopName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsModifyingPending(false);
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Live Countdown & Validity Banner */}
        <div className="my-3 p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                সাবস্ক্রিপশন স্ট্যাটাস
              </span>
              <div className="text-xs font-bold flex items-center gap-1.5">
                {timeLeft.isExpired ? (
                  <span className="text-rose-400 font-black flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> মেয়াদ শেষ হয়েছে
                  </span>
                ) : (
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> সক্রিয় (Active)
                  </span>
                )}
                <span className="text-slate-400 text-[11px]">
                  (মেয়াদ: {new Date(effectiveExpiresAt).toLocaleDateString('bn-BD')})
                </span>
              </div>
            </div>
          </div>

          {/* Time Remaining Counter */}
          {!timeLeft.isExpired ? (
            <div className="flex items-center gap-1.5 text-center">
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="block text-xs font-black text-teal-300 font-mono">{timeLeft.days}</span>
                <span className="text-[9px] text-slate-400">দিন</span>
              </div>
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="block text-xs font-black text-teal-300 font-mono">{timeLeft.hours}</span>
                <span className="text-[9px] text-slate-400">ঘণ্টা</span>
              </div>
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="block text-xs font-black text-teal-300 font-mono">{timeLeft.minutes}</span>
                <span className="text-[9px] text-slate-400">মি.</span>
              </div>
              <div className="bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700">
                <span className="block text-xs font-black text-teal-300 font-mono">{timeLeft.seconds}</span>
                <span className="text-[9px] text-slate-400">সে.</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveTab('packages');
                setStep('select_plan');
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black animate-pulse cursor-pointer shadow-md"
            >
              এখনই রিনিউ করুন
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>প্যাকেজ ও পেমেন্ট</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>পেমেন্ট হিস্টোরি ও রসিদ ({myPayments.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-1">
          {/* TAB 1: PACKAGES & PAYMENT FLOW */}
          {activeTab === 'packages' && (
            <>
              {/* CASE 1: PENDING PAYMENT VERIFICATION */}
              {subscriptionServerStatus?.hasPendingPayment && !isModifyingPending ? (
                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-b from-amber-50 to-orange-50/40 border-2 border-amber-400/60 rounded-3xl text-amber-950 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 shrink-0">
                          <Clock className="w-6 h-6 animate-spin text-amber-600" style={{ animationDuration: '4s' }} />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[11px] font-black uppercase tracking-wider mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                            <span>পেমেন্ট ভেরিফিকেশন হচ্ছে</span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 leading-tight">
                            আপনার পেমেন্ট যাচাই প্রক্রিয়াধীন রয়েছে
                          </h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      আপনার পাঠানো পেমেন্ট তথ্য সফলভাবে গ্রহণ করা হয়েছে। সুপার অ্যাডমিন এডমিন প্যানেল থেকে তথ্য যাচাই করে অনুমোদন (Approve) করলেই আপনার সাবস্ক্রিপশন স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।
                    </p>

                    {subscriptionServerStatus.pendingPayment && (
                      <div className="bg-white/90 border border-amber-200/80 rounded-2xl p-4 space-y-2.5 text-xs shadow-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">নির্বাচিত প্যাকেজ:</span>
                          <span className="font-bold text-slate-900">
                            {subscriptionServerStatus.pendingPayment.planName || 'প্রিমিয়াম প্যাক'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">টাকার পরিমাণ:</span>
                          <span className="font-black text-emerald-600 text-sm">
                            ৳{formatMoney(subscriptionServerStatus.pendingPayment.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">পেমেন্ট মেথড:</span>
                          <span className="font-bold uppercase text-slate-800">
                            {subscriptionServerStatus.pendingPayment.paymentMethod}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">প্রেরক মোবাইল নম্বর:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {subscriptionServerStatus.pendingPayment.senderNumber || subscriptionServerStatus.pendingPayment.senderPhone}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Transaction ID (TrxID):</span>
                          <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {subscriptionServerStatus.pendingPayment.trxId}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">সাবমিটের সময়:</span>
                          <span className="font-medium text-slate-600">
                            {new Date(subscriptionServerStatus.pendingPayment.createdAt || Date.now()).toLocaleString('bn-BD')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={fetchMySubscriptionStatus}
                        className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>স্ট্যাটাস রিফ্রেশ করুন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsModifyingPending(true);
                          setStep('select_plan');
                        }}
                        className="w-full sm:flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>পেমেন্ট তথ্য পরিবর্তন / অন্য প্যাকেজ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : subscriptionServerStatus &&
                !isModifyingPending &&
                !subscriptionServerStatus.canRenew &&
                !subscriptionServerStatus.isTrial &&
                !subscriptionServerStatus.isExpired &&
                (subscriptionServerStatus.status === 'ACTIVE' || subscriptionServerStatus.status === 'active') ? (
                /* CASE 2: ACTIVE SUBSCRIPTION (AND > 3 DAYS REMAINING) - NO NEW SUBSCRIPTION OPTION SHOWN */
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-b from-teal-50 via-emerald-50/40 to-white border-2 border-teal-500/40 rounded-3xl text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-3xl bg-teal-600/10 border-2 border-teal-500/30 text-teal-600 mx-auto flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="w-10 h-10 text-teal-600" />
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-wider mb-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-700" />
                        <span>আপনার সাবস্ক্রিপশন সক্রিয় রয়েছে</span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">
                        {subscriptionServerStatus.subscriptionPlan || 'প্রিমিয়াম মেম্বারশিপ'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        মেয়াদ উত্তীর্ণের তারিখ: <strong className="text-slate-800 font-bold">{new Date(effectiveExpiresAt).toLocaleDateString('bn-BD')}</strong>
                      </p>
                    </div>

                    {/* Prominent Live Remaining Countdown */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md max-w-sm mx-auto">
                      <span className="text-[11px] text-teal-300 font-semibold block mb-2">
                        সাবস্ক্রিপশনের বাকি মেয়াদ
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                          <span className="block text-base font-black text-teal-300 font-mono">{timeLeft.days}</span>
                          <span className="text-[10px] text-slate-400">দিন</span>
                        </div>
                        <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                          <span className="block text-base font-black text-teal-300 font-mono">{timeLeft.hours}</span>
                          <span className="text-[10px] text-slate-400">ঘণ্টা</span>
                        </div>
                        <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                          <span className="block text-base font-black text-teal-300 font-mono">{timeLeft.minutes}</span>
                          <span className="text-[10px] text-slate-400">মি.</span>
                        </div>
                        <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                          <span className="block text-base font-black text-teal-300 font-mono">{timeLeft.seconds}</span>
                          <span className="text-[10px] text-slate-400">সে.</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-sky-50 border border-sky-200/80 rounded-2xl text-left text-xs text-sky-950 space-y-1">
                      <div className="flex items-center gap-2 font-black text-sky-900">
                        <Info className="w-4 h-4 text-sky-700 shrink-0" />
                        <span>রিনিউ সংক্রান্ত তথ্য:</span>
                      </div>
                      <p className="text-sky-800 leading-relaxed pl-6">
                        আপনার বর্তমান সাবস্ক্রিপশনের মেয়াদ শেষ হওয়ার <strong>৩ দিন আগে</strong> স্বয়ংক্রিয়ভাবে নতুন প্যাকেজ নির্বাচন ও রিনিউ অপশন চালু হবে। ওই সময় আপনি যেকোনো প্যাকেজ বেছে নিয়ে পুনরায় মেয়াদ বাড়িয়ে নিতে পারবেন।
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('history');
                          loadHistory();
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                        <span>পেমেন্ট হিস্টোরি ও রসিদ দেখুন</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CASE 3: RENEWAL & PACKAGE SELECTION FLOW (FREE TRIAL, EXPIRED, OR <= 3 DAYS REMAINING) */
                <>
                  {/* STEP 1: SELECT PLAN */}
                  {step === 'select_plan' && (
                    <div className="space-y-4">
                      {/* Dynamic Bonus Banner */}
                      {settings.bonusConfig?.isBonusEnabled !== false && (settings.bonusConfig?.bonusDays ?? 7) > 0 && (
                        <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs font-black block text-amber-200">
                              🎁 {settings.bonusConfig?.bonusTitle || 'বিশেষ বোনাস অফার!'}
                            </span>
                            <span className="text-[11px] text-white/90">
                              {settings.bonusConfig?.bonusDescription || (
                                <>
                                  এখন সাবস্ক্রিপশন করলেই আরও <strong className="text-amber-300">+{settings.bonusConfig?.bonusDays || 7} দিন</strong> অতিরিক্ত ফ্রি বোনাস মেয়াদ যুক্ত হবে!
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Expiring Soon Notice if <= 3 days */}
                      {subscriptionServerStatus && !subscriptionServerStatus.isExpired && subscriptionServerStatus.daysRemaining <= 3 && !subscriptionServerStatus.isTrial && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 flex items-center gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <div className="text-xs">
                            <strong className="block text-amber-900">মেয়াদ দ্রুত শেষ হচ্ছে (বাকি আর {subscriptionServerStatus.daysRemaining} দিন)!</strong>
                            <span>হিসাবের সকল ডেটা ও সেবা নিরবচ্ছিন্ন রাখতে এখনই পরবর্তী মেয়াদের জন্য রিনিউ করুন।</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-slate-600 bg-teal-50/70 p-3 rounded-2xl border border-teal-100 flex items-center gap-2">
                        <Info className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>আপনার পছন্দের সাবস্ক্রিপশন প্যাকেজটি বেছে নিয়ে পেমেন্ট করুন:</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {plans.filter((p) => p.price > 0).map((plan) => {
                          const isSelected = selectedPlan.id === plan.id;

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setSelectedPlan(plan)}
                              className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative shadow-xs cursor-pointer ${
                                isSelected
                                  ? 'border-teal-600 bg-teal-50/30 ring-2 ring-teal-100'
                                  : 'border-slate-200 hover:border-teal-300 bg-white'
                              }`}
                            >
                              {plan.badge && (
                                <span
                                  className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white shadow-xs ${
                                    plan.isPopular ? 'bg-teal-700' : 'bg-slate-800'
                                  }`}
                                >
                                  {plan.badge}
                                </span>
                              )}

                              <div>
                                <h4 className="text-sm sm:text-base font-black text-slate-900 mb-1">
                                  {plan.nameBn}
                                </h4>

                                <div className="flex items-baseline gap-2 mb-3">
                                  <span className="text-2xl sm:text-3xl font-black text-teal-800">
                                    ৳{formatMoney(plan.price)}
                                  </span>
                                  {plan.originalPrice && (
                                    <span className="text-xs text-slate-400 line-through">
                                      ৳{formatMoney(plan.originalPrice)}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500 font-semibold">
                                    / {plan.durationDays} দিন
                                  </span>
                                </div>

                                <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                                  {plan.features.map((feat, idx) => (
                                    <li key={idx} className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setStep('select_method');
                                }}
                                className={`w-full py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-700 hover:bg-teal-800 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                <span>এই প্যাকেজটি কিনুন (৳{formatMoney(plan.price)})</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

              {/* STEP 2: SELECT PAYMENT METHOD */}
              {step === 'select_method' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500">নির্বাচিত প্যাকেজ:</span>
                      <div className="text-sm font-black text-slate-900">
                        {selectedPlan.nameBn} - ৳{formatMoney(selectedPlan.price)} ({selectedPlan.durationDays} দিন)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('select_plan')}
                      className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                    >
                      পরিবর্তন করুন
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    পেমেন্ট মেথড বেছে নিন:
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* bKash */}
                    {settings.bkash?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('bkash');
                          setStep('submit_trx');
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:scale-102 ${
                          paymentMethod === 'bkash'
                            ? 'border-pink-600 bg-pink-50 text-pink-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-pink-500 text-white font-black flex items-center justify-center text-xs">
                          বি
                        </span>
                        <span className="text-xs font-bold">bKash (বিকাশ)</span>
                      </button>
                    )}

                    {/* Nagad */}
                    {settings.nagad?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('nagad');
                          setStep('submit_trx');
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:scale-102 ${
                          paymentMethod === 'nagad'
                            ? 'border-orange-600 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-orange-500 text-white font-black flex items-center justify-center text-xs">
                          ন
                        </span>
                        <span className="text-xs font-bold">Nagad (নগদ)</span>
                      </button>
                    )}

                    {/* Rocket */}
                    {settings.rocket?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('rocket');
                          setStep('submit_trx');
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:scale-102 ${
                          paymentMethod === 'rocket'
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-xs">
                          র
                        </span>
                        <span className="text-xs font-bold">Rocket (রকেট)</span>
                      </button>
                    )}

                    {/* Upay */}
                    {settings.upay?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('upay');
                          setStep('submit_trx');
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:scale-102 ${
                          paymentMethod === 'upay'
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-cyan-500 text-white font-black flex items-center justify-center text-xs">
                          উ
                        </span>
                        <span className="text-xs font-bold">Upay (উপায়)</span>
                      </button>
                    )}

                    {/* Bank */}
                    {settings.bankTransfer?.isEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('bank');
                          setStep('submit_trx');
                        }}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:scale-102 col-span-2 sm:col-span-4 ${
                          paymentMethod === 'bank'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          <span className="text-xs font-bold">ব্যাংক ট্রান্সফার (Bank Deposit / Transfer)</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: SUBMIT TRANSACTION & DETAILS */}
              {step === 'submit_trx' && (
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  {/* MFS Instructions */}
                  {methodInfo && (
                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">
                          {methodInfo.name} পেমেন্ট নির্দেশিকা:
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white">
                          Send Money
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                        <div>
                          <span className="text-[11px] text-slate-400 block">পার্সোনাল নম্বর:</span>
                          <span className="font-mono font-bold text-base text-pink-300">
                            {methodInfo.personalNum}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(methodInfo.personalNum, methodInfo.name)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedText === methodInfo.personalNum ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedText === methodInfo.personalNum ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>পাঠানোর পরিমাণ:</span>
                        <span className="font-black text-emerald-400 text-base">
                          ৳{formatMoney(selectedPlan.price)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {methodInfo.instructions} টাকা পাঠানোর পর SMS-এ আসা Transaction ID (TrxID) নিচে প্রদান করুন।
                      </p>
                    </div>
                  )}

                  {/* Bank Instructions */}
                  {paymentMethod === 'bank' && settings.bankTransfer?.accounts?.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700">ব্যাংক একাউন্ট বেছে নিন:</div>
                      <div className="space-y-2">
                        {settings.bankTransfer.accounts.map((acc, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedBankAccountIndex(idx)}
                            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                              selectedBankAccountIndex === idx
                                ? 'border-indigo-600 bg-indigo-50/50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-black text-indigo-900 block">{acc.bankName}</span>
                                <span className="text-xs text-slate-700 font-semibold">হিসাব: {acc.accountName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-indigo-700 bg-white px-2 py-1 rounded-lg border border-indigo-200">
                                  {acc.accountNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(acc.accountNumber, 'অ্যাকাউন্ট নম্বর');
                                  }}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              ব্রাঞ্চ: {acc.branchName || 'যেকোনো'} | রাউটিং: {acc.routingNumber || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Input Fields */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        প্রেরক নম্বর / অ্যাকাউন্ট নম্বর <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="যে নম্বর বা অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-slate-800 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Transaction ID (TrxID) / রেফারেন্স নম্বর <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder="যেমন: BK8899XX অথবা ডিপোজিট স্লিপ নং"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-slate-800 font-mono font-black uppercase text-sm tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        অতিরিক্ত নোট / তথ্য (ঐচ্ছিক):
                      </label>
                      <input
                        type="text"
                        value={userNote}
                        onChange={(e) => setUserNote(e.target.value)}
                        placeholder="কোনো বিশেষ মন্তব্য থাকলে লিখুন"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep('select_method')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      পিছনে
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-700/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'জমা হচ্ছে...' : 'পেমেন্ট রিকোয়েস্ট জমা দিন'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: SUCCESS RECEIPT */}
              {step === 'success' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-slate-900">
                      পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                      আপনার <span className="font-bold text-teal-800">৳{formatMoney(selectedPlan.price)}</span> টাকার রিকোয়েস্টটি আমাদের সার্ভারে সংরক্ষিত হয়েছে। অ্যাডমিন প্যানেল থেকে TrxID যাচাই করার সাথে সাথেই সাবস্ক্রিপশন মেয়াদ বৃদ্ধি পাবে।
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 max-w-sm mx-auto space-y-2 text-left shadow-2xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">প্যাকেজ:</span>
                      <span className="font-bold text-slate-900">{selectedPlan.nameBn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">TrxID:</span>
                      <span className="font-mono font-bold text-teal-800">{trxId.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">স্ট্যাটাস:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        পেন্ডিং (যাচাই চলছে)
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('history');
                        setStep('select_plan');
                      }}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      পেমেন্ট হিস্টোরি দেখুন
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    >
                      ঠিক আছে, সম্পন্ন
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}

          {/* TAB 2: PAYMENT HISTORY & DIGITAL RECEIPTS */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {isLoadingHistory ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  পেমেন্ট হিস্টোরি লোড হচ্ছে...
                </div>
              ) : myPayments.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p>এখনও কোনো পেমেন্ট রেকর্ড নেই</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('packages');
                      setStep('select_plan');
                    }}
                    className="px-4 py-1.5 bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-block"
                  >
                    প্যাকেজ সাবস্ক্রাইব করুন
                  </button>
                </div>
              ) : (
                myPayments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      p.status === 'approved'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : p.status === 'pending'
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-rose-50/30 border-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{p.planName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status === 'approved'
                            ? 'অনুমোদিত'
                            : p.status === 'pending'
                            ? 'যাচাই চলছে'
                            : 'বাতিল'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-teal-800 font-bold">TrxID: {p.trxId}</span>
                        <span>•</span>
                        <span className="uppercase font-semibold">{p.paymentMethod}</span>
                        <span>•</span>
                        <span>{new Date(p.createdAt).toLocaleDateString('bn-BD')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-sm font-black text-teal-800">৳{formatMoney(p.amount)}</span>
                        <span className="text-[10px] text-slate-400 block">+{p.durationDays} দিন</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReceiptPayment(p)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>রসিদ</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Digital Printable Receipt View */}
      {selectedReceiptPayment && (
        <DigitalReceiptModal
          isOpen={!!selectedReceiptPayment}
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
