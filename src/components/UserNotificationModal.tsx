import React, { useState } from 'react';
import { AdminNotification, PriorityLevel } from '../types/adminTypes';
import {
  Bell,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  CreditCard,
  Headphones,
  ShieldCheck,
  ChevronRight,
  Trash2,
} from 'lucide-react';

interface UserNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AdminNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onOpenSubscription?: () => void;
  onOpenSupport?: () => void;
}

export const UserNotificationModal: React.FC<UserNotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onOpenSubscription,
  onOpenSupport,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high';
    return true;
  });

  const formatBengaliDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('bn-BD', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 border border-rose-400/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>জরুরি</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-400/40">
            <span>গুরুত্বপূর্ণ</span>
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-700 border border-teal-400/30">
            <span>বিজ্ঞপ্তি</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-600 border border-slate-300">
            <span>তথ্য</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="user-notification-modal"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-teal-700/60 border border-teal-500/40 flex items-center justify-center text-teal-200 shrink-0 shadow-inner">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-teal-900 shadow-xs">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                বিজ্ঞপ্তি ও নোটিফিকেশন
              </h3>
              <p className="text-[11px] text-teal-200/90 leading-tight mt-0.5">
                {unreadCount > 0
                  ? `আপনার ${unreadCount} টি অপঠিত বিজ্ঞপ্তি আছে`
                  : 'সকল নোটিফিকেশন আপডেট'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                title="সকল বিজ্ঞপ্তি পঠিত মার্ক করুন"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 text-xs font-bold transition border border-white/15 active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>সব পঠিত</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Quick Read Button */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              সকল ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                filter === 'unread'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              অপঠিত ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                filter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              জরুরি / অফার
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="sm:hidden text-xs text-teal-700 font-bold hover:underline shrink-0 cursor-pointer"
            >
              সব পঠিত
            </button>
          )}
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3 shadow-inner">
                <Bell className="w-8 h-8 opacity-60" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">
                {filter === 'unread'
                  ? 'কোনো নতুন অপঠিত নোটিফিকেশন নেই'
                  : 'আপাতত কোনো নোটিফিকেশন নেই'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                অ্যাডমিন বা সিস্টেম থেকে নতুন কোনো আপডেট, পেমেন্ট সংক্রান্ত তথ্য বা নোটিশ আসলে এখানে দেখতে পাবেন।
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  id={`notif-card-${notif.id}`}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(notif.id);
                  }}
                  className={`p-4 rounded-2xl border transition-all relative ${
                    isUnread
                      ? 'bg-white border-teal-300 shadow-sm ring-1 ring-teal-500/20'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top row: Priority badge + Timestamp + Unread dot */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getPriorityBadge(notif.priority)}
                      {notif.type === 'subscription_expired' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          সাবস্ক্রিপশন
                        </span>
                      )}
                      {notif.type === 'payment_receipt' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          পেমেন্ট
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatBengaliDate(notif.createdAt)}</span>
                      </span>
                      {isUnread && (
                        <span
                          title="অপঠিত বিজ্ঞপ্তি"
                          className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"
                        />
                      )}
                      {onDeleteNotification && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(notif.id);
                          }}
                          title="মুছে ফেলুন"
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Message */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                    {notif.message}
                  </p>

                  {/* Contextual Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {(notif.type === 'subscription_expired' ||
                        notif.type === 'subscription_warning' ||
                        notif.message.includes('সাবস্ক্রিপশন') ||
                        notif.message.includes('মেয়াদ')) &&
                        onOpenSubscription && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread) onMarkAsRead(notif.id);
                              onClose();
                              onOpenSubscription();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>প্যাকেজ রিনিউ করুন</span>
                          </button>
                        )}

                      {(notif.type === 'security' || notif.message.includes('সাপোর্ট')) &&
                        onOpenSupport && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread) onMarkAsRead(notif.id);
                              onClose();
                              onOpenSupport();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                            <span>সাপোর্টে কথা বলুন</span>
                          </button>
                        )}
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notif.id);
                        }}
                        className="text-xs text-teal-700 hover:text-teal-900 font-bold ml-auto flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>পঠিত মার্ক করুন</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>অ্যাডমিন ও সিস্টেম কর্তৃক সুরক্ষিত বার্তা</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition cursor-pointer active:scale-95"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
