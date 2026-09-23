import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder, StoreProfile, StoreBanner, Coupon } from '../types';
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
  Lock,
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
  Save,
  Tag,
  Landmark,
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
  onOpenSubscriptionModal?: () => void;
}

type TabType = 'overview' | 'activation_request' | 'domain' | 'settings' | 'catalog' | 'orders' | 'messages' | 'coupons' | 'payments';

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
  onOpenSubscriptionModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Form states initialized with config
  const [formData, setFormData] = useState<OnlineStoreConfig>(config);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Sync with incoming config prop
  React.useEffect(() => {
    if (config) {
      setFormData(config);
      setCustomDomainInput(config.customDomain || '');
    }
  }, [config]);

  // When modal opens, refresh latest status from server
  React.useEffect(() => {
    if (isOpen) {
      storeApi.getOnlineConfig().then((res) => {
        if (res) {
          setFormData((prev) => ({
            ...prev,
            ...res,
          }));
          onUpdateConfig(res);
          if (res.isStoreAllowedByAdmin && res.adminStoreStatus === 'active') {
            setActiveTab('overview');
          }
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleCheckStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const res = await storeApi.getOnlineConfig();
      if (res) {
        setFormData(res);
        onUpdateConfig(res);
        if (res.isStoreAllowedByAdmin && res.adminStoreStatus === 'active') {
          if (onShowToast) onShowToast('🎉 সুপার অ্যাডমিন আপনার অনলাইন স্টোর ব্যবহারের অনুমোদন দিয়েছেন!');
          setActiveTab('overview');
        } else if (res.adminStoreStatus === 'requested') {
          if (onShowToast) onShowToast('আপনার আবেদনটি এখনো সুপার অ্যাডমিনের পর্যালোচনায় রয়েছে।');
        } else {
          if (onShowToast) onShowToast('অনলাইন স্টোর বর্তমানে সক্রিয় নয়। আবেদন পাঠাতে নিচে ফর্মটি পূরণ করুন।');
        }
      }
    } catch {
      if (onShowToast) onShowToast('স্ট্যাটাস রিফ্রেশ করতে সমস্যা হয়েছে');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const [requestNoteInput, setRequestNoteInput] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState(config.customDomain || '');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifySuccess, setDomainVerifySuccess] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

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

  // Delivery status management drafts and submission states
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OnlineOrder['orderStatus']>>({});
  const [orderCourierDrafts, setOrderCourierDrafts] = useState<Record<string, { courierName?: string; courierTrackingCode?: string }>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusUpdateSuccessId, setStatusUpdateSuccessId] = useState<string | null>(null);

  // Catalog tab filter states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Coupon management form states
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMinSpend, setNewCouponMinSpend] = useState(500);
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState<number | undefined>(200);
  const [newCouponDescription, setNewCouponDescription] = useState('');

  const handleRequestStoreActivation = async () => {
    try {
      setIsSubmittingRequest(true);
      const res = await storeApi.requestOnlineStoreActivation(requestNoteInput.trim() || undefined);
      setRequestSuccessMessage(res?.message || 'অনলাইন স্টোর চালুর আবেদন সফলভাবে জমা হয়েছে!');
      const updated = {
        ...formData,
        adminStoreStatus: 'requested' as const,
        adminStoreNote: requestNoteInput.trim() || undefined,
      };
      setFormData(updated);
      onUpdateConfig(updated);
      if (onShowToast) onShowToast('✅ অনলাইন স্টোর চালুর আবেদন সফলভাবে জমা হয়েছে!');
    } catch (err: any) {
      alert(`রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCancelStoreActivation = async () => {
    try {
      setIsSubmittingRequest(true);
      await storeApi.cancelOnlineStoreActivation();
      setRequestSuccessMessage(null);
      const updated = {
        ...formData,
        adminStoreStatus: 'disabled' as const,
        adminStoreNote: 'আবেদন প্রত্যাহার করা হয়েছে',
      };
      setFormData(updated);
      onUpdateConfig(updated);
      if (onShowToast) onShowToast('অনলাইন স্টোর আবেদন প্রত্যাহার করা হয়েছে');
    } catch (err: any) {
      alert(`বাতিল করতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleAddCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) return;
    const existing = formData.coupons || [];
    if (existing.some((c) => c.code.toUpperCase() === code)) {
      alert('এই কোডের কুপন ইতোমধ্যে বিদ্যমান আছে!');
      return;
    }
    const newCoupon: Coupon = {
      id: `cpn_${Date.now()}`,
      code,
      discountType: newCouponType,
      discountValue: newCouponValue,
      minOrderAmount: newCouponMinSpend > 0 ? newCouponMinSpend : undefined,
      maxDiscount: newCouponType === 'percentage' && newCouponMaxDiscount ? newCouponMaxDiscount : undefined,
      isActive: true,
      description: newCouponDescription.trim() || undefined,
    };
    const updated = {
      ...formData,
      coupons: [...existing, newCoupon],
    };
    setFormData(updated);
    onUpdateConfig(updated);
    setNewCouponCode('');
    setNewCouponDescription('');
    if (onShowToast) onShowToast(`✅ কুপন '${code}' সফলভাবে যুক্ত হয়েছে!`);
  };

  const handleToggleCoupon = (code: string) => {
    const existing = formData.coupons || [];
    const updated = {
      ...formData,
      coupons: existing.map((c) => (c.code === code ? { ...c, isActive: !c.isActive } : c)),
    };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleDeleteCoupon = (code: string) => {
    if (confirm(`আপনি কি '${code}' কুপনটি ডিলিট করতে চান?`)) {
      const existing = formData.coupons || [];
      const updated = {
        ...formData,
        coupons: existing.filter((c) => c.code !== code),
      };
      setFormData(updated);
      onUpdateConfig(updated);
      if (onShowToast) onShowToast(`কুপন '${code}' মুছে ফেলা হয়েছে।`);
    }
  };

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

  const currentDomainDisplay = formData.customDomainVerified && formData.customDomain
    ? formData.customDomain
    : `${formData.storeSlug || 'shop'}.twinghisabi.site`;

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
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
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

          let finalUrl = dataUrl;
          try {
            const blob = await (await fetch(dataUrl)).blob();
            const uploadFormData = new FormData();
            uploadFormData.append('file', blob, file.name || 'banner.jpg');
            const token = localStorage.getItem('token');
            const res = await fetch('/api/media/upload', {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: uploadFormData,
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.url) finalUrl = resData.url;
            }
          } catch (err) {
            // fallback to dataUrl
          }

          const newBannerItem: StoreBanner = {
            id: `banner_${Date.now()}`,
            imageUrl: finalUrl,
            title: formData.bannerTitle || formData.storeName,
            subtitle: formData.bannerSubtitle || '',
            tag: formData.bannerTag || 'স্পেশাল অফার',
            active: true,
          };

          const currentBanners = Array.isArray(formData.banners) ? [...formData.banners] : [];
          const updatedBanners = [...currentBanners, newBannerItem];

          const updated = {
            ...formData,
            bannerUrl: finalUrl,
            bannerStyle: 'image' as const,
            banners: updatedBanners,
          };
          setFormData(updated);
          onUpdateConfig(updated);
          setBannerUploadNotice('✅ নতুন ব্যানার সফলভাবে আপলোড ও যুক্ত হয়েছে!');
          setTimeout(() => setBannerUploadNotice(null), 4000);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = (bannerId: string) => {
    const existing = Array.isArray(formData.banners) ? [...formData.banners] : [];
    const updatedBanners = existing.filter((b) => b.id !== bannerId);
    const updated = {
      ...formData,
      banners: updatedBanners,
      bannerUrl: updatedBanners[0]?.imageUrl || '',
    };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleToggleBannerActive = (bannerId: string) => {
    const existing = Array.isArray(formData.banners) ? [...formData.banners] : [];
    const updatedBanners = existing.map((b) =>
      b.id === bannerId ? { ...b, active: b.active === false } : b
    );
    const updated = {
      ...formData,
      banners: updatedBanners,
    };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleAddPresetBanner = (presetUrl: string, presetLabel: string) => {
    const newBannerItem: StoreBanner = {
      id: `banner_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      imageUrl: presetUrl,
      title: presetLabel.replace(/^[^\w\s\u0980-\u09FF]+/, '').trim() || formData.storeName,
      subtitle: 'সেরা অফারে আকর্ষণীয় পণ্য সামগ্রী',
      tag: 'হট অফার',
      active: true,
    };
    const currentBanners = Array.isArray(formData.banners) ? [...formData.banners] : [];
    const updatedBanners = [...currentBanners, newBannerItem];
    const updated = {
      ...formData,
      bannerUrl: presetUrl,
      bannerStyle: 'image' as const,
      banners: updatedBanners,
    };
    setFormData(updated);
    onUpdateConfig(updated);
    setBannerUploadNotice('✅ প্রিসেট ব্যানার যুক্ত হয়েছে!');
    setTimeout(() => setBannerUploadNotice(null), 4000);
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

  const handlePaymentQrFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setFormData((prev) => ({ ...prev, vendorPaymentQrUrl: dataUrl }));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.storeName || !formData.storeName.trim()) {
      alert('অনুগ্রহ করে আপনার অনলাইন স্টোরের নাম দিন।');
      return;
    }
    try {
      const saved = await storeApi.saveOnlineConfig(formData);
      onUpdateConfig({ ...formData, ...saved });
      setSaveSuccessNotice(true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(err.message || 'স্টোর সেটিংস সেভ করতে সমস্যা হয়েছে।');
    }
  };

  const handleVerifyCustomDomain = async () => {
    const domain = customDomainInput.trim().toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) {
      alert('অনুগ্রহ করে সঠিক ডোমেন নাম লিখুন (যেমন: www.myshopbd.com অথবা mybrand.com)');
      return;
    }

    setDomainError(null);
    setIsVerifyingDomain(true);
    try {
      const res = await storeApi.verifyCustomDomain(domain);
      const updated: OnlineStoreConfig = {
        ...formData,
        customDomain: domain,
        customDomainVerified: true,
        customDomainStatus: 'verified',
        customDomainVerifiedAt: Date.now(),
      };
      setFormData(updated);
      onUpdateConfig(updated);
      setDomainVerifySuccess(res.message || 'অভিনন্দন! আপনার কাস্টম ডোমেন সফলভাবে ভেরিফাই ও সংযুক্ত হয়েছে। ফ্রি SSL সক্রিয়!');
      setTimeout(() => setDomainVerifySuccess(null), 6000);
    } catch (err: any) {
      console.error('Domain verify error:', err);
      const msg = err.message || 'ডোমেন ভেরিফিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে DNS রেকর্ড চেক করুন।';
      setDomainError(msg);
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleDisconnectDomain = async () => {
    if (confirm('আপনি কি এই কাস্টম ডোমেনটি ডিসকানেক্ট করতে চান?')) {
      try {
        await storeApi.disconnectCustomDomain();
        const updated: OnlineStoreConfig = {
          ...formData,
          customDomain: '',
          customDomainVerified: false,
          customDomainStatus: 'pending',
        };
        setCustomDomainInput('');
        setFormData(updated);
        onUpdateConfig(updated);
        setDomainError(null);
        if (onShowToast) {
          onShowToast('✅ কাস্টম ডোমেন ডিসকানেক্ট করা হয়েছে।');
        }
      } catch (err: any) {
        alert(err.message || 'ডোমেন ডিসকানেক্ট করতে সমস্যা হয়েছে।');
      }
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

  const handleSubmitOrderStatus = async (orderId: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    const newStatus = orderStatusDrafts[orderId] ?? ord.orderStatus;
    const courierDraft = orderCourierDrafts[orderId];
    const courierName = courierDraft?.courierName !== undefined ? courierDraft.courierName : ord.courierName;
    const courierTrackingCode = courierDraft?.courierTrackingCode !== undefined ? courierDraft.courierTrackingCode : ord.courierTrackingCode;

    setUpdatingOrderId(orderId);
    const now = Date.now();
    try {
      const updatedOrders = orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: newStatus,
              courierName: courierName || undefined,
              courierTrackingCode: courierTrackingCode || undefined,
              updatedAt: now,
            }
          : o
      );
      onUpdateOrders(updatedOrders);

      // 1. Sync to customer localStorage on this browser
      try {
        const rawCustomerOrders = localStorage.getItem('ibrahim_khata_online_customer_orders_v1');
        if (rawCustomerOrders) {
          const custOrders: OnlineOrder[] = JSON.parse(rawCustomerOrders);
          const updatedCustOrders = custOrders.map((co) =>
            co.id === orderId || co.orderNumber === ord.orderNumber || co.orderNumber === orderId
              ? {
                  ...co,
                  orderStatus: newStatus,
                  courierName: courierName || undefined,
                  courierTrackingCode: courierTrackingCode || undefined,
                  updatedAt: now,
                }
              : co
          );
          localStorage.setItem('ibrahim_khata_online_customer_orders_v1', JSON.stringify(updatedCustOrders));
        }
      } catch (err) {
        console.warn('Failed to sync to customer localStorage:', err);
      }

      // 2. Dispatch global event for instant UI sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('twing_order_updated', {
            detail: {
              orderId,
              orderNumber: ord.orderNumber,
              orderStatus: newStatus,
              courierName,
              courierTrackingCode,
              updatedAt: now,
            },
          })
        );
      }

      // 3. Persist to server database
      const serverRes = await storeApi.updateOrderStatus(orderId, newStatus, {
        courierName: courierName || undefined,
        courierTrackingCode: courierTrackingCode || undefined,
      });

      if (serverRes) {
        const finalOrders = orders.map((o) =>
          o.id === orderId ? { ...o, ...serverRes } : o
        );
        onUpdateOrders(finalOrders);
      }

      setStatusUpdateSuccessId(orderId);
      setTimeout(() => {
        setStatusUpdateSuccessId((cur) => (cur === orderId ? null : cur));
      }, 5000);

      const statusBnName =
        newStatus === 'pending'
          ? 'নতুন (অপেক্ষমান)'
          : newStatus === 'confirmed'
          ? 'নিশ্চিত'
          : newStatus === 'processing'
          ? 'প্যাকিং চলছে'
          : newStatus === 'shipped'
          ? 'ডেলিভারিতে আছে'
          : newStatus === 'delivered'
          ? 'ডেলিভারি সম্পন্ন'
          : 'বাতিল';

      if (onShowToast) {
        onShowToast(`✅ অর্ডার #${ord.orderNumber} এর স্ট্যাটাস '${statusBnName}' সাবমিট হয়েছে এবং কাস্টমার সাইডে পাঠানো হয়েছে!`);
      }
    } catch (err: any) {
      console.error('Failed to submit order status update:', err);
      if (onShowToast) {
        onShowToast(`⚠️ স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: ${err.message || 'Error'}`);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OnlineOrder['orderStatus']) => {
    setOrderStatusDrafts((prev) => ({ ...prev, [orderId]: newStatus }));
    await handleSubmitOrderStatus(orderId);
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
    const text = `🛍️ আসসালামু আলাইকুম! আমাদের অনলাইন শপ এখন সম্পূর্ণ লাইভ।\nঘরে বসেই সেরা মূল্যে পছন্দের পণ্য অর্ডার করতে ভিজিট করুন:\n👉 https://${currentDomainDisplay}\n\nধন্যবাদ,\n${formData.storeName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isProductPublished = (prodId: string) => {
    if (!formData.publishedProductIds || formData.publishedProductIds.length === 0) {
      return true;
    }
    return formData.publishedProductIds.includes(prodId);
  };

  const isStoreDisabledByAdmin = formData.isStoreAllowedByAdmin === false || formData.adminStoreStatus === 'disabled';
  const isStorePendingReview = formData.adminStoreStatus === 'requested';
  const shouldShowActivationGate = isStoreDisabledByAdmin || isStorePendingReview;

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
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {shouldShowActivationGate ? 'অনলাইন ই-কমার্স স্টোর' : 'অনলাইন ই-কমার্স স্টোর ও ডোমেন'}
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isStorePendingReview
                      ? 'bg-amber-300 text-slate-950 animate-pulse'
                      : isStoreDisabledByAdmin
                      ? 'bg-rose-500 text-white'
                      : formData.isEnabled
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-red-400 text-slate-950'
                  }`}
                >
                  {isStorePendingReview
                    ? '⏳ আবেদন পর্যালোচনায়'
                    : isStoreDisabledByAdmin
                    ? '🔒 সুপার অ্যাডমিন অনুমতি প্রয়োজন'
                    : formData.isEnabled
                    ? '● স্টোর লাইভ'
                    : '○ অফলাইন'}
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                {shouldShowActivationGate
                  ? 'ই-কমার্স অপশন ব্যবহারের জন্য সুপার অ্যাডমিনের অনুমতি প্রয়োজন'
                  : 'আপনার নিজস্ব ওয়েবসাইট ও ডোমেনে ২৪/৭ অনলাইন ব্যবসা পরিচালনা করুন'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shouldShowActivationGate ? (
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs bg-white/20 hover:bg-white/30 text-white disabled:opacity-50"
                title="সুপার অ্যাডমিন অনুমতি দিয়েছেন কিনা রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isCheckingStatus ? 'যাচাই হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStorefront}
                className="px-3 py-1.5 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm bg-amber-400 hover:bg-amber-300 text-slate-950"
                title="ওয়েবসাইট দেখুন"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">স্টোর দেখুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-teal-100 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Only visible when permission is granted by Super Admin */}
        {!shouldShowActivationGate && (
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
            onClick={() => setActiveTab('activation_request')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'activation_request'
                ? 'border-amber-500 text-amber-950 bg-white shadow-2xs rounded-t-xl font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-amber-600" />
            <span>রিকোয়েস্ট অপশন</span>
            {isStorePendingReview ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse">
                পেন্ডিং
              </span>
            ) : isStoreDisabledByAdmin ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                আবেদন
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                সক্রিয়
              </span>
            )}
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
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'payments'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-pink-600" />
            <span>পেমেন্ট গেটওয়ে ও মেথড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'coupons'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-600" />
            <span>কুপন ও ডিসকাউন্ট ({(formData.coupons || []).length})</span>
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
        )}

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {shouldShowActivationGate ? (
            <div className="max-w-2xl mx-auto py-4 sm:py-6 space-y-6">
              {isStorePendingReview ? (
                /* Pending Review State */
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm space-y-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center border border-amber-200 shadow-inner">
                    <Clock className="w-8 h-8 animate-spin text-amber-600" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      আবেদন পর্যালোচনায় রয়েছে (Pending Review)
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      আপনার অনলাইন স্টোর চালুর আবেদন জমা হয়েছে
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                      অনলাইন স্টোর ব্যবহার করার জন্য আপনার রিকোয়েস্টটি সুপার অ্যাডমিনের নিকট জমা রয়েছে। সুপার অ্যাডমিন তথ্য যাচাই করে অনুমোদন দিলেই আপনি এখান থেকে আপনার অনলাইন শপ ও ই-কমার্স ব্যবসা সম্পূর্ণ পরিচালনা করতে পারবেন।
                    </p>
                  </div>

                  {/* Submitted Info Card */}
                  <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200/90 text-left space-y-3">
                    <div className="text-xs font-bold text-amber-900 border-b border-amber-200 pb-2">
                      আবেদনের বিবরণ:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">প্রতিষ্ঠানের নাম:</span>
                        <span className="font-bold text-slate-800">{formData.storeName || store.name || 'আমার দোকান'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">যোগাযোগ নম্বর:</span>
                        <span className="font-bold text-slate-800">{formData.phone || store.phone || 'দেওয়া হয়নি'}</span>
                      </div>
                    </div>
                    {formData.adminStoreNote && (
                      <div className="text-xs pt-1">
                        <span className="text-slate-500 block text-[11px]">আপনার প্রেরিত নোট:</span>
                        <p className="font-medium text-amber-950 bg-white/80 p-2.5 rounded-xl border border-amber-200 mt-1">
                          &ldquo;{formData.adminStoreNote}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isCheckingStatus}
                      onClick={handleCheckStatus}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#004D40] hover:bg-[#00382e] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      <span>{isCheckingStatus ? 'যাচাই করা হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ করুন'}</span>
                    </button>

                    <a
                      href={`https://wa.me/8801306908115?text=${encodeURIComponent(
                        `হ্যালো সুপার অ্যাডমিন, আমি "${formData.storeName || store.name}" এর জন্য ক্যাশবুক ড্যাশবোর্ড থেকে অনলাইন স্টোর ও ই-কমার্স ব্যবহারের আবেদন করেছি। দয়া করে আমার আবেদনটি যাচাই করে অনুমোদন দিন।`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>সুপার অ্যাডমিনকে হোয়াটসঅ্যাপে জানান</span>
                    </a>

                    <button
                      type="button"
                      disabled={isSubmittingRequest}
                      onClick={handleCancelStoreActivation}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>আবেদন বাতিল করুন</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    জরুরি প্রয়োজনে কল করুন: <span className="font-bold text-slate-700">01306908115</span>
                  </p>
                </div>
              ) : (
                /* Disabled / Need Permission State */
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  {/* Security Lock Header */}
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200 shadow-inner">
                      <Lock className="w-8 h-8 text-rose-600" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                      🔒 সুপার অ্যাডমিন অনুমতি প্রয়োজন
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      অনলাইন স্টোর ব্যবহারের পূর্বে অনুমতি নিন
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                      ইউজার ড্যাশবোর্ড থেকে অনলাইন স্টোর ব্যবহার করতে চাইলে আগে সুপার অ্যাডমিনের কাছে ই-কমার্স অপশন ব্যবহারের অনুমতি নিতে হবে। সুপার অ্যাডমিন অনুমতি দিলে ইউজার এখান থেকে ই-কমার্স ব্যবসা পরিচালনা করতে পারবে।
                    </p>
                  </div>

                  {formData.adminStoreNote && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">পূর্ববর্তী নোট:</span> {formData.adminStoreNote}
                      </div>
                    </div>
                  )}

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-teal-950">নিজস্ব ওয়েবসাইট ও ডোমেন</h4>
                        <p className="text-[11px] text-teal-800 mt-0.5">
                          কাস্টম ডোমেন অথবা ফ্রি সাবডোমেনে ২৪/৭ আপনার অনলাইন দোকান চলবে।
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-indigo-950">অনলাইন অর্ডার ম্যানেজমেন্ট</h4>
                        <p className="text-[11px] text-indigo-800 mt-0.5">
                          কাস্টমাররা সরাসরি অর্ডার করতে পারবে এবং এক ক্লিকেই ক্যাশবুকে যুক্ত হবে।
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950">বিকাশ / নগদ পেমেন্ট</h4>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          ক্যাশ অন ডেলিভারি ও ডিজিটাল পেমেন্ট ট্রানজেকশন ভেরিফিকেশন সুবিধা।
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950">পণ্য ক্যাটালগ ও ডিসকাউন্ট</h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          ছবিসহ আনলিমিটেড পণ্য প্রদর্শন ও কুপন কোড দিয়ে ছাড় দেওয়ার সুবিধা।
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permission Application Form */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-slate-800 font-bold text-xs">
                      <Send className="w-4 h-4 text-teal-700" />
                      <span>অনুমতির জন্য সুপার অ্যাডমিনের নিকট আবেদন ফর্ম</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          দোকান / ব্যবসার নাম:
                        </label>
                        <input
                          type="text"
                          value={formData.storeName || store.name || ''}
                          readOnly
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          যোগাযোগের মোবাইল নম্বর:
                        </label>
                        <input
                          type="text"
                          value={formData.phone || store.phone || ''}
                          readOnly
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        সুপার অ্যাডমিনের উদ্দেশ্যে বার্তা বা বিবরণ (ঐচ্ছিক):
                      </label>
                      <textarea
                        rows={3}
                        value={requestNoteInput}
                        onChange={(e) => setRequestNoteInput(e.target.value)}
                        placeholder="যেমন: আমি আমার দোকানের জন্য অনলাইন স্টোর ও ই-কমার্স সুবিধা চালু করতে চাই। অনুগ্রহ করে ব্যবহারের অনুমতি দিন।"
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        disabled={isCheckingStatus}
                        onClick={handleCheckStatus}
                        className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                        <span>অনুমোদনের স্ট্যাটাস রিফ্রেশ</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmittingRequest}
                        onClick={handleRequestStoreActivation}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingRequest ? 'আবেদন পাঠানো হচ্ছে...' : 'সুপার অ্যাডমিনের কাছে অনুমতির আবেদন পাঠান'}</span>
                      </button>
                    </div>

                    {requestSuccessMessage && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{requestSuccessMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Support Footnote */}
                  <div className="pt-2 text-center text-xs text-slate-500 space-y-1">
                    <p>
                      সুপার অ্যাডমিন হেল্পলাইন: <span className="font-bold text-slate-800">01306908115</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      সুপার অ্যাডমিন অনুমোদন দিলে আপনি স্বয়ংক্রিয়ভাবে অনলাইন স্টোর পরিচালনা করার সম্পূর্ণ অ্যাক্সেস পাবেন।
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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

          {/* Persistent Store Status Notice Banner across all tabs when not fully approved */}
          {(isStoreDisabledByAdmin || isStorePendingReview) && activeTab !== 'activation_request' && (
            <div className="mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs bg-amber-50 border-amber-300 text-amber-950">
              <div className="flex items-center gap-2.5">
                {isStorePendingReview ? (
                  <Clock className="w-5 h-5 text-amber-700 animate-spin shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div className="text-xs">
                  <span className="font-bold">
                    {isStorePendingReview
                      ? 'অনলাইন স্টোর চালুর আবেদন জমা হয়েছে (পর্যালোচনায় রয়েছে)'
                      : 'অনলাইন স্টোর সুবিধাটি নিষ্ক্রিয় রয়েছে'}
                  </span>
                  <p className="text-slate-700 text-[11px] mt-0.5">
                    {isStorePendingReview
                      ? 'সুপার অ্যাডমিন অনুমোদন দিলে আপনার অনলাইন শপটি পাবলিকলি সক্রিয় হয়ে যাবে।'
                      : 'অনলাইন শপ চালু করতে সুপার অ্যাডমিনের কাছে আবেদন পাঠান।'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('activation_request')}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>রিকোয়েস্ট অপশন দেখুন</span>
              </button>
            </div>
          )}

          {/* TAB: ACTIVATION REQUEST & STATUS */}
          {activeTab === 'activation_request' && (
            <div className="space-y-6">
              {/* Request Status Card */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isStorePendingReview
                          ? 'bg-amber-100 text-amber-700'
                          : isStoreDisabledByAdmin
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isStorePendingReview ? (
                        <Clock className="w-6 h-6 animate-spin" />
                      ) : isStoreDisabledByAdmin ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <ShieldCheck className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          অনলাইন স্টোর অনুমোদন ও রিকোয়েস্ট অপশন
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            isStorePendingReview
                              ? 'bg-amber-200 text-amber-900 animate-pulse'
                              : isStoreDisabledByAdmin
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isStorePendingReview
                            ? '⏳ আবেদন পর্যালোচনায় (Pending)'
                            : isStoreDisabledByAdmin
                            ? '🔒 নিষ্ক্রিয় / অনুমোদন প্রয়োজন'
                            : '✅ অনুমোদিত ও লাইভ (Active)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        সুপার অ্যাডমিনের অনুমোদন সাপেক্ষে আপনার অনলাইন শপ পাবলিকলি চালু বা বন্ধ থাকে।
                      </p>
                    </div>
                  </div>
                </div>

                {isStorePendingReview ? (
                  <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-900 text-sm">
                          আপনার অনলাইন স্টোর চালুর আবেদন সুপার অ্যাডমিনের পর্যালোচনায় রয়েছে
                        </h4>
                        <p className="text-xs text-amber-800">
                          সুপার অ্যাডমিন আপনার স্টোরের তথ্য যাচাই করে অনুমোদন দিলেই ওয়েবসাইটটি ইন্টারনেট ব্যবহারকারীদের জন্য উন্মুক্ত হয়ে যাবে।
                        </p>
                        {formData.adminStoreNote && (
                          <div className="mt-2.5 p-3 rounded-xl bg-white/90 border border-amber-300/80 text-xs text-amber-950 font-medium">
                            <span className="font-bold">আপনার পাঠানো নোট:</span> &ldquo;{formData.adminStoreNote}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-amber-200">
                      <button
                        type="button"
                        disabled={isSubmittingRequest}
                        onClick={handleCancelStoreActivation}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{isSubmittingRequest ? 'বাতিল হচ্ছে...' : 'আবেদন প্রত্যাহার / বাতিল করুন'}</span>
                      </button>
                      {onOpenSubscriptionModal && (
                        <button
                          type="button"
                          onClick={onOpenSubscriptionModal}
                          className="px-4 py-2 rounded-xl bg-[#004D40] hover:bg-[#00382e] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>সাবস্ক্রিপশন প্যাকেজ দেখুন ও পেমেন্ট করুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : isStoreDisabledByAdmin ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                      <h4 className="font-bold text-sm text-rose-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>অনলাইন স্টোর সুবিধাটি বর্তমানে নিষ্ক্রিয় রয়েছে</span>
                      </h4>
                      <p className="text-xs text-rose-800">
                        আপনার অনলাইন স্টোর সুবিধাটি চালু করতে নিচে আপনার প্রয়োজনীয়তা বা বার্তা লিখে সুপার অ্যাডমিনের কাছে আবেদন পাঠান।
                      </p>
                    </div>

                    {/* Submission Form */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <label className="block text-xs font-bold text-slate-800">
                        সুপার অ্যাডমিনের জন্য নোট বা বার্তা লিখুন (ঐচ্ছিক):
                      </label>
                      <textarea
                        rows={3}
                        value={requestNoteInput}
                        onChange={(e) => setRequestNoteInput(e.target.value)}
                        placeholder="যেমন: আমার মুদি / কাপড়ের দোকানের জন্য অনলাইন স্টোর চালু করতে চাই। ডোমেন ও পেমেন্ট চালু করতে হবে।"
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className="text-[11px] text-slate-500">
                          আবেদন পাঠানোর পর সুপার অ্যাডমিন প্যানেলে নোটিফিকেশন পাবেন এবং এটি সক্রিয় করবেন।
                        </p>
                        <button
                          type="button"
                          disabled={isSubmittingRequest}
                          onClick={handleRequestStoreActivation}
                          className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmittingRequest ? 'পাঠানো হচ্ছে...' : 'অনলাইন স্টোর চালুর আবেদন পাঠান'}</span>
                        </button>
                      </div>
                      {requestSuccessMessage && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{requestSuccessMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Active Status View */
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>অভিনন্দন! আপনার অনলাইন স্টোর সুপার অ্যাডমিন অনুমোদিত ও সক্রিয়</span>
                      </div>
                      <p className="text-xs text-emerald-900">
                        আপনার অনলাইন স্টোরটি সফলভাবে লাইভ আছে। যে কেউ যেকোনো স্থান থেকে আপনার দোকানে ভিজিট করে অর্ডার দিতে পারবে।
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5 text-left w-full sm:w-auto">
                        <span className="text-[11px] text-slate-500 font-bold uppercase">ওয়েবসাইট লিংক</span>
                        <div className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                          https://{currentDomainDisplay}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`https://${currentDomainDisplay}`)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenStorefront}
                          className="px-3.5 py-1.5 bg-[#004D40] hover:bg-[#00382e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ভিজিট করুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
                    <Globe className="w-4 h-4" />
                    <span>নিজস্ব ফ্রি সাবডোমেন ও কাস্টম ডোমেন</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {formData.storeSlug || 'shop'}.twinghisabi.site বা আপনার নিজস্ব ডোমেন যুক্ত করার সুবিধা।
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                    <Package className="w-4 h-4" />
                    <span>আনলিমিটেড পণ্য ও ছবি</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    দোকানের সব পণ্য ছবি ও ক্যাটাগরিসহ অনলাইনে প্রদর্শন এবং কাস্টমার অর্ডার গ্রহণ।
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CreditCard className="w-4 h-4" />
                    <span>বিকাশ, নগদ ও ক্যাশ অন ডেলিভারি</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    কাস্টমাররা সরাসরি বিকাশ বা নগদে পে করে TrxID দিয়ে অর্ডার নিশ্চিত করতে পারে।
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-2 text-purple-800 font-bold text-xs">
                    <MessageCircle className="w-4 h-4" />
                    <span>লাইভ চ্যাট ও অর্ডার অ্যালার্ট</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    গ্রাহকদের সাথে ওয়েবসাইটে সরাসরি চ্যাট করুন এবং সাথে সাথে নতুন অর্ডারের নোটিফিকেশন পান।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW & SHARE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Super Admin Approval & Request Banner */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
                  isStorePendingReview
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : isStoreDisabledByAdmin
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isStorePendingReview
                        ? 'bg-amber-200 text-amber-800'
                        : isStoreDisabledByAdmin
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    {isStorePendingReview ? (
                      <Clock className="w-5 h-5 animate-spin" />
                    ) : isStoreDisabledByAdmin ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm">
                      {isStorePendingReview
                        ? 'অনলাইন স্টোর চালুর আবেদন সুপার অ্যাডমিনের পর্যালোচনায় রয়েছে'
                        : isStoreDisabledByAdmin
                        ? 'অনলাইন স্টোর বর্তমানে নিষ্ক্রিয় (অনুমোদন প্রয়োজন)'
                        : 'অনলাইন স্টোর সুপার অ্যাডমিন কর্তৃক অনুমোদিত ও সক্রিয়'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      {isStorePendingReview
                        ? 'সুপার অ্যাডমিন অনুমোদন দিলে আপনার অনলাইন স্টোরটি লাইভ হবে।'
                        : isStoreDisabledByAdmin
                        ? 'অনলাইন স্টোর সক্রিয় করতে রিকোয়েস্ট অপশন থেকে সুপার অ্যাডমিনের কাছে আবেদন পাঠান।'
                        : 'আপনার শপটি সফলভাবে সক্রিয় আছে এবং কাস্টমাররা অনলাইনে অর্ডার দিতে পারবে।'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('activation_request')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>রিকোয়েস্ট অপশন দেখুন</span>
                </button>
              </div>

              {/* Store Status Banner */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                {/* Header row: Status and Live toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      {formData.isEnabled && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${
                          formData.isEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </span>
                    <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                      {formData.isEnabled ? 'অনলাইন স্টোর লাইভ ও সক্রিয়' : 'অনলাইন স্টোর বন্ধ'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {formData.customDomainVerified ? 'কাস্টম ডোমেন' : 'সাব-ডোমেন'}
                    </span>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...formData, isEnabled: !formData.isEnabled };
                        setFormData(updated);
                        onUpdateConfig(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                        formData.isEnabled
                          ? 'bg-[#004D40] text-white shadow-xs'
                          : 'bg-white text-slate-700 shadow-2xs'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          formData.isEnabled ? 'bg-emerald-300' : 'bg-slate-400'
                        }`}
                      />
                      <span>{formData.isEnabled ? 'স্টোর চালু আছে' : 'স্টোর বন্ধ রাখুন'}</span>
                    </button>
                  </div>
                </div>

                {/* Primary Store URL Box (Canonical Wildcard Subdomain) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>আপনার প্রধান স্টোর সাব-ডোমেন (শেয়ার ও প্রচারের ক্যানোনিকাল URL):</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> SSL এনক্রিপ্ট
                    </span>
                  </div>

                  <div className="bg-slate-50 border-2 border-teal-600/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs w-full min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-[#004D40] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                          {formData.customDomainVerified && formData.customDomain ? 'কাস্টম ডোমেন' : 'অফিসিয়াল সাব-ডোমেন'}
                        </div>
                        <div className="font-mono text-xs sm:text-base font-black text-slate-900 break-all select-all">
                          https://{currentDomainDisplay}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`https://${currentDomainDisplay}`)}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'কপি হয়েছে' : 'সাব-ডোমেন কপি'}</span>
                      </button>

                      <a
                        href={`https://${currentDomainDisplay}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ব্রাউজারে ভিজিট</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Secondary Fallback Note (Collapsed / Subdued) */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                    <span className="font-semibold text-slate-600 shrink-0">অভ্যন্তরীণ ব্যাকআপ লিংক:</span>
                    <span className="font-mono text-slate-500 truncate min-w-0 block">
                      {typeof window !== 'undefined' ? `${window.location.origin}/?shop=${formData.storeSlug || 'shop'}` : `https://${currentDomainDisplay}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/?shop=${formData.storeSlug || 'shop'}` : `https://${currentDomainDisplay}`;
                      copyToClipboard(url);
                    }}
                    className="self-end sm:self-auto px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-teal-700 hover:text-teal-900 font-bold shrink-0 cursor-pointer"
                  >
                    কপি
                  </button>
                </div>

                {/* Fast Action Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`https://${currentDomainDisplay}`)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 flex flex-col sm:flex-row items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>লিংক কপি</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareOnWhatsApp}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex flex-col sm:flex-row items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp শেয়ার</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenStorefront}
                    className="p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-2xl text-xs font-bold text-teal-900 flex flex-col sm:flex-row items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-teal-700" />
                    <span>ওয়েবসাইট প্রিভিউ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('domain')}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-900 flex flex-col sm:flex-row items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-indigo-700" />
                    <span>ডোমেন সেটিংস</span>
                  </button>
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
              {/* Free Subdomain Setting */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-black text-sm border border-teal-200 shrink-0">
                      ১
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">ডাইনামিক ওয়াইল্ডকার্ড সাব-ডোমেন (Dynamic Wildcard Subdomain)</h3>
                      <p className="text-xs text-slate-500">
                        আপনার দোকানের নিজস্ব সাব-ডোমেন URL (মূল ডোমেন: <span className="font-mono font-bold text-teal-800">twinghisabi.site</span>)
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ক্যানোনিকাল সক্রিয়
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">আপনার দোকানের পছন্দমতো সাব-ডোমেন স্লাগ দিন (৩-৩০ ক্যারেক্টার):</label>
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-slate-50 px-2.5 sm:px-3 py-2 sm:py-2.5 font-mono text-xs sm:text-sm focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:bg-white shadow-2xs min-w-0 overflow-hidden">
                      <span className="text-slate-400 font-semibold select-none shrink-0 text-xs">https://</span>
                      <input
                        type="text"
                        value={formData.storeSlug}
                        onChange={(e) => {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, storeSlug: clean });
                        }}
                        className="bg-transparent font-bold text-teal-950 focus:outline-none px-1 flex-1 min-w-0 text-xs sm:text-sm"
                        placeholder="your-shop-slug"
                      />
                      <span className="text-teal-800 font-bold select-none shrink-0 text-xs">.twinghisabi.site</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings()}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>সাব-ডোমেন সেভ করুন</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    * শুধুমাত্র ইংরেজি ছোট হাতের অক্ষর (a-z), সংখ্যা (0-9) এবং হাইফেন (-) প্রযোজ্য। যেমন: <span className="font-mono font-bold text-teal-700">tanjinhub</span>, <span className="font-mono font-bold text-teal-700">rahimstore</span>
                  </p>
                </div>

                {/* Subdomain Active Canonical Links Display */}
                <div className="bg-slate-50 border border-teal-600/30 rounded-2xl p-3.5 sm:p-4 space-y-3 text-xs w-full min-w-0 overflow-hidden shadow-2xs">
                  <div className="space-y-2 w-full min-w-0">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Globe className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="text-[11px] sm:text-xs font-bold">পাবলিক ক্যানোনিকাল সাব-ডোমেন URL:</span>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0 shadow-2xs">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <a
                          href={`https://${formData.storeSlug || 'shop'}.twinghisabi.site`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-black text-xs sm:text-sm text-teal-950 hover:text-teal-700 hover:underline break-all block select-all tracking-tight"
                        >
                          https://{formData.storeSlug || 'shop'}.twinghisabi.site
                        </a>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`https://${formData.storeSlug || 'shop'}.twinghisabi.site`)}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>কপি</span>
                        </button>
                        <a
                          href={`https://${formData.storeSlug || 'shop'}.twinghisabi.site`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#004D40] hover:bg-[#00382E] active:scale-95 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ব্রাউজারে খুলুন</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-xl p-3 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>হোস্টনেম ভিত্তিক আইসোলেশন ও রাউটিং সক্রিয়</span>
                    </div>
                    <p className="leading-relaxed">
                      প্রতিটি সাব-ডোমেন রিকোয়েস্টে ব্যাকএন্ড <span className="font-mono text-teal-700 font-bold">Host</span> হেডারের মাধ্যমে ভেন্ডরের তথ্য স্বয়ংক্রিয়ভাবে নির্ধারণ করে এবং ডাটাবেজ লেভেলে অন্য কোনো ভেন্ডরের ডাটা অ্যাক্সেস প্রতিরোধ করে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Connect Custom Domain (Own Domain) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      ২
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        আপনার নিজস্ব ডোমেন যুক্ত করুন (Own Custom Domain)
                      </h3>
                      <p className="text-xs text-slate-500">
                        যেমন: আপনার নিজের কেনা .com, .xyz, .com.bd ডোমেন যুক্ত করে প্রফেশনাল ব্র্যান্ড তৈরি করুন
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

                {domainVerifySuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{domainVerifySuccess}</span>
                  </div>
                )}
                {domainError && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{domainError}</span>
                  </div>
                )}

                {/* DNS Configuration Instructions (Zero Hassle) */}
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

                  <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-2.5 text-[11px] text-indigo-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                      <span>ফ্রি অটোমেটিক SSL সার্টিফিকেট (HTTPS) অন্তর্ভুক্ত:</span>
                    </p>
                    <p className="text-indigo-800/90 leading-relaxed">
                      ডোমেন কানেক্ট হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে বিনামূল্যে SSL সার্টিফিকেট সক্রিয় হয়ে যায়। আপনার ক্রেতারা ব্রাউজারে নিরাপদ তালা আইকন দেখতে পাবেন।
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
                  <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-teal-700" />
                        <span>মাল্টিপল ব্যানার ব্যবস্থাপনা ({Array.isArray(formData.banners) ? formData.banners.length : (formData.bannerUrl ? 1 : 0)}টি ব্যানার সক্রিয়)</span>
                      </div>
                      {bannerUploadNotice && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {bannerUploadNotice}
                        </span>
                      )}
                    </div>

                    {/* List of existing banners */}
                    <div className="space-y-2.5">
                      {((Array.isArray(formData.banners) && formData.banners.length > 0)
                        ? formData.banners
                        : (formData.bannerUrl ? [{ id: 'banner_init', imageUrl: formData.bannerUrl, title: formData.bannerTitle || 'ব্যানার ১', active: true }] : [])
                      ).map((b, idx) => (
                        <div
                          key={b.id || idx}
                          className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-teal-200 shadow-2xs hover:border-teal-400 transition"
                        >
                          <img
                            src={b.imageUrl}
                            alt={`Banner ${idx + 1}`}
                            className="w-20 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {b.title || `ব্যানার #${idx + 1}`}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  b.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {b.active !== false ? 'চলমান' : 'বন্ধ'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {b.tag ? `ট্যাগ: ${b.tag}` : 'হোমস্ক্রিন ক্যারোসেলে প্রদর্শিত'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleBannerActive(b.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                b.active !== false
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {b.active !== false ? 'বন্ধ করুন' : 'চালু করুন'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBanner(b.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition"
                              title="ব্যানার মুছুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Direct File Upload Area for New Banner */}
                    <div className="p-3.5 rounded-xl bg-white border-2 border-dashed border-teal-300 hover:border-teal-500 transition text-center space-y-2">
                      <div className="py-1 text-slate-500 space-y-0.5">
                        <Upload className="w-6 h-6 mx-auto text-teal-600" />
                        <p className="text-xs font-bold text-slate-700">
                          নতুন ব্যানার ছবি আপলোড করুন
                        </p>
                        <p className="text-[10px] text-slate-400">
                          সুপারিশকৃত সাইজ: 1200 x 400 পিক্সেল (JPG, PNG, WebP)
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <label
                          htmlFor="banner-file-picker"
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>গ্যালারি থেকে ছবি নির্বাচন করুন</span>
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

                    {/* Direct URL input to add new banner */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="অথবা ব্যানার ছবির URL পেস্ট করে যুক্ত করুন..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            const val = (e.target as HTMLInputElement).value.trim();
                            handleAddPresetBanner(val, 'নতুন প্রমোশনাল ব্যানার');
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        id="new-banner-url-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-banner-url-input') as HTMLInputElement;
                          if (input && input.value.trim()) {
                            handleAddPresetBanner(input.value.trim(), 'নতুন প্রমোশনাল ব্যানার');
                            input.value = '';
                          }
                        }}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shrink-0"
                      >
                        + ব্যানার যোগ করুন
                      </button>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold text-slate-600">১-ক্লিকে চমৎকার প্রিসেট ব্যানার যুক্ত করুন:</div>
                      <div className="flex flex-wrap gap-1.5">
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
                            onClick={() => handleAddPresetBanner(preset.url, preset.label)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-teal-300 hover:border-teal-500 text-[10px] font-bold text-teal-900 cursor-pointer shadow-2xs hover:bg-teal-50"
                          >
                            + {preset.label}
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
          {activeTab === 'catalog' && (() => {
            const categories = Array.from(
              new Set(
                products
                  .map((p) => p.category?.trim())
                  .filter((c): c is string => Boolean(c))
              )
            );

            const filteredProducts = products.filter((prod) => {
              const isPub = isProductPublished(prod.id);
              const matchSearch =
                !catalogSearch ||
                prod.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                (prod.sku && prod.sku.toLowerCase().includes(catalogSearch.toLowerCase())) ||
                (prod.category && prod.category.toLowerCase().includes(catalogSearch.toLowerCase()));
              const matchCat = catalogCategory === 'all' || prod.category === catalogCategory;
              const matchStatus =
                catalogStatusFilter === 'all' ||
                (catalogStatusFilter === 'published' && isPub) ||
                (catalogStatusFilter === 'hidden' && !isPub);
              return matchSearch && matchCat && matchStatus;
            });

            const handlePublishAll = () => {
              const allIds = products.map((p) => p.id);
              const updated = {
                ...formData,
                publishedProductIds: allIds,
              };
              setFormData(updated);
              onUpdateConfig(updated);
            };

            const handleHideAll = () => {
              const updated = {
                ...formData,
                publishedProductIds: [],
              };
              setFormData(updated);
              onUpdateConfig(updated);
            };

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">অনলাইন ক্যাটালগ ও ক্যাটাগরি ব্যবস্থাপনা</h3>
                    <p className="text-xs text-slate-500">
                      ক্যাটাগরি ভিত্তিক পণ্য ফিল্টার করুন এবং গ্রাহকদের জন্য অনলাইনে প্রকাশ বা বন্ধ করুন।
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handlePublishAll}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      সব সক্রিয় করুন
                    </button>
                    <button
                      type="button"
                      onClick={handleHideAll}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      সব বন্ধ করুন
                    </button>
                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToTab('inventory');
                        }}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>নতুন পণ্য</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="পণ্য, বারকোড বা ক্যাটাগরি দিয়ে খুঁজুন..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCatalogStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          catalogStatusFilter === 'all'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        সব ({products.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogStatusFilter('published')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          catalogStatusFilter === 'published'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        সক্রিয় ({products.filter((p) => isProductPublished(p.id)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogStatusFilter('hidden')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          catalogStatusFilter === 'hidden'
                            ? 'bg-slate-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        বন্ধ ({products.filter((p) => !isProductPublished(p.id)).length})
                      </button>
                    </div>
                  </div>

                  {/* Category Pills */}
                  {categories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">ক্যাটাগরি:</span>
                      <button
                        type="button"
                        onClick={() => setCatalogCategory('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                          catalogCategory === 'all'
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        সব ক্যাটাগরি
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCatalogCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                            catalogCategory === cat
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {cat} ({products.filter((p) => p.category === cat).length})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                    <Package className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 text-sm">কোনো পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-500">
                      অনুসন্ধান ফিল্টার পরিবর্তন করুন বা নতুন পণ্য যুক্ত করুন।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredProducts.map((prod) => {
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
                              {prod.category && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  {prod.category}
                                </span>
                              )}
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
            );
          })()}

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

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50/80 p-1.5 sm:p-2 rounded-xl border border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-teal-700" />
                                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">ডেলিভারি স্ট্যাটাস:</span>
                                <select
                                  value={orderStatusDrafts[ord.id] ?? ord.orderStatus}
                                  onChange={(e) => {
                                    const val = e.target.value as OnlineOrder['orderStatus'];
                                    setOrderStatusDrafts((prev) => ({ ...prev, [ord.id]: val }));
                                  }}
                                  className="text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
                                >
                                  <option value="pending">🟡 নতুন (পেন্ডিং)</option>
                                  <option value="confirmed">🔵 অর্ডার নিশ্চিত</option>
                                  <option value="processing">📦 প্যাকেজিং / প্রসেসিং</option>
                                  <option value="shipped">🚚 কুরিয়ারে হস্তান্তর (Shipped)</option>
                                  <option value="delivered">✅ ডেলিভারি সম্পন্ন (Delivered)</option>
                                  <option value="cancelled">❌ বাতিল (Cancelled)</option>
                                </select>
                              </div>

                              {(orderStatusDrafts[ord.id] ?? ord.orderStatus) === 'shipped' && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <input
                                    type="text"
                                    placeholder="কুরিয়ার (রেডএক্স/পাঠাও)"
                                    value={orderCourierDrafts[ord.id]?.courierName ?? (ord.courierName || '')}
                                    onChange={(e) =>
                                      setOrderCourierDrafts((prev) => ({
                                        ...prev,
                                        [ord.id]: { ...(prev[ord.id] || {}), courierName: e.target.value },
                                      }))
                                    }
                                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 w-32 shadow-2xs"
                                  />
                                  <input
                                    type="text"
                                    placeholder="ট্র্যাকিং কোড"
                                    value={orderCourierDrafts[ord.id]?.courierTrackingCode ?? (ord.courierTrackingCode || '')}
                                    onChange={(e) =>
                                      setOrderCourierDrafts((prev) => ({
                                        ...prev,
                                        [ord.id]: { ...(prev[ord.id] || {}), courierTrackingCode: e.target.value },
                                      }))
                                    }
                                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 w-28 shadow-2xs"
                                  />
                                </div>
                              )}

                              {/* SUBMIT BUTTON */}
                              <button
                                type="button"
                                disabled={updatingOrderId === ord.id}
                                onClick={() => handleSubmitOrderStatus(ord.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 sm:ml-auto ${
                                  (orderStatusDrafts[ord.id] !== undefined && orderStatusDrafts[ord.id] !== ord.orderStatus) ||
                                  (orderCourierDrafts[ord.id]?.courierName !== undefined && orderCourierDrafts[ord.id]?.courierName !== (ord.courierName || '')) ||
                                  (orderCourierDrafts[ord.id]?.courierTrackingCode !== undefined && orderCourierDrafts[ord.id]?.courierTrackingCode !== (ord.courierTrackingCode || ''))
                                    ? 'bg-teal-700 hover:bg-teal-800 text-white ring-2 ring-teal-500/50 animate-pulse'
                                    : 'bg-[#004D40] hover:bg-[#00382E] text-white'
                                }`}
                                title="ডেলিভারি স্ট্যাটাস সেভ করুন এবং কাস্টমার সাইডে রিয়েল-টাইমে আপডেট পাঠান"
                              >
                                {updatingOrderId === ord.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>সাবমিট হচ্ছে...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>সাবমিট করুন</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Real-time sync feedback banner */}
                          {statusUpdateSuccessId === ord.id && (
                            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 font-bold">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>স্ট্যাটাস সফলভাবে সাবমিট হয়েছে এবং কাস্টমার সাইডে রিয়েল-টাইমে আপডেট পাঠানো হয়েছে!</span>
                              </div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">লাইভ সিঙ্কড ✓</span>
                            </div>
                          )}

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
                                      : ord.paymentMethod === 'upay'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : ord.paymentMethod === 'bank'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : 'bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  {ord.paymentMethod === 'bkash' && '🌸 বিকাশ (bKash)'}
                                  {ord.paymentMethod === 'nagad' && '🟠 নগদ (Nagad)'}
                                  {ord.paymentMethod === 'rocket' && '🟣 রকেট (Rocket)'}
                                  {ord.paymentMethod === 'upay' && '🟡 উপায় (Upay)'}
                                  {ord.paymentMethod === 'bank' && '🏛️ ব্যাংক ট্রান্সফার (Bank)'}
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

          {/* TAB 7: COUPONS & DISCOUNTS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">কুপন ও প্রমো কোড ব্যবস্থাপনা</h3>
                    <p className="text-xs text-slate-500">
                      গ্রাহকদের জন্য বিশেষ ছাড়ের কুপন কোড তৈরি করুন যা চেকআউটের সময় স্বয়ংক্রিয়ভাবে ডিসকাউন্ট প্রযোজ্য করবে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Create New Coupon Form */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-700" />
                  <span>নতুন ডিসকাউন্ট কুপন তৈরি করুন</span>
                </h4>

                <form onSubmit={handleAddCouponSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">কুপন কোড *</label>
                      <input
                        type="text"
                        required
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                        placeholder="উদাঃ EID2026, SAVE50"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono font-bold text-slate-900 focus:outline-hidden focus:border-[#00695C]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">ছাড়ের ধরণ *</label>
                      <select
                        value={newCouponType}
                        onChange={(e) => setNewCouponType(e.target.value as 'percentage' | 'fixed')}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-hidden"
                      >
                        <option value="percentage">শতাংশ (%) ডিসকাউন্ট</option>
                        <option value="fixed">নির্দিষ্ট টাকা (৳) ক্যাশ ডিসকাউন্ট</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">
                        {newCouponType === 'percentage' ? 'ছাড়ের পরিমাণ (%) *' : 'ছাড়ের পরিমাণ (৳) *'}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newCouponValue}
                        onChange={(e) => setNewCouponValue(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-hidden focus:border-[#00695C]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">সর্বনিম্ন অর্ডার মূল্য (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={newCouponMinSpend}
                        onChange={(e) => setNewCouponMinSpend(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden"
                      />
                    </div>

                    {newCouponType === 'percentage' && (
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">সর্বোচ্চ ছাড়ের সীমা (৳)</label>
                        <input
                          type="number"
                          min="0"
                          value={newCouponMaxDiscount || ''}
                          onChange={(e) => setNewCouponMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="সীমাহীন হলে খালি রাখুন"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden"
                        />
                      </div>
                    )}

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-bold text-slate-700">বিবরণ / অফার বার্তা</label>
                      <input
                        type="text"
                        value={newCouponDescription}
                        onChange={(e) => setNewCouponDescription(e.target.value)}
                        placeholder="উদাঃ ঈদের বিশেষ ধামাকা অফার! ৫০০ টাকার অর্ডারে ১০% ছাড়।"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#00695C] hover:bg-[#004D40] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>কুপন সেভ করুন</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Coupons List */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  বিদ্যমান কুপনসমূহ ({(formData.coupons || []).length})
                </h4>

                {(formData.coupons || []).length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2 text-slate-500">
                    <Tag className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">এখনও কোনো কুপন তৈরি করা হয়নি। উপরের ফর্ম ব্যবহার করে প্রথম কুপন তৈরি করুন।</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {(formData.coupons || []).map((c) => (
                      <div
                        key={c.code}
                        className={`bg-white rounded-2xl p-4 border transition-all space-y-2.5 ${
                          c.isActive
                            ? 'border-emerald-200 shadow-2xs ring-1 ring-emerald-400/20'
                            : 'border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-[#004D40] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                            {c.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 text-slate-600">
                          <div className="font-bold text-slate-900">
                            ছাড়: {c.discountType === 'percentage' ? `${c.discountValue}% ছাড়` : `৳${formatMoney(c.discountValue)} ফ্ল্যাট ছাড়`}
                            {c.maxDiscount ? ` (সর্বোচ্চ ৳${c.maxDiscount})` : ''}
                          </div>
                          {c.minOrderAmount && <div>সর্বনিম্ন কেনাকাটা: ৳{formatMoney(c.minOrderAmount)}</div>}
                          {c.description && <div className="text-slate-500 italic text-[11px]">{c.description}</div>}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleCoupon(c.code)}
                            className="text-xs font-bold text-teal-800 hover:underline cursor-pointer"
                          >
                            {c.isActive ? 'বন্ধ করুন' : 'সক্রিয় করুন'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="কুপন মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: VENDOR PAYMENT GATEWAYS & METHODS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      ভেন্ডর পেমেন্ট গেটওয়ে ও মেথড কনফিগারেশন
                    </h3>
                    <p className="text-xs text-slate-500">
                      আপনার অনলাইন স্টোরে গ্রাহকদের থেকে সরাসরি টাকা পাওয়ার জন্য নিজস্ব বিকাশ, নগদ, রকেট, উপায়, ব্যাংক হিসাব ও কিউআর কোড যুক্ত করুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  className="px-4 py-2 bg-[#004D40] hover:bg-[#00382e] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>পেমেন্ট সেটিংস সেভ করুন</span>
                </button>
              </div>

              {/* Grid of Payment Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. bKash */}
                <div className={`bg-white rounded-2xl p-5 border transition-all space-y-4 ${formData.acceptBkash ? 'border-pink-300 shadow-xs ring-1 ring-pink-400/20' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 font-black text-xs flex items-center justify-center">
                        bKash
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">বিকাশ (bKash)</h4>
                        <p className="text-[11px] text-slate-500">মোবাইল ফাইন্যান্সিয়াল সার্ভিস</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptBkash}
                        onChange={(e) => setFormData({ ...formData, acceptBkash: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>

                  {formData.acceptBkash && (
                    <div className="space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">বিকাশ অ্যাকাউন্ট টাইপ</label>
                        <select
                          value={formData.bkashType || 'merchant'}
                          onChange={(e) => setFormData({ ...formData, bkashType: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                        >
                          <option value="merchant">মার্চেন্ট অ্যাকাউন্ট (Merchant Payment)</option>
                          <option value="personal">পার্সোনাল অ্যাকাউন্ট (Send Money)</option>
                          <option value="agent">এজেন্ট অ্যাকাউন্ট (Cash Out)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">বিকাশ নম্বর *</label>
                        <input
                          type="tel"
                          value={formData.bkashNumber || ''}
                          onChange={(e) => setFormData({ ...formData, bkashNumber: e.target.value })}
                          placeholder="উদাঃ 017XXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Nagad */}
                <div className={`bg-white rounded-2xl p-5 border transition-all space-y-4 ${formData.acceptNagad ? 'border-orange-300 shadow-xs ring-1 ring-orange-400/20' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center">
                        নগদ
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">নগদ (Nagad)</h4>
                        <p className="text-[11px] text-slate-500">ডাক বিভাগ ডিজিটাল লেনদেন</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptNagad}
                        onChange={(e) => setFormData({ ...formData, acceptNagad: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </div>

                  {formData.acceptNagad && (
                    <div className="space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">নগদ অ্যাকাউন্ট টাইপ</label>
                        <select
                          value={formData.nagadType || 'personal'}
                          onChange={(e) => setFormData({ ...formData, nagadType: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                        >
                          <option value="merchant">মার্চেন্ট অ্যাকাউন্ট (Merchant)</option>
                          <option value="personal">পার্সোনাল অ্যাকাউন্ট (Personal)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">নগদ নম্বর *</label>
                        <input
                          type="tel"
                          value={formData.nagadNumber || ''}
                          onChange={(e) => setFormData({ ...formData, nagadNumber: e.target.value })}
                          placeholder="উদাঃ 018XXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Rocket */}
                <div className={`bg-white rounded-2xl p-5 border transition-all space-y-4 ${formData.acceptRocket ? 'border-purple-300 shadow-xs ring-1 ring-purple-400/20' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                        রকেট
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">রকেট (Rocket DBBL)</h4>
                        <p className="text-[11px] text-slate-500">ডাচ্-বাংলা ব্যাংক মোবাইল ব্যাংকিং</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptRocket}
                        onChange={(e) => setFormData({ ...formData, acceptRocket: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {formData.acceptRocket && (
                    <div className="space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">রকেট ১২ ডিজিটের নম্বর *</label>
                        <input
                          type="tel"
                          value={formData.rocketNumber || ''}
                          onChange={(e) => setFormData({ ...formData, rocketNumber: e.target.value })}
                          placeholder="উদাঃ 019XXXXXXXXX (চেক ডিজিট সহ)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Upay */}
                <div className={`bg-white rounded-2xl p-5 border transition-all space-y-4 ${formData.acceptUpay ? 'border-amber-300 shadow-xs ring-1 ring-amber-400/20' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">
                        upay
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">উপায় (Upay UCB)</h4>
                        <p className="text-[11px] text-slate-500">ইউসিবি ডিজিটাল পেমেন্ট</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptUpay || false}
                        onChange={(e) => setFormData({ ...formData, acceptUpay: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {formData.acceptUpay && (
                    <div className="space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">উপায় নম্বর *</label>
                        <input
                          type="tel"
                          value={formData.upayNumber || ''}
                          onChange={(e) => setFormData({ ...formData, upayNumber: e.target.value })}
                          placeholder="উদাঃ 017XXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Bank Transfer */}
                <div className={`bg-white rounded-2xl p-5 border transition-all space-y-4 md:col-span-2 ${formData.acceptBank ? 'border-blue-300 shadow-xs ring-1 ring-blue-400/20' : 'border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">সরাসরি ব্যাংক ট্রান্সফার (Bank Transfer / Wire)</h4>
                        <p className="text-[11px] text-slate-500">গ্রাহক সরাসরি আপনার ব্যবসায়িক ব্যাংক হিসাবে টাকা পাঠাতে পারবে</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptBank || false}
                        onChange={(e) => setFormData({ ...formData, acceptBank: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.acceptBank && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">ব্যাংকের নাম *</label>
                        <input
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="উদাঃ Islami Bank / DBBL / BRAC Bank"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">অ্যাকাউন্টের নাম (Account Title) *</label>
                        <input
                          type="text"
                          value={formData.bankAccountName || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                          placeholder="উদাঃ আপনার প্রতিষ্ঠানের নাম বা ব্যক্তিগত নাম"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">অ্যাকাউন্ট নম্বর *</label>
                        <input
                          type="text"
                          value={formData.bankAccountNumber || ''}
                          onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                          placeholder="উদাঃ 2050XXXXXXXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">শাখার নাম (Branch)</label>
                        <input
                          type="text"
                          value={formData.bankBranchName || ''}
                          onChange={(e) => setFormData({ ...formData, bankBranchName: e.target.value })}
                          placeholder="উদাঃ মিরপুর ব্রাঞ্চ, ঢাকা"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700">রাউটিং নম্বর (Routing No)</label>
                        <input
                          type="text"
                          value={formData.bankRoutingNumber || ''}
                          onChange={(e) => setFormData({ ...formData, bankRoutingNumber: e.target.value })}
                          placeholder="উদাঃ 125272635"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Cash on Delivery (COD) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">ক্যাশ অন ডেলিভারি (Cash On Delivery)</h4>
                        <p className="text-[11px] text-slate-500">পণ্য হাতে পেয়ে ডেলিভারিম্যানকে টাকা পরিশোধ</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptCOD !== false}
                        onChange={(e) => setFormData({ ...formData, acceptCOD: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00695C]"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-600">
                    এটি সক্রিয় রাখলে গ্রাহক কোনো অগ্রিম টাকা প্রদান ছাড়াই অর্ডার করতে পারবেন। ডেলিভারির সময় কুরিয়ার থেকে টাকা আদায় হবে।
                  </p>
                </div>

                {/* 7. Bangla QR & Vendor QR Code */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">বাংলা কিউআর কোড (Bangla QR / Merchant QR)</h4>
                        <p className="text-[11px] text-slate-500">বিকাশ, নগদ, সেলফিন বা যেকোনো ব্যাংকিং অ্যাপ থেকে সরাসরি স্ক্যান করে পেমেন্ট</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptBanglaQr !== false}
                        onChange={(e) => setFormData({ ...formData, acceptBanglaQr: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-start gap-4">
                    {formData.vendorPaymentQrUrl ? (
                      <div className="relative group">
                        <img
                          src={formData.vendorPaymentQrUrl}
                          alt="Vendor Payment QR"
                          className="w-24 h-24 object-contain rounded-xl border border-emerald-300 bg-white p-1 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, vendorPaymentQrUrl: undefined })}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-rose-700 cursor-pointer"
                          title="কিউআর কোড মুছে ফেলুন"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1">
                        <QrCode className="w-8 h-8" />
                        <span className="text-[10px]">QR নেই</span>
                      </div>
                    )}

                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>কিউআর কোডের ছবি আপলোড</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handlePaymentQrFileUpload(e.target.files[0]);
                            }}
                            className="hidden"
                          />
                        </label>
                        {formData.vendorPaymentQrUrl && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                            ✓ কিউআর কোড সক্রিয় (কাস্টমার দেখতে পাবে)
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          বাংলা কিউআর সংশ্লিষ্ট নম্বর বা মার্চেন্ট আইডি (ঐচ্ছিক):
                        </label>
                        <input
                          type="text"
                          value={formData.banglaQrNumber || ''}
                          onChange={(e) => setFormData({ ...formData, banglaQrNumber: e.target.value })}
                          placeholder="উদাঃ 017XXXXXXXX বা মার্চেন্ট আইডি"
                          className="w-full sm:w-72 p-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        বিকাশ, নগদ, সেলফিন বা যেকোনো মার্চেন্ট বাংলা কিউআর (Bangla QR) এর ছবি আপলোড করুন। কাস্টমার চেকআউট করার সময় কিউআর কোডটি বড় করে স্ক্যান করে সহজে ট্রানজেকশন করতে পারবেন।
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Universal Payment Instructions */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-teal-700" />
                    <span>গ্রাহকদের জন্য সার্বজনীন পেমেন্ট নির্দেশিকা (Payment Instructions)</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={formData.paymentInstructions || ''}
                  onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
                  placeholder="উদাঃ অনুগ্রহ করে বিকাশ বা নগদে 'মার্চেন্ট পেমেন্ট' অপশন ব্যবহার করে টাকা পাঠান এবং ট্রানজেকশন আইডি (TrxID) দিন।"
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <p className="text-[11px] text-slate-500">
                  চেকআউট পেজে মোবাইল ব্যাংকিং বা ব্যাংক ট্রান্সফার সিলেক্ট করলে গ্রাহকরা এই নির্দেশিকা দেখতে পাবে।
                </p>
              </div>

              {/* Bottom Save Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  className="px-6 py-3 bg-[#004D40] hover:bg-[#00382e] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>পেমেন্ট গেটওয়ে সেটিংস সেভ করুন</span>
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};
