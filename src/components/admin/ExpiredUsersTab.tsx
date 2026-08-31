import React, { useState } from 'react';
import { AppUser } from '../../types/adminTypes';
import {
  Clock,
  AlertTriangle,
  UserX,
  Send,
  Calendar,
  Phone,
  Store,
  Sparkles,
  CheckCircle2,
  Filter,
  CreditCard,
  Building2,
  Users,
} from 'lucide-react';

interface ExpiredUsersTabProps {
  users: AppUser[];
  onExtendSubscription: (userId: string, days: number, planName?: string) => Promise<void>;
  onSendNotificationToUser: (userId: string, title: string, message: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const ExpiredUsersTab: React.FC<ExpiredUsersTabProps> = ({
  users,
  onExtendSubscription,
  onSendNotificationToUser,
  onShowToast,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expired' | 'expiring_soon' | 'suspended'>('expired');

  const now = Date.now();
  const ONE_DAY = 86400000;

  const expiredUsers = users.filter((u) => u.subscriptionExpiresAt <= now || u.status === 'expired');
  const expiringSoonUsers = users.filter(
    (u) => u.subscriptionExpiresAt > now && u.subscriptionExpiresAt <= now + 7 * ONE_DAY && u.status === 'active'
  );
  const suspendedUsers = users.filter((u) => u.status === 'suspended');

  const displayList = users.filter((u) => {
    if (filterType === 'expired') return u.subscriptionExpiresAt <= now || u.status === 'expired';
    if (filterType === 'expiring_soon') return u.subscriptionExpiresAt > now && u.subscriptionExpiresAt <= now + 7 * ONE_DAY;
    if (filterType === 'suspended') return u.status === 'suspended';
    return u.subscriptionExpiresAt <= now || u.subscriptionExpiresAt <= now + 7 * ONE_DAY || u.status === 'suspended';
  });

  const handleSendReminder = async (user: AppUser) => {
    const isExp = user.subscriptionExpiresAt <= now;
    const title = isExp ? '⚠️ সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে' : '⏳ সাবস্ক্রিপশনের মেয়াদ দ্রুত শেষ হচ্ছে';
    const msg = `আসসালামু আলাইকুম ${user.name} ভাই, ${user.shopName}-এর খাতা অ্যাপের সাবস্ক্রিপশন মেয়াদ ${
      isExp ? 'শেষ হয়ে গেছে' : 'শীঘ্রই শেষ হতে চলেছে'
    }। নিরবচ্ছিন্ন সেবা ও হিসাব সুরক্ষার জন্য এখনই রিনিউ করুন। ধন্যবাদ।`;

    await onSendNotificationToUser(user.id, title, msg);
    onShowToast(`✅ ${user.name}-কে রিনিউয়াল নোটিফিকেশন পাঠানো হয়েছে!`);
  };

  return (
    <div className="space-y-5 text-slate-100 font-sans pb-8">
      {/* Top Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterType('expired')}
          className={`p-4 rounded-3xl border text-left transition cursor-pointer shadow-lg ${
            filterType === 'expired'
              ? 'bg-gradient-to-br from-rose-950/80 to-[#101A2D] border-rose-500/60 ring-2 ring-rose-500/20'
              : 'bg-[#101A2D] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">মেয়াদ উত্তীর্ণ</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{expiredUsers.length} জন</div>
          <p className="text-[10.5px] text-rose-300/80 mt-1 font-semibold">প্যাকেজ মেয়াদ শেষ</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('expiring_soon')}
          className={`p-4 rounded-3xl border text-left transition cursor-pointer shadow-lg ${
            filterType === 'expiring_soon'
              ? 'bg-gradient-to-br from-amber-950/80 to-[#101A2D] border-amber-500/60 ring-2 ring-amber-500/20'
              : 'bg-[#101A2D] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">১-৭ দিনে শেষ হবে</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{expiringSoonUsers.length} জন</div>
          <p className="text-[10.5px] text-amber-300/80 mt-1 font-semibold">তাগাদা পাঠানো জরুরি</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('suspended')}
          className={`p-4 rounded-3xl border text-left transition cursor-pointer shadow-lg ${
            filterType === 'suspended'
              ? 'bg-gradient-to-br from-purple-950/80 to-[#101A2D] border-purple-500/60 ring-2 ring-purple-500/20'
              : 'bg-[#101A2D] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400">স্থগিত / ব্লকড</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-400 mt-2">{suspendedUsers.length} জন</div>
          <p className="text-[10.5px] text-purple-300/80 mt-1 font-semibold">অ্যাডমিন কর্তৃক বন্ধ</p>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`p-4 rounded-3xl border text-left transition cursor-pointer shadow-lg ${
            filterType === 'all'
              ? 'bg-gradient-to-br from-indigo-950/80 to-[#101A2D] border-indigo-500/60 ring-2 ring-indigo-500/20'
              : 'bg-[#101A2D] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400">সব মনিটরিং</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {expiredUsers.length + expiringSoonUsers.length + suspendedUsers.length} জন
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">মোট ফলোআপ তালিকা</p>
        </button>
      </div>

      {/* Expired List */}
      <div className="space-y-3.5">
        {displayList.length === 0 ? (
          <div className="text-center py-14 bg-[#101A2D] rounded-3xl border border-dashed border-slate-800 text-slate-400 text-xs">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            এই ফিল্টারে বর্তমানে কোনো ইউজার নেই!
          </div>
        ) : (
          displayList.map((user) => {
            const isExp = user.subscriptionExpiresAt <= now;
            const daysLeft = Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={user.id}
                className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-indigo-500/40 transition"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-md ${
                      isExp ? 'bg-gradient-to-tr from-rose-600 to-rose-500' : 'bg-gradient-to-tr from-amber-600 to-amber-500'
                    }`}
                  >
                    {isExp ? <UserX className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-white truncate">{user.name}</h4>
                      <span className="text-xs text-indigo-300 font-bold flex items-center gap-1 bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                        <Store className="w-3 h-3 text-indigo-400" />
                        {user.shopName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <a
                        href={`tel:${user.phone}`}
                        className="font-mono text-teal-300 hover:underline flex items-center gap-1 font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800"
                      >
                        <Phone className="w-3 h-3 text-teal-400" />
                        {user.phone}
                      </a>
                      <span className="text-slate-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-300 font-semibold">
                        {user.subscriptionPlan}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 pt-0.5">
                      মেয়াদ শেষ:{' '}
                      <span className={`font-black ${isExp ? 'text-rose-400' : 'text-amber-300'}`}>
                        {new Date(user.subscriptionExpiresAt).toLocaleDateString('bn-BD')}
                      </span>{' '}
                      ({isExp ? 'ইতিমধ্যে শেষ' : `${daysLeft} দিন বাকি`})
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleSendReminder(user)}
                    className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>রিমাইন্ডার পাঠান</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await onExtendSubscription(user.id, 7);
                      onShowToast(`✅ ${user.name}-কে +৭ দিন গ্রেস পিরিয়ড দেওয়া হয়েছে!`);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-md shadow-emerald-600/25 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+৭ দিন ছাড়</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
