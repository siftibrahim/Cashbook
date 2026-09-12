import React, { useState, useMemo } from 'react';
import { OnlineOrder, StoreProfile, Product } from '../types';
import { formatMoney } from '../utils/storage';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Phone,
  MessageCircle,
  Printer,
  X,
  AlertCircle,
  Package,
  Calendar,
  MapPin,
  ChevronDown,
  Check,
  Send,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface EcommerceCodModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OnlineOrder[];
  products: Product[];
  store: StoreProfile;
  onUpdateOrders: (orders: OnlineOrder[]) => void;
  onShowToast: (msg: string) => void;
  onOpenOnlineStorefront?: () => void;
}

export const EcommerceCodModal: React.FC<EcommerceCodModalProps> = ({
  isOpen,
  onClose,
  orders,
  products,
  store,
  onUpdateOrders,
  onShowToast,
  onOpenOnlineStorefront,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'cod_pending' | 'delivered' | 'processing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<OnlineOrder | null>(null);
  const [editingCourierOrderId, setEditingCourierOrderId] = useState<string | null>(null);
  const [courierNameInput, setCourierNameInput] = useState('');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');

  if (!isOpen) return null;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.customerPhone.includes(q) ||
        (ord.courierTrackingCode && ord.courierTrackingCode.toLowerCase().includes(q));

      // Filter tab
      let matchTab = true;
      if (activeFilter === 'cod_pending') {
        matchTab = ord.paymentMethod === 'cod' && ord.paymentStatus !== 'paid' && ord.orderStatus !== 'cancelled';
      } else if (activeFilter === 'delivered') {
        matchTab = ord.orderStatus === 'delivered' || ord.paymentStatus === 'paid';
      } else if (activeFilter === 'processing') {
        matchTab = ord.orderStatus === 'processing' || ord.orderStatus === 'shipped';
      }

      return matchSearch && matchTab;
    });
  }, [orders, searchQuery, activeFilter]);

  // Financial Metrics specifically for E-Commerce & COD
  const metrics = useMemo(() => {
    const activeOrders = orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // COD pending to collect
    const codPendingOrders = activeOrders.filter(
      (o) => o.paymentMethod === 'cod' && o.paymentStatus !== 'paid'
    );
    const codPendingAmount = codPendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // COD & Online collected
    const collectedAmount = activeOrders.reduce((sum, o) => {
      if (o.paymentStatus === 'paid') return sum + o.totalAmount;
      return sum + (o.codCollectedAmount || 0);
    }, 0);

    const pendingDeliveryCount = activeOrders.filter(
      (o) => o.orderStatus === 'pending' || o.orderStatus === 'processing' || o.orderStatus === 'shipped'
    ).length;

    return {
      totalOrders: orders.length,
      totalSales,
      codPendingAmount,
      collectedAmount,
      pendingDeliveryCount,
      codCount: codPendingOrders.length,
    };
  }, [orders]);

  // Order status updater
  const handleUpdateStatus = (orderId: string, newStatus: OnlineOrder['orderStatus']) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        const isNowDelivered = newStatus === 'delivered';
        return {
          ...o,
          orderStatus: newStatus,
          paymentStatus: isNowDelivered ? ('paid' as const) : o.paymentStatus,
          codCollectedAmount: isNowDelivered && o.paymentMethod === 'cod' ? o.totalAmount : o.codCollectedAmount,
          collectedAt: isNowDelivered ? Date.now() : o.collectedAt,
          updatedAt: Date.now(),
        };
      }
      return o;
    });
    onUpdateOrders(updated);
    onShowToast(`অর্ডারের স্ট্যাটাস '${newStatus}' আপডেট হয়েছে`);
  };

  // Mark COD payment received
  const handleMarkCodPaid = (orderId: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: 'paid' as const,
          codCollectedAmount: o.totalAmount,
          collectedAt: Date.now(),
          orderStatus: o.orderStatus === 'pending' || o.orderStatus === 'processing' ? 'delivered' : o.orderStatus,
          updatedAt: Date.now(),
        };
      }
      return o;
    });
    onUpdateOrders(updated);
    onShowToast('✅ ক্যাশ অন ডেলিভারির টাকা আদায় সম্পন্ন হিসেবে রেকর্ড হয়েছে!');
  };

  // Save courier info
  const handleSaveCourier = (orderId: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          courierName: courierNameInput.trim() || undefined,
          courierTrackingCode: trackingCodeInput.trim() || undefined,
          orderStatus: o.orderStatus === 'pending' ? 'shipped' : o.orderStatus,
          updatedAt: Date.now(),
        };
      }
      return o;
    });
    onUpdateOrders(updated);
    setEditingCourierOrderId(null);
    onShowToast('🚚 কুরিয়ার ট্র্যাকিং তথ্য সংরক্ষিত হয়েছে');
  };

  // Print packing slip
  const handlePrintSlip = (ord: OnlineOrder) => {
    setSelectedOrderForInvoice(ord);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-50 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#004D40] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800/80 flex items-center justify-center border border-teal-600/50 shadow-inner">
              <Truck className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">ই-কমার্স ও COD খাতা</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-900/90 text-teal-200 border border-teal-700">
                  আলাদা অপশন
                </span>
              </div>
              <p className="text-xs text-teal-100/90">
                অনলাইন অর্ডার, ক্যাশ অন ডেলিভারি (COD) কালেকশন ও কুরিয়ার ট্র্যাকিং
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenOnlineStorefront && (
              <button
                type="button"
                onClick={onOpenOnlineStorefront}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>লাইভ ওয়েবসাইট</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Isolation Notice Banner */}
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2 flex items-center gap-2 text-[11px] sm:text-xs text-emerald-950 font-medium shrink-0">
          <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>নিরাপদ হিসাব:</strong> এই সেকশনের সকল ক্যাশ অন ডেলিভারি (COD) হিসাব সাধারণ কাস্টমার লিস্ট থেকে সম্পূর্ণ আলাদা থাকে। সাধারণ কাস্টমার লিস্টের ব্যালেন্সে কোনো প্রভাব পড়বে না।
          </span>
        </div>

        {/* Financial Metrics Cards */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500">মোট অনলাইন বিক্রি</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                ৳ {formatMoney(metrics.totalSales)}
              </div>
              <div className="text-[10px] text-teal-800 font-bold mt-0.5">মোট {metrics.totalOrders} টি অর্ডার</div>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200/80">
              <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                <span>COD বাকি টাকা</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">
                ৳ {formatMoney(metrics.codPendingAmount)}
              </div>
              <div className="text-[10px] text-amber-700 font-bold mt-0.5">{metrics.codCount} টি পার্সেল বাকি</div>
            </div>

            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200/80">
              <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>আদায়কৃত টাকা</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-900 mt-0.5">
                ৳ {formatMoney(metrics.collectedAmount)}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold mt-0.5">পেমেন্ট সংগৃহীত</div>
            </div>

            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200/80">
              <div className="text-[11px] font-bold text-blue-800">ডেলিভারি পেন্ডিং</div>
              <div className="text-lg sm:text-xl font-black text-blue-900 mt-0.5">
                {metrics.pendingDeliveryCount} টি
              </div>
              <div className="text-[10px] text-blue-700 font-bold mt-0.5">কুরিয়ার / প্রসেসিং</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-[#004D40] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              সব অর্ডার ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('cod_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === 'cod_pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              COD টাকা বাকি ({metrics.codCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('processing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === 'processing'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-800 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              ডেলিভারিতে আছে
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeFilter === 'delivered'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              আদায় ও সম্পন্ন
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অর্ডার নম্বর, কাস্টমার নাম বা ফোন..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>

        {/* Orders List Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">কোনো অর্ডার পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'অনুসন্ধানের সাথে কোনো অর্ডারের মিল পাওয়া যায়নি।'
                  : 'অনলাইন স্টোরে গ্রাহকরা অর্ডার করলে তা স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে।'}
              </p>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isCod = ord.paymentMethod === 'cod';
              const isPaid = ord.paymentStatus === 'paid';
              const isDelivered = ord.orderStatus === 'delivered';

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3 hover:border-teal-300 transition"
                >
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs sm:text-sm text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                        {ord.orderNumber}
                      </span>

                      {/* Payment Method Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isCod
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-purple-50 text-purple-900 border-purple-300'
                        }`}
                      >
                        {isCod ? 'ক্যাশ অন ডেলিভারি (COD)' : 'অনলাইন পেমেন্ট'}
                      </span>

                      {/* Payment Collection Status */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isPaid ? <Check className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-rose-500" />}
                        <span>{isPaid ? 'টাকা আদায় সম্পন্ন' : 'টাকা বাকি (COD)'}</span>
                      </span>

                      <span className="text-[11px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString('bn-BD')}
                      </span>
                    </div>

                    {/* Status Changer */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <span className="text-xs font-bold text-slate-500">অর্ডার স্ট্যাটাস:</span>
                      <select
                        value={ord.orderStatus}
                        onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OnlineOrder['orderStatus'])}
                        className="text-xs font-bold px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer focus:ring-2 focus:ring-teal-500/40"
                      >
                        <option value="pending">১. নতুন (পেন্ডিং)</option>
                        <option value="confirmed">২. নিশ্চিত (কনফার্ম)</option>
                        <option value="processing">৩. প্যাকিং চলছে</option>
                        <option value="shipped">৪. কুরিয়ারে পাঠানো হয়েছে</option>
                        <option value="delivered">৫. ডেলিভারি ও টাকা আদায় সম্পন্ন</option>
                        <option value="cancelled">৬. বাতিল</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer, Order Items & Courier Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Customer Info */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400">গ্রাহকের তথ্য:</div>
                      <div className="font-black text-slate-900 text-sm">{ord.customerName}</div>
                      <div className="text-slate-600 flex items-center gap-1 font-mono font-bold">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{ord.customerPhone}</span>
                      </div>
                      <div className="text-slate-500 leading-relaxed">
                        <MapPin className="w-3 h-3 text-slate-400 inline mr-0.5" />
                        <span>{ord.customerAddress}</span>
                        <span className="block text-[10px] font-bold text-teal-800 mt-0.5">
                          {ord.deliveryArea === 'inside_dhaka'
                            ? '📍 ঢাকা সিটির ভেতরে (৳৬০)'
                            : ord.deliveryArea === 'outside_dhaka'
                            ? '📍 ঢাকার বাইরে (৳১২০)'
                            : '🏪 দোকান থেকে নেওয়া'}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 flex justify-between">
                        <span>অর্ডারকৃত পণ্য:</span>
                        <span>{ord.items.length} আইটেম</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                            <span className="truncate pr-2">
                              {it.productName} ({it.quantity} {it.unit})
                            </span>
                            <span className="font-bold shrink-0">৳ {formatMoney(it.total)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-xs">
                        <span>মোট COD বিল:</span>
                        <span className="text-teal-800 text-sm">৳ {formatMoney(ord.totalAmount)}</span>
                      </div>
                    </div>

                    {/* Courier & Delivery Assignment */}
                    <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-200/80 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-teal-900 mb-1">কুরিয়ার ও ট্র্যাকিং:</div>
                        {editingCourierOrderId === ord.id ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={courierNameInput}
                              onChange={(e) => setCourierNameInput(e.target.value)}
                              placeholder="কুরিয়ার নাম (যেমন: পাঠাও, রেডএক্স)"
                              className="w-full px-2 py-1 text-[11px] bg-white border border-teal-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={trackingCodeInput}
                              onChange={(e) => setTrackingCodeInput(e.target.value)}
                              placeholder="ট্র্যাকিং আইডি / কোড..."
                              className="w-full px-2 py-1 text-[11px] bg-white border border-teal-300 rounded-lg font-mono"
                            />
                            <div className="flex gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveCourier(ord.id)}
                                className="px-2 py-1 bg-teal-800 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                সেভ করুন
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCourierOrderId(null)}
                                className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] rounded-lg cursor-pointer"
                              >
                                বাতিল
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-700">
                            <div className="font-bold text-xs text-teal-950">
                              {ord.courierName || 'কুরিয়ার নির্ধারণ করা হয়নি'}
                            </div>
                            {ord.courierTrackingCode && (
                              <div className="font-mono text-[11px] text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-teal-100 inline-block">
                                ট্র্যাকিং: {ord.courierTrackingCode}
                              </div>
                            )}
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCourierOrderId(ord.id);
                                  setCourierNameInput(ord.courierName || '');
                                  setTrackingCodeInput(ord.courierTrackingCode || '');
                                }}
                                className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                              >
                                {ord.courierName ? 'কুরিয়ার পরিবর্তন' : '+ কুরিয়ার তথ্য যুক্ত করুন'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* COD Quick Collect Button */}
                      {isCod && !isPaid && (
                        <button
                          type="button"
                          onClick={() => handleMarkCodPaid(ord.id)}
                          className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ক্যাশ আদায় হয়েছে (৳{formatMoney(ord.totalAmount)})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <div className="text-[11px] text-slate-400">
                      পেমেন্ট মেথড: <span className="font-bold text-slate-600">{ord.paymentMethod.toUpperCase()}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* WhatsApp Button */}
                      <a
                        href={`https://wa.me/88${ord.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `আসসালামু আলাইকুম ${ord.customerName} ভাই, ${store.name} থেকে আপনার অনলাইন অর্ডার #${ord.orderNumber} এর বিষয়ে যোগাযোগ করা হয়েছে। আপনার মোট বিল ৳${formatMoney(ord.totalAmount)} (ক্যাশ অন ডেলিভারি)। ধন্যবাদ!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Call Button */}
                      <a
                        href={`tel:${ord.customerPhone}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>কল</span>
                      </a>

                      {/* Print Packing Slip */}
                      <button
                        type="button"
                        onClick={() => handlePrintSlip(ord)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>ডেলিভারি স্লিপ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            মোট দেখানো হচ্ছে: <span className="font-bold text-slate-800">{filteredOrders.length}</span> টি অর্ডার
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Printable Packaging / Invoice Slip Modal (Hidden from screen during normal view, active on print) */}
      {selectedOrderForInvoice && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 text-black z-50">
          <div className="max-w-md mx-auto border border-black p-6 space-y-4">
            <div className="text-center border-b pb-3">
              <h2 className="text-xl font-bold">{store.name}</h2>
              <p className="text-xs">{store.address}</p>
              <p className="text-xs">ফোন: {store.phone}</p>
              <div className="mt-2 text-sm font-bold uppercase bg-slate-100 py-1">
                ক্যাশ অন ডেলিভারি (COD) স্লিপ
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <div>
                <strong>অর্ডার নং:</strong> {selectedOrderForInvoice.orderNumber}
                <br />
                <strong>তারিখ:</strong> {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('bn-BD')}
              </div>
              <div className="text-right">
                <strong>পেমেন্ট:</strong> {selectedOrderForInvoice.paymentMethod.toUpperCase()}
                <br />
                <strong>কুরিয়ার:</strong> {selectedOrderForInvoice.courierName || 'নিজস্ব'}
              </div>
            </div>

            <div className="border p-3 text-xs bg-slate-50 rounded">
              <strong>গ্রাহকের ঠিকানা:</strong>
              <br />
              {selectedOrderForInvoice.customerName}
              <br />
              মোবাইল: {selectedOrderForInvoice.customerPhone}
              <br />
              ঠিকানা: {selectedOrderForInvoice.customerAddress}
            </div>

            <div className="text-xs space-y-1">
              <strong>পণ্য বিবরণী:</strong>
              {selectedOrderForInvoice.items.map((it, idx) => (
                <div key={idx} className="flex justify-between border-b py-0.5">
                  <span>
                    {it.productName} ({it.quantity} {it.unit})
                  </span>
                  <span>৳ {formatMoney(it.total)}</span>
                </div>
              ))}
              <div className="flex justify-between py-0.5">
                <span>ডেলিভারি চার্জ:</span>
                <span>৳ {formatMoney(selectedOrderForInvoice.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-1">
                <span>ক্যাশ কালেকশন (সর্বমোট):</span>
                <span>৳ {formatMoney(selectedOrderForInvoice.totalAmount)}</span>
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-500 pt-4 border-t">
              আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
