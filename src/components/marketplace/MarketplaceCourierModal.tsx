import React, { useState, useEffect } from 'react';
import {
  Truck,
  X,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Send,
  User,
  Phone,
  Barcode,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { userSmsApi } from '../../services/apiService';

interface MarketplaceCourierModalProps {
  order: any;
  smsBalance?: number;
  onClose: () => void;
  onSaveCourier: (data: {
    courierName: string;
    courierTrackingCode: string;
    deliveryManName?: string;
    deliveryManPhone?: string;
    autoShip?: boolean;
  }) => Promise<void>;
}

export const MarketplaceCourierModal: React.FC<MarketplaceCourierModalProps> = ({
  order,
  smsBalance,
  onClose,
  onSaveCourier,
}) => {
  const [courierName, setCourierName] = useState<string>(order.courierName || 'Steadfast Courier');
  const [courierTrackingCode, setCourierTrackingCode] = useState<string>(order.courierTrackingCode || '');
  const [deliveryManName, setDeliveryManName] = useState<string>(order.deliveryManName || '');
  const [deliveryManPhone, setDeliveryManPhone] = useState<string>(order.deliveryManPhone || '');
  const [autoShip, setAutoShip] = useState<boolean>(order.overallStatus !== 'shipped' && order.overallStatus !== 'delivered');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [currentSmsBal, setCurrentSmsBal] = useState<number>(smsBalance !== undefined ? smsBalance : 0);

  useEffect(() => {
    if (smsBalance === undefined) {
      userSmsApi.getBalance().then((res) => {
        setCurrentSmsBal(res?.balance ?? 0);
      }).catch(() => {});
    } else {
      setCurrentSmsBal(smsBalance);
    }
  }, [smsBalance]);

  const handleOpenRecharge = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_open_sms_recharge', { detail: { tab: 'packages' } }));
    }
  };

  const couriers = [
    { name: 'Steadfast Courier', label: 'স্টিডফাস্ট কুরিয়ার (Steadfast)', trackUrl: 'https://steadfast.com.bd/t/' },
    { name: 'Pathao Courier', label: 'পাঠাও কুরিয়ার (Pathao)', trackUrl: 'https://pathao.com/courier-tracking/' },
    { name: 'RedX Delivery', label: 'রেডএক্স (RedX)', trackUrl: 'https://redx.com.bd/track/' },
    { name: 'Paperfly', label: 'পেপারফ্লাই (Paperfly)', trackUrl: 'https://paperfly.com.bd/tracking' },
    { name: 'eCourier', label: 'ই-কুরিয়ার (eCourier)', trackUrl: 'https://ecourier.com.bd/track' },
    { name: 'Sundarban Courier', label: 'সুন্দরবন কুরিয়ার', trackUrl: '' },
    { name: 'Own Rider', label: 'দোকানের নিজস্ব রাইডার / ডেলিভারি বয়', trackUrl: '' },
  ];

  const currentCourierObj = couriers.find(c => c.name === courierName);
  const trackUrl = currentCourierObj?.trackUrl && courierTrackingCode
    ? `${currentCourierObj.trackUrl}${courierTrackingCode}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim()) return;

    if (currentSmsBal < 1) {
      handleOpenRecharge();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveCourier({
        courierName: courierName.trim(),
        courierTrackingCode: courierTrackingCode.trim(),
        deliveryManName: deliveryManName.trim() || undefined,
        deliveryManPhone: deliveryManPhone.trim() || undefined,
        autoShip,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTracking = () => {
    if (!courierTrackingCode) return;
    navigator.clipboard.writeText(courierTrackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm">কুরিয়ার ও ট্র্যাকিং ব্যবস্থাপনা</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  currentSmsBal > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                }`}>
                  SMS: {currentSmsBal} টি
                </span>
              </div>
              <p className="text-[11px] text-teal-200">অর্ডার #{order.orderNumber || order.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">

          {/* Insufficient SMS Balance Warning Banner */}
          {currentSmsBal < 1 && (
            <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-amber-950 text-xs sm:text-sm">
                    ⚠️ এসএমএস ব্যালেন্স নেই (০ টি)!
                  </h4>
                  <p className="text-[11px] text-amber-900 mt-1 leading-relaxed font-medium">
                    গ্রাহককে কুরিয়ার ট্র্যাকিং কোড ও ডেলিভারি আপডেট এসএমএস পাঠাতে অন্তত ১টি এসএমএস ব্যালেন্স থাকা বাধ্যতামূলক। ব্যালেন্স শূন্য অবস্থায় কোনো ট্র্যাকিং আপডেট সেভ করা যাবে না।
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenRecharge}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>মেসেজ রিচার্জ করুন</span>
                    </button>
                    <span className="text-[10px] text-amber-700 font-bold">
                      (৫০টি SMS মাত্র ২৫৳ থেকে শুরু)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Customer mini info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">প্রাপক কাস্টমার:</span>
              <span className="font-black text-slate-900 text-xs">{order.customerName || 'গ্রাহক'}</span>
              <span className="font-mono text-slate-500 block text-[11px]">{order.customerPhone}</span>
            </div>
            {order.customerAddress && (
              <div className="text-right max-w-[180px] text-[10px] text-slate-500 truncate" title={order.customerAddress}>
                📍 {order.customerAddress}
              </div>
            )}
          </div>

          {/* Courier Selection */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">
              কুরিয়ার সার্ভিস নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {couriers.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCourierName(c.name)}
                  className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                    courierName === c.name
                      ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{c.label}</span>
                    {courierName === c.name && <Check className="w-3.5 h-3.5 text-teal-700" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tracking ID Input */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              কুরিয়ার ট্র্যাকিং কোড (Consignment / Tracking ID):
            </label>
            <div className="relative">
              <input
                type="text"
                value={courierTrackingCode}
                onChange={(e) => setCourierTrackingCode(e.target.value)}
                placeholder="যেমন: STDF-890123 বা PT-8910"
                className="w-full pl-8 pr-20 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
              />
              <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              {courierTrackingCode && (
                <button
                  type="button"
                  onClick={handleCopyTracking}
                  className="absolute right-2 top-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              কুরিয়ারের বুকিং স্লিপ বা রসিদে থাকা কোডটি এখানে লিখুন। কাস্টমার এই কোড দিয়ে ট্র্যাক করতে পারবেন।
            </p>
          </div>

          {/* Live tracking link preview */}
          {trackUrl && (
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
              <div className="text-[11px] text-teal-900 font-medium truncate max-w-[260px]">
                লাইভ লিংক: <span className="font-mono text-teal-700">{trackUrl}</span>
              </div>
              <a
                href={trackUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 bg-teal-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-teal-900 shrink-0"
              >
                <span>ট্র্যাক দেখুন</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Rider / Delivery Person (Optional) */}
          {courierName === 'Own Rider' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 block text-xs">
                নিজস্ব ডেলিভারি বয়ের তথ্য (ঐচ্ছিক):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">রাইডারের নাম</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={deliveryManName}
                      onChange={(e) => setDeliveryManName(e.target.value)}
                      placeholder="যেমন: মোঃ সুমন"
                      className="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">রাইডারের মোবাইল</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={deliveryManPhone}
                      onChange={(e) => setDeliveryManPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auto status update checkbox */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoShip}
                onChange={(e) => setAutoShip(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-bold text-slate-900 text-xs">
                অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে "ডেলিভারিতে চলমান (Shipped)" করুন
              </span>
            </label>
            <p className="text-[10px] text-slate-500 pl-6 mt-0.5">
              কুরিয়ারে পার্সেল হ্যান্ডওভার করার পর এটি চালু রাখলে কাস্টমার জানতে পারবেন পণ্য পাঠানো হয়েছে।
            </p>
          </div>

          {/* Submit buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              বাতিল
            </button>
            {currentSmsBal < 1 ? (
              <button
                type="button"
                onClick={handleOpenRecharge}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>মেসেজ রিচার্জ করুন</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'কুরিয়ার তথ্য সংরক্ষণ করুন'}</span>
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
