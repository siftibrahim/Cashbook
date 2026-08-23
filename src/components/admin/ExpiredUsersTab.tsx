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
    <div className="space-y-4">
      {/* Top Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setFilterType('expired')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            filterType === 'expired'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মেয়াদ উত্তীর্ণ</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-1">{expiredUsers.length} জন</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('expiring_soon')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            filterType === 'expiring_soon'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">১-৭ দিনে শেষ হবে</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-1">{expiringSoonUsers.length} জন</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('suspended')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            filterType === 'suspended'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">স্থগিত / ব্লকড</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-600 mt-1">{suspendedUsers.length} জন</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            filterType === 'all'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">সব মনিটরিং</span>
            <Filter className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-800 mt-1">
            {expiredUsers.length + expiringSoonUsers.length + suspendedUsers.length} জন
          </div>
        </button>
      </div>

      {/* Expired List */}
      <div className="space-y-2.5">
        {displayList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            এই ক্যাটাগরিতে কোনো ইউজার নেই!
          </div>
        ) : (
          displayList.map((user) => {
            const isExp = user.subscriptionExpiresAt <= now;
            const daysLeft = Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={user.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
                      isExp ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  >
                    {isExp ? <UserX className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 truncate">{user.name}</h4>
                      <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-teal-700" />
                        {user.shopName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                      <a
                        href={`tel:${user.phone}`}
                        className="font-mono text-teal-700 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {user.phone}
                      </a>
                      <span className="text-slate-400">•</span>
                      <span>প্যাকেজ: {user.subscriptionPlan}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      মেয়াদ শেষ হয়েছে:{' '}
                      <span className="font-bold text-rose-600">
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
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
