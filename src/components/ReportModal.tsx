import React, { useState } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { formatMoney, formatBanglaDate, getTodayDateString } from '../utils/storage';
import { executeSafePrint, downloadReceiptPDF, downloadReceiptImage } from '../utils/printHelper';
import {
  Printer,
  Copy,
  X,
  Store,
  MessageCircle,
  Check,
  Loader2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { BangladeshClock } from './BangladeshClock';

interface ReportModalProps {
  isOpen: boolean;
  customer: Customer | null;
  transactions: Transaction[];
  store: StoreProfile;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  customer,
  transactions,
  store,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isImgDownloading, setIsImgDownloading] = useState(false);

  if (!isOpen || !customer) return null;

  const today = getTodayDateString();

  // Safe Non-Crashing Print Handler
  const handlePrint = () => {
    setIsPrinting(true);
    onShowToast('🖨️ প্রিন্ট ডায়ালগ প্রস্তুত করা হচ্ছে...');

    setTimeout(() => {
      executeSafePrint(() => {
        setIsPrinting(false);
      });
    }, 150);
  };

  // Safe PDF Download
  const handleDownloadPDF = async () => {
    setIsPdfDownloading(true);
    const filename = `Statement_${customer.name.replace(/\s+/g, '_')}_${today}`;
    await downloadReceiptPDF('print-report-container', filename, onShowToast);
    setIsPdfDownloading(false);
  };

  // Safe Image Download
  const handleDownloadImage = async () => {
    setIsImgDownloading(true);
    const filename = `Statement_${customer.name.replace(/\s+/g, '_')}_${today}`;
    await downloadReceiptImage('print-report-container', filename, onShowToast);
    setIsImgDownloading(false);
  };

  // Send receipt via WhatsApp
  const handleSendWhatsApp = () => {
    let msg = `*${store.name} — কাস্টমার বাকি মেমো*\n`;
    msg += `👤 কাস্টমার: *${customer.name}*\n`;
    if (customer.phone) msg += `📞 মোবাইল: ${customer.phone}\n`;
    if (customer.address) msg += `📍 ঠিকানা: ${customer.address}\n`;
    msg += `📅 তারিখ: ${formatBanglaDate(today)}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*সর্বশেষ লেনদেনের হিসাব:*\n`;

    transactions.slice(0, 8).forEach((t) => {
      msg += `• ${formatBanglaDate(t.date)}: ${
        t.type === 'sale' ? '🔴 দিলাম ৳' : '🟢 পেলাম ৳'
      }${formatMoney(t.amount)} (${t.description || '-'})\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *বর্তমান মোট বকেয়া: ৳ ${formatMoney(customer.balance)}*\n\n`;
    msg += `দোকান: ${store.name} (প্রো: ${store.owner})\n`;
    msg += `📞 যোগাযোগ: ${store.phone}`;

    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = cleanPhone.startsWith('88')
      ? cleanPhone
      : cleanPhone.length === 11
      ? '88' + cleanPhone
      : cleanPhone;

    const waUrl = formattedPhone
      ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    try {
      window.open(waUrl, '_blank');
    } catch {
      window.location.href = waUrl;
    }
    onShowToast('হোয়াটসঅ্যাপে রসিদ পাঠানো হচ্ছে...');
  };

  const handleCopyText = () => {
    let text = `*${store.name} — হিসাব স্টেটমেন্ট*\n`;
    text += `কাস্টমার: ${customer.name} | মোবাইল: ${customer.phone || '-'}\n`;
    text += `তারিখ: ${formatBanglaDate(today)}\n`;
    text += `-----------------------------------------\n`;
    transactions.slice(0, 10).forEach((t) => {
      text += `${formatBanglaDate(t.date)}: ${t.type === 'sale' ? 'দিলাম ৳' : 'পেলাম ৳'}${formatMoney(
        t.amount
      )} (${t.description || '-'})\n`;
    });
    text += `-----------------------------------------\n`;
    text += `*বর্তমান মোট বকেয়া: ৳ ${formatMoney(customer.balance)}*\n`;
    text += `দোকান: ${store.name} | ফোন: ${store.phone}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onShowToast('হিসাব বিবরণী টেক্সট কপি হয়েছে!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('কপি করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Header - Screen Only */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-teal-300">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">হিসাব রসিদ ও স্টেটমেন্ট</h3>
              <p className="text-[11px] text-teal-100 font-mono">
                {customer.name} {customer.phone ? `(${customer.phone})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <BangladeshClock className="text-teal-200 text-xs bg-teal-900/40 px-2.5 py-1 rounded-lg border border-teal-700/50" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-teal-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area - Target for Print & Image Capture */}
        <div
          id="print-report-container"
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white space-y-4 text-slate-900"
        >
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-9 rounded-xl bg-[#004D40] text-white flex items-center justify-center font-black shadow-sm">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{store.name}</h2>
            <p className="text-xs text-slate-900 font-bold mt-0.5">
              প্রো: {store.owner} | 📞 {store.phone}
            </p>
            <p className="text-[11px] text-slate-700 font-medium">{store.address}</p>
            <span className="inline-block mt-2 px-3.5 py-0.5 rounded-full bg-slate-100 border border-slate-800 text-[11px] font-black text-slate-950 uppercase">
              কাস্টমার বাকি মেমো
            </span>
          </div>

          {/* Customer Meta */}
          <div className="flex justify-between text-xs bg-slate-100 p-3.5 rounded-2xl border border-slate-400">
            <div>
              <p>
                <span className="text-slate-700 font-bold">কাস্টমার:</span>{' '}
                <strong className="text-slate-950 font-black text-sm">{customer.name}</strong>
              </p>
              <p className="mt-0.5">
                <span className="text-slate-700 font-bold">মোবাইল:</span>{' '}
                <span className="font-mono font-bold text-slate-950">{customer.phone || 'দেওয়া হয়নি'}</span>
              </p>
              {customer.address && (
                <p className="mt-0.5">
                  <span className="text-slate-700 font-bold">ঠিকানা:</span>{' '}
                  <span className="font-medium text-slate-900">{customer.address}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p>
                <span className="text-slate-700 font-bold">তারিখ:</span>{' '}
                <span className="font-black text-slate-950">{formatBanglaDate(today)}</span>
              </p>
              <div className="mt-1">
                <span className="text-slate-700 font-bold text-[11px]">বর্তমান মোট বকেয়া:</span>
                <strong className="text-red-700 font-black text-lg block leading-tight">
                  ৳ {formatMoney(customer.balance)}
                </strong>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-slate-600 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200 font-black border-b-2 border-slate-600 text-slate-950">
                <tr>
                  <th className="p-2.5 border-r border-slate-600">তারিখ</th>
                  <th className="p-2.5 border-r border-slate-600">বিবরণ</th>
                  <th className="p-2.5 text-right border-r border-slate-600 text-red-700">দিলাম (৳)</th>
                  <th className="p-2.5 text-right border-r border-slate-600 text-emerald-800">
                    পেলাম (৳)
                  </th>
                  <th className="p-2.5 text-right text-slate-950">জের (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-600 font-bold">
                      কোনো লেনদেনের হিসাব পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-400 whitespace-nowrap">
                        <div className="font-black text-slate-900">{formatBanglaDate(t.date)}</div>
                        <div className="text-[10px] text-slate-700 font-medium">{t.time}</div>
                      </td>
                      <td className="p-2.5 border-r border-slate-400 font-bold text-slate-950">
                        {t.description || (t.type === 'sale' ? 'পণ্য বাকি' : 'জমা')}
                      </td>
                      <td className="p-2.5 text-right border-r border-slate-400 font-black text-red-700 whitespace-nowrap">
                        {t.type === 'sale' ? formatMoney(t.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-right border-r border-slate-400 font-black text-emerald-800 whitespace-nowrap">
                        {t.type === 'payment' ? formatMoney(t.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-950 whitespace-nowrap">
                        ৳ {formatMoney(t.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-6 flex justify-between text-xs text-slate-800 font-bold">
            <div className="text-center">
              <div className="border-t-2 border-slate-600 pt-1 px-4 font-bold">কাস্টমারের স্বাক্ষর</div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-600 pt-1 px-4 font-bold">{store.name}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2 no-print shrink-0">
          <div className="flex w-full sm:w-auto gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-emerald-500"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-none py-2.5 px-3 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'টেক্সট কপি'}</span>
            </button>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isPdfDownloading}
              title="পরিষ্কার PDF ফাইল সংরক্ষণ করুন"
              className="flex-1 sm:flex-none py-2.5 px-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPdfDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-teal-200" />}
              <span>{isPdfDownloading ? '...' : '📄 PDF ডাউনলোড'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isImgDownloading}
              title="ছবি হিসেবে ডাউনলোড করুন"
              className="py-2.5 px-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {isImgDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none py-2.5 px-4 bg-[#004D40] hover:bg-[#00382e] text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-teal-700 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 text-teal-200" />}
              <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : '🖨️ প্রিন্ট'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
