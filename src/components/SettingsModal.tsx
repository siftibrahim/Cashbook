import React, { useState, useEffect } from 'react';
import { StoreProfile, Customer, Transaction, DailyExpense, PrintPaperSize, ThemeColor } from '../types';
import { authApi, getStoredUser } from '../services/apiService';
import {
  X,
  Store,
  MessageSquare,
  AlertTriangle,
  Database,
  ShieldCheck,
  Save,
  Download,
  Upload,
  RefreshCw,
  Phone,
  MapPin,
  User,
  Key,
  CheckCircle,
  HelpCircle,
  Lock,
  Smartphone,
  Printer,
  Volume2,
  Sliders,
  Palette,
  Headphones,
  Mail,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { playPaymentChime } from '../utils/audio';
import { SUPPORT_CONTACT } from '../types/adminTypes';

interface SettingsModalProps {
  isOpen: boolean;
  store: StoreProfile;
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  expenses?: DailyExpense[];
  onClose: () => void;
  onSaveStore: (updatedStore: StoreProfile) => Promise<void> | void;
  onRestoreData: (customers: Customer[], txs: Record<string, Transaction[]>, expenses?: DailyExpense[]) => Promise<void>;
  onResetData: () => void;
  onShowToast: (msg: string) => void;
  onOpenAdmin?: () => void;
  onOpenSupport?: () => void;
  onOpenSubscription?: () => void;
}

type TabType = 'store' | 'subscription' | 'mfs' | 'tagada' | 'print' | 'limits_sound' | 'backup' | 'security';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  store,
  customers,
  transactions,
  expenses = [],
  onClose,
  onSaveStore,
  onRestoreData,
  onResetData,
  onShowToast,
  onOpenAdmin,
  onOpenSupport,
  onOpenSubscription,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('store');

  // Form states
  const [name, setName] = useState(store.name || '');
  const [owner, setOwner] = useState(store.owner || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [address, setAddress] = useState(store.address || '');
  const [footerNote, setFooterNote] = useState(
    store.footerNote || 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।'
  );
  const [currencySymbol, setCurrencySymbol] = useState(store.currencySymbol || '৳');
  const [highDueLimit, setHighDueLimit] = useState(store.highDueLimit || 5000);
  const [defaultCreditLimit, setDefaultCreditLimit] = useState(store.defaultCreditLimit || 10000);
  const [tagadaTemplate, setTagadaTemplate] = useState(
    store.tagadaTemplate ||
      'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল।\n\nধন্যবাদ,\n{store}\nযোগাযোগ: {phone}'
  );
  const [bkashNumber, setBkashNumber] = useState(store.bkashNumber || '');
  const [nagadNumber, setNagadNumber] = useState(store.nagadNumber || '');
  const [rocketNumber, setRocketNumber] = useState(store.rocketNumber || '');
  const [themeColor, setThemeColor] = useState<ThemeColor>(store.themeColor || 'teal');
  const [enableSoundEffects, setEnableSoundEffects] = useState<boolean>(
    store.enableSoundEffects !== false
  );
  const [printPaperSize, setPrintPaperSize] = useState<PrintPaperSize>(
    store.printPaperSize || 'thermal_80'
  );
  const [showQrOnInvoice, setShowQrOnInvoice] = useState<boolean>(
    store.showQrOnInvoice !== false
  );

  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(store.name || '');
      setOwner(store.owner || '');
      setPhone(store.phone || '');
      setAddress(store.address || '');
      setFooterNote(store.footerNote || 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।');
      setCurrencySymbol(store.currencySymbol || '৳');
      setHighDueLimit(store.highDueLimit || 5000);
      setDefaultCreditLimit(store.defaultCreditLimit || 10000);
      setTagadaTemplate(
        store.tagadaTemplate ||
          'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল।\n\nধন্যবাদ,\n{store}\nযোগাযোগ: {phone}'
      );
      setBkashNumber(store.bkashNumber || '');
      setNagadNumber(store.nagadNumber || '');
      setRocketNumber(store.rocketNumber || '');
      setThemeColor(store.themeColor || 'teal');
      setEnableSoundEffects(store.enableSoundEffects !== false);
      setPrintPaperSize(store.printPaperSize || 'thermal_80');
      setShowQrOnInvoice(store.showQrOnInvoice !== false);
    }
  }, [isOpen, store]);

  if (!isOpen) return null;

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('দোকানের নাম খালি রাখা যাবে না!');
      return;
    }

    setSaving(true);
    try {
      const updated: StoreProfile = {
        name: name.trim(),
        owner: owner.trim(),
        phone: phone.trim(),
        address: address.trim(),
        footerNote: footerNote.trim(),
        currencySymbol: currencySymbol.trim() || '৳',
        highDueLimit: Number(highDueLimit) || 5000,
        defaultCreditLimit: Number(defaultCreditLimit) || 10000,
        tagadaTemplate: tagadaTemplate.trim(),
        bkashNumber: bkashNumber.trim(),
        nagadNumber: nagadNumber.trim(),
        rocketNumber: rocketNumber.trim(),
        themeColor,
        enableSoundEffects,
        printPaperSize,
        showQrOnInvoice,
      };

      await onSaveStore(updated);
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast('সংরক্ষণে সমস্যা হয়েছে!');
    } finally {
      setSaving(false);
    }
  };

  // Download complete JSON backup
  const handleDownloadBackup = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      store: {
        name,
        owner,
        phone,
        address,
        footerNote,
        currencySymbol,
        highDueLimit,
        defaultCreditLimit,
        tagadaTemplate,
        bkashNumber,
        nagadNumber,
        rocketNumber,
        themeColor,
        enableSoundEffects,
        printPaperSize,
        showQrOnInvoice,
      },
      customers,
      transactions,
      expenses,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital_khata_backup_v2_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // Restore backup from JSON
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.customers || !Array.isArray(parsed.customers)) {
          onShowToast('ভুল ফাইল! কাস্টমার ডাটা পাওয়া যায়নি।');
          return;
        }

        if (parsed.store) {
          await onSaveStore({ ...store, ...parsed.store });
        }

        await onRestoreData(
          parsed.customers,
          parsed.transactions || {},
          parsed.expenses || []
        );
        onClose();
      } catch (err) {
        console.error(err);
        onShowToast('ফাইলটি পড়া সম্ভব হয়নি। সঠিক JSON ফাইল নির্বাচন করুন।');
      }
    };
    reader.readAsText(file);
  };

  // Direct PIN change
  const handleChangePasswordDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      onShowToast('নতুন গোপন পিন (PIN) লিখুন!');
      return;
    }
    if (newPassword.length < 4) {
      onShowToast('গোপন পিন কমপক্ষে ৪ সংখ্যার হতে হবে!');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('উভয় গোপন পিন হুবহু এক নয়!');
      return;
    }

    const userEmail = getStoredUser()?.email || '';
    if (!userEmail) {
      onShowToast('লগইনকৃত অ্যাকাউন্ট পাওয়া যায়নি!');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword(userEmail, newPassword.trim());
      onShowToast(res.message || '✅ গোপন পিন (PIN) সফলভাবে পরিবর্তিত হয়েছে!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      onShowToast(`গোপন পিন পরিবর্তন করা যায়নি: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password / PIN reset email
  const handlePasswordReset = async () => {
    const userEmail = getStoredUser()?.email || '';
    if (!userEmail) {
      onShowToast('লগইনকৃত ইমেইল পাওয়া যায়নি!');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await authApi.forgotPassword(userEmail);
      onShowToast(res.message || `পিন রিসেট লিংক ${userEmail} ইমেইলে পাঠানো হয়েছে!`);
    } catch (err: any) {
      console.error(err);
      onShowToast(`পিন রিসেট পাঠানো যায়নি: ${err.message || 'Error'}`);
    } finally {
      setResettingPassword(false);
    }
  };

  const insertTag = (tag: string) => {
    setTagadaTemplate((prev) => prev + tag);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Modal Top Banner */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>অ্যাপ সেটিংস ও কনফিগারেশন</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-800/80 border border-teal-600 text-teal-200">
                  Version 2.0
                </span>
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                দোকান প্রোফাইল, MFS পেমেন্ট, তাগাদা টেমপ্লেট ও প্রিন্ট লেআউট
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 overflow-x-auto gap-1 py-1.5 shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>দোকান প্রোফাইল</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>প্যাকেজ ও সাবস্ক্রিপশন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mfs')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'mfs'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MFS ও কিউআর</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tagada')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'tagada'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>তাগাদা মেসেজ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'print'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>রসিদ ও প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('limits_sound')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'limits_sound'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>লিমিট ও সাউন্ড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>ব্যাকআপ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>নিরাপত্তা</span>
          </button>
        </div>

        {/* Tab Body Form */}
        <form onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: STORE PROFILE */}
          {activeTab === 'store' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 text-xs text-teal-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-teal-700 shrink-0" />
                <span>এখানে প্রদত্ত তথ্য সকল রসিদ, হেডার ও তাগাদা মেসেজে প্রদর্শিত হবে।</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  দোকানের নাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: TWING হিসাবি"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রোপাইটর / মালিকের নাম
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="যেমন: ইব্রাহিম"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দোকানের মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="যেমন: ০১৩০৬৯০৮১১৫"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  দোকানের ঠিকানা / লোকেশন
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বাজার রোড, দোকান নং ১২"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রসিদ ও মেমোর নিচের শুভেচ্ছা বার্তা (Footer Note)
                </label>
                <input
                  type="text"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  placeholder="যেমন: আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ! আবার আসবেন।"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-medium text-slate-800"
                />
              </div>
            </div>
          )}

          {/* TAB: SUBSCRIPTION & PACKAGES */}
          {activeTab === 'subscription' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-teal-500/10 to-emerald-500/15 rounded-2xl border border-amber-300/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold border border-amber-400/40 shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">
                        বর্তমান প্ল্যান: <span className="text-teal-800">{(store as any)?.subscriptionPlan || '১৪ দিনের ফ্রি ট্রায়াল'}</span>
                      </h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        সক্রিয়
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      মেয়াদ শেষ হবে: <span className="font-bold text-slate-800">
                        {new Date((store as any)?.subscriptionExpiresAt || (Date.now() + 14 * 86400000)).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                {onOpenSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscription();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer shrink-0"
                  >
                    <CreditCard className="w-4 h-4 text-amber-200" />
                    <span>প্যাকেজ রিনিউ ও পেমেন্ট পেজ খুলুন</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">প্যাক ১</span>
                    <h5 className="text-sm font-black text-slate-800 mt-0.5">২ মাসের স্টার্টার প্যাক</h5>
                    <p className="text-lg font-black text-teal-800 my-1.5">৳ ১০০ <span className="text-[10px] font-normal text-slate-500">/ ৬০ দিন</span></p>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• আনলিমিটেড কাস্টমার ও বাকি খাতা</li>
                      <li>• পিওএস ক্যাশ ও সেলস ইনভয়েস</li>
                      <li>• ফ্রি এসএমএস ও তাগাদা মেমো</li>
                    </ul>
                  </div>
                  {onOpenSubscription && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSubscription();
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition"
                    >
                      পেমেন্ট করুন
                    </button>
                  )}
                </div>

                <div className="bg-teal-50/50 p-4 rounded-2xl border-2 border-teal-500/40 relative flex flex-col justify-between shadow-xs">
                  <span className="absolute -top-2.5 right-3 text-[9px] font-black px-2 py-0.5 bg-[#004D40] text-white rounded-full">জনপ্রিয় অফার</span>
                  <div>
                    <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">প্যাক ২</span>
                    <h5 className="text-sm font-black text-slate-900 mt-0.5">৬ মাসের বিজনেস প্রিমিয়াম</h5>
                    <p className="text-lg font-black text-teal-800 my-1.5">৳ ২৬০ <span className="text-[10px] font-normal text-slate-500">/ ১৮০ দিন</span></p>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• সকল স্টার্টার ফিচারসহ দ্রুত ক্লাউড ব্যাকআপ</li>
                      <li>• মাল্টি-ডিভাইস ও ফুল অ্যানালিটিক্স</li>
                      <li>• ডেডিকেটেড ভিআইপি সাপোর্ট</li>
                    </ul>
                  </div>
                  {onOpenSubscription && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSubscription();
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-[#004D40] hover:bg-[#00382E] text-white text-xs font-bold transition shadow-xs"
                    >
                      পেমেন্ট করুন
                    </button>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">প্যাক ৩</span>
                    <h5 className="text-sm font-black text-slate-800 mt-0.5">১ বছরের আনলিমিটেড এন্টারপ্রাইজ</h5>
                    <p className="text-lg font-black text-teal-800 my-1.5">৳ ৫০০ <span className="text-[10px] font-normal text-slate-500">/ ৩৬৫ দিন</span></p>
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      <li>• সম্পূর্ণ আনলিমিটেড ১ বছর নিশ্চিন্ত ব্যবহার</li>
                      <li>• কাস্টম ব্রান্ডিং ও অটো হোয়াটসঅ্যাপ অ্যালার্ট</li>
                      <li>• প্রায় ৫৮% সাশ্রয়ী বার্ষিক প্যাক</li>
                    </ul>
                  </div>
                  {onOpenSubscription && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSubscription();
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition"
                    >
                      পেমেন্ট করুন
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>পেমেন্ট মেথড: bKash (বিকাশ), Nagad (নগদ), Rocket (রকেট) ও ব্যাংক ট্রান্সফার সাপোর্টেড।</span>
                </div>
                {onOpenSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscription();
                    }}
                    className="text-teal-700 font-bold hover:underline shrink-0 text-xs"
                  >
                    বিস্তারিত দেখুন →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MFS & QR */}
          {activeTab === 'mfs' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>
                  এখানে আপনার বিকাশ ও নগদ নম্বর সেট করলে কাস্টমার মেমো ও রসিদে স্বয়ংক্রিয় কিউআর (QR Code) যুক্ত হবে।
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-pink-700 mb-1">বিকাশ (bKash) নম্বর</label>
                  <input
                    type="tel"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="যেমন: 017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-500 text-xs sm:text-sm font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-orange-700 mb-1">নগদ (Nagad) নম্বর</label>
                  <input
                    type="tel"
                    value={nagadNumber}
                    onChange={(e) => setNagadNumber(e.target.value)}
                    placeholder="যেমন: 018XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-orange-200 focus:ring-2 focus:ring-orange-500 text-xs sm:text-sm font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-700 mb-1">রকেট (Rocket) নম্বর</label>
                  <input
                    type="tel"
                    value={rocketNumber}
                    onChange={(e) => setRocketNumber(e.target.value)}
                    placeholder="যেমন: 019XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="showQr"
                  checked={showQrOnInvoice}
                  onChange={(e) => setShowQrOnInvoice(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500"
                />
                <label htmlFor="showQr" className="text-xs font-bold text-slate-700 cursor-pointer">
                  প্রিন্ট রসিদে অনলাইন পেমেন্ট কিউআর কোড (Payment QR) প্রদর্শন করুন
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: TAGADA TEMPLATE */}
          {activeTab === 'tagada' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  WhatsApp বা SMS তাগাদার জন্য নিজের মনমতো মেসেজ ফরম্যাট সাজিয়ে নিন।
                </span>
              </div>

              {/* Tags Quick Insert */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ডায়নামিক ট্যাগ বোতাম (ক্লিক করলেই মেসেজে যুক্ত হবে):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+ কাস্টমার নাম', tag: '{customer}' },
                    { label: '+ বাকি টাকা', tag: '{amount}' },
                    { label: '+ কারেন্সি চিহ্ন', tag: '{currency}' },
                    { label: '+ দোকানের নাম', tag: '{store}' },
                    { label: '+ দোকানের মোবাইল', tag: '{phone}' },
                  ].map((btn) => (
                    <button
                      key={btn.tag}
                      type="button"
                      onClick={() => insertTag(btn.tag)}
                      className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  তাগাদা বার্তা টেমপ্লেট
                </label>
                <textarea
                  rows={4}
                  value={tagadaTemplate}
                  onChange={(e) => setTagadaTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-mono text-slate-800"
                />
              </div>

              {/* Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  লাইভ প্রিভিউ (উদাহরণ কাস্টমার: রহিম)
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {tagadaTemplate
                    .replace(/{customer}/g, 'রহিম')
                    .replace(/{amount}/g, '১,৪৫০')
                    .replace(/{currency}/g, currencySymbol)
                    .replace(/{store}/g, name || 'TWING হিসাবি')
                    .replace(/{phone}/g, phone || '০১৩০৬৯০৮১১৫')}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: PRINT & RECEIPT LAYOUT */}
          {activeTab === 'print' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-teal-50 rounded-2xl border border-teal-100 text-xs text-teal-800 flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-700 shrink-0" />
                <span>আপনার দোকানের প্রিন্টার অনুযায়ী ডিফল্ট পেপার সাইজ ও লেআউট নির্ধারণ করুন।</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ডিফল্ট প্রিন্টার ফরম্যাট
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setPrintPaperSize('thermal_80')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      printPaperSize === 'thermal_80'
                        ? 'border-[#00695C] bg-teal-50/50 text-[#00695C]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Printer className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">80mm POS থার্মাল স্লিপ</span>
                    <span className="text-[10px] text-slate-500">মিনি স্লিপ প্রিন্টার</span>
                  </div>

                  <div
                    onClick={() => setPrintPaperSize('thermal_58')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      printPaperSize === 'thermal_58'
                        ? 'border-[#00695C] bg-teal-50/50 text-[#00695C]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Printer className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">58mm POS ছোট স্লিপ</span>
                    <span className="text-[10px] text-slate-500">পোর্টেবল ব্লুটুথ প্রিন্টার</span>
                  </div>

                  <div
                    onClick={() => setPrintPaperSize('a4')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center ${
                      printPaperSize === 'a4'
                        ? 'border-[#00695C] bg-teal-50/50 text-[#00695C]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Printer className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">A4 অফিশিয়াল মেমো</span>
                    <span className="text-[10px] text-slate-500">স্ট্যান্ডার্ড ডেস্কটপ প্রিন্টার</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIMITS & SOUND */}
          {activeTab === 'limits_sound' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মুদ্রা প্রতীক (Currency Symbol)
                  </label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-bold text-slate-800"
                  >
                    <option value="৳">৳ (টাকা)</option>
                    <option value="TK">TK</option>
                    <option value="BDT">BDT</option>
                    <option value="$">$ (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    উচ্চ বকেয়া সতর্কতা সীমা (High Due Limit)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={highDueLimit}
                    onChange={(e) => setHighDueLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কাস্টমারদের ডিফল্ট বাকি লিমিট (Credit Limit ৳)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={defaultCreditLimit}
                  onChange={(e) => setDefaultCreditLimit(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-xs sm:text-sm font-bold text-slate-800"
                />
              </div>

              {/* Sound Effect Switch */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-teal-700" />
                    <span>ক্যাশিয়ার সাউন্ড এফেক্ট (Sound Chimes)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    টাকা জমা ও বিক্রির সময় বাস্তবসম্মত ক্যাশ রেজিস্টার ঘণ্টা বাজবে।
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playPaymentChime()}
                    className="px-2 py-1 text-[11px] font-bold bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 transition cursor-pointer"
                  >
                    টেস্ট সাউন্ড
                  </button>
                  <input
                    type="checkbox"
                    checked={enableSoundEffects}
                    onChange={(e) => setEnableSoundEffects(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-teal-50/80 rounded-2xl border border-teal-200 flex items-start gap-3">
                <Database className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-teal-900">
                    অফলাইন ও ক্লাউড ব্যাকআপ ব্যবস্থাপনা
                  </h4>
                  <p className="text-xs text-teal-700 mt-0.5">
                    আপনার দোকানের সমস্ত কাস্টমার ({customers.length} জন) এবং সকল লেনদেন ও ক্যাশ খাতা অফলাইনে সংরক্ষণ করুন।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="p-4 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 rounded-2xl flex flex-col items-center text-center transition group cursor-pointer shadow-xs"
                >
                  <Download className="w-6 h-6 text-teal-700 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">সম্পূর্ণ ব্যাকআপ ডাউনলোড</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">JSON ফাইল আকারে সেভ হবে</span>
                </button>

                <label className="p-4 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 rounded-2xl flex flex-col items-center text-center transition group cursor-pointer shadow-xs">
                  <Upload className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800">ব্যাকআপ ফাইল রিস্টোর</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">পূর্বের সেভ করা ফাইল আপলোড</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileRestore}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <div>
                  <h5 className="text-xs font-bold text-slate-700">ডেমো ডাটা রিসেট</h5>
                  <p className="text-[11px] text-slate-500">প্রয়োজনে পরীক্ষামূলক ডাটাতে ফিরে যান</p>
                </div>
                <button
                  type="button"
                  onClick={onResetData}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                  রিসেট করুন
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY & ADMIN */}
          {activeTab === 'security' && (() => {
            const currentUser = getStoredUser();
            const isSuperAdmin = Boolean(
              currentUser?.role === 'super_admin' && (
                currentUser?.id === 'usr_super_admin' ||
                currentUser?.email?.toLowerCase() === 'siftibrahim@gmail.com' ||
                currentUser?.email?.toLowerCase() === 'admin@twing.com' ||
                currentUser?.phone?.replace(/\D/g, '') === '01619665875'
              )
            );
            
            return (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-800">
                      {isSuperAdmin ? 'সুপার অ্যাডমিন প্রোফাইল ও সিকিউরিটি' : 'দোকানদার প্রোফাইল ও সিকিউরিটি'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    লগইনকৃত মোবাইল/ইমেইল: <span className="font-bold text-slate-900">{currentUser?.phone || currentUser?.email || store.phone || 'দোকান একাউন্ট'}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    রোল:{' '}
                    <span className="font-bold text-[#00695C]">
                      {isSuperAdmin ? 'প্রধান সুপার অ্যাডমিন' : 'দোকান মালিক (দোকানদার)'}
                    </span>
                  </p>
                  {(currentUser?.shopName || store.name) && (
                    <p className="text-xs text-slate-600 mt-1">
                      দোকান: <span className="font-bold text-slate-800">{currentUser?.shopName || store.name}</span>
                    </p>
                  )}
                </div>

                {/* Master Admin Management System Entry - ONLY FOR SUPER ADMIN */}
                {isSuperAdmin && onOpenAdmin && (
                  <div className="p-4 bg-gradient-to-r from-[#004D40]/10 via-[#00695C]/5 to-transparent rounded-2xl border-2 border-teal-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-800" />
                        <h5 className="text-xs sm:text-sm font-black text-slate-900">
                          সম্পূর্ণ অ্যাডমিন ম্যানেজমেন্ট কনসোল
                        </h5>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-teal-950">
                          SUPER ADMIN
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-0.5">
                        ইউজার তালিকা, সাবস্ক্রিপশন প্ল্যান, পেমেন্ট অনুমোদন, ইন-অ্যাপ নোটিফিকেশন, অ্যাপ আপডেট ও অডিট লগ পরিচালনা করুন।
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="px-4 py-2 bg-[#004D40] hover:bg-[#00332c] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                    >
                      <span>অ্যাডমিন প্যানেল খুলুন</span>
                    </button>
                  </div>
                )}

                {/* Support & Help Desk */}
                <div className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-teal-800" />
                        <span>সরাসরি সাপোর্ট ও চ্যাট ডেস্ক</span>
                      </h5>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-200 text-teal-900">
                        LIVE
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 mt-1">
                      যেকোনো জিজ্ঞাসা বা সহায়তার জন্য অ্যাডমিনের সাথে সরাসরি টেক্সট চ্যাট করুন। ছবি বা স্ক্রিনশটের জন্য{' '}
                      <span className="font-bold text-teal-900">{SUPPORT_CONTACT.email}</span> অথবা{' '}
                      <span className="font-bold text-teal-900">{SUPPORT_CONTACT.phone}</span>।
                    </p>
                  </div>
                  {onOpenSupport && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSupport();
                      }}
                      id="settings-open-support-btn"
                      className="px-4 py-2 bg-[#004D40] hover:bg-[#00382f] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>সাপোর্ট চ্যাট খুলুন</span>
                    </button>
                  )}
                </div>

              {/* Direct PIN Change Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-4 h-4 text-[#00695C]" />
                  <h5 className="text-xs sm:text-sm font-bold text-slate-800">
                    গোপন পিন (PIN) পরিবর্তন করুন (সরাসরি)
                  </h5>
                </div>
                <p className="text-[11.5px] text-slate-500 mb-3">
                  আপনার নতুন ৪-৬ সংখ্যার গোপন পিন (PIN) টাইপ করে সরাসরি PostgreSQL ক্লাউড ডেটাবেজে সংরক্ষণ করুন।
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      নতুন গোপন পিন (কমপক্ষে ৪-৬ সংখ্যা বা অক্ষর)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="যেমন: ১২৩৪ বা নতুন গোপন পিন"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00695C] focus:border-transparent outline-none pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <Lock className="w-3.5 h-3.5 text-teal-700" /> : <Key className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      নতুন পিন নিশ্চিত করুন
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="নতুন পিনটি পুনরায় লিখুন"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#00695C] focus:border-transparent outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isChangingPassword || !newPassword}
                      onClick={handleChangePasswordDirect}
                      className="px-4 py-2 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isChangingPassword ? 'সংরক্ষণ হচ্ছে...' : 'গোপন পিন আপডেট করুন'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Email PIN Reset Link */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-teal-700" />
                    <span>ইমেইলে পিন রিসেট লিংক</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    আপনার রেজিস্টার্ড ইমেইল <span className="font-bold text-slate-700">{getStoredUser()?.email || 'অ্যাকাউন্ট ইমেইল'}</span>-এ পিন রিসেট তথ্য পাঠানো হবে।
                  </p>
                </div>
                <button
                  type="button"
                  disabled={resettingPassword}
                  onClick={handlePasswordReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{resettingPassword ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}</span>
                </button>
              </div>
            </div>
            );
          })()}

          {/* Bottom Save Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center sticky bottom-0 bg-white">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              পরিবর্তনগুলো সাথে সাথে ক্লাউডে আপডেট হবে।
            </span>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
