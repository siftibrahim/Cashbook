import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Edit2,
  Save,
  X,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Smartphone,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';
import { MarketplaceMasterOrder } from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import { playPaymentChime, triggerConfettiCelebration } from '../../utils/audio';

export interface VerifiedCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city?: 'dhaka' | 'outside' | string;
  deviceToken?: string;
  isVerified: boolean;
  verifiedAt?: string;
}

const CUSTOMER_STORAGE_KEY = 'twing_verified_customer_profile';
const MKT_CUSTOMER_ORDERS_KEY = 'twing_marketplace_customer_orders_v1';

export function getStoredCustomer(): VerifiedCustomer | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Fallback to legacy keys if present
    const name = localStorage.getItem('twing_mkt_cust_name');
    const phone = localStorage.getItem('twing_mkt_cust_phone');
    const address = localStorage.getItem('twing_mkt_cust_address');
    if (name && phone) {
      return {
        id: 'cust_' + phone.replace(/[^\d]/g, ''),
        name,
        phone,
        address: address || '',
        city: 'dhaka',
        isVerified: true,
      };
    }
  } catch (e) {
    console.debug('Error reading stored customer:', e);
  }
  return null;
}

export function saveStoredCustomer(customer: VerifiedCustomer): void {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    localStorage.setItem('twing_mkt_cust_name', customer.name);
    localStorage.setItem('twing_mkt_cust_phone', customer.phone);
    localStorage.setItem('twing_mkt_cust_address', customer.address);
  } catch (e) {
    console.warn('Error saving stored customer:', e);
  }
}

export function clearStoredCustomer(): void {
  try {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    localStorage.removeItem('twing_mkt_cust_name');
    localStorage.removeItem('twing_mkt_cust_phone');
    localStorage.removeItem('twing_mkt_cust_address');
  } catch (e) {
    console.warn('Error clearing stored customer:', e);
  }
}

interface CustomerAccountViewProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracking?: (orderNumber: string) => void;
  onOpenCart?: () => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({
  isOpen,
  onClose,
  onOpenTracking,
  onOpenCart,
}) => {
  const [customer, setCustomer] = useState<VerifiedCustomer | null>(() => getStoredCustomer());
  const [orders, setOrders] = useState<MarketplaceMasterOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'verification'>('profile');

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<'dhaka' | 'outside'>('dhaka');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Device OTP Verification States
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyName, setVerifyName] = useState('');
  const [verifyAddress, setVerifyAddress] = useState('');
  const [verifyCity, setVerifyCity] = useState<'dhaka' | 'outside'>('dhaka');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Sync state on open
  useEffect(() => {
    if (!isOpen) return;

    const cust = getStoredCustomer();
    setCustomer(cust);
    if (cust) {
      setName(cust.name || '');
      setPhone(cust.phone || '');
      setAddress(cust.address || '');
      setCity((cust.city as 'dhaka' | 'outside') || 'dhaka');

      setVerifyPhone(cust.phone || '');
      setVerifyName(cust.name || '');
      setVerifyAddress(cust.address || '');
      setVerifyCity((cust.city as 'dhaka' | 'outside') || 'dhaka');

      // Fetch customer orders from backend
      fetchOrders(cust.phone);
    } else {
      // Open directly in verification tab if no verified customer
      setActiveTab('verification');
    }
  }, [isOpen]);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const fetchOrders = async (custPhone: string) => {
    setIsLoadingOrders(true);
    try {
      // 1. Try local storage first
      const savedOrders = localStorage.getItem(MKT_CUSTOMER_ORDERS_KEY);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }

      // 2. Fetch live from server
      if (custPhone) {
        const res = await marketplaceApi.getCustomerOrders(custPhone);
        if (res.success && Array.isArray(res.orders) && res.orders.length > 0) {
          setOrders(res.orders);
        }
      }
    } catch (e) {
      console.debug('Error loading orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Send OTP for device verification
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccessMessage('');

    const cleanPhone = verifyPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88')
      ? cleanPhone.slice(3)
      : cleanPhone.startsWith('88')
      ? cleanPhone.slice(2)
      : cleanPhone;

    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      setOtpError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }

    if (!verifyName.trim()) {
      setOtpError('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }

    setIsSendingOtp(true);
    try {
      const deviceToken = localStorage.getItem('twing_customer_device_token') || 'dev_' + Date.now().toString(36);
      localStorage.setItem('twing_customer_device_token', deviceToken);

      const res = await marketplaceApi.sendOtp(standardPhone, deviceToken);

      if (res.alreadyVerified || res.verified) {
        // Device already verified in backend
        const verifiedCustomer: VerifiedCustomer = {
          id: 'cust_' + standardPhone,
          name: verifyName.trim(),
          phone: standardPhone,
          address: verifyAddress.trim(),
          city: verifyCity,
          deviceToken,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };
        saveStoredCustomer(verifiedCustomer);
        setCustomer(verifiedCustomer);
        setActiveTab('profile');
        setSaveSuccess(true);
        playPaymentChime();
        triggerConfettiCelebration();
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }

      setOtpSent(true);
      setCountdown(120); // 2 minutes
      setOtpSuccessMessage(res.message || 'আপনার মোবাইলে ৬ ডিজিটের যাচাই কোড পাঠানো হয়েছে।');
    } catch (err: any) {
      setOtpError(err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP & Mark device as verified
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (!otpCode.trim()) {
      setOtpError('অনুগ্রহ করে ৬ ডিজিটের ওটিপি কোডটি লিখুন');
      return;
    }

    const cleanPhone = verifyPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88')
      ? cleanPhone.slice(3)
      : cleanPhone.startsWith('88')
      ? cleanPhone.slice(2)
      : cleanPhone;

    setIsVerifyingOtp(true);
    try {
      const deviceToken = localStorage.getItem('twing_customer_device_token') || 'dev_' + Date.now().toString(36);
      const res = await marketplaceApi.verifyOtp(standardPhone, otpCode.trim(), deviceToken);

      if (res.success && res.verified) {
        const verifiedCustomer: VerifiedCustomer = {
          id: 'cust_' + standardPhone,
          name: verifyName.trim(),
          phone: standardPhone,
          address: verifyAddress.trim(),
          city: verifyCity,
          deviceToken: res.deviceToken || deviceToken,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };

        saveStoredCustomer(verifiedCustomer);
        setCustomer(verifiedCustomer);
        setName(verifiedCustomer.name);
        setPhone(verifiedCustomer.phone);
        setAddress(verifiedCustomer.address);
        setCity((verifiedCustomer.city as 'dhaka' | 'outside') || 'dhaka');

        setOtpSent(false);
        setOtpCode('');
        setActiveTab('profile');
        setSaveSuccess(true);

        playPaymentChime();
        triggerConfettiCelebration();
        fetchOrders(standardPhone);

        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setOtpError(res.error || 'ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setOtpError(err.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে। সঠিক কোডটি দিন।');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const updated: VerifiedCustomer = {
      id: customer?.id || 'cust_' + phone.replace(/[^\d]/g, ''),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city,
      deviceToken: customer?.deviceToken || localStorage.getItem('twing_customer_device_token') || undefined,
      isVerified: customer?.isVerified ?? true,
      verifiedAt: customer?.verifiedAt || new Date().toISOString(),
    };

    saveStoredCustomer(updated);
    setCustomer(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    clearStoredCustomer();
    setCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setVerifyPhone('');
    setVerifyName('');
    setVerifyAddress('');
    setOtpSent(false);
    setOtpCode('');
    setActiveTab('verification');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#0052cc] via-[#0b63e5] to-teal-700 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center font-bold text-lg text-white">
                {customer?.name ? customer.name.charAt(0).toUpperCase() : <User className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-1.5">
                  <span>{customer?.name || 'গ্রাহক অ্যাকাউন্ট'}</span>
                  {customer?.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-950" /> ভেরিফাইড
                    </span>
                  )}
                </h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  সেন্ট্রাল মার্কেটপ্লেস গ্রাহক প্রোফাইল
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'border-[#0052cc] text-[#0052cc]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>আমার প্রোফাইল</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'border-[#0052cc] text-[#0052cc]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>আমার অর্ডার ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'verification'
                  ? 'border-[#0052cc] text-[#0052cc]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>ডিভাইস ভেরিফিকেশন</span>
              {customer?.isVerified ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-700">
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>আপনার তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে!</span>
              </motion.div>
            )}

            {/* TAB 1: DEVICE VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-4">
                {customer?.isVerified ? (
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-3xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-emerald-950 text-base">
                          আপনার ডিভাইসটি সফলভাবে ভেরিফাইড!
                        </h4>
                        <p className="text-xs text-emerald-800">
                          ভেরিফাইড নম্বর: <span className="font-mono font-black">{customer.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl text-xs text-emerald-900 border border-emerald-200/80 leading-relaxed">
                      ✅ আপনার এই ডিভাইসটি সেন্ট্রাল মার্কেটপ্লেসের অনুমোদিত ডিভাইস হিসেবে নিবন্ধিত রয়েছে। আপনি যেকোনো সময় সহজে ভেরিফাইড মার্চেন্টদের থেকে সরাসরি অর্ডার করতে পারবেন।
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                      <span className="text-[11px] text-emerald-700">
                        ভেরিফিকেশনের তারিখ: {customer.verifiedAt ? new Date(customer.verifiedAt).toLocaleDateString('bn-BD') : 'সংরক্ষিত'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyPhone(customer.phone);
                          setVerifyName(customer.name);
                          setVerifyAddress(customer.address);
                          setOtpSent(false);
                          setCustomer(null);
                        }}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                      >
                        অন্য নম্বর দিয়ে ভেরিফাই করুন
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <div className="font-black text-amber-900">
                          সেন্ট্রাল মার্কেটপ্লেসে অর্ডার করার জন্য ডিভাইস ভেরিফিকেশন আবশ্যক
                        </div>
                        <p className="text-amber-800 leading-relaxed">
                          ভুয়া অর্ডার রোধ এবং কাস্টমার ডেলিভারি নিশ্চিত করতে আপনার মোবাইল নম্বর ও ডিভাইসটি একবার ভেরিফাই করে নিন। একবার ভেরিফাই করলে এই ডিভাইসে আর ওটিপি লাগবে না।
                        </p>
                      </div>
                    </div>

                    {otpError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{otpError}</span>
                      </div>
                    )}

                    {otpSuccessMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{otpSuccessMessage}</span>
                      </div>
                    )}

                    {!otpSent ? (
                      <form onSubmit={handleSendOtp} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            আপনার পুরো নাম *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="যেমন: মো: রফিকুল ইসলাম"
                            value={verifyName}
                            onChange={(e) => setVerifyName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            সচল মোবাইল নম্বর (১১ ডিজিট) *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="01XXXXXXXXX"
                            value={verifyPhone}
                            onChange={(e) => setVerifyPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            এই নম্বরে ৬ ডিজিটের ওটিপি যাচাই কোড পাঠানো হবে।
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ডেলিভারি ঠিকানা (ঐচ্ছিক)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="বাসা নং, রোড, এলাকা, জেলা"
                            value={verifyAddress}
                            onChange={(e) => setVerifyAddress(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingOtp || !verifyPhone.trim() || !verifyName.trim()}
                          className="w-full py-3 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSendingOtp ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>ওটিপি কোড পাঠানো হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" />
                              <span>ওটিপি কোড পাঠান</span>
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-3 bg-emerald-50/70 p-4 rounded-2xl border-2 border-emerald-400">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-950">
                            প্রেরিত নম্বর: <span className="font-mono">{verifyPhone}</span>
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md">
                            টেস্ট কোড: 123456
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-emerald-950 mb-1">
                            ৬ ডিজিটের ওটিপি কোডটি লিখুন:
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            autoFocus
                            placeholder="123456"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full text-center font-mono font-black text-xl tracking-widest px-4 py-2.5 bg-white border-2 border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          {countdown > 0 ? (
                            <span>পুনরায় কোড পাঠানোর সময় বাকি: {countdown} সেকেন্ড</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendOtp()}
                              disabled={isSendingOtp}
                              className="text-emerald-700 font-bold hover:underline cursor-pointer"
                            >
                              পুনরায় কোড পাঠান
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                          >
                            নম্বর পরিবর্তন করুন
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isVerifyingOtp || !otpCode.trim()}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isVerifyingOtp ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>যাচাই হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>ডিভাইস ভেরিফাই সম্পন্ন করুন</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MY PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Device Status Bar */}
                <div
                  onClick={() => setActiveTab('verification')}
                  className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    customer?.isVerified
                      ? 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/60'
                      : 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {customer?.isVerified ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-black text-slate-800">
                        {customer?.isVerified ? 'ডিভাইস ভেরিফাইড (অর্ডার করার জন্য প্রস্তুত)' : 'ডিভাইস ভেরিফাই করা হয়নি'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {customer?.isVerified ? 'অর্ডার করতে কোনো ওটিপি লাগবে না' : 'অর্ডার করার আগে মোবাইল ভেরিফাই করুন'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Profile Form */}
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        সম্পূর্ণ নাম *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden bg-white"
                        placeholder="আপনার নাম"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        মোবাইল নম্বর *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden bg-white font-mono"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ডেলিভারি ঠিকানা
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden bg-white"
                        placeholder="বাসা নং, রোড নং, এলাকা, থানা, জেলা"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ডেলিভারি এরিয়া
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCity('dhaka')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            city === 'dhaka'
                              ? 'border-[#0052cc] bg-blue-50 text-[#0052cc]'
                              : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                        >
                          ঢাকার ভেতরে
                        </button>
                        <button
                          type="button"
                          onClick={() => setCity('outside')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            city === 'outside'
                              ? 'border-[#0052cc] bg-blue-50 text-[#0052cc]'
                              : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                        >
                          ঢাকার বাইরে
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold bg-[#0052cc] hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> সংরক্ষণ করুন
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">নাম</div>
                        <div className="font-extrabold text-slate-800">{customer?.name || 'দেওয়া হয়নি'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">মোবাইল নম্বর</div>
                        <div className="font-extrabold text-slate-800 font-mono">{customer?.phone || 'দেওয়া হয়নি'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">ডেলিভারি এরিয়া ও ঠিকানা</div>
                        <div className="font-extrabold text-slate-800">
                          {customer?.city === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকার ভেতরে'}
                          {customer?.address ? ` — ${customer.address}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3.5 py-2 text-xs font-bold border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" /> তথ্য পরিবর্তন করুন
                      </button>

                      {customer && (
                        <button
                          onClick={handleLogout}
                          className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" /> অ্যাকাউন্ট পরিবর্তন
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RECENT ORDERS */}
            {activeTab === 'orders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#0052cc]" /> সেন্ট্রাল মার্কেটপ্লেস অর্ডারসমূহ ({orders.length})
                  </h4>
                  {customer?.phone && (
                    <button
                      onClick={() => fetchOrders(customer.phone)}
                      className="text-[11px] text-[#0052cc] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                      <span>রিফ্রেশ</span>
                    </button>
                  )}
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-slate-600 font-bold text-xs">এখনও কোনো অর্ডার করেননি</p>
                    <p className="text-slate-400 text-[11px]">
                      সেন্ট্রাল মার্কেটপ্লেসের পণ্য কার্টে যুক্ত করে সহজে অর্ডার সম্পন্ন করতে পারবেন।
                    </p>
                    {onOpenCart && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCart();
                        }}
                        className="mt-2 px-4 py-2 bg-[#0052cc] text-white text-xs font-black rounded-xl hover:bg-blue-700 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>কার্ট দেখুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs transition"
                      >
                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-900 flex items-center gap-2">
                            <span>#{order.orderNumber || order.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                order.overallStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.overallStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.overallStatus === 'delivered'
                                ? 'ডেলিভার্ড'
                                : order.overallStatus === 'cancelled'
                                ? 'বাতিল'
                                : 'প্রক্রিয়াধীন'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bn-BD') : ''} • {formatMoney(order.grandTotal || 0)}
                          </div>
                        </div>

                        {onOpenTracking && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenTracking(order.orderNumber || order.id);
                            }}
                            className="px-3 py-1.5 text-[11px] font-black text-white bg-[#0052cc] hover:bg-blue-700 rounded-xl flex items-center gap-1 shadow-xs transition cursor-pointer"
                          >
                            <span>ট্র্যাক</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
            <span className="text-[11px] text-slate-500">
              {customer?.isVerified ? 'ডিভাইস ভেরিফাইড' : 'ডিভাইস আনভেরিফাইড'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CustomerAccountView;
