import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  Store,
  Share2,
  User,
  Heart,
  Bell,
  Menu,
  Headphones,
  Lock,
  Gift,
  CheckCircle,
  Eye,
  ShoppingCart,
  Zap,
  TrendingUp,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  MarketplaceProduct,
  MarketplaceCartItem,
  MarketplaceMasterOrder,
  Product,
  OnlineStoreConfig,
} from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import { formatMoney } from '../../utils/storage';
import { getStoredUser } from '../../services/apiService';
import { subscribeToPaymentSettings, INITIAL_PAYMENT_SETTINGS } from '../../services/adminService';
import { SystemPaymentSettings } from '../../types/adminTypes';

import { MarketplaceProductDetailModal } from './MarketplaceProductDetailModal';
import { MarketplaceVendorStoreModal } from './MarketplaceVendorStoreModal';
import { MarketplaceCartCheckoutDrawer } from './MarketplaceCartCheckoutDrawer';
import { CustomerAccountView, getStoredCustomer, getCustomerOrdersStorageKey } from './CustomerAccountView';
import { MarketplaceLiveTrackingMap } from './MarketplaceLiveTrackingMap';
import { StorefrontSupportDrawer } from '../storefront/StorefrontSupportDrawer';
import { StorefrontNotificationDrawer } from '../storefront/StorefrontNotificationDrawer';

// Storage keys
const MKT_WISHLIST_KEY = 'twing_marketplace_wishlist';
const MKT_CART_KEY = 'twing_marketplace_cart';
const MKT_CUSTOMER_ORDERS_KEY = 'twing_marketplace_customer_orders_v1';

// 12 Exact Categories for Left Sidebar matching screenshot
const SIDEBAR_CATEGORIES = [
  { id: 'cat_all', nameBn: 'সব পণ্য', match: 'all', icon: '🛍️', color: 'text-indigo-500' },
  { id: 'cat_food', nameBn: 'চাল, ডাল ও গ্রোসারি', match: 'চাল ও ডাল', icon: '🌾', color: 'text-emerald-500' },
  { id: 'cat_tea', nameBn: 'চা, বিস্কুট ও বেকারি', match: 'চা ও বিস্কুট', icon: '☕', color: 'text-amber-500' },
  { id: 'cat_elec', nameBn: 'ইলেকট্রনিক্স ও গ্যাজেট', match: 'ইলেকট্রনিক্স ও গ্যাজেট', icon: '🔌', color: 'text-teal-500' },
  { id: 'cat_mobile', nameBn: 'মোবাইল ও এক্সেসরিজ', match: 'মোবাইল ও এক্সেসরিজ', icon: '📱', color: 'text-blue-500' },
  { id: 'cat_health', nameBn: 'স্বাস্থ্য ও ফার্মেসি', match: 'স্বাস্থ্য ও ফার্মেসি', icon: '➕', color: 'text-rose-500' },
  { id: 'cat_fashion', nameBn: 'ফ্যাশন ও পোশাক', match: 'ফ্যাশন ও পোশাক', icon: '👕', color: 'text-purple-500' },
  { id: 'cat_home', nameBn: 'গৃহস্থালী পণ্য', match: 'গৃহস্থালী পণ্য', icon: '🏠', color: 'text-amber-500' },
  { id: 'cat_beauty', nameBn: 'বিউটি ও পার্সোনাল কেয়ার', match: 'বিউটি ও পার্সোনাল কেয়ার', icon: '🧴', color: 'text-pink-500' },
  { id: 'cat_baby', nameBn: 'খেলনা ও বেবি প্রোডাক্ট', match: 'খেলনা ও বেবি প্রোডাক্ট', icon: '🧸', color: 'text-orange-500' },
  { id: 'cat_kitchen', nameBn: 'কিচেন ও ডাইনিং', match: 'কিচেন ও ডাইনিং', icon: '🍳', color: 'text-emerald-500' },
  { id: 'cat_others', nameBn: 'অন্যান্য পণ্য', match: 'অন্যান্য', icon: '🔲', color: 'text-slate-500' },
];

// 10 Exact Circular Categories below Hero Banner (Exact Marketplace Styling)
const CIRCULAR_CATEGORIES = [
  { id: 'circ_all', nameBn: 'সব পণ্য', icon: '🛍️', match: 'all', bg: 'bg-indigo-50 border border-indigo-100/80 text-[#0052cc] shadow-2xs', text: 'text-[#0052cc]' },
  { id: 'circ_grocery', nameBn: 'গ্রোসারি', icon: '🌾', match: 'চাল ও ডাল', bg: 'bg-emerald-50 border border-emerald-100/80 text-emerald-600 shadow-2xs', text: 'text-emerald-600' },
  { id: 'circ_tea', nameBn: 'চা-বিস্কুট', icon: '☕', match: 'চা ও বিস্কুট', bg: 'bg-amber-50 border border-amber-100/80 text-amber-600 shadow-2xs', text: 'text-amber-600' },
  { id: 'circ_gadget', nameBn: 'ইলেকট্রনিক্স', icon: '⚡', match: 'ইলেকট্রনিক্স ও গ্যাজেট', bg: 'bg-blue-50 border border-blue-100/80 text-[#0052cc] shadow-2xs', text: 'text-[#0052cc]' },
  { id: 'circ_mobile', nameBn: 'মোবাইল', icon: '📱', match: 'মোবাইল ও এক্সেসরিজ', bg: 'bg-sky-50 border border-sky-100/80 text-sky-600 shadow-2xs', text: 'text-sky-600' },
  { id: 'circ_health', nameBn: 'স্বাস্থ্য', icon: '➕', match: 'স্বাস্থ্য ও ফার্মেসি', bg: 'bg-rose-50 border border-rose-100/80 text-rose-600 shadow-2xs', text: 'text-rose-600' },
  { id: 'circ_fashion', nameBn: 'ফ্যাশন', icon: '👕', match: 'ফ্যাশন ও পোশাক', bg: 'bg-purple-50 border border-purple-100/80 text-purple-600 shadow-2xs', text: 'text-purple-600' },
  { id: 'circ_home', nameBn: 'গৃহস্থালী', icon: '🛋️', match: 'গৃহস্থালী পণ্য', bg: 'bg-indigo-50 border border-indigo-100/80 text-indigo-600 shadow-2xs', text: 'text-indigo-600' },
  { id: 'circ_beauty', nameBn: 'বিউটি', icon: '🧴', match: 'বিউটি ও পার্সোনাল কেয়ার', bg: 'bg-pink-50 border border-pink-100/80 text-pink-600 shadow-2xs', text: 'text-pink-600' },
  { id: 'circ_others', nameBn: 'অন্যান্য', icon: '🔲', match: 'অন্যান্য', bg: 'bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs', text: 'text-[#6b7280]' },
];



// Reusable High-Fidelity Product Card Component matching exact Arogga/Marketplace layout
interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  onAddToCart: (p: MarketplaceProduct, e: React.MouseEvent) => void;
  onClick: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
  badgeText?: string;
  badgeBg?: string;
  showSaveAmount?: boolean;
  cartQuantity?: number;
  onUpdateQuantity?: (id: string, delta: number, e: React.MouseEvent) => void;
}

const MarketplaceProductCard: React.FC<MarketplaceProductCardProps> = ({
  product,
  onAddToCart,
  onClick,
  isWishlisted,
  onToggleWishlist,
  badgeText,
  badgeBg = 'bg-[#009b77]',
  cartQuantity = 0,
  onUpdateQuantity,
}) => {
  const discount = product.discountPercent || 0;
  // If discount >= 20% show red lightning tag; if < 20% show blue tag (matches screenshot)
  const isRedTag = discount >= 20 || badgeText?.includes('ফ্ল্যাশ') || badgeText?.includes('অফার');

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition duration-200 cursor-pointer relative group h-full select-none"
    >
      <div>
        {/* Full-bleed Product Image: fills the frame edge-to-edge with NO blank side spaces */}
        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
          {/* Top Hanging Badge matching screenshot */}
          {discount > 0 ? (
            isRedTag ? (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-[#e62e2d] text-white font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-b-lg inline-flex items-center gap-0.5 shadow-2xs tracking-tight">
                  <span className="text-[10px]">⚡</span> {discount}% OFF
                </span>
              </div>
            ) : (
              <div className="absolute top-0 left-2 z-10">
                <span className="bg-[#0284c7] text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-b-md shadow-2xs leading-tight">
                  {discount}% OFF
                </span>
              </div>
            )
          ) : badgeText ? (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <span className={`text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-b-lg inline-flex items-center gap-0.5 shadow-2xs ${badgeBg}`}>
                {badgeText}
              </span>
            </div>
          ) : null}

          {/* Top-Right Wishlist Heart */}
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product.id, e)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-2xs transition cursor-pointer z-10"
            title={isWishlisted ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় যুক্ত করুন'}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-500'
              }`}
            />
          </button>

          {/* Product Image: Full Bleed object-cover */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>

        {/* Product Details Section Below */}
        <div className="p-2.5 sm:p-3 pb-0 space-y-1">
          {/* 12-24 Hours Delivery Pill matching screenshot */}
          <div className="mb-1 flex items-center">
            <span className="inline-flex items-center gap-1 bg-slate-100/90 text-slate-700 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md">
              <span className="text-xs">🚀</span>
              <span>12-24 HOURS</span>
            </span>
          </div>

          {/* Product Title (2-line clamped) */}
          <h3 className="text-xs sm:text-[13px] font-medium text-slate-900 line-clamp-2 leading-snug min-h-[34px] sm:min-h-[38px] group-hover:text-[#009b77] transition">
            {product.name}
          </h3>

          {/* Twing Hisabi Verified Vendor Badge */}
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold truncate pt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">টুইং ভেরিফাইড: {product.vendorShopName || 'ভেরিফাইড মার্চেন্ট'}</span>
          </div>

          {/* Rating Stars & Count (e.g. ★ ★ ★ ★ ★ (0)) */}
          <div className="flex items-center gap-1 text-[11px] pt-1">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => {
                const isFilled = (product.rating || 0) >= i + 1;
                return (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      isFilled
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              ({product.reviewCount || 0})
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Price & ADD Button matching screenshot */}
      <div className="p-2.5 sm:p-3 pt-2 flex items-end justify-between gap-2 mt-auto">
        {/* Price Column */}
        <div className="flex flex-col">
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            ৳{product.salePrice}
          </div>
          {product.originalPrice && product.originalPrice > product.salePrice && (
            <div className="text-xs text-slate-400 line-through leading-tight">
              ৳{product.originalPrice}
            </div>
          )}
        </div>

        {/* ADD Button or Quantity Stepper */}
        {cartQuantity > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center border border-[#009b77] rounded-xl overflow-hidden bg-[#009b77]/5"
          >
            <button
              type="button"
              onClick={(e) => onUpdateQuantity && onUpdateQuantity(product.id, -1, e)}
              className="px-2.5 py-1 text-[#009b77] hover:bg-[#009b77] hover:text-white font-black text-xs transition cursor-pointer"
            >
              −
            </button>
            <span className="px-2 text-xs font-bold text-[#009b77]">
              {cartQuantity}
            </span>
            <button
              type="button"
              onClick={(e) => onUpdateQuantity && onUpdateQuantity(product.id, 1, e)}
              className="px-2.5 py-1 text-[#009b77] hover:bg-[#009b77] hover:text-white font-black text-xs transition cursor-pointer"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="border-[1.5px] border-[#009b77] hover:bg-[#009b77] text-[#009b77] hover:text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl transition duration-150 cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center min-w-[64px]"
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
};

interface CentralMarketplacePageProps {
  onMerchantLogin?: () => void;
  onBackToDashboard?: () => void;
}

export const CentralMarketplacePage: React.FC<CentralMarketplacePageProps> = ({
  onMerchantLogin,
  onBackToDashboard,
}) => {
  // Navigation & View state
  const [navTab, setNavTab] = useState<'home' | 'vendors' | 'offers' | 'bestselling' | 'new' | 'orders' | 'support'>('home');
  const [mobileBottomTab, setMobileBottomTab] = useState<'home' | 'categories' | 'cart' | 'orders' | 'account'>('home');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Products & Vendors (strictly real verified Twing Hisabi merchants)
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Drawers state
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedVendorStore, setSelectedVendorStore] = useState<{ id: string; name: string } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isCustomerAccountOpen, setIsCustomerAccountOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [highlightPackageId, setHighlightPackageId] = useState<string | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [customerAccountTab, setCustomerAccountTab] = useState<'profile' | 'orders' | 'login' | 'register'>('profile');
  const [verifiedCustomer, setVerifiedCustomer] = useState(() => getStoredCustomer());

  // Cart state - strictly user's real saved cart
  const [cart, setCart] = useState<MarketplaceCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_CART_KEY);
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer Orders state - strictly isolated by customer phone
  const [customerOrders, setCustomerOrders] = useState<MarketplaceMasterOrder[]>(() => {
    try {
      const cust = getStoredCustomer();
      if (!cust || !cust.phone) return [];
      const saved = localStorage.getItem(getCustomerOrdersStorageKey(cust.phone));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync customer orders when verifiedCustomer changes (login, logout, switch number)
  useEffect(() => {
    if (!verifiedCustomer || !verifiedCustomer.phone) {
      setCustomerOrders([]);
      return;
    }
    try {
      const saved = localStorage.getItem(getCustomerOrdersStorageKey(verifiedCustomer.phone));
      if (saved) {
        setCustomerOrders(JSON.parse(saved));
      } else {
        setCustomerOrders([]);
      }
    } catch {
      setCustomerOrders([]);
    }
  }, [verifiedCustomer?.phone]);

  // Tracking query state
  const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
  const [queriedOrder, setQueriedOrder] = useState<MarketplaceMasterOrder | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2800);
  };

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings>(INITIAL_PAYMENT_SETTINGS);

  // Marketplace Global Settings (Banners & Ads controlled by Super Admin)
  const [marketplaceSettings, setMarketplaceSettings] = useState<any>(null);

  // Current logged in user
  const currentUser = getStoredUser();

  // Load Marketplace Settings (Banners & Ads) and listen for realtime updates
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const res = await marketplaceApi.getSettings();
        if (isMounted && res?.settings) {
          setMarketplaceSettings(res.settings);
        }
      } catch {}
    }
    loadSettings();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/realtime');
      es.addEventListener('marketplace_updated', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.settings) {
            setMarketplaceSettings(payload.settings);
          }
        } catch {}
      });
    } catch {}

    return () => {
      isMounted = false;
      if (es) es.close();
    };
  }, []);

  const [isSliderHovered, setIsSliderHovered] = useState(false);

  // Dynamic Super Admin Hero Banners & Promotional Ads
  const heroBanners = useMemo(() => {
    const list = marketplaceSettings?.banners || [];
    const active = list.filter((b: any) => b.isActive !== false && (b.placement === 'hero_slider' || !b.placement));
    if (active.length > 0) return active;
    return [
      {
        id: 'default_hero_1',
        title: marketplaceSettings?.bannerTitle || 'মেগা সেভার কম্বো প্যাকেজ ও স্পেশাল ধামাকা অফার',
        subtitle: marketplaceSettings?.bannerSubtitle,
        tag: marketplaceSettings?.bannerTag,
        imageUrl: marketplaceSettings?.bannerImageUrl || '/src/assets/images/mkt_clean_hero_banner_1791439411244.jpg',
        linkUrl: marketplaceSettings?.bannerLink || '#marketplace-package-deals',
        buttonText: marketplaceSettings?.bannerButtonText || 'এখনই অর্ডার করুন',
      },
      {
        id: 'default_hero_2',
        title: 'স্মার্ট ইলেকট্রনিক্স ও গ্যাজেট প্যাকেজ অফার',
        imageUrl: '/src/assets/images/marketplace_hero_gadgets_1791135706091.jpg',
        linkUrl: '#marketplace-package-deals',
      },
      {
        id: 'default_hero_3',
        title: '১০০% অরিজিনাল গ্রোসারি ও অরগানিক খাদ্য প্যাকেজ',
        imageUrl: '/src/assets/images/marketplace_artisan_ghee_1790221157459.jpg',
        linkUrl: '#marketplace-package-deals',
      },
    ];
  }, [marketplaceSettings]);

  const middleBanners = useMemo(() => {
    const list = marketplaceSettings?.banners || [];
    return list.filter((b: any) => b.isActive !== false && b.placement === 'middle_strip');
  }, [marketplaceSettings]);
  const middleBanner = middleBanners[0];

  const sidebarAds = useMemo(() => {
    const list = marketplaceSettings?.banners || [];
    return list.filter((b: any) => b.isActive !== false && b.placement === 'sidebar_ad');
  }, [marketplaceSettings]);
  const sidebarAd = sidebarAds[0];

  const bottomBanners = useMemo(() => {
    const list = marketplaceSettings?.banners || [];
    return list.filter((b: any) => b.isActive !== false && b.placement === 'bottom_banner');
  }, [marketplaceSettings]);
  const bottomBanner = bottomBanners[0];

  // Auto-slide Hero Banners with Super Admin controls
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    if (marketplaceSettings?.autoSlideEnabled === false) return;
    if (isSliderHovered && marketplaceSettings?.pauseOnHover !== false) return;
    const intervalTime = Number(marketplaceSettings?.sliderInterval) || 5000;
    const interval = setInterval(() => {
      setCurrentSlide((c) => (c + 1) % heroBanners.length);
    }, intervalTime);
    return () => clearInterval(interval);
  }, [
    heroBanners.length,
    marketplaceSettings?.autoSlideEnabled,
    marketplaceSettings?.sliderInterval,
    marketplaceSettings?.pauseOnHover,
    isSliderHovered,
  ]);

  // Synchronize Selected Product with Live URL (?product=...)
  const handleSelectProduct = (product: MarketplaceProduct | null) => {
    setSelectedProduct(product);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (product) {
        url.searchParams.set('product', product.id);
        window.history.replaceState({}, '', url.toString());
      } else {
        url.searchParams.delete('product');
        url.searchParams.delete('productId');
        url.searchParams.delete('p');
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  // Direct Product URL resolution on mount / navigation
  useEffect(() => {
    let isCancelled = false;
    async function checkUrlProduct() {
      if (typeof window === 'undefined') return;
      const searchParams = new URLSearchParams(window.location.search);
      const urlProdId = searchParams.get('product') || searchParams.get('productId') || searchParams.get('p');

      let targetId = urlProdId;
      if (!targetId) {
        const pathMatch = window.location.pathname.match(/\/(?:marketplace\/)?(?:product|p)\/([a-zA-Z0-9_-]+)/);
        if (pathMatch && pathMatch[1]) {
          targetId = pathMatch[1];
        }
      }

      if (targetId) {
        // Check already loaded products first
        const local = products.find((p) => p.id === targetId || (p as any).sku === targetId);
        if (local) {
          setSelectedProduct(local);
          return;
        }
        // Fetch direct live product from API
        try {
          const res = await marketplaceApi.getProductById(targetId);
          if (!isCancelled && res.success && res.product) {
            setSelectedProduct(res.product);
          }
        } catch {}
      }
    }

    checkUrlProduct();
    window.addEventListener('popstate', checkUrlProduct);
    return () => {
      isCancelled = true;
      window.removeEventListener('popstate', checkUrlProduct);
    };
  }, [products.length]);

  // Save Cart to storage
  useEffect(() => {
    try {
      localStorage.setItem(MKT_CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Save Wishlist to storage
  useEffect(() => {
    try {
      localStorage.setItem(MKT_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds]);

  // Load products feed strictly from real verified Twing Hisabi vendors
  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      setIsLoading(true);
      try {
        const res = await marketplaceApi.getFeed({
          search: searchQuery.trim() || undefined,
        });
        if (isMounted && res?.success && Array.isArray(res.products)) {
          setProducts(res.products);
        }
      } catch (e) {
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadFeed();
    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Load verified Twing Hisabi vendors strictly from database
  useEffect(() => {
    let isMounted = true;
    async function loadVendors() {
      try {
        const res = await marketplaceApi.getVendors();
        if (isMounted && res?.success && Array.isArray(res.vendors)) {
          setVendors(res.vendors);
        }
      } catch (e) {
        if (isMounted) setVendors([]);
      }
    }
    loadVendors();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load dynamic marketplace categories (including vendor-created categories)
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      try {
        const res = await marketplaceApi.getCategories();
        if (isMounted && res?.success && Array.isArray(res.categories)) {
          setDynamicCategories(res.categories);
        }
      } catch (e) {
        if (isMounted) setDynamicCategories([]);
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to Unified Payment Settings
  useEffect(() => {
    const unsub = subscribeToPaymentSettings((data) => {
      if (data) setPaymentSettings(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Ensure entire document and browser status bar have pure white background
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.backgroundColor = '#ffffff';

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const prevThemeColor = themeColorMeta?.getAttribute('content') || '#033b31';
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#ffffff');
    }

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', prevThemeColor);
      }
    };
  }, []);

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    const mktProd = product as MarketplaceProduct;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { product: mktProd, quantity }];
    });
    showToast(`🛍️ '${product.name}' কার্টে যুক্ত হয়েছে!`);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as MarketplaceCartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
    showToast('পণ্যটি কার্ট থেকে সরানো হয়েছে');
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    addToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? 'পছন্দের তালিকা থেকে বাদ দেওয়া হয়েছে' : '❤️ পছন্দের তালিকায় যুক্ত হয়েছে!');
      return next;
    });
  };

  // Track order submit
  const handleTrackOrder = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const query = (customTarget || trackingSearchQuery).trim();
    if (!query) return;

    setIsTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await marketplaceApi.trackOrder(query);
      if (res?.success && res.order) {
        setQueriedOrder(res.order);
      } else {
        setQueriedOrder(null);
        setTrackingError('অর্ডার পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর বা মোবাইল নম্বর দিন।');
      }
    } catch (err: any) {
      setTrackingError(err.message || 'অর্ডার ট্র্যাক করতে সমস্যা হয়েছে');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Support config
  const supportConfig: OnlineStoreConfig = useMemo(() => ({
    isEnabled: true,
    storeSlug: 'central-marketplace',
    storeName: 'TWING Marketplace',
    tagline: 'সবার জন্য, সবার পছন্দ',
    category: 'সকল ক্যাটাগরি',
    announcement: '',
    phone: paymentSettings?.bkash?.personal?.number || '01306908115',
    whatsappPhone: paymentSettings?.bkash?.personal?.number || '01306908115',
    address: 'ঢাকা, বাংলাদেশ',
    deliveryInsideDhaka: 70,
    deliveryOutsideDhaka: 130,
    logoUrl: '',
    themeColor: 'indigo',
    acceptCOD: true,
    acceptBkash: true,
    acceptNagad: true,
    acceptRocket: true,
    acceptUpay: true,
    acceptBank: true,
  }), [paymentSettings]);

  // 1. Flash Sale Countdown Timer (Hours : Minutes : Seconds ticking every second)
  const [flashSaleCountdown, setFlashSaleCountdown] = useState({
    hours: 7,
    minutes: 28,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSaleCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59, hours: Math.max(0, prev.hours - 1) };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Horizontal scroll refs for popular vendors and trending products
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const delta = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Section 8: All Products (Quick Category filter & Load More)
  const [allProductsVisibleCount, setAllProductsVisibleCount] = useState(8);
  const [allProductsCategory, setAllProductsCategory] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setAllProductsVisibleCount((c) => c + 4);
      setIsLoadingMore(false);
    }, 350);
  };

  // Memoized product subsets for the 8 marketplace sections
  const flashSaleProducts = useMemo(() => {
    const discounted = products.filter((p) => (p.discountPercent || 0) >= 15);
    return discounted.length >= 4 ? discounted.slice(0, 4) : products.slice(0, 4);
  }, [products]);

  const popularProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
  }, [products]);

  const trendingProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  }, [products]);

  const recommendedProducts = useMemo(() => {
    if (products.length >= 8) {
      return [products[4], products[5], products[6], products[7]].filter(Boolean);
    }
    return products.slice(0, 4);
  }, [products]);

  const newArrivalProducts = useMemo(() => {
    if (products.length >= 12) {
      return [products[8], products[9], products[10], products[11]].filter(Boolean);
    }
    return [...products].reverse().slice(0, 4);
  }, [products]);

  // Dynamically merge system categories, vendor-created categories, and catalog product categories
  const mergedSidebarCategories = useMemo(() => {
    const list = [...SIDEBAR_CATEGORIES];
    const existingIds = new Set(list.map((c) => c.id));
    const existingNames = new Set(list.map((c) => c.nameBn.trim().toLowerCase()));

    const isKnownCategory = (id: string, name: string) => {
      if (existingIds.has(id)) return true;
      const lower = name.toLowerCase();
      if (existingNames.has(lower)) return true;
      if ((id === 'cat_fashion' || lower.includes('ফ্যাশন') || lower.includes('পোশাক')) && existingIds.has('cat_fashion')) return true;
      if ((id === 'cat_beauty' || lower.includes('বিউটি') || lower.includes('রূপচর্চা') || lower.includes('প্রসাধন')) && existingIds.has('cat_beauty')) return true;
      if ((id === 'cat_home' || lower.includes('গৃহস্থাল') || lower.includes('রান্নাঘর')) && existingIds.has('cat_home')) return true;
      if ((id === 'cat_health' || lower.includes('স্বাস্থ্য') || lower.includes('মেডিসিন') || lower.includes('ফার্মেসি') || lower.includes('ওষুধ')) && existingIds.has('cat_health')) return true;
      if ((id === 'cat_grocery' || id === 'cat_food' || lower.includes('মুদি') || lower.includes('গ্রোসারি')) && existingIds.has('cat_food')) return true;
      if ((id === 'cat_elec' || id === 'cat_electronics' || lower.includes('ইলেকট্রনিক্স')) && existingIds.has('cat_elec')) return true;
      return false;
    };

    dynamicCategories.forEach((dc, idx) => {
      const name = (dc.nameBn || dc.name_bn || dc.nameEn || '').trim();
      const rawId = dc.id || `dyn_${idx}`;
      if (!name) return;

      if (!isKnownCategory(rawId, name)) {
        let uniqueId = rawId;
        if (existingIds.has(uniqueId)) {
          uniqueId = `dyn_${rawId}_${idx}`;
        }
        existingIds.add(uniqueId);
        existingNames.add(name.toLowerCase());
        list.push({
          id: uniqueId,
          nameBn: name,
          match: name,
          icon: dc.icon || '🛍️',
          color: 'text-teal-600',
        });
      }
    });

    products.forEach((p, idx) => {
      const pCat = p.category ? p.category.trim() : '';
      if (pCat && !isKnownCategory(`prod_cat_${pCat}`, pCat)) {
        let uniqueId = `prod_cat_${pCat}`;
        if (existingIds.has(uniqueId)) {
          uniqueId = `prod_cat_${pCat}_${idx}`;
        }
        existingIds.add(uniqueId);
        existingNames.add(pCat.toLowerCase());
        list.push({
          id: uniqueId,
          nameBn: pCat,
          match: pCat,
          icon: '📦',
          color: 'text-blue-600',
        });
      }
    });

    return list;
  }, [dynamicCategories, products]);

  const mergedCircularCategories = useMemo(() => {
    const list = [...CIRCULAR_CATEGORIES];
    const existingIds = new Set(list.map((c) => c.id));
    const existingMatches = new Set(list.map((c) => c.match.trim().toLowerCase()));

    const isKnownCircular = (id: string, name: string) => {
      if (existingIds.has(id)) return true;
      const lower = name.toLowerCase();
      if (existingMatches.has(lower)) return true;
      if ((id.includes('fashion') || lower.includes('ফ্যাশন') || lower.includes('পোশাক')) && existingIds.has('circ_fashion')) return true;
      if ((id.includes('beauty') || lower.includes('বিউটি') || lower.includes('রূপচর্চা')) && existingIds.has('circ_beauty')) return true;
      if ((id.includes('home') || lower.includes('গৃহস্থাল') || lower.includes('রান্নাঘর')) && existingIds.has('circ_home')) return true;
      if ((id.includes('health') || lower.includes('স্বাস্থ্য') || lower.includes('মেডিসিন') || lower.includes('ফার্মেসি')) && existingIds.has('circ_health')) return true;
      if ((id.includes('grocery') || id.includes('food') || lower.includes('মুদি') || lower.includes('গ্রোসারি')) && existingIds.has('circ_grocery')) return true;
      if ((id.includes('gadget') || id.includes('electronics') || lower.includes('ইলেকট্রনিক্স')) && existingIds.has('circ_gadget')) return true;
      return false;
    };

    dynamicCategories.forEach((dc, idx) => {
      const name = (dc.nameBn || dc.name_bn || dc.nameEn || '').trim();
      const rawId = dc.id || `circ_dyn_${idx}`;
      if (!name) return;

      if (!isKnownCircular(rawId, name)) {
        let uniqueId = rawId.startsWith('circ_') ? rawId : `circ_${rawId}`;
        if (existingIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${idx}`;
        }
        existingIds.add(uniqueId);
        existingMatches.add(name.toLowerCase());
        list.push({
          id: uniqueId,
          nameBn: name.length > 8 ? name.slice(0, 7) + '...' : name,
          icon: dc.icon || '🛍️',
          match: name,
          bg: 'bg-emerald-50 border border-emerald-100/80 text-emerald-600 shadow-2xs',
          text: 'text-emerald-600',
        });
      }
    });

    products.forEach((p, idx) => {
      const pCat = p.category ? p.category.trim() : '';
      if (pCat && !isKnownCircular(`circ_prod_${pCat}`, pCat)) {
        let uniqueId = `circ_prod_${pCat}`;
        if (existingIds.has(uniqueId)) {
          uniqueId = `${uniqueId}_${idx}`;
        }
        existingIds.add(uniqueId);
        existingMatches.add(pCat.toLowerCase());
        list.push({
          id: uniqueId,
          nameBn: pCat.length > 8 ? pCat.slice(0, 7) + '...' : pCat,
          icon: '📦',
          match: pCat,
          bg: 'bg-teal-50 border border-teal-100/80 text-teal-600 shadow-2xs',
          text: 'text-teal-600',
        });
      }
    });

    return list;
  }, [dynamicCategories, products]);

  // Robust Category selection handler with smooth scroll
  const handleCategorySelect = (categoryKey: string) => {
    const next = selectedCategory === categoryKey ? 'all' : categoryKey;
    setSelectedCategory(next);
    setAllProductsCategory(next);
    setAllProductsVisibleCount(12);

    setTimeout(() => {
      if (next !== 'all') {
        const catEl = document.getElementById('marketplace-category-view');
        if (catEl) {
          catEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      const allEl = document.getElementById('marketplace-all-products');
      if (allEl) {
        allEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Robust category filtered products with multi-keyword synonym support
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    const target = selectedCategory.trim().toLowerCase();

    const aliases: Record<string, string[]> = {
      'চাল ও ডাল': ['চাল', 'ডাল', 'মুদি', 'গ্রোসারি', 'খাদ্য', 'সেলাইন'],
      'চাল, ডাল ও গ্রোসারি': ['চাল', 'ডাল', 'মুদি', 'গ্রোসারি', 'খাদ্য', 'সেলাইন'],
      'গ্রোসারি': ['চাল', 'ডাল', 'মুদি', 'গ্রোসারি', 'খাদ্য', 'সেলাইন', 'তেল', 'ঘি'],
      'চা ও বিস্কুট': ['চা', 'বিস্কুট', 'বেকারি', 'স্ন্যাক্স', 'খাবার', 'ডেনিস', 'ফিস্ট'],
      'চা, বিস্কুট ও বেকারি': ['চা', 'বিস্কুট', 'বেকারি', 'স্ন্যাক্স', 'খাবার', 'ডেনিস', 'ফিস্ট'],
      'চা-বিস্কুট': ['চা', 'বিস্কুট', 'বেকারি', 'স্ন্যাক্স', 'খাবার', 'ডেনিস', 'ফিস্ট'],
      'ইলেকট্রনিক্স': ['ইলেকট্রনিক্স', 'গ্যাজেট', 'ক্যালকুলেটর', 'স্মার্ট', 'ফোন'],
      'ইলেকট্রনিক্স ও গ্যাজেট': ['ইলেকট্রনিক্স', 'গ্যাজেট', 'ক্যালকুলেটর', 'স্মার্ট', 'ফোন'],
      'কম্পিউটার ও গ্যাজেট': ['কম্পিউটার', 'ল্যাপটপ', 'গ্যাজেট', 'ইলেকট্রনিক্স', 'ক্যালকুলেটর'],
      'মোবাইল': ['মোবাইল', 'ফোন', 'এক্সেসরিজ'],
      'মোবাইল ও এক্সেসরিজ': ['মোবাইল', 'ফোন', 'এক্সেসরিজ'],
      'স্বাস্থ্য': ['স্বাস্থ্য', 'ফার্মেসি', 'সেলাইন', 'ওষুধ', 'মেডিসিন'],
      'স্বাস্থ্য ও ফার্মেসি': ['স্বাস্থ্য', 'ফার্মেসি', 'সেলাইন', 'ওষুধ', 'মেডিসিন'],
      'ফ্যাশন': ['পোশাক', 'ফ্যাশন', 'শার্ট', 'শাড়ি', 'জামা'],
      'ফ্যাশন ও পোশাক': ['পোশাক', 'ফ্যাশন', 'শার্ট', 'শাড়ি', 'জামা'],
      'গৃহস্থালী': ['গৃহস্থাল', 'হোম', 'ফার্নিচার', 'ঘর'],
      'গৃহস্থালী পণ্য': ['গৃহস্থাল', 'হোম', 'ফার্নিচার', 'ঘর'],
      'বিউটি': ['বিউটি', 'প্রসাধন', 'লোশন', 'ক্রিম'],
      'বিউটি ও পার্সোনাল কেয়ার': ['বিউটি', 'প্রসাধন', 'লোশন', 'ক্রিম'],
      'অন্যান্য': ['অন্যান্য', 'সাধারণ', 'কোকা কোলা', 'রুটি', 'ডেনিস'],
      'অন্যান্য পণ্য': ['অন্যান্য', 'সাধারণ', 'কোকা কোলা', 'রুটি', 'ডেনিস'],
    };

    const targetAliases = aliases[target] || [target];

    return products.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();

      if (pCat === target || pCat.includes(target) || target.includes(pCat)) return true;
      return targetAliases.some((alias) => pCat.includes(alias) || pName.includes(alias) || pDesc.includes(alias));
    });
  }, [products, selectedCategory]);

  const filteredAllProducts = useMemo(() => {
    if (allProductsCategory === 'all') {
      return selectedCategory !== 'all' ? categoryFilteredProducts : products;
    }
    const target = allProductsCategory.trim().toLowerCase();
    return products.filter((p) => {
      const pCat = (p.category || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return pCat.includes(target) || target.includes(pCat) || pName.includes(target);
    });
  }, [products, allProductsCategory, selectedCategory, categoryFilteredProducts]);

  const displayedAllProducts = useMemo(() => {
    return filteredAllProducts.slice(0, allProductsVisibleCount);
  }, [filteredAllProducts, allProductsVisibleCount]);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans text-slate-800 antialiased selection:bg-[#0052cc] selection:text-white">
      {/* Toast Alert */}
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

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (EXACT PIXEL-MATCH TO SCREENSHOT) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo & Tagline Container */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Logo */}
            <div
              onClick={() => {
                setNavTab('home');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              {/* Blue shopping bag with stylized curved gradient handle */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0052cc] to-[#0284c7] text-white flex items-center justify-center shadow-sm relative overflow-hidden">
                <ShoppingBag className="w-5 h-5 text-white" />
                <div className="absolute top-1 w-3 h-2 border-2 border-amber-300 rounded-t-full" />
              </div>

              <div className="flex flex-col -space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0052cc]">TWING</span>
                </div>
                <span className="text-xs font-black tracking-wide text-[#ea580c]">Marketplace</span>
              </div>
            </div>

            {/* Tagline beside logo */}
            <div className="hidden xl:block text-xs font-medium text-slate-500 pl-3 border-l border-slate-200">
              সবাইয়ের জন্য, সবার পছন্দ
            </div>
          </div>

          {/* Large Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder="পণ্য, ব্র্যান্ড বা ভেন্ডরের নাম খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-[#0052cc] focus:bg-white transition shadow-2xs placeholder:text-slate-400"
              />
              <button
                type="button"
                className="absolute right-1 p-2 bg-[#0052cc] hover:bg-blue-700 text-white rounded-lg transition cursor-pointer flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0 text-slate-700">
            {/* Customer Account & Authentication Buttons */}
            {verifiedCustomer?.isVerified ? (
              <button
                type="button"
                onClick={() => {
                  setCustomerAccountTab('profile');
                  setIsCustomerAccountOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0052cc] transition cursor-pointer"
                title="কাস্টমার প্রোফাইল ও অর্ডার"
              >
                <div className="relative">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                </div>
                <span className="hidden sm:inline font-bold">
                  {verifiedCustomer.name || 'আমার প্রোফাইল'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerAccountTab('login');
                    setIsCustomerAccountOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-[#0052cc] hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>লগইন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerAccountTab('register');
                    setIsCustomerAccountOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-black bg-[#0052cc] text-white hover:bg-blue-700 rounded-lg transition shadow-2xs cursor-pointer hidden xs:inline-flex items-center gap-1"
                >
                  <span>রেজিস্ট্রেশন</span>
                </button>
              </div>
            )}

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => showToast(`পছন্দের তালিকায় ${wishlistIds.length} টি পণ্য রয়েছে`)}
              className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0052cc] transition cursor-pointer"
            >
              <Heart className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">পছন্দের তালিকা</span>
            </button>

            {/* Notification with red badge 3 */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-1 hover:text-[#0052cc] transition cursor-pointer"
              title="নোটিফিকেশন"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Shopping Cart with red badge 2 */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 hover:text-[#0052cc] transition cursor-pointer relative"
              title="কার্ট"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold">কার্ট</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden px-4 pb-2.5 pt-0.5">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              placeholder="পণ্য, ব্র্যান্ড বা ভেন্ডরের নাম খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="button"
              className="absolute right-1 p-1.5 bg-[#0052cc] text-white rounded-md"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN HORIZONTAL NAVIGATION BAR (DESKTOP) */}
      {/* ========================================================================= */}
      <nav className="hidden md:block bg-white border-b border-slate-200 text-xs sm:text-sm font-bold shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center">
          {/* Blue "সব ক্যাটাগরি" Button on Left */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-[#0052cc] hover:bg-blue-700 text-white font-black tracking-wide rounded-t-lg transition cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span>সব ক্যাটাগরি</span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 ml-6 py-2">
            {[
              { id: 'home', label: 'হোম' },
              { id: 'vendors', label: 'সকল ভেন্ডর' },
              { id: 'offers', label: 'অফার' },
              { id: 'bestselling', label: 'বেস্ট সেলিং' },
              { id: 'new', label: 'নতুন পণ্য' },
              { id: 'orders', label: 'আমার অর্ডার' },
              { id: 'support', label: 'সাহায্য কেন্দ্র' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'support') {
                    setIsSupportOpen(true);
                  } else {
                    setNavTab(tab.id as any);
                    if (tab.id === 'home') {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }
                  }
                }}
                className={`py-1 cursor-pointer transition relative whitespace-nowrap ${
                  navTab === tab.id
                    ? 'text-[#0052cc] font-black after:content-[""] after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#0052cc]'
                    : 'text-slate-700 hover:text-[#0052cc]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard link if available */}
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <span>দোকানের ড্যাশবোর্ড</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: 3-COLUMN LAYOUT EXACT MATCH */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-5 space-y-6 pb-24 md:pb-10">
        {navTab === 'vendors' ? (
          /* All Verified Twing Hisabi Vendors View */
          <div className="max-w-6xl mx-auto w-full space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    TWING হিসাবি ভেরিফাইড ভেন্ডরসমূহ
                  </h2>
                  <p className="text-xs text-slate-500">
                    সরাসরি টুইংহিসাবি দ্বারা অনুমোদিত ও যাচাইকৃত ভেরিফাইড মার্চেন্টদের তালিকা
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 text-center flex flex-col items-center justify-between hover:shadow-md hover:border-emerald-500/50 transition shadow-2xs group"
                >
                  <div className="relative mb-2.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xl font-black shadow-xs">
                      {vendor.name ? vendor.name.charAt(0) : 'T'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1 w-full">
                    <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>টুইং ভেরিফাইড</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {vendor.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{vendor.category}</p>
                    <div className="text-[10px] text-slate-400 truncate flex items-center justify-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{vendor.address}</span>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-[10px] text-amber-500 pt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-700">{vendor.rating || 4.8}</span>
                      <span className="text-slate-400">({vendor.reviews || '৫০+'})</span>
                    </div>

                    <div className="pt-1">
                      <span className="inline-block text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                        📦 {vendor.productCount}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedVendorStore({ id: vendor.id, name: vendor.name })}
                    className="mt-3 w-full py-1.5 bg-[#009b77] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>শপ দেখুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : navTab === 'orders' ? (
          /* Customer Personal Orders & Live Tracking View */
          <div className="max-w-4xl mx-auto w-full space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#0052cc]/30 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      আমার সেন্ট্রাল মার্কেটপ্লেস অর্ডার ({customerOrders.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      {verifiedCustomer ? `নম্বর: ${verifiedCustomer.phone} • ভেরিফাইড ক্রেতা` : 'আপনার অর্ডারের লাইভ ডেলিভারি ও প্রসেসিং স্ট্যাটাস'}
                    </p>
                  </div>
                </div>
                {verifiedCustomer ? (
                  <button
                    onClick={() => {
                      if (verifiedCustomer.phone) {
                        marketplaceApi.getCustomerOrders(verifiedCustomer.phone).then((r) => {
                          if (r.success && Array.isArray(r.orders)) {
                            const cleanPhone = verifiedCustomer.phone.replace(/[^\d]/g, '').slice(-10);
                            const strictlyMine = r.orders.filter((o: any) => {
                              const oPhone = String(o.customerPhone || o.customer_phone || '').replace(/[^\d]/g, '');
                              return oPhone.endsWith(cleanPhone);
                            });
                            setCustomerOrders(strictlyMine);
                            localStorage.setItem(getCustomerOrdersStorageKey(verifiedCustomer.phone), JSON.stringify(strictlyMine));
                            showToast('অর্ডার তালিকা রিফ্রেশ হয়েছে');
                          }
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>রিফ্রেশ</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCustomerAccountTab('login');
                      setIsCustomerAccountOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <span>লগইন করুন</span>
                  </button>
                )}
              </div>

              {/* If customer is NOT logged in, show helpful prompt */}
              {!verifiedCustomer && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-extrabold text-blue-900">💡 আপনার অর্ডার তালিকা দেখতে চান?</p>
                    <p className="text-blue-700 text-[11px]">
                      আপনার মোবাইল নম্বর দিয়ে পাসওয়ার্ড ছাড়া ১-ক্লিকে ওটিপি দিয়ে লগইন করুন অথবা নিচে অর্ডার নম্বর দিয়ে ট্র্যাক করুন।
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCustomerAccountTab('login');
                      setIsCustomerAccountOpen(true);
                    }}
                    className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black rounded-xl cursor-pointer shrink-0"
                  >
                    ওটিপি লগইন করুন
                  </button>
                </div>
              )}

              {/* Quick Search / Track by Order Number */}
              <form onSubmit={handleTrackOrder} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="অর্ডার নম্বর দিয়ে খুঁজুন (যেমন: #MKT-123456)..."
                  value={trackingSearchQuery}
                  onChange={(e) => setTrackingSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]"
                />
                <button
                  type="submit"
                  disabled={isTrackingLoading || !trackingSearchQuery.trim()}
                  className="px-5 py-2 bg-[#0052cc] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isTrackingLoading ? 'লোড হচ্ছে...' : 'ট্র্যাক করুন'}
                </button>
              </form>

              {trackingError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {trackingError}
                </div>
              )}
            </div>

            {/* Live queried order display */}
            {queriedOrder && (
              <MarketplaceLiveTrackingMap
                order={queriedOrder}
                isLiveUpdating={false}
                onRefresh={() => handleTrackOrder(undefined, queriedOrder.orderNumber || queriedOrder.id)}
                onCopyText={(txt) => {
                  navigator.clipboard.writeText(txt);
                  showToast('কপি করা হয়েছে!');
                }}
              />
            )}

            {/* List of customer's strictly own orders */}
            {verifiedCustomer && customerOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  আপনার সংরক্ষিত অর্ডারসমূহ ({customerOrders.length})
                </h3>
                <div className="space-y-3">
                  {customerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900 text-xs flex items-center gap-2">
                            <span>#{ord.orderNumber || ord.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                ord.overallStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.overallStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.overallStatus === 'delivered'
                                ? 'ডেলিভার্ড'
                                : ord.overallStatus === 'cancelled'
                                ? 'বাতিল'
                                : 'প্রক্রিয়াধীন'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleString('bn-BD') : ''} • পেমেন্ট: {ord.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : ord.paymentMethod}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-[#0052cc]">
                            ৳ {formatMoney(ord.grandTotal || 0)}
                          </div>
                          <button
                            onClick={() => {
                              setTrackingSearchQuery(ord.orderNumber || ord.id);
                              handleTrackOrder(undefined, ord.orderNumber || ord.id);
                            }}
                            className="mt-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-[11px] font-black rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>লাইভ ট্র্যাক</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-orders / items summary */}
                      {Array.isArray(ord.subOrders) && ord.subOrders.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-600">
                            ভেন্ডর শপ: {ord.subOrders.map((s: any) => s.vendorShopName).filter(Boolean).join(', ')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ord.subOrders.map((sub: any, sIdx: number) => (
                              <div
                                key={sub.id || sIdx}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 font-medium"
                              >
                                {sub.vendorShopName}: <span className="font-bold">{sub.status || 'প্রক্রিয়াধীন'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when customer has 0 orders */}
            {verifiedCustomer && customerOrders.length === 0 && !queriedOrder && (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">কোনো অর্ডার পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  আপনার এই মোবাইল নম্বর দিয়ে সেন্ট্রাল মার্কেটপ্লেসে এখনও কোনো অর্ডার দেওয়া হয়নি।
                </p>
                <button
                  onClick={() => setNavTab('home')}
                  className="px-4 py-2 bg-[#0052cc] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition cursor-pointer"
                >
                  কেনাকাটা শুরু করুন
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* TOP 3-COLUMN HERO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* ------------------------------------------------------------- */}
              {/* LEFT COLUMN: Categories List (~20% width = 3/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto no-scrollbar">
                  {mergedSidebarCategories.map((cat, idx) => {
                    const isSideActive = selectedCategory === cat.match || selectedCategory === cat.nameBn || (cat.match === 'all' && selectedCategory === 'all') || allProductsCategory === cat.nameBn;
                    return (
                      <button
                        key={cat.id ? `side_${cat.id}` : `side_${idx}`}
                        type="button"
                        onClick={() => handleCategorySelect(cat.match || cat.nameBn)}
                        className={`w-full px-3.5 py-2 text-left text-xs font-medium transition flex items-center justify-between cursor-pointer group ${
                          isSideActive
                            ? 'bg-blue-50 text-[#0052cc] font-black border-l-3 border-[#0052cc] shadow-2xs'
                            : 'bg-white text-slate-700 hover:text-[#0052cc] hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat.icon}</span>
                          <span className="truncate">{cat.nameBn}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0052cc] transition" />
                      </button>
                    );
                  })}
                </div>

                {/* Super Admin Sponsored Sidebar Ad */}
                {sidebarAd && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (sidebarAd.linkUrl?.startsWith('#')) {
                        const target = document.querySelector(sidebarAd.linkUrl);
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                      } else if (sidebarAd.linkUrl?.includes('?product=')) {
                        const pId = new URL(sidebarAd.linkUrl, window.location.origin).searchParams.get('product');
                        if (pId) {
                          const prod = products.find((x) => x.id === pId);
                          if (prod) handleSelectProduct(prod);
                        }
                      } else if (sidebarAd.linkUrl) {
                        window.location.href = sidebarAd.linkUrl;
                      }
                    }}
                    className="p-3 bg-gradient-to-br from-amber-50/70 to-orange-50/60 border-t border-slate-200 cursor-pointer group transition hover:bg-amber-100/60"
                  >
                    {sidebarAd.imageUrl && (
                      <div className="h-20 w-full rounded-xl overflow-hidden mb-2 shadow-2xs">
                        <img
                          src={sidebarAd.imageUrl}
                          alt={sidebarAd.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {sidebarAd.tag && (
                      <span className="inline-block px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 text-[9px] font-black uppercase mb-1">
                        {sidebarAd.tag}
                      </span>
                    )}
                    <h5 className="font-black text-slate-900 text-xs line-clamp-1 group-hover:text-[#0052cc]">
                      {sidebarAd.title}
                    </h5>
                    {sidebarAd.subtitle && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                        {sidebarAd.subtitle}
                      </p>
                    )}
                    {sidebarAd.advertiserName && (
                      <span className="text-[9px] text-slate-400 font-bold block mt-1">
                        {sidebarAd.advertiserName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CENTER COLUMN: Hero Slider Banner & 10 Circular Categories (6/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="col-span-1 lg:col-span-6 space-y-3.5">
                {/* Hero Banner Container - Clean Image Button with Pure Visuals */}
                {(() => {
                  const b = heroBanners[currentSlide % heroBanners.length] || heroBanners[0];
                  const totalSlides = heroBanners.length;
                  const heightCls = marketplaceSettings?.bannerHeight === 'compact'
                    ? 'h-[95px] sm:h-[120px] md:h-[145px] lg:h-[155px]'
                    : marketplaceSettings?.bannerHeight === 'tall'
                    ? 'h-[125px] sm:h-[155px] md:h-[185px] lg:h-[210px]'
                    : 'h-[110px] sm:h-[135px] md:h-[160px] lg:h-[175px]';

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setIsSliderHovered(true)}
                      onMouseLeave={() => setIsSliderHovered(false)}
                      onClick={() => {
                        const targetId = b.linkUrl || '#marketplace-package-deals';
                        if (targetId.startsWith('#')) {
                          const target = document.querySelector(targetId);
                          if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setHighlightPackageId('pkg_active');
                            setTimeout(() => setHighlightPackageId(null), 2500);
                          } else {
                            const el = document.getElementById('marketplace-all-products');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }
                        } else if (targetId.includes('?product=')) {
                          const pId = new URL(targetId, window.location.origin).searchParams.get('product');
                          if (pId) {
                            const prod = products.find((x) => x.id === pId);
                            if (prod) handleSelectProduct(prod);
                            else {
                              marketplaceApi.getProductById(pId).then((r) => {
                                if (r.success && r.product) handleSelectProduct(r.product);
                              });
                            }
                          }
                        } else if (targetId) {
                          window.location.href = targetId;
                        } else {
                          const el = document.getElementById('marketplace-package-deals') || document.getElementById('marketplace-all-products');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                      onTouchEnd={(e) => {
                        if (touchStartX === null) return;
                        const diff = touchStartX - e.changedTouches[0].clientX;
                        if (diff > 45) {
                          setCurrentSlide((c) => (c < totalSlides - 1 ? c + 1 : 0));
                        } else if (diff < -45) {
                          setCurrentSlide((c) => (c > 0 ? c - 1 : totalSlides - 1));
                        }
                        setTouchStartX(null);
                      }}
                      className={`relative rounded-xl sm:rounded-2xl overflow-hidden w-full ${heightCls} shadow-xs border border-slate-200/80 group cursor-pointer select-none transition transform active:scale-[0.98] bg-slate-100`}
                      title={b.title ? `${b.title} - প্যাকেজ দেখতে ক্লিক করুন` : 'প্যাকেজ দেখতে ক্লিক করুন'}
                    >
                      {/* 1. FULL-BLEED CLEAN BANNER IMAGE (NO TEXT OVERLAID) */}
                      <img
                        key={b.id || currentSlide}
                        src={b.imageUrl || '/src/assets/images/mkt_clean_hero_banner_1791439411244.jpg'}
                        alt={b.title || 'Marketplace Hero Banner'}
                        className="w-full h-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/src/assets/images/mkt_clean_hero_banner_1791439411244.jpg';
                        }}
                      />

                      {/* 2. SLIDER CONTROLS (STOP PROPAGATION SO SLIDE CHANGES SMOOTHLY) */}
                      {totalSlides > 1 && (
                        <>
                          {marketplaceSettings?.showSliderArrows !== false && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentSlide((c) => (c > 0 ? c - 1 : totalSlides - 1));
                                }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm cursor-pointer"
                                title="পূর্ববর্তী ব্যানার"
                                aria-label="Previous Slide"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentSlide((c) => (c < totalSlides - 1 ? c + 1 : 0));
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-sm cursor-pointer"
                                title="পরবর্তী ব্যানার"
                                aria-label="Next Slide"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Minimal sleek dots indicator */}
                          {marketplaceSettings?.showSliderDots !== false && (
                            <div
                              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {heroBanners.map((_, dot) => (
                                <button
                                  key={dot}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentSlide(dot);
                                  }}
                                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                    currentSlide === dot
                                      ? 'w-5 sm:w-6 bg-white shadow-xs'
                                      : 'w-1.5 bg-white/50 hover:bg-white/80'
                                  }`}
                                  aria-label={`Slide ${dot + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Circular Categories Row (Includes Dynamic Vendor Categories) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs">
                  <div className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1 text-center items-start">
                    {mergedCircularCategories.map((cat, idx) => {
                      const isCatActive = selectedCategory === cat.match || selectedCategory === cat.nameBn || (cat.match === 'all' && selectedCategory === 'all') || allProductsCategory === cat.match;
                      return (
                        <button
                          key={cat.id ? `circ_${cat.id}` : `circ_${idx}`}
                          type="button"
                          onClick={() => handleCategorySelect(cat.match || cat.nameBn)}
                          className="flex flex-col items-center gap-1 cursor-pointer group p-1 rounded-xl transition min-w-[58px] sm:min-w-[64px] shrink-0"
                        >
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg transition-all group-hover:scale-110 shadow-2xs ${
                              isCatActive
                                ? 'bg-[#0052cc] text-white ring-2 ring-[#0052cc] ring-offset-2 scale-105 shadow-md'
                                : cat.bg
                            }`}
                          >
                            {cat.icon}
                          </div>
                          <span
                            className={`text-[10px] font-bold line-clamp-1 transition ${
                              isCatActive
                                ? 'text-[#0052cc] font-black'
                                : 'text-slate-700 group-hover:text-[#0052cc]'
                            }`}
                          >
                            {cat.nameBn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* RIGHT COLUMN: User Card, Promo Box, 4 Service Cards & Vendor CTA (3/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="hidden lg:block lg:col-span-3 space-y-3">
                {/* 1. Customer User / Guest Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-900">
                        {verifiedCustomer ? 'স্বাগতম' : 'স্বাগতম অতিথি ক্রেতা'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {verifiedCustomer?.name || 'কেনাকাটা করতে একাউন্ট করুন'}
                      </div>
                    </div>
                  </div>

                  {verifiedCustomer ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerAccountTab('profile');
                          setIsCustomerAccountOpen(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>আমার প্রোফাইল দেখুন</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerAccountTab('login');
                          setIsCustomerAccountOpen(true);
                        }}
                        className="w-full py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>লগইন করুন (পাসওয়ার্ড ছাড়া)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerAccountTab('register');
                            setIsCustomerAccountOpen(true);
                          }}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
                        >
                          নতুন একাউন্ট
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerAccountTab('login');
                            setIsCustomerAccountOpen(true);
                          }}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
                        >
                          Google লগইন
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-bold">
                    <div
                      onClick={() => setNavTab('orders')}
                      className="flex items-center gap-2 hover:text-[#0052cc] cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>আমার অর্ডার</span>
                    </div>
                    <div
                      onClick={() => showToast(`পছন্দের তালিকায় ${wishlistIds.length} টি পণ্য রয়েছে`)}
                      className="flex items-center gap-2 hover:text-[#0052cc] cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                      <span>আমার পছন্দের তালিকা</span>
                    </div>
                    <div
                      onClick={() => {
                        setCustomerAccountTab(verifiedCustomer ? 'profile' : 'login');
                        setIsCustomerAccountOpen(true);
                      }}
                      className="flex items-center justify-between hover:text-[#0052cc] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{verifiedCustomer ? 'আমার অ্যাকাউন্ট' : 'লগইন / রেজিস্টার'}</span>
                      </div>
                      {verifiedCustomer?.isVerified && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                          ভেরিফাইড
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. New User Registration Promo Box (Clean White) */}
                <div className="rounded-2xl p-3 bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 text-purple-600 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    🎁
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-900">নতুন ক্রেতা?</div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerAccountTab('register');
                        setIsCustomerAccountOpen(true);
                      }}
                      className="px-2.5 py-0.5 bg-[#0052cc] text-white text-[10px] font-black rounded-md shadow-2xs hover:bg-blue-700 cursor-pointer"
                    >
                      রেজিস্ট্রেশন করুন
                    </button>
                    <div className="text-[9px] text-slate-500">পাসওয়ার্ড ছাড়া সহজ কেনাকাটা!</div>
                  </div>
                </div>

                {/* 3. Four Service Cards (Clean White) */}
                <div className="space-y-1.5">
                  {/* Card 1: দ্রুত ডেলিভারি */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">দ্রুত ডেলিভারি</div>
                        <div className="text-[9px] text-slate-500">সারা বাংলাদেশে</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 2: 100% নিরাপদ লেনদেন */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">100% নিরাপদ লেনদেন</div>
                        <div className="text-[9px] text-slate-500">বিশ্বস্ত পেমেন্ট সিস্টেম</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 3: বিশ্বস্ত ভেন্ডর */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#0052cc] text-white flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">বিশ্বস্ত ভেন্ডর</div>
                        <div className="text-[9px] text-slate-500">প্রত্যেক ভেন্ডর যাচাই করা</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 4: ২৪/৭ সাপোর্ট */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                        <Headphones className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">২৪/৭ সাপোর্ট</div>
                        <div className="text-[9px] text-slate-500">সাহায্য সবসময়</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>
                </div>

                {/* 4. Vendor CTA Card (Clean White) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 relative overflow-hidden shadow-2xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      আপনি কি ভেন্ডর হতে চান?
                    </h4>
                    <p className="text-[10px] text-slate-600 leading-snug">
                      আপনার দোকান বা ব্র্যান্ড নিয়ে আসুন TWING Marketplace-এ আর পৌঁছে যান লাখো গ্রাহকের কাছে।
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onMerchantLogin || onBackToDashboard}
                      className="px-3 py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      এখনই রেজিস্ট্রেশন করুন →
                    </button>
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                      <img
                        src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                        alt="TWING Courier"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Category Filter View */}
            {selectedCategory !== 'all' && (
              <section id="marketplace-category-view" className="space-y-4 pt-2">
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0052cc] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold">নির্বাচিত ক্যাটাগরি:</span>
                        <span className="px-3 py-1 rounded-full bg-[#0052cc] text-white text-xs font-black shadow-2xs">
                          {selectedCategory}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {categoryFilteredProducts.length > 0
                          ? `এই ক্যাটাগরিতে ${categoryFilteredProducts.length} টি পণ্য পাওয়া গেছে`
                          : 'এই ক্যাটাগরিতে বর্তমানে কোনো পণ্য পাওয়া যায়নি'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setAllProductsCategory('all');
                    }}
                    className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>ফিল্টার মুছুন / সব পণ্য দেখুন</span>
                  </button>
                </div>

                {categoryFilteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {categoryFilteredProducts.map((prod) => (
                      <MarketplaceProductCard
                        key={prod.id}
                        product={prod}
                        onAddToCart={(p, e) => {
                          e.stopPropagation();
                          addToCart(p, 1);
                        }}
                        onClick={() => handleSelectProduct(prod)}
                        isWishlisted={wishlistIds.includes(prod.id)}
                        onToggleWishlist={(id, e) => {
                          e.stopPropagation();
                          handleToggleWishlist(id);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 sm:p-12 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-2xs">
                    <div className="text-5xl">🛍️</div>
                    <h3 className="text-base font-black text-slate-800">
                      '{selectedCategory}' ক্যাটাগরিতে শীঘ্রই নতুন কালেকশন যুক্ত হচ্ছে
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      আমাদের ভেন্ডররা দ্রুত নতুন পণ্য যুক্ত করছেন। আপনি নিচের প্যাকেজ ও অন্যান্য আকর্ষণীয় পণ্য দেখতে পারেন।
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setAllProductsCategory('all');
                      }}
                      className="px-5 py-2.5 bg-[#0052cc] text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition cursor-pointer"
                    >
                      সকল পণ্য দেখুন
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ========================================================================= */}
            {/* 🎁 স্পেশাল প্যাকেজ ও ধামাকা ডিল (Package Deals linked to Hero Banner Button) */}
            {/* ========================================================================= */}
            <section
              id="marketplace-package-deals"
              className={`space-y-3.5 pt-2 transition-all duration-500 rounded-3xl p-2 sm:p-3 ${
                highlightPackageId === 'pkg_active'
                  ? 'ring-4 ring-[#0052cc] ring-offset-2 bg-blue-50/60 shadow-lg'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
                    🎁
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        স্পেশাল প্যাকেজ ও ধামাকা অফার
                      </h2>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider shadow-2xs">
                        কম্বো প্যাকেজ
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      ব্যানারের আকর্ষণীয় প্যাকেজগুলো কিনুন সবচেয়ে কম খরচে ও বিশেষ ছাড়ে!
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>প্যাকেজে অতিরিক্ত ছাড় ও উপহার</span>
                </div>
              </div>

              {/* Package Deal Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Package 1 */}
                <div className="bg-white rounded-2xl border border-slate-200 hover:border-[#0052cc] p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md transition duration-200 relative group">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                        ⚡ ধামাকা সেভিংস
                      </span>
                      <span className="text-xs font-bold text-slate-400">৪ টি আইটেম</span>
                    </div>

                    <div className="h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center p-1">
                      <img
                        src="/src/assets/images/mkt_clean_hero_banner_1791439411244.jpg"
                        alt="গ্রোসারি ও টি-টাইম ফ্যামিলি প্যাক"
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0052cc] transition">
                        মেগা ফ্যামিলি টি-টাইম ও স্ন্যাক্স প্যাকেজ
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ফিস্ট বিস্কুট + ডেনিস + কোকা কোলা ৪০০মিলি + অলটাইম রুটি
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>১০০% অথেনটিক ফ্রেশ আইটেম</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>দ্রুত ক্যাশ অন ডেলিভারি সুবিধা</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-900">৳২৭০</div>
                      <div className="text-xs text-slate-400 line-through">৳৩১০</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const itemsToAdd = products.filter((p) =>
                          ['ফিস্ট বিস্কুট', 'ডেনিস', 'কোকা কোলা ৪০০মিলি', 'অলটাইম রুটি'].includes(p.name)
                        );
                        if (itemsToAdd.length > 0) {
                          itemsToAdd.forEach((item) => addToCart(item, 1));
                        } else if (products.length > 0) {
                          addToCart(products[0], 2);
                        }
                        setIsCartOpen(true);
                        showToast('🎁 প্যাকেজের পণ্যগুলো কার্টে যুক্ত হয়েছে!');
                      }}
                      className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>প্যাকেজটি কিনুন</span>
                    </button>
                  </div>
                </div>

                {/* Package 2 */}
                <div className="bg-white rounded-2xl border border-slate-200 hover:border-[#0052cc] p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md transition duration-200 relative group">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-blue-50 text-[#0052cc] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-200">
                        💻 স্মার্ট গ্যাজেট
                      </span>
                      <span className="text-xs font-bold text-slate-400">টপ রেটেড</span>
                    </div>

                    <div className="h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center p-1">
                      <img
                        src="/src/assets/images/marketplace_hero_gadgets_1791135706091.jpg"
                        alt="স্মার্ট গ্যাজেট প্যাকেজ"
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0052cc] transition">
                        স্মার্ট ইলেকট্রনিক্স ও স্টুডেন্ট অফিস প্যাক
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ডিজিটাল ক্যালকুলেটর + গ্যাজেট ও ইলেকট্রনিক সামগ্রী
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>টুইং ভেরিফাইড অফিসিয়াল ওয়ারেন্টি</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>দ্রুত ডেলিভারি ও রিপ্লেসমেন্ট গ্যারান্টি</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-900">৳৩৯০</div>
                      <div className="text-xs text-slate-400 line-through">৳৪৫০</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const gadget = products.find((p) => p.name.includes('ক্যালকুলেটর')) || products[0];
                        if (gadget) addToCart(gadget, 1);
                        setIsCartOpen(true);
                        showToast('🎁 স্মার্ট গ্যাজেট প্যাকেজ কার্টে যুক্ত হয়েছে!');
                      }}
                      className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>প্যাকেজটি কিনুন</span>
                    </button>
                  </div>
                </div>

                {/* Package 3 */}
                <div className="bg-white rounded-2xl border border-slate-200 hover:border-[#0052cc] p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md transition duration-200 relative group">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                        🌾 অর্গানিক খাদ্য
                      </span>
                      <span className="text-xs font-bold text-slate-400">১০০% খাঁটি</span>
                    </div>

                    <div className="h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center p-1">
                      <img
                        src="/src/assets/images/marketplace_artisan_ghee_1790221157459.jpg"
                        alt="অর্গানিক গ্রোসারি প্যাক"
                        className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-500"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0052cc] transition">
                        প্রিমিয়াম ডেইলি গ্রোসারি ও হেলথ সেভার প্যাক
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        স্বাস্থ্যকর ওআরএস সেলাইন + খাঁটি খাদ্য ও প্রয়োজনীয় আইটেম
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>সেরা মানের হাইজিনিক প্যাকেজিং</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span>
                        <span>সরাসরি বিশ্বস্ত মার্চেন্ট থেকে প্রেরিত</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-black text-slate-900">৳১৯০</div>
                      <div className="text-xs text-slate-400 line-through">৳২২০</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const item = products.find((p) => p.name.includes('সেলাইন')) || products[0];
                        if (item) addToCart(item, 2);
                        setIsCartOpen(true);
                        showToast('🎁 গ্রোসারি প্যাকেজ কার্টে যুক্ত হয়েছে!');
                      }}
                      className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>প্যাকেজটি কিনুন</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 1. 🔥 আজকের অফার / Flash Sale */}
            {/* ========================================================================= */}
            <section id="marketplace-flash-sale" className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-orange-200 text-orange-600 flex items-center justify-center font-bold shadow-2xs">
                    <Flame className="w-4 h-4 fill-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        আজকের অফার / Flash Sale
                      </h2>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider animate-pulse">
                        হট ডিল
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      সীমিত সময়ের জন্য বিশেষ মূল্যছাড় ও সাশ্রয়ী ডিল
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="flex items-center gap-1.5 bg-white border border-rose-200 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-700 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-[11px] hidden xs:inline font-medium">শেষ হতে বাকি:</span>
                    <div className="flex items-center gap-1 font-mono font-black text-xs">
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.hours).padStart(2, '0')}
                      </span>
                      <span className="text-rose-600 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-rose-600 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.seconds).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('marketplace-all-products');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                  >
                    <span>সব দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2-Column Product Grid (Responsive: 2 cols on mobile, 4 on desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {flashSaleProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => handleSelectProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="🔥 ফ্ল্যাশ সেল"
                    badgeBg="bg-rose-600"
                    showSaveAmount={true}
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 2. 🛍️ জনপ্রিয় পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      জনপ্রিয় পণ্য
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      গ্রাহকদের সবচেয়ে পছন্দের ও সেরা রেটেড পণ্যসমূহ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid (Responsive) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {popularProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => handleSelectProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="⭐ টপ রেটেড"
                    badgeBg="bg-amber-600"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 3. 🏪 জনপ্রিয় ভেন্ডার / শপ */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      জনপ্রিয় ভেন্ডার / শপ
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      যাচাইকৃত শীর্ষস্থানীয় অনলাইন শপসমূহ থেকে সরাসরি কিনুন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Desktop scroll arrows */}
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(vendorScrollRef, 'left')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                      title="আগেরগুলো"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(vendorScrollRef, 'right')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                      title="পরেরগুলো"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNavTab('vendors')}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>সকল ভেন্ডর</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll Layout */}
              <div
                ref={vendorScrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth"
              >
                {vendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="w-44 sm:w-52 shrink-0 bg-white rounded-2xl border border-slate-200/90 p-4 text-center flex flex-col items-center justify-between hover:shadow-md hover:border-emerald-500/50 transition shadow-2xs group"
                  >
                    {/* Logo with verified badge */}
                    <div className="relative mb-2.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center text-xl font-black shadow-xs">
                        {vendor.name ? vendor.name.charAt(0) : 'T'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs" title="টুইংহিসাবি ভেরিফাইড ভেন্ডর">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Shop Info */}
                    <div className="space-y-1 w-full">
                      <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>টুইং ভেরিফাইড</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {vendor.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">{vendor.category}</p>

                      <div className="flex items-center justify-center gap-1 text-[10px] text-amber-500 pt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-700">{vendor.rating || 4.8}</span>
                        <span className="text-slate-400">({vendor.reviews || '৫০+'})</span>
                      </div>

                      {/* Product count */}
                      <div className="pt-1">
                        <span className="inline-block text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                          📦 {vendor.productCount}
                        </span>
                      </div>
                    </div>

                    {/* Visit Shop Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVendorStore({ id: vendor.id, name: vendor.name })
                      }
                      className="mt-3 w-full py-1.5 bg-[#009b77] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>শপ দেখুন</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 4. 📈 ট্রেন্ডিং পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-purple-200 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        ট্রেন্ডিং পণ্য
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-purple-200 text-purple-700 hidden xs:inline shadow-2xs">
                        বেশি বিক্রিত
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      এই মুহূর্তে সবচেয়ে বেশি বিক্রি ও অনুসন্ধানে থাকা পণ্যসমূহ
                    </p>
                  </div>
                </div>

                {/* Desktop scroll arrows */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollHorizontally(trendingScrollRef, 'left')}
                    className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                    title="আগেরগুলো"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollHorizontally(trendingScrollRef, 'right')}
                    className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                    title="পরেরগুলো"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('marketplace-all-products');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>সব দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrolling Product Cards */}
              <div
                ref={trendingScrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth"
              >
                {trendingProducts.map((prod, idx) => (
                  <div key={prod.id} className="w-44 sm:w-52 shrink-0">
                    <MarketplaceProductCard
                      product={prod}
                      onAddToCart={(p, e) => {
                        e.stopPropagation();
                        addToCart(p, 1);
                      }}
                      onClick={() => setSelectedProduct(prod)}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={(id, e) => {
                        e.stopPropagation();
                        handleToggleWishlist(id);
                      }}
                      badgeText={`#${idx + 1} ট্রেন্ডিং`}
                      badgeBg="bg-purple-600"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. 🎁 বিশেষ অফার (Promotional Banner - Super Admin Controlled) */}
            {/* ========================================================================= */}
            {middleBanners.length > 0 ? (
              <section className="pt-2">
                <div className={`grid gap-4 ${middleBanners.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {middleBanners.map((mBanner: any, mIdx: number) => (
                    <div
                      key={mBanner.id || mIdx}
                      className="relative rounded-2xl overflow-hidden bg-white text-slate-800 p-5 sm:p-6 shadow-xs border-2 border-[#0052cc]/30 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="relative z-10 space-y-2 flex-1 text-center sm:text-left">
                        {mBanner.tag && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-black tracking-wide border border-amber-300 text-amber-700 shadow-2xs">
                            <Gift className="w-3.5 h-3.5 text-amber-600" />
                            <span>{mBanner.tag}</span>
                          </div>
                        )}

                        <h3 className="text-lg sm:text-xl font-black leading-tight tracking-tight text-[#0052cc]">
                          {mBanner.title || 'সারা বাংলাদেশে ফ্রি ডেলিভারি + আকর্ষণীয় অফার!'}
                        </h3>

                        {mBanner.subtitle && (
                          <p className="text-xs text-slate-600 font-medium line-clamp-2">
                            {mBanner.subtitle}
                          </p>
                        )}

                        <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                          {/* Copyable Coupon Badge */}
                          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-dashed border-[#0052cc] shadow-2xs">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">ভাউচার:</span>
                            <span className="font-mono font-black text-xs text-[#0052cc] tracking-wider">
                              TWINGFREE
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText('TWINGFREE');
                                showToast('🎉 কুপন কোড TWINGFREE কপি করা হয়েছে!');
                              }}
                              className="p-1 hover:bg-slate-100 rounded-md transition text-slate-600 cursor-pointer"
                              title="কপি করুন"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const dest = mBanner.linkUrl || '#marketplace-all-products';
                              if (dest.startsWith('#')) {
                                const target = document.querySelector(dest);
                                if (target) target.scrollIntoView({ behavior: 'smooth' });
                              } else if (dest.includes('?product=')) {
                                const pId = new URL(dest, window.location.origin).searchParams.get('product');
                                if (pId) {
                                  const prod = products.find((x) => x.id === pId);
                                  if (prod) handleSelectProduct(prod);
                                  else {
                                    marketplaceApi.getProductById(pId).then((r) => {
                                      if (r.success && r.product) handleSelectProduct(r.product);
                                    });
                                  }
                                }
                              } else if (dest) {
                                window.location.href = dest;
                              }
                            }}
                            className="px-4 py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{mBanner.buttonText || 'অফার উপভোগ করুন'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Right Illustration */}
                      {mBanner.imageUrl && (
                        <div className="relative z-10 shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white">
                          <img
                            src={mBanner.imageUrl}
                            alt={mBanner.title || 'Marketplace Offer'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                '/src/assets/images/marketplace_courier_vendor_1791135724375.jpg';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="pt-2">
                <div className="relative rounded-2xl overflow-hidden bg-white text-slate-800 p-5 sm:p-7 shadow-xs border-2 border-[#0052cc]/30 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="relative z-10 space-y-2 max-w-xl text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-black tracking-wide border border-amber-300 text-amber-700 shadow-2xs">
                      <Gift className="w-3.5 h-3.5 text-amber-600" />
                      <span>বিশেষ মেগা অফার ২০২৫</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight tracking-tight text-[#0052cc]">
                      সারা বাংলাদেশে ফ্রি ডেলিভারি + সর্বোচ্চ ৩০% ছাড়!
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      TWING Marketplace-এ কেনাকাটা করুন নিশ্চিন্তে। প্রথম অর্ডারে কুপন কোড ব্যবহার করে উপভোগ করুন বিশেষ ছাড়।
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-dashed border-[#0052cc] shadow-2xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">ভাউচার কোড:</span>
                        <span className="font-mono font-black text-xs text-[#0052cc] tracking-wider">
                          TWINGFREE
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('TWINGFREE');
                            showToast('🎉 কুপন কোড TWINGFREE কপি করা হয়েছে!');
                          }}
                          className="p-1 hover:bg-slate-100 rounded-md transition text-slate-600 cursor-pointer"
                          title="কপি করুন"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('marketplace-all-products');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-5 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>এখনই অফার উপভোগ করুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 shrink-0 w-32 sm:w-44 md:w-52 flex items-center justify-center">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white flex items-center justify-center p-1">
                      <img
                        src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                        alt="TWING Mega Offer"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 6. ⭐ আপনার জন্য নির্বাচিত */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        আপনার জন্য নির্বাচিত
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-800 hidden xs:inline shadow-2xs">
                        স্মার্ট রিকমেন্ডেশন
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      আপনার ব্রাউজিং ও পছন্দের ওপর ভিত্তি করে সেরা বাছাই
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {recommendedProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="⭐ রিকমেন্ডেড"
                    badgeBg="bg-[#0052cc]"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 7. 🆕 নতুন পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-teal-200 text-teal-700 flex items-center justify-center font-bold shadow-2xs">
                    <Zap className="w-4 h-4 fill-teal-600 text-teal-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        নতুন পণ্য
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-teal-200 text-teal-800 hidden xs:inline shadow-2xs">
                        সদ্য যুক্ত
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      মার্কেটপ্লেসে সদ্য পাবলিশ হওয়া নতুন ও আধুনিক পণ্যসমূহ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {newArrivalProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="🆕 নতুন"
                    badgeBg="bg-teal-600"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 8. 🛒 সব পণ্য (2-column responsive grid with Load More) */}
            {/* ========================================================================= */}
            <section id="marketplace-all-products" className="space-y-3.5 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      সব পণ্য
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      মার্কেটপ্লেসের সমস্ত ক্যাটাগরি ও শীর্ষ ভেন্ডরদের পূর্ণাঙ্গ কালেকশন
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  মোট {filteredAllProducts.length} টি পণ্য পাওয়া গেছে
                </div>
              </div>

              {/* Category Quick Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {mergedSidebarCategories.map((cat, idx) => {
                  const chipId = cat.match || cat.nameBn;
                  const isChipActive =
                    (allProductsCategory === chipId || (allProductsCategory === 'all' && selectedCategory === chipId)) ||
                    (allProductsCategory === 'all' && chipId === 'all' && selectedCategory === 'all');
                  return (
                    <button
                      key={cat.id ? `chip_${cat.id}` : `chip_${idx}`}
                      type="button"
                      onClick={() => handleCategorySelect(chipId)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                        isChipActive
                          ? 'bg-[#0052cc] text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.nameBn}</span>
                    </button>
                  );
                })}
              </div>

              {/* 2-Column Responsive Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {displayedAllProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                  />
                ))}
              </div>

              {/* Load More Button */}
              <div className="pt-4 flex flex-col items-center justify-center gap-2">
                {displayedAllProducts.length < filteredAllProducts.length ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 bg-white hover:bg-slate-50 text-[#0052cc] border border-blue-200 hover:border-[#0052cc] font-black text-xs sm:text-sm rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
                    <span>
                      {isLoadingMore
                        ? 'লোড হচ্ছে...'
                        : `আরও পণ্য দেখুন / Load More (${displayedAllProducts.length}/${filteredAllProducts.length})`}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>সব পণ্য প্রদর্শিত হয়েছে ({filteredAllProducts.length} টি পণ্য)</span>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile-Only Trust & Service Cards + Vendor CTA after Section 8 */}
            <div className="lg:hidden pt-4 space-y-3">
              {/* Trust Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">দ্রুত ডেলিভারি</div>
                    <div className="text-[9px] text-slate-500">সারা বাংলাদেশে</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">নিরাপদ লেনদেন</div>
                    <div className="text-[9px] text-slate-500">১০০% ক্যাশ অন ডেলিভারি</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0052cc] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">বিশ্বস্ত ভেন্ডর</div>
                    <div className="text-[9px] text-slate-500">যাচাইকৃত আসল পণ্য</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">২৪/৭ সাপোর্ট</div>
                    <div className="text-[9px] text-slate-500">সহায়তায় সবসময়</div>
                  </div>
                </div>
              </div>

              {/* Vendor Registration Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    আপনিও কি ভেন্ডর হতে চান?
                  </h4>
                  <p className="text-[10px] text-slate-600">
                    আপনার পণ্য TWING Marketplace-এ প্রকাশ করুন ও ব্যবসা বৃদ্ধি করুন।
                  </p>
                  <button
                    type="button"
                    onClick={onMerchantLogin || onBackToDashboard}
                    className="mt-1 px-3 py-1 bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>ভেন্ডার হিসেবে যোগ দিন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                    alt="TWING Courier"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Bottom Promotional Banners (Super Admin Controlled) */}
              {bottomBanners.length > 0 && (
                <div className="space-y-3 pt-2">
                  {bottomBanners.map((bBanner: any, bIdx: number) => (
                    <div
                      key={bBanner.id || bIdx}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (bBanner.linkUrl?.startsWith('#')) {
                          const target = document.querySelector(bBanner.linkUrl);
                          if (target) target.scrollIntoView({ behavior: 'smooth' });
                        } else if (bBanner.linkUrl?.includes('?product=')) {
                          const pId = new URL(bBanner.linkUrl, window.location.origin).searchParams.get('product');
                          if (pId) {
                            const prod = products.find((x) => x.id === pId);
                            if (prod) handleSelectProduct(prod);
                          }
                        } else if (bBanner.linkUrl) {
                          window.location.href = bBanner.linkUrl;
                        }
                      }}
                      className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-sm border border-slate-800 cursor-pointer group flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 text-center md:text-left z-10 flex-1">
                        {bBanner.tag && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                            {bBanner.tag}
                          </span>
                        )}
                        <h4 className="text-base sm:text-lg font-black text-white">
                          {bBanner.title}
                        </h4>
                        {bBanner.subtitle && (
                          <p className="text-xs text-slate-300 line-clamp-2 max-w-xl">
                            {bBanner.subtitle}
                          </p>
                        )}
                        {bBanner.buttonText && (
                          <div className="pt-1">
                            <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#0052cc] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition">
                              <span>{bBanner.buttonText}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}
                      </div>

                      {bBanner.imageUrl && (
                        <div className="relative z-10 w-full md:w-56 h-28 sm:h-32 rounded-xl overflow-hidden shadow-xs shrink-0 bg-slate-800">
                          <img
                            src={bBanner.imageUrl}
                            alt={bBanner.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 7. FIXED MOBILE BOTTOM NAVIGATION */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('home');
            setNavTab('home');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition ${
            mobileBottomTab === 'home' && navTab === 'home' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">হোম</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('categories');
            setIsMobileCategoriesOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition cursor-pointer ${
            mobileBottomTab === 'categories' || isMobileCategoriesOpen ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">📂</span>
          <span className="text-[10px]">ক্যাটাগরি</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-xl text-slate-500 relative cursor-pointer"
        >
          <span className="text-lg">🛒</span>
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
          <span className="text-[10px]">কার্ট</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('orders');
            setNavTab('orders');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition cursor-pointer ${
            navTab === 'orders' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px]">আমার অর্ডার</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('account');
            setCustomerAccountTab(verifiedCustomer ? 'profile' : 'login');
            setIsCustomerAccountOpen(true);
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition cursor-pointer relative ${
            isCustomerAccountOpen || mobileBottomTab === 'account' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <span className="text-lg">👤</span>
            {verifiedCustomer?.isVerified && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            )}
          </div>
          <span className="text-[10px]">{verifiedCustomer ? 'অ্যাকাউন্ট' : 'লগইন'}</span>
        </button>
      </nav>

      {/* Mobile Categories Bottom Sheet Modal */}
      <AnimatePresence>
        {isMobileCategoriesOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs md:hidden">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📂</span>
                  <h3 className="text-base font-black text-slate-900">সকল ক্যাটাগরি</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCategoriesOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {mergedSidebarCategories.map((cat, idx) => {
                  const isActive = selectedCategory === cat.match || selectedCategory === cat.nameBn || (cat.match === 'all' && selectedCategory === 'all');
                  return (
                    <button
                      key={cat.id ? `mob_${cat.id}` : `mob_${idx}`}
                      type="button"
                      onClick={() => {
                        handleCategorySelect(cat.match || cat.nameBn);
                        setIsMobileCategoriesOpen(false);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/80 border-[#0052cc] text-[#0052cc] font-black shadow-xs ring-1 ring-[#0052cc]'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{cat.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{cat.nameBn}</div>
                        <div className="text-[10px] text-slate-400">পণ্য দেখুন →</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. MODALS & DRAWERS */}
      {/* ========================================================================= */}
      {/* Product Details Modal */}
      <MarketplaceProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => handleSelectProduct(null)}
        onAddToCart={addToCart}
        onBuyNow={handleBuyNow}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onVisitVendor={(vId, vName) => {
          handleSelectProduct(null);
          setSelectedVendorStore({ id: vId, name: vName });
        }}
        relatedProducts={products.filter((p) => p.id !== selectedProduct?.id)}
        onSelectProduct={(p) => handleSelectProduct(p)}
      />

      {/* Vendor Store Modal */}
      <MarketplaceVendorStoreModal
        vendorId={selectedVendorStore?.id || null}
        vendorName={selectedVendorStore?.name || ''}
        isOpen={Boolean(selectedVendorStore)}
        onClose={() => setSelectedVendorStore(null)}
        products={products}
        onAddToCart={addToCart}
        onViewProduct={(p) => handleSelectProduct(p)}
        wishlistIds={wishlistIds}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Multi-Vendor Cart & Checkout Drawer */}
      <MarketplaceCartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveFromCart={removeFromCart}
        onClearCart={() => setCart([])}
        onOrderSuccess={(ord) => {
          if (ord && ord.customerPhone) {
            try {
              const key = getCustomerOrdersStorageKey(ord.customerPhone);
              const raw = localStorage.getItem(key);
              const existing = raw ? JSON.parse(raw) : [];
              const updated = [ord, ...existing.filter((x: any) => x.id !== ord.id && x.orderNumber !== ord.orderNumber)];
              localStorage.setItem(key, JSON.stringify(updated));
              localStorage.removeItem(MKT_CUSTOMER_ORDERS_KEY);
              localStorage.removeItem('twing_mkt_customer_orders_v1');
            } catch {}
          }
          setCustomerOrders((prev) => {
            const currentCust = getStoredCustomer();
            if (!currentCust?.phone) return [ord, ...prev];
            const custDigits = currentCust.phone.replace(/[^\d]/g, '').slice(-10);
            const ordDigits = (ord.customerPhone || '').replace(/[^\d]/g, '').slice(-10);
            return custDigits === ordDigits ? [ord, ...prev] : prev;
          });
        }}
        onOpenTracking={(ordNum) => {
          setNavTab('orders');
          setTrackingSearchQuery(ordNum);
          handleTrackOrder(undefined, ordNum);
        }}
        paymentSettings={paymentSettings}
        onOpenLogin={() => {
          setCustomerAccountTab('login');
          setIsCustomerAccountOpen(true);
        }}
      />

      {/* Central Marketplace Customer Account & Device Verification Modal */}
      <CustomerAccountView
        isOpen={isCustomerAccountOpen}
        initialTab={customerAccountTab}
        onCustomerChange={(cust) => {
          setVerifiedCustomer(cust);
          if (cust && cust.phone) {
            try {
              const raw = localStorage.getItem(getCustomerOrdersStorageKey(cust.phone));
              setCustomerOrders(raw ? JSON.parse(raw) : []);
            } catch {
              setCustomerOrders([]);
            }
          } else {
            setCustomerOrders([]);
          }
        }}
        onClose={() => {
          setIsCustomerAccountOpen(false);
          const updatedCust = getStoredCustomer();
          setVerifiedCustomer(updatedCust);
          if (updatedCust && updatedCust.phone) {
            try {
              const raw = localStorage.getItem(getCustomerOrdersStorageKey(updatedCust.phone));
              setCustomerOrders(raw ? JSON.parse(raw) : []);
            } catch {
              setCustomerOrders([]);
            }
          } else {
            setCustomerOrders([]);
          }
        }}
        onOpenTracking={(ordNum) => {
          setNavTab('orders');
          setTrackingSearchQuery(ordNum);
          handleTrackOrder(undefined, ordNum);
        }}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Notifications Drawer */}
      <StorefrontNotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Support Drawer */}
      <StorefrontSupportDrawer
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        config={supportConfig}
      />
    </div>
  );
};
export default CentralMarketplacePage;
