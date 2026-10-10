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

import { FacebookNavbar, FacebookNavTab } from './FacebookNavbar';
import { FacebookFeedView } from './FacebookFeedView';
import { FacebookProfileView } from './FacebookProfileView';
import { FacebookMessengerView } from './FacebookMessengerView';
import { FacebookNotificationsView } from './FacebookNotificationsView';
import { CustomerMarketplaceProductsView } from './CustomerMarketplaceProductsView';
import { CustomerSellProductModal } from './CustomerSellProductModal';
import { MarketplaceQuickBuyModal } from './MarketplaceQuickBuyModal';
import { UserSearchBar } from './UserSearchBar';
import { FacebookFriendsModal } from './FacebookFriendsModal';
import { MarketplaceAuthModal } from './MarketplaceAuthModal';
import { MarketplaceAuthGatekeeper } from './MarketplaceAuthGatekeeper';
import { FacebookSettingsModal } from './FacebookSettingsModal';
import { FacebookVerificationModal } from './FacebookVerificationModal';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import {
  CustomerProfile,
  SocialNotification,
  ChatConversation,
  FriendRequest,
} from '../../types/marketplaceSocial';

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

        {/* Direct 1-Product Order Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product, e);
          }}
          className="bg-[#009b77] hover:bg-[#007f61] text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl transition duration-150 cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center min-w-[76px]"
          title="এই প্রোডাক্টটি সরাসরি অর্ডার করুন"
        >
          অর্ডার করুন
        </button>
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

  // Facebook Social Marketplace state
  const [fbTab, setFbTab] = useState<FacebookNavTab>('feed');
  const [currentProfile, setCurrentProfile] = useState<CustomerProfile>(() => marketplaceSocialService.getCurrentProfile());
  const [notifications, setNotifications] = useState<SocialNotification[]>(() => marketplaceSocialService.getNotifications());
  const [conversations, setConversations] = useState<ChatConversation[]>(() => marketplaceSocialService.getConversations());
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);
  const [chatProductContext, setChatProductContext] = useState<any | null>(null);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [quickBuyProduct, setQuickBuyProduct] = useState<any | null>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<FriendRequest[]>(() =>
    marketplaceSocialService.getPendingReceivedRequests()
  );

  // Authentication & Settings Modal states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => marketplaceSocialService.isLoggedIn());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const pendingFriendRequestsCount = pendingFriendRequests.length;

  const refreshSocialData = () => {
    setNotifications(marketplaceSocialService.getNotifications());
    setPendingFriendRequests(marketplaceSocialService.getPendingReceivedRequests());
    setConversations(marketplaceSocialService.getConversations());
  };

  const handleLogout = async () => {
    await marketplaceSocialService.logout();
    setIsLoggedIn(false);
    setIsSettingsModalOpen(false);
    setViewingProfileUserId(null);
    showToast('✅ সফলভাবে লগআউট সম্পন্ন হয়েছে।');
  };

  useEffect(() => {
    const handleProfileSync = (e: any) => {
      if (e.detail) {
        setCurrentProfile(e.detail);
      }
      refreshSocialData();
    };
    const handleAuthSync = (e: any) => {
      if (e.detail) {
        setIsLoggedIn(e.detail.isLoggedIn);
        if (e.detail.user) {
          setCurrentProfile(e.detail.user);
        }
        if (e.detail.isLoggedIn) {
          setFbTab('profile');
          setViewingProfileUserId(null);
        }
      }
      refreshSocialData();
    };
    const handleThemeSync = (e: any) => {
      const mode = e.detail || localStorage.getItem('twing_marketplace_theme') || 'light';
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('data-theme', mode);
    };
    window.addEventListener('twing_profile_updated', handleProfileSync);
    window.addEventListener('twing_social_auth_changed', handleAuthSync);
    window.addEventListener('twing_theme_changed', handleThemeSync);

    const initialTheme = localStorage.getItem('twing_marketplace_theme') || 'light';
    if (initialTheme === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', initialTheme);

    return () => {
      window.removeEventListener('twing_profile_updated', handleProfileSync);
      window.removeEventListener('twing_social_auth_changed', handleAuthSync);
      window.removeEventListener('twing_theme_changed', handleThemeSync);
    };
  }, []);

  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

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

  // Handle Phone Hardware / Browser Back Button without exiting app
  useEffect(() => {
    // Push dummy history entry on mount so there is a history step to trap back button
    try {
      window.history.pushState({ twing_app_view: 'central_market' }, '');
    } catch (e) {}

    const handlePopState = () => {
      // If user opened any modal or changed sub-view, back button closes it instead of exiting the app
      if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isVerificationModalOpen) {
        setIsVerificationModalOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isSellModalOpen) {
        setIsSellModalOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (quickBuyProduct) {
        setQuickBuyProduct(null);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (selectedProduct) {
        setSelectedProduct(null);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (selectedVendorStore) {
        setSelectedVendorStore(null);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isNotificationsOpen) {
        setIsNotificationsOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isSupportOpen) {
        setIsSupportOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isCustomerAccountOpen) {
        setIsCustomerAccountOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isFriendsModalOpen) {
        setIsFriendsModalOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (isMobileCategoriesOpen) {
        setIsMobileCategoriesOpen(false);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (chatTargetUserId) {
        setChatTargetUserId(null);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (viewingProfileUserId) {
        setViewingProfileUserId(null);
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }
      if (fbTab !== 'feed') {
        setFbTab('feed');
        try { window.history.pushState({ twing_app_view: 'central_market' }, ''); } catch (e) {}
        return;
      }

      // If already at root feed, keep trap state to prevent accidental exit
      try {
        window.history.pushState({ twing_app_view: 'central_market' }, '');
      } catch (e) {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    isSettingsModalOpen,
    isVerificationModalOpen,
    isAuthModalOpen,
    isSellModalOpen,
    quickBuyProduct,
    selectedProduct,
    selectedVendorStore,
    isCartOpen,
    isNotificationsOpen,
    isSupportOpen,
    isCustomerAccountOpen,
    isFriendsModalOpen,
    isMobileCategoriesOpen,
    chatTargetUserId,
    viewingProfileUserId,
    fbTab,
  ]);

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

  // Cart operations (একক পণ্য সরাসরি অর্ডার পলিসি - একসাথে একাধিক ভেন্ডারের পণ্য নির্বাচন নিষিদ্ধ)
  const addToCart = (product: Product, quantity = 1) => {
    const mktProd = product as MarketplaceProduct;
    // Policy: One single product at a time per order
    setCart([{ product: mktProd, quantity }]);
    setIsCartOpen(true);
    showToast(`📦 '${product.name}' পণ্যটির সরাসরি অর্ডার ওপেন করা হয়েছে!`);
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

  const removeFromCart = (_productId: string) => {
    setCart([]);
    showToast('অর্ডার খালি করা হয়েছে');
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    const mktProd = product as MarketplaceProduct;
    setCart([{ product: mktProd, quantity }]);
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

  // If not logged in, enforce the authentication gatekeeper!
  if (!isLoggedIn) {
    return (
      <MarketplaceAuthGatekeeper
        onSuccess={(user) => {
          setCurrentProfile(user);
          setIsLoggedIn(true);
          setFbTab('profile');
          setViewingProfileUserId(null);
          showToast(`🎉 স্বাগতম ${user.name}! সফলভাবে সেন্ট্রাল মার্কেটপ্লেসে প্রবেশ করেছেন।`);
          refreshSocialData();
        }}
        onBackToDashboard={onBackToDashboard}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans text-slate-800 antialiased selection:bg-[#0052cc] selection:text-white max-w-full overflow-x-clip">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-32 sm:top-36 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-white rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 backdrop-blur-xs"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. TOP FACEBOOK NAVBAR (UNIFIED CLEAN HEADER WITH INTEGRATED LIVE SEARCH) */}
      {/* ========================================================================= */}
      <FacebookNavbar
        currentTab={fbTab}
        onTabChange={(tab) => {
          setFbTab(tab);
          if (tab === 'profile') {
            setViewingProfileUserId(null);
          }
        }}
        currentProfile={currentProfile}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
        pendingFriendRequestsCount={pendingFriendRequestsCount}
        onOpenFriendsModal={() => setIsFriendsModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSelectUser={(selectedUser) => {
          setViewingProfileUserId(selectedUser.id);
          setFbTab('profile');
        }}
        onShowToast={(msg) => {
          showToast(msg);
          refreshSocialData();
        }}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        onBackToDashboard={onBackToDashboard}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
        isLoggedIn={isLoggedIn}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: 3-COLUMN LAYOUT EXACT MATCH */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-5 space-y-6 pb-10">
        {fbTab === 'feed' ? (
          <FacebookFeedView
            currentProfile={currentProfile}
            onViewProfile={(userId) => {
              setViewingProfileUserId(userId);
              setFbTab('profile');
            }}
            onStartChat={(userId, prod) => {
              setChatTargetUserId(userId);
              setChatProductContext(prod);
              setFbTab('messenger');
            }}
            onOpenQuickBuy={(prod) => setQuickBuyProduct(prod)}
            onOpenSellProductModal={() => setIsSellModalOpen(true)}
            onShowToast={(msg) => showToast(msg)}
          />
        ) : fbTab === 'messenger' ? (
          <FacebookMessengerView
            initialTargetUserId={chatTargetUserId}
            initialProductContext={chatProductContext}
            onViewProfile={(userId) => {
              setViewingProfileUserId(userId);
              setFbTab('profile');
            }}
            onClose={() => setFbTab('feed')}
            onShowToast={(msg) => showToast(msg)}
          />
        ) : fbTab === 'profile' ? (
          (() => {
            const profileToShow = viewingProfileUserId
              ? marketplaceSocialService.getProfileById(viewingProfileUserId) || currentProfile
              : currentProfile;
            return (
              <FacebookProfileView
                profile={profileToShow}
                isOwnProfile={profileToShow.id === currentProfile.id}
                onProfileUpdated={(up) => {
                  setCurrentProfile(up);
                  setViewingProfileUserId(null);
                  refreshSocialData();
                }}
                onStartChatWithUser={(userId, prod) => {
                  setChatTargetUserId(userId);
                  setChatProductContext(prod);
                  setFbTab('messenger');
                }}
                onOpenQuickBuy={(prod) => setQuickBuyProduct(prod)}
                onOpenSellProductModal={() => setIsSellModalOpen(true)}
                onShowToast={(msg) => showToast(msg)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onOpenVerification={() => setIsVerificationModalOpen(true)}
                onLogout={handleLogout}
              />
            );
          })()
        ) : fbTab === 'notifications' ? (
          <div className="max-w-xl mx-auto py-2">
            <FacebookNotificationsView
              notifications={notifications}
              onRefresh={() => refreshSocialData()}
              onSelectNotification={(notif) => {
                if (notif.type === 'message') {
                  setChatTargetUserId(notif.targetId || null);
                  setFbTab('messenger');
                } else if (notif.type === 'friend_request') {
                  setIsFriendsModalOpen(true);
                } else if (notif.type === 'friend_accept') {
                  setViewingProfileUserId(notif.targetId || null);
                  setFbTab('profile');
                } else if (notif.targetId) {
                  setFbTab('feed');
                }
              }}
            />
          </div>
        ) : (
          <CustomerMarketplaceProductsView
            currentProfile={currentProfile}
            onOpenSellProductModal={() => setIsSellModalOpen(true)}
            onStartChat={(sellerId, prod) => {
              setChatTargetUserId(sellerId);
              setChatProductContext(prod);
              setFbTab("messenger");
            }}
            onSelectProduct={(prod) => {
              setSelectedProduct({
                id: prod.id,
                name: prod.name,
                description: prod.description,
                salePrice: prod.salePrice,
                regularPrice: prod.regularPrice,
                originalPrice: prod.regularPrice,
                category: prod.category,
                images: prod.images || (prod.imageUrl ? [prod.imageUrl] : []),
                imageUrl: prod.imageUrl || prod.images?.[0] || "",
                vendorShopName: prod.sellerName,
                vendorPhone: prod.sellerPhone,
                vendorAddress: prod.sellerLocation,
                rating: 5,
                reviewCount: 1,
                inStock: true,
                badges: [prod.condition === "new" ? "নতুন" : "ব্যবহৃত"],
              } as any);
            }}
            onOpenQuickBuy={(prod) => {
              setQuickBuyProduct(prod);
            }}
            onShowToast={(msg) => showToast(msg)}
          />
        )}
      </main>

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

      {/* Customer Sell Product Modal (STRICTLY NO VIDEOS ALLOWED) */}
      <CustomerSellProductModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSuccess={(product) => {
          showToast(`"${product.name}" পণ্যটি সফলভাবে প্রকাশিত হয়েছে!`);
          window.dispatchEvent(new CustomEvent('twing_products_updated'));
          refreshSocialData();
          setFbTab('marketplace');
        }}
      />

      {/* Marketplace Quick Buy Modal */}
      <MarketplaceQuickBuyModal
        isOpen={!!quickBuyProduct}
        onClose={() => setQuickBuyProduct(null)}
        product={quickBuyProduct}
        onOrderSuccess={(orderId, message) => {
          showToast(message);
          refreshSocialData();
        }}
      />

      {/* Facebook Friends Suggestions & Requests Modal */}
      <FacebookFriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => {
          setIsFriendsModalOpen(false);
          refreshSocialData();
        }}
        onViewProfile={(uId) => {
          setViewingProfileUserId(uId);
          setFbTab('profile');
        }}
        onOpenChat={(uId) => {
          setChatTargetUserId(uId);
          setFbTab('messenger');
        }}
        onShowToast={(msg) => {
          showToast(msg);
          refreshSocialData();
        }}
      />

      {/* Central Marketplace Auth Modal (Mobile Number & Password Login & Register) */}
      <MarketplaceAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setIsLoggedIn(true);
          setCurrentProfile(user);
          refreshSocialData();
          showToast(`🎉 স্বাগতম ${user.name}!`);
        }}
      />

      {/* Facebook Settings Modal */}
      <FacebookSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentProfile={currentProfile}
        onProfileUpdated={(up) => {
          setCurrentProfile(up);
          refreshSocialData();
        }}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Meta Identity Verification Modal */}
      <FacebookVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentProfile={currentProfile}
        onProfileUpdated={(up) => {
          setCurrentProfile(up);
          refreshSocialData();
        }}
      />
    </div>
  );
};
export default CentralMarketplacePage;
