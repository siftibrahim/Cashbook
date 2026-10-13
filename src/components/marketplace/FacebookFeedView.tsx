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
} from 'lucide-react';
import {
  CustomerProfile,
  SocialPost,
  SocialReactionType,
  CustomerProductItem,
} from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  validateImageFiles,
  fileToBase64,
} from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';
import { BlockConfirmModal } from './BlockConfirmModal';
import { ShareModal } from './ShareModal';
import { ProductBoostModal } from './ProductBoostModal';

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
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [isFeelingPickerOpen, setIsFeelingPickerOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');

  // Floating reactions state: which post has hovered/active reaction menu
  const [hoveredReactionPostId, setHoveredReactionPostId] = useState<string | null>(null);

  // Comments open state: set of post IDs where comment box is expanded
  const [openCommentPostIds, setOpenCommentPostIds] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Block modal state
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string } | null>(null);

  // Share and Boost modal states
  const [shareTarget, setShareTarget] = useState<{ post?: SocialPost | null; product?: any | null } | null>(null);
  const [boostTargetProduct, setBoostTargetProduct] = useState<any | null>(null);

  // Active 3-dot dropdown
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshPosts = () => {
    setPosts(marketplaceSocialService.getPosts());
  };

  // Sync profile when prop updates
  useEffect(() => {
    if (propProfile) {
      setProfileState(propProfile);
    }
  }, [propProfile]);

  // Listen to profile updates broadcast
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail) {
        setProfileState(e.detail);
      }
      refreshPosts();
    };
    window.addEventListener('twing_profile_updated', handleSync);
    return () => window.removeEventListener('twing_profile_updated', handleSync);
  }, []);

  // Handle post image upload (STRICT CHECK: NO VIDEOS ALLOWED)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Strict validation: reject any video file
    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setPostError(validation.error || 'ভিডিও আপলোড করার অনুমতি নেই! শুধুমাত্র ছবি (Images) আপলোড করা যাবে।');
      onShowToast(validation.error || 'ভিডিও আপলোড করার অনুমতি নেই!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const base64List: string[] = [];
      for (const file of validation.imageFiles) {
        const b64 = await fileToBase64(file);
        base64List.push(b64);
      }
      setPostImages((prev) => [...prev, ...base64List].slice(0, 4));
    } catch (err: any) {
      setPostError('ছবি প্রসেসিংয়ে সমস্যা হয়েছে');
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');

    if (!postText.trim() && postImages.length === 0) {
      setPostError('কিছু লিখুন অথবা ছবি আপলোড করুন');
      return;
    }

    setIsSubmittingPost(true);
    try {
      marketplaceSocialService.createPost({
        content: postText.trim(),
        images: postImages,
        feeling: selectedFeeling || undefined,
      });

      setPostText('');
      setPostImages([]);
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

  const handleShare = (postOrId: SocialPost | string) => {
    let targetPost: SocialPost | undefined;
    if (typeof postOrId === 'string') {
      targetPost = posts.find((p) => p.id === postOrId);
    } else {
      targetPost = postOrId;
    }
    if (targetPost) {
      setShareTarget({ post: targetPost });
    }
  };

  const handleDeletePost = (postId: string) => {
    marketplaceSocialService.deletePost(postId);
    setActiveMenuPostId(null);
    refreshPosts();
    onShowToast('পোস্ট মুছে ফেলা হয়েছে');
  };

  const handleConfirmBlock = () => {
    if (!blockTarget) return;
    marketplaceSocialService.blockUser(blockTarget.id);
    onShowToast(`${blockTarget.name}-কে ব্লক করা হয়েছে।`);
    setBlockTarget(null);
    refreshPosts();
  };

  // Trending products for right column
  const trendingProducts = marketplaceSocialService.getCustomerProducts().slice(0, 4);
  const communityDirectory = marketplaceSocialService.getProfilesDirectory().filter((p) => p.id !== currentProfile.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1300px] mx-auto items-start">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: Shortcuts & Profile widget (3 cols on lg) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-3 space-y-3.5 sticky top-20">
        {/* User Card */}
        <div
          onClick={() => onViewProfile(currentProfile.id)}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center gap-3 group"
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
        <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs divide-y divide-slate-100">
          <button
            type="button"
            onClick={onOpenSellProductModal}
            className="w-full p-2.5 flex items-center gap-3 text-left rounded-xl hover:bg-blue-50 text-slate-700 hover:text-[#1877F2] font-black text-xs transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1877F2] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span>পণ্য বিক্রি করুন</span>
          </button>

          <button
            type="button"
            onClick={() => onViewProfile(currentProfile.id)}
            className="w-full p-2.5 flex items-center gap-3 text-left rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span>আমার বিক্রির পণ্য</span>
          </button>

          <button
            type="button"
            onClick={() => onViewProfile(currentProfile.id)}
            className="w-full p-2.5 flex items-center gap-3 text-left rounded-xl hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>ব্লক করা তালিকা</span>
          </button>
        </div>

        {/* Video Restriction Info Box */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-black text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>সেন্ট্রাল মার্কেটপ্লেস সুরক্ষা নীতি</span>
          </div>
          <p className="text-amber-800/90 leading-tight">
            মার্কেটপ্লেসে শুধুমাত্র পণ্যের স্পষ্ট ও উচ্চমানের ছবি আপলোড করা যাবে। ভিডিও ফাইল আপলোড সম্পূর্ণ নিষিদ্ধ।
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER COLUMN: Create Post Box & Social Posts Feed (6 cols on lg) */}
      {/* ========================================================================= */}
      <div className="col-span-1 lg:col-span-6 space-y-4">
        {/* 1. Create Post Box (Facebook Style) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={currentProfile.avatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
              onClick={() => onViewProfile(currentProfile.id)}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('post-textarea');
                el?.focus();
              }}
              className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-500 rounded-full text-xs font-medium transition cursor-text"
            >
              আপনার মনে কি আছে, {currentProfile.name.split(' ')[0]}? ব্লগ বা বিক্রয় পোস্ট করুন...
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCreatePost} className="space-y-3">
            <textarea
              id="post-textarea"
              rows={3}
              placeholder="পণ্য রিভিউ, বিক্রয় ঘোষণা বা আপনার অভিজ্ঞতা শেয়ার করুন..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
            />

            {/* Error Message */}
            {postError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{postError}</span>
              </div>
            )}

            {/* Selected Feeling Badge */}
            {selectedFeeling && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-900 font-bold">
                <span>{selectedFeeling.emoji}</span>
                <span>{selectedFeeling.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFeeling(null)}
                  className="p-0.5 hover:text-rose-600 rounded-full ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Uploaded Images Preview */}
            {postImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {postImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Feeling Picker Dropdown */}
            {isFeelingPickerOpen && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FEELINGS_LIST.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedFeeling(f);
                      setIsFeelingPickerOpen(false);
                    }}
                    className="p-2 text-left flex items-center gap-2 hover:bg-white rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <span className="text-base">{f.emoji}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions Toolbar */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {/* Photo Upload (Images Only, NO Videos) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="শুধুমাত্র ছবি আপলোড করুন"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>ছবি (Photo)</span>
                </button>

                {/* Feeling / Activity */}
                <button
                  type="button"
                  onClick={() => setIsFeelingPickerOpen(!isFeelingPickerOpen)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span>অনুভূতি</span>
                </button>

                {/* Sell Product shortcut */}
                <button
                  type="button"
                  onClick={onOpenSellProductModal}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Tag className="w-4 h-4" />
                  <span>পণ্য বিক্রি</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPost || (!postText.trim() && postImages.length === 0)}
                className="px-5 py-2 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>পোস্ট করুন</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Feed Posts Stream */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-xs">ফিডে কোনো পোস্ট পাওয়া যায়নি</p>
            </div>
          ) : (
            posts.map((post) => {
              const myReaction = post.userReactions?.[currentProfile.id];
              const isCommentsOpen = !!openCommentPostIds[post.id];
              const isOwnPost = post.authorId === currentProfile.id;

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Post Header */}
                  <div className="p-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.authorId === currentProfile.id ? currentProfile.avatar : post.authorAvatar}
                        alt={post.authorId === currentProfile.id ? currentProfile.name : post.authorName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer"
                        onClick={() => onViewProfile(post.authorId)}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => onViewProfile(post.authorId)}
                            className="font-black text-xs sm:text-sm text-slate-900 hover:text-[#1877F2] cursor-pointer"
                          >
                            {post.authorId === currentProfile.id ? currentProfile.name : post.authorName}
                          </h4>
                          {post.authorVerified && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.2 rounded-full">
                              ভেরিফাইড
                            </span>
                          )}
                          {post.feeling && (
                            <span className="text-xs text-slate-500 font-normal">
                              — {post.feeling.emoji} {post.feeling.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {new Date(post.createdAt).toLocaleDateString('bn-BD', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* 3-dots Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs font-bold divide-y divide-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              onViewProfile(post.authorId);
                              setActiveMenuPostId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <span>প্রোফাইল দেখুন</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(window.location.href);
                              onShowToast('পোস্টের লিংক কপি করা হয়েছে!');
                              setActiveMenuPostId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                          >
                            <span>লিংক কপি করুন</span>
                          </button>

                          {!isOwnPost && (
                            <button
                              type="button"
                              onClick={() => {
                                setBlockTarget({ id: post.authorId, name: post.authorName });
                                setActiveMenuPostId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>ইউজারকে ব্লক করুন</span>
                            </button>
                          )}

                          {isOwnPost && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                            >
                              <span>পোস্ট ডিলিট করুন</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="px-4 py-2 space-y-3">
                    <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    {/* Post Images Grid */}
                    {post.images && post.images.length > 0 && (
                      <div
                        className={`rounded-xl overflow-hidden gap-1.5 ${
                          post.images.length === 1
                            ? 'grid grid-cols-1'
                            : post.images.length === 2
                            ? 'grid grid-cols-2'
                            : 'grid grid-cols-2 sm:grid-cols-3'
                        }`}
                      >
                        {post.images.map((img, i) => (
                          <div key={i} className="aspect-video sm:aspect-square bg-slate-100 overflow-hidden">
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover hover:scale-102 transition duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Linked Product Card (If post is selling a product) */}
                    {post.linkedProduct && (
                      <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {post.linkedProduct.imageUrl && (
                            <img
                              src={post.linkedProduct.imageUrl}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover border border-blue-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-[#1877F2] uppercase tracking-wider">
                              মার্কেটপ্লেস পণ্য
                            </span>
                            <h5 className="font-black text-xs text-slate-900 truncate">
                              {post.linkedProduct.name}
                            </h5>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-sm font-black text-[#1877F2]">
                                ৳ {formatMoney(post.linkedProduct.salePrice)}
                              </span>
                              {post.linkedProduct.regularPrice && (
                                <span className="text-[11px] text-slate-400 line-through">
                                  ৳ {formatMoney(post.linkedProduct.regularPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {/* Promote / Boost Product Button */}
                          <button
                            type="button"
                            onClick={() => setBoostTargetProduct(post.linkedProduct)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                            title="সুপার এডমিনের মাধ্যমে পণ্যটি প্রমোট বা বুস্ট করুন"
                          >
                            <Zap className="w-3 h-3 fill-white" />
                            <span>প্রমোট</span>
                          </button>

                          {!isOwnPost && (
                            <button
                              type="button"
                              onClick={() => onStartChat(post.authorId, post.linkedProduct)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              চ্যাট
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenQuickBuy(post.linkedProduct)}
                            className="px-4 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>এখনই কিনুন</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reaction Summary Bar */}
                  <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="flex -space-x-1">
                        <span className="w-5 h-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-[10px] ring-2 ring-white">
                          👍
                        </span>
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] ring-2 ring-white">
                          ❤️
                        </span>
                      </span>
                      <span className="font-bold text-slate-700">
                        {Object.values(post.reactions || {}).reduce((a, b) => a + b, 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCommentPostIds((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="hover:underline cursor-pointer"
                      >
                        {post.comments.length} টি মন্তব্য
                      </button>
                      <span>•</span>
                      <span>{post.sharesCount} টি শেয়ার</span>
                    </div>
                  </div>

                  {/* Action Buttons Bar with Floating Reaction Picker */}
                  <div className="px-2 py-1 border-t border-slate-100 flex items-center justify-around relative bg-slate-50/50">
                    {/* Floating Reaction Bar */}
                    {hoveredReactionPostId === post.id && (
                      <div
                        onMouseLeave={() => setHoveredReactionPostId(null)}
                        className="absolute bottom-11 left-3 bg-white shadow-2xl border border-slate-200 rounded-full px-2.5 py-1.5 flex items-center gap-2 z-30 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {[
                          { type: 'like', emoji: '👍', label: 'লাইক' },
                          { type: 'love', emoji: '❤️', label: 'লাভ' },
                          { type: 'care', emoji: '🥰', label: 'কেয়ার' },
                          { type: 'haha', emoji: '😆', label: 'হাহা' },
                          { type: 'wow', emoji: '😮', label: 'ওয়াও' },
                          { type: 'sad', emoji: '😢', label: 'স্যাড' },
                          { type: 'angry', emoji: '😡', label: 'অ্যাংরি' },
                        ].map((rx) => (
                          <button
                            key={rx.type}
                            type="button"
                            onClick={() => handleReaction(post.id, rx.type as any)}
                            className="text-xl hover:scale-130 transition duration-150 cursor-pointer p-0.5"
                            title={rx.label}
                          >
                            {rx.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* React Button */}
                    <div
                      className="relative"
                      onMouseEnter={() => setHoveredReactionPostId(post.id)}
                    >
                      <button
                        type="button"
                        onClick={() => handleReaction(post.id, myReaction ? myReaction : 'like')}
                        className={`px-3 sm:px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:bg-slate-100 ${
                          myReaction === 'love'
                            ? 'text-rose-600 font-black'
                            : myReaction
                            ? 'text-[#1877F2] font-black'
                            : 'text-slate-600'
                        }`}
                      >
                        {myReaction === 'love' ? (
                          <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                        ) : (
                          <ThumbsUp
                            className={`w-4 h-4 ${
                              myReaction ? 'fill-[#1877F2] text-[#1877F2]' : ''
                            }`}
                          />
                        )}
                        <span>
                          {myReaction === 'love'
                            ? 'লাভ'
                            : myReaction === 'care'
                            ? 'কেয়ার'
                            : myReaction === 'haha'
                            ? 'হাহা'
                            : myReaction === 'wow'
                            ? 'ওয়াও'
                            : myReaction === 'sad'
                            ? 'স্যাড'
                            : myReaction === 'angry'
                            ? 'অ্যাংরি'
                            : myReaction === 'like'
                            ? 'লাইক'
                            : 'রিয়েক্ট'}
                        </span>
                      </button>
                    </div>

                    {/* Comment Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenCommentPostIds((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="px-3 sm:px-6 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>মন্তব্য করুন</span>
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShare(post.id)}
                      className="px-3 sm:px-6 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>শেয়ার</span>
                    </button>
                  </div>

                  {/* Comment Section (Interactive) */}
                  {isCommentsOpen && (
                    <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                      {/* Input Box */}
                      <div className="flex items-center gap-2">
                        <img
                          src={currentProfile.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
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
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 text-xs bg-transparent focus:outline-hidden font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="p-1 text-[#1877F2] hover:text-blue-700 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-2.5 pt-1">
                        {post.comments.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-2">
                            এখনও কোনো মন্তব্য নেই। প্রথম মন্তব্যটি আপনি করুন!
                          </p>
                        ) : (
                          post.comments.map((comm) => (
                            <div key={comm.id} className="flex items-start gap-2.5">
                              <img
                                src={comm.authorId === currentProfile.id ? currentProfile.avatar : comm.authorAvatar}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover shrink-0 cursor-pointer"
                                onClick={() => onViewProfile(comm.authorId)}
                              />
                              <div className="flex-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <h6
                                    onClick={() => onViewProfile(comm.authorId)}
                                    className="font-black text-xs text-slate-900 cursor-pointer hover:underline"
                                  >
                                    {comm.authorId === currentProfile.id ? currentProfile.name : comm.authorName}
                                  </h6>
                                  <span className="text-[9px] text-slate-400">
                                    {new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 mt-0.5 leading-snug">
                                  {comm.content}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
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
      {/* RIGHT COLUMN: Trending Marketplace Products & Active Community (3 cols) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-3 space-y-4 sticky top-20">
        {/* Trending Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#1877F2]" />
              <span>মার্কেটপ্লেসে ট্রেন্ডিং পণ্য</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">সরাসরি কিনুন</span>
          </div>

          <div className="divide-y divide-slate-100">
            {trendingProducts.map((prod) => (
              <div key={prod.id} className="py-2.5 flex items-center gap-2.5 group">
                <img
                  src={prod.imageUrl}
                  alt={prod.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-[#1877F2]">
                    {prod.name}
                  </h5>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-[#1877F2]">
                      ৳ {formatMoney(prod.salePrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenQuickBuy(prod)}
                    className="text-[10px] text-[#1877F2] font-black hover:underline cursor-pointer"
                  >
                    এখনই অর্ডার করুন →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Sellers / Contacts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <h3 className="font-black text-xs text-slate-900">
            সক্রিয় বিক্রেতা ও বন্ধু
          </h3>
          <div className="space-y-2">
            {communityDirectory.map((user) => (
              <div
                key={user.id}
                onClick={() => onStartChat(user.id)}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs text-slate-900 truncate">
                    {user.name}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate">{user.username}</p>
                </div>
                <span className="text-[10px] text-[#1877F2] font-black">চ্যাট</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Confirm Modal */}
      {blockTarget && (
        <BlockConfirmModal
          isOpen={true}
          onClose={() => setBlockTarget(null)}
          targetUserName={blockTarget.name}
          onConfirmBlock={handleConfirmBlock}
        />
      )}

      {/* Share Modal (Interactive Social & Profile Share) */}
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

      {/* Product Boost & Promotion Modal */}
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
