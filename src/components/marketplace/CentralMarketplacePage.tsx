import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Package,
  Flame,
  Star,
  CheckCircle2,
  ArrowRight,
  Truck,
  ShieldCheck,
  X,
  Plus,
  Minus,
  Trash2,
  Copy,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  MapPin,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  QrCode,
  Building2,
  Check,
  Search,
  ChevronRight,
  Store,
  Share2,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  MarketplaceProduct,
  MarketplaceCategory,
  MarketplaceCartItem,
  Product,
  OnlineStoreConfig,
} from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import {
  formatMoney,
  getSavedCustomerProfile,
  saveCustomerProfile,
  getDevicePhoneVerification,
  saveDevicePhoneVerification,
} from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';
import { subscribeToPaymentSettings, INITIAL_PAYMENT_SETTINGS } from '../../services/adminService';
import { SystemPaymentSettings } from '../../types/adminTypes';

// Import Storefront Component Suite (identical to Vendor Store)
import { StorefrontHeader } from '../storefront/StorefrontHeader';
import { StorefrontHamburgerDrawer } from '../storefront/StorefrontHamburgerDrawer';
import { StorefrontNotificationDrawer } from '../storefront/StorefrontNotificationDrawer';
import { StorefrontCustomerDrawer } from '../storefront/StorefrontCustomerDrawer';
import { StorefrontWishlistTab } from '../storefront/StorefrontWishlistTab';
import { StorefrontHeroCarousel } from '../storefront/StorefrontHeroCarousel';
import { StorefrontCategoryGrid } from '../storefront/StorefrontCategoryGrid';
import { StorefrontProductCard } from '../storefront/StorefrontProductCard';
import { StorefrontBottomNav, StorefrontTab } from '../storefront/StorefrontBottomNav';
import { StorefrontMoreTab } from '../storefront/StorefrontMoreTab';
import { StorefrontSupportDrawer } from '../storefront/StorefrontSupportDrawer';
import { StorefrontProductDetailModal } from '../storefront/StorefrontProductDetailModal';

// Storage keys
const MKT_WISHLIST_KEY = 'twing_marketplace_wishlist';
const MKT_CART_KEY = 'twing_marketplace_cart';
const MKT_CUSTOMER_ORDERS_KEY = 'twing_marketplace_customer_orders_v1';

interface CentralMarketplacePageProps {
  onMerchantLogin?: () => void;
  onBackToDashboard?: () => void;
}

export const CentralMarketplacePage: React.FC<CentralMarketplacePageProps> = ({
  onMerchantLogin,
  onBackToDashboard,
}) => {
  // Navigation tab (Identical 5-Tab layout as OnlineStorefrontModal)
  const [activeTab, setActiveTab] = useState<StorefrontTab>('home');

  // Drawers
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);

  // Search & Categories
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Feed & Products State
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Platform & Payment Settings
  const [marketplaceSettings, setMarketplaceSettings] = useState<any>({
    deliveryFeeDhaka: 70,
    deliveryFeeOutside: 130,
    codEnabled: true,
    bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও ১০০% অরিজিনাল পণ্যের নিশ্চয়তা!',
  });
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings>(INITIAL_PAYMENT_SETTINGS);
  const [banglaQrDataUrl, setBanglaQrDataUrl] = useState<string>('');

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem(MKT_WISHLIST_KEY, JSON.stringify(next));
      } catch {}
      showToast(exists ? 'পছন্দের তালিকা থেকে সরানো হয়েছে' : '❤️ পছন্দের তালিকায় যুক্ত করা হয়েছে');
      return next;
    });
  };

  const handleRemoveWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      try {
        localStorage.setItem(MKT_WISHLIST_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Cart & Checkout State
  const [cart, setCart] = useState<MarketplaceCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<MarketplaceProduct | null>(null);

  // Sync Cart to storage
  useEffect(() => {
    try {
      localStorage.setItem(MKT_CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Saved Customer profile
  const [customerName, setCustomerName] = useState<string>(() => getSavedCustomerProfile().name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    const prof = getSavedCustomerProfile();
    const dev = getDevicePhoneVerification();
    return dev?.phone || prof.phone || '';
  });
  const [customerAddress, setCustomerAddress] = useState<string>(() => getSavedCustomerProfile().address || '');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>(() => {
    const prof = getSavedCustomerProfile();
    return prof.deliveryCity === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
  });
  const [orderNotes, setOrderNotes] = useState<string>(() => getSavedCustomerProfile().notes || '');

  // Standardized 11-digit phone number
  const standardPhone = useMemo(() => {
    const cleanDigits = customerPhone.replace(/[^\d+]/g, '').trim();
    return cleanDigits.startsWith('+88')
      ? cleanDigits.slice(3)
      : cleanDigits.startsWith('88')
      ? cleanDigits.slice(2)
      : cleanDigits;
  }, [customerPhone]);

  // Phone OTP Verification State (Device-level 1-time verification)
  const [deviceVerificationVersion, setDeviceVerificationVersion] = useState(0);
  const isPhoneVerifiedOnDevice = useMemo(() => {
    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) return false;
    const verifiedRecord = getDevicePhoneVerification();
    return verifiedRecord?.phone === standardPhone && verifiedRecord?.verified === true;
  }, [standardPhone, deviceVerificationVersion]);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Check if standardPhone was previously verified on server
  useEffect(() => {
    if (standardPhone.length === 11 && standardPhone.startsWith('01')) {
      const devRecord = getDevicePhoneVerification();
      if (devRecord && devRecord.phone === standardPhone && devRecord.verified) {
        return;
      }
      marketplaceApi
        .checkPhoneVerified(standardPhone, devRecord?.deviceToken)
        .then((res) => {
          if (res.success && res.verified) {
            saveDevicePhoneVerification(standardPhone, devRecord?.deviceToken);
            setDeviceVerificationVersion((v) => v + 1);
          }
        })
        .catch(() => null);
    }
  }, [standardPhone]);

  // Send OTP
  const handleSendOtp = async () => {
    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      showToast('⚠️ অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }
    setIsSendingOtp(true);
    setOtpHint(null);
    try {
      const devRecord = getDevicePhoneVerification();
      const res = await marketplaceApi.sendOtp(standardPhone);
      if (res.success) {
        if ((res as any).alreadyVerified) {
          saveDevicePhoneVerification(standardPhone, (res as any).deviceToken || devRecord?.deviceToken);
          setDeviceVerificationVersion((v) => v + 1);
          setOtpSent(false);
          showToast('✅ এই ডিভাইসে মোবাইল নম্বরটি ইতিমধ্যে ভেরিফাইড!');
          return;
        }
        setOtpSent(true);
        setOtpCountdown(60);
        if (res.demoOtp) {
          setOtpHint(`কোড: ${res.demoOtp}`);
        }
        showToast('📲 আপনার মোবাইলে OTP কোড পাঠানো হয়েছে!');
      } else {
        showToast('❌ ' + (res.error || 'ওটিপি পাঠানো যায়নি'));
      }
    } catch (err: any) {
      showToast('❌ ' + (err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      showToast('⚠️ অনুগ্রহ করে মোবাইলে আসা OTP কোডটি লিখুন');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await marketplaceApi.verifyOtp(standardPhone, otpInput.trim());
      if (res.success && res.verified) {
        saveDevicePhoneVerification(standardPhone, res.deviceToken);
        setDeviceVerificationVersion((v) => v + 1);
        setOtpSent(false);
        setOtpInput('');
        setOtpHint(null);
        showToast('🎉 মোবাইল নম্বর সফলভাবে ভেরিফাই হয়েছে!');
      } else {
        showToast('❌ ' + (res.error || 'ভুল ওটিপি কোড!'));
      }
    } catch (err: any) {
      showToast('❌ ' + (err.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে'));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Tab Change Handler: Resets category, search, modals, and smoothly scrolls to top on 'home' click
  const handleTabChange = useCallback((tab: StorefrontTab) => {
    if (tab === 'home') {
      setSelectedCategory('all');
      setSearchQuery('');
      setSelectedProductForDetail(null);
      setIsCartOpen(false);
      setIsCheckoutStep(false);
      setIsMenuDrawerOpen(false);
      setIsNotificationsOpen(false);
      setIsCustomerDrawerOpen(false);
      setIsSupportDrawerOpen(false);

      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (typeof document !== 'undefined') {
        document.documentElement?.scrollTo({ top: 0, behavior: 'smooth' });
        document.body?.scrollTo({ top: 0, behavior: 'smooth' });
        const mainEl = document.getElementById('marketplace-main-scroll-container');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    setActiveTab(tab);
  }, []);

  // Payment Method selection (UddoktaPay, Bangla QR, MFS, COD, Bank)
  const [paymentMethod, setPaymentMethod] = useState<'paymently' | 'bangla_qr' | 'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank'>('paymently');
  const [customerTrxId, setCustomerTrxId] = useState('');
  const [customerSenderPhone, setCustomerSenderPhone] = useState('');
  const [selectedBankAccountIndex, setSelectedBankAccountIndex] = useState(0);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Submission & Deduplication Guard
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingOrderRef = useRef(false);
  const [completedMasterOrder, setCompletedMasterOrder] = useState<any | null>(null);

  // Paymently session state
  const [activePaymentlySession, setActivePaymentlySession] = useState<{
    paymentUrl: string;
    paymentId: string;
    orderId: string;
    amount: number;
  } | null>(null);
  const [isCheckingPaymentStatus, setIsCheckingPaymentStatus] = useState(false);
  const [manualInvoiceInput, setManualInvoiceInput] = useState('');
  const [isVerifyingInvoiceInput, setIsVerifyingInvoiceInput] = useState(false);

  // Stored Customer Master Orders
  const [customerOrders, setCustomerOrders] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(MKT_CUSTOMER_ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Tracking query & active tracked order
  const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [queriedOrder, setQueriedOrder] = useState<any | null>(null);

  // Cart helper calculations
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.product.salePrice || 0) * curr.quantity, 0);
  }, [cart]);

  const deliveryCharge = deliveryArea === 'inside_dhaka'
    ? Number(marketplaceSettings.deliveryFeeDhaka || 70)
    : Number(marketplaceSettings.deliveryFeeOutside || 130);

  const grandTotal = subtotal + (cart.length > 0 ? deliveryCharge : 0);

  // Add / Update / Remove Cart
  const addToCart = (product: Product, quantity = 1) => {
    const mktProd = product as MarketplaceProduct;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === mktProd.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === mktProd.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product: mktProd, quantity }];
    });
    showToast(`🛒 '${product.name}' কার্টে যুক্ত হয়েছে!`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as MarketplaceCartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('পণ্যটি কার্ট থেকে সরানো হয়েছে');
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    addToCart(product, quantity);
    setIsCartOpen(true);
    setIsCheckoutStep(true);
  };

  // Load Marketplace Feed, Categories, Settings
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [feedRes, catRes, settingsRes] = await Promise.all([
          marketplaceApi.getFeed({
            search: searchQuery,
            category: selectedCategory,
          }),
          marketplaceApi.getCategories(),
          marketplaceApi.getSettings(),
        ]);

        if (isMounted) {
          if (feedRes?.success && Array.isArray(feedRes.products)) {
            setProducts(feedRes.products);
          }
          if (catRes?.success && Array.isArray(catRes.categories)) {
            setCategories(catRes.categories);
          }
          if (settingsRes?.success && settingsRes.settings) {
            const s = settingsRes.settings;
            setMarketplaceSettings((prev: any) => ({ ...prev, ...s }));
            if (s.systemPaymentSettings || s.banglaQr || s.paymently) {
              setPaymentSettings((prev) => ({
                ...prev,
                ...(s.systemPaymentSettings || {}),
                paymently: s.paymently || s.systemPaymentSettings?.paymently || prev.paymently,
                banglaQr: s.banglaQr || s.systemPaymentSettings?.banglaQr || prev.banglaQr,
                bkash: s.bkash || s.systemPaymentSettings?.bkash || prev.bkash,
                nagad: s.nagad || s.systemPaymentSettings?.nagad || prev.nagad,
                rocket: s.rocket || s.systemPaymentSettings?.rocket || prev.rocket,
                upay: s.upay || s.systemPaymentSettings?.upay || prev.upay,
                bankTransfer: s.bankTransfer || s.systemPaymentSettings?.bankTransfer || prev.bankTransfer,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Central marketplace load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategory]);

  // Subscribe to Unified Payment Settings from Super Admin
  useEffect(() => {
    const unsub = subscribeToPaymentSettings((data) => {
      if (data) {
        setPaymentSettings((prev) => ({
          ...prev,
          ...data,
          paymently: data.paymently || prev.paymently,
          banglaQr: data.banglaQr || prev.banglaQr,
        }));
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Sync / Generate Bangla QR Data URL from live settings
  useEffect(() => {
    const bQr = paymentSettings.banglaQr;
    if (bQr?.qrCodeUrl) {
      setBanglaQrDataUrl(bQr.qrCodeUrl);
    } else if (bQr?.qrPayload) {
      QRCode.toDataURL(bQr.qrPayload, { width: 320, margin: 2 })
        .then((url) => setBanglaQrDataUrl(url))
        .catch(() => {});
    } else if (bQr?.merchantId) {
      const merchant = bQr.merchantId || '01306908115';
      const title = bQr.accountTitle || 'TWING HISABI SUPER ADMIN';
      const qrText = `BANGLA_QR:${merchant}:${title}:${bQr.bankOrMfsName || 'MFS'}`;
      QRCode.toDataURL(qrText, { width: 320, margin: 2 })
        .then((url) => setBanglaQrDataUrl(url))
        .catch(() => {});
    }
  }, [paymentSettings.banglaQr]);

  // Filtered products list (only published online & with stock)
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.isPublishedOnline !== false && (p.stock || 0) > 0);
  }, [products]);

  // Section 1: Best Offers (products with discount or highest rating)
  const bestOffersProducts = useMemo(() => {
    return activeProducts
      .filter((p) => (p.originalPrice && p.originalPrice > p.salePrice) || (p.discountPercent || 0) > 0)
      .slice(0, 8);
  }, [activeProducts]);

  // Section 2: Recent / Other Products
  const recentProducts = useMemo(() => {
    const offerIds = new Set(bestOffersProducts.map((p) => p.id));
    const others = activeProducts.filter((p) => !offerIds.has(p.id));
    return others.length > 0 ? others : activeProducts;
  }, [activeProducts, bestOffersProducts]);

  // Payment Method Information (bKash, Nagad, Rocket, Upay, Bangla QR, Bank)
  const methodInfo = useMemo(() => {
    switch (paymentMethod) {
      case 'bangla_qr':
        return {
          name: 'বাংলা কিউআর (Bangla QR)',
          number: paymentSettings.banglaQr?.merchantId || '01306908115',
          instructions: paymentSettings.banglaQr?.instructions || 'বিকাশ, নগদ, সেলফিন (IBBL), নেক্সাসপে (DBBL) বা যেকোনো ব্যাংক অ্যাপের কিউআর স্ক্যানার দিয়ে স্ক্যান করে পেমেন্ট করুন।',
          type: 'official_merchant',
          color: 'emerald',
          isBanglaQr: true,
          accountTitle: paymentSettings.banglaQr?.accountTitle || 'TWING হিসাবি / সুপার এডমিন',
          bankOrMfsName: paymentSettings.banglaQr?.bankOrMfsName || 'মিউচুয়াল ট্রাস্ট ব্যাংক / বিকাশ বাংলা কিউআর',
          terminalId: paymentSettings.banglaQr?.terminalId || 'TWING-BQR-01',
          qrCodeUrl: paymentSettings.banglaQr?.qrCodeUrl || banglaQrDataUrl,
        };
      case 'bkash':
        return {
          name: 'bKash (বিকাশ)',
          number: paymentSettings.bkash?.personal?.number || paymentSettings.bkash?.merchant?.number || '01306908115',
          instructions: paymentSettings.bkash?.personal?.instructions || 'বিকাশ অ্যাপ থেকে Send Money / Payment করুন',
          type: paymentSettings.bkash?.personal?.accountType || 'personal',
          color: 'pink',
        };
      case 'nagad':
        return {
          name: 'Nagad (নগদ)',
          number: paymentSettings.nagad?.personal?.number || paymentSettings.nagad?.merchant?.number || '01306908115',
          instructions: paymentSettings.nagad?.personal?.instructions || 'নগদ অ্যাপ থেকে Send Money করুন',
          type: paymentSettings.nagad?.personal?.accountType || 'personal',
          color: 'orange',
        };
      case 'rocket':
        return {
          name: 'Rocket (রকেট)',
          number: paymentSettings.rocket?.personal?.number || '01306908115-8',
          instructions: paymentSettings.rocket?.personal?.instructions || 'রকেট অ্যাপ থেকে Send Money করুন',
          type: paymentSettings.rocket?.personal?.accountType || 'personal',
          color: 'purple',
        };
      case 'upay':
        return {
          name: 'Upay (উপায়)',
          number: paymentSettings.upay?.personal?.number || '01306908115',
          instructions: paymentSettings.upay?.personal?.instructions || 'উপায় অ্যাপ থেকে Send Money করুন',
          type: paymentSettings.upay?.personal?.accountType || 'personal',
          color: 'amber',
        };
      case 'bank':
        const acc = paymentSettings.bankTransfer?.accounts?.[selectedBankAccountIndex] || paymentSettings.bankTransfer?.accounts?.[0];
        return {
          name: acc?.bankName || 'ব্যাংক ট্রান্সফার',
          number: acc?.accountNumber || '',
          instructions: acc?.instructions || 'ব্যাংক অ্যাকাউন্টে টাকা পাঠিয়ে ডিপোজিট স্লিপ/ট্রানজেকশন আইডি দিন',
          type: acc?.accountName || 'ব্যাংক অ্যাকাউন্ট',
          color: 'blue',
          isBank: true,
          branchName: acc?.branchName,
          routingNumber: acc?.routingNumber,
        };
      default:
        return null;
    }
  }, [paymentMethod, paymentSettings, banglaQrDataUrl, selectedBankAccountIndex]);

  const handleCopyNumber = (num: string) => {
    try {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      showToast('📋 নম্বর কপি করা হয়েছে!');
      setTimeout(() => setCopiedNumber(null), 2500);
    } catch {
      showToast(`নম্বর: ${num}`);
    }
  };

  // Submit Central Marketplace Order (Preserving 100% of multi-vendor checkout logic & deduplication)
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrderRef.current || isSubmitting) return;

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      showToast('⚠️ নাম, ফোন নম্বর ও পূর্ণ ঠিকানা দিন');
      return;
    }

    if (!isPhoneVerifiedOnDevice) {
      showToast('⚠️ অর্ডার কনফার্ম করতে মোবাইল নম্বরটি একবার ওটিপি দিয়ে ভেরিফাই করুন');
      if (!otpSent) {
        handleSendOtp();
      }
      return;
    }

    if (cart.length === 0) {
      showToast('⚠️ কার্ট খালি');
      return;
    }

    if (paymentMethod !== 'cod' && paymentMethod !== 'paymently') {
      if (!customerSenderPhone.trim()) {
        showToast('⚠️ যে নম্বর থেকে টাকা পাঠিয়েছেন সেই প্রেরক নম্বর দিন');
        return;
      }
      if (!customerTrxId.trim()) {
        showToast('⚠️ ট্রানজেকশন আইডি (TrxID) বা রেফারেন্স নম্বর দিন');
        return;
      }
    }

    isSubmittingOrderRef.current = true;
    setIsSubmitting(true);

    const devRecord = getDevicePhoneVerification();

    // Save profile for future 1-click orders
    saveCustomerProfile({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: customerAddress.trim(),
      deliveryCity: deliveryArea === 'inside_dhaka' ? 'dhaka' : 'outside_dhaka',
      notes: orderNotes.trim(),
    });

    const payload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      deliveryCity: deliveryArea === 'inside_dhaka' ? 'dhaka' : 'outside_dhaka',
      paymentMethod,
      paymentTrxId: customerTrxId.trim(),
      senderPhone: customerSenderPhone.trim() || customerPhone.trim(),
      notes: orderNotes.trim(),
      isPhoneVerified: true,
      deviceToken: devRecord?.deviceToken || `dev_${standardPhone}`,
      items: cart.map((it) => ({
        productId: it.product.id,
        vendorId: it.product.vendorId,
        name: it.product.name,
        salePrice: it.product.salePrice,
        quantity: it.quantity,
        unit: it.product.unit,
        imageUrl: it.product.imageUrl,
      })),
    };

    try {
      const result = await marketplaceApi.checkout(payload);

      if (result.success && result.masterOrder) {
        // If Paymently online gateway redirect is provided
        if (paymentMethod === 'paymently' && result.checkoutSession?.paymentUrl) {
          setActivePaymentlySession({
            paymentUrl: result.checkoutSession.paymentUrl,
            paymentId: result.checkoutSession.paymentId,
            orderId: result.masterOrder.id,
            amount: result.masterOrder.grandTotal,
          });
          window.open(result.checkoutSession.paymentUrl, '_blank', 'noopener,noreferrer');
          showToast('🚀 অনলাইন পেমেন্ট পেজ নতুন উইন্ডোতে খোলা হয়েছে...');
        } else {
          setCompletedMasterOrder(result);
          setCart([]);
          setIsCartOpen(false);
          setIsCheckoutStep(false);

          // Save to customer order list in localStorage
          const newOrderRecord = {
            id: result.masterOrder.id,
            orderNumber: result.masterOrder.orderNumber,
            grandTotal: result.masterOrder.grandTotal,
            paymentMethod: result.masterOrder.paymentMethod,
            paymentStatus: result.masterOrder.paymentStatus,
            adminApprovalStatus: result.masterOrder.adminApprovalStatus || 'pending_approval',
            overallStatus: result.masterOrder.overallStatus || 'pending',
            createdAt: Date.now(),
            subOrders: result.subOrders || [],
          };
          const updatedList = [newOrderRecord, ...customerOrders];
          setCustomerOrders(updatedList);
          try {
            localStorage.setItem(MKT_CUSTOMER_ORDERS_KEY, JSON.stringify(updatedList));
          } catch {}

          showToast('🎉 আপনার সেন্ট্রাল অর্ডার সফলভাবে গৃহীত হয়েছে!');
        }
      } else {
        throw new Error(result.error || 'অর্ডার সম্পূর্ণ করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      showToast('❌ ' + (err.message || 'অর্ডার করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'));
    } finally {
      isSubmittingOrderRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Paymently status polling
  const handleCheckPaymentlyStatus = async () => {
    if (!activePaymentlySession?.orderId) return;
    setIsCheckingPaymentStatus(true);
    try {
      const res = await marketplaceApi.checkPaymentStatus(activePaymentlySession.orderId);
      if (res.success && (res.paymentStatus === 'paid' || res.isPaid)) {
        showToast('🎉 পেমেন্ট সফলভাবে যাচাই হয়েছে!');
        setActivePaymentlySession(null);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutStep(false);
        setCompletedMasterOrder({
          success: true,
          masterOrder: {
            id: res.orderId,
            orderNumber: res.orderNumber,
            grandTotal: res.amount,
            paymentStatus: 'paid',
            paymentMethod: 'paymently',
            paymentTrxId: res.trxId,
          },
        });
      } else {
        showToast(`⏳ পেমেন্ট স্ট্যাটাস: ${res.paymentStatus === 'initiated' ? 'প্রক্রিয়াধীন' : res.paymentStatus}। সম্পন্ন করে আবার চেক করুন।`);
      }
    } catch (err: any) {
      showToast('❌ যাচাই করা যায়নি: ' + err.message);
    } finally {
      setIsCheckingPaymentStatus(false);
    }
  };

  // Track Order in Central Marketplace
  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = trackingSearchQuery.trim();
    if (!clean) return;

    setIsTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await marketplaceApi.trackOrder(clean);
      if (res.success && res.order) {
        setQueriedOrder(res.order);
      } else {
        setQueriedOrder(null);
        setTrackingError('অর্ডার পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর বা মোবাইল নম্বর দিন।');
      }
    } catch (err: any) {
      setQueriedOrder(null);
      setTrackingError(err.message || 'অর্ডার ট্র্যাক করতে সমস্যা হয়েছে');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Share order summary to WhatsApp
  const sendOrderToWhatsApp = (order: any) => {
    const master = order.masterOrder || order;
    const defaultMfsPhone = paymentSettings.bkash?.personal?.number || paymentSettings.nagad?.personal?.number || '01306908115';
    const phone = defaultMfsPhone.replace(/[^0-9]/g, '');
    const msg = `*🛒 নতুন সেন্ট্রাল মার্কেটপ্লেস অর্ডার (${master.orderNumber || master.id})*
----------------------------
*গ্রাহকের নাম:* ${customerName}
*মোবাইল:* ${customerPhone}
*ঠিকানা:* ${customerAddress}
*ডেলিভারি এরিয়া:* ${deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'}
*পেমেন্ট পদ্ধতি:* ${paymentMethod.toUpperCase()}
*সর্বমোট প্রদেয়:* ৳${master.grandTotal || grandTotal}

_ধন্যবাদ! অনুগ্রহ করে সেন্ট্রাল মার্কেটপ্লেসের অর্ডারটি নিশ্চিত করুন।_`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Config object matching OnlineStoreConfig for storefront components
  const storefrontConfig: OnlineStoreConfig = useMemo(() => {
    const defaultPhone = paymentSettings.bkash?.personal?.number || paymentSettings.nagad?.personal?.number || '01306908115';
    return {
      isEnabled: true,
      storeSlug: 'central-marketplace',
      storeName: 'BikroyHub সেন্ট্রাল মার্কেটপ্লেস',
      tagline: marketplaceSettings.bannerNotice || 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও ১০০% আসল পণ্যের নিশ্চয়তা!',
      category: 'সকল ক্যাটাগরি',
      announcement: marketplaceSettings.bannerNotice || '',
      phone: defaultPhone,
      whatsappPhone: defaultPhone,
      address: 'ঢাকা, বাংলাদেশ',
      deliveryInsideDhaka: Number(marketplaceSettings.deliveryFeeDhaka || 70),
      deliveryOutsideDhaka: Number(marketplaceSettings.deliveryFeeOutside || 130),
      logoUrl: '',
      themeColor: 'teal',
      acceptCOD: marketplaceSettings.codEnabled !== false,
      acceptBkash: true,
      acceptNagad: true,
      acceptRocket: true,
      acceptUpay: true,
      acceptBank: true,
    };
  }, [marketplaceSettings, paymentSettings]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#F8FAFC] flex flex-col justify-between overflow-x-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-white rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 backdrop-blur-xs"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Top Header - Matching OnlineStorefrontModal exactly */}
      <StorefrontHeader
        storeName="BikroyHub"
        logoUrl=""
        cartCount={cartItemCount}
        notificationCount={2}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activeTab !== 'home') setActiveTab('home');
        }}
        onOpenCart={() => {
          setIsCartOpen(true);
          setIsCheckoutStep(false);
        }}
        onOpenMenu={() => setIsMenuDrawerOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsCustomerDrawerOpen(true)}
        onLogoClick={() => handleTabChange('home')}
        onMerchantLogin={onMerchantLogin}
        onBackToDashboard={onBackToDashboard}
      />

      {/* Main Scrollable Body Area */}
      <main id="marketplace-main-scroll-container" className="flex-1 w-full bg-[#F8FAFC] flex flex-col">
        {/* ================= TAB 1: HOME ================= */}
        {activeTab === 'home' && (
          <div className="flex flex-col pb-20 space-y-3">
            {/* If Filter / Search Active */}
            {searchQuery.trim() || selectedCategory !== 'all' ? (
              <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      {searchQuery.trim()
                        ? `"${searchQuery}" অনুসন্ধানের ফলাফল`
                        : `ক্যাটাগরি: ${selectedCategory}`}
                    </h2>
                    <p className="text-xs text-slate-500">{activeProducts.length} টি পণ্য পাওয়া গেছে</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    ফিল্টার রিসেট
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-16 text-center text-slate-500 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-700" />
                    <span>পণ্য লোড হচ্ছে...</span>
                  </div>
                ) : activeProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-800 mx-auto flex items-center justify-center">
                      <Package className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      অন্য কোনো নাম দিয়ে খুঁজুন অথবা সকল পণ্য ব্রাউজ করুন।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                    {activeProducts.map((prod) => {
                      const inCart = cart.find((i) => i.product.id === prod.id);
                      return (
                        <StorefrontProductCard
                          key={prod.id}
                          product={prod}
                          inCartQuantity={inCart ? inCart.quantity : 0}
                          onAddToCart={(p) => addToCart(p, 1)}
                          onUpdateQuantity={updateQuantity}
                          onViewProduct={(p) => setSelectedProductForDetail(p as MarketplaceProduct)}
                          isWishlisted={wishlistIds.includes(prod.id)}
                          onToggleWishlist={handleToggleWishlist}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Standard Homepage View */
              <>
                {/* 1. Hero Carousel (Matching Vendor Store) */}
                <StorefrontHeroCarousel
                  config={storefrontConfig}
                  products={activeProducts}
                  onExploreClick={() => {
                    const el = document.getElementById('marketplace-best-offers-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onSelectProduct={(productId) => {
                    const found = activeProducts.find((p) => p.id === productId);
                    if (found) setSelectedProductForDetail(found);
                  }}
                />

                {/* 2. Categories Grid */}
                <StorefrontCategoryGrid
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => setSelectedCategory(cat)}
                  products={activeProducts}
                  onViewAll={() => setActiveTab('categories')}
                />

                {/* 3. Section 1: 🔥 আজকের সেরা অফার (Today's Best Offers) */}
                {bestOffersProducts.length > 0 && (
                  <div id="marketplace-best-offers-section" className="w-full px-2.5 sm:px-4 py-2">
                    <div className="max-w-7xl mx-auto space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-2xs">
                            <Flame className="w-4 h-4 fill-orange-500 text-orange-600" />
                          </div>
                          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                            আজকের সেরা অফার
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black border border-rose-200/80">
                            সীমিত সময়
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3.5">
                        {bestOffersProducts.map((prod) => {
                          const inCart = cart.find((i) => i.product.id === prod.id);
                          return (
                            <StorefrontProductCard
                              key={prod.id}
                              product={prod}
                              inCartQuantity={inCart ? inCart.quantity : 0}
                              onAddToCart={(p) => addToCart(p, 1)}
                              onUpdateQuantity={updateQuantity}
                              onViewProduct={(p) => setSelectedProductForDetail(p as MarketplaceProduct)}
                              isWishlisted={wishlistIds.includes(prod.id)}
                              onToggleWishlist={handleToggleWishlist}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Section 2: ⭐ আমাদের পণ্যসমূহ (All Marketplace Products) */}
                {recentProducts.length > 0 && (
                  <div className="w-full px-2.5 sm:px-4 py-2">
                    <div className="max-w-7xl mx-auto space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                          </div>
                          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                            {bestOffersProducts.length > 0 ? 'অন্যান্য পণ্যসমূহ' : 'আমাদের পণ্যসমূহ'}
                          </h2>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3.5">
                        {recentProducts.map((prod) => {
                          const inCart = cart.find((i) => i.product.id === prod.id);
                          return (
                            <StorefrontProductCard
                              key={prod.id}
                              product={prod}
                              inCartQuantity={inCart ? inCart.quantity : 0}
                              onAddToCart={(p) => addToCart(p, 1)}
                              onUpdateQuantity={updateQuantity}
                              onViewProduct={(p) => setSelectedProductForDetail(p as MarketplaceProduct)}
                              isWishlisted={wishlistIds.includes(prod.id)}
                              onToggleWishlist={handleToggleWishlist}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ================= TAB 2: CATEGORIES ================= */}
        {activeTab === 'categories' && (
          <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4 pb-20">
            <StorefrontCategoryGrid
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('home');
              }}
              products={activeProducts}
            />
          </div>
        )}

        {/* ================= TAB 3: ORDERS (Real-Time Order Tracking) ================= */}
        {activeTab === 'orders' && (
          <div className="p-3 sm:p-6 max-w-4xl mx-auto w-full space-y-5 pb-24">
            {/* Search Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4 text-[#00695C]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">অর্ডার ট্র্যাকিং ও স্ট্যাটাস</h2>
                  <p className="text-xs text-slate-500">আপনার সেন্ট্রাল অর্ডার নম্বর বা মোবাইল নম্বর দিয়ে ট্র্যাক করুন</p>
                </div>
              </div>

              <form onSubmit={handleTrackSearch} className="flex gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="অর্ডার নম্বর (যেমন: MKT-123456) বা ফোন..."
                    value={trackingSearchQuery}
                    onChange={(e) => setTrackingSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isTrackingLoading || !trackingSearchQuery.trim()}
                  className="px-5 py-2.5 bg-[#00695C] hover:bg-[#004D40] text-white font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isTrackingLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>ট্র্যাক করুন</span>
                  )}
                </button>
              </form>

              {trackingError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {trackingError}
                </div>
              )}
            </div>

            {/* Queried Single Order Display */}
            {queriedOrder && (
              <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold">অর্ডার নম্বর</div>
                    <div className="text-base font-black text-slate-900 font-mono flex items-center gap-1.5">
                      <span>{queriedOrder.orderNumber || queriedOrder.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(queriedOrder.orderNumber || queriedOrder.id)}
                        className="text-slate-400 hover:text-slate-700"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-semibold">মোট প্রদেয়</div>
                    <div className="text-base font-black text-teal-800">৳ {formatMoney(queriedOrder.grandTotal)}</div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    পেমেন্ট: {queriedOrder.paymentMethod?.toUpperCase()} ({queriedOrder.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বাকি'})
                  </span>

                  {queriedOrder.adminApprovalStatus === 'approved' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>সুপার এডমিন থেকে পেমেন্ট ভেরিফাইড</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ভেরিফিকেশন পর্যালোচনায় রয়েছে</span>
                    </span>
                  )}
                </div>

                {/* Sub-Orders per Vendor */}
                {Array.isArray(queriedOrder.subOrders) && queriedOrder.subOrders.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-700">ভেন্ডর অর্ডারসমূহ:</div>
                    {queriedOrder.subOrders.map((sub: any) => (
                      <div key={sub.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-900">🏪 {sub.vendorShopName || 'ভেন্ডর'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
                            স্ট্যাটাস: {sub.orderStatus === 'delivered' ? 'ডেলিভার্ড' : sub.orderStatus === 'shipped' ? 'শিপড' : 'প্রক্রিয়াধীন'}
                          </span>
                        </div>

                        {sub.courierName && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>কুরিয়ার: {sub.courierName} ({sub.courierTrackingCode || 'ট্র্যাকিং কোড প্রস্তুত হচ্ছে'})</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Orders Stored on this device */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 px-1">এই ডিভাইসের সাম্প্রতিক সেন্ট্রাল অর্ডারসমূহ</h3>
              {customerOrders.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-500">এখনো কোনো অর্ডার করা হয়নি</div>
                </div>
              ) : (
                customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-teal-500/40 transition cursor-pointer"
                    onClick={() => {
                      setTrackingSearchQuery(ord.orderNumber || ord.id);
                      handleTrackSearch();
                    }}
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                        {ord.orderNumber || ord.id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ord.createdAt || Date.now()).toLocaleDateString('bn-BD')} • ৳ {formatMoney(ord.grandTotal)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                        {ord.overallStatus === 'delivered' ? 'ডেলিভার্ড' : 'গৃহীত'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: WISHLIST ================= */}
        {activeTab === 'wishlist' && (
          <div className="pb-24">
            <StorefrontWishlistTab
              products={activeProducts}
              wishlistIds={wishlistIds}
              onRemoveFromWishlist={handleRemoveWishlist}
              onAddToCart={(p) => addToCart(p, 1)}
              onViewProduct={(p) => setSelectedProductForDetail(p as MarketplaceProduct)}
              onExplore={() => setActiveTab('home')}
            />
          </div>
        )}

        {/* ================= TAB 5: MORE (Store Info & Policies) ================= */}
        {activeTab === 'more' && (
          <div className="pb-24">
            <StorefrontMoreTab
              config={storefrontConfig}
              totalProductsCount={activeProducts.length}
              onMerchantLogin={onMerchantLogin}
            />

            {/* Back to POS / Dashboard button if opened from inside system */}
            {onBackToDashboard && (
              <div className="max-w-2xl mx-auto px-4 pt-2">
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <span>দোকানের ড্যাশবোর্ডে ফিরে যান</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation (Identical 5 Tabs) */}
      <StorefrontBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        wishlistCount={wishlistIds.length}
        orderCount={customerOrders.length}
      />

      {/* Hamburger Drawer */}
      <StorefrontHamburgerDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        config={storefrontConfig}
        onSelectTab={handleTabChange}
        onOpenSupport={() => setIsSupportDrawerOpen(true)}
        onMerchantLogin={onMerchantLogin || onBackToDashboard}
        wishlistCount={wishlistIds.length}
      />

      {/* Notification Drawer */}
      <StorefrontNotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Customer Profile Drawer */}
      <StorefrontCustomerDrawer
        isOpen={isCustomerDrawerOpen}
        onClose={() => setIsCustomerDrawerOpen(false)}
        customerOrders={customerOrders}
        onSelectTab={handleTabChange}
        defaultName={customerName}
        defaultPhone={customerPhone}
        defaultAddress={customerAddress}
        onSaveProfile={(prof) => {
          setCustomerName(prof.name);
          setCustomerPhone(prof.phone);
          setCustomerAddress(prof.address);
          saveCustomerProfile(prof);
          showToast('✅ প্রোফাইল তথ্য সংরক্ষিত হয়েছে!');
        }}
      />

      {/* Support Drawer */}
      <StorefrontSupportDrawer
        isOpen={isSupportDrawerOpen}
        onClose={() => setIsSupportDrawerOpen(false)}
        config={storefrontConfig}
      />

      {/* Product Detail Modal */}
      <StorefrontProductDetailModal
        product={selectedProductForDetail}
        isOpen={!!selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        inCartQuantity={
          selectedProductForDetail
            ? cart.find((i) => i.product.id === selectedProductForDetail.id)?.quantity || 0
            : 0
        }
        onAddToCart={(p, q) => addToCart(p, q || 1)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
        config={storefrontConfig}
        isWishlisted={selectedProductForDetail ? wishlistIds.includes(selectedProductForDetail.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Slide-In Cart & Checkout Drawer (Matching Vendor Store exactly) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-teal-800" />
                  <h3 className="font-bold text-base text-slate-900">
                    {isCheckoutStep ? 'ডেলিভারি ও চেকআউট' : `শপিং কার্ট (${cartItemCount})`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">আপনার কার্ট খালি!</p>
                    <p className="text-xs text-slate-400">মার্কেটপ্লেস থেকে পছন্দের পণ্য যোগ করুন।</p>
                  </div>
                ) : !isCheckoutStep ? (
                  /* Step 1: Cart Items List */
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {item.product.name}
                          </h4>
                          <div className="text-[10px] text-teal-800 font-bold truncate">
                            🏪 {item.product.vendorShopName || 'অফিসিয়াল ভেন্ডর'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            ৳{formatMoney(item.product.salePrice)} x {item.quantity} ={' '}
                            <span className="font-bold text-teal-800">
                              ৳{formatMoney(item.product.salePrice * item.quantity)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Area Selection */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <div className="text-xs font-bold text-slate-800">ডেলিভারি এলাকা নির্বাচন করুন:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label
                          className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition ${
                            deliveryArea === 'inside_dhaka'
                              ? 'border-teal-600 bg-teal-50/50 text-teal-900 font-bold'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryArea"
                            checked={deliveryArea === 'inside_dhaka'}
                            onChange={() => setDeliveryArea('inside_dhaka')}
                            className="hidden"
                          />
                          <span>ঢাকা সিটির ভেতরে</span>
                          <span className="text-[11px] font-black text-teal-800 mt-0.5">
                            ৳ {marketplaceSettings.deliveryFeeDhaka || 70}
                          </span>
                        </label>

                        <label
                          className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition ${
                            deliveryArea === 'outside_dhaka'
                              ? 'border-teal-600 bg-teal-50/50 text-teal-900 font-bold'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryArea"
                            checked={deliveryArea === 'outside_dhaka'}
                            onChange={() => setDeliveryArea('outside_dhaka')}
                            className="hidden"
                          />
                          <span>ঢাকার বাইরে</span>
                          <span className="text-[11px] font-black text-teal-800 mt-0.5">
                            ৳ {marketplaceSettings.deliveryFeeOutside || 130}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Checkout Form */
                  <form id="marketplace-checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          আপনার নাম *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            মোবাইল নম্বর *
                          </label>
                          {isPhoneVerifiedOnDevice && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ডিভাইসে ভেরিফাইড
                            </span>
                          )}
                        </div>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="যেমন: 017XXXXXXXX"
                          className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:outline-hidden font-mono ${
                            isPhoneVerifiedOnDevice
                              ? 'border-emerald-300 focus:ring-emerald-600'
                              : 'border-slate-200 focus:ring-teal-600'
                          }`}
                        />

                        {/* Device Verification Status & OTP Verification Panel */}
                        {isPhoneVerifiedOnDevice ? (
                          <div className="mt-1.5 flex items-center justify-between bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-800">
                            <div className="flex items-center gap-1.5 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>নম্বরটি এই ডিভাইসে ভেরিফাইড (পুনরায় ওটিপি লাগবে না)</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold bg-white border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                              নিশ্চিত
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs space-y-2.5">
                            <div className="flex items-start gap-2">
                              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800">ডিভাইস ভেরিফিকেশন (একবার প্রযোজ্য)</div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  ভুয়া অর্ডার রোধে আপনার ডিভাইসে মোবাইল নম্বরটি একবার ওটিপি দিয়ে ভেরিফাই করে নিন।
                                </p>
                              </div>
                            </div>

                            {!otpSent ? (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={handleSendOtp}
                                  disabled={isSendingOtp || standardPhone.length !== 11}
                                  className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:cursor-not-allowed"
                                >
                                  {isSendingOtp ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {standardPhone.length === 11
                                      ? '📲 ওটিপি কোড পাঠান (মোবাইল ভেরিফাই করুন)'
                                      : 'সঠিক ১১ ডিজিটের নম্বর লিখুন'}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 pt-1 border-t border-amber-200/70">
                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                  <span className="font-medium">
                                    <strong className="text-slate-800 font-mono">{standardPhone}</strong> নম্বরে ওটিপি পাঠানো হয়েছে
                                  </span>
                                  {otpHint && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const code = otpHint.replace(/[^0-9]/g, '');
                                        if (code) setOtpInput(code);
                                      }}
                                      className="text-[10px] font-bold bg-teal-100 text-teal-800 hover:bg-teal-200 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1"
                                      title="ক্লিক করে কোড বসিয়ে দিন"
                                    >
                                      <span>{otpHint}</span>
                                      <span className="underline">বসিয়ে দিন</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="৬ সংখ্যার OTP কোড"
                                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-center tracking-widest font-mono text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={isVerifyingOtp || !otpInput.trim()}
                                    className="py-2 px-3.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:cursor-not-allowed shrink-0"
                                  >
                                    {isVerifyingOtp ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>যাচাই সম্পন্ন</span>
                                  </button>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                  {otpCountdown > 0 ? (
                                    <span>
                                      পুনরায় কোড পাঠাতে অপেক্ষা: <strong className="text-teal-700 font-mono">{otpCountdown}s</strong>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleSendOtp}
                                      disabled={isSendingOtp}
                                      className="text-teal-700 font-bold hover:underline cursor-pointer"
                                    >
                                      পুনরায় ওটিপি পাঠান
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOtpSent(false);
                                      setOtpInput('');
                                      setOtpHint(null);
                                    }}
                                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                                  >
                                    নম্বর পরিবর্তন
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          পূর্ণ ঠিকানা *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা নং, রোড নং, এলাকা, থানা ও জেলা..."
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                        />
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-3 pt-1">
                        <label className="block text-xs font-bold text-slate-800">
                          পেমেন্ট পদ্ধতি নির্বাচন করুন *
                        </label>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* UddoktaPay (Online Automated Gateway with Bangla QR & MFS) */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('paymently')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer relative overflow-hidden ${
                              paymentMethod === 'paymently'
                                ? 'border-teal-600 bg-teal-50/90 text-teal-950 font-black ring-2 ring-teal-600/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs text-teal-800">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                              <span>⚡ UddoktaPay গেটওয়ে</span>
                            </div>
                            <span className="text-[10px] text-teal-700 font-medium mt-0.5">
                              অটো কিউআর, বিকাশ, নগদ, কার্ড
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1 text-[9px]">
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-black">🇧🇩 Bangla QR</span>
                              <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">অটোমেটিক</span>
                            </div>
                          </button>

                          {/* Direct Bangla QR Code (Official Super Admin QR) */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('bangla_qr')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer relative overflow-hidden ${
                              paymentMethod === 'bangla_qr'
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-600/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800">
                              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                              <span>🇧🇩 বাংলা কিউআর কোড</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
                              সরাসরি কিউআর স্ক্যান ও পে
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1 text-[9px]">
                              <span className="px-1.5 py-0.2 bg-emerald-200/80 text-emerald-900 rounded font-black">সকল ব্যাংক ও MFS</span>
                            </div>
                          </button>

                          {/* bKash */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('bkash')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer ${
                              paymentMethod === 'bkash'
                                ? 'border-pink-500 bg-pink-50 text-pink-900 font-black ring-2 ring-pink-500/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>🌸 বিকাশ (bKash)</span>
                            <span className="text-[10px] text-pink-700 font-normal mt-0.5">Send Money / Payment</span>
                          </button>

                          {/* Nagad */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('nagad')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer ${
                              paymentMethod === 'nagad'
                                ? 'border-orange-500 bg-orange-50 text-orange-900 font-black ring-2 ring-orange-500/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>🍊 নগদ (Nagad)</span>
                            <span className="text-[10px] text-orange-700 font-normal mt-0.5">ম্যানুয়াল Send Money</span>
                          </button>

                          {/* Rocket */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('rocket')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer ${
                              paymentMethod === 'rocket'
                                ? 'border-purple-500 bg-purple-50 text-purple-900 font-black ring-2 ring-purple-500/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>🚀 রকেট (Rocket)</span>
                            <span className="text-[10px] text-purple-700 font-normal mt-0.5">ম্যানুয়াল Send Money</span>
                          </button>

                          {/* Cash on Delivery */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cod')}
                            className={`p-2.5 rounded-xl border flex flex-col text-left transition cursor-pointer ${
                              paymentMethod === 'cod'
                                ? 'border-teal-600 bg-teal-50 text-teal-900 font-black ring-2 ring-teal-600/30'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>💵 ক্যাশ অন ডেলিভারি</span>
                            <span className="text-[10px] text-slate-500 font-normal mt-0.5">পণ্য হাতে পেয়ে মূল্য দিন</span>
                          </button>
                        </div>

                        {/* CASE 1: UddoktaPay Automated Online Gateway Info Box */}
                        {paymentMethod === 'paymently' && (
                          <div className="p-3.5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 space-y-2 mt-2">
                            <div className="flex items-center gap-2 text-teal-950 font-black text-xs">
                              <Sparkles className="w-4 h-4 text-teal-700" />
                              <span>UddoktaPay অটোমেটিক পেমেন্ট গেটওয়ে</span>
                            </div>
                            <p className="text-[11px] text-teal-800 leading-relaxed">
                              অর্ডার সাবমিট করলে সরাসরি <strong>UddoktaPay</strong> এর সুরক্ষিত পেমেন্ট গেটওয়ে পেজ চালু হবে। সেখানে আপনার উদ্যোক্তা পেমেন্ট গেটওয়ের <strong>বাংলা কিউআর (Bangla QR)</strong> স্ক্যান করে অথবা <strong>বিকাশ, নগদ, রকেট ও কার্ডের</strong> মাধ্যমে স্বয়ংক্রিয়ভাবে পেমেন্ট করতে পারবেন।
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black border border-emerald-300">🇧🇩 Bangla QR কোড</span>
                              <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-900 font-black border border-pink-300">বিকাশ</span>
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 font-black border border-orange-300">নগদ</span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black border border-purple-300">রকেট</span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black border border-blue-300">কার্ড</span>
                            </div>
                          </div>
                        )}

                        {/* CASE 2: Official Super Admin Bangla QR Code Display & TrxID Input */}
                        {paymentMethod === 'bangla_qr' && (
                          <div className="p-4 bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-3 mt-2">
                            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                                  🇧🇩
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">
                                    সার্বজনীন বাংলা কিউআর (Bangla QR)
                                  </h4>
                                  <p className="text-[10px] text-emerald-800 font-semibold">
                                    বাংলাদেশ ব্যাংক অনুমোদিত ইন্টারঅপারেবল স্ট্যান্ডার্ড
                                  </p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                স্ক্যান অ্যান্ড পে
                              </span>
                            </div>

                            {/* Centered QR Display Card */}
                            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-emerald-200 shadow-sm max-w-[270px] mx-auto text-center">
                              <div className="p-2 bg-white rounded-xl border-2 border-emerald-400/50 shadow-inner">
                                {paymentSettings.banglaQr?.qrCodeUrl || banglaQrDataUrl ? (
                                  <img
                                    src={paymentSettings.banglaQr?.qrCodeUrl || banglaQrDataUrl}
                                    alt="Official Bangla QR Code"
                                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                                  />
                                ) : (
                                  <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50 rounded-lg">
                                    <QrCode className="w-12 h-12 text-slate-300 animate-pulse" />
                                    <span className="text-[11px]">কিউআর কোড প্রস্তুত হচ্ছে...</span>
                                  </div>
                                )}
                              </div>

                              {/* Merchant details */}
                              <div className="mt-3 space-y-1 w-full text-xs">
                                <p className="font-black text-slate-900">
                                  {paymentSettings.banglaQr?.accountTitle || 'TWING হিসাবি / সুপার এডমিন'}
                                </p>
                                <div className="flex items-center justify-center gap-1.5 font-mono text-emerald-800 font-bold bg-emerald-50 py-1 px-2.5 rounded-lg border border-emerald-200">
                                  <span>আইডি: {paymentSettings.banglaQr?.merchantId || '01306908115'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyNumber(paymentSettings.banglaQr?.merchantId || '01306908115')}
                                    className="text-emerald-600 hover:text-emerald-950 cursor-pointer"
                                    title="কপি করুন"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-semibold">
                                  {paymentSettings.banglaQr?.bankOrMfsName || 'মিউচুয়াল ট্রাস্ট ব্যাংক / বিকাশ বাংলা কিউআর'}
                                </p>
                                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-medium">পরিশোধযোগ্য বিল:</span>
                                  <span className="font-black text-emerald-800 text-sm">৳{formatMoney(grandTotal)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Scanning Guide */}
                            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
                              <p className="font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>পেমেন্ট নির্দেশিকা:</span>
                              </p>
                              <p className="text-slate-700 leading-relaxed text-[10px]">
                                ১. আপনার যেকোনো ব্যাংক বা এমএফএস (বিকাশ, নগদ, সেলফিন, উপায়, নেক্সাসপে ইত্যাদি) অ্যাপে "কিউআর স্ক্যানার" ওপেন করুন।
                              </p>
                              <p className="text-slate-700 leading-relaxed text-[10px]">
                                ২. উপরের কিউআর কোডটি স্ক্যান করে বিল <strong>৳{formatMoney(grandTotal)}</strong> পরিশোধ সম্পন্ন করুন।
                              </p>
                              <p className="text-slate-700 leading-relaxed text-[10px]">
                                ৩. পেমেন্ট শেষে পাওয়া <strong>Transaction ID (TrxID)</strong> এবং আপনার <strong>প্রেরক নম্বর</strong> নিচে লিখে অর্ডার সম্পন্ন করুন।
                              </p>
                            </div>

                            {/* TrxID & Sender Phone */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                                  Transaction ID (TrxID) *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customerTrxId}
                                  onChange={(e) => setCustomerTrxId(e.target.value)}
                                  placeholder="যেমন: 9J4K2ABC..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-800 mb-0.5">
                                  প্রেরক মোবাইল নম্বর *
                                </label>
                                <input
                                  type="tel"
                                  required
                                  value={customerSenderPhone}
                                  onChange={(e) => setCustomerSenderPhone(e.target.value)}
                                  placeholder="01XXXXXXXXX"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CASE 3: Standard MFS Details Box (bKash, Nagad, Rocket, Upay) */}
                        {methodInfo && paymentMethod !== 'cod' && paymentMethod !== 'paymently' && paymentMethod !== 'bangla_qr' && (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{methodInfo.name} নম্বর:</span>
                              <div className="flex items-center gap-1 font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                <span>{methodInfo.number}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyNumber(methodInfo.number)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="কপি করুন"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500">{methodInfo.instructions}</p>

                            {/* TrxID & Sender Phone */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                                  TrxID *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customerTrxId}
                                  onChange={(e) => setCustomerTrxId(e.target.value)}
                                  placeholder="যেমন: 9J4K2..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                                  প্রেরক নম্বর *
                                </label>
                                <input
                                  type="tel"
                                  required
                                  value={customerSenderPhone}
                                  onChange={(e) => setCustomerSenderPhone(e.target.value)}
                                  placeholder="01XXXXXXXXX"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Notes */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          অর্ডারের বিশেষ নির্দেশনা (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="ডেলিভারির সময় বা বিশেষ কোনো অনুরোধ..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>পণ্যের মূল্য:</span>
                    <span>৳{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>ডেলিভারি ফি ({deliveryArea === 'inside_dhaka' ? 'ঢাকা' : 'ঢাকার বাইরে'}):</span>
                    <span>৳{formatMoney(deliveryCharge)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm sm:text-base text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>সর্বমোট:</span>
                    <span className="text-[#004D40]">৳{formatMoney(grandTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isCheckoutStep && (
                    <button
                      type="button"
                      onClick={() => setIsCheckoutStep(false)}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                    >
                      পেছনে
                    </button>
                  )}

                  {!isCheckoutStep ? (
                    <button
                      type="button"
                      disabled={cart.length === 0}
                      onClick={() => setIsCheckoutStep(true)}
                      className="flex-1 py-3 px-4 bg-[#00897B] hover:bg-[#00796B] disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                    >
                      <span>চেকআউটে এগিয়ে যান</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      form="marketplace-checkout-form"
                      disabled={isSubmitting || cart.length === 0}
                      className="flex-1 py-3 px-4 bg-[#004D40] hover:bg-[#00382E] disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>অর্ডার প্রসেস হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <span>অর্ডার নিশ্চিত করুন</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UddoktaPay Active Payment Session Modal */}
      <AnimatePresence>
        {activePaymentlySession && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl border border-teal-200"
            >
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center border border-teal-200">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  UddoktaPay পেমেন্ট সেশন চালু রয়েছে
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  নিচের বাটনে চাপ দিয়ে UddoktaPay গেটওয়ে পেজে যান এবং <strong>বাংলা কিউআর (Bangla QR)</strong>, বিকাশ, নগদ বা কার্ড দিয়ে পেমেন্ট সম্পন্ন করুন।
                </p>
              </div>

              <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200/80 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">অর্ডার রেফারেন্স:</span>
                  <span className="font-mono font-bold text-slate-900">{activePaymentlySession.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোট প্রদেয়:</span>
                  <span className="font-black text-teal-800 text-sm">৳{formatMoney(activePaymentlySession.amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-teal-100">
                  <span className="text-slate-500">পদ্ধতিসমূহ:</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded font-black text-emerald-800 border border-emerald-200">
                    🇧🇩 বাংলা কিউআর • বিকাশ • নগদ • রকেট
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={activePaymentlySession.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>UddoktaPay পেমেন্ট পেজে যান</span>
                </a>

                <button
                  type="button"
                  onClick={handleCheckPaymentlyStatus}
                  disabled={isCheckingPaymentStatus}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPaymentStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingPaymentStatus ? 'যাচাই করা হচ্ছে...' : 'পেমেন্ট সম্পন্ন করেছি (স্ট্যাটাস চেক করুন)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePaymentlySession(null)}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                >
                  পেমেন্ট সেশন বন্ধ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Confirmation Modal / View */}
      <AnimatePresence>
        {completedMasterOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  🎉 অভিনন্দন! আপনার অর্ডার সফল হয়েছে
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  সেন্ট্রাল মার্কেটপ্লেস থেকে আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে।
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">অর্ডার নম্বর:</span>
                  <span className="font-mono font-black text-slate-900">
                    {completedMasterOrder.masterOrder?.orderNumber || completedMasterOrder.masterOrder?.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোট মূল্য:</span>
                  <span className="font-black text-teal-800">
                    ৳ {formatMoney(completedMasterOrder.masterOrder?.grandTotal || grandTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">পেমেন্ট মেথড:</span>
                  <span className="font-bold text-slate-700 uppercase">{paymentMethod}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => sendOrderToWhatsApp(completedMasterOrder)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপে অর্ডার নিশ্চিত করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedMasterOrder(null);
                    setActiveTab('orders');
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  অর্ডার ট্র্যাক করুন
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedMasterOrder(null);
                    setActiveTab('home');
                  }}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                >
                  আরও কেনাকাটা করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
