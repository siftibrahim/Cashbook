import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Smile,
  Tag,
  Send,
  MoreHorizontal,
  ThumbsUp,
  Heart,
  Share2,
  MessageCircle,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  X,
  Upload,
  AlertTriangle,
  Check,
  Package,
  Layers,
  ChevronRight,
  TrendingUp,
  Zap,
  Flame,
  Video,
  MapPin,
  Link as LinkIcon,
  Globe,
  Lock,
  Users,
  Bookmark,
  BookmarkCheck,
  Edit,
  Trash2,
  Flag,
  UserPlus,
  UserCheck,
  Plus,
  Play,
  CornerDownRight,
  FileText,
} from 'lucide-react';
import {
  CustomerProfile,
  SocialPost,
  SocialReactionType,
  CustomerProductItem,
  SocialStory,
  SocialGroup,
  SocialPage,
} from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  validateMediaFiles,
  fileToBase64,
} from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';
import { BlockConfirmModal } from './BlockConfirmModal';
import { ShareModal } from './ShareModal';
import { ProductBoostModal } from './ProductBoostModal';
import { StoryCreateModal, StoryViewerModal } from './StoryModals';
import { GroupCreateModal, PageCreateModal } from './CommunityModals';

interface FacebookFeedViewProps {
  currentProfile?: CustomerProfile;
  onViewProfile: (userId: string) => void;
  onStartChat: (userId: string, productContext?: any) => void;
  onOpenQuickBuy: (product: any) => void;
  onOpenSellProductModal: () => void;
  onShowToast: (msg: string) => void;
}

const FEELINGS_LIST = [
  { emoji: '😊', label: 'খুশি লাগছে' },
  { emoji: '🛍️', label: 'শপিং করছি' },
  { emoji: '🔥', label: 'এক্সাইটেড' },
  { emoji: '✨', label: 'ক্রিয়েটিভ মুডে' },
  { emoji: '💡', label: 'নতুন আইডিয়া' },
  { emoji: '🎉', label: 'নতুন সেল অফার' },
  { emoji: '🍽️', label: 'খাবারের সন্ধানে' },
  { emoji: '✈️', label: 'ভ্রমণ করছি' },
];

export const FacebookFeedView: React.FC<FacebookFeedViewProps> = ({
  currentProfile: propProfile,
  onViewProfile,
  onStartChat,
  onOpenQuickBuy,
  onOpenSellProductModal,
  onShowToast,
}) => {
  const [profileState, setProfileState] = useState<CustomerProfile>(() =>
    propProfile || marketplaceSocialService.getCurrentProfile()
  );

  const currentProfile = propProfile || profileState;

  const [posts, setPosts] = useState<SocialPost[]>(() => marketplaceSocialService.getPosts());
  const [postText, setPostText] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVideos, setPostVideos] = useState<string[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');

  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [isFeelingPickerOpen, setIsFeelingPickerOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');

  // Stories state
  const [stories, setStories] = useState<SocialStory[]>(() => marketplaceSocialService.getStories());
  const [isStoryCreateOpen, setIsStoryCreateOpen] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);

  // Groups and Pages state
  const [groups, setGroups] = useState<SocialGroup[]>(() => marketplaceSocialService.getGroups());
  const [pages, setPages] = useState<SocialPage[]>(() => marketplaceSocialService.getPages());
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [isPageCreateOpen, setIsPageCreateOpen] = useState(false);

  // Feed Filter: 'all' or 'saved'
  const [feedFilter, setFeedFilter] = useState<'all' | 'saved'>('all');

  // Floating reactions state
  const [hoveredReactionPostId, setHoveredReactionPostId] = useState<string | null>(null);

  // Comments open state
  const [openCommentPostIds, setOpenCommentPostIds] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Comment replies state: replyInputs[commentId]
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [openReplyBoxCommentId, setOpenReplyBoxCommentId] = useState<string | null>(null);

  // Edit post modal
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [editPostLocation, setEditPostLocation] = useState('');
  const [editPostPrivacy, setEditPostPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');

  // Modals state
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [shareTarget, setShareTarget] = useState<{ post?: SocialPost | null; product?: any | null } | null>(null);
  const [boostTargetProduct, setBoostTargetProduct] = useState<any | null>(null);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshPosts = () => {
    setPosts(marketplaceSocialService.getPosts());
    setStories(marketplaceSocialService.getStories());
    setGroups(marketplaceSocialService.getGroups());
    setPages(marketplaceSocialService.getPages());
  };

  useEffect(() => {
    if (propProfile) setProfileState(propProfile);
  }, [propProfile]);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail) setProfileState(e.detail);
      refreshPosts();
    };
    window.addEventListener('twing_profile_updated', handleSync);
    window.addEventListener('twing_social_posts_updated', handleSync);
    window.addEventListener('twing_stories_updated', handleSync);
    window.addEventListener('twing_groups_updated', handleSync);
    window.addEventListener('twing_pages_updated', handleSync);
    return () => {
      window.removeEventListener('twing_profile_updated', handleSync);
      window.removeEventListener('twing_social_posts_updated', handleSync);
      window.removeEventListener('twing_stories_updated', handleSync);
      window.removeEventListener('twing_groups_updated', handleSync);
      window.removeEventListener('twing_pages_updated', handleSync);
    };
  }, []);

  // Handle media selection (Images AND Videos)
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validation = validateMediaFiles(files);
    if (!validation.valid) {
      setPostError(validation.error || 'সঠিক ছবি বা ভিডিও ফাইল নির্বাচন করুন');
      onShowToast(validation.error || 'ফাইল ভ্যালিডেশন সমস্যা');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const newImages: string[] = [];
      const newVideos: string[] = [];

      for (const item of validation.mediaFiles) {
        const b64 = await fileToBase64(item.file);
        if (item.type === 'video') {
          newVideos.push(b64);
        } else {
          newImages.push(b64);
        }
      }

      if (newImages.length > 0) {
        setPostImages((prev) => [...prev, ...newImages].slice(0, 6));
      }
      if (newVideos.length > 0) {
        setPostVideos((prev) => [...prev, ...newVideos].slice(0, 2));
      }
    } catch (err) {
      setPostError('মিডিয়া ফাইল প্রসেসিংয়ে সমস্যা হয়েছে');
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');

    const effectiveVideos = [...postVideos];
    if (videoUrlInput.trim()) {
      effectiveVideos.push(videoUrlInput.trim());
    }

    if (!postText.trim() && postImages.length === 0 && effectiveVideos.length === 0 && !linkInput.trim()) {
      setPostError('কিছু লিখুন অথবা ছবি, ভিডিও বা লিংক যোগ করুন');
      return;
    }

    setIsSubmittingPost(true);
    try {
      marketplaceSocialService.createPost({
        content: postText.trim(),
        images: postImages,
        videos: effectiveVideos,
        videoUrl: effectiveVideos[0] || undefined,
        location: locationInput.trim() || undefined,
        linkUrl: linkInput.trim() || undefined,
        privacy: postPrivacy,
        feeling: selectedFeeling || undefined,
      });

      setPostText('');
      setPostImages([]);
      setPostVideos([]);
      setVideoUrlInput('');
      setShowVideoInput(false);
      setLocationInput('');
      setShowLocationInput(false);
      setLinkInput('');
      setShowLinkInput(false);
      setSelectedFeeling(null);
      setIsFeelingPickerOpen(false);
      setIsSubmittingPost(false);
      refreshPosts();
      onShowToast('আপনার পোস্ট সফলভাবে প্রকাশিত হয়েছে!');
    } catch (err: any) {
      setIsSubmittingPost(false);
      setPostError(err.message || 'পোস্ট প্রকাশ করা যায়নি');
    }
  };

  const handleReaction = (postId: string, reactionType: SocialReactionType) => {
    try {
      marketplaceSocialService.reactToPost(postId, reactionType);
      refreshPosts();
      setHoveredReactionPostId(null);
    } catch (err: any) {
      onShowToast(err.message);
    }
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      marketplaceSocialService.addComment(postId, text.trim());
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      refreshPosts();
      onShowToast('মন্তব্য যুক্ত হয়েছে!');
    } catch (err: any) {
      onShowToast(err.message);
    }
  };

  const handleReplyToComment = (postId: string, commentId: string) => {
    const text = replyInputs[commentId];
    if (!text || !text.trim()) return;

    try {
      marketplaceSocialService.replyToComment(postId, commentId, text.trim());
      setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
      setOpenReplyBoxCommentId(null);
      refreshPosts();
      onShowToast('উত্তরে মন্তব্য সফল হয়েছে!');
    } catch (err: any) {
      onShowToast(err.message);
    }
  };

  const handleSaveToggle = (postId: string) => {
    const isSaved = marketplaceSocialService.toggleSavePost(postId);
    setActiveMenuPostId(null);
    refreshPosts();
    onShowToast(isSaved ? '🔖 পোস্টটি আপনার সংরক্ষিত তালিকায় যুক্ত হয়েছে' : 'সংরক্ষিত তালিকা থেকে সরানো হয়েছে');
  };

  const handleStartEdit = (post: SocialPost) => {
    setEditingPost(post);
    setEditPostText(post.content);
    setEditPostLocation(post.location || '');
    setEditPostPrivacy(post.privacy || 'public');
    setActiveMenuPostId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    try {
      marketplaceSocialService.editPost(editingPost.id, {
        content: editPostText.trim(),
        location: editPostLocation.trim() || undefined,
        privacy: editPostPrivacy,
      });
      setEditingPost(null);
      refreshPosts();
      onShowToast('পোস্ট সফলভাবে সম্পাদনা করা হয়েছে!');
    } catch (err: any) {
      onShowToast(err.message || 'সম্পাদনা ব্যর্থ হয়েছে');
    }
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm('আপনি কি এই পোস্টটি মুছে ফেলতে নিশ্চিত?')) {
      marketplaceSocialService.deletePost(postId);
      setActiveMenuPostId(null);
      refreshPosts();
      onShowToast('পোস্ট মুছে ফেলা হয়েছে');
    }
  };

  const handleConfirmBlock = () => {
    if (!blockTarget) return;
    marketplaceSocialService.blockUser(blockTarget.id);
    onShowToast(`${blockTarget.name}-কে ব্লক করা হয়েছে।`);
    setBlockTarget(null);
    refreshPosts();
  };

  const handleFollowToggle = (targetUserId: string, name: string) => {
    const isFollowing = marketplaceSocialService.toggleFollowUser(targetUserId);
    refreshPosts();
    onShowToast(isFollowing ? `${name}-কে ফলো করা হচ্ছে` : `${name}-কে আনফলো করা হয়েছে`);
  };

  // Filter posts
  const displayedPosts = posts.filter((p) => {
    if (feedFilter === 'saved') {
      return (p.savedByUserIds || []).includes(currentProfile.id);
    }
    // Check privacy
    if (p.privacy === 'only_me' && p.authorId !== currentProfile.id) {
      return false;
    }
    return true;
  });

  const trendingProducts = marketplaceSocialService.getCustomerProducts().slice(0, 4);
  const communityDirectory = marketplaceSocialService.getProfilesDirectory().filter((p) => p.id !== currentProfile.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1300px] mx-auto items-start">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Shortcuts, Groups & Pages (3 cols on lg) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-3 space-y-3.5 sticky top-20">
        {/* User Profile Card */}
        <div
          onClick={() => onViewProfile(currentProfile.id)}
          className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center gap-3 group"
        >
          <img
            src={currentProfile.avatar}
            alt={currentProfile.name}
            className="w-12 h-12 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-[#1877F2] transition"
          />
          <div className="min-w-0">
            <h4 className="font-black text-xs text-slate-900 truncate group-hover:text-[#1877F2]">
              {currentProfile.name}
            </h4>
            <p className="text-[11px] text-slate-500 truncate">{currentProfile.username}</p>
            <span className="text-[10px] text-[#1877F2] font-bold">প্রোফাইল দেখুন →</span>
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs divide-y divide-slate-100">
          <button
            type="button"
            onClick={() => setFeedFilter('all')}
            className={`w-full p-2.5 flex items-center gap-3 text-left rounded-xl font-bold text-xs transition cursor-pointer ${
              feedFilter === 'all' ? 'bg-blue-50 text-[#1877F2]' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1877F2] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <span>সব সামাজিক পোস্ট (Feed)</span>
          </button>

          <button
            type="button"
            onClick={() => setFeedFilter('saved')}
            className={`w-full p-2.5 flex items-center gap-3 text-left rounded-xl font-bold text-xs transition cursor-pointer ${
              feedFilter === 'saved' ? 'bg-amber-50 text-amber-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <span>সংরক্ষিত পোস্ট (Saved)</span>
          </button>

          <button
            type="button"
            onClick={onOpenSellProductModal}
            className="w-full p-2.5 flex items-center gap-3 text-left rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span>মার্কেটপ্লেসে পণ্য বিক্রি</span>
          </button>
        </div>

        {/* Groups Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#1877F2]" />
              <span>কমিউনিটি গ্রুপসমূহ</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsGroupCreateOpen(true)}
              className="text-[10px] text-[#1877F2] font-black hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> তৈরি করুন
            </button>
          </div>

          <div className="space-y-2">
            {groups.slice(0, 3).map((grp) => {
              const isJoined = (grp.memberIds || []).includes(currentProfile.id);
              return (
                <div key={grp.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={grp.coverImage} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] text-slate-800 truncate">{grp.name}</p>
                      <p className="text-[10px] text-slate-400">{grp.membersCount} মেম্বার</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isJoined) {
                        marketplaceSocialService.leaveGroup(grp.id);
                        onShowToast('গ্রুপ ত্যাগ করা হয়েছে');
                      } else {
                        marketplaceSocialService.joinGroup(grp.id);
                        onShowToast('গ্রুপে সফলভাবে যুক্ত হয়েছেন!');
                      }
                      refreshPosts();
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                      isJoined
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-[#1877F2] text-white hover:bg-blue-700 shadow-2xs'
                    }`}
                  >
                    {isJoined ? 'যুক্ত আছেন' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pages Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>অফিসিয়াল পেজসমূহ</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsPageCreateOpen(true)}
              className="text-[10px] text-emerald-600 font-black hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" /> পেজ তৈরি
            </button>
          </div>

          <div className="space-y-2">
            {pages.slice(0, 3).map((page) => {
              const isFollowing = (page.followerIds || []).includes(currentProfile.id);
              return (
                <div key={page.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={page.avatar} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] text-slate-800 truncate">{page.name}</p>
                      <p className="text-[10px] text-slate-400">{page.followersCount} ফলোয়ার</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      marketplaceSocialService.followPage(page.id);
                      refreshPosts();
                      onShowToast(isFollowing ? 'আনফলো করা হয়েছে' : 'পেজ ফলো করা হয়েছে');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                      isFollowing
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                    }`}
                  >
                    {isFollowing ? 'ফলোয়িং' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER COLUMN: Stories, Create Post Box & Social Posts Feed (6 cols on lg) */}
      {/* ========================================================================= */}
      <div className="col-span-1 lg:col-span-6 space-y-4">
        {/* ===================================================================== */}
        {/* STORIES TRAY (FACEBOOK STYLE 24-HOUR STORIES) */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {/* Create Story Card */}
            <div
              onClick={() => setIsStoryCreateOpen(true)}
              className="relative w-24 h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs transition"
            >
              <div className="h-24 w-full overflow-hidden bg-slate-200">
                <img
                  src={currentProfile.avatar}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <div className="relative bg-white pb-2 text-center flex flex-col items-center">
                <div className="w-7 h-7 -mt-3.5 rounded-full bg-[#1877F2] text-white flex items-center justify-center border-2 border-white shadow-sm">
                  <Plus className="w-4 h-4 font-bold" />
                </div>
                <span className="text-[11px] font-black text-slate-800 leading-tight mt-1">
                  স্টোরি দিন
                </span>
              </div>
            </div>

            {/* Active Stories List */}
            {stories.map((st, idx) => (
              <div
                key={st.id}
                onClick={() => setViewingStoryIndex(idx)}
                className="relative w-24 h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 cursor-pointer group shadow-2xs hover:shadow-md transition"
              >
                {st.mediaType === 'video' ? (
                  <video src={st.mediaUrl} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <img src={st.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

                {/* Author Avatar with Story Ring */}
                <div className="absolute top-2 left-2 z-10">
                  <img
                    src={st.authorAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border-2 border-white ring-2 ring-[#1877F2]"
                  />
                </div>

                {st.mediaType === 'video' && (
                  <div className="absolute top-2 right-2 z-10 text-white drop-shadow">
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </div>
                )}

                {/* Author Name */}
                <p className="absolute bottom-2 inset-x-2 z-10 font-black text-[10px] text-white truncate drop-shadow">
                  {st.authorName}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* CREATE POST BOX (FACEBOOK STYLE) */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={currentProfile.avatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
              onClick={() => onViewProfile(currentProfile.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-800">{currentProfile.name}</span>
                {/* Privacy Selector */}
                <select
                  value={postPrivacy}
                  onChange={(e) => setPostPrivacy(e.target.value as any)}
                  className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="public">🌍 পাবলিক (Public)</option>
                  <option value="friends">👥 বন্ধুরা (Friends)</option>
                  <option value="only_me">🔒 শুধু আমি (Only Me)</option>
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              placeholder={`আপনার মনে কী আছে, ${currentProfile.name.split(' ')[0]}? টেক্সট, ছবি ও ভিডিও শেয়ার করুন...`}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-xs sm:text-[13px] font-medium resize-none focus:outline-hidden transition"
            />

            {/* Selected Feeling Indicator */}
            {selectedFeeling && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-[#1877F2] w-fit">
                <span>{selectedFeeling.emoji}</span>
                <span>অনুভূতি: {selectedFeeling.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFeeling(null)}
                  className="ml-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Location Input Box */}
            {showLocationInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <input
                  type="text"
                  placeholder="অবস্থান যোগ করুন (যেমন: ধানমন্ডি, ঢাকা)..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-medium focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLocationInput('');
                    setShowLocationInput(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Link Input Box */}
            {showLinkInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <input
                  type="url"
                  placeholder="লিংক যোগ করুন (https://...)..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-medium focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLinkInput('');
                    setShowLinkInput(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Video URL Input Box */}
            {showVideoInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <Video className="w-4 h-4 text-purple-500 shrink-0" />
                <input
                  type="url"
                  placeholder="ভিডিও লিংক বা URL (MP4 / WebM)..."
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-medium focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrlInput('');
                    setShowVideoInput(false);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Selected Images Preview Grid */}
            {postImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {postImages.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Videos Preview */}
            {postVideos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {postVideos.map((vid, i) => (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-200">
                    <video src={vid} controls className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostVideos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {postError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {postError}
              </p>
            )}

            {/* Bottom Controls */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {/* Photo/Video upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="ছবি বা ভিডিও যুক্ত করুন"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">ছবি/ভিডিও</span>
                </button>

                {/* Feeling Button */}
                <button
                  type="button"
                  onClick={() => setIsFeelingPickerOpen(!isFeelingPickerOpen)}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="অনুভূতি শেয়ার করুন"
                >
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">অনুভূতি</span>
                </button>

                {/* Location Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="লোকেশন শেয়ার করুন"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="hidden sm:inline">লোকেশন</span>
                </button>

                {/* Link Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="লিংক যুক্ত করুন"
                >
                  <LinkIcon className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">লিংক</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaSelect}
                className="hidden"
              />

              <button
                type="submit"
                disabled={isSubmittingPost || (!postText.trim() && postImages.length === 0 && postVideos.length === 0 && !linkInput.trim())}
                className="px-5 py-2 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white font-black text-xs transition shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <span>পোস্ট করুন</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feelings Picker Grid */}
            {isFeelingPickerOpen && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEELINGS_LIST.map((f, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedFeeling(f);
                      setIsFeelingPickerOpen(false);
                    }}
                    className="p-2 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-left flex items-center gap-2 transition cursor-pointer"
                  >
                    <span className="text-lg">{f.emoji}</span>
                    <span className="text-xs font-bold text-slate-700">{f.label}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* ===================================================================== */}
        {/* POSTS LIST (FEED) */}
        {/* ===================================================================== */}
        <div className="space-y-4">
          {displayedPosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm text-slate-700">কোনো পোস্ট পাওয়া যায়নি</p>
              <p className="text-xs">নতুন পোস্ট লিখে সেন্ট্রাল সোশ্যাল ফিডে সবার সাথে শেয়ার করুন।</p>
            </div>
          ) : (
            displayedPosts.map((post) => {
              const isOwn = post.authorId === currentProfile.id;
              const isSaved = (post.savedByUserIds || []).includes(currentProfile.id);
              const userReaction = post.userReactions?.[currentProfile.id];
              const isCommentOpen = openCommentPostIds[post.id];

              const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);

              return (
                <div key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3">
                  {/* Post Header */}
                  <div className="p-4 pb-0 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={post.authorAvatar}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 cursor-pointer"
                        onClick={() => onViewProfile(post.authorId)}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            onClick={() => onViewProfile(post.authorId)}
                            className="font-black text-xs sm:text-sm text-slate-900 truncate hover:text-[#1877F2] cursor-pointer"
                          >
                            {post.authorName}
                          </h4>
                          {post.authorVerified && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-full font-bold">
                              ভেরিফাইড
                            </span>
                          )}
                          {post.feeling && (
                            <span className="text-xs text-slate-500 font-medium">
                              — {post.feeling.emoji} {post.feeling.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold pt-0.5">
                          <span>
                            {new Date(post.createdAt).toLocaleDateString('bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {post.location && (
                            <span className="text-slate-600 flex items-center gap-0.5">
                              • <MapPin className="w-2.5 h-2.5 text-rose-500" /> {post.location}
                            </span>
                          )}
                          {post.privacy === 'friends' ? (
                            <span title="বন্ধুরা">👥</span>
                          ) : post.privacy === 'only_me' ? (
                            <span title="শুধু আমি">🔒</span>
                          ) : (
                            <span title="পাবলিক">🌍</span>
                          )}
                          {post.isEdited && (
                            <span className="text-slate-400">(সম্পাদিত)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3-dots Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-xs font-bold divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleSaveToggle(post.id)}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                            <span>{isSaved ? 'সংরক্ষণ বাতিল করুন' : 'পোস্ট সংরক্ষণ করুন'}</span>
                          </button>

                          {isOwn ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(post)}
                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                                <span>পোস্ট সম্পাদনা করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>মুছে ফেলুন</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onShowToast('পোস্ট রিপোর্ট জমা হয়েছে। অ্যাডমিন পর্যালোচনা করবেন।');
                                  setActiveMenuPostId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Flag className="w-4 h-4 text-amber-500" />
                                <span>রিপোর্ট করুন</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockTarget({ id: post.authorId, name: post.authorName });
                                  setActiveMenuPostId(null);
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                              >
                                <ShieldAlert className="w-4 h-4" />
                                <span>ব্যবহারকারীকে ব্লক করুন</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content Body */}
                  <div className="px-4 space-y-3">
                    {post.content && (
                      <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>
                    )}

                    {/* Link Preview */}
                    {post.linkUrl && (
                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-[#1877F2] hover:underline truncate flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{post.linkUrl}</span>
                      </a>
                    )}
                  </div>

                  {/* Images Display Grid */}
                  {post.images && post.images.length > 0 && (
                    <div
                      className={`grid gap-1 px-4 ${
                        post.images.length === 1
                          ? 'grid-cols-1'
                          : post.images.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                      }`}
                    >
                      {post.images.map((img, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Video Playback Display */}
                  {((post.videos && post.videos.length > 0) || post.videoUrl) && (
                    <div className="px-4">
                      <div className="rounded-2xl overflow-hidden bg-black border border-slate-200 aspect-video flex items-center justify-center">
                        <video
                          src={post.videoUrl || (post.videos && post.videos[0])}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Linked Product Card (If any) */}
                  {post.linkedProduct && (
                    <div className="mx-4 p-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {post.linkedProduct.imageUrl && (
                          <img
                            src={post.linkedProduct.imageUrl}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-blue-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {post.linkedProduct.name}
                          </p>
                          <p className="text-xs font-black text-[#1877F2]">
                            ৳ {post.linkedProduct.salePrice}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenQuickBuy(post.linkedProduct)}
                        className="px-3 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-[11px] rounded-xl transition shadow-xs shrink-0 cursor-pointer"
                      >
                        কিনুন
                      </button>
                    </div>
                  )}

                  {/* Reactions Count and Comments Count */}
                  <div className="px-4 pt-1 flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1">
                      {totalReactions > 0 && (
                        <span className="flex items-center -space-x-1">
                          <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center">👍</span>
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">❤️</span>
                        </span>
                      )}
                      <span>{totalReactions} রিঅ্যাকশন</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span>{(post.comments || []).length} মন্তব্য</span>
                      <span>{post.sharesCount || 0} শেয়ার</span>
                    </div>
                  </div>

                  {/* Action Bar (Like, Comment, Share, Save) */}
                  <div className="px-4 py-1 flex items-center justify-between gap-1 relative">
                    {/* Floating Reaction Bar */}
                    {hoveredReactionPostId === post.id && (
                      <div
                        onMouseLeave={() => setHoveredReactionPostId(null)}
                        className="absolute -top-10 left-4 z-40 bg-white rounded-full shadow-2xl border border-slate-200 px-3 py-1.5 flex items-center gap-2 animate-in fade-in zoom-in-90"
                      >
                        {[
                          { type: 'like' as SocialReactionType, emoji: '👍', label: 'লাইক' },
                          { type: 'love' as SocialReactionType, emoji: '❤️', label: 'লাভ' },
                          { type: 'care' as SocialReactionType, emoji: '🥰', label: 'কেয়ার' },
                          { type: 'haha' as SocialReactionType, emoji: '😆', label: 'হাহা' },
                          { type: 'wow' as SocialReactionType, emoji: '😮', label: 'ওয়াও' },
                          { type: 'sad' as SocialReactionType, emoji: '😢', label: 'স্যাড' },
                          { type: 'angry' as SocialReactionType, emoji: '😡', label: 'অ্যাংরি' },
                        ].map((r) => (
                          <button
                            key={r.type}
                            type="button"
                            onClick={() => handleReaction(post.id, r.type)}
                            className="text-lg hover:scale-125 transition cursor-pointer"
                            title={r.label}
                          >
                            {r.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Like button */}
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredReactionPostId(post.id)}
                      onClick={() => handleReaction(post.id, userReaction || 'like')}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        userReaction ? 'text-[#1877F2] bg-blue-50/70 font-black' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${userReaction ? 'fill-[#1877F2]' : ''}`} />
                      <span>{userReaction ? 'পছন্দ হয়েছে' : 'লাইক'}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCommentPostIds((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="flex-1 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>মন্তব্য</span>
                    </button>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => setShareTarget({ post })}
                      className="flex-1 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>শেয়ার</span>
                    </button>

                    {/* Save button */}
                    <button
                      type="button"
                      onClick={() => handleSaveToggle(post.id)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        isSaved ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title={isSaved ? 'সংরক্ষিত' : 'সংরক্ষণ করুন'}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Comments & Replies Section */}
                  {isCommentOpen && (
                    <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                      {/* Existing comments */}
                      <div className="space-y-3">
                        {(post.comments || []).map((comm) => (
                          <div key={comm.id} className="space-y-2">
                            <div className="flex items-start gap-2.5">
                              <img
                                src={comm.authorAvatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 inline-block max-w-[90%] shadow-2xs">
                                  <p className="font-black text-xs text-slate-900">{comm.authorName}</p>
                                  <p className="text-xs text-slate-700 leading-snug">{comm.content}</p>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold px-2 pt-0.5">
                                  <span>
                                    {new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenReplyBoxCommentId(
                                        openReplyBoxCommentId === comm.id ? null : comm.id
                                      )
                                    }
                                    className="text-[#1877F2] hover:underline cursor-pointer"
                                  >
                                    উত্তর দিন (Reply)
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Nested Replies */}
                            {comm.replies && comm.replies.length > 0 && (
                              <div className="pl-10 space-y-2">
                                {comm.replies.map((rep) => (
                                  <div key={rep.id} className="flex items-start gap-2">
                                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-1" />
                                    <img
                                      src={rep.authorAvatar}
                                      alt=""
                                      className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                    <div className="bg-slate-100 p-2 rounded-xl text-xs max-w-[85%]">
                                      <p className="font-black text-[11px] text-slate-900">{rep.authorName}</p>
                                      <p className="text-[11px] text-slate-700">{rep.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Input Box */}
                            {openReplyBoxCommentId === comm.id && (
                              <div className="pl-10 flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  placeholder={`${comm.authorName}-কে উত্তর দিন...`}
                                  value={replyInputs[comm.id] || ''}
                                  onChange={(e) =>
                                    setReplyInputs((prev) => ({
                                      ...prev,
                                      [comm.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleReplyToComment(post.id, comm.id);
                                    }
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 focus:border-blue-400 rounded-full text-xs font-medium focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleReplyToComment(post.id, comm.id)}
                                  className="p-1.5 bg-[#1877F2] text-white rounded-full hover:bg-blue-700 transition"
                                >
                                  <Send className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add comment input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                        <img
                          src={currentProfile.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <input
                          type="text"
                          placeholder="একটি মন্তব্য লিখুন..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 px-3.5 py-2 bg-white border border-slate-200 focus:border-blue-400 rounded-full text-xs font-medium focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          className="p-2 bg-[#1877F2] hover:bg-blue-700 text-white rounded-full transition shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: People You May Know & Hot Deals (3 cols on lg) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20">
        {/* People You May Know */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#1877F2]" />
              <span>পরিচিত হতে পারেন</span>
            </h4>
          </div>

          <div className="space-y-2.5">
            {communityDirectory.slice(0, 4).map((user) => {
              const isFollowing = (currentProfile.followingUserIds || []).includes(user.id);
              return (
                <div key={user.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                  <div
                    onClick={() => onViewProfile(user.id)}
                    className="flex items-center gap-2 min-w-0 cursor-pointer"
                  >
                    <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate hover:text-[#1877F2]">{user.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.location || 'বাংলাদেশ'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFollowToggle(user.id, user.name)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer shrink-0 ${
                      isFollowing
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-[#1877F2] text-white hover:bg-blue-700 shadow-2xs'
                    }`}
                  >
                    {isFollowing ? 'ফলোয়িং' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hot Deals from Marketplace */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>সেন্ট্রাল হট ডিলস</span>
          </h4>

          <div className="space-y-2">
            {trendingProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => onOpenQuickBuy(prod)}
                className="p-2 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/50 transition cursor-pointer flex items-center gap-2.5"
              >
                <img src={prod.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[11px] text-slate-800 truncate">{prod.name}</p>
                  <p className="text-xs font-black text-[#1877F2]">৳ {prod.salePrice}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Story Create Modal */}
      <StoryCreateModal
        isOpen={isStoryCreateOpen}
        onClose={() => setIsStoryCreateOpen(false)}
        onStoryCreated={() => refreshPosts()}
        onShowToast={onShowToast}
      />

      {/* Story Viewer Modal */}
      {viewingStoryIndex !== null && (
        <StoryViewerModal
          isOpen={true}
          onClose={() => setViewingStoryIndex(null)}
          stories={stories}
          initialIndex={viewingStoryIndex}
          currentUserId={currentProfile.id}
          onDeleteStory={(id) => {
            marketplaceSocialService.deleteStory(id);
            refreshPosts();
          }}
        />
      )}

      {/* Group Create Modal */}
      <GroupCreateModal
        isOpen={isGroupCreateOpen}
        onClose={() => setIsGroupCreateOpen(false)}
        onGroupCreated={() => refreshPosts()}
        onShowToast={onShowToast}
      />

      {/* Page Create Modal */}
      <PageCreateModal
        isOpen={isPageCreateOpen}
        onClose={() => setIsPageCreateOpen(false)}
        onPageCreated={() => refreshPosts()}
        onShowToast={onShowToast}
      />

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">পোস্ট সম্পাদনা করুন</h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <textarea
                value={editPostText}
                onChange={(e) => setEditPostText(e.target.value)}
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium resize-none focus:outline-hidden"
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অবস্থান</label>
                <input
                  type="text"
                  value={editPostLocation}
                  onChange={(e) => setEditPostLocation(e.target.value)}
                  placeholder="অবস্থান লিখুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">প্রাইভেসি</label>
                <select
                  value={editPostPrivacy}
                  onChange={(e) => setEditPostPrivacy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="public">🌍 পাবলিক (Public)</option>
                  <option value="friends">👥 বন্ধুরা (Friends)</option>
                  <option value="only_me">🔒 শুধু আমি (Only Me)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Confirm Modal */}
      {blockTarget && (
        <BlockConfirmModal
          isOpen={true}
          onClose={() => setBlockTarget(null)}
          targetUserName={blockTarget.name}
          onConfirmBlock={handleConfirmBlock}
        />
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          isOpen={true}
          onClose={() => setShareTarget(null)}
          post={shareTarget.post}
          product={shareTarget.product}
          currentProfile={currentProfile}
          onShowToast={onShowToast}
          onSharedSuccess={refreshPosts}
        />
      )}

      {/* Product Boost Modal */}
      {boostTargetProduct && (
        <ProductBoostModal
          isOpen={true}
          onClose={() => setBoostTargetProduct(null)}
          product={boostTargetProduct}
          currentProfile={currentProfile}
          onShowToast={onShowToast}
          onBoostSubmitted={refreshPosts}
        />
      )}
    </div>
  );
};
