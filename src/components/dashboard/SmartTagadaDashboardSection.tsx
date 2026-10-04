import React, { useState, useMemo } from 'react';
import { Customer, StoreProfile, Transaction } from '../../types';
import { formatMoney } from '../../utils/storage';
import {
  MessageCircle,
  Send,
  Copy,
  Check,
  Zap,
  Search,
  Users,
  CreditCard,
  DollarSign,
  Phone,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  QrCode,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';

interface SmartTagadaDashboardSectionProps {
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  onOpenTagadaModal: (customer: Customer) => void;
  onSelectCustomer: (customerId: string) => void;
  onOpenNewPayment?: (customer: Customer) => void;
  onNavigateToCustomers: () => void;
  onOpenSettings?: () => void;
  onShowToast?: (msg: string) => void;
}

export const SmartTagadaDashboardSection: React.FC<SmartTagadaDashboardSectionProps> = ({
  customers,
  transactions,
  store,
  onOpenTagadaModal,
  onSelectCustomer,
  onOpenNewPayment,
  onNavigateToCustomers,
  onOpenSettings,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'medium'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currency = store.currencySymbol || '৳';
  const paymentPhone = store.bkashNumber || store.nagadNumber || store.phone || '';

  // Filter customers who have due balance (> 0)
  const dueCustomers = useMemo(() => {
    return (customers || [])
      .filter((c) => Number(c.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  }, [customers]);

  const totalDueAmount = useMemo(() => {
    return dueCustomers.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  }, [dueCustomers]);

  const highDueCount = useMemo(() => {
    const limit = store.highDueLimit || 5000;
    return dueCustomers.filter((c) => Number(c.balance || 0) >= limit).length;
  }, [dueCustomers, store.highDueLimit]);

  // Filtered list based on search and selected filter chip
  const displayedCustomers = useMemo(() => {
    return dueCustomers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q);

      if (!matchSearch) return false;

      const bal = Number(c.balance || 0);
      if (filterMode === 'high') {
        return bal >= (store.highDueLimit || 5000);
      }
      if (filterMode === 'medium') {
        return bal >= 1000 && bal < (store.highDueLimit || 5000);
      }
      return true;
    });
  }, [dueCustomers, searchQuery, filterMode, store.highDueLimit]);

  // Construct quick WhatsApp text with payment link
  const constructWhatsAppMessage = (customer: Customer) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://twing.app';
    const cleanPh = paymentPhone.replace(/\D/g, '');
    const dueAmt = Math.round(Number(customer.balance || 0));
    const payLink = `${origin}/pay?to=${cleanPh}&amount=${dueAmt}&name=${encodeURIComponent(customer.name || '')}`;

    return `আসসালামু আলাইকুম ${customer.name || 'সম্মানিত গ্রাহক'} ভাই,
${store.name || 'আমাদের দোকান'}-এ আপনার বর্তমান বকেয়া বাকি ৳ ${formatMoney(dueAmt)}।

💳 সহজে বকেয়া পরিশোধের মাধ্যম:
বিকাশ/নগদ (Send Money): ${paymentPhone || '০১৭xxxxxxxx'}
অনলাইনে পে করার লিংক: ${payLink}

সুবিধাজনক সময়ে পরিশোধ করে হিসাব নিষ্পত্তি করার জন্য অনুরোধ রইল। ধন্যবাদ,
${store.name || 'টুইং শপ'} (মোবাইল: ${store.phone || ''})`;
  };

  const handleSendWhatsApp = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    if (!customer.phone) {
      if (onShowToast) onShowToast('❌ এই কাস্টমারের মোবাইল নম্বর নেই!');
      else alert('এই কাস্টমারের মোবাইল নম্বর নেই!');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone;
    const msg = constructWhatsAppMessage(customer);
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyPaymentRequest = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const msg = constructWhatsAppMessage(customer);
    navigator.clipboard.writeText(msg);
    setCopiedId(customer.id);
    if (onShowToast) {
      onShowToast(`📋 ${customer.name}-এর তাগাদা মেসেজ ও পেমেন্ট লিংক কপি হয়েছে!`);
    }
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <section
      id="dashboard-smart-tagada-section"
      className="bg-white rounded-2xl border border-teal-200/90 shadow-[0_2px_14px_rgba(13,148,136,0.06)] overflow-hidden"
    >
      {/* Top Banner Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/25 border border-teal-400/30 text-teal-300 flex items-center justify-center shadow-xs">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>স্মার্ট তাগাদা ও অনলাইন কালেকশন</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 shadow-2xs">
                  WhatsApp + SMS + Link
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-teal-200 mt-0.5 font-medium">
              ১-ট্যাপে বকেয়া তাগাদা এবং বিকাশ/নগদ পেমেন্ট লিংক কাস্টমারের ইনবক্সে পাঠান
            </p>
          </div>
        </div>

        {/* View all dues shortcut */}
        <button
          type="button"
          onClick={onNavigateToCustomers}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
        >
          <span>সকল বাকি খাতা</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-teal-300" />
        </button>
      </div>

      {/* Metrics & Merchant Payment Details Bar */}
      <div className="p-3 bg-gradient-to-b from-teal-50/60 to-white border-b border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        {/* KPI stats */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-600 font-bold">মোট বাকি:</span>
            <span className="text-sm sm:text-base font-black text-rose-700 font-mono">
              ৳ {formatMoney(totalDueAmount)}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-slate-600 font-bold">বাকি গ্রাহক:</span>
            <span className="text-xs sm:text-sm font-black text-slate-900">
              {dueCustomers.length} জন
            </span>
          </div>
          {highDueCount > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-black text-[10px]">
                🚨 জরুরি তাগাদা: {highDueCount} জন
              </span>
            </div>
          )}
        </div>

        {/* Configured Merchant Payment Info */}
        <div className="flex items-center gap-2 text-[11px] text-slate-700 bg-white/90 px-2.5 py-1 rounded-xl border border-teal-200">
          <CreditCard className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span className="truncate">
            পেমেন্ট নম্বর: <strong>{paymentPhone || 'সেট করা নেই'}</strong>
          </span>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-teal-700 hover:text-teal-900 font-black text-[10px] underline cursor-pointer shrink-0"
            >
              {paymentPhone ? 'পরিবর্তন' : '+ নম্বর দিন'}
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-teal-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            সকল বাকি ({dueCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('high')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'high'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            জরুরি বাকি (≥৫,০০০৳)
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('medium')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'medium'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            মাঝারি বাকি (১,০০০-৫,০০০৳)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[160px] sm:min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কাস্টমার নাম বা নম্বর..."
            className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
        </div>
      </div>

      {/* Customer List / Outstanding Dues */}
      <div className="p-3 sm:p-4">
        {dueCustomers.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-800 text-sm sm:text-base">
              আলহামদুলিল্লাহ! আপনার দোকানে কোনো বকেয়া বাকি নেই
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              সব কাস্টমারের হিসাব পরিশোধ রয়েছে। নতুন বাকি বিক্রি করলে স্বয়ংক্রিয়ভাবে এখানে তাগাদার অপশন দেখা যাবে।
            </p>
          </div>
        ) : displayedCustomers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            এই ফিল্টারে কোনো বাকিদার পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {displayedCustomers.slice(0, 9).map((customer) => {
              const dueAmount = Number(customer.balance || 0);
              const isHigh = dueAmount >= (store.highDueLimit || 5000);
              const isCopied = copiedId === customer.id;

              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                    isHigh
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400 hover:shadow-sm'
                      : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'
                  }`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate group-hover:text-teal-900 transition">
                            {customer.name || 'সম্মানিত গ্রাহক'}
                          </h4>
                          {isHigh && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 font-bold rounded text-[9.5px] shrink-0">
                              জরুরি
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{customer.phone || 'নম্বর নেই'}</span>
                        </p>
                      </div>

                      {/* Due Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">বাকি জের:</span>
                        <span className="text-sm sm:text-base font-black font-mono text-rose-700 leading-tight">
                          ৳ {formatMoney(dueAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row: WhatsApp Tagada (#1), SMS Tagada, Copy Link */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    {/* 1-Tap WhatsApp Tagada (VIRAL BUTTON) */}
                    <button
                      type="button"
                      onClick={(e) => handleSendWhatsApp(e, customer)}
                      title="হোয়াটসঅ্যাপে পেমেন্ট লিংক সহ তাগাদা মেসেজ পাঠান"
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>WhatsApp তাগাদা</span>
                    </button>

                    {/* Tagada Modal / SMS */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTagadaModal(customer);
                      }}
                      title="এসএমএস তাগাদা ও বিস্তারিত অপশন"
                      className="py-1.5 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold rounded-xl text-[11px] border border-teal-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-teal-700" />
                      <span>SMS</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyPaymentRequest(e, customer)}
                      title="পেমেন্ট লিংক ও মেসেজ কপি করুন"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All footer link if there are more than 9 dues */}
        {dueCustomers.length > 9 && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onNavigateToCustomers}
              className="text-xs font-black text-teal-800 hover:text-teal-900 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>আরও {dueCustomers.length - 9} জন বকেয়া গ্রাহকের তালিকা দেখুন →</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
