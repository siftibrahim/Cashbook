import React, { useState } from 'react';
import {
  Search,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  RefreshCw,
  Box,
  CheckCircle,
  Send,
  Calendar,
  User,
  FileText,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { OnlineOrder, OnlineStoreConfig } from '../../types';
import { formatMoney } from '../../utils/storage';
import { storeApi, publicStoreApi } from '../../services/apiService';
import { marketplaceApi } from '../../services/marketplaceService';

interface StorefrontOrderTrackerProps {
  orders: OnlineOrder[];
  whatsappPhone?: string;
  storeConfig?: OnlineStoreConfig;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onOrderUpdatedLocally?: (updatedOrder: OnlineOrder) => void;
}

export const StorefrontOrderTracker: React.FC<StorefrontOrderTrackerProps> = ({
  orders,
  whatsappPhone,
  storeConfig,
  onRefresh,
  isRefreshing = false,
  onOrderUpdatedLocally,
}) => {
  const [searchKey, setSearchKey] = useState('');
  const [submittingPaymentOrderId, setSubmittingPaymentOrderId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | 'bank' | 'bangla_qr'>('bkash');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [senderPhoneInput, setSenderPhoneInput] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ orderId: string; type: 'success' | 'error'; text: string } | null>(null);

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
      case 'packaging':
      case 'packed':
        return 2;
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
      case 'returned':
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

  const handleOpenPaymentSubmit = (order: OnlineOrder) => {
    if (submittingPaymentOrderId === (order.id || order.orderNumber)) {
      setSubmittingPaymentOrderId(null);
      return;
    }
    setSubmittingPaymentOrderId(order.id || order.orderNumber);
    const defaultMethod =
      order.paymentMethod && order.paymentMethod !== 'cod'
        ? (order.paymentMethod as any)
        : storeConfig?.acceptBkash
        ? 'bkash'
        : storeConfig?.acceptNagad
        ? 'nagad'
        : storeConfig?.acceptRocket
        ? 'rocket'
        : 'bkash';
    setPayMethod(defaultMethod);
    setTrxIdInput(order.trxId || '');
    setSenderPhoneInput(order.senderPhone || order.customerPhone || '');
    const due =
      order.dueAmount !== undefined
        ? order.dueAmount
        : Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
    setPaidAmountInput(String(due > 0 ? due : order.totalAmount || 0));
    setFeedbackMsg(null);
  };

  const handleSubmitCustomerPayment = async (order: OnlineOrder) => {
    if (!trxIdInput.trim()) {
      setFeedbackMsg({
        orderId: order.id || order.orderNumber,
        type: 'error',
        text: 'অনুগ্রহ করে পেমেন্টের ট্রানজেকশন আইডি (TrxID) লিখুন।',
      });
      return;
    }

    setIsSavingPayment(true);
    setFeedbackMsg(null);
    try {
      const amountNum = Number(paidAmountInput) || order.totalAmount || 0;
      const res = await storeApi.submitOrderTrackPayment(order.orderNumber || order.id, {
        paymentMethod: payMethod,
        trxId: trxIdInput.trim(),
        senderPhone: senderPhoneInput.trim() || order.customerPhone,
        paidAmount: amountNum,
      });

      if (res && res.order) {
        if (onOrderUpdatedLocally) {
          onOrderUpdatedLocally(res.order);
        }
        setFeedbackMsg({
          orderId: order.id || order.orderNumber,
          type: 'success',
          text: '✅ আপনার পেমেন্ট তথ্য (TrxID) সফলভাবে দোকানদারের কাছে পাঠানো হয়েছে! দোকানদার যাচাই করে অনুমোদন দিবেন।',
        });
        setSubmittingPaymentOrderId(null);
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setFeedbackMsg({
          orderId: order.id || order.orderNumber,
          type: 'error',
          text: 'পেমেন্ট তথ্য জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        orderId: order.id || order.orderNumber,
        type: 'error',
        text: e?.message || 'ত্রুটি হয়েছে।',
      });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCancelOrder = async (order: OnlineOrder) => {
    const ordId = order.id || order.orderNumber;
    const ordNum = order.orderNumber || order.id;
    const isConfirmed = window.confirm(
      `আপনি কি নিশ্চিত যে আপনি অর্ডার #${ordNum} বাতিল করতে চান? এতে অর্ডারটি সম্পূর্ণ বাতিল হয়ে যাবে এবং পণ্য স্টকে ফেরত যাবে।`
    );
    if (!isConfirmed) return;

    setCancellingOrderId(ordId);
    try {
      const isMarketplace = order.orderSource === 'marketplace' || Boolean(order.masterOrderId) || ordNum.startsWith('MKT-');
      if (isMarketplace) {
        await marketplaceApi.cancelOrder(order.masterOrderId || ordId, 'গ্রাহক ট্র্যাকিং পেজ থেকে অর্ডার বাতিল করেছেন');
      } else {
        const storeSlug = storeConfig?.storeSlug || storeConfig?.customDomain;
        if (storeSlug) {
          await publicStoreApi.cancelOrder(storeSlug, ordId, 'গ্রাহক ট্র্যাকিং পেজ থেকে অর্ডার বাতিল করেছেন');
        } else {
          await storeApi.cancelOrder(ordNum, 'গ্রাহক ট্র্যাকিং পেজ থেকে অর্ডার বাতিল করেছেন');
        }
      }

      const updated: OnlineOrder = {
        ...order,
        orderStatus: 'cancelled',
        paymentStatus: 'cancelled',
        paymentRejectReason: 'গ্রাহক কর্তৃক অর্ডার বাতিল',
        updatedAt: Date.now(),
      };

      if (onOrderUpdatedLocally) {
        onOrderUpdatedLocally(updated);
      }
      if (onRefresh) {
        await onRefresh();
      }
      setFeedbackMsg({
        orderId: ordId,
        type: 'success',
        text: '✅ আপনার অর্ডারটি সফলভাবে বাতিল করা হয়েছে।',
      });
    } catch (err: any) {
      setFeedbackMsg({
        orderId: ordId,
        type: 'error',
        text: '❌ ' + (err?.message || 'অর্ডার বাতিল করতে সমস্যা হয়েছে'),
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getVendorPaymentNumber = (method: string) => {
    if (!storeConfig) return '';
    if (method === 'bkash') return storeConfig.bkashNumber || '';
    if (method === 'nagad') return storeConfig.nagadNumber || '';
    if (method === 'rocket') return storeConfig.rocketNumber || '';
    if (method === 'upay') return storeConfig.upayNumber || '';
    if (method === 'bank') return `${storeConfig.bankName || ''} - A/C: ${storeConfig.bankAccountNumber || ''}`;
    if (method === 'bangla_qr') return storeConfig.banglaQrNumber || '';
    return '';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-xl font-black text-slate-900 truncate">অর্ডার ট্র্যাকিং ও পেমেন্ট স্ট্যাটাস</h2>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>লাইভ ট্র্যাকিং</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            আপনার অর্ডার, পেমেন্ট ভেরিফিকেশন ও ডেলিভারি আপডেট সরাসরি দেখুন
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh()}
            disabled={isRefreshing}
            className="shrink-0 w-24 h-8 justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-700 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="truncate">{isRefreshing ? 'আপডেট...' : 'রিফ্রেশ'}</span>
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
            const isCancelled = order.orderStatus === 'cancelled' || order.orderStatus === 'returned';
            const paidAmt =
              order.paidAmount !== undefined
                ? order.paidAmount
                : order.paymentStatus === 'paid'
                ? order.totalAmount
                : 0;
            const dueAmt =
              order.dueAmount !== undefined
                ? order.dueAmount
                : Math.max(0, (order.totalAmount || 0) - paidAmt);
            const canSubmitPayment =
              !isCancelled &&
              order.paymentStatus !== 'paid' &&
              order.paymentStatus !== 'refunded';
            const isPaymentFormOpen = submittingPaymentOrderId === (order.id || order.orderNumber);

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
                    {((order.orderStatus as string) === 'processing' || (order.orderStatus as string) === 'packaging' || (order.orderStatus as string) === 'packed') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                        <Box className="w-3 h-3 text-purple-600" />
                        <span>প্যাকেজিং ও প্রস্তুতি চলছে</span>
                      </span>
                    )}
                    {((order.orderStatus as string) === 'shipped' || (order.orderStatus as string) === 'in_transit') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        <span>কুরিয়ারে পাঠানো হয়েছে</span>
                      </span>
                    )}
                    {order.orderStatus === 'out_for_delivery' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                        <Truck className="w-3 h-3 text-teal-600" />
                        <span>ডেলিভারির পথে (রাইডার অ্যাসাইনড)</span>
                      </span>
                    )}
                    {order.orderStatus === 'delivered' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>সফল ডেলিভারি সম্পন্ন</span>
                      </span>
                    )}
                    {(order.orderStatus === 'cancelled' || order.orderStatus === 'returned') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>{order.orderStatus === 'returned' ? 'অর্ডার রিটার্ন হয়েছে' : 'অর্ডার বাতিল করা হয়েছে'}</span>
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
                      দোকানদার কর্তৃক এই অর্ডারটি বাতিল বা রিটার্ন করা হয়েছে। কোনো তথ্য জানতে নিচে হোয়াটসঅ্যাপ বাটনে যোগাযোগ করুন।
                    </span>
                  </div>
                )}

                {/* Courier & Delivery Man details */}
                {(order.courierName || order.deliveryManName || order.estimatedDeliveryDate || order.deliveryNote) && (
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      {order.courierName && (
                        <div className="flex items-center gap-1.5 font-black text-indigo-900">
                          <Truck className="w-4 h-4 text-indigo-700" />
                          <span>কুরিয়ার / মাধ্যম: {order.courierName}</span>
                        </div>
                      )}
                      {order.courierTrackingCode && (
                        <span className="font-mono bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 text-[11px] font-bold text-indigo-900">
                          ট্র্যাকিং: {order.courierTrackingCode}
                        </span>
                      )}
                    </div>

                    {(order.deliveryManName || order.deliveryManPhone) && (
                      <div className="flex items-center justify-between bg-white/90 px-3 py-2 rounded-xl border border-indigo-100 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ডেলিভারি ম্যান: {order.deliveryManName || 'নির্ধারিত রাইডার'}</span>
                        </div>
                        {order.deliveryManPhone && (
                          <a
                            href={`tel:${order.deliveryManPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>কল করুন ({order.deliveryManPhone})</span>
                          </a>
                        )}
                      </div>
                    )}

                    {order.estimatedDeliveryDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-800 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>সম্ভাব্য ডেলিভারির তারিখ: {order.estimatedDeliveryDate}</span>
                      </div>
                    )}

                    {order.deliveryNote && (
                      <div className="text-[11px] text-indigo-900 bg-white/80 p-2 rounded-lg border border-indigo-100">
                        <span className="font-bold">ডেলিভারি নোট: </span>
                        {order.deliveryNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Vendor Note to Customer */}
                {order.vendorNote && (
                  <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3 text-xs text-teal-950 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black block text-teal-900">দোকানদারের বার্তা:</span>
                      <span className="text-teal-800 font-medium">{order.vendorNote}</span>
                    </div>
                  </div>
                )}

                {/* Items Summary & Paid/Due Breakdown */}
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs border border-slate-200/80">
                  <div className="font-bold text-slate-700 mb-1">অর্ডারকৃত পণ্য ও বিল বিবরণী:</div>
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

                  <div className="border-t border-slate-200 pt-1.5 space-y-1">
                    {order.deliveryCharge ? (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>ডেলিভারি চার্জ:</span>
                        <span className="font-semibold text-slate-700">+৳{formatMoney(order.deliveryCharge)}</span>
                      </div>
                    ) : null}
                    {order.discountAmount ? (
                      <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                        <span>ডিসকাউন্ট ছাড়:</span>
                        <span>-৳{formatMoney(order.discountAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-black text-slate-900 text-xs sm:text-sm pt-0.5">
                      <span>সর্বমোট বিল:</span>
                      <span className="text-teal-900">৳{formatMoney(order.totalAmount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800 font-bold">জমা (Paid):</span>
                        <span className="font-black text-emerald-700">৳{formatMoney(paidAmt)}</span>
                      </div>
                      <div
                        className={`border rounded-xl px-2.5 py-1.5 flex items-center justify-between ${
                          dueAmt > 0
                            ? 'bg-rose-50 border-rose-200/70 text-rose-800'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="text-[11px] font-bold">বাকি (Due):</span>
                        <span className="font-black">৳{formatMoney(dueAmt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Status Box */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>পেমেন্ট মেথড:</span>
                    </span>
                    <span className="font-bold text-slate-800 uppercase">
                      {order.paymentMethod === 'cod'
                        ? '💵 ক্যাশ অন ডেলিভারি (COD)'
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

                  {(order.trxId || order.senderPhone) && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 flex-wrap gap-2">
                      {order.trxId && (
                        <div>
                          <span className="text-slate-500">TrxID: </span>
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {order.trxId}
                          </span>
                        </div>
                      )}
                      {order.senderPhone && (
                        <div>
                          <span className="text-slate-500">প্রেরক নম্বর: </span>
                          <span className="font-mono font-bold text-slate-800">{order.senderPhone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2">
                    {order.paymentStatus === 'paid' ? (
                      <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 font-bold text-[11px]">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>দোকানদার কর্তৃক আপনার সম্পূর্ণ পেমেন্ট যাচাই ও অনুমোদিত হয়েছে!</span>
                      </div>
                    ) : order.paymentStatus === 'partial' || order.paymentStatus === 'partial_paid' ? (
                      <div className="flex items-center justify-between gap-2 text-blue-900 bg-blue-50 px-3 py-2 rounded-xl border border-blue-200 font-bold text-[11px] flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>আংশিক পেমেন্ট ভেরিফাইড (জমা: ৳{formatMoney(paidAmt)} | ডেলিভারিতে বাকি: ৳{formatMoney(dueAmt)})</span>
                        </div>
                      </div>
                    ) : order.paymentStatus === 'rejected' ? (
                      <div className="space-y-1.5 text-rose-900 bg-rose-50 p-3 rounded-xl border border-rose-200 text-[11px]">
                        <div className="flex items-center gap-1.5 font-black">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>দোকানদার পেমেন্টটি বাতিল করেছেন</span>
                        </div>
                        <p className="text-rose-700 pl-5 font-medium">
                          কারণ: {order.paymentRejectReason || 'দোকানদার আপনার TrxID বা অ্যাকাউন্টে টাকা খুঁজে পাননি। অনুগ্রহ করে সঠিক TrxID পুনরায় জমা দিন।'}
                        </p>
                      </div>
                    ) : order.paymentStatus === 'pending_verification' ? (
                      <div className="flex items-center gap-1.5 text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 font-bold text-[11px]">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                        <span>দোকানদার আপনার পাঠানো পেমেন্ট (TrxID) যাচাই করছেন...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 font-bold text-[11px]">
                        <span>পেমেন্ট স্ট্যাটাস: ক্যাশ অন ডেলিভারি / বকেয়া (৳{formatMoney(dueAmt)})</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Self-Service Payment / TrxID Submission Button */}
                  {canSubmitPayment && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentSubmit(order)}
                        className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                        <span>
                          {order.paymentStatus === 'rejected'
                            ? 'পুনরায় সঠিক পেমেন্ট তথ্য (TrxID) জমা দিন'
                            : order.paymentStatus === 'pending_verification'
                            ? 'পেমেন্টের TrxID / তথ্য সংশোধন করুন'
                            : 'অনলাইনে পেমেন্ট করে TrxID জমা দিন'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Feedback message after submitting payment */}
                  {feedbackMsg && feedbackMsg.orderId === (order.id || order.orderNumber) && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] font-bold border ${
                        feedbackMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      {feedbackMsg.text}
                    </div>
                  )}

                  {/* Expandable Payment Submission Form */}
                  {isPaymentFormOpen && (
                    <div className="mt-2 p-3.5 bg-slate-50 rounded-2xl border border-teal-200 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-teal-950 text-xs">
                          💳 দোকানদারের নম্বরে পেমেন্ট করে তথ্য দিন
                        </span>
                        <button
                          type="button"
                          onClick={() => setSubmittingPaymentOrderId(null)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          বন্ধ করুন
                        </button>
                      </div>

                      {/* Method selector */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {(['bkash', 'nagad', 'rocket', 'upay', 'bank'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPayMethod(m)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border uppercase transition cursor-pointer ${
                              payMethod === m
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {m === 'bkash'
                              ? 'বিকাশ'
                              : m === 'nagad'
                              ? 'নগদ'
                              : m === 'rocket'
                              ? 'রকেট'
                              : m === 'upay'
                              ? 'উপায়'
                              : 'ব্যাংক'}
                          </button>
                        ))}
                      </div>

                      {/* Show vendor's payment number if configured */}
                      {getVendorPaymentNumber(payMethod) && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">দোকানদারের {payMethod.toUpperCase()} নম্বর:</span>
                            <span className="font-mono font-black text-teal-900">{getVendorPaymentNumber(payMethod)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(getVendorPaymentNumber(payMethod));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>কপি</span>
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            ট্রানজেকশন আইডি (TrxID) *
                          </label>
                          <input
                            type="text"
                            value={trxIdInput}
                            onChange={(e) => setTrxIdInput(e.target.value)}
                            placeholder="উদাঃ BKA98234X"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            প্রেরক মোবাইল নম্বর *
                          </label>
                          <input
                            type="tel"
                            value={senderPhoneInput}
                            onChange={(e) => setSenderPhoneInput(e.target.value)}
                            placeholder="017XXXXXXXX"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            পাঠানো টাকার পরিমাণ (৳)
                          </label>
                          <input
                            type="number"
                            value={paidAmountInput}
                            onChange={(e) => setPaidAmountInput(e.target.value)}
                            placeholder={String(dueAmt)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSavingPayment}
                        onClick={() => handleSubmitCustomerPayment(order)}
                        className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSavingPayment ? 'পাঠানো হচ্ছে...' : 'পেমেন্ট তথ্য জমা দিন'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delivery details, Cancel action & WhatsApp action */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1 truncate pr-2 max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{order.customerAddress}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Customer Cancel Order Button: allowed if order is pending or processing and not yet delivered/shipped/cancelled */}
                    {!isCancelled && order.orderStatus !== 'shipped' && order.orderStatus !== 'delivered' && (
                      <button
                        type="button"
                        disabled={cancellingOrderId === (order.id || order.orderNumber)}
                        onClick={() => handleCancelOrder(order)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                        title="এই অর্ডারটি বাতিল করুন"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{cancellingOrderId === (order.id || order.orderNumber) ? 'বাতিল হচ্ছে...' : 'অর্ডার বাতিল করুন'}</span>
                      </button>
                    )}

                    {whatsappPhone && (
                      <a
                        href={`https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `হ্যালো, আমি আমার অর্ডার (${order.orderNumber}) সম্পর্কে জানতে চাই।`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-bold flex items-center gap-1 shrink-0 transition cursor-pointer text-[11px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
