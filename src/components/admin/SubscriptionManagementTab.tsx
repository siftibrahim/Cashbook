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
  Search,
  UserCheck,
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
  const [userSearch, setUserSearch] = useState<string>('');

  const now = Date.now();
  const activeSubs = users.filter((u) => u.subscriptionExpiresAt > now);
  const trialSubs = users.filter((u) => u.subscriptionPlan.includes('ট্রায়াল'));
  const paidSubs = users.filter((u) => !u.subscriptionPlan.includes('ট্রায়াল') && u.subscriptionExpiresAt > now);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.shopName || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q)
    );
  });

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
    setUserSearch('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">মোট সক্রিয় সাবস্ক্রিপশন</span>
            <div className="text-2xl font-black text-white">{activeSubs.length} জন</div>
          </div>
        </div>

        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">পেইড প্রিমিয়াম গ্রাহক</span>
            <div className="text-2xl font-black text-teal-400">{paidSubs.length} জন</div>
          </div>
        </div>

        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400">ফ্রি ট্রায়াল ইউজার</span>
            <div className="text-2xl font-black text-indigo-300">{trialSubs.length} জন</div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">সাবস্ক্রিপশন প্যাকেজসমূহ</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সকল সাবস্ক্রিপশন টিয়ার ও অফার তালিকা। অ্যাডমিন সরাসরি যেকোনো ইউজারের অ্যাকাউন্টে প্যাকেজ অ্যাসাইন করতে পারবেন।
          </p>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DEFAULT_PLANS.map((plan) => {
          const userCount = users.filter((u) => u.subscriptionPlan.includes(plan.name) || u.subscriptionPlan.includes(plan.nameBn)).length;

          return (
            <div
              key={plan.id}
              className={`bg-[#101A2D] rounded-3xl p-6 border transition-all flex flex-col justify-between relative shadow-xl hover:shadow-2xl ${
                plan.isPopular ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.badge && (
                <span
                  className={`absolute -top-3 right-5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md ${
                    plan.isPopular ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-black text-white">{plan.nameBn}</h4>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-black text-white">
                    ৳{formatMoney(plan.price)}
                  </span>
                  {plan.originalPrice && (
                    <span className="text-xs text-slate-500 line-through">
                      ৳{formatMoney(plan.originalPrice)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-semibold">
                    / {plan.durationDays} দিন
                  </span>
                </div>

                <div className="py-2 px-3 bg-slate-900/90 rounded-xl mb-4 text-xs text-slate-400 flex items-center justify-between border border-slate-800">
                  <span>বর্তমান গ্রাহক:</span>
                  <span className="font-black text-teal-400">{userCount} জন</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
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
                  setUserSearch('');
                }}
                className="w-full py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 border border-slate-700 hover:border-teal-500 shadow-md cursor-pointer active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">ম্যানুয়াল প্যাকেজ অ্যাসাইন</h3>
                <p className="text-xs text-teal-400 font-bold mt-0.5">{assignUserModal.nameBn}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssignUserModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-teal-950/40 rounded-2xl border border-teal-500/30 text-xs text-teal-200">
              এই অপশনের মাধ্যমে আপনি কোনো পেমেন্ট গেটওয়ে ছাড়াও সরাসরি ইউজারের অ্যাকাউন্টে{' '}
              <span className="font-black text-teal-300">+{assignUserModal.durationDays} দিন</span> মেয়াদ যুক্ত করতে পারবেন।
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                কোন ইউজারকে প্যাকেজ দিতে চান? <span className="text-rose-400">*</span>
              </label>

              {selectedUser ? (
                <div className="p-3 bg-teal-950/50 border border-teal-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-white text-xs truncate">{selectedUser.name}</div>
                      <div className="text-[11px] text-teal-300 truncate">
                        {selectedUser.shopName} • {selectedUser.phone}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer shrink-0"
                  >
                    বদলান
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="নাম, দোকান বা ফোন নম্বর দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-xs">
                        কোনো ইউজার পাওয়া যায়নি
                      </div>
                    ) : (
                      filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setUserSearch('');
                          }}
                          className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-200 group-hover:text-white text-xs truncate">
                                {u.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {u.shopName} • {u.phone}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              u.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {u.status === 'active' ? 'Active' : 'Expired'}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssignUserModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={!selectedUserId}
                onClick={handleAssignPlan}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-teal-600/30 cursor-pointer disabled:opacity-50"
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

