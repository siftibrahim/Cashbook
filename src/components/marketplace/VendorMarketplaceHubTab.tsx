import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Product, OnlineOrder, StoreProfile } from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';

interface VendorMarketplaceHubTabProps {
  products: Product[];
  orders: OnlineOrder[];
  store: StoreProfile | null;
  onOpenMarketplace?: () => void;
  onShowToast?: (msg: string) => void;
  onUpdateProducts?: () => void;
  onConvertOrderToSale?: (order: OnlineOrder) => void;
}

export const VendorMarketplaceHubTab: React.FC<VendorMarketplaceHubTabProps> = ({
  products,
  orders,
  store,
  onOpenMarketplace,
  onShowToast,
  onUpdateProducts,
  onConvertOrderToSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [orderSubTab, setOrderSubTab] = useState<'all' | 'pending' | 'delivered'>('all');

  // Filter marketplace-specific orders
  const marketplaceOrders = orders.filter(
    (o) => o.orderSource === 'marketplace' || Boolean(o.masterOrderId)
  );

  const totalMarketplaceSales = marketplaceOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0),
    0
  );

  const settledSales = marketplaceOrders
    .filter((o) => o.vendorPayoutStatus === 'settled')
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const pendingSettlement = totalMarketplaceSales - settledSales;

  const listedProducts = products.filter((p) => p.isListedOnMarketplace === true);

  // Toggle single product
  const handleToggleProduct = async (product: Product) => {
    try {
      setTogglingId(product.id);
      const nextState = !product.isListedOnMarketplace;
      const res = await marketplaceApi.toggleProductListing(product.id, nextState);
      if (res.success) {
        product.isListedOnMarketplace = nextState;
        if (onShowToast) {
          onShowToast(
            nextState
              ? `✅ "${product.name}" সেন্ট্রাল মার্কেটপ্লেসে প্রদর্শিত হচ্ছে`
              : `"${product.name}" সেন্ট্রাল মার্কেটপ্লেস থেকে সরানো হয়েছে`
          );
        }
        if (onUpdateProducts) onUpdateProducts();
      }
    } catch (err: any) {
      alert(err.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk enable all products to marketplace
  const handleBulkEnable = async () => {
    const unlisted = products.filter((p) => !p.isListedOnMarketplace);
    if (unlisted.length === 0) {
      if (onShowToast) onShowToast('আপনার সকল পণ্য ইতিমধ্যেই সেন্ট্রাল মার্কেটপ্লেসে যুক্ত আছে');
      return;
    }

    if (!confirm(`আপনি কি আপনার ${unlisted.length}টি পণ্য এক ক্লিকে সেন্ট্রাল মার্কেটপ্লেসে লাইভ করতে চান?`)) {
      return;
    }

    setIsBulkProcessing(true);
    let count = 0;
    for (const p of unlisted) {
      try {
        await marketplaceApi.toggleProductListing(p.id, true);
        p.isListedOnMarketplace = true;
        count++;
      } catch {}
    }
    setIsBulkProcessing(false);
    if (onShowToast) onShowToast(`🎉 সফলভাবে ${count}টি পণ্য সেন্ট্রাল মার্কেটপ্লেসে যুক্ত করা হয়েছে!`);
    if (onUpdateProducts) onUpdateProducts();
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterMode === 'listed') return p.isListedOnMarketplace === true;
    if (filterMode === 'unlisted') return !p.isListedOnMarketplace;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                সেন্ট্রাল মল পার্টনার
              </span>
              <span className="text-xs text-teal-200">জাতীয় মাল্টি-ভেন্ডর নেটওয়ার্ক</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              আপনার পণ্য এখন সারা দেশের সেন্ট্রাল মার্কেটপ্লেসে!
            </h3>
            <p className="text-xs text-teal-100/90 leading-relaxed">
              আপনার নিজস্ব অনলাইন স্টোরের পাশাপাশি আপনার পণ্যগুলো TwingHisabi সেন্ট্রাল মার্কেটপ্লেস মলে লক্ষ লক্ষ ক্রেতাদের কাছে সরাসরি পৌঁছে যাবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleBulkEnable}
              disabled={isBulkProcessing}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isBulkProcessing ? 'যুক্ত হচ্ছে...' : 'সব পণ্য এক ক্লিকে মলে দিন'}</span>
            </button>

            {onOpenMarketplace && (
              <button
                type="button"
                onClick={onOpenMarketplace}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
              >
                <span>সেন্ট্রাল মল ভিউ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মার্কেটপ্লেসে লাইভ পণ্য</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-teal-900">
              {listedProducts.length} <span className="text-xs text-slate-400 font-normal">/ {products.length}</span>
            </span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">লাইভ</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মার্কেটপ্লেস মোট অর্ডার</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {marketplaceOrders.length}
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">মল অর্ডার</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মোট মার্কেটপ্লেস সেলস</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-800">
              ৳{totalMarketplaceSales.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">মোট আয়</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">পেআউট স্ট্যাটাস</p>
          <div className="flex items-baseline justify-between">
            <span className="text-lg sm:text-xl font-black text-slate-900">
              ৳{settledSales.toLocaleString()}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              pendingSettlement > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {pendingSettlement > 0 ? `৳${pendingSettlement} বকেয়া` : 'ক্লিয়ার'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PRODUCTS INVENTORY MARKETPLACE TOGGLES */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-700" />
              <span>পণ্য মার্কেটপ্লেস লিস্টিং কন্ট্রোল</span>
            </h4>
            <p className="text-xs text-slate-500">যে পণ্যগুলো সেন্ট্রাল মলে দেখাতে চান সেগুলো অন রাখুন</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-700 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={filterMode}
              onChange={(e: any) => setFilterMode(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">সব পণ্য ({products.length})</option>
              <option value="listed">লাইভ আছে ({listedProducts.length})</option>
              <option value="unlisted">লিস্টেড নয় ({products.length - listedProducts.length})</option>
            </select>
          </div>
        </div>

        {/* Product List */}
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              কোনো পণ্য পাওয়া যায়নি
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isListed = p.isListedOnMarketplace === true;
              const isToggling = togglingId === p.id;

              return (
                <div key={p.id} className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-11 h-11 object-cover rounded-lg bg-slate-100 shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 text-sm font-bold shrink-0">
                        📦
                      </div>
                    )}
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{p.name}</h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-900">৳{p.salePrice}</span>
                        <span>•</span>
                        <span>স্টক: {p.stock}</span>
                        {p.category && (
                          <>
                            <span>•</span>
                            <span className="text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded text-[10px]">
                              {p.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleProduct(p)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                        isListed
                          ? 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-800'
                      }`}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : isListed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>সেন্ট্রাল মলে লাইভ</span>
                        </>
                      ) : (
                        <>
                          <span>+ মলে যুক্ত করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: MARKETPLACE ORDERS RECEIVED */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-700" />
              <span>সেন্ট্রাল মার্কেটপ্লেস থেকে প্রাপ্ত অর্ডারসমূহ ({marketplaceOrders.length})</span>
            </h4>
            <p className="text-xs text-slate-500">গ্রাহকরা যখন সেন্ট্রাল মল থেকে আপনার পণ্য কিনবেন সেগুলো এখানে আসবে</p>
          </div>
        </div>

        {marketplaceOrders.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">এখনো কোনো সেন্ট্রাল মল অর্ডার আসেনি</p>
            <p className="text-[11px] text-slate-400">আপনার পণ্যগুলো সেন্ট্রাল মলে যুক্ত করে রাখুন, অর্ডার আসলেই সাথে সাথে এখানে নোটিফিকেশন পাবেন</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {marketplaceOrders.map((ord) => (
              <div key={ord.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-teal-950">#{ord.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black">
                      সেন্ট্রাল মল
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ord.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ord.orderStatus === 'delivered' ? 'ডেলিভার্ড' : 'প্রসেসিং'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{ord.customerName} • <span className="font-mono text-slate-500">{ord.customerPhone}</span></p>
                  <p className="text-[11px] text-slate-500 truncate max-w-md">{ord.customerAddress}</p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 block">৳{ord.totalAmount}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                      ord.vendorPayoutStatus === 'settled' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {ord.vendorPayoutStatus === 'settled' ? 'পেআউট পেইড' : 'পেআউট বকেয়া'}
                    </span>
                  </div>

                  {onConvertOrderToSale && (
                    <button
                      type="button"
                      onClick={() => onConvertOrderToSale(ord)}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition"
                    >
                      চালান / সেল করুন
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
