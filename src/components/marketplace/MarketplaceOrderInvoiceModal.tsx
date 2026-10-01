import React, { useRef } from 'react';
import {
  Printer,
  X,
  Share2,
  Copy,
  Check,
  Truck,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  QrCode,
  Store,
  MessageCircle,
} from 'lucide-react';

interface MarketplaceOrderInvoiceModalProps {
  order: any;
  subOrders?: any[];
  onClose: () => void;
  storeName?: string;
  storePhone?: string;
  isSuperAdmin?: boolean;
}

export const MarketplaceOrderInvoiceModal: React.FC<MarketplaceOrderInvoiceModalProps> = ({
  order,
  subOrders = [],
  onClose,
  storeName = 'সেন্ট্রাল মার্কেটপ্লেস',
  storePhone = '01306908115',
  isSuperAdmin = true,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [format, setFormat] = React.useState<'a4' | 'thermal'>('a4');
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  // Extract items from order or suborders
  const rawItems: any[] = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    rawItems.push(...order.items);
  } else if (subOrders && subOrders.length > 0) {
    subOrders.forEach((sub: any) => {
      if (Array.isArray(sub.items)) {
        sub.items.forEach((it: any) => {
          rawItems.push({
            ...it,
            vendorShopName: sub.vendorShopName || it.vendorShopName,
          });
        });
      }
    });
  }

  const items = rawItems;
  const orderNumber = order.orderNumber || order.order_number || `ORD-${order.id?.slice(0, 8)}`;
  const customerName = order.customerName || order.customer_name || 'গ্রাহক';
  const customerPhone = order.customerPhone || order.customer_phone || '';
  const customerAddress = order.customerAddress || order.customer_address || '';
  const paymentMethod = (order.paymentMethod || order.payment_method || 'cod').toUpperCase();
  const paymentTrxId = order.paymentTrxId || order.payment_trx_id || '';
  const paymentStatus = order.paymentStatus || order.payment_status || 'unpaid';
  const overallStatus = order.overallStatus || order.orderStatus || order.status || 'processing';
  const courierName = order.courierName || order.courier_name || '';
  const courierTrackingCode = order.courierTrackingCode || order.courier_tracking_code || '';
  const createdDate = order.createdAt ? new Date(Number(order.createdAt)) : new Date();

  // Financial calculations
  const totalProductsAmount = Number(order.totalProductsAmount ?? order.subtotal ?? items.reduce((sum, it) => {
    const q = Number(it.quantity) || 1;
    const p = Number(it.unitPrice || it.price || 0);
    return sum + (it.subtotal ? Number(it.subtotal) : p * q);
  }, 0));

  const deliveryCharge = Number(order.totalDeliveryCharge ?? order.deliveryCharge ?? 0);
  const discountAmount = Number(order.discountAmount ?? 0);
  const grandTotal = Number(order.grandTotal ?? order.totalAmount ?? (totalProductsAmount + deliveryCharge - discountAmount));

  const qrData = `TwingHisabi Invoice: ${orderNumber} | Customer: ${customerName} | Phone: ${customerPhone} | Total: ৳${grandTotal} | Status: ${overallStatus}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const handlePrint = () => {
    window.print();
  };

  const getMemoText = () => {
    let txt = `=================================\n`;
    txt += `   ${storeName} - ক্যাশ মেমো / চালান\n`;
    txt += `=================================\n`;
    txt += `অর্ডার নং: #${orderNumber}\n`;
    txt += `তারিখ: ${createdDate.toLocaleDateString('bn-BD')} (${createdDate.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })})\n`;
    txt += `কাস্টমার: ${customerName}\n`;
    txt += `মোবাইল: ${customerPhone}\n`;
    if (customerAddress) txt += `ঠিকানা: ${customerAddress}\n`;
    if (courierName) txt += `কুরিয়ার: ${courierName} ${courierTrackingCode ? `(ট্র্যাকিং: ${courierTrackingCode})` : ''}\n`;
    txt += `---------------------------------\n`;
    txt += `পণ্য বিবরণী (মেমো হিসাব):\n`;
    items.forEach((it, idx) => {
      const q = Number(it.quantity) || 1;
      const u = it.unit || 'পিস';
      const p = Number(it.unitPrice || it.price || 0);
      const sub = Number(it.subtotal || p * q);
      txt += `${idx + 1}. ${it.name} ${q} ${u} (${p} × ${q} = ৳${sub})\n`;
    });
    txt += `---------------------------------\n`;
    txt += `পণ্যের দাম: ৳${totalProductsAmount.toLocaleString('en-US')}\n`;
    if (deliveryCharge > 0) txt += `ডেলিভারি চার্জ: ৳${deliveryCharge.toLocaleString('en-US')}\n`;
    if (discountAmount > 0) txt += `ডিসকাউন্ট: -৳${discountAmount.toLocaleString('en-US')}\n`;
    txt += `সর্বমোট বিল: ৳${grandTotal.toLocaleString('en-US')}\n`;
    txt += `পেমেন্ট: ${paymentMethod} (${paymentStatus === 'paid' ? 'পরিশোধিত' : 'বকেয়া/ক্যাশ অন ডেলিভারি'})\n`;
    if (paymentTrxId) txt += `TrxID: ${paymentTrxId}\n`;
    txt += `=================================\n`;
    txt += `আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ!\n`;
    return txt;
  };

  const handleCopyMemo = async () => {
    try {
      await navigator.clipboard.writeText(getMemoText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    const intlPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(getMemoText())}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Container with print styles */}
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">ক্যাশ মেমো / চালান রসিদ</h3>
              <p className="text-[11px] text-slate-400">অর্ডার #{orderNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  format === 'a4' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 পেপার
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  format === 'thermal' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                POS থার্মাল (80mm)
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div
            ref={printRef}
            className={`mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 print:shadow-none print:border-none print:p-0 ${
              format === 'thermal' ? 'max-w-sm text-xs font-mono' : 'max-w-2xl'
            }`}
          >
            {/* INVOICE HEADER */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-7 h-7 rounded-lg bg-teal-800 text-white flex items-center justify-center font-black text-sm">
                      <Store className="w-4 h-4" />
                    </span>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      {storeName}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    অফিসিয়াল সেন্ট্রাল কমার্স প্লাটফর্ম • হেল্পলাইন: {storePhone}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    www.twinghisabi.com
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-black text-xs uppercase tracking-wider mb-1">
                    ক্যাশ মেমো / চালান
                  </div>
                  <div className="text-xs font-mono font-bold text-teal-900">
                    #{orderNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{createdDate.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER & DELIVERY INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  ক্রেতা / ডেলিভারি প্রাপক:
                </span>
                <div className="font-black text-slate-900 text-sm">{customerName}</div>
                <div className="font-mono font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-teal-700" />
                  <span>{customerPhone}</span>
                </div>
                {customerAddress && (
                  <div className="text-slate-600 flex items-start gap-1 mt-1 text-[11px] leading-relaxed">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{customerAddress}</span>
                  </div>
                )}
              </div>

              <div className="sm:border-l sm:border-slate-200 sm:pl-3 space-y-1.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  পেমেন্ট ও কুরিয়ার ট্র্যাকিং:
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট অবস্থা:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {paymentStatus === 'paid' ? '✅ পরিশোধিত' : '⏳ বকেয়া / COD'}
                  </span>
                </div>
                {paymentTrxId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">TrxID:</span>
                    <span className="font-mono font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded">
                      {paymentTrxId}
                    </span>
                  </div>
                )}
                {courierName && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-teal-700" />
                      <span>কুরিয়ার:</span>
                    </span>
                    <span className="font-bold text-slate-800">
                      {courierName} {courierTrackingCode && `(#${courierTrackingCode})`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* PRODUCT MEMO TABLE */}
            <div className="mb-5 overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-800 font-black">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                    <th className="py-2.5 px-3 text-center">একক দর</th>
                    <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                    <th className="py-2.5 px-3 text-right">মেমো হিসাব (দর × পরিমাণ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const qty = Number(it.quantity) || 1;
                    const unit = it.unit || 'পিস';
                    const price = Number(it.unitPrice || it.price || 0);
                    const subtotal = Number(it.subtotal || price * qty);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-black text-slate-900 text-xs">{it.name}</div>
                          {it.vendorShopName && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              দোকান: {it.vendorShopName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          ৳{price.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {qty} {unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-mono font-black text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                            {price} × {qty} = ৳{subtotal.toLocaleString('en-US')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BILL SUMMARY & QR CODE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end mb-6">
              {/* QR Verification */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={qrUrl}
                  alt="Order QR Code"
                  className="w-16 h-16 rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                />
                <div className="text-[11px] text-slate-600 leading-snug">
                  <div className="font-black text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ভেরিফায়েড ক্যাশ মেমো</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[10px]">
                    স্ক্যান করে রসিদের বিস্তারিত ও পেমেন্ট স্ট্যাটাস অনলাইনে যাচাই করুন।
                  </p>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>পণ্য উপমোট (Subtotal):</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{totalProductsAmount.toLocaleString('en-US')}
                  </span>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>ডেলিভারি চার্জ:</span>
                    <span className="font-mono font-bold text-slate-800">
                      + ৳{deliveryCharge.toLocaleString('en-US')}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>বিশেষ ছাড়:</span>
                    <span className="font-mono font-bold">
                      - ৳{discountAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300">
                  <span className="font-black text-slate-900 text-sm">সর্বমোট বিল:</span>
                  <span className="font-mono font-black text-teal-950 text-base bg-teal-100/80 px-2.5 py-0.5 rounded-lg border border-teal-300">
                    ৳{grandTotal.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            </div>

            {/* SIGNATURE & FOOTER */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
              <div>
                <div className="border-t border-dashed border-slate-400 w-36 mx-auto mb-1"></div>
                <span className="font-bold">কাস্টমার স্বাক্ষর</span>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 w-36 mx-auto mb-1"></div>
                <span className="font-bold">অনুমোদিত স্বাক্ষর</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-6">
              সফটওয়্যার তৈরি করেছে TwingHisabi Commerce Suite • কোনো সমস্যা হলে হেল্পলাইনে যোগাযোগ করুন
            </div>
          </div>
        </div>

        {/* Bottom Actions Toolbar (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMemo}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'মেমো কপি হয়েছে!' : 'মেমো টেক্সট কপি'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>হোয়াটসঅ্যাপে পাঠান</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট চালান / মেমো</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
