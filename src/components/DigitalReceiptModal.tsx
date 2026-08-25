import React, { useRef } from 'react';
import { PaymentRecord } from '../types/adminTypes';
import {
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Download,
  Building2,
  Smartphone,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatMoney } from '../utils/storage';

interface DigitalReceiptModalProps {
  isOpen: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  isOpen,
  payment,
  onClose,
  onShowToast,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summary = `🧾 ডিজিটাল পেমেন্ট রসিদ
রসিদ নং: ${payment.id}
দোকানের নাম: ${payment.shopName}
গ্রাহক: ${payment.userName} (${payment.userPhone || payment.senderPhone || payment.senderNumber})
প্যাকেজ: ${payment.planName} (${payment.durationDays} দিন)
পরিশোধিত টাকা: ৳${formatMoney(payment.amount)}
মেথড: ${payment.paymentMethod.toUpperCase()}
TrxID: ${payment.trxId}
স্ট্যাটাস: ${payment.status === 'approved' ? 'অনুমোদিত ও সক্রিয়' : payment.status === 'pending' ? 'যাচাই অপেক্ষমাণ' : 'বাতিল'}
তারিখ: ${new Date(payment.createdAt).toLocaleDateString('bn-BD')}`;

    navigator.clipboard.writeText(summary);
    if (onShowToast) {
      onShowToast('📋 রসিদ সারসংক্ষেপ কপি করা হয়েছে!');
    }
  };

  const isApproved = payment.status === 'approved';
  const isPending = payment.status === 'pending';
  const isRefunded = payment.status === 'refunded' || payment.refundStatus === 'refunded';
  const isRejected = payment.status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              অফিসিয়াল ডিজিটাল রসিদ ও মেমো
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition text-xs"
          >
            ✕
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6" ref={receiptRef}>
          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-5 sm:p-6 bg-slate-50/50 relative">
            {/* Header / Watermark Stamp */}
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-800 text-white text-[11px] font-black mb-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>TWING CLOUD STORE</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                টুইং হিসাব - ডিজিটাল সাবস্ক্রিপশন মেমো
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                অফিসিয়াল পেমেন্ট ভেরিফিকেশন ও এক্টিভেশন ভাউচার
              </p>
            </div>

            {/* Official Digital Seal Stamp */}
            <div className="my-4 flex items-center justify-center">
              {isApproved && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-100 text-emerald-800 border-2 border-emerald-500/50 font-black text-xs shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>অনুমোদিত ও সক্রিয় (VERIFIED & ACTIVE)</span>
                </div>
              )}
              {isPending && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-400 font-black text-xs shadow-xs">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>পেন্ডিং (অ্যাডমিন ভেরিফিকেশন চলছে)</span>
                </div>
              )}
              {isRefunded && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-purple-100 text-purple-800 border-2 border-purple-400 font-black text-xs shadow-xs">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <span>টাকা রিফান্ড করা হয়েছে (REFUNDED)</span>
                </div>
              )}
              {isRejected && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-rose-100 text-rose-800 border-2 border-rose-400 font-black text-xs shadow-xs">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>পেমেন্ট বাতিল (REJECTED)</span>
                </div>
              )}
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">ভাউচার নম্বর</span>
                <span className="font-mono font-bold text-slate-800">{payment.id}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">তারিখ ও সময়</span>
                <span className="font-semibold text-slate-700">
                  {new Date(payment.createdAt).toLocaleDateString('bn-BD')} {new Date(payment.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>

            {/* Customer & Shop Details */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">দোকানের নাম:</span>
                <span className="font-bold text-slate-900">{payment.shopName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">গ্রাহক নাম:</span>
                <span className="font-semibold text-slate-800">{payment.userName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">গ্রাহক ফোন / আইডি:</span>
                <span className="font-mono font-bold text-slate-700">{payment.userPhone || payment.senderPhone || payment.senderNumber}</span>
              </div>
            </div>

            {/* Transaction Particulars */}
            <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100 space-y-2.5 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-teal-900 font-bold">সাবস্ক্রিপশন প্যাকেজ:</span>
                <span className="font-black text-teal-950">{payment.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-800 font-semibold">মেয়াদ বৃদ্ধি:</span>
                <span className="font-bold text-teal-900">+{payment.durationDays} দিন</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-800 font-semibold">পেমেন্ট চ্যানেল:</span>
                <span className="font-black text-slate-800 uppercase">{payment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-800 font-semibold">প্রেরক অ্যাকাউন্ট / ফোন:</span>
                <span className="font-mono font-bold text-slate-800">{payment.senderPhone || payment.senderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-800 font-semibold">Transaction ID (TrxID):</span>
                <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                  {payment.trxId}
                </span>
              </div>

              {payment.bankDetails?.bankName && (
                <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-teal-200/60">
                  <span>ব্যাংক তথ্য:</span>
                  <span>{payment.bankDetails.bankName} ({payment.bankDetails.accountName || ''})</span>
                </div>
              )}
            </div>

            {/* Total Paid Block */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-md">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">সর্বমোট পরিশোধিত টাকা:</span>
                <span className="text-xs text-emerald-400 font-bold">পরিশোধের মাধ্যম: {payment.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-emerald-400">
                  ৳{formatMoney(payment.amount)}
                </div>
                <span className="text-[10px] text-slate-400">ভ্যাট ও ট্যাক্স সমন্বিত</span>
              </div>
            </div>

            {/* Rejection or Refund Note if any */}
            {payment.rejectedReason && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                <span className="font-bold">বাতিল কারণ: </span>
                {payment.rejectedReason}
              </div>
            )}
            {payment.refundReason && (
              <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800">
                <span className="font-bold">রিফান্ড কারণ: </span>
                {payment.refundReason} {payment.refundAmount ? `(৳${formatMoney(payment.refundAmount)})` : ''}
              </div>
            )}

            {/* Security Footnote */}
            <div className="mt-4 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5">
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-bold text-slate-600">টুইং হিসাব ক্লাউড সিকিউরড সিস্টেম ভাউচার</span>
              </div>
              <p>এটি একটি কম্পিউটার প্রস্তুতকৃত ডিজিটাল রসিদ। কোনো স্বাক্ষরের প্রয়োজন নেই।</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>কপি করুন</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / সেভ PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-black cursor-pointer transition shadow-md"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
