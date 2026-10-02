import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  AlertTriangle,
  XCircle,
  Copy,
  RefreshCw,
  Box,
  Building2,
  Store,
  Navigation,
  Check,
  Calendar,
  User,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';
import { marketplaceApi } from '../../services/marketplaceService';

interface MarketplaceOrderTrackingMapProps {
  order: any;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}

export const MarketplaceOrderTrackingMap: React.FC<MarketplaceOrderTrackingMapProps> = ({
  order,
  onRefresh,
  isRefreshing = false,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getOrderStatus = (ord: any): string => {
    const st = String(ord?.overallStatus || ord?.overall_status || ord?.orderStatus || ord?.order_status || 'pending').toLowerCase();
    return st;
  };

  const status = getOrderStatus(order);
  const isCancelled = status === 'cancelled' || status === 'returned';

  // Calculate Progress Step & Map Percentage
  const getProgressData = (st: string) => {
    switch (st) {
      case 'pending':
      case 'pending_verification':
        return { step: 1, percent: 18, label: 'অর্ডার গৃহীত ও যাচাই চলছে', icon: Clock, color: 'amber' };
      case 'confirmed':
        return { step: 2, percent: 38, label: 'অর্ডার নিশ্চিত ও ইনভয়েস প্রস্তুত', icon: CheckCircle2, color: 'blue' };
      case 'processing':
      case 'packed':
        return { step: 3, percent: 62, label: 'মার্চেন্ট হাব থেকে প্যাকেজিং সম্পন্ন', icon: Box, color: 'purple' };
      case 'shipped':
      case 'out_for_delivery':
        return { step: 4, percent: 85, label: 'কুরিয়ার মারফত রাইডার ডেলিভারির পথে', icon: Truck, color: 'indigo' };
      case 'delivered':
        return { step: 5, percent: 100, label: 'গ্রাহকের ঠিকানায় সফল ডেলিভারি সম্পন্ন', icon: CheckCircle2, color: 'emerald' };
      case 'cancelled':
        return { step: 0, percent: 0, label: 'অর্ডার বাতিল করা হয়েছে', icon: XCircle, color: 'rose' };
      case 'returned':
        return { step: 0, percent: 0, label: 'পণ্য রিটার্ন করা হয়েছে', icon: AlertTriangle, color: 'rose' };
      default:
        return { step: 1, percent: 18, label: 'অর্ডার গৃহীত', icon: Clock, color: 'amber' };
    }
  };

  const progress = getProgressData(status);

  // Extract courier & rider details from master order or sub-orders
  const subOrders = Array.isArray(order?.subOrders) ? order.subOrders : [];
  const primarySub = subOrders[0] || {};
  const courierName = order?.courierName || order?.courier_name || primarySub?.courierName || primarySub?.courier_name || '';
  const courierTrackingCode = order?.courierTrackingCode || order?.courier_tracking_code || primarySub?.courierTrackingCode || primarySub?.courier_tracking_code || '';
  const deliveryManName = order?.deliveryManName || order?.delivery_man_name || primarySub?.deliveryManName || primarySub?.delivery_man_name || '';
  const deliveryManPhone = order?.deliveryManPhone || order?.delivery_man_phone || primarySub?.deliveryManPhone || primarySub?.delivery_man_phone || '';
  const estimatedDeliveryDate = order?.estimatedDeliveryDate || order?.estimated_delivery_date || primarySub?.estimatedDeliveryDate || primarySub?.estimated_delivery_date || '';
  const deliveryNote = order?.deliveryNote || order?.delivery_note || primarySub?.deliveryNote || primarySub?.delivery_note || '';
  const vendorNote = order?.vendorNote || order?.vendor_note || primarySub?.vendorNote || primarySub?.vendor_note || '';

  const steps = [
    { step: 1, title: 'অর্ডার গৃহীত', desc: 'সেন্ট্রাল সার্ভারে অর্ডার ও পেমেন্ট রিসিভড' },
    { step: 2, title: 'ভেন্ডর প্যাকেজিং', desc: 'মার্চেন্ট ওয়্যারহাউজে পণ্য প্রস্তুতকরণ' },
    { step: 3, title: 'লজিস্টিকস শর্টিং হাব', desc: 'সেন্ট্রাল লজিস্টিকস সেন্টারে বাছাই' },
    { step: 4, title: 'ডেলিভারির পথে', desc: 'কুরিয়ার রাইডারের মাধ্যমে ডেসপ্যাচ' },
    { step: 5, title: 'সফল ডেলিভারি', desc: 'গ্রাহকের দরজায় পণ্য হস্তান্তর' },
  ];

  const totalAmount = Number(order?.grandTotal || order?.grand_total || order?.totalAmount || order?.total_amount || 0);
  const paidAmount = Number(order?.paidAmount || order?.paid_amount || (order?.paymentStatus === 'paid' ? totalAmount : 0));
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">অর্ডার নম্বর:</span>
            <span className="font-mono font-black text-sm sm:text-base text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
              {order.orderNumber || order.order_number || order.id}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(order.orderNumber || order.order_number || order.id, 'অর্ডার নম্বর')}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              title="অর্ডার নম্বর কপি করুন"
            >
              {copiedText === 'অর্ডার নম্বর' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>গ্রাহক: <strong>{order.customerName || order.customer_name || 'গ্রাহক'}</strong></span>
            <span>•</span>
            <span>মোবাইল: <strong>{order.customerPhone || order.customer_phone}</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="লাইভ ট্র্যাকিং তথ্য রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'আপডেট হচ্ছে...' : 'লাইভ রিফ্রেশ'}</span>
            </button>
          )}

          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
              isCancelled
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : status === 'delivered'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-teal-50 text-teal-900 border-teal-200'
            }`}>
              {!isCancelled && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              )}
              <span>{progress.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🗺️ INTERACTIVE DELIVERY ROUTE MAP (ভিজ্যুয়াল ট্র্যাকিং ম্যাপ) */}
      {/* ============================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-teal-200/80 bg-gradient-to-br from-slate-900 via-[#0B1E28] to-[#04201A] p-4 sm:p-6 text-white shadow-md">
        {/* Subtle Map Grid lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #2dd4bf 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Navigation className="w-4 h-4 text-teal-300" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>সেন্ট্রাল ডেলিভারি রুট ও লাইভ ম্যাপ</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-bold border border-teal-400/30">
                    Live GPS Routing
                  </span>
                </h3>
                <p className="text-[11px] text-teal-200/70">
                  মার্চেন্ট ওয়্যারহাউজ থেকে আপনার গন্তব্যের লাইভ ট্রানজিট গতিপথ
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">গন্তব্য এলাকা:</span>
              <span className="text-xs font-bold text-teal-300">
                {order.deliveryCity === 'outside_dhaka' ? 'ঢাকার বাইরে (Regional Hub)' : 'ঢাকা সিটি (Central Zone)'}
              </span>
            </div>
          </div>

          {/* Graphical Multi-Station Route Path */}
          <div className="relative py-4 px-2 sm:px-6">
            {/* Route Line Track */}
            <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-300 transition-all duration-700 ease-out rounded-full shadow-lg"
                style={{ width: `${isCancelled ? 0 : progress.percent}%` }}
              />
            </div>

            {/* Moving Vehicle Marker */}
            {!isCancelled && (
              <div
                className="absolute top-1 -translate-x-1/2 transition-all duration-700 ease-out flex flex-col items-center pointer-events-none"
                style={{ left: `calc(${progress.percent}% + 8px)` }}
              >
                <div className="w-8 h-8 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-teal-400/50 border-2 border-white animate-bounce">
                  {status === 'shipped' || status === 'out_for_delivery' ? (
                    <Truck className="w-4 h-4" />
                  ) : status === 'delivered' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                </div>
                <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/90 text-teal-300 text-[9px] font-black border border-teal-400/40 whitespace-nowrap shadow-xs">
                  {status === 'delivered' ? 'পৌঁছেছে' : 'চলমান...'}
                </span>
              </div>
            )}

            {/* 4 Interactive Hub Pins along the route */}
            <div className="grid grid-cols-4 gap-2 pt-6 text-center">
              {/* Station 1: Vendor Origin */}
              <div className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  progress.step >= 1 ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">মার্চেন্ট হাব</span>
                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                  {primarySub?.vendorShopName || 'উৎপাদক কেন্দ্র'}
                </span>
              </div>

              {/* Station 2: Central Logistics Hub */}
              <div className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  progress.step >= 3 ? 'bg-teal-500/20 text-teal-300 border border-teal-400/40' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">সেন্ট্রাল লজিস্টিকস</span>
                <span className="text-[9px] text-slate-400">তেজগাঁও, ঢাকা</span>
              </div>

              {/* Station 3: Courier Transit */}
              <div className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  progress.step >= 4 ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">কুরিয়ার ট্রানজিট</span>
                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                  {courierName || 'Steadfast / Hub'}
                </span>
              </div>

              {/* Station 4: Customer Point */}
              <div className="flex flex-col items-center space-y-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  progress.step >= 5 ? 'bg-emerald-500 text-slate-950 border border-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">কাস্টমার গন্তব্য</span>
                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                  {order.customerAddress || 'আপনার ঠিকানা'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Delivery Note / Estimate */}
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-300 shrink-0" />
              <span className="text-[11px] sm:text-xs text-slate-200">
                ডেলিভারি ঠিকানা: <strong className="text-white">{order.customerAddress || order.customer_address}</strong>
              </span>
            </div>
            {estimatedDeliveryDate && (
              <div className="flex items-center gap-1.5 text-teal-300 font-bold text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>সম্ভাব্য পৌঁছাবে: {estimatedDeliveryDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5-STEP DELIVERY PROGRESS PIPELINE */}
      {/* ============================================================== */}
      {!isCancelled ? (
        <div className="bg-slate-50 rounded-3xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
            অর্ডারের সার্বিক অগ্রগতি (Status Steps)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative">
            {steps.map((st) => {
              const isPassed = progress.step >= st.step;
              const isCurrent = progress.step === st.step;

              return (
                <div
                  key={st.step}
                  className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                      : isPassed
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-white/60 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isPassed ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : st.step}
                    </span>

                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                    )}
                  </div>

                  <div>
                    <div className={`text-xs font-black ${isCurrent ? 'text-teal-900' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {st.title}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {st.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex items-center gap-3 text-rose-900 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-black text-sm text-rose-950">
              {status === 'returned' ? 'পণ্যটি রিটার্ন করা হয়েছে' : 'অর্ডারটি বাতিল করা হয়েছে'}
            </div>
            <p className="text-rose-700 mt-0.5">
              {order.returnReason || order.paymentRejectReason || 'সুপার এডমিন বা ভেন্ডর কর্তৃক অর্ডারটি বাতিল হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।'}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* COURIER & RIDER CONNECT BOX */}
      {/* ============================================================== */}
      {(courierName || courierTrackingCode || deliveryManName || deliveryManPhone || deliveryNote) && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-indigo-950">
                  কুরিয়ার পার্টনার ও ট্র্যাকিং কোড
                </h4>
                <p className="text-[11px] text-indigo-700">
                  {courierName ? `মাধ্যম: ${courierName}` : 'নির্ধারিত কুরিয়ার সার্ভিস'}
                </p>
              </div>
            </div>

            {courierTrackingCode && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold">ট্র্যাকিং কোড:</span>
                <span className="font-mono font-black text-xs text-indigo-900">{courierTrackingCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(courierTrackingCode, 'কুরিয়ার কোড')}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                  title="কপি করুন"
                >
                  {copiedText === 'কুরিয়ার কোড' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(deliveryManName || deliveryManPhone) && (
              <div className="bg-white p-3 rounded-2xl border border-indigo-100 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-semibold">ডেলিভারি রাইডার:</span>
                    <span className="text-xs font-black text-slate-800 truncate block">
                      {deliveryManName || 'নির্ধারিত রাইডার'}
                    </span>
                  </div>
                </div>

                {deliveryManPhone && (
                  <a
                    href={`tel:${deliveryManPhone}`}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>কল দিন</span>
                  </a>
                )}
              </div>
            )}

            {estimatedDeliveryDate && (
              <div className="bg-white p-3 rounded-2xl border border-indigo-100 flex items-center gap-2.5 shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">সম্ভাব্য ডেলিভারির তারিখ:</span>
                  <span className="text-xs font-black text-slate-800">{estimatedDeliveryDate}</span>
                </div>
              </div>
            )}
          </div>

          {deliveryNote && (
            <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>ডেলিভারি নোট:</strong> {deliveryNote}</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VENDOR SUB-ORDERS LIST */}
      {/* ============================================================== */}
      {subOrders.length > 0 && (
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
            ভেন্ডরভিত্তিক পার্সেলসমূহ ({subOrders.length} টি স্টোর)
          </h4>

          <div className="space-y-2">
            {subOrders.map((sub: any, idx: number) => {
              const subItems = Array.isArray(sub.items) ? sub.items : [];
              return (
                <div
                  key={sub.id || idx}
                  className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/90 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-teal-700" />
                      <span className="font-black text-slate-900">{sub.vendorShopName || 'ভেন্ডর স্টোর'}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-black border border-teal-200">
                      স্ট্যাটাস: {sub.orderStatus === 'delivered' ? 'ডেলিভার্ড' : sub.orderStatus === 'shipped' ? 'শিপড' : sub.orderStatus === 'processing' ? 'প্যাকেজিং হচ্ছে' : 'গৃহীত'}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {subItems.map((it: any, iIdx: number) => (
                      <div key={iIdx} className="flex justify-between text-xs text-slate-600">
                        <span className="truncate pr-2">
                          {it.productName || it.name} × {it.quantity} {it.unit || ''}
                        </span>
                        <span className="font-bold text-slate-800 shrink-0">
                          ৳{formatMoney((it.unitPrice || it.price || 0) * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500 font-semibold">
                    <span>সাবটোটাল: ৳{formatMoney(sub.subtotal || sub.totalAmount)}</span>
                    {sub.courierName && (
                      <span className="text-indigo-800 font-bold">কুরিয়ার: {sub.courierName}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FINANCIAL SUMMARY & PAYMENT STATUS */}
      {/* ============================================================== */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
        <div className="flex justify-between font-black text-slate-900 text-sm pb-1 border-b border-slate-200">
          <span>সর্বমোট বিল:</span>
          <span className="text-teal-900">৳ {formatMoney(totalAmount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex justify-between items-center text-[11px]">
            <span className="font-bold text-emerald-800">পরিশোধিত (Paid):</span>
            <span className="font-black text-emerald-700">৳ {formatMoney(paidAmount)}</span>
          </div>
          <div className={`rounded-xl p-2 flex justify-between items-center text-[11px] border ${
            dueAmount > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <span className="font-bold">বকেয়া (Due):</span>
            <span className="font-black">৳ {formatMoney(dueAmount)}</span>
          </div>
        </div>

        <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>পেমেন্ট মাধ্যম: <strong>{order.paymentMethod?.toUpperCase() || 'COD'}</strong></span>
          <span>পেমেন্ট স্ট্যাটাস: <strong>{order.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বকেয়া / ক্যাশ অন ডেলিভারি'}</strong></span>
        </div>
      </div>
    </div>
  );
};
