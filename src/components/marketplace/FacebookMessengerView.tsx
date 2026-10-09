import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Search,
  User,
  ShieldAlert,
  ArrowLeft,
  ShoppingBag,
  CheckCheck,
  Smile,
  Phone,
  Info,
} from 'lucide-react';
import {
  marketplaceSocialService,
} from '../../services/marketplaceSocialService';
import {
  ChatConversation,
  ChatMessage,
  CustomerProfile,
} from '../../types/marketplaceSocial';
import { BlockConfirmModal } from './BlockConfirmModal';

interface FacebookMessengerViewProps {
  initialTargetUserId?: string | null;
  initialProductContext?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  } | null;
  onViewProfile?: (userId: string) => void;
  onClose?: () => void;
  onShowToast?: (msg: string) => void;
}

export const FacebookMessengerView: React.FC<FacebookMessengerViewProps> = ({
  initialTargetUserId,
  initialProductContext,
  onViewProfile,
  onClose,
  onShowToast,
}) => {
  const currentProfile = marketplaceSocialService.getCurrentProfile();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(initialTargetUserId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [productContext, setProductContext] = useState(initialProductContext || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [blockTargetUser, setBlockTargetUser] = useState<{ id: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = () => {
    const list = marketplaceSocialService.getConversations();
    setConversations(list);

    // If initialTargetUserId is passed and not in list, add temporary entry
    if (initialTargetUserId && !list.some((c) => c.participantId === initialTargetUserId)) {
      const targetProfile = marketplaceSocialService.getProfileById(initialTargetUserId);
      if (targetProfile) {
        setActiveUserId(initialTargetUserId);
      }
    } else if (!activeUserId && list.length > 0) {
      setActiveUserId(list[0].participantId);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [initialTargetUserId]);

  // Load messages for active user
  useEffect(() => {
    if (!activeUserId) {
      setMessages([]);
      return;
    }
    const msgs = marketplaceSocialService.getMessagesWith(activeUserId);
    setMessages(msgs);
    marketplaceSocialService.markConversationAsRead(activeUserId);

    // Check if initial product context should be set
    if (initialProductContext) {
      setProductContext(initialProductContext);
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeUserId]);

  const activeParticipant: CustomerProfile | null = activeUserId
    ? marketplaceSocialService.getProfileById(activeUserId) || {
        id: activeUserId,
        name: 'সেন্ট্রাল কাস্টমার',
        username: `@user_${activeUserId.slice(0, 6)}`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        coverPhoto: '',
        bio: '',
        phone: '',
        address: '',
        location: 'ঢাকা',
        joinedDate: '২০২৪',
        followersCount: 0,
        followingCount: 0,
        isVerified: false,
        rating: 5,
        totalSales: 0,
        totalOrders: 0,
        blockedUserIds: [],
      }
    : null;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeUserId) return;

    try {
      const newMsg = marketplaceSocialService.sendMessage({
        receiverId: activeUserId,
        text: inputText.trim(),
        productContext: productContext || undefined,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setProductContext(null); // clear pinned product after first send
      loadConversations();

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      onShowToast?.(err.message || 'মেসেজ পাঠানো সম্ভব হয়নি');
    }
  };

  const handleConfirmBlock = () => {
    if (!blockTargetUser) return;
    marketplaceSocialService.blockUser(blockTargetUser.id);
    onShowToast?.(`${blockTargetUser.name}-কে ব্লক করা হয়েছে।`);
    setBlockTargetUser(null);
    setActiveUserId(null);
    loadConversations();
  };

  const filteredConversations = conversations.filter((c) =>
    c.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[78vh] min-h-[500px]">
      {/* Left Column: Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/60 ${
          activeUserId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#1877F2]" />
              <span>মেসেঞ্জার ও চ্যাট</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {conversations.length} জন
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="চ্যাট বা কাস্টমার খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-transparent focus:border-blue-400 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold">কোনো সক্রিয় বার্তা নেই</p>
              <p className="text-[11px]">মার্কেটপ্লেসের যেকোনো বিক্রেতা বা কাস্টমারকে সরাসরি মেসেজ দিন।</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.participantId === activeUserId;
              return (
                <button
                  key={conv.participantId}
                  onClick={() => setActiveUserId(conv.participantId)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition cursor-pointer ${
                    isActive ? 'bg-blue-50/90 border-l-4 border-[#1877F2]' : 'hover:bg-slate-100/70 bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.participantAvatar}
                      alt={conv.participantName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-black text-xs text-slate-900 truncate">
                        {conv.participantName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Box */}
      <div
        className={`flex-1 flex flex-col bg-white ${
          !activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {!activeUserId ? (
          <div className="text-center p-8 text-slate-400 space-y-2">
            <MessageCircle className="w-14 h-14 mx-auto text-slate-200" />
            <h3 className="font-black text-sm text-slate-700">একটি কনভারসেশন বেছে নিন</h3>
            <p className="text-xs max-w-xs mx-auto">
              কাস্টমার ও বিক্রেতাদের সাথে কথা বলতে বাম পাশের তালিকা থেকে সিলেক্ট করুন।
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:px-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveUserId(null)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={activeParticipant?.avatar}
                    alt={activeParticipant?.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
                    onClick={() => activeUserId && onViewProfile?.(activeUserId)}
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3
                      onClick={() => activeUserId && onViewProfile?.(activeUserId)}
                      className="font-black text-xs sm:text-sm text-slate-900 truncate hover:text-[#1877F2] cursor-pointer"
                    >
                      {activeParticipant?.name}
                    </h3>
                    {activeParticipant?.isVerified && (
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full font-bold">
                        ভেরিফাইড
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>সক্রিয় আছেন (Active now)</span>
                  </p>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => activeUserId && onViewProfile?.(activeUserId)}
                  className="px-2.5 py-1 text-slate-600 hover:text-[#1877F2] hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">প্রোফাইল</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBlockTargetUser({
                      id: activeUserId,
                      name: activeParticipant?.name || 'ব্যবহারকারী',
                    })
                  }
                  className="px-2 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="এই ব্যবহারকারীকে ব্লক করুন"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ব্লক করুন</span>
                </button>
              </div>
            </div>

            {/* Pinned Product Context (If chatting about an item) */}
            {productContext && (
              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-blue-200 shrink-0">
                    <img
                      src={productContext.imageUrl}
                      alt={productContext.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-blue-900 text-xs truncate">
                      {productContext.name}
                    </p>
                    <p className="text-[11px] font-black text-[#1877F2]">
                      ৳ {productContext.price}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-200/80 text-blue-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                  পণ্য আলোচনা
                </span>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentProfile.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Attached product preview inside message */}
                    {msg.productContext && (
                      <div className="mb-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-xs flex items-center gap-2">
                        <img
                          src={msg.productContext.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {msg.productContext.name}
                          </p>
                          <p className="text-[10px] font-black text-[#1877F2]">
                            ৳ {msg.productContext.price}
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-[78%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-[#1877F2] text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder={`${activeParticipant?.name || 'কাস্টমার'}-কে একটি মেসেজ লিখুন...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white rounded-full text-xs font-medium focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-[#1877F2] hover:bg-blue-700 text-white rounded-full transition shadow-xs cursor-pointer disabled:opacity-40 disabled:hover:bg-[#1877F2]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Block Confirm Modal */}
      {blockTargetUser && (
        <BlockConfirmModal
          isOpen={true}
          onClose={() => setBlockTargetUser(null)}
          targetUserName={blockTargetUser.name}
          onConfirmBlock={handleConfirmBlock}
        />
      )}
    </div>
  );
};
