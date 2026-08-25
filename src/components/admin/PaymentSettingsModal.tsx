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
} from 'lucide-react';

interface PaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemPaymentSettings;
  onSaveSettings: (settings: SystemPaymentSettings) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PaymentSettingsModal: React.FC<PaymentSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'mfs' | 'bank' | 'packages' | 'gateway'>('mfs');
  const [formData, setFormData] = useState<SystemPaymentSettings>({
    ...settings,
    customPlans: settings.customPlans && settings.customPlans.length > 0 ? settings.customPlans : DEFAULT_PLANS,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(formData);
      onShowToast('✅ পেমেন্ট ও প্যাকেজ সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!');
      onClose();
    } catch (err: any) {
      onShowToast(`❌ সংরক্ষণ ব্যর্থ হয়েছে: ${err.message || 'Error'}`);
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
      instructions: 'অনলাইন ব্যাংক ট্রান্সফার করুন।',
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

  const handleUpdatePlan = (index: number, field: keyof SubscriptionPlan, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.customPlans || DEFAULT_PLANS)];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, customPlans: copy };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#0D1424] w-full max-w-3xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-800 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">পেমেন্ট মেথড ও প্যাকেজ কনফিগারেশন</h3>
              <p className="text-xs text-slate-400">bKash, Nagad, Rocket, Upay, Bank, Plans ও Gateways নিয়ন্ত্রণ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 py-3 shrink-0 overflow-x-auto no-scrollbar border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('mfs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'mfs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MFS ওয়ালেট (বিকাশ / নগদ / রকেট / উপায়)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'bank'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ব্যাংক ট্রান্সফার ({formData.bankTransfer.accounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'packages'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>প্যাকেজ ও মূল্য নির্ধারণ (৳50, ৳100, ৳200, ৳500)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'gateway'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span>গেটওয়ে API কনফিগ</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1 space-y-4">
          {/* 1. MFS WALLETS */}
          {activeTab === 'mfs' && (
            <div className="space-y-4">
              {/* bKash */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-pink-500 inline-block" />
                    <h4 className="text-sm font-black text-white">bKash (বিকাশ)</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formData.bkash.isEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bkash: { ...formData.bkash, isEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                    />
                    <span className={formData.bkash.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                      {formData.bkash.isEnabled ? 'চালু (Active)' : 'বন্ধ (Disabled)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      বিকাশ পার্সোনাল নম্বর (Send Money):
                    </label>
                    <input
                      type="text"
                      value={formData.bkash.personal.number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bkash: {
                            ...formData.bkash,
                            personal: { ...formData.bkash.personal, number: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">পেমেন্ট নির্দেশিকা:</label>
                    <input
                      type="text"
                      value={formData.bkash.personal.instructions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bkash: {
                            ...formData.bkash,
                            personal: { ...formData.bkash.personal, instructions: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Nagad */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                    <h4 className="text-sm font-black text-white">Nagad (নগদ)</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formData.nagad.isEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nagad: { ...formData.nagad, isEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                    />
                    <span className={formData.nagad.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                      {formData.nagad.isEnabled ? 'চালু (Active)' : 'বন্ধ (Disabled)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      নগদ পার্সোনাল নম্বর (Send Money):
                    </label>
                    <input
                      type="text"
                      value={formData.nagad.personal.number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nagad: {
                            ...formData.nagad,
                            personal: { ...formData.nagad.personal, number: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">পেমেন্ট নির্দেশিকা:</label>
                    <input
                      type="text"
                      value={formData.nagad.personal.instructions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nagad: {
                            ...formData.nagad,
                            personal: { ...formData.nagad.personal, instructions: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rocket */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                    <h4 className="text-sm font-black text-white">Rocket (রকেট)</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formData.rocket.isEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rocket: { ...formData.rocket, isEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                    />
                    <span className={formData.rocket.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                      {formData.rocket.isEnabled ? 'চালু (Active)' : 'বন্ধ (Disabled)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      রকেট ১২-ডিজিট নম্বর (সহ চেক ডিজিট):
                    </label>
                    <input
                      type="text"
                      value={formData.rocket.personal.number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rocket: {
                            ...formData.rocket,
                            personal: { ...formData.rocket.personal, number: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Upay */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                    <h4 className="text-sm font-black text-white">Upay (উপায়)</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={formData.upay.isEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upay: { ...formData.upay, isEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <span className={formData.upay.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                      {formData.upay.isEnabled ? 'চালু (Active)' : 'বন্ধ (Disabled)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      উপায় পার্সোনাল নম্বর:
                    </label>
                    <input
                      type="text"
                      value={formData.upay.personal.number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upay: {
                            ...formData.upay,
                            personal: { ...formData.upay.personal, number: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. BANK ACCOUNTS */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800">
                <div className="text-xs">
                  <span className="font-bold text-white">ব্যাংক পেমেন্ট সার্ভিস</span>
                  <p className="text-slate-400">ইউজারদের চেকআউট পেজে ব্যাংক একাউন্টের তথ্য প্রদর্শন</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={formData.bankTransfer.isEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankTransfer: { ...formData.bankTransfer, isEnabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                  <span className={formData.bankTransfer.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                    {formData.bankTransfer.isEnabled ? 'চালু (Active)' : 'বন্ধ (Disabled)'}
                  </span>
                </label>
              </div>

              {formData.bankTransfer.accounts.map((acc, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-300">
                      ব্যাংক অ্যাকাউন্ট #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">ব্যাংকের নাম (Bank Name):</label>
                      <input
                        type="text"
                        value={acc.bankName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'bankName', e.target.value)}
                        placeholder="যেমন: Islami Bank Bangladesh Ltd"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">হিসাবের নাম (Account Name):</label>
                      <input
                        type="text"
                        value={acc.accountName}
                        onChange={(e) => handleUpdateBankAccount(idx, 'accountName', e.target.value)}
                        placeholder="যেমন: Ibrahim Khalil"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">অ্যাকাউন্ট নম্বর (Account No):</label>
                      <input
                        type="text"
                        value={acc.accountNumber}
                        onChange={(e) => handleUpdateBankAccount(idx, 'accountNumber', e.target.value)}
                        placeholder="2050..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">ব্রাঞ্চ ও রাউটিং নম্বর:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={acc.branchName}
                          onChange={(e) => handleUpdateBankAccount(idx, 'branchName', e.target.value)}
                          placeholder="ব্রাঞ্চ"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={acc.routingNumber}
                          onChange={(e) => handleUpdateBankAccount(idx, 'routingNumber', e.target.value)}
                          placeholder="রাউটিং"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddBankAccount}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-dashed border-indigo-500/40 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন ব্যাংক অ্যাকাউন্ট যোগ করুন</span>
              </button>
            </div>
          )}

          {/* 3. DYNAMIC PACKAGES & PRICING */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
                <span className="font-bold text-white">সাবস্ক্রিপশন প্যাকেজ মূল্য ও মেয়াদ কনফিগারেশন</span>
                <p className="text-slate-400">আপনার পছন্দমতো প্যাকেজের নাম, দাম ও মেয়াদ দিন পরিবর্তন করতে পারবেন।</p>
              </div>

              {(formData.customPlans || DEFAULT_PLANS).map((plan, idx) => (
                <div key={plan.id} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-300">
                      প্যাকেজ #{idx + 1} ({plan.id})
                    </span>
                    {plan.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">প্যাকেজের নাম (বাংলা):</label>
                      <input
                        type="text"
                        value={plan.nameBn}
                        onChange={(e) => handleUpdatePlan(idx, 'nameBn', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-bold focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">মূল্য (টাকা ৳):</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => handleUpdatePlan(idx, 'price', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-black font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">মেয়াদ (দিন):</label>
                      <input
                        type="number"
                        value={plan.durationDays}
                        onChange={(e) => handleUpdatePlan(idx, 'durationDays', Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. FUTURE GATEWAYS & API */}
          {activeTab === 'gateway' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-white">গেটওয়ে এপিআই আর্কিটেকচার</span>
                  <p className="text-slate-300 mt-0.5">
                    ভবিষ্যতে মার্চেন্ট এপিআই (bKash Direct, Nagad API, SSLCommerz) কানেক্ট করার জন্য এপিআই কি ও সিক্রেট ব্যাকএন্ডে সংরক্ষিত থাকবে।
                  </p>
                </div>
              </div>

              {formData.gateways.map((gw, idx) => (
                <div key={gw.gatewayId} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-black text-white">{gw.name}</h4>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={gw.isEnabled}
                        onChange={(e) => {
                          const copy = [...formData.gateways];
                          copy[idx] = { ...copy[idx], isEnabled: e.target.checked };
                          setFormData({ ...formData, gateways: copy });
                        }}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                      <span className={gw.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                        {gw.isEnabled ? 'গেটওয়ে চালু' : 'গেটওয়ে বন্ধ'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">মার্চেন্ট / অ্যাপ কি (App Key):</label>
                      <input
                        type="text"
                        value={gw.appKey || ''}
                        placeholder="যেমন: live_app_key_..."
                        onChange={(e) => {
                          const copy = [...formData.gateways];
                          copy[idx] = { ...copy[idx], appKey: e.target.value };
                          setFormData({ ...formData, gateways: copy });
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">অ্যাপ সিক্রেট (App Secret):</label>
                      <input
                        type="password"
                        value={gw.appSecret || ''}
                        placeholder="••••••••••••••••"
                        onChange={(e) => {
                          const copy = [...formData.gateways];
                          copy[idx] = { ...copy[idx], appSecret: e.target.value };
                          setFormData({ ...formData, gateways: copy });
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">{gw.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
