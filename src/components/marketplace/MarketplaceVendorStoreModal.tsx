import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Store,
  Star,
  ShieldCheck,
  Package,
  Search,
  MapPin,
  Phone,
  UserCheck,
  CheckCircle2,
  Heart,
  Share2,
} from 'lucide-react';
import { MarketplaceProduct } from '../../types';
import { formatMoney } from '../../utils/storage';

interface MarketplaceVendorStoreModalProps {
  vendorId: string | null;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
  products: MarketplaceProduct[];
  onAddToCart: (product: MarketplaceProduct, quantity: number) => void;
  onViewProduct: (product: MarketplaceProduct) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
}

export const MarketplaceVendorStoreModal: React.FC<MarketplaceVendorStoreModalProps> = ({
  vendorId,
  vendorName,
  isOpen,
  onClose,
  products,
  onAddToCart,
  onViewProduct,
  wishlistIds,
  onToggleWishlist,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(1280);

  // Filter products belonging to this vendor
  const vendorProducts = useMemo(() => {
    if (!vendorId && !vendorName) return [];
    return products.filter(
      (p) => p.vendorId === vendorId || p.vendorShopName === vendorName || (vendorName && p.vendorShopName?.toLowerCase().includes(vendorName.toLowerCase()))
    );
  }, [products, vendorId, vendorName]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    vendorProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [vendorProducts]);

  const filteredProducts = useMemo(() => {
    return vendorProducts.filter((p) => {
      const matchCat = selectedCat === 'all' || p.category === selectedCat;
      const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [vendorProducts, selectedCat, search]);

  if (!isOpen) return null;

  const firstProd = vendorProducts[0];
  const vendorAddress = firstProd?.vendorAddress || 'ঢাকা, বাংলাদেশ';
  const vendorPhone = firstProd?.vendorPhone || '০১৩...';

  const toggleFollow = () => {
    setIsFollowing((prev) => {
      setFollowersCount((cnt) => (prev ? cnt - 1 : cnt + 1));
      return !prev;
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Top Banner / Store Header */}
          <div className="relative bg-gradient-to-r from-blue-900 via-[#0b63e5] to-blue-700 p-5 sm:p-7 text-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-[#0b63e5] p-2 flex items-center justify-center shadow-lg border-2 border-white/60 font-black text-2xl shrink-0">
                  <Store className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">{vendorName}</h2>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      ✓ TWING হিসাবি ভেরিফাইড ভেন্ডোর
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 font-medium">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ৪.৮ (৮৪০+ রিভিউ)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {followersCount} ফলোয়ার
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {vendorProducts.length} পণ্য
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-blue-100">
                    <MapPin className="w-3 h-3 text-blue-200" />
                    <span>{vendorAddress}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={toggleFollow}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm ${
                    isFollowing
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-white hover:bg-blue-50 text-[#0b63e5]'
                  }`}
                >
                  {isFollowing ? '✓ ফলো করা হয়েছে' : '+ ফলো করুন'}
                </button>
              </div>
            </div>
          </div>

          {/* Sub Header: Search in Shop & Category Filter Tabs */}
          <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
            {/* Horizontal Categories */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCat === 'all'
                    ? 'bg-[#0b63e5] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                সব পণ্য ({vendorProducts.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedCat === cat
                      ? 'bg-[#0b63e5] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* In-store search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="এই শপে খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0b63e5]"
              />
            </div>
          </div>

          {/* Body Products Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি</h3>
                <p className="text-xs text-slate-400">অনুসন্ধান বা ক্যাটাগরি ফিল্টার পরিবর্তন করুন</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {filteredProducts.map((p) => {
                  const discount = p.discountPercent || (p.originalPrice && p.originalPrice > p.salePrice
                    ? Math.round(((p.originalPrice - p.salePrice) / p.originalPrice) * 100)
                    : 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => onViewProduct(p)}
                      className="group bg-white rounded-2xl border border-slate-200/80 p-2.5 flex flex-col justify-between hover:shadow-md hover:border-blue-300 transition duration-200 cursor-pointer relative"
                    >
                      {/* Image container */}
                      <div className="relative aspect-square w-full rounded-xl bg-white border border-slate-100 overflow-hidden mb-2.5 flex items-center justify-center p-2">
                        <img
                          src={p.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg">
                            -{discount}%
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(p.id);
                          }}
                          className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-2xs transition ${
                            wishlistIds.includes(p.id) ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${wishlistIds.includes(p.id) ? 'fill-rose-500' : ''}`} />
                        </button>
                      </div>

                      {/* Product details */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-[#0b63e5] transition">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-amber-500">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-700">{(p.rating || 4.8).toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400">({p.reviewCount || 45})</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="text-sm font-black text-[#0b63e5]">৳ {formatMoney(p.salePrice)}</span>
                          {p.originalPrice && p.originalPrice > p.salePrice && (
                            <span className="text-[11px] text-slate-400 line-through">৳ {formatMoney(p.originalPrice)}</span>
                          )}
                        </div>
                      </div>

                      {/* Add button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(p, 1);
                        }}
                        className="mt-2 w-full py-1.5 bg-white hover:bg-[#0b63e5] text-[#0b63e5] hover:text-white border border-[#0b63e5]/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <span>কার্টে যোগ করুন</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
