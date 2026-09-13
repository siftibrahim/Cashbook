import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder, StoreProfile } from '../../types';
import { formatMoney } from '../../utils/storage';
import { StorefrontHeader } from './StorefrontHeader';
import { StorefrontSearchBar } from './StorefrontSearchBar';
import { StorefrontHeroCarousel } from './StorefrontHeroCarousel';
import { StorefrontProductCard } from './StorefrontProductCard';
import { StorefrontBottomNav, StorefrontTab } from './StorefrontBottomNav';
import { StorefrontCategoryGrid } from './StorefrontCategoryGrid';
import { StorefrontOrderTracker } from './StorefrontOrderTracker';
import { StorefrontInboxTab } from './StorefrontInboxTab';
import { StorefrontMoreTab } from './StorefrontMoreTab';
import { StorefrontSupportDrawer } from './StorefrontSupportDrawer';
import { StorefrontProductDetailModal } from './StorefrontProductDetailModal';
import { storeApi, getStoredUser } from '../../services/apiService';
import { StorefrontParams, parseStorefrontUrl, getStoreUrls } from '../../utils/storefrontRouting';
import {
  X,
  ShoppingCart,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Share2,
  Copy,
  Clock,
  ChevronRight,
  Store,
  BadgePercent,
  Check,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';

interface CustomerStorefrontPageProps {
  initialParams?: StorefrontParams;
  onExitToMerchantDashboard?: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CUSTOMER_ORDERS_STORAGE_KEY = 'twing_customer_orders_history_v1';

export const CustomerStorefrontPage: React.FC<CustomerStorefrontPageProps> = ({
  initialParams,
  onExitToMerchantDashboard,
}) => {
  const params = useMemo(() => initialParams || parseStorefrontUrl(), [initialParams]);

  // Loading & Store Data
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [targetVendorId, setTargetVendorId] = useState<string>('');
  const [config, setConfig] = useState<OnlineStoreConfig>({
    storeSlug: params.shopSlug || 'shop',
    storeName: 'অনলাইন শপ',
    tagline: 'আপনার আস্থার বিশ্বস্ত অনলাইন শপ',
    category: 'general',
    phone: '',
    whatsappPhone: '',
    address: '',
    isEnabled: true,
    themeColor: 'teal',
    announcement: '',
    deliveryInsideDhaka: 60,
    deliveryOutsideDhaka: 120,
    freeDeliveryAbove: 2000,
    minOrderAmount: 0,
    acceptCOD: true,
    acceptBkash: false,
    acceptNagad: false,
    acceptRocket: false,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [storeProfile, setStoreProfile] = useState<Partial<StoreProfile> | null>(null);

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<StorefrontTab>('home');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [showOnlyBestPicks, setShowOnlyBestPicks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [isSupportDrawerOpen, setIsSupportDrawerOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Checkout form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [customerTrxId, setCustomerTrxId] = useState('');
  const [customerSenderPhone, setCustomerSenderPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OnlineOrder | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Local Customer Orders History
  const [customerOrders, setCustomerOrders] = useState<OnlineOrder[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Check if current user logged in this browser is the actual vendor/owner
  const currentLoggedInUser = getStoredUser();
  const isOwner = Boolean(
    currentLoggedInUser &&
      (currentLoggedInUser.userId === targetVendorId ||
        currentLoggedInUser.id === targetVendorId ||
        params.isOwnerPreview)
  );

  // Fetch Public Storefront Data from Server on mount or params change
  useEffect(() => {
    let isMounted = true;
    async function loadPublicData() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const query: { shop?: string; domain?: string; vendorId?: string } = {};
        if (params.shopSlug) query.shop = params.shopSlug;
        if (params.domain) query.domain = params.domain;
        if (params.vendorId) query.vendorId = params.vendorId;

        const res = await storeApi.getPublicStorefront(query);

        if (!isMounted) return;

        if (res && res.config) {
          setConfig(res.config);
          setProducts(res.products || []);
          if (res.store) setStoreProfile(res.store);
          if ((res as any).targetUserId) setTargetVendorId((res as any).targetUserId);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load public storefront:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPublicData();
    return () => {
      isMounted = false;
    };
  }, [params.shopSlug, params.domain, params.vendorId]);

  // Published & Filtered products
  const publishedProducts = useMemo(() => {
    return products.filter((p) => p.isPublishedOnline !== false);
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [publishedProducts]);

  const filteredProducts = useMemo(() => {
    return publishedProducts.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      const matchBestPicks =
        !showOnlyBestPicks ||
        (p.discountPercent && p.discountPercent >= 20) ||
        (p.rating && p.rating >= 4.8);

      return matchCat && matchSearch && matchBestPicks;
    });
  }, [publishedProducts, selectedCategory, searchQuery, showOnlyBestPicks]);

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

  // Delivery charge calculation
  const isFreeDeliveryEligible =
    Boolean(config.freeDeliveryAbove && config.freeDeliveryAbove > 0 && subtotal >= config.freeDeliveryAbove);

  const deliveryCharge = isFreeDeliveryEligible
    ? 0
    : deliveryArea === 'inside_dhaka'
    ? config.deliveryInsideDhaka || 60
    : config.deliveryOutsideDhaka || 120;

  const totalAmount = subtotal + deliveryCharge;

  // Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      alert('অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা পূরণ করুন।');
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
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        unitPrice: c.product.salePrice,
        quantity: c.quantity,
        unit: c.product.unit,
        total: c.product.salePrice * c.quantity,
      })),
      subtotal,
      deliveryCharge,
      totalAmount,
      deliveryArea,
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

    try {
      // Sync order directly to target vendor's database records
      await storeApi.placeOrder(newOrder, targetVendorId || undefined, config.storeSlug);
    } catch (err) {
      console.warn('Place order error (proceeding with local feedback):', err);
    }

    // Save to customer order history in browser
    const updatedOrders = [newOrder, ...customerOrders];
    setCustomerOrders(updatedOrders);
    try {
      localStorage.setItem(CUSTOMER_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    } catch {}

    setCompletedOrder(newOrder);
    setCart([]);
    setIsSubmitting(false);
  };

  const copyStoreLink = () => {
    const urls = getStoreUrls(config.storeSlug, config.customDomain, targetVendorId);
    navigator.clipboard.writeText(urls.primaryShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sendOrderToWhatsApp = (order: OnlineOrder) => {
    const phone = (config.whatsappPhone || config.phone || storeProfile?.phone || '').replace(/[^0-9]/g, '');
    const itemsList = order.items
      .map((it) => `• ${it.productName} (${it.quantity} ${it.unit || 'টি'}) = ৳${it.unitPrice * it.quantity}`)
      .join('\n');

    const msg = `*🛒 নতুন অনলাইন অর্ডার (${order.orderNumber})*
----------------------------
*গ্রাহকের নাম:* ${order.customerName}
*মোবাইল:* ${order.customerPhone}
*ঠিকানা:* ${order.customerAddress}
*ডেলিভারি এরিয়া:* ${order.deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'}
*পেমেন্ট পদ্ধতি:* ${order.paymentMethod.toUpperCase()}

*অর্ডারকৃত পণ্যসমূহ:*
${itemsList}

*পণ্য মূল্য:* ৳${order.subtotal}
*ডেলিভারি ফি:* ৳${order.deliveryCharge}
*সর্বমোট প্রদেয়:* ৳${order.totalAmount}

_ধন্যবাদ! অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।_`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#00695C] flex items-center justify-center shadow-2xl mb-4 animate-bounce">
          <Store className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <h2 className="text-xl font-bold">অনলাইন স্টোর লোড হচ্ছে...</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          পণ্য তালিকা এবং স্টোরের সর্বশেষ তথ্য প্রস্তুত করা হচ্ছে
        </p>
      </div>
    );
  }

  // 2. Not Found State (Multi-tenant isolation protection)
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 shadow-sm">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">এই অনলাইন স্টোরটি পাওয়া যায়নি</h1>
        <p className="text-slate-600 max-w-md mb-6 text-sm leading-relaxed">
          আপনার ব্রাউজারে প্রবেশ করা দোকানটির লিঙ্ক (
          <span className="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
            {params.shopSlug || params.domain || 'shop'}
          </span>
          ) সঠিক নয় অথবা স্টোরটি বর্তমানে সক্রিয় নেই। অনুগ্রহ করে সঠিক লিঙ্ক যাচাই করুন।
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = window.location.origin;
          }}
          className="px-6 py-3 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>প্রধান পাতায় যান</span>
        </button>
      </div>
    );
  }

  // 3. Full Standalone Customer Storefront Application
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start antialiased text-slate-800">
      {/* Discreet Owner Floating Banner (Visible ONLY if the store owner is logged in) */}
      {isOwner && (
        <div className="w-full bg-slate-900 text-slate-200 text-xs py-2 px-4 flex items-center justify-between shadow-md z-50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">মালিক প্রিভিউ মোড:</span>
            <span className="text-slate-400">গ্রাহকরা শুধুমাত্র এই কেনাকাটার ইন্টারফেস দেখতে পান</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyStoreLink}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'কপি হয়েছে' : 'কাস্টমার লিঙ্ক'}</span>
            </button>
            {onExitToMerchantDashboard ? (
              <button
                type="button"
                onClick={onExitToMerchantDashboard}
                className="px-3 py-1 rounded-lg bg-[#00695C] hover:bg-[#004D40] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>হিসাব ড্যাশবোর্ডে ফিরুন</span>
              </button>
            ) : (
              <a
                href={window.location.origin}
                className="px-3 py-1 rounded-lg bg-[#00695C] hover:bg-[#004D40] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>হিসাব ড্যাশবোর্ড</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Container - Responsive Max-W-3XL Mobile-Centric Experience */}
      <div className="w-full max-w-2xl bg-white min-h-screen flex flex-col shadow-2xl relative">
        {/* Storefront Header */}
        <StorefrontHeader
          storeName={config.storeName}
          logoUrl={config.logoUrl}
          cartCount={cartItemCount}
          onOpenCart={() => {
            setIsCartOpen(true);
            setIsCheckoutStep(false);
          }}
          onOpenSupport={() => setIsSupportDrawerOpen(true)}
        />

        {/* Storefront Main Body */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col pb-24">
          {/* TAB 1: HOME TAB */}
          {activeTab === 'home' && (
            <div className="flex flex-col space-y-2">
              {/* Search Bar with clear */}
              <StorefrontSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="পণ্য বা আইটেম খুঁজুন..."
              />

              {/* Hero Banner Carousel */}
              <StorefrontHeroCarousel
                config={config}
                onExploreClick={() => {
                  setSelectedCategory('all');
                  setShowOnlyBestPicks(false);
                }}
              />

              {/* Quick Categories Bar */}
              {categories.length > 0 && (
                <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-[#00695C] text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    সকল পণ্য ({publishedProducts.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#00695C] text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Products Section Header */}
              <div className="px-4 pt-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedCategory === 'all' ? 'পণ্য সম্ভার' : selectedCategory}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                      {filteredProducts.length} টি
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    অর্ডার করতে পছন্দের পণ্যে ক্লিক করুন বা কার্টে যোগ করুন
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOnlyBestPicks((prev) => !prev)}
                  className={`text-xs px-3 py-1 rounded-full font-bold transition flex items-center gap-1 cursor-pointer border ${
                    showOnlyBestPicks
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>অফার পণ্য</span>
                </button>
              </div>

              {/* Product Grid */}
              <div className="px-4 py-2">
                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-6">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-1">
                      অন্য কোনো শব্দ দিয়ে খুঁজুন অথবা অন্য ক্যাটাগরি বাছাই করুন
                    </p>
                    {(searchQuery || selectedCategory !== 'all' || showOnlyBestPicks) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setShowOnlyBestPicks(false);
                        }}
                        className="mt-3 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        ফিল্টার মুছুন
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map((p) => {
                      const inCart = cart.find((it) => it.product.id === p.id);
                      return (
                        <StorefrontProductCard
                          key={p.id}
                          product={p}
                          inCartQuantity={inCart ? inCart.quantity : 0}
                          onAddToCart={() => addToCart(p, 1)}
                          onUpdateQuantity={(productId, delta) => updateQuantity(productId, delta)}
                          onViewProduct={(prod) => setSelectedProductForDetail(prod)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Store Guarantees / Trust Badges */}
              <div className="px-4 py-4 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-600">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center gap-1.5 shadow-sm">
                  <Truck className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-slate-800">দ্রুত ডেলিভারি</span>
                  <span className="text-slate-400">{config.estimatedDeliveryDays || '২-৩ দিন'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-800">১০০% ক্যাশ অন</span>
                  <span className="text-slate-400">দেখে মূল্য দিন</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center gap-1.5 shadow-sm">
                  <MessageCircle className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-slate-800">সরাসরি সাপোর্ট</span>
                  <span className="text-slate-400">হোয়াটসঅ্যাপ চ্যাট</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <StorefrontCategoryGrid
              categories={categories}
              products={publishedProducts}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('home');
              }}
            />
          )}

          {/* TAB 3: ORDER TRACKER TAB */}
          {activeTab === 'orders' && (
            <StorefrontOrderTracker
              orders={customerOrders}
              whatsappPhone={config.whatsappPhone || config.phone}
            />
          )}

          {/* TAB 4: INBOX / SUPPORT TAB */}
          {activeTab === 'inbox' && (
            <StorefrontInboxTab
              storeName={config.storeName}
              whatsappPhone={config.whatsappPhone || config.phone}
              storePhone={config.phone}
            />
          )}

          {/* TAB 5: MORE / STORE INFO TAB */}
          {activeTab === 'more' && (
            <StorefrontMoreTab
              config={config}
              totalProductsCount={publishedProducts.length}
            />
          )}
        </div>

        {/* Floating Cart Button (when cart has items and drawer is closed) */}
        {cartItemCount > 0 && !isCartOpen && (
          <div className="fixed bottom-20 z-40 w-full max-w-2xl px-4 pointer-events-none">
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              type="button"
              onClick={() => {
                setIsCartOpen(true);
                setIsCheckoutStep(true);
              }}
              className="w-full bg-[#00695C] hover:bg-[#004D40] text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between font-bold pointer-events-auto transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                  {cartItemCount}
                </div>
                <div className="text-left">
                  <div className="text-xs text-teal-100 font-normal">কার্ট সাবটোটাল</div>
                  <div className="text-base font-black">৳ {formatMoney(subtotal)}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm">
                <span>অর্ডার সম্পন্ন করুন</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        )}

        {/* Storefront Bottom Navigation */}
        <StorefrontBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inboxBadge={cartItemCount > 0 ? cartItemCount : undefined}
        />

        {/* Cart & Checkout Drawer */}
        <AnimatePresence>
          {isCartOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden z-10"
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#00695C] flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {isCheckoutStep ? 'চেকআউট ও ডেলিভারি তথ্য' : `শপিং ব্যাগ (${cartItemCount})`}
                      </h3>
                      <p className="text-[10px] text-slate-500">{config.storeName}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Cart Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!isCheckoutStep ? (
                    /* Step 1: Item review */
                    cart.length === 0 ? (
                      <div className="py-16 text-center">
                        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-bold text-sm">আপনার ব্যাগ খালি</p>
                        <p className="text-slate-400 text-xs mt-1">পছন্দের পণ্য কার্টে যুক্ত করুন</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div
                            key={item.product.id}
                            className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3"
                          >
                            <div className="w-16 h-16 rounded-xl bg-slate-200 shrink-0 overflow-hidden border border-slate-200">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">
                                {item.product.name}
                              </h4>
                              <div className="text-[11px] text-slate-500">
                                ৳ {formatMoney(item.product.salePrice)} / {item.product.unit || 'পিস'}
                              </div>
                              <div className="text-xs font-black text-[#00695C] mt-0.5">
                                ৳ {formatMoney(item.product.salePrice * item.quantity)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-slate-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    /* Step 2: Checkout Information Form */
                    <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                      {/* Customer Info */}
                      <div className="space-y-2.5">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-teal-600" />
                          <span>ডেলিভারি ঠিকানা ও যোগাযোগের তথ্য</span>
                        </h4>

                        <div>
                          <label className="block text-slate-600 font-bold mb-1">আপনার নাম *</label>
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="যেমন: মোঃ সাব্বির আহমেদ"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 font-bold mb-1">
                            মোবাইল নম্বর (সচল নম্বর দিন) *
                          </label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="০১XXXXXXXXX"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 font-bold mb-1">
                            সম্পূর্ণ ডেলিভারি ঠিকানা *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="বাসা নং, রোড নং, এলাকা, থানা ও জেলা..."
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 outline-hidden font-medium"
                          />
                        </div>
                      </div>

                      {/* Delivery Area Selection */}
                      <div className="space-y-2">
                        <label className="block text-slate-600 font-bold">ডেলিভারি এরিয়া নির্বাচন করুন</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryArea('inside_dhaka')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                              deliveryArea === 'inside_dhaka'
                                ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="font-bold">ঢাকা সিটির ভেতর</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳ ${config.deliveryInsideDhaka || 60}`}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryArea('outside_dhaka')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                              deliveryArea === 'outside_dhaka'
                                ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="font-bold">ঢাকার বাইরে</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳ ${config.deliveryOutsideDhaka || 120}`}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <label className="block text-slate-600 font-bold">পেমেন্ট মেথড</label>
                        <div className="space-y-1.5">
                          {config.acceptCOD !== false && (
                            <label
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                paymentMethod === 'cod'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="payment"
                                  checked={paymentMethod === 'cod'}
                                  onChange={() => setPaymentMethod('cod')}
                                />
                                <span>ক্যাশ অন ডেলিভারি (পণ্য পেয়ে মূল্য দিন)</span>
                              </div>
                              <CheckCircle2
                                className={`w-4 h-4 ${paymentMethod === 'cod' ? 'text-emerald-600' : 'text-slate-300'}`}
                              />
                            </label>
                          )}

                          {config.acceptBkash && config.bkashNumber && (
                            <label
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                paymentMethod === 'bkash'
                                  ? 'bg-pink-50 border-pink-500 text-pink-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="payment"
                                  checked={paymentMethod === 'bkash'}
                                  onChange={() => setPaymentMethod('bkash')}
                                />
                                <span>বিকাশ পেমেন্ট ({config.bkashNumber})</span>
                              </div>
                              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-mono">
                                bKash
                              </span>
                            </label>
                          )}

                          {config.acceptNagad && config.nagadNumber && (
                            <label
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                paymentMethod === 'nagad'
                                  ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="payment"
                                  checked={paymentMethod === 'nagad'}
                                  onChange={() => setPaymentMethod('nagad')}
                                />
                                <span>নগদ পেমেন্ট ({config.nagadNumber})</span>
                              </div>
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono">
                                Nagad
                              </span>
                            </label>
                          )}
                        </div>

                        {/* If mobile banking selected, ask for TrxID */}
                        {paymentMethod !== 'cod' && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 mt-2">
                            <p className="text-[11px] text-amber-800">
                              নির্দিষ্ট নম্বরে টাকা Send Money / Payment করে TrxID নিচে লিখুন:
                            </p>
                            <input
                              type="text"
                              required
                              value={customerTrxId}
                              onChange={(e) => setCustomerTrxId(e.target.value)}
                              placeholder="TrxID (যেমন: 9K8A12ZX...)"
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                            />
                            <input
                              type="tel"
                              value={customerSenderPhone}
                              onChange={(e) => setCustomerSenderPhone(e.target.value)}
                              placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন..."
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Optional Notes */}
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">
                          বিশেষ নির্দেশ বা নোট (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="যেমন: দ্রুত ডেলিভারি দিলে ভালো হয়..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                    </form>
                  )}
                </div>

                {/* Footer / Price Breakdown */}
                {cart.length > 0 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/90 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>পণ্য মূল্য:</span>
                      <span className="font-bold">৳ {formatMoney(subtotal)}</span>
                    </div>

                    {isCheckoutStep && (
                      <div className="flex justify-between text-slate-600">
                        <span>ডেলিভারি ফি:</span>
                        <span className="font-bold">
                          {deliveryCharge === 0 ? (
                            <span className="text-emerald-600 font-bold">ফ্রি ডেলিভারি</span>
                          ) : (
                            `৳ ${formatMoney(deliveryCharge)}`
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-900 text-sm font-black pt-1 border-t border-slate-200">
                      <span>সর্বমোট প্রদেয়:</span>
                      <span className="text-[#00695C]">
                        ৳ {formatMoney(isCheckoutStep ? totalAmount : subtotal)}
                      </span>
                    </div>

                    {!isCheckoutStep ? (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutStep(true)}
                        className="w-full py-3 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                      >
                        <span>পরবর্তী ধাপে যান</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCheckoutStep(false)}
                          className="px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition cursor-pointer"
                        >
                          ব্যাগে ফিরুন
                        </button>
                        <button
                          type="submit"
                          form="checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>অর্ডার নিশ্চিত হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>অর্ডার নিশ্চিত করুন</span>
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

        {/* Order Completed Success Modal */}
        <AnimatePresence>
          {completedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 text-center shadow-2xl space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    অর্ডার নম্বর:{' '}
                    <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {completedOrder.orderNumber}
                    </span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>গ্রাহক:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>মোবাইল:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>পেমেন্ট:</span>
                    <span className="font-bold uppercase text-slate-800">
                      {completedOrder.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-black text-slate-900">
                    <span>সর্বমোট মূল্য:</span>
                    <span className="text-[#00695C]">৳ {formatMoney(completedOrder.totalAmount)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => sendOrderToWhatsApp(completedOrder)}
                    className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow transition text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>দোকানদারকে হোয়াটসঅ্যাপে মেসেজ দিন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCartOpen(false);
                      setActiveTab('orders');
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs transition"
                  >
                    অর্ডার ট্র্যাকিং দেখুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Product Detail Modal */}
        <StorefrontProductDetailModal
          product={selectedProductForDetail}
          isOpen={Boolean(selectedProductForDetail)}
          onClose={() => setSelectedProductForDetail(null)}
          config={config}
          onAddToCart={(product, qty) => {
            addToCart(product, qty || 1);
            setSelectedProductForDetail(null);
          }}
          onBuyNow={(product, qty) => {
            addToCart(product, qty || 1);
            setSelectedProductForDetail(null);
            setIsCartOpen(true);
            setIsCheckoutStep(true);
          }}
          inCartQuantity={
            selectedProductForDetail
              ? cart.find((i) => i.product.id === selectedProductForDetail.id)?.quantity || 0
              : 0
          }
        />

        {/* Support Chat Drawer */}
        <StorefrontSupportDrawer
          isOpen={isSupportDrawerOpen}
          onClose={() => setIsSupportDrawerOpen(false)}
          config={config}
        />
      </div>
    </div>
  );
};
