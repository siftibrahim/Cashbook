import React, { useState } from 'react';
import { PaymentRecord, PaymentStatus, AdminPaymentMethod, AppUser } from '../../types/adminTypes';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Filter,
  FileText,
  DollarSign,
  Phone,
  Store,
  User,
  Trash2,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface PaymentManagementTabProps {
  payments: PaymentRecord[];
  users: AppUser[];
  onApprovePayment: (paymentId: string, note?: string) => Promise<void>;
  onRejectPayment: (paymentId: string, reason: string) => Promise<void>;
  onAddManualPayment: (payment: PaymentRecord) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PaymentManagementTab: React.FC<PaymentManagementTabProps> = ({
  payments,
  users,
  onApprovePayment,
  onRejectPayment,
  onAddManualPayment,
  onDeletePayment,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | AdminPaymentMethod>('all');

  // Modals
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('টাকা জমা হয়নি বা TrxID ভুল');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [viewVoucherPayment, setViewVoucherPayment] = useState<PaymentRecord | null>(null);

  // Manual Payment Form
  const [manualForm, setManualForm] = useState<{
    userId: string;
    amount: number;
    paymentMethod: AdminPaymentMethod;
    trxId: string;
    planName: string;
    durationDays: number;
    notes: string;
  }>({
    userId: '',
    amount: 199,
    paymentMethod: 'bkash',
    trxId: '',
    planName: 'মাসিক স্ট্যান্ডার্ড প্যাক',
    durationDays: 30,
    notes: '',
  });

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.trxId.toLowerCase().includes(q) ||
      p.userName.toLowerCase().includes(q) ||
      p.shopName.toLowerCase().includes(q) ||
      p.userPhone.includes(q);

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    return matchQuery && matchStatus && matchMethod;
  });

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userId || !manualForm.amount) {
      onShowToast('ইউজার এবং টাকার পরিমাণ পূরণ করুন');
      return;
    }

    const selectedUser = users.find((u) => u.id === manualForm.userId);
    if (!selectedUser) return;

    const newPayment: PaymentRecord = {
      id: 'pay_' + Date.now(),
      userId: selectedUser.id,
      userName: selectedUser.name,
      userPhone: selectedUser.phone,
      shopName: selectedUser.shopName,
      planId: 'manual',
      planName: manualForm.planName,
      durationDays: manualForm.durationDays,
      amount: Number(manualForm.amount),
      paymentMethod: manualForm.paymentMethod,
      trxId: manualForm.trxId || 'OFFLINE-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      senderNumber: selectedUser.phone,
      status: 'approved',
      createdAt: Date.now(),
      approvedAt: Date.now(),
      adminNotes: manualForm.notes || 'অ্যাডমিন কর্তৃক সরাসরি ম্যানুয়াল পেমেন্ট যুক্ত করা হয়েছে',
    };

    await onAddManualPayment(newPayment);
    setIsManualModalOpen(false);
    onShowToast(`✅ ${selectedUser.name}-এর জন্য ৳${newPayment.amount} পেমেন্ট সফলভাবে এন্ট্রি হয়েছে!`);
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalPayment) return;
    await onRejectPayment(rejectModalPayment.id, rejectReason);
    onShowToast(`❌ পেমেন্ট বাতিল করা হয়েছে!`);
    setRejectModalPayment(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="TrxID, ইউজার, দোকান বা ফোন দিয়ে পেমেন্ট খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="all">সব স্ট্যাটাস ({payments.length})</option>
            <option value="pending">পেন্ডিং</option>
            <option value="approved">অনুমোদিত</option>
            <option value="rejected">বাতিল</option>
          </select>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>অফলাইন পেমেন্ট এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* Payment Records List */}
      <div className="space-y-2.5">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
            >
              {/* Left Details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    payment.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : payment.status === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      {payment.shopName}
                    </h4>
                    <span className="text-xs text-slate-500 font-semibold">
                      ({payment.userName})
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        payment.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {payment.status === 'approved'
                        ? 'অনুমোদিত'
                        : payment.status === 'pending'
                        ? 'পেন্ডিং'
                        : 'বাতিল'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                      TrxID: <span className="font-bold">{payment.trxId}</span>
                    </span>
                    <span className="capitalize font-semibold text-slate-700">
                      মেথড: {payment.paymentMethod}
                    </span>
                    <span className="text-slate-500 font-mono">
                      প্রেরক: {payment.senderNumber}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1">
                    প্যাকেজ: <span className="font-bold text-teal-800">{payment.planName}</span> |{' '}
                    তারিখ: {new Date(payment.createdAt).toLocaleDateString('bn-BD')} (
                    {new Date(payment.createdAt).toLocaleTimeString('bn-BD', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    )
                  </div>
                </div>
              </div>

              {/* Right: Amount & Actions */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-center">
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-black text-slate-900">
                    ৳{formatMoney(payment.amount)}
                  </div>
                  <span className="text-[10px] text-slate-400">+{payment.durationDays} দিন মেয়াদ</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewVoucherPayment(payment)}
                    title="রিসিপ্ট / ভাউচার দেখুন"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {payment.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await onApprovePayment(payment.id);
                          onShowToast(`✅ ${payment.shopName}-এর পেমেন্ট অনুমোদিত হয়েছে!`);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>অনুমোদন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectModalPayment(payment)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('আপনি কি এই পেমেন্ট রেকর্ডটি মুছে ফেলতে চান?')) {
                        onDeletePayment(payment.id);
                      }
                    }}
                    title="মুছুন"
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 1. REJECT REASON MODAL */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800">পেমেন্ট বাতিল নিশ্চিতকরণ</h3>
            <p className="text-xs text-slate-600">
              দোকান: <span className="font-bold text-slate-900">{rejectModalPayment.shopName}</span> (টাকা: ৳{rejectModalPayment.amount})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বাতিল করার কারণ লিখুন:
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                পেমেন্ট বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MANUAL OFFLINE PAYMENT ENTRY MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">ম্যানুয়াল ক্যাশ/অফলাইন পেমেন্ট</h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ইউজার নির্বাচন করুন <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={manualForm.userId}
                  onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- ইউজার নির্বাচন করুন --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.shopName}) - {u.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={manualForm.paymentMethod}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="cash">নগদ ক্যাশ (Cash)</option>
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="rocket">রকেট (Rocket)</option>
                    <option value="bank">ব্যাংক (Bank)</option>
                    <option value="other">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্যাকেজ নাম</label>
                  <input
                    type="text"
                    value={manualForm.planName}
                    onChange={(e) => setManualForm({ ...manualForm, planName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">মেয়াদ বৃদ্ধি (দিন)</label>
                  <input
                    type="number"
                    value={manualForm.durationDays}
                    onChange={(e) => setManualForm({ ...manualForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">TrxID / রেফারেন্স নং</label>
                <input
                  type="text"
                  value={manualForm.trxId}
                  onChange={(e) => setManualForm({ ...manualForm, trxId: e.target.value })}
                  placeholder="ঐচ্ছিক (খালি রাখলে অটো জেনারেট হবে)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  পেমেন্ট সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. VOUCHER / RECEIPT VIEW */}
      {viewVoucherPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="inline-flex p-3 rounded-2xl bg-teal-50 text-[#004D40] font-black text-xl mb-1">
                🧾
              </div>
              <h3 className="text-base font-black text-slate-900">অফিসিয়াল পেমেন্ট ভাউচার</h3>
              <p className="text-xs text-slate-500">ইব্রাহিম জেনারেল স্টোর খাতা সিস্টেম</p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">ভাউচার আইডি:</span>
                <span className="font-mono font-bold text-slate-900">{viewVoucherPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">দোকানের নাম:</span>
                <span className="font-bold text-slate-900">{viewVoucherPayment.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ইউজার নাম:</span>
                <span className="font-semibold text-slate-800">{viewVoucherPayment.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TrxID:</span>
                <span className="font-mono font-bold text-slate-900">{viewVoucherPayment.trxId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">পেমেন্ট মেথড:</span>
                <span className="font-semibold text-slate-800 capitalize">{viewVoucherPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">প্যাকেজ:</span>
                <span className="font-bold text-teal-800">{viewVoucherPayment.planName}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">মোট পরিশোধিত:</span>
                <span className="font-black text-teal-800">৳{formatMoney(viewVoucherPayment.amount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewVoucherPayment(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
