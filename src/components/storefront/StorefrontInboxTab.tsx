import React, { useState } from 'react';
import { MessageCircle, Send, Sparkles, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

interface StorefrontInboxTabProps {
  storeName?: string;
  whatsappPhone?: string;
  storePhone?: string;
}

interface ChatMessage {
  id: string;
  sender: 'customer' | 'store';
  text: string;
  time: string;
}

export const StorefrontInboxTab: React.FC<StorefrontInboxTabProps> = ({
  storeName = 'bikroyhub',
  whatsappPhone,
  storePhone,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'store',
      text: `আসসালামু আলাইকুম! ${storeName}-এ আপনাকে স্বাগতম। আপনার কোনো জিজ্ঞাসা থাকলে নির্দ্বিধায় মেসেজ দিন অথবা নিচের দ্রুত প্রশ্নে ট্যাপ করুন।`,
      time: 'এখনই',
    },
  ]);
  const [inputText, setInputText] = useState('');

  const quickQuestions = [
    'ডেলিভারি হতে কত সময় লাগে?',
    'ক্যাশ অন ডেলিভারি দেওয়া যাবে?',
    'পণ্য কি ১০০% অরিজিনাল?',
    'ঢাকা ও ঢাকার বাইরে ডেলিভারি চার্জ কত?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newCustomerMsg: ChatMessage = {
      id: `c-${Date.now()}`,
      sender: 'customer',
      text: text.trim(),
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newCustomerMsg]);
    setInputText('');

    // Simulated instant reply based on question
    setTimeout(() => {
      let reply = 'ধন্যবাদ আপনার মেসেজের জন্য! আমাদের প্রতিনিধি খুব শীঘ্রই যোগাযোগ করবেন। দ্রুত উত্তরের জন্য সরাসরি WhatsApp এ মেসেজ দিতে পারেন।';
      const q = text.toLowerCase();
      if (q.includes('সময়') || q.includes('টাইম') || q.includes('ডেলিভারি')) {
        reply = '🚀 আমাদের সাধারণ ডেলিভারি সময় ১২ থেকে ২৪ ঘণ্টা! ঢাকা সিটিতে দ্রুততম সময়ে হোম ডেলিভারি পৌঁছে দেওয়া হয়।';
      } else if (q.includes('ক্যাশ') || q.includes('cod')) {
        reply = '✅ হ্যাঁ, আমরা সারা দেশে ক্যাশ অন ডেলিভারি (Cash on Delivery) সুবিধা দিই। পণ্য হাতে পেয়ে মূল্য পরিশোধ করতে পারবেন।';
      } else if (q.includes('অরিজিনাল') || q.includes('খাঁটি') || q.includes('কোয়ালিটি')) {
        reply = '⭐ আমাদের প্রতিটি পণ্য ১০০% অথেনটিক এবং অরিজিনাল ব্র্যান্ডের। কোনো নকল পণ্য বিক্রি করা হয় না।';
      } else if (q.includes('চার্জ') || q.includes('ফি') || q.includes('খরচ')) {
        reply = '🚚 ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৳৬০ এবং ঢাকার বাইরে ৳১২০। এছাড়া নির্দিষ্ট মূল্যের বেশি অর্ডারে ফ্রি ডেলিভারি সুবিধা রয়েছে!';
      }

      const storeReply: ChatMessage = {
        id: `s-${Date.now()}`,
        sender: 'store',
        text: reply,
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, storeReply]);
    }, 600);
  };

  const cleanWaNumber = (whatsappPhone || storePhone || '').replace(/[^0-9]/g, '');

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto flex flex-col h-full">
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">ইনবক্স ও লাইভ সাপোর্ট</h2>
          <p className="text-xs text-slate-500">দোকান প্রতিনিধির সাথে সরাসরি কথা বলুন</p>
        </div>

        {cleanWaNumber && (
          <a
            href={`https://wa.me/${cleanWaNumber}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp চ্যাট</span>
          </a>
        )}
      </div>

      {/* Quick Question Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            className="px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-[11px] font-bold shrink-0 transition cursor-pointer active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 min-h-[300px] flex-1 flex flex-col justify-between space-y-3 overflow-y-auto">
        <div className="space-y-3">
          {messages.map((m) => {
            const isStore = m.sender === 'store';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isStore ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isStore
                      ? 'bg-white border border-slate-200/80 text-slate-800 shadow-2xs'
                      : 'bg-[#004D40] text-white shadow-xs'
                  }`}
                >
                  <div className="font-bold text-[10px] opacity-75 mb-0.5">
                    {isStore ? storeName : 'আপনি'}
                  </div>
                  <div>{m.text}</div>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="আপনার প্রশ্ন এখানে লিখুন..."
            className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 shadow-2xs"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-2xl bg-[#004D40] hover:bg-[#00382E] text-white flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
