import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  X,
  Check,
  Trash2,
  MessageCircle,
  MapPin,
  ExternalLink,
  ShieldCheck,
  UserMinus,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { CustomerProfile, FriendRequest } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

interface FacebookFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
  onShowToast: (msg: string) => void;
}

export const FacebookFriendsModal: React.FC<FacebookFriendsModalProps> = ({
  isOpen,
  onClose,
  onViewProfile,
  onOpenChat,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'requests' | 'friends'>('suggestions');
  const [suggestions, setSuggestions] = useState<CustomerProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<CustomerProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);

  const loadData = () => {
    setSuggestions(marketplaceSocialService.getFriendSuggestions(15));
    setRequests(marketplaceSocialService.getPendingReceivedRequests());
    setFriends(marketplaceSocialService.getFriends());
    setSentRequests(marketplaceSocialService.getPendingSentRequests());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSync = () => {
      if (isOpen) loadData();
    };
    window.addEventListener('twing_profile_updated', handleSync);
    return () => window.removeEventListener('twing_profile_updated', handleSync);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendRequest = (targetUser: CustomerProfile) => {
    const res = marketplaceSocialService.sendFriendRequest(targetUser.id);
    onShowToast(res.message);
    loadData();
  };

  const handleCancelRequest = (targetUserId: string) => {
    const res = marketplaceSocialService.cancelSentFriendRequest(targetUserId);
    onShowToast(res.message);
    loadData();
  };

  const handleAcceptRequest = (req: FriendRequest) => {
    const res = marketplaceSocialService.acceptFriendRequest(req.id);
    onShowToast(res.message);
    loadData();
  };

  const handleRejectRequest = (req: FriendRequest) => {
    const res = marketplaceSocialService.rejectFriendRequest(req.id);
    onShowToast(res.message);
    loadData();
  };

  const handleUnfriend = (targetUserId: string, name: string) => {
    marketplaceSocialService.unfriend(targetUserId);
    onShowToast(`${name}-কে আনফ্রেন্ড করা হয়েছে।`);
    loadData();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                ফ্রেন্ড সাজেস্ট ও বন্ধু তালিকা
              </h2>
              <p className="text-xs font-bold text-slate-400">
                নতুন বন্ধুদের সাথে যুক্ত হোন এবং রিকোয়েস্ট ম্যানেজ করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 px-3 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('suggestions')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>ফ্রেন্ড সাজেস্ট</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
              {suggestions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>রিকোয়েস্ট</span>
            {requests.length > 0 && (
              <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-black transition relative cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>আমার বন্ধু ({friends.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 max-h-[60vh] bg-slate-50/50">
          {/* TAB 1: SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Users className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm">নতুন কোনো ফ্রেন্ড সাজেশন নেই</p>
                  <p className="text-xs">সার্চ বার থেকে অন্য বন্ধুদের খুঁজে বের করতে পারেন।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((user) => {
                    const isSent = sentRequests.some((r) => r.receiverId === user.id);
                    return (
                      <div
                        key={user.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                {user.name}
                              </h4>
                              {user.isVerified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 block truncate">
                              {user.username}
                            </span>
                            {user.location && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {user.location}
                              </span>
                            )}
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 font-medium">
                              {user.bio}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                          {isSent ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(user.id)}
                              className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3 h-3 text-amber-600" />
                              রিকোয়েস্ট প্রত্যাহার
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendRequest(user)}
                              className="flex-1 py-1.5 px-3 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              ফ্রেন্ড রিকোয়েস্ট পাঠান
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onViewProfile(user.id);
                              onClose();
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="প্রোফাইল দেখুন"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REQUESTS RECEIVED */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Inbox className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm">কোনো পেন্ডিং ফ্রেন্ড রিকোয়েস্ট নেই</p>
                  <p className="text-xs">কেউ রিকোয়েস্ট পাঠালে এখানে দেখতে পারবেন।</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={req.senderAvatar}
                          alt={req.senderName}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-black text-sm text-slate-900">
                            {req.senderName}
                          </h4>
                          <span className="text-xs font-bold text-slate-400 block">
                            {req.senderUsername}
                          </span>
                          {req.senderLocation && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {req.senderLocation}
                            </span>
                          )}
                          <span className="text-[10px] text-blue-600 font-bold block mt-1">
                            আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          গ্রহণ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          রিজেক্ট
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MY FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Users className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm">আপনার ফ্রেন্ডলিস্টে এখনও কোনো বন্ধু নেই</p>
                  <p className="text-xs">সাজেশন থেকে ফ্রেন্ড রিকোয়েস্ট পাঠিয়ে বন্ধুত্ব গড়ে তুলুন।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => {
                          onViewProfile(friend.id);
                          onClose();
                        }}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      >
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0 group-hover:ring-2 group-hover:ring-blue-500 transition"
                        />
                        <div className="min-w-0">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition truncate">
                            {friend.name}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-400 block truncate">
                            {friend.username}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                            ✓ ফ্রেন্ডলিস্টে আছেন
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChat(friend.id);
                            onClose();
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-[#1877F2] rounded-xl transition cursor-pointer"
                          title="মেসেজ পাঠান"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnfriend(friend.id, friend.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="আনফ্রেন্ড করুন"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
