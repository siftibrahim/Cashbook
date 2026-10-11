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
  LogIn,
  UserPlus,
  KeyRound,
  Check,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';
import { MarketplaceMasterOrder } from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import { playPaymentChime, triggerConfettiCelebration } from '../../utils/audio';

export interface VerifiedCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  googleId?: string;
  picture?: string;
  address: string;
  city?: 'dhaka' | 'outside' | string;
  deviceToken?: string;
  isVerified: boolean;
  verifiedAt?: string;
}

const CUSTOMER_STORAGE_KEY = 'twing_verified_customer_profile';
const MKT_CUSTOMER_ORDERS_KEY = 'twing_marketplace_customer_orders_v1';

export function getCustomerOrdersStorageKey(phone?: string): string {
  if (!phone) return 'twing_mkt_orders_guest';
  const digits = phone.replace(/[^\d]/g, '').slice(-10);
  return digits ? `twing_mkt_orders_${digits}` : 'twing_mkt_orders_guest';
}

export function getCustomerDeviceTokenKey(phone?: string): string {
  if (!phone) return 'twing_customer_device_token';
  const digits = phone.replace(/[^\d]/g, '').slice(-10);
  return digits ? `twing_device_token_${digits}` : 'twing_customer_device_token';
}

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
    const prev = getStoredCustomer();
    const prevDigits = (prev?.phone || '').replace(/[^\d]/g, '').slice(-10);
    const newDigits = (customer?.phone || '').replace(/[^\d]/g, '').slice(-10);
    // If logging in as a different customer phone, clean up old customer's legacy keys
    if (prevDigits && newDigits && prevDigits !== newDigits) {
      localStorage.removeItem(MKT_CUSTOMER_ORDERS_KEY);
      localStorage.removeItem('twing_mkt_customer_orders_v1');
    }

    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    localStorage.setItem('twing_mkt_cust_name', customer.name);
    localStorage.setItem('twing_mkt_cust_phone', customer.phone);
    localStorage.setItem('twing_mkt_cust_address', customer.address);
    if (customer.deviceToken && newDigits) {
      localStorage.setItem(getCustomerDeviceTokenKey(customer.phone), customer.deviceToken);
      localStorage.setItem('twing_customer_device_token', customer.deviceToken);
    }
  } catch (e) {
    console.warn('Error saving stored customer:', e);
  }
}

export function clearStoredCustomer(): void {
  try {
    const current = getStoredCustomer();
    if (current?.phone) {
      const digits = current.phone.replace(/[^\d]/g, '').slice(-10);
      localStorage.removeItem(`twing_mkt_orders_${digits}`);
      localStorage.removeItem(`twing_device_token_${digits}`);
    }
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    localStorage.removeItem('twing_mkt_cust_name');
    localStorage.removeItem('twing_mkt_cust_phone');
    localStorage.removeItem('twing_mkt_cust_address');
    localStorage.removeItem('twing_customer_device_token');
    localStorage.removeItem(MKT_CUSTOMER_ORDERS_KEY);
    localStorage.removeItem('twing_mkt_customer_orders_v1');
  } catch (e) {
    console.warn('Error clearing stored customer:', e);
  }
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export interface CustomerAccountViewProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracking?: (orderNumber: string) => void;
  onOpenCart?: () => void;
  initialTab?: 'profile' | 'orders' | 'login' | 'register';
  onCustomerChange?: (customer: VerifiedCustomer | null) => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({
  isOpen,
  onClose,
  onOpenTracking,
  onOpenCart,
  initialTab = 'profile',
  onCustomerChange,
}) => {
  const [customer, setCustomer] = useState<VerifiedCustomer | null>(() => getStoredCustomer());
  const [orders, setOrders] = useState<MarketplaceMasterOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      setCustomer(getStoredCustomer());
    };
    window.addEventListener('twing_profile_updated', handleSync);
    return () => window.removeEventListener('twing_profile_updated', handleSync);
  }, []);

  // Tab State: 'login' | 'register' | 'profile' | 'orders'
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile' | 'orders'>('login');

  // Login Form States (Passwordless OTP)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [isLoginOtpSent, setIsLoginOtpSent] = useState(false);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [loginCountdown, setLoginCountdown] = useState(0);

  // Register Form States (Unique Phone Enforcement)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState<'dhaka' | 'outside'>('dhaka');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [isRegOtpSent, setIsRegOtpSent] = useState(false);
  const [isSendingRegOtp, setIsSendingRegOtp] = useState(false);
  const [isVerifyingRegOtp, setIsVerifyingRegOtp] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regCountdown, setRegCountdown] = useState(0);
  const [phoneAlreadyExistsError, setPhoneAlreadyExistsError] = useState(false);

  // Google Login / Binding States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState('');
  const [googleUserName, setGoogleUserName] = useState('');
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const [googlePendingData, setGooglePendingData] = useState<{
    googleId?: string;
    email?: string;
    name?: string;
    picture?: string;
  } | null>(null);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState<'dhaka' | 'outside'>('dhaka');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state on modal open
  useEffect(() => {
    if (!isOpen) return;

    const stored = getStoredCustomer();
    setCustomer(stored);

    if (stored && stored.phone) {
      setEditName(stored.name || '');
      setEditPhone(stored.phone || '');
      setEditAddress(stored.address || '');
      setEditCity((stored.city as 'dhaka' | 'outside') || 'dhaka');
      setActiveTab(initialTab === 'orders' ? 'orders' : 'profile');
      fetchOrders(stored.phone);
    } else {
      setOrders([]);
      setActiveTab(initialTab === 'register' ? 'register' : 'login');
    }

    // Reset OTP input forms
    setLoginError('');
    setLoginSuccessMsg('');
    setIsLoginOtpSent(false);
    setLoginOtpCode('');
    setRegError('');
    setRegSuccessMsg('');
    setIsRegOtpSent(false);
    setRegOtpCode('');
    setPhoneAlreadyExistsError(false);
    setGooglePendingData(null);
  }, [isOpen, initialTab]);

  // Countdown timers
  useEffect(() => {
    if (loginCountdown <= 0) return;
    const t = setInterval(() => setLoginCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [loginCountdown]);

  useEffect(() => {
    if (regCountdown <= 0) return;
    const t = setInterval(() => setRegCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [regCountdown]);

  const fetchOrders = async (custPhone: string) => {
    if (!custPhone || !custPhone.trim()) {
      setOrders([]);
      return;
    }
    const cleanPhoneDigits = custPhone.replace(/[^\d]/g, '').slice(-10);
    if (!cleanPhoneDigits) {
      setOrders([]);
      return;
    }

    setIsLoadingOrders(true);
    try {
      // 1. Cached isolated customer orders
      const userOrdersKey = getCustomerOrdersStorageKey(custPhone);
      const savedOrders = localStorage.getItem(userOrdersKey);
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((o: any) => {
              const oPhone = String(o.customerPhone || o.customer_phone || '').replace(/[^\d]/g, '');
              return oPhone.endsWith(cleanPhoneDigits);
            });
            setOrders(filtered);
          }
        } catch {
          // ignore
        }
      }

      // 2. Live server fetch
      const devToken =
        localStorage.getItem(getCustomerDeviceTokenKey(custPhone)) ||
        localStorage.getItem('twing_customer_device_token') ||
        undefined;
      const res = await marketplaceApi.getCustomerOrders(custPhone, devToken);
      if (res.success && Array.isArray(res.orders)) {
        const verifiedList = res.orders.filter((ord: any) => {
          const ordPhone = String(ord.customerPhone || ord.customer_phone || '').replace(/[^\d]/g, '');
          return ordPhone.endsWith(cleanPhoneDigits);
        });
        setOrders(verifiedList);
        localStorage.setItem(userOrdersKey, JSON.stringify(verifiedList));
      }
    } catch (e) {
      console.debug('Error loading orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // ------------------------------------------------------------------------
  // 1. PASSWORDLESS LOGIN FLOW (পাসওয়ার্ড ছাড়া ওটিপি লগইন)
  // ------------------------------------------------------------------------
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoginSuccessMsg('');

    const clean = loginPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = clean.startsWith('+88')
      ? clean.slice(3)
      : clean.startsWith('88')
      ? clean.slice(2)
      : clean;

    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      setLoginError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }

    setIsSendingLoginOtp(true);
    try {
      const res = await marketplaceApi.customerSendOtp({
        phone: standardPhone,
        mode: 'login',
      });

      setIsLoginOtpSent(true);
      setLoginCountdown(120);
      setLoginSuccessMsg(res.message || 'আপনার মোবাইলে ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।');
    } catch (err: any) {
      if (err.code === 'ACCOUNT_NOT_FOUND') {
        setLoginError(
          'এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে "রেজিস্ট্রেশন" বাটনে ক্লিক করে নতুন অ্যাকাউন্ট তৈরি করুন।'
        );
      } else {
        setLoginError(err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginOtpCode.trim()) {
      setLoginError('অনুগ্রহ করে ৬ ডিজিটের ওটিপি কোডটি লিখুন');
      return;
    }

    const clean = loginPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = clean.startsWith('+88')
      ? clean.slice(3)
      : clean.startsWith('88')
      ? clean.slice(2)
      : clean;

    setIsVerifyingLoginOtp(true);
    try {
      const deviceToken =
        localStorage.getItem(getCustomerDeviceTokenKey(standardPhone)) ||
        `dev_tok_${standardPhone}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const res = await marketplaceApi.customerVerifyOtp({
        phone: standardPhone,
        otp: loginOtpCode.trim(),
        deviceToken,
        email: googlePendingData?.email,
        googleId: googlePendingData?.googleId,
        picture: googlePendingData?.picture,
      });

      if (res.success && res.customer) {
        const loggedInCust: VerifiedCustomer = {
          id: res.customer.id || 'cust_' + standardPhone,
          name: res.customer.name || 'সম্মানিত গ্রাহক',
          phone: standardPhone,
          email: res.customer.email,
          googleId: res.customer.googleId,
          picture: res.customer.picture,
          address: res.customer.address || '',
          city: res.customer.city || 'dhaka',
          deviceToken: res.token || deviceToken,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };

        saveStoredCustomer(loggedInCust);
        setCustomer(loggedInCust);
        setEditName(loggedInCust.name);
        setEditPhone(loggedInCust.phone);
        setEditAddress(loggedInCust.address);
        setEditCity((loggedInCust.city as 'dhaka' | 'outside') || 'dhaka');

        setIsLoginOtpSent(false);
        setLoginOtpCode('');
        setGooglePendingData(null);
        setActiveTab('profile');
        setSaveSuccess(true);

        playPaymentChime();
        triggerConfettiCelebration();
        fetchOrders(standardPhone);
        if (onCustomerChange) onCustomerChange(loggedInCust);

        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setLoginError(res.error || 'ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setLoginError(err.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে। সঠিক কোডটি দিন।');
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  // ------------------------------------------------------------------------
  // 2. REGISTRATION FLOW (একই নম্বর বারবার ব্যবহার নিষিদ্ধ)
  // ------------------------------------------------------------------------
  const handleSendRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');
    setPhoneAlreadyExistsError(false);

    if (!regName.trim()) {
      setRegError('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }

    const clean = regPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = clean.startsWith('+88')
      ? clean.slice(3)
      : clean.startsWith('88')
      ? clean.slice(2)
      : clean;

    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      setRegError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }

    setIsSendingRegOtp(true);
    try {
      const res = await marketplaceApi.customerSendOtp({
        phone: standardPhone,
        mode: 'register',
        name: regName.trim(),
        address: regAddress.trim(),
        city: regCity,
        email: googlePendingData?.email,
        googleId: googlePendingData?.googleId,
        picture: googlePendingData?.picture,
      });

      setIsRegOtpSent(true);
      setRegCountdown(120);
      setRegSuccessMsg(res.message || 'আপনার মোবাইলে ৬ ডিজিটের ভেরিফিকেশন কোড পাঠানো হয়েছে।');
    } catch (err: any) {
      if (err.code === 'PHONE_ALREADY_EXISTS') {
        setPhoneAlreadyExistsError(true);
        setRegError(
          '⚠️ এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। একই নম্বর বারবার ব্যবহার করে অ্যাকাউন্ট তৈরি করা যাবে না। অনুগ্রহ করে পাসওয়ার্ড ছাড়াই ওটিপি দিয়ে সরাসরি লগইন করুন।'
        );
      } else {
        setRegError(err.message || 'রেজিস্ট্রেশন ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } finally {
      setIsSendingRegOtp(false);
    }
  };

  const handleVerifyRegOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regOtpCode.trim()) {
      setRegError('অনুগ্রহ করে ৬ ডিজিটের ওটিপি কোডটি লিখুন');
      return;
    }

    const clean = regPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = clean.startsWith('+88')
      ? clean.slice(3)
      : clean.startsWith('88')
      ? clean.slice(2)
      : clean;

    setIsVerifyingRegOtp(true);
    try {
      const deviceToken =
        localStorage.getItem(getCustomerDeviceTokenKey(standardPhone)) ||
        `dev_tok_${standardPhone}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const res = await marketplaceApi.customerVerifyOtp({
        phone: standardPhone,
        otp: regOtpCode.trim(),
        deviceToken,
        name: regName.trim(),
        address: regAddress.trim(),
        city: regCity,
        email: googlePendingData?.email,
        googleId: googlePendingData?.googleId,
        picture: googlePendingData?.picture,
      });

      if (res.success && res.customer) {
        const newCust: VerifiedCustomer = {
          id: res.customer.id || 'cust_' + standardPhone,
          name: res.customer.name || regName.trim(),
          phone: standardPhone,
          email: res.customer.email || googlePendingData?.email,
          googleId: res.customer.googleId || googlePendingData?.googleId,
          picture: res.customer.picture || googlePendingData?.picture,
          address: res.customer.address || regAddress.trim(),
          city: res.customer.city || regCity,
          deviceToken: res.token || deviceToken,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };

        saveStoredCustomer(newCust);
        setCustomer(newCust);
        setEditName(newCust.name);
        setEditPhone(newCust.phone);
        setEditAddress(newCust.address);
        setEditCity((newCust.city as 'dhaka' | 'outside') || 'dhaka');

        setIsRegOtpSent(false);
        setRegOtpCode('');
        setGooglePendingData(null);
        setActiveTab('profile');
        setSaveSuccess(true);

        playPaymentChime();
        triggerConfettiCelebration();
        fetchOrders(standardPhone);
        if (onCustomerChange) onCustomerChange(newCust);

        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setRegError(res.error || 'ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setRegError(err.message || 'রেজিস্ট্রেশন যাচাই ব্যর্থ হয়েছে। সঠিক কোডটি দিন।');
    } finally {
      setIsVerifyingRegOtp(false);
    }
  };

  // ------------------------------------------------------------------------
  // 3. GOOGLE SIGN-IN FLOW (গুগল দিয়ে লগইন / রেজিস্ট্রেশন)
  // ------------------------------------------------------------------------
  const handleInitiateGoogleAuth = async (emailOverride?: string, nameOverride?: string) => {
    setIsGoogleProcessing(true);
    setLoginError('');
    setRegError('');

    try {
      const email = emailOverride || googleUserEmail.trim() || 'siftibrahim@gmail.com';
      const name = nameOverride || googleUserName.trim() || email.split('@')[0];
      const googleId = 'g_' + Math.abs(email.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0));

      const res = await marketplaceApi.customerGoogleAuth({
        email,
        name,
        googleId,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });

      if (res.isLinked && res.customer) {
        // Already linked to existing verified customer! Instant Login!
        const cust: VerifiedCustomer = {
          id: res.customer.id,
          name: res.customer.name,
          phone: res.customer.phone,
          email: res.customer.email,
          googleId: res.customer.googleId,
          picture: res.customer.picture,
          address: res.customer.address || '',
          city: res.customer.city || 'dhaka',
          deviceToken: res.token,
          isVerified: true,
          verifiedAt: new Date().toISOString(),
        };

        saveStoredCustomer(cust);
        setCustomer(cust);
        setEditName(cust.name);
        setEditPhone(cust.phone);
        setEditAddress(cust.address);
        setEditCity((cust.city as 'dhaka' | 'outside') || 'dhaka');

        setShowGoogleModal(false);
        setActiveTab('profile');
        setSaveSuccess(true);
        playPaymentChime();
        triggerConfettiCelebration();
        fetchOrders(cust.phone);
        if (onCustomerChange) onCustomerChange(cust);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else if (res.needsPhone && res.googleData) {
        // First-time Google user: Prompt for phone number to ensure uniqueness and security
        setGooglePendingData(res.googleData);
        setShowGoogleModal(false);
        setRegName(res.googleData.name || '');
        setActiveTab('register');
        setRegSuccessMsg(
          `গুগল ভেরিফিকেশন সম্পন্ন (${res.googleData.email})! অ্যাকাউন্টটি সুরক্ষিত করতে এবং কেনাকাটা শুরু করতে আপনার ১১ ডিজিটের মোবাইল নম্বর দিন:`
        );
      }
    } catch (err: any) {
      setLoginError(err.message || 'গুগল সাইন-ইন সম্পন্ন করা যায়নি');
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  // ------------------------------------------------------------------------
  // 4. PROFILE UPDATE & LOGOUT
  // ------------------------------------------------------------------------
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;

    const updated: VerifiedCustomer = {
      id: customer?.id || 'cust_' + editPhone.replace(/[^\d]/g, ''),
      name: editName.trim(),
      phone: editPhone.trim(),
      email: customer?.email,
      googleId: customer?.googleId,
      picture: customer?.picture,
      address: editAddress.trim(),
      city: editCity,
      deviceToken: customer?.deviceToken || localStorage.getItem(getCustomerDeviceTokenKey(editPhone.trim())) || undefined,
      isVerified: customer?.isVerified ?? true,
      verifiedAt: customer?.verifiedAt || new Date().toISOString(),
    };

    saveStoredCustomer(updated);
    setCustomer(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    if (onCustomerChange) onCustomerChange(updated);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    setOrders([]);
    setCustomer(null);
    setEditName('');
    setEditPhone('');
    setEditAddress('');
    setLoginPhone('');
    setLoginOtpCode('');
    setIsLoginOtpSent(false);
    setRegName('');
    setRegPhone('');
    setRegAddress('');
    setIsRegOtpSent(false);
    setGooglePendingData(null);
    clearStoredCustomer();
    setActiveTab('login');
    if (onCustomerChange) onCustomerChange(null);
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
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center font-bold text-lg text-white shrink-0 overflow-hidden">
                {customer?.picture ? (
                  <img src={customer.picture} alt="" className="w-full h-full object-cover" />
                ) : customer?.name ? (
                  customer.name.charAt(0).toUpperCase()
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-1.5">
                  <span>{customer?.name || 'কাস্টমার লগইন ও রেজিস্ট্রেশন'}</span>
                  {customer?.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-emerald-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      <ShieldCheck className="w-3 h-3 text-emerald-950" /> ভেরিফাইড ক্রেতা
                    </span>
                  )}
                </h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  সেন্ট্রাল মার্কেটপ্লেস কাস্টমার পোর্টাল
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
          <div className="flex border-b border-slate-200 bg-slate-50/90 px-4 pt-2 gap-1 text-xs font-bold text-slate-600 overflow-x-auto">
            {customer ? (
              <>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
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
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'orders'
                      ? 'border-[#0052cc] text-[#0052cc]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>আমার অর্ডার ({orders.length})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setActiveTab('login');
                    setPhoneAlreadyExistsError(false);
                  }}
                  className={`pb-2.5 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'login'
                      ? 'border-[#0052cc] text-[#0052cc]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>লগইন করুন (পাসওয়ার্ড ছাড়া)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('register');
                    setLoginError('');
                  }}
                  className={`pb-2.5 px-3.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'register'
                      ? 'border-[#0052cc] text-[#0052cc]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>নতুন রেজিস্ট্রেশন</span>
                </button>
              </>
            )}
          </div>

          {/* Content Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700">
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>🎉 স্বাগতম! আপনার অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে। এখন সেন্ট্রাল মার্কেটপ্লেসে কেনাকাটা করতে পারবেন।</span>
              </motion.div>
            )}

            {/* Google Pending Banner */}
            {googlePendingData && !customer && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs">
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-blue-950">
                    গুগল অ্যাকাউন্ট সংযুক্ত: <span className="font-semibold">{googlePendingData.email}</span>
                  </div>
                  <div className="text-[11px] text-blue-700">
                    অ্যাকাউন্ট ভেরিফাই করতে আপনার ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: LOGIN (পাসওয়ার্ড ছাড়া ওটিপি লগইন) */}
            {/* ============================================================= */}
            {activeTab === 'login' && !customer && (
              <div className="space-y-4">
                {/* 1-Click Google Sign In Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(true)}
                    disabled={isGoogleProcessing}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>গুগল অ্যাকাউন্ট দিয়ে লগইন করুন</span>
                  </button>

                  <div className="flex items-center gap-2 my-2 text-[11px] text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span>অথবা মোবাইল নম্বরে ওটিপি দিয়ে</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-[#0052cc] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-slate-800">কোন পাসওয়ার্ড প্রয়োজন নেই:</strong> আপনার মোবাইল নম্বর দিন,
                    আমরা মোবাইলে ৬ ডিজিটের ওটিপি পাঠাবো। ওটিপি দিয়ে আপনার অ্যাকাউন্ট ও পূর্বের সকল অর্ডার রিস্টোর হয়ে যাবে।
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span>{loginError}</span>
                      {loginError.includes('রেজিস্ট্রেশন') && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setRegPhone(loginPhone);
                              setActiveTab('register');
                            }}
                            className="mt-1 px-3 py-1 bg-[#0052cc] text-white font-bold rounded-lg hover:bg-blue-700 cursor-pointer text-[11px]"
                          >
                            👉 এখনই রেজিস্ট্রেশন করুন
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {loginSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{loginSuccessMsg}</span>
                  </div>
                )}

                {!isLoginOtpSent ? (
                  <form onSubmit={handleSendLoginOtp} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        নিবন্ধিত মোবাইল নম্বর (১১ ডিজিট) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="01XXXXXXXXX"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        আপনার মোবাইলে তাৎক্ষণিক ওটিপি কোড পাঠানো হবে।
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingLoginOtp || !loginPhone.trim()}
                      className="w-full py-3 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSendingLoginOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>ওটিপি কোড পাঠানো হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          <span>ওটিপি পাঠান ও লগইন করুন</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="space-y-3 bg-blue-50/80 p-4 rounded-2xl border-2 border-[#0052cc]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-950">
                        মোবাইল নম্বর: <span className="font-mono">{loginPhone}</span>
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-blue-950 mb-1">
                        ৬ ডিজিটের ওটিপি কোডটি লিখুন:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value)}
                        className="w-full text-center font-mono font-black text-xl tracking-widest px-4 py-2.5 bg-white border-2 border-[#0052cc] rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      {loginCountdown > 0 ? (
                        <span>পুনরায় পাঠানোর সময় বাকি: {loginCountdown} সে.</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendLoginOtp()}
                          disabled={isSendingLoginOtp}
                          className="text-[#0052cc] font-bold hover:underline cursor-pointer"
                        >
                          পুনরায় ওটিপি পাঠান
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsLoginOtpSent(false)}
                        className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                      >
                        নম্বর পরিবর্তন করুন
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingLoginOtp || !loginOtpCode.trim()}
                      className="w-full py-3 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifyingLoginOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>যাচাই হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ওটিপি যাচাই করে একাউন্টে প্রবেশ করুন</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Switch to Register */}
                <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
                  এখনও অ্যাকাউন্ট তৈরি করেননি?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRegPhone(loginPhone);
                      setActiveTab('register');
                    }}
                    className="font-bold text-[#0052cc] hover:underline cursor-pointer"
                  >
                    নতুন রেজিস্ট্রেশন করুন
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: REGISTER (একই নম্বর বারবার ব্যবহার নিষিদ্ধ) */}
            {/* ============================================================= */}
            {activeTab === 'register' && !customer && (
              <div className="space-y-4">
                {/* Google Sign In option */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(true)}
                    disabled={isGoogleProcessing}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>গুগল অ্যাকাউন্ট দিয়ে দ্রুত রেজিস্ট্রেশন</span>
                  </button>

                  <div className="flex items-center gap-2 my-2 text-[11px] text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span>অথবা তথ্য দিয়ে রেজিস্ট্রেশন</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>

                {phoneAlreadyExistsError && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-xs space-y-2">
                    <div className="font-extrabold flex items-center gap-1.5 text-rose-950">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>একই নম্বর বারবার ব্যবহার করা যাবে না!</span>
                    </div>
                    <p className="leading-relaxed">
                      এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট সক্রিয় রয়েছে। একই নম্বর দিয়ে একাধিক একাউন্ট তৈরি
                      অনুমোদিত নয়। আপনি পাসওয়ার্ড ছাড়াই ওটিপি দিয়ে সরাসরি আপনার পুরনো অ্যাকাউন্টে প্রবেশ করতে পারবেন।
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginPhone(regPhone);
                        setPhoneAlreadyExistsError(false);
                        setActiveTab('login');
                      }}
                      className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>সরাসরি ওটিপি দিয়ে লগইন করুন</span>
                    </button>
                  </div>
                )}

                {regError && !phoneAlreadyExistsError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{regSuccessMsg}</span>
                  </div>
                )}

                {!isRegOtpSent ? (
                  <form onSubmit={handleSendRegOtp} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        আপনার পুরো নাম *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: মো: রফিকুল ইসলাম"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
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
                        value={regPhone}
                        onChange={(e) => {
                          setRegPhone(e.target.value);
                          setPhoneAlreadyExistsError(false);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        🔒 একই নম্বর দিয়ে কেবল একটি অ্যাকাউন্ট তৈরি সম্ভব। নম্বরটিতে ওটিপি পাঠানো হবে।
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="বাসা নং, রোড, এলাকা, জেলা"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ডেলিভারি অঞ্চল
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRegCity('dhaka')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            regCity === 'dhaka'
                              ? 'border-[#0052cc] bg-blue-50 text-[#0052cc]'
                              : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                        >
                          ঢাকার ভেতরে
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegCity('outside')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            regCity === 'outside'
                              ? 'border-[#0052cc] bg-blue-50 text-[#0052cc]'
                              : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                        >
                          ঢাকার বাইরে
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingRegOtp || !regPhone.trim() || !regName.trim()}
                      className="w-full py-3 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSendingRegOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>যাচাই ও ওটিপি পাঠানো হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>রেজিস্ট্রেশন করুন ও ওটিপি পাঠান</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyRegOtp} className="space-y-3 bg-emerald-50/70 p-4 rounded-2xl border-2 border-emerald-500">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950">
                        প্রেরিত নম্বর: <span className="font-mono">{regPhone}</span>
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-emerald-950 mb-1">
                        ৬ ডিজিটের রেজিস্ট্রেশন ওটিপি লিখুন:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        value={regOtpCode}
                        onChange={(e) => setRegOtpCode(e.target.value)}
                        className="w-full text-center font-mono font-black text-xl tracking-widest px-4 py-2.5 bg-white border-2 border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      {regCountdown > 0 ? (
                        <span>পুনরায় পাঠানোর সময় বাকি: {regCountdown} সে.</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendRegOtp()}
                          disabled={isSendingRegOtp}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          পুনরায় কোড পাঠান
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRegOtpSent(false)}
                        className="text-slate-500 hover:text-slate-700 underline cursor-pointer"
                      >
                        তথ্য পরিবর্তন
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifyingRegOtp || !regOtpCode.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isVerifyingRegOtp ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>অ্যাকাউন্ট সম্পন্ন করুন ও কেনাকাটা শুরু করুন</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Switch to Login */}
                <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
                  ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginPhone(regPhone);
                      setActiveTab('login');
                    }}
                    className="font-bold text-[#0052cc] hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ছাড়া সরাসরি লগইন করুন
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: PROFILE (লগইন করা কাস্টমারের তথ্য) */}
            {/* ============================================================= */}
            {activeTab === 'profile' && customer && (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span>অ্যাকাউন্ট ভেরিফাইড ও সক্রিয়</span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        মোবাইল: <span className="font-mono font-bold">{customer.phone}</span>
                        {customer.email && ` • ${customer.email}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-950 font-black px-2 py-0.5 rounded-full">
                    রেডি টু অর্ডার
                  </span>
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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden bg-white"
                        placeholder="আপনার নাম"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        মোবাইল নম্বর (ভেরিফাইড)
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        disabled
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-500 font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">ভেরিফাইড মোবাইল নম্বর অপরিবর্তনযোগ্য</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ডেলিভারি ঠিকানা
                      </label>
                      <textarea
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
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
                          onClick={() => setEditCity('dhaka')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            editCity === 'dhaka'
                              ? 'border-[#0052cc] bg-blue-50 text-[#0052cc]'
                              : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                        >
                          ঢাকার ভেতরে
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCity('outside')}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border text-center transition cursor-pointer ${
                            editCity === 'outside'
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
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">গ্রাহকের নাম</div>
                        <div className="font-extrabold text-slate-800">{customer?.name || 'দেওয়া হয়নি'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">মোবাইল নম্বর</div>
                        <div className="font-extrabold text-slate-800 font-mono">{customer?.phone || 'দেওয়া হয়নি'}</div>
                      </div>

                      {customer?.email && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                          <div className="text-[10px] text-slate-400 font-bold mb-0.5">গুগল / ইমেইল</div>
                          <div className="font-bold text-slate-800">{customer.email}</div>
                        </div>
                      )}

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">ডেলিভারি এরিয়া ও ঠিকানা</div>
                        <div className="font-extrabold text-slate-800">
                          {customer?.city === 'outside' ? 'ঢাকার বাইরে' : 'ঢাকার ভেতরে'}
                          {customer?.address ? ` — ${customer.address}` : ' (ঠিকানা দেওয়া নেই)'}
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

                      <button
                        onClick={handleLogout}
                        className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> লগআউট করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: ORDERS (কাস্টমারের অর্ডারসমূহ) */}
            {/* ============================================================= */}
            {activeTab === 'orders' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#0052cc]" /> আমার সেন্ট্রাল মার্কেটপ্লেস অর্ডার ({orders.length})
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
                      সেন্ট্রাল মার্কেটপ্লেসে পছন্দের পণ্য কার্টে যুক্ত করে সহজে কেনাকাটা সম্পন্ন করুন।
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
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('bn-BD') : ''} •{' '}
                            {formatMoney(order.grandTotal || 0)}
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
              {customer?.isVerified ? '✅ ভেরিফাইড ক্রেতা অ্যাকাউন্ট' : '🔒 পাসওয়ার্ড ছাড়া নিরাপদ মার্কেটপ্লেস'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </motion.div>

        {/* Google Sign In Quick Prompt Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoogleIcon className="w-5 h-5" />
                  <h4 className="font-black text-slate-900 text-sm">গুগল অ্যাকাউন্ট নির্বাচন করুন</h4>
                </div>
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                আপনার গুগল অ্যাকাউন্টের মাধ্যমে ১-ক্লিকে সেন্ট্রাল মার্কেটপ্লেসে নিরাপদ লগইন করুন:
              </p>

              {/* Quick Preset / One Tap Account */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleInitiateGoogleAuth('siftibrahim@gmail.com', 'সায়িফ ইব্রাহিম')}
                  disabled={isGoogleProcessing}
                  className="w-full p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center gap-3 transition text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                    S
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">সায়িফ ইব্রাহিম</div>
                    <div className="text-[11px] text-slate-500 truncate">siftibrahim@gmail.com</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Custom Gmail Input Option */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">
                  অথবা অন্য কোনো জিমেইল অ্যাড্রেস লিখুন:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={googleUserEmail}
                    onChange={(e) => setGoogleUserEmail(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0052cc] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleInitiateGoogleAuth()}
                    disabled={isGoogleProcessing || !googleUserEmail.trim()}
                    className="px-3.5 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    চালিয়ে যান
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default CustomerAccountView;
