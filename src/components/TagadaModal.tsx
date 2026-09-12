import React, { useState, useEffect } from 'react';
import { Customer, StoreProfile, TagadaTemplate } from '../types';
import { formatMoney } from '../utils/storage';
import { userSmsApi } from '../services/apiService';
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  X,
  Smartphone,
  Lock,
  Zap,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

const FALLBACK_TEMPLATES: TagadaTemplate[] = [
  {
    id: 'tpl_polite',
    title: 'বকেয়া তাগাদা (বিনম্র ও সাধারণ)',
    message: 'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল। ধন্যবাদ, {store}। যোগাযোগ: {phone}',
    isDefault: true,
    category: 'regular',
  },
  {
    id: 'tpl_urgent',
    title: 'জরুরি বকেয়া তাগাদা',
    message: 'শ্রদ্ধেয় {customer}, {store}-এ আপনার বকেয়া হিসাব বাকি রয়েছে {currency} {amount} টাকা। অনুগ্রহ করে অতি দ্রুত বকেয়া পরিশোধ করে সহযোগিতা করুন। যোগাযোগ: {phone}',
    isDefault: false,
    category: 'urgent',
  },
  {
    id: 'tpl_short',
    title: 'সংক্ষিপ্ত তাগাদা',
    message: 'প্রিয় {customer}, আপনার অবগতির জন্য জানানো যাচ্ছে যে, {store}-এ আপনার বর্তমান জের {currency} {amount} টাকা। ধন্যবাদ, {store}',
    isDefault: false,
    category: 'short',
  },
  {
    id: 'tpl_reminder',
    title: 'হিসাব পরিশোধ রিমাইন্ডার',
    message: 'আসসালামু আলাইকুম {customer}, {store} থেকে আপনার বাকি বিল {currency} {amount} টাকা পরিশোধের অনুরোধ করা হচ্ছে। শুভেচ্ছান্তে: {store} ({phone})',
    isDefault: false,
    category: 'reminder',
  },
];

interface TagadaModalProps {
  isOpen: boolean;
  customer: Customer | null;
  store: StoreProfile;
  smsBalance?: number;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onSmsSent?: () => void;
  onOpenBuySms?: () => void;
  onOpenDirectSms?: (phone: string, msg: string, name: string) => void;
}

export const TagadaModal: React.FC<TagadaModalProps> = ({
  isOpen,
  customer,
  store,
  smsBalance = 0,
  onClose,
  onShowToast,
  onSmsSent,
  onOpenBuySms,
  onOpenDirectSms,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<TagadaTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Fetch dynamic templates configured by Super Admin
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTemplates = async () => {
      try {
        const fetched = await userSmsApi.getTagadaTemplates();
        if (isMounted) {
          if (Array.isArray(fetched) && fetched.length > 0) {
            setTemplates(fetched);
            const def = fetched.find((t) => t.isDefault) || fetched[0];
            setSelectedTemplateId(def.id);
          } else {
            setTemplates(FALLBACK_TEMPLATES);
            setSelectedTemplateId(FALLBACK_TEMPLATES[0].id);
          }
        }
      } catch {
        if (isMounted) {
          setTemplates(FALLBACK_TEMPLATES);
          setSelectedTemplateId(FALLBACK_TEMPLATES[0].id);
        }
      }
    };

    fetchTemplates();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const currency = store.currencySymbol || '৳';

  // Find selected template or fallback
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates.find((t) => t.isDefault) ||
    templates[0] ||
    FALLBACK_TEMPLATES[0];

  const rawTemplate = activeTemplate?.message || '';

  // Generate resolved non-editable message
  const finalMessage = rawTemplate
    .replace(/{customer}/g, customer.name || 'সম্মানিত গ্রাহক')
    .replace(/{amount}/g, formatMoney(customer.balance || 0))
    .replace(/{currency}/g, currency)
    .replace(/{store}/g, store.name || 'আমাদের দোকান')
    .replace(/{phone}/g, store.phone || '');

  const smsParts = Math.max(1, Math.ceil((finalMessage.length || 1) / 160));
  const hasSmsBalance = smsBalance >= smsParts;

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    onShowToast('📋 তাগাদা মেসেজ কপি হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!customer.phone) {
      onShowToast('❌ এই কাস্টমারের মোবাইল নম্বর নেই!');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone;
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(finalMessage)}`, '_blank');
  };

  const handleNativeSMS = () => {
    if (!customer.phone) {
      onShowToast('❌ এই কাস্টমারের মোবাইল নম্বর নেই!');
      return;
    }
    window.open(`sms:${customer.phone}?body=${encodeURIComponent(finalMessage)}`, '_blank');
  };

  /**
   * Send SMS directly from this app to customer phone via API Gateway
   */
  const handleSendAppSms = async () => {
    if (!customer.phone || customer.phone.trim().length < 11) {
      onShowToast('❌ এই কাস্টমারের সঠিক মোবাইল নম্বর নেই!');
      return;
    }

    if (smsBalance < smsParts) {
      onShowToast(`⚠️ অপর্যাপ্ত এসএমএস ব্যালেন্স! আপনার ব্যালেন্স আছে ${smsBalance} টি। অনুগ্রহ করে রিচার্জ করুন।`);
      if (onOpenBuySms) {
        onOpenBuySms();
      }
      return;
    }

    setIsSending(true);
    try {
      const res = await userSmsApi.sendSms({
        customerPhone: customer.phone.trim(),
        customerName: customer.name,
        message: finalMessage,
        smsType: 'tagada',
      });

      if (res && res.success) {
        onShowToast(`✅ ${customer.name}-এর মোবাইলে সফলভাবে তাগাদা এসএমএস পাঠানো হয়েছে!`);
        if (onSmsSent) onSmsSent();
        onClose();
      } else {
        onShowToast(res?.message || 'এসএমএস পাঠানো যায়নি। পরে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'এসএমএস গেটওয়ে এরর।';
      onShowToast(`❌ ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain no-print animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">বাকি তাগাদা পাঠান</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                প্রাপক: <strong className="text-slate-700">{customer.name}</strong>{' '}
                {customer.phone ? `(${customer.phone})` : '(নম্বর নেই)'}
              </p>
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
          {/* Due Balance & SMS Balance Overview */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-red-50/80 rounded-xl border border-red-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-600">বর্তমান বকেয়া:</span>
              <span className="text-base sm:text-lg font-black text-red-600">
                {currency} {formatMoney(customer.balance)}
              </span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              hasSmsBalance
                ? 'bg-emerald-50/80 border-emerald-200/80'
                : 'bg-amber-50/80 border-amber-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">এসএমএস ব্যালেন্স:</span>
                {onOpenBuySms && (
                  <button
                    type="button"
                    onClick={onOpenBuySms}
                    className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    + কিনুন
                  </button>
                )}
              </div>
              <span className={`text-base sm:text-lg font-black ${
                hasSmsBalance ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {smsBalance} টি
              </span>
            </div>
          </div>

          {/* Super Admin Configured Templates Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>তাগাদা মেসেজ অপশন</span>
                <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded text-[10px] font-semibold">
                  অ্যাডমিন কর্তৃক নির্ধারিত
                </span>
              </label>
              <span className="text-[11px] text-slate-400">বাছাই করুন</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {templates.map((tpl) => {
                const isSelected = tpl.id === (activeTemplate?.id || selectedTemplateId);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-2 rounded-xl text-left transition border cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold truncate pr-1">{tpl.title}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Read-Only Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>মেসেজ প্রিভিউ (অপরিবর্তনীয়)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {finalMessage.length} অক্ষর • {smsParts} SMS
              </span>
            </div>

            <div className="relative">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans select-text shadow-inner min-h-[90px]">
                {finalMessage}
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-200 text-[10px] text-slate-500 font-bold">
                <Lock className="w-2.5 h-2.5 text-slate-400" />
                <span>লকড</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>* সাধারণ ইউজার মেসেজ এডিট করতে পারবেন না। অপশনগুলো সুপার অ্যাডমিন দ্বারা তৈরি।</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Primary Action: Direct Gateway SMS sent from this App */}
            <button
              type="button"
              onClick={handleSendAppSms}
              disabled={isSending}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>এসএমএস পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>সরাসরি কাস্টমারের ফোনে এসএমএস পাঠান</span>
                </>
              )}
            </button>

            {/* Secondary Options: WhatsApp and Native SMS App */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleNativeSMS}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-300" />
                <span>ডিভাইস SMS</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি সম্পন্ন হয়েছে!' : 'মেসেজ কপি করুন'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
