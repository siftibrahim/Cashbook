import React from 'react';
import {
  AppUser,
  PaymentRecord,
  AdminNotification,
  Announcement,
  AdminActivityLog,
  AdminTab,
  StaffMember,
  SupportThread,
} from '../../types/adminTypes';
import {
  Users,
  UserCheck,
  UserX,
  Store,
  Clock,
  Zap,
  AlertTriangle,
  Wallet,
  CreditCard,
  Headphones,
  Bell,
  Megaphone,
  DownloadCloud,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  UserCog,
  Shield,
  Plus,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface AdminDashboardOverviewProps {
  users: AppUser[];
  payments: PaymentRecord[];
  notifications: AdminNotification[];
  announcements: Announcement[];
  logs: AdminActivityLog[];
  staffList?: StaffMember[];
  supportThreads?: SupportThread[];
  isSuperAdmin?: boolean;
  onNavigateTab: (tab: AdminTab) => void;
  onApprovePayment: (paymentId: string) => void;
  onRejectPayment: (paymentId: string) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  users,
  payments,
  notifications,
  announcements,
  logs,
  staffList = [],
  supportThreads = [],
  isSuperAdmin = true,
  onNavigateTab,
  onApprovePayment,
  onRejectPayment,
}) => {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const expiredUsers = users.filter((u) => u.status === 'expired').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const totalShops = users.filter((u) => u.shopName).length;

  const now = Date.now();
  const activeSubscriptions = users.filter(
    (u) => u.subscriptionExpiresAt > now && u.status === 'active'
  ).length;
  const expiredSubscriptions = users.filter(
    (u) => u.subscriptionExpiresAt <= now || u.status === 'expired'
  ).length;

  const approvedPayments = payments.filter((p) => p.status === 'approved');
  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const totalRevenue = approvedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const activeStaffCount = staffList.filter((s) => s.status === 'active').length;
  const unreadSupportCount = supportThreads.reduce(
    (acc, t) => acc + (t.unreadAdminCount || 0),
    0
  );

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* ⚠️ Urgent Pending Payment Alert Banner */}
      {pendingPayments.length > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-slate-900 border border-amber-500/40 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-amber-200">
                  {pendingPayments.length} টি নতুন সাবস্ক্রিপশন পেমেন্ট অনুমোদনের অপেক্ষায়!
                </h4>
                <span className="px-2 py-0.5 bg-amber-500/30 text-amber-300 text-[10px] font-black rounded-full border border-amber-500/30">
                  জরুরী
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                বিকাশ/নগদ স্টেটমেন্ট মিলিয়ে সরাসরি অনুমোদন অথবা বাতিল করুন।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer shrink-0"
          >
            <span>পেমেন্ট পেইজে যান</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📊 8 Modern Sleek Metric KPI Cards (Matching screenshot precisely) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: মোট User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-indigo-300">মোট User</span>
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {totalUsers}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">রেজিস্টার্ড মোট ইউজার</p>
        </div>

        {/* Card 2: Active User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-emerald-400">Active User</span>
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight">
              {activeUsers}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">সক্রিয় সাবস্ক্রিপশনসহ ইউজার</p>
        </div>

        {/* Card 3: Expired User */}
        <div
          onClick={() => onNavigateTab('expired')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-amber-400">Expired User</span>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-amber-400 tracking-tight">
              {expiredUsers}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">মেয়াদোত্তীর্ণ ইউজার</p>
        </div>

        {/* Card 4: Suspended User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-rose-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-rose-400">Suspended User</span>
            <UserX className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-rose-400 tracking-tight">
              {suspendedUsers}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">ব্লকড / স্থগিত ইউজার</p>
        </div>

        {/* Card 5: মোট Shop */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-cyan-400">মোট Shop</span>
            <Store className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-cyan-400 tracking-tight">
              {totalShops}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">রেজিস্টার্ড মোট দোকান</p>
        </div>

        {/* Card 6: Active Subscription */}
        <div
          onClick={() => onNavigateTab('subscriptions')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-teal-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-teal-400">Active Subscription</span>
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-teal-400 tracking-tight">
              {activeSubscriptions}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">চলতি সক্রিয় প্যাকেজ</p>
        </div>

        {/* Card 7: Expired Subscription */}
        <div
          onClick={() => onNavigateTab('expired')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-amber-400">Expired Subscription</span>
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-amber-400 tracking-tight">
              {expiredSubscriptions}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">নবায়ন প্রয়োজন</p>
        </div>

        {/* Card 8: মোট Revenue */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-[#101A2D] hover:bg-[#15233D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-emerald-400">মোট Revenue</span>
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="my-3">
            <span className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight">
              ৳ {formatMoney(totalRevenue)}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">অনুমোদিত পেমেন্ট</p>
        </div>
      </div>

      {/* 👑 Staff Management Spotlight Widget */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-br from-[#121B33] via-[#10182C] to-[#0A0F1D] rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/10">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    স্টাফ ম্যানেজমেন্ট ও অ্যাক্সেস কন্ট্রোল
                  </h3>
                  <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-black rounded-full">
                    সুপার অ্যাডমিন এক্সক্লুসিভ
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  কর্মচারীদের আলাদা ইমেইল/পাসওয়ার্ড ও নির্দিষ্ট পারমিশন দিয়ে সাব-অ্যাডমিন হিসেবে নিযুক্ত করুন।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigateTab('staff_management')}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white text-xs font-black rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন স্টাফ যোগ করুন</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('staff_management')}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <span>সব স্টাফ ({staffList.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Staff List Preview */}
          <div className="mt-4">
            {staffList.length === 0 ? (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                বর্তমানে কোনো স্টাফ নিযুক্ত করা নেই। &quot;নতুন স্টাফ যোগ করুন&quot; বাটনে ক্লিক করে কর্মচারীর অ্যাকাউন্ট তৈরি করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {staffList.slice(0, 3).map((staff) => (
                  <div
                    key={staff.id}
                    onClick={() => onNavigateTab('staff_management')}
                    className="p-3.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate group-hover:text-indigo-300">
                          {staff.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            staff.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {staff.status === 'active' ? 'সক্রিয়' : 'স্থগিত'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {staff.email} • {staff.phone}
                      </div>
                      <div className="text-[10px] text-indigo-300/80 mt-0.5">
                        {staff.permissions?.length || 0} টি অনুমোদিত পারমিশন
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚡ Quick Navigation Grid */}
      <div className="bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800/90 shadow-lg">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
          দ্রুত কন্ট্রোল ও নেভিগেশন
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="p-4 bg-slate-900/90 hover:bg-[#15233D] border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-left transition group cursor-pointer"
          >
            <Users className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-white">ইউজার তালিকা</span>
            <span className="text-[11px] text-slate-400">{totalUsers} টি অ্যাকাউন্ট</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => onNavigateTab('staff_management')}
              className="p-4 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 hover:border-indigo-400 rounded-2xl text-left transition group cursor-pointer"
            >
              <UserCog className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="block text-xs font-bold text-indigo-200">স্টাফ ম্যানেজমেন্ট</span>
              <span className="text-[11px] text-indigo-400 font-semibold">{staffList.length} জন কর্মী</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="p-4 bg-slate-900/90 hover:bg-[#15233D] border border-slate-800 hover:border-amber-500/40 rounded-2xl text-left transition group cursor-pointer"
          >
            <CreditCard className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-white">পেমেন্ট রিকোয়েস্ট</span>
            <span className="text-[11px] text-amber-400 font-semibold">{pendingPayments.length} টি পেন্ডিং</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('support')}
            className="p-4 bg-slate-900/90 hover:bg-[#15233D] border border-slate-800 hover:border-teal-500/40 rounded-2xl text-left transition group cursor-pointer"
          >
            <Headphones className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-white">সাপোর্ট হেল্পডেস্ক</span>
            <span className="text-[11px] text-slate-400">{unreadSupportCount} টি আনরিড</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('notifications')}
            className="p-4 bg-slate-900/90 hover:bg-[#15233D] border border-slate-800 hover:border-rose-500/40 rounded-2xl text-left transition group cursor-pointer"
          >
            <Bell className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-white">পুশ নোটিফিকেশন</span>
            <span className="text-[11px] text-slate-400">বার্তা প্রেরণ</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="p-4 bg-slate-900/90 hover:bg-[#15233D] border border-slate-800 hover:border-purple-500/40 rounded-2xl text-left transition group cursor-pointer"
          >
            <Megaphone className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-white">নোটিশ ও ব্যানার</span>
            <span className="text-[11px] text-slate-400">অ্যাপের নোটিশ</span>
          </button>
        </div>
      </div>

      {/* Two Columns: Recent Payments & Activity Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 💳 Recent / Pending Payments Box */}
        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">সাম্প্রতিক পেমেন্ট রিকোয়েস্ট</h3>
                  <p className="text-[11px] text-slate-400">বিকাশ/নগদ/রকেট ট্রানজেকশন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
              >
                <span>সব দেখুন ({payments.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</div>
            ) : (
              <div className="space-y-2.5">
                {payments.slice(0, 4).map((pay) => (
                  <div
                    key={pay.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                      pay.status === 'pending'
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white truncate">{pay.shopName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            pay.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : pay.status === 'pending'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pay.status === 'approved'
                            ? 'অনুমোদিত'
                            : pay.status === 'pending'
                            ? 'পেন্ডিং'
                            : 'বাতিল'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>
                          মেথড: <b className="text-slate-200 uppercase">{pay.paymentMethod}</b>
                        </span>
                        <span>•</span>
                        <span>
                          TrxID: <b className="font-mono text-indigo-300">{pay.trxId}</b>
                        </span>
                        <span>•</span>
                        <span>{pay.senderPhone}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-white text-sm sm:text-base">
                        ৳{formatMoney(pay.amount)}
                      </div>
                      {pay.status === 'pending' ? (
                        <div className="flex items-center gap-1 mt-1.5">
                          <button
                            type="button"
                            onClick={() => onApprovePayment(pay.id)}
                            title="অনুমোদন করুন"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>অনুমোদন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectPayment(pay.id)}
                            title="বাতিল করুন"
                            className="p-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition cursor-pointer border border-rose-500/30"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {new Date(pay.createdAt).toLocaleDateString('bn-BD')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 📋 Live Audit Logs */}
        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">সিস্টেম ও অডিট লগ</h3>
                  <p className="text-[11px] text-slate-400">অ্যাডমিন ও স্টাফ কার্যকলাপ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('activity_logs')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
              >
                <span>সব দেখুন ({logs.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি</div>
            ) : (
              <div className="space-y-2.5">
                {logs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-indigo-300 text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30 truncate">
                          {log.action}
                        </span>
                        {log.adminEmail && (
                          <span className="text-[10px] text-slate-400 truncate">
                            by {log.adminEmail}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1.5 text-[11.5px] leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
