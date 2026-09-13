import React, { useState } from 'react';
import { Search, PackageCheck, Truck, CheckCircle2, Clock, MapPin, Phone, MessageCircle } from 'lucide-react';
import { OnlineOrder } from '../../types';
import { formatMoney } from '../../utils/storage';

interface StorefrontOrderTrackerProps {
  orders: OnlineOrder[];
  whatsappPhone?: string;
}

export const StorefrontOrderTracker: React.FC<StorefrontOrderTrackerProps> = ({
  orders,
  whatsappPhone,
}) => {
  const [searchKey, setSearchKey] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (!searchKey.trim()) return true;
    const q = searchKey.trim().toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
  });

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'confirmed':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  const steps = [
    { step: 1, label: 'অর্ডার গৃহীত' },
    { step: 2, label: 'নিশ্চিত ও প্যাকড' },
    { step: 3, label: 'ডেলিভারির পথে' },
    { step: 4, label: 'ডেলিভার্ড' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg sm:text-xl font-black text-slate-900">অর্ডার ট্র্যাকিং ও হিস্ট্রি</h2>
        <p className="text-xs text-slate-500">আপনার মোবাইল নম্বর বা অর্ডার নম্বর দিয়ে ট্র্যাক করুন</p>
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
      <div className="space-y-3 pt-1">
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

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">অর্ডার ট্র্যাকিং কোড</div>
                    <div className="font-black text-sm text-[#004D40]">{order.orderNumber}</div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                      <Clock className="w-3 h-3 text-teal-600" />
                      <span>
                        {order.orderStatus === 'pending'
                          ? 'প্রসেসিং হচ্ছে'
                          : order.orderStatus === 'confirmed'
                          ? 'কনফার্ম হয়েছে'
                          : order.orderStatus === 'shipped'
                          ? 'ডেলিভারিতে আছে'
                          : order.orderStatus === 'delivered'
                          ? 'সফল ডেলিভারি'
                          : 'বাতিল'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Progress Steps Timeline */}
                <div className="py-1">
                  <div className="grid grid-cols-4 relative gap-1 text-center">
                    {steps.map((st) => {
                      const isPassed = currentStep >= st.step;
                      return (
                        <div key={st.step} className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all mb-1 ${
                              isPassed
                                ? 'bg-[#004D40] text-white'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.step}
                          </div>
                          <span
                            className={`text-[9px] sm:text-[10px] leading-tight ${
                              isPassed ? 'text-slate-800 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-xs border border-slate-100">
                  <div className="font-bold text-slate-700 mb-1">অর্ডারকৃত পণ্যসমূহ:</div>
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span className="truncate pr-2">
                        {it.productName} x {it.quantity}
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
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 font-bold flex items-center gap-1 shrink-0 transition"
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
