import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  MessageCircle,
  Eye,
  Zap,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Tag,
  CheckCircle2,
  Clock,
  Phone,
  CreditCard,
  ShoppingBag,
  Share2,
  Flame,
  Store,
  ShoppingCart,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { CustomerProductItem, CustomerProfile } from '../../types/marketplaceSocial';
import { MarketplaceProduct } from '../../types';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { marketplaceApi } from '../../services/marketplaceService';
import { formatMoney } from '../../utils/storage';
import { getCatalogStudioImage } from '../../utils/productImages';
import { ShareModal } from './ShareModal';

interface CustomerMarketplaceProductsViewProps {
  currentProfile: CustomerProfile;
  vendorProducts?: MarketplaceProduct[];
  onOpenSellProductModal: () => void;
  onStartChat: (sellerId: string, productContext?: any) => void;
  onSelectProduct: (product: any) => void;
  onOpenQuickBuy: (product: any) => void;
  onBuyNow?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  onVisitVendor?: (vendorId: string, vendorName: string) => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'সব ক্যাটাগরি', icon: '🛍️' },
  { id: 'চাল ও ডাল', label: 'চাল, ডাল ও গ্রোসারি', icon: '🌾' },
  { id: 'চা ও বিস্কুট', label: 'চা ও বেকারি', icon: '☕' },
  { id: 'মোবাইল ও গ্যাজেট', label: 'মোবাইল ও গ্যাজেট', icon: '📱' },
  { id: 'ইলেকট্রনিক্স', label: 'ইলেকট্রনিক্স ও গ্যাজেট', icon: '⚡' },
  { id: 'ফ্যাশন ও পোশাক', label: 'ফ্যাশন ও পোশাক', icon: '👕' },
  { id: 'গৃহস্থালী পণ্য', label: 'গৃহস্থালী পণ্য', icon: '🏠' },
  { id: 'স্বাস্থ্য ও ফার্মেসি', label: 'স্বাস্থ্য ও ফার্মেসি', icon: '➕' },
  { id: 'বিউটি ও কেয়ার', label: 'বিউটি ও পার্সোনাল কেয়ার', icon: '✨' },
  { id: 'অন্যান্য পণ্য', label: 'অন্যান্য পণ্য', icon: '📦' },
];

const BD_CITIES = [
  { id: 'all', label: 'সমগ্র বাংলাদেশ' },
  { id: 'dhaka', label: 'ঢাকা' },
  { id: 'chittagong', label: 'চট্টগ্রাম' },
  { id: 'sylhet', label: 'সিলেট' },
  { id: 'rajshahi', label: 'রাজশাহী' },
  { id: 'khulna', label: 'খুলনা' },
  { id: 'barisal', label: 'বরিশাল' },
  { id: 'rangpur', label: 'রংপুর' },
  { id: 'cumilla', label: 'কুমিল্লা' },
];

const PRICE_RANGES = [
  { id: 'all', label: 'সব দাম' },
  { id: 'under_1k', label: '৳১,০০০ এর নিচে', min: 0, max: 1000 },
  { id: '1k_to_5k', label: '৳১,০০০ - ৳৫,০০০', min: 1000, max: 5000 },
  { id: '5k_to_20k', label: '৳৫,০০০ - ৳২০,০০০', min: 5000, max: 20000 },
  { id: 'above_20k', label: '৳২০,০০০+', min: 20000, max: Infinity },
];

export const CustomerMarketplaceProductsView: React.FC<CustomerMarketplaceProductsViewProps> = ({
  currentProfile,
  vendorProducts: initialVendorProducts = [],
  onOpenSellProductModal,
  onStartChat,
  onSelectProduct,
  onOpenQuickBuy,
  onBuyNow,
  onAddToCart,
  onVisitVendor,
  onShowToast,
}) => {
  const [communityProducts, setCommunityProducts] = useState<CustomerProductItem[]>(() =>
    marketplaceSocialService.getCustomerProducts()
  );
  const [vendorProducts, setVendorProducts] = useState<MarketplaceProduct[]>(initialVendorProducts);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'vendor' | 'community'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [boostProduct, setBoostProduct] = useState<CustomerProductItem | null>(null);
  const [shareProduct, setShareProduct] = useState<any | null>(null);

  // Load Vendor Feed if not passed from parent
  useEffect(() => {
    if (initialVendorProducts && initialVendorProducts.length > 0) {
      setVendorProducts(initialVendorProducts);
      return;
    }
    let isMounted = true;
    marketplaceApi.getFeed().then((res) => {
      if (isMounted && res.success && res.products) {
        setVendorProducts(res.products);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [initialVendorProducts]);

  const refreshProductsList = async () => {
    setIsRefreshing(true);
    try {
      await marketplaceSocialService.syncWithCloud();
      setCommunityProducts(marketplaceSocialService.getCustomerProducts());
      const res = await marketplaceApi.getFeed();
      if (res.success && res.products) {
        setVendorProducts(res.products);
      }
      onShowToast('🔄 মার্কেটপ্লেস পণ্য আপডেট হয়েছে!');
    } catch {
      setCommunityProducts(marketplaceSocialService.getCustomerProducts());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      setCommunityProducts(marketplaceSocialService.getCustomerProducts());
    };
    window.addEventListener('twing_social_synced', handleSync);
    window.addEventListener('twing_products_updated', handleSync);
    return () => {
      window.removeEventListener('twing_social_synced', handleSync);
      window.removeEventListener('twing_products_updated', handleSync);
    };
  }, []);

  // Normalize vendor products to unified display structure
  const normalizedVendorProducts = useMemo(() => {
    return vendorProducts.map((rawV) => {
      const v = rawV as any;
      const imagesList = Array.isArray(v.images) && v.images.length > 0 ? v.images : [v.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
      return {
        id: v.id,
        name: v.name,
        description: v.description || '',
        salePrice: Number(v.salePrice || 0),
        regularPrice: Number(v.regularPrice || v.originalPrice || v.salePrice || 0),
        stock: v.stock !== undefined ? Number(v.stock) : 99,
        category: v.category || 'অন্যান্য পণ্য',
        condition: 'new' as const,
        images: imagesList,
        imageUrl: v.imageUrl || imagesList[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        sellerId: v.vendorId || 'vendor_shop',
        sellerName: v.vendorShopName || 'TWING ভেরিফাইড শপ',
        sellerPhone: v.vendorPhone,
        sellerLocation: v.vendorAddress || 'বাংলাদেশ',
        sellerAvatar: v.vendorLogoUrl || v.vendorLogo || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=150&q=80',
        isVendor: true,
        vendorId: v.vendorId,
        vendorShopName: v.vendorShopName,
        unit: v.unit,
        createdAt: v.createdAt || new Date().toISOString(),
        sellerPaymentSettings: v.sellerPaymentSettings || {
          acceptsBkash: true,
          acceptsNagad: true,
          acceptsRocket: true,
          acceptsCod: true,
        },
      };
    });
  }, [vendorProducts]);

  // Combined list based on source filter
  const combinedList = useMemo(() => {
    const commMapped = communityProducts.map((c) => ({
      ...c,
      isVendor: false,
      stock: 1,
    }));

    if (sourceFilter === 'vendor') return normalizedVendorProducts;
    if (sourceFilter === 'community') return commMapped;
    return [...normalizedVendorProducts, ...commMapped];
  }, [normalizedVendorProducts, communityProducts, sourceFilter]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...combinedList];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sellerName.toLowerCase().includes(q) ||
          (p.sellerLocation && p.sellerLocation.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => {
        const cat = p.category.toLowerCase();
        const sel = selectedCategory.toLowerCase();
        return cat.includes(sel) || sel.includes(cat);
      });
    }

    // City / Location filter
    if (selectedCity !== 'all') {
      const cityObj = BD_CITIES.find((c) => c.id === selectedCity);
      const query = cityObj ? cityObj.label.toLowerCase() : selectedCity.toLowerCase();
      result = result.filter((p) => {
        const loc = (p.sellerLocation || '').toLowerCase();
        return loc.includes(query);
      });
    }

    // Price range filter
    if (selectedPriceRange !== 'all') {
      const pr = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
      if (pr) {
        result = result.filter((p) => p.salePrice >= pr.min && p.salePrice <= pr.max);
      }
    }

    // Condition filter
    if (selectedCondition !== 'all') {
      result = result.filter((p) => p.condition === selectedCondition);
    }

    // Sorting (Boosted / Promoted products rank first in Central Marketplace!)
    result.sort((a, b) => {
      const aPromoted = (a as any).isPromoted ? 1 : 0;
      const bPromoted = (b as any).isPromoted ? 1 : 0;
      if (aPromoted !== bPromoted) return bPromoted - aPromoted;

      if (sortBy === 'price_low') {
        return a.salePrice - b.salePrice;
      }
      if (sortBy === 'price_high') {
        return b.salePrice - a.salePrice;
      }
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [combinedList, searchQuery, selectedCategory, selectedCity, selectedPriceRange, selectedCondition, sortBy]);

  const getConditionLabel = (condition: string, isVendor?: boolean) => {
    if (isVendor) {
      return { label: 'অফিসিয়াল নতুন স্টক', color: 'bg-emerald-600 text-white' };
    }
    switch (condition) {
      case 'new':
        return { label: 'ব্র্যান্ড নিউ', color: 'bg-emerald-500 text-white' };
      case 'like_new':
        return { label: 'একদম নতুনের মতো', color: 'bg-blue-500 text-white' };
      case 'used_good':
        return { label: 'ব্যবহৃত (ভালো মান)', color: 'bg-amber-500 text-white' };
      case 'used_fair':
        return { label: 'ব্যবহৃত', color: 'bg-slate-600 text-white' };
      default:
        return { label: 'নতুন', color: 'bg-emerald-500 text-white' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-16">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: CENTRAL MARKETPLACE & MULTI-VENDOR HUB                   */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1877F2] via-blue-700 to-indigo-800 text-white p-5 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black uppercase tracking-wider text-blue-100">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>TWING সেন্ট্রাল মার্কেটপ্লেস • মাল্টি-ভেন্ডার ও সোশ্যাল শপ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              সেন্ট্রাল মার্কেটপ্লেস
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-medium">
              ভেন্ডার স্টোরের নিজস্ব ইনভেন্টরি পণ্য এবং সোশ্যাল কমিউনিটির লিস্টিং এক প্ল্যাটফর্মে। 
              সরাসরি বিক্রেতা ও ভেন্ডারের সাথে চ্যাট করুন, পণ্য পছন্দ হলে সরাসরি সিঙ্গেল পিস অর্ডার ও চেকআউট করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Sell Product Button */}
            <button
              type="button"
              onClick={onOpenSellProductModal}
              className="px-5 py-3 bg-white hover:bg-blue-50 text-[#1877F2] font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition flex items-center gap-2 cursor-pointer transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>পণ্য বিক্রি করুন</span>
            </button>

            {/* Refresh Feed */}
            <button
              type="button"
              onClick={refreshProductsList}
              disabled={isRefreshing}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-xs transition cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SOURCE FILTER TABS: ALL / VENDOR SHOPS / SOCIAL COMMUNITY              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setSourceFilter('all')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            sourceFilter === 'all'
              ? 'bg-white text-[#1877F2] shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>সকল পণ্য ({normalizedVendorProducts.length + communityProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('vendor')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            sourceFilter === 'vendor'
              ? 'bg-white text-emerald-700 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-emerald-600" />
          <span>ভেন্ডার শপ ({normalizedVendorProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('community')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            sourceFilter === 'community'
              ? 'bg-white text-indigo-700 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-indigo-600" />
          <span>কমিউনিটি ({communityProducts.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER SECTION                                               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
        {/* Search Bar + Sort & Condition Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য, বিবরণ, ব্র্যান্ড বা ভেন্ডারের নাম দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1877F2] font-medium transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Condition Filter */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#1877F2] cursor-pointer"
          >
            <option value="all">সব অবস্থা</option>
            <option value="new">ব্র্যান্ড নিউ</option>
            <option value="like_new">একদম নতুনের মতো</option>
            <option value="used_good">ব্যবহৃত (ভালো মান)</option>
            <option value="used_fair">ব্যবহৃত (সাধারণ)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#1877F2] cursor-pointer"
          >
            <option value="newest">সদ্য আপলোডকৃত (নতুন আগে)</option>
            <option value="price_low">মূল্য: কম থেকে বেশি</option>
            <option value="price_high">মূল্য: বেশি থেকে কম</option>
          </select>
        </div>

        {/* Category Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-[#1877F2] text-white shadow-xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* City Filter & Price Range Filter Controls (Facebook Marketplace Filter) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {/* Location Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>লোকেশন:</span>
            </span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {BD_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">বাজেট:</span>
            {PRICE_RANGES.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => setSelectedPriceRange(pr.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedPriceRange === pr.id
                    ? 'bg-[#1877F2] text-white shadow-2xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="font-bold flex items-center gap-1.5">
            <span>মোট</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1877F2] font-black">
              {filteredProducts.length}
            </span>
            <span>টি পণ্য পাওয়া গেছে</span>
          </div>

          {(searchQuery || selectedCategory !== 'all' || selectedCondition !== 'all' || selectedCity !== 'all' || selectedPriceRange !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedCondition('all');
                setSelectedCity('all');
                setSelectedPriceRange('all');
              }}
              className="text-[#1877F2] font-bold hover:underline cursor-pointer"
            >
              ফিল্টার ক্লিয়ার করুন
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLASH DEALS COUNTDOWN BANNER (FACEBOOK MARKETPLACE SPECIAL)               */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-xs sm:text-sm tracking-tight">আজকের মেগা ফ্ল্যাশ সেল ও ডিসকাউন্ট</h3>
              <span className="text-[9px] font-black bg-white text-rose-600 px-2 py-0.5 rounded-full uppercase shadow-xs">
                HOT DEAL
              </span>
            </div>
            <p className="text-[11px] text-white/90 font-medium">সীমিত সময়ের বিশেষ মূল্যছাড় • স্টক শেষ হওয়ার আগেই অর্ডার করুন</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 font-mono font-black text-xs bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>অফার বাকি: ০৫:২৪:১৮</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PRODUCTS GRID (2-COLS ON MOBILE, 3-4 COLS ON DESKTOP)                  */}
      {/* ========================================================================= */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((prod: any) => {
            const conditionBadge = getConditionLabel(prod.condition, prod.isVendor);
            const mainImage = prod.images?.[0] || prod.imageUrl || getCatalogStudioImage(prod.name, prod.category);
            const isOwnProduct = Boolean(
              currentProfile && (
                currentProfile.id === prod.sellerId ||
                currentProfile.phone === prod.sellerPhone ||
                (currentProfile as any).vendorId === prod.vendorId ||
                currentProfile.id === prod.vendorId
              )
            );
            const isOutOfStock = prod.isVendor && prod.stock !== undefined && prod.stock <= 0;

            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`rounded-2xl border transition duration-200 overflow-hidden flex flex-col group cursor-pointer ${
                  prod.isPromoted
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md bg-gradient-to-b from-amber-50/20 to-white'
                    : 'border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-[#1877F2]/40 bg-white'
                }`}
              >
                {/* Product Image Container */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={mainImage}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getCatalogStudioImage(prod.name, prod.category);
                    }}
                  />

                  {/* Badges (Top Left) */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                    {prod.isVendor ? (
                      <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                        <Store className="w-3 h-3 text-white" />
                        <span>ভেন্ডার শপ</span>
                      </span>
                    ) : prod.isPromoted ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md flex items-center gap-1 animate-pulse">
                        <Flame className="w-3.5 h-3.5 fill-white" />
                        <span>🔥 স্পনসরড • টপ ফিচার্ড</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${conditionBadge.color}`}
                      >
                        {conditionBadge.label}
                      </span>
                    )}

                    {/* Stock Badge for vendor products */}
                    {prod.isVendor && prod.stock !== undefined && (
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full ${
                        prod.stock > 0 ? 'bg-black/60 text-emerald-300' : 'bg-rose-600 text-white'
                      }`}>
                        {prod.stock > 0 ? `স্টক: ${prod.stock} টি` : 'স্টক শেষ'}
                      </span>
                    )}
                  </div>

                  {/* Category Pill (Top Right) */}
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white shadow-xs max-w-[100px] truncate block">
                      {prod.category}
                    </span>
                  </div>

                  {/* Own Product Indicator */}
                  {isOwnProduct && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                        আপনার পণ্য
                      </span>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1">
                    {/* Title */}
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-[#1877F2] transition">
                      {prod.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="text-sm sm:text-base font-black text-[#1877F2]">
                        ৳ {formatMoney(prod.salePrice)}
                      </span>
                      {prod.regularPrice && prod.regularPrice > prod.salePrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          ৳ {formatMoney(prod.regularPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Seller / Vendor Info */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={prod.sellerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt={prod.sellerName}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">
                          {prod.sellerName}
                        </span>
                        <ShieldCheck className="w-3 h-3 text-[#1877F2] shrink-0" />
                      </div>

                      {prod.isVendor && onVisitVendor && prod.vendorId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVisitVendor(prod.vendorId, prod.sellerName);
                          }}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-lg border border-emerald-200"
                        >
                          দোকান দেখুন
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{prod.sellerLocation || 'বাংলাদেশ'}</span>
                    </div>

                    {/* Accepted Payment Badges */}
                    {prod.sellerPaymentSettings && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {prod.sellerPaymentSettings.acceptsBkash && (
                          <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-pink-50 text-pink-700 border border-pink-200">
                            বিকাশ
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsNagad && (
                          <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            নগদ
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsRocket && (
                          <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            রকেট
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsCod !== false && (
                          <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ক্যাশ অন ডেলিভারি
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-1.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Chat Button */}
                      <button
                        type="button"
                        onClick={() => onStartChat(prod.sellerId, prod)}
                        className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        title="বিক্রেতার সাথে চ্যাট করুন"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>চ্যাট</span>
                      </button>

                      {/* Add to Cart, Quick Buy, Own Product or Out of Stock */}
                      {isOwnProduct ? (
                        <button
                          type="button"
                          disabled
                          className="px-2 py-1.5 bg-slate-100 text-slate-500 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1 cursor-not-allowed border border-slate-200"
                          title="নিরাপত্তা নিয়ম: আপনি নিজের পণ্য নিজে কিনতে পারবেন না"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>আপনার পণ্য</span>
                        </button>
                      ) : isOutOfStock ? (
                        <button
                          type="button"
                          disabled
                          className="px-2 py-1.5 bg-rose-50 text-rose-500 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1 cursor-not-allowed border border-rose-200"
                          title="পণ্যটির স্টক শেষ হয়ে গেছে"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>স্টক শেষ</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (prod.isVendor && onBuyNow) {
                              onBuyNow(prod);
                            } else {
                              onOpenQuickBuy(prod);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95"
                          title="সরাসরি ১ পিস অর্ডার ও চেকআউট"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>সরাসরি অর্ডার</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#1877F2] flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500">
              আপনার ফিল্টারের সাথে মিলে এমন কোনো পণ্য এখনও যুক্ত হয়নি।
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSellProductModal}
            className="px-5 py-2.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition cursor-pointer"
          >
            প্রথম পণ্য হিসেবে পোস্ট করুন
          </button>
        </div>
      )}

      {/* Share Modal */}
      {shareProduct && (
        <ShareModal
          isOpen={!!shareProduct}
          onClose={() => setShareProduct(null)}
          product={shareProduct}
          currentProfile={currentProfile}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
