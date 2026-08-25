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
} from 'lucide-react';
import { formatMoney } from '../../utils/storage';

interface UserManagementTabProps {
  users: AppUser[];
  onSaveUser: (user: AppUser) => Promise<void>;
  onUpdateStatus: (userId: string, status: UserStatus, note?: string) => Promise<void>;
  onExtendSubscription: (userId: string, days: number, planName?: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onResetPassword: (email: string, userName?: string) => Promise<{ success: boolean; message: string }>;
  onShowToast: (msg: string) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  onSaveUser,
  onUpdateStatus,
  onExtendSubscription,
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

  // New / Edit User Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({});

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.shopName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

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
    if (!formData.name || !formData.phone || !formData.shopName) {
      onShowToast('অনুগ্রহ করে নাম, ফোন এবং দোকানের নাম প্রদান করুন');
      return;
    }

    const finalUser: AppUser = {
      id: editingUser ? editingUser.id : 'user_' + Date.now(),
      name: formData.name || '',
      phone: formData.phone || '',
      email: formData.email || '',
      shopName: formData.shopName || '',
      businessType: formData.businessType || 'সাধারণ দোকান',
      address: formData.address || '',
      role: formData.role || 'user',
      status: formData.status || 'active',
      subscriptionPlan: formData.subscriptionPlan || 'ফ্রি ট্রায়াল (১৪ দিন)',
      subscriptionStatus: formData.subscriptionStatus || 'active',
      subscriptionExpiresAt: formData.subscriptionExpiresAt || Date.now() + 14 * 86400000,
      registeredAt: formData.registeredAt || Date.now(),
      lastActiveAt: formData.lastActiveAt || Date.now(),
      totalCustomers: formData.totalCustomers || 0,
      totalTransactions: formData.totalTransactions || 0,
      notes: formData.notes || '',
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

  return (
    <div className="space-y-4 text-slate-100 font-sans pb-12">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101A2D] p-4 rounded-3xl border border-slate-800/90 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, ফোন, ইমেইল বা দোকানের নাম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters and Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সব স্ট্যাটাস ({users.length})</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="expired">মেয়াদোত্তীর্ণ (Expired)</option>
            <option value="suspended">স্থগিত (Suspended)</option>
            <option value="pending">পেন্ডিং (Pending)</option>
          </select>

          <button
            type="button"
            onClick={openAddUser}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ইউজার যোগ</span>
          </button>
        </div>
      </div>

      {/* Users Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2 font-semibold">
        <span>মোট {filteredUsers.length} জন ইউজার পাওয়া গেছে</span>
        <div className="flex gap-2 text-[11px]">
          <span className="text-emerald-400 font-bold">
            অ্যাক্টিভ: {users.filter((u) => u.status === 'active').length}
          </span>
          <span>•</span>
          <span className="text-amber-400 font-bold">
            মেয়াদ শেষ: {users.filter((u) => u.status === 'expired').length}
          </span>
          <span>•</span>
          <span className="text-rose-400 font-bold">
            স্থগিত: {users.filter((u) => u.status === 'suspended').length}
          </span>
        </div>
      </div>

      {/* Users Cards / Table List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-[#101A2D] rounded-3xl border border-dashed border-slate-800 text-slate-500 text-xs">
            কোনো ইউজার পাওয়া যায়নি। ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExp = user.subscriptionExpiresAt <= Date.now();
            const daysLeft = Math.ceil((user.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={user.id}
                className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg hover:border-indigo-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: User & Shop Identity */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md ${
                      user.role === 'super_admin'
                        ? 'bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950'
                        : user.status === 'active'
                        ? 'bg-gradient-to-tr from-indigo-600 to-blue-600'
                        : user.status === 'suspended'
                        ? 'bg-purple-600'
                        : 'bg-rose-600'
                    }`}
                  >
                    {user.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-black text-white truncate">{user.name}</h4>
                      {user.role === 'super_admin' && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          মালিক / সুপার অ্যাডমিন
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
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
                          ? 'সক্রিয়'
                          : user.status === 'expired'
                          ? 'মেয়াদ শেষ'
                          : user.status === 'suspended'
                          ? 'স্থগিত'
                          : 'পেন্ডিং'}
                      </span>
                    </div>

                    {/* Shop and Contact */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-200">
                        <Store className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{user.shopName}</span>
                      </span>

                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{user.phone}</span>
                      </span>

                      {user.email && (
                        <span className="flex items-center gap-1 text-slate-400 hidden sm:inline-flex">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{user.email}</span>
                        </span>
                      )}
                    </div>

                    {/* Subscriptions & Expiry details */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2">
                      <span className="font-bold text-indigo-300 bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                        প্যাকেজ: {user.subscriptionPlan}
                      </span>
                      <span
                        className={`font-semibold ${
                          isExp
                            ? 'text-rose-400'
                            : daysLeft <= 3
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        মেয়াদ:{' '}
                        {new Date(user.subscriptionExpiresAt).toLocaleDateString('bn-BD')} (
                        {isExp
                          ? 'মেয়াদোত্তীর্ণ'
                          : daysLeft === 0
                          ? 'আজ শেষ হবে'
                          : `${daysLeft} দিন বাকি`}
                        )
                      </span>
                      <span className="text-slate-500">
                        • কাস্টমার: {user.totalCustomers} জন | হিসাব: {user.totalTransactions} টি
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setViewUser(user)}
                    title="বিস্তারিত দেখুন"
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-800"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditUser(user)}
                    title="ইউজার তথ্য এডিট"
                    className="p-2 bg-slate-900 hover:bg-indigo-950/60 text-indigo-400 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExtendModalUser(user)}
                    title="সাবস্ক্রিপশন মেয়াদ বৃদ্ধি"
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>মেয়াদ বাড়ান</span>
                  </button>

                  {user.status === 'suspended' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(user.id, 'active', 'অ্যাডমিন কর্তৃক আনব্লক করা হয়েছে')}
                      title="ইউজার সচল করুন"
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      আনব্লক
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(user.id, 'suspended', 'অ্যাডমিন কর্তৃক সাময়িক স্থগিত')}
                      title="ইউজার স্থগিত করুন"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-purple-950/50 text-slate-400 hover:text-purple-300 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      স্থগিত
                    </button>
                  )}

                  {user.email && (
                    <button
                      type="button"
                      onClick={() => handlePasswordResetClick(user)}
                      title="পাসওয়ার্ড রিসেট লিংক পাঠান"
                      className="p-2 bg-slate-900 hover:bg-amber-950/50 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  )}

                  {user.role !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmUser(user)}
                      title="ইউজার মুছুন"
                      className="p-2 bg-slate-900 hover:bg-rose-950/50 text-rose-400 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
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

      {/* 1. EXTEND SUBSCRIPTION MODAL */}
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
              বর্তমান মেয়াদ: <span className="font-bold text-emerald-400">{new Date(extendModalUser.subscriptionExpiresAt).toLocaleDateString('bn-BD')}</span>
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
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
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

      {/* 2. VIEW USER DETAILS MODAL */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">ইউজার প্রোফাইল ও বিবরণ</h3>
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
                    {new Date(viewUser.subscriptionExpiresAt).toLocaleDateString('bn-BD')}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">রেজিস্ট্রেশন তারিখ</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(viewUser.registeredAt).toLocaleDateString('bn-BD')}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-400 block text-[11px] font-bold">সর্বশেষ সক্রিয়</span>
                  <span className="font-semibold text-slate-300">
                    {new Date(viewUser.lastActiveAt).toLocaleDateString('bn-BD')}
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

      {/* 3. ADD / EDIT USER MODAL */}
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
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
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
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ব্যবসার ধরন</label>
                  <input
                    type="text"
                    value={formData.businessType || ''}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    placeholder="মুদি, ফার্মেসি, ইত্যাদি"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">ঠিকানা</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="বাজার রোড, দোকান নং ০২"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
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
                    <option value="মাসিক স্ট্যান্ডার্ড প্যাক">মাসিক স্ট্যান্ডার্ড প্যাক</option>
                    <option value="৬ মাসের সেভার প্যাক">৬ মাসের সেভার প্যাক</option>
                    <option value="১ বছরের প্রো প্যাক">১ বছরের প্রো প্যাক</option>
                    <option value="আজীবন লাইফটাইম প্যাক">আজীবন লাইফটাইম প্যাক</option>
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
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-white focus:border-indigo-500 focus:outline-none"
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

      {/* 4. DELETE USER IN-APP CONFIRMATION MODAL */}
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
    </div>
  );
};
