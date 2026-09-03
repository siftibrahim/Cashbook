import React, { useState } from 'react';
import { Customer, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
import { MessageCircle, Copy, Check, Send, X, Smartphone } from 'lucide-react';

interface TagadaModalProps {
  isOpen: boolean;
  customer: Customer | null;
  store: StoreProfile;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onOpenDirectSms?: (phone: string, msg: string, name: string) => void;
}

export const TagadaModal: React.FC<TagadaModalProps> = ({
  isOpen,
  customer,
  store,
  onClose,
  onShowToast,
  onOpenDirectSms,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !customer) return null;

  const currency = store.currencySymbol || '৳';
  const rawTemplate =
    store.tagadaTemplate ||
    'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল।\n\nধন্যবাদ,\n{store}\nযোগাযোগ: {phone}';

  const defaultMsg = rawTemplate
    .replace(/{customer}/g, customer.name)
    .replace(/{amount}/g, formatMoney(customer.balance))
    .replace(/{currency}/g, currency)
    .replace(/{store}/g, store.name)
    .replace(/{phone}/g, store.phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(defaultMsg);
    setCopied(true);
    onShowToast('তাগাদা মেসেজ কপি হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!customer.phone) {
      onShowToast('এই কাস্টমারের মোবাইল নাম্বার নেই!');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone;
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(defaultMsg)}`, '_blank');
  };

  const handleSMS = () => {
    if (!customer.phone) {
      onShowToast('এই কাস্টমারের মোবাইল নাম্বার নেই!');
      return;
    }
    window.open(`sms:${customer.phone}?body=${encodeURIComponent(defaultMsg)}`, '_blank');
  };

  const handleDirectSms = () => {
    if (!customer.phone) {
      onShowToast('এই কাস্টমারের মোবাইল নাম্বার নেই!');
      return;
    }
    onClose();
    if (onOpenDirectSms) {
      onOpenDirectSms(customer.phone, defaultMsg, customer.name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain no-print animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">বাকি তাগাদা পাঠান</h3>
              <p className="text-[11px] text-slate-500 font-medium">কাস্টমার: {customer.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200/80 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">বর্তমান বকেয়া:</span>
            <span className="text-lg font-black text-red-600">
              {currency} {formatMoney(customer.balance)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">মেসেজ প্রিভিউ</label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
              {defaultMsg}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {onOpenDirectSms && (
              <button
                type="button"
                onClick={handleDirectSms}
                className="w-full py-3 px-3 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-teal-200" />
                <span>সরাসরি গেটওয়ে এসএমএস পাঠান (ব্যালেন্স দিয়ে)</span>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp-এ পাঠান</span>
              </button>

              <button
                type="button"
                onClick={handleSMS}
                className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ডিভাইস SMS অ্যাপ</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'কপি সম্পন্ন হয়েছে!' : 'মেসেজ কপি করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
