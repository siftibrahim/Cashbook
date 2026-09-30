import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Copy,
  Check,
  Send,
  MessageCircle,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface MarketplaceSmsModalProps {
  order: any;
  subOrders?: any[];
  onClose: () => void;
  storeName?: string;
}

export const MarketplaceSmsModal: React.FC<MarketplaceSmsModalProps> = ({
  order,
  subOrders = [],
  onClose,
  storeName = 'সেন্ট্রাল মার্কেটপ্লেস',
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'confirmed' | 'shipped' | 'delivered' | 'memo'>('confirmed');

  const orderNumber = order.orderNumber || order.order_number || `ORD-${order.id?.slice(0, 8)}`;
  const customerName = order.customerName || order.customer_name || 'গ্রাহক';
  const customerPhone = order.customerPhone || order.customer_phone || '';
  const courierName = order.courierName || order.courier_name || 'কুরিয়ার সার্ভিস';
  const courierTrackingCode = order.courierTrackingCode || order.courier_tracking_code || '';
  const grandTotal = Number(order.grandTotal ?? order.totalAmount ?? 0);

  // Extract items for memo
  const rawItems: any[] = [];
  if (Array.isArray(order.items) && order.items.length > 0) {
    rawItems.push(...order.items);
  } else if (subOrders && subOrders.length > 0) {
    subOrders.forEach((sub: any) => {
      if (Array.isArray(sub.items)) rawItems.push(...sub.items);
    });
  }

  const generateSmsText = () => {
    switch (selectedTemplate) {
      case 'confirmed':
        return `TwingHisabi: প্রিয় ${customerName}, আপনার অর্ডার #${orderNumber} সফলভাবে নিশ্চিত ও অনুমোদিত হয়েছে। মোট বিল: ৳${grandTotal.toLocaleString('en-US')}। শীঘ্রই পণ্য প্রস্তুত করে কুরিয়ারে পাঠানো হবে। ধন্যবাদ!`;

      case 'shipped':
        return `TwingHisabi: প্রিয় ${customerName}, আপনার অর্ডার #${orderNumber} ডেলিভারির উদ্দেশ্যে পাঠানো হয়েছে। মাধ্যম: ${courierName}${courierTrackingCode ? ` (ট্র্যাকিং কোড: ${courierTrackingCode})` : ''}। দ্রুতই আপনার ঠিকানায় পৌঁছাবে।`;

      case 'delivered':
        return `TwingHisabi: প্রিয় ${customerName}, আপনার অর্ডার #${orderNumber} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। পণ্য গ্রহণের জন্য ধন্যবাদ। শুভ কেনাকাটা!`;

      case 'memo': {
        let msg = `TwingHisabi মেমো (${storeName}):\nঅর্ডার #${orderNumber}\nগ্রাহক: ${customerName}\nপণ্য:\n`;
        rawItems.slice(0, 5).forEach((it) => {
          const q = Number(it.quantity) || 1;
          const u = it.unit || 'পিস';
          const p = Number(it.unitPrice || it.price || 0);
          const sub = Number(it.subtotal || p * q);
          msg += `• ${it.name} ${q}${u} (${p}×${q}=${sub}৳)\n`;
        });
        msg += `সর্বমোট বিল: ৳${grandTotal.toLocaleString('en-US')}\nহেল্পলাইন: 01306908115`;
        return msg;
      }

      default:
        return '';
    }
  };

  const smsText = generateSmsText();

  const handleCopy = () => {
    navigator.clipboard.writeText(smsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMobileSms = () => {
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    window.open(`sms:${cleanPhone}?body=${encodeURIComponent(smsText)}`, '_blank');
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/[^\d]/g, '');
    const intlPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(smsText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">এসএমএস ও হোয়াটসঅ্যাপ নোটিফিকেশন</h3>
              <p className="text-[11px] text-teal-200">অর্ডার #{orderNumber}</p>
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Customer info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">প্রাপক কাস্টমার:</span>
              <span className="font-black text-slate-900 text-sm">{customerName}</span>
              <span className="font-mono text-teal-900 font-bold block">{customerPhone}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">সর্বমোট বিল:</span>
              <span className="font-mono font-black text-slate-900 text-sm">৳{grandTotal.toLocaleString('en-US')}</span>
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">
              এসএমএস টেমপ্লেট নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('confirmed')}
                className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                  selectedTemplate === 'confirmed'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ✅ ১. অর্ডার নিশ্চিতকরণ
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('shipped')}
                className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                  selectedTemplate === 'shipped'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🚚 ২. কুরিয়ার ট্র্যাকিং
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('delivered')}
                className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                  selectedTemplate === 'delivered'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🎉 ৩. ডেলিভারি সম্পন্ন
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('memo')}
                className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                  selectedTemplate === 'memo'
                    ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🧾 ৪. পণ্যের মেমো সারাংশ
              </button>
            </div>
          </div>

          {/* Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                এসএমএস প্রিভিউ (বার্তা):
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {smsText.length} অক্ষর
              </span>
            </div>
            <div className="p-3.5 bg-slate-900 text-emerald-300 font-mono rounded-2xl border border-slate-800 text-xs leading-relaxed whitespace-pre-wrap select-all">
              {smsText}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'কপি হয়েছে!' : 'মেসেজ কপি করুন'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>হোয়াটসঅ্যাপে পাঠান</span>
              </button>

              <button
                type="button"
                onClick={handleSendMobileSms}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>মোবাইল SMS অ্যাপ খুলুন</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
