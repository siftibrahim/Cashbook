import React from 'react';
import { X, Printer, Check, Copy, ExternalLink, Package, MapPin, Phone, User, Store } from 'lucide-react';
import { formatMoney } from '../../utils/storage';

export interface ShippingLabelData {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  provider: string;
  consignmentId: string;
  trackingCode: string;
  trackingUrl?: string;
  bookedAt?: number;
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  note?: string;
}

interface ShippingLabelModalProps {
  isOpen: boolean;
  labelData: ShippingLabelData | null;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({
  isOpen,
  labelData,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !labelData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTracking = () => {
    if (!labelData.trackingCode) return;
    navigator.clipboard.writeText(labelData.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = labelData.bookedAt
    ? new Date(labelData.bookedAt).toLocaleString('bn-BD', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleDateString('bn-BD');

  return (
    <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm">পার্সেল শিপিং লেবেল / স্টিকার</h3>
              <p className="text-[10px] text-slate-400">{labelData.provider} • #{labelData.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Label Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="courier-shipping-slip"
            className="w-full max-w-[420px] bg-white p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm text-slate-900 font-sans print:border-none print:shadow-none print:p-2"
          >
            {/* Header: Provider & Consignment Barcode */}
            <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 bg-slate-900 text-white font-black text-[11px] rounded tracking-wide uppercase inline-block">
                  {labelData.provider}
                </span>
                <h2 className="text-lg font-black text-slate-950 mt-1">কুরিয়ার ডেলিভারি স্লিপ</h2>
                <p className="text-[10px] text-slate-500 font-mono">তারিখ: {formattedDate}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">অর্ডার নং</span>
                <span className="text-sm font-black font-mono text-teal-800">#{labelData.orderNumber}</span>
              </div>
            </div>

            {/* Barcode & Tracking Code Representation */}
            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">
                CONSIGNMENT / TRACKING CODE
              </span>
              <div className="my-1.5 flex justify-center items-center gap-0.5 h-9 overflow-hidden">
                {/* Visual Barcode Pattern */}
                {[2, 4, 1, 3, 5, 2, 4, 1, 3, 2, 5, 1, 3, 4, 2, 1, 4, 3, 2, 5, 3, 1, 4, 2, 3, 5, 2, 1, 4, 3, 2, 4].map(
                  (w, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${w}px` }}
                      className="h-full bg-slate-900 inline-block shrink-0"
                    />
                  )
                )}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-black text-base text-slate-900 tracking-wider">
                  {labelData.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTracking}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer no-print"
                  title="কোড কপি করুন"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* COD Amount Banner */}
            <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-700 block">
                  ক্যাশ অন ডেলিভারি (COD কালেকশন)
                </span>
                <span className="text-xl font-black text-rose-800">
                  ৳ {formatMoney(labelData.codAmount)}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-xs rounded-lg uppercase">
                {labelData.codAmount > 0 ? 'COD কাস্টমার পে' : 'PAID / পেইড'}
              </span>
            </div>

            {/* Recipient Details (Customer) */}
            <div className="mb-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                প্রাপক (TO / RECIPIENT):
              </span>
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-black text-sm text-slate-950">{labelData.recipientName}</h4>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-slate-700 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{labelData.recipientPhone}</span>
                  </div>
                  <div className="flex items-start gap-1 text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>{labelData.recipientAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Details (Store / Merchant) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                প্রেরক (FROM / SENDER):
              </span>
              <div className="flex items-start gap-2">
                <Store className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900">{labelData.storeName || 'Twing Hisabi Merchant'}</h5>
                  {labelData.storePhone && (
                    <p className="font-mono text-[11px] text-slate-600 mt-0.5">ফোন: {labelData.storePhone}</p>
                  )}
                  {labelData.storeAddress && (
                    <p className="text-[10px] text-slate-500 mt-0.5">{labelData.storeAddress}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Note if any */}
            {labelData.note && (
              <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900">
                <strong>বিশেষ নির্দেশ:</strong> {labelData.note}
              </div>
            )}

            {/* Footer QR / Online Tracking Link */}
            {labelData.trackingUrl && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate max-w-[240px]">ট্র্যাক লিংক: {labelData.trackingUrl}</span>
                <a
                  href={labelData.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 font-bold flex items-center gap-0.5 hover:underline no-print"
                >
                  <span>যাচাই</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer info & close */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs no-print">
          <span className="text-[11px] text-slate-500">
            লেবেলটি প্রিন্ট করে পার্সেলের প্যাকেটের উপর আঠা দিয়ে লাগিয়ে দিন।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
