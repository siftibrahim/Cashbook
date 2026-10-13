import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Sliders,
  Plus,
  Minus,
  Coins,
  Store,
  Phone,
  User,
  Hash,
  AlertCircle,
  Receipt,
  Calendar,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  PackageCheck,
  Percent,
} from 'lucide-react';
import { AppUser, SmsPurchaseRecord, SmsPackageItem } from '../../types/adminTypes';
import {
  subscribeToSmsPurchases,
  approveAdminSmsPurchase,
  rejectAdminSmsPurchase,
  setUserSmsBalance,
  addUserSmsBalance,
  getAdminSmsPackages,
  saveAdminSmsPackages,
  resetUserSmsPackage,
} from '../../services/adminService';

interface SmsPurchasesTabProps {
  users: AppUser[];
  onRefreshUsers?: () => void;
  onShowToast: (msg: string) => void;
}

export const SmsPurchasesTab: React.FC<SmsPurchasesTabProps> = ({
  users,
  onRefreshUsers,
  onShowToast,
}) => {
  const [purchases, setPurchases] = useState<SmsPurchaseRecord[]>([]);
  const [subTab, setSubTab] = useState<'requests' | 'balances' | 'packages'>('requests');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // SMS Packages Management State
  const [packages, setPackages] = useState<SmsPackageItem[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isSavingPackages, setIsSavingPackages] = useState(false);
  const [isResettingUser, setIsResettingUser] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalItem, setRejectModalItem] = useState<SmsPurchaseRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Balance Edit Modal State
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState('50');
  const [balanceNote, setBalanceNote] = useState('');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSmsPurchases(
      (list) => setPurchases(list),
      (err) => console.warn('SMS purchases subscription error:', err)
    );
    loadPackages();
    return unsub;
  }, []);

  const loadPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const list = await getAdminSmsPackages();
      if (Array.isArray(list) && list.length > 0) {
        setPackages(list);
      }
    } catch (err) {
      console.warn('Failed to load admin SMS packages:', err);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const handleSaveAllPackages = async (updatedList?: SmsPackageItem[]) => {
    setIsSavingPackages(true);
    try {
      const toSave = updatedList || packages;
      const res = await saveAdminSmsPackages(toSave);
      if (res.success) {
        onShowToast('✅ এসএমএস প্যাকেজ তালিকা সফলভাবে সংরক্ষণ করা হয়েছে!');
        if (Array.isArray(res.packages)) setPackages(res.packages);
      } else {
        onShowToast(`❌ ব্যর্থ: ${res.message || 'সংরক্ষণ করা যায়নি'}`);
      }
    } catch (err: any) {
      onShowToast(`❌ প্যাকেজ সংরক্ষণ ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSavingPackages(false);
    }
  };

  const handleResetUserSms = async (u: AppUser) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে ${u.name} (${u.shopName || ''})-এর বর্তমান SMS ব্যালেন্স ও প্যাকেজ সম্পূর্ণ রিসেট (০) করতে চান?`)) {
      return;
    }
    setIsResettingUser(u.id);
    try {
      const res = await resetUserSmsPackage(u.id, 'সুপার অ্যাডমিন দ্বারা ম্যানুয়াল রিসেট');
      onShowToast(`✅ ${u.name}-এর এসএমএস প্যাকেজ রিসেট সফল হয়েছে (ব্যালেন্স: ০)`);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      onShowToast(`❌ রিসেট ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsResettingUser(null);
    }
  };

  const handleApprove = async (p: SmsPurchaseRecord) => {
    if (isProcessing) return;
    setIsProcessing(p.id);
    try {
      const res = await approveAdminSmsPurchase(p.id);
      onShowToast(res.message || '✅ এসএমএস পেমেন্ট অনুমোদন করা হয়েছে!');
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      onShowToast(`❌ অনুমোদন ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem || isProcessing) return;
    setIsProcessing(rejectModalItem.id);
    try {
      const res = await rejectAdminSmsPurchase(rejectModalItem.id, rejectReason.trim());
      onShowToast(res.message || '❌ এসএমএস পেমেন্ট বাতিল করা হয়েছে');
      setRejectModalItem(null);
      setRejectReason('');
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      onShowToast(`❌ বাতিল ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateUserBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const val = parseInt(balanceAmount, 10);
    if (isNaN(val) || val <= 0 && balanceAction !== 'set') {
      onShowToast('⚠️ সঠিক এসএমএস সংখ্যা দিন');
      return;
    }

    setIsUpdatingBalance(true);
    try {
      if (balanceAction === 'set') {
        await setUserSmsBalance(selectedUser.id, Math.max(0, val), balanceNote.trim());
        onShowToast(`✅ ${selectedUser.name}-এর এসএমএস ব্যালেন্স ${val}টি করা হয়েছে`);
      } else if (balanceAction === 'add') {
        await addUserSmsBalance(selectedUser.id, val, balanceNote.trim());
        onShowToast(`✅ ${selectedUser.name}-এর ব্যালেন্সে +${val}টি এসএমএস যোগ হয়েছে`);
      } else if (balanceAction === 'subtract') {
        await addUserSmsBalance(selectedUser.id, -val, balanceNote.trim());
        onShowToast(`✅ ${selectedUser.name}-এর ব্যালেন্স থেকে -${val}টি এসএমএস বাদ দেওয়া হয়েছে`);
      }

      setSelectedUser(null);
      setBalanceAmount('50');
      setBalanceNote('');
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      onShowToast(`❌ ব্যালেন্স পরিবর্তন ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  // Filtered Purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'confirmed'
        ? p.status === 'confirmed' || p.status === 'approved'
        : p.status === statusFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.userName?.toLowerCase().includes(q) ||
      p.userPhone?.toLowerCase().includes(q) ||
      p.shopName?.toLowerCase().includes(q) ||
      p.trxId?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const pendingCount = purchases.filter((p) => p.status === 'pending').length;

  // Filtered Users for Balance view
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    return (
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.shopName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span>SMS পেমেন্ট ও ব্যালেন্স ম্যানেজমেন্ট</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ইউজারদের বাকি তাগাদা SMS প্যাকেজ পেমেন্ট অনুমোদন, বাতিল এবং ব্যালেন্স নিয়ন্ত্রণ করুন
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'requests'
                ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>পেমেন্ট রিকোয়েস্ট</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('balances')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'balances'
                ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>ইউজার SMS ব্যালেন্স ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('packages')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'packages'
                ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>প্যাকেজ সেটিংস ({packages.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SMS PAYMENT REQUESTS */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'all', label: 'সকল রিকোয়েস্ট' },
                  { id: 'pending', label: `পেন্ডিং (${pendingCount})` },
                  { id: 'confirmed', label: 'কনফার্ম' },
                  { id: 'rejected', label: 'বাতিল' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === tab.id
                      ? tab.id === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, ফোন বা TrxID খুঁজুন..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {/* Requests List */}
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-bold">কোনো এসএমএস পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি</p>
              <p className="text-slate-500 text-xs mt-1">ইউজাররা এসএমএস প্যাকেজ ক্রয় করলে এখানে জমা হবে</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPurchases.map((p) => {
                const isPending = p.status === 'pending';
                const isConfirmed = p.status === 'confirmed' || p.status === 'approved';
                const isRejected = p.status === 'rejected';

                return (
                  <div
                    key={p.id}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                      isPending
                        ? 'bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : isConfirmed
                        ? 'bg-slate-900/80 border-emerald-500/30'
                        : 'bg-slate-900/50 border-rose-500/30 opacity-75'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white">
                            {p.userName || 'ইউজার'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-500 text-slate-950 animate-pulse'
                                : isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {isPending ? 'পেন্ডিং' : isConfirmed ? 'কনফার্ম' : 'বাতিল'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Store className="w-3 h-3 text-teal-400" />
                          <span>{p.shopName || 'দোকান'}</span>
                        </p>
                      </div>

                      {/* Package Pill */}
                      <div className="text-right">
                        <div className="text-sm font-black text-teal-300">
                          {p.smsCount}টি SMS
                        </div>
                        <div className="text-xs font-bold text-white">
                          ৳{p.amount}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs mb-4">
                      <div>
                        <span className="text-[10px] text-slate-500 block">মোবাইল নম্বর</span>
                        <span className="font-mono text-slate-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-400" />
                          {p.userPhone}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">পেমেন্ট মেথড</span>
                        <span className="font-bold text-slate-300 uppercase">
                          {p.paymentMethod}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-500 block">ট্রানজেকশন আইডি (TrxID)</span>
                        <span className="font-mono font-black text-amber-300 tracking-wider">
                          {p.trxId || 'N/A'}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(p.createdAt).toLocaleDateString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isPending ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(p)}
                          disabled={isProcessing === p.id}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                        >
                          {isProcessing === p.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>কনফার্ম করুন (+{p.smsCount} SMS)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalItem(p);
                            setRejectReason('');
                          }}
                          disabled={isProcessing === p.id}
                          className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 active:scale-95 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>বাতিল</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span>স্ট্যাটাস:</span>
                        <span className={isConfirmed ? 'text-emerald-400' : 'text-rose-400'}>
                          {isConfirmed ? '✅ সফলভাবে ব্যালেন্সে যুক্ত হয়েছে' : '❌ রিকোয়েস্ট বাতিল করা হয়েছে'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ALL USERS SMS BALANCE MANAGEMENT */}
      {subTab === 'balances' && (
        <div className="space-y-4">
          {/* Search Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-400 font-bold">
              মোট দোকান ইউজার: <span className="text-white">{filteredUsers.length} জন</span>
            </div>
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ইউজার নাম, দোকান বা মোবাইল নম্বর খুঁজুন..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {/* User Balances Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUsers.map((u) => {
              const currentSms = u.smsBalance !== undefined ? u.smsBalance : 10;
              return (
                <div
                  key={u.id}
                  className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{u.name || 'ইউজার'}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <Store className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate">{u.shopName || 'দোকান'}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{u.phone}</p>
                      </div>

                      {/* Current SMS Balance Badge */}
                      <div className="p-2 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-center shrink-0">
                        <span className="text-[10px] text-teal-300 font-bold block">ব্যালেন্স</span>
                        <span className="text-base font-black text-white">{currentSms}</span>
                        <span className="text-[9px] text-teal-400 block">টি SMS</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setBalanceAction('add');
                        setBalanceAmount('50');
                        setBalanceNote('');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>যোগ/বিয়োগ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setBalanceAction('set');
                        setBalanceAmount(String(currentSms));
                        setBalanceNote('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>সেট</span>
                    </button>

                    <button
                      type="button"
                      disabled={isResettingUser === u.id}
                      onClick={() => handleResetUserSms(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="ইউজারের এসএমএস প্যাকেজ ও ব্যালেন্স শূন্য (০) তে রিসেট করুন"
                    >
                      <RotateCcw className={`w-3 h-3 ${isResettingUser === u.id ? 'animate-spin' : ''}`} />
                      <span>রিসেট (০)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: SMS PACKAGES MANAGEMENT (কমানো/ বাড়ানো/ নতুন যোগ/ রিসেট) */}
      {subTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>এসএমএস প্যাকেজ কাস্টমাইজেশন ও সেটিংস</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                এখানে আপনি এসএমএস এর সংখ্যা (কমানো/ বাড়ানো), প্যাকেজ মূল্য ও নতুন প্যাকেজ কনফিগার করতে পারবেন
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newPkg: SmsPackageItem = {
                    id: `sms_pkg_${Date.now()}`,
                    name: `${packages.length + 1}নং কাস্টম প্যাক`,
                    smsCount: 100,
                    price: 49,
                    ratePerSms: '৳০.৪৯',
                    badge: 'কাস্টম',
                    isPopular: false,
                  };
                  const updated = [...packages, newPkg];
                  setPackages(updated);
                  handleSaveAllPackages(updated);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন প্যাকেজ যোগ করুন</span>
              </button>

              <button
                type="button"
                disabled={isSavingPackages}
                onClick={() => handleSaveAllPackages()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingPackages ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>

          {/* Packages List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                      প্যাকেজ #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (packages.length <= 1) {
                          onShowToast('⚠️ কমপক্ষে একটি প্যাকেজ থাকতে হবে');
                          return;
                        }
                        if (window.confirm(`আপনি কি "${pkg.name}" প্যাকেজটি মুছে ফেলতে চান?`)) {
                          const updated = packages.filter((_, i) => i !== idx);
                          setPackages(updated);
                          handleSaveAllPackages(updated);
                        }
                      }}
                      className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer"
                      title="প্যাকেজ মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">প্যাকেজের নাম:</label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPackages((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, name: val } : p))
                        );
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* SMS Count with Quick +/- */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-400">এসএমএস সংখ্যা (টি):</label>
                      <span className="text-teal-400 font-black text-xs">{pkg.smsCount} টি SMS</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = Math.max(1, (pkg.smsCount || 10) - 10);
                          const newRate = `৳${(pkg.price / newCount).toFixed(2)}`;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, smsCount: newCount, ratePerSms: newRate } : p))
                          );
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="১০টি কমান"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={pkg.smsCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value, 10) || 1;
                          const newRate = `৳${(pkg.price / count).toFixed(2)}`;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, smsCount: count, ratePerSms: newRate } : p))
                          );
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-mono font-bold text-center focus:border-teal-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newCount = (pkg.smsCount || 0) + 10;
                          const newRate = `৳${(pkg.price / newCount).toFixed(2)}`;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, smsCount: newCount, ratePerSms: newRate } : p))
                          );
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="১০টি বাড়ান"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Price and Rate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">প্যাকেজ মূল্য (৳):</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.price}
                        onChange={(e) => {
                          const pr = parseFloat(e.target.value) || 0;
                          const count = pkg.smsCount || 1;
                          const newRate = `৳${(pr / count).toFixed(2)}`;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, price: pr, ratePerSms: newRate } : p))
                          );
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-amber-400 font-mono font-bold focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">প্রতি SMS রেট:</label>
                      <input
                        type="text"
                        value={pkg.ratePerSms}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, ratePerSms: val } : p))
                          );
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 font-mono focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Badge & Popular Toggle */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-slate-400">ব্যাজ:</label>
                      <input
                        type="text"
                        value={pkg.badge || ''}
                        placeholder="যেমন: সাশ্রয়ী"
                        onChange={(e) => {
                          const val = e.target.value;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, badge: val } : p))
                          );
                        }}
                        className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-teal-300 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!pkg.isPopular}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPackages((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, isPopular: checked } : p))
                          );
                        }}
                        className="rounded accent-amber-500"
                      />
                      <span>জনপ্রিয়</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">এসএমএস পেমেন্ট বাতিল করুন</h3>
                <p className="text-xs text-slate-400">
                  {rejectModalItem.userName} (TrxID: {rejectModalItem.trxId})
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  বাতিলের কারণ (গ্রাহককে নোটিফিকেশনে পাঠানো হবে)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="যেমন: ভুল ট্রানজেকশন আইডি বা অ্যাকাউন্টে টাকা জমা হয়নি..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === rejectModalItem.id}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/40 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing === rejectModalItem.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>বাতিল নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BALANCE EDIT MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-teal-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">এসএমএস ব্যালেন্স সমন্বয়</h3>
                <p className="text-xs text-slate-400">
                  {selectedUser.name} ({selectedUser.shopName})
                </p>
                <p className="text-[11px] text-teal-300 font-bold mt-0.5">
                  বর্তমান ব্যালেন্স: {selectedUser.smsBalance ?? 10}টি SMS
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateUserBalance} className="space-y-4">
              {/* Action Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceAction('add')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    balanceAction === 'add'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>যোগ (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceAction('subtract')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    balanceAction === 'subtract'
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Minus className="w-3 h-3" />
                  <span>বিয়োগ (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceAction('set')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    balanceAction === 'set'
                      ? 'bg-teal-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>সরাসরি সেট</span>
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {balanceAction === 'set' ? 'নতুন ব্যালেন্সের পরিমাণ' : 'এসএমএস সংখ্যা'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-sm font-black text-white focus:outline-hidden focus:border-teal-500"
                  required
                />
              </div>

              {/* Note Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  নোট বা কারণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  placeholder="যেমন: স্পেশাল বোনাস বা ক্যাশ পেমেন্ট"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBalance}
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingBalance ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>আপডেট সম্পন্ন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
