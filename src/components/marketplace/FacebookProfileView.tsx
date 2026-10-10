import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Calendar,
  Phone,
  ShieldCheck,
  Edit3,
  Package,
  ShoppingBag,
  MessageCircle,
  ShieldAlert,
  UserCheck,
  Star,
  Check,
  X,
  Upload,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Share2,
  Settings,
  LogOut,
  Sparkles,
  Zap,
  UserMinus,
  UserPlus,
  Clock,
} from 'lucide-react';
import {
  CustomerProfile,
  SocialPost,
  CustomerProductItem,
} from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  validateImageFiles,
  fileToBase64,
} from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';
import { BlockConfirmModal } from './BlockConfirmModal';
import { ProductBoostModal } from './ProductBoostModal';

interface FacebookProfileViewProps {
  profile: CustomerProfile;
  isOwnProfile: boolean;
  onProfileUpdated?: (updated: CustomerProfile) => void;
  onStartChatWithUser?: (userId: string, productContext?: any) => void;
  onOpenQuickBuy?: (product: CustomerProductItem) => void;
  onOpenSellProductModal?: () => void;
  onShowToast?: (msg: string) => void;
  onOpenSettings?: () => void;
  onOpenVerification?: () => void;
  onLogout?: () => void;
}

export const FacebookProfileView: React.FC<FacebookProfileViewProps> = ({
  profile,
  isOwnProfile,
  onProfileUpdated,
  onStartChatWithUser,
  onOpenQuickBuy,
  onOpenSellProductModal,
  onShowToast,
  onOpenSettings,
  onOpenVerification,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'products' | 'friends' | 'orders' | 'blocked'>('posts');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(profile.bio || '');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Local immediate avatar and cover preview
  const [currentAvatar, setCurrentAvatar] = useState(profile.avatar);
  const [currentCover, setCurrentCover] = useState(profile.coverPhoto || '');

  // Edit form states
  const [editName, setEditName] = useState(profile.name);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editAddress, setEditAddress] = useState(profile.address);
  const [editError, setEditError] = useState('');

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [boostTargetProduct, setBoostTargetProduct] = useState<CustomerProductItem | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState(() =>
    marketplaceSocialService.getRelationshipStatus(profile.id)
  );
  const [friendsList, setFriendsList] = useState<CustomerProfile[]>(() =>
    marketplaceSocialService.getFriends(profile.id)
  );

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Refresh friends list
  const refreshFriends = () => {
    setFriendsList(marketplaceSocialService.getFriends(profile.id));
  };

  // Sync state whenever profile prop updates
  useEffect(() => {
    setCurrentAvatar(profile.avatar);
    setCurrentCover(profile.coverPhoto || '');
    setEditName(profile.name);
    setEditUsername(profile.username);
    setEditPhone(profile.phone);
    setEditLocation(profile.location);
    setEditAddress(profile.address);
    setBioText(profile.bio || '');
    setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    setFriendsList(marketplaceSocialService.getFriends(profile.id));
  }, [profile]);

  // Sync relationship status & friends on friend events
  useEffect(() => {
    const handleFriendSync = () => {
      setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
      setFriendsList(marketplaceSocialService.getFriends(profile.id));
    };
    window.addEventListener('twing_friends_updated', handleFriendSync);
    window.addEventListener('twing_profile_updated', handleFriendSync);
    return () => {
      window.removeEventListener('twing_friends_updated', handleFriendSync);
      window.removeEventListener('twing_profile_updated', handleFriendSync);
    };
  }, [profile.id]);

  const handleSendFriendRequest = () => {
    const res = marketplaceSocialService.sendFriendRequest(profile.id);
    onShowToast?.(res.message);
    setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    refreshFriends();
  };

  const handleCancelRequest = () => {
    const res = marketplaceSocialService.cancelSentFriendRequest(profile.id);
    onShowToast?.(res.message);
    setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    refreshFriends();
  };

  const handleAcceptRequest = () => {
    const res = marketplaceSocialService.acceptFriendRequest(profile.id);
    onShowToast?.(res.message);
    setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    refreshFriends();
  };

  const handleUnfriendUser = () => {
    marketplaceSocialService.unfriend(profile.id);
    onShowToast?.(`${profile.name}-কে সফলভাবে আনফ্রেন্ড করা হয়েছে।`);
    setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    refreshFriends();
  };

  const handleUnfriendFromList = (friendId: string, friendName: string) => {
    marketplaceSocialService.unfriend(friendId);
    onShowToast?.(`${friendName}-কে সফলভাবে আনফ্রেন্ড করা হয়েছে।`);
    refreshFriends();
    if (friendId === profile.id) {
      setRelationshipStatus(marketplaceSocialService.getRelationshipStatus(profile.id));
    }
  };

  // Listen to profile updates broadcast
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail && isOwnProfile) {
        if (e.detail.avatar) setCurrentAvatar(e.detail.avatar);
        if (e.detail.coverPhoto) setCurrentCover(e.detail.coverPhoto);
        if (e.detail.name) setEditName(e.detail.name);
      }
    };
    window.addEventListener('twing_profile_updated', handleSync);
    return () => window.removeEventListener('twing_profile_updated', handleSync);
  }, [isOwnProfile]);

  // Get posts and products for this profile
  const allPosts = marketplaceSocialService.getPosts();
  const profilePosts = allPosts.filter((p) => p.authorId === profile.id);

  const allProducts = marketplaceSocialService.getCustomerProducts();
  const profileProducts = allProducts.filter((p) => p.sellerId === profile.id);

  // Blocked users directory
  const directory = marketplaceSocialService.getProfilesDirectory();
  const blockedProfiles = directory.filter((p) => (profile.blockedUserIds || []).includes(p.id));

  // Handle Cover Upload (STRICT: NO VIDEOS)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validation = validateImageFiles(files);
    if (!validation.valid) {
      onShowToast?.(validation.error || 'ভিডিও আপলোড করার অনুমতি নেই! শুধুমাত্র ছবি দিন।');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    setIsUploadingCover(true);
    try {
      const base64 = await fileToBase64(validation.imageFiles[0], 800, 0.65);
      setCurrentCover(base64);
      const updated = marketplaceSocialService.updateCurrentProfile({ coverPhoto: base64 });
      onProfileUpdated?.(updated);
      onShowToast?.('✅ কভার ফটো সফলভাবে পরিবর্তন ও সেভ হয়েছে!');
    } catch (err: any) {
      console.error('Cover upload error:', err);
      onShowToast?.('ছবি আপলোডে সমস্যা হয়েছে: ' + (err?.message || 'পুনরায় চেষ্টা করুন'));
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Handle Avatar Upload (STRICT: NO VIDEOS)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validation = validateImageFiles(files);
    if (!validation.valid) {
      onShowToast?.(validation.error || 'ভিডিও আপলোড করার অনুমতি নেই! শুধুমাত্র ছবি দিন।');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }

    try {
      const base64 = await fileToBase64(validation.imageFiles[0], 500, 0.70);
      setCurrentAvatar(base64);
      const updated = marketplaceSocialService.updateCurrentProfile({ avatar: base64 });
      onProfileUpdated?.(updated);
      onShowToast?.('✅ প্রোফাইল ছবি সফলভাবে পরিবর্তন ও সেভ হয়েছে!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      onShowToast?.('ছবি আপলোডে সমস্যা হয়েছে: ' + (err?.message || 'পুনরায় চেষ্টা করুন'));
    }
  };

  // Save Bio
  const handleSaveBio = () => {
    const updated = marketplaceSocialService.updateCurrentProfile({ bio: bioText });
    onProfileUpdated?.(updated);
    setIsEditingBio(false);
    onShowToast?.('বায়ো আপডেট হয়েছে!');
  };

  // Save Full Profile Details
  const handleSaveProfileModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('নাম খালি রাখা যাবে না');
      return;
    }

    const updated = marketplaceSocialService.updateCurrentProfile({
      name: editName.trim(),
      username: editUsername.startsWith('@') ? editUsername.trim() : `@${editUsername.trim()}`,
      phone: editPhone.trim(),
      location: editLocation.trim(),
      address: editAddress.trim(),
    });

    onProfileUpdated?.(updated);
    setIsEditProfileOpen(false);
    onShowToast?.('প্রোফাইল তথ্য সংরক্ষিত হয়েছে!');
  };

  // Handle Unblock
  const handleUnblock = (userId: string, userName: string) => {
    const updated = marketplaceSocialService.unblockUser(userId);
    onProfileUpdated?.(updated);
    onShowToast?.(`${userName}-কে আনব্লক করা হয়েছে।`);
  };

  // Handle Block
  const handleConfirmBlock = () => {
    marketplaceSocialService.blockUser(profile.id);
    onShowToast?.(`${profile.name}-কে ব্লক করা হয়েছে।`);
    setBlockModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 overflow-hidden">
          {(isOwnProfile ? currentCover : profile.coverPhoto) ? (
            <img
              src={isOwnProfile ? currentCover : profile.coverPhoto}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
              কভার ফটো যুক্ত করুন
            </div>
          )}

          {isOwnProfile && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*, image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">কভার পরিবর্তন করুন</span>
              </button>
            </>
          )}
        </div>

        {/* Profile Info Bar */}
        <div className="px-4 sm:px-6 pb-5 pt-3">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar & Basic Info */}
            <div className="flex items-end gap-3.5 sm:gap-4">
              <div className="relative">
                <img
                  src={isOwnProfile ? currentAvatar : profile.avatar}
                  alt={isOwnProfile ? editName : profile.name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md object-cover bg-white"
                />
                {isOwnProfile && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*, image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-1 right-1 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition shadow-md cursor-pointer"
                      title="প্রোফাইল ছবি পরিবর্তন"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="mb-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900">
                    {profile.name}
                  </h1>
                  {profile.isVerified && (
                    <span className="p-1 bg-blue-50 text-blue-600 rounded-full" title="ভেরিফাইড প্রোফাইল">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-500">
                  {profile.username}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                  <span><strong>{profile.followersCount}</strong> ফলোয়ার</span>
                  <span>•</span>
                  <span><strong>{profile.followingCount}</strong> ফলোয়িং</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>প্রোফাইল এডিট</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSellProductModal}
                    className="px-3.5 py-2 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>পণ্য বিক্রি</span>
                  </button>
                  {onOpenVerification && (
                    <button
                      type="button"
                      onClick={onOpenVerification}
                      className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#1877F2] text-xs font-black rounded-xl flex items-center gap-1.5 transition border border-blue-200 cursor-pointer"
                      title="আইডি ভেরিফিকেশন"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {profile.isVerified ? 'ভেরিফাইড' : 'ব্লু ব্যাজ'}
                      </span>
                    </button>
                  )}
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      title="সেটিংস"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">সেটিংস</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition border border-rose-200 cursor-pointer"
                      title="লগআউট"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>লগআউট</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Friend / Unfriend Relationship Action */}
                  {relationshipStatus === 'friends' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>বন্ধু</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleUnfriendUser}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        title="আনফ্রেন্ড করুন"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>আনফ্রেন্ড</span>
                      </button>
                    </div>
                  ) : relationshipStatus === 'pending_sent' ? (
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      title="অনুরোধ প্রত্যাহার করুন"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>অনুরোধ পাঠানো হয়েছে</span>
                    </button>
                  ) : relationshipStatus === 'pending_received' ? (
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>রিকোয়েস্ট গ্রহণ করুন</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendFriendRequest}
                      className="px-4 py-2 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>অ্যাড ফ্রেন্ড</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartChatWithUser?.(profile.id)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>মেসেজ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(true)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer border border-rose-200"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>ব্লক</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="আপনার সম্পর্কে লিখুন..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(false)}
                    className="px-3 py-1 text-xs text-slate-500 font-bold"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBio}
                    className="px-4 py-1 bg-[#1877F2] text-white text-xs font-bold rounded-lg"
                  >
                    সেভ করুন
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl">
                  {profile.bio || 'এখনও কোনো বায়ো যোগ করা হয়নি।'}
                </p>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs font-bold text-[#1877F2] hover:underline shrink-0 cursor-pointer"
                  >
                    এডিট
                  </button>
                )}
              </div>
            )}

            {/* Quick Details Pills */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile.location || 'ঢাকা, বাংলাদেশ'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>যোগদান: {profile.joinedDate}</span>
              </span>
              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-slate-700">{profile.rating}</span>
                <span>(সফল রেটিং)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="flex border-t border-slate-200 px-4 sm:px-6 bg-slate-50/70 text-xs sm:text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`py-3 px-3 sm:px-4 cursor-pointer transition border-b-2 ${
              activeTab === 'posts'
                ? 'border-[#1877F2] text-[#1877F2] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            পোস্টসমূহ ({profilePosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-3 px-3 sm:px-4 cursor-pointer transition border-b-2 ${
              activeTab === 'products'
                ? 'border-[#1877F2] text-[#1877F2] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            বিক্রির পণ্য ({profileProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-3 sm:px-4 cursor-pointer transition border-b-2 ${
              activeTab === 'friends'
                ? 'border-[#1877F2] text-[#1877F2] font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            বন্ধু তালিকা ({friendsList.length})
          </button>
          {isOwnProfile && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-3 px-3 sm:px-4 cursor-pointer transition border-b-2 ${
                  activeTab === 'orders'
                    ? 'border-[#1877F2] text-[#1877F2] font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                আমার অর্ডার ({profile.totalOrders || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('blocked')}
                className={`py-3 px-3 sm:px-4 cursor-pointer transition border-b-2 ${
                  activeTab === 'blocked'
                    ? 'border-[#1877F2] text-[#1877F2] font-black'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                ব্লক লিস্ট ({blockedProfiles.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Tab Contents */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {profilePosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-xs">এখনও কোনো ব্লগ বা সোশ্যাল পোস্ট নেই</p>
            </div>
          ) : (
            profilePosts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                {/* Author row */}
                <div className="flex items-center gap-3">
                  <img
                    src={isOwnProfile ? currentAvatar : post.authorAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-black text-xs text-slate-900">{isOwnProfile ? editName : post.authorName}</h4>
                    <p className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed">{post.content}</p>

                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                    {post.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full h-44 object-cover" />
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    ❤️ {post.reactions.love + post.reactions.like} রিয়েকশন
                  </span>
                  <span>{post.comments.length} টি মন্তব্য</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profileProducts.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-xs">বিক্রির জন্য কোনো পণ্য আপলোড করা হয়নি</p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={onOpenSellProductModal}
                  className="mt-2 px-4 py-2 bg-[#1877F2] text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  এখনই পণ্য আপলোড করুন
                </button>
              )}
            </div>
          ) : (
            profileProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 overflow-hidden bg-slate-100 relative">
                    <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-black rounded-lg">
                      {prod.condition === 'new'
                        ? 'নতুন'
                        : prod.condition === 'like_new'
                        ? 'নতুনের মতো'
                        : 'ব্যবহৃত'}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <h4 className="font-black text-xs text-slate-900 line-clamp-2">{prod.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{prod.description}</p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-sm font-black text-[#1877F2]">৳ {formatMoney(prod.salePrice)}</span>
                      {prod.regularPrice && (
                        <span className="text-[11px] text-slate-400 line-through">৳ {formatMoney(prod.regularPrice)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  {!isOwnProfile ? (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onStartChatWithUser?.(prod.sellerId, prod)}
                        className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        চ্যাট করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenQuickBuy?.(prod)}
                        className="flex-1 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black rounded-lg transition shadow-xs cursor-pointer"
                      >
                        এখনই কিনুন
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-emerald-600 flex items-center gap-1">
                          ✅ মার্কেটপ্লেসে সক্রিয়
                        </span>
                        {prod.isPromoted && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>বুস্টেড পণ্য</span>
                          </span>
                        )}
                      </div>
                      {/* শুধুমাত্র পণ্যের মূল মালিকের প্রোফাইলে তার নিজের পণ্যের নিচে প্রমোট অপশন থাকবে */}
                      <button
                        type="button"
                        onClick={() => setBoostTargetProduct(prod)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                        title="সুপার এডমিনের মাধ্যমে আপনার এই পণ্যটি প্রমোট বা বুস্ট করুন"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>{prod.isPromoted ? 'পুনরায় বুস্ট করুন' : 'পণ্য প্রমোট / বুস্ট করুন'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'orders' && isOwnProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1877F2]" />
            <h3 className="font-black text-sm text-slate-900">আমার সেন্ট্রাল অর্ডার ও ট্র্যাকিং</h3>
          </div>
          <p className="text-xs text-slate-500">
            আপনার করা সমস্ত অর্ডারের লাইভ ডেলিভারি স্ট্যাটাস ও ভেন্ডর প্রসেসিং।
          </p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
            💡 মূল মেনুর <strong>&quot;আমার অর্ডার&quot;</strong> ট্যাবে ক্লিক করে আপনার সব অর্ডারের বিস্তারিত ইনভয়েস ও লাইভ কুরিয়ার ম্যাপ দেখতে পারেন।
          </div>
        </div>
      )}

      {activeTab === 'blocked' && isOwnProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>ব্লক করা ব্যবহারকারীদের তালিকা ({blockedProfiles.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ব্লক করা ব্যবহারকারীরা আপনার কোনো পোস্ট দেখতে পারে না এবং মেসেজ পাঠাতে পারে না।
            </p>
          </div>

          {blockedProfiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              আপনি কাউকে ব্লক করেননি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {blockedProfiles.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="font-black text-xs text-slate-900">{user.name}</h4>
                      <p className="text-[11px] text-slate-400">{user.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(user.id, user.name)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    আনব্লক করুন
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friends Tab Content */}
      {activeTab === 'friends' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1877F2]" />
              <h3 className="font-black text-sm text-slate-900">
                {isOwnProfile ? 'আমার বন্ধু তালিকা' : `${profile.name}-এর বন্ধু তালিকা`} ({friendsList.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">
              মেসেজ পাঠান অথবা আনফ্রেন্ড করুন
            </span>
          </div>

          {friendsList.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-xs">ফ্রেন্ডলিস্টে এখনও কোনো বন্ধু নেই</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friendsList.map((f) => (
                <div key={f.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 transition shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={f.avatar}
                      alt={f.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="font-black text-xs text-slate-900 truncate">{f.name}</h4>
                        {f.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 font-bold truncate">{f.username}</p>
                      {f.location && (
                        <p className="text-[10px] text-slate-500 truncate">{f.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onStartChatWithUser?.(f.id)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      title="মেসেজ পাঠান"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">মেসেজ</span>
                    </button>
                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => handleUnfriendFromList(f.id, f.name)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                        title="আনফ্রেন্ড করুন"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>আনফ্রেন্ড</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">প্রোফাইল তথ্য সম্পাদনা</h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="space-y-3">
              {editError && (
                <div className="p-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ইউজারনেম</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">শহর / লোকেশন</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="যেমন: উত্তরা, ঢাকা"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  onClick={(e) => handleSaveProfileModal(e)}
                  className="px-5 py-2 bg-[#1877F2] hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                >
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Confirm Modal */}
      {blockModalOpen && (
        <BlockConfirmModal
          isOpen={true}
          onClose={() => setBlockModalOpen(false)}
          targetUserName={profile.name}
          onConfirmBlock={handleConfirmBlock}
        />
      )}

      {/* Product Boost Modal (Strictly triggered from owner's profile) */}
      {boostTargetProduct && (
        <ProductBoostModal
          isOpen={true}
          onClose={() => setBoostTargetProduct(null)}
          product={boostTargetProduct}
          currentProfile={profile}
          onShowToast={onShowToast}
          onBoostSubmitted={() => {
            setBoostTargetProduct(null);
            onShowToast?.('বুস্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!');
          }}
        />
      )}
    </div>
  );
};
