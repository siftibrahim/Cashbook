import React, { useState } from 'react';
import { PaymentRecord, PaymentStatus, AdminPaymentMethod, AppUser, RefundStatus, SystemPaymentSettings } from '../../types/adminTypes';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  FileText,
  Trash2,
  RotateCcw,
  SlidersHorizontal,
  Building2,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';
import { PaymentSettingsModal } from './PaymentSettingsModal';
import { DigitalReceiptModal } from '../DigitalReceiptModal';

interface PaymentManagementTabProps {
  payments: PaymentRecord[];
  users: AppUser[];
  paymentSettings?: SystemPaymentSettings;
  onApprovePayment: (paymentId: string, note?: string) => Promise<void>;
  onRejectPayment: (paymentId: string, reason: string) => Promise<void>;
  onProcessRefund?: (paymentId: string, status: RefundStatus, reason?: string, amount?: number) => Promise<void>;
  onAddManualPayment: (payment: PaymentRecord) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onSavePaymentSettings?: (settings: SystemPaymentSettings) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PaymentManagementTab: React.FC<PaymentManagementTabProps> = ({
  payments,
  users,
  paymentSettings,
  onApprovePayment,
  onRejectPayment,
  onProcessRefund,
  onAddManualPayment,
  onDeletePayment,
  onSavePaymentSettings,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus | 'refunded'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | AdminPaymentMethod>('all');

  // Modals
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('টাকা জমা হয়নি বা TrxID ভুল');
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState('গ্রাহকের অনুরোধে রিফান্ড');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [viewVoucherPayment, setViewVoucherPayment] = useState<PaymentRecord | null>(null);
  const [deleteConfirmPayment, setDeleteConfirmPayment] = useState<PaymentRecord | null>(null);

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
    amount: 100,
    paymentMethod: 'bkash',
    trxId: '',
    planName: '২ মাসের স্টার্টার প্যাক',
    durationDays: 60,
    notes: '',
  });

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.shopName.toLowerCase().includes(q) ||
      p.userName.toLowerCase().includes(q) ||
      p.trxId.toLowerCase().includes(q) ||
      (p.senderPhone && p.senderPhone.includes(q)) ||
      (p.senderNumber && p.senderNumber.includes(q));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'refunded'
        ? p.status === 'refunded' || p.refundStatus === 'refunded'
        : p.status === statusFilter;

    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalRevenue = payments
    .filter((p) => p.status === 'approved')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;
  const refundedCount = payments.filter((p) => p.status === 'refunded' || p.refundStatus === 'refunded').length;

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userId) {
      onShowToast('অনুগ্রহ করে একজন ইউজার নির্বাচন করুন');
      return;
    }

    const selectedUser = users.find((u) => u.id === manualForm.userId);
    if (!selectedUser) {
      onShowToast('ইউজার পাওয়া যায়নি');
      return;
    }

    // Check duplicate TrxID locally
    if (manualForm.trxId.trim()) {
      const cleanTrx = manualForm.trxId.trim().toUpperCase();
      const isDuplicate = payments.some(
        (p) => p.trxId && p.trxId.trim().toUpperCase() === cleanTrx && p.status === 'approved'
      );
      if (isDuplicate) {
        onShowToast(`⚠️ এই ট্রানজেকশন আইডি (${manualForm.trxId}) ইতিমধ্যে ব্যবহৃত ও অনুমোদিত!`);
        return;
      }
    }

    const newPay: PaymentRecord = {
      id: 'pay_' + Date.now(),
      userId: selectedUser.id,
      shopName: selectedUser.shopName,
      userName: selectedUser.name,
      userPhone: selectedUser.phone,
      senderPhone: selectedUser.phone,
      senderNumber: selectedUser.phone,
      planId: manualForm.amount === 100 ? 'plan_2_months' : manualForm.amount === 200 ? 'plan_6_months' : 'manual',
      amount: manualForm.amount,
      paymentMethod: manualForm.paymentMethod,
      trxId: manualForm.trxId || 'MANUAL_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      planName: manualForm.planName,
      durationDays: manualForm.durationDays,
      status: 'approved',
      approvedAt: Date.now(),
      createdAt: Date.now(),
      adminNotes: manualForm.notes || 'অ্যাডমিন কর্তৃক সরাসরি অফলাইন পেমেন্ট যুক্ত',
    };

    try {
      await onAddManualPayment(newPay);
      setIsManualModalOpen(false);
      onShowToast(`✅ ৳${manualForm.amount} ম্যানুয়াল পেমেন্ট সফলভাবে এন্ট্রি হয়েছে!`);
    } catch (err: any) {
      onShowToast(`❌ ত্রুটি: ${err.message || 'Error'}`);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalPayment) return;
    await onRejectPayment(rejectModalPayment.id, rejectReason);
    setRejectModalPayment(null);
    onShowToast(`⚠️ ${rejectModalPayment.shopName}-এর পেমেন্ট বাতিল করা হয়েছে`);
  };

  const handleRefundConfirm = async () => {
    if (!refundModalPayment || !onProcessRefund) return;
    await onProcessRefund(refundModalPayment.id, 'refunded', refundReason, refundAmount || refundModalPayment.amount);
    setRefundModalPayment(null);
    onShowToast(`💳 ${refundModalPayment.shopName}-এর পেমেন্ট রিফান্ড সম্পন্ন হয়েছে`);
  };

  return (
    <div className="space-y-4 text-slate-100 font-sans pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg">
          <span className="text-xs font-bold text-slate-400">মোট অনুমোদিত আয়</span>
          <div className="text-xl sm:text-3xl font-black text-emerald-400 mt-1">
            ৳ {formatMoney(totalRevenue)}
          </div>
          <span className="text-[11px] text-slate-500">{approvedCount} টি পেমেন্ট থেকে</span>
        </div>

        <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg">
          <span className="text-xs font-bold text-slate-400">পেন্ডিং রিকোয়েস্ট</span>
          <div className="text-xl sm:text-3xl font-black text-amber-400 mt-1">{pendingCount}</div>
          <span className="text-[11px] text-slate-500">অনুমোদনের অপেক্ষায়</span>
        </div>

        <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg">
          <span className="text-xs font-bold text-slate-400">অনুমোদিত পেমেন্ট</span>
          <div className="text-xl sm:text-3xl font-black text-white mt-1">{approvedCount}</div>
          <span className="text-[11px] text-slate-500">সফল ট্রানজেকশন</span>
        </div>

        <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg">
          <span className="text-xs font-bold text-slate-400">বাতিল ও রিফান্ড</span>
          <div className="text-xl sm:text-3xl font-black text-rose-400 mt-1">
            {rejectedCount} <span className="text-xs font-normal text-slate-400">({refundedCount} রিফান্ড)</span>
          </div>
          <span className="text-[11px] text-slate-500">অকার্যকর / রিফান্ডেড</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Action Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#101A2D] p-4 rounded-3xl border border-slate-800/90 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="TrxID, দোকান, ইউজার বা ফোন নম্বর..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters and Add Manual */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সব স্ট্যাটাস ({payments.length})</option>
            <option value="pending">পেন্ডিং ({pendingCount})</option>
            <option value="approved">অনুমোদিত ({approvedCount})</option>
            <option value="rejected">বাতিল ({rejectedCount})</option>
            <option value="refunded">রিফান্ডেড ({refundedCount})</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer uppercase"
          >
            <option value="all">সব মেথড</option>
            <option value="bkash">বিকাশ (bKash)</option>
            <option value="nagad">নগদ (Nagad)</option>
            <option value="rocket">রকেট (Rocket)</option>
            <option value="upay">উপায় (Upay)</option>
            <option value="bank">ব্যাংক (Bank)</option>
            <option value="cash">নগদ ক্যাশ (Cash)</option>
          </select>

          {/* Payment Settings Button */}
          {paymentSettings && onSavePaymentSettings && (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="পেমেন্ট চ্যানেল সেটিংস ও ব্যাংক অ্যাকাউন্ট কনফিগার করুন"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>মেথড সেটিংস</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>অফলাইন এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* Payment Records List */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 bg-[#101A2D] rounded-3xl border border-dashed border-slate-800 text-slate-500 text-xs">
            কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className={`p-5 rounded-3xl border shadow-lg transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                payment.status === 'pending'
                  ? 'bg-amber-950/25 border-amber-500/40'
                  : payment.status === 'refunded' || payment.refundStatus === 'refunded'
                  ? 'bg-purple-950/20 border-purple-500/30'
                  : 'bg-[#101A2D] border-slate-800/90 hover:border-indigo-500/40'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
                    payment.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : payment.status === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : payment.status === 'refunded' || payment.refundStatus === 'refunded'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-white truncate">
                      {payment.shopName}
                    </h4>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({payment.userName})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        payment.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : payment.status === 'pending'
                          ? 'bg-amber-500 text-slate-950'
                          : payment.status === 'refunded' || payment.refundStatus === 'refunded'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {payment.status === 'approved'
                        ? 'অনুমোদিত'
                        : payment.status === 'pending'
                        ? 'পেন্ডিং'
                        : payment.status === 'refunded' || payment.refundStatus === 'refunded'
                        ? 'রিফান্ডেড'
                        : 'বাতিল'}
                    </span>
                    {payment.refundStatus === 'refund_pending' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-slate-950">
                        রিফান্ড আবেদন পেন্ডিং
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1.5">
                    <span className="font-mono bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-indigo-300">
                      TrxID: <span className="font-bold">{payment.trxId}</span>
                    </span>
                    <span className="capitalize font-semibold text-slate-300">
                      মেথড: <span className="text-white uppercase">{payment.paymentMethod}</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      প্রেরক: {payment.senderPhone || payment.senderNumber}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1.5">
                    প্যাকেজ: <span className="font-bold text-indigo-300">{payment.planName}</span> |{' '}
                    তারিখ: {new Date(payment.createdAt).toLocaleDateString('bn-BD')} (
                    {new Date(payment.createdAt).toLocaleTimeString('bn-BD', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    )
                    {payment.adminNotes && (
                      <span className="block text-[11px] text-slate-400 mt-0.5 italic">
                        নোট: {payment.adminNotes}
                      </span>
                    )}
                    {payment.rejectedReason && (
                      <span className="block text-[11px] text-rose-400 mt-0.5">
                        বাতিলের কারণ: {payment.rejectedReason}
                      </span>
                    )}
                    {payment.refundReason && (
                      <span className="block text-[11px] text-purple-400 mt-0.5">
                        রিফান্ড কারণ: {payment.refundReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Amount & Actions */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-center">
                <div className="text-right">
                  <div className="text-lg sm:text-2xl font-black text-emerald-400">
                    ৳{formatMoney(payment.amount)}
                  </div>
                  <span className="text-[10px] text-slate-400">+{payment.durationDays} দিন মেয়াদ</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewVoucherPayment(payment)}
                    title="রিসিপ্ট / ভাউচার দেখুন"
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer border border-slate-800"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </button>

                  {payment.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await onApprovePayment(payment.id);
                          onShowToast(`✅ ${payment.shopName}-এর পেমেন্ট অনুমোদিত হয়েছে!`);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>অনুমোদন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectModalPayment(payment)}
                        className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>বাতিল</span>
                      </button>
                    </>
                  )}

                  {payment.status === 'approved' && onProcessRefund && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefundModalPayment(payment);
                        setRefundAmount(payment.amount);
                      }}
                      title="রিফান্ড প্রসেস করুন"
                      className="p-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmPayment(payment)}
                    title="মুছুন"
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-xl transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white">পেমেন্ট বাতিল নিশ্চিতকরণ</h3>
            <p className="text-xs text-slate-400">
              দোকান: <span className="font-bold text-white">{rejectModalPayment.shopName}</span> (টাকা: ৳{rejectModalPayment.amount})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                বাতিল করার কারণ লিখুন:
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                পেমেন্ট বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REFUND MODAL */}
      {refundModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">পেমেন্ট রিফান্ড প্রসেসিং</h3>
            </div>

            <p className="text-xs text-slate-400">
              দোকান: <span className="font-bold text-white">{refundModalPayment.shopName}</span> (মূল পেমেন্ট: ৳{refundModalPayment.amount}, TrxID: {refundModalPayment.trxId})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">রিফান্ড টাকার পরিমাণ (৳):</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">রিফান্ড কারণ / নোট:</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRefundModalPayment(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleRefundConfirm}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                রিফান্ড সম্পন্ন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANUAL OFFLINE PAYMENT ENTRY MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">ম্যানুয়াল ক্যাশ/অফলাইন পেমেন্ট এন্ট্রি</h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  ইউজার নির্বাচন করুন <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={manualForm.userId}
                  onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
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
                  <label className="block font-bold text-slate-300 mb-1">প্যাকেজ নির্বাচন</label>
                  <select
                    value={manualForm.amount}
                    onChange={(e) => {
                      const amt = Number(e.target.value);
                      if (amt === 100) {
                        setManualForm({
                          ...manualForm,
                          amount: 100,
                          planName: '২ মাসের স্টার্টার প্যাক',
                          durationDays: 60,
                        });
                      } else if (amt === 200) {
                        setManualForm({
                          ...manualForm,
                          amount: 200,
                          planName: '৬ মাসের সুপার সেভার প্যাক',
                          durationDays: 180,
                        });
                      } else {
                        setManualForm({
                          ...manualForm,
                          amount: amt,
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value={100}>৳১০০ = ২ মাস (৬০ দিন)</option>
                    <option value={200}>৳২০০ = ৬ মাস (১৮০ দিন)</option>
                    <option value={380}>৳৩৮০ = ১ বছর (৩৬৫ দিন)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={manualForm.paymentMethod}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="bkash">বিকাশ (bKash)</option>
                    <option value="nagad">নগদ (Nagad)</option>
                    <option value="rocket">রকেট (Rocket)</option>
                    <option value="upay">উপায় (Upay)</option>
                    <option value="bank">ব্যাংক ট্রান্সফার (Bank)</option>
                    <option value="cash">নগদ ক্যাশ (Cash)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">টাকার পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">মেয়াদ বৃদ্ধি (দিন)</label>
                  <input
                    type="number"
                    value={manualForm.durationDays}
                    onChange={(e) => setManualForm({ ...manualForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">TrxID / ট্রানজেকশন আইডি</label>
                <input
                  type="text"
                  value={manualForm.trxId}
                  onChange={(e) => setManualForm({ ...manualForm, trxId: e.target.value })}
                  placeholder="যেমন: BK8899XX (ঐচ্ছিক)"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  পেমেন্ট সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. VOUCHER / RECEIPT VIEW */}
      {viewVoucherPayment && (
        <DigitalReceiptModal
          isOpen={!!viewVoucherPayment}
          payment={viewVoucherPayment}
          onClose={() => setViewVoucherPayment(null)}
          onShowToast={onShowToast}
        />
      )}

      {/* 5. PAYMENT CHANNEL SETTINGS MODAL */}
      {isSettingsModalOpen && paymentSettings && onSavePaymentSettings && (
        <PaymentSettingsModal
          isOpen={isSettingsModalOpen}
          settings={paymentSettings}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaveSettings={onSavePaymentSettings}
          onShowToast={onShowToast}
        />
      )}

      {/* 6. DELETE PAYMENT IN-APP CONFIRMATION MODAL */}
      {deleteConfirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-500/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">পেমেন্ট রেকর্ড মুছে ফেলা</h4>
                <p className="text-xs text-slate-400">Trx: {deleteConfirmPayment.trxId || deleteConfirmPayment.id}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-bold text-rose-400">৳{deleteConfirmPayment.amount}</span> টাকার এই পেমেন্ট রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmPayment(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmPayment.id;
                  setDeleteConfirmPayment(null);
                  await onDeletePayment(id);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
