import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Store,
  ShieldCheck,
  CheckCheck,
  RotateCcw,
  Trash2,
  Headphones,
  Copy,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  SupportThread,
  SupportMessage,
  AppUser,
  SUPPORT_CONTACT,
} from '../../types/adminTypes';
import {
  subscribeToAllSupportThreads,
  subscribeToUserSupportMessages,
  sendAdminSupportReply,
  updateSupportThreadStatus,
  markSupportMessagesAsReadByAdmin,
  deleteSupportThread,
} from '../../services/adminService';

interface SupportManagementTabProps {
  currentUserEmail?: string;
  onShowToast: (msg: string) => void;
}

type FilterStatus = 'all' | 'unread' | 'open' | 'closed';

export const SupportManagementTab: React.FC<SupportManagementTabProps> = ({
  currentUserEmail,
  onShowToast,
}) => {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to all support threads in real time
  useEffect(() => {
    const unsub = subscribeToAllSupportThreads((all) => {
      setThreads(all);
      // If no thread selected yet, select the first one if available
      if (!selectedUserId && all.length > 0) {
        setSelectedUserId(all[0].userId);
      }
    });

    return () => unsub();
  }, []);

  // When selected user changes, subscribe to their specific messages and mark as read
  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }

    markSupportMessagesAsReadByAdmin(selectedUserId);

    const unsub = subscribeToUserSupportMessages(selectedUserId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsub();
  }, [selectedUserId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Selected thread object
  const activeThread = threads.find((t) => t.userId === selectedUserId) || threads[0] || null;

  // Filter threads
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      (t.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.shopName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.userPhone || '').includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterStatus === 'unread') {
      return (t.unreadAdminCount || 0) > 0;
    }
    if (filterStatus === 'open') {
      return t.status === 'open';
    }
    if (filterStatus === 'closed') {
      return t.status === 'closed';
    }
    return true;
  });

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeThread || isSending) return;

    setIsSending(true);
    try {
      await sendAdminSupportReply({
        userId: activeThread.userId,
        userName: activeThread.userName,
        userPhone: activeThread.userPhone,
        shopName: activeThread.shopName,
        text,
        adminName: 'অ্যাডমিন সাপোর্ট',
      });
      setReplyText('');
      onShowToast(`ইউজার ${activeThread.userName}-কে মেসেজ পাঠানো হয়েছে`);
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      onShowToast('উত্তর পাঠাতে সমস্যা হয়েছে');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!activeThread) return;
    const newStatus = activeThread.status === 'open' ? 'closed' : 'open';
    await updateSupportThreadStatus(activeThread.userId, newStatus);
    onShowToast(
      newStatus === 'closed'
        ? 'কনভারসেশন ক্লোজ করা হয়েছে'
        : 'কনভারসেশন পুনরায় ওপেন করা হয়েছে'
    );
  };

  const handleDeleteConversation = () => {
    if (!activeThread) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = async () => {
    if (!activeThread) return;
    const deletedId = activeThread.userId;
    setShowDeleteModal(false);
    await deleteSupportThread(deletedId);
    onShowToast('চ্যাট হিস্টোরি মুছে ফেলা হয়েছে');
    const remaining = threads.filter((t) => t.userId !== deletedId);
    if (remaining.length > 0) {
      setSelectedUserId(remaining[0].userId);
    } else {
      setSelectedUserId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} কপি করা হয়েছে`);
  };

  const unreadTotal = threads.reduce((acc, t) => acc + (t.unreadAdminCount || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner with Support Desk Details */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                সাপোর্ট ও সরাসরি চ্যাট ইনবক্স
              </h2>
              {unreadTotal > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                  {unreadTotal}টি নতুন
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              সকল ইউজারের সরাসরি টেক্সট মেসেজ, প্রশ্ন ও সহায়তার উত্তর প্রদান করুন
            </p>
          </div>
        </div>

        {/* Contact Info Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 font-medium">
            <Mail className="w-3.5 h-3.5 text-teal-700" />
            <span className="font-bold">{SUPPORT_CONTACT.email}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 font-medium">
            <Phone className="w-3.5 h-3.5 text-teal-700" />
            <span className="font-bold">{SUPPORT_CONTACT.phone}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Console */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Column: Conversation / User Thread List */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
          {/* Search & Filter bar */}
          <div className="p-3 border-b border-slate-200 space-y-2 shrink-0 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="search-support-threads"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ইউজার, দোকান বা ফোন খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(
                [
                  { id: 'all', label: 'সবগুলো' },
                  { id: 'unread', label: `নতুন (${unreadTotal})` },
                  { id: 'open', label: 'ওপেন' },
                  { id: 'closed', label: 'ক্লোজড' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                    filterStatus === tab.id
                      ? 'bg-[#004D40] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                কোনো সাপোর্ট মেসেজ পাওয়া যায়নি
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.userId === thread.userId;
                const hasUnread = (thread.unreadAdminCount || 0) > 0;
                const timeString = new Date(thread.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={thread.userId}
                    onClick={() => setSelectedUserId(thread.userId)}
                    className={`p-3.5 transition cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-teal-50/80 border-l-4 border-[#004D40]'
                        : 'hover:bg-white'
                    }`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        hasUnread
                          ? 'bg-rose-100 text-rose-700 border border-rose-300 ring-2 ring-rose-200'
                          : isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {thread.userName.charAt(0) || 'U'}
                    </div>

                    {/* Thread Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs truncate font-bold ${
                            hasUnread ? 'text-slate-950 font-black' : 'text-slate-800'
                          }`}
                        >
                          {thread.userName}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {timeString}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{thread.shopName}</span>
                      </div>

                      <p
                        className={`text-xs mt-1 truncate ${
                          hasUnread ? 'text-slate-900 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {thread.lastSender === 'admin' ? (
                          <span className="text-teal-700 font-semibold">আপনি: </span>
                        ) : null}
                        {thread.lastMessage}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            thread.status === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {thread.status === 'open' ? 'ওপেন' : 'ক্লোজড'}
                        </span>

                        {hasUnread && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-2xs">
                            {thread.unreadAdminCount}টি নতুন
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat & Reply Window */}
        <div className="flex-1 flex flex-col bg-white">
          {activeThread ? (
            <>
              {/* Active User Header Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {activeThread.userName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {activeThread.userName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          activeThread.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {activeThread.status === 'open' ? 'সক্রিয় ওপেন' : 'ক্লোজড'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">
                        {activeThread.shopName}
                      </span>
                      <span>•</span>
                      <a
                        href={`tel:${activeThread.userPhone}`}
                        className="text-teal-700 hover:underline font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{activeThread.userPhone}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    id="toggle-support-status-btn"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      activeThread.status === 'open'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {activeThread.status === 'open' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>কনভারসেশন ক্লোজ করুন</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                        <span>পুনরায় ওপেন করুন</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteConversation}
                    id="delete-support-thread-btn"
                    title="চ্যাট হিস্টোরি মুছুন"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 min-h-[260px]">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    এই ইউজারের কোনো পূর্ববর্তী মেসেজ নেই
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender === 'admin';
                    const timeFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 font-medium">
                          {isAdmin ? (
                            <span className="text-[#004D40] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              <span>অ্যাডমিন (আপনি)</span>
                            </span>
                          ) : (
                            <span className="font-bold text-slate-700">
                              {msg.userName} ({msg.shopName})
                            </span>
                          )}
                          <span>• {timeFormatted}</span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-wrap break-words ${
                            isAdmin
                              ? 'bg-[#004D40] text-white rounded-tr-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Reply Form Box */}
              <form
                onSubmit={handleSendReply}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  id="admin-support-reply-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`ইউজার ${activeThread.userName}-কে উত্তর লিখুন...`}
                  className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004D40] focus:bg-white transition"
                />

                <button
                  type="submit"
                  id="send-admin-support-reply-btn"
                  disabled={!replyText.trim() || isSending}
                  className={`h-10 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs ${
                    replyText.trim() && !isSending
                      ? 'bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>উত্তর পাঠান</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Headphones className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">
                বাম পাশের তালিকা থেকে যেকোনো ইউজারের সাপোর্ট চ্যাট নির্বাচন করুন
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Chat Confirmation Modal */}
      {showDeleteModal && activeThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">চ্যাট ডিলিট নিশ্চিতকরণ</h4>
                <p className="text-xs text-slate-500">{activeThread.userName}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে <span className="font-bold text-rose-600">{activeThread.userName}</span> ({activeThread.shopName})-এর সম্পূর্ণ চ্যাট হিস্টোরি মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
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
