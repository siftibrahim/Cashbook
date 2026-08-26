import React, { useState } from 'react';
import {
  SystemPaymentSettings,
  BankAccountDetails,
  PaymentGatewayConfig,
  SubscriptionPlan,
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
  const [activeSubTab, setActiveSubTab] = useState<'mfs' | 'bank' | 'gateway' | 'packages'>('mfs');
  const [formData, setFormData] = useState<SystemPaymentSettings>({
    ...settings,
    customPlans: settings.customPlans && settings.customPlans.length > 0 ? settings.customPlans : DEFAULT_PLANS,
    gateways: settings.gateways && settings.gateways.length > 0 ? settings.gateways : [
      {
        gatewayId: 'bkash_direct',
        name: 'bKash Official Direct Gateway (Tokenized API)',
        isEnabled: false,
        isLive: false,
        merchantNumber: '01306908115',
        notes: 'অফিসিয়াল বিকাশ মার্চেন্ট এপিআই দিয়ে অটোমেটিক চেকআউট।',
      },
      {
        gatewayId: 'nagad_direct',
        name: 'Nagad Direct Checkout API',
        isEnabled: false,
        isLive: false,
        merchantNumber: '01306908115',
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
      onShowToast('✅ সকল পেমেন্ট মেথড, গেটওয়ে ও প্যাকেজ সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ সংরক্ষণ ব্যর্থ হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
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
      nameBn: 'কাস্টম প্যাকেজ',
      price: 500,
      originalPrice: 700,
      durationDays: 60,
      features: ['সম্পূর্ণ আনলিমিটেড হিসাব', 'ফ্রি এসএমএস অ্যালার্ট', '২৪/৭ সাপোর্ট'],
      isPopular: false,
    };
    setFormData((prev) => ({
      ...prev,
      customPlans: [...(prev.customPlans || DEFAULT_PLANS), newPlan],
    }));
  };

  const handleRemovePlan = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customPlans: (prev.customPlans || DEFAULT_PLANS).filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Save Action */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131E36] to-[#0F172A] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 p-0.5 shadow-lg flex items-center justify-center text-white shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>পেমেন্ট সেটিংস ও গেটওয়ে প্রশাসন</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30">
                Live Admin Settings
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              বিকাশ, নগদ, রকেট, উপায়, ব্যাংক অ্যাকাউন্ট ও অটোমেটেড অনলাইন পেমেন্ট গেটওয়ে কনফিগার করুন
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

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
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
          <span>সাবস্ক্রিপশন প্যাকেজ প্রাইসিং ({formData.customPlans?.length || 0})</span>
        </button>
      </div>

      {/* 1. MFS WALLET CHANNELS */}
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
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  বিকাশ পার্সোনাল নম্বর (সেন্ড মানি)
                </label>
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
                  placeholder="01306908115"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  বিকাশ মার্চেন্ট নম্বর (পেমেন্ট - ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={formData.bkash.merchant?.number || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bkash: {
                        ...prev.bkash,
                        merchant: {
                          number: e.target.value,
                          accountType: 'merchant',
                          instructions: 'বিকাশ মেক পেমেন্ট করুন',
                        },
                      },
                    }))
                  }
                  placeholder="01306908115 (মার্চেন্ট নম্বর)"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  ইউজারদের জন্য নির্দেশিকা
                </label>
                <input
                  type="text"
                  value={formData.bkash.personal.instructions || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bkash: {
                        ...prev.bkash,
                        personal: { ...prev.bkash.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  placeholder="বিকাশ অ্যাপ থেকে Send Money করুন এবং TrxID দিন।"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
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
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  নগদ পার্সোনাল নম্বর (সেন্ড মানি)
                </label>
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
                  placeholder="01306908115"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  ইউজারদের জন্য নির্দেশিকা
                </label>
                <input
                  type="text"
                  value={formData.nagad.personal.instructions || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nagad: {
                        ...prev.nagad,
                        personal: { ...prev.nagad.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  placeholder="নগদ অ্যাপ বা *167# থেকে Send Money করুন।"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
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
                  <h4 className="text-sm font-black text-white">রকেট (Rocket)</h4>
                  <p className="text-[11px] text-slate-400">ডাচ-বাংলা মোবাইল ব্যাংকিং</p>
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
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  রকেট নম্বর (১২ ডিজিট - চেক ডিজিট সহ)
                </label>
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
                  placeholder="01306908115-8"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  ইউজারদের জন্য নির্দেশিকা
                </label>
                <input
                  type="text"
                  value={formData.rocket.personal.instructions || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rocket: {
                        ...prev.rocket,
                        personal: { ...prev.rocket.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  placeholder="রকেট অ্যাপ থেকে Send Money করুন।"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Upay */}
          <div className="p-5 rounded-3xl bg-[#0D1424] border border-cyan-500/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm">
                  ৳
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">উপায় (Upay)</h4>
                  <p className="text-[11px] text-slate-400">UCB মোবাইল ফাইন্যান্সিয়াল সার্ভিস</p>
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
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  উপায় নম্বর
                </label>
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
                  placeholder="01306908115"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  ইউজারদের জন্য নির্দেশিকা
                </label>
                <input
                  type="text"
                  value={formData.upay.personal.instructions || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      upay: {
                        ...prev.upay,
                        personal: { ...prev.upay.personal, instructions: e.target.value },
                      },
                    }))
                  }
                  placeholder="উপায় অ্যাপ থেকে সেন্ড মানি করুন।"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. BANK TRANSFER ACCOUNTS */}
      {activeSubTab === 'bank' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">সরাসরি ব্যাংক অ্যাকাউন্ট তালিকা</h4>
                <p className="text-xs text-slate-400">
                  ইউজাররা এই অ্যাকাউন্টগুলোতে ট্রান্সফার বা ডিপোজিট করে ট্রানজেকশন স্লিপ সাবমিট করতে পারবে
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-300">
                  {formData.bankTransfer.isEnabled ? 'ব্যাংক ট্রান্সফার চালু' : 'বন্ধ'}
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
            <div className="p-8 text-center rounded-3xl bg-[#0D1424] border border-slate-800 text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-300">কোনো ব্যাংক অ্যাকাউন্ট যুক্ত করা হয়নি</p>
              <p className="text-xs text-slate-500 mt-1">উপরের বাটনে ক্লিক করে আপনার অফিশিয়াল ব্যাংক হিসাব যোগ করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.bankTransfer.accounts.map((acc, idx) => (
                <div key={idx} className="p-5 rounded-3xl bg-[#0D1424] border border-slate-800 shadow-xl space-y-3 relative group">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-black text-indigo-400">ব্যাংক অ্যাকাউন্ট #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(idx)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer"
                      title="অ্যাকাউন্ট মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ব্যাংকের নাম</label>
                      <input
                        type="text"
                        value={acc.bankName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'bankName', e.target.value)}
                        placeholder="যেমন: Islami Bank Bangladesh Ltd"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">অ্যাকাউন্টধারীর নাম</label>
                      <input
                        type="text"
                        value={acc.accountName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'accountName', e.target.value)}
                        placeholder="Twing Software"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">অ্যাকাউন্ট নম্বর</label>
                      <input
                        type="text"
                        value={acc.accountNumber}
                        onChange={(e) => handleUpdateBankAccount(idx, 'accountNumber', e.target.value)}
                        placeholder="2050213020198765"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">শাখা (Branch)</label>
                      <input
                        type="text"
                        value={acc.branchName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'branchName', e.target.value)}
                        placeholder="Mirpur-10 Branch"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">রাউটিং নম্বর (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        value={acc.routingNumber}
                        onChange={(e) => handleUpdateBankAccount(idx, 'routingNumber', e.target.value)}
                        placeholder="125262789"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ডিপোজিট নির্দেশিকা</label>
                      <input
                        type="text"
                        value={acc.instructions || ''}
                        onChange={(e) => handleUpdateBankAccount(idx, 'instructions', e.target.value)}
                        placeholder="NPSB/BEFTN ট্রান্সফার করুন।"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. AUTOMATED PAYMENT GATEWAYS */}
      {activeSubTab === 'gateway' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Globe2 className="w-5 h-5 text-teal-400" />
              <div>
                <h4 className="text-sm font-bold text-white">অটোমেটিক অনলাইন পেমেন্ট গেটওয়ে</h4>
                <p className="text-xs text-slate-400">
                  ইনস্ট্যান্ট অটো-ভেরিফিকেশন ও অনলাইন চেকআউট এপিআই ইন্টিগ্রেশন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddGatewayModal(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>কাস্টম গেটওয়ে যোগ করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.gateways || []).map((gtw, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-3xl border transition shadow-xl space-y-3.5 ${
                  gtw.isEnabled
                    ? 'bg-[#0D1424] border-teal-500/30'
                    : 'bg-slate-900/60 border-slate-800 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                      API
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{gtw.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">{gtw.gatewayId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-700">
                      <span className="text-[11px] font-bold text-slate-300">
                        {gtw.isEnabled ? 'সক্রিয়' : 'বন্ধ'}
                      </span>
                      <input
                        type="checkbox"
                        checked={gtw.isEnabled}
                        onChange={(e) => handleUpdateGateway(idx, 'isEnabled', e.target.checked)}
                        className="w-3.5 h-3.5 accent-teal-500 rounded cursor-pointer"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveGateway(idx)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400">পরিবেশ (Environment)</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateGateway(idx, 'isLive', false)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          !gtw.isLive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500'
                        }`}
                      >
                        Sandbox / Test
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateGateway(idx, 'isLive', true)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          gtw.isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500'
                        }`}
                      >
                        Production Live
                      </button>
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
                      placeholder="01306908115"
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

      {/* 4. SUBSCRIPTION PACKAGES PRICING */}
      {activeSubTab === 'packages' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">সাবস্ক্রিপশন প্ল্যান ও প্রাইসিং</h4>
                <p className="text-xs text-slate-400">
                  দোকানদার ইউজারদের জন্য সাবস্ক্রিপশন প্যাকেজের মূল্য, মেয়াদ ও অফার নিয়ন্ত্রণ করুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddNewPlan}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন প্যাকেজ যোগ করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(formData.customPlans || DEFAULT_PLANS).map((plan, idx) => (
              <div key={idx} className="p-5 rounded-3xl bg-[#0D1424] border border-indigo-500/20 shadow-xl space-y-3.5 relative">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-black text-indigo-400">প্যাকেজ #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(plan.isPopular)}
                        onChange={(e) => handleUpdatePlan(idx, 'isPopular', e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-amber-400">পপুলার ব্যাজ</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemovePlan(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
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
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মূল্য (টাকা)</label>
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
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">আগের মূল্য / ডিসকাউন্ট (ঐচ্ছিক)</label>
                    <input
                      type="number"
                      value={plan.originalPrice || ''}
                      onChange={(e) => handleUpdatePlan(idx, 'originalPrice', Number(e.target.value))}
                      placeholder="যেমন: ৫০০"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
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
                  placeholder="01306908115"
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
