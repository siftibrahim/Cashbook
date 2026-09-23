import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageCircle,
  Phone,
  Clock,
  Send,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Store,
  ShieldCheck,
  User,
  RefreshCw,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import {
  getStoreChatThreads,
  sendCustomerMessage,
  markThreadAsReadByCustomer,
  StoreChatMessage,
  CHAT_SYNC_EVENT,
} from '../../utils/storeChatStorage';
import { publicStoreApi } from '../../services/apiService';

interface StorefrontSupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
}

export const StorefrontSupportDrawer: React.FC<StorefrontSupportDrawerProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const identifier = config.storeSlug || config.vendorId || 'store';
  const phone = (config.whatsappPhone || config.phone || '').replace(/[^0-9]/g, '');

  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem('ibrahim_khata_customer_name') || 'সম্মানিত ক্রেতা';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    return localStorage.getItem('ibrahim_khata_customer_phone') || '';
  });
  const [threadId] = useState(() => {
    let saved = localStorage.getItem('ibrahim_khata_customer_thread_id');
    if (!saved) {
      saved = `th_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('ibrahim_khata_customer_thread_id', saved);
    }
    return saved;
  });

  const [messages, setMessages] = useState<StoreChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Default welcome message
  const defaultWelcomeMessage: StoreChatMessage = {
    id: 'welcome',
    sender: 'vendor',
    senderName: config.storeName || 'আমাদের অনলাইন স্টোর',
    text: `আসসালামু আলাইকুম! ${config.storeName || 'আমাদের অনলাইন স্টোরে'} স্বাগতম। আপনার যেকোনো প্রশ্ন, পণ্যের অর্ডার বা তথ্য জানতে এখানে লিখুন অথবা সরাসরি WhatsApp এ যোগাযোগ করুন।`,
    timestamp: Date.now(),
  };

  // Sync messages from server and fallback to local
  const fetchMessages = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await publicStoreApi.getChatMessages(identifier, threadId, customerPhone);
      if (res?.messages && res.messages.length > 0) {
        setMessages(res.messages);
        return;
      }
    } catch (err) {
      console.warn('public getChatMessages error, using local fallback:', err);
    }

    // Local fallback
    const threads = getStoreChatThreads();
    const current = threads.find((t) => t.id === threadId || (customerPhone && t.customerPhone === customerPhone));
    if (current && current.messages && current.messages.length > 0) {
      setMessages(current.messages);
      markThreadAsReadByCustomer(current.id);
    } else {
      setMessages([defaultWelcomeMessage]);
    }
  }, [identifier, threadId, customerPhone, config.storeName]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Poll every 3.5 seconds to receive real-time vendor replies!
      const interval = setInterval(fetchMessages, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    const handleSync = () => {
      fetchMessages();
    };
    window.addEventListener(CHAT_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(CHAT_SYNC_EVENT, handleSync);
  }, [fetchMessages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = inputMessage.trim();
    if (!txt || isSending) return;

    setInputMessage('');
    setIsSending(true);

    // Optimistic customer message
    const tempMsg: StoreChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      senderName: customerName || 'আপনি',
      senderPhone: customerPhone || '',
      text: txt,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev.filter((m) => m.id !== 'welcome'), tempMsg]);

    // Send to local cache
    sendCustomerMessage(threadId, customerName, customerPhone, txt);

    // Send to backend server
    try {
      await publicStoreApi.sendChatMessage(identifier, threadId, customerName, customerPhone, txt);
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send chat message to server:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveContactInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName) localStorage.setItem('ibrahim_khata_customer_name', customerName);
    if (customerPhone) localStorage.setItem('ibrahim_khata_customer_phone', customerPhone);
    setShowPhonePrompt(false);
    fetchMessages();
  };

  const handleOpenWhatsApp = (customText?: string) => {
    if (!phone) {
      alert('ভেন্ডরের কোনো যোগাযোগ নম্বর সংযুক্ত করা নেই।');
      return;
    }
    const defaultMsg =
      config.supportWhatsAppMessage ||
      `হ্যালো! আমি আপনার অনলাইন শপ "${config.storeName}" থেকে যোগাযোগ করছি। পণ্য সম্পর্কে জানতে চাই।`;
    const messageToSend = customText || defaultMsg;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageToSend)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-[#004D40] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Store className="w-5 h-5 text-amber-300" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#004D40]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm sm:text-base leading-none">
                  {config.storeName || 'অনলাইন স্টোর'}
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-[11px] text-teal-200 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>ভেন্ডর অনলাইন • লাইভ সাপোর্ট</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Direct WhatsApp & Call Buttons */}
        <div className="p-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenWhatsApp()}
            className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>WhatsApp এ চ্যাট করুন</span>
          </button>

          {config.phone && (
            <a
              href={`tel:${config.phone}`}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-teal-700" />
              <span>কল করুন</span>
            </a>
          )}
        </div>

        {/* Optional Customer Profile prompt bar */}
        {!customerPhone && (
          <div className="bg-amber-50 px-3.5 py-2 border-b border-amber-200 text-xs flex items-center justify-between">
            <span className="text-amber-900 font-medium text-[11px]">
              ভেন্ডর যেন আপনাকে ফিরতি কল বা রিপ্লাই দিতে পারেন:
            </span>
            <button
              type="button"
              onClick={() => setShowPhonePrompt((p) => !p)}
              className="font-bold text-teal-800 underline text-[11px] cursor-pointer"
            >
              {showPhonePrompt ? 'বাতিল' : 'নম্বর দিন'}
            </button>
          </div>
        )}

        {showPhonePrompt && (
          <form onSubmit={handleSaveContactInfo} className="p-3 bg-white border-b border-slate-200 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="আপনার নাম"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="মোবাইল নম্বর"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-[#004D40] text-white text-xs font-bold rounded-lg"
            >
              সেভ করুন
            </button>
          </form>
        )}

        {/* Chat History Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
          <div className="text-center my-1">
            <span className="px-3 py-1 bg-slate-200/80 text-slate-600 rounded-full text-[10px] font-semibold">
              সহায়তা সময়: {config.supportHours || 'সকাল ৯:০০ - রাত ১০:০০'}
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                {msg.sender === 'customer' ? 'আপনি' : `স্টোর প্রতিনিধি (${msg.senderName || 'ভেন্ডর'})`}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-2xs leading-relaxed ${
                  msg.sender === 'customer'
                    ? 'bg-[#004D40] text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />

          {/* Quick FAQ Suggestion Pills */}
          <div className="pt-3 border-t border-slate-200/80 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>সাধারণ জিজ্ঞাসিত প্রশ্নসমূহ:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'ডেলিভারি কত সময়ে পাওয়া যাবে?',
                'ক্যাশ অন ডেলিভারি কি আছে?',
                'পণ্য পছন্দ না হলে কি রিটার্ন করা যাবে?',
              ].map((faq) => (
                <button
                  key={faq}
                  type="button"
                  onClick={() => {
                    setInputMessage(faq);
                  }}
                  className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 transition cursor-pointer text-left"
                >
                  {faq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="আপনার প্রশ্ন বা মেসেজ লিখুন..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:bg-white"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-40"
            title="মেসেজ পাঠান"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
