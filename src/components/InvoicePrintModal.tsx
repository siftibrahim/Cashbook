import React, { useState } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { formatMoney, formatBanglaDate, getPaymentMethodLabel } from '../utils/storage';
import { executeSafePrint, downloadReceiptPDF, downloadReceiptImage } from '../utils/printHelper';
import {
  X,
  Printer,
  Share2,
  Check,
  Receipt,
  Download,
  Loader2,
  FileDown,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface InvoicePrintModalProps {
  isOpen: boolean;
  customer: Customer | null;
  transaction: Transaction | null;
  store: StoreProfile;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  customer,
  transaction,
  store,
  onClose,
  onShowToast,
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>(
    store.printPaperSize === 'a4' ? 'a4' : 'thermal'
  );
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isImgDownloading, setIsImgDownloading] = useState(false);

  if (!isOpen || !customer || !transaction) return null;

  const currency = store.currencySymbol || '৳';
  const voucherNo = transaction.receiptNo || `REC-${transaction.createdAt.toString().slice(-6)}`;
  const isSale = transaction.type === 'sale';
  const isPayment = transaction.type === 'payment';

  // Financial Breakdown calculations
  const subtotal = transaction.subtotal !== undefined ? transaction.subtotal : transaction.amount;
  const discount = transaction.discount || 0;
  const netBill = transaction.netAmount !== undefined ? transaction.netAmount : (subtotal - discount);
  const paidAmount = transaction.paidAmount !== undefined ? transaction.paidAmount : (isPayment ? transaction.amount : 0);
  const dueAmount = transaction.dueAmount !== undefined ? transaction.dueAmount : (isSale ? (netBill - paidAmount) : 0);

  // Status classification
  const isFullyPaid = isPayment || (isSale && dueAmount <= 0 && paidAmount >= netBill) || (isSale && customer.balance <= 0 && dueAmount <= 0);
  const isPartialPaid = isSale && paidAmount > 0 && dueAmount > 0;
  const isFullyDue = isSale && (paidAmount === 0 || paidAmount === undefined) && dueAmount > 0;

  // Direct Non-Crashing Safe Print
  const handlePrint = () => {
    setIsPrinting(true);
    onShowToast('🖨️ প্রিন্ট ডায়ালগ প্রস্তুত করা হচ্ছে...');

    setTimeout(() => {
      executeSafePrint(() => {
        setIsPrinting(false);
      });
    }, 150);
  };

  // Safe High-Res PDF Download
  const handleDownloadPDF = async () => {
    setIsPdfDownloading(true);
    const filename = `Memo_${customer.name.replace(/\s+/g, '_')}_${voucherNo}`;
    await downloadReceiptPDF('printable-invoice', filename, onShowToast);
    setIsPdfDownloading(false);
  };

  // Safe PNG Image Download
  const handleDownloadImage = async () => {
    setIsImgDownloading(true);
    const filename = `Memo_${customer.name.replace(/\s+/g, '_')}_${voucherNo}`;
    await downloadReceiptImage('printable-invoice', filename, onShowToast);
    setIsImgDownloading(false);
  };

  const handleShare = () => {
    let text = `*${store.name}*\nরসিদ নং: ${voucherNo}\nকাস্টমার: ${customer.name}\n`;
    
    if (isFullyPaid) {
      text += `মেমো ধরন: নগদ পরিশোধিত মেমো (PAID CASH MEMO)\nমোট বিল: ${currency} ${formatMoney(netBill)}\nপরিশোধ: ${currency} ${formatMoney(paidAmount || netBill)}\nঅবশিষ্ট বাকি: ${currency} 0 (পরিশোধিত)\n`;
    } else if (isPartialPaid) {
      text += `মেমো ধরন: আংশিক বাকি বিক্রয় মেমো (PARTIAL)\nমোট বিল: ${currency} ${formatMoney(netBill)}\nনগদ জমা: ${currency} ${formatMoney(paidAmount)}\nএই মেমোর বাকি: ${currency} ${formatMoney(dueAmount)}\nসর্বমোট অবশিষ্ট বাকি: ${currency} ${formatMoney(customer.balance)}\n`;
    } else if (isFullyDue) {
      text += `মেমো ধরন: বাকি বিক্রয় মেমো (DUE MEMO)\nবাকির পরিমাণ: ${currency} ${formatMoney(dueAmount)}\nসর্বমোট অবশিষ্ট বাকি: ${currency} ${formatMoney(customer.balance)}\n`;
    } else {
      text += `লেনদেন: টাকা জমা রসিদ (MONEY RECEIPT)\nজমা পরিমাণ: ${currency} ${formatMoney(transaction.amount)}\nঅবশিষ্ট বাকি: ${currency} ${formatMoney(customer.balance)}\n`;
    }

    text += `তারিখ: ${formatBanglaDate(transaction.date)} (${transaction.time})\n\n${store.footerNote || 'ধন্যবাদ!'}`;

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
      onShowToast('রসিদের সারাংশ কপি হয়েছে!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('কপি করতে সমস্যা হয়েছে।');
    }
  };

  // Generate dynamic QR Code url for store's bKash or phone
  const qrTarget = store.bkashNumber || store.phone || '01619665875';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `Payment to ${store.name}, Mobile: ${qrTarget}, Voucher: ${voucherNo}, Amount: ${customer.balance > 0 ? customer.balance : dueAmount}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[95vh] overflow-hidden animate-in zoom-in-95">
        {/* Header - Screen only */}
        <div className="bg-[#004D40] text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-md shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-teal-200">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isFullyPaid
                  ? 'পরিশোধিত ক্যাশ মেমো'
                  : isPayment
                  ? 'টাকা জমা রসিদ'
                  : 'বিক্রয় রসিদ'}
              </h3>
              <p className="text-[11px] text-teal-100 font-mono">{voucherNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Format Toggle */}
            <div className="flex bg-teal-900/80 p-0.5 rounded-lg border border-teal-600/80 text-xs font-bold mr-1 sm:mr-2">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] sm:text-xs font-bold ${
                  printFormat === 'thermal' ? 'bg-teal-500 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
              >
                POS স্লিপ
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] sm:text-xs font-bold ${
                  printFormat === 'a4' ? 'bg-teal-500 text-white shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
              >
                A4 মেমো
              </button>
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

        {/* Invoice Viewable Paper Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/90 flex justify-center items-start">
          {/* Paper Canvas */}
          <div
            id="printable-invoice"
            className={`bg-white text-slate-900 shadow-md border border-slate-300 transition-all ${
              printFormat === 'thermal'
                ? 'w-full max-w-[340px] p-4 text-xs font-mono rounded-xl my-1'
                : 'w-full max-w-[500px] p-6 text-sm rounded-xl my-2'
            }`}
          >
            {/* Store Branding Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-800">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                {store.name}
              </h2>
              <p className="text-[11px] text-slate-800 font-sans font-medium mt-0.5">{store.address}</p>
              <p className="text-[11px] text-slate-900 font-sans font-bold">মোবাইল: {store.phone}</p>

              {/* High Contrast Clean Badge Stamp */}
              <div
                className={`inline-block mt-2 px-3 py-0.5 rounded-full font-black text-[11px] tracking-wider uppercase border-2 ${
                  isFullyPaid
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-700'
                    : isPayment
                    ? 'bg-teal-50 text-teal-900 border-teal-700'
                    : dueAmount > 0
                    ? 'bg-red-50 text-red-900 border-red-700'
                    : 'bg-slate-100 text-slate-900 border-slate-800'
                }`}
              >
                {isFullyPaid
                  ? 'পরিশোধিত রসিদ (PAID SLIP)'
                  : isPayment
                  ? 'টাকা জমা রসিদ (MONEY RECEIPT)'
                  : 'বিক্রয় রসিদ (DEBIT SLIP)'}
              </div>
            </div>

            {/* Voucher and Customer Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-600 space-y-1 font-sans text-xs">
              <div className="flex justify-between">
                <span className="text-slate-700 font-semibold">রসিদ নং:</span>
                <span className="font-black text-slate-900 font-mono">{voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-semibold">তারিখ ও সময়:</span>
                <span className="font-bold text-slate-900">
                  {formatBanglaDate(transaction.date)} | {transaction.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 font-semibold">কাস্টমার নাম:</span>
                <span className="font-black text-slate-900">{customer.name}</span>
              </div>
              {customer.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-700 font-semibold">মোবাইল:</span>
                  <span className="font-bold text-slate-900 font-mono">{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex justify-between">
                  <span className="text-slate-700 font-semibold">ঠিকানা:</span>
                  <span className="font-bold text-slate-900">{customer.address}</span>
                </div>
              )}
            </div>

            {/* Itemized List / Transaction Detail */}
            <div className="py-3 border-b border-dashed border-slate-600">
              {transaction.items && transaction.items.length > 0 ? (
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between font-black text-[11px] text-slate-900 pb-1 border-b border-slate-400">
                    <span>পণ্যের বিবরণ</span>
                    <span>মোট</span>
                  </div>
                  {transaction.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-0.5">
                      <div>
                        <span className="font-bold text-slate-950">{it.name}</span>
                        <div className="text-[10px] text-slate-700 font-medium">
                          {it.quantity} {it.unit} × {currency}{it.price}
                        </div>
                      </div>
                      <span className="font-black text-slate-950">
                        {currency} {formatMoney(it.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="font-sans space-y-1">
                  <span className="text-xs text-slate-700 font-semibold">লেনদেনের বিবরণ:</span>
                  <p className="text-xs font-bold text-slate-950 bg-slate-100 p-2 rounded-lg border border-slate-300">
                    {transaction.description || (isSale ? 'পণ্য বাকি ক্রয়' : 'নগদ জমা পরিশোধ')}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Summary Calculation */}
            <div className="py-3 border-b-2 border-dashed border-slate-800 space-y-1.5 font-sans">
              {transaction.items && transaction.items.length > 0 ? (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-semibold">মোট বিল:</span>
                    <span className="font-black text-slate-900">
                      {currency} {formatMoney(subtotal)}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-900 font-bold">
                      <span>ছাড় / ডিসকাউন্ট:</span>
                      <span>
                        - {currency} {formatMoney(discount)}
                      </span>
                    </div>
                  )}

                  {paidAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-700">নগদ পরিশোধ:</span>
                      <span className="text-emerald-800 font-black">
                        {currency} {formatMoney(paidAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-semibold">
                      {isFullyPaid ? 'বাকি:' : 'বর্তমান বিল / বাকির পরিমাণ:'}
                    </span>
                    <span className={`font-black text-sm ${dueAmount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                      {dueAmount > 0 ? `+ ${currency} ${formatMoney(dueAmount)}` : `${currency} 0`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-700 font-semibold">
                    {isSale ? 'বর্তমান বিল / বাকির পরিমাণ:' : 'টাকা পরিশোধের পরিমাণ:'}
                  </span>
                  <span className={`font-black text-sm ${isSale ? 'text-red-700' : 'text-emerald-800'}`}>
                    {isSale ? '+' : '-'} {currency} {formatMoney(transaction.amount)}
                  </span>
                </div>
              )}

              {transaction.paymentMethod && (
                <div className="flex justify-between items-center text-xs pt-0.5">
                  <span className="text-slate-700 font-semibold">পরিশোধ মাধ্যম:</span>
                  <span className="font-black text-slate-900">
                    {getPaymentMethodLabel(transaction.paymentMethod)}
                  </span>
                </div>
              )}

              {/* Total Remaining Due */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-400 text-xs sm:text-sm">
                <span className="font-black text-slate-950">সর্বমোট অবশিষ্ট বাকি:</span>
                <span
                  className={`font-black text-base sm:text-lg ${
                    customer.balance > 0 ? 'text-red-700' : 'text-emerald-800'
                  }`}
                >
                  {customer.balance > 0 ? `${currency} ${formatMoney(customer.balance)}` : `${currency} 0`}
                </span>
              </div>
            </div>

            {/* QR Code and MFS Payment Prompt if customer has due */}
            {customer.balance > 0 && store.showQrOnInvoice !== false && (store.bkashNumber || store.nagadNumber) && (
              <div className="py-3 border-b border-dashed border-slate-600 flex items-center justify-between gap-3">
                <div className="text-left font-sans">
                  <p className="text-[11px] font-black text-slate-900">অনলাইনে বাকি পরিশোধ করুন:</p>
                  {store.bkashNumber && (
                    <p className="text-[10px] text-pink-800 font-bold">বিকাশ: {store.bkashNumber}</p>
                  )}
                  {store.nagadNumber && (
                    <p className="text-[10px] text-orange-800 font-bold">নগদ: {store.nagadNumber}</p>
                  )}
                  <p className="text-[9px] text-slate-700 font-semibold mt-0.5">কিউআর কোড স্ক্যান করে পে করুন</p>
                </div>
                <img
                  src={qrUrl}
                  alt="Payment QR"
                  className="w-14 h-14 rounded-lg border border-slate-400 p-0.5 bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Signature Area */}
            <div className="pt-6 pb-2 flex justify-between items-end text-[11px] font-sans text-slate-800 font-bold">
              <div className="text-center">
                <div className="w-20 border-t border-slate-600 mb-1" />
                <span>কাস্টমারের স্বাক্ষর</span>
              </div>
              <div className="text-center">
                <div className="w-20 border-t border-slate-600 mb-1" />
                <span>কর্তৃপক্ষের স্বাক্ষর</span>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center pt-3 text-[10px] text-slate-700 font-sans border-t border-dashed border-slate-400 font-medium">
              <p>{store.footerNote || 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।'}</p>
              <p className="text-[9px] text-slate-600 font-bold mt-0.5">ডিজিটাল খাতা ও ক্যাশ মেমো সিস্টেম</p>
            </div>
          </div>
        </div>

        {/* Modal Action Bar - Screen Only */}
        <div className="bg-slate-50 px-3 sm:px-6 py-3 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'কপি হয়েছে!' : 'মেসেজ কপি'}</span>
          </button>

          <div className="flex w-full sm:w-auto gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isPdfDownloading}
              title="পরিষ্কার ও স্পষ্ট PDF ফাইল ডাউনলোড করুন"
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPdfDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 text-teal-200" />}
              <span>{isPdfDownloading ? 'তৈরি হচ্ছে...' : '📄 PDF ডাউনলোড'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isImgDownloading}
              title="মেমো ছবি হিসেবে গ্যালারিতে সেভ করুন"
              className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isImgDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-slate-300" />}
              <span>{isImgDownloading ? '...' : '🖼️ ছবি'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#004D40] hover:bg-[#00382e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer border border-teal-700 disabled:opacity-50"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 text-teal-200" />}
              <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : '🖨️ প্রিন্ট'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
