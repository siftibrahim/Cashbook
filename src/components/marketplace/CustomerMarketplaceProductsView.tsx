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
} from 'lucide-react';
import { CustomerProductItem, CustomerProfile } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';
import { ShareModal } from './ShareModal';
import { ProductBoostModal } from './ProductBoostModal';

interface CustomerMarketplaceProductsViewProps {
  currentProfile: CustomerProfile;
  onOpenSellProductModal: () => void;
  onStartChat: (sellerId: string, productContext?: any) => void;
  onSelectProduct: (product: CustomerProductItem) => void;
  onOpenQuickBuy: (product: CustomerProductItem) => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'সব ক্যাটাগরি', icon: '🛍️' },
  { id: 'মোবাইল ও গ্যাজেট', label: 'মোবাইল ও গ্যাজেট', icon: '📱' },
  { id: 'কম্পিউটার ও ল্যাপটপ', label: 'কম্পিউটার ও ল্যাপটপ', icon: '💻' },
  { id: 'ইলেকট্রনিক্স', label: 'ইলেকট্রনিক্স', icon: '⚡' },
  { id: 'ফ্যাশন ও পোশাক', label: 'ফ্যাশন ও পোশাক', icon: '👕' },
  { id: 'গৃহস্থালী পণ্য', label: 'গৃহস্থালী পণ্য', icon: '🏠' },
  { id: 'খাদ্য ও গ্রোসারি', label: 'খাদ্য ও গ্রোসারি', icon: '🍯' },
  { id: 'বিউটি ও কেয়ার', label: 'বিউটি ও পার্সোনাল কেয়ার', icon: '✨' },
  { id: 'বই ও স্টেশনারি', label: 'বই ও স্টেশনারি', icon: '📚' },
  { id: 'অন্যান্য পণ্য', label: 'অন্যান্য পণ্য', icon: '📦' },
];

export const CustomerMarketplaceProductsView: React.FC<CustomerMarketplaceProductsViewProps> = ({
  currentProfile,
  onOpenSellProductModal,
  onStartChat,
  onSelectProduct,
  onOpenQuickBuy,
  onShowToast,
}) => {
  const [products, setProducts] = useState<CustomerProductItem[]>(() =>
    marketplaceSocialService.getCustomerProducts()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [boostProduct, setBoostProduct] = useState<CustomerProductItem | null>(null);
  const [shareProduct, setShareProduct] = useState<CustomerProductItem | null>(null);

  const refreshProductsList = () => {
    setIsRefreshing(true);
    marketplaceSocialService.syncWithCloud().finally(() => {
      setProducts(marketplaceSocialService.getCustomerProducts());
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    const handleSync = () => {
      setProducts(marketplaceSocialService.getCustomerProducts());
    };
    window.addEventListener('twing_social_synced', handleSync);
    window.addEventListener('twing_products_updated', handleSync);
    return () => {
      window.removeEventListener('twing_social_synced', handleSync);
      window.removeEventListener('twing_products_updated', handleSync);
    };
  }, []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let result = [...products];

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

    // Condition filter
    if (selectedCondition !== 'all') {
      result = result.filter((p) => p.condition === selectedCondition);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_low') {
        return a.salePrice - b.salePrice;
      }
      if (sortBy === 'price_high') {
        return b.salePrice - a.salePrice;
      }
      // Newest
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedCondition, sortBy]);

  const getConditionLabel = (condition: string) => {
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
      {/* 1. HERO BANNER: CENTRAL MARKETPLACE USER PRODUCTS HUB                     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1877F2] via-blue-700 to-indigo-800 text-white p-5 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black uppercase tracking-wider text-blue-100">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>সেন্ট্রাল মার্কেটপ্লেস • সকল ইউজারের পণ্যসমূহ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              সেন্ট্রাল মার্কেটপ্লেস
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-medium">
              সেন্ট্রাল মার্কেটপ্লেসের সকল ইউজারের আপলোড করা পণ্য এখানে স্বয়ংক্রিয়ভাবে যুক্ত হচ্ছে। 
              সরাসরি বিক্রেতার সাথে চ্যাট করুন এবং নিশ্চিন্তে কেনাবেচা করুন।
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
              <span>পণ্য বিক্রি করুন / আপলোড করুন</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={refreshProductsList}
              disabled={isRefreshing}
              className="p-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl transition cursor-pointer backdrop-blur-xs disabled:opacity-50"
              title="নতুন পণ্য রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & FILTER SECTION                                               */}
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
              placeholder="পণ্য, বিবরণ, ব্র্যান্ড বা বিক্রেতার নাম দিয়ে খুঁজুন..."
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

        {/* Count Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div className="font-bold flex items-center gap-1.5">
            <span>মোট</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1877F2] font-black">
              {filteredProducts.length}
            </span>
            <span>টি পণ্য পাওয়া গেছে</span>
          </div>

          {(searchQuery || selectedCategory !== 'all' || selectedCondition !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedCondition('all');
              }}
              className="text-[#1877F2] font-bold hover:underline cursor-pointer"
            >
              ফিল্টার ক্লিয়ার করুন
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. USER PRODUCTS GRID (2-COLS ON MOBILE, 3-4 COLS ON DESKTOP)             */}
      {/* ========================================================================= */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filteredProducts.map((prod) => {
            const conditionBadge = getConditionLabel(prod.condition);
            const mainImage = prod.images?.[0] || prod.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
            const isOwnProduct = currentProfile && currentProfile.id === prod.sellerId;

            return (
              <div
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-[#1877F2]/40 transition duration-200 overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Product Image Container */}
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={mainImage}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Condition Badge (Top Left) */}
                  <div className="absolute top-2 left-2 z-10">
                    {prod.isPromoted ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white" />
                        <span>স্পনসরড</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${conditionBadge.color}`}
                      >
                        {conditionBadge.label}
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

                  {/* Seller Info */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5">
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

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{prod.sellerLocation || 'বাংলাদেশ'}</span>
                    </div>

                    {/* Seller Accepted Payment Methods */}
                    {prod.sellerPaymentSettings && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {prod.sellerPaymentSettings.acceptsBkash && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200">
                            বিকাশ
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsNagad && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            নগদ
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsRocket && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            রকেট
                          </span>
                        )}
                        {prod.sellerPaymentSettings.acceptsCod !== false && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ক্যাশ অন ডেলিভারি
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-1.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Chat with Seller Button */}
                      <button
                        type="button"
                        onClick={() => onStartChat(prod.sellerId, prod)}
                        className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        title="বিক্রেতার সাথে চ্যাট করুন"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>চ্যাট</span>
                      </button>

                      {/* Quick Buy Button */}
                      <button
                        type="button"
                        onClick={() => onOpenQuickBuy(prod)}
                        className="px-2 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        title="সরাসরি কিনুন"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>কিনুন</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Promote / Boost Button */}
                      <button
                        type="button"
                        onClick={() => setBoostProduct(prod)}
                        className="px-2 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[10px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        title="সুপার এডমিনের মাধ্যমে পণ্যটি প্রমোট বা বুস্ট করুন"
                      >
                        <Zap className="w-3 h-3 fill-white" />
                        <span>{prod.isPromoted ? 'পুনরায় বুস্ট' : 'প্রমোট / বুস্ট'}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => setShareProduct(prod)}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        title="শেয়ার করুন"
                      >
                        <Share2 className="w-3 h-3 text-slate-500" />
                        <span>শেয়ার</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#1877F2] flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {searchQuery || selectedCategory !== 'all'
                ? 'কোনো পণ্য খুঁজে পাওয়া যায়নি'
                : 'এখনও কোনো পণ্য আপলোড করা হয়নি'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedCategory !== 'all'
                ? 'অনুগ্রহ করে অন্য শব্দ বা ক্যাটাগরি দিয়ে চেষ্টা করুন।'
                : 'সেন্ট্রাল মার্কেটপ্লেসে আপনিই প্রথম পণ্য আপলোড করুন এবং লক্ষাধিক ক্রেতার কাছে বিক্রি করুন!'}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSellProductModal}
            className="px-6 py-3 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>প্রথম পণ্যটি বিক্রি করুন</span>
          </button>
        </div>
      )}

      {/* Share Modal */}
      {shareProduct && (
        <ShareModal
          isOpen={true}
          onClose={() => setShareProduct(null)}
          product={shareProduct}
          currentProfile={currentProfile}
          onShowToast={onShowToast}
          onSharedSuccess={refreshProductsList}
        />
      )}

      {/* Boost Modal */}
      {boostProduct && (
        <ProductBoostModal
          isOpen={true}
          onClose={() => setBoostProduct(null)}
          product={boostProduct}
          currentProfile={currentProfile}
          onShowToast={onShowToast}
          onBoostSubmitted={refreshProductsList}
        />
      )}
    </div>
  );
};
