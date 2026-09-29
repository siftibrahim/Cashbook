import React, { useState, useMemo } from 'react';
import { AdminActivityLog } from '../../types/adminTypes';
import {
  Clock,
  Search,
  Trash2,
  Shield,
  Filter,
  CheckCircle2,
  FileText,
  RefreshCw,
  Download,
  Eye,
  X,
  CreditCard,
  Users,
  ShoppingBag,
  MessageSquare,
  Settings,
  AlertTriangle,
  Calendar,
  UserCheck,
  Activity,
  Sparkles,
} from 'lucide-react';

interface ActivityLogTabProps {
  logs: AdminActivityLog[];
  onClearLogs: () => Promise<void>;
  onDeleteLog?: (logId: string) => Promise<void>;
  onRefreshLogs?: () => Promise<any>;
  onShowToast: (msg: string) => void;
}

type AuditCategory =
  | 'all'
  | 'payment'
  | 'user'
  | 'marketplace'
  | 'sms'
  | 'system';

type DateFilter = 'all' | 'today' | '7days' | '30days';

export function getAuditActionMeta(action: string, targetEntity?: string): {
  labelBn: string;
  category: AuditCategory;
  badgeClass: string;
} {
  const act = (action || '').toUpperCase();
  const entity = (targetEntity || '').toLowerCase();

  if (
    act.includes('PAYMENT') ||
    act.includes('REFUND') ||
    entity.includes('payment')
  ) {
    if (act.includes('APPROVE')) {
      return {
        labelBn: 'পেমেন্ট অনুমোদন',
        category: 'payment',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    }
    if (act.includes('REJECT')) {
      return {
        labelBn: 'পেমেন্ট বাতিল',
        category: 'payment',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    }
    if (act.includes('REFUND')) {
      return {
        labelBn: 'রিফান্ড প্রসেস',
        category: 'payment',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    }
    return {
      labelBn: 'পেমেন্ট ও ফিন্যান্স অডিট',
      category: 'payment',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    };
  }

  if (
    act.includes('MARKETPLACE') ||
    act.includes('MALL') ||
    act.includes('ORDER') ||
    act.includes('VENDOR') ||
    act.includes('SETTLEMENT') ||
    act.includes('KYC') ||
    entity.includes('marketplace') ||
    entity.includes('order') ||
    entity.includes('vendor')
  ) {
    if (act.includes('PAYMENT_APPROVE')) {
      return {
        labelBn: 'মার্কেটপ্লেস পেমেন্ট অনুমোদন',
        category: 'marketplace',
        badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      };
    }
    if (act.includes('STATUS') || act.includes('ORDER')) {
      return {
        labelBn: 'মার্কেটপ্লেস অর্ডার আপডেট',
        category: 'marketplace',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      };
    }
    if (act.includes('PRODUCT')) {
      return {
        labelBn: 'মার্কেটপ্লেস প্রোডাক্ট মডারেশন',
        category: 'marketplace',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      };
    }
    return {
      labelBn: 'সেন্ট্রাল মার্কেটপ্লেস অডিট',
      category: 'marketplace',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    };
  }

  if (act.includes('SMS') || act.includes('TAGADA') || entity.includes('sms')) {
    if (act.includes('APPROVE')) {
      return {
        labelBn: 'এসএমএস প্যাক অনুমোদন',
        category: 'sms',
        badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      };
    }
    if (act.includes('REJECT')) {
      return {
        labelBn: 'এসএমএস প্যাক বাতিল',
        category: 'sms',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    }
    return {
      labelBn: 'এসএমএস ও গেটওয়ে অডিট',
      category: 'sms',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
  }

  if (
    act.includes('USER') ||
    act.includes('SUBSCRIPTION') ||
    act.includes('STORE') ||
    act.includes('SHOP') ||
    act.includes('STAFF') ||
    entity.includes('user') ||
    entity.includes('staff')
  ) {
    if (act.includes('EXTEND') || act.includes('SUBSCRIPTION')) {
      return {
        labelBn: 'সাবস্ক্রিপশন আপডেট',
        category: 'user',
        badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
      };
    }
    if (act.includes('DELETE') || act.includes('SUSPEND')) {
      return {
        labelBn: 'ইউজার অ্যাক্সেস কন্ট্রোল',
        category: 'user',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    }
    if (act.includes('STAFF')) {
      return {
        labelBn: 'স্টাফ ও রোল অডিট',
        category: 'user',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    }
    return {
      labelBn: 'ইউজার ও স্টোর ম্যানেজমেন্ট',
      category: 'user',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
  }

  return {
    labelBn: 'সিস্টেম ও সিকিউরিটি অডিট',
    category: 'system',
    badgeClass: 'bg-slate-700/80 text-slate-200 border-slate-600',
  };
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  logs,
  onClearLogs,
  onDeleteLog,
  onRefreshLogs,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminActivityLog | null>(null);

  const safeLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return [...logs].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }, [logs]);

  const stats = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    let todayCount = 0;
    let paymentCount = 0;
    let marketplaceCount = 0;
    let userCount = 0;
    let systemCount = 0;

    safeLogs.forEach((log) => {
      if (Number(log.timestamp || 0) >= todayMs && Number(log.timestamp || 0) <= now + 86400000) {
        todayCount++;
      }
      const meta = getAuditActionMeta(log.action, log.targetEntity);
      if (meta.category === 'payment') paymentCount++;
      else if (meta.category === 'marketplace') marketplaceCount++;
      else if (meta.category === 'user') userCount++;
      else systemCount++;
    });

    return {
      total: safeLogs.length,
      todayCount,
      paymentCount,
      marketplaceCount,
      userCount,
      systemCount,
    };
  }, [safeLogs]);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return safeLogs.filter((log) => {
      const meta = getAuditActionMeta(log.action, log.targetEntity);
      if (selectedCategory !== 'all' && meta.category !== selectedCategory) {
        return false;
      }

      const ts = Number(log.timestamp || 0);
      if (dateFilter === 'today' && ts < startOfToday.getTime()) {
        return false;
      }
      if (dateFilter === '7days' && ts < now - 7 * 86400000) {
        return false;
      }
      if (dateFilter === '30days' && ts < now - 30 * 86400000) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (log.action || '').toLowerCase().includes(q) ||
        meta.labelBn.toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.adminEmail || '').toLowerCase().includes(q) ||
        (log.targetName || '').toLowerCase().includes(q) ||
        (log.targetId || '').toLowerCase().includes(q) ||
        (log.targetEntity || '').toLowerCase().includes(q)
      );
    });
  }, [safeLogs, selectedCategory, dateFilter, searchQuery]);

  const handleRefresh = async () => {
    if (!onRefreshLogs) return;
    setIsRefreshing(true);
    try {
      await onRefreshLogs();
      onShowToast('অডিট লগ সফলভাবে রিফ্রেশ করা হয়েছে');
    } catch {
      onShowToast('রিফ্রেশ করতে সমস্যা হয়েছে');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportAuditCsv = () => {
    if (filteredLogs.length === 0) {
      onShowToast('এক্সপোর্ট করার মতো কোনো অডিট লগ নেই');
      return;
    }
    const headers = ['Audit ID', 'Date & Time', 'Category', 'Action Code', 'Admin Email', 'Target Entity', 'Target Name', 'Target ID', 'Details'];
    const rows = filteredLogs.map((l) => {
      const meta = getAuditActionMeta(l.action, l.targetEntity);
      const dt = new Date(Number(l.timestamp || Date.now())).toLocaleString('bn-BD');
      return [
        l.id,
        dt,
        meta.labelBn,
        l.action,
        l.adminEmail || 'Super Admin',
        l.targetEntity || '-',
        l.targetName || '-',
        l.targetId || '-',
        (l.details || '').replace(/"/g, '""'),
      ]
        .map((cell) => `"${cell}"`)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `superadmin_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('অডিট রিপোর্ট (CSV) ডাউনলোড সম্পন্ন হয়েছে');
  };

  const getCategoryIcon = (cat: AuditCategory) => {
    switch (cat) {
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'marketplace':
        return <ShoppingBag className="w-4 h-4 text-indigo-400" />;
      case 'user':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      default:
        return <Shield className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Summary Metrics */}
      <div className="bg-gradient-to-br from-[#101A2D] via-[#0F172A] to-[#1E1B4B]/60 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  সুপার অ্যাডমিন সিকিউরিটি ও অডিট সেন্টার
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  লাইভ অডিট ট্র্যাকিং সক্রিয়
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                সাবস্ক্রিপশন পেমেন্ট, সেন্ট্রাল মার্কেটপ্লেস, ইউজার কন্ট্রোল এবং সিস্টেম সেটিংসের প্রতিটি পরিবর্তনের নির্ভুল রেকর্ড
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRefreshLogs && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>অডিট রিপোর্ট (CSV)</span>
            </button>

            {safeLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>লগ ক্লিয়ার</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>মোট অডিট রেকর্ড</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {stats.total.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">সর্বমোট সংরক্ষিত ইভেন্ট</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>আজকের অ্যাক্টিভিটি</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300 mt-1">
              {stats.todayCount.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">আজকের দিনে সম্পাদিত</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>পেমেন্ট ও ফিন্যান্স</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-300 mt-1">
              {stats.paymentCount.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">অনুমোদন, রিফান্ড ও প্ল্যান</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>সেন্ট্রাল মার্কেটপ্লেস</span>
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-cyan-300 mt-1">
              {stats.marketplaceCount.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">অর্ডার ও ভেন্ডর অডিট</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ইউজার ও স্টোর</span>
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-xl font-black text-violet-300 mt-1">
              {stats.userCount.toLocaleString('bn-BD')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">ইউজার, স্টাফ ও স্টোর কন্ট্রোল</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#101A2D] p-4 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অডিট অ্যাকশন, শপের নাম, ইমেইল, টার্গেট আইডি বা বিবরণ দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'all', label: 'সব সময়' },
                { id: 'today', label: 'আজ' },
                { id: '7days', label: '৭ দিন' },
                { id: '30days', label: '৩০ দিন' },
              ] as { id: DateFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  dateFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          {(
            [
              { id: 'all', label: `সব অডিট (${safeLogs.length})` },
              { id: 'payment', label: `পেমেন্ট ও ফিন্যান্স (${stats.paymentCount})` },
              { id: 'marketplace', label: `সেন্ট্রাল মার্কেটপ্লেস (${stats.marketplaceCount})` },
              { id: 'user', label: `ইউজার ও সাবস্ক্রিপশন (${stats.userCount})` },
              { id: 'sms', label: 'এসএমএস ও গেটওয়ে' },
              { id: 'system', label: `সিস্টেম ও সিকিউরিটি (${stats.systemCount})` },
            ] as { id: AuditCategory; label: string }[]
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                selectedCategory === cat.id
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Confirmation Banner */}
      {showClearConfirm && (
        <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-bold text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              আপনি কি নিশ্চিত যে সমস্ত অ্যাডমিন অডিট লগ মুছে ফেলতে চান? এই অ্যাকশনটি পূর্বাবস্থায় ফেরানো যাবে না।
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowClearConfirm(false);
                await onClearLogs();
                onShowToast('অডিট লগ হিস্ট্রি সফলভাবে ক্লিয়ার করা হয়েছে');
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              হ্যাঁ, সব মুছে ফেলুন
            </button>
          </div>
        </div>
      )}

      {/* Audit List */}
      <div className="bg-[#101A2D] rounded-3xl border border-slate-800 shadow-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-300">কোনো অডিট রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500 mt-1">
              ফিল্টার বা সার্চ পরিবর্তন করে আবার চেষ্টা করুন
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => {
              const meta = getAuditActionMeta(log.action, log.targetEntity);
              const ts = Number(log.timestamp || Date.now());
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-slate-900/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(meta.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-black px-2.5 py-0.5 rounded-lg text-[11px] border ${meta.badgeClass}`}
                        >
                          {meta.labelBn}
                        </span>
                        <span className="text-[10.5px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {log.action}
                        </span>
                        {log.targetName && (
                          <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                            🎯 {log.targetName}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-200 mt-2 text-xs sm:text-[13px] leading-relaxed break-words">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>অ্যাডমিন: <strong className="text-slate-300 font-mono">{log.adminEmail || 'Super Admin'}</strong></span>
                        </span>
                        {log.targetEntity && (
                          <span>
                            • মডিউল: <strong className="text-slate-300">{log.targetEntity}</strong>
                          </span>
                        )}
                        {log.targetId && (
                          <span>
                            • ID: <code className="text-indigo-300 font-mono">{log.targetId}</code>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2.5 sm:pt-0">
                    <div className="text-left sm:text-right text-slate-400 text-[11px] font-mono">
                      <div className="text-slate-300 font-bold">
                        {new Date(ts).toLocaleDateString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div>
                        {new Date(ts).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>বিস্তারিত</span>
                      </button>
                      {onDeleteLog && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteLog(log.id);
                            onShowToast('অডিট লগটি মুছে ফেলা হয়েছে');
                          }}
                          title="লগটি মুছে ফেলুন"
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#101A2D] border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">অডিট ইভেন্ট বিস্তারিত তথ্য</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const meta = getAuditActionMeta(selectedLog.action, selectedLog.targetEntity);
                const ts = Number(selectedLog.timestamp || Date.now());
                return (
                  <>
                    <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">অডিট ক্যাটাগরি</div>
                        <div className="font-black text-white text-sm mt-0.5">{meta.labelBn}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold border ${meta.badgeClass}`}>
                        {selectedLog.action}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400">কার্যকলাপের পূর্ণ বিবরণ:</div>
                      <p className="text-slate-100 text-xs sm:text-sm leading-relaxed font-medium">
                        {selectedLog.details}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">সম্পাদনকারী অ্যাডমিন</div>
                        <div className="font-mono font-bold text-emerald-300 mt-0.5 break-all">
                          {selectedLog.adminEmail || 'Super Admin'}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">তারিখ ও সময়</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {new Date(ts).toLocaleString('bn-BD', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">টার্গেট মডিউল / এনটিটি</div>
                        <div className="font-bold text-indigo-300 mt-0.5">
                          {selectedLog.targetEntity || 'System'}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">টার্গেট নাম / আইডি</div>
                        <div className="font-bold text-slate-200 mt-0.5 break-all">
                          {selectedLog.targetName || '-'}{' '}
                          {selectedLog.targetId ? `(${selectedLog.targetId})` : ''}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
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
