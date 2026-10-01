import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Truck,
  Calendar,
  Printer,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Store,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Check,
  X,
  FileText,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { marketplaceAdminApi } from '../../services/marketplaceAdminService';

interface MonthlyProfitRecord {
  monthKey: string;
  monthName: string;
  year: number;
  month: number;
  deliveredOrdersCount: number;
  grossSales: number;
  productsAmount: number;
  deliveryAmount: number;
  platformCommissionProfit: number;
  deliveryMarginProfit: number;
  totalPlatformProfit: number;
  vendorNetPayable: number;
}

interface MarketplaceProfitReportTabProps {
  summary: {
    totalVendorsCount: number;
    totalOrdersCount?: number;
    totalDeliveredOrdersCount?: number;
    totalGrossSales: number;
    totalDeliveredSales: number;
    totalPlatformCommissionProfit?: number;
    totalDeliveryMarginProfit?: number;
    totalPlatformProfit?: number;
    thisMonthProfit?: number;
    defaultCommissionPercent?: number;
    platformDeliveryMargin?: number;
    monthlyProfitBreakdown?: MonthlyProfitRecord[];
    totalSettledAmount: number;
    totalDueToVendors: number;
  };
  vendors: any[];
  currentSettings: any;
  onRefresh: () => void;
  onUpdateSettings: (newSettings: any) => Promise<void>;
  showToast: (msg: string) => void;
}

export const MarketplaceProfitReportTab: React.FC<MarketplaceProfitReportTabProps> = ({
  summary,
  vendors,
  currentSettings,
  onRefresh,
  onUpdateSettings,
  showToast,
}) => {
  // Settings modification state
  const [commPercentInput, setCommPercentInput] = useState<number>(
    currentSettings?.commissionPercent ?? summary.defaultCommissionPercent ?? 5
  );
  const [deliveryMarginInput, setDeliveryMarginInput] = useState<number>(
    currentSettings?.platformDeliveryMargin ?? summary.platformDeliveryMargin ?? 10
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Vendor custom commission editing state
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorCustomRateInput, setVendorCustomRateInput] = useState<number>(5);
  const [isSavingVendorRate, setIsSavingVendorRate] = useState(false);

  // Month filter & print modal state
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [printingMonth, setPrintingMonth] = useState<MonthlyProfitRecord | null>(null);

  // Simulator live test inputs
  const [simProductPrice, setSimProductPrice] = useState<number>(1000);
  const [simDeliveryFee, setSimDeliveryFee] = useState<number>(70);

  const monthlyList: MonthlyProfitRecord[] = summary.monthlyProfitBreakdown || [];

  const filteredMonthlyList =
    selectedMonthFilter === 'all'
      ? monthlyList
      : monthlyList.filter((m) => m.monthKey === selectedMonthFilter);

  // Live Simulator Calculations
  const simCommission = Math.round((simProductPrice * commPercentInput) / 100);
  const simMargin = deliveryMarginInput;
  const simTotalPlatformProfit = simCommission + simMargin;
  const simVendorShare = Math.max(0, simProductPrice - simCommission);
  const simCourierShare = Math.max(0, simDeliveryFee - simMargin);
  const simCustomerTotal = simProductPrice + simDeliveryFee;

  const handleSaveCommissionSettings = async () => {
    try {
      setIsSavingSettings(true);
      await onUpdateSettings({
        ...currentSettings,
        commissionPercent: commPercentInput,
        platformDeliveryMargin: deliveryMarginInput,
      });
      showToast('কমিশন ও প্ল্যাটফর্ম প্রফিট সেটিংস সফলভাবে আপডেট হয়েছে!');
    } catch (err: any) {
      showToast(err.message || 'সেটিংস সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveVendorCustomRate = async (vendorId: string) => {
    try {
      setIsSavingVendorRate(true);
      await marketplaceAdminApi.setVendorCommission(vendorId, vendorCustomRateInput);
      showToast(`ভেন্ডরের বিশেষ কমিশন রেট ${vendorCustomRateInput}% সংরক্ষিত হয়েছে!`);
      setEditingVendorId(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'ভেন্ডর কমিশন সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSavingVendorRate(false);
    }
  };

  const handlePrintStatement = (monthRecord: MonthlyProfitRecord) => {
    setPrintingMonth(monthRecord);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>প্ল্যাটফর্ম মনিটাইজেশন ও প্রফিট মডেল</span>
              </span>
              <span className="text-xs text-emerald-300 font-semibold">
                সুপার অ্যাডমিনের মোট লাভ ও কমিশন
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">
              সেন্ট্রাল মল থেকে আপনার প্ল্যাটফর্মের আয় ও নিট প্রফিট রিপোর্ট
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              মার্কেটপ্লেসের প্রতিটি ডেলিভারি সম্পন্ন অর্ডারের পণ্যের ওপর স্বয়ংক্রিয় কমিশন (যেমন:{' '}
              {summary.defaultCommissionPercent ?? 5}%) এবং ডেলিভারি ফি মার্জিন (যেমন:{' '}
              {summary.platformDeliveryMargin ?? 10}৳) থেকে প্ল্যাটফর্মের মোট লাভ হিসাব করা হয়। ভেন্ডর তার বিক্রির প্রাপ্য পায় এবং প্ল্যাটফর্মের কমিশন সরাসরি আপনার লাভ হিসেবে জমা থাকে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs shadow-xs"
            >
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span>রিফ্রেশ হিসাব</span>
            </button>

            {monthlyList.length > 0 && (
              <button
                type="button"
                onClick={() => handlePrintStatement(monthlyList[0])}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>চলতি মাসের স্টেটমেন্ট প্রিন্ট</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Primary Profit Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Platform Profit (Hero) */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              সর্বমোট প্ল্যাটফর্ম নিট প্রফিট
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              মোট লাভ
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-950 tracking-tight">
              ৳{Number(summary.totalPlatformProfit || 0).toLocaleString('en-US')}
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold mt-1">
              কমিশন (৳{Number(summary.totalPlatformCommissionProfit || 0).toLocaleString('en-US')}) + ডেলিভারি মার্জিন (৳{Number(summary.totalDeliveryMarginProfit || 0).toLocaleString('en-US')})
            </p>
          </div>
          <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>সফল ডেলিভারি:</span>
            <span className="font-bold text-emerald-900">
              {summary.totalDeliveredOrdersCount || 0} টি অর্ডার
            </span>
          </div>
        </div>

        {/* Card 2: Commission Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ভেন্ডর কমিশন থেকে আয়
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-950">
            ৳{Number(summary.totalPlatformCommissionProfit || 0).toLocaleString('en-US')}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            মোট ডেলিভারি বিক্রি ৳{Number(summary.totalDeliveredSales || 0).toLocaleString('en-US')}-এর ওপর গড় {summary.defaultCommissionPercent ?? 5}% কমিশন
          </p>
        </div>

        {/* Card 3: Delivery Margin Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              ডেলিভারি ফি মার্জিন প্রফিট
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950">
            ৳{Number(summary.totalDeliveryMarginProfit || 0).toLocaleString('en-US')}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            প্রতিটি সফল ডেলিভারি থেকে {summary.platformDeliveryMargin ?? 10}৳ মার্জিন লাভ
          </p>
        </div>

        {/* Card 4: This Month Profit */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-white p-5 rounded-2xl border border-indigo-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              চলতি মাসের প্রফিট
            </span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-950">
            ৳{Number(summary.thisMonthProfit || 0).toLocaleString('en-US')}
          </div>
          <p className="text-[11px] text-indigo-800 leading-tight">
            চলতি মাসের ডেলিভারি অর্ডার থেকে অর্জিত মোট প্ল্যাটফর্ম লাভ
          </p>
        </div>
      </div>

      {/* Interactive Monetization Config & Live Simulator Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-700" />
              <span>কমিশন ও প্রফিট মডেল কনফিগারেশন এবং লাইভ ক্যালকুলেটর</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              প্ল্যাটফর্মের লাভ নির্ধারণ করুন এবং দেখুন প্রতিটি অর্ডারে ভেন্ডর ও প্ল্যাটফর্মের হিসাবে কী পরিবর্তন হয়
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveCommissionSettings}
            disabled={isSavingSettings}
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSavingSettings ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            )}
            <span>{isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Commission Percent */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    ডিফল্ট প্ল্যাটফর্ম কমিশন (%)
                  </label>
                  <span className="text-sm font-black text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-lg">
                    {commPercentInput}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={commPercentInput}
                  onChange={(e) => setCommPercentInput(parseFloat(e.target.value) || 0)}
                  className="w-full accent-teal-700 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>০% (ফ্রি)</span>
                  <span>৫% (প্রস্তাবিত)</span>
                  <span>১০%</span>
                  <span>৩০%</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  প্রতিটি বিক্রির মূল্যের ওপর আপনার প্ল্যাটফর্মের নির্দিষ্ট পারসেন্টেজ লাভ।
                </p>
              </div>

              {/* Delivery Margin */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    ডেলিভারি ফি মার্জিন (৳ প্রতি অর্ডার)
                  </label>
                  <span className="text-sm font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg">
                    ৳{deliveryMarginInput}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={deliveryMarginInput}
                  onChange={(e) => setDeliveryMarginInput(parseInt(e.target.value) || 0)}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>৳০</span>
                  <span>৳১০ (সাধারণ)</span>
                  <span>৳২০</span>
                  <span>৳৫০</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  কুরিয়ার ফি থেকে প্ল্যাটফর্মের অতিরিক্ত মুনাফা মার্জিন।
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-500 font-bold">কুইক প্রিসেট:</span>
              {[
                { label: '৩% কমিশন + ১০৳ মার্জিন', c: 3, m: 10 },
                { label: '৫% কমিশন + ১০৳ মার্জিন (স্ট্যান্ডার্ড)', c: 5, m: 10 },
                { label: '৭% কমিশন + ১৫৳ মার্জিন', c: 7, m: 15 },
                { label: '১০% কমিশন + ২০৳ মার্জিন', c: 10, m: 20 },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCommPercentInput(p.c);
                    setDeliveryMarginInput(p.m);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Simulator Preview Box */}
          <div className="lg:col-span-6 bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-inner space-y-4">
            <div className="flex items-center justify-between border-b border-teal-800 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs uppercase tracking-wider text-teal-200">
                  লাইভ অর্ডার ক্যালকুলেটর প্রিভিউ
                </span>
              </div>
              <span className="text-[11px] text-teal-300">স্বয়ংক্রিয় সিমুলেশন</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-teal-300 block mb-1">নমুনা পণ্যের দাম (৳)</span>
                <input
                  type="number"
                  value={simProductPrice}
                  onChange={(e) => setSimProductPrice(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-teal-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <span className="text-[11px] text-teal-300 block mb-1">ডেলিভারি চার্জ (৳)</span>
                <input
                  type="number"
                  value={simDeliveryFee}
                  onChange={(e) => setSimDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white/10 border border-teal-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-teal-200">
                <span>গ্রাহক পরিশোধ করবে (মোট):</span>
                <span className="font-mono font-bold text-white">৳{simCustomerTotal}</span>
              </div>

              <div className="p-3 rounded-xl bg-white/10 border border-emerald-400/40 space-y-1.5">
                <div className="flex items-center justify-between font-black text-amber-300">
                  <span>💎 সুপার অ্যাডমিনের প্ল্যাটফর্ম লাভ:</span>
                  <span className="text-sm font-mono">৳{simTotalPlatformProfit}</span>
                </div>
                <div className="text-[11px] text-teal-200 flex items-center justify-between pl-2">
                  <span>• কমিশন ({commPercentInput}%):</span>
                  <span className="font-mono">৳{simCommission}</span>
                </div>
                <div className="text-[11px] text-teal-200 flex items-center justify-between pl-2">
                  <span>• ডেলিভারি মার্জিন:</span>
                  <span className="font-mono">৳{simMargin}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-emerald-300 pt-1">
                <span>🏬 ভেন্ডর পাবে (নিট প্রাপ্য):</span>
                <span className="font-mono font-black text-sm">৳{simVendorShare}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300 text-[11px]">
                <span>🚚 কুরিয়ার পাবে (ডেলিভারি খরচ):</span>
                <span className="font-mono">৳{simCourierShare}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Month-by-Month Statement Table & Archive */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-700" />
              <span>মাসভিত্তিক প্ল্যাটফর্ম প্রফিট স্টেটমেন্ট ও রিপোর্ট ({monthlyList.length} টি মাস)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              মাস শেষে প্ল্যাটফর্মের মোট বিক্রি, কমিশন, ডেলিভারি মার্জিন এবং মোট প্রফিট রিপোর্ট
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30 cursor-pointer"
            >
              <option value="all">সব মাস দেখুন ({monthlyList.length})</option>
              {monthlyList.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.monthName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredMonthlyList.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">কোনো প্রফিট রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400">
              সেন্ট্রাল মলের কোনো অর্ডার ডেলিভারি সম্পন্ন হলেই এই তালিকায় মাসভিত্তিক যুক্ত হবে।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 sm:px-4">মাস / বছর</th>
                  <th className="p-3.5 sm:px-4 text-center">সফল ডেলিভারি</th>
                  <th className="p-3.5 sm:px-4">মোট বিক্রি (GMV)</th>
                  <th className="p-3.5 sm:px-4">কমিশন আয় (৳)</th>
                  <th className="p-3.5 sm:px-4">ডেলিভারি মার্জিন (৳)</th>
                  <th className="p-3.5 sm:px-4 bg-emerald-50/70 text-emerald-950 font-black">
                    মোট প্ল্যাটফর্ম প্রফিট (৳)
                  </th>
                  <th className="p-3.5 sm:px-4">ভেন্ডরদের প্রাপ্য</th>
                  <th className="p-3.5 sm:px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMonthlyList.map((rec) => (
                  <tr key={rec.monthKey} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 sm:px-4">
                      <div className="font-black text-slate-900 text-sm">{rec.monthName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{rec.monthKey}</span>
                    </td>

                    <td className="p-3.5 sm:px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-block">
                        ✅ {rec.deliveredOrdersCount} টি
                      </span>
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap">
                      <div className="text-xs font-black text-slate-900">
                        ৳{rec.grossSales.toLocaleString('en-US')}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        পণ্য: ৳{rec.productsAmount.toLocaleString('en-US')}
                      </span>
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap font-bold text-teal-800">
                      ৳{rec.platformCommissionProfit.toLocaleString('en-US')}
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap font-bold text-amber-800">
                      ৳{rec.deliveryMarginProfit.toLocaleString('en-US')}
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap bg-emerald-50/70">
                      <div className="text-sm font-black text-emerald-800">
                        ৳{rec.totalPlatformProfit.toLocaleString('en-US')}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        নিট প্ল্যাটফর্ম লাভ
                      </span>
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-700">
                        ৳{rec.vendorNetPayable.toLocaleString('en-US')}
                      </div>
                      <span className="text-[10px] text-slate-400 block">ভেন্ডরদের প্রাপ্য</span>
                    </td>

                    <td className="p-3.5 sm:px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handlePrintStatement(rec)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition cursor-pointer"
                        title="প্রিন্ট করুন"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>রসিদ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor-Wise Profit Contribution Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-teal-700" />
              <span>ভেন্ডরভিত্তিক প্রফিট কন্ট্রিবিউশন ও বিশেষ কমিশন ({vendors.length} জন ভেন্ডর)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              কোন ভেন্ডরের বিক্রি থেকে প্ল্যাটফর্ম কত টাকা লাভ করেছে এবং প্রয়োজনে নির্দিষ্ট ভেন্ডরের জন্য বিশেষ কমিশন নির্ধারণ করুন
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 sm:px-4">ভেন্ডর ও দোকান</th>
                <th className="p-3.5 sm:px-4 text-center">ডেলিভারি সম্পন্ন</th>
                <th className="p-3.5 sm:px-4">মোট বিক্রি</th>
                <th className="p-3.5 sm:px-4">কমিশন হার (%)</th>
                <th className="p-3.5 sm:px-4 text-emerald-950 font-black">প্ল্যাটফর্ম লাভ (৳)</th>
                <th className="p-3.5 sm:px-4">ভেন্ডরের নিট প্রাপ্য</th>
                <th className="p-3.5 sm:px-4 text-right">কমিশন কন্ট্রোল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((v) => {
                const delivSales = Number(v.deliveredSales || 0);
                const commRate = Number(v.commissionRate ?? summary.defaultCommissionPercent ?? 5);
                const commAmt = Number(v.commissionAmount ?? Math.round((delivSales * commRate) / 100));
                const platformProfit = Number(v.platformProfit ?? commAmt);
                const netPayable = Number(v.netDeliveredSales ?? Math.max(0, delivSales - commAmt));

                const isEditingThis = editingVendorId === v.vendorId;

                return (
                  <tr key={v.vendorId} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 sm:px-4">
                      <div className="font-bold text-slate-900 text-sm">{v.shopName || v.name}</div>
                      <div className="text-[11px] text-slate-500">মালিক: {v.name}</div>
                      {v.phone && (
                        <div className="text-[10px] text-slate-400 font-mono">📞 {v.phone}</div>
                      )}
                    </td>

                    <td className="p-3.5 sm:px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-emerald-700 text-xs block">
                        ✅ {v.deliveredOrdersCount || 0} টি
                      </span>
                      <span className="text-[10px] text-slate-400">মোট: {v.totalOrdersCount || 0} টি</span>
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap">
                      <div className="text-xs font-black text-slate-900">
                        ৳{delivSales.toLocaleString('en-US')}
                      </div>
                      <span className="text-[10px] text-slate-400 block">ডেলিভারি বিক্রি</span>
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            value={vendorCustomRateInput}
                            onChange={(e) => setVendorCustomRateInput(parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-xs border border-teal-500 rounded-lg bg-white focus:outline-none"
                          />
                          <span className="text-xs text-slate-600">%</span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-black text-teal-900 text-xs inline-block">
                          {commRate}%
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap font-black text-emerald-800 text-sm">
                      ৳{platformProfit.toLocaleString('en-US')}
                    </td>

                    <td className="p-3.5 sm:px-4 whitespace-nowrap font-bold text-slate-800">
                      ৳{netPayable.toLocaleString('en-US')}
                    </td>

                    <td className="p-3.5 sm:px-4 text-right whitespace-nowrap">
                      {isEditingThis ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={isSavingVendorRate}
                            onClick={() => handleSaveVendorCustomRate(v.vendorId)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            title="সংরক্ষণ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVendorId(null)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="বাতিল"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVendorId(v.vendorId);
                            setVendorCustomRateInput(commRate);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1 ml-auto transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>কমিশন রেট</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Monthly Statement Modal View (Only displays when printing or testing) */}
      {printingMonth && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700" />
                <h4 className="font-black text-sm text-slate-900">
                  {printingMonth.monthName} - প্ল্যাটফর্ম প্রফিট স্টেটমেন্ট
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPrintingMonth(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-center pb-2 border-b border-slate-200">
                  <h3 className="font-black text-base text-slate-900">TWING হিসাবি সেন্ট্রাল মার্কেটপ্লেস</h3>
                  <p className="text-[11px] text-slate-500">মাসিক প্রফিট ও রাজস্ব স্টেটমেন্ট</p>
                  <p className="text-xs font-bold text-teal-800 mt-1">{printingMonth.monthName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">সফল ডেলিভারি অর্ডার:</span>
                    <span className="font-black text-slate-900 text-sm">
                      {printingMonth.deliveredOrdersCount} টি
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">মোট কাস্টমার বিক্রি (GMV):</span>
                    <span className="font-black text-slate-900 text-sm">
                      ৳{printingMonth.grossSales.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between font-black text-sm text-emerald-950">
                  <span>১. প্ল্যাটফর্ম কমিশন আয়:</span>
                  <span>৳{printingMonth.platformCommissionProfit.toLocaleString('en-US')}</span>
                </div>
                <div className="flex items-center justify-between font-black text-sm text-amber-950">
                  <span>২. ডেলিভারি ফি মার্জিন আয়:</span>
                  <span>৳{printingMonth.deliveryMarginProfit.toLocaleString('en-US')}</span>
                </div>
                <div className="pt-2 border-t border-emerald-300 flex items-center justify-between text-base font-black text-emerald-900">
                  <span>💎 মোট প্ল্যাটফর্ম নিট প্রফিট:</span>
                  <span>৳{printingMonth.totalPlatformProfit.toLocaleString('en-US')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-slate-700 font-bold">
                <span>ভেন্ডরদের মোট প্রাপ্য পরিশোধ:</span>
                <span>৳{printingMonth.vendorNetPayable.toLocaleString('en-US')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট করুন</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintingMonth(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
