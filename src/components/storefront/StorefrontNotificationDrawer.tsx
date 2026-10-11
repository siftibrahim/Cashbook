import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder } from '../types';
import { formatMoney, getDevicePhoneVerification, saveDevicePhoneVerification, getSavedCustomerProfile, saveCustomerProfile } from '../utils/storage';
import { marketplaceApi } from '../services/marketplaceService';
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
  ShieldCheck,
  RefreshCw,
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

// Deprecated global storage key kept for one-time purge only to protect customer privacy
const DEPRECATED_LEGACY_ORDERS_KEY = 'ibrahim_khata_online_customer_orders_v1';
const STORE_CUSTOMER_INFO_KEY = 'twing_customer_profile_v1';

export function getStoreOrdersKey(phone?: string): string {
  const digits = (phone || '').replace(/[^\d]/g, '').slice(-10);
  return digits ? `twing_store_orders_${digits}` : 'twing_store_orders_guest';
}

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

  // Tab change handler that smoothly resets home view & scrolls to top
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
      const scrollableBody = document.getElementById('storefront-main-scrollable-body');
      if (scrollableBody) scrollableBody.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setActiveTab(tab);
  }, []);

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

  // Synchronize product detail modal with URL query param (?product=... or ?p=...)
  useEffect(() => {
    if (!products || products.length === 0) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const rawPath = window.location.pathname;
      const pathMatch = rawPath.match(/^\/(?:product|p)\/([^/]+)/);
      const targetId =
        searchParams.get('product') ||
        searchParams.get('p') ||
        searchParams.get('prod') ||
        searchParams.get('item') ||
        (pathMatch ? pathMatch[1] : null);

      if (targetId) {
        const found = products.find(
          (p) =>
            p.id === targetId ||
            p.sku === targetId ||
            p.name.toLowerCase() === decodeURIComponent(targetId).toLowerCase()
        );
        if (found) {
          setSelectedProductForDetail(found);
        }
      }
    } catch (e) {
      console.error('Error auto-opening product from URL:', e);
    }
  }, [products]);

  // Sync URL when product detail opens so the browser address bar reflects the product
  const handleOpenProductDetail = (prod: Product) => {
    setSelectedProductForDetail(prod);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('product', prod.id);
      window.history.replaceState({ ...window.history.state, productId: prod.id }, '', url.toString());
    } catch {}
  };

  // Sync URL when product detail closes
  const handleCloseProductDetail = () => {
    setSelectedProductForDetail(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      url.searchParams.delete('p');
      url.searchParams.delete('prod');
      url.searchParams.delete('item');
      window.history.replaceState({ ...window.history.state, productId: undefined }, '', url.toString());
    } catch {}
  };

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
    const saved = getSavedCustomerProfile();
    return { name: saved.name || '', phone: saved.phone || '', address: saved.address || '' };
  });

  // Checkout form fields
  const [customerName, setCustomerName] = useState(customerProfile.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerProfile.phone || '');
  const [customerAddress, setCustomerAddress] = useState(customerProfile.address || '');
  const [customerDistrict, setCustomerDistrict] = useState('ঢাকা');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank' | 'bangla_qr' | ''>('');
  const [customerTrxId, setCustomerTrxId] = useState('');
  const [customerSenderPhone, setCustomerSenderPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OnlineOrder | null>(null);

  // Phone OTP Verification State (Device-level 1-time verification)
  const standardPhone = useMemo(() => {
    const cleanDigits = customerPhone.replace(/[^\d+]/g, '').trim();
    return cleanDigits.startsWith('+88')
      ? cleanDigits.slice(3)
      : cleanDigits.startsWith('88')
      ? cleanDigits.slice(2)
      : cleanDigits;
  }, [customerPhone]);

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

  const handleSendOtp = async () => {
    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      alert('⚠️ অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }
    setIsSendingOtp(true);
    try {
      const devRecord = getDevicePhoneVerification();
      const res = await marketplaceApi.sendOtp(standardPhone);
      if (res.success) {
        if ((res as any).alreadyVerified) {
          saveDevicePhoneVerification(standardPhone, (res as any).deviceToken || devRecord?.deviceToken);
          setDeviceVerificationVersion((v) => v + 1);
          setOtpSent(false);
          return;
        }
        setOtpSent(true);
        setOtpCountdown(60);
      } else {
        alert('❌ ওটিপি পাঠানো যায়নি: ' + (res.error || 'সমস্যা হয়েছে'));
      }
    } catch (err: any) {
      alert('❌ ওটিপি পাঠাতে সমস্যা হয়েছে: ' + (err.message || 'ত্রুটি'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      alert('⚠️ অনুগ্রহ করে মোবাইলে আসা OTP কোডটি লিখুন');
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
      } else {
        alert('❌ ' + (res.error || 'ভুল ওটিপি কোড!'));
      }
    } catch (err: any) {
      alert('❌ ওটিপি যাচাই ব্যর্থ হয়েছে: ' + (err.message || 'ত্রুটি'));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Stored customer orders strictly scoped to active customer's phone
  const [customerOrders, setCustomerOrders] = useState<OnlineOrder[]>(() => {
    try {
      const initPhone = (customerProfile.phone || '').trim();
      const raw = localStorage.getItem(getStoreOrdersKey(initPhone));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Re-sync customer orders when customer phone changes
  useEffect(() => {
    try {
      const clean = customerPhone.trim();
      if (!clean) {
        setCustomerOrders([]);
        return;
      }
      const raw = localStorage.getItem(getStoreOrdersKey(clean));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomerOrders(parsed);
      } else {
        setCustomerOrders([]);
      }
    } catch {}
  }, [customerPhone]);

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
              const raw = localStorage.getItem(getStoreOrdersKey(customerPhone));
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
              existing.paidAmount !== f.paidAmount ||
              existing.dueAmount !== f.dueAmount ||
              existing.trxId !== f.trxId ||
              existing.courierName !== f.courierName ||
              existing.courierTrackingCode !== f.courierTrackingCode ||
              existing.deliveryManName !== f.deliveryManName ||
              existing.deliveryManPhone !== f.deliveryManPhone ||
              existing.estimatedDeliveryDate !== f.estimatedDeliveryDate ||
              existing.deliveryNote !== f.deliveryNote ||
              existing.vendorNote !== f.vendorNote ||
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
            const key = getStoreOrdersKey(customerPhone);
            localStorage.setItem(key, JSON.stringify(merged));
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

  // Real-time SSE live updates & polling listener
  useEffect(() => {
    // Initial silent refresh
    refreshCustomerOrders(false);

    // Calm 15s background polling fallback
    const interval = setInterval(() => {
      refreshCustomerOrders(false);
    }, 15000);

    let es: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/marketplace/events');

        const onLiveOrderUpdate = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data || '{}');
            const targetId = data.orderId || data.id || data.masterOrderId;
            const targetNum = data.orderNumber || data.masterOrderNumber;
            const nextStatus = data.orderStatus || data.overallStatus || data.status;

            if (targetId || targetNum) {
              setCustomerOrders((prev) => {
                let hasChange = false;
                const next = prev.map((ord) => {
                  const isMatch =
                    ord.id === targetId ||
                    ord.orderNumber === targetNum ||
                    ord.orderNumber === targetId ||
                    ord.id === targetNum;

                  if (isMatch) {
                    hasChange = true;
                    return {
                      ...ord,
                      orderStatus: nextStatus || ord.orderStatus,
                      courierName: data.courierName !== undefined ? data.courierName : ord.courierName,
                      courierTrackingCode: data.courierTrackingCode !== undefined ? data.courierTrackingCode : ord.courierTrackingCode,
                      deliveryManName: data.deliveryManName !== undefined ? data.deliveryManName : ord.deliveryManName,
                      deliveryManPhone: data.deliveryManPhone !== undefined ? data.deliveryManPhone : ord.deliveryManPhone,
                      estimatedDeliveryDate: data.estimatedDeliveryDate !== undefined ? data.estimatedDeliveryDate : ord.estimatedDeliveryDate,
                      deliveryNote: data.deliveryNote !== undefined ? data.deliveryNote : ord.deliveryNote,
                      vendorNote: data.vendorNote !== undefined ? data.vendorNote : ord.vendorNote,
                      updatedAt: data.updatedAt || Date.now(),
                    };
                  }
                  return ord;
                });

                if (hasChange) {
                  try {
                    const key = getStoreOrdersKey(customerPhone);
                    localStorage.setItem(key, JSON.stringify(next));
                    localStorage.removeItem(DEPRECATED_LEGACY_ORDERS_KEY);
                  } catch {}
                  return next;
                }
                return prev;
              });

              // Silent batch refresh to ensure all details match database
              refreshCustomerOrders(false);
            }
          } catch {}
        };

        es.onmessage = onLiveOrderUpdate;
        es.addEventListener('marketplace_order_updated', onLiveOrderUpdate);
        es.addEventListener('order_status_updated', onLiveOrderUpdate);
        es.addEventListener('online_order_updated', onLiveOrderUpdate);
        es.addEventListener('twing_order_updated', onLiveOrderUpdate);

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch {}
    };

    connectSSE();

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
            const key = getStoreOrdersKey(customerPhone);
            localStorage.setItem(key, JSON.stringify(updated));
            localStorage.removeItem(DEPRECATED_LEGACY_ORDERS_KEY);
          } catch {}
          return updated;
        });
      }
      refreshCustomerOrders(false);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      const activeKey = getStoreOrdersKey(customerPhone);
      if (e.key === activeKey) {
        try {
          const raw = localStorage.getItem(activeKey);
          if (raw) setCustomerOrders(JSON.parse(raw));
        } catch {}
      }
      refreshCustomerOrders(false);
    };

    window.addEventListener('twing_order_updated', handleOrderEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimer);
      if (es) {
        es.close();
        es = null;
      }
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
      saveCustomerProfile(info);
      if (info.phone) {
        saveDevicePhoneVerification(info.phone);
      }
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

  // Master product catalog: Strictly merchant published inventory only!
  // ZERO default or demo products are included in the user's e-commerce store.
  const allStoreProducts = useMemo(() => {
    return merchantPublishedProducts;
  }, [merchantPublishedProducts]);

  // Best offers list (Today's Best Offers) - Only products with actual discounts
  const bestOffersProducts = useMemo(() => {
    return allStoreProducts.filter(
      (p) => (p.discountPercent && p.discountPercent > 0) || (p.originalPrice && p.originalPrice > p.salePrice)
    );
  }, [allStoreProducts]);

  // Remaining or regular products
  const recentProducts = useMemo(() => {
    const bestIds = new Set(bestOffersProducts.map((b) => b.id));
    const remainder = allStoreProducts.filter((p) => !bestIds.has(p.id));
    return remainder.length > 0 ? remainder : (bestOffersProducts.length > 0 ? [] : allStoreProducts);
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

    if (!isPhoneVerifiedOnDevice) {
      alert('⚠️ অর্ডার নিশ্চিত করতে আপনার ডিভাইসে মোবাইল নম্বরটি একবার ওটিপি দিয়ে ভেরিফাই করে নিন।');
      if (!otpSent) {
        handleSendOtp();
      }
      return;
    }
    if (cart.length === 0) return;

    if (config.minOrderAmount && subtotal < config.minOrderAmount) {
      alert(`এই স্টোরের সর্বনিম্ন অর্ডার মূল্য ৳ ${formatMoney(config.minOrderAmount)}। অনুগ্রহ করে আরও পণ্য কার্টে যুক্ত করুন।`);
      return;
    }

    if (!paymentMethod) {
      alert('⚠️ অনুগ্রহ করে একটি পেমেন্ট পদ্ধতি (ক্যাশ অন ডেলিভারি, বিকাশ, নগদ ইত্যাদি) নির্বাচন করুন।');
      return;
    }

    if (paymentMethod !== 'cod' && !customerTrxId.trim()) {
      alert('অনুগ্রহ করে মোবাইল ব্যাংকিং/কিউআর পেমেন্টের TrxID (ট্রানজেকশন আইডি) প্রদান করুন যাতে দোকানদার তা যাচাই করতে পারেন।');
      return;
    }

    if (paymentMethod !== 'cod' && !customerSenderPhone.trim()) {
      alert('অনুগ্রহ করে যে নম্বর থেকে পেমেন্ট পাঠিয়েছেন সেই প্রেরক মোবাইল নম্বরটি প্রদান করুন।');
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

      // Save to customer order list in localStorage scoped to this customer
      const updatedOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedOrders);
      try {
        const key = getStoreOrdersKey(newOrder.customerPhone || customerPhone);
        localStorage.setItem(key, JSON.stringify(updatedOrders));
      } catch {}

      setCompletedOrder(newOrder);
      setCart([]);
      setCouponResult(null);
      setCouponInput('');
      setCustomerTrxId('');
      setCustomerSenderPhone('');
      setOrderNotes('');
      setPaymentMethod('');
      setIsCheckoutStep(false);
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
          onLogoClick={() => handleTabChange('home')}
        />

        {/* Storefront Main Scrollable Body */}
        <div id="storefront-main-scrollable-body" className="flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col">
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
                            onViewProduct={(p) => handleOpenProductDetail(p)}
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
                        handleOpenProductDetail(prod);
                      }
                    }}
                  />

                  {allStoreProducts.length === 0 ? (
                    <div className="w-full px-4 py-16 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center mb-3.5 border border-teal-200/80 shadow-2xs">
                        <Package className="w-8 h-8 text-[#004D40]" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">স্টোরে কোনো পণ্য নেই</h3>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 leading-relaxed">
                        এই অনলাইন স্টোরে এখনো কোনো পণ্য যোগ করা হয়নি। খুব শীঘ্রই নতুন পণ্য তালিকাভুক্ত করা হবে।
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 24 Categories Grid */}
                      <StorefrontCategoryGrid
                        selectedCategory={selectedCategory}
                        onSelectCategory={(cat) => setSelectedCategory(cat)}
                        products={allStoreProducts}
                        onViewAll={() => setActiveTab('categories')}
                      />

                      {/* Section 1: 🔥 আজকের সেরা অফার (Today's Best Offers) */}
                      {bestOffersProducts.length > 0 && (
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
                                    onViewProduct={(p) => handleOpenProductDetail(p)}
                                    isWishlisted={wishlistIds.includes(prod.id)}
                                    onToggleWishlist={handleToggleWishlist}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 2: ⭐ আমাদের পণ্যসমূহ (Recent / All Products) */}
                      {recentProducts.length > 0 && (
                        <div className="w-full px-2.5 sm:px-4 py-2">
                          <div className="max-w-7xl mx-auto space-y-2.5">
                            {/* Section Header */}
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
                                    onViewProduct={(p) => handleOpenProductDetail(p)}
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
                storeConfig={config}
                currentCustomerPhone={customerPhone}
                onRefresh={() => refreshCustomerOrders(true)}
                isRefreshing={isRefreshingOrders}
                onOrderUpdatedLocally={(updatedOrd) => {
                  setCustomerOrders((prev) => {
                    const next = prev.map((o) =>
                      o.id === updatedOrd.id || o.orderNumber === updatedOrd.orderNumber
                        ? { ...o, ...updatedOrd }
                        : o
                    );
                    try {
                      const key = getStoreOrdersKey(customerPhone);
                      localStorage.setItem(key, JSON.stringify(next));
                    } catch {}
                    return next;
                  });
                }}
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
                onViewProduct={(prod) => handleOpenProductDetail(prod)}
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

        {/* Bottom Navigation (Fixed 5-Tab Bar) */}
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
          config={config}
          onSelectTab={handleTabChange}
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
          onSelectTab={handleTabChange}
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
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutStep(false);
                    }}
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
                              onC