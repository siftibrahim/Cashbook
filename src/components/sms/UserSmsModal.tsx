import React, { useState, useEffect } from 'react';
import { userSmsApi, subscriptionApi } from '../../services/apiService';
import { SmsPackageItem, UserSmsLog, SystemPaymentSettings } from '../../types/adminTypes';
import { formatMoney } from '../../utils/storage';
import {
  Smartphone,
  Send,
  CreditCard,
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  X,
  Phone,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Check,
  Copy,
  Building,
  RotateCcw,
} from 'lucide-react';

interface UserSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  initialPhone?: string;
  initialMessage?: string;
  customerName?: string;
  initialTab?: 'send' | 'packages' | 'history';
  storeName?: string;
  dueAmount?: number;
  currencySymbol?: string;
  onBalanceChanged?: () => void;
}

export const UserSmsModal: React.FC<UserSmsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  initialPhone = '',
  initialMessage = '',
  customerName = '',
  initialTab = 'send',
  storeName = '',
  dueAmount,
  currencySymbol = '৳',
  onBalanceChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'packages' | 'history'>(initialTab);
  const [balance, setBalance] = useState<number>(0);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [hasPendingPurchase, setHasPendingPurchase] = useState<boolean>(false);
  const [latestConfirmed, setLatestConfirmed] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings | null>(null);
  const [packages, setPackages] = useState<SmsPackageItem[]>([]);
  const [logs, setLogs] = useState<UserSmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Send SMS Form State
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [smsType, setSmsType] = useState<'tagada' | 'deposit' | 'custom'>('tagada');
  const [isSending, setIsSending] = useState(false);

  // Purchase Package State
  const [selectedPkg, setSelectedPkg] = useState<SmsPackageItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank'>('bkash');
  const [trxId, setTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (initialTab) setActiveTab(initialTab);
      if (initialPhone) setPhone(initialPhone);
      if (initialMessage) {
        setMessage(initialMessage);
      } else if (customerName && dueAmount !== undefined && dueAmount > 0) {
        setMessage(
          `আসসালামু আলাইকুম ${customerName} ভাই, ${storeName || 'দোকান'}-এ আপনার বর্তমান বকেয়া বাকি ${currencySymbol} ${formatMoney(dueAmount)}। সুবিধাজনক সময়ে পরিশোধের অনুরোধ রইল।\nধন্যবাদ,\n${storeName || 'দোকান'}`
        );
      }
    }
  }, [isOpen, initialPhone, initialMessage, initialTab, customerName, dueAmount, storeName, currencySymbol]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [balRes, pkgRes, logsRes, paySettingsRes] = await Promise.all([
        userSmsApi.getBalance().catch(() => ({ balance: 0, hasPendingPurchase: false })),
        userSmsApi.getPackages().catch(() => []),
        userSmsApi.getLogs().catch(() => []),
        subscriptionApi.getPaymentSettings().catch(() => null),
      ]);
      const balData = balRes as any;
      setBalance(balData?.balance || 0);
      setHasPendingPurchase(!!balData?.hasPendingPurchase);
      setPendingPurchase(balData?.pendingPurchase || null);
      setLatestConfirmed(balData?.latestConfirmed || null);
      if (paySettingsRes) setPaymentSettings(paySettingsRes);
      setPackages(Array.isArray(pkgRes) ? pkgRes : (pkgRes as any)?.packages || []);
      setLogs(Array.isArray(logsRes) ? logsRes : (logsRes as any)?.logs || []);
    } catch (err) {
      console.warn('Failed to load SMS data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Character calculation
  const isBangla = /[\u0980-\u09FF]/.test(message);
  const maxPerSms = isBangla ? 70 : 160;
  const smsCount = Math.max(1, Math.ceil(message.length / maxPerSms));

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !message.trim()) {
      onShowToast('মোবাইল নম্বর ও বার্তা অবশ্যই দিতে হবে');
      return;
    }

    if (balance < smsCount) {
      onShowToast(`❌ অপর্যাপ্ত ব্যালেন্স! আপনার ব্যালেন্স আছে ${balance} টি, প্রয়োজন ${smsCount} টি SMS। দয়া করে প্যাকেজ কিনুন।`);
      setActiveTab('packages');
      return;
    }

    setIsSending(true);
    try {
      const res = await userSmsApi.sendSms({
        customerPhone: phone.trim(),
        customerName: customerName || undefined,
        message: message.trim(),
        smsType,
      });

      if (res.success) {
        const nextBal = res.newBalance !== undefined ? res.newBalance : balance - smsCount;
        setBalance(nextBal);
        onShowToast(`✅ এসএমএস সফলভাবে পাঠানো হয়েছে! অবশিষ্ট ব্যালেন্স: ${nextBal}টি`);
        setMessage('');
        onBalanceChanged?.();
        loadData();
      } else {
        onShowToast(`❌ ব্যর্থ: ${res.message || 'এসএমএস পাঠানো যায়নি'}`);
      }
    } catch (err: any) {
      onShowToast(`❌ ব্যর্থ: ${err.message || 'এসএমএস গেটওয়ে সমস্যা'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePurchasePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    if (balance > 0) {
      onShowToast(`⚠️ আপনার বর্তমান প্যাকেজে এখনও ${balance}টি SMS অবশিষ্ট আছে! বর্তমান প্যাকেজ শেষ হওয়ার পরই নতুন প্যাকেজ নেওয়া যাবে।`);
      return;
    }
    if (hasPendingPurchase) {
      onShowToast(`⚠️ আপনার একটি পূর্ববর্তী রিকোয়েস্ট (TrxID: ${pendingPurchase?.trxId || ''}) ইতিমধ্যে পেন্ডিং রয়েছে! অ্যাডমিনের অনুমোদনের অপেক্ষা করুন।`);
      return;
    }
    if (!trxId.trim() || !senderNumber.trim()) {
      onShowToast('অনুগ্রহ করে ট্রানজেকশন আইডি (TrxID) ও প্রেরক নম্বর দিন');
      return;
    }

    setIsPurchasing(true);
    try {
      const res = await userSmsApi.purchasePackage({
        packageId: selectedPkg.id,
        paymentMethod,
        trxId: trxId.trim(),
        senderNumber: senderNumber.trim(),
      });

      if (res?.purchaseId || res?.message) {
        onShowToast('✅ এসএমএস প্যাকেজ কেনার অনুরোধ সফলভাবে জমা হয়েছে! সুপার অ্যাডমিন অনুমোদন করলেই ব্যালেন্সে SMS যোগ হবে।');
        setSelectedPkg(null);
        setTrxId('');
        setSenderNumber('');
        onBalanceChanged?.();
        loadData();
        setActiveTab('history');
      } else {
        onShowToast(`❌ রিকোয়েস্ট ব্যর্থ: ${res?.message || 'ত্রুটি'}`);
      }
    } catch (err: any) {
      onShowToast(`❌ রিকোয়েস্ট ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-slate-900 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  এসএমএস সার্ভিস ও তাগাদা ম্যানেজমেন্ট
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-black border border-teal-500/30">
                  ব্যালেন্স: {balance} টি SMS
                </span>
                {hasPendingPurchase && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" />
                    প্যাকেজ পেন্ডিং
                  </span>
                )}
                {!hasPendingPurchase && latestConfirmed && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    সাকসেসফুল ({latestConfirmed.smsCount}টি ক্রয়কৃত)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                কাস্টমারদের বাকি তাগাদা, জমার রশিদ ও কাস্টম এসএমএস সরাসরি পাঠান
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'send'
                ? 'bg-teal-600 text-white shadow-md font-black shadow-teal-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>এসএমএস পাঠান</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-amber-600 text-white shadow-md font-black shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>প্যাকেজ কিনুন</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md font-black shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>এসএমএস হিস্ট্রি</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SEND SMS */}
          {activeTab === 'send' && (
            <form onSubmit={handleSendSms} className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">বর্তমান এসএমএস ব্যালেন্স:</span>
                <span className="font-black text-teal-400 text-sm">{balance} টি</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  প্রাপকের মোবাইল নম্বর:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="০১xxxxxxxxx"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono font-bold focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  এসএমএস ক্যাটাগরি:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSmsType('tagada');
                      setMessage(`সম্মানিত গ্রাহক, আপনার দোকানে বকেয়া আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। ধন্যবাদ - আপনার দোকান`);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      smsType === 'tagada'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    বাকি তাগাদা
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmsType('deposit');
                      setMessage(`সম্মানিত গ্রাহক, আপনার দোকানে জমা গ্রহণ করা হয়েছে। ধন্যবাদ - আপনার দোকান`);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      smsType === 'deposit'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    জমার রশিদ
                  </button>

                  <button
                    type="button"
                    onClick={() => setSmsType('custom')}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      smsType === 'custom'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    কাস্টম বার্তা
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <label className="font-bold text-slate-300">বার্তা (Message):</label>
                  <span className="text-slate-400 text-[11px]">
                    অক্ষর: <strong className="text-white">{message.length}</strong> | এসএমএস গণনা:{' '}
                    <strong className="text-teal-400">{smsCount}টি</strong>
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="আপনার বার্তা বাংলায় বা ইংরেজিতে লিখুন..."
                  className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs leading-relaxed focus:border-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSending || balance <= 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25 transition cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>এসএমএস পাঠান ({smsCount} টি ব্যালেন্স কর্তন)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SMS PACKAGES */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              {/* Case 1: Pending SMS Purchase Banner */}
              {hasPendingPurchase && pendingPurchase && (
                <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="text-xs font-black text-amber-300">
                        এসএমএস প্যাকেজ রিকোয়েস্ট পেন্ডিং রয়েছে
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      TrxID: {pendingPurchase.trxId}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    আপনি <strong>{pendingPurchase.smsCount}টি SMS</strong> (৳{formatMoney(pendingPurchase.amount)}) ক্রয়ের অনুরোধ পাঠিয়েছেন। সুপার অ্যাডমিন পেমেন্ট ভেরিফাই করে এক্সেপ্ট করলেই স্বয়ংক্রিয়ভাবে আপনার ব্যালেন্সে যুক্ত হয়ে যাবে।
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300">
                    <span>স্ট্যাটাস: পেন্ডিং (অ্যাডমিন অনুমোদনের অপেক্ষায়)</span>
                    <button
                      type="button"
                      onClick={() => loadData()}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>স্ট্যাটাস রিফ্রেশ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Case 2: Exclusivity - Balance still remaining */}
              {!hasPendingPurchase && balance > 0 && (
                <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-black text-teal-300">
                      আপনার বর্তমান প্যাকেজে এখনও {balance}টি SMS অবশিষ্ট রয়েছে!
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      হুবহু সাবস্ক্রিপশন নিয়মানুযায়ী একটি প্যাকেজ চলাকালীন অন্য প্যাকেজ নেওয়া যায় না। বর্তমান প্যাকেজের সকল SMS শেষ (০ টি) হওয়ার পরই কেবল পরবর্তী নতুন প্যাকেজ কিনতে পারবেন।
                    </p>
                  </div>
                </div>
              )}

              {!selectedPkg ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {packages.map((pkg) => {
                    const isBlocked = balance > 0 || hasPendingPurchase;
                    return (
                      <div
                        key={pkg.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative group ${
                          isBlocked
                            ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                            : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/50'
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wide">
                            জনপ্রিয়
                          </span>
                        )}

                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {pkg.badge || 'সাশ্রয়ী'}
                          </span>
                          <h4 className="text-sm font-black text-white mt-2">{pkg.name}</h4>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-black text-amber-400">৳{pkg.price}</span>
                            <span className="text-xs text-slate-400 font-semibold">
                              ({pkg.smsCount} টি SMS - প্রতি SMS {pkg.ratePerSms})
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isBlocked}
                          onClick={() => {
                            if (isBlocked) {
                              if (hasPendingPurchase) {
                                onShowToast('⚠️ পূর্বের অনুরোধ ইতিমধ্যে পেন্ডিং রয়েছে!');
                              } else {
                                onShowToast(`⚠️ ব্যালেন্স অবশিষ্ট (${balance}টি)! শূন্য (০) হওয়ার পর নতুন প্যাক নেওয়া যাবে।`);
                              }
                              return;
                            }
                            setSelectedPkg(pkg);
                          }}
                          className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                            isBlocked
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>
                            {hasPendingPurchase
                              ? 'অনুরোধ পেন্ডিং আছে'
                              : balance > 0
                              ? `ব্যালেন্স অবশিষ্ট (${balance}টি)`
                              : 'এই প্যাকেজটি কিনুন'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Checkout for Selected Package with dynamic Shared Payment Gateway */
                <form onSubmit={handlePurchasePackage} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">নির্বাচিত প্যাকেজ:</h4>
                      <p className="text-sm font-black text-white">
                        {selectedPkg.name} ({selectedPkg.smsCount} টি SMS)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-amber-400">৳{selectedPkg.price}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPkg(null)}
                        className="block text-[11px] text-slate-400 hover:text-white underline cursor-pointer mt-0.5"
                      >
                        পরিবর্তন করুন
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      পেমেন্ট মাধ্যম বেছে নিন (সাবস্ক্রিপশনের একই গেটওয়ে):
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['bkash', 'nagad', 'rocket', 'bank'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`p-2.5 rounded-xl border text-xs font-black uppercase transition cursor-pointer text-center ${
                            paymentMethod === m
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/60 shadow-xs'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Instructions Based on super admin system payment settings */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <p className="font-bold text-amber-300 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>পেমেন্ট করার নিয়ম:</span>
                    </p>

                    {(() => {
                      const bkashNum = paymentSettings?.bkash?.merchant?.number || paymentSettings?.bkash?.personal?.number || '01619665875';
                      const bkashAccType = paymentSettings?.bkash?.merchant?.number ? 'Merchant' : (paymentSettings?.bkash?.personal?.accountType || 'Personal');

                      const nagadNum = paymentSettings?.nagad?.merchant?.number || paymentSettings?.nagad?.personal?.number || '01619665875';
                      const nagadAccType = paymentSettings?.nagad?.merchant?.number ? 'Merchant' : (paymentSettings?.nagad?.personal?.accountType || 'Personal');

                      const rocketNum = paymentSettings?.rocket?.personal?.number || '01619665875';
                      const rocketAccType = paymentSettings?.rocket?.personal?.accountType || 'Personal';

                      const firstBankAcc = paymentSettings?.bankTransfer?.accounts?.[0];
                      const bName = firstBankAcc?.bankName || 'ব্যাংক ট্রান্সফার';
                      const bAccName = firstBankAcc?.accountName || 'দোকানদার';
                      const bAccNum = firstBankAcc?.accountNumber || '১২৩৪৫৬৭৮৯০';
                      const bBranch = firstBankAcc?.branchName;

                      return (
                        <>
                          {paymentMethod === 'bkash' && (
                            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-400 text-[11px] block">
                                  বিকাশ নম্বর ({bkashAccType}):
                                </span>
                                <strong className="text-sm font-mono text-pink-400">
                                  {bkashNum}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(bkashNum);
                                  onShowToast('📋 বিকাশ নম্বর কপি হয়েছে');
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>কপি</span>
                              </button>
                            </div>
                          )}

                          {paymentMethod === 'nagad' && (
                            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-400 text-[11px] block">
                                  নগদ নম্বর ({nagadAccType}):
                                </span>
                                <strong className="text-sm font-mono text-orange-400">
                                  {nagadNum}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(nagadNum);
                                  onShowToast('📋 নগদ নম্বর কপি হয়েছে');
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>কপি</span>
                              </button>
                            </div>
                          )}

                          {paymentMethod === 'rocket' && (
                            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-400 text-[11px] block">
                                  রকেট নম্বর ({rocketAccType}):
                                </span>
                                <strong className="text-sm font-mono text-purple-400">
                                  {rocketNum}
                                </strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(rocketNum);
                                  onShowToast('📋 রকেট নম্বর কপি হয়েছে');
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>কপি</span>
                              </button>
                            </div>
                          )}

                          {paymentMethod === 'bank' && (
                            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold text-white text-xs">
                                  {bName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 space-y-0.5">
                                <p>অ্যাকাউন্ট নাম: <strong>{bAccName}</strong></p>
                                <p>অ্যাকাউন্ট নম্বর: <strong className="font-mono text-emerald-400">{bAccNum}</strong></p>
                                {bBranch && <p>ব্রাঞ্চ: {bBranch}</p>}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <p className="text-[11px] text-slate-400">
                      উপরের নম্বরে <strong>৳{selectedPkg.price}</strong> পাঠিয়ে নিচের বক্সে আপনার পাঠানো নম্বর ও TrxID লিখে সাবমিট করুন।
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      আপনার প্রেরক মোবাইল/অ্যাকাউন্ট নম্বর:
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="০১xxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      ট্রানজেকশন আইডি (TrxID):
                    </label>
                    <input
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="যেমন: 9J7A6K9L"
                      className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono uppercase focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPkg(null)}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      ফিরে যান
                    </button>
                    <button
                      type="submit"
                      disabled={isPurchasing}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      {isPurchasing ? 'জমা হচ্ছে...' : 'পেমেন্ট সাবমিট করুন'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SMS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {log.customerName || 'কাস্টমার'}: {log.customerPhone}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {log.smsType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {log.message}
                      </p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(log.createdAt).toLocaleString('bn-BD')}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        log.status === 'sent'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.status === 'sent' ? 'সফল' : 'ব্যর্থ'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  কোনো এসএমএস পাঠানোর ইতিহাস পাওয়া যায়নি।
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
