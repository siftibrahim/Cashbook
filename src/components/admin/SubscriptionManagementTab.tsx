import React, { useState } from 'react';
import { AppUser, SubscriptionPlan } from '../../types/adminTypes';
import { DEFAULT_PLANS } from '../../services/adminService';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface SubscriptionManagementTabProps {
  users: AppUser[];
  onExtendSubscription: (userId: string, days: number, planName?: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const SubscriptionManagementTab: React.FC<SubscriptionManagementTabProps> = ({
  users,
  onExtendSubscription,
  onShowToast,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [assignUserModal, setAssignUserModal] = useState<SubscriptionPlan | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const now = Date.now();
  const activeSubs = users.filter((u) => u.subscriptionExpiresAt > now);
  const trialSubs = users.filter((u) => u.subscriptionPlan.includes('ট্রায়াল'));
  const paidSubs = users.filter((u) => !u.subscriptionPlan.includes('ট্রায়াল') && u.subscriptionExpiresAt > now);

  const handleAssignPlan = async () => {
    if (!assignUserModal || !selectedUserId) {
      onShowToast('অনুগ্রহ করে একজন ইউজার নির্বাচন করুন');
      return;
    }
    const targetUser = users.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    await onExtendSubscription(selectedUserId, assignUserModal.durationDays, assignUserModal.nameBn);
    onShowToast(`✅ ${targetUser.name}-কে "${assignUserModal.nameBn}" প্যাকেজ সফলভাবে দেওয়া হয়েছে!`);
    setAssignUserModal(null);
    setSelectedUserId('');
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">মোট সক্রিয় সাবস্ক্রিপশন</span>
            <div className="text-2xl font-black text-slate-900">{activeSubs.length} জন</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">পেইড প্রিমিয়াম গ্রাহক</span>
            <div className="text-2xl font-black text-teal-800">{paidSubs.length} জন</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">ফ্রি ট্রায়াল ইউজার</span>
            <div className="text-2xl font-black text-blue-800">{trialSubs.length} জন</div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900">সাবস্ক্রিপশন প্যাকেজসমূহ</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            সকল সাবস্ক্রিপশন টিয়ার ও অফার তালিকা। অ্যাডমিন সরাসরি যেকোনো ইউজারের অ্যাকাউন্টে প্যাকেজ অ্যাসাইন করতে পারবেন।
          </p>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEFAULT_PLANS.map((plan) => {
          const userCount = users.filter((u) => u.subscriptionPlan.includes(plan.name) || u.subscriptionPlan.includes(plan.nameBn)).length;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between relative shadow-xs hover:shadow-md ${
                plan.isPopular ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200'
              }`}
            >
              {plan.badge && (
                <span
                  className={`absolute -top-3 right-5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                    plan.isPopular ? 'bg-teal-600' : 'bg-slate-800'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-black text-slate-900">{plan.nameBn}</h4>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    ৳{formatMoney(plan.price)}
                  </span>
                  {plan.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      ৳{formatMoney(plan.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-semibold">
                    / {plan.durationDays} দিন
                  </span>
                </div>

                <div className="py-2 px-3 bg-slate-50 rounded-xl mb-4 text-xs text-slate-600 flex items-center justify-between">
                  <span>বর্তমান গ্রাহক:</span>
                  <span className="font-black text-teal-800">{userCount} জন</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssignUserModal(plan);
                  setSelectedUserId('');
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-[#004D40] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>ইউজারকে প্যাকেজ দিন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* MANUAL PACKAGE ASSIGNMENT MODAL */}
      {assignUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">ম্যানুয়াল প্যাকেজ অ্যাসাইন</h3>
                <p className="text-xs text-teal-800 font-bold mt-0.5">{assignUserModal.nameBn}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssignUserModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-teal-50 rounded-2xl text-xs text-teal-900">
              এই অপশনের মাধ্যমে আপনি কোনো পেমেন্ট গেটওয়ে ছাড়াও সরাসরি ইউজারের অ্যাকাউন্টে{' '}
              <span className="font-bold">+{assignUserModal.durationDays} দিন</span> মেয়াদ যুক্ত করতে পারবেন।
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                কোন ইউজারকে প্যাকেজ দিতে চান?
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">-- ইউজার নির্বাচন করুন --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.shopName}) - {u.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignUserModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleAssignPlan}
                className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                প্যাকেজ কার্যকর করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
