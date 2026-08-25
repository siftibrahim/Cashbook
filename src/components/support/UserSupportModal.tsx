import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Phone,
  Mail,
  Headphones,
  Info,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { StoreProfile } from '../../types';
import { SupportMessage, SUPPORT_CONTACT } from '../../types/adminTypes';
import {
  subscribeToUserSupportMessages,
  sendUserSupportMessage,
  markSupportMessagesAsReadByUser,
} from '../../services/adminService';
import { getStoredUser } from '../../services/apiService';

interface UserSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreProfile;
  onShowToast?: (msg: string) => void;
}

export const UserSupportModal: React.FC<UserSupportModalProps> = ({
  isOpen,
  onClose,
  store,
  onShowToast,
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive User ID
  const currentUser = getStoredUser();
  const userId = store.id || currentUser?.id || 'usr_1';
  const userName = store.name || 'দোকান মালিক';
  const userPhone = store.phone || '01306908115';
  const userEmail = currentUser?.email || undefined;
  const shopName = store.name || 'ইব্রাহিম জেনারেল স্টোর';

  // Real-time message subscription
  useEffect(() => {
    if (!isOpen || !userId) return;

    // Mark messages as read when opening
    markSupportMessagesAsReadByUser(userId);

    const unsubscribe = subscribeToUserSupportMessages(userId, (msgs) => {
      setMessages(msgs);
      markSupportMessagesAsReadByUser(userId);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, userId]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await sendUserSupportMessage({
        userId,
        userName,
        userPhone,
        userEmail,
        shopName,
        text: trimmed,
      });
      setInputText('');
      if (onShowToast) {
        onShowToast('মেসেজ সফলভাবে অ্যাডমিনের কাছে পাঠানো হয়েছে');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      if (onShowToast) {
        onShowToast('মেসেজ পাঠাতে সমস্যা হয়েছে, অনুগ্রহ করে পুনরায় চেষ্টা করুন');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      id="user-support-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#004D40] text-white px-4 sm:px-5 py-3.5 flex items-center justify-between shadow-xs shrink-0 border-b border-teal-700/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/30 border border-teal-300/40 flex items-center justify-center text-teal-100 shrink-0 shadow-inner">
              <Headphones className="w-5 h-5 text-teal-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white truncate">
                  সাপোর্ট ও সহায়তা ডেস্ক
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>লাইভ চ্যাট</span>
                </span>
              </div>
              <p className="text-[11px] text-teal-200 truncate">
                অ্যাডমিনের সাথে সরাসরি টেক্সট মেসেজ ও পরামর্শ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-support-modal-btn"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-100 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Support Contact Box (Email & Phone info for screenshots/pictures) */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/50 p-3 sm:p-3.5 border-b border-teal-100 shrink-0">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed min-w-0 flex-1">
              <p className="text-slate-800 font-medium">
                {SUPPORT_CONTACT.photoHelpNote}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                <a
                  href={`mailto:${SUPPORT_CONTACT.email}?subject=App%20Support%20Request%20-%20${encodeURIComponent(shopName)}`}
                  id="support-email-link"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-800 font-bold text-[11px] hover:bg-teal-600 hover:text-white transition shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{SUPPORT_CONTACT.email}</span>
                </a>
                <a
                  href={`tel:${SUPPORT_CONTACT.phone}`}
                  id="support-phone-link"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-800 font-bold text-[11px] hover:bg-teal-600 hover:text-white transition shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{SUPPORT_CONTACT.phone}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages Timeline Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/80 min-h-[220px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-3 shadow-xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                সাপোর্ট মেসেজ শুরু করুন
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                আপনার যেকোনো প্রশ্ন, ফিচার অনুরোধ বা সমস্যার বিবরণ নিচে লিখে পাঠান। অ্যাডমিন দ্রুত উত্তর প্রদান করবে।
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>নিরাপদ ও সরাসরি টেক্সট যোগাযোগ</span>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const dateFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Name & Badge */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500 font-medium">
                    {isUser ? (
                      <span>আপনি</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#004D40] font-bold">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        <span>অ্যাডমিন সাপোর্ট</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">• {dateFormatted}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-[#004D40] text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Read receipt tick for user message */}
                  {isUser && (
                    <div className="flex items-center gap-0.5 mt-0.5 px-1 text-[10px] text-slate-400">
                      {msg.isReadByAdmin ? (
                        <span className="flex items-center gap-0.5 text-teal-600 font-medium">
                          <CheckCheck className="w-3 h-3" /> দেখা হয়েছে
                        </span>
                      ) : (
                        <span>পাঠানো হয়েছে</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Text Message Input Bar (Strictly Plain Text, No upload) */}
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 sm:p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <div className="flex-1 relative">
            <textarea
              id="support-message-input"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="আপনার বার্তা বা প্রশ্ন লিখুন... (Enter চাপলে সেন্ড হবে)"
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004D40] focus:bg-white resize-none max-h-24 transition leading-tight"
            />
          </div>

          <button
            type="submit"
            id="send-support-message-btn"
            disabled={!inputText.trim() || isSending}
            className={`h-9 px-3.5 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs ${
              inputText.trim() && !isSending
                ? 'bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">পাঠান</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
