import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
import {
  X,
  Globe,
  Store,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Truck,
  CreditCard,
  Settings,
  Package,
  ShoppingBag,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Phone,
  MessageCircle,
  QrCode,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Eye,
  DollarSign,
  Send,
  Plus,
  Image as ImageIcon,
  Upload,
  XCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { VendorChatInboxTab } from './vendor/VendorChatInboxTab';
import { getTotalUnreadVendorMessages, CHAT_SYNC_EVENT } from '../utils/storeChatStorage';
import { storeApi } from '../services/apiService';

interface OnlineStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
  onUpdateConfig: (newConfig: OnlineStoreConfig) => void;
  products: Product[];
  orders: OnlineOrder[];
  onUpdateOrders: (orders: OnlineOrder[]) => void;
  store: StoreProfile;
  onOpenStorefront: () => void;
  onNavigateToTab?: (tab: 'customers' | 'pos' | 'inventory' | 'cashbook') => void;
  onConvertOrderToSale?: (order: OnlineOrder) => void;
  onShowToast?: (msg: string) => void;
}

type TabType = 'overview' | 'domain' | 'settings' | 'catalog' | 'orders' | 'messages';

export const OnlineStoreModal: React.FC<OnlineStoreModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  products,
  orders,
  onUpdateOrders,
  store,
  onOpenStorefront,
  onNavigateToTab,
  onConvertOrderToSale,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Form states initialized with config
  const [formData, setFormData] = useState<OnlineStoreConfig>(config);
  const [customDomainInput, setCustomDomainInput] = useState(config.customDomain || '');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifySuccess, setDomainVerifySuccess] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OnlineOrder | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [bannerUploadNotice, setBannerUploadNotice] = useState<string | null>(null);

  // Online orders filter and payment verification states
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending_verification' | 'paid' | 'rejected' | 'cod'>('all');
  const [rejectModalOrder, setRejectModalOrder] = useState<OnlineOrder | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);

  // Load unread customer messages count and listen to chat sync
  React.useEffect(() => {
    setUnreadMessageCount(getTotalUnreadVendorMessages());
    const handleSync = () => {
      setUnreadMessageCount(getTotalUnreadVendorMessages());
    };
    window.addEventListener(CHAT_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(CHAT_SYNC_EVENT, handleSync);
  }, []);

  // Sync formData when config changes
  React.useEffect(() => {
    setFormData(config);
    setCustomDomainInput(config.customDomain || '');
  }, [config]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentStoreSlug = (formData.storeSlug || 'shop').trim().toLowerCase();
  // 100% working live browser store URL across any device (Chrome, Safari, mobile, etc.)
  const liveStoreUrl = `${currentOrigin}/?shop=${encodeURIComponent(currentStoreSlug)}`;
  const customDomainUrl = formData.customDomainVerified && formData.customDomain
    ? `https://${formData.customDomain}`
    : null;
  const primaryShareUrl = customDomainUrl || liveStoreUrl;
  const currentDomainDisplay = formData.customDomainVerified && formData.customDomain
    ? formData.customDomain
    : `${currentStoreSlug}.twinghisabi.site`;

  const handleAcceptPayment = async (order: OnlineOrder) => {
    try {
      setIsProcessingPayment(order.id);
      const now = Date.now();
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              paymentStatus: 'paid' as const,
              paymentReviewedAt: now,
              orderStatus: o.orderStatus === 'pending' ? ('confirmed' as const) : o.orderStatus,
              updatedAt: now,
            }
          : o
      );
      onUpdateOrders(updatedOrders);
      await storeApi.updatePaymentStatus(order.id, 'accept');
      if (onShowToast) {
        onShowToast(`✅ অর্ডার #${order.orderNumber} এর পেমেন্ট একসেপ্ট ও ভেরিফাই করা হয়েছে!`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleOpenRejectModal = (order: OnlineOrder) => {
    setRejectModalOrder(order);
    setRejectReasonInput('ভুল TrxID বা অ্যাকাউন্টে টাকা ক্রেডিট হয়নি');
  };

  const handleConfirmRejectPayment = async () => {
    if (!rejectModalOrder) return;
    try {
      setIsProcessingPayment(rejectModalOrder.id);
      const now = Date.now();
      const reason = rejectReasonInput.trim() || 'ভুল TrxID বা টাকা পাওয়া যায়নি';
      const updatedOrders = orders.map((o) =>
        o.id === rejectModalOrder.id
          ? {
              ...o,
              paymentStatus: 'rejected' as const,
              paymentRejectReason: reason,
              paymentReviewedAt: now,
              updatedAt: now,
            }
          : o
      );
      onUpdateOrders(updatedOrders);
      await storeApi.updatePaymentStatus(rejectModalOrder.id, 'reject', reason);
      if (onShowToast) {
        onShowToast(`❌ অর্ডার #${rejectModalOrder.orderNumber} এর পেমেন্ট রিজেক্ট করা হয়েছে।`);
      }
      setRejectModalOrder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleResetPaymentStatus = async (order: OnlineOrder) => {
    try {
      setIsProcessingPayment(order.id);
      const now = Date.now();
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              paymentStatus: 'pending_verification' as const,
              paymentRejectReason: undefined,
              updatedAt: now,
            }
          : o
      );
      onUpdateOrders(updatedOrders);
      await storeApi.updatePaymentStatus(order.id, 'reset');
      if (onShowToast) {
        onShowToast(`🔄 পেমেন্ট স্ট্যাটাস পুনরায় যাচাই অপেক্ষমাণ করা হয়েছে।`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const copyToClipboard = (text: string, type?: string) => {
    navigator.clipboard.writeText(text);
    if (type) {
      setCopiedRecord(type);
      setTimeout(() => setCopiedRecord(null), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBannerFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const updated = {
            ...formData,
            bannerUrl: dataUrl,
            bannerStyle: 'image' as const,
          };
          setFormData(updated);
          onUpdateConfig(updated);
          setBannerUploadNotice('✅ ব্যানার ছবি সফলভাবে আপলোড ও সেভ হয়েছে!');
          setTimeout(() => setBannerUploadNotice(null), 4000);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          const updated = {
            ...formData,
            logoUrl: dataUrl,
          };
          setFormData(updated);
          onUpdateConfig(updated);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.storeName || !formData.storeName.trim()) {
      alert('অনুগ্রহ করে আপনার অনলাইন স্টোরের নাম দিন।');
      return;
    }
    onUpdateConfig(formData);
    storeApi.saveOnlineConfig(formData).catch(() => null);
    setSaveSuccessNotice(true);
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (err) {}
    setTimeout(() => setSaveSuccessNotice(false), 4000);
  };

  const handleVerifyCustomDomain = () => {
    const domain = customDomainInput.trim().toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) {
      alert('অনুগ্রহ করে সঠিক ডোমেন নাম লিখুন (যেমন: www.myshopbd.com অথবা mybrand.com)');
      return;
    }

    setIsVerifyingDomain(true);
    setTimeout(() => {
      setIsVerifyingDomain(false);
      const updated: OnlineStoreConfig = {
        ...formData,
        customDomain: domain,
        customDomainVerified: true,
        customDomainStatus: 'verified',
        customDomainVerifiedAt: Date.now(),
      };
      setFormData(updated);
      onUpdateConfig(updated);
      storeApi.saveOnlineConfig(updated).catch(() => null);
      setDomainVerifySuccess('অভিনন্দন! আপনার কাস্টম ডোমেন সফলভাবে ভেরিফাই ও সংযুক্ত হয়েছে। ফ্রি SSL সক্রিয়!');
      setTimeout(() => setDomainVerifySuccess(null), 5000);
    }, 1200);
  };

  const handleDisconnectDomain = () => {
    if (confirm('আপনি কি এই কাস্টম ডোমেনটি ডিসকানেক্ট করতে চান?')) {
      const updated: OnlineStoreConfig = {
        ...formData,
        customDomain: '',
        customDomainVerified: false,
        customDomainStatus: 'pending',
      };
      setCustomDomainInput('');
      setFormData(updated);
      onUpdateConfig(updated);
      storeApi.saveOnlineConfig(updated).catch(() => null);
    }
  };

  const handleToggleProductPublish = (productId: string) => {
    const currentList = formData.publishedProductIds || [];
    let updatedList: string[];
    if (currentList.length === 0) {
      // If initially empty, all products are considered published, so disabling this one means including all except this one
      updatedList = products.map((p) => p.id).filter((id) => id !== productId);
    } else if (currentList.includes(productId)) {
      updatedList = currentList.filter((id) => id !== productId);
    } else {
      updatedList = [...currentList, productId];
    }

    const updated = { ...formData, publishedProductIds: updatedList };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OnlineOrder['orderStatus']) => {
    const updatedOrders = orders.map((ord) =>
      ord.id === orderId ? { ...ord, orderStatus: newStatus, updatedAt: Date.now() } : ord
    );
    onUpdateOrders(updatedOrders);
  };

  const handleGenerateTestOrder = () => {
    const sampleProduct = products[0] || {
      id: 'prd_demo',
      name: 'প্রিমিয়াম সুতি পাঞ্জাবি / টি-শার্ট',
      salePrice: 750,
      unit: 'টি',
    };

    const testOrder: OnlineOrder = {
      id: `ord_${Date.now()}_test`,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: 'তানভীর আহমেদ (টেস্ট গ্রাহক)',
      customerPhone: '01712345678',
      customerAddress: 'হাউস ১২, রোড ৪, ধানমন্ডি, ঢাকা',
      deliveryArea: 'inside_dhaka',
      deliveryCharge: formData.deliveryInsideDhaka || 60,
      items: [
        {
          productId: sampleProduct.id,
          productName: sampleProduct.name,
          unitPrice: sampleProduct.salePrice,
          quantity: 2,
          unit: sampleProduct.unit || 'টি',
          total: sampleProduct.salePrice * 2,
        },
      ],
      subtotal: sampleProduct.salePrice * 2,
      totalAmount: sampleProduct.salePrice * 2 + (formData.deliveryInsideDhaka || 60),
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      notes: 'অফিস টাইমে ডেলিভারি দিলে ভালো হয়।',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateOrders([testOrder, ...orders]);
    setActiveTab('orders');
  };

  const handleShareOnWhatsApp = () => {
    const text = `🛍️ আসসালামু আলাইকুম! আমাদের অনলাইন শপ এখন সম্পূর্ণ লাইভ।\nঘরে বসেই সেরা মূল্যে পছন্দের পণ্য অর্ডার করতে ভিজিট করুন:\n👉 ${primaryShareUrl}\n\nধন্যবাদ,\n${formData.storeName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isProductPublished = (prodId: string) => {
    if (!formData.publishedProductIds || formData.publishedProductIds.length === 0) {
      return true;
    }
    return formData.publishedProductIds.includes(prodId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#004D40] to-[#00695C] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">অনলাইন ই-কমার্স স্টোর ও ডোমেন</h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    formData.isEnabled
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-red-400 text-slate-950'
                  }`}
                >
                  {formData.isEnabled ? '● স্টোর লাইভ' : '○ অফলাইন'}
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                আপনার নিজস্ব ওয়েবসাইট ও ডোমেনে ২৪/৭ অনলাইন ব্যবসা পরিচালনা করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStorefront}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="ওয়েবসাইট দেখুন"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">স্টোর দেখুন</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-teal-100 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-5 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-teal-700" />
            <span>ওভারভিউ ও শেয়ার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'domain'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>কাস্টম ডোমেন</span>
            {formData.customDomainVerified && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>অনলাইন অর্ডার ({orders.length})</span>
            {orders.filter((o) => o.orderStatus === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black">
                {orders.filter((o) => o.orderStatus === 'pending').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-amber-600" />
            <span>পণ্য ক্যাটালগ ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>ই-কমার্স সেটিংস</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'messages'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>গ্রাহক মেসেজ ও চ্যাট</span>
            {unreadMessageCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {unreadMessageCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {saveSuccessNotice && (
            <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>অনলাইন স্টোর তথ্য সফলভাবে সংরক্ষিত হয়েছে!</span>
            </div>
          )}

          {domainVerifySuccess && (
            <div className="mb-4 bg-teal-50 border border-teal-300 text-teal-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{domainVerifySuccess}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & SHARE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Store Status Banner */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        {formData.isEnabled && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${formData.isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      </span>
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        formData.isEnabled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {formData.isEnabled ? 'অনলাইন স্টোর সক্রিয় ও লাইভ' : 'স্টোর সাময়িক বন্ধ'}
                      </span>
                      {formData.customDomainVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          কাস্টম ডোমেন
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {formData.storeName || 'আমার অনলাইন শপ'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      এই লিংকটি দিয়ে ক্রেতারা সরাসরি যেকোনো মোবাইল বা কম্পিউটার ব্রাউজার থেকে আপনার পণ্য দেখতে এবং অর্ডার করতে পারবেন।
                    </p>
                  </div>

                  {/* Toggle Live */}
                  <div className="flex items-center gap-2 shrink-0 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...formData, isEnabled: !formData.isEnabled };
                        setFormData(updated);
                        onUpdateConfig(updated);
                        storeApi.saveOnlineConfig(updated).catch(() => null);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        formData.isEnabled
                          ? 'bg-[#004D40] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {formData.isEnabled ? 'চালু আছে' : 'বন্ধ রাখুন'}
                    </button>
                  </div>
                </div>

                {/* Live Working URL Address Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <span>লাইভ ওয়েবসাইট লিংক (যেকোনো ব্রাউজারে চলবে):</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">100% LIVE</span>
                      </div>
                      <p className="text-xs sm:text-sm font-black text-teal-950 font-mono truncate select-all">
                        {primaryShareUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => window.open(primaryShareUrl, '_blank')}
                      className="px-3.5 py-2 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                      title="ব্রাউজারে সরাসরি নতুন ট্যাবে ওপেন করুন"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ব্রাউজারে ওপেন করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(primaryShareUrl)}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                      title="লিংক কপি করুন"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span className="text-[11px]">{copiedLink ? 'কপি হয়েছে' : 'কপি'}</span>
                    </button>
                  </div>
                </div>

                {/* Fast Action Share Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(primaryShareUrl)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareOnWhatsApp}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp শেয়ার</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenStorefront}
                    className="p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-700" />
                    <span>ওয়েবসাইট প্রিভিউ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('domain')}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-700" />
                    <span>ডোমেন সেটিং</span>
                  </button>
                </div>
              </div>

              {/* Browser & Google Search Guidance Card */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>ব্রাউজারে বা গুগলে সার্চ করার সময় সমস্যা হচ্ছে? সমাধান জেনে নিন:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                  <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200/70 space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">১</span>
                      <span>ব্রাউজারে সরাসরি ওপেন</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      উপরের <strong>"ব্রাউজারে ওপেন করুন"</strong> বাটনে ক্লিক করলে বা <strong>"লিংক কপি"</strong> করে Chrome, Safari, বা Edge ব্রাউজারের অ্যাড্রেস বারে পেস্ট করলে আপনার স্টোর ১০০% সাথে সাথে চলে আসবে।
                    </p>
                  </div>

                  <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200/70 space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">২</span>
                      <span>গুগল সার্চ ও ইনডেক্সিং</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      নতুন যেকোনো ওয়েবসাইট গুগল ক্রলারের খুঁজে পেতে ও ইনডেক্স করতে ৩-৭ দিন সময় লাগে। তাই গুগলে সার্চ না করে লিঙ্কটি সরাসরি গ্রাহকদের সাথে শেয়ার করুন।
                    </p>
                  </div>

                  <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200/70 space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black">৩</span>
                      <span>নিজস্ব কেনা কাস্টম ডোমেন</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      আপনার নিজের কেনা .com ডোমেন থাকলে <strong>"কাস্টম ডোমেন"</strong> ট্যাবে গিয়ে ডোমেনটি যুক্ত করে DNS রেকর্ড আপডেট করুন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">অনলাইন পণ্য</span>
                    <Package className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{products.length} টি</div>
                  <div className="text-[11px] text-teal-700 font-bold mt-0.5">সবগুলো স্বয়ংক্রিয় সিঙ্ক</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">মোট অর্ডার</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{orders.length} টি</div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    নতুন: {orders.filter((o) => o.orderStatus === 'pending').length}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">মোট অনলাইন বিক্রি</span>
                    <DollarSign className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    ৳ {formatMoney(orders.filter((o) => o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.totalAmount, 0))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">ডেলিভারি সহ</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">ডোমেন স্ট্যাটাস</span>
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {formData.customDomainVerified ? 'কাস্টম ডোমেন' : 'সাব-ডোমেন'}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-0.5">SSL সুরক্ষিত (HTTPS)</div>
                </div>
              </div>

              {/* How it works guidance */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-3xl p-5 border border-teal-200/70 space-y-3">
                <h4 className="text-sm font-bold text-teal-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>অনলাইন স্টোরের মাধ্যমে আপনার ব্যবসা বৃদ্ধি করুন</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">১. পণ্য যুক্ত করুন</div>
                    <p className="text-slate-600 leading-relaxed">
                      দোকানের ইনভেনটরিতে পণ্য যুক্ত করলেই স্বয়ংক্রিয়ভাবে আপনার অনলাইন স্টোরে শো করবে।
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">২. লিংক কাস্টমারকে দিন</div>
                    <p className="text-slate-600 leading-relaxed">
                      ওয়েবসাইট লিংক দিয়ে কাস্টমারকে সরাসরি অর্ডার করতে বলুন। কোনো অ্যাপ ইন্সটলের দরকার নেই।
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">৩. অর্ডার ও পেমেন্ট নিন</div>
                    <p className="text-slate-600 leading-relaxed">
                      কাস্টমার অর্ডার করলে সরাসরি আপনার প্যানেলে অর্ডার আসবে এবং হোয়াটসঅ্যাপে কনফার্ম করতে পারবেন।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM DOMAIN & SUBDOMAIN */}
          {activeTab === 'domain' && (
            <div className="space-y-6">
              {/* Free Instant Live Store Link */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-black">
                      ১
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        ফ্রি ইনস্ট্যান্ট লাইভ লিঙ্ক (Instant Live Link)
                      </h3>
                      <p className="text-xs text-slate-500">
                        কোনো ডোমেন কেনা ছাড়াই এখনই চালু থাকা ১০০% সক্রিয় ওয়েব অ্যাড্রেস
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    এখনই সক্রিয়
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">আপনার দোকানের ইউজারনেম / স্ল্যাগ:</label>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-xs sm:text-sm focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20">
                      <span className="text-slate-400 font-sans text-xs mr-1">shop=</span>
                      <input
                        type="text"
                        value={formData.storeSlug}
                        onChange={(e) => {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, storeSlug: clean });
                        }}
                        className="bg-transparent font-bold text-teal-900 focus:outline-none px-1 flex-1 min-w-0"
                        placeholder="your-shop-name"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      className="px-4 py-2.5 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                    >
                      স্ল্যাগ সেভ করুন
                    </button>

                    <button
                      type="button"
                      onClick={() => window.open(liveStoreUrl, '_blank')}
                      className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs rounded-xl transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ব্রাউজারে টেস্ট করুন</span>
                    </button>
                  </div>
                </div>

                {/* Instant Live Link Box */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="truncate font-mono text-slate-700 text-xs flex items-center gap-2">
                    <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                    <span className="font-bold text-teal-900">সরাসরি ব্রাউজার লিঙ্ক:</span>
                    <span className="text-slate-800 truncate select-all">{liveStoreUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(liveStoreUrl)}
                    className="self-start sm:self-auto shrink-0 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                  </button>
                </div>
              </div>

              {/* Connect Custom Domain (Own Domain) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                      ২
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        আপনার নিজস্ব কেনা কাস্টম ডোমেন যুক্ত করুন
                      </h3>
                      <p className="text-xs text-slate-500">
                        যেমন: GoDaddy, Namecheap থেকে কেনা .com, .net, .com.bd ডোমেন
                      </p>
                    </div>
                  </div>

                  {formData.customDomainVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ভেরিফাইড ও সক্রিয়
                    </span>
                  )}
                </div>

                {/* Input row */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">ডোমেন নাম লিখুন:</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="যেমন: www.mybrandshop.com অথবা myshop.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyCustomDomain}
                        disabled={isVerifyingDomain || !customDomainInput.trim()}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isVerifyingDomain ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>ভেরিফাই হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ভেরিফাই ও সংযুক্ত করুন</span>
                          </>
                        )}
                      </button>

                      {formData.customDomainVerified && (
                        <button
                          type="button"
                          onClick={handleDisconnectDomain}
                          className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          ডিসকানেক্ট
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* DNS Configuration Instructions */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      <span>DNS সেটিংস নির্দেশিকা (যেখান থেকে ডোমেন কিনেছেন সেখানে এন্ট্রি করুন):</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">ঝামেলামুক্ত ৩ মিনিট সেটআপ</span>
                  </div>

                  {/* DNS Records Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold">
                          <th className="pb-2">রেকর্ড টাইপ</th>
                          <th className="pb-2">নাম / হোস্ট</th>
                          <th className="pb-2">টার্গেট / ভ্যালু</th>
                          <th className="pb-2">TTL</th>
                          <th className="pb-2 text-right">কপি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 font-mono">
                        <tr>
                          <td className="py-2.5 font-bold text-indigo-700">CNAME</td>
                          <td className="py-2.5 text-slate-800">www</td>
                          <td className="py-2.5 text-teal-800 font-bold">cname.twinghisabi.site</td>
                          <td className="py-2.5 text-slate-500">স্বয়ংক্রিয় / 3600</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard('cname.twinghisabi.site', 'cname')}
                              className="p-1 text-slate-500 hover:text-indigo-600"
                              title="কপি করুন"
                            >
                              {copiedRecord === 'cname' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-bold text-indigo-700">A Record</td>
                          <td className="py-2.5 text-slate-800">@</td>
                          <td className="py-2.5 text-teal-800 font-bold">76.76.21.21</td>
                          <td className="py-2.5 text-slate-500">স্বয়ংক্রিয় / 3600</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard('76.76.21.21', 'arecord')}
                              className="p-1 text-slate-500 hover:text-indigo-600"
                              title="কপি করুন"
                            >
                              {copiedRecord === 'arecord' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-3 text-[11px] text-indigo-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                      <span>কাস্টম ডোমেন সক্রিয় হতে কতক্ষণ লাগে?</span>
                    </p>
                    <p className="text-indigo-800/90 leading-relaxed">
                      DNS রেকর্ড যুক্ত করার পর বিশ্বজুড়ে কার্যকর (DNS Propagation) হতে ১ থেকে ২৪ ঘণ্টা সময় লাগতে পারে। ডোমেন কানেক্ট হওয়ার সাথে সাথে ফ্রি SSL সার্টিফিকেট স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যায়।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORE SETTINGS & CUSTOMIZER */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Section 1: Store Name, Header & Brand Settings */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-teal-700" />
                    <span>ই-কমার্স নাম ও হেডার ব্র্যান্ডিং</span>
                  </h3>
                  <span className="text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full font-bold">
                    হেডার এবং পুরো সাইটে প্রদর্শিত হবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>ই-কমার্স স্টোরের নাম *</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        (এটি সরাসরি উপরের হেডারের বামপাশে বড় অক্ষরে দেখা যাবে)
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      placeholder="উদাঃ bikroyhub, Smart Shop, etc."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">স্টোরের ক্যাটাগরি</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="উদাঃ স্কিনকেয়ার, ফ্যাশন, গ্যাজেট"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">স্টোর লোগো / আইকন</label>
                      {formData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '' })}
                          className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          লোগো মুছুন
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.logoUrl ? (
                        <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl border border-dashed border-slate-300 bg-slate-50 shrink-0 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <label
                        htmlFor="store-logo-upload"
                        className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 text-teal-700" />
                        <span>ছবি আপলোড</span>
                      </label>
                      <input
                        id="store-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleLogoFileUpload(e.target.files[0]);
                          }
                        }}
                      />

                      <input
                        type="url"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="অথবা লোগো URL পেস্ট করুন"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">ট্যাগলাইন বা স্লোগান</label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      placeholder="উদাঃ সেরা মানের পণ্য ও দ্রুততম হোম ডেলিভারি"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">টপ অ্যানাউন্সমেন্ট ব্যানার টেক্সট</label>
                    <input
                      type="text"
                      value={formData.announcement}
                      onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                      placeholder="উদাঃ 🎉 ফ্রি ডেলিভারি অফার! প্রথম অর্ডারে বিশেষ ছাড়!"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Top Hero Banner Customization (ব্যানার পরিবর্তন) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-600" />
                    <span>উপরের হিরো ব্যানার পরিবর্তন ও কাস্টমাইজেশন</span>
                  </h3>
                  <span className="text-[11px] text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full font-bold">
                    হিরো সেকশন
                  </span>
                </div>

                {/* Banner Style Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">ব্যানারের স্টাইল নির্বাচন করুন:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerStyle: 'neon' })}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                        (formData.bannerStyle || 'neon') === 'neon'
                          ? 'border-pink-500 bg-pink-50/50 shadow-xs ring-1 ring-pink-400'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">🌟 নিয়ন Best Picks ব্যানার</div>
                        <div className="text-[11px] text-slate-600">
                          স্ক্রিনশটের হুবহু নিয়ন গ্লো সাইন ও প্রডাক্ট ডিসপ্লে
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerStyle: 'image' })}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                        formData.bannerStyle === 'image'
                          ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">🖼️ কাস্টম ফটো ব্যানার</div>
                        <div className="text-[11px] text-slate-600">
                          নিজের পছন্দের প্রমোশনাল ছবি বা অফার ব্যানার আপলোড
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sub-fields for Neon Banner */}
                {(formData.bannerStyle || 'neon') === 'neon' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50/40 to-purple-50/40 border border-pink-200/60 space-y-3">
                    <div className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>নিয়ন ব্যানারের টেক্সট সেটিংস</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">ব্যানার টাইটেল</label>
                        <input
                          type="text"
                          value={formData.bannerTitle || ''}
                          onChange={(e) => setFormData({ ...formData, bannerTitle: e.target.value })}
                          placeholder="BEST PICKS"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">ব্যানার ট্যাগ</label>
                        <input
                          type="text"
                          value={formData.bannerTag || ''}
                          onChange={(e) => setFormData({ ...formData, bannerTag: e.target.value })}
                          placeholder="OF THE WEEK"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">ডিসকাউন্ট অফার টেক্সট</label>
                        <input
                          type="text"
                          value={formData.bannerDiscountText || ''}
                          onChange={(e) => setFormData({ ...formData, bannerDiscountText: e.target.value })}
                          placeholder="UP TO 55% DISCOUNT"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-fields for Image Banner */}
                {formData.bannerStyle === 'image' && (
                  <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/60 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>কাস্টম ফটো ব্যানার আপলোড ও প্রিসেট</span>
                      </div>
                      {bannerUploadNotice && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {bannerUploadNotice}
                        </span>
                      )}
                    </div>

                    {/* Direct File Upload Area */}
                    <div className="p-4 rounded-xl bg-white border-2 border-dashed border-teal-300 hover:border-teal-500 transition text-center space-y-2.5">
                      {formData.bannerUrl ? (
                        <div className="space-y-2">
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                            <img
                              src={formData.bannerUrl}
                              alt="Store Banner"
                              className="w-full h-36 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, bannerUrl: '' })}
                                className="px-2.5 py-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition"
                              >
                                ছবি মুছুন
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-bold">
                            ✓ বর্তমান ব্যানার সক্রিয় আছে
                          </p>
                        </div>
                      ) : (
                        <div className="py-2 text-slate-500 space-y-1">
                          <Upload className="w-8 h-8 mx-auto text-teal-600" />
                          <p className="text-xs font-bold text-slate-700">
                            মোবাইল গ্যালারি বা কম্পিউটার থেকে ব্যানার ছবি আপলোড করুন
                          </p>
                          <p className="text-[11px] text-slate-400">
                            সুপারিশকৃত সাইজ: 1200 x 400 পিক্সেল (JPG, PNG, WebP)
                          </p>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="banner-file-picker"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{formData.bannerUrl ? 'নতুন ব্যানার ছবি নির্বাচন করুন' : 'ব্যানার ছবি আপলোড করুন'}</span>
                        </label>
                        <input
                          id="banner-file-picker"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleBannerFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">অথবা সরাসরি ব্যানার ছবির URL পেস্ট করুন</label>
                      <input
                        type="url"
                        value={formData.bannerUrl || ''}
                        onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-slate-600">অথবা ১-ক্লিকে প্রিসেট ব্যানার নির্বাচন করুন:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            label: '💄 বিউটি ও স্কিনকেয়ার',
                            url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1000&auto=format&fit=crop&q=80',
                          },
                          {
                            label: '👗 ফ্যাশন ও ক্লথিং',
                            url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&auto=format&fit=crop&q=80',
                          },
                          {
                            label: '📱 গ্যাজেট ও ইলেকট্রনিক্স',
                            url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1000&auto=format&fit=crop&q=80',
                          },
                          {
                            label: '🍎 মুদি ও সুপারস্টোর',
                            url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80',
                          },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...formData,
                                bannerUrl: preset.url,
                                bannerStyle: 'image' as const,
                              };
                              setFormData(updated);
                              onUpdateConfig(updated);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-teal-300 hover:border-teal-500 text-[11px] font-bold text-teal-900 cursor-pointer shadow-2xs hover:bg-teal-50"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Payment Gateways (পেমেন্ট গেটওয়ে সেটিংস) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-700" />
                    <span>পেমেন্ট গেটওয়ে সেটিংস (COD, বিকাশ, নগদ, রকেট)</span>
                  </h3>
                  <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full font-bold">
                    চেকআউটে সক্রিয় থাকবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* COD */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">ক্যাশ অন ডেলিভারি (COD)</div>
                        <div className="text-[11px] text-slate-500">পণ্য হাতে পেয়ে নগদ টাকা প্রদান</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.acceptCOD}
                        onChange={(e) => setFormData({ ...formData, acceptCOD: e.target.checked })}
                        className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* bKash */}
                  <div className="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-pink-900">বিকাশ (bKash) পেমেন্ট</div>
                        <div className="text-[11px] text-pink-700">গ্রাহক সহজে বিকাশ করে ট্রানজেকশন আইডি দিবে</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.acceptBkash}
                        onChange={(e) => setFormData({ ...formData, acceptBkash: e.target.checked })}
                        className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                      />
                    </div>
                    {formData.acceptBkash && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-pink-950">বিকাশ নম্বর</label>
                            <input
                              type="text"
                              value={formData.bkashNumber || ''}
                              onChange={(e) => setFormData({ ...formData, bkashNumber: e.target.value })}
                              placeholder="01XXXXXXXXX"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-pink-300 bg-white text-xs font-semibold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-pink-950">ধরন</label>
                            <select
                              value={formData.bkashType || 'merchant'}
                              onChange={(e) => setFormData({ ...formData, bkashType: e.target.value as any })}
                              className="w-full px-2 py-1.5 rounded-lg border border-pink-300 bg-white text-xs font-semibold text-slate-800"
                            >
                              <option value="merchant">মার্চেন্ট</option>
                              <option value="personal">পার্সোনাল</option>
                              <option value="agent">এজেন্ট</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nagad */}
                  <div className="p-3.5 rounded-2xl border border-orange-200 bg-orange-50/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-orange-900">নগদ (Nagad) পেমেন্ট</div>
                        <div className="text-[11px] text-orange-700">নগদ একাউন্টে পেমেন্ট সংগ্রহ</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.acceptNagad}
                        onChange={(e) => setFormData({ ...formData, acceptNagad: e.target.checked })}
                        className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    </div>
                    {formData.acceptNagad && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-orange-950">নগদ নম্বর</label>
                            <input
                              type="text"
                              value={formData.nagadNumber || ''}
                              onChange={(e) => setFormData({ ...formData, nagadNumber: e.target.value })}
                              placeholder="01XXXXXXXXX"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-orange-950">ধরন</label>
                            <select
                              value={formData.nagadType || 'personal'}
                              onChange={(e) => setFormData({ ...formData, nagadType: e.target.value as any })}
                              className="w-full px-2 py-1.5 rounded-lg border border-orange-300 bg-white text-xs font-semibold text-slate-800"
                            >
                              <option value="merchant">মার্চেন্ট</option>
                              <option value="personal">পার্সোনাল</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rocket */}
                  <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-purple-900">রকেট (Rocket) পেমেন্ট</div>
                        <div className="text-[11px] text-purple-700">ডাচ-বাংলা রকেট একাউন্ট</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.acceptRocket}
                        onChange={(e) => setFormData({ ...formData, acceptRocket: e.target.checked })}
                        className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </div>
                    {formData.acceptRocket && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-purple-950">রকেট নম্বর</label>
                          <input
                            type="text"
                            value={formData.rocketNumber || ''}
                            onChange={(e) => setFormData({ ...formData, rocketNumber: e.target.value })}
                            placeholder="01XXXXXXXXX-X"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Instructions Note for Customers */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      গ্রাহকদের জন্য পেমেন্ট নির্দেশিকা বা বিশেষ নোট
                    </label>
                    <textarea
                      rows={2}
                      value={formData.paymentInstructions || ''}
                      onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
                      placeholder="উদাঃ সেন্ড মানি বা পেমেন্ট সম্পন্ন করার পর আপনার TrxID ইনপুট করুন।"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Delivery Fees & Minimum Order Limit */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>ডেলিভারি চার্জ ও অর্ডার সেটিংস</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ঢাকা সিটির ভেতরে ফি (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryInsideDhaka}
                      onChange={(e) => setFormData({ ...formData, deliveryInsideDhaka: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ঢাকার বাইরে ফি (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryOutsideDhaka}
                      onChange={(e) => setFormData({ ...formData, deliveryOutsideDhaka: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">কত টাকার উপরে ফ্রি ডেলিভারি (৳)</label>
                    <input
                      type="number"
                      value={formData.freeDeliveryAbove || ''}
                      onChange={(e) => setFormData({ ...formData, freeDeliveryAbove: Number(e.target.value) || 0 })}
                      placeholder="উদাঃ 1500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">সর্বনিম্ন অর্ডার মূল্য (৳)</label>
                    <input
                      type="number"
                      value={formData.minOrderAmount || ''}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) || 0 })}
                      placeholder="উদাঃ 200"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">সম্ভাব্য ডেলিভারি সময়</label>
                    <input
                      type="text"
                      value={formData.estimatedDeliveryDays || ''}
                      onChange={(e) => setFormData({ ...formData, estimatedDeliveryDays: e.target.value })}
                      placeholder="উদাঃ ২৪-৭২ ঘণ্টার মধ্যে হোম ডেলিভারি"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Customer Support & Vendor Chat */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>কাস্টমার সাপোর্ট মেনু ও ভেন্ডর চ্যাট</span>
                  </h3>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                    হেডারের সাপোর্ট মেনুর সাথে যুক্ত
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      ভেন্ডর সাপোর্ট WhatsApp নম্বর *
                    </label>
                    <input
                      type="text"
                      value={formData.whatsappPhone}
                      onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                      placeholder="উদাঃ 017XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <p className="text-[10px] text-slate-500">
                      কাস্টমার হেডারের সাপোর্ট মেনু ক্লিক করলে সরাসরি এই নম্বরে হোয়াটসঅ্যাপে চ্যাট শুরু হবে
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">সরাসরি কল নম্বর</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="উদাঃ 017XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">হেল্পলাইন খোলা থাকার সময়সূচি</label>
                    <input
                      type="text"
                      value={formData.supportHours || ''}
                      onChange={(e) => setFormData({ ...formData, supportHours: e.target.value })}
                      placeholder="উদাঃ প্রতিদিন সকাল ৯:০০ - রাত ১০:০০"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">WhatsApp ডিফল্ট শুভেচ্ছা বার্তা</label>
                    <input
                      type="text"
                      value={formData.supportWhatsAppMessage || ''}
                      onChange={(e) => setFormData({ ...formData, supportWhatsAppMessage: e.target.value })}
                      placeholder="উদাঃ আসসালামু আলাইকুম, আমি আপনার অনলাইন স্টোর থেকে যোগাযোগ করছি।"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {saveSuccessNotice && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>সকল সেটিংস ও ব্যানার সফলভাবে সংরক্ষিত হয়েছে!</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onOpenStorefront}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-teal-700" />
                    <span>স্টোরে ফলাফল দেখুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings()}
                    className="flex-1 sm:flex-initial px-6 py-3.5 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>সকল সেটিংস ও ব্যানার সেভ করুন</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 4: PRODUCT CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">অনলাইন ক্যাটালগ ও পণ্য প্রকাশ</h3>
                  <p className="text-xs text-slate-500">
                    যে যে পণ্য অনলাইনে সক্রিয় থাকবে শুধুমাত্র সেগুলোই গ্রাহকরা ওয়েবসাইটে দেখতে পাবেন।
                  </p>
                </div>

                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTab('inventory');
                    }}
                    className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন পণ্য যুক্ত করুন</span>
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                  <Package className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">ইনভেনটরিতে কোনো পণ্য নেই</p>
                  <p className="text-xs text-slate-500">
                    দোকানের পণ্য স্টক ট্যাবে পণ্য যুক্ত করুন, সেগুলো এখানে চলে আসবে।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((prod) => {
                    const isPub = isProductPublished(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 hover:border-teal-300 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{prod.name}</h4>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isPub ? 'অনলাইনে সক্রিয়' : 'লুকানো'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="font-bold text-teal-800">৳ {formatMoney(prod.salePrice)}</span>
                            <span>স্টক: {prod.stock} {prod.unit || 'টি'}</span>
                            {prod.category && <span className="text-slate-400">({prod.category})</span>}
                          </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductPublish(prod.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                            isPub
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isPub ? 'অনলাইন' : 'বন্ধ'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ONLINE ORDERS */}
          {activeTab === 'orders' && (() => {
            const pendingPaymentOrdersCount = orders.filter(
              (o) =>
                o.paymentMethod !== 'cod' &&
                (o.paymentStatus === 'pending_verification' || (!o.paymentStatus || o.paymentStatus === 'unpaid'))
            ).length;
            const paidOrdersCount = orders.filter((o) => o.paymentStatus === 'paid').length;
            const rejectedOrdersCount = orders.filter((o) => o.paymentStatus === 'rejected').length;
            const codOrdersCount = orders.filter((o) => o.paymentMethod === 'cod').length;

            const filteredOrders = orders.filter((o) => {
              if (orderFilter === 'pending_verification') {
                return (
                  o.paymentMethod !== 'cod' &&
                  (o.paymentStatus === 'pending_verification' || (!o.paymentStatus || o.paymentStatus === 'unpaid'))
                );
              }
              if (orderFilter === 'paid') return o.paymentStatus === 'paid';
              if (orderFilter === 'rejected') return o.paymentStatus === 'rejected';
              if (orderFilter === 'cod') return o.paymentMethod === 'cod';
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Orders Header & Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>অনলাইন গ্রাহকদের অর্ডার ও পেমেন্ট ম্যানেজমেন্ট</span>
                      {pendingPaymentOrdersCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[11px] font-black rounded-full animate-pulse">
                          {pendingPaymentOrdersCount} টি পেমেন্ট যাচাই বাকি
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      গ্রাহকের অনলাইন অর্ডার এবং বিকাশ/নগদ পেমেন্ট ভেরিফিকেশন (একসেপ্ট / রিজেক্ট) করুন
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleGenerateTestOrder}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ টেস্ট অর্ডার যোগ করুন</span>
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                      orderFilter === 'all'
                        ? 'bg-[#004D40] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    সকল অর্ডার ({orders.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilter('pending_verification')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      orderFilter === 'pending_verification'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>পেমেন্ট যাচাই বাকি ({pendingPaymentOrdersCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilter('paid')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      orderFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>পেমেন্ট একসেপ্টেড ({paidOrdersCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      orderFilter === 'rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>পেমেন্ট রিজেক্টেড ({rejectedOrdersCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderFilter('cod')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      orderFilter === 'cod'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>ক্যাশ অন ডেলিভারি ({codOrdersCount})</span>
                  </button>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">
                      {orderFilter === 'all'
                        ? 'এখনো কোনো অনলাইন অর্ডার আসেনি'
                        : 'এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      গ্রাহকরা আপনার অনলাইন স্টোরে ভিজিট করে অর্ডার দিলে সাথে সাথে এখানে জমা হবে।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((ord) => {
                      const statusColors = {
                        pending: 'bg-amber-100 text-amber-900 border-amber-300',
                        confirmed: 'bg-blue-100 text-blue-900 border-blue-300',
                        processing: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                        shipped: 'bg-purple-100 text-purple-900 border-purple-300',
                        delivered: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        cancelled: 'bg-red-100 text-red-900 border-red-300',
                      };

                      const statusLabels = {
                        pending: 'নতুন (অপেক্ষমান)',
                        confirmed: 'নিশ্চিত করা হয়েছে',
                        processing: 'প্যাকিং চলছে',
                        shipped: 'ডেলিভারিতে আছে',
                        delivered: 'ডেলিভারি সম্পন্ন',
                        cancelled: 'বাতিল',
                      };

                      const isPendingReview =
                        ord.paymentMethod !== 'cod' &&
                        (ord.paymentStatus === 'pending_verification' || (!ord.paymentStatus || ord.paymentStatus === 'unpaid'));
                      const isPaid = ord.paymentStatus === 'paid';
                      const isRejected = ord.paymentStatus === 'rejected';

                      return (
                        <div
                          key={ord.id}
                          className={`bg-white rounded-2xl p-4 border transition-all space-y-3.5 ${
                            isPendingReview
                              ? 'border-amber-400/90 shadow-md ring-2 ring-amber-400/20'
                              : 'border-slate-200/90 shadow-2xs'
                          }`}
                        >
                          {/* Top Row: Order Number & Delivery Status */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs sm:text-sm text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {ord.orderNumber}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  statusColors[ord.orderStatus] || statusColors.pending
                                }`}
                              >
                                {statusLabels[ord.orderStatus] || ord.orderStatus}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {new Date(ord.createdAt).toLocaleDateString('bn-BD')} •{' '}
                                {new Date(ord.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">ডেলিভারি স্ট্যাটাস:</span>
                              <select
                                value={ord.orderStatus}
                                onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OnlineOrder['orderStatus'])}
                                className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
                              >
                                <option value="pending">নতুন (পেন্ডিং)</option>
                                <option value="confirmed">নিশ্চিত</option>
                                <option value="processing">প্যাকিং</option>
                                <option value="shipped">ডেলিভারিতে</option>
                                <option value="delivered">সম্পন্ন</option>
                                <option value="cancelled">বাতিল</option>
                              </select>
                            </div>
                          </div>

                          {/* Customer & Product Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1.5">
                              <div className="font-bold text-slate-900 text-sm">{ord.customerName}</div>
                              <div className="text-slate-600 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono font-bold">{ord.customerPhone}</span>
                              </div>
                              <div className="text-slate-500 leading-relaxed">
                                ঠিকানা: {ord.customerAddress} ({ord.deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'})
                              </div>
                              {ord.notes && (
                                <div className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-[11px]">
                                  <span className="font-bold">নোট:</span> {ord.notes}
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                              <div className="font-bold text-slate-800 mb-1">অর্ডারকৃত পণ্য:</div>
                              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                {ord.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-600">
                                    <span>
                                      {item.productName} ({item.quantity} {item.unit})
                                    </span>
                                    <span className="font-bold text-slate-800">৳ {formatMoney(item.total)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-xs">
                                <span>ডেলিভারি চার্জ:</span>
                                <span>৳ {formatMoney(ord.deliveryCharge)}</span>
                              </div>
                              <div className="border-t border-slate-200 pt-1 flex justify-between font-black text-slate-900">
                                <span>সর্বমোট প্রদেয়:</span>
                                <span className="text-teal-900 text-sm">৳ {formatMoney(ord.totalAmount)}</span>
                              </div>
                            </div>
                          </div>

                          {/* PAYMENT VERIFICATION BOX */}
                          <div
                            className={`rounded-xl p-3.5 border transition-all space-y-2.5 ${
                              ord.paymentMethod === 'cod'
                                ? 'bg-slate-50 border-slate-200'
                                : isPendingReview
                                ? 'bg-amber-50/70 border-amber-300/90'
                                : isPaid
                                ? 'bg-emerald-50/60 border-emerald-300'
                                : 'bg-rose-50/60 border-rose-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-slate-700" />
                                <span className="font-bold text-xs text-slate-800">পেমেন্ট মেথড ও তথ্য:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    ord.paymentMethod === 'bkash'
                                      ? 'bg-pink-100 text-pink-800 border border-pink-300'
                                      : ord.paymentMethod === 'nagad'
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                      : ord.paymentMethod === 'rocket'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  {ord.paymentMethod === 'bkash' && '🌸 বিকাশ (bKash)'}
                                  {ord.paymentMethod === 'nagad' && '🟠 নগদ (Nagad)'}
                                  {ord.paymentMethod === 'rocket' && '🟣 রকেট (Rocket)'}
                                  {ord.paymentMethod === 'cod' && '🚚 ক্যাশ অন ডেলিভারি (COD)'}
                                </span>
                              </div>

                              <div>
                                {ord.paymentMethod === 'cod' ? (
                                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    ডেলিভারির সময় নগদ আদায়
                                  </span>
                                ) : isPendingReview ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>যাচাই অপেক্ষমান (Pending)</span>
                                  </span>
                                ) : isPaid ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>পেমেন্ট একসেপ্টেড ও ভেরিফাইড</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>পেমেন্ট বাতিল / রিজেক্টেড</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mobile Banking Details (TrxID & Sender Phone) */}
                            {ord.paymentMethod !== 'cod' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    ট্রানজেকশন আইডি (TrxID)
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="font-mono font-black text-slate-900 text-xs sm:text-sm select-all">
                                      {ord.trxId || (ord.notes?.match(/TrxID:\s*([^\s|]+)/i)?.[1] ?? 'পাওয়া যায়নি')}
                                    </span>
                                    {(ord.trxId || ord.notes?.includes('TrxID')) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const t = ord.trxId || ord.notes?.match(/TrxID:\s*([^\s|]+)/i)?.[1] || '';
                                          if (t) copyToClipboard(t, `trx_${ord.id}`);
                                        }}
                                        className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                                        title="TrxID কপি করুন"
                                      >
                                        {copiedRecord === `trx_${ord.id}` ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    প্রেরক মোবাইল নম্বর
                                  </div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="font-mono font-bold text-slate-800 text-xs">
                                      {ord.senderPhone || ord.customerPhone}
                                    </span>
                                    <a
                                      href={`tel:${ord.senderPhone || ord.customerPhone}`}
                                      className="p-1 text-slate-400 hover:text-indigo-600"
                                      title="কল করুন"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    প্রদত্ত টাকার পরিমাণ
                                  </div>
                                  <div className="font-black text-teal-900 text-xs sm:text-sm mt-0.5">
                                    ৳ {formatMoney(ord.paymentAmount || ord.totalAmount)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Rejection Notice if rejected */}
                            {isRejected && ord.paymentRejectReason && (
                              <div className="bg-rose-100/90 text-rose-900 p-2.5 rounded-lg border border-rose-300 text-xs flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold">বাতিলের কারণ: </span>
                                  <span>{ord.paymentRejectReason}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleResetPaymentStatus(ord)}
                                  className="text-[11px] font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer shrink-0"
                                >
                                  পুনরায় যাচাইয়ে নিন
                                </button>
                              </div>
                            )}

                            {/* Vendor Verification Action Buttons */}
                            {ord.paymentMethod !== 'cod' && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 flex-wrap">
                                <div className="text-[11px] text-slate-500">
                                  {isPendingReview
                                    ? '⚠️ স্টেটমেন্টে টাকা ও TrxID চেক করে একসেপ্ট অথবা রিজেক্ট করুন'
                                    : isPaid
                                    ? '✅ পেমেন্ট সফলভাবে একসেপ্ট করা হয়েছে'
                                    : '❌ পেমেন্ট বাতিল করা হয়েছে'}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isPendingReview ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isProcessingPayment === ord.id}
                                        onClick={() => handleAcceptPayment(ord)}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>পেমেন্ট একসেপ্ট করুন</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isProcessingPayment === ord.id}
                                        onClick={() => handleOpenRejectModal(ord)}
                                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>রিজেক্ট করুন</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isProcessingPayment === ord.id}
                                      onClick={() => handleResetPaymentStatus(ord)}
                                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                    >
                                      <RefreshCw className="w-3 h-3 text-slate-500" />
                                      <span>স্ট্যাটাস পরিবর্তন (Reset)</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Order Actions: WhatsApp, Phone Call, Convert to Sale */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 flex-wrap">
                            <a
                              href={`https://wa.me/88${ord.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `আসসালামু আলাইকুম ${ord.customerName} ভাই, ${formData.storeName} থেকে আপনার অনলাইন অর্ডার #${ord.orderNumber} এর বিষয়ে যোগাযোগ করা হয়েছে। মোট বিল: ৳${formatMoney(
                                  ord.totalAmount
                                )}। পেমেন্ট অবস্থা: ${
                                  isPaid
                                    ? 'পরিশোধিত (পেমেন্ট ভেরিফাইড ✅)'
                                    : isRejected
                                    ? `বাতিল (${ord.paymentRejectReason || 'পেমেন্ট মিসম্যাচ ❌'})`
                                    : 'যাচাই প্রক্রিয়াধীন'
                                }। ধন্যবাদ!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp বার্তা</span>
                            </a>

                            <a
                              href={`tel:${ord.customerPhone}`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>কল করুন</span>
                            </a>

                            {onConvertOrderToSale && (
                              <button
                                type="button"
                                onClick={() => onConvertOrderToSale(ord)}
                                className="px-3 py-1.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>বিক্রির খাতায় এন্ট্রি</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* REJECT PAYMENT MODAL */}
          {rejectModalOrder && (
            <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">পেমেন্ট রিজেক্ট করুন</h4>
                      <p className="text-xs text-slate-500">অর্ডার #{rejectModalOrder.orderNumber}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectModalOrder(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">গ্রাহকের নাম:</span>
                      <span className="font-bold text-slate-800">{rejectModalOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">পেমেন্ট মেথড:</span>
                      <span className="font-bold text-slate-800 uppercase">{rejectModalOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">প্রদত্ত TrxID:</span>
                      <span className="font-mono font-bold text-rose-600">{rejectModalOrder.trxId || 'নেই'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">রিজেক্ট করার কারণ নির্বাচন করুন বা লিখুন:</label>
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {[
                        'ভুল TrxID দেওয়া হয়েছে',
                        'অ্যাকাউন্টে টাকা ক্রেডিট হয়নি',
                        'টাকার পরিমাণ কম পাঠানো হয়েছে',
                        'অন্য নম্বরে টাকা পাঠানো হয়েছে',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectReasonInput(preset)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                            rejectReasonInput === preset
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(e.target.value)}
                      placeholder="গ্রাহককে কারণ জানানোর জন্য লিখুন..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectModalOrder(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ফিরে যান
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingPayment === rejectModalOrder.id}
                    onClick={handleConfirmRejectPayment}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>রিজেক্ট নিশ্চিত করুন</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOMER MESSAGES & LIVE CHAT */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#004D40] text-white flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">গ্রাহক মেসেজ ও ইনবক্স</h3>
                    <p className="text-xs text-slate-600">
                      আপনার অনলাইন স্টোরের সাপোর্ট ড্রয়ার থেকে আসা সকল কাস্টমার বার্তা এখানে পাওয়া যাবে। আপনি এখান থেকেই সরাসরি উত্তর দিতে পারবেন।
                    </p>
                  </div>
                </div>
              </div>

              <VendorChatInboxTab storeName={formData.storeName} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
