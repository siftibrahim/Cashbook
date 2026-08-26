import React, { useState } from 'react';
import {
  StaffMember,
  StaffPermission,
  ALL_STAFF_PERMISSION_CATEGORIES,
} from '../../types/adminTypes';
import {
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  Search,
  KeyRound,
  Mail,
  Phone,
  Clock,
  Edit,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface StaffManagementTabProps {
  staffList: StaffMember[];
  onSaveStaff: (
    staffData: Partial<StaffMember> & { name: string; phone: string; email: string }
  ) => Promise<StaffMember>;
  onUpdateStatus: (staffId: string, status: 'active' | 'disabled') => Promise<void>;
  onUpdatePermissions: (staffId: string, permissions: StaffPermission[]) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const StaffManagementTab: React.FC<StaffManagementTabProps> = ({
  staffList,
  onSaveStaff,
  onUpdateStatus,
  onUpdatePermissions,
  onDeleteStaff,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'staff' | 'manager'>('staff');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [selectedPermissions, setSelectedPermissions] = useState<StaffPermission[]>([
    'support_view',
    'support_reply',
    'users_view',
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<StaffMember | null>(null);

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const disabledCount = staffList.filter((s) => s.status === 'disabled').length;

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setEmail('');
    setPassword('staff123');
    setShowPassword(false);
    setRole('staff');
    setStatus('active');
    setSelectedPermissions(['support_view', 'support_reply', 'users_view']);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone);
    setEmail(staff.email);
    setPassword(staff.password || '');
    setShowPassword(false);
    setRole(staff.role);
    setStatus(staff.status);
    setSelectedPermissions(staff.permissions || []);
    setNotes(staff.notes || '');
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permKey: StaffPermission) => {
    if (selectedPermissions.includes(permKey)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permKey));
    } else {
      setSelectedPermissions([...selectedPermissions, permKey]);
    }
  };

  const handleSelectAllPermissions = () => {
    const allKeys: StaffPermission[] = [];
    ALL_STAFF_PERMISSION_CATEGORIES.forEach((cat) => {
      cat.permissions.forEach((p) => allKeys.push(p.key));
    });
    setSelectedPermissions(allKeys);
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const applyPreset = (preset: 'support' | 'accounts' | 'moderator' | 'all') => {
    if (preset === 'support') {
      setSelectedPermissions(['support_view', 'support_reply', 'users_view']);
      onShowToast('সাপোর্ট এক্সিকিউটিভ প্রি-সেট সিলেক্ট করা হয়েছে');
    } else if (preset === 'accounts') {
      setSelectedPermissions([
        'payments_view',
        'payments_approve_reject',
        'payments_add_manual',
        'subscriptions_view',
        'subscriptions_extend',
        'users_view',
        'reports_view',
      ]);
      onShowToast('একাউন্টস ও পেমেন্ট প্রি-সেট সিলেক্ট করা হয়েছে');
    } else if (preset === 'moderator') {
      setSelectedPermissions(['users_view', 'users_edit', 'users_suspend', 'reports_view']);
      onShowToast('ইউজার মডারেটর প্রি-সেট সিলেক্ট করা হয়েছে');
    } else if (preset === 'all') {
      handleSelectAllPermissions();
      onShowToast('ফুল এক্সেস প্রি-সেট সিলেক্ট করা হয়েছে');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || (!editingStaff && !password.trim())) {
      onShowToast('অনুগ্রহ করে নাম, ফোন, ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      return;
    }

    setSaving(true);
    try {
      await onSaveStaff({
        id: editingStaff?.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        role,
        status,
        permissions: selectedPermissions,
        notes: notes.trim(),
      });

      onShowToast(
        editingStaff ? '✅ স্টাফের ইমেইল, পাসওয়ার্ড ও তথ্য সফলভাবে আপডেট হয়েছে' : '🎉 নতুন স্টাফ সফলভাবে যুক্ত করা হয়েছে'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      onShowToast(`ত্রুটি: ${err.message || 'সংরক্ষণ ব্যর্থ'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const nextStatus = staff.status === 'active' ? 'disabled' : 'active';
    try {
      await onUpdateStatus(staff.id, nextStatus);
      onShowToast(
        nextStatus === 'active'
          ? `✅ স্টাফ ${staff.name} এখন সক্রিয়`
          : `⚠️ স্টাফ ${staff.name} সাময়িক নিষ্ক্রিয় করা হয়েছে`
      );
    } catch (err: any) {
      onShowToast('স্ট্যাটাস আপডেট ব্যর্থ');
    }
  };

  const handleDelete = (staff: StaffMember) => {
    setDeleteConfirmStaff(staff);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans pb-12">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">মোট স্টাফ অ্যাকাউন্ট</p>
            <p className="text-3xl font-black text-white mt-1">{staffList.length} <span className="text-sm font-bold text-slate-500">জন</span></p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">সক্রিয় স্টাফ (Active)</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{activeCount} <span className="text-sm font-bold text-slate-500">জন</span></p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#101A2D] p-5 rounded-3xl border border-slate-800/90 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400">নিষ্ক্রিয় (Disabled)</p>
            <p className="text-3xl font-black text-rose-400 mt-1">{disabledCount} <span className="text-sm font-bold text-slate-500">জন</span></p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Add Button */}
      <div className="bg-[#101A2D] p-4 sm:p-5 rounded-3xl border border-slate-800/90 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="স্টাফের নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সব
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              সক্রিয়
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === 'disabled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              নিষ্ক্রিয়
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>নতুন স্টাফ যোগ করুন</span>
        </button>
      </div>

      {/* Staff Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full bg-[#101A2D] p-12 rounded-3xl border border-dashed border-slate-800 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">কোনো স্টাফ অ্যাকাউন্ট পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search ? 'অন্য নাম বা কীওয়ার্ড দিয়ে অনুসন্ধান করুন' : 'নতুন স্টাফ যুক্ত করতে উপরের বাটনে ক্লিক করুন'}
            </p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isStaffActive = staff.status === 'active';
            const permCount = staff.permissions?.length || 0;

            return (
              <div
                key={staff.id}
                className="bg-[#101A2D] rounded-3xl border border-slate-800/90 shadow-lg hover:border-indigo-500/40 transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-300 text-base">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white leading-tight">
                            {staff.name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              staff.role === 'manager'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {staff.role === 'manager' ? 'ম্যানেজার' : 'স্টাফ'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{staff.notes || 'সাধারণ সাপোর্ট ও অপারেশন'}</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff)}
                      title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                      className={`px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer ${
                        isStaffActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                    >
                      {isStaffActive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>সক্রিয়</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>নিষ্ক্রিয়</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{staff.phone}</span>
                    </div>
                  </div>

                  {/* Permissions Badges */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                      <span>অনুমোদিত পারমিশন ({permCount}টি)</span>
                      <span className="text-indigo-400">
                        {permCount === 0 ? 'কোনো পারমিশন নেই' : `${permCount}টি অ্যাক্সেস চালু`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {staff.permissions && staff.permissions.length > 0 ? (
                        staff.permissions.slice(0, 4).map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-800"
                          >
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-rose-400 italic">
                          কোনো পারমিশন দেওয়া হয়নি (লগইন করলে ফাঁকা ড্যাশবোর্ড দেখাবে)
                        </span>
                      )}
                      {permCount > 4 && (
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-500/30">
                          +{permCount - 4} আরো
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {staff.lastActiveAt
                        ? `শেষ সক্রিয়: ${new Date(staff.lastActiveAt).toLocaleDateString('bn-BD')}`
                        : 'এখনও লগইন করেনি'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      title="পারমিশন ও একাউন্ট তথ্য এডিট করুন"
                    >
                      <Edit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>এডিট ও পারমিশন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(staff)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition cursor-pointer border border-rose-500/20"
                      title="স্টাফ একাউন্ট মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0F172A] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-[#10182C] to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingStaff ? 'স্টাফ অ্যাকাউন্ট ও পারমিশন পরিবর্তন' : 'নতুন স্টাফ অ্যাকাউন্ট তৈরি'}
                  </h3>
                  <p className="text-xs text-indigo-300/80">
                    স্টাফের লগইন তথ্য ও পারমিশন কন্ট্রোল নির্ধারণ করুন
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    স্টাফের পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="উদাঃ মোঃ সাকিব হাসান"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    মোবাইল নম্বর (লগইন ইউজারনেম) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="উদাঃ 01711223344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    অফিসিয়াল ইমেইল *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="উদাঃ sakib.support@twing.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {editingStaff ? 'নতুন পাসওয়ার্ড (পরিবর্তন করতে চাইলে লিখুন)' : 'স্টাফ পাসওয়ার্ড *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingStaff}
                      placeholder={editingStaff ? 'নতুন পাসওয়ার্ড দিন (না বদলাতে চাইলে খালি রাখুন)' : 'পাসওয়ার্ড লিখুন'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">পদবী / রোল</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                  >
                    <option value="staff">অপারেশন স্টাফ (Staff)</option>
                    <option value="manager">অ্যাসিস্ট্যান্ট ম্যানেজার (Manager)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    অ্যাকাউন্ট স্ট্যাটাস
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                  >
                    <option value="active">সক্রিয় (Active - লগইন করতে পারবে)</option>
                    <option value="disabled">নিষ্ক্রিয় (Disabled - লগইন ব্লক থাকবে)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  দায়িত্ব / কাজের বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="উদাঃ কাস্টমার সাপোর্ট ও হেল্পডেস্ক এক্সিকিউটিভ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 text-white border border-slate-700/80 rounded-2xl focus:outline-hidden focus:border-indigo-500 transition"
                />
              </div>

              {/* Granular Permissions Section */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>স্টাফ পারমিশন ও এক্সেস কন্ট্রোল</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      নির্বাচিত ফিচারগুলোই শুধুমাত্র স্টাফের ড্যাশবোর্ডে দৃশ্যমান হবে
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-bold hover:bg-indigo-500/30 cursor-pointer"
                    >
                      সব দিন
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPermissions}
                      className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      সব বাতিল
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 mb-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-slate-400 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> কুইক প্রি-সেট:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset('support')}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                  >
                    🎧 সাপোর্ট
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('accounts')}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                  >
                    💳 পেমেন্ট
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('moderator')}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                  >
                    👥 মডারেটর
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('all')}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                  >
                    👑 ফুল এক্সেস
                  </button>
                </div>

                {/* Categorized Permissions Grid */}
                <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                  {ALL_STAFF_PERMISSION_CATEGORIES.map((category) => (
                    <div
                      key={category.categoryName}
                      className="bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800"
                    >
                      <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-wider mb-2.5">
                        {category.categoryName}
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {category.permissions.map((perm) => {
                          const isChecked = selectedPermissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                isChecked
                                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 font-bold'
                                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="mt-0.5 text-indigo-600 rounded-sm focus:ring-indigo-500 cursor-pointer"
                              />
                              <div>
                                <p className="leading-tight text-white">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 font-normal mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : editingStaff ? 'আপডেট সম্পন্ন করুন' : 'স্টাফ যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deleteConfirmStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-500/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">স্টাফ মুছে ফেলার নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-400">{deleteConfirmStaff.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              আপনি কি নিশ্চিত যে স্টাফ <span className="font-bold text-rose-400">{deleteConfirmStaff.name}</span> ({deleteConfirmStaff.email})-এর অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  const staff = deleteConfirmStaff;
                  setDeleteConfirmStaff(null);
                  try {
                    await onDeleteStaff(staff.id);
                    onShowToast(`🗑️ স্টাফ ${staff.name} ডিলিট করা হয়েছে`);
                  } catch (e) {
                    onShowToast('ডিলিট ব্যর্থ হয়েছে');
                  }
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
