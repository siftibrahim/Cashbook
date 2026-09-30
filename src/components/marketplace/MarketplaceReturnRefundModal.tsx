import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  HelpCircle,
} from 'lucide-react';

interface MarketplaceReturnRefundModalProps {
  order: any;
  onClose: () => void;
  onProcessRefund: (data: {
    returnReason: string;
    refundAmount: number;
    refundMethod: string;
    refundTrxId: string;
    note: string;
  }) => Promise<void>;
}

export const MarketplaceReturnRefundModal: React.FC<MarketplaceReturnRefundModalProps> = ({
  order,
  onClose,
  onProcessRefund,
}) => {
  const grandTotal = Number(order.grandTotal ?? order.totalAmount ?? 0);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState<string>(String(grandTotal));
  const [returnReason, setReturnReason] = useState<string>('পণ্য নষ্ট বা ক্ষতিগ্রস্ত');
  const [refundMethod, setRefundMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'cash'>('bkash');
  const [refundTrxId, setRefundTrxId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const reasons = [
    'পণ্য নষ্ট বা ক্ষতিগ্রস্ত (Damaged Product)',
    'ভুল পণ্য পাঠানো হয়েছে (Wrong Item Sent)',
    'কাস্টমার পার্সেল গ্রহণ করেনি / আনডেলিভার্ড (Customer Refused/Undelivered)',
    'পণ্যের গুণগত মান ঠিক নেই (Quality Issue)',
    'বিলম্বিত ডেলিভারি ও কাস্টমার বাতিল (Late Delivery Cancellation)',
    'অন্যান্য কারণ (Other)',
  ];

  const handleTypeChange = (type: 'full' | 'partial') => {
    setRefundType(type);
    if (type === 'full') {
      setRefundAmount(String(grandTotal));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(refundAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert('সঠিক রিফান্ড টাকার পরিমাণ লিখুন');
      return;
    }

    setIsSubmitting(true);
    try {
      await onProcessRefund({
        returnReason: returnReason.trim(),
        refundAmount: numAmt,
        refundMethod,
        refundTrxId: refundTrxId.trim(),
        note: note.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">অর্ডার রিটার্ন ও রিফান্ড প্রসেস</h3>
              <p className="text-[11px] text-rose-200">অর্ডার #{order.orderNumber || order.id}</p>
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
          
          {/* Warning banner */}
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">সতর্কতা:</span> রিটার্ন বা রিফান্ড সম্পন্ন করলে অর্ডারের স্ট্যাটাস "রিটার্নড" হিসেবে নথিভুক্ত হবে এবং ভেন্ডরের ডেলিভারি সম্পন্ন প্রাপ্য ব্যালেন্স থেকে এই টাকা স্বয়ংক্রিয়ভাবে সমন্বয় (বিয়োগ) হবে।
            </div>
          </div>

          {/* Customer & Order Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">কাস্টমার তথ্য:</span>
              <span className="font-black text-slate-900">{order.customerName || 'গ্রাহক'}</span>
              <span className="font-mono text-slate-600 block text-[11px]">{order.customerPhone}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">অর্ডার সর্বমোট বিল:</span>
              <span className="font-mono font-black text-slate-900 text-sm">৳{grandTotal.toLocaleString('en-US')}</span>
              <span className="text-[10px] text-slate-500 block">
                পেমেন্ট: {order.paymentStatus === 'paid' ? 'পরিশোধিত' : 'বকেয়া/ক্যাশ'}
              </span>
            </div>
          </div>

          {/* Refund Type Selection */}
          <div>
            <label className="font-bold text-slate-800 block mb-1.5">
              রিফান্ডের ধরন নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('full')}
                className={`p-2.5 rounded-xl border text-center transition font-bold cursor-pointer ${
                  refundType === 'full'
                    ? 'bg-rose-50 border-rose-600 text-rose-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                পূর্ণ রিফান্ড (৳{grandTotal.toLocaleString('en-US')})
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('partial')}
                className={`p-2.5 rounded-xl border text-center transition font-bold cursor-pointer ${
                  refundType === 'partial'
                    ? 'bg-rose-50 border-rose-600 text-rose-950 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                আংশিক রিফান্ড (Partial)
              </button>
            </div>
          </div>

          {/* Refund Amount Input */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              রিফান্ড টাকার পরিমাণ (৳):
            </label>
            <div className="relative">
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min="1"
                max={grandTotal}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                placeholder="0"
                required
              />
              <span className="font-bold text-slate-400 absolute left-3 top-2.5 text-sm">৳</span>
            </div>
          </div>

          {/* Return Reason Selection */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              রিটার্নের কারণ:
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Refund Payment Method & TrxID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                রিফান্ড পরিশোধের মাধ্যম:
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="cash">ক্যাশ / হাতে হাতে</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                রিফান্ড TrxID (যদি থাকে):
              </label>
              <input
                type="text"
                value={refundTrxId}
                onChange={(e) => setRefundTrxId(e.target.value)}
                placeholder="যেমন: 9JH76T..."
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              অ্যাডমিন নোট / বিবরণ (ঐচ্ছিক):
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="রিটার্ন ও রিফান্ডের বিস্তারিত তথ্য..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'প্রসেসিং...' : 'রিটার্ন ও রিফান্ড চূড়ান্ত করুন'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
