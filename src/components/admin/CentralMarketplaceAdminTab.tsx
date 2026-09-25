import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Sliders,
  DollarSign,
  Phone,
  MapPin,
  ExternalLink,
  Sparkles,
  Zap,
  CreditCard,
  Wallet,
  Copy,
  Check,
  ArrowDownLeft,
  Building,
  XCircle,
  Info,
} from 'lucide-react';
import { marketplaceAdminApi } from '../../services/marketplaceAdminService';

interface CentralMarketplaceAdminTabProps {
  isSuperAdmin: boolean;
}

export const CentralMarketplaceAdminTab: React.FC<CentralMarketplaceAdminTabProps> = ({ isSuperAdmin }) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'payouts' | 'products' | 'categories' | 'settings'>('orders');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    masterOrders: any[];
    subOrders: any[];
    products: any[];
    categories: any[];
    settings: any;
  }>({
    masterOrders: [],
    subOrders: [],
    products: [],
    categories: [],
    settings: {},
  });

  // Payout Management State
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
  const [payoutSearch, setPayoutSearch] = useState<string>('');
  const [selectedPayoutToProcess, setSelectedPayoutToProcess] = useState<any | null>(null);
  const [adminTrxIdInput, setAdminTrxIdInput] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [isProcessingPayout, setIsProcessingPayout] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedMasterOrder, setSelectedMasterOrder] = useState<any | null>(null);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', nameBn: '', nameEn: '', slug: '', icon: 'ShoppingBag', sortOrder: 1, isActive: true });

  // Platform & Delivery Settings
  const [settingsForm, setSettingsForm] = useState({
    isMarketplaceActive: true,
    commissionPercent: 0,
    deliveryFeeDhaka: 70,
    deliveryFeeOutside: 130,
    bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও অরিজিনাল পণ্যের নিশ্চয়তা!',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await marketplaceAdminApi.getOverview();
      if (res.success) {
        setData({
          masterOrders: res.masterOrders || [],
          subOrders: res.subOrders || [],
          products: res.products || [],
          categories: res.categories || [],
          settings: res.settings || {},
        });
        if (res.settings) {
          setSettingsForm((prev) => ({
            ...prev,
            isMarketplaceActive: res.settings.isMarketplaceActive !== false,
            deliveryFeeDhaka: res.settings.deliveryFeeDhaka ?? 70,
            deliveryFeeOutside: res.settings.deliveryFeeOutside ?? 130,
            bannerNotice: res.settings.bannerNotice ?? prev.bannerNotice,
          }));
        }
      }

      // Load vendor payout requests
      try {
        const payoutsRes = await marketplaceAdminApi.getPayoutRequests();
        if (payoutsRes.success) {
          setPayoutRequests(payoutsRes.requests || []);
        }
      } catch (e) {
        console.warn('Payout requests load notice:', e);
      }
    } catch (err: any) {
      console.warn('Marketplace admin load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('কপি করা হয়েছে');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProcessPayout = async (action: 'approve' | 'reject') => {
    if (!selectedPayoutToProcess) return;

    if (action === 'approve' && !adminTrxIdInput.trim()) {
      alert('দয়া করে বিকাশ/নগদ/ব্যাংক পেমেন্টের TrxID লিখুন।');
      return;
    }

    setIsProcessingPayout(true);
    try {
      const res = await marketplaceAdminApi.processPayoutRequest(selectedPayoutToProcess.id, {
        action,
        adminTransactionId: adminTrxIdInput.trim() || undefined,
        adminNote: adminNoteInput.trim() || undefined,
      });

      if (res.success) {
        showToast(action === 'approve' ? '✅ ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক হয়েছে!' : 'পেআউট আবেদনটি বাতিল করা হয়েছে');
        setSelectedPayoutToProcess(null);
        setAdminTrxIdInput('');
        setAdminNoteInput('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'পেআউট প্রসেস করতে সমস্যা হয়েছে');
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Update Master Order Status
  const handleUpdateOrderStatus = async (orderId: string, overallStatus: string, paymentStatus?: string) => {
    try {
      await marketplaceAdminApi.updateOrderStatus(orderId, { overallStatus, paymentStatus });
      showToast('অর্ডার স্ট্যাটাস সফলভাবে আপডেট হয়েছে');
      loadData();
      if (selectedMasterOrder && selectedMasterOrder.id === orderId) {
        setSelectedMasterOrder((prev: any) => ({
          ...prev,
          overallStatus,
          ...(paymentStatus ? { paymentStatus } : {}),
        }));
      }
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Settle Vendor Payout
  const handleSettlePayout = async (subOrderId: string, status: string) => {
    try {
      await marketplaceAdminApi.settleVendorPayout(subOrderId, {
        vendorPayoutStatus: status,
        adminNote: `সুপার অ্যাডমিন কর্তৃক পেআউট ${status === 'settled' ? 'পরিশোধিত' : status} মার্ক করা হয়েছে`,
      });
      showToast(status === 'settled' ? 'ভেন্ডর পেআউট পরিশোধিত মার্ক করা হয়েছে' : 'পেআউট স্ট্যাটাস আপডেট হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'পেআউট আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Moderate Product
  const handleModerateProduct = async (prodId: string, updates: any) => {
    try {
      await marketplaceAdminApi.moderateProduct(prodId, updates);
      showToast('পণ্যের মার্কেটপ্লেস স্ট্যাটাস আপডেট করা হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.nameBn.trim()) {
      alert('ক্যাটাগরির বাংলা নাম আবশ্যক');
      return;
    }
    try {
      await marketplaceAdminApi.saveCategory({
        ...catForm,
        slug: catForm.slug.trim() || catForm.nameEn.toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`,
      });
      setIsCatModalOpen(false);
      showToast('ক্যাটাগরি সফলভাবে সংরক্ষিত হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'ক্যাটাগরি সংরক্ষণ ব্যর্থ হয়েছে');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ক্যাটাগরি মুছে ফেলতে চান?')) return;
    try {
      await marketplaceAdminApi.saveCategory({ id, action: 'delete' });
      showToast('ক্যাটাগরি মুছে ফেলা হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await marketplaceAdminApi.saveSettings({
        ...data.settings,
        ...settingsForm,
      });
      showToast('মার্কেটপ্লেস সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Derived Metrics
  const totalMasterOrders = data.masterOrders.length;
  const totalGmv = data.masterOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const pendingOrdersCount = data.masterOrders.filter(o => o.overallStatus === 'processing' || o.overallStatus === 'pending').length;
  const totalListedProducts = data.products.length;

  // Filtered Orders
  const filteredOrders = data.masterOrders.filter((ord) => {
    const matchesStatus = orderStatusFilter === 'all' || ord.overallStatus === orderStatusFilter;
    const matchesSearch =
      !orderSearch.trim() ||
      ord.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerPhone.includes(orderSearch.trim());
    return matchesStatus && matchesSearch;
  });

  // Filtered Products
  const filteredProducts = data.products.filter((p) => {
    return (
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.vendorShopName && p.vendorShopName.toLowerCase().includes(productSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMsg}
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
              <Store className="w-4 h-4 text-amber-400" />
              <span>সুপার অ্যাডমিন প্ল্যাটফর্ম কন্ট্রোল</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              সেন্ট্রাল মাল্টি-ভেন্ডর মার্কেটপ্লেস মল
            </h2>
            <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
              সারা দেশের সকল ভেন্ডরের পণ্য, মাস্টার অর্ডার স্প্লিটিং, পেআউট এবং ক্যাটাগরি সমন্বয়ের প্রধান নিয়ন্ত্রণ কেন্দ্র।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/marketplace"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-xs"
            >
              <span>মার্কেটপ্লেস মল ভিউ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3 py-2 bg-teal-700/60 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মোট মাস্টার অর্ডার</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">{totalMasterOrders}</span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">সর্বমোট</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মোট জিএমভি (বিক্রয়)</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-teal-900">৳{totalGmv.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">গ্রস সেলস</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">অপেক্ষমাণ অর্ডার</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-600">{pendingOrdersCount}</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">প্রসেসিং</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
          <p className="text-xs text-slate-500 font-medium">মার্কেটপ্লেস লাইভ পণ্য</p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-indigo-900">{totalListedProducts}</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">অন-মল</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
            activeSubTab === 'orders'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          📋 সেন্ট্রাল মাস্টার অর্ডার ({data.masterOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payouts')}
          className={`px-4 py-2.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'payouts'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>💸 ভেন্ডর পেআউট সেটেলমেন্ট</span>
          {payoutRequests.filter(p => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black animate-pulse">
              {payoutRequests.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`px-4 py-2.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
            activeSubTab === 'products'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          📦 পণ্য মডারেশন ও অনুমোদন ({data.products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
            activeSubTab === 'categories'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🏷️ ক্যাটাগরি তালিকা ({data.categories.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
            activeSubTab === 'settings'
              ? 'border-teal-700 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          ⚙️ মার্কেটপ্লেস প্ল্যাটফর্ম সেটিংস
        </button>
      </div>

      {/* SUB-TAB 1: MASTER ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="অর্ডার নম্বর, কাস্টমার নাম বা ফোন দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              >
                <option value="all">সব স্ট্যাটাস ({data.masterOrders.length})</option>
                <option value="processing">প্রসেসিং (Processing)</option>
                <option value="confirmed">নিশ্চিতকৃত (Confirmed)</option>
                <option value="delivered">ডেলিভার্ড (Delivered)</option>
                <option value="cancelled">বাতিল (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">কোনো মাস্টার অর্ডার পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে অনুসন্ধান করুন</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                  <thead className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <th className="p-3.5">অর্ডার নম্বর ও তারিখ</th>
                      <th className="p-3.5">কাস্টমার তথ্য</th>
                      <th className="p-3.5">পরিমাণ ও মোট বিল</th>
                      <th className="p-3.5">পেমেন্ট মেথড</th>
                      <th className="p-3.5">অর্ডার স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const relatedSubs = data.subOrders.filter(
                        (s) => s.masterOrderId === ord.id || (ord.subOrderIds && ord.subOrderIds.includes(s.id))
                      );

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-teal-950 block">{ord.orderNumber}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(ord.createdAt).toLocaleDateString('bn-BD', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                            <span className="text-slate-500 font-mono text-[11px] block">{ord.customerPhone}</span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-xs">{ord.customerAddress}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-black text-slate-900 block">৳{ord.grandTotal}</span>
                            <span className="text-[10px] text-slate-500">
                              পণ্য ৳{ord.totalProductsAmount} + ডেলিভারি ৳{ord.totalDeliveryCharge}
                            </span>
                            <span className="text-[10px] text-teal-700 block font-bold">
                              {relatedSubs.length || ord.vendorIds?.length || 1}টি ভেন্ডর পার্সেল
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-semibold block uppercase">{ord.paymentMethod}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold inline-block ${
                                  ord.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {ord.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বকেয়া/COD'}
                              </span>
                              {ord.paymentTrxId && (
                                <span className="text-[10px] font-mono text-slate-500 block truncate">
                                  Trx: {ord.paymentTrxId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold inline-block ${
                                ord.overallStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.overallStatus === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ord.overallStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.overallStatus === 'delivered'
                                ? 'ডেলিভার্ড'
                                : ord.overallStatus === 'confirmed'
                                ? 'নিশ্চিত'
                                : ord.overallStatus === 'cancelled'
                                ? 'বাতিল'
                                : 'প্রসেসিং'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedMasterOrder(ord)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              বিস্তারিত ও পেআউট
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Master Order Detail Modal */}
          {selectedMasterOrder && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">মাস্টার অর্ডার ভিউ</span>
                    <h3 className="text-lg font-black text-slate-900 font-mono">
                      #{selectedMasterOrder.orderNumber}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMasterOrder(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Customer & Payment Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1">
                      গ্রাহকের বিবরণ:
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">নাম:</span>
                      <span className="font-bold text-slate-900">{selectedMasterOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">মোবাইল:</span>
                      <span className="font-bold font-mono text-slate-900">{selectedMasterOrder.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ঠিকানা:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[180px]">{selectedMasterOrder.customerAddress}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1">
                      পেমেন্ট ও গেটওয়ে তথ্য:
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">মেথড:</span>
                      <span className="font-bold text-slate-900 uppercase bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                        {selectedMasterOrder.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">স্ট্যাটাস:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        selectedMasterOrder.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedMasterOrder.paymentStatus === 'paid_pending_verify'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedMasterOrder.paymentStatus === 'paid'
                          ? 'পরিশোধিত (Paid)'
                          : selectedMasterOrder.paymentStatus === 'paid_pending_verify'
                          ? 'যাচাই বাকি (Pending)'
                          : 'বকেয়া/COD'}
                      </span>
                    </div>
                    {selectedMasterOrder.paymentTrxId && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">TrxID:</span>
                        <span className="font-mono font-bold text-slate-900 bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded">
                          {selectedMasterOrder.paymentTrxId}
                        </span>
                      </div>
                    )}
                    {selectedMasterOrder.senderPhone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">প্রেরক নম্বর:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedMasterOrder.senderPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">সর্বমোট বিল:</span>
                      <span className="font-black text-teal-900 text-sm">৳{selectedMasterOrder.grandTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Status Update Actions */}
                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-teal-950">মাস্টার অর্ডার স্ট্যাটাস পরিবর্তন:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedMasterOrder.id, 'confirmed')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      অর্ডার নিশ্চিত করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedMasterOrder.id, 'delivered')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                    >
                      ডেলিভারি সম্পন্ন মার্ক করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedMasterOrder.id, selectedMasterOrder.overallStatus, 'paid')}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold"
                    >
                      পেমেন্ট ভেরিফাই করুন (Paid)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderStatus(selectedMasterOrder.id, 'cancelled')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                    >
                      অর্ডার বাতিল
                    </button>
                  </div>
                </div>

                {/* Sub-Orders Breakdown (Split by Vendor) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    ভেন্ডর সাব-অর্ডার ও পেআউট সেটেলমেন্ট:
                  </h4>

                  {data.subOrders
                    .filter((s) => s.masterOrderId === selectedMasterOrder.id)
                    .map((sub) => (
                      <div key={sub.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="font-bold text-slate-900">{sub.vendorShopName || 'ভেন্ডর দোকান'}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">ফোন: {sub.vendorPhone}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-900 block">৳{sub.totalAmount}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                                sub.vendorPayoutStatus === 'settled'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.vendorPayoutStatus === 'settled' ? 'পেআউট পরিশোধিত' : 'পেআউট বকেয়া'}
                            </span>
                          </div>
                        </div>

                        {/* Items in sub-order */}
                        <div className="space-y-1">
                          {sub.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-slate-600">
                              <span>
                                {it.name} × {it.quantity} {it.unit || 'পিস'}
                              </span>
                              <span className="font-bold">৳{it.subtotal || it.unitPrice * it.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Payout Action */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">ভেন্ডর একাউন্টে টাকা পাঠানোর পর:</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleSettlePayout(
                                sub.id,
                                sub.vendorPayoutStatus === 'settled' ? 'unsettled' : 'settled'
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              sub.vendorPayoutStatus === 'settled'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {sub.vendorPayoutStatus === 'settled' ? 'বকেয়া মার্ক করুন' : 'পেআউট পরিশোধিত করুন'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: VENDOR PAYOUT SETTLEMENT */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-4">
          {/* Top Payout KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                অপেক্ষমাণ পেআউট আবেদন
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-950">
                  ৳{payoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString('en-US')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {payoutRequests.filter(p => p.status === 'pending').length} টি আবেদন
                </span>
              </div>
              <p className="text-[10px] text-amber-700/90">ভেন্ডরদের বিকাশ/নগদে টাকা পাঠিয়ে TrxID এন্ট্রি করুন</p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                সফলভাবে পরিশোধিত (Paid)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-950">
                  ৳{payoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString('en-US')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  {payoutRequests.filter(p => p.status === 'approved').length} টি পরিশোধিত
                </span>
              </div>
              <p className="text-[10px] text-emerald-700/90">TrxID সহ ভেন্ডরের ক্যাশবুকে স্বয়ংক্রিয় জমা হয়েছে</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                বাতিলকৃত আবেদন
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800">
                  {payoutRequests.filter(p => p.status === 'rejected').length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">বাতিল</span>
              </div>
              <p className="text-[10px] text-slate-400">তথ্য বা ব্যালেন্স অসঙ্গতির কারণে বাতিল</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                placeholder="দোকানের নাম, ভেন্ডর নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">সব আবেদন ({payoutRequests.length})</option>
                <option value="pending">⏳ অপেক্ষমাণ ({payoutRequests.filter(p => p.status === 'pending').length})</option>
                <option value="approved">✅ পরিশোধিত ({payoutRequests.filter(p => p.status === 'approved').length})</option>
                <option value="rejected">❌ বাতিল ({payoutRequests.filter(p => p.status === 'rejected').length})</option>
              </select>
            </div>
          </div>

          {/* Payout Requests List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {payoutRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">কোনো পেআউট আবেদন নেই</p>
                <p className="text-xs text-slate-400">ভেন্ডররা মার্কেটপ্লেস ব্যালেন্স তোলার আবেদন করলে এখানে তালিকা আসবে</p>
              </div>
            ) : (
              <div className="overflow-x-auto divide-y divide-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3.5 sm:px-5">ভেন্ডর ও দোকান</th>
                      <th className="p-3.5 sm:px-5">পরিমাণ</th>
                      <th className="p-3.5 sm:px-5">পেমেন্ট মেথড ও প্রাপক অ্যাকাউন্ট</th>
                      <th className="p-3.5 sm:px-5">আবেদনের তারিখ</th>
                      <th className="p-3.5 sm:px-5">স্ট্যাটাস</th>
                      <th className="p-3.5 sm:px-5">TrxID ও নোট</th>
                      <th className="p-3.5 sm:px-5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutRequests
                      .filter((req) => {
                        if (payoutStatusFilter !== 'all' && req.status !== payoutStatusFilter) return false;
                        if (!payoutSearch.trim()) return true;
                        const q = payoutSearch.toLowerCase();
                        return (
                          (req.storeName && req.storeName.toLowerCase().includes(q)) ||
                          (req.storePhone && req.storePhone.includes(q)) ||
                          (req.accountNumber && req.accountNumber.includes(q)) ||
                          (req.adminTransactionId && req.adminTransactionId.toLowerCase().includes(q))
                        );
                      })
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 sm:px-5">
                            <div className="font-bold text-slate-900 text-sm">{req.storeName || 'ভেন্ডর'}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{req.storePhone || 'ফোন নেই'}</span>
                            </div>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            <span className="text-base font-black text-emerald-800">
                              ৳{Number(req.amount).toLocaleString('en-US')}
                            </span>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold uppercase text-[10px]">
                                {req.paymentMethod}
                              </span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {req.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(req.accountNumber, req.id)}
                                className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                                title="নম্বর কপি করুন"
                              >
                                {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {req.accountType ? `ধরন: ${req.accountType}` : ''} {req.bankName ? `• ${req.bankName}` : ''} {req.branchName ? `(${req.branchName})` : ''}
                            </div>
                            {req.requestNote && (
                              <div className="text-[10px] text-slate-600 italic mt-0.5">
                                ভেন্ডর নোট: "{req.requestNote}"
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap text-slate-600">
                            <div>{new Date(req.createdAt).toLocaleDateString('bn-BD')}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            {req.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>পরিশোধিত</span>
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>বাতিল</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>অপেক্ষমাণ</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5">
                            {req.adminTransactionId ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">TrxID:</span>
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {req.adminTransactionId}
                                  </span>
                                </div>
                                {req.adminNote && (
                                  <div className="text-[10px] text-slate-500 italic max-w-xs truncate">
                                    "{req.adminNote}"
                                  </div>
                                )}
                              </div>
                            ) : req.adminNote ? (
                              <span className="text-[11px] text-rose-600 italic">নোট: {req.adminNote}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5 text-right whitespace-nowrap">
                            {req.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayoutToProcess(req);
                                  setAdminTrxIdInput('');
                                  setAdminNoteInput('');
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>টাকা পাঠান ও TrxID দিন</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayoutToProcess(req);
                                  setAdminTrxIdInput(req.adminTransactionId || '');
                                  setAdminNoteInput(req.adminNote || '');
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                              >
                                বিবরণ দেখুন
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRODUCT MODERATION */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="পণ্যের নাম বা দোকানের নাম খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-xs flex flex-col justify-between">
                <div className="flex gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-cover rounded-lg bg-slate-100 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      📦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-teal-800 font-bold block truncate">{p.vendorShopName || 'ভেন্ডর'}</span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                    <p className="text-xs font-black text-slate-900 mt-0.5">৳{p.salePrice}</p>
                    <span className="text-[10px] text-slate-500">স্টক: {p.stock}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleModerateProduct(p.id, { isFeaturedOnMarketplace: !p.isFeaturedOnMarketplace })}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      p.isFeaturedOnMarketplace ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.isFeaturedOnMarketplace ? '★ ফিচার্ড সক্রিয়' : '☆ ফিচার্ড করুন'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModerateProduct(p.id, { isListedOnMarketplace: !p.isListedOnMarketplace })}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      p.isListedOnMarketplace
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                    }`}
                  >
                    {p.isListedOnMarketplace ? 'মল থেকে বাদ' : 'মলে অনুমোদন'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">সেন্ট্রাল মলের ক্যাটাগরি তালিকা</p>
            <button
              type="button"
              onClick={() => {
                setCatForm({ id: '', nameBn: '', nameEn: '', slug: '', icon: 'ShoppingBag', sortOrder: data.categories.length + 1, isActive: true });
                setIsCatModalOpen(true);
              }}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন ক্যাটাগরি</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 font-bold text-slate-800">
                <tr>
                  <th className="p-3">ক্রম</th>
                  <th className="p-3">বাংলা নাম</th>
                  <th className="p-3">ইংরেজি নাম</th>
                  <th className="p-3">স্লাগ (Slug)</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.categories.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">{c.sortOrder || idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{c.nameBn}</td>
                    <td className="p-3 text-slate-600">{c.nameEn || '-'}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{c.slug}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCatForm({
                            id: c.id,
                            nameBn: c.nameBn,
                            nameEn: c.nameEn || '',
                            slug: c.slug,
                            icon: c.icon || 'ShoppingBag',
                            sortOrder: c.sortOrder || 1,
                            isActive: c.isActive !== false,
                          });
                          setIsCatModalOpen(true);
                        }}
                        className="p-1 text-slate-600 hover:text-teal-800"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Category Add/Edit Modal */}
          {isCatModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-900">
                    {catForm.id ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}
                  </h4>
                  <button type="button" onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">বাংলা নাম *</label>
                    <input
                      type="text"
                      required
                      value={catForm.nameBn}
                      onChange={(e) => setCatForm({ ...catForm, nameBn: e.target.value })}
                      placeholder="যেমন: তেল ও খাঁটি ঘি"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ইংরেজি নাম</label>
                    <input
                      type="text"
                      value={catForm.nameEn}
                      onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                      placeholder="e.g. Oil & Pure Ghee"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">স্লাগ (URL Slug)</label>
                    <input
                      type="text"
                      value={catForm.slug}
                      onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                      placeholder="oil-ghee"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(false)}
                      className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-slate-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-teal-800 text-white rounded-lg font-bold"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: SETTINGS */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 max-w-3xl text-xs shadow-xs">
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900">
              মার্কেটপ্লেস প্ল্যাটফর্ম ও ডেলিভারি সেটিংস
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              সেন্ট্রাল মার্কেটপ্লেসের সার্বিক কার্যকারিতা, ডেলিভারি চার্জ এবং গ্রাহক নোটিশ ব্যানার নিয়ন্ত্রণ করুন।
            </p>
          </div>

          {/* Unified Platform Payment System Info Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>একীভূত প্ল্যাটফর্ম পেমেন্ট সিস্টেম (Unified System Payment Gateway)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              সেন্ট্রাল মার্কেটপ্লেসের জন্য আলাদা কোনো পেমেন্ট গেটওয়ে রাখা হয়নি। সাবস্ক্রিপশন ও সেন্ট্রাল মার্কেটপ্লেস উভয়ই সুপার অ্যাডমিন প্যানেলের প্রধান <strong className="text-slate-800">"পেমেন্ট সেটিংস"</strong> (System Payment Settings) এর অন্তর্ভুক্ত অনলাইন গেটওয়ে (UddoktaPay/Paymently), বিকাশ, নগদ, রকেট, ব্যাংক ট্রান্সফার ও বাংলা কিউআর স্বয়ংক্রিয়ভাবে ব্যবহার করে।
            </p>
          </div>

          {/* Marketplace Active Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-bold text-slate-900">সেন্ট্রাল মার্কেটপ্লেস সক্রিয় রাখুন</p>
              <p className="text-[11px] text-slate-500">বন্ধ রাখলে সাধারণ ভিজিটররা সেন্ট্রাল মলে প্রবেশ করতে পারবে না</p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsForm({ ...settingsForm, isMarketplaceActive: !settingsForm.isMarketplaceActive })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                settingsForm.isMarketplaceActive ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Delivery Charges */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">ডেলিভারি চার্জ নির্ধারণ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ডেলিভারি চার্জ (ঢাকা সিটি ৳)</label>
                <input
                  type="number"
                  value={settingsForm.deliveryFeeDhaka}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFeeDhaka: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ডেলিভারি চার্জ (ঢাকার বাইরে ৳)</label>
                <input
                  type="number"
                  value={settingsForm.deliveryFeeOutside}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFeeOutside: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
            </div>
          </div>

          {/* Banner Notice */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-bold text-slate-700 block mb-1">মার্কেটপ্লেস টপ নোটিশ বার্তা</label>
              <textarea
                rows={2}
                value={settingsForm.bannerNotice}
                onChange={(e) => setSettingsForm({ ...settingsForm, bannerNotice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="w-full sm:w-auto px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 text-xs sm:text-sm"
          >
            {isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'মার্কেটপ্লেস সেটিংস সংরক্ষণ করুন'}
          </button>
        </form>
      )}

      {/* PAYOUT PROCESSING MODAL */}
      {selectedPayoutToProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-teal-900 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Wallet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">ভেন্ডর পেআউট সেটেলমেন্ট</h3>
                  <p className="text-[11px] text-teal-200">সুপার অ্যাডমিন পেমেন্ট নিষ্পত্তি ও TrxID প্রদান</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayoutToProcess(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Vendor & Amount Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">পরিশোধযোগ্য পেআউট</span>
                <span className="text-3xl font-black text-emerald-950">৳{Number(selectedPayoutToProcess.amount).toLocaleString('en-US')}</span>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  {selectedPayoutToProcess.storeName || 'ভেন্ডর'} ({selectedPayoutToProcess.storePhone || 'ফোন নেই'})
                </div>
              </div>

              {/* Target Account Details with Copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">পেমেন্ট মাধ্যম ও প্রাপক নম্বর</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-black text-[10px] uppercase">
                    {selectedPayoutToProcess.paymentMethod}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block">অ্যাকাউন্ট নম্বর:</span>
                    <span className="font-mono font-black text-base text-slate-900">
                      {selectedPayoutToProcess.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPayoutToProcess.accountNumber, 'modal_acc')}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedId === 'modal_acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'modal_acc' ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>ধরন: <span className="font-bold">{selectedPayoutToProcess.accountType || 'personal'}</span></div>
                  {selectedPayoutToProcess.bankName && (
                    <div>ব্যাংক: <span className="font-bold">{selectedPayoutToProcess.bankName}</span> {selectedPayoutToProcess.branchName ? `(${selectedPayoutToProcess.branchName})` : ''}</div>
                  )}
                  {selectedPayoutToProcess.requestNote && (
                    <div className="text-slate-500 italic mt-1">ভেন্ডর নোট: "{selectedPayoutToProcess.requestNote}"</div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 text-[11px] text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-700" />
                  <span>পেমেন্ট সেটেলমেন্ট নির্দেশিকা:</span>
                </div>
                <p className="leading-relaxed">
                  ১. আপনার বিকাশ/নগদ অ্যাপ থেকে উপরের নম্বরে Send Money করুন।<br />
                  ২. লেনদেন শেষে প্রাপ্ত TrxID নিচে লিখুন।<br />
                  ৩. অনুমোদন করলে ভেন্ডরের ক্যাশবুকে স্বয়ংক্রিয় এন্ট্রি হবে এবং নোটিফিকেশন যাবে।
                </p>
              </div>

              {/* TrxID Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  বিকাশ/নগদ/ব্যাংক TrxID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminTrxIdInput}
                  onChange={(e) => setAdminTrxIdInput(e.target.value)}
                  placeholder="যেমন: 8N9K2L4P বা TR-10928"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-700 focus:outline-none uppercase"
                />
              </div>

              {/* Admin Note Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">অ্যাডমিন নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="যেমন: বিকাশ পার্সোনাল সেন্ড মানি করা হয়েছে"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={isProcessingPayout}
                  onClick={() => handleProcessPayout('approve')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>পরিশোধ নিশ্চিত করুন (Approve)</span>
                </button>

                {selectedPayoutToProcess.status === 'pending' && (
                  <button
                    type="button"
                    disabled={isProcessingPayout}
                    onClick={() => {
                      if (confirm('আপনি কি নিশ্চিত যে এই আবেদনটি বাতিল করতে চান?')) {
                        handleProcessPayout('reject');
                      }
                    }}
                    className="py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>বাতিল</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPayoutToProcess(null)}
                  className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  বন্ধ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
