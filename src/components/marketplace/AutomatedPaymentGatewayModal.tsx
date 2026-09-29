import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Smartphone,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

export interface AutomatedPaymentResult {
  paymentMethod: string;
  trxId: string;
  senderNumber: string;
  amount: number;
}

interface AutomatedPaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  onSuccess: (result: AutomatedPaymentResult) => void;
}

export const AutomatedPaymentGatewayModal: React.FC<AutomatedPaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  customerName,
  customerPhone,
  onSuccess,
}) => {
  const [selectedGateway, setSelectedGateway] = useState<'bkash' | 'nagad' | 'rocket' | 'card'>('bkash');
  const [step, setStep] = useState<'input_number' | 'input_otp' | 'input_pin' | 'processing' | 'card_form'>(
    'input_number'
  );

  // MFS fields
  const [accountNumber, setAccountNumber] = useState(customerPhone || '');
  const [otpCode, setOtpCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('589412');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(customerName || '');

  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Reset steps on tab switch
  useEffect(() => {
    if (selectedGateway === 'card') {
      setStep('card_form');
    } else {
      setStep('input_number');
    }
    setErrorMessage('');
    setOtpCode('');
    setPinCode('');
  }, [selectedGateway]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step === 'input_otp' && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  if (!isOpen) return null;

  // Handle number submission -> goes to OTP
  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = accountNumber.replace(/[^0-9]/g, '');
    if (cleanNum.length < 11) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল ব্যাংকিং নম্বর দিন');
      return;
    }
    setErrorMessage('');
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setOtpCode(randomOtp); // Pre-fill for seamless checkout convenience
    setCountdown(60);
    setStep('input_otp');
  };

  // Handle OTP verification -> goes to PIN
  const handleProceedToPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) {
      setErrorMessage('অনুগ্রহ করে ওটিপি (OTP) ভেরিফিকেশন কোড দিন');
      return;
    }
    setErrorMessage('');
    setStep('input_pin');
  };

  // Handle PIN confirmation -> Process Payment
  const handleConfirmMfsPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length < 4) {
      setErrorMessage('সঠিক ৪-৫ ডিজিটের পিন (PIN) নম্বর দিন');
      return;
    }
    setErrorMessage('');
    setStep('processing');

    setTimeout(() => {
      const prefix = selectedGateway === 'bkash' ? 'BK' : selectedGateway === 'nagad' ? 'NG' : 'RC';
      const realTrxId = `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

      onSuccess({
        paymentMethod: `online_${selectedGateway}`,
        trxId: realTrxId,
        senderNumber: accountNumber,
        amount: grandTotal,
      });
    }, 1800);
  };

  // Handle Card Payment confirmation
  const handleConfirmCardPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১৬ ডিজিটের কার্ড নম্বর দিন');
      return;
    }
    if (!cardExpiry || !cardCvv) {
      setErrorMessage('কার্ডের মেয়াদ (MM/YY) ও সিভিভি (CVV) প্রদান করুন');
      return;
    }
    setErrorMessage('');
    setStep('processing');

    setTimeout(() => {
      const realTrxId = `CRD_${Date.now().toString(36).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
      onSuccess({
        paymentMethod: 'online_card',
        trxId: realTrxId,
        senderNumber: `Card ending in ${cardNumber.slice(-4) || 'XXXX'}`,
        amount: grandTotal,
      });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                TWING সেন্ট্রাল মল পেমেন্ট গেটওয়ে
              </h3>
              <p className="text-[11px] text-teal-200 flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>১২৮-বিট এসএসএল সুরক্ষিত অনলাইন লেনদেন</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Badge Bar */}
        <div className="bg-teal-50/80 px-5 py-3 border-b border-teal-100 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 font-semibold text-[11px]">পরিশোধযোগ্য সর্বমোট বিল:</span>
            <span className="text-xl font-black text-[#004D40] block">৳{formatMoney(grandTotal)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-mono">মার্চেন্ট: TwingMall Central</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold inline-block">
              ইনস্ট্যান্ট অটো-ভেরিফিকেশন
            </span>
          </div>
        </div>

        {/* Gateway Selection Tabs */}
        {step !== 'processing' && (
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-700 mb-2">পেমেন্ট গেটওয়ে চ্যানেল নির্বাচন করুন:</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedGateway('bkash')}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  selectedGateway === 'bkash'
                    ? 'bg-pink-50 border-pink-500 text-pink-900 ring-2 ring-pink-500 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-pink-600 text-white font-black text-[10px] flex items-center justify-center">
                  ব
                </div>
                <span className="text-[11px]">বিকাশ</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('nagad')}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  selectedGateway === 'nagad'
                    ? 'bg-orange-50 border-orange-500 text-orange-900 ring-2 ring-orange-500 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-orange-600 text-white font-black text-[10px] flex items-center justify-center">
                  ন
                </div>
                <span className="text-[11px]">নগদ</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('rocket')}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  selectedGateway === 'rocket'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">
                  র
                </div>
                <span className="text-[11px]">রকেট</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('card')}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  selectedGateway === 'card'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-6 h-6 text-blue-600" />
                <span className="text-[11px]">কার্ড</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP: PROCESSING ================= */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-teal-200 border-t-teal-700 animate-spin" />
                <Lock className="w-6 h-6 text-teal-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-base text-slate-900">পেমেন্ট গেটওয়েতে প্রসেসিং হচ্ছে...</h4>
                <p className="text-xs text-slate-500">
                  নিরাপদ পেমেন্ট ট্রানজেকশন সম্পন্ন হচ্ছে। অনুগ্রহ করে উইন্ডো বন্ধ করবেন না।
                </p>
              </div>
            </div>
          )}

          {/* ================= MFS STEP 1: ENTER ACCOUNT NUMBER ================= */}
          {selectedGateway !== 'card' && step === 'input_number' && (
            <form onSubmit={handleProceedToOtp} className="space-y-4 text-xs">
              <div className={`p-3.5 rounded-2xl border ${
                selectedGateway === 'bkash' ? 'bg-pink-50 border-pink-200 text-pink-950' :
                selectedGateway === 'nagad' ? 'bg-orange-50 border-orange-200 text-orange-950' :
                'bg-purple-50 border-purple-200 text-purple-950'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">
                    {selectedGateway === 'bkash' ? 'বিকাশ (bKash) পেমেন্ট গেটওয়ে' :
                     selectedGateway === 'nagad' ? 'নগদ (Nagad) পেমেন্ট গেটওয়ে' :
                     'রকেট (Rocket) পেমেন্ট গেটওয়ে'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-full border border-slate-200">
                    ইনস্ট্যান্ট অটো-পেমেন্ট
                  </span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  আপনার মোবাইল ব্যাংকিং একাউন্ট নম্বর দিন। নম্বরটিতে একটি ভেরিফিকেশন ওটিপি (OTP) পাঠানো হবে।
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  আপনার {selectedGateway === 'bkash' ? 'বিকাশ' : selectedGateway === 'nagad' ? 'নগদ' : 'রকেট'} মোবাইল নম্বর *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold tracking-wider focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                  />
                  <Smartphone className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>পরবর্তী ধাপে ওটিপি নিন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ================= MFS STEP 2: ENTER OTP ================= */}
          {selectedGateway !== 'card' && step === 'input_otp' && (
            <form onSubmit={handleProceedToPin} className="space-y-4 text-xs">
              <div className="p-3.5 bg-teal-50 border border-teal-200 text-teal-950 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">ভেরিফিকেশন কোড (OTP) পাঠানো হয়েছে</span>
                  <span className="text-[10px] font-mono text-teal-700 font-bold">{countdown}s</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  নম্বর <strong>{accountNumber}</strong>-এ প্রেরিত ৬-সংখ্যার কোডটি প্রদান করুন।
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ডেমো অটো-কোড: <strong className="font-mono text-xs">{generatedOtp}</strong></span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  ৬-সংখ্যার ওটিপি (OTP) দিন *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="যেমন: 589412"
                  className="w-full text-center py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-mono font-black tracking-widest focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input_number')}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  ব্যাকে যান
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>কোড নিশ্চিত করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ================= MFS STEP 3: ENTER PIN ================= */}
          {selectedGateway !== 'card' && step === 'input_pin' && (
            <form onSubmit={handleConfirmMfsPayment} className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">পেমেন্ট চূড়ান্ত অনুমোদন</span>
                  <span className="font-black text-teal-900 text-xs">৳{formatMoney(grandTotal)}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  নিরাপদ পেমেন্ট সম্পন্ন করতে আপনার ৪-৫ সংখ্যার গোপন পিন (PIN) প্রদান করুন।
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  গোপন পিন (PIN) নম্বর *
                </label>
                <input
                  type="password"
                  required
                  maxLength={5}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center py-2.5 bg-white border border-slate-300 rounded-xl text-xl font-mono font-black tracking-widest focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 text-center block mt-1">
                  (পরীক্ষামূলক লেনদেনের জন্য যেকোনো ৪ ডিজিট যেমন 1234 দিতে পারেন)
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input_otp')}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  ব্যাকে
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>পেমেন্ট নিশ্চিত করুন (৳{formatMoney(grandTotal)})</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= CARD FORM ================= */}
          {selectedGateway === 'card' && step === 'card_form' && (
            <form onSubmit={handleConfirmCardPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">কার্ড নম্বর *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                      const matches = v.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || '';
                      const parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      setCardNumber(parts.length ? parts.join(' ') : v);
                    }}
                    placeholder="4123 4567 8901 2345"
                    maxLength={19}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">কার্ডহোল্ডারের নাম *</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="উদাঃ MD RAFIQUL ISLAM"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl uppercase font-bold focus:ring-2 focus:ring-teal-700/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">মেয়াদ (MM/YY) *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                      setCardExpiry(val);
                    }}
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 text-center bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">সিভিভি (CVV/CVC) *</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="•••"
                    className="w-full px-3 py-2 text-center bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>কার্ড দিয়ে পে করুন (৳{formatMoney(grandTotal)})</span>
                </button>
              </div>
            </form>
          )}

          {/* Trust badges footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>PCI-DSS সার্টিফাইড</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ইনস্ট্যান্ট অর্ডার অ্যাক্টিভেশন</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
