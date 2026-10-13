import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Search,
  User,
  ShieldAlert,
  ArrowLeft,
  Check,
  CheckCheck,
  Smile,
  Phone,
  Info,
  Image as ImageIcon,
  Video as VideoIcon,
  Paperclip,
  X,
  Users,
  Plus,
  BellOff,
  Bell,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Trash2,
  Download,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  marketplaceSocialService,
  fileToBase64,
  validateMediaFiles,
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
  const [activeConvId, setActiveConvId] = useState<string | null>(initialTargetUserId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [productContext, setProductContext] = useState(initialProductContext || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups' | 'archived'>('all');

  // Media Attachment State
  const [attachment, setAttachment] = useState<{
    url: string;
    type: 'image' | 'video' | 'file';
    name: string;
    size: string;
  } | null>(null);

  // Group creation modal state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Typing indicator simulation
  const [isTyping, setIsTyping] = useState(false);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Block modal
  const [blockTargetUser, setBlockTargetUser] = useState<{ id: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = () => {
    const list = marketplaceSocialService.getConversations();
    setConversations(list);

    if (initialTargetUserId && !list.some((c) => c.participantId === initialTargetUserId)) {
      const targetProfile = marketplaceSocialService.getProfileById(initialTargetUserId);
      if (targetProfile) {
        setActiveConvId(initialTargetUserId);
      }
    } else if (!activeConvId && list.length > 0) {
      setActiveConvId(list[0].participantId);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [initialTargetUserId]);

  // Real-time listener for incoming messages and sync
  useEffect(() => {
    const handleChatSync = (e: any) => {
      loadConversations();
      if (activeConvId) {
        const msgs = marketplaceSocialService.getMessagesWith(activeConvId);
        setMessages(msgs);
      }
    };

    window.addEventListener('twing_chat_updated', handleChatSync);
    window.addEventListener('twing_profile_updated', handleChatSync);

    // Periodic poll for simulated delivery/read ticks
    const interval = setInterval(() => {
      if (activeConvId) {
        const msgs = marketplaceSocialService.getMessagesWith(activeConvId);
        setMessages(msgs);
      }
    }, 4000);

    return () => {
      window.removeEventListener('twing_chat_updated', handleChatSync);
      window.removeEventListener('twing_profile_updated', handleChatSync);
      clearInterval(interval);
    };
  }, [activeConvId]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    const msgs = marketplaceSocialService.getMessagesWith(activeConvId);
    setMessages(msgs);
    marketplaceSocialService.markConversationAsRead(activeConvId);

    if (initialProductContext) {
      setProductContext(initialProductContext);
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeConvId]);

  const activeConv = conversations.find((c) => c.participantId === activeConvId);

  const activeParticipant: CustomerProfile | null = activeConvId && !activeConv?.isGroup
    ? marketplaceSocialService.getProfileById(activeConvId) || {
        id: activeConvId,
        name: activeConv?.participantName || 'সেন্ট্রাল কাস্টমার',
        username: activeConv?.participantUsername || `@user_${activeConvId.slice(0, 6)}`,
        avatar: activeConv?.participantAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
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

  // Handle Attachment Selection
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    let type: 'image' | 'video' | 'file' = 'file';

    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    }

    try {
      const base64 = await fileToBase64(file);
      setAttachment({
        url: base64,
        type,
        name: file.name,
        size: `${sizeInMb} MB`,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      onShowToast?.('ফাইল আপলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachment) || !activeConvId) return;

    try {
      const isGroup = activeConv?.isGroup || activeConvId.startsWith('cgrp_');

      const newMsg = marketplaceSocialService.sendMessage({
        receiverId: isGroup ? undefined : activeConvId,
        groupId: isGroup ? activeConvId : undefined,
        isGroup,
        text: inputText.trim() || (attachment?.type === 'image' ? '📷 ছবি' : attachment?.type === 'video' ? '🎥 ভিডিও' : '📎 ফাইল'),
        mediaUrl: attachment?.url,
        mediaType: attachment?.type,
        fileName: attachment?.name,
        fileSize: attachment?.size,
        productContext: productContext || undefined,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setAttachment(null);
      setProductContext(null);
      loadConversations();

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);

      // Trigger simulated typing & response in friendly demo mode
      if (!isGroup && activeParticipant) {
        setTimeout(() => {
          setIsTyping(true);
        }, 1200);

        setTimeout(() => {
          setIsTyping(false);
          // Optional automated quick acknowledgement for active feel
          const simulatedReplies = [
            'ধন্যবাদ! আপনার মেসেজটি পেয়েছি। কিছুক্ষণের মধ্যে জানাচ্ছি।',
            'হ্যাঁ ভাই, পণ্যটি স্টকে আছে। ক্যাশ অন ডেলিভারিতে অর্ডার করতে পারেন।',
            'ঠিক আছে, ডেলিভারি লোকেশন কোথায় হবে জানাবেন প্লিজ?',
          ];
          const replyText = simulatedReplies[Math.floor(Math.random() * simulatedReplies.length)];
          const replyMsg = marketplaceSocialService.sendMessage({
            receiverId: currentProfile.id,
            text: replyText,
          });
          setMessages((prev) => [...prev, replyMsg]);
          loadConversations();
        }, 4000);
      }
    } catch (err: any) {
      onShowToast?.(err.message || 'মেসেজ পাঠানো সম্ভব হয়নি');
    }
  };

  const handleUnsendMessage = (messageId: string, forEveryone: boolean = true) => {
    marketplaceSocialService.unsendMessage(messageId, forEveryone);
    if (activeConvId) {
      setMessages(marketplaceSocialService.getMessagesWith(activeConvId));
    }
    setActiveMenuMsgId(null);
    onShowToast?.(forEveryone ? 'মেসেজটি আনসেন্ড করা হয়েছে' : 'মেসেজটি আপনার জন্য মুছে ফেলা হয়েছে');
  };

  const handleToggleMute = (convId: string) => {
    const isMuted = marketplaceSocialService.toggleMuteConversation(convId);
    onShowToast?.(isMuted ? 'নোটিফিকেশন মিউট করা হয়েছে 🔕' : 'নোটিফিকেশন আনমিউট করা হয়েছে 🔔');
    loadConversations();
  };

  const handleToggleArchive = (convId: string) => {
    const isArchived = marketplaceSocialService.toggleArchiveConversation(convId);
    onShowToast?.(isArchived ? 'আর্কাইভে সরানো হয়েছে 📁' : 'আর্কাইভ থেকে ফিরিয়ে আনা হয়েছে 📥');
    loadConversations();
  };

  const handleConfirmBlock = () => {
    if (!blockTargetUser) return;
    marketplaceSocialService.blockUser(blockTargetUser.id);
    onShowToast?.(`${blockTargetUser.name}-কে ব্লক করা হয়েছে।`);
    setBlockTargetUser(null);
    setActiveConvId(null);
    loadConversations();
  };

  // Create Group Chat
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      onShowToast?.('গ্রুপের নাম প্রদান করুন');
      return;
    }
    if (selectedMemberIds.length === 0) {
      onShowToast?.('কমপক্ষে একজন সদস্য নির্বাচন করুন');
      return;
    }

    try {
      const newGroup = marketplaceSocialService.createChatGroup({
        name: groupName.trim(),
        memberIds: selectedMemberIds,
      });
      setIsCreateGroupOpen(false);
      setGroupName('');
      setSelectedMemberIds([]);
      loadConversations();
      setActiveConvId(newGroup.id);
      onShowToast?.(`'${newGroup.participantName}' গ্রুপ সফলভাবে তৈরি হয়েছে! 🎉`);
    } catch (err: any) {
      onShowToast?.(err.message || 'গ্রুপ তৈরি করতে সমস্যা হয়েছে');
    }
  };

  // Friends suggestions for group chat creation
  const friendsList = marketplaceSocialService.getFriends();

  // Filter conversations according to search & tabs
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.participantName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTab === 'archived') {
      return Boolean(c.isArchived);
    }
    if (c.isArchived) return false; // hide archived in other tabs

    if (filterTab === 'unread') {
      return c.unreadCount > 0;
    }
    if (filterTab === 'groups') {
      return Boolean(c.isGroup);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[78vh] min-h-[520px]">
      {/* Left Column: Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/70 ${
          activeConvId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>মেসেঞ্জার ও চ্যাট</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="নতুন গ্রুপ চ্যাট তৈরি করুন"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black">নতুন গ্রুপ</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="চ্যাট বা ফ্রেন্ড খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-transparent focus:border-blue-400 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-[#1877F2] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                filterTab === 'unread'
                  ? 'bg-[#1877F2] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              অপঠিত
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('groups')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                filterTab === 'groups'
                  ? 'bg-[#1877F2] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👥 গ্রুপ
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('archived')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                filterTab === 'archived'
                  ? 'bg-[#1877F2] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📁 আর্কাইভ
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold">কোনো সক্রিয় বার্তা নেই</p>
              <p className="text-[11px]">মার্কেটপ্লেসের যেকোনো বিক্রেতা বা ফ্রেন্ডকে সরাসরি মেসেজ দিন।</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.participantId === activeConvId;
              return (
                <div
                  key={conv.participantId}
                  onClick={() => setActiveConvId(conv.participantId)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition cursor-pointer group relative ${
                    isActive ? 'bg-blue-50/90 border-l-4 border-[#1877F2]' : 'hover:bg-slate-100/70 bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.participantAvatar}
                      alt={conv.participantName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    {conv.isGroup ? (
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] border-2 border-white">
                        <Users className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-black text-xs text-slate-900 truncate">
                          {conv.participantName}
                        </h4>
                        {conv.isMuted && (
                          <BellOff className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {conv.lastMessageTime === 'এইমাত্র'
                          ? 'এইমাত্র'
                          : new Date(conv.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      {conv.lastMessage}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}

                    {/* Quick Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMute(conv.participantId);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition rounded-md hover:bg-slate-200"
                      title={conv.isMuted ? 'আনমিউট' : 'মিউট'}
                    >
                      {conv.isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Box */}
      <div
        className={`flex-1 flex flex-col bg-white ${
          !activeConvId ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {!activeConvId ? (
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
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={activeConv?.participantAvatar || activeParticipant?.avatar}
                    alt={activeConv?.participantName || activeParticipant?.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
                    onClick={() => !activeConv?.isGroup && activeConvId && onViewProfile?.(activeConvId)}
                  />
                  {!activeConv?.isGroup && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3
                      onClick={() => !activeConv?.isGroup && activeConvId && onViewProfile?.(activeConvId)}
                      className="font-black text-xs sm:text-sm text-slate-900 truncate hover:text-[#1877F2] cursor-pointer"
                    >
                      {activeConv?.participantName || activeParticipant?.name}
                    </h3>
                    {activeConv?.isGroup ? (
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                        👥 গ্রুপ
                      </span>
                    ) : (
                      activeParticipant?.isVerified && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full font-bold">
                          ভেরিফাইড
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>
                      {activeConv?.isGroup
                        ? `${activeConv.memberCount || 4} জন সক্রিয় সদস্য`
                        : 'সক্রিয় আছেন (Active now)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Chat Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!activeConv?.isGroup && (
                  <button
                    type="button"
                    onClick={() => activeConvId && onViewProfile?.(activeConvId)}
                    className="px-2.5 py-1 text-slate-600 hover:text-[#1877F2] hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">প্রোফাইল</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleMute(activeConvId)}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    activeConv?.isMuted
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={activeConv?.isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
                >
                  {activeConv?.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleArchive(activeConvId)}
                  className={`p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    activeConv?.isArchived
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={activeConv?.isArchived ? 'আর্কাইভ থেকে সরান' : 'আর্কাইভ করুন'}
                >
                  {activeConv?.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>

                {!activeConv?.isGroup && (
                  <button
                    type="button"
                    onClick={() =>
                      setBlockTargetUser({
                        id: activeConvId,
                        name: activeParticipant?.name || 'ব্যবহারকারী',
                      })
                    }
                    className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    title="এই ব্যবহারকারীকে ব্লক করুন"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                )}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-200/80 text-blue-900 font-bold px-2 py-0.5 rounded-full shrink-0">
                    পণ্য আলোচনা
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductContext(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentProfile.id;
                const isDeleted = msg.isDeleted || msg.deletedForEveryone;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* In group chat, show sender name */}
                    {activeConv?.isGroup && !isMe && msg.senderName && (
                      <span className="text-[10px] font-bold text-slate-500 mb-0.5 ml-2">
                        {msg.senderName}
                      </span>
                    )}

                    {/* Attached product preview inside message */}
                    {msg.productContext && !isDeleted && (
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

                    {/* Attached Photo */}
                    {msg.mediaUrl && msg.mediaType === 'image' && !isDeleted && (
                      <div className="mb-1.5 max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:opacity-95 transition">
                        <img
                          src={msg.mediaUrl}
                          alt="ছবি"
                          className="w-full max-h-60 object-cover"
                          onClick={() => setSelectedPreviewImage(msg.mediaUrl || null)}
                        />
                      </div>
                    )}

                    {/* Attached Video */}
                    {msg.mediaUrl && msg.mediaType === 'video' && !isDeleted && (
                      <div className="mb-1.5 max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black">
                        <video
                          src={msg.mediaUrl}
                          controls
                          className="w-full max-h-60"
                        />
                      </div>
                    )}

                    {/* Attached File/Document */}
                    {msg.mediaUrl && msg.mediaType === 'file' && !isDeleted && (
                      <a
                        href={msg.mediaUrl}
                        download={msg.fileName || 'file'}
                        className="mb-1.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-2.5 max-w-xs hover:bg-slate-50 transition"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {msg.fileName || 'ডকুমেন্ট ফাইল'}
                          </p>
                          <p className="text-[10px] text-slate-400">{msg.fileSize || 'ফাইল'}</p>
                        </div>
                        <Download className="w-4 h-4 text-slate-400 shrink-0" />
                      </a>
                    )}

                    {/* Text Message Bubble with unsend option */}
                    <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-md">
                      {isMe && !isDeleted && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id)
                            }
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuMsgId === msg.id && (
                            <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30">
                              <button
                                type="button"
                                onClick={() => handleUnsendMessage(msg.id, true)}
                                className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>আনসেন্ড করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnsendMessage(msg.id, false)}
                                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>আমার জন্য মুছুন</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                          isDeleted
                            ? 'bg-slate-200 text-slate-500 italic rounded-xl'
                            : isMe
                            ? 'bg-[#1877F2] text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>

                    {/* Timestamp & Sent/Delivered/Seen Ticks */}
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 px-1">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {isMe && !isDeleted && (
                        <span>
                          {msg.status === 'seen' ? (
                            <span title="দেখা হয়েছে (Seen)">
                              <CheckCheck className="w-3 h-3 text-[#1877F2]" />
                            </span>
                          ) : msg.status === 'delivered' ? (
                            <span title="ডেলিভার্ড হয়েছে (Delivered)">
                              <CheckCheck className="w-3 h-3 text-slate-400" />
                            </span>
                          ) : (
                            <span title="পাঠানো হয়েছে (Sent)">
                              <Check className="w-3 h-3 text-slate-400" />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
                    <span className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px] font-bold text-slate-500 ml-1">
                      {activeConv?.participantName} লিখছেন...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview bar before sending */}
            {attachment && (
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                    />
                  ) : attachment.type === 'video' ? (
                    <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center">
                      <VideoIcon className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#1877F2] flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{attachment.name}</p>
                    <p className="text-[10px] text-slate-500">{attachment.size}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf,application/msword,text/plain"
                onChange={handleAttachmentSelect}
                className="hidden"
              />

              {/* Attachment Triggers */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-[#1877F2] hover:bg-slate-100 rounded-full transition cursor-pointer"
                title="ছবি, ভিডিও বা ফাইল যুক্ত করুন"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-[#1877F2] hover:bg-slate-100 rounded-full transition cursor-pointer hidden sm:block"
                title="ছবি পাঠান"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`${activeConv?.participantName || 'কাস্টমার'}-কে একটি মেসেজ লিখুন...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white rounded-full text-xs font-medium focus:outline-hidden"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !attachment}
                className="p-2.5 bg-[#1877F2] hover:bg-blue-700 text-white rounded-full transition shadow-xs cursor-pointer disabled:opacity-40 disabled:hover:bg-[#1877F2]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Lightbox Preview for Photos */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={selectedPreviewImage}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">নতুন গ্রুপ চ্যাট তৈরি করুন</h3>
                  <p className="text-[10px] text-slate-500 font-bold">একাধিক ফ্রেন্ড বা কাস্টমারকে যোগ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateGroupOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রুপের নাম *</label>
                <input
                  type="text"
                  placeholder="যেমন: পাইকারি ক্রেতা গ্রুপ / গ্যাজেট ক্লাব"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সদস্য নির্বাচন করুন ({selectedMemberIds.length} জন নির্বাচিত)
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1 bg-slate-50">
                  {friendsList.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400 font-bold">
                      কোনো ফ্রেন্ড যুক্ত নেই। মার্কেটপ্লেস ফ্রেন্ডস সেকশন থেকে ফ্রেন্ড যুক্ত করুন।
                    </p>
                  ) : (
                    friendsList.map((friend) => {
                      const isSelected = selectedMemberIds.includes(friend.id);
                      return (
                        <div
                          key={friend.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMemberIds((prev) => prev.filter((id) => id !== friend.id));
                            } else {
                              setSelectedMemberIds((prev) => [...prev, friend.id]);
                            }
                          }}
                          className={`p-2 flex items-center justify-between rounded-lg cursor-pointer transition ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800">{friend.name}</p>
                              <p className="text-[10px] text-slate-500">{friend.username}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-[#1877F2] focus:ring-0"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim() || selectedMemberIds.length === 0}
                  className="flex-1 py-2 bg-[#1877F2] hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  গ্রুপ তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
