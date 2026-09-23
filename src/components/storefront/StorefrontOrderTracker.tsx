import React, { useState } from 'react';
import { Search, PackageCheck, Truck, CheckCircle2, Clock, MapPin, Phone, MessageCircle, AlertTriangle, XCircle, CreditCard, RefreshCw, Box, CheckCircle } from 'lucide-react';
import { OnlineOrder } from '../../types';
import { formatMoney } from '../../utils/storage';

interface StorefrontOrderTrackerProps {
  orders: OnlineOrder[];
  whatsappPhone?: string;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}

export const StorefrontOrderTracker: React.FC<StorefrontOrderTrackerProps> = ({
  orders,
  whatsappPhone,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchKey, setSearchKey] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (!searchKey.trim()) return true;
    const q = searchKey.trim().toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q)
    );
  });

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'confirmed':
        return 2;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return 0;
      default:
        return 1;
    }
  };

  const steps = [
    { step: 1, label: 'অর্ডার গৃহীত' },
    { step: 2, label: 'প্রসেসিং ও প্যাকেজিং' },
    { step: 3, label: 'ডেলিভারির পথে' },
    { step: 4, label: 'ডেলিভার্ড' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">অর্ডার ট্র্যাকিং ও হিস্ট্রি</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>রিয়েল-টাইম লাইভ</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">আপনার মোবাইল নম্বর বা অর্ডার নম্বর দিয়ে সরাসরি ট্র্যাক করুন</p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60"
            title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'আপডেট হচ্ছে...' : 'রিফ্রেশ'}</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchKey}
          onChange={(e) => setSearchKey(e.target.value)}
          placeholder="অর্ডার নম্বর বা মোবাইল লিখুন (উদাঃ 017...)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 shadow-2xs"
        />
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
      </div>

      {/* Orders List */}
      <div className="space-y-4 pt-1">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              আপনি এখনো কোনো অর্ডার করেননি অথবা নম্বরটি সঠিকভাবে মেলেনি। হোমপেইজ থেকে পছন্দের পণ্য অর্ডার করুন।
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const currentStep = getStatusStep(order.orderStatus);
            const isCancelled = order.orderStatus === 'cancelled';

            return (
              <div
                key={order.id || order.orderNumber}
                className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">অর্ডার নম্বর</div>
                    <div className="font-black text-sm text-[#004D40]">{order.orderNumber}</div>
                  </div>

                  <div className="text-right">
                    {order.orderStatus === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>অর্ডার গৃহীত (যাচাই চলছে)</span>
                      </span>
                    )}
                    {order.orderStatus === 'confirmed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>অর্ডার কনফার্ম হয়েছে</span>
                      </span>
                    )}
                    {order.orderStatus === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                        <Box className="w-3 h-3 text-purple-600" />
                        <span>প্যাকেজিং ও প্রস্তুতি চলছে</span>
                      </span>
                    )}
                    {order.orderStatus === 'shipped' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        <span>কুরিয়ারে হস্তান্তর (ডেলিভারির পথে)</span>
                      </span>
                    )}
                    {order.orderStatus === 'delivered' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>সফল ডেলিভারি সম্পন্ন</span>
                      </span>
                    )}
                    {order.orderStatus === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>অর্ডার বাতিল করা হয়েছে</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Steps Timeline */}
                {!isCancelled ? (
                  <div className="py-2">
                    <div className="grid grid-cols-4 relative gap-1 text-center">
                      {steps.map((st) => {
                        const isPassed = currentStep >= st.step;
                        const isCurrent = currentStep === st.step;
                        return (
                          <div key={st.step} className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all mb-1 ${
                                isPassed
                                  ? 'bg-[#004D40] text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              } ${isCurrent ? 'ring-2 ring-teal-400/50 scale-105' : ''}`}
                            >
                              {isPassed ? <CheckCircle2 className="w-4 h-4" /> : st.step}
                            </div>
                            <span
                              className={`text-[9px] sm:text-[10px] leading-tight ${
                                isCurrent
                                  ? 'text-teal-900 font-black'
                                  : isPassed
                                  ? 'text-slate-800 font-bold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      দোকানদার কর্তৃক এই অর্ডারটি বাতিল করা হয়েছে। কোনো তথ্য জানতে নিচে হোয়াটসঅ্যাপ বাটনে যোগাযোগ করুন।
                    </span>
                  </div>
                )}

                {/* Courier details if shipped */}
                {order.courierName && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-700" />
                      <span className="font-bold">কুরিয়ার: {order.courierName}</span>
                    </div>
                    {order.courierTrackingCode && (
                      <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-indigo-200 text-[11px] font-bold">
                        ট্র্যাকিং কোড: {order.courierTrackingCode}
                      </span>
                    )}
                  </div>
                )}

                {/* Items Summary */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs border border-slate-100">
                  <div className="font-bold text-slate-700 mb-1">অর্ডারকৃত পণ্যসমূহ:</div>
                  {order.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span className="truncate pr-2">
                        {it.productName} x {it.quantity} {it.unit || ''}
                      </span>
                      <span className="font-bold text-slate-800 shrink-0">
                        ৳{formatMoney(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900">
                    <span>সর্বমোট বিল:</span>
                    <span className="text-teal-900">৳{formatMoney(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Payment Status Box */}
                <div className="bg-white rounded-2xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>পেমেন্ট মেথড:</span>
                    </span>
                    <span className="font-bold text-slate-800 uppercase">
                      {order.paymentMethod === 'cod'
                        ? 'ক্যাশ অন ডেলিভারি (COD)'
                        : order.paymentMethod === 'bkash'
                        ? '🌸 বিকাশ (bKash)'
                        : order.paymentMethod === 'nagad'
                        ? '🟠 নগদ (Nagad)'
                        : order.paymentMethod === 'rocket'
                        ? '🟣 রকেট (Rocket)'
                        : order.paymentMethod === 'upay'
                        ? '🟡 উপায় (Upay)'
                        : order.paymentMethod === 'bank'
                        ? '🏦 ব্যাংক ট্রান্সফার'
                        : '🇧🇩 বাংলা কিউআর (Bangla QR)'}
                    </span>
                  </div>

                  {order.paymentMethod !== 'cod' && (
                    <>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                        <span className="text-slate-500">ট্রানজেকশন আইডি (TrxID):</span>
                        <span className="font-mono font-bold text-slate-700">
                          {order.trxId || (order.notes?.match(/TrxID:\s*([^\s|]+)/i)?.[1] ?? 'যাচাই হচ্ছে')}
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-1.5">
                        {order.paymentStatus === 'paid' ? (
                          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-bold text-[11px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>আপনার পেমেন্ট সফলভাবে অনুমোদিত ও কনফার্ম হয়েছে!</span>
                          </div>
                        ) : order.paymentStatus === 'rejected' ? (
                          <div className="space-y-1 text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-[11px]">
                            <div className="flex items-center gap-1.5 font-bold">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>পেমেন্ট বাতিল করা হয়েছে</span>
                            </div>
                            <p className="text-rose-700 pl-5">
                              {order.paymentRejectReason || 'দোকানদার আপনার TrxID বা অ্যাকাউন্টে টাকা খুঁজে পাননি। অনুগ্রহ করে সঠিক তথ্যের জন্য যোগাযোগ করুন।'}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 font-bold text-[11px]">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>দোকানদার আপনার পেমেন্ট ভেরিফাই করছেন (যাচাই অপেক্ষমান)...</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Delivery details & WhatsApp action */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1 truncate pr-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{order.customerAddress}</span>
                  </div>

                  {whatsappPhone && (
                    <a
                      href={`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `হ্যালো, আমি আমার অর্ডার (${order.orderNumber}) সম্পর্কে জানতে চাই।`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp হেল্প</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
