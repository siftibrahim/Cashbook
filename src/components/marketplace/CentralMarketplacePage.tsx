import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Heart,
  Eye,
  Share2,
  ChevronLeft,
  Check,
  BadgeCheck,
  MessageCircle,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import { MarketplaceProduct, MarketplaceCategory, MarketplaceCartItem } from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import { formatMoney } from '../../utils/storage';
import { getFallbackProductImage } from '../../utils/productImages';

// High-fidelity image assets
const HERO_BANNER_IMG = '/src/assets/images/marketplace_hero_banner_1790221146678.jpg';
const GHEE_IMG = '/src/assets/images/marketplace_artisan_ghee_1790221157459.jpg';
const GADGET_IMG = '/src/assets/images/marketplace_smart_gadgets_1790221167985.jpg';

interface CentralMarketplacePageProps {
  onMerchantLogin?: () => void;
  onBackToDashboard?: () => void;
}

export const CentralMarketplacePage: React.FC<CentralMarketplacePageProps> = ({
  onMerchantLogin,
  onBackToDashboard,
}) => {
  // Feed state
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'discount' | 'rating'>('featured');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWishlistOnly, setIsWishlistOnly] = useState<boolean>(false);

  // Element Refs
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Wishlist state
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('twing_marketplace_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected Product for Full Detail Modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<MarketplaceProduct | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

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

  // Checkout Form State
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

  // Order Confirmation & Tracking
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);
  const [trackInput, setTrackInput] = useState<string>('');
  const [trackedOrderData, setTrackedOrderData] = useState<any | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState<boolean>(false);
  const [trackError, setTrackError] = useState<string>('');

  // Hero Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Sync cart & wishlist to storage
  useEffect(() => {
    try {
      localStorage.setItem('twing_marketplace_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('twing_marketplace_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? 'পছন্দের তালিকা থেকে সরানো হয়েছে' : '❤️ পছন্দের তালিকায় যুক্ত করা হয়েছে');
      return next;
    });
  };

  // Load feed and categories on mount / filter change
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

  // Carousel auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Cart Metrics
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.product.salePrice || 0) * curr.quantity, 0);
  }, [cart]);

  // Filtered products list (supports Wishlist filter)
  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (isWishlistOnly) {
      list = list.filter((p) => wishlist.includes(p.id));
    }
    return list;
  }, [products, isWishlistOnly, wishlist]);

  const deliveryFee = deliveryCity === 'dhaka' ? 70 : 130;
  const grandTotal = cartSubtotal + (cart.length > 0 ? deliveryFee : 0);

  // Group cart items by vendor
  const groupedCartByVendor = useMemo(() => {
    const groups: Record<
      string,
      { vendorName: string; vendorSlug: string; vendorPhone?: string; items: MarketplaceCartItem[] }
    > = {};
    for (const item of cart) {
      const vId = item.product.vendorId || 'vendor_official';
      if (!groups[vId]) {
        groups[vId] = {
          vendorName: item.product.vendorShopName || 'অফিসিয়াল ভেন্ডর শপ',
          vendorSlug: item.product.vendorSlug || '',
          vendorPhone: item.product.vendorPhone,
          items: [],
        };
      }
      groups[vId].items.push(item);
    }
    return groups;
  }, [cart]);

  // Cart action helpers
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

  // Buy Now (Instant Checkout)
  const handleBuyNow = (prod: MarketplaceProduct, qty = 1) => {
    addToCart(prod, qty);
    setIsCartOpen(true);
    setIsCheckoutStep(true);
  };

  // Submit Order
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

  // Search Order Tracking
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
    <div
      ref={pageContainerRef}
      className="w-full min-h-[100dvh] h-full flex-1 bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#00897B] selection:text-white overflow-y-auto overflow-x-hidden smooth-scroll-container pb-28 md:pb-12"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-3 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo / Brand Name & Back Button */}
          <div className="flex items-center gap-2 shrink-0">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="p-2 -ml-1 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer md:hidden flex items-center"
                title="ড্যাশবোর্ডে ফিরুন"
              >
                <ChevronLeft className="w-5 h-5 text-slate-800" />
              </button>
            )}

            <div
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setIsWishlistOnly(false);
                scrollToTop();
              }}
              className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#004D40] to-[#00897B] text-white flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  TwingMall
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 font-bold uppercase tracking-wider">
                    সেন্ট্রাল মল
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  মাল্টি-ভেন্ডর ই-কমার্স প্ল্যাটফর্ম
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar & Instant Category Filter */}
          <div className="flex-1 max-w-xl hidden md:flex items-center gap-2">
            <div className="relative w-full">
              <input
                ref={desktopSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="লাখো পণ্যের মধ্যে অনুসন্ধান করুন..."
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-2xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00897B]/30 focus:border-[#00897B] transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Back to Dashboard if opened from merchant dashboard */}
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="hidden md:flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ড্যাশবোর্ড</span>
              </button>
            )}

            {/* Order Tracking Button */}
            <button
              type="button"
              onClick={() => setIsTrackModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-700 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition cursor-pointer"
              title="অর্ডার ট্র্যাকিং"
            >
              <Truck className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">ট্র্যাকিং</span>
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => {
                if (wishlist.length === 0) {
                  showToast('❤️ আপনার পছন্দের তালিকায় এখনো কোনো পণ্য যোগ করা হয়নি');
                } else {
                  setIsWishlistOnly((prev) => !prev);
                  showToast(
                    isWishlistOnly
                      ? '🛍️ সব পণ্য প্রদর্শিত হচ্ছে'
                      : `❤️ আপনার পছন্দের ${wishlist.length}টি পণ্য প্রদর্শিত হচ্ছে`
                  );
                }
              }}
              className={`relative p-2.5 rounded-xl transition cursor-pointer ${
                isWishlistOnly
                  ? 'bg-rose-100 text-rose-600'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="পছন্দের তালিকা"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Merchant / Vendor Portal Login */}
            {onMerchantLogin && (
              <button
                type="button"
                onClick={onMerchantLogin}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-teal-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <Store className="w-4 h-4 text-teal-700" />
                <span>ভেন্ডর পোর্টাল</span>
              </button>
            )}

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(true);
                setIsCheckoutStep(false);
              }}
              className="relative px-3 sm:px-3.5 py-2 sm:py-2.5 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">৳{formatMoney(cartSubtotal)}</span>
              {cartItemCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-2.5 pt-1 md:hidden">
          <div className="relative w-full">
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00897B]/30"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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

      {/* MAIN BODY CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8 w-full">
        {/* HERO CAROUSEL BANNER SECTION */}
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900 text-white min-h-[200px] sm:min-h-[280px] md:min-h-[340px] flex items-center">
          {/* Slide 1 */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              currentSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={HERO_BANNER_IMG}
              alt="Marketplace Hero"
              className="w-full h-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent p-6 sm:p-10 flex flex-col justify-center max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black w-fit">
                <Flame className="w-3.5 h-3.5 fill-slate-950" />
                <span>জাতীয় সেন্ট্রাল মার্কেটপ্লেস</span>
              </span>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                দেশের হাজারো বিশ্বস্ত ভেন্ডরের পণ্য এক ঠিকানায়!
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">
                খাঁটি দেশীয় ঘি, মসলা থেকে শুরু করে প্রিমিয়াম ফ্যাশন ও স্মার্ট গ্যাজেট— সবই পাবেন আসল গ্যারান্টিতে।
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setIsWishlistOnly(false);
                    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-[#00897B] hover:bg-[#00796B] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>সব পণ্য ব্রাউজ করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Slide 2 */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              currentSlide === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={GHEE_IMG}
              alt="Pure Artisan Products"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-teal-950 via-teal-900/80 to-transparent p-6 sm:p-10 flex flex-col justify-center max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black w-fit">
                <ShieldCheck className="w-3.5 h-3.5 fill-slate-950" />
                <span>১০০% খাঁটি ও নির্ভেজাল</span>
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                উৎপাদনকারীর খাঁটি পণ্য সরাসরি আপনার দোরগোড়ায়
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 line-clamp-2">
                কোনো মধ্যস্বত্বভোগী ছাড়া ভেন্ডরদের থেকে সরাসরি ফ্রেশ পণ্য কিনুন সবচেয়ে ন্যায্য মূল্যে।
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('oil-ghee');
                    setIsWishlistOnly(false);
                    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  গ্রোসারি অফার দেখুন
                </button>
              </div>
            </div>
          </div>

          {/* Slide 3 */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              currentSlide === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={GADGET_IMG}
              alt="Smart Gadgets"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-900/80 to-transparent p-6 sm:p-10 flex flex-col justify-center max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400 text-slate-950 text-xs font-black w-fit">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>টেক ও স্মার্ট গ্যাজেট</span>
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                লেটেস্ট স্মার্টওয়াচ ও গ্যাজেটে বিশেষ ছাড়
              </h2>
              <p className="text-xs sm:text-sm text-cyan-100 line-clamp-2">
                ক্যাশ অন ডেলিভারিতে দেখে পণ্য রিসিভ করার পূর্ণ নিশ্চয়তা।
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('gadgets');
                    setIsWishlistOnly(false);
                    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  গ্যাজেট এক্সপ্লোর করুন
                </button>
              </div>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 right-6 z-20 flex gap-2">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'bg-amber-400 w-6' : 'bg-white/50 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>

        {/* TRUST BADGES STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">সারা দেশে ডেলিভারি</h4>
              <p className="text-[11px] text-slate-500">হোম ডেলিভারি সুবিধা</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">১০০% ভেরিফাইড ভেন্ডর</h4>
              <p className="text-[11px] text-slate-500">নিরাপদ পণ্য ও গ্যারান্টি</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">সহজ রিটার্ন পলিসি</h4>
              <p className="text-[11px] text-slate-500">সমস্যায় দ্রুত সমাধান</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">ক্যাশ অন ডেলিভারি</h4>
              <p className="text-[11px] text-slate-500">হাতে পেয়ে টাকা দিন</p>
            </div>
          </div>
        </div>

        {/* CATEGORY SELECTOR BAR */}
        <div ref={productsSectionRef} className="space-y-3 scroll-mt-20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00897B]" />
              <span>জনপ্রিয় ক্যাটাগরি</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              মোট {displayedProducts.length}টি পণ্য প্রদর্শিত হচ্ছে
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setIsWishlistOnly(false);
                productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                selectedCategory === 'all' && !isWishlistOnly
                  ? 'bg-[#00897B] text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🛍️ সকল পণ্য</span>
            </button>

            {categories.map((c) => {
              const isActive = !isWishlistOnly && (selectedCategory === c.slug || selectedCategory === c.nameBn);
              return (
                <button
                  key={c.id || c.slug}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(c.slug);
                    setIsWishlistOnly(false);
                    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#00897B] text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.icon || '📦'}</span>
                  <span>{c.nameBn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SORTING & FILTER CONTROL */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>সর্ট করুন:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'featured', label: '🔥 ফিচার্ড' },
              { id: 'discount', label: '⚡ সর্বোচ্চ ছাড়' },
              { id: 'price_asc', label: 'কম দাম' },
              { id: 'price_desc', label: 'বেশি দাম' },
              { id: 'rating', label: '⭐ সেরা রেটিং' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSortBy(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sortBy === st.id
                    ? 'bg-teal-50 text-[#004D40] border border-teal-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* WISHLIST ACTIVE BANNER */}
        {isWishlistOnly && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              আপনার পছন্দের তালিকা ({displayedProducts.length}টি পণ্য)
            </span>
            <button
              type="button"
              onClick={() => setIsWishlistOnly(false)}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              সব পণ্য দেখুন
            </button>
          </div>
        )}

        {/* PRODUCTS GRID */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl p-3 border border-slate-200 space-y-3 animate-pulse"
              >
                <div className="aspect-square bg-slate-100 rounded-2xl" />
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                <div className="h-9 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isWishlistOnly
                ? 'আপনার পছন্দের তালিকায় কোনো পণ্য নেই। পণ্যের হৃদপিন্ড (❤️) আইকনে ক্লিক করে পছন্দের পণ্য যোগ করুন।'
                : 'অনুসন্ধান ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন অথবা অন্য ক্যাটাগরি ব্রাউজ করুন।'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setIsWishlistOnly(false);
              }}
              className="px-4 py-2 bg-[#00897B] text-white rounded-xl text-xs font-bold hover:bg-[#00796B] transition cursor-pointer"
            >
              সকল পণ্য দেখুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {displayedProducts.map((prod) => {
              const isWishlisted = wishlist.includes(prod.id);
              const inCartItem = cart.find((it) => it.product.id === prod.id);
              const inCartQty = inCartItem?.quantity || 0;
              const inStock = prod.stock > 0;
              const discount =
                prod.originalPrice && prod.originalPrice > prod.salePrice
                  ? Math.round(((prod.originalPrice - prod.salePrice) / prod.originalPrice) * 100)
                  : prod.discountPercent || null;

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    setSelectedProductForDetail(prod);
                    setModalQuantity(1);
                  }}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-[#00897B]/40 transition-all flex flex-col justify-between overflow-hidden group relative cursor-pointer"
                >
                  {/* Image & Badges */}
                  <div>
                    <div className="relative aspect-square bg-slate-50/50 flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
                      {/* Discount Tag */}
                      {discount && (
                        <div className="absolute top-2.5 right-2.5 z-10 bg-rose-500 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          -{discount}%
                        </div>
                      )}

                      {/* Wishlist Heart */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(prod.id);
                        }}
                        className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-xs transition active:scale-90 cursor-pointer"
                        title={isWishlisted ? 'পছন্দ থেকে সরান' : 'পছন্দ করুন'}
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isWishlisted ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                          }`}
                        />
                      </button>

                      {/* Image */}
                      <img
                        src={prod.imageUrl || getFallbackProductImage(prod.name, prod.category)}
                        alt={prod.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getFallbackProductImage(prod.name, prod.category);
                        }}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />

                      {!inStock && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-10">
                          <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-md">
                            স্টক শেষ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3 sm:p-4 space-y-1.5">
                      {/* Vendor Store Tag */}
                      <div className="flex items-center gap-1 text-[10px] text-teal-800 font-bold truncate">
                        <Store className="w-3 h-3 text-teal-600 shrink-0" />
                        <span className="truncate">{prod.vendorShopName || 'ভেন্ডর স্টোর'}</span>
                      </div>

                      {/* Product Name */}
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-[#004D40] transition">
                        {prod.name}
                      </h4>

                      {/* Rating & Reviews */}
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-500">
                        <span>★ {prod.rating || '4.8'}</span>
                        <span className="text-slate-400 text-[10px]">
                          ({prod.reviewCount || 12})
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          ৳ {formatMoney(prod.salePrice)}
                        </span>
                        {prod.originalPrice && prod.originalPrice > prod.salePrice && (
                          <span className="text-xs text-slate-400 line-through">
                            ৳ {formatMoney(prod.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    className="p-3 pt-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {inCartQty > 0 ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-2xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateCartQty(prod.id, -1)}
                          className="w-7 h-7 bg-white text-emerald-900 rounded-xl flex items-center justify-center font-bold hover:bg-emerald-100 shadow-2xs transition active:scale-90 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-xs sm:text-sm text-emerald-950 px-2">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(prod.id, 1)}
                          className="w-7 h-7 bg-[#00897B] text-white rounded-xl flex items-center justify-center font-bold hover:bg-[#00796B] shadow-2xs transition active:scale-90 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => addToCart(prod, 1)}
                          disabled={!inStock}
                          className="py-2 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 text-[#00897B]" />
                          <span>কার্টে নিন</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBuyNow(prod, 1)}
                          disabled={!inStock}
                          className="py-2 px-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 bg-[#00897B] hover:bg-[#00796B] text-white transition active:scale-95 shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <span>এখনই কিনুন</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProductForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 space-y-6">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedProductForDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Product Image */}
              <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 p-4 flex items-center justify-center relative">
                <img
                  src={selectedProductForDetail.imageUrl || getFallbackProductImage(selectedProductForDetail.name, selectedProductForDetail.category)}
                  alt={selectedProductForDetail.name}
                  className="w-full h-full object-contain"
                />
                {selectedProductForDetail.originalPrice && selectedProductForDetail.originalPrice > selectedProductForDetail.salePrice && (
                  <span className="absolute top-3 left-3 bg-rose-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-xs">
                    {Math.round(
                      ((selectedProductForDetail.originalPrice - selectedProductForDetail.salePrice) /
                        selectedProductForDetail.originalPrice) *
                        100
                    )}
                    % ছাড়
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                {/* Vendor Shop Tag */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 rounded-full text-xs font-bold text-teal-900">
                  <Store className="w-3.5 h-3.5 text-teal-700" />
                  <span>{selectedProductForDetail.vendorShopName || 'টুইং ভেরিফাইড ভেন্ডর'}</span>
                  <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                </div>

                <h3 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
                  {selectedProductForDetail.name}
                </h3>

                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-[#004D40]">
                    ৳ {formatMoney(selectedProductForDetail.salePrice)}
                  </span>
                  {selectedProductForDetail.originalPrice && selectedProductForDetail.originalPrice > selectedProductForDetail.salePrice && (
                    <span className="text-sm text-slate-400 line-through">
                      ৳ {formatMoney(selectedProductForDetail.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    ইন-স্টক ({selectedProductForDetail.stock})
                  </span>
                </div>

                {/* Vendor WhatsApp Chat Direct */}
                {selectedProductForDetail.vendorPhone && (
                  <a
                    href={`https://wa.me/88${selectedProductForDetail.vendorPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `আসসালামু আলাইকুম, আমি সেন্ট্রাল মল থেকে "${selectedProductForDetail.name}" সম্পর্কে জানতে চাই।`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>ভেন্ডরকে সরাসরি হোয়াটসঅ্যাপে মেসেজ দিন</span>
                  </a>
                )}

                {/* Delivery and Trust Points */}
                <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-teal-700" />
                    <span>ক্যাশ অন ডেলিভারি: ঢাকা ৭০৳ | বাইরে ১৩০৳</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>১০০% অরিজিনাল ও ভেরিফাইড কোয়ালিটি গ্যারান্টি</span>
                  </div>
                </div>

                {/* Quantity Controls & Add to Cart */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">পরিমাণ:</span>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 hover:bg-slate-200 text-slate-700 font-bold transition"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 font-black text-xs text-slate-900">{modalQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setModalQuantity((prev) => prev + 1)}
                        className="px-3 py-1.5 hover:bg-slate-200 text-slate-700 font-bold transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProductForDetail, modalQuantity);
                        setSelectedProductForDetail(null);
                      }}
                      className="py-3 px-3 bg-teal-50 hover:bg-teal-100 text-[#004D40] border border-teal-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>কার্টে যোগ করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleBuyNow(selectedProductForDetail, modalQuantity);
                        setSelectedProductForDetail(null);
                      }}
                      className="py-3 px-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                    >
                      <span>এখনই কিনুন</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-VENDOR CART & CHECKOUT SLIDE-OVER DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#00897B]" />
                <h3 className="font-black text-base text-slate-900">
                  {isCheckoutStep ? 'চেকআউট ও পেমেন্ট' : `শপিং কার্ট (${cartItemCount})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {!isCheckoutStep ? (
                /* CART ITEMS VIEW */
                cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <ShoppingCart className="w-12 h-12 text-slate-300" />
                    <p className="font-bold text-slate-700">আপনার কার্ট খালি</p>
                    <p className="text-xs text-slate-400">সেন্ট্রাল মলের সেরা পণ্যগুলো ঘুরে দেখুন</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Items Grouped By Vendor */}
                    {Object.entries(groupedCartByVendor).map(([vId, group]) => (
                      <div key={vId} className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 border-b border-slate-200 pb-2">
                          <Store className="w-3.5 h-3.5 text-teal-700" />
                          <span>ভেন্ডর পার্সেল: {group.vendorName}</span>
                        </div>

                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <div
                              key={item.product.id}
                              className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-100"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={item.product.imageUrl || getFallbackProductImage(item.product.name)}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-contain rounded-lg bg-slate-50 shrink-0"
                                />
                                <div className="min-w-0">
                                  <h5 className="font-bold text-xs text-slate-900 truncate">
                                    {item.product.name}
                                  </h5>
                                  <p className="text-xs font-black text-slate-900 mt-0.5">
                                    ৳{formatMoney(item.product.salePrice)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.product.id, -1)}
                                    className="px-2 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 font-bold text-xs text-slate-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.product.id, 1)}
                                    className="px-2 py-1 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* CHECKOUT FORM VIEW */
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">আপনার নাম *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="উদাঃ মোঃ রফিকুল ইসলাম"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00897B]/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">মোবাইল নম্বর *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00897B]/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ডেলিভারি এরিয়া</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryCity('dhaka')}
                        className={`p-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                          deliveryCity === 'dhaka'
                            ? 'bg-teal-50 border-teal-600 text-teal-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        ঢাকা সিটি (৳৭০)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryCity('outside_dhaka')}
                        className={`p-2.5 rounded-xl border font-bold text-xs transition cursor-pointer ${
                          deliveryCity === 'outside_dhaka'
                            ? 'bg-teal-50 border-teal-600 text-teal-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        ঢাকার বাইরে (৳১৩০)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">পূর্ণ ঠিকানা *</label>
                    <textarea
                      required
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="বাড়ি নং, রোড নং, থানা ও জেলা..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00897B]/30 focus:outline-none"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">পেমেন্ট মেথড</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-2.5 rounded-xl border font-bold text-xs text-center transition cursor-pointer ${
                          paymentMethod === 'cod'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-500'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        ক্যাশ অন ডেলিভারি
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bkash')}
                        className={`p-2.5 rounded-xl border font-bold text-xs text-center transition cursor-pointer ${
                          paymentMethod === 'bkash'
                            ? 'bg-pink-50 border-pink-500 text-pink-900 ring-1 ring-pink-500'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        বিকাশ (bKash)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('nagad')}
                        className={`p-2.5 rounded-xl border font-bold text-xs text-center transition cursor-pointer ${
                          paymentMethod === 'nagad'
                            ? 'bg-orange-50 border-orange-500 text-orange-900 ring-1 ring-orange-500'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        নগদ (Nagad)
                      </button>
                    </div>

                    {/* bKash / Nagad Trx Details */}
                    {paymentMethod !== 'cod' && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <p className="text-[11px] text-slate-700 font-medium">
                          সেন্ট্রাল মল মার্চেন্ট নম্বরে (<strong>01306908115</strong>) সেন্ড মানি করুন এবং TrxID দিন:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="প্রেরক নম্বর"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="TrxID (ট্রানজেকশন)"
                            value={paymentTrxId}
                            onChange={(e) => setPaymentTrxId(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">বিশেষ কোনো নির্দেশনা (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ডেলিভারির সময় বা বিশেষ নোট..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Footer Actions */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>পণ্যের মূল্য:</span>
                    <span>৳{formatMoney(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি চার্জ ({deliveryCity === 'dhaka' ? 'ঢাকা' : 'ঢাকার বাইরে'}):</span>
                    <span>৳{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>সর্বমোট বিল:</span>
                    <span className="text-[#004D40]">৳{formatMoney(grandTotal)}</span>
                  </div>
                </div>

                {!isCheckoutStep ? (
                  <button
                    type="button"
                    onClick={() => setIsCheckoutStep(true)}
                    className="w-full py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <span>চেকআউট করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutStep(false)}
                      className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-xs transition"
                    >
                      ব্যাকে যান
                    </button>
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={isSubmittingOrder}
                      className="flex-1 py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingOrder ? (
                        <span>অর্ডার সম্পন্ন হচ্ছে...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>অর্ডার কনফার্ম করুন (৳{formatMoney(grandTotal)})</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-center shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">অর্ডার সফলভাবে নিশ্চিত হয়েছে!</h3>
              <p className="text-xs text-slate-500">
                আপনার সেন্ট্রাল মাস্টার অর্ডার নম্বর:{' '}
                <strong className="text-slate-900 font-mono text-sm block mt-0.5">
                  #{confirmedOrder.masterOrder?.orderNumber}
                </strong>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 text-left border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">গ্রাহকের নাম:</span>
                <span className="font-bold text-slate-800">{confirmedOrder.masterOrder?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মোট পরিশোধযোগ্য:</span>
                <span className="font-black text-[#004D40]">৳{confirmedOrder.masterOrder?.grandTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">পেমেন্ট মেথড:</span>
                <span className="font-bold uppercase text-slate-800">{confirmedOrder.masterOrder?.paymentMethod}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              সংশ্লিষ্ট ভেন্ডররা অতিদ্রুত আপনার পার্সেল ডেলিভারি পার্টনারের কাছে হ্যান্ডওভার করবেন।
            </p>

            <button
              type="button"
              onClick={() => setConfirmedOrder(null)}
              className="w-full py-3 bg-[#00897B] hover:bg-[#00796B] text-white rounded-2xl font-bold text-xs shadow-md transition"
            >
              শপিং চালিয়ে যান
            </button>
          </div>
        </div>
      )}

      {/* ORDER TRACKING MODAL */}
      {isTrackModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-700" />
                <h3 className="font-black text-base text-slate-900">সেন্ট্রাল অর্ডার ট্র্যাকিং</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTrackModalOpen(false);
                  setTrackedOrderData(null);
                  setTrackError('');
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchTracking} className="flex gap-2">
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                placeholder="মাস্টার অর্ডার নং বা ফোন দিন..."
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30"
              />
              <button
                type="submit"
                disabled={isTrackingLoading}
                className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isTrackingLoading ? 'খোঁজা হচ্ছে...' : 'ট্র্যাক করুন'}
              </button>
            </form>

            {trackError && (
              <p className="text-xs text-rose-600 font-bold p-2 bg-rose-50 rounded-xl">{trackError}</p>
            )}

            {trackedOrderData && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">অর্ডার নম্বর:</span>
                    <span className="font-mono font-bold text-slate-900">#{trackedOrderData.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">স্ট্যাটাস:</span>
                    <span className="font-bold text-teal-800 uppercase">{trackedOrderData.overallStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মোট বিল:</span>
                    <span className="font-black text-slate-900">৳{trackedOrderData.grandTotal}</span>
                  </div>
                </div>

                {/* Tracking Progress Steps */}
                <div className="py-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                      <span>গৃহীত</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-emerald-500 mx-1" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
                        2
                      </div>
                      <span>প্রসেসিং</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-slate-200 mx-1" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
                        3
                      </div>
                      <span>কুরিয়ারে</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-slate-200 mx-1" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
                        4
                      </div>
                      <span>ডেলিভার্ড</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 py-1.5 px-4 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('all');
            setIsWishlistOnly(false);
            setSearchQuery('');
            scrollToTop();
          }}
          className="flex flex-col items-center gap-0.5 text-teal-800"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-bold">হোম</span>
        </button>

        <button
          type="button"
          onClick={() => {
            mobileSearchInputRef.current?.focus();
            scrollToTop();
          }}
          className="flex flex-col items-center gap-0.5 text-slate-600"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">সার্চ</span>
        </button>

        <button
          type="button"
          onClick={() => setIsTrackModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-slate-600"
        >
          <Truck className="w-5 h-5" />
          <span className="text-[10px] font-bold">ট্র্যাক</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsCartOpen(true);
            setIsCheckoutStep(false);
          }}
          className="flex flex-col items-center gap-0.5 text-teal-800 relative"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-amber-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
          <span className="text-[10px] font-bold">কার্ট</span>
        </button>
      </div>

      {/* FOOTER */}
      <footer className="mt-auto bg-slate-900 text-white text-xs py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-sm text-emerald-400">TwingHisabi Central Marketplace Mall</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              দেশের সকল পাইকারি ও খুচরা ভেন্ডরদের সাথে সংযুক্ত ডিজিটাল ই-কমার্স নেটওয়ার্ক।
            </p>
          </div>
          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} TwingHisabi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
