import React, { useState } from 'react';
import { AppUser, UserStatus, UserRole } from '../../types/adminTypes';
import {
  Search,
  Plus,
  UserCheck,
  UserX,
  ShieldAlert,
  Edit2,
  Trash2,
  Key,
  Calendar,
  Phone,
  Mail,
  Store,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Database,
  RefreshCw,
  AlertTriangle,
  Plug,
  Bell,
  Send,
  Users,
  Shield,
  CreditCard,
  Building2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface UserManagementTabProps {
  users: AppUser[];
  dbStatus?: { connected: boolean; provider: string; message: string; userCount?: number; databaseName?: string } | null;
  onOpenDbModal?: () => void;
  onRefreshDb?: () => void;
  onSaveUser: (user: AppUser) => Promise<void>;
  onUpdateStatus: (userId: string, status: UserStatus, note?: string) => Promise<void>;
  onExtendSubscription: (userId: string, days: number, planName?: string) => Promise<void>;
  onSendNotificationToUser?: (userId: string, title: string, message: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (email: string, userName?: string) => Promise<{ success: boolean; message: string }>;
  onShowToast: (msg: string) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  dbStatus,
  onOpenDbModal,
  onRefreshDb,
  onSaveUser,
  onUpdateStatus,
  onExtendSubscription,
  onSendNotificationToUser,
  onDeleteUser,
  onResetPassword,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modals
  const [viewUser, setViewUser] = useState<AppUser | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [extendModalUser, setExtendModalUser] = useState<AppUser | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AppUser | null>(null);

  // Direct Notification to user Modal
  const [notifUser, setNotifUser] = useState<AppUser | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // New / Edit User Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({});

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.shopName.toLowerCase().includes(q) ||
      (u.businessType && u.businessType.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const activeCount = users.filter((u) => u.status === 'active').length;
  const expiredCount = users.filter((u) => u.status === 'expired' || (u.subscriptionExpiresAt && u.subscriptionExpiresAt <= Date.now())).length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;
  const pendingCount = users.filter((u) => u.status === 'pending').length;

  const openAddUser = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      shopName: '',
      businessType: 'মুদি দোকান',
      address: '',
      role: 'user',
      status: 'active',
      subscriptionPlan: 'ফ্রি ট্রায়াল (১৪ দিন)',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: Date.now() + 14 * 86400000,
      totalCustomers: 0,
      totalTransactions: 0,
      notes: '',
    });
    setIsAddUserOpen(true);
  };

  const openEditUser = (u: AppUser) => {
    setEditingUser(u);
    setFormData({ ...u });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.phone?.trim() || !formData.shopName?.trim()) {
      onShowToast('অনুগ্রহ করে নাম, ফোন এবং দোকানের নাম প্রদান করুন');
      return;
    }

    const finalUser: AppUser = {
      id: editingUser ? editingUser.id : 'user_' + Date.now(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email?.trim().toLowerCase() || '',
      shopName: formData.shopName.trim(),
      businessType: formData.businessType || 'সাধারণ দোকান',
      address: formData.address?.trim() || '',
      role: formData.role || 'user',
      status: formData.status || 'active',
      subscriptionPlan: formData.subscriptionPlan || 'ফ্রি ট্রায়াল (১৪ দিন)',
      subscriptionStatus: formData.subscriptionStatus || 'active',
      subscriptionExpiresAt: formData.subscriptionExpiresAt || Date.now() + 14 * 86400000,
      registeredAt: formData.registeredAt || Date.now(),
      lastActiveAt: formData.lastActiveAt || Date.now(),
      totalCustomers: formData.totalCustomers || 0,
      totalTransactions: formData.totalTransactions || 0,
      notes: formData.notes?.trim() || '',
      deviceInfo: formData.deviceInfo || 'Web App',
      appVersion: formData.appVersion || '2.4.0',
    };

    await onSaveUser(finalUser);
    setIsAddUserOpen(false);
    setEditingUser(null);
    onShowToast(`✅ ইউজার "${finalUser.name}" সফলভাবে সংরক্ষিত হয়েছে!`);
  };

  const handlePasswordResetClick = async (u: AppUser) => {
    if (!u.email) {
      onShowToast('ইউজারের কোনো ইমেইল ঠিকানা নেই');
      return;
    }
    const res = await onResetPassword(u.email, u.name);
    onShowToast(res.message);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} কপি করা হয়েছে!`);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* 1. Top Metrics KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 sm:p-5 rounded-3xl border transition cursor-pointer shadow-lg ${
            statusFilter === 'all'
              ? 'bg-gradient-to-br from-indigo-950/80 to-[#101A2D] border-indigo-500/60 ring-2 ring-indigo-500/20'
              : 'bg-[#101A2D] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">মোট গ্রাহক ইউজার</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">{users.length}</span>
            <span className="text-xs font-bold text-slate-400">জন</span>
          </div>
          <p className="text-[11px] text-indigo-300/80 mt-1 font-semibold">সকল রেজিস্টার্ড দোকানদার</p>
        </div>

        {/* Active Users */}
        <div
          onClick={() => setStatusFilter('active')}
          className={`p-4 sm:p-5 rounded-3xl border transition cursor-pointer shadow-lg ${
            statusFilter === 'active'
              ? 'bg-gradient-to-br from-emerald-950/80 to-[#101A2D] border-emerald-500/60 ring-2 ring-emerald-500/20'
              : 'bg-[#101A2D] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">সক্রিয় (Active)</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">{activeCount}</span>
            <span className="text-xs font-bold text-slate-400">জন</span>
          </div>
          <p className="text-[11px] text-emerald-300/80 mt-1 font-semibold">নিয়মিত হিসাব ব্যবহারকারী</p>
        </div>

        {/* Expired Users */}
        <div
          onClick={() => setStatusFilter('expired')}
          className={`p-4 sm:p-5 rounded-3xl border transition cursor-pointer shadow-lg ${
            statusFilter === 'expired'
              ? 'bg-gradient-to-br from-amber-950/80 to-[#101A2D] border-amber-500/60 ring-2 ring-amber-500/20'
              : 'bg-[#101A2D] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">মেয়াদ শেষ (Expired)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">{expiredCount}</span>
            <span className="text-xs font-bold text-slate-400">জন</span>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1 font-semibold">প্যাকেজ রিনিউ প্রয়োজন</p>
        </div>

        {/* Suspended Users */}
        <div
          onClick={() => setStatusFilter('suspended')}
          className={`p-4 sm:p-5 rounded-3xl border transition cursor-pointer shadow-lg ${
            statusFilter === 'suspended'
              ? 'bg-gradient-to-br from-rose-950/80 to-[#101A2D] border-rose-500/60 ring-2 ring-rose-500/20'
              : 'bg-[#101A2D] border-slate-800/90 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">স্থগিত / ব্লকড</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">{suspendedCount}</span>
            <span className="text-xs font-bold text-slate-400">জন</span>
          </div>
          <p className="text-[11px] text-rose-300/80 mt-1 font-semibold">অ্যাডমিন কর্তৃক সাময়িক বন্ধ</p>
        </div>
      </div>

      {/* 2. Database Connection Banner */}
      {dbStatus && (
        <div
          className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
            dbStatus.connected
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                dbStatus.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {dbStatus.connected ? '🟢 Neon PostgreSQL ডাটাবেজ সংযুক্ত' : '⚠️ Neon ডাটাবেজ কানেক্ট করা নেই'}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-semibold">
                  {dbStatus.provider}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {dbStatus.connected
                  ? `ডাটাবেজ: ${dbStatus.databaseName || 'neondb'} • সর্বমোট সংরক্ষিত ইউজার: ${users.length} জন`
                  : 'console.neon.tech-এ থাকা আপনার ডাটাবেজ কানেকশন স্ট্রিং সেট করে লাইভ সিঙ্ক করুন।'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onRefreshDb && (
              <button
                type="button"
                onClick={onRefreshDb}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="ডাটাবেজ রিফ্রেশ"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>রিফ্রেশ</span>
              </button>
            )}
            {onOpenDbModal && (
              <button
                type="button"
                onClick={onOpenDbModal}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
                  dbStatus.connected
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30'
                }`}
              >
                <Plug className="w-3.5 h-3.5" />
                <span>{dbStatus.connected ? 'কানেকশন সেটিংস' : '🔌 Neon কানেক্ট করুন'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Search, Status Filter Pills & Add User CTA */}
      <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ইউজার নাম, ফোন নম্বর, ইমেইল অথবা দোকানের নাম দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">সকল রোল</option>
              <option value="user">সাধারণ ইউজার</option>
              <option value="admin">ম্যানেজার / অ্যাডমিন</option>
              <option value="super_admin">সুপার অ্যাডমিন</option>
            </select>

            <button
              type="button"
              onClick={openAddUser}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white text-xs font-black rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ইউজার যোগ</span>
            </button>
          </div>
        </div>

        {/* Filter Quick Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 text-[11px] font-bold shrink-0">ফিল্টার:</span>
          {[
            { id: 'all', label: 'সব ইউজার', count: users.length },
            { id: 'active', label: 'সক্রিয় (Active)', count: activeCount, color: 'text-emerald-400' },
            { id: 'expired', label: 'মেয়াদ শেষ (Expired)', count: expiredCount, color: 'text-amber-400' },
            { id: 'suspended', label: 'স্থগিত (Suspended)', count: suspendedCount, color: 'text-rose-400' },
            { id: 'pending', label: 'পেন্ডিং', count: pendingCount, color: 'text-slate-400' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md bg-slate-950/60 text-[10px] ${f.color || 'text-slate-300'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Filter Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-semibold">
        <span>
          প্রদর্শিত হচ্ছে: <strong className="text-white">{filteredUsers.length}</strong> জন ইউজার (মোট {users.length} জনের মধ্যে)
        </span>
        {searchQuery && (
          <span className="text-indigo-300">
            অনুসন্ধান: "{searchQuery}"
          </span>
        )}
      </div>

      {/* 5. Neatly Organized User Card List */}
      <div className="space-y-3.5">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-[#101A2D] rounded-3xl border border-dashed border-slate-800 text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">কোনো ইউজার পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500 max-w-sm">
              আপনার অনুসন্ধানের সাথে মিল রেখে কোনো ইউজার রেকর্ড নেই। ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExp = user.subscriptionExpiresAt ? user.subscriptionExpiresAt <= Date.now() : false;
            const daysLeft = user.subscriptionExpiresAt
              ? Math.ceil((user.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24))
              : 0;

            return (
              <div
                key={user.id}
                className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-xl hover:border-indigo-500/50 hover:shadow-indigo-500/5 transition-all flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
              >
                {/* Left Section: User Identity & Business Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* User Initial Avatar Badge with Status Dot */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg ${
                        user.role === 'super_admin'
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 ring-2 ring-amber-400/40'
                          : user.status === 'active'
                          ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 ring-2 ring-indigo-500/30'
                          : user.status === 'suspended'
                          ? 'bg-gradient-to-tr from-purple-700 to-purple-600 ring-2 ring-purple-500/30'
                          : 'bg-gradient-to-tr from-rose-700 to-rose-600 ring-2 ring-rose-500/30'
                      }`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Status Indicator Dot */}
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#101A2D] flex items-center justify-center ${
                        user.status === 'active'
                          ? 'bg-emerald-500'
                          : user.status === 'expired'
                          ? 'bg-amber-500'
                          : user.status === 'suspended'
                          ? 'bg-purple-500'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Info Column */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Line 1: User Name & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-white truncate">{user.name}</h4>

                      {user.role === 'super_admin' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs">
                          <span>👑 সুপার অ্যাডমিন</span>
                        </span>
                      )}

                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          ম্যানেজার
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs ${
                          user.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : user.status === 'expired'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : user.status === 'suspended'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {user.status === 'active'
                          ? '● সক্রিয় (Active)'
                          : user.status === 'expired'
                          ? '▲ মেয়াদ শেষ'
                          : user.status === 'suspended'
                          ? '✕ স্থগিত'
                          : 'পেন্ডিং'}
                      </span>
                    </div>

                    {/* Line 2: Shop Name, Business Type & Location */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-indigo-300 bg-indigo-950/40 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                        <Store className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{user.shopName}</span>
                      </span>

                      {user.businessType && (
                        <span className="text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {user.businessType}
                        </span>
                      )}

                      {user.address && (
                        <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{user.address}</span>
                        </span>
                      )}
                    </div>

                    {/* Line 3: Contact Details (Mobile & Email) */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-0.5">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(user.phone, 'ফোন নম্বর')}
                        className="flex items-center gap-1 font-mono font-bold text-slate-200 bg-slate-900/90 hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/80 transition cursor-pointer"
                        title="ফোন নম্বর কপি করুন"
                      >
                        <Phone className="w-3 h-3 text-teal-400" />
                        <span>{user.phone}</span>
                        <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                      </button>

                      {user.email && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(user.email, 'ইমেইল')}
                          className="flex items-center gap-1 text-slate-300 bg-slate-900/90 hover:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/80 transition cursor-pointer"
                          title="ইমেইল কপি করুন"
                        >
                          <Mail className="w-3 h-3 text-indigo-400" />
                          <span>{user.email}</span>
                          <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                        </button>
                      )}
                    </div>

                    {/* Line 4: Subscription Package Pill & Countdown */}
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className="font-black text-amber-300 bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-amber-400" />
                        <span>{user.subscriptionPlan || 'ফ্রি ট্রায়াল'}</span>
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-lg font-bold border ${
                          isExp
                            ? 'bg-rose-950/50 text-rose-400 border-rose-500/40'
                            : daysLeft <= 3
                            ? 'bg-amber-950/50 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        মেয়াদ:{' '}
                        {user.subscriptionExpiresAt
                          ? new Date(user.subscriptionExpiresAt).toLocaleDateString('bn-BD')
                          : 'অনির্দিষ্ট'}{' '}
                        (
                        {isExp
                          ? 'মেয়াদোত্তীর্ণ'
                          : daysLeft === 0
                          ? 'আজ শেষ'
                          : `${daysLeft} দিন বাকি`}
                        )
                      </span>

                      <span className="text-[11px] text-slate-400">
                        • কাস্টমার: <strong className="text-white">{user.totalCustomers || 0}</strong> জন | হিসাব: <strong className="text-white">{user.totalTransactions || 0}</strong> টি
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Action Controls Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 justify-end">
                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setViewUser(user)}
                    title="সম্পূর্ণ প্রোফাইল ও খাতা বিবরণ দেখুন"
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer border border-slate-800 hover:border-slate-700 shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Send Direct Notification */}
                  <button
                    type="button"
                    onClick={() => {
                      setNotifUser(user);
                      setNotifTitle('');
                      setNotifMessage('');
                    }}
                    title="এই ইউজারকে ব্যক্তিগত নোটিফিকেশন পাঠান"
                    className="p-2.5 bg-slate-900 hover:bg-teal-950/60 text-teal-400 border border-slate-800 hover:border-teal-500/40 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <Bell className="w-4 h-4" />
                  </button>

                  {/* Edit User Info */}
                  <button
                    type="button"
                    onClick={() => openEditUser(user)}
                    title="ইউজারের তথ্য ও সেটিংস সম্পাদনা"
                    className="p-2.5 bg-slate-900 hover:bg-indigo-950/60 text-indigo-400 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Extend Subscription */}
                  <button
                    type="button"
                    onClick={() => setExtendModalUser(user)}
                    title="সাবস্ক্রিপশন মেয়াদ বৃদ্ধি করুন"
                    className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>মেয়াদ বাড়ান</span>
                  </button>

                  {/* Suspend / Unsuspend */}
                  {user.status === 'suspended' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(user.id, 'active', 'অ্যাডমিন কর্তৃক আনব্লক করা হয়েছে')}
                      title="ইউজার অ্যাকাউন্ট সচল করুন"
                      className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      আনব্লক
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(user.id, 'suspended', 'অ্যাডমিন কর্তৃক সাময়িক স্থগিত')}
                      title="ইউজার অ্যাকাউন্ট সাময়িক স্থগিত করুন"
                      className="px-3 py-2 bg-slate-900 hover:bg-purple-950/50 text-slate-400 hover:text-purple-300 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      স্থগিত
                    </button>
                  )}

                  {/* Password Reset */}
                  {user.email && (
                    <button
                      type="button"
                      onClick={() => handlePasswordResetClick(user)}
                      title="পাসওয়ার্ড রিসেট লিংক পাঠান"
                      className="p-2.5 bg-slate-900 hover:bg-amber-950/50 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete User */}
                  {user.role !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmUser(user)}
                      title="ইউজার অ্যাকাউন্ট স্থায়ীভাবে মুছুন"
                      className="p-2.5 bg-slate-900 hover:bg-rose-950/50 text-rose-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. EXTEND SUBSCRIPTION MODAL */}
      {extendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">সাবস্ক্রিপশন মেয়াদ বৃদ্ধি</h3>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 text-xs text-emerald-200">
              ইউজার: <span className="font-bold text-white">{extendModalUser.name}</span> ({extendModalUser.shopName})
              <br />
              বর্তমান মেয়াদ: <span className="font-bold text-emerald-400">{new Date(extendModalUser.subscriptionExpiresAt || Date.now()).toLocaleDateString('bn-BD')}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                কত দিন মেয়াদ বাড়াতে চান?
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      extendDays === d
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    +{d} দিন
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
                placeholder="কাস্টম দিন সংখ্যা লিখুন"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onExtendSubscription(extendModalUser.id, extendDays);
                  onShowToast(`✅ ${extendModalUser.name}-এর মেয়াদ +${extendDays} দিন বাড়ানো হয়েছে!`);
                  setExtendModalUser(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                মেয়াদ নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VIEW USER DETAILS MODAL */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">ইউজার প্রোফাইল ও খাতা বিবরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[11px]">ইউজার নাম</span>
                  <span className="font-bold text-white text-sm">{viewUser.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">মোবাইল নম্বর</span>
                  <span className="font-bold text-white font-mono">{viewUser.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ইমেইল</span>
                  <span className="font-semibold text-slate-300">{viewUser.email || 'নাই'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">দোকানের নাম</span>
                  <span className="font-bold text-white">{viewUser.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ব্যবসার ধরন</span>
                  <span className="font-semibold text-slate-300">{viewUser.businessType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ঠিকানা</span>
                  <span className="font-semibold text-slate-300">{viewUser.address || 'নাই'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-indigo-950/40 rounded-2xl border border-indigo-500/30">
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">বর্তমান প্যাকেজ</span>
                  <span className="font-black text-white text-sm">{viewUser.subscriptionPlan}</span>
                </div>
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">মেয়াদ সমাপ্তি</span>
                  <span className="font-black text-indigo-300">
                    {viewUser.subscriptionExpiresAt
                      ? new Date(viewUser.subscriptionExpiresAt).toLocaleDateString('bn-BD')
                      : 'নাই'}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">রেজিস্ট্রেশন তারিখ</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(viewUser.registeredAt || Date.now()).toLocaleDateString('bn-BD')}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">সর্বশেষ সক্রিয়</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(viewUser.lastActiveAt || Date.now()).toLocaleDateString('bn-BD')}
                  </span>
                </div>
              </div>

              {viewUser.notes && (
                <div className="p-3.5 bg-amber-950/40 rounded-2xl border border-amber-500/30 text-amber-200">
                  <span className="font-bold block text-[11px]">অ্যাডমিন নোট:</span>
                  <p className="mt-0.5">{viewUser.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT USER MODAL */}
      {(isAddUserOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingUser ? 'ইউজার তথ্য সম্পাদনা' : 'নতুন ইউজার যোগ করুন'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddUserOpen(false);
                  setEditingUser(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    ইউজারের পূর্ণ নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="যেমন: আব্দুর রহমান"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="০১XXXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    দোকান / ব্যবসার নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shopName || ''}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="যেমন: রহমান জেনারেল স্টোর"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ব্যবসার ধরন</label>
                  <input
                    type="text"
                    value={formData.businessType || ''}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    placeholder="মুদি, ফার্মেসি, ইত্যাদি"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ঠিকানা</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="বাজার রোড, দোকান নং ০২"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">স্ট্যাটাস</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="expired">মেয়াদ শেষ (Expired)</option>
                    <option value="suspended">স্থগিত (Suspended)</option>
                    <option value="pending">পেন্ডিং (Pending)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">সাবস্ক্রিপশন প্ল্যান</label>
                  <select
                    value={formData.subscriptionPlan || 'ফ্রি ট্রায়াল (১৪ দিন)'}
                    onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ফ্রি ট্রায়াল (১৪ দিন)">ফ্রি ট্রায়াল (১৪ দিন)</option>
                    <option value="মাসিক স্ট্যান্ডার্ড প্যাক">মাসিক স্ট্যান্ডার্ড প্যাক (৳50)</option>
                    <option value="৬ মাসের সেভার প্যাক">৬ মাসের সেভার প্যাক (৳100)</option>
                    <option value="১ বছরের প্রো প্যাক">১ বছরের প্রো প্যাক (৳200)</option>
                    <option value="আজীবন লাইফটাইম প্যাক">আজীবন লাইফটাইম প্যাক (৳500)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">অ্যাডমিন স্পেশাল নোটস</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ইউজার সম্পর্কিত কোনো অভ্যন্তরীণ মন্তব্য..."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. DELETE USER CONFIRMATION MODAL */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-500/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">ইউজার মুছে ফেলার নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-400">{deleteConfirmUser.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-bold text-rose-400">{deleteConfirmUser.name}</span> ({deleteConfirmUser.shopName}) এর সমস্ত খাতা ডেটাসহ অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmUser.id;
                  setDeleteConfirmUser(null);
                  await onDeleteUser(id);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DIRECT USER NOTIFICATION MODAL */}
      {notifUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0F172A] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-teal-500/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">নির্দিষ্ট ইউজারকে নোটিফিকেশন পাঠান</h4>
                  <p className="text-xs text-teal-300 font-semibold">{notifUser.name} ({notifUser.shopName})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">নোটিফিকেশন টাইটেল *</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="যেমন: অ্যাকাউন্ট আপডেট / বিশেষ বার্তা..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">নোটিফিকেশন বার্তা *</label>
                <textarea
                  rows={4}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="ইউজারকে যে বার্তাটি পাঠাতে চান..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="p-3 bg-teal-950/40 rounded-xl border border-teal-500/30 text-[11px] text-teal-300">
                🔒 এই নোটিফিকেশনটি <strong>শুধুমাত্র {notifUser.name}</strong> দেখতে পাবেন। অন্য কোনো সাধারণ ইউজার এটি দেখতে পারবে না।
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNotifUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                onClick={async () => {
                  if (!notifTitle.trim() || !notifMessage.trim()) {
                    onShowToast('টাইটেল ও বার্তা আবশ্যক');
                    return;
                  }
                  setSendingNotif(true);
                  if (onSendNotificationToUser) {
                    await onSendNotificationToUser(notifUser.id, notifTitle.trim(), notifMessage.trim());
                    onShowToast(`✅ ${notifUser.name}-কে নোটিফিকেশন পাঠানো হয়েছে!`);
                  }
                  setSendingNotif(false);
                  setNotifUser(null);
                }}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingNotif ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
