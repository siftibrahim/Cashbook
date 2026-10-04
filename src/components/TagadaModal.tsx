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
  CreditCard,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const FALLBACK_TEMPLATES: TagadaTemplate[] = [
  {
    id: 'tpl_polite',
    title: 'বকেয়া তাগাদা (বিনম্র ও সাধারণ)',
    message: 'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল। {payment_info}\nধন্যবাদ, {store}। যোগাযোগ: {phone}',
    isDefault: true,
    category: 'regular',
  },
  {
    id: 'tpl_urgent',
    title: 'জরুরি বকেয়া তাগাদা',
    message: 'শ্রদ্ধেয় {customer}, {store}-এ আপনার বকেয়া হিসাব বাকি রয়েছে {currency} {amount} টাকা। অনুগ্রহ করে অতি দ্রুত বকেয়া পরিশোধ করে সহযোগিতা করুন। {payment_info}\nযোগাযোগ: {phone}',
    isDefault: false,
    category: 'urgent',
  },
  {
    id: 'tpl_short',
    title: 'সংক্ষিপ্ত তাগাদা',
    message: 'প্রিয় {customer}, আপনার অবগতির জন্য জানানো যাচ্ছে যে, {store}-এ আপনার বর্তমান জের {currency} {amount} টাকা। {payment_info}\nধন্যবাদ, {store}',
    isDefault: false,
    category: 'short',
  },
  {
    id: 'tpl_reminder',
    title: 'হিসাব পরিশোধ রিমাইন্ডার',
    message: 'আসসালামু আলাইকুম {customer}, {store} থেকে আপনার বাকি বিল {currency} {amount} টাকা পরিশোধের অনুরোধ করা হচ্ছে। {payment_info}\nশুভেচ্ছান্তে: {store} ({phone})',
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<TagadaTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Payment Link & Payment details toggle
  const [includePaymentInfo, setIncludePaymentInfo] = useState<boolean>(true);
  const [paymentPhone, setPaymentPhone] = useState<string>(
    store.bkashNumber || store.nagadNumber || store.phone || ''
  );
  const [customPaymentLink, setCustomPaymentLink] = useState<string>('');

  // Generate an instant online payment link
  const generatedPaymentLink = React.useMemo(() => {
    if (customPaymentLink.trim()) return customPaymentLink.trim();
    const cleanPh = (paymentPhone || store.phone || '').replace(/\D/g, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://twing.app';
    const dueAmt = customer ? Math.round(Number(customer.balance || 0)) : 0;
    return `${origin}/pay?to=${cleanPh}&amount=${dueAmt}&name=${encodeURIComponent(customer?.name || '')}`;
  }, [customPaymentLink, paymentPhone, store.phone, customer]);

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

  // Formatted payment snippet to inject
  const paymentSnippet = includePaymentInfo
    ? `\n\n💳 সহজে পরিশোধের লিংক ও মাধ্যম:\nবিকাশ/নগদ: ${paymentPhone || '০১৭xxxxxxxx'} (Send Money/পেমেন্ট)\nঅনলাইন পে লিংক: ${generatedPaymentLink}`
    : '';

  // Generate resolved non-editable message
  let finalMessage = rawTemplate
    .replace(/{customer}/g, customer.name || 'সম্মানিত গ্রাহক')
    .replace(/{amount}/g, formatMoney(customer.balance || 0))
    .replace(/{currency}/g, currency)
    .replace(/{store}/g, store.name || 'আমাদের দোকান')
    .replace(/{phone}/g, store.phone || '');

  if (finalMessage.includes('{payment_info}')) {
    finalMessage = finalMessage.replace(/{payment_info}/g, paymentSnippet);
  } else if (includePaymentInfo) {
    finalMessage = finalMessage + paymentSnippet;
  }

  const smsParts = Math.max(1, Math.ceil((finalMessage.length || 1) / 160));
  const hasSmsBalance = smsBalance >= smsParts;

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    onShowToast('📋 তাগাদা মেসেজ ও পেমেন্ট লিংক কপি হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyOnlyLink = () => {
    navigator.clipboard.writeText(generatedPaymentLink);
    setCopiedLink(true);
    onShowToast('🔗 পেমেন্ট লিংক কপি হয়েছে!');
    setTimeout(() => setCopiedLink(false), 2000);
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
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain no-print animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] overflow-y-auto overscroll-contain">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-800">স্মার্ট বকেয়া তাগাদা ও পেমেন্ট লিংক</h3>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black">
                  WhatsApp + SMS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                প্রাপক: <strong className="text-slate-800">{customer.name}</strong>{' '}
                {customer.phone ? `(${customer.phone})` : '(নম্বর নেই)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Due Balance & SMS Balance Overview */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-rose-700">বর্তমান বকেয়া পাওনা:</span>
              <span className="text-base sm:text-xl font-black text-rose-700 mt-0.5">
                {currency} {formatMoney(customer.balance)}
              </span>
            </div>

            <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
              hasSmsBalance
                ? 'bg-emerald-50 rounded-2xl border-emerald-200'
                : 'bg-amber-50 rounded-2xl border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">এসএমএস ব্যালেন্স:</span>
                {onOpenBuySms && (
                  <button
                    type="button"
                    onClick={onOpenBuySms}
                    className="text-[10px] font-black text-teal-700 hover:underline cursor-pointer"
                  >
                    + রিচার্জ
                  </button>
                )}
              </div>
              <span className={`text-base sm:text-xl font-black mt-0.5 ${
                hasSmsBalance ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {smsBalance} টি
              </span>
            </div>
          </div>

          {/* Payment Link & Details Configuration Box */}
          <div className="p-3.5 bg-gradient-to-br from-teal-50/70 to-emerald-50/60 rounded-2xl border border-teal-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-black text-xs text-teal-950">
                <input
                  type="checkbox"
                  checked={includePaymentInfo}
                  onChange={(e) => setIncludePaymentInfo(e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-teal-300 focus:ring-teal-500"
                />
                <span>বিকাশ/নগদ নম্বর ও পেমেন্ট লিংক মেসেজে যুক্ত রাখুন</span>
              </label>
              <button
                type="button"
                onClick={handleCopyOnlyLink}
                className="text-[10.5px] font-black text-teal-800 hover:text-teal-900 bg-white/80 border border-teal-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <LinkIcon className="w-3 h-3" />}
                <span>{copiedLink ? 'লিংক কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
            </div>

            {includePaymentInfo && (
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    বিকাশ/নগদ রিসিভ নম্বর:
                  </span>
                  <input
                    type="text"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-600 block mb-0.5">
                    কাস্টম পেমেন্ট পেজ লিংক (ঐচ্ছিক):
                  </span>
                  <input
                    type="text"
                    value={customPaymentLink}
                    onChange={(e) => setCustomPaymentLink(e.target.value)}
                    placeholder="স্বয়ংক্রিয় অনলাইন পে লিংক তৈরি হয়েছে"
                    className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-800 font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Templates Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <span>তাগাদার ধরন নির্বাচন করুন</span>
              </label>
              <span className="text-[10px] text-slate-400 font-bold">ট্যাপ করুন</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {templates.map((tpl) => {
                const isSelected = tpl.id === (activeTemplate?.id || selectedTemplateId);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-2 rounded-xl text-left transition border cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
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

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <span>মেসেজ প্রিভিউ</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {finalMessage.length} অক্ষর • {smsParts} SMS
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans select-text shadow-inner min-h-[90px]">
              {finalMessage}
            </div>
          </div>

          {/* Action Buttons: WhatsApp (VIRAL #1), Gateway SMS, Native SMS */}
          <div className="space-y-2 pt-1">
            {/* VIRAL FEATURE: 1-Tap WhatsApp Tagada with Pre-filled Payment Link */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>💬 হোয়াটসঅ্যাপে তাগাদা ও পেমেন্ট লিংক পাঠান (১-ক্লিক)</span>
            </button>

            {/* Direct Gateway SMS */}
            <button
              type="button"
              onClick={handleSendAppSms}
              disabled={isSending}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>এসএমএস পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                  <span>এসএমএস গেটওয়ে দিয়ে পাঠান ({smsParts} SMS ব্যালেন্স)</span>
                </>
              )}
            </button>

            {/* Native SMS & Copy Message */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleNativeSMS}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                <span>ফোনের এসএমএস</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে!' : 'মেসেজ কপি'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
