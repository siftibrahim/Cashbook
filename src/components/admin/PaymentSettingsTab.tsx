import React, { useState } from 'react';
import {
  SystemPaymentSettings,
  BankAccountDetails,
  PaymentGatewayConfig,
  SubscriptionPlan,
  FreeTrialConfig,
  BonusConfig,
} from '../../types/adminTypes';
import { DEFAULT_PLANS } from '../../services/adminService';
import {
  Smartphone,
  Building2,
  Globe2,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  Zap,
  Lock,
  Package,
  Sparkles,
  Key,
  CreditCard,
  Layers,
  Settings,
  HelpCircle,
  QrCode,
  Sliders,
  DollarSign,
  AlertCircle,
  Gift,
  Calendar,
  Clock,
  RotateCcw,
  Check,
  AlertTriangle,
  ArrowRight,
  Info,
  Tag,
} from 'lucide-react';

interface PaymentSettingsTabProps {
  settings: SystemPaymentSettings;
  onSaveSettings: (settings: SystemPaymentSettings) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'trial_bonus' | 'packages' | 'mfs' | 'bank' | 'gateway'>('trial_bonus');
  const [formData, setFormData] = useState<SystemPaymentSettings>({
    ...settings,
    isSubscriptionSystemEnabled: settings.isSubscriptionSystemEnabled !== false,
    trialConfig: settings.trialConfig || {
      isTrialEnabled: true,
      trialDays: 14,
      trialPlanName: 'ফ্রি ট্রায়াল (১৪ দিন)',
    },
    bonusConfig: settings.bonusConfig || {
      isBonusEnabled: true,
      bonusDays: 7,
      bonusTitle: 'স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)',
      bonusDescription: 'যেকোনো প্যাকেজ রিনিউ বা সাবস্ক্রিপশন নিলে সাথে আরও ৭ দিন বোনাস মেয়াদ যুক্ত হবে।',
    },
    customPlans: settings.customPlans && settings.customPlans.length > 0 ? settings.customPlans : DEFAULT_PLANS,
    gateways: settings.gateways && settings.gateways.length > 0 ? settings.gateways : [
      {
        gatewayId: 'bkash_direct',
        name: 'bKash Official Direct Gateway (Tokenized API)',
        isEnabled: false,
        isLive: false,
        merchantNumber: '01619665875',
        notes: 'অফিসিয়াল বিকাশ মার্চেন্ট এপিআই দিয়ে অটোমেটিক চেকআউট।',
      },
      {
        gatewayId: 'nagad_direct',
        name: 'Nagad Direct Checkout API',
        isEnabled: false,
        isLive: false,
        merchantNumber: '01619665875',
        notes: 'নগদ পেমেন্ট গেটওয়ে এপিআই।',
      },
      {
        gatewayId: 'sslcommerz',
        name: 'SSLCommerz Multi-Channel Gateway',
        isEnabled: false,
        isLive: false,
        notes: 'ভিসা, মাস্টারকার্ড, ইন্টারনেট ব্যাংকিং ও এমএফএস অটো-ভেরিফিকেশন।',
      },
      {
        gatewayId: 'shurjopay',
        name: 'ShurjoPay Payment Gateway',
        isEnabled: false,
        isLive: false,
        notes: 'বাংলাদেশ ব্যাংকের লাইসেন্সপ্রাপ্ত পেমেন্ট গেটওয়ে।',
      },
      {
        gatewayId: 'amarpay',
        name: 'AamarPay Online Payment Gateway',
        isEnabled: false,
        isLive: false,
        notes: 'সহজ মার্চেন্ট ইন্টিগ্রেশন ও ইনস্ট্যান্ট নোটিফিকেশন।',
      },
    ],
  });
  const [isSaving, setIsSaving] = useState(false);

  // New Custom Gateway State
  const [showAddGatewayModal, setShowAddGatewayModal] = useState(false);
  const [newGatewayName, setNewGatewayName] = useState('');
  const [newGatewayId, setNewGatewayId] = useState('');
  const [newGatewayAppKey, setNewGatewayAppKey] = useState('');
  const [newGatewayAppSecret, setNewGatewayAppSecret] = useState('');
  const [newGatewayMerchantNum, setNewGatewayMerchantNum] = useState('');
  const [newGatewayNotes, setNewGatewayNotes] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      onShowToast('✅ সকল ফ্রি ট্রায়াল, বোনাস অফার, প্যাকেজ ও পেমেন্ট সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ সংরক্ষণ ব্যর্থ হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTrialConfig = (field: keyof FreeTrialConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      trialConfig: {
        ...(prev.trialConfig || { isTrialEnabled: true, trialDays: 14, trialPlanName: 'ফ্রি ট্রায়াল (১৪ দিন)' }),
        [field]: value,
      },
    }));
  };

  const handleUpdateBonusConfig = (field: keyof BonusConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      bonusConfig: {
        ...(prev.bonusConfig || {
          isBonusEnabled: true,
          bonusDays: 7,
          bonusTitle: 'স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)',
          bonusDescription: 'যেকোনো প্যাকেজ রিনিউ বা সাবস্ক্রিপশন নিলে সাথে আরও ৭ দিন বোনাস মেয়াদ যুক্ত হবে।',
        }),
        [field]: value,
      },
    }));
  };

  const handleAddBankAccount = () => {
    const newAcc: BankAccountDetails = {
      bankName: '',
      accountName: '',
      accountNumber: '',
      branchName: '',
      routingNumber: '',
      instructions: 'অনলাইন ব্যাংক ট্রান্সফার (NPSB/BEFTN/RTGS) অথবা সরাসরি ব্যাংক অ্যাকাউন্টে ডিপোজিট করুন।',
    };
    setFormData((prev) => ({
      ...prev,
      bankTransfer: {
        ...prev.bankTransfer,
        accounts: [...prev.bankTransfer.accounts, newAcc],
      },
    }));
  };

  const handleRemoveBankAccount = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bankTransfer: {
        ...prev.bankTransfer,
        accounts: prev.bankTransfer.accounts.filter((_, idx) => idx !== index),
      },
    }));
  };

  const handleUpdateBankAccount = (index: number, field: keyof BankAccountDetails, value: string) => {
    setFormData((prev) => {
      const copy = [...prev.bankTransfer.accounts];
      copy[index] = { ...copy[index], [field]: value };
      return {
        ...prev,
        bankTransfer: {
          ...prev.bankTransfer,
          accounts: copy,
        },
      };
    });
  };

  const handleUpdateGateway = (index: number, field: keyof PaymentGatewayConfig, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.gateways || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, gateways: copy };
    });
  };

  const handleAddNewCustomGateway = () => {
    if (!newGatewayName.trim()) {
      onShowToast('অনুগ্রহ করে গেটওয়ের নাম লিখুন');
      return;
    }
    const sanitizedId = (newGatewayId.trim() || newGatewayName.toLowerCase().replace(/[^a-z0-9]/g, '_')) as any;
    const newGtw: PaymentGatewayConfig = {
      gatewayId: sanitizedId,
      name: newGatewayName.trim(),
      isEnabled: true,
      isLive: false,
      appKey: newGatewayAppKey.trim(),
      appSecret: newGatewayAppSecret.trim(),
      merchantNumber: newGatewayMerchantNum.trim(),
      notes: newGatewayNotes.trim(),
    };

    setFormData((prev) => ({
      ...prev,
      gateways: [...(prev.gateways || []), newGtw],
    }));

    setShowAddGatewayModal(false);
    setNewGatewayName('');
    setNewGatewayId('');
    setNewGatewayAppKey('');
    setNewGatewayAppSecret('');
    setNewGatewayMerchantNum('');
    setNewGatewayNotes('');
    onShowToast('✅ নতুন পেমেন্ট গেটওয়ে যুক্ত হয়েছে!');
  };

  const handleRemoveGateway = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      gateways: (prev.gateways || []).filter((_, idx) => idx !== index),
    }));
    onShowToast('গেটওয়ে রিমুভ করা হয়েছে');
  };

  const handleUpdatePlan = (index: number, field: keyof SubscriptionPlan, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.customPlans || DEFAULT_PLANS)];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, customPlans: copy };
    });
  };

  const handleAddNewPlan = () => {
    const newPlan: SubscriptionPlan = {
      id: 'plan_' + Date.now().toString(36),
      name: 'Custom Package',
      nameBn: 'নতুন কাস্টম প্যাকেজ',
      price: 300,
      originalPrice: 400,
      durationDays: 90,
      features: ['সম্পূর্ণ আনলিমিটেড হিসাব', 'ফ্রি এসএমএস অ্যালার্ট', '২৪/৭ ডেডিকেটেড সাপোর্ট'],
      isPopular: false,
      isEnabled: true,
      badge: 'সাশ্রয়ী অফার',
    };
    setFormData((prev) => ({
      ...prev,
      customPlans: [...(prev.customPlans || DEFAULT_PLANS), newPlan],
    }));
    onShowToast('✅ নতুন প্যাকেজ যুক্ত করা হয়েছে');
  };

  const handleRemovePlan = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customPlans: (prev.customPlans || DEFAULT_PLANS).filter((_, idx) => idx !== index),
    }));
  };

  const handleResetDefaultPlans = () => {
    setFormData((prev) => ({
      ...prev,
      customPlans: DEFAULT_PLANS,
    }));
    onShowToast('🔄 ৪টি মূল ডিফল্ট প্যাকেজে রিসেট করা হয়েছে');
  };

  const currentTrial = formData.trialConfig || { isTrialEnabled: true, trialDays: 14, trialPlanName: 'ফ্রি ট্রায়াল (১৪ দিন)' };
  const currentBonus = formData.bonusConfig || { isBonusEnabled: true, bonusDays: 7, bonusTitle: 'স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)', bonusDescription: 'যেকোনো প্যাকেজ রিনিউ বা সাবস্ক্রিপশন নিলে সাথে আরও ৭ দিন বোনাস মেয়াদ যুক্ত হবে।' };

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Action */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131E36] to-[#0F172A] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 p-0.5 shadow-lg flex items-center justify-center text-white shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <Gift className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>পেমেন্ট, ফ্রি ট্রায়াল ও সাবস্ক্রিপশন প্রশাসন</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
                Super Admin Control
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ফ্রি ট্রায়াল (১৪ দিন), বোনাস অফার (+৭ দিন), সাবস্ক্রিপশন প্যাকেজের মেয়াদ/মূল্য ও MFS গেটওয়ে পরিচালনা করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>সংরক্ষণ হচ্ছে...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>সকল পরিবর্তন সেভ করুন</span>
            </>
          )}
        </button>
      </div>

      {/* Global Subscription System Master Switch */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 shadow-xl ${
        formData.isSubscriptionSystemEnabled !== false
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40 shadow-rose-950/20'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              formData.isSubscriptionSystemEnabled !== false
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {formData.isSubscriptionSystemEnabled !== false ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <Lock className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-black text-white">
                  সাবস্ক্রিপশন সিস্টেম এনাবল / ডিজেবল সুইচ (Master Switch)
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                  formData.isSubscriptionSystemEnabled !== false
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {formData.isSubscriptionSystemEnabled !== false ? '🟢 বর্তমানে চালু (ENABLED)' : '🔴 বর্তমানে বন্ধ (DISABLED)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                {formData.isSubscriptionSystemEnabled !== false ? (
                  <span>
                    <strong className="text-emerald-400">চালু অবস্থা:</strong> ইউজার প্যানেল ও মেনুতে সাবস্ক্রিপশন প্ল্যান, মেয়াদ, রিনিউ ও পেমেন্ট হিস্ট্রি অপশন সক্রিয় থাকবে।
                  </span>
                ) : (
                  <span>
                    <strong className="text-rose-400">ডিজেবল অবস্থা:</strong> ইউজার ড্যাশবোর্ড ও মেনু থেকে সাবস্ক্রিপশন অপশন <strong className="underline text-white">সম্পূর্ণ ভ্যানিশ (অদৃশ্য)</strong> হয়ে যাবে। কোন মেয়াদ শেষ হবে না, সমস্ত ইউজার যেকোনো বাধা ছাড়াই সম্পূর্ণ বিনামূল্যে আজীবন অ্যাক্সেস পাবে।
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={async () => {
                const nextVal = formData.isSubscriptionSystemEnabled === false ? true : false;
                const updated = { ...formData, isSubscriptionSystemEnabled: nextVal };
                setFormData(updated);
                try {
                  await onSaveSettings(updated);
                  onShowToast(
                    nextVal
                      ? '🟢 সাবস্ক্রিপশন সিস্টেম সফলভাবে চালু (ENABLED) করা হয়েছে!'
                      : '🔴 সাবস্ক্রিপশন সিস্টেম সম্পূর্ণ বন্ধ (DISABLED) করা হয়েছে! ইউজার ড্যাশবোর্ড থেকে সাবস্ক্রিপশন উধাও হয়ে গেছে।'
                  );
                } catch (err: any) {
                  onShowToast('❌ সেটিংস সেভ করতে সমস্যা হয়েছে: ' + (err.message || 'ত্রুটি'));
                }
              }}
              className={`w-full md:w-auto px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                formData.isSubscriptionSystemEnabled !== false
                  ? 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-rose-950/40 border border-rose-400/30'
                  : 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-950/40 border border-emerald-400/30'
              }`}
            >
              {formData.isSubscriptionSystemEnabled !== false ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>সিস্টেম ডিজেবল করুন (Disable)</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>সিস্টেম চালু করুন (Enable)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('trial_bonus')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSubTab === 'trial_bonus'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black shadow-amber-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>🎁 ফ্রি ট্রায়াল ও বোনাস অফার</span>
          {(!currentTrial.isTrialEnabled || !currentBonus.isBonusEnabled) && (
            <span className="w-2 h-2 rounded-full bg-rose-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('packages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSubTab === 'packages'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>📦 সাবস্ক্রিপশন প্যাকেজ ও মেয়াদ ({(formData.customPlans || DEFAULT_PLANS).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mfs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSubTab === 'mfs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>MFS ওয়ালেট (বিকাশ / নগদ / রকেট / উপায়)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSubTab === 'bank'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>ব্যাংক ট্রান্সফার ({formData.bankTransfer.accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('gateway')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSubTab === 'gateway'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>অটোমেটেড গেটওয়ে ({formData.gateways?.length || 0})</span>
        </button>
      </div>

      {/* 0. FREE TRIAL & BONUS DAYS DYNAMIC CONTROLS */}
      {activeSubTab === 'trial_bonus' && (
        <div className="space-y-6">
          {/* Section 1: Free Trial Setting */}
          <div className="p-6 rounded-3xl bg-[#0D1424] border border-amber-500/30 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>নতুন রেজিস্ট্রেশনে ফ্রি ট্রায়াল নিয়ন্ত্রণ</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      currentTrial.isTrialEnabled !== false
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {currentTrial.isTrialEnabled !== false ? '🟢 চালু রয়েছে' : '🔴 বন্ধ রয়েছে'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    নতুন অ্যাকাউন্ট খোলার পর দোকানদারকে বিনামূল্যে ব্যবহারের সুযোগ দিতে পারবেন এবং দিন কমাতে/বাড়াতে পারবেন
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">ফ্রি ট্রায়াল স্ট্যাটাস:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentTrial.isTrialEnabled !== false}
                    onChange={(e) => handleUpdateTrialConfig('isTrialEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>

            {currentTrial.isTrialEnabled !== false ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                      <span>ফ্রি ট্রায়াল মেয়াদের দিন সংখ্যা:</span>
                      <span className="text-amber-400 font-mono font-black text-sm">
                        {currentTrial.trialDays || 14} দিন
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={currentTrial.trialDays || 14}
                        onChange={(e) => handleUpdateTrialConfig('trialDays', Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-semibold mr-1">কুইক সিলেক্ট:</span>
                      {[3, 7, 14, 21, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleUpdateTrialConfig('trialDays', d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            (currentTrial.trialDays || 14) === d
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {d} দিন
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      ট্রায়াল প্ল্যান শিরোনাম / নাম (বাংলা):
                    </label>
                    <input
                      type="text"
                      value={currentTrial.trialPlanName || `ফ্রি ট্রায়াল (${currentTrial.trialDays || 14} দিন)`}
                      onChange={(e) => handleUpdateTrialConfig('trialPlanName', e.target.value)}
                      placeholder="যেমন: ফ্রি ট্রায়াল (১৪ দিন)"
                      className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="bg-amber-950/20 border border-amber-500/20 p-4 sm:p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>দোকানদার রেজিস্ট্রেশন প্রিভিউ</span>
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      নতুন কোনো গ্রাহক রেজিস্ট্রেশন করার সাথে সাথে সে কোনো টাকা ছাড়াই <strong>{currentTrial.trialDays || 14} দিন</strong> মেয়াদের পূর্ণ সুবিধা পাবে। মেয়াদ শেষ হওয়ার আগ পর্যন্ত অ্যাপটি কোনো সীমাবদ্ধতা ছাড়া চলবে।
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>প্যাকেজ নাম:</span>
                      <span className="font-bold text-white">{currentTrial.trialPlanName || `ফ্রি ট্রায়াল (${currentTrial.trialDays || 14} দিন)`}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>প্রারম্ভিক মেয়াদ:</span>
                      <span className="font-mono font-bold text-amber-400">রেজিস্ট্রেশন তারিখ + {currentTrial.trialDays || 14} দিন</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>মূল্য:</span>
                      <span className="font-bold text-emerald-400">৳০ (বিনামূল্যে)</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  <strong>ফ্রি ট্রায়াল বন্ধ রাখা হয়েছে:</strong> নতুন কোনো দোকানদার একাউন্ট তৈরি করলে তাকে সরাসরি সাবস্ক্রিপশন পেইড প্যাকেজ কিনতে হবে, কোনো ফ্রি মেয়াদ স্বয়ংক্রিয়ভাবে পাবে না।
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Bonus Offer Setting */}
          <div className="p-6 rounded-3xl bg-[#0D1424] border border-teal-500/30 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>প্রমোশনাল বোনাস অফার দিন নিয়ন্ত্রণ</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      currentBonus.isBonusEnabled !== false
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {currentBonus.isBonusEnabled !== false ? '🟢 চালু রয়েছে' : '🔴 বন্ধ রয়েছে'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    সাবস্ক্রিপশন ক্রয় বা রিনিউ করার সময় গ্রাহককে অতিরিক্ত উপহার দিন (যেমন: +৭ দিন ফ্রি) যোগ করুন
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">বোনাস অফার স্ট্যাটাস:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentBonus.isBonusEnabled !== false}
                    onChange={(e) => handleUpdateBonusConfig('isBonusEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500" />
                </label>
              </div>
            </div>

            {currentBonus.isBonusEnabled !== false ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                      <span>অতিরিক্ত বোনাস দিন সংখ্যা:</span>
                      <span className="text-teal-400 font-mono font-black text-sm">
                        +{currentBonus.bonusDays || 7} দিন ফ্রি
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={currentBonus.bonusDays ?? 7}
                        onChange={(e) => handleUpdateBonusConfig('bonusDays', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-semibold mr-1">কুইক সিলেক্ট:</span>
                      {[0, 3, 5, 7, 10, 15, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleUpdateBonusConfig('bonusDays', d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            (currentBonus.bonusDays ?? 7) === d
                              ? 'bg-teal-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {d === 0 ? '০ দিন (কোন বোনাস নেই)' : `+${d} দিন`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      অফার শিরোনাম (ইউজারের জন্য প্রদর্শিত):
                    </label>
                    <input
                      type="text"
                      value={currentBonus.bonusTitle || `স্পেশাল বোনাস অফার (+${currentBonus.bonusDays || 7} দিন ফ্রি)`}
                      onChange={(e) => handleUpdateBonusConfig('bonusTitle', e.target.value)}
                      placeholder="যেমন: স্পেশাল বোনাস অফার (+৭ দিন ফ্রি)"
                      className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      অফারের বিবরণ:
                    </label>
                    <textarea
                      rows={2}
                      value={currentBonus.bonusDescription || ''}
                      onChange={(e) => handleUpdateBonusConfig('bonusDescription', e.target.value)}
                      placeholder="অফারের নিয়ম ও বর্ণনা..."
                      className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>

                <div className="bg-teal-950/20 border border-teal-500/20 p-4 sm:p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-teal-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-teal-400" />
                      <span>লাইভ বোনাস ক্যালকুলেটর প্রিভিউ</span>
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      গ্রাহক যখন যেকোনো পেইড প্যাকেজ নির্বাচন করবেন, সুপার অ্যাডমিন পেমেন্ট অ্যাপ্রুভ করার সাথে সাথে মূল মেয়াদের সাথে এই বোনাস দিন স্বয়ংক্রিয়ভাবে যোগ হবে।
                    </p>
                  </div>

                  {/* Dynamic calculation examples */}
                  <div className="space-y-2">
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-400">১ মাসের প্যাকেজ (৩০ দিন):</span>
                      <span className="font-mono font-bold text-teal-300">
                        ৩০ + {currentBonus.bonusDays || 7} = <strong>{(30 + (currentBonus.bonusDays || 7))} দিন</strong> মেয়াদ পাবে
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-400">২ মাসের প্যাকেজ (৬০ দিন):</span>
                      <span className="font-mono font-bold text-teal-300">
                        ৬০ + {currentBonus.bonusDays || 7} = <strong>{(60 + (currentBonus.bonusDays || 7))} দিন</strong> মেয়াদ পাবে
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-400">১ বছরের প্যাকেজ (৩৬৫ দিন):</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ৩৬৫ + {currentBonus.bonusDays || 7} = <strong>{(365 + (currentBonus.bonusDays || 7))} দিন</strong> মেয়াদ পাবে
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  <strong>বোনাস অফার বন্ধ রাখা হয়েছে:</strong> গ্রাহক সাবস্ক্রিপশন ক্রয় বা রিনিউ করলে শুধুমাত্র প্যাকেজের নির্ধারিত মূল দিনগুলো মেয়াদ হিসেবে পাবে, কোনো অতিরিক্ত বোনাস দিন যোগ হবে না।
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. SUBSCRIPTION PACKAGES & DURATION MANAGEMENT */}
      {activeSubTab === 'packages' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">সাবস্ক্রিপশন প্যাকেজ, মেয়াদ ও প্রাইসিং নিয়ন্ত্রণ</h4>
                <p className="text-xs text-slate-400">
                  দোকানদারদের জন্য প্রতিটি প্যাকেজের মূল্য (৳), মেয়াদ (দিন), ব্যাজ ও ফিচার ইচ্ছেমতো বাড়াতে/কমাতে বা চালু/বন্ধ করতে পারবেন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultPlans}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                title="ডিফল্ট ৪টি প্যাকেজে রিসেট করুন"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ডিফল্ট রিসেট</span>
              </button>

              <button
                type="button"
                onClick={handleAddNewPlan}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন প্যাকেজ যোগ করুন</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(formData.customPlans || DEFAULT_PLANS).map((plan, idx) => (
              <div
                key={plan.id || idx}
                className={`p-5 rounded-3xl border transition-all shadow-xl space-y-3.5 relative ${
                  plan.isEnabled !== false
                    ? 'bg-[#0D1424] border-indigo-500/20'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                }`}
              >
                {/* Header & Controls */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-400">প্যাকেজ #{idx + 1}</span>
                    {plan.isEnabled === false && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                        নিষ্ক্রিয় (Disabled)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Enable/Disable Switch */}
                    <label className="flex items-center gap-1 cursor-pointer" title="প্যাকেজটি চালু বা বন্ধ রাখুন">
                      <input
                        type="checkbox"
                        checked={plan.isEnabled !== false}
                        onChange={(e) => handleUpdatePlan(idx, 'isEnabled', e.target.checked)}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-400">
                        {plan.isEnabled !== false ? 'চালু' : 'বন্ধ'}
                      </span>
                    </label>

                    {/* Popular Badge Switch */}
                    <label className="flex items-center gap-1 cursor-pointer" title="পপুলার ব্যাজ যুক্ত করুন">
                      <input
                        type="checkbox"
                        checked={Boolean(plan.isPopular)}
                        onChange={(e) => handleUpdatePlan(idx, 'isPopular', e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-amber-400">পপুলার</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemovePlan(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="প্যাকেজ মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">প্যাকেজের নাম (বাংলা)</label>
                    <input
                      type="text"
                      value={plan.nameBn}
                      onChange={(e) => handleUpdatePlan(idx, 'nameBn', e.target.value)}
                      placeholder="১ মাস (স্ট্যান্ডার্ড)"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মূল্য (টাকা ৳)</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => handleUpdatePlan(idx, 'price', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মেয়াদ (দিন)</label>
                      <input
                        type="number"
                        value={plan.durationDays}
                        onChange={(e) => handleUpdatePlan(idx, 'durationDays', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-teal-300 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">আগের মূল্য / ডিসকাউন্ট (৳)</label>
                      <input
                        type="number"
                        value={plan.originalPrice || ''}
                        onChange={(e) => handleUpdatePlan(idx, 'originalPrice', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="যেমন: ১০০"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ব্যাজ টেক্সট (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={plan.badge || ''}
                        onChange={(e) => handleUpdatePlan(idx, 'badge', e.target.value)}
                        placeholder="যেমন: সেরা অফার"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">ফিচারসমূহ (কমা দিয়ে আলাদা করুন):</label>
                    <textarea
                      rows={2}
                      value={(plan.features || []).join(', ')}
                      onChange={(e) => handleUpdatePlan(idx, 'features', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      placeholder="সম্পূর্ণ আনলিমিটেড হিসাব, ফ্রি এসএমএস অ্যালার্ট..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. MFS WALLET CHANNELS */}
      {activeSubTab === 'mfs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* bKash */}
          <div className="p-5 rounded-3xl bg-[#0D1424] border border-pink-500/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-sm">
                  ৳
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">বিকাশ (bKash)</h4>
                  <p className="text-[11px] text-slate-400">সেন্ড মানি ও মার্চেন্ট পেমেন্ট</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {formData.bkash.isEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.bkash.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bkash: { ...prev.bkash, isEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বিকাশ পার্সোনাল / মার্চেন্ট নম্বর</label>
                <input
                  type="text"
                  value={formData.bkash.personal.number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bkash: {
                        ...prev.bkash,
                        personal: { ...prev.bkash.personal, number: e.target.value },
                      },
                    }))
                  }
                  placeholder="01619665875"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">নির্দেশনা (গ্রাহককে কী দেখানো হবে)</label>
                <textarea
                  rows={2}
                  value={formData.bkash.personal.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bkash: {
                        ...prev.bkash,
                        personal: { ...prev.bkash.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Nagad */}
          <div className="p-5 rounded-3xl bg-[#0D1424] border border-orange-500/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-sm">
                  ৳
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">নগদ (Nagad)</h4>
                  <p className="text-[11px] text-slate-400">সেন্ড মানি ও মার্চেন্ট পেমেন্ট</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {formData.nagad.isEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.nagad.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nagad: { ...prev.nagad, isEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">নগদ পার্সোনাল / মার্চেন্ট নম্বর</label>
                <input
                  type="text"
                  value={formData.nagad.personal.number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nagad: {
                        ...prev.nagad,
                        personal: { ...prev.nagad.personal, number: e.target.value },
                      },
                    }))
                  }
                  placeholder="01619665875"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">নির্দেশনা (গ্রাহককে কী দেখানো হবে)</label>
                <textarea
                  rows={2}
                  value={formData.nagad.personal.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nagad: {
                        ...prev.nagad,
                        personal: { ...prev.nagad.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Rocket */}
          <div className="p-5 rounded-3xl bg-[#0D1424] border border-purple-500/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-sm">
                  ৳
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">রকেট (Rocket / DBBL)</h4>
                  <p className="text-[11px] text-slate-400">ডাচ বাংলা ব্যাংক মোবাইল ব্যাংকিং</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {formData.rocket.isEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.rocket.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rocket: { ...prev.rocket, isEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">রকেট একাউন্ট নম্বর (১২ ডিজিট)</label>
                <input
                  type="text"
                  value={formData.rocket.personal.number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rocket: {
                        ...prev.rocket,
                        personal: { ...prev.rocket.personal, number: e.target.value },
                      },
                    }))
                  }
                  placeholder="01619665875-8"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">নির্দেশনা</label>
                <textarea
                  rows={2}
                  value={formData.rocket.personal.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rocket: {
                        ...prev.rocket,
                        personal: { ...prev.rocket.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Upay */}
          <div className="p-5 rounded-3xl bg-[#0D1424] border border-blue-500/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm">
                  ৳
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">উপায় (Upay / UCB)</h4>
                  <p className="text-[11px] text-slate-400">ইউসিবি মোবাইল ওয়ালেট</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {formData.upay.isEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.upay.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      upay: { ...prev.upay, isEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">উপায় নম্বর</label>
                <input
                  type="text"
                  value={formData.upay.personal.number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      upay: {
                        ...prev.upay,
                        personal: { ...prev.upay.personal, number: e.target.value },
                      },
                    }))
                  }
                  placeholder="01619665875"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">নির্দেশনা</label>
                <textarea
                  rows={2}
                  value={formData.upay.personal.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      upay: {
                        ...prev.upay,
                        personal: { ...prev.upay.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BANK TRANSFER CHANNELS */}
      {activeSubTab === 'bank' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">ব্যাংক অ্যাকাউন্ট ট্রান্সফার</h4>
                <p className="text-xs text-slate-400">
                  সরাসরি ব্যাংক ডিপোজিট ও অনলাইন ট্রান্সফার (BEFTN/NPSB/RTGS) এর জন্য অ্যাকাউন্টসমূহ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">
                  ব্যাংক পেমেন্ট {formData.bankTransfer.isEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <input
                  type="checkbox"
                  checked={formData.bankTransfer.isEnabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bankTransfer: { ...prev.bankTransfer, isEnabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={handleAddBankAccount}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন ব্যাংক অ্যাকাউন্ট যোগ করুন</span>
              </button>
            </div>
          </div>

          {formData.bankTransfer.accounts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-3xl border border-dashed border-slate-800 space-y-2">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">কোন ব্যাংক অ্যাকাউন্ট যুক্ত করা হয়নি</p>
              <p className="text-[11px] text-slate-500">গ্রাহকদের জন্য আপনার ব্যাংক অ্যাকাউন্ট তথ্য যোগ করুন</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.bankTransfer.accounts.map((acc, idx) => (
                <div key={idx} className="p-5 rounded-3xl bg-[#0D1424] border border-slate-800 shadow-xl space-y-3 relative">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black text-indigo-400">ব্যাংক #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ব্যাংকের নাম *</label>
                      <input
                        type="text"
                        value={acc.bankName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'bankName', e.target.value)}
                        placeholder="যেমন: Islami Bank Bangladesh Ltd, City Bank, DBBL"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">অ্যাকাউন্টের নাম</label>
                        <input
                          type="text"
                          value={acc.accountName}
                          onChange={(e) => handleUpdateBankAccount(idx, 'accountName', e.target.value)}
                          placeholder="M/S Twing Enterprise"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">অ্যাকাউন্ট নম্বর *</label>
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={(e) => handleUpdateBankAccount(idx, 'accountNumber', e.target.value)}
                          placeholder="2050XXXXXXXXXXXXX"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">শাখা (Branch)</label>
                        <input
                          type="text"
                          value={acc.branchName || ''}
                          onChange={(e) => handleUpdateBankAccount(idx, 'branchName', e.target.value)}
                          placeholder="ধানমন্ডি শাখা, ঢাকা"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">রাউটিং নম্বর (ঐচ্ছিক)</label>
                        <input
                          type="text"
                          value={acc.routingNumber || ''}
                          onChange={(e) => handleUpdateBankAccount(idx, 'routingNumber', e.target.value)}
                          placeholder="125XXXXXXXX"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. AUTOMATED PAYMENT GATEWAYS */}
      {activeSubTab === 'gateway' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Globe2 className="w-5 h-5 text-teal-400" />
              <div>
                <h4 className="text-sm font-bold text-white">অটোমেটেড পেমেন্ট গেটওয়ে প্রশাসন</h4>
                <p className="text-xs text-slate-400">
                  বিকাশ মার্চেন্ট এপিআই, নগদ ডিরেক্ট, SSLCommerz, ShurjoPay, AamarPay বা কাস্টম গেটওয়ে
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddGatewayModal(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কাস্টম গেটওয়ে যোগ করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.gateways || []).map((gtw, idx) => (
              <div key={idx} className="p-5 rounded-3xl bg-[#0D1424] border border-teal-500/20 shadow-xl space-y-3.5 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-white">{gtw.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gtw.isEnabled}
                        onChange={(e) => handleUpdateGateway(idx, 'isEnabled', e.target.checked)}
                        className="w-3.5 h-3.5 accent-teal-500 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-400">
                        {gtw.isEnabled ? 'চালু' : 'বন্ধ'}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveGateway(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">গেটওয়ে আইডি</label>
                      <input
                        type="text"
                        value={gtw.gatewayId}
                        disabled
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">পরিবেশ (Environment)</label>
                      <select
                        value={gtw.isLive ? 'live' : 'sandbox'}
                        onChange={(e) => handleUpdateGateway(idx, 'isLive', e.target.value === 'live')}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="sandbox">Sandbox / Test Mode</option>
                        <option value="live">Production / Live Mode</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">App Key / Store ID</label>
                    <input
                      type="text"
                      value={gtw.appKey || ''}
                      onChange={(e) => handleUpdateGateway(idx, 'appKey', e.target.value)}
                      placeholder="e.g. bkash_live_app_key_..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">App Secret / Store Password</label>
                    <input
                      type="password"
                      value={gtw.appSecret || ''}
                      onChange={(e) => handleUpdateGateway(idx, 'appSecret', e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মার্চেন্ট নম্বর / ইউআরএল</label>
                    <input
                      type="text"
                      value={gtw.merchantNumber || ''}
                      onChange={(e) => handleUpdateGateway(idx, 'merchantNumber', e.target.value)}
                      placeholder="01619665875"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">নোট / বিবরণ</label>
                    <input
                      type="text"
                      value={gtw.notes || ''}
                      onChange={(e) => handleUpdateGateway(idx, 'notes', e.target.value)}
                      placeholder="অটোমেটেড গেটওয়ে পেমেন্ট"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Gateway Modal */}
      {showAddGatewayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0D1424] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-teal-400" />
                <span>নতুন কাস্টম পেমেন্ট গেটওয়ে যোগ করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddGatewayModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">গেটওয়ের নাম *</label>
                <input
                  type="text"
                  value={newGatewayName}
                  onChange={(e) => setNewGatewayName(e.target.value)}
                  placeholder="যেমন: UddoktaPay, Aamarpay, My Custom Gateway"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">গেটওয়ে আইডি (ID)</label>
                <input
                  type="text"
                  value={newGatewayId}
                  onChange={(e) => setNewGatewayId(e.target.value)}
                  placeholder="uddoktapay_direct"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">API Key / Store ID</label>
                <input
                  type="text"
                  value={newGatewayAppKey}
                  onChange={(e) => setNewGatewayAppKey(e.target.value)}
                  placeholder="আপনার গেটওয়ে এপিআই কি"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Secret / Auth Token</label>
                <input
                  type="password"
                  value={newGatewayAppSecret}
                  onChange={(e) => setNewGatewayAppSecret(e.target.value)}
                  placeholder="সিক্রেট বা টোকেন"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">মার্চেন্ট ফোন বা ইউআরএল</label>
                <input
                  type="text"
                  value={newGatewayMerchantNum}
                  onChange={(e) => setNewGatewayMerchantNum(e.target.value)}
                  placeholder="01619665875"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বর্ণনা / নির্দেশিকা</label>
                <input
                  type="text"
                  value={newGatewayNotes}
                  onChange={(e) => setNewGatewayNotes(e.target.value)}
                  placeholder="অটোমেটিক অনলাইন পেমেন্ট"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddGatewayModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleAddNewCustomGateway}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition cursor-pointer"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};