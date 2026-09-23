import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder } from '../types';
import { formatMoney } from '../utils/storage';
import { StorefrontHeader } from './storefront/StorefrontHeader';
import { StorefrontHamburgerDrawer } from './storefront/StorefrontHamburgerDrawer';
import { StorefrontNotificationDrawer } from './storefront/StorefrontNotificationDrawer';
import { StorefrontCustomerDrawer } from './storefront/StorefrontCustomerDrawer';
import { StorefrontWishlistTab } from './storefront/StorefrontWishlistTab';
import { StorefrontHeroCarousel } from './storefront/StorefrontHeroCarousel';
import { StorefrontCategoryGrid } from './storefront/StorefrontCategoryGrid';
import { StorefrontProductCard } from './storefront/StorefrontProductCard';
import { StorefrontBottomNav, StorefrontTab } from './storefront/StorefrontBottomNav';
import { StorefrontOrderTracker } from './storefront/StorefrontOrderTracker';
import { StorefrontMoreTab } from './storefront/StorefrontMoreTab';
import { StorefrontSupportDrawer } from './storefront/StorefrontSupportDrawer';
import { StorefrontProductDetailModal } from './storefront/StorefrontProductDetailModal';
import { STOREFRONT_BEST_OFFERS, STOREFRONT_RECENT_PRODUCTS } from '../data/storefrontDemoCatalog';
import { getWishlist, toggleWishlist, removeFromWishlist, WISHLIST_SYNC_EVENT } from '../utils/wishlistStorage';
import { validateAndApplyCoupon, CouponValidationResult } from '../utils/couponStorage';
import { storeApi, publicStoreApi } from '../services/apiService';
import {
  X,
  Truck,
  Package,
  ArrowRight,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
  MessageCircle,
  Tag,
  Check,
  ShoppingBag,
  Trash2,
  QrCode,
  Landmark,
  CreditCard,
  Copy,
  Lock,
  Clock,
  Maximize2,
  ZoomIn,
} from 'lucide-react';

interface OnlineStorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
  products: Product[];
  onPlaceOrder: (order: OnlineOrder) => void;
  isStandalone?: boolean;
  onMerchantLogin?: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const STORE_ORDERS_STORAGE_KEY = 'ibrahim_khata_online_customer_orders_v1';
const STORE_CUSTOMER_INFO_KEY = 'twing_customer_profile_v1';

export const OnlineStorefrontModal: React.FC<OnlineStorefrontModalProps> = ({
  isOpen,
  onClose,
  config,
  products,
  onPlaceOrder,
  isStandalone = false,
  onMerchantLogin,
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<StorefrontTab>('home');

  // Drawers
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);

  // Search & Categories
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlist());

  // Listen to wishlist sync events
  useEffect(() => {
    const handleWishlistChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail.list)) {
        setWishlistIds(e.detail.list);
      } else {
        setWishlistIds(getWishlist());
      }
    };
    window.addEventListener(WISHLIST_SYNC_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_SYNC_EVENT, handleWishlistChange);
  }, []);

  const handleToggleWishlist = (productId: string) => {
    toggleWishlist(productId);
    setWishlistIds(getWishlist());
  };

  const handleRemoveWishlist = (productId: string) => {
    removeFromWishlist(productId);
    setWishlistIds(getWishlist());
  };

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);

  // Saved customer profile info
  const [customerProfile, setCustomerProfile] = useState<{
    name: string;
    phone: string;
    address: string;
  }>(() => {
    try {
      const raw = localStorage.getItem(STORE_CUSTOMER_INFO_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { name: '', phone: '', address: '' };
  });

  // Checkout form fields
  const [customerName, setCustomerName] = useState(customerProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerProfile.phone || '');
  const [customerAddress, setCustomerAddress] = useState(customerProfile.address || '');
  const [customerDistrict, setCustomerDistrict] = useState('ঢাকা');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank'>('cod');
  const [customerTrxId, setCustomerTrxId] = useState('');
  const [customerSenderPhone, setCustomerSenderPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OnlineOrder | null>(null);

  // Stored customer orders
  const [customerOrders, setCustomerOrders] = useState<OnlineOrder[]>(() => {
    try {
      const raw = localStorage.getItem(STORE_ORDERS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const customerOrdersRef = useRef<OnlineOrder[]>(customerOrders);
  useEffect(() => {
    customerOrdersRef.current = customerOrders;
  }, [customerOrders]);

  const isFetchingOrdersRef = useRef<boolean>(false);
  const [enlargedQrUrl, setEnlargedQrUrl] = useState<string | null>(null);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState<boolean>(false);

  // Live order status refresh function
  const refreshCustomerOrders = useCallback(async (isManual: boolean = false) => {
    if (isFetchingOrdersRef.current) return;

    try {
      const currentList: OnlineOrder[] = customerOrdersRef.current && customerOrdersRef.current.length > 0
        ? customerOrdersRef.current
        : (() => {
            try {
              const raw = localStorage.getItem(STORE_ORDERS_STORAGE_KEY);
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })();

      const orderNums = currentList.map((o) => o.orderNumber).filter(Boolean);
      const identifier =
        config.storeSlug ||
        config.customDomain ||
        config.vendorId ||
        (typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '') ||
        'default';

      if (!identifier || (orderNums.length === 0 && !customerPhone)) return;

      isFetchingOrdersRef.current = true;
      if (isManual) {
        setIsRefreshingOrders(true);
      }

      const freshOrders = await publicStoreApi.batchTrackOrders(
        identifier,
        orderNums,
        customerPhone || undefined
      );

      if (freshOrders && freshOrders.length > 0) {
        setCustomerOrders((prev) => {
          let hasDiff = false;
          const map = new Map<string, OnlineOrder>();
          prev.forEach((o) => map.set(o.orderNumber || o.id, o));

          freshOrders.forEach((f) => {
            const key = f.orderNumber || f.id;
            const existing = map.get(key);
            if (!existing) {
              map.set(key, f);
              hasDiff = true;
            } else if (
              existing.orderStatus !== f.orderStatus ||
              existing.paymentStatus !== f.paymentStatus ||
              existing.courierName !== f.courierName ||
              existing.courierTrackingCode !== f.courierTrackingCode ||
              existing.paymentRejectReason !== f.paymentRejectReason ||
              existing.updatedAt !== f.updatedAt
            ) {
              map.set(key, { ...existing, ...f });
              hasDiff = true;
            }
          });

          if (!hasDiff) return prev; // Avoid unnecessary re-rendering and layout flicker

          const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          try {
            localStorage.setItem(STORE_ORDERS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch (e) {
      console.warn('Real-time order sync error:', e);
    } finally {
      isFetchingOrdersRef.current = false;
      if (isManual) {
        setIsRefreshingOrders(false);
      }
    }
  }, [config.storeSlug, config.customDomain, config.vendorId, customerPhone]);

  // Real-time polling & global events listener
  useEffect(() => {
    // Initial silent refresh
    refreshCustomerOrders(false);

    // Calm 15s background polling without flickering
    const interval = setInterval(() => {
      refreshCustomerOrders(false);
    }, 15000);

    const handleOrderEvent = (e: any) => {
      // Immediate local state update if event has order details
      if (e?.detail) {
        const { orderId, orderNumber, orderStatus, courierName, courierTrackingCode, updatedAt } = e.detail;
        setCustomerOrders((prev) => {
          let updatedAny = false;
          const updated = prev.map((ord) => {
            if (ord.id === orderId || ord.orderNumber === orderNumber || ord.orderNumber === orderId) {
              updatedAny = true;
              return {
                ...ord,
                orderStatus: orderStatus || ord.orderStatus,
                courierName: courierName !== undefined ? courierName : ord.courierName,
                courierTrackingCode: courierTrackingCode !== undefined ? courierTrackingCode : ord.courierTrackingCode,
                updatedAt: updatedAt || Date.now(),
              };
            }
            return ord;
          });
          if (!updatedAny) return prev;
          try {
            localStorage.setItem(STORE_ORDERS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      refreshCustomerOrders(false);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key || e.key === STORE_ORDERS_STORAGE_KEY) {
        try {
          const raw = localStorage.getItem(STORE_ORDERS_STORAGE_KEY);
          if (raw) setCustomerOrders(JSON.parse(raw));
        } catch {}
      }
      refreshCustomerOrders(false);
    };

    window.addEventListener('twing_order_updated', handleOrderEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('twing_order_updated', handleOrderEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [refreshCustomerOrders]);

  // Save profile info
  const handleSaveCustomerProfile = (info: { name: string; phone: string; address: string }) => {
    setCustomerProfile(info);
    setCustomerName(info.name);
    setCustomerPhone(info.phone);
    setCustomerAddress(info.address);
    try {
      localStorage.setItem(STORE_CUSTOMER_INFO_KEY, JSON.stringify(info));
    } catch {}
  };

  // Published products from merchant inventory
  const merchantPublishedProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isPublishedOnline === false) return false;
      if (config.publishedProductIds && config.publishedProductIds.length > 0) {
        return config.publishedProductIds.includes(p.id);
      }
      return true;
    });
  }, [products, config.publishedProductIds]);

  // Master product catalog: Blend authentic reference products with merchant inventory
  const allStoreProducts = useMemo(() => {
    const existingIds = new Set(merchantPublishedProducts.map((p) => p.id));
    const deletedDemos = new Set(config.deletedDemoProductIds || []);
    const allowDemos = config.includeDemoProducts !== false;
    const demoItems = allowDemos
      ? [...STOREFRONT_BEST_OFFERS, ...STOREFRONT_RECENT_PRODUCTS].filter(
          (item) => !existingIds.has(item.id) && !deletedDemos.has(item.id)
        )
      : [];
    return [...merchantPublishedProducts, ...demoItems];
  }, [merchantPublishedProducts, config.deletedDemoProductIds, config.includeDemoProducts]);

  // Best offers list (Today's Best Offers)
  const bestOffersProducts = useMemo(() => {
    return allStoreProducts.filter(
      (p) => (p.discountPercent && p.discountPercent > 0) || (p.originalPrice && p.originalPrice > p.salePrice)
    );
  }, [allStoreProducts]);

  // Recent products list
  const recentProducts = useMemo(() => {
    return allStoreProducts.filter((p) => !bestOffersProducts.some((b) => b.id === p.id)).slice(0, 8);
  }, [allStoreProducts, bestOffersProducts]);

  // Search and Category filtered products
  const filteredProducts = useMemo(() => {
    return allStoreProducts.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (selectedCategory && selectedCategory.toLowerCase().includes(p.category?.toLowerCase() || ''));

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [allStoreProducts, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      }
      return [...prev, { product, quantity: quantityToAdd }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  // Coupon handling
  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim();
    if (!code) return;
    const res = validateAndApplyCoupon(code, subtotal, config.coupons || []);
    setCouponResult(res);
  };

  const handleRemoveCoupon = () => {
    setCouponResult(null);
    setCouponInput('');
  };

  const discountAmount = couponResult?.isValid ? couponResult.discountAmount : 0;

  // Delivery charge calculation
  const isFreeDeliveryEligible =
    config.freeDeliveryAbove && config.freeDeliveryAbove > 0 && subtotal >= config.freeDeliveryAbove;

  const deliveryCharge = isFreeDeliveryEligible
    ? 0
    : deliveryArea === 'inside_dhaka'
    ? config.deliveryInsideDhaka || 60
    : config.deliveryOutsideDhaka || 120;

  const totalAmount = Math.max(0, subtotal - discountAmount) + deliveryCharge;

  // Checkout submission
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      alert('অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।');
      return;
    }
    if (cart.length === 0) return;

    if (config.minOrderAmount && subtotal < config.minOrderAmount) {
      alert(`এই স্টোরের সর্বনিম্ন অর্ডার মূল্য ৳ ${formatMoney(config.minOrderAmount)}। অনুগ্রহ করে আরও পণ্য কার্টে যুক্ত করুন।`);
      return;
    }

    if (paymentMethod !== 'cod' && !customerTrxId.trim()) {
      alert('অনুগ্রহ করে মোবাইল ব্যাংকিং পেমেন্টের TrxID (ট্রানজেকশন আইডি) প্রদান করুন যাতে দোকানদার তা যাচাই করতে পারেন।');
      return;
    }

    setIsSubmitting(true);

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    let combinedNotes = orderNotes.trim();
    if (customerDistrict.trim()) {
      combinedNotes = `জেলা: ${customerDistrict.trim()} | ${combinedNotes}`;
    }
    if (customerTrxId.trim()) {
      combinedNotes = `${combinedNotes ? combinedNotes + ' | ' : ''}TrxID: ${customerTrxId.trim()}`;
    }
    if (customerSenderPhone.trim()) {
      combinedNotes = `${combinedNotes ? combinedNotes + ' | ' : ''}Sender: ${customerSenderPhone.trim()}`;
    }

    const newOrder: OnlineOrder = {
      id: `online_ord_${Date.now()}`,
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      district: customerDistrict.trim(),
      deliveryArea,
      deliveryCharge,
      couponCode: couponResult?.isValid ? couponResult.coupon?.code : undefined,
      discountAmount,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        unitPrice: c.product.salePrice,
        quantity: c.quantity,
        unit: c.product.unit || 'পিস',
        total: c.product.salePrice * c.quantity,
      })),
      subtotal,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'pending_verification',
      orderStatus: 'pending',
      trxId: customerTrxId.trim() || undefined,
      senderPhone: customerSenderPhone.trim() || customerPhone.trim(),
      paymentAmount: totalAmount,
      notes: combinedNotes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save profile for future 1-click orders
    handleSaveCustomerProfile({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: customerAddress.trim(),
    });

    // Async sync to server database with strict tenant resolution
    const storeIdentifier = config.customDomainVerified && config.customDomain ? config.customDomain : config.storeSlug;
    if (storeIdentifier) {
      publicStoreApi.placeOrder(storeIdentifier, newOrder).catch((err) => {
        console.warn('Public store order submission error, falling back:', err);
        storeApi.placeOrder(newOrder, undefined, config.storeSlug).catch(() => null);
      });
    } else {
      storeApi.placeOrder(newOrder, undefined, config.storeSlug).catch(() => null);
    }

    setTimeout(() => {
      onPlaceOrder(newOrder);

      // Save to customer order list in localStorage
      const updatedOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedOrders);
      try {
        localStorage.setItem(STORE_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
      } catch {}

      setCompletedOrder(newOrder);
      setCart([]);
      setCouponResult(null);
      setCouponInput('');
      setIsSubmitting(false);
    }, 500);
  };

  const sendOrderToWhatsApp = (order: OnlineOrder) => {
    const phone = (config.whatsappPhone || config.phone || '').replace(/[^0-9]/g, '');
    const itemsList = order.items
      .map((it) => `• ${it.productName} (${it.quantity} ${it.unit || 'টি'}) = ৳${it.unitPrice * it.quantity}`)
      .join('\n');

    const msg = `*🛒 নতুন অনলাইন অর্ডার (${order.orderNumber})*
----------------------------
*গ্রাহকের নাম:* ${order.customerName}
*মোবাইল:* ${order.customerPhone}
*ঠিকানা:* ${order.customerAddress}
*জেলা:* ${order.district || 'ঢাকা'}
*ডেলিভারি এরিয়া:* ${order.deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'}
*পেমেন্ট পদ্ধতি:* ${order.paymentMethod.toUpperCase()}

*অর্ডারকৃত পণ্যসমূহ:*
${itemsList}

*পণ্য মূল্য:* ৳${order.subtotal}
${order.discountAmount ? `*কুপন ছাড়:* -৳${order.discountAmount}\n` : ''}*ডেলিভারি ফি:* ৳${order.deliveryCharge}
*সর্বমোট প্রদেয়:* ৳${order.totalAmount}

_ধন্যবাদ! অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।_`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  if (!isOpen) return null;

  const isStoreDisabled = config.isStoreAllowedByAdmin === false || config.adminStoreStatus === 'disabled';
  const isStorePending = config.adminStoreStatus === 'requested';

  if (isStoreDisabled || isStorePending) {
    return (
      <div
        className={
          isStandalone
            ? 'w-full min-h-screen bg-slate-100 flex items-center justify-center p-4'
            : 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xs flex items-center justify-center p-4'
        }
      >
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner border border-amber-200">
            {isStorePending ? (
              <Clock className="w-8 h-8 animate-spin text-amber-600" />
            ) : (
              <Lock className="w-8 h-8 text-rose-600" />
            )}
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {isStorePending ? 'আবেদন পর্যালোচনায় রয়েছে' : 'অনলাইন স্টোরে প্রবেশাধিকার নেই'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isStorePending
              ? 'এই অনলাইন স্টোরটির চালুর আবেদনটি বর্তমানে সুপার অ্যাডমিনের পর্যালোচনায় রয়েছে। অনুমোদন পাওয়ার পর ওয়েবসাইটটি চালু হবে।'
              : 'ইউজার ড্যাশবোর্ড থেকে অনলাইন স্টোর ব্যবহার করতে হলে প্রথমে সুপার অ্যাডমিনের কাছে ই-কমার্স অপশন ব্যবহারের অনুমতি নিতে হবে।'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isStandalone
          ? 'w-full h-[100dvh] bg-white flex flex-col items-center justify-start overflow-hidden'
          : 'fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-2xs flex flex-col justify-end sm:justify-center items-center'
      }
    >
      {/* Modal / Standalone Container - NO EMPTY GAP OR ADMIN BAR ABOVE HEADER */}
      <div
        className={
          isStandalone
            ? 'relative w-full max-w-5xl h-full bg-white flex flex-col overflow-hidden'
            : 'relative w-full max-w-5xl h-full max-h-[100dvh] sm:max-h-[96vh] sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200/90'
        }
      >
        {/* Storefront Header - Matching Reference Screenshot */}
        <StorefrontHeader
          storeName={config.storeName}
          logoUrl={config.logoUrl}
          cartCount={cartItemCount}
          notificationCount={3}
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
          onLogoClick={() => {
            setActiveTab('home');
            setSelectedCategory('all');
            setSearchQuery('');
          }}
        />

        {/* Storefront Main Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col">
          {/* TAB 1: HOME TAB */}
          {activeTab === 'home' && (
            <div className="flex flex-col pb-16 space-y-2">
              {/* If user searched or selected a single category, show filtered results directly */}
              {searchQuery.trim() || selectedCategory !== 'all' ? (
                <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-3">
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900">
                        {searchQuery.trim()
                          ? `"${searchQuery}" অনুসন্ধানের ফলাফল`
                          : `ক্যাটাগরি: ${selectedCategory}`}
                      </h2>
                      <p className="text-xs text-slate-500">{filteredProducts.length} টি পণ্য পাওয়া গেছে</p>
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

                  {filteredProducts.length === 0 ? (
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
                      {filteredProducts.map((prod) => {
                        const inCart = cart.find((i) => i.product.id === prod.id);
                        return (
                          <StorefrontProductCard
                            key={prod.id}
                            product={prod}
                            inCartQuantity={inCart ? inCart.quantity : 0}
                            onAddToCart={(p) => addToCart(p, 1)}
                            onUpdateQuantity={updateQuantity}
                            onViewProduct={(p) => setSelectedProductForDetail(p)}
                            isWishlisted={wishlistIds.includes(prod.id)}
                            onToggleWishlist={handleToggleWishlist}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Default Standard Homepage matching reference image */
                <>
                  {/* Hero Banner Carousel */}
                  <StorefrontHeroCarousel
                    config={config}
                    products={allStoreProducts}
                    onExploreClick={() => {
                      // Smooth scroll down to best offers
                      const el = document.getElementById('storefront-best-offers-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onSelectProduct={(productId) => {
                      const prod = allStoreProducts.find((p) => p.id === productId);
                      if (prod) {
                        setSelectedProductForDetail(prod);
                      }
                    }}
                  />

                  {/* 24 Categories Grid */}
                  <StorefrontCategoryGrid
                    selectedCategory={selectedCategory}
                    onSelectCategory={(cat) => setSelectedCategory(cat)}
                    products={allStoreProducts}
                    onViewAll={() => setActiveTab('categories')}
                  />

                  {/* Section 1: 🔥 আজকের সেরা অফার (Today's Best Offers) */}
                  <div id="storefront-best-offers-section" className="w-full px-2.5 sm:px-4 py-2">
                    <div className="max-w-7xl mx-auto space-y-2.5">
                      {/* Section Header */}
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

                      {/* Best Offers Products Grid */}
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
                              onViewProduct={(p) => setSelectedProductForDetail(p)}
                              isWishlisted={wishlistIds.includes(prod.id)}
                              onToggleWishlist={handleToggleWishlist}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: ⭐ সাম্প্রতিক পণ্যসমূহ (Recent Products) */}
                  <div className="w-full px-2.5 sm:px-4 py-2">
                    <div className="max-w-7xl mx-auto space-y-2.5">
                      {/* Section Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-600" />
                          </div>
                          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                            সাম্প্রতিক পণ্যসমূহ
                          </h2>
                        </div>
                      </div>

                      {/* Recent Products Grid */}
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
                              onViewProduct={(p) => setSelectedProductForDetail(p)}
                              isWishlisted={wishlistIds.includes(prod.id)}
                              onToggleWishlist={handleToggleWishlist}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="p-3 sm:p-5 max-w-7xl mx-auto w-full space-y-4 pb-16">
              <StorefrontCategoryGrid
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setActiveTab('home');
                }}
                products={allStoreProducts}
              />
            </div>
          )}

          {/* TAB 3: ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="pb-16">
              <StorefrontOrderTracker
                orders={customerOrders}
                whatsappPhone={config.whatsappPhone || config.phone}
                onRefresh={() => refreshCustomerOrders(true)}
                isRefreshing={isRefreshingOrders}
              />
            </div>
          )}

          {/* TAB 4: WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div className="pb-16">
              <StorefrontWishlistTab
                products={allStoreProducts}
                wishlistIds={wishlistIds}
                onRemoveFromWishlist={handleRemoveWishlist}
                onAddToCart={(prod) => addToCart(prod, 1)}
                onViewProduct={(prod) => setSelectedProductForDetail(prod)}
                onExplore={() => setActiveTab('home')}
              />
            </div>
          )}

          {/* TAB 5: MORE TAB */}
          {activeTab === 'more' && (
            <div className="pb-16">
              <StorefrontMoreTab
                config={config}
                totalProductsCount={allStoreProducts.length}
                onMerchantLogin={onMerchantLogin}
              />
            </div>
          )}
        </div>

        {/* Floating Cart Pill Bar when items exist */}
        {cartItemCount > 0 && !isCartOpen && (
          <div className="sticky bottom-14 mx-3 sm:mx-6 z-20 pointer-events-auto pb-1">
            <div className="max-w-5xl mx-auto bg-[#004D40] text-white p-2.5 sm:p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-teal-600/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                  {cartItemCount}
                </div>
                <div>
                  <div className="text-[10px] text-teal-200">মোট কার্ট মূল্য</div>
                  <div className="text-xs sm:text-sm font-black">৳ {formatMoney(subtotal)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(true);
                  setIsCheckoutStep(true);
                }}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <span>অর্ডার করুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation (Fixed 5-Tab Bar) */}
        <StorefrontBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          wishlistCount={wishlistIds.length}
          orderCount={customerOrders.length}
        />

        {/* Hamburger Drawer */}
        <StorefrontHamburgerDrawer
          isOpen={isMenuDrawerOpen}
          onClose={() => setIsMenuDrawerOpen(false)}
          config={config}
          onSelectTab={setActiveTab}
          onOpenSupport={() => setIsSupportDrawerOpen(true)}
          onMerchantLogin={onMerchantLogin}
          wishlistCount={wishlistIds.length}
        />

        {/* Notification Drawer */}
        <StorefrontNotificationDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          coupons={config.coupons}
          onApplyCoupon={(code) => {
            setCouponInput(code);
            handleApplyCoupon(code);
            setIsCartOpen(true);
          }}
        />

        {/* Customer Profile Drawer */}
        <StorefrontCustomerDrawer
          isOpen={isCustomerDrawerOpen}
          onClose={() => setIsCustomerDrawerOpen(false)}
          customerOrders={customerOrders}
          onSelectTab={setActiveTab}
          defaultName={customerProfile.name}
          defaultPhone={customerProfile.phone}
          defaultAddress={customerProfile.address}
          onSaveProfile={handleSaveCustomerProfile}
        />

        {/* Sliding Cart & Checkout Drawer */}
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
                      <p className="text-xs text-slate-400">স্টোরফ্রন্ট থেকে পছন্দের পণ্য যোগ করুন।</p>
                    </div>
                  ) : !isCheckoutStep ? (
                    /* Step 1: Items List & Coupon Code */
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
                              <span className="w-6 text-center text-xs font-bold text-slate-900">
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
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Coupon Code Section */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-600" />
                          <span>ডিসকাউন্ট কুপন কোড</span>
                        </label>

                        {couponResult?.isValid ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-emerald-900">
                                কুপন &apos;{couponResult.coupon?.code}&apos; যুক্ত হয়েছে (-৳{couponResult.discountAmount})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="কুপন কোড দিন (উদাঃ WELCOME10)"
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00695C] uppercase font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon()}
                              className="px-3.5 py-1.5 bg-[#00695C] text-white rounded-xl text-xs font-bold hover:bg-[#004D40] transition cursor-pointer"
                            >
                              প্রয়োগ করুন
                            </button>
                          </div>
                        )}

                        {couponResult && !couponResult.isValid && (
                          <p className="text-[11px] text-rose-600 font-medium">{couponResult.message}</p>
                        )}
                      </div>

                      {/* Summary Box */}
                      <div className="bg-teal-50/70 rounded-2xl border border-teal-200/70 p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্য সাবটোটাল:</span>
                          <span className="font-bold text-slate-900">৳ {formatMoney(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>কুপন ছাড়:</span>
                            <span>-৳ {formatMoney(discountAmount)}</span>
                          </div>
                        )}
                        {isFreeDeliveryEligible && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>ফ্রি ডেলিভারি অফার:</span>
                            <span>ফ্রি (৳০)</span>
                          </div>
                        )}
                        <div className="border-t border-teal-200 pt-2 flex justify-between font-black text-sm text-teal-950">
                          <span>মোট পরিশোধযোগ্য:</span>
                          <span>৳ {formatMoney(Math.max(0, subtotal - discountAmount))}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Checkout Form */
                    <form id="store-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>অর্ডার নিশ্চিত করতে আপনার সঠিক ডেলিভারি ঠিকানা দিন।</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">আপনার নাম *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="উদাঃ মোঃ রাকিব হাসান"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">মোবাইল নম্বর *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="উদাঃ 017XXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">জেলা</label>
                          <input
                            type="text"
                            value={customerDistrict}
                            onChange={(e) => setCustomerDistrict(e.target.value)}
                            placeholder="উদাঃ ঢাকা"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">ডেলিভারি এরিয়া</label>
                          <select
                            value={deliveryArea}
                            onChange={(e) => setDeliveryArea(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-hidden"
                          >
                            <option value="inside_dhaka">ঢাকা সিটির ভেতরে (৳{config.deliveryInsideDhaka || 60})</option>
                            <option value="outside_dhaka">ঢাকার বাইরে (৳{config.deliveryOutsideDhaka || 120})</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">সম্পূর্ণ ডেলিভারি ঠিকানা *</label>
                        <textarea
                          required
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা নং, রোড, এলাকা/থানা"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">পেমেন্ট পদ্ধতি নির্বাচন করুন</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {config.acceptCOD !== false && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('cod')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'cod'
                                  ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>ক্যাশ অন ডেলিভারি</div>
                              <div className="text-[10px] text-slate-500 font-normal">পণ্য পেয়ে মূল্য দিন</div>
                            </button>
                          )}

                          {config.acceptBkash && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('bkash')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'bkash'
                                  ? 'bg-pink-50 border-pink-500 text-pink-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>বিকাশ (bKash)</div>
                              <div className="text-[10px] text-pink-700 font-semibold truncate">
                                {config.bkashNumber || 'বিকাশ'} {config.bkashType ? `(${config.bkashType === 'merchant' ? 'মার্চেন্ট' : 'পার্সোনাল'})` : ''}
                              </div>
                            </button>
                          )}

                          {config.acceptNagad && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('nagad')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'nagad'
                                  ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>নগদ (Nagad)</div>
                              <div className="text-[10px] text-orange-700 font-semibold truncate">
                                {config.nagadNumber || 'নগদ'} {config.nagadType ? `(${config.nagadType === 'merchant' ? 'মার্চেন্ট' : 'পার্সোনাল'})` : ''}
                              </div>
                            </button>
                          )}

                          {config.acceptRocket && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('rocket')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'rocket'
                                  ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>রকেট (Rocket)</div>
                              <div className="text-[10px] text-purple-700 font-semibold truncate">
                                {config.rocketNumber || 'রকেট'}
                              </div>
                            </button>
                          )}

                          {config.acceptUpay && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('upay')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'upay'
                                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>উপায় (Upay)</div>
                              <div className="text-[10px] text-amber-700 font-semibold truncate">
                                {config.upayNumber || 'উপায়'}
                              </div>
                            </button>
                          )}

                          {config.acceptBank && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('bank')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'bank'
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>ব্যাংক ট্রান্সফার</div>
                              <div className="text-[10px] text-blue-700 font-semibold truncate">
                                {config.bankName || 'ব্যাংক'}
                              </div>
                            </button>
                          )}

                          {config.vendorPaymentQrUrl && config.acceptBanglaQr !== false && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('bangla_qr' as any)}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                (paymentMethod as string) === 'bangla_qr'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                                <span>বাংলা কিউআর (Bangla QR)</span>
                              </div>
                              <div className="text-[10px] text-emerald-700 font-semibold truncate">
                                {config.banglaQrNumber ? `মার্চেন্ট: ${config.banglaQrNumber}` : 'যেকোনো অ্যাপে স্ক্যান'}
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Payment Instructions & TrxID Input for Mobile / Bank Banking / Bangla QR */}
                        {paymentMethod !== 'cod' && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs">
                            <div className="font-bold text-slate-800 flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-200">
                              <span className="font-black text-slate-900">
                                {paymentMethod === 'bkash' && `বিকাশ নম্বর: ${config.bkashNumber || 'নম্বর প্রদান করা হয়নি'}`}
                                {paymentMethod === 'nagad' && `নগদ নম্বর: ${config.nagadNumber || 'নম্বর প্রদান করা হয়নি'}`}
                                {paymentMethod === 'rocket' && `রকেট নম্বর: ${config.rocketNumber || 'নম্বর প্রদান করা হয়নি'}`}
                                {paymentMethod === 'upay' && `উপায় নম্বর: ${config.upayNumber || 'নম্বর প্রদান করা হয়নি'}`}
                                {paymentMethod === 'bank' && `ব্যাংক: ${config.bankName || 'ব্যাংক হিসাব'}`}
                                {(paymentMethod as string) === 'bangla_qr' && `বাংলা কিউআর কোড (মার্চেন্ট: ${config.banglaQrNumber || config.storeName})`}
                              </span>

                              {/* Copy Number Button if mobile banking or bangla QR */}
                              {['bkash', 'nagad', 'rocket', 'upay', 'bangla_qr'].includes(paymentMethod as string) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const num =
                                      paymentMethod === 'bkash'
                                        ? config.bkashNumber
                                        : paymentMethod === 'nagad'
                                        ? config.nagadNumber
                                        : paymentMethod === 'rocket'
                                        ? config.rocketNumber
                                        : paymentMethod === 'upay'
                                        ? config.upayNumber
                                        : config.banglaQrNumber;
                                    if (num) {
                                      navigator.clipboard?.writeText(num);
                                      alert(`নম্বর কপি হয়েছে: ${num}`);
                                    }
                                  }}
                                  className="text-[11px] font-bold text-[#00695C] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>কপি করুন</span>
                                </button>
                              )}
                            </div>

                            {/* Bank Details Display */}
                            {paymentMethod === 'bank' && (
                              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                                <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                                  <Landmark className="w-4 h-4 text-blue-700" />
                                  <span>ব্যাংক অ্যাকাউন্টের বিবরণ:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700">
                                  <div><span className="text-slate-500">ব্যাংকের নাম:</span> <strong className="text-slate-900">{config.bankName || '-'}</strong></div>
                                  <div><span className="text-slate-500">হিসাবধারীর নাম:</span> <strong className="text-slate-900">{config.bankAccountName || '-'}</strong></div>
                                  <div><span className="text-slate-500">অ্যাকাউন্ট নম্বর:</span> <strong className="font-mono text-slate-900">{config.bankAccountNumber || '-'}</strong></div>
                                  <div><span className="text-slate-500"> শাখা (Branch):</span> <strong className="text-slate-900">{config.bankBranchName || '-'}</strong></div>
                                  {config.bankRoutingNumber && (
                                    <div><span className="text-slate-500">রাউটিং নম্বর:</span> <strong className="font-mono text-slate-900">{config.bankRoutingNumber}</strong></div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Vendor QR Code / Bangla QR Display */}
                            {config.vendorPaymentQrUrl && (
                              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                                    <QrCode className="w-4 h-4 text-emerald-700" />
                                    <span>বাংলা কিউআর কোড (Bangla QR Code)</span>
                                  </div>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                    সরাসরি স্ক্যান করুন
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div
                                    className="relative group cursor-pointer shrink-0"
                                    onClick={() => setEnlargedQrUrl(config.vendorPaymentQrUrl || null)}
                                    title="বড় করে কিউআর স্ক্যান করুন"
                                  >
                                    <img
                                      src={config.vendorPaymentQrUrl}
                                      alt="Payment QR"
                                      className="w-20 h-20 object-contain rounded-xl border border-emerald-300 bg-white p-1 shadow-2xs group-hover:scale-105 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                                      <Maximize2 className="w-4 h-4" />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 flex-1">
                                    <p className="text-[11px] text-emerald-950 font-medium leading-relaxed">
                                      আপনার বিকাশ, নগদ, রকেট, উপায়, সেলফিন বা যেকোনো ব্যাংকিং অ্যাপ থেকে সরাসরি স্ক্যান করে পেমেন্ট করুন।
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setEnlargedQrUrl(config.vendorPaymentQrUrl || null)}
                                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs cursor-pointer"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>কিউআর কোড বড় করে দেখুন (Enlarge QR)</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Custom Payment Instructions from Vendor */}
                            {config.paymentInstructions && (
                              <div className="bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                                <span className="font-bold">দোকানদারের নির্দেশনা: </span>
                                {config.paymentInstructions}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700">
                                  {paymentMethod === 'bank'
                                    ? 'ট্রানজেকশন আইডি বা ডিপোজিট রেফারেন্স নং *'
                                    : (paymentMethod as string) === 'bangla_qr'
                                    ? 'কিউআর স্ক্যান পেমেন্টের TrxID *'
                                    : 'ট্রানজেকশন আইডি (TrxID) *'}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customerTrxId}
                                  onChange={(e) => setCustomerTrxId(e.target.value)}
                                  placeholder={paymentMethod === 'bank' ? 'উদাঃ DEP-48921 বা স্লিপ নম্বর' : 'উদাঃ 9J7X5K2L9 (TrxID)'}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800 focus:outline-hidden"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700">
                                  {paymentMethod === 'bank'
                                    ? 'যে অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন'
                                    : 'যে নম্বর থেকে টাকা পাঠিয়েছেন'}
                                </label>
                                <input
                                  type="text"
                                  value={customerSenderPhone}
                                  onChange={(e) => setCustomerSenderPhone(e.target.value)}
                                  placeholder={paymentMethod === 'bank' ? 'অ্যাকাউন্ট হোল্ডার বা ব্যাংক নাম' : (customerPhone || '017XXXXXXXX')}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-hidden"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Total Breakdown */}
                      <div className="bg-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্য মূল্য:</span>
                          <span>৳ {formatMoney(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>কুপন ছাড়:</span>
                            <span>-৳ {formatMoney(discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>ডেলিভারি ফি:</span>
                          <span>{deliveryCharge === 0 ? 'ফ্রি (৳০)' : `৳ ${formatMoney(deliveryCharge)}`}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                          <span>সর্বমোট পরিশোধ:</span>
                          <span className="text-teal-900">৳ {formatMoney(totalAmount)}</span>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                {cart.length > 0 && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
                    {!isCheckoutStep ? (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutStep(true)}
                        className="w-full py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <span>এগিয়ে যান (চেকআউট)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCheckoutStep(false)}
                          className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                        >
                          পেছনে
                        </button>
                        <button
                          type="submit"
                          form="store-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <span>অর্ডার প্রসেস হচ্ছে...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>অর্ডার নিশ্চিত করুন (৳{formatMoney(totalAmount)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Order Success Modal */}
        <AnimatePresence>
          {completedOrder && (
            <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">অর্ডার সফলভাবে সম্পন্ন হয়েছে!</h3>
                  <p className="text-xs text-slate-500">
                    অর্ডার ট্র্যাকিং আইডি:{' '}
                    <span className="font-mono font-bold text-teal-800">{completedOrder.orderNumber}</span>
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">গ্রাহকের নাম:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মোবাইল:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মোট বিল:</span>
                    <span className="font-black text-teal-900">৳ {formatMoney(completedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold uppercase text-slate-800">{completedOrder.paymentMethod}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => sendOrderToWhatsApp(completedOrder)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp এ অর্ডার কপি পাঠান</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCartOpen(false);
                      setActiveTab('orders');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    অর্ডার ট্র্যাক করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Enlarged QR Code Modal */}
        <AnimatePresence>
          {enlargedQrUrl && (
            <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 text-center relative"
              >
                <button
                  type="button"
                  onClick={() => setEnlargedQrUrl(null)}
                  className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="pt-2 space-y-1">
                  <h3 className="text-base font-bold text-slate-900">বাংলা কিউআর কোড (Bangla QR)</h3>
                  <p className="text-xs text-slate-500">
                    বিকাশ, নগদ, রকেট, সেলফিন বা ব্যাংক অ্যাপ দিয়ে স্ক্যান করুন
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
                  <img
                    src={enlargedQrUrl}
                    alt="Enlarged Vendor Payment QR"
                    className="w-64 h-64 object-contain mx-auto rounded-xl bg-white p-2 shadow-2xs"
                  />
                </div>

                {config.banglaQrNumber && (
                  <div className="text-xs text-slate-700 font-bold bg-emerald-50 text-emerald-900 py-1.5 px-3 rounded-xl border border-emerald-200 inline-block">
                    মার্চেন্ট আইডি / নম্বর: {config.banglaQrNumber}
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setEnlargedQrUrl(null)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Product Quick View / Detail Modal */}
        <StorefrontProductDetailModal
          isOpen={!!selectedProductForDetail}
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          inCartQuantity={
            selectedProductForDetail
              ? cart.find((i) => i.product.id === selectedProductForDetail.id)?.quantity || 0
              : 0
          }
          onAddToCart={(prod, qty = 1) => addToCart(prod, qty)}
          onBuyNow={(prod, qty) => {
            addToCart(prod, qty);
            setSelectedProductForDetail(null);
            setIsCartOpen(true);
          }}
          config={config}
          isWishlisted={selectedProductForDetail ? wishlistIds.includes(selectedProductForDetail.id) : false}
          onToggleWishlist={handleToggleWishlist}
        />

        {/* Vendor Support Drawer (Live Customer Support & Chat) */}
        <StorefrontSupportDrawer
          isOpen={isSupportDrawerOpen}
          onClose={() => setIsSupportDrawerOpen(false)}
          config={config}
        />
      </div>
    </div>
  );
};
