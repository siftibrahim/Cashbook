import React from 'react';
import { Customer, Transaction } from '../types';
import { formatMoney, formatBanglaDate, getCategoryLabel, getPaymentMethodLabel } from '../utils/storage';
import {
  ArrowLeft,
  MessageCircle,
  Printer,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  PlusCircle,
  MinusCircle,
  FileText,
  BadgeAlert,
  UserPlus,
  Receipt,
  Tag,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface CustomerDetailProps {
  customer: Customer;
  transactions: Transaction[];
  onBack: () => void;
  onOpenTransaction: (type: 'sale' | 'payment') => void;
  onOpenEditCustomer: () => void;
  onOpenNewCustomer: () => void;
  onDeleteCustomer: () => void;
  onDeleteTransaction: (txId: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onOpenTagada: () => void;
  onOpenReport: () => void;
  onOpenInvoice?: (tx: Transaction) => void;
}

export const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  transactions,
  onBack,
  onOpenTransaction,
  onOpenEditCustomer,
  onOpenNewCustomer,
  onDeleteCustomer,
  onDeleteTransaction,
  onEditTransaction,
  onOpenTagada,
  onOpenReport,
  onOpenInvoice,
}) => {
  const isDue = Number(customer.balance || 0) > 0;
  const creditLimit = customer.creditLimit || 10000;
  const balance = Number(customer.balance || 0);
  const creditUsedPercent = Math.min(100, Math.max(0, Math.round((balance / creditLimit) * 100)));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60 no-print">
      {/* Header bar */}
      <header className="sticky top-0 z-30 bg-[#004D40] text-white px-3.5 sm:px-6 py-3 flex items-center justify-between shadow-md shrink-0 border-b border-teal-700/50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1 font-bold text-xs active:scale-95 border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">খাতায় ফেরত</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base sm:text-lg leading-tight tracking-tight">
                {customer.name}
              </h2>
              {customer.category && customer.category !== 'regular' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                  {getCategoryLabel(customer.category)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-100/90 font-medium mt-0.5">
              {customer.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-teal-300" />
                  <span>{customer.phone}</span>
                </span>
              ) : (
                <span className="text-teal-200/70">মোবাইল নম্বর নেই</span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenNewCustomer}
            title="অন্য নতুন কাস্টমার যোগ করুন"
            className="px-2.5 sm:px-3 py-1.5 bg-teal-600/60 hover:bg-teal-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition border border-teal-400/40 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">+ নতুন কাস্টমার</span>
          </button>

          <button
            type="button"
            onClick={onOpenTagada}
            title="হোয়াটসঅ্যাপ বা এসএমএস তাগাদা পাঠান"
            className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition border border-emerald-500 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">তাগাদা</span>
          </button>

          <button
            type="button"
            onClick={onOpenEditCustomer}
            title="কাস্টমার তথ্য সংশোধন"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDeleteCustomer}
            title="কাস্টমার মুছুন"
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Details */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 flex flex-col gap-4 smooth-scroll-container pb-28 sm:pb-8">
        {/* Balance Card Banner */}
        <section className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isDue ? 'বর্তমান অবশিষ্ট বকেয়া বাকি' : balance < 0 ? 'অগ্রিম জমা আছে' : 'পরিশোধিত জের'}
              </span>
              {balance > creditLimit && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  সীমা অতিক্রান্ত
                </span>
              )}
            </div>
            <h3
              className={`text-2xl sm:text-3xl font-black mt-1 ${
                isDue ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-emerald-600'
              }`}
            >
              ৳ {formatMoney(Math.abs(balance))}
            </h3>

            {/* Credit Limit Progress */}
            {isDue && (
              <div className="mt-2 w-full max-w-xs">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                  <span>বাকি সীমা ব্যবহার: {creditUsedPercent}%</span>
                  <span>লিমিট: ৳{formatMoney(creditLimit)}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditUsedPercent > 90 ? 'bg-red-600' : creditUsedPercent > 60 ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${creditUsedPercent}%` }}
                  />
                </div>
              </div>
            )}

            {customer.address && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.address}</span>
              </p>
            )}

            {customer.notes && (
              <p className="text-xs text-slate-600 mt-1 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 inline-block">
                নোট: {customer.notes}
              </p>
            )}
          </div>

          {/* Big Two Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onOpenTransaction('sale')}
              className="py-3 px-4 sm:px-6 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2.5 border border-red-500 cursor-pointer"
            >
              <MinusCircle className="w-5 h-5 text-red-200" />
              <div className="text-left">
                <div className="text-sm sm:text-base leading-tight">৳ দিলাম</div>
                <div className="text-[10px] font-medium text-red-100">(বাকি বিক্রয়)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onOpenTransaction('payment')}
              className="py-3 px-4 sm:px-6 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2.5 border border-emerald-600 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 text-emerald-200" />
              <div className="text-left">
                <div className="text-sm sm:text-base leading-tight">৳ পেলাম</div>
                <div className="text-[10px] font-medium text-emerald-100">(টাকা জমা / আদায়)</div>
              </div>
            </button>
          </div>
        </section>

        {/* Ledger Table */}
        <section className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/90 flex flex-col overflow-hidden min-h-[320px]">
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                লেনদেনের ইতিহাস ({transactions.length} টি)
              </h4>
            </div>
            <button
              type="button"
              onClick={onOpenReport}
              className="text-xs text-[#00695C] hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>স্টেটমেন্ট রিপোর্ট</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="text-center py-14 px-4 bg-slate-50/40">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#00695C] flex items-center justify-center mx-auto mb-2.5">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-slate-700 text-xs font-bold">এখনো কোনো লেনদেনের হিসাব নেই</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  উপরের “৳ দিলাম” অথবা “৳ পেলাম” বাটনে চাপ দিয়ে হিসাব লিপিবদ্ধ করুন।
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">তারিখ ও সময়</th>
                    <th className="p-3">বিবরণ / মালের নাম</th>
                    <th className="p-3 text-right text-red-600">৳ দিলাম (বাকি)</th>
                    <th className="p-3 text-right text-emerald-700">৳ পেলাম (জমা)</th>
                    <th className="p-3 text-right">বাকি জের</th>
                    <th className="p-3 text-center">রসিদ / মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-teal-50/40 transition">
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-700">{formatBanglaDate(t.date)}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{t.time}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        <div>
                          {t.description || (t.type === 'sale' ? 'পণ্য বাকি বিক্রয়' : 'নগদ জমা পরিশোধ')}
                        </div>
                        {t.paymentMethod && t.type === 'payment' && (
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.2 bg-emerald-50 text-emerald-700 rounded-md font-bold">
                            {getPaymentMethodLabel(t.paymentMethod)}
                          </span>
                        )}
                        {t.items && t.items.length > 0 && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {t.items.map((i) => `${i.name} (${i.quantity}${i.unit})`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-black text-red-600 whitespace-nowrap">
                        {t.type === 'sale' ? `৳ ${formatMoney(t.amount)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        {t.type === 'payment' ? `৳ ${formatMoney(t.amount)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳ {formatMoney(t.balanceAfter)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(t)}
                              title="ডিজিটাল POS রসিদ প্রিন্ট করুন"
                              className="p-1.5 rounded-lg text-[#00695C] hover:bg-teal-100 transition cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction(t)}
                              title="লেনদেন সংশোধন করুন"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(t.id)}
                            title="এই লেনদেন মুছুন"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
