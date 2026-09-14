import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder } from '../types';
import { formatMoney } from '../utils/storage';
import { StorefrontHeader } from './storefront/StorefrontHeader';
import { StorefrontSearchBar } from './storefront/StorefrontSearchBar';
import { StorefrontHeroCarousel } from './storefront/StorefrontHeroCarousel';
import { StorefrontProductCard } from './storefront/StorefrontProductCard';
import { StorefrontBottomNav, StorefrontTab } from './storefront/StorefrontBottomNav';
import { StorefrontCategoryGrid } from './storefront/StorefrontCategoryGrid';
import { StorefrontOrderTracker } from './storefront/StorefrontOrderTracker';
import { StorefrontInboxTab } from './storefront/StorefrontInboxTab';
import { StorefrontMoreTab } from './storefront/StorefrontMoreTab';
import { StorefrontSupportDrawer } from './storefront/StorefrontSupportDrawer';
import { StorefrontProductDetailModal } from './storefront/StorefrontProductDetailModal';
import { storeApi, publicStoreApi } from '../services/apiService';
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
  Bell,
  User,
  ShoppingBag,
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
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [showOnlyBestPicks, setShowOnlyBestPicks] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Search & Categories
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

  // Stored customer orders
  const [customerOrders, setCustomerOrders] = useState<OnlineOrder[]>(() => {
    try {
      const raw = localStorage.getItem(STORE_ORDERS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Filter published products
  const publishedProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isPublishedOnline === false) return false;
      if (config.publishedProductIds && config.publishedProductIds.length > 0) {
        return config.publishedProductIds.includes(p.id);
      }
      return true;
    });
  }, [products, config.publishedProductIds]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [publishedProducts]);

  // Filtered by search, category & Best Picks
  const filteredProducts = useMemo(() => {
    return publishedProducts.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      const matchBestPicks = !showOnlyBestPicks || (p.discountPercent && p.discountPercent >= 20) || (p.rating && p.rating >= 4.8);

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
    config.freeDeliveryAbove && config.freeDeliveryAbove > 0 && subtotal >= config.freeDeliveryAbove;

  const deliveryCharge = isFreeDeliveryEligible
    ? 0
    : deliveryArea === 'inside_dhaka'
    ? config.deliveryInsideDhaka || 60
    : config.deliveryOutsideDhaka || 120;

  const totalAmount = subtotal + deliveryCharge;

  // Checkout submission
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
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

    // Async sync to server database with strict tenant resolution
    const storeIdentifier = (config.customDomainVerified && config.customDomain) ? config.customDomain : config.storeSlug;
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
      setIsSubmitting(false);
    }, 600);
  };

  const copyStoreLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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

  if (!isOpen) return null;

  return (
    <div
      className={
        isStandalone
          ? 'w-full min-h-screen bg-slate-100 flex flex-col items-center justify-start'
          : 'fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center'
      }
    >
      {/* Modal / Standalone Container */}
      <div
        className={
          isStandalone
            ? 'relative w-full max-w-5xl min-h-screen bg-white shadow-xs flex flex-col border-x border-slate-200/80'
            : 'relative w-full max-w-5xl h-full max-h-[100dvh] sm:max-h-[96vh] sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200/80'
        }
      >
        {isStandalone ? null : (
          /* Admin Store Bar (Top Slim Bar) */
          <div className="bg-slate-900 text-white px-3.5 sm:px-6 py-2 flex items-center justify-between text-xs shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-slate-200">লাইভ ই-কমার্স স্টোরফ্রন্ট প্রিভিউ</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-teal-300 font-mono">
                bikroyhub • Verified Store
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={copyStoreLink}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                title="প্রিভিউ বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Storefront Header (Only Ecommerce Name, Support Chat Menu & Cart Menu) */}
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

        {/* Account Menu Dropdown */}
        <AnimatePresence>
          {isAccountMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 right-4 sm:right-6 z-40 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 text-xs space-y-1"
            >
              <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00695C] text-white flex items-center justify-center font-bold">
                  T
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">গ্রাহক প্রোফাইল</div>
                  <div className="text-[10px] text-slate-400">অনলাইন শপিং সেবা</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setIsAccountMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4 text-teal-700" />
                <span>আমার অর্ডার সমূহ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('inbox');
                  setIsAccountMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>কাস্টমার সাপোর্ট</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('more');
                  setIsAccountMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4 text-slate-500" />
                <span>দোকানের তথ্য ও পলিসি</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Storefront Main Body Container */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col">
          {/* TAB 1: HOME TAB */}
          {activeTab === 'home' && (
            <div className="flex flex-col space-y-2 pb-16">
              {/* Search Bar with Mic Voice Search & Clear */}
              <StorefrontSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder='Search "Medicine, Skincare, Panjabi..."'
              />

              {/* Hero Banner Carousel (Exact match to screenshot: Neon Best Picks Sign or Vendor Custom Banner) */}
              <StorefrontHeroCarousel
                config={config}
                onExploreClick={() => {
                  setShowOnlyBestPicks(true);
                  setSelectedCategory('all');
                }}
              />

              {/* Category Horizontal Chips */}
              <div className="w-full px-3.5 sm:px-6 py-1">
                <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setShowOnlyBestPicks(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs ${
                      selectedCategory === 'all' && !showOnlyBestPicks
                        ? 'bg-[#004D40] text-white shadow-teal-950/20'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    সকল পণ্য ({publishedProducts.length})
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShowOnlyBestPicks(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs ${
                        selectedCategory === cat
                          ? 'bg-[#004D40] text-white shadow-teal-950/20'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Header: "Best Picks" & "see all" (Exact match to screenshot) */}
              <div className="w-full px-3.5 sm:px-6 pt-2 pb-1">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <h2 className="text-[#be185d] text-lg sm:text-xl font-black tracking-tight">
                    {showOnlyBestPicks ? 'Best Picks (স্পেশাল অফার)' : 'Best Picks'}
                  </h2>

                  <button
                    type="button"
                    onClick={() => setShowOnlyBestPicks((prev) => !prev)}
                    className="text-[#be185d] text-xs sm:text-sm font-bold hover:underline cursor-pointer transition active:scale-95"
                  >
                    {showOnlyBestPicks ? 'সকল পণ্য দেখুন' : 'see all'}
                  </button>
                </div>
              </div>

              {/* Product Grid (2 columns on mobile, 3-4 on desktop) */}
              <div className="w-full px-3.5 sm:px-6 pb-8">
                <div className="max-w-5xl mx-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3 my-4 shadow-2xs">
                      <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                        <Package className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        আপনার অনুসন্ধানের সাথে মিল রেখে কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে অন্য নাম দিয়ে খুঁজুন।
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setShowOnlyBestPicks(false);
                        }}
                        className="px-4 py-2 bg-[#004D40] text-white text-xs font-bold rounded-xl"
                      >
                        সকল পণ্য দেখুন
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {filteredProducts.map((product) => {
                        const inCart = cart.find((item) => item.product.id === product.id);
                        return (
                          <StorefrontProductCard
                            key={product.id}
                            product={product}
                            inCartQuantity={inCart ? inCart.quantity : 0}
                            onAddToCart={(prod) => addToCart(prod, 1)}
                            onUpdateQuantity={updateQuantity}
                            onViewProduct={(prod) => setSelectedProductForDetail(prod)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS TRACKER TAB */}
          {activeTab === 'orders' && (
            <StorefrontOrderTracker
              orders={customerOrders}
              whatsappPhone={config.whatsappPhone || config.phone}
            />
          )}

          {/* TAB 3: CATEGORIES EXPLORER TAB */}
          {activeTab === 'categories' && (
            <StorefrontCategoryGrid
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setShowOnlyBestPicks(false);
                setActiveTab('home');
              }}
              products={publishedProducts}
            />
          )}

          {/* TAB 4: INBOX & LIVE SUPPORT TAB */}
          {activeTab === 'inbox' && (
            <StorefrontInboxTab
              storeName={config.storeName || 'bikroyhub'}
              whatsappPhone={config.whatsappPhone}
              storePhone={config.phone}
            />
          )}

          {/* TAB 5: MORE INFO & STORE PROFILE TAB */}
          {activeTab === 'more' && (
            <StorefrontMoreTab
              config={config}
              totalProductsCount={publishedProducts.length}
              onMerchantLogin={onMerchantLogin}
            />
          )}
        </div>

        {/* Floating Cart CTA if items in cart and on home/categories tab */}
        {cartItemCount > 0 && !isCartOpen && (
          <div className="sticky bottom-14 mx-4 sm:mx-6 z-20 pointer-events-auto pb-1">
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
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              >
                <span>চেকআউট করুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar (Fixed 5-Tab Bar matching screenshot: হোম, অর্ডার, ক্যাটাগরি, ইনবক্স, আরও) */}
        <StorefrontBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          inboxBadge={1}
        />

        {/* Notification & Announcement Drawer */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-base text-slate-900">বিজ্ঞপ্তি ও বিশেষ অফার</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>সাপ্তাহিক ধামাকা অফার!</span>
                    </div>
                    <p className="text-amber-800">
                      সেরা মানের স্কিনকেয়ার, মেডিসিন ও পাঞ্জাবিতে আকর্ষণীয় ছাড় চলছে। স্টক শেষ হওয়ার আগেই অর্ডার করুন!
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl space-y-1">
                    <div className="font-bold text-teal-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-teal-600" />
                      <span>১২-২৪ ঘণ্টায় হোম ডেলিভারি</span>
                    </div>
                    <p className="text-teal-800">
                      সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি সুবিধা। নির্দিষ্ট টাকার বেশি অর্ডারে ফ্রি শিপিং সুবিধা!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="w-full py-2.5 bg-[#004D40] text-white font-bold text-xs rounded-xl"
                >
                  বুঝেছি, কেনাকাটা চালিয়ে যান
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                    /* Step 1: Items List */
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
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Summary Box */}
                      <div className="bg-teal-50/70 rounded-2xl border border-teal-200/70 p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্য সাবটোটাল:</span>
                          <span className="font-bold text-slate-900">৳ {formatMoney(subtotal)}</span>
                        </div>
                        {isFreeDeliveryEligible && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>ফ্রি ডেলিভারি অফার:</span>
                            <span>ফ্রি (৳০)</span>
                          </div>
                        )}
                        <div className="border-t border-teal-200 pt-2 flex justify-between font-black text-sm text-teal-950">
                          <span>মোট পরিশোধযোগ্য:</span>
                          <span>৳ {formatMoney(subtotal)}</span>
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
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
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
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">সম্পূর্ণ ডেলিভারি ঠিকানা *</label>
                        <textarea
                          required
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা নং, রোড, এলাকা/থানা, জেলা"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">ডেলিভারি এলাকা নির্বাচন করুন</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryArea('inside_dhaka')}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                              deliveryArea === 'inside_dhaka'
                                ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>ঢাকা সিটির ভেতরে</div>
                            <div className="text-[11px] text-teal-700 font-black mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳${config.deliveryInsideDhaka || 60}`}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryArea('outside_dhaka')}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                              deliveryArea === 'outside_dhaka'
                                ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>ঢাকার বাইরে</div>
                            <div className="text-[11px] text-teal-700 font-black mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳${config.deliveryOutsideDhaka || 120}`}
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">পেমেন্ট পদ্ধতি নির্বাচন করুন</label>
                        <div className="grid grid-cols-2 gap-2">
                          {config.acceptCOD && (
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
                              <div className="flex items-center justify-between">
                                <span>বিকাশ (bKash)</span>
                                {config.bkashType && (
                                  <span className="text-[9px] px-1 py-0.2 bg-pink-200 text-pink-950 rounded">
                                    {config.bkashType === 'merchant' ? 'মার্চেন্ট' : config.bkashType === 'agent' ? 'এজেন্ট' : 'পার্সোনাল'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-pink-700 font-semibold truncate">{config.bkashNumber || 'বিকাশ পেমেন্ট'}</div>
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
                              <div className="flex items-center justify-between">
                                <span>নগদ (Nagad)</span>
                                {config.nagadType && (
                                  <span className="text-[9px] px-1 py-0.2 bg-orange-200 text-orange-950 rounded">
                                    {config.nagadType === 'merchant' ? 'মার্চেন্ট' : 'পার্সোনাল'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-orange-700 font-semibold truncate">{config.nagadNumber || 'নগদ পেমেন্ট'}</div>
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
                              <div className="flex items-center justify-between">
                                <span>রকেট (Rocket)</span>
                              </div>
                              <div className="text-[10px] text-purple-700 font-semibold truncate">{config.rocketNumber || 'রকেট পেমেন্ট'}</div>
                            </button>
                          )}
                        </div>

                        {/* Payment Instructions & TrxID Input for Mobile Banking */}
                        {paymentMethod !== 'cod' && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                            <div className="font-bold text-slate-800 flex items-center justify-between">
                              <span>
                                {paymentMethod === 'bkash' && `বিকাশ নম্বর: ${config.bkashNumber || 'নম্বর নেই'}`}
                                {paymentMethod === 'nagad' && `নগদ নম্বর: ${config.nagadNumber || 'নম্বর নেই'}`}
                                {paymentMethod === 'rocket' && `রকেট নম্বর: ${config.rocketNumber || 'নম্বর নেই'}`}
                              </span>
                              {(config.bkashNumber || config.nagadNumber || config.rocketNumber) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const num =
                                      paymentMethod === 'bkash'
                                        ? config.bkashNumber
                                        : paymentMethod === 'nagad'
                                        ? config.nagadNumber
                                        : config.rocketNumber;
                                    if (num) {
                                      navigator.clipboard.writeText(num);
                                      alert('পেমেন্ট নম্বর কপি করা হয়েছে!');
                                    }
                                  }}
                                  className="text-teal-700 font-bold hover:underline cursor-pointer"
                                >
                                  কপি করুন
                                </button>
                              )}
                            </div>

                            {config.paymentInstructions && (
                              <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                                {config.paymentInstructions}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700">
                                  ট্রানজেকশন আইডি (TrxID) *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customerTrxId}
                                  onChange={(e) => setCustomerTrxId(e.target.value)}
                                  placeholder="উদাঃ 9J7X5K2L9"
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-700">
                                  যে নম্বর থেকে টাকা পাঠিয়েছেন
                                </label>
                                <input
                                  type="tel"
                                  value={customerSenderPhone}
                                  onChange={(e) => setCustomerSenderPhone(e.target.value)}
                                  placeholder={customerPhone || '017XXXXXXXX'}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
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
                        className="w-full py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <span>এগিয়ে যান (চেকআউট)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCheckoutStep(false)}
                          className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition"
                        >
                          পেছনে
                        </button>
                        <button
                          type="submit"
                          form="store-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
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
                    অর্ডার ট্র্যাকিং আইডি: <span className="font-mono font-bold text-teal-800">{completedOrder.orderNumber}</span>
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
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
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
