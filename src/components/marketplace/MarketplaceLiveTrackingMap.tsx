import React, { useMemo } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ExternalLink,
  Copy,
  AlertCircle,
  Building2,
  Store,
  Navigation,
  Sparkles,
  Calendar,
  User,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface SubOrder {
  id: string;
  orderNumber: string;
  vendorShopName?: string;
  vendorPhone?: string;
  orderStatus?: string;
  status?: string;
  paymentStatus?: string;
  adminApprovalStatus?: string;
  isAdminApproved?: boolean;
  courierName?: string;
  courierTrackingCode?: string;
  deliveryManName?: string;
  deliveryManPhone?: string;
  estimatedDeliveryDate?: string;
  deliveryNote?: string;
  vendorNote?: string;
  totalAmount?: number;
  items?: any[];
}

export interface TrackedMarketplaceOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryCity?: string;
  grandTotal: number;
  totalProductsAmount?: number;
  totalDeliveryCharge?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  adminApprovalStatus?: string;
  isAdminApproved?: boolean;
  isRejectedByAdmin?: boolean;
  adminRejectionReason?: string;
  overallStatus: string;
  courierName?: string;
  courierTrackingCode?: string;
  deliveryManName?: string;
  deliveryManPhone?: string;
  estimatedDeliveryDate?: string;
  deliveryNote?: string;
  createdAt?: number;
  updatedAt?: number;
  subOrders?: SubOrder[];
}

interface MarketplaceLiveTrackingMapProps {
  order: TrackedMarketplaceOrder;
  isLiveUpdating?: boolean;
  onRefresh?: () => void;
  onCopyText?: (text: string) => void;
}

export const MarketplaceLiveTrackingMap: React.FC<MarketplaceLiveTrackingMapProps> = ({
  order,
  isLiveUpdating = false,
  onRefresh,
  onCopyText,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (onCopyText) {
      onCopyText(text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Determine active step index (0 to 4)
  const normalizedStatus = useMemo(() => {
    return String(order.overallStatus || 'pending').toLowerCase();
  }, [order.overallStatus]);

  const activeStep = useMemo(() => {
    if (normalizedStatus === 'cancelled' || normalizedStatus === 'returned') return -1;
    if (normalizedStatus === 'delivered') return 4;
    if (normalizedStatus === 'out_for_delivery') return 3;
    if (normalizedStatus === 'shipped') return 2;
    if (normalizedStatus === 'processing' || normalizedStatus === 'confirmed') return 1;
    if (order.isAdminApproved) return 1;
    return 0; // pending_verification / pending
  }, [normalizedStatus, order.isAdminApproved]);

  const steps = [
    {
      index: 0,
      title: 'অর্ডার প্লেস ও যাচাই',
      description: order.isAdminApproved
        ? 'সুপার এডমিন কর্তৃক পেমেন্ট যাচাই সম্পন্ন'
        : 'অর্ডার জমা হয়েছে, পেমেন্ট ভেরিফিকেশন চলছে',
      icon: Clock,
      color: 'amber',
    },
    {
      index: 1,
      title: 'ভেন্ডর প্যাকেজিং ও প্রস্তুতকরণ',
      description: 'ভেন্ডর স্টোরে পণ্য মান যাচাই ও প্যাকিং সম্পন্ন হচ্ছে',
      icon: Package,
      color: 'blue',
    },
    {
      index: 2,
      title: 'কুরিয়ার সেন্ট্রাল হাব ও ট্রানজিট',
      description: order.courierName
        ? `${order.courierName} কুরিয়ারে হস্তান্তর ও ট্রানজিটে রয়েছে`
        : 'নির্ধারিত কুরিয়ার পার্টনারে হস্তান্তর করা হচ্ছে',
      icon: Truck,
      color: 'indigo',
    },
    {
      index: 3,
      title: 'ডেলিভারি রাইডার ও লোকাল হাব',
      description: order.deliveryManName
        ? `রাইডার ${order.deliveryManName} আপনার ঠিকানায় ডেলিভারির পথে`
        : 'লোকাল ডেলিভারি হাবে পৌঁছেছে, রাইডার অ্যাসাইন হচ্ছে',
      icon: Navigation,
      color: 'teal',
    },
    {
      index: 4,
      title: 'সফল ডেলিভারি সম্পন্ন',
      description: 'গ্রাহকের ঠিকানায় পণ্য সফলভাবে পৌঁছানো হয়েছে',
      icon: CheckCircle2,
      color: 'emerald',
    },
  ];

  // Helper for direct external courier tracking links in Bangladesh
  const getCourierDirectLink = (courier: string, code: string) => {
    if (!code) return null;
    const cleanCourier = (courier || '').toLowerCase().trim();
    const cleanCode = code.trim();

    if (cleanCourier.includes('steadfast')) {
      return `https://steadfast.com.bd/t/${encodeURIComponent(cleanCode)}`;
    }
    if (cleanCourier.includes('pathao')) {
      return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(cleanCode)}`;
    }
    if (cleanCourier.includes('redx')) {
      return `https://redx.com.bd/track-order?trackingId=${encodeURIComponent(cleanCode)}`;
    }
    if (cleanCourier.includes('ecourier')) {
      return `https://ecourier.com.bd/tracking?ecr=${encodeURIComponent(cleanCode)}`;
    }
    if (cleanCourier.includes('paperfly')) {
      return `https://paperfly.com.bd/tracking?tracking_id=${encodeURIComponent(cleanCode)}`;
    }
    return null;
  };

  // Derive courier from master order or first sub-order
  const activeCourierName = order.courierName || order.subOrders?.find((s) => s.courierName)?.courierName || '';
  const activeTrackingCode = order.courierTrackingCode || order.subOrders?.find((s) => s.courierTrackingCode)?.courierTrackingCode || '';
  const activeDeliveryManName = order.deliveryManName || order.subOrders?.find((s) => s.deliveryManName)?.deliveryManName || '';
  const activeDeliveryManPhone = order.deliveryManPhone || order.subOrders?.find((s) => s.deliveryManPhone)?.deliveryManPhone || '';
  const externalCourierLink = getCourierDirectLink(activeCourierName, activeTrackingCode);

  // Map progress percentage for animation (0% to 100%)
  const progressPercent = useMemo(() => {
    if (activeStep < 0) return 0;
    return Math.min(100, Math.round((activeStep / 4) * 100));
  }, [activeStep]);

  // Dynamic coordinates on SVG curve for current delivery vehicle
  const riderCoord = useMemo(() => {
    switch (activeStep) {
      case 0:
        return { x: 70, y: 70 };
      case 1:
        return { x: 195, y: 62 };
      case 2:
        return { x: 320, y: 68 };
      case 3:
        return { x: 445, y: 64 };
      case 4:
        return { x: 570, y: 70 };
      default:
        return { x: 70, y: 70 };
    }
  }, [activeStep]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-5">
      {/* Header with Live Status & Order Summary */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span>রিয়েল-টাইম লাইভ ট্র্যাকিং সক্রিয়</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white font-mono flex items-center gap-2">
                <span>{order.orderNumber || order.id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.orderNumber || order.id, 'ordNum')}
                  className="text-slate-400 hover:text-white transition cursor-pointer p-0.5"
                  title="অর্ডার নম্বর কপি করুন"
                >
                  {copiedKey === 'ordNum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold">সর্বমোট প্রদেয়</div>
              <div className="text-base font-black text-teal-300">৳ {formatMoney(order.grandTotal)}</div>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer border border-white/10"
                title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
              >
                <RefreshCw className={`w-4 h-4 text-teal-300 ${isLiveUpdating ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold border border-white/15">
            পেমেন্ট: {order.paymentMethod?.toUpperCase()} (
            {order.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বাকি / ক্যাশ অন ডেলিভারি'})
          </span>

          {order.isAdminApproved ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>পেমেন্ট যাচাইকৃত ও অনুমোদিত</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>সুপার এডমিন পর্যালোচনায় রয়েছে</span>
            </span>
          )}

          {activeCourierName && (
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-300" />
              <span>কুরিয়ার: {activeCourierName}</span>
            </span>
          )}
        </div>
      </div>

      {/* ================= INTERACTIVE BANGLADESH COURIER ROUTE MAP ================= */}
      <div className="px-4 sm:px-6">
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-4 sm:p-6 text-white border border-teal-900/50 shadow-inner relative overflow-hidden">
          {/* Subtle Grid / Map Background Watermark */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-400" />
                  <span>লাইভ ডেলিভারি রুট ও প্রগ্রেস ম্যাপ</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ভেন্ডর হাব হতে আপনার গন্তব্যে পৌঁছানোর লাইভ পর্যায়
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-teal-300 bg-teal-900/60 px-2.5 py-1 rounded-full border border-teal-500/30">
                  {progressPercent}% সম্পন্ন
                </span>
              </div>
            </div>

            {/* Interactive SVG Geographic Route Visual */}
            <div className="w-full overflow-x-auto py-2">
              <div className="min-w-[620px] relative">
                <svg viewBox="0 0 640 140" className="w-full h-32 sm:h-36 drop-shadow-md">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0d9488" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="glow" />
                      <feComposite in="SourceGraphic" in2="glow" operator="over" />
                    </filter>
                  </defs>

                  {/* Background Track Path */}
                  <path
                    d="M 70 70 Q 195 55 320 70 T 570 70"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />

                  {/* Active Animated Route Line */}
                  <path
                    d="M 70 70 Q 195 55 320 70 T 570 70"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="8"
                    strokeDasharray="500"
                    strokeDashoffset={500 - (500 * progressPercent) / 100}
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className="transition-all duration-1000 ease-out"
                  />

                  {/* Animated Dashed Pulse Line */}
                  <path
                    d="M 70 70 Q 195 55 320 70 T 570 70"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    className="animate-pulse opacity-60"
                  />

                  {/* Station 1: Vendor Hub / Origin */}
                  <g transform="translate(70, 70)">
                    <circle r="14" fill={activeStep >= 0 ? '#0d9488' : '#334155'} stroke="#ffffff" strokeWidth="2.5" />
                    <text y="32" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                      ভেন্ডর হাব
                    </text>
                    <text y="44" textAnchor="middle" fill="#64748b" fontSize="8">
                      উৎস পয়েন্ট
                    </text>
                  </g>

                  {/* Station 2: Central Verification & Packing */}
                  <g transform="translate(195, 62)">
                    <circle r="14" fill={activeStep >= 1 ? '#0d9488' : '#334155'} stroke="#ffffff" strokeWidth="2.5" />
                    <text y="32" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                      প্যাকিং সেন্টার
                    </text>
                    <text y="44" textAnchor="middle" fill="#64748b" fontSize="8">
                      প্রস্তুতি সম্পন্ন
                    </text>
                  </g>

                  {/* Station 3: Courier Transit Hub */}
                  <g transform="translate(320, 68)">
                    <circle r="14" fill={activeStep >= 2 ? '#06b6d4' : '#334155'} stroke="#ffffff" strokeWidth="2.5" />
                    <text y="32" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                      কুরিয়ার ট্রানজিট
                    </text>
                    <text y="44" textAnchor="middle" fill="#64748b" fontSize="8">
                      {activeCourierName || 'সেন্ট্রাল হাব'}
                    </text>
                  </g>

                  {/* Station 4: Local Station / Rider */}
                  <g transform="translate(445, 64)">
                    <circle r="14" fill={activeStep >= 3 ? '#06b6d4' : '#334155'} stroke="#ffffff" strokeWidth="2.5" />
                    <text y="32" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                      লোকাল ডেলিভারি হাব
                    </text>
                    <text y="44" textAnchor="middle" fill="#64748b" fontSize="8">
                      রাইডার অ্যাসাইন
                    </text>
                  </g>

                  {/* Station 5: Destination Customer Address */}
                  <g transform="translate(570, 70)">
                    <circle r="14" fill={activeStep >= 4 ? '#10b981' : '#334155'} stroke="#ffffff" strokeWidth="2.5" />
                    <text y="32" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
                      আপনার গন্তব্য
                    </text>
                    <text y="44" textAnchor="middle" fill="#64748b" fontSize="8">
                      {order.deliveryCity === 'outside_dhaka' ? 'ঢাকার বাইরে' : 'ঢাকা মেট্রো'}
                    </text>
                  </g>

                  {/* Moving Live Delivery Vehicle / Rider Icon */}
                  {activeStep >= 0 && (
                    <g
                      transform={`translate(${riderCoord.x}, ${riderCoord.y - 20})`}
                      className="transition-all duration-1000 ease-out"
                    >
                      <circle r="18" fill="#14b8a6" className="animate-ping opacity-30" />
                      <circle r="14" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />
                      <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10">
                        {activeStep >= 4 ? '🏠' : activeStep >= 3 ? '🚴' : activeStep >= 2 ? '🚚' : '📦'}
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Current Real-time Status Banner */}
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="font-bold text-white">
                  বর্তমান পর্যায়:{' '}
                  <span className="text-teal-300">
                    {steps[Math.max(0, activeStep)]?.title || 'প্রক্রিয়াধীন'}
                  </span>
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                {steps[Math.max(0, activeStep)]?.description}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= COURIER & RIDER DISPATCH CARD ================= */}
      {(activeCourierName || activeTrackingCode || activeDeliveryManName || activeDeliveryManPhone) && (
        <div className="px-4 sm:px-6">
          <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white rounded-3xl border-2 border-indigo-200/90 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-950">
                    কুরিয়ার ও ডেলিভারি পার্টনার তথ্য
                  </h4>
                  <p className="text-[10px] text-indigo-700 font-medium">
                    অফিশিয়াল কুরিয়ার ট্র্যাকিং ও সরাসরি রাইডার যোগাযোগের ব্যবস্থা
                  </p>
                </div>
              </div>

              {activeCourierName && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wider">
                  {activeCourierName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Courier Tracking Code */}
              {activeTrackingCode && (
                <div className="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-semibold">কুরিয়ার ট্র্যাকিং নম্বর (Consignment ID)</div>
                  <div className="flex items-center justify-between font-mono font-black text-sm text-indigo-950">
                    <span>{activeTrackingCode}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(activeTrackingCode, 'trackCode')}
                        className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                        title="কোড কপি করুন"
                      >
                        {copiedKey === 'trackCode' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {externalCourierLink && (
                        <a
                          href={externalCourierLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 border border-indigo-200 transition"
                        >
                          <span>কুরিয়ারে ট্র্যাক করুন</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Rider Contact */}
              {(activeDeliveryManName || activeDeliveryManPhone) && (
                <div className="p-3 bg-white rounded-2xl border border-indigo-100 shadow-2xs space-y-1.5">
                  <div className="text-[11px] text-slate-500 font-semibold">ডেলিভারি রাইডার</div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{activeDeliveryManName || 'নির্ধারিত রাইডার'}</span>
                    </div>

                    {activeDeliveryManPhone && (
                      <a
                        href={`tel:${activeDeliveryManPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>কল দিন ({activeDeliveryManPhone})</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Delivery Date */}
            {order.estimatedDeliveryDate && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-900 bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold">সম্ভাব্য ডেলিভারির তারিখ: </span>
                <span>{order.estimatedDeliveryDate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP-BY-STEP VERTICAL TIMELINE ================= */}
      <div className="px-4 sm:px-6">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
          অর্ডার প্রক্রিয়ার ধারাবাহিক টাইমলাইন
        </h4>

        <div className="space-y-3 relative pl-4 border-l-2 border-slate-200">
          {steps.map((st) => {
            const isCompleted = activeStep >= st.index;
            const isCurrent = activeStep === st.index;
            const Icon = st.icon;

            return (
              <div key={st.index} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-[25px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-teal-700 text-white ring-4 ring-teal-100 scale-110 shadow-xs'
                      : isCompleted
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-300'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.index + 1}
                </div>

                <div
                  className={`p-3 rounded-2xl border flex-1 transition ${
                    isCurrent
                      ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                      : isCompleted
                      ? 'bg-slate-50 border-slate-200/80'
                      : 'bg-white border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-teal-700" />
                      <span>{st.title}</span>
                    </span>

                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white">
                        চলমান
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{st.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MULTI-VENDOR SUB-ORDERS BREAKDOWN ================= */}
      {Array.isArray(order.subOrders) && order.subOrders.length > 0 && (
        <div className="px-4 sm:px-6 pt-2 pb-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-teal-700" />
              <span>মার্কেটপ্লেস ভেন্ডর স্টোর ও পণ্য বিবরণ ({order.subOrders.length}টি স্টোর)</span>
            </h4>
          </div>

          <div className="space-y-3">
            {order.subOrders.map((sub, idx) => (
              <div
                key={sub.id || idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-2xs">
                      🏪
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900">{sub.vendorShopName || 'ভেন্ডর স্টোর'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">অর্ডার: {sub.orderNumber || sub.id}</div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[11px]">
                    স্ট্যাটাস:{' '}
                    {sub.orderStatus === 'delivered'
                      ? 'ডেলিভার্ড'
                      : sub.orderStatus === 'shipped'
                      ? 'শিপড'
                      : sub.orderStatus === 'processing'
                      ? 'প্যাকিং চলছে'
                      : 'যাচাইকৃত'}
                  </span>
                </div>

                {/* Suborder Items */}
                {Array.isArray(sub.items) && sub.items.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {sub.items.map((it, iIdx) => (
                      <div key={iIdx} className="flex justify-between text-slate-600">
                        <span className="truncate pr-2">
                          {it.productName || it.name} × {it.quantity || 1}
                        </span>
                        <span className="font-bold text-slate-800 shrink-0">
                          ৳ {formatMoney((it.unitPrice || it.price || 0) * (it.quantity || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suborder Courier details if assigned */}
                {sub.courierName && (
                  <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1 font-semibold">
                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>কুরিয়ার: {sub.courierName}</span>
                    </span>
                    {sub.courierTrackingCode && (
                      <span className="font-mono font-bold text-indigo-900">
                        ট্র্যাকিং: {sub.courierTrackingCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
