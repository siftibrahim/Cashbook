import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  MessageCircle,
  Globe,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CustomerProfile, LinkedProduct, SocialPost } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';
import { formatMoney } from '../../utils/storage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: SocialPost | null;
  product?: any | null;
  currentProfile: CustomerProfile;
  onShowToast: (msg: string) => void;
  onSharedSuccess?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  post,
  product,
  currentProfile,
  onShowToast,
  onSharedSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'social'>('profile');
  const [caption, setCaption] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Determine title, image, and canonical share URL
  const title = product?.name || post?.linkedProduct?.name || post?.content || 'সেন্ট্রাল মার্কেটপ্লেস';
  const imageUrl =
    product?.imageUrl ||
    (product?.images && product.images[0]) ||
    post?.linkedProduct?.imageUrl ||
    (post?.images && post.images[0]) ||
    '';
  const price = product?.salePrice || post?.linkedProduct?.salePrice;
  const authorName = product?.sellerName || post?.authorName || 'সেন্ট্রাল সেলার';

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    if (product?.id) {
      return `${base}/marketplace?product=${encodeURIComponent(product.id)}`;
    }
    if (post?.id) {
      return `${base}/marketplace?post=${encodeURIComponent(post.id)}`;
    }
    return window.location.href;
  };

  const shareUrl = getShareUrl();
  const shareText = `TWING সেন্ট্রাল মার্কেটপ্লেসে চমৎকার পণ্য: "${title}"${price ? ` মাত্র ৳${formatMoney(price)} টাকায়!` : ''}`;

  // Handle Share to Own Profile
  const handleShareToProfile = () => {
    setIsSubmitting(true);
    try {
      if (post) {
        marketplaceSocialService.sharePostToProfile(post.id, caption);
      } else if (product) {
        marketplaceSocialService.shareProductToProfile(product, caption);
      }
      onShowToast('✅ আপনার টাইমলাইন / প্রোফাইলে সফলভাবে শেয়ার হয়েছে!');
      if (onSharedSuccess) onSharedSuccess();
      onClose();
    } catch (err: any) {
      onShowToast(err.message || 'শেয়ার করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setIsCopied(true);
    onShowToast('📋 লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Social sharing handlers
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        onShowToast('সফলভাবে শেয়ার সম্পন্ন হয়েছে!');
      } catch (e) {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const openExternalShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-black shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                শেয়ার করুন
              </h3>
              <p className="text-[11px] text-slate-500">
                নিজের প্রোফাইলে অথবা সোশ্যাল মিডিয়ায় ছড়িয়ে দিন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 mx-5 mt-4 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-[#1877F2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>নিজের প্রোফাইলে শেয়ার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'social'
                ? 'bg-white text-[#1877F2] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>সোশ্যাল মিডিয়া ও লিংক</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Preview Card */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-black text-xl shrink-0">
                🛍️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                {authorName}
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {title}
              </h4>
              {price && (
                <p className="text-xs font-black text-[#1877F2] mt-0.5">
                  ৳ {formatMoney(price)}
                </p>
              )}
            </div>
          </div>

          {activeTab === 'profile' ? (
            /* Option A: Share to My Profile / Feed */
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src={currentProfile.avatar}
                    alt={currentProfile.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {currentProfile.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      পাবলিক টাইমলাইনে শেয়ার করা হবে
                    </span>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="এই পণ্য বা পোস্টটি সম্পর্কে কিছু বলুন (যেমন: 'দারুণ একটি অফার!', 'অর্ডার করতে পারেন')..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 focus:bg-white resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleShareToProfile}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1877F2] hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'শেয়ার হচ্ছে...' : 'এখনই প্রোফাইলে শেয়ার করুন'}</span>
              </button>
            </div>
          ) : (
            /* Option B: Share to Social Media & Messaging */
            <div className="space-y-4">
              {/* Social Channels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() =>
                    openExternalShare(
                      `https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `${shareText} ${shareUrl}`
                      )}`
                    )
                  }
                  className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-emerald-800 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">💬</span>
                  <span className="text-xs font-bold">হোয়াটসঅ্যাপ</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() =>
                    openExternalShare(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        shareUrl
                      )}`
                    )
                  }
                  className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-[#1877F2] group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">🌐</span>
                  <span className="text-xs font-bold">ফেসবুক</span>
                </button>

                {/* Messenger */}
                <button
                  type="button"
                  onClick={() =>
                    openExternalShare(
                      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
                        shareUrl
                      )}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`
                    )
                  }
                  className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-indigo-700 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">⚡</span>
                  <span className="text-xs font-bold">মেসেঞ্জার</span>
                </button>

                {/* Twitter / X */}
                <button
                  type="button"
                  onClick={() =>
                    openExternalShare(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        shareText
                      )}&url=${encodeURIComponent(shareUrl)}`
                    )
                  }
                  className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-slate-800 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">🐦</span>
                  <span className="text-xs font-bold">এক্স (Twitter)</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={() =>
                    openExternalShare(
                      `https://t.me/share/url?url=${encodeURIComponent(
                        shareUrl
                      )}&text=${encodeURIComponent(shareText)}`
                    )
                  }
                  className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-sky-700 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">✈️</span>
                  <span className="text-xs font-bold">টেলিগ্রাম</span>
                </button>

                {/* Native Device Share Sheet */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-amber-900 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition">📲</span>
                  <span className="text-xs font-bold">অন্যান্য অ্যাপ</span>
                </button>
              </div>

              {/* Copy Link Row */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  সরাসরি লিঙ্ক কপি করুন:
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-700 focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#1877F2] text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
