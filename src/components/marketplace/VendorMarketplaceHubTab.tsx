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
  Wallet,
  ArrowDownLeft,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Building,
  CreditCard,
  PhoneCall,
  Printer,
  X,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  Lock,
} from 'lucide-react';
import { Product, OnlineOrder, StoreProfile, VendorPayoutRequest, VendorWalletSummary } from '../../types';
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
  // Navigation / View sub-sections
  const [hubSection, setHubSection] = useState<'wallet' | 'products' | 'orders'>('wallet');

  // Search & Filter for products
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Wallet & Payout State
  const [wallet, setWallet] = useState<VendorWalletSummary | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VendorPayoutRequest | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Withdraw Form State
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    paymentMethod: 'bkash' as 'bkash' | 'nagad' | 'rocket' | 'bank',
    accountNumber: store?.phone || '',
    accountType: 'personal',
    bankName: '',
    branchName: '',
    requestNote: '',
  });

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

  const listedProducts = products.filter((p) => p.isListedOnMarketplace === true);

  // Load Wallet Data from API
  const loadWalletData = async () => {
    setIsWalletLoading(true);
    try {
      const res = await marketplaceApi.getVendorWallet();
      if (res.success) {
        setWallet(res as any);
      }
    } catch (err: any) {
      console.warn('Wallet load note:', err.message);
    } finally {
      setIsWalletLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [orders.length]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    if (onShowToast) onShowToast('কপি করা হয়েছে');
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  // Handle Withdrawal Request Submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawForm.amount);
    const available = wallet?.availableForWithdrawal ?? 0;

    if (!amountNum || isNaN(amountNum) || amountNum < 100) {
      alert('ন্যূনতম উত্তোলনের পরিমাণ ১০০ টাকা হতে হবে।');
      return;
    }

    if (amountNum > available) {
      alert(`আপনার বর্তমান উত্তোলনযোগ্য ব্যালেন্স ৳${available.toLocaleString('en-US')}। এর বেশি তোলা সম্ভব নয়।`);
      return;
    }

    if (!withdrawForm.accountNumber.trim()) {
      alert('দয়া করে আপনার বিকাশ/নগদ/রকেট বা ব্যাংক অ্যাকাউন্ট নম্বর লিখুন।');
      return;
    }

    if (withdrawForm.paymentMethod === 'bank' && !withdrawForm.bankName.trim()) {
      alert('দয়া করে ব্যাংকের নাম উল্লেখ করুন।');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      const res = await marketplaceApi.createPayoutRequest({
        amount: amountNum,
        paymentMethod: withdrawForm.paymentMethod,
        accountNumber: withdrawForm.accountNumber.trim(),
        accountType: withdrawForm.accountType,
        bankName: withdrawForm.bankName.trim() || undefined,
        branchName: withdrawForm.branchName.trim() || undefined,
        requestNote: withdrawForm.requestNote.trim() || undefined,
      });

      if (res.success) {
        setIsWithdrawModalOpen(false);
        setWithdrawForm((prev) => ({ ...prev, amount: '', requestNote: '' }));
        if (onShowToast) {
          onShowToast('🎉 টাকা তোলার আবেদন জমা হয়েছে! এডমিন যাচাই করে আপনার বিকাশ/নগদে টাকা পাঠাবেন।');
        }
        await loadWalletData();
      }
    } catch (err: any) {
      alert(err.message || 'উইথড্র আবেদন সম্পন্ন হতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmittingWithdraw(false);
    }
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

  const availableBalance = wallet?.availableForWithdrawal ?? Math.max(0, totalMarketplaceSales - settledSales);
  const pendingDelivery = wallet?.pendingDeliverySales ?? (totalMarketplaceSales - settledSales);
  const inProcessWithdraw = wallet?.pendingWithdrawalAmount ?? 0;
  const totalSettled = wallet?.settledSales ?? settledSales;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden border border-teal-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] tracking-wider uppercase shadow-xs">
                ভেন্ডর মল ও পেআউট হাব
              </span>
              <span className="text-xs text-teal-200">সেন্ট্রাল মার্কেটপ্লেস</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
              আপনার পণ্য সারা দেশে বিক্রি করুন এবং সহজে পেমেন্ট গ্রহণ করুন
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              সেন্ট্রাল মার্কেটপ্লেসে বিক্রি হওয়া প্রতিটি পণ্যের টাকা আপনার ওয়ালেটে স্বয়ংক্রিয়ভাবে জমা হয়। ডেলিভারি সম্পন্ন হলেই বিকাশ, নগদ বা ব্যাংকে টাকা তুলতে পারবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setWithdrawForm((prev) => ({
                  ...prev,
                  amount: availableBalance > 0 ? String(availableBalance) : '',
                  accountNumber: prev.accountNumber || store?.phone || '',
                }));
                setIsWithdrawModalOpen(true);
              }}
              disabled={availableBalance < 100}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-4 h-4 text-slate-950" />
              <span>টাকা তোলার আবেদন (Withdraw)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3.5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>কীভাবে কাজ করে?</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="px-3.5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>ভেন্ডর নীতিমালা</span>
            </button>

            {onOpenMarketplace && (
              <button
                type="button"
                onClick={onOpenMarketplace}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
              >
                <span>সেন্ট্রাল মল লাইভ ভিউ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3-Step Visual Quick Process Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0">
              ১
            </div>
            <div className="space-y-0.5">
              <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span>পণ্য সেন্ট্রাল মলে দিন</span>
              </h5>
              <p className="text-[11px] text-slate-500 leading-tight">
                পণ্য লিস্টিং ট্যাব থেকে অন করুন। দেশের সব ক্রেতা পণ্য দেখতে পারবে।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
              ২
            </div>
            <div className="space-y-0.5">
              <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                <span>অর্ডার ডেলিভারি করুন</span>
              </h5>
              <p className="text-[11px] text-slate-500 leading-tight">
                অর্ডার আসলে কুরিয়ারে পাঠান। কাস্টমার গ্রহণ করলেই ব্যালেন্স রেডি হবে।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
              ৩
            </div>
            <div className="space-y-0.5">
              <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                <span>বিকাশ/নগদে টাকা নিন</span>
              </h5>
              <p className="text-[11px] text-slate-500 leading-tight">
                উইথড্র আবেদন করুন। এডমিন টাকা পাঠিয়ে TrxID দেবে ও ক্যাশবুকে জমা হবে।
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setHubSection('wallet')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            hubSection === 'wallet'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Wallet className="w-4 h-4 text-teal-700" />
          <span>পেমেন্ট ওয়ালেট ও হিসাব</span>
          {availableBalance > 0 && (
            <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
              ৳{availableBalance.toLocaleString()}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setHubSection('orders')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            hubSection === 'orders'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-700" />
          <span>মার্কেটপ্লেস অর্ডারসমূহ</span>
          <span className="px-2 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full font-bold">
            {marketplaceOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setHubSection('products')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            hubSection === 'products'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Package className="w-4 h-4 text-teal-700" />
          <span>পণ্য লিস্টিং কন্ট্রোল</span>
          <span className="px-2 py-0.2 bg-teal-100 text-teal-800 text-[10px] rounded-full font-bold">
            {listedProducts.length}/{products.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: WALLET & PAYOUT DASHBOARD */}
      {hubSection === 'wallet' && (
        <div className="space-y-6">
          {/* Main 4 Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Available for Withdrawal (Hero Card) */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  উত্তোলনযোগ্য ব্যালেন্স
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  রেডি ব্যালেন্স
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-emerald-950 tracking-tight">
                  ৳{availableBalance.toLocaleString('en-US')}
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-1">
                  সফলভাবে ডেলিভার্ড অর্ডারের টাকা যা এখনই তুলতে পারেন
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWithdrawForm((prev) => ({
                    ...prev,
                    amount: availableBalance > 0 ? String(availableBalance) : '',
                    accountNumber: prev.accountNumber || store?.phone || '',
                  }));
                  setIsWithdrawModalOpen(true);
                }}
                disabled={availableBalance < 100}
                className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>টাকা তোলার আবেদন করুন</span>
              </button>
            </div>

            {/* 2. Pending Delivery (Escrow / In-Transit) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ডেলিভারি চলমান (হোল্ড)</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ৳{pendingDelivery.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                পণ্য কাস্টমারের হাতে পৌঁছানো মাত্র এই টাকা উত্তোলনযোগ্য ব্যালেন্সে যোগ হবে
              </p>
            </div>

            {/* 3. In-Process Withdrawals */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">উইথড্র প্রক্রিয়াধীন</span>
                <RefreshCw className={`w-4 h-4 text-indigo-500 ${inProcessWithdraw > 0 ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-2xl font-black text-indigo-950">
                ৳{inProcessWithdraw.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                আপনার দেওয়া উইথড্র আবেদনটি সুপার এডমিন ভেরিফাই করছেন
              </p>
            </div>

            {/* 4. Total Settled / Withdrawn */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ইতিমধ্যে পরিশোধিত</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ৳{totalSettled.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                এডমিন কর্তৃক আপনার বিকাশ/নগদ/ব্যাংকে সফলভাবে পাঠানো মোট টাকা
              </p>
            </div>
          </div>

          {/* How Payout Works Explainer Card */}
          <div className="bg-teal-50/60 rounded-2xl p-4 sm:p-5 border border-teal-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
                ৳
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-teal-950">
                  সেন্ট্রাল মার্কেটপ্লেস পেমেন্ট কীভাবে কাজ করে?
                </h4>
                <p className="text-[11px] sm:text-xs text-teal-900/80 leading-relaxed">
                  ১. কাস্টমার সেন্ট্রাল মলে বিকাশ/নগদে অর্ডার দিলে টাকা সুপার এডমিনের কাছে থাকে। ২. আপনি পণ্য পাঠাবেন এবং কাস্টমার ডেলিভারি গ্রহণ করবে। ৩. ডেলিভারি সম্পন্ন হলেই আপনি ‘টাকা তোলার আবেদন’ পাঠাবেন। ৪. এডমিন আপনার বিকাশ/নগদে Send Money করে TrxID দিয়ে পরিশোধ নিশ্চিত করবে এবং আপনার ক্যাশবুকে স্বয়ংক্রিয় এন্ট্রি হয়ে যাবে।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadWalletData}
              disabled={isWalletLoading}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-teal-300 text-teal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isWalletLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ হিসাব</span>
            </button>
          </div>

          {/* Payout Requests History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-700" />
                  <span>উত্তোলন ও সেটেলমেন্ট ইতিহাস ({wallet?.payoutRequests?.length || 0})</span>
                </h4>
                <p className="text-xs text-slate-500">আপনার করা সকল টাকা তোলার আবেদন এবং এডমিন কর্তৃক পেমেন্ট প্রদানের প্রমাণ</p>
              </div>
            </div>

            {!wallet?.payoutRequests || wallet.payoutRequests.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">এখনো কোনো টাকা তোলার আবেদন করেননি</p>
                <p className="text-[11px] text-slate-400">
                  আপনার উত্তোলনযোগ্য ব্যালেন্স তৈরি হলে ওপরের ‘টাকা তোলার আবেদন’ বাটনে ক্লিক করে বিকাশ/নগদে টাকা নিতে পারবেন।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3.5 sm:px-5">তারিখ ও সময়</th>
                      <th className="p-3.5 sm:px-5">পরিমাণ</th>
                      <th className="p-3.5 sm:px-5">পেমেন্ট মেথড ও অ্যাকাউন্ট</th>
                      <th className="p-3.5 sm:px-5">স্ট্যাটাস</th>
                      <th className="p-3.5 sm:px-5">এডমিন পেমেন্ট TrxID / নোট</th>
                      <th className="p-3.5 sm:px-5 text-right">রসিদ / স্লিপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wallet.payoutRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 sm:px-5 whitespace-nowrap text-slate-700">
                          <div className="font-bold text-slate-900">
                            {new Date(req.createdAt).toLocaleDateString('bn-BD', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(req.createdAt).toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="p-3.5 sm:px-5 whitespace-nowrap">
                          <span className="text-sm font-black text-slate-900">
                            ৳{req.amount.toLocaleString('en-US')}
                          </span>
                        </td>

                        <td className="p-3.5 sm:px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold uppercase text-[10px]">
                              {req.paymentMethod}
                            </span>
                            <span className="font-mono font-bold text-slate-800">{req.accountNumber}</span>
                          </div>
                          {req.bankName && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {req.bankName} {req.branchName ? `(${req.branchName})` : ''}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 sm:px-5 whitespace-nowrap">
                          {req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>পরিশোধিত (Paid)</span>
                            </span>
                          ) : req.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>বাতিল (Rejected)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>অপেক্ষমাণ (Pending)</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 sm:px-5">
                          {req.adminTransactionId ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">TrxID:</span>
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {req.adminTransactionId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(req.adminTransactionId || '', req.id)}
                                  className="text-slate-400 hover:text-teal-700 cursor-pointer p-0.5"
                                  title="কপি করুন"
                                >
                                  {copiedId === req.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              {req.adminNote && (
                                <p className="text-[11px] text-slate-500 italic max-w-xs truncate">
                                  "{req.adminNote}"
                                </p>
                              )}
                            </div>
                          ) : req.adminNote ? (
                            <span className="text-[11px] text-rose-600 italic">নোট: {req.adminNote}</span>
                          ) : (
                            <span className="text-[11px] text-slate-400">ভেরিফিকেশন চলমান...</span>
                          )}
                        </td>

                        <td className="p-3.5 sm:px-5 text-right whitespace-nowrap">
                          {req.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedVoucher(req)}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[11px] rounded-lg border border-teal-200 inline-flex items-center gap-1 cursor-pointer transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-700" />
                              <span>স্লিপ দেখুন</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">—</span>
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

      {/* SECTION 2: PRODUCTS INVENTORY MARKETPLACE TOGGLES */}
      {hubSection === 'products' && (
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
              <button
                type="button"
                onClick={handleBulkEnable}
                disabled={isBulkProcessing}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>{isBulkProcessing ? 'যুক্ত হচ্ছে...' : 'সব পণ্য এক ক্লিকে মলে দিন'}</span>
              </button>

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
      )}

      {/* SECTION 3: MARKETPLACE ORDERS RECEIVED */}
      {hubSection === 'orders' && (
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
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
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
      )}

      {/* WITHDRAWAL REQUEST MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-teal-900 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Wallet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">টাকা তোলার আবেদন (Withdraw)</h3>
                  <p className="text-[11px] text-teal-200">সেন্ট্রাল মার্কেটপ্লেস ব্যালেন্স উত্তোলন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4 text-xs">
              {/* Available Balance Reminder */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">বর্তমান উত্তোলনযোগ্য ব্যালেন্স</span>
                  <span className="text-xl font-black text-emerald-950">৳{availableBalance.toLocaleString('en-US')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawForm((prev) => ({ ...prev, amount: String(availableBalance) }))}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                >
                  সব তুলুন
                </button>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  উত্তোলনের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    max={availableBalance}
                    required
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    placeholder="যেমন: 500"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                </div>
                <p className="text-[10px] text-slate-400">ন্যূনতম উত্তোলন ১০০ টাকা</p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  পেমেন্ট গ্রহণের মাধ্যম <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'bkash', name: 'বিকাশ', color: 'border-pink-300 text-pink-700 bg-pink-50/50' },
                    { id: 'nagad', name: 'নগদ', color: 'border-amber-300 text-amber-700 bg-amber-50/50' },
                    { id: 'rocket', name: 'রকেট', color: 'border-purple-300 text-purple-700 bg-purple-50/50' },
                    { id: 'bank', name: 'ব্যাংক', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setWithdrawForm({ ...withdrawForm, paymentMethod: m.id as any })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        withdrawForm.paymentMethod === m.id
                          ? 'border-teal-700 bg-teal-50 text-teal-900 ring-2 ring-teal-700/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Number & Type */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 block">
                    {withdrawForm.paymentMethod === 'bank' ? 'অ্যাকাউন্ট নম্বর' : 'মোবাইল নম্বর'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawForm.accountNumber}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                    placeholder={withdrawForm.paymentMethod === 'bank' ? 'যেমন: 1512xxxxxx' : '017XXXXXXXX'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">অ্যাকাউন্ট টাইপ</label>
                  <select
                    value={withdrawForm.accountType}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, accountType: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="personal">পার্সোনাল</option>
                    <option value="agent">এজেন্ট</option>
                    <option value="merchant">মার্চেন্ট</option>
                    <option value="savings">সেভিংস (ব্যাংক)</option>
                  </select>
                </div>
              </div>

              {/* Extra Bank Fields if Bank */}
              {withdrawForm.paymentMethod === 'bank' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">ব্যাংকের নাম *</label>
                    <input
                      type="text"
                      required
                      value={withdrawForm.bankName}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                      placeholder="যেমন: ডাচ-বাংলা ব্যাংক"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">শাখা (Branch)</label>
                    <input
                      type="text"
                      value={withdrawForm.branchName}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, branchName: e.target.value })}
                      placeholder="যেমন: মিরপুর শাখা"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Optional Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={withdrawForm.requestNote}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, requestNote: e.target.value })}
                  placeholder="যেমন: বিকাশ পার্সোনাল সেন্ড মানি করুন"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Instruction banner */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p>
                  আবেদন জমা দেওয়ার পর সুপার এডমিন আপনার নাম্বারে সরাসরি টাকা পাঠাবেন এবং TrxID দিয়ে পরিশোধ নিশ্চিত করবেন। টাকা পৌঁছার সাথে সাথে আপনার ক্যাশবুকে স্বয়ংক্রিয় এন্ট্রি হয়ে যাবে।
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingWithdraw ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>আবেদন জমা দিন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT VOUCHER SLIP MODAL */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <h4 className="font-black text-sm text-white">সেটেলমেন্ট মানি রিসিট স্লিপ</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="text-center py-2 border-b border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">পরিশোধিত টাকার পরিমাণ</span>
                <span className="text-3xl font-black text-emerald-950">৳{selectedVoucher.amount.toLocaleString('en-US')}</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ✅ পরিশোধ সম্পন্ন (PAID)
                </span>
              </div>

              <div className="space-y-2 divide-y divide-slate-100 text-slate-600">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">ট্রানজেকশন TrxID</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                    {selectedVoucher.adminTransactionId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">পেমেন্ট মাধ্যম</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {selectedVoucher.paymentMethod} ({selectedVoucher.accountType || 'Personal'})
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">প্রাপক অ্যাকাউন্ট</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVoucher.accountNumber}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">আবেদনের তারিখ</span>
                  <span className="text-slate-800 font-medium">
                    {new Date(selectedVoucher.createdAt).toLocaleDateString('bn-BD')}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">পরিশোধের তারিখ</span>
                  <span className="text-slate-800 font-medium">
                    {selectedVoucher.processedAt
                      ? new Date(selectedVoucher.processedAt).toLocaleDateString('bn-BD')
                      : '—'}
                  </span>
                </div>
                {selectedVoucher.adminNote && (
                  <div className="pt-2">
                    <span className="text-slate-400 block mb-0.5">এডমিন নোট</span>
                    <span className="text-slate-800 font-medium italic bg-slate-50 p-2 rounded-lg block">
                      "{selectedVoucher.adminNote}"
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>প্রিন্ট / সেভ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR POLICY MODAL */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-teal-950 to-emerald-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">ভেন্ডর নীতিমালা ও শর্তাবলী</h3>
                  <p className="text-[11px] text-teal-200">নিরাপদ ও স্বচ্ছ সেন্ট্রাল মার্কেটপ্লেস নেটওয়ার্ক</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                <span className="font-black text-teal-950 block">১. পণ্যের গুণগত মান ও শতভাগ বিশ্বস্ততা</span>
                <p className="text-teal-900/90 text-[11px]">
                  ভেন্ডরকে অবশ্যই আসল, অরিজিনাল ও মেয়াদ উত্তীর্ণ নয় এমন পণ্য সরবরাহ করতে হবে। পণ্যের বিবরণ, ছবি ও মূল্যের সাথে বাস্তব পণ্যের শতভাগ মিল থাকতে হবে।
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-black text-slate-900 block">২. অর্ডার প্রসেসিং ও কুরিয়ার ডেলিভারি</span>
                <p className="text-slate-600 text-[11px]">
                  সেন্ট্রাল মল থেকে অর্ডার আসার সাথে সাথে ২৪–৪৮ ঘণ্টার মধ্যে পণ্য যথাযথ প্যাকেজিং করে নির্ভরযোগ্য কুরিয়ারের মাধ্যমে পাঠাতে হবে।
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="font-black text-emerald-950 block">৩. পেমেন্ট ও সেটেলমেন্ট রুলস (Escrow Protection)</span>
                <p className="text-emerald-900/90 text-[11px]">
                  গ্রাহকের পরিশোধিত টাকা কাস্টমার ডেলিভারি পাওয়া পর্যন্ত হোল্ডে থাকবে। ডেলিভারি সম্পন্ন হলে এবং কোনো রিটার্ন/অভিযোগ না থাকলে ব্যালেন্স উত্তোলনযোগ্য হবে। ভেন্ডর যেকোনো সময় বিকাশ, নগদ বা ব্যাংকে টাকা তোলার আবেদন করতে পারবেন।
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="font-black text-amber-950 block">৪. রিটার্ন ও ড্যামেজ পলিসি</span>
                <p className="text-amber-900/90 text-[11px]">
                  ভেন্ডর কর্তৃক ভুল বা ভাঙা পণ্য গেলে ভেন্ডরকে পণ্য পরিবর্তন বা রিটার্ন সমন্বয় করতে হবে। কাস্টমারের কারণে পণ্য আনডেলিভার্ড হলে কুরিয়ার চার্জ ব্যালেন্স সমন্বিত হবে।
                </p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <span className="font-black text-indigo-950 block">৫. ক্যাশবুকে স্বয়ংক্রিয় এন্ট্রি ও জিরো হিডেন ফি</span>
                <p className="text-indigo-900/90 text-[11px]">
                  এডমিন যখনই বিকাশ/নগদে টাকা পাঠাবেন এবং TrxID প্রদান করবেন, তা আপনার ডিজিটাল ক্যাশবুকে স্বয়ংক্রিয়ভাবে জমা এন্ট্রি হবে এবং ডিজিটাল স্লিপ পাওয়া যাবে।
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
              >
                নীতিমালা পড়েছি ও সম্মত
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR QUICK GUIDE & TUTORIAL MODAL */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <BookOpen className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">কীভাবে সেন্ট্রাল মলে বিক্রি ও টাকা তুলবেন?</h3>
                  <p className="text-[11px] text-teal-200">নতুন ভেন্ডরদের জন্য সহজ ৩-ধাপের গাইড</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-teal-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                  ১
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-xs">পণ্য সেন্ট্রাল মলে যুক্ত করা</h5>
                  <p className="text-[11px] text-slate-500">
                    ‘পণ্য লিস্টিং’ ট্যাবে যান এবং যে পণ্যগুলো সেন্ট্রাল মলে সারা দেশের ক্রেতাদের কাছে বিক্রি করতে চান সেগুলোতে ‘+ মলে যুক্ত করুন’ বাটনে চাপুন।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  ২
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-xs">অর্ডার পাওয়া ও পার্সেল পাঠানো</h5>
                  <p className="text-[11px] text-slate-500">
                    ক্রেতারা অর্ডার দিলে আপনি অ্যাপে অ্যালার্ট পাবেন। ‘মার্কেটপ্লেস অর্ডার’ ট্যাবে গিয়ে কাস্টমারের নাম, ফোন ও ঠিকানায় কুরিয়ারের মাধ্যমে পার্সেল বুকিং করুন।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  ৩
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-xs">ডেলিভারি শেষে বিকাশ/নগদে টাকা তোলা</h5>
                  <p className="text-[11px] text-slate-500">
                    কাস্টমার ডেলিভারি পাওয়া মাত্র টাকা ‘উত্তোলনযোগ্য ব্যালেন্স’-এ রেডি হবে। ‘টাকা তোলার আবেদন’ বাটনে চাপ দিয়ে আপনার বিকাশ/নগদ নম্বর দিন। এডমিন টাকা পাঠিয়ে দিলে TrxID সহ আপনার ক্যাশবুকে সরাসরি হিসাব সমন্বয় হয়ে যাবে।
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
              >
                বুঝেছি, পণ্য বিক্রি শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
