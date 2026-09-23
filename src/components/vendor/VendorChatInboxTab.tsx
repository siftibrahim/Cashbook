import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  MessageCircle,
  Clock,
  User,
  CheckCheck,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  getStoreChatThreads,
  saveStoreChatThreads,
  sendVendorReply,
  markThreadAsReadByVendor,
  StoreChatThread,
  CHAT_SYNC_EVENT,
} from '../../utils/storeChatStorage';
import { storeApi } from '../../services/apiService';

interface VendorChatInboxTabProps {
  storeName?: string;
}

export const VendorChatInboxTab: React.FC<VendorChatInboxTabProps> = ({ storeName = 'স্টোর অ্যাডমিন' }) => {
  const [threads, setThreads] = useState<StoreChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadThreads = async () => {
    try {
      const serverThreads = await storeApi.getChatThreads();
      if (serverThreads && serverThreads.length > 0) {
        setThreads(serverThreads);
        saveStoreChatThreads(serverThreads);
        if (!selectedThreadId && serverThreads.length > 0) {
          setSelectedThreadId(serverThreads[0].id);
          storeApi.markChatRead(serverThreads[0].id).catch(() => {});
        }
        return;
      }
    } catch (err) {
      console.warn('Failed to load server chat threads, falling back to local:', err);
    }

    const list = getStoreChatThreads();
    setThreads(list);
    if (!selectedThreadId && list.length > 0) {
      setSelectedThreadId(list[0].id);
      markThreadAsReadByVendor(list[0].id);
    }
  };

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 3500);

    const handleSync = () => {
      loadThreads();
    };
    window.addEventListener(CHAT_SYNC_EVENT, handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener(CHAT_SYNC_EVENT, handleSync);
    };
  }, [selectedThreadId]);

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || (threads.length > 0 ? threads[0] : null);

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    markThreadAsReadByVendor(threadId);
    storeApi.markChatRead(threadId).catch(() => {});
    const updated = threads.map((t) => (t.id === threadId ? { ...t, unreadByVendor: 0 } : t));
    setThreads(updated);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim() || isSending) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setIsSending(true);

    // Optimistically update local
    sendVendorReply(selectedThread.id, textToSend, storeName);
    loadThreads();

    try {
      await storeApi.sendChatReply(selectedThread.id, textToSend, storeName);
      await loadThreads();
    } catch (err) {
      console.error('Failed to send vendor chat reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenWhatsApp = (customerPhone: string, lastMsg: string) => {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('কাস্টমারের মোবাইল নম্বর পাওয়া যায়নি।');
      return;
    }
    const msg = `আসসালামু আলাইকুম ${selectedThread?.customerName || ''}! ${storeName} থেকে যোগাযোগ করছি। আপনার মেসেজের বিষয়ে: "${lastMsg || ''}"`;
    window.open(`https://wa.me/88${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDeleteThread = async (threadId: string) => {
    if (confirm('আপনি কি এই কাস্টমার চ্যাট হিস্টোরি মুছে ফেলতে চান?')) {
      const remaining = threads.filter((t) => t.id !== threadId);
      saveStoreChatThreads(remaining);
      setThreads(remaining);
      if (selectedThreadId === threadId) {
        setSelectedThreadId(remaining.length > 0 ? remaining[0].id : null);
      }
      try {
        await storeApi.deleteChatThread(threadId);
      } catch (err) {
        console.error('Failed to delete thread on server:', err);
      }
    }
  };

  const filteredThreads = threads.filter(
    (t) =>
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerPhone.includes(searchQuery) ||
      t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickReplies = [
    'আসসালামু আলাইকুম, পণ্যটি স্টকে এভেইলেবল আছে।',
    'আপনার অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে।',
    'হোম ডেলিভারিতে পণ্য পৌঁছাতে ২৪-৪৮ ঘণ্টা সময় লাগবে।',
    'ক্যাশ অন ডেলিভারিতে পণ্য দেখে পেমেন্ট করতে পারবেন।',
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[550px]">
      {/* Left List of Customer Threads */}
      <div className="w-full md:w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
        {/* Search Header */}
        <div className="p-3.5 border-b border-slate-200/80 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="গ্রাহকের নাম বা ফোন দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">কোনো মেসেজ পাওয়া যায়নি</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedThread?.id === thread.id;
              const hasUnread = (thread.unreadByVendor || 0) > 0;

              return (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`p-3.5 transition cursor-pointer relative flex items-start gap-3 hover:bg-slate-100/70 ${
                    isSelected ? 'bg-teal-50/70 border-l-4 border-l-[#004D40]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {thread.customerName ? thread.customerName.charAt(0) : 'ক'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {thread.customerName || 'সম্মানিত ক্রেতা'}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(thread.lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {thread.customerPhone || 'অনলাইন ভিজিটর'}
                    </div>

                    <p
                      className={`text-xs truncate mt-1 ${
                        hasUnread ? 'font-bold text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {thread.lastMessage}
                    </p>
                  </div>

                  {hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-2 animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Conversation View */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Conversation Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#004D40] text-white flex items-center justify-center font-bold text-sm">
                {selectedThread.customerName.charAt(0) || 'ক'}
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-none">
                  {selectedThread.customerName}
                </h3>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span className="font-mono">{selectedThread.customerPhone || 'মোবাইল উল্লেখ করা হয়নি'}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    গ্রাহক
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedThread.customerPhone && (
                <>
                  <a
                    href={`tel:${selectedThread.customerPhone}`}
                    className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="সরাসরি ফোন করুন"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handleOpenWhatsApp(selectedThread.customerPhone, selectedThread.lastMessage)
                    }
                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                    title="WhatsApp এ চ্যাট ওপেন করুন"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => handleDeleteThread(selectedThread.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="মেসেজ ডিলিট করুন"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {selectedThread.messages.map((msg) => {
              const isVendor = msg.sender === 'vendor';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isVendor ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                    {isVendor ? `আপনি (${storeName})` : selectedThread.customerName}
                  </span>

                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isVendor
                        ? 'bg-[#004D40] text-white rounded-br-xs'
                        : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Reply Chips */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              কুইক রিপ্লাই:
            </span>
            {quickReplies.map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(qr)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 transition cursor-pointer shrink-0 font-medium"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSendReply}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="গ্রাহকের জন্য রিপ্লাই লিখুন..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white"
            />

            <button
              type="submit"
              disabled={!replyText.trim()}
              className="px-4 py-2.5 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>রিপ্লাই দিন</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
          <h4 className="font-bold text-slate-700 text-sm">কোনো চ্যাট নির্বাচন করা হয়নি</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            বামপাশের তালিকা থেকে যেকোনো কাস্টমারের মেসেজ নির্বাচন করে সরাসরি উত্তর দিন।
          </p>
        </div>
      )}
    </div>
  );
};
