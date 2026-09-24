import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Store,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  Package,
  Layers,
  Flame,
  Shirt,
  Smartphone,
  HeartPulse,
  ShoppingBag,
} from 'lucide-react';
import { MarketplaceProduct, MarketplaceCategory, MarketplaceCartItem } from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';

// Generated High-Fidelity Asset References
const HERO_BANNER_IMG = '/src/assets/images/marketplace_hero_banner_1790221146678.jpg';
const GHEE_IMG = '/src/assets/images/marketplace_artisan_ghee_1790221157459.jpg';
const GADGET_IMG = '/src/assets/images/marketplace_smart_gadgets_1790221167985.jpg';

interface CentralMarketplacePageProps {
  onMerchantLogin?: () => void;
}

export const CentralMarketplacePage: React.FC<CentralMarketplacePageProps> = ({ onMerchantLogin }) => {
  // Products and Category State
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'discount' | 'rating'>('featured');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart State
  const [cart, setCart] = useState<MarketplaceCartItem[]>(() => {
    try {
      const saved = localStorage.getItem('twing_marketplace_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Checkout State
  const [isCheckoutStep, setIsCheckoutStep] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [deliveryCity, setDeliveryCity] = useState<'dhaka' | 'outside_dhaka'>('dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [paymentTrxId, setPaymentTrxId] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Order Success & Tracking State
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);
  const [trackInput, setTrackInput] = useState<string>('');
  const [trackedOrderData, setTrackedOrderData] = useState<any | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<string>('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('twing_marketplace_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Load feed and categories on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [feedRes, catRes] = await Promise.all([
          marketplaceApi.getFeed({
            search: searchQuery,
            category: selectedCategory,
            sort: sortBy,
          }),
          marketplaceApi.getCategories(),
        ]);

        if (isMounted) {
          if (feedRes.success && Array.isArray(feedRes.products)) {
            // Apply generated images to showcase products if they match names
            const enriched = feedRes.products.map((p) => {
              if (p.name.includes('ঘি') && GHEE_IMG) {
                return { ...p, imageUrl: GHEE_IMG };
              }
              if ((p.name.includes('স্মার্ট') || p.name.includes('ওয়াচ') || p.name.includes('গ্যাজেট')) && GADGET_IMG) {
                return { ...p, imageUrl: GADGET_IMG };
              }
              return p;
            });
            setProducts(enriched);
          }
          if (catRes.success && Array.isArray(catRes.categories)) {
            setCategories(catRes.categories);
          }
        }
      } catch (err) {
        console.warn('Marketplace load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, sortBy, searchQuery]);

  // Total cart items count
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  // Cart subtotal
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.product.salePrice || 0) * curr.quantity, 0);
  }, [cart]);

  // Group cart items by vendor
  const groupedCartByVendor = useMemo(() => {
    const groups: Record<string, { vendorName: string; vendorSlug: string; vendorPhone?: string; items: MarketplaceCartItem[] }> = {};
    for (const item of cart) {
      const vId = item.product.vendorId || 'vendor_official';
      if (!groups[vId]) {
        groups[vId] = {
          vendorName: item.product.vendorShopName || 'ভেন্ডর শপ',
          vendorSlug: item.product.vendorSlug || '',
          vendorPhone: item.product.vendorPhone,
          items: [],
        };
      }
      groups[vId].items.push(item);
    }
    return groups;
  }, [cart]);

  const deliveryFee = deliveryCity === 'dhaka' ? 70 : 130;
  const grandTotal = cartSubtotal + (cart.length > 0 ? deliveryFee : 0);

  // Cart actions
  const addToCart = (prod: MarketplaceProduct, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [...prev, { product: prod, quantity: qty }];
    });
    showToast(`🛒 '${prod.name}' কার্টে যুক্ত করা হয়েছে!`);
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === prodId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as MarketplaceCartItem[];
    });
  };

  const removeFromCart = (prodId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== prodId));
    showToast('পণ্যটি কার্ট থেকে সরানো হয়েছে');
  };

  // Quick Buy (1-click checkout)
  const handleQuickBuy = (prod: MarketplaceProduct) => {
    addToCart(prod, 1);
    setIsCartOpen(true);
    setIsCheckoutStep(true);
  };

  // Submit Checkout Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      showToast('⚠️ নাম, ফোন নম্বর ও পূর্ণ ঠিকানা প্রদান করুন');
      return;
    }

    if (cart.length === 0) {
      showToast('⚠️ কার্ট খালি');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryCity,
        paymentMethod,
        paymentTrxId: paymentTrxId.trim(),
        senderPhone: senderPhone.trim(),
        notes: notes.trim(),
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

      const result = await marketplaceApi.checkout(payload);
      if (result.success && result.masterOrder) {
        setConfirmedOrder(result);
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutStep(false);
        showToast('🎉 অভিনন্দন! আপনার সেন্ট্রাল অর্ডার সফলভাবে গৃহীত হয়েছে!');
      } else {
        throw new Error(result.error || 'অর্ডার করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      alert(err.message || 'অর্ডার সম্পূর্ণ করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Order Tracking Handler
  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;

    setIsTrackingLoading(true);
    setTrackError('');
    setTrackedOrderData(null);

    try {
      const res = await marketplaceApi.trackOrder(trackInput.trim());
      if (res.success && res.order) {
        setTrackedOrderData(res.order);
      } else {
        setTrackError('অর্ডার পাওয়া যায়নি। সঠিক অর্ডার নম্বর দিন।');
      }
    } catch (err: any) {
      setTrackError(err.message || 'অর্ডারের তথ্য খুঁজতে সমস্যা হয়েছে');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION BAR: 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single Text Element Wordmark */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-lg sm:text-xl font-black tracking-tight text-teal-950 flex items-center gap-2 hover:opacity-90 transition"
            >
              <span className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                TW
              </span>
              <span>টুইং সেন্ট্রাল মার্কেটপ্লেস</span>
            </a>
          </div>

          {/* Zone 2: Search Input & Category Links */}
          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="সারা দেশের সেরা পণ্য, গ্রোসারি ও গ্যাজেট খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: 1-2 Primary Actions & Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-teal-700" />
              <span>অর্ডার ট্র্যাকিং</span>
            </button>

            {onMerchantLogin && (
              <button
                type="button"
                onClick={onMerchantLogin}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-teal-700" />
                <span>ভেন্ডর ড্যাশবোর্ড</span>
              </button>
            )}

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(true);
                setIsCheckoutStep(false);
              }}
              className="relative p-2.5 sm:px-3.5 sm:py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">কার্ট</span>
              {cartItemCount > 0 && (
                <span className="bg-amber-400 text-teal-950 text-[11px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য বা দোকান খুঁজুন..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">
        {/* HERO SHOWCASE SECTION */}
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-teal-950 via-teal-900 to-slate-950 text-white shadow-xl border border-teal-900/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            {/* Left Copy */}
            <div className="p-6 sm:p-10 lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>বাংলাদেশের সর্বাধুনিক সেন্ট্রাল মার্কেটপ্লেস</span>
                <span aria-hidden="true">·</span>
                <span>ভেরিফায়েড ভেন্ডরস</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                সারা দেশের খাঁটি খাদ্য, ফ্যাশন ও গ্যাজেট সরাসরি আপনার দরজায়
              </h1>

              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed max-w-xl">
                প্রত্যেকটি পণ্য স্থানীয় নিবন্ধিত বিশ্বস্ত ব্যবসায়ীদের নিজ সংগ্রহশালা থেকে পরীক্ষিত ও সরবরাহকৃত। ক্যাশ অন ডেলিভারিতে সম্পূর্ণ নিশ্চিন্তে কেনাকাটা করুন।
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#products-section"
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-teal-950 text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <span>সব পণ্য দেখুন</span>
                  <ChevronRight className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => setIsTrackModalOpen(true)}
                  className="px-4 py-2.5 bg-teal-900/80 hover:bg-teal-800 text-white text-xs font-bold rounded-xl border border-teal-700/60 transition"
                >
                  অর্ডার ট্র্যাক করুন
                </button>
              </div>
            </div>

            {/* Right Hero Commercial Image */}
            <div className="lg:col-span-5 relative h-56 sm:h-72 lg:h-full min-h-[240px] overflow-hidden">
              <img
                src={HERO_BANNER_IMG}
                alt="Central Marketplace"
                className="w-full h-full object-cover object-center transform hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-teal-950 lg:via-transparent lg:to-transparent" />
            </div>
          </div>

          {/* Value Proposition Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-teal-800/60 bg-teal-950/70 p-4 gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-teal-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>১০০% খাঁটি পণ্যের নিশ্চয়তা</span>
            </div>
            <div className="flex items-center gap-2.5 text-teal-100">
              <Truck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>সারা দেশে ক্যাশ অন ডেলিভারি</span>
            </div>
            <div className="flex items-center gap-2.5 text-teal-100">
              <RotateCcw className="w-4 h-4 text-teal-400 shrink-0" />
              <span>সহজ রিপ্লেসমেন্ট সুবিধা</span>
            </div>
            <div className="flex items-center gap-2.5 text-teal-100">
              <Store className="w-4 h-4 text-purple-400 shrink-0" />
              <span>স্বতন্ত্র ভেন্ডর শপ প্রোফাইল</span>
            </div>
          </div>
        </section>

        {/* CATEGORY SELECTOR & FILTER CONTROLS */}
        <section id="products-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                পণ্য সংগ্রহশালা
              </h2>
              <p className="text-xs text-slate-500">
                {products.length}টি পণ্য প্রদর্শিত হচ্ছে
              </p>
            </div>

            {/* Sorting Segmented Controls */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">সর্ট করুন:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              >
                <option value="featured">জনপ্রিয়তা ও ফিচার্ড</option>
                <option value="discount">সর্বোচ্চ ছাড়</option>
                <option value="price_asc">মূল্য: কম থেকে বেশি</option>
                <option value="price_desc">মূল্য: বেশি থেকে কম</option>
                <option value="rating">টপ রেটিং</option>
              </select>
            </div>
          </div>

          {/* Interactive Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              সব ক্যাটাগরি
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.nameBn)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.nameBn
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{cat.nameBn}</span>
              </button>
            ))}
          </div>
        </section>

        {/* PRODUCTS GRID */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
                  <div className="w-full aspect-square bg-slate-100 rounded-lg" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার খোঁজা ক্যাটাগরি বা নামে বর্তমানে কোনো সক্রিয় পণ্য নেই। অন্য ক্যাটাগরি অনুসন্ধান করুন।
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-teal-800 text-white text-xs font-bold rounded-xl"
              >
                সব পণ্য রিসেট করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {products.map((prod) => {
                const discount = prod.discountPercent || (prod.originalPrice ? Math.round(((prod.originalPrice - prod.salePrice) / prod.originalPrice) * 100) : 0);

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                      <img
                        src={prod.imageUrl || GHEE_IMG}
                        alt={prod.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = GHEE_IMG;
                        }}
                      />
                      {discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-xs">
                          {discount}% ছাড়
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1">
                        {/* Vendor Trust Marker (Zero-pill text layout with store link) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-teal-800 font-semibold truncate">
                          <Store className="w-3 h-3 shrink-0 text-teal-600" />
                          <span className="truncate">{prod.vendorShopName || 'ভেন্ডর স্টোর'}</span>
                          {prod.vendorSlug && (
                            <a
                              href={`/?shop=${encodeURIComponent(prod.vendorSlug)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-teal-700 ml-auto shrink-0"
                              title="দোকান ভিজিট করুন"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {prod.name}
                        </h3>

                        {/* Clean Metadata (Unboxed) */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="text-amber-500 font-bold">★ {prod.rating || 4.9}</span>
                          <span aria-hidden="true">·</span>
                          <span>{prod.stock > 0 ? 'ইন-স্টক' : 'স্টক শেষ'}</span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="pt-1 border-t border-slate-100">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm sm:text-base font-black text-teal-900">
                            ৳{prod.salePrice}
                          </span>
                          {prod.originalPrice && prod.originalPrice > prod.salePrice && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{prod.originalPrice}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 ml-auto">/{prod.unit}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => addToCart(prod, 1)}
                            className="py-1.5 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>কার্ট</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickBuy(prod)}
                            className="py-1.5 px-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span>অর্ডার</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* MULTI-VENDOR CART & CHECKOUT DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-800" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isCheckoutStep ? 'ডেলিভারি ও অর্ডার সম্পন্ন' : `আপনার শপিং কার্ট (${cartItemCount})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">কার্ট সম্পূর্ণ খালি</p>
                  <p className="text-xs text-slate-500">পণ্য যুক্ত করতে ব্রাউজ করুন</p>
                </div>
              ) : !isCheckoutStep ? (
                /* Step 1: Cart Items Grouped by Multi-Vendor */
                <div className="space-y-4">
                  {Object.entries(groupedCartByVendor).map(([vendorId, vData]) => (
                    <div key={vendorId} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      {/* Vendor Header */}
                      <div className="px-3 py-2 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-teal-950">
                          <Store className="w-3.5 h-3.5 text-teal-700" />
                          <span>{vData.vendorName}</span>
                        </div>
                        <span className="text-[10px] text-teal-700 font-medium">
                          {vData.items.length}টি পণ্য
                        </span>
                      </div>

                      {/* Vendor Items */}
                      <div className="divide-y divide-slate-100">
                        {vData.items.map((item) => (
                          <div key={item.product.id} className="p-3 flex items-center gap-3 bg-white">
                            <img
                              src={item.product.imageUrl || GHEE_IMG}
                              alt={item.product.name}
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {item.product.name}
                              </h4>
                              <p className="text-xs font-black text-teal-800 mt-0.5">
                                ৳{item.product.salePrice * item.quantity}
                              </p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.product.id, -1)}
                                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-l"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.product.id, 1)}
                                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-r"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Step 2: Checkout Form */
                <form onSubmit={handlePlaceOrder} id="checkout-form" className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">আপনার নাম *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="যেমন: তানভীর আহমেদ"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">মোবাইল নম্বর *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="০১XXXXXXXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ডেলিভারি এরিয়া *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryCity('dhaka')}
                        className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                          deliveryCity === 'dhaka'
                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        ঢাকা সিটি (৳৭০)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryCity('outside_dhaka')}
                        className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                          deliveryCity === 'outside_dhaka'
                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        ঢাকার বাইরে (৳১৩০)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">সম্পূর্ণ ঠিকানা *</label>
                    <textarea
                      rows={2}
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="বাসা/হোল্ডিং নম্বর, রোড, এলাকা, থানা ও জেলা"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">পেমেন্ট মেথড</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-2 rounded-lg border text-center font-bold transition ${
                          paymentMethod === 'cod'
                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        ক্যাশ অন ডেলিভারি
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bkash')}
                        className={`p-2 rounded-lg border text-center font-bold transition ${
                          paymentMethod === 'bkash'
                            ? 'border-pink-600 bg-pink-50 text-pink-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        বিকাশ
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('nagad')}
                        className={`p-2 rounded-lg border text-center font-bold transition ${
                          paymentMethod === 'nagad'
                            ? 'border-orange-600 bg-orange-50 text-orange-900'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        নগদ
                      </button>
                    </div>
                  </div>

                  {paymentMethod !== 'cod' && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <p className="text-[11px] text-slate-600">
                        মার্কেটপ্লেস পেমেন্ট নম্বর: <span className="font-bold text-slate-900">01306908115</span> (মার্চেন্ট)
                      </p>
                      <input
                        type="text"
                        value={paymentTrxId}
                        onChange={(e) => setPaymentTrxId(e.target.value)}
                        placeholder="পেমেন্ট ট্রানজেকশন আইডি (TrxID)"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">অর্ডার নোট (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="বিশেষ কোনো নির্দেশনা থাকলে লিখুন..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Drawer Footer Summary */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>পণ্যের উপ-মোট:</span>
                    <span>৳{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি চার্জ:</span>
                    <span>৳{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>সর্বমোট প্রদেয়:</span>
                    <span className="text-teal-900">৳{grandTotal}</span>
                  </div>
                </div>

                {!isCheckoutStep ? (
                  <button
                    type="button"
                    onClick={() => setIsCheckoutStep(true)}
                    className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>চেকআউটে এগিয়ে যান</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutStep(false)}
                      className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100"
                    >
                      পেছনে
                    </button>
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={isSubmittingOrder}
                      className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingOrder ? (
                        <span>অর্ডার সম্পন্ন হচ্ছে...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>অর্ডার নিশ্চিত করুন (৳{grandTotal})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER CONFIRMATION MODAL */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                অর্ডার সফলভাবে সম্পন্ন হয়েছে!
              </h3>
              <p className="text-xs text-slate-500">
                ধন্যবাদ, আপনার সেন্ট্রাল মার্কেটপ্লেস অর্ডারটি ভেন্ডরদের কাছে পৌঁছে দেওয়া হয়েছে।
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">মাস্টার অর্ডার আইডি:</span>
                <span className="font-mono font-bold text-teal-900">
                  {confirmedOrder.masterOrder?.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">সর্বমোট পরিশোধযোগ্য:</span>
                <span className="font-bold text-slate-900">
                  ৳{confirmedOrder.masterOrder?.grandTotal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">অন্তর্ভুক্ত ভেন্ডর সাব-অর্ডার:</span>
                <span className="font-bold text-teal-800">
                  {confirmedOrder.subOrders?.length || 1}টি স্বতন্ত্র পার্সেল
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTrackInput(confirmedOrder.masterOrder?.orderNumber || '');
                  setConfirmedOrder(null);
                  setIsTrackModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                অর্ডার ট্র্যাক করুন
              </button>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                আরো কেনাকাটা করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE ORDER TRACKING MODAL */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-800" />
                <h3 className="font-black text-sm text-slate-900">অর্ডার লাইভ ট্র্যাকিং</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTrackModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Tracking Search Input */}
            <form onSubmit={handleSearchTracking} className="flex gap-2">
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="মাস্টার অর্ডার নম্বর (যেমন: MKT-123456) বা ফোন নম্বর"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isTrackingLoading}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shrink-0 transition"
              >
                {isTrackingLoading ? 'খোঁজা হচ্ছে...' : 'অনুসন্ধান'}
              </button>
            </form>

            {trackError && (
              <p className="text-xs text-red-600 font-semibold">{trackError}</p>
            )}

            {/* Tracked Order Result */}
            {trackedOrderData && (
              <div className="space-y-4 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex justify-between font-bold text-teal-950">
                    <span>অর্ডার #{trackedOrderData.orderNumber}</span>
                    <span className="capitalize">{trackedOrderData.overallStatus}</span>
                  </div>
                  <div className="text-[11px] text-teal-800">
                    গ্রাহক: {trackedOrderData.customerName} ({trackedOrderData.customerPhone})
                  </div>
                  <div className="text-[11px] text-teal-800">
                    ঠিকানা: {trackedOrderData.customerAddress}
                  </div>
                  <div className="text-[11px] text-teal-900 font-bold pt-1">
                    মোট বিল: ৳{trackedOrderData.grandTotal} (পেমেন্ট: {trackedOrderData.paymentMethod.toUpperCase()})
                  </div>
                </div>

                {/* Sub-Orders Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">
                    ভেন্ডর সাব-অর্ডার ও ডেলিভারি স্ট্যাটাস:
                  </h4>
                  {Array.isArray(trackedOrderData.subOrders) && trackedOrderData.subOrders.length > 0 ? (
                    trackedOrderData.subOrders.map((sub: any, idx: number) => (
                      <div key={sub.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-teal-900 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-teal-700" />
                            <span>{sub.vendorShopName || 'ভেন্ডর'}</span>
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {sub.status === 'pending' ? 'প্রস্তুতি চলছে' : sub.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          সাব-অর্ডার আইডি: #{sub.orderNumber} · পরিমাণ: ৳{sub.totalAmount}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-[11px]">পার্সেল প্রসেসিং পর্যায়ে রয়েছে।</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <span className="w-6 h-6 rounded bg-teal-600 text-white flex items-center justify-center text-xs">
                TW
              </span>
              <span>টুইং সেন্ট্রাল মার্কেটপ্লেস</span>
            </div>
            <p className="text-[11px] text-slate-500 text-center sm:text-right">
              সারা দেশের উদ্যোক্তা ও ভেন্ডরদের সম্মিলিত ই-কমার্স প্ল্যাটফর্ম
            </p>
          </div>
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} TWING Hisabi Central Marketplace. সর্বস্বত্ব সংরক্ষিত।</span>
            <div className="flex items-center gap-4">
              <span>নিরাপদ কেনাকাটা</span>
              <span aria-hidden="true">·</span>
              <span>দ্রুততম ডেলিভারি</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
