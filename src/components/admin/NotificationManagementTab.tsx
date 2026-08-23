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
  const [type, setType] = useState<NotificationType>('general');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [sending, setSending] = useState(false);

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
    const selectedUser = users.find((u) => u.id === targetUserId);

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

    await onSendNotification(newNotif);
    setSending(false);
    setTitle('');
    setMessage('');
    onShowToast(`✅ নোটিফিকেশন সফলভাবে ব্রডকাস্ট করা হয়েছে!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Compose Form (5 Cols) */}
      <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">নতুন নোটিফিকেশন পাঠান</h3>
            <p className="text-[11px] text-slate-500">ইউজারদের ইন-অ্যাপ নোটিফিকেশন ব্রডকাস্ট</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              প্রাপক / অডিয়েন্স নির্বাচন <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { id: 'all', label: `সকল ইউজার (${users.length})` },
                { id: 'active', label: 'সক্রিয় ইউজার' },
                { id: 'expired', label: 'মেয়াদ শেষ ইউজার' },
                { id: 'specific', label: 'নির্দিষ্ট এক ইউজার' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTarget(opt.id as NotificationTarget)}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold text-left transition cursor-pointer ${
                    target === opt.id
                      ? 'bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {target === 'specific' && (
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="">-- ইউজার বেছে নিন --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.shopName}) - {u.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              নোটিফিকেশন টাইটেল <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: বিশেষ ছাড়ের অফার / সিস্টেম আপডেট"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              বিস্তারিত বার্তা <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ইউজারের স্ক্রিনে যে বার্তাটি প্রদর্শিত হবে..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
              >
                <option value="general">সাধারণ বার্তা</option>
                <option value="subscription_warning">মেয়াদ সতর্কবার্তা</option>
                <option value="subscription_expired">মেয়াদ শেষ নোটিশ</option>
                <option value="update">ফিচার আপডেট</option>
                <option value="payment_receipt">পেমেন্ট রিসিপ্ট</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">গুরুত্ব / Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
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
            className="w-full py-2.5 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'পাঠানো হচ্ছে...' : 'নোটিফিকেশন ব্রডকাস্ট করুন'}</span>
          </button>
        </form>
      </div>

      {/* Right: Sent Notifications History (7 Cols) */}
      <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">
                প্রেরিত নোটিফিকেশন হিস্ট্রি ({notifications.length})
              </h3>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              এখনও কোনো নোটিফিকেশন পাঠানো হয়নি
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{notif.title}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          notif.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : notif.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {notif.priority}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11.5px] leading-relaxed">{notif.message}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-1">
                      <span>
                        টার্গেট:{' '}
                        <span className="font-bold text-slate-700">
                          {notif.target === 'all'
                            ? 'সকল ইউজার'
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
                    onClick={() => {
                      if (window.confirm('আপনি কি এই নোটিফিকেশনটি মুছে ফেলতে চান?')) {
                        onDeleteNotification(notif.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
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
