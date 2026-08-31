import React, { useState } from 'react';
import {
  AdminNotification,
  NotificationTarget,
  NotificationType,
  PriorityLevel,
  AppUser,
} from '../../types/adminTypes';
import {
  Bell,
  Send,
  Trash2,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  Radio,
  Plus,
  Search,
  UserCheck,
  Store,
  Phone,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface NotificationManagementTabProps {
  notifications: AdminNotification[];
  users: AppUser[];
  onSendNotification: (notif: AdminNotification) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const NotificationManagementTab: React.FC<NotificationManagementTabProps> = ({
  notifications,
  users,
  onSendNotification,
  onDeleteNotification,
  onShowToast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<NotificationTarget>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [type, setType] = useState<NotificationType>('general');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [sending, setSending] = useState(false);
  const [filterNotifTarget, setFilterNotifTarget] = useState<string>('all');

  const selectedUser = users.find((u) => u.id === targetUserId);

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.shopName || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      onShowToast('অনুগ্রহ করে নোটিফিকেশনের শিরোনাম ও বার্তা লিখুন');
      return;
    }

    if (target === 'specific' && !targetUserId) {
      onShowToast('অনুগ্রহ করে একজন নির্দিষ্ট ইউজার নির্বাচন করুন');
      return;
    }

    setSending(true);

    const newNotif: AdminNotification = {
      id: 'notif_' + Date.now(),
      title: title.trim(),
      message: message.trim(),
      type,
      target,
      targetUserId: target === 'specific' ? targetUserId : undefined,
      targetUserName: target === 'specific' ? selectedUser?.name : undefined,
      priority,
      createdAt: Date.now(),
      isRead: false,
    };

    try {
      await onSendNotification(newNotif);
      setTitle('');
      setMessage('');
      if (target === 'specific') {
        onShowToast(`✅ ইউজার "${selectedUser?.name}"-কে প্রাইভেট নোটিফিকেশন পাঠানো হয়েছে!`);
      } else {
        onShowToast(`✅ সফলভাবে নোটিফিকেশন ব্রডকাস্ট করা হয়েছে!`);
      }
    } catch (err: any) {
      onShowToast(`❌ নোটিফিকেশন পাঠাতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setSending(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterNotifTarget === 'all') return true;
    if (filterNotifTarget === 'broadcast') return n.target === 'all' || n.target === 'active' || n.target === 'expired';
    if (filterNotifTarget === 'specific') return n.target === 'specific';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      {/* Left: Compose Form (5 Cols) */}
      <div className="lg:col-span-5 bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">নতুন নোটিফিকেশন পাঠান</h3>
            <p className="text-[11px] text-slate-400">নির্দিষ্ট বা সকল ইউজারকে ইন-অ্যাপ নোটিফিকেশন অ্যালার্ট</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-4 text-xs">
          {/* Target Audience Selector */}
          <div>
            <label className="block font-bold text-slate-300 mb-2">
              প্রাপক / অডিয়েন্স নির্বাচন <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { id: 'all', label: `সকল ইউজার (${users.length})`, desc: 'গ্লোবাল নোটিফিকেশন' },
                { id: 'active', label: 'সক্রিয় ইউজার', desc: 'Active সাবস্ক্রাইবার' },
                { id: 'expired', label: 'মেয়াদ শেষ ইউজার', desc: 'Expired একাউন্ট' },
                { id: 'specific', label: 'নির্দিষ্ট এক ইউজার', desc: 'প্রাইভেট নোটিফিকেশন' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTarget(opt.id as NotificationTarget)}
                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    target === opt.id
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300 ring-1 ring-teal-400/40 shadow-sm'
                      : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="font-black text-xs leading-tight">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Targeted User Picker (Enhanced User Selector) */}
            {target === 'specific' && (
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-teal-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    <span>ইউজার নির্বাচন করুন</span>
                  </span>
                  {selectedUser && (
                    <button
                      type="button"
                      onClick={() => setTargetUserId('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      পরিবর্তন করুন
                    </button>
                  )}
                </div>

                {selectedUser ? (
                  <div className="p-3 bg-teal-950/50 border border-teal-500/40 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-white text-xs truncate">{selectedUser.name}</div>
                        <div className="text-[11px] text-teal-300 truncate">
                          {selectedUser.shopName} • {selectedUser.phone}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
                      নির্বাচিত
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="নাম, ফোন বা দোকান দিয়ে খুঁজুন..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {filteredUsers.length === 0 ? (
                        <div className="text-center py-4 text-slate-500 text-[11px]">
                          কোনো ইউজার পাওয়া যায়নি
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setTargetUserId(u.id);
                              setUserSearch('');
                            }}
                            className="w-full p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left transition flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-200 group-hover:text-white text-xs truncate">
                                  {u.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {u.shopName} • {u.phone}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {u.status === 'active' ? 'Active' : 'Expired'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              নোটিফিকেশন টাইটেল <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: 📢 বিশেষ ছাড়ের অফার / সাবস্ক্রিপশন আপডেট"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              বিস্তারিত বার্তা <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ইউজারের স্ক্রিনে যে বার্তাটি প্রদর্শিত হবে..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">ক্যাটাগরি</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="general">সাধারণ বার্তা</option>
                <option value="subscription_warning">মেয়াদ সতর্কবার্তা</option>
                <option value="subscription_expired">মেয়াদ শেষ নোটিশ</option>
                <option value="update">ফিচার আপডেট</option>
                <option value="payment_receipt">পেমেন্ট রিসিপ্ট</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">গুরুত্ব / Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white focus:border-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="low">সাধারণ (Low)</option>
                <option value="normal">স্ট্যান্ডার্ড (Normal)</option>
                <option value="high">উচ্চ অগ্রাধিকার (High)</option>
                <option value="urgent">জরুরি (Urgent)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{sending ? 'পাঠানো হচ্ছে...' : 'নোটিফিকেশন পাঠান'}</span>
          </button>
        </form>
      </div>

      {/* Right: Sent Notifications History (7 Cols) */}
      <div className="lg:col-span-7 bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  প্রেরিত নোটিফিকেশন হিস্ট্রি ({notifications.length})
                </h3>
                <p className="text-[10px] text-slate-400">সকল ব্রডকাস্ট ও প্রাইভেট নোটিফিকেশনের রেকর্ড</p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterNotifTarget('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterNotifTarget === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                সব
              </button>
              <button
                type="button"
                onClick={() => setFilterNotifTarget('broadcast')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterNotifTarget === 'broadcast' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ব্রডকাস্ট
              </button>
              <button
                type="button"
                onClick={() => setFilterNotifTarget('specific')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterNotifTarget === 'specific' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                প্রাইভেট
              </button>
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              <Bell className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
              <p>এখনও কোনো নোটিফিকেশন পাঠানো হয়নি</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs flex items-start justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-white text-sm truncate">{notif.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          notif.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : notif.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        }`}
                      >
                        {notif.priority.toUpperCase()}
                      </span>
                      {notif.target === 'specific' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          🔒 প্রাইভেট
                        </span>
                      )}
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{notif.message}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>
                        প্রাপক:{' '}
                        <span className="font-bold text-teal-300">
                          {notif.target === 'all'
                            ? 'সকল ইউজার (Global)'
                            : notif.target === 'active'
                            ? 'সক্রিয় ইউজার'
                            : notif.target === 'expired'
                            ? 'মেয়াদ শেষ ইউজার'
                            : `ইউজার: ${notif.targetUserName || notif.targetUserId}`}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(notif.createdAt).toLocaleDateString('bn-BD')} (
                        {new Date(notif.createdAt).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                        )
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteNotification(notif.id)}
                    title="নোটিফিকেশন মুছুন"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

