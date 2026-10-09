import React, { useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Trash2,
  X,
  UserPlus,
  UserCheck,
  Check,
} from 'lucide-react';
import { SocialNotification } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

interface FacebookNotificationsViewProps {
  notifications: SocialNotification[];
  onRefresh: () => void;
  onSelectNotification?: (notif: SocialNotification) => void;
  onClose?: () => void;
}

export const FacebookNotificationsView: React.FC<FacebookNotificationsViewProps> = ({
  notifications,
  onRefresh,
  onSelectNotification,
  onClose,
}) => {
  const [actionDoneMap, setActionDoneMap] = useState<Record<string, string>>({});

  const handleMarkAllRead = () => {
    marketplaceSocialService.markAllNotificationsAsRead();
    onRefresh();
  };

  const handleNotificationClick = (notif: SocialNotification) => {
    marketplaceSocialService.markNotificationAsRead(notif.id);
    onRefresh();
    onSelectNotification?.(notif);
  };

  const handleAcceptFriend = (e: React.MouseEvent, notif: SocialNotification) => {
    e.stopPropagation();
    const res = marketplaceSocialService.acceptFriendRequest(notif.targetId || notif.senderId);
    setActionDoneMap((prev) => ({ ...prev, [notif.id]: 'accepted' }));
    marketplaceSocialService.markNotificationAsRead(notif.id);
    onRefresh();
  };

  const handleRejectFriend = (e: React.MouseEvent, notif: SocialNotification) => {
    e.stopPropagation();
    const res = marketplaceSocialService.rejectFriendRequest(notif.targetId || notif.senderId);
    setActionDoneMap((prev) => ({ ...prev, [notif.id]: 'rejected' }));
    marketplaceSocialService.markNotificationAsRead(notif.id);
    onRefresh();
  };

  const getIcon = (type: SocialNotification['type'], reactionType?: string) => {
    switch (type) {
      case 'friend_request':
        return (
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <UserPlus className="w-3.5 h-3.5" />
          </span>
        );
      case 'friend_accept':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
            <UserCheck className="w-3.5 h-3.5" />
          </span>
        );
      case 'reaction':
        return reactionType === 'love' ? (
          <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
            ❤️
          </span>
        ) : reactionType === 'care' ? (
          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
            🥰
          </span>
        ) : reactionType === 'haha' ? (
          <span className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs">
            😆
          </span>
        ) : reactionType === 'wow' ? (
          <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">
            😮
          </span>
        ) : (
          <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-xs">
            👍
          </span>
        );
      case 'comment':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5" />
          </span>
        );
      case 'order':
        return (
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5" />
          </span>
        );
      case 'message':
        return (
          <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center">
            <Bell className="w-3.5 h-3.5" />
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#1877F2]" />
          <h3 className="font-black text-sm text-slate-900">নোটিফিকেশন</h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#1877F2] text-[10px] font-black">
            {notifications.filter((n) => !n.read).length} টি নতুন
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[11px] font-bold text-[#1877F2] hover:underline cursor-pointer"
          >
            সব পড়া হয়েছে
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-xs">কোনো নোটিফিকেশন নেই</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                !notif.read ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'
              }`}
            >
              {/* Avatar with icon badge */}
              <div className="relative shrink-0">
                <img
                  src={notif.senderAvatar}
                  alt={notif.senderName}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
                <div className="absolute -bottom-1 -right-1">
                  {getIcon(notif.type, notif.reactionType)}
                </div>
              </div>

              {/* Text & Actions */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 leading-snug">
                  {notif.text}
                </p>

                {/* Friend Request Accept/Reject Buttons */}
                {notif.type === 'friend_request' && (
                  <div className="mt-2 flex items-center gap-2">
                    {actionDoneMap[notif.id] === 'accepted' ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> আপনারা এখন বন্ধু!
                      </span>
                    ) : actionDoneMap[notif.id] === 'rejected' ? (
                      <span className="text-[11px] font-bold text-slate-400">
                        রিকোয়েস্ট বাতিল করা হয়েছে
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleAcceptFriend(e, notif)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          গ্রহণ করুন
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRejectFriend(e, notif)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition cursor-pointer"
                        >
                          রিজেক্ট
                        </button>
                      </>
                    )}
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1.5 block">
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} • {new Date(notif.createdAt).toLocaleDateString('bn-BD')}
                </span>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] shrink-0 mt-2"></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
