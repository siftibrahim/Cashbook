import React, { useState, useMemo } from 'react';
import { Product, StoreProfile } from '../types';
import { formatMoney, getTodayDateString, formatBanglaDate } from '../utils/storage';
import { executeSafePrint, downloadReceiptPDF } from '../utils/printHelper';
import {
  X,
  Printer,
  Download,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Layers,
  ArrowUpDown,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface InventoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  store: StoreProfile;
  onNavigateToInventory?: () => void;
  onShowToast?: (msg: string) => void;
}

export const InventoryReportModal: React.FC<InventoryReportModalProps> = ({
  isOpen,
  onClose,
  products = [],
  store,
  onNavigateToInventory,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_desc' | 'stock_asc' | 'value_desc'>('stock_desc');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Overall Inventory Financial Metrics
  const summaryMetrics = useMemo(() => {
    let totalStockQty = 0;
    let totalBuyCost = 0;
    let totalSaleValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    products.forEach((p) => {
      const stock = Number(p.stock || 0);
      const buyPrice = Number(p.buyPrice || 0);
      const salePrice = Number(p.salePrice || 0);
      const minStock = Number(p.minStock || 5);

      totalStockQty += stock;
      totalBuyCost += stock > 0 ? stock * buyPrice : 0;
      totalSaleValue += stock > 0 ? stock * salePrice : 0;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= minStock) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    const expectedProfit = Math.max(0, totalSaleValue - totalBuyCost);

    return {
      totalProducts: products.length,
      totalStockQty,
      totalBuyCost,
      totalSaleValue,
      expectedProfit,
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };
  }, [products]);

  // Filtered & Sorted Product List
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        const stock = Number(p.stock || 0);
        const minStock = Number(p.minStock || 5);

        if (filterType === 'out_of_stock') return stock <= 0;
        if (filterType === 'low_stock') return stock > 0 && stock <= minStock;
        if (filterType === 'in_stock') return stock > minStock;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'bn');
        if (sortBy === 'stock_desc') return (b.stock || 0) - (a.stock || 0);
        if (sortBy === 'stock_asc') return (a.stock || 0) - (b.stock || 0);
        if (sortBy === 'value_desc') {
          const valA = (a.stock || 0) * (a.salePrice || 0);
          const valB = (b.stock || 0) * (b.salePrice || 0);
          return valB - valA;
        }
        return 0;
      });
  }, [products, searchQuery, filterType, selectedCategory, sortBy]);

  if (!isOpen) return null;

  const today = getTodayDateString();

  const handlePrint = () => {
    setIsPrinting(true);
    if (onShowToast) onShowToast('🖨️ ইনভেন্টরি রিপোর্ট প্রিন্ট হচ্ছে...');
    setTimeout(() => {
      executeSafePrint(() => {
        setIsPrinting(false);
      });
    }, 150);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    const filename = `Inventory_Report_${store.name.replace(/\s+/g, '_')}_${today}`;
    await downloadReceiptPDF('printable-inventory-report', filename, onShowToast);
    setIsDownloadingPdf(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-[#004D40] text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-800/80 flex items-center justify-center border border-teal-600/50 shadow-inner shrink-0">
              <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  ইনভেন্টরি ও স্টক রিপোর্ট
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  {summaryMetrics.totalProducts} টি পণ্য
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                {store.name} • রিপোর্ট তারিখ: {formatBanglaDate(today)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">প্রিন্ট</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf}
              className="px-2.5 sm:px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="পিডিএফ সংরক্ষণ"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">পিডিএফ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-teal-900/60 hover:bg-rose-600 text-teal-100 hover:text-white flex items-center justify-center cursor-pointer transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 smooth-scroll-container">
          {/* 1. Summary KPI Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* মোট কেনা মূল্য / ক্রয় বিনিয়োগ */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-500 block">মোট ক্রয় মূল্য (বিনিয়োগ)</span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                ৳{formatMoney(summaryMetrics.totalBuyCost)}
              </p>
              <span className="text-[9.5px] text-slate-400 font-medium">কেনা দামের মোট মূল্য</span>
            </div>

            {/* সম্ভাব্য মোট বিক্রয় মূল্য */}
            <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/30">
              <span className="text-[10.5px] font-bold text-emerald-800 block">সম্ভাব্য বিক্রয় মূল্য</span>
              <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                ৳{formatMoney(summaryMetrics.totalSaleValue)}
              </p>
              <span className="text-[9.5px] text-emerald-600 font-medium">সব বিক্রি হলে আয়</span>
            </div>

            {/* সম্ভাব্য মোট মুনাফা */}
            <div className="bg-white p-3 rounded-2xl border border-teal-200 shadow-2xs bg-teal-50/30">
              <span className="text-[10.5px] font-bold text-teal-800 block">সম্ভাব্য মোট লাভ</span>
              <p className="text-base sm:text-lg font-black text-teal-700 mt-0.5">
                ৳{formatMoney(summaryMetrics.expectedProfit)}
              </p>
              <span className="text-[9.5px] text-teal-600 font-medium">বিক্রয় মূল্য - ক্রয় মূল্য</span>
            </div>

            {/* মোট স্টক পরিমাণ */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-500 block">মোট পণ্য ও স্টক</span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {summaryMetrics.totalStockQty} <span className="text-xs font-bold text-slate-500">ইউনিট</span>
              </p>
              <span className="text-[9.5px] text-slate-400 font-medium">{summaryMetrics.totalProducts} টি আলাদা আইটেম</span>
            </div>

            {/* স্টক সতর্কবার্তা */}
            <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10.5px] font-bold text-amber-800 block">স্টক সতর্কতা</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-black text-amber-600">
                  {summaryMetrics.lowStockCount} কম
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-black text-rose-600">
                  {summaryMetrics.outOfStockCount} শেষ
                </span>
              </div>
              <span className="text-[9.5px] text-amber-700 font-medium">পুনরায় অর্ডার জরুরি</span>
            </div>
          </div>

          {/* 2. Filters & Search Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য, বারকোড বা ক্যাটাগরি খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#004D40] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সকল ({summaryMetrics.totalProducts})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('low_stock')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                }`}
              >
                কম স্টক ({summaryMetrics.lowStockCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('out_of_stock')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  filterType === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                স্টক শেষ ({summaryMetrics.outOfStockCount})
              </button>
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto text-xs font-bold py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
              >
                <option value="all">সকল ক্যাটাগরি</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Printable & Viewable Inventory Table */}
          <div id="printable-inventory-report" className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Printable Report Header */}
            <div className="p-4 border-b border-slate-100 hidden print:block">
              <div className="text-center pb-2 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-900">{store.name}</h2>
                <p className="text-xs text-slate-600">{store.address} • {store.phone}</p>
                <h3 className="text-sm font-bold text-[#004D40] mt-1">ইনভেন্টরি ও পণ্য স্টক রিপোর্ট</h3>
                <p className="text-[10px] text-slate-500">রিপোর্টের তারিখ: {formatBanglaDate(today)}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
                <div>মোট পণ্য: <strong>{summaryMetrics.totalProducts} টি</strong></div>
                <div>মোট স্টক: <strong>{summaryMetrics.totalStockQty} ইউনিট</strong></div>
                <div>মোট ক্রয় মূল্য: <strong>৳{formatMoney(summaryMetrics.totalBuyCost)}</strong></div>
                <div>সম্ভাব্য বিক্রয় মূল্য: <strong>৳{formatMoney(summaryMetrics.totalSaleValue)}</strong></div>
              </div>
            </div>

            {/* Product Table */}
            {filteredProducts.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <Package className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">কোনো পণ্যের স্টক পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {products.length === 0
                    ? 'আপনার ইনভেন্টরিতে এখনো কোনো পণ্য যুক্ত করা হয়নি। ইনভেন্টরি পেজে গিয়ে পণ্য যুক্ত করুন।'
                    : 'আপনার দেওয়া ফিল্টার বা সার্চের সাথে মিল রয়েছে এমন কোনো পণ্য পাওয়া যায়নি।'}
                </p>
                {onNavigateToInventory && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToInventory();
                    }}
                    className="mt-4 px-4 py-2 bg-[#004D40] hover:bg-[#00382e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <span>ইনভেন্টরিতে পণ্য যুক্ত করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2.5 sm:p-3 text-center w-10">নং</th>
                      <th className="p-2.5 sm:p-3">পণ্যের বিবরণ</th>
                      <th className="p-2.5 sm:p-3 hidden sm:table-cell">ক্যাটাগরি</th>
                      <th className="p-2.5 sm:p-3 text-center">বর্তমান স্টক</th>
                      <th className="p-2.5 sm:p-3 text-right">ক্রয় মূল্য</th>
                      <th className="p-2.5 sm:p-3 text-right">বিক্রয় মূল্য</th>
                      <th className="p-2.5 sm:p-3 text-right hidden md:table-cell">মোট ক্রয় মূল্য</th>
                      <th className="p-2.5 sm:p-3 text-right">মোট বিক্রয় মূল্য</th>
                      <th className="p-2.5 sm:p-3 text-center no-print">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p, idx) => {
                      const stock = Number(p.stock || 0);
                      const buyPrice = Number(p.buyPrice || 0);
                      const salePrice = Number(p.salePrice || 0);
                      const minStock = Number(p.minStock || 5);
                      const totalBuy = stock * buyPrice;
                      const totalSale = stock * salePrice;

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          পর্যাপ্ত স্টক
                        </span>
                      );
                      if (stock <= 0) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            স্টক শেষ
                          </span>
                        );
                      } else if (stock <= minStock) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            কম স্টক
                          </span>
                        );
                      }

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 sm:p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-2.5 sm:p-3">
                            <div className="font-bold text-slate-800">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.sku || p.barcode ? `কোড: ${p.sku || p.barcode}` : ''}
                            </div>
                          </td>
                          <td className="p-2.5 sm:p-3 text-slate-600 hidden sm:table-cell">
                            {p.category || '-'}
                          </td>
                          <td className="p-2.5 sm:p-3 text-center">
                            <span className="font-black text-slate-800 text-sm">{stock}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{p.unit || 'টি'}</span>
                          </td>
                          <td className="p-2.5 sm:p-3 text-right text-slate-700 font-semibold">
                            ৳{formatMoney(buyPrice)}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right text-emerald-700 font-black">
                            ৳{formatMoney(salePrice)}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right text-slate-600 font-bold hidden md:table-cell">
                            ৳{formatMoney(totalBuy)}
                          </td>
                          <td className="p-2.5 sm:p-3 text-right text-slate-900 font-black">
                            ৳{formatMoney(totalSale)}
                          </td>
                          <td className="p-2.5 sm:p-3 text-center no-print">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={3} className="p-2.5 sm:p-3 text-right">
                        মোট যোগফল:
                      </td>
                      <td className="p-2.5 sm:p-3 text-center text-teal-800">
                        {filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0)}
                      </td>
                      <td colSpan={2} className="hidden md:table-cell"></td>
                      <td className="p-2.5 sm:p-3 text-right text-slate-800 hidden md:table-cell">
                        ৳{formatMoney(filteredProducts.reduce((sum, p) => sum + (p.stock || 0) * (p.buyPrice || 0), 0))}
                      </td>
                      <td className="p-2.5 sm:p-3 text-right text-emerald-800">
                        ৳{formatMoney(filteredProducts.reduce((sum, p) => sum + (p.stock || 0) * (p.salePrice || 0), 0))}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Quick Footer / Navigation */}
          {onNavigateToInventory && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-900 font-semibold">
                  নতুন পণ্য যুক্ত করতে বা স্টক সংশোধন করতে ইনভেন্টরি ম্যানেজারে যান
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToInventory();
                }}
                className="px-3.5 py-1.5 bg-[#004D40] hover:bg-[#003930] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
              >
                <span>ইনভেন্টরি পেজে যান</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
