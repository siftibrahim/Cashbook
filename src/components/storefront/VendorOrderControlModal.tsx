import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Truck,
  CreditCard,
  Edit3,
  Printer,
  User,
  Phone,
  MapPin,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Send,
  ShieldCheck,
  RefreshCw,
  FileText,
  Sparkles,
  Clock,
  AlertCircle,
  BookOpen,
  MessageSquare,
  Calendar,
  Eye,
} from 'lucide-react';
import { OnlineOrder, OnlineOrderItem } from '../../types';
import { storeApi } from '../../services/apiService';

interface VendorOrderControlModalProps {
  order: OnlineOrder;
  storeName: string;
  storePhone: string;
  storeAddress?: string;
  initialTab?: 'details' | 'payment' | 'delivery' | 'edit' | 'print';
  onClose: () => void;
  onOrderUpdated: (updatedOrder: OnlineOrder, message?: string) => void;
}

const COURIER_PRESETS = [
  'Steadfast Courier',
  'Pathao Courier',
  'RedX Delivery',
  'Paperfly',
  'Sundarban Courier',
  'SA Paribahan',
  'eCourier',
  'নিজস্ব ডেলিভারি ম্যান / রাইডার',
];

export const VendorOrderControlModal: React.FC<VendorOrderControlModalProps> = ({
  order,
  storeName,
  storePhone,
  storeAddress,
  initialTab = 'details',
  onClose,
  onOrderUpdated,
}) => {
  const isMarketplaceOrder = order.orderSource === 'marketplace' || Boolean(order.masterOrderId);
  const isMarketplaceLocked =
    isMarketplaceOrder &&
    (order.isLockedForVendor === true || order.adminApprovalStatus === 'pending_approval' || !order.isAdminApproved);
  const [activeTab, setActiveTab] = useState<'details' | 'payment' | 'delivery' | 'edit' | 'print'>(
    isMarketplaceOrder && initialTab === 'payment' ? 'details' : (initialTab || 'details')
  );
  const [saving, setSaving] = useState(false);
  const [syncingLedger, setSyncingLedger] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<OnlineOrder['paymentMethod']>(order.paymentMethod || 'cod');
  const [paymentStatus, setPaymentStatus] = useState<OnlineOrder['paymentStatus']>(order.paymentStatus || 'unpaid');
  const [trxId, setTrxId] = useState(order.trxId || '');
  const [senderPhone, setSenderPhone] = useState(order.senderPhone || order.customerPhone || '');
  const [paidAmount, setPaidAmount] = useState<string>(
    String(order.paidAmount !== undefined ? order.paidAmount : order.paymentStatus === 'paid' ? order.totalAmount : 0)
  );
  const [discountAmount, setDiscountAmount] = useState<string>(String(order.discountAmount || 0));
  const [rejectReason, setRejectReason] = useState(order.paymentRejectReason || '');

  // Delivery & Courier State
  const [orderStatus, setOrderStatus] = useState<OnlineOrder['orderStatus']>(order.orderStatus || 'pending');
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [courierTrackingCode, setCourierTrackingCode] = useState(order.courierTrackingCode || '');
  const [deliveryManName, setDeliveryManName] = useState(order.deliveryManName || '');
  const [deliveryManPhone, setDeliveryManPhone] = useState(order.deliveryManPhone || '');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(order.estimatedDeliveryDate || '');
  const [deliveryNote, setDeliveryNote] = useState(order.deliveryNote || '');
  const [vendorNote, setVendorNote] = useState(order.vendorNote || '');
  const [sendSmsOnSave, setSendSmsOnSave] = useState(true);

  // Customer & Items Edit State
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress || '');
  const [deliveryArea, setDeliveryArea] = useState<OnlineOrder['deliveryArea']>(order.deliveryArea || 'inside_dhaka');
  const [deliveryCharge, setDeliveryCharge] = useState<string>(String(order.deliveryCharge || 0));
  const [items, setItems] = useState<OnlineOrderItem[]>(
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((i) => ({ ...i }))
      : [{ productId: 'custom_1', productName: 'পণ্য', unitPrice: order.subtotal || 0, quantity: 1, unit: 'পিস', total: order.subtotal || 0 }]
  );
  const [notes, setNotes] = useState(order.notes || '');

  // Computed Totals
  const computedSubtotal = items.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
    0
  );
  const numDeliveryCharge = parseFloat(deliveryCharge) || 0;
  const numDiscount = parseFloat(discountAmount) || 0;
  const computedGrandTotal = Math.max(0, computedSubtotal + numDeliveryCharge - numDiscount);
  const numPaid = parseFloat(paidAmount) || 0;
  const computedDue = paymentStatus === 'paid' ? 0 : Math.max(0, computedGrandTotal - numPaid);

  const handleQuickPaymentAction = async (
    action: 'accept' | 'partial' | 'cod_collect' | 'reject' | 'refund' | 'reset' | 'update_info'
  ) => {
    if (isMarketplaceOrder) return;
    setSaving(true);
    try {
      const updated = await storeApi.updatePaymentStatus(order.id, action, rejectReason, {
        paidAmount: action === 'accept' || action === 'cod_collect' ? computedGrandTotal : numPaid,
        dueAmount: action === 'accept' || action === 'cod_collect' ? 0 : computedDue,
        discountAmount: numDiscount,
        paymentMethod,
        paymentStatus: action === 'update_info' ? paymentStatus : undefined,
        trxId: trxId.trim(),
        senderPhone: senderPhone.trim(),
        notes,
      });
      if (updated) {
        onOrderUpdated(updated, '✅ পেমেন্ট স্ট্যাটাস ও বিলিং তথ্য সফলভাবে আপডেট হয়েছে!');
      }
    } catch (err: any) {
      onOrderUpdated(order, `❌ ত্রুটি: ${err?.message || 'পেমেন্ট আপডেট ব্যর্থ হয়েছে'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFullOrder = async () => {
    setSaving(true);
    try {
      const normalizedItems = items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice) || 0,
        quantity: Number(it.quantity) || 1,
        total: (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
      }));

      const res = await storeApi.fullUpdateOrder(order.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryArea,
        items: normalizedItems,
        subtotal: computedSubtotal,
        deliveryCharge: numDeliveryCharge,
        discountAmount: numDiscount,
        totalAmount: computedGrandTotal,
        paidAmount: paymentStatus === 'paid' ? computedGrandTotal : numPaid,
        dueAmount: computedDue,
        paymentMethod: isMarketplaceOrder ? undefined : paymentMethod,
        paymentStatus: isMarketplaceOrder ? undefined : paymentStatus,
        orderStatus,
        trxId: trxId.trim(),
        senderPhone: senderPhone.trim(),
        courierName: courierName.trim(),
        courierTrackingCode: courierTrackingCode.trim(),
        deliveryManName: deliveryManName.trim(),
        deliveryManPhone: deliveryManPhone.trim(),
        estimatedDeliveryDate: estimatedDeliveryDate.trim(),
        deliveryNote: deliveryNote.trim(),
        vendorNote: vendorNote.trim(),
        notes: notes.trim(),
        sendSmsToCustomer: sendSmsOnSave,
      });

      if (res?.order) {
        onOrderUpdated(res.order, res.message || '✅ অর্ডারের সকল তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
      }
    } catch (err: any) {
      if (err?.data?.needsSmsRecharge || err?.message?.includes('ব্যালেন্স') || err?.message?.includes('sms')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('twing_open_sms_recharge', { detail: { tab: 'packages' } }));
        }
      }
      onOrderUpdated(order, `❌ ত্রুটি: ${err?.message || 'অর্ডার আপডেট ব্যর্থ হয়েছে'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncStockAndLedger = async () => {
    setSyncingLedger(true);
    try {
      const res = await storeApi.syncOrderStockAndLedger(order.id, { syncStock: true, syncLedger: true });
      if (res?.order) {
        onOrderUpdated(res.order, res.message);
      }
    } catch (err: any) {
      onOrderUpdated(order, `❌ ত্রুটি: ${err?.message || 'স্টক ও ক্যাশবুক সিঙ্ক ব্যর্থ হয়েছে'}`);
    } finally {
      setSyncingLedger(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof OnlineOrderItem, value: any) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const next = { ...it, [field]: value };
        next.total = (Number(next.unitPrice) || 0) * (Number(next.quantity) || 1);
        return next;
      })
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: `custom_${Date.now()}`,
        productName: 'নতুন পণ্য',
        unitPrice: 100,
        quantity: 1,
        unit: 'পিস',
        total: 100,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePrintParcelSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-teal-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-black">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  অর্ডার ম্যানেজমেন্ট ও ডেলিভারি কন্ট্রোল #{order.orderNumber}
                </h3>
                {isMarketplaceOrder ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    🏛️ সেন্ট্রাল মার্কেটপ্লেস অর্ডার
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🏠 পার্সোনাল ই-কমার্স সাইট (১০০% ভেন্ডর নিয়ন্ত্রিত)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                কাস্টমার: <span className="text-slate-200 font-bold">{customerName}</span> ({customerPhone}) • মোট বিল:{' '}
                <span className="text-teal-400 font-black">৳{computedGrandTotal.toLocaleString('bn-BD')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'details'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-4 h-4" />
            ১. অর্ডার ও পণ্য বিস্তারিত
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'delivery'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            ২. ডেলিভারি ও কুরিয়ার
          </button>
          {!isMarketplaceOrder && (
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'payment'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              ৩. পেমেন্ট যাচাই ও আদায়
            </button>
          )}
          {!isMarketplaceOrder && (
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === 'edit'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              ৪. অর্ডার ও পণ্য এডিট
            </button>
          )}
          <button
            onClick={() => setActiveTab('print')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'print'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            ৫. পার্সেল স্লিপ ও ইনভয়েস
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB: VENDOR COMPLETE ORDER & PRODUCT DETAILS (REQUIREMENT 3) */}
          {activeTab === 'details' && (() => {
            const createdDate = order.createdAt ? new Date(Number(order.createdAt)) : new Date();
            const statusLabelMap: Record<string, string> = {
              pending: '⏳ পেন্ডিং (নতুন অর্ডার)',
              confirmed: '✅ কনফার্মড',
              processing: '📦 প্রস্তুত হচ্ছে (প্রসেসিং)',
              shipped: '🚚 কুরিয়ারে পাঠানো হয়েছে (শিপড)',
              delivered: '🎉 ডেলিভারি সম্পন্ন (Delivered)',
              cancelled: '❌ অর্ডার বাতিল (Cancelled)',
            };

            return (
              <div className="space-y-4 text-xs">
                {/* 1. Status & Payment Badge Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold">পেমেন্ট স্ট্যাটাস</p>
                      <p className="font-black text-sm text-white mt-0.5">
                        {order.paymentStatus === 'paid'
                          ? '✅ পেইড (অনুমোদিত)'
                          : order.paymentMethod === 'cod'
                          ? '💵 ক্যাশ অন ডেলিভারি'
                          : '⏳ পেমেন্ট যাচাইাধীন'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${
                      isMarketplaceLocked
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isMarketplaceLocked ? '🔒 লক (যাচাই বাকি)' : '✅ আনলকড'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-800/70 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold">ডেলিভারি স্ট্যাটাস</p>
                      <p className="font-black text-sm text-teal-300 mt-0.5">
                        {statusLabelMap[orderStatus] || orderStatus}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-900/60 text-teal-300 border border-teal-500/40 font-bold text-[10px]">
                      {courierName || 'কুরিয়ার নির্ধারিত হয়নি'}
                    </span>
                  </div>
                </div>

                {/* 2. Customer Information Card */}
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-black text-white flex items-center gap-1.5 text-xs">
                      <User className="w-4 h-4 text-teal-400" />
                      <span>গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${customerPhone}`}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>কল দিন</span>
                      </a>
                      <a
                        href={`https://wa.me/88${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${customerName}, আপনার অর্ডার #${order.orderNumber} এর বিষয়ে যোগাযোগ করছি।`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">গ্রাহকের নাম:</span>
                      <strong className="text-white text-sm">{customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোবাইল নম্বর:</span>
                      <strong className="text-white font-mono text-sm">{customerPhone}</strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">ডেলিভারি ঠিকানা:</span>
                      <p className="text-slate-200 font-medium leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 inline mr-1" />
                        {customerAddress}
                        {deliveryArea && (
                          <span className="ml-1.5 text-teal-400 font-bold">
                            ({deliveryArea === 'inside_dhaka' || String(deliveryArea) === 'dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Customer Notes / Special Instructions */}
                  {notes && (
                    <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/40 text-amber-200">
                      <span className="font-bold text-[11px] block text-amber-300">📝 গ্রাহকের বিশেষ নির্দেশনা / কাস্টমার নোট:</span>
                      <p className="mt-1 leading-relaxed text-amber-100">{notes}</p>
                    </div>
                  )}

                  {/* Order Date & Time */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>অর্ডারের সময়: {createdDate.toLocaleDateString('bn-BD')} | {createdDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* 3. Ordered Products Details (Vendor's Own Products) */}
                <div className="space-y-2">
                  <h4 className="font-black text-white flex items-center gap-1.5 text-xs">
                    <Package className="w-4 h-4 text-teal-400" />
                    <span>অর্ডারকৃত পণ্যসমূহ (আপনার স্টোরের পণ্য)</span>
                  </h4>

                  <div className="divide-y divide-slate-800 border border-slate-700 rounded-2xl overflow-hidden bg-slate-900/60">
                    {items.map((it: any, idx: number) => {
                      const q = Number(it.quantity) || 1;
                      const u = it.unit || 'পিস';
                      const p = Number(it.unitPrice || it.price || 0);
                      const sub = Number(it.total || it.subtotal || p * q);
                      const desc = it.description || it.productDescription || '';
                      const variantStr = it.variant || [it.size, it.color].filter(Boolean).join(' • ');

                      return (
                        <div key={idx} className="p-3.5 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs sm:text-sm">
                                {it.productName || it.name || 'পণ্য'}
                              </span>
                              {variantStr && (
                                <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40 text-[10px] font-bold">
                                  ভ্যারিয়েন্ট: {variantStr}
                                </span>
                              )}
                            </div>
                            {desc && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {desc}
                              </p>
                            )}
                            <div className="text-[11px] text-slate-300 font-mono">
                              মূল্য: ৳{p.toLocaleString('bn-BD')} × {q}{u}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-teal-300 block font-mono">৳{sub.toLocaleString('bn-BD')}</span>
                            <span className="text-[10px] text-slate-400 font-medium">আইটেম সাবটোটাল</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Financial Calculations */}
                <div className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700 space-y-1.5">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>পণ্য সাবটোটাল:</span>
                    <span className="font-mono font-bold text-white">৳{computedSubtotal.toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>ডেলিভারি চার্জ:</span>
                    <span className="font-mono font-bold text-white">৳{numDeliveryCharge.toLocaleString('bn-BD')}</span>
                  </div>
                  {numDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 text-[11px]">
                      <span>ডিসকাউন্ট:</span>
                      <span className="font-mono font-bold">-৳{numDiscount.toLocaleString('bn-BD')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-black text-sm pt-1.5 border-t border-slate-700">
                    <span>সর্বমোট বিল:</span>
                    <span className="font-mono text-base text-teal-400">৳{computedGrandTotal.toLocaleString('bn-BD')}</span>
                  </div>
                </div>

                {/* 5. Quick Action Switchers */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('delivery')}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                  >
                    <Truck className="w-4 h-4" />
                    <span>ডেলিভারি স্ট্যাটাস ও কুরিয়ার আপডেট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('print')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                  >
                    <Printer className="w-4 h-4" />
                    <span>পার্সেল স্লিপ প্রিন্ট</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB 1: VENDOR PAYMENT VERIFICATION & MANAGEMENT (Personal Store Only) */}
          {activeTab === 'payment' && !isMarketplaceOrder && (
            <div className="space-y-5">
              {/* Governance Notice */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200/90 leading-relaxed">
                  <span className="font-black text-white">পার্সোনাল ই-কমার্স পেমেন্ট ভেন্ডর কন্ট্রোল:</span> এটি আপনার নিজস্ব ই-কমার্স স্টোরের অর্ডার। এর পেমেন্ট যাচাই, অগ্রিম জমা গ্রহণ, ডিসকাউন্ট প্রদান এবং ক্যাশ অন ডেলিভারি (COD) টাকা আদায় সম্পূর্ণ আপনি (ভেন্ডর) পরিচালনা করবেন। এতে কোনো এডমিন অনুমোদনের প্রয়োজন নেই।
                </div>
              </div>

              {/* Financial Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/70">
                  <p className="text-[11px] text-slate-400 font-bold">মোট অর্ডার বিল</p>
                  <p className="text-lg font-black text-white mt-0.5">৳{computedGrandTotal.toLocaleString('bn-BD')}</p>
                  <p className="text-[10px] text-slate-500">সাবটোটাল: ৳{computedSubtotal} + ডেলিভারি: ৳{numDeliveryCharge}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-300 font-bold">জমা / পরিশোধিত টাকা</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">
                    ৳{(paymentStatus === 'paid' ? computedGrandTotal : numPaid).toLocaleString('bn-BD')}
                  </p>
                  <p className="text-[10px] text-emerald-300/70">মাধ্যম: {paymentMethod.toUpperCase()}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30">
                  <p className="text-[11px] text-amber-300 font-bold">ডেলিভারিতে আদায়যোগ্য (Due/COD)</p>
                  <p className="text-lg font-black text-amber-400 mt-0.5">৳{computedDue.toLocaleString('bn-BD')}</p>
                  <p className="text-[10px] text-amber-300/70">
                    {computedDue === 0 ? 'সম্পূর্ণ পরিশোধিত' : 'পার্সেল ডেলিভারির সময় আদায়যোগ্য'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/70">
                  <p className="text-[11px] text-slate-400 font-bold">বর্তমান পেমেন্ট স্ট্যাটাস</p>
                  <p className="text-sm font-black mt-1">
                    {paymentStatus === 'paid' && <span className="text-emerald-400">✅ পরিশোধিত (Paid)</span>}
                    {(paymentStatus === 'partial' || paymentStatus === 'partial_paid') && (
                      <span className="text-teal-400">🌗 আংশিক পরিশোধিত</span>
                    )}
                    {paymentStatus === 'pending_verification' && (
                      <span className="text-amber-400">⏳ যাচাইয়ের অপেক্ষায়</span>
                    )}
                    {paymentStatus === 'unpaid' && <span className="text-slate-300">💵 ক্যাশ অন ডেলিভারি / বাকি</span>}
                    {paymentStatus === 'rejected' && <span className="text-rose-400">❌ বাতিল / রিজেক্টেড</span>}
                    {paymentStatus === 'refunded' && <span className="text-purple-400">↩️ রিফান্ডকৃত</span>}
                  </p>
                </div>
              </div>

              {/* 1-Click Instant Payment Verification Actions */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  ওয়ান-ক্লিক পেমেন্ট যাচাই ও অনুমোদন অ্যাকশন
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    disabled={saving}
                    onClick={() => handleQuickPaymentAction('accept')}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    পেমেন্ট ভেরিফাই ও ফুল পেইড (৳{computedGrandTotal})
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleQuickPaymentAction('cod_collect')}
                    className="py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50"
                  >
                    <DollarSign className="w-4 h-4" />
                    COD / ডেলিভারি ক্যাশ আদায় সম্পন্ন
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleQuickPaymentAction('reject')}
                    className="py-3 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    ভুল TrxID / পেমেন্ট রিজেক্ট করুন
                  </button>
                </div>
              </div>

              {/* Detailed Payment Fields Editor */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/70 space-y-4">
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  পেমেন্ট তথ্য, অগ্রিম জমা (Partial Payment) ও ছাড় কাস্টমাইজ করুন
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">পেমেন্ট মেথড</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-teal-500 outline-none"
                    >
                      <option value="cod">💵 ক্যাশ অন ডেলিভারি (COD)</option>
                      <option value="bkash">🩷 বিকাশ (bKash)</option>
                      <option value="nagad">🧡 নগদ (Nagad)</option>
                      <option value="rocket">💜 রকেট (Rocket)</option>
                      <option value="upay">💛 উপায় (Upay)</option>
                      <option value="bank">🏦 ব্যাংক ট্রান্সফার</option>
                      <option value="bangla_qr">📱 বাংলা কিউআর (Bangla QR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ট্রানজেকশন আইডি (TrxID)</label>
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="যেমন: BKA890XYZ"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">প্রেরকের মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 mb-1">
                      জমা / অগ্রিম প্রাপ্ত টাকা (Paid Amount ৳)
                    </label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-black focus:border-emerald-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      স্পেশাল ছাড় / ডিসকাউন্ট (Discount ৳)
                    </label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-300 text-xs font-black focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">পেমেন্ট স্ট্যাটাস পরিবর্তন</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-teal-500 outline-none"
                    >
                      <option value="unpaid">💵 আনপেইড / COD বাকি</option>
                      <option value="pending_verification">⏳ যাচাইয়ের অপেক্ষায়</option>
                      <option value="partial_paid">🌗 আংশিক পরিশোধিত (Partial Paid)</option>
                      <option value="paid">✅ সম্পূর্ণ পরিশোধিত (Paid)</option>
                      <option value="rejected">❌ রিজেক্টেড (Rejected)</option>
                      <option value="refunded">↩️ রিফান্ডকৃত (Refunded)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    পেমেন্ট নোট বা রিজেক্ট করার কারণ (যদি বাতিল করেন)
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="যেমন: বিকাশ পার্সোনাল নম্বরে ১০০ টাকা ডেলিভারি চার্জ অগ্রিম পাওয়া গেছে..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    disabled={saving}
                    onClick={() => handleQuickPaymentAction('partial')}
                    className="px-4 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    আংশিক পেমেন্ট (৳{numPaid}) কনফার্ম করুন
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleQuickPaymentAction('update_info')}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    পেমেন্ট ও বিল তথ্য সংরক্ষণ করুন
                  </button>
                </div>
              </div>

              {/* Stock & Cashbook Auto-Sync Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-teal-950/60 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    ইনভেন্টরি স্টক ও দোকানের ক্যাশবুকে অটোমেটিক হিসাব সমন্বয়
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    অর্ডারের পণ্যের স্টক অটোমেটিক কমাতে এবং প্রাপ্ত টাকা দোকানের ক্যাশবুকে (আয় হিসেবে) জমা করতে নিচের বাটনে ক্লিক করুন।
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-[11px] font-bold ${order.isStockAdjusted ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {order.isStockAdjusted ? '✅ স্টক সমন্বয় সম্পন্ন' : '⏳ স্টক এখনো কমানো হয়নি'}
                    </span>
                    <span className={`text-[11px] font-bold ${order.isLedgerSynced ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {order.isLedgerSynced ? '✅ ক্যাশবুকে জমা হয়েছে' : '⏳ ক্যাশবুকে এখনো যুক্ত হয়নি'}
                    </span>
                  </div>
                </div>
                <button
                  disabled={syncingLedger || (order.isStockAdjusted && order.isLedgerSynced)}
                  onClick={handleSyncStockAndLedger}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-black whitespace-nowrap shadow-lg disabled:opacity-50"
                >
                  {syncingLedger
                    ? 'সিঙ্ক হচ্ছে...'
                    : order.isStockAdjusted && order.isLedgerSynced
                    ? '✅ স্টক ও ক্যাশবুক সিঙ্কড'
                    : '📦 স্টক ও ক্যাশবুকে জমা করুন'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERY, COURIER & RIDER MANAGEMENT */}
          {activeTab === 'delivery' && (
            <div className="space-y-5">
              {isMarketplaceLocked ? (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-200 font-bold">
                    🔒 এটি সেন্ট্রাল মার্কেটপ্লেসের অর্ডার। সুপার এডমিন পেমেন্ট যাচাই করার আগে ভেন্ডর কোনো ধরনের কাস্টমারের স্ট্যাটাস পরিবর্তন করতে পারবেন না।
                  </p>
                </div>
              ) : isMarketplaceOrder ? (
                <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-200 font-bold">
                    ✅ সুপার এডমিন পেমেন্ট অনুমোদন করেছেন! এখন আপনি অর্ডারের যেকোনো স্ট্যাটাস ও কুরিয়ার ট্র্যাকিং পরিবর্তন করতে পারবেন এবং কাস্টমার রিয়েল-টাইমে তা ট্র্যাকিংয়ে দেখতে পাবেন।
                  </p>
                </div>
              ) : null}

              {/* Step-by-Step Delivery Status Selector */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-3">
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-400" />
                  অর্ডার ও ডেলিভারি স্ট্যাটাস নির্বাচন করুন (যেকোনো স্ট্যাটাসে পরিবর্তনযোগ্য)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'pending', label: '⏳ পেন্ডিং (নতুন অর্ডার)', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
                    { id: 'confirmed', label: '✅ অর্ডার কনফার্মড', color: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
                    { id: 'processing', label: '📦 প্রস্তুত হচ্ছে (প্যাকেজিং)', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
                    { id: 'shipped', label: '🚚 কুরিয়ারে পাঠানো হয়েছে (পথে আছে)', color: 'border-teal-500/40 bg-teal-500/10 text-teal-300' },
                    { id: 'delivered', label: '🎉 ডেলিভারি সম্পন্ন (Delivered)', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
                    { id: 'cancelled', label: '❌ অর্ডার বাতিল (Cancelled)', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={isMarketplaceLocked}
                      onClick={() => setOrderStatus(st.id as any)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all text-left flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed ${
                        orderStatus === st.id
                          ? `${st.color} ring-2 ring-teal-400 shadow-lg`
                          : 'bg-slate-900/70 border-slate-700/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{st.label}</span>
                      {orderStatus === st.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Courier Service & Rider Details */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/70 space-y-4">
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-400" />
                  কুরিয়ার সার্ভিস ও ডেলিভারি ম্যান / রাইডার তথ্য
                </h4>

                {/* Quick Courier Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {COURIER_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourierName(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        courierName === c
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">কুরিয়ার সার্ভিসের নাম</label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="যেমন: Steadfast / Pathao / নিজস্ব ডেলিভারি"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      কুরিয়ার ট্র্যাকিং কোড / কনসাইনমেন্ট আইডি
                    </label>
                    <input
                      type="text"
                      value={courierTrackingCode}
                      onChange={(e) => setCourierTrackingCode(e.target.value)}
                      placeholder="যেমন: SF-9928172 বা লিংক"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ডেলিভারি ম্যান / রাইডারের নাম (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={deliveryManName}
                      onChange={(e) => setDeliveryManName(e.target.value)}
                      placeholder="যেমন: রাকিব হাসান"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ডেলিভারি ম্যানের মোবাইল নম্বর
                    </label>
                    <input
                      type="text"
                      value={deliveryManPhone}
                      onChange={(e) => setDeliveryManPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      সম্ভাব্য ডেলিভারির তারিখ/সময়
                    </label>
                    <input
                      type="text"
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                      placeholder="যেমন: আগামীকাল দুপুর ২টায় / ২৫ অক্টোবর"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ডেলিভারি নোট / কুরিয়ার নির্দেশনা
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="যেমন: ডেলিভারির আগে কল দেবেন, ভঙ্গুর পণ্য..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
                    <input
                      type="checkbox"
                      checked={sendSmsOnSave}
                      onChange={(e) => setSendSmsOnSave(e.target.checked)}
                      className="rounded border-slate-600 text-teal-500 focus:ring-teal-500"
                    />
                    আপডেটের সাথে সাথে কাস্টমারকে অটোমেটিক ডেলিভারি ট্র্যাকিং SMS পাঠান
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FULL ORDER, CUSTOMER & ITEMS EDITOR (Personal Store Only) */}
          {activeTab === 'edit' && !isMarketplaceOrder && (
            <div className="space-y-5">
              {/* Customer Details */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/70 space-y-3">
                <h4 className="text-xs font-black text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  কাস্টমারের নাম, ফোন ও ডেলিভারি ঠিকানা আপডেট
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">কাস্টমারের নাম</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ডেলিভারি এরিয়া ও চার্জ (৳)</label>
                    <div className="flex gap-2">
                      <select
                        value={deliveryArea}
                        onChange={(e) => setDeliveryArea(e.target.value as any)}
                        className="flex-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      >
                        <option value="inside_dhaka">ঢাকার ভেতরে</option>
                        <option value="outside_dhaka">ঢাকার বাইরে</option>
                        <option value="store_pickup">দোকান থেকে সংগ্রহ</option>
                      </select>
                      <input
                        type="number"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                        className="w-24 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                        placeholder="চার্জ ৳"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">সম্পূর্ণ ডেলিভারি ঠিকানা</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              {/* Order Items Editor */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-400" />
                    অর্ডারের পণ্যসমূহ, পরিমাণ ও মূল্য কাস্টমাইজ করুন
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-black flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> নতুন পণ্য যোগ
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800"
                    >
                      <div className="col-span-5 sm:col-span-5">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                          placeholder="পণ্যের নাম"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          placeholder="পরিমাণ"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs text-center font-bold"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="দর ৳"
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 text-right text-xs font-black text-teal-400">
                        ৳{((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)).toLocaleString('bn-BD')}
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRINTABLE COURIER PARCEL SLIP & INVOICE */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700">
                <div>
                  <h4 className="text-xs font-black text-white">🖨️ কুরিয়ার পার্সেল লেবেল ও কাস্টমার ইনভয়েস</h4>
                  <p className="text-[11px] text-slate-400">
                    পার্সেলের গায়ে লাগানোর জন্য অথবা কাস্টমারকে রশিদ দেওয়ার জন্য প্রিন্ট করুন
                  </p>
                </div>
                <button
                  onClick={handlePrintParcelSlip}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  এখনই প্রিন্ট করুন
                </button>
              </div>

              {/* Printable Slip Card */}
              <div className="bg-white text-slate-900 rounded-2xl p-6 border-2 border-dashed border-slate-400 max-w-xl mx-auto shadow-xl space-y-4">
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">MERCHANT / SENDER</p>
                    <h2 className="text-lg font-black text-slate-900">{storeName}</h2>
                    <p className="text-xs font-bold text-slate-700">হেল্পলাইন: {storePhone}</p>
                    {storeAddress && <p className="text-xs text-slate-600">{storeAddress}</p>}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-black text-xs">
                      #{order.orderNumber}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 font-bold">
                      তারিখ: {new Date(order.createdAt).toLocaleDateString('bn-BD')}
                    </p>
                    {courierName && (
                      <p className="text-xs font-black text-teal-800 mt-0.5">কুরিয়ার: {courierName}</p>
                    )}
                    {courierTrackingCode && (
                      <p className="text-[11px] font-mono font-bold text-slate-800">Track: {courierTrackingCode}</p>
                    )}
                  </div>
                </div>

                {/* Customer Receiver Box */}
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    DELIVER TO (প্রাপক / কাস্টমার)
                  </p>
                  <p className="text-base font-black text-slate-900">{customerName}</p>
                  <p className="text-sm font-black text-slate-800 font-mono">📞 {customerPhone}</p>
                  <p className="text-xs font-bold text-slate-700">📍 ঠিকানা: {customerAddress}</p>
                  {deliveryNote && (
                    <p className="text-xs font-bold text-rose-700 pt-1">⚠️ নির্দেশনা: {deliveryNote}</p>
                  )}
                </div>

                {/* Items Table */}
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600">
                      <th className="py-1.5 text-left font-black">পণ্য</th>
                      <th className="py-1.5 text-center font-black">পরিমাণ</th>
                      <th className="py-1.5 text-right font-black">মূল্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-1.5 font-bold text-slate-900">{it.productName}</td>
                        <td className="py-1.5 text-center font-bold">
                          {it.quantity} {it.unit || 'পিস'}
                        </td>
                        <td className="py-1.5 text-right font-bold">
                          ৳{((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toLocaleString('bn-BD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals & COD Highlight Box */}
                <div className="border-t-2 border-slate-900 pt-3 flex items-center justify-between">
                  <div className="text-xs space-y-0.5 text-slate-700 font-bold">
                    <p>সাবটোটাল: ৳{computedSubtotal.toLocaleString('bn-BD')}</p>
                    <p>ডেলিভারি চার্জ: ৳{numDeliveryCharge.toLocaleString('bn-BD')}</p>
                    {numDiscount > 0 && <p>ডিসকাউন্ট: -৳{numDiscount.toLocaleString('bn-BD')}</p>}
                    <p>মোট বিল: ৳{computedGrandTotal.toLocaleString('bn-BD')}</p>
                    <p>অগ্রিম/জমা: ৳{(paymentStatus === 'paid' ? computedGrandTotal : numPaid).toLocaleString('bn-BD')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 text-white text-right">
                    <p className="text-[10px] font-bold uppercase text-amber-300">
                      {computedDue > 0 ? 'ডেলিভারির সময় আদায়যোগ্য (COD)' : 'পেমেন্ট স্ট্যাটাস'}
                    </p>
                    <p className="text-xl font-black text-white">
                      {computedDue > 0 ? `৳${computedDue.toLocaleString('bn-BD')}` : 'PAID (৳০)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Save Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            বন্ধ করুন
          </button>
          <button
            type="button"
            disabled={saving || isMarketplaceLocked}
            onClick={handleSaveFullOrder}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সকল পরিবর্তন ও আপডেট সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
