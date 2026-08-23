import React from 'react';
import {
  AppUser,
  PaymentRecord,
  AdminNotification,
  Announcement,
  AdminActivityLog,
  AdminTab,
} from '../../types/adminTypes';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Store,
  CreditCard,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Bell,
  Megaphone,
  DownloadCloud,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface AdminDashboardOverviewProps {
  users: AppUser[];
  payments: PaymentRecord[];
  notifications: AdminNotification[];
  announcements: Announcement[];
  logs: AdminActivityLog[];
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

  return (
    <div className="space-y-6">
      {/* Pending Actions Banner if any */}
      {pendingPayments.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {pendingPayments.length} টি নতুন সাবস্ক্রিপশন পেমেন্ট অনুমোদনের অপেক্ষায়!
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                বিকাশ/নগদ স্টেটমেন্ট চেক করে দ্রুত ইউজারদের অ্যাকাউন্ট সচল করুন।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <span>পেমেন্ট যাচাই করুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. মোট User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট ইউজার</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalUsers}</span>
            <span className="text-[11px] font-bold text-blue-600 flex items-center">
              সব দেখুন <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">সকল রেজিস্টার্ড অ্যাকাউন্ট</p>
        </div>

        {/* 2. Active User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">সক্রিয় ইউজার</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{activeUsers}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% অ্যাক্টিভ
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">নিয়মিত হিসাব ব্যবহারকারী</p>
        </div>

        {/* 3. Expired User */}
        <div
          onClick={() => onNavigateTab('expired')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মেয়াদোত্তীর্ণ ইউজার</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{expiredUsers}</span>
            <span className="text-[11px] font-bold text-rose-600 flex items-center">
              রিনিউ পাঠান <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">প্যাকেজের মেয়াদ শেষ হয়েছে</p>
        </div>

        {/* 4. Suspended User */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">স্থগিত (Suspended)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-600">{suspendedUsers}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              ব্লকড
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">অ্যাডমিন কর্তৃক সাময়িক বন্ধ</p>
        </div>

        {/* 5. মোট Shop */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট শপ ও প্রতিষ্ঠান</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalShops}</span>
            <span className="text-[11px] font-bold text-teal-700">দোকান</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ডিজিটাল খাতা ব্যবহারকারী শপ</p>
        </div>

        {/* 6. Active Subscription */}
        <div
          onClick={() => onNavigateTab('subscriptions')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">চলমান সাবস্ক্রিপশন</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{activeSubscriptions}</span>
            <span className="text-[11px] font-bold text-emerald-700">সচল</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">পেইড ও ট্রায়াল প্ল্যান সক্রিয়</p>
        </div>

        {/* 7. Expired Subscription */}
        <div
          onClick={() => onNavigateTab('expired')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মেয়াদ শেষ সাবস্ক্রিপশন</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">{expiredSubscriptions}</span>
            <span className="text-[11px] font-bold text-amber-700">মেয়াদ উত্তীর্ণ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">রিনিউয়াল অফার পাঠানোর উপযুক্ত</p>
        </div>

        {/* 8. মোট Revenue */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-gradient-to-br from-[#004D40] to-[#00695C] text-white p-4 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-100">মোট রেভিনিউ / আয়</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black tracking-tight">৳{formatMoney(totalRevenue)}</span>
            <span className="text-[11px] font-bold text-teal-200">
              {approvedPayments.length} টি পেমেন্ট
            </span>
          </div>
          <p className="text-[11px] text-teal-100/90 mt-1">অনুমোদিত সাবস্ক্রিপশন ফি</p>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
          কুইক অ্যাডমিন অ্যাকশন
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="p-3 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 rounded-xl text-left transition group cursor-pointer"
          >
            <Users className="w-5 h-5 text-teal-700 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-800">ইউজার তালিকা</span>
            <span className="text-[11px] text-slate-500">স্ট্যাটাস ও তথ্য এডিট</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="p-3 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 rounded-xl text-left transition group cursor-pointer"
          >
            <CreditCard className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-800">পেমেন্ট ভেরিফাই</span>
            <span className="text-[11px] text-slate-500">
              {pendingPayments.length} টি পেন্ডিং
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('notifications')}
            className="p-3 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 rounded-xl text-left transition group cursor-pointer"
          >
            <Bell className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-800">নোটিফিকেশন পাঠান</span>
            <span className="text-[11px] text-slate-500">সকল বা নির্দিষ্ট ইউজার</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('announcements')}
            className="p-3 bg-slate-50 hover:bg-teal-50/70 border border-slate-200 rounded-xl text-left transition group cursor-pointer"
          >
            <Megaphone className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="block text-xs font-bold text-slate-800">ঘোষণা / নোটিশ</span>
            <span className="text-[11px] text-slate-500">হোম ব্যানার ও পপআপ</span>
          </button>
        </div>
      </div>

      {/* Two Columns: Recent Payments & Recent Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Payments Box */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-800">সাম্প্রতিক পেমেন্ট রিকোয়েস্ট</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 transition cursor-pointer"
              >
                সব পেমেন্ট ({payments.length})
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">কোনো পেমেন্ট রেকর্ড নেই</div>
            ) : (
              <div className="space-y-2.5">
                {payments.slice(0, 4).map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate">{pay.shopName}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                            pay.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pay.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pay.status === 'approved'
                            ? 'অনুমোদিত'
                            : pay.status === 'pending'
                            ? 'পেন্ডিং'
                            : 'বাতিল'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        TrxID: <span className="font-mono font-semibold text-slate-700">{pay.trxId}</span> ({pay.paymentMethod})
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900 text-sm">৳{formatMoney(pay.amount)}</div>
                      {pay.status === 'pending' ? (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => onApprovePayment(pay.id)}
                            title="অনুমোদন করুন"
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectPayment(pay.id)}
                            title="বাতিল করুন"
                            className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
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

        {/* Recent Admin Activity Logs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-800">অ্যাডমিন অ্যাক্টিভিটি হিস্ট্রি</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('activity_logs')}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 transition cursor-pointer"
              >
                সম্পূর্ণ অডিট লগ ({logs.length})
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">কোনো অ্যাক্টিভিটি রেকর্ড নেই</div>
            ) : (
              <div className="space-y-2.5">
                {logs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-[11px] px-1.5 py-0.5 rounded bg-slate-200/80">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 text-[11.5px] leading-relaxed">
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
