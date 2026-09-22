import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Power,
  Package,
  Edit3,
  MessageSquare,
  ChevronRight,
  Filter,
  Check,
  X,
  CreditCard,
  Phone,
  User,
  Sparkles,
  Link,
  Layers,
} from 'lucide-react';
import { adminApi } from '../../services/apiService';
import { AppUser, AdminOnlineStoreItem } from '../../types/adminTypes';
import { formatMoney } from '../../utils/storage';

interface OnlineStoreManagementTabProps {
  users: AppUser[];
  onRefreshUsers?: () => void;
  showToast: (msg: string) => void;
  onImpersonate?: (userId: string) => void;
}

export const OnlineStoreManagementTab: React.FC<OnlineStoreManagementTabProps> = ({
  users,
  onRefreshUsers,
  showToast,
  onImpersonate,
}) => {
  const [stores, setStores] = useState<AdminOnlineStoreItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'active' | 'disabled'>('all');
  
  // Modals / Action States
  const [activeActionUserId, setActiveActionUserId] = useState<string | null>(null);
  const [rejectModalUser, setRejectModalUser] = useState<AdminOnlineStoreItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  const [editStoreModal, setEditStoreModal] = useState<AdminOnlineStoreItem | null>(null);
  const [editSlug, setEditSlug] = useState<string>('');
  const [editCustomDomain, setEditCustomDomain] = useState<string>('');
  const [editDomainVerified, setEditDomainVerified] = useState<boolean>(false);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [viewDetailsModal, setViewDetailsModal] = useState<AdminOnlineStoreItem | null>(null);

  // Fetch all stores data
  const fetchStoresData = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getOnlineStores();
      if (Array.isArray(data)) {
        setStores(data);
      }
    } catch (err: any) {
      console.error('Failed to load online stores:', err);
      // Fallback from users list
      const fallbackStores: AdminOnlineStoreItem[] = users
        .filter((u) => u.role !== 'super_admin' && u.id !== 'usr_super_admin')
        .map((u) => ({
          userId: u.id,
          userName: u.name,
          shopName: u.shopName || u.name,
          phone: u.phone,
          email: u.email,
          subscriptionPlan: u.subscriptionPlan,
          subscriptionExpiresAt: u.subscriptionExpiresAt,
          isOnlineStoreAllowed: u.isOnlineStoreAllowed !== false,
          onlineStoreStatus: u.onlineStoreStatus || (u.isOnlineStoreAllowed !== false ? 'active' : 'disabled'),
          onlineStoreRequestedAt: u.onlineStoreRequestedAt || 0,
          onlineStoreNote: u.onlineStoreNote || '',
          storeSlug: u.storeSlug || `store-${u.id.slice(-4)}`,
          isEnabled: true,
          themeColor: 'teal',
          category: 'জেনারেল স্টোর',
          bannerTitle: '',
          acceptCod: true,
          acceptBkash: false,
          acceptNagad: false,
          acceptRocket: false,
          deliveryInsideDhaka: 60,
          deliveryOutsideDhaka: 120,
          publishedProductsCount: 0,
          updatedAt: Date.now(),
        }));
      setStores(fallbackStores);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoresData();
  }, []);

  // Filtered list
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      // Status Filter
      if (statusFilter === 'requested' && s.onlineStoreStatus !== 'requested') return false;
      if (statusFilter === 'active' && s.onlineStoreStatus !== 'active') return false;
      if (statusFilter === 'disabled' && s.onlineStoreStatus !== 'disabled') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesShop = s.shopName?.toLowerCase().includes(q);
        const matchesUser = s.userName?.toLowerCase().includes(q);
        const matchesPhone = s.phone?.includes(q);
        const matchesSlug = s.storeSlug?.toLowerCase().includes(q);
        const matchesDomain = s.customDomain?.toLowerCase().includes(q);
        const matchesEmail = s.email?.toLowerCase().includes(q);
        if (!matchesShop && !matchesUser && !matchesPhone && !matchesSlug && !matchesDomain && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [stores, statusFilter, searchQuery]);

  // Priority Pending Requests
  const pendingRequests = useMemo(() => {
    return stores.filter((s) => s.onlineStoreStatus === 'requested');
  }, [stores]);

  const activeStoresCount = useMemo(() => {
    return stores.filter((s) => s.onlineStoreStatus === 'active').length;
  }, [stores]);

  const disabledStoresCount = useMemo(() => {
    return stores.filter((s) => s.onlineStoreStatus === 'disabled').length;
  }, [stores]);

  // Actions
  const handleApproveRequest = async (store: AdminOnlineStoreItem) => {
    setActiveActionUserId(store.userId);
    try {
      const res = await adminApi.approveStoreRequest(store.userId);
      showToast(res.message || `✅ ${store.shopName}-এর অনলাইন স্টোর সফলভাবে অনুমোদন করা হয়েছে!`);
      // Update local state
      setStores((prev) =>
        prev.map((s) =>
          s.userId === store.userId
            ? { ...s, onlineStoreStatus: 'active', isOnlineStoreAllowed: true, onlineStoreNote: 'সুপার অ্যাডমিন অনুমোদিত' }
            : s
        )
      );
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      showToast(`❌ অনুমোদন ব্যর্থ: ${err.message || 'ত্রুটি হয়েছে'}`);
    } finally {
      setActiveActionUserId(null);
    }
  };

  const handleOpenRejectModal = (store: AdminOnlineStoreItem) => {
    setRejectModalUser(store);
    setRejectReason('প্যাকেজ সাবস্ক্রিপশন ফি অপরিশোধিত থাকায় আবেদন বাতিল করা হলো।');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalUser) return;
    setIsSubmittingReject(true);
    try {
      await adminApi.rejectStoreRequest(rejectModalUser.userId, rejectReason.trim());
      showToast(`⚠️ ${rejectModalUser.shopName}-এর আবেদন প্রত্যাখ্যান করা হয়েছে`);
      setStores((prev) =>
        prev.map((s) =>
          s.userId === rejectModalUser.userId
            ? { ...s, onlineStoreStatus: 'disabled', isOnlineStoreAllowed: false, onlineStoreNote: rejectReason }
            : s
        )
      );
      setRejectModalUser(null);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      showToast(`❌ বাতিল ব্যর্থ: ${err.message || 'ত্রুটি হয়েছে'}`);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleToggleStore = async (store: AdminOnlineStoreItem) => {
    const willEnable = store.onlineStoreStatus !== 'active';
    setActiveActionUserId(store.userId);
    try {
      await adminApi.toggleOnlineStore(
        store.userId,
        willEnable,
        willEnable ? 'সুপার অ্যাডমিন কর্তৃক অনলাইন স্টোর সক্রিয়' : 'সুপার অ্যাডমিন কর্তৃক স্টোর সাময়িক বন্ধ'
      );
      showToast(willEnable ? `✅ ${store.shopName}-এর স্টোর চালু করা হয়েছে` : `⚠️ ${store.shopName}-এর স্টোর স্থগিত করা হয়েছে`);
      setStores((prev) =>
        prev.map((s) =>
          s.userId === store.userId
            ? {
                ...s,
                onlineStoreStatus: willEnable ? 'active' : 'disabled',
                isOnlineStoreAllowed: willEnable,
              }
            : s
        )
      );
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      showToast(`❌ পরিবর্তন ব্যর্থ: ${err.message || 'ত্রুটি হয়েছে'}`);
    } finally {
      setActiveActionUserId(null);
    }
  };

  const handleOpenEditModal = (store: AdminOnlineStoreItem) => {
    setEditStoreModal(store);
    setEditSlug(store.storeSlug || '');
    setEditCustomDomain(store.customDomain || '');
    setEditDomainVerified(Boolean(store.customDomainVerified));
  };

  const handleSaveEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStoreModal) return;
    setIsSavingEdit(true);
    try {
      await adminApi.updateOnlineStore(editStoreModal.userId, {
        storeSlug: editSlug.trim().toLowerCase(),
        customDomain: editCustomDomain.trim().toLowerCase() || undefined,
        customDomainVerified: editDomainVerified,
      });
      showToast('✅ অনলাইন স্টোর ডোমেন ও সেটিংস আপডেট করা হয়েছে');
      setStores((prev) =>
        prev.map((s) =>
          s.userId === editStoreModal.userId
            ? {
                ...s,
                storeSlug: editSlug.trim().toLowerCase(),
                customDomain: editCustomDomain.trim().toLowerCase() || undefined,
                customDomainVerified: editDomainVerified,
              }
            : s
        )
      );
      setEditStoreModal(null);
    } catch (err: any) {
      showToast(`❌ আপডেট ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openStorefront = (store: AdminOnlineStoreItem) => {
    const slug = store.storeSlug || `store-${store.userId.slice(-4)}`;
    const targetUrl = store.customDomain
      ? `https://${store.customDomain}`
      : `${window.location.origin}/?store=${slug}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-800/30 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0 shadow-inner">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">অনলাইন ই-কমার্স স্টোর ম্যানেজমেন্ট</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 font-bold text-xs">
                  সুপার অ্যাডমিন কন্ট্রোল
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-200/80 mt-1">
                গ্রাহকদের অনলাইন স্টোর অনুমোদন, এক-ক্লিকে সুইচিং (On/Off), লাইভ ডোমেন ভিউ ও ফুল কন্ট্রোল
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStoresData}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-teal-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-teal-300/80 block">মোট স্টোর</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-0.5 block">{stores.length}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">নিবন্ধিত ব্যবসায়িক প্রতিষ্ঠান</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-emerald-300 block">সক্রিয় স্টোর (Live)</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5 block">{activeStoresCount}</span>
            <span className="text-[10px] text-emerald-200/70 mt-1 block">ইন্টারনেটে লাইভ আছে</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm relative">
            {pendingRequests.length > 0 && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
            <span className="text-[11px] font-bold text-amber-300 block">অপেক্ষমাণ আবেদন</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5 block">{pendingRequests.length}</span>
            <span className="text-[10px] text-amber-200/80 mt-1 block">অনুমোদনের অপেক্ষায়</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm">
            <span className="text-[11px] font-bold text-rose-300 block">বন্ধ / স্থগিত স্টোর</span>
            <span className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5 block">{disabledStoresCount}</span>
            <span className="text-[10px] text-rose-200/70 mt-1 block">অ্যাডমিন কর্তৃক ডিজেবল</span>
          </div>
        </div>
      </div>

      {/* Priority Alert Box: Pending Store Activation Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300/80 shadow-md space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
                  <span>অনলাইন স্টোর সক্রিয় করার নতুন আবেদন</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                    {pendingRequests.length}টি পেন্ডিং
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  নিচের ইউজারগণ তাদের অনলাইন স্টোর চালু করার জন্য আবেদন পাঠিয়েছেন। যাচাই করে অনুমোদন বা বাতিল করুন।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter('requested')}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
            >
              শুধুমাত্র আবেদনসমূহ দেখুন
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingRequests.map((req) => (
              <div
                key={req.userId}
                className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-teal-700" />
                        <span>{req.shopName}</span>
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        মালিক: {req.userName} • {req.phone}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold shrink-0 border border-indigo-200/60">
                      {req.subscriptionPlan || 'ফ্রি ট্রায়াল'}
                    </span>
                  </div>

                  {req.onlineStoreNote && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 font-medium">
                      <span className="font-bold text-amber-950">আবেদনের নোট:</span> &ldquo;{req.onlineStoreNote}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      আবেদনের সময়:{' '}
                      {req.onlineStoreRequestedAt
                        ? new Date(req.onlineStoreRequestedAt).toLocaleString('bn-BD')
                        : 'সম্প্রতি'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={activeActionUserId === req.userId}
                    onClick={() => handleApproveRequest(req)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>অনুমোদন দিন</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeActionUserId === req.userId}
                    onClick={() => handleOpenRejectModal(req)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-700 hover:border-rose-200 font-bold text-xs border border-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>বাতিল</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(req)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition cursor-pointer"
                    title="ডোমেন ও সেটিংস এডিট"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল স্টোর ({stores.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('requested')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'requested'
                  ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                  : 'text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <span>আবেদন অপেক্ষমাণ</span>
              {pendingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              সক্রিয় ({activeStoresCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'disabled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              স্থগিত / বন্ধ ({disabledStoresCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="দোকানের নাম, ফোন, সাবডোমেন দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stores Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">দোকান ও মালিকের তথ্য</th>
                <th className="p-3.5">অনলাইন স্টোর লিঙ্ক / ডোমেন</th>
                <th className="p-3.5 text-center">স্টোর পাওয়ার (সুইচ)</th>
                <th className="p-3.5 text-center">বর্তমান স্ট্যাটাস</th>
                <th className="p-3.5 text-center">পণ্য সংখ্যা</th>
                <th className="p-3.5 text-center">সাবস্ক্রিপশন</th>
                <th className="p-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    কোনো অনলাইন স্টোর পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  const isPending = store.onlineStoreStatus === 'requested';
                  const isActive = store.onlineStoreStatus === 'active';
                  const isDisabled = store.onlineStoreStatus === 'disabled';
                  const slug = store.storeSlug || `store-${store.userId.slice(-4)}`;

                  return (
                    <tr key={store.userId} className="hover:bg-slate-50/70 transition">
                      {/* Shop & Owner */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-black text-xs shrink-0">
                            {store.shopName ? store.shopName.charAt(0) : 'দ'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-snug">
                              {store.shopName || 'আমার দোকান'}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {store.userName} • {store.phone}
                            </span>
                            {store.onlineStoreNote && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 inline-block mt-0.5 max-w-[200px] truncate">
                                নোট: {store.onlineStoreNote}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Store link / subdomain */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                            <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="font-semibold text-teal-950 truncate max-w-[160px]">
                              {slug}.twinghisabi.site
                            </span>
                            <button
                              type="button"
                              onClick={() => openStorefront(store)}
                              className="p-1 text-slate-400 hover:text-teal-600 transition cursor-pointer"
                              title="ভিজিট করুন"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                          {store.customDomain && (
                            <div className="flex items-center gap-1 text-[10px] text-indigo-700 font-medium">
                              <Link className="w-3 h-3" />
                              <span>{store.customDomain}</span>
                              {store.customDomainVerified ? (
                                <span className="text-emerald-600 font-bold">✓ ভেরিফাইড</span>
                              ) : (
                                <span className="text-amber-600 font-bold">⏳ অপেক্ষমাণ</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Power Toggle Switch */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          disabled={activeActionUserId === store.userId}
                          onClick={() => handleToggleStore(store)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isActive ? 'স্টোর বন্ধ করতে ক্লিক করুন' : 'স্টোর চালু করতে ক্লিক করুন'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                          {isActive ? 'অন' : 'অফ'}
                        </span>
                      </td>

                      {/* Current Status Badge */}
                      <td className="p-3.5 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] animate-pulse border border-amber-300">
                            <Clock className="w-3 h-3" />
                            <span>আবেদন পর্যালোচনায়</span>
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>লাইভ ও সক্রিয়</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>নিষ্ক্রিয় / বন্ধ</span>
                          </span>
                        )}
                      </td>

                      {/* Products */}
                      <td className="p-3.5 text-center font-bold text-slate-700">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{store.publishedProductsCount || 0} টি</span>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                          {store.subscriptionPlan || 'ট্রায়াল'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-right space-x-1">
                        {isPending && (
                          <button
                            type="button"
                            disabled={activeActionUserId === store.userId}
                            onClick={() => handleApproveRequest(store)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                            title="অনুমোদন দিন"
                          >
                            <Check className="w-3 h-3" />
                            <span>অনুমোদন</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(store)}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-50 text-teal-800 border border-slate-200 hover:border-teal-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                          title="ডোমেন ও সেটিংস"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>ডোমেন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewDetailsModal(store)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                          title="বিস্তারিত তথ্য"
                        >
                          <span>বিস্তারিত</span>
                        </button>
                        {onImpersonate && (
                          <button
                            type="button"
                            onClick={() => onImpersonate(store.userId)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            title="ইউজার হিসেবে লগইন"
                          >
                            <User className="w-3 h-3" />
                            <span>লগইন</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Domain & Slug Modal */}
      {editStoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">অনলাইন স্টোর ডোমেন কনফিগার</h3>
                  <p className="text-xs text-slate-500">{editStoreModal.shopName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditStoreModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStore} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">ফ্রি সাবডোমেন স্লাগ (Subdomain Slug):</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="shopname"
                    className="flex-1 px-3.5 py-2.5 rounded-l-2xl border border-r-0 border-slate-200 text-xs font-mono font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="px-3 py-2.5 rounded-r-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
                    .twinghisabi.site
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">কাস্টম ডোমেন (Custom Domain):</label>
                <input
                  type="text"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value)}
                  placeholder="যেমন: mybrand.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">কাস্টম ডোমেন ভেরিফিকেশন</span>
                  <span className="text-[11px] text-slate-500 block">সুপার অ্যাডমিন দ্বারা ডোমেন স্ট্যাটাস নিশ্চিত</span>
                </div>
                <input
                  type="checkbox"
                  checked={editDomainVerified}
                  onChange={(e) => setEditDomainVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 cursor-pointer accent-teal-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStoreModal(null)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition shadow cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-black text-base text-slate-900">অনলাইন স্টোর আবেদন বাতিল</h3>
            </div>
            <p className="text-xs text-slate-600">
              আপনি কি নিশ্চিত যে <strong className="text-slate-900">{rejectModalUser.shopName}</strong>-এর অনলাইন স্টোর চালুর আবেদনটি বাতিল করতে চান?
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">বাতিলের কারণ / গ্রাহককে প্রেরিত নোট:</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="বাতিলের কারণ লিখুন..."
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition shadow cursor-pointer disabled:opacity-50"
              >
                {isSubmittingReject ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-3">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{viewDetailsModal.shopName}</h3>
                  <p className="text-xs text-slate-500">মালিক: {viewDetailsModal.userName} • {viewDetailsModal.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailsModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">অনলাইন স্টোর অবস্থা:</span>
                  <span className="font-black text-slate-900">
                    {viewDetailsModal.onlineStoreStatus === 'active'
                      ? '🟢 সক্রিয়'
                      : viewDetailsModal.onlineStoreStatus === 'requested'
                      ? '🟡 আবেদন পর্যালোচনায়'
                      : '🔴 বন্ধ'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold">প্রকাশিত পণ্য:</span>
                  <span className="font-black text-slate-900">{viewDetailsModal.publishedProductsCount || 0} টি</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 block font-bold">লাইভ ওয়েব এড্রেস:</span>
                <span className="font-mono font-bold text-teal-900 block select-all">
                  https://{viewDetailsModal.storeSlug || `store-${viewDetailsModal.userId.slice(-4)}`}.twinghisabi.site
                </span>
                {viewDetailsModal.customDomain && (
                  <span className="font-mono text-indigo-900 block select-all">
                    কাস্টম ডোমেন: https://{viewDetailsModal.customDomain}
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 block font-bold">পেমেন্ট মেথড কনফিগারেশন:</span>
                <p className="text-slate-700">
                  ক্যাশ অন ডেলিভারি: {viewDetailsModal.acceptCod ? 'সক্রিয়' : 'বন্ধ'} |{' '}
                  বিকাশ: {viewDetailsModal.acceptBkash ? (viewDetailsModal.bkashNumber || 'চালু') : 'বন্ধ'} |{' '}
                  নগদ: {viewDetailsModal.acceptNagad ? (viewDetailsModal.nagadNumber || 'চালু') : 'বন্ধ'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 block font-bold">ডেলিভারি চার্জ:</span>
                <p className="text-slate-700">
                  ঢাকার ভিতরে: ৳{viewDetailsModal.deliveryInsideDhaka || 60} | ঢাকার বাইরে: ৳{viewDetailsModal.deliveryOutsideDhaka || 120}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setViewDetailsModal(null);
                  openStorefront(viewDetailsModal);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>লাইভ স্টোর দেখুন</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetailsModal(null)}
                className="py-2.5 px-4 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
