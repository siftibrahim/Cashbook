import { playPaymentChime } from '../utils/audio';
import { VendorChatInboxTab } from './vendor/VendorChatInboxTab';
import { VendorMarketplaceHubTab } from './marketplace/VendorMarketplaceHubTab';
import { VendorOrderControlModal } from './storefront/VendorOrderControlModal';
import { getTotalUnreadVendorMessages, CHAT_SYNC_EVENT } from '../utils/storeChatStorage';
import { storeApi } from '../services/apiService';
import { STOREFRONT_BEST_OFFERS, STOREFRONT_RECENT_PRODUCTS } from '../data/storefrontDemoCatalog';

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
  onOpenMarketplace?: () => void;
  onNavigateToTab?: (tab: 'customers' | 'pos' | 'inventory' | 'cashbook') => void;
  onConvertOrderToSale?: (order: OnlineOrder) => void;
  onShowToast?: (msg: string) => void;
  onOpenSubscriptionModal?: () => void;
}

type TabType = 'overview' | 'activation_request' | 'domain' | 'settings' | 'catalog' | 'orders' | 'messages' | 'coupons' | 'payments' | 'marketplace';

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
  onOpenMarketplace,
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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OnlineOrder | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [bannerUploadNotice, setBannerUploadNotice] = useState<string | null>(null);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Online orders filter and step-by-step states
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'pending_verification'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [courierModalOrder, setCourierModalOrder] = useState<OnlineOrder | null>(null);
  const [courierInputName, setCourierInputName] = useState('Steadfast Courier');
  const [courierInputCode, setCourierInputCode] = useState('');
  const [editingStatusOrderId, setEditingStatusOrderId] = useState<string | null>(null);
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
  const [catalogViewMode, setCatalogViewMode] = useState<'my_products' | 'demo_products'>('my_products');

  // All reference demo products displayed on storefront
  const ALL_DEMO_PRODUCTS = useMemo(() => {
    const map = new Map<string, Product>();
    [...STOREFRONT_BEST_OFFERS, ...STOREFRONT_RECENT_PRODUCTS].forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, []);

  const handleDeleteDemoProduct = async (demoId: string, demoName: string) => {
    const currentDeleted = formData.deletedDemoProductIds || [];
    if (currentDeleted.includes(demoId)) return;
    const updatedDeleted = [...currentDeleted, demoId];
    const updated: OnlineStoreConfig = {
      ...formData,
      deletedDemoProductIds: updatedDeleted,
    };
    setFormData(updated);
    onUpdateConfig(updated);
    try {
      await storeApi.saveOnlineConfig(updated);
    } catch (err) {
      console.warn('Failed saving demo product deletion:', err);
    }
    if (onShowToast) onShowToast(`"${demoName}" ওয়েবসাইট থেকে মুছে ফেলা হয়েছে!`);
  };

  const handleToggleIncludeDemoProducts = async (enabled: boolean) => {
    const updated: OnlineStoreConfig = {
      ...formData,
      includeDemoProducts: enabled,
    };
    setFormData(updated);
    onUpdateConfig(updated);
    try {
      await storeApi.saveOnlineConfig(updated);
    } catch (err) {
      console.warn('Failed saving includeDemoProducts:', err);
    }
    if (onShowToast) {
      onShowToast(enabled ? 'সকল ডেমো পণ্য ওয়েবসাইটে প্রদর্শন চালু হয়েছে।' : 'সকল ডেমো পণ্য ওয়েবসাইট থেকে বন্ধ করা হয়েছে।');
    }
  };

  const handleRestoreAllDemoProducts = async () => {
    const updated: OnlineStoreConfig = {
      ...formData,
      deletedDemoProductIds: [],
      includeDemoProducts: true,
    };
    setFormData(updated);
    onUpdateConfig(updated);
    try {
      await storeApi.saveOnlineConfig(updated);
    } catch (err) {
      console.warn('Failed saving restore to server:', err);
    }
    if (onShowToast) onShowToast('সকল ডিফল্ট ডেমো পণ্য সফলভাবে পুনরুদ্ধার করা হয়েছে।');
  };

  const handleDeleteAllDemoProducts = async () => {
    if (!confirm('আপনি কি ওয়েবসাইটের সকল ডিফল্ট নমুনা পণ্য মুছে ফেলতে চান?')) return;
    const allIds = ALL_DEMO_PRODUCTS.map((p) => p.id);
    const updated: OnlineStoreConfig = {
      ...formData,
      deletedDemoProductIds: allIds,
      includeDemoProducts: false,
    };
    setFormData(updated);
    onUpdateConfig(updated);
    try {
      await storeApi.saveOnlineConfig(updated);
    } catch (err) {
      console.warn('Failed saving delete all demo products to server:', err);
    }
    if (onShowToast) onShowToast('সকল ডিফল্ট ডেমো পণ্য ওয়েবসাইট থেকে মুছে ফেলা হয়েছে!');
  };

  // Coupon management form states
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMinSpend, setNewCouponMinSpend] = useState(500);
  const [newCouponMaxDiscount, setNewCouponMaxDiscount] = useState<number | undefined>(200);
  const [newCouponDescription, setNewCouponDescription] = useState('');

  // Personal E-Commerce vs Central Marketplace Source Filter & Control Modal
  const [orderSourceFilter, setOrderSourceFilter] = useState<'all' | 'personal' | 'marketplace'>('all');
  const [paymentTabFilter, setPaymentTabFilter] = useState<'all' | 'pending' | 'cod_due' | 'paid' | 'rejected'>('all');
  const [vendorControlModalOrder, setVendorControlModalOrder] = useState<{
    order: OnlineOrder;
    initialTab: 'details' | 'payment' | 'delivery' | 'edit' | 'print';
  } | null>(null);

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
      if (onShowToast) onShowToast(`⚠️ রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
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
      if (onShowToast) onShowToast(`⚠️ বাতিল করতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
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
      if (onShowToast) onShowToast('⚠️ এই কোডের কুপন ইতোমধ্যে বিদ্যমান আছে!');
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
    storeApi.saveOnlineConfig(updated).catch(() => {});
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
    const syncUnread = async () => {
      try {
        const serverThreads = await storeApi.getChatThreads();
        if (serverThreads && serverThreads.length > 0) {
          const totalUnread = serverThreads.reduce((sum, t) => sum + (t.unreadByVendor || 0), 0);
          setUnreadMessageCount(totalUnread);
          return;
        }
      } catch {}
      setUnreadMessageCount(getTotalUnreadVendorMessages());
    };

    syncUnread();
    const interval = setInterval(syncUnread, 4000);
    const handleSync = () => {
      syncUnread();
    };
    window.addEventListener(CHAT_SYNC_EVENT, handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener(CHAT_SYNC_EVENT, handleSync);
    };
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
    if (order.orderSource === 'marketplace' || Boolean(order.masterOrderId)) {
      if (onShowToast) {
        onShowToast('🔒 সেন্ট্রাল মার্কেটপ্লেস অর্ডারের পেমেন্ট শুধুমাত্র সুপার এডমিন যাচাই করে পারমিশন দেন।');
      }
      return;
    }
    try {
      setIsProcessingPayment(order.id);
      const now = Date.now();
      const nextOrderStatus = order.orderStatus === 'pending' ? ('confirmed' as const) : order.orderStatus;
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              paymentStatus: 'paid' as const,
              paidAmount: o.totalAmount,
              dueAmount: 0,
              paymentReviewedAt: now,
              orderStatus: nextOrderStatus,
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
            co.id === order.id || co.orderNumber === order.orderNumber
              ? {
                  ...co,
                  paymentStatus: 'paid' as const,
                  paidAmount: co.totalAmount,
                  dueAmount: 0,
                  paymentReviewedAt: now,
                  orderStatus: nextOrderStatus,
                  updatedAt: now,
                }
              : co
          );
          localStorage.setItem('ibrahim_khata_online_customer_orders_v1', JSON.stringify(updatedCustOrders));
        }
      } catch (err) {
        console.warn('Customer storage sync:', err);
      }

      // 2. Dispatch global event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('twing_order_updated', {
            detail: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentStatus: 'paid',
              orderStatus: nextOrderStatus,
              updatedAt: now,
            },
          })
        );
      }

      // 3. Persist to server database safely
      try {
        const serverOrd = await storeApi.updatePaymentStatus(order.id, 'accept');
        if (serverOrd) {
          onUpdateOrders(updatedOrders.map((o) => (o.id === order.id ? { ...o, ...serverOrd } : o)));
        }
      } catch (apiErr) {
        console.warn('API updatePaymentStatus error (optimistic update preserved):', apiErr);
      }

      if (onShowToast) {
        onShowToast(`✅ অর্ডার #${order.orderNumber} এর পেমেন্ট একসেপ্ট ও ভেরিফাই সম্পন্ন হয়েছে!`);
      }
    } catch (e: any) {
      console.error(e);
      if (onShowToast) {
        onShowToast(`⚠️ সমস্যা হয়েছে: ${e.message || 'ত্রুটি'}`);
      }
    } finally {
      setIsProcessingPayment(null);
    }
  };

  const handleCollectCodPayment = async (order: OnlineOrder) => {
    if (order.orderSource === 'marketplace' || Boolean(order.masterOrderId)) return;
    try {
      setIsProcessingPayment(order.id);
      const now = Date.now();
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              paymentStatus: 'paid' as const,
              paidAmount: o.totalAmount,
              dueAmount: 0,
              codCollectedAmount: o.totalAmount,
              collectedAt: now,
              updatedAt: now,
            }
          : o
      );
      onUpdateOrders(updatedOrders);

      // 1. Sync to customer storage
      try {
        const rawCustomerOrders = localStorage.getItem('ibrahim_khata_online_customer_orders_v1');
        if (rawCustomerOrders) {
          const custOrders: OnlineOrder[] = JSON.parse(rawCustomerOrders);
          const updatedCustOrders = custOrders.map((co) =>
            co.id === order.id || co.orderNumber === order.orderNumber
              ? {
                  ...co,
                  paymentStatus: 'paid' as const,
                  paidAmount: co.totalAmount,
                  dueAmount: 0,
                  codCollectedAmount: co.totalAmount,
                  collectedAt: now,
                  updatedAt: now,
                }
              : co
          );
          localStorage.setItem('ibrahim_khata_online_customer_orders_v1', JSON.stringify(updatedCustOrders));
        }
      } catch (err) {
        console.warn('Customer storage sync:', err);
      }

      // 2. Dispatch event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('twing_order_updated', {
            detail: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentStatus: 'paid',
              updatedAt: now,
            },
          })
        );
      }

      // 3. Persist to server backend gracefully
      try {
        const serverOrd = await storeApi.updatePaymentStatus(order.id, 'cod_collect');
        if (serverOrd) {
          onUpdateOrders(updatedOrders.map((o) => (o.id === order.id ? { ...o, ...serverOrd } : o)));
        }
      } catch (apiErr) {
        console.warn('API updatePaymentStatus cod_collect error:', apiErr);
      }

      if (onShowToast) {
        onShowToast(`💵 অর্ডার #${order.orderNumber} এর COD আদায় (৳${formatMoney(order.totalAmount)}) সফল হয়েছে!`);
      }
    } catch (e: any) {
      console.error(e);
      if (onShowToast) {
        onShowToast(`⚠️ সমস্যা হয়েছে: ${e.message || 'ত্রুটি'}`);
      }
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
      if (onShowToast) onShowToast('⚠️ অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
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
          setEditingBannerId(newBannerItem.id);
          setBannerUploadNotice('✅ নতুন ব্যানার যুক্ত হয়েছে! নিচে টাইটেল ও পণ্য লিংক দিন।');
          setTimeout(() => setBannerUploadNotice(null), 5000);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateBannerItem = (bannerId: string, updates: Partial<StoreBanner>) => {
    const existing = Array.isArray(formData.banners) ? [...formData.banners] : [];
    const updatedBanners = existing.map((b) =>
      b.id === bannerId ? { ...b, ...updates } : b
    );
    const updated = {
      ...formData,
      banners: updatedBanners,
    };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleRemoveBanner = (bannerId: string) => {
    const existing = Array.isArray(formData.banners) ? [...formData.banners] : [];
    const updatedBanners = existing.filter((b) => b.id !== bannerId);
    const updated = {
      ...formData,
      banners: updatedBanners,
      bannerUrl: updatedBanners[0]?.imageUrl || '',
    };
    if (editingBannerId === bannerId) {
      setEditingBannerId(null);
    }
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
    const cleanTitle = presetLabel.replace(/^[^\w\s\u0980-\u09FF]+/, '').trim() || formData.storeName;
    const newBannerItem: StoreBanner = {
      id: `banner_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      imageUrl: presetUrl,
      title: cleanTitle,
      subtitle: 'সেরা মানের পণ্য ও অবিশ্বাস্য মূল্যছাড়!',
      tag: '🔥 হট অফার',
      buttonText: 'এখনই অর্ডার করুন',
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
    setEditingBannerId(newBannerItem.id);
    setBannerUploadNotice('✅ প্রিসেট ব্যানার যুক্ত হয়েছে! আপনি চাইলে টাইটেল ও পণ্য লিংক পরিবর্তন করতে পারেন।');
    setTimeout(() => setBannerUploadNotice(null), 5000);
  };

  const handleLogoFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (onShowToast) onShowToast('⚠️ অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
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
      if (onShowToast) onShowToast('⚠️ অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)');
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
    if (isSavingSettings) return;

    const finalStoreName = (formData.storeName || '').trim() || (store?.name || '').trim() || 'আমার অনলাইন স্টোর';
    const payload: OnlineStoreConfig = {
      ...formData,
      storeName: finalStoreName,
    };

    setIsSavingSettings(true);

    // 1. Instantly save to local state and localStorage for complete offline & session safety
    try {
      setFormData(payload);
      onUpdateConfig(payload);
    } catch (e) {
      console.warn('Local update note:', e);
    }

    // 2. Persist to API
    try {
      const saved = await storeApi.saveOnlineConfig(payload);
      const mergedConfig = { ...payload, ...saved };
      setFormData(mergedConfig);
      onUpdateConfig(mergedConfig);

      setSaveSuccessNotice(true);
      try { playPaymentChime(); } catch {}

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(50); } catch {}
      }

      if (onShowToast) {
        onShowToast('✅ অনলাইন স্টোর সেটিংস ও ব্যানার সফলভাবে সংরক্ষিত হয়েছে!');
      }

      setTimeout(() => setSaveSuccessNotice(false), 5000);
    } catch (err: any) {
      console.error('Error saving online store settings:', err);
      // Local changes are already saved safely; notify user gracefully
      setSaveSuccessNotice(true);
      if (onShowToast) {
        onShowToast('✅ সেটিংস ডিভাইসে সংরক্ষিত হয়েছে! (ক্লাউড অটো-সিন্ক সক্রিয় থাকবে)');
      }
      setTimeout(() => setSaveSuccessNotice(false), 4000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleVerifyCustomDomain = async () => {
    const domain = customDomainInput.trim().toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) {
      if (onShowToast) {
        onShowToast('⚠️ অনুগ্রহ করে সঠিক ডোমেন নাম লিখুন (যেমন: www.myshopbd.com অথবা mybrand.com)');
      }
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
      if (onShowToast) {
        onShowToast('✅ কাস্টম ডোমেন সফলভাবে সংযুক্ত হয়েছে!');
      }
      setTimeout(() => setDomainVerifySuccess(null), 6000);
    } catch (err: any) {
      console.error('Domain verify error:', err);
      const msg = err.message || 'ডোমেন ভেরিফিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে DNS রেকর্ড চেক করুন।';
      setDomainError(msg);
      if (onShowToast) {
        onShowToast(`⚠️ ${msg}`);
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleDisconnectDomain = async () => {
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
      if (onShowToast) {
        onShowToast(`⚠️ ${err.message || 'ডোমেন ডিসকানেক্ট করতে সমস্যা হয়েছে।'}`);
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

  const handleSubmitOrderStatus = async (
    orderId: string,
    forcedStatus?: OnlineOrder['orderStatus'],
    courierData?: { courierName?: string; courierTrackingCode?: string }
  ) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    const newStatus = forcedStatus || orderStatusDrafts[orderId] || ord.orderStatus;
    const courierDraft = courierData || orderCourierDrafts[orderId];
    const courierName = courierDraft?.courierName !== undefined ? courierDraft.courierName : ord.courierName;
    const courierTrackingCode = courierDraft?.courierTrackingCode !== undefined ? courierDraft.courierTrackingCode : ord.courierTrackingCode;

    setUpdatingOrderId(orderId);
    const now = Date.now();
    const isDelivered = newStatus === 'delivered';
    try {
      const updatedOrders = orders.map((o) =>
        o.id === orderId || o.orderNumber === ord.orderNumber || o.orderNumber === orderId
          ? {
              ...o,
              orderStatus: newStatus,
              paymentStatus: isDelivered ? ('paid' as const) : o.paymentStatus,
              paidAmount: isDelivered ? o.totalAmount : o.paidAmount,
              dueAmount: isDelivered ? 0 : o.dueAmount,
              codCollectedAmount: isDelivered ? o.totalAmount : o.codCollectedAmount,
              collectedAt: isDelivered ? now : o.collectedAt,
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

      // 3. Persist to server database safely
      try {
        const serverRes = await storeApi.updateOrderStatus(orderId, newStatus, {
          courierName: courierName || undefined,
          courierTrackingCode: courierTrackingCode || undefined,
        });

        if (serverRes) {
          const finalOrders = updatedOrders.map((o) =>
            o.id === orderId || o.orderNumber === ord.orderNumber || o.orderNumber === orderId ? { ...o, ...serverRes } : o
          );
          onUpdateOrders(finalOrders);
        }
      } catch (serverErr: any) {
        console.warn('Server status update warning:', serverErr);
        if (serverErr?.data?.needsSmsRecharge || serverErr?.message?.includes('ব্যালেন্স') || serverErr?.message?.includes('sms')) {
          // Revert local optimistic update
          onUpdateOrders(orders);
          if (onShowToast) {
            onShowToast(`⚠️ ${serverErr?.message || 'আপনার অ্যাকাউন্টে কোনো এসএমএস ব্যালেন্স নেই! ট্র্যাকিং আপডেট পাঠাতে মেসেজ রিচার্জ করুন।'}`);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('twing_open_sms_recharge', { detail: { tab: 'packages' } }));
          }
          return;
        }
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
          ? 'কুরিয়ারে পাঠানো হয়েছে'
          : newStatus === 'delivered'
          ? 'ডেলিভারি সম্পন্ন'
          : 'বাতিল';

      if (onShowToast) {
        onShowToast(`✅ অর্ডার #${ord.orderNumber} এর স্ট্যাটাস '${statusBnName}' আপডেট হয়েছে!`);
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
    await handleSubmitOrderStatus(orderId, newStatus);
  };

  const handleGenerateTestOrder = async () => {
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
      paymentMethod: 'bkash',
      paymentStatus: 'pending_verification',
      trxId: `TRX${Date.now().toString().slice(-8).toUpperCase()}`,
      senderPhone: '01712345678',
      orderStatus: 'pending',
      notes: 'অফিস টাইমে ডেলিভারি দিলে ভালো হয়।',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateOrders([testOrder, ...orders]);
    setActiveTab('orders');
    setOrderFilter('new');
    if (onShowToast) {
      onShowToast(`🎉 টেস্ট অর্ডার #${testOrder.orderNumber} যুক্ত হয়েছে!`);
    }

    try {
      await storeApi.placeOrder(testOrder);
    } catch (e) {
      console.warn('Test order backend sync notice:', e);
    }
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

            {onOpenMarketplace && (
              <button
                type="button"
                onClick={onOpenMarketplace}
                className="px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm bg-teal-800 hover:bg-teal-700 text-white border border-teal-600/50"
                title="সেন্ট্রাল মার্কেটপ্লেস মল দেখুন"
              >
                <Store className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">সেন্ট্রাল মল</span>
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

          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'marketplace'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-teal-600" />
            <span>সেন্ট্রাল মার্কেটপ্লেস</span>
            <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black">
              মল
            </span>
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
                    <div className="text-xs font-bold text-amber-900 border-b