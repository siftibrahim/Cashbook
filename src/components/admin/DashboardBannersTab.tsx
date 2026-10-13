import React, { useState, useEffect } from 'react';
import {
  DashboardBannerSettings,
  DashboardBannerItem,
  BannerActionType,
} from '../../types/adminTypes';
import {
  subscribeToDashboardBanners,
  saveDashboardBanners,
  INITIAL_DASHBOARD_BANNER_SETTINGS,
} from '../../services/adminService';
import defaultHeroBannerImg from '../../assets/images/store_banner_hero_1788852324640.jpg';
import {
  Sparkles,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Upload,
  RefreshCw,
  Eye,
  Store,
  ArrowUpRight,
  Sliders,
  Check,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MessageSquare,
  Globe,
  Phone,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface DashboardBannersTabProps {
  onShowToast: (msg: string) => void;
  currentUserEmail?: string;
}

// Preset banner illustrations/images for quick 1-click selection
const PRESET_BANNER_IMAGES = [
  {
    id: 'preset_default',
    title: 'রিটেল দোকান ও কাস্টমার (ডিফল্ট)',
    url: defaultHeroBannerImg,
  },
  {
    id: 'preset_pos',
    title: 'পিওএস প্রিন্টার ও সুপার শপ',
    url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset_grocery',
    title: 'মুদি ও ডিপার্টমেন্টাল স্টোর',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset_offer',
    title: 'ধামাকা সেল ও ডিসকাউন্ট',
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'preset_mobile_app',
    title: 'স্মার্টফোন ও ডিজিটাল পেমেন্ট',
    url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80',
  },
];

// Gradient mapping for previews and frontend
export const BANNER_GRADIENTS: Record<string, { bg: string; border: string; text: string; sub: string; dotActive: string; dotInactive: string }> = {
  teal: {
    bg: 'bg-gradient-to-r from-[#bceee3] via-[#d5f4ec] to-[#e6f9f3]',
    border: 'border-[#aee4d6]',
    text: 'text-slate-900',
    sub: 'text-[#064e3b]',
    dotActive: 'bg-[#064e3b]',
    dotInactive: 'bg-[#7ecdb8]',
  },
  emerald: {
    bg: 'bg-gradient-to-r from-emerald-100 via-teal-100 to-green-50',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    sub: 'text-emerald-800',
    dotActive: 'bg-emerald-800',
    dotInactive: 'bg-emerald-300',
  },
  amber: {
    bg: 'bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-50',
    border: 'border-amber-300',
    text: 'text-amber-950',
    sub: 'text-amber-800',
    dotActive: 'bg-amber-900',
    dotInactive: 'bg-amber-300',
  },
  indigo: {
    bg: 'bg-gradient-to-r from-indigo-100 via-blue-100 to-sky-50',
    border: 'border-indigo-300',
    text: 'text-indigo-950',
    sub: 'text-indigo-800',
    dotActive: 'bg-indigo-900',
    dotInactive: 'bg-indigo-300',
  },
  rose: {
    bg: 'bg-gradient-to-r from-rose-100 via-pink-100 to-red-50',
    border: 'border-rose-300',
    text: 'text-rose-950',
    sub: 'text-rose-800',
    dotActive: 'bg-rose-900',
    dotInactive: 'bg-rose-300',
  },
  purple: {
    bg: 'bg-gradient-to-r from-purple-100 via-fuchsia-100 to-pink-50',
    border: 'border-purple-300',
    text: 'text-purple-950',
    sub: 'text-purple-800',
    dotActive: 'bg-purple-900',
    dotInactive: 'bg-purple-300',
  },
  cyan: {
    bg: 'bg-gradient-to-r from-cyan-100 via-sky-100 to-blue-50',
    border: 'border-cyan-300',
    text: 'text-cyan-950',
    sub: 'text-cyan-800',
    dotActive: 'bg-cyan-900',
    dotInactive: 'bg-cyan-300',
  },
  slate: {
    bg: 'bg-gradient-to-r from-slate-200 via-slate-100 to-zinc-50',
    border: 'border-slate-300',
    text: 'text-slate-900',
    sub: 'text-slate-700',
    dotActive: 'bg-slate-900',
    dotInactive: 'bg-slate-400',
  },
};

export const DashboardBannersTab: React.FC<DashboardBannersTabProps> = ({
  onShowToast,
  currentUserEmail,
}) => {
  const [settings, setSettings] = useState<DashboardBannerSettings>(
    INITIAL_DASHBOARD_BANNER_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // Subscribe to real-time banner settings
  useEffect(() => {
    const unsubscribe = subscribeToDashboardBanners((updated) => {
      if (updated && Array.isArray(updated.banners)) {
        setSettings(updated);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const activeBanners = settings.banners.filter((b) => b.isActive !== false);
  const currentPreviewBanner =
    activeBanners[previewSlideIndex] ||
    settings.banners[0] || {
      id: 'fallback',
      title: 'আপনার ব্যবসার বিশ্বস্ত ডিজিটাল সঙ্গী',
      subtitle: 'সহজে হিসাব রাখুন, এগিয়ে যান নির্ভুল খাতা নিয়ে',
      badgeText: 'আপনার ব্যবসার সঙ্গী',
      bgGradient: 'teal',
      actionType: 'none',
      order: 1,
      isActive: true,
    };

  // Auto rotate preview if autoplay is enabled
  useEffect(() => {
    if (!settings.autoPlay || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewSlideIndex((prev) => (prev + 1) % activeBanners.length);
    }, (settings.intervalSeconds || 5) * 1000);
    return () => clearInterval(interval);
  }, [settings.autoPlay, settings.intervalSeconds, activeBanners.length]);

  const handleSaveAll = async (overrideSettings?: DashboardBannerSettings) => {
    setIsSaving(true);
    try {
      const targetSettings = overrideSettings || settings;
      await saveDashboardBanners(targetSettings, currentUserEmail);
      onShowToast('✅ ড্যাশবোর্ড ব্যানার সেটিংস সফলভাবে সেভ হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ সেভ করতে সমস্যা হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBannerItem = (id: string, updates: Partial<DashboardBannerItem>) => {
    const updatedList = settings.banners.map((b) => (b.id === id ? { ...b, ...updates } : b));
    const newSettings = { ...settings, banners: updatedList };
    setSettings(newSettings);
  };

  const handleToggleBannerActive = (id: string) => {
    const updatedList = settings.banners.map((b) =>
      b.id === id ? { ...b, isActive: b.isActive === false ? true : false } : b
    );
    const newSettings = { ...settings, banners: updatedList };
    setSettings(newSettings);
  };

  const handleAddNewBanner = () => {
    const newId = `banner_${Date.now()}`;
    const newBanner: DashboardBannerItem = {
      id: newId,
      title: 'নতুন আকর্ষণীয় অফার ও আপডেট',
      subtitle: 'সেরা ফিচারে আপনার ব্যবসায়ের হিসাব রাখুন ডিজিটাল উপায়ে',
      badgeText: '🔥 বিশেষ অফার',
      imageUrl: '',
      bgGradient: 'teal',
      textColor: 'dark',
      actionType: 'url',
      actionText: 'অফারটি দেখুন',
      actionUrl: 'https://twinghisabi.site',
      isActive: true,
      order: settings.banners.length + 1,
    };
    const newSettings: DashboardBannerSettings = {
      ...settings,
      banners: [...settings.banners, newBanner],
    };
    setSettings(newSettings);
    setEditingBannerId(newId);
    onShowToast('✅ নতুন ব্যানার যুক্ত হয়েছে! নিচের তথ্য পূরণ করে সেভ করুন।');
  };

  const handleDeleteBanner = (id: string) => {
    if (settings.banners.length <= 1) {
      onShowToast('⚠️ অন্তত একটি ব্যানার অবশ্যই থাকতে হবে!');
      return;
    }
    const filtered = settings.banners.filter((b) => b.id !== id);
    const newSettings = { ...settings, banners: filtered };
    setSettings(newSettings);
    if (editingBannerId === id) setEditingBannerId(null);
    onShowToast('🗑️ ব্যানারটি মুছে ফেলা হয়েছে। পরিবর্তন সংরক্ষণে সেভ বাটনে ক্লিক করুন।');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('⚠️ ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে হবে');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Compress using canvas to ensure fast load and low payload
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        handleUpdateBannerItem(bannerId, { imageUrl: compressedDataUrl });
        onShowToast('✅ ব্যানার ছবি সফলভাবে আপলোড হয়েছে!');
      };
      img.src = uploadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const currentTheme = BANNER_GRADIENTS[currentPreviewBanner.bgGradient || 'teal'] || BANNER_GRADIENTS.teal;
  const displayImage = currentPreviewBanner.imageUrl || defaultHeroBannerImg;

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-16">
      {/* 👑 Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-500/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                ড্যাশবোর্ড প্রোমো ব্যানার কন্ট্রোল
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                সুপার এডমিন এক্সক্লুসিভ
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              এখানে কোনো ইউজারের দোকানের নাম থাকবে না—এই ব্যানারের সম্পূর্ণ নিয়ন্ত্রণ আপনার হাতে।
              আপনি ছবি, শিরোনাম, সাব-টাইটেল ও লিংক বাটন দিয়ে বিভিন্ন অফার প্রমোট করতে পারবেন।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAddNewBanner}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-2xl transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>নতুন স্লাইড</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveAll()}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 active:scale-95 text-white text-xs font-black rounded-2xl transition shadow-lg shadow-teal-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সব সেভ করুন'}</span>
          </button>
        </div>
      </div>

      {/* 🔴 Real-time Live Preview (1:1 with Shopkeeper's Screen) */}
      <div className="bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-200">
              দোকানদারের স্ক্রিনে যেমন প্রদর্শিত হবে (লাইভ প্রিভিউ)
            </h3>
          </div>
          {activeBanners.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>স্লাইড {previewSlideIndex + 1} / {activeBanners.length}</span>
            </div>
          )}
        </div>

        {/* 1:1 Viewport Reproduction of the Dashboard Hero Banner */}
        <div className="p-3 bg-[#f0fdf4]/5 rounded-2xl border border-dashed border-teal-500/30 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* The exact section from DashboardView */}
            <section
              id="preview-promo-banner"
              className={`${currentTheme.bg} ${currentTheme.border} border rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-sm overflow-hidden shrink-0 h-[78px] sm:h-[90px] select-none transition-all duration-300`}
            >
              <div className="flex flex-col justify-between h-full py-0.5 min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white shadow-2xs border border-white flex items-center justify-center text-[#064e3b] shrink-0">
                    <Store className="w-4 h-4 text-[#064e3b]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-[10px] sm:text-[11px] font-bold ${currentTheme.sub} leading-none truncate`}>
                        {currentPreviewBanner.badgeText || 'আপনার ব্যবসার সঙ্গী'}
                      </p>
                      {currentPreviewBanner.actionType && currentPreviewBanner.actionType !== 'none' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-white/90 text-[9px] font-black text-emerald-800 border border-emerald-300 shadow-2xs">
                          <span>{currentPreviewBanner.actionText || 'অফারটি দেখুন'}</span>
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-tight mt-0.5 truncate">
                      {currentPreviewBanner.title || 'আপনার ব্যবসার বিশ্বস্ত ডিজিটাল সঙ্গী'}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-auto">
                  <p className={`text-[10px] sm:text-xs ${currentTheme.sub} font-medium leading-none truncate`}>
                    {currentPreviewBanner.subtitle || 'সহজে হিসাব রাখুন, এগিয়ে যান'}
                  </p>
                  {/* Pagination Dots (Responsive to actual slides) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: Math.max(activeBanners.length, 3) }).map((_, idx) => (
                      <span
                        key={idx}
                        onClick={() => idx < activeBanners.length && setPreviewSlideIndex(idx)}
                        className={`transition-all duration-300 cursor-pointer ${
                          idx === previewSlideIndex
                            ? `w-2.5 h-1.5 rounded-full ${currentTheme.dotActive}`
                            : `w-1.5 h-1.5 rounded-full ${currentTheme.dotInactive}`
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side illustration matching screenshot */}
              <div className="h-full shrink-0 flex items-center pl-2">
                <img
                  src={displayImage}
                  alt="Banner Promo"
                  className="w-24 xs:w-28 sm:w-32 h-full object-cover rounded-xl shadow-2xs border border-white/95 bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            </section>
          </div>
        </div>

        {/* Global Controls: Master Enabled & Autoplay */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Master Enable/Disable */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">ব্যানার স্ট্যাটাস</span>
              <span className="text-[10px] text-slate-400">ড্যাশবোর্ডে ব্যানার দেখাবেন কিনা</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = { ...settings, isEnabled: !settings.isEnabled };
                setSettings(updated);
                handleSaveAll(updated);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                settings.isEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {settings.isEnabled ? 'চালু আছে' : 'বন্ধ'}
            </button>
          </div>

          {/* Autoplay Switch */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">অটো-স্লাইড</span>
              <span className="text-[10px] text-slate-400">নিজে নিজে ব্যানার পরিবর্তন</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const updated = { ...settings, autoPlay: !settings.autoPlay };
                setSettings(updated);
                handleSaveAll(updated);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                settings.autoPlay
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {settings.autoPlay ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
            </button>
          </div>

          {/* Slide Interval Speed */}
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">স্লাইড পরিবর্তনের গতি</span>
              <span className="text-[10px] text-slate-400">প্রতি স্লাইডের স্থায়িত্ব</span>
            </div>
            <select
              value={settings.intervalSeconds || 5}
              onChange={(e) => {
                const updated = { ...settings, intervalSeconds: Number(e.target.value) };
                setSettings(updated);
                handleSaveAll(updated);
              }}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value={3}>৩ সেকেন্ড</option>
              <option value={5}>৫ সেকেন্ড (প্রস্তাবিত)</option>
              <option value={7}>৭ সেকেন্ড</option>
              <option value={10}>১০ সেকেন্ড</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📋 List of Banners with Inline Rich Editor */}
      <div className="bg-[#101A2D] p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-200">
              ব্যানার স্লাইড তালিকা ({settings.banners.length}টি ব্যানার)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            যেকোনো স্লাইড এডিট করতে ক্লিক করুন
          </span>
        </div>

        <div className="space-y-3.5">
          {settings.banners.map((banner, index) => {
            const isEditing = editingBannerId === banner.id;
            const theme = BANNER_GRADIENTS[banner.bgGradient || 'teal'] || BANNER_GRADIENTS.teal;
            const bannerImg = banner.imageUrl || defaultHeroBannerImg;

            return (
              <div
                key={banner.id}
                className={`rounded-2xl border transition-all ${
                  isEditing
                    ? 'border-teal-500 bg-[#0c1424] ring-1 ring-teal-500/30'
                    : 'border-slate-800 bg-[#0d1627] hover:border-slate-700'
                }`}
              >
                {/* Header Summary Row */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={bannerImg}
                      alt={banner.title}
                      className="w-16 h-10 object-cover rounded-xl border border-slate-700 shrink-0 bg-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-200 truncate">
                          {banner.title || `ব্যানার #${index + 1}`}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                            banner.isActive !== false
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {banner.isActive !== false ? 'চলমান' : 'বন্ধ'}
                        </span>
                        {banner.actionType && banner.actionType !== 'none' && (
                          <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            🔗 {banner.actionText || 'অফার বাটন'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {banner.subtitle || banner.badgeText || 'কোনো বিবরণ দেওয়া হয়নি'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingBannerId(isEditing ? null : banner.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isEditing
                          ? 'bg-teal-500 text-slate-950 font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'সম্পন্ন' : 'এডিট'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleBannerActive(banner.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        banner.isActive !== false
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                      title={banner.isActive !== false ? 'ব্যানারটি বন্ধ করুন' : 'ব্যানারটি চালু করুন'}
                    >
                      {banner.isActive !== false ? 'বন্ধ করুন' : 'চালু করুন'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="ব্যানার মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Full Editor for this Banner */}
                {isEditing && (
                  <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-[#090f1b] space-y-4 rounded-b-2xl">
                    <div className="flex items-center justify-between pb-1">
                      <div className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ব্যানারের ছবি, শিরোনাম ও অফার লিংক পরিবর্তন করুন</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        আইডি: <code className="text-slate-300">{banner.id}</code>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Banner Title */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <span>ব্যানারের প্রধান টাইটেল / শিরোনাম</span>
                          <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => handleUpdateBannerItem(banner.id, { title: e.target.value })}
                          placeholder="উদাঃ আপনার ব্যবসার বিশ্বস্ত ডিজিটাল সঙ্গী"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                        <p className="text-[10px] text-slate-400">
                          দোকানদারের ড্যাশবোর্ডে বড় শিরোনাম হিসেবে প্রদর্শিত হবে।
                        </p>
                      </div>

                      {/* Top Badge / Tag */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          উপরে ছোট ব্যাজ / ট্যাগ
                        </label>
                        <input
                          type="text"
                          value={banner.badgeText || ''}
                          onChange={(e) => handleUpdateBannerItem(banner.id, { badgeText: e.target.value })}
                          placeholder="উদাঃ আপনার ব্যবসার সঙ্গী / 🔥 মেগা অফার"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                        <p className="text-[10px] text-slate-400">
                          শিরোনামের ঠিক উপরে ছোট সবুজ ট্যাগ আকারে থাকবে।
                        </p>
                      </div>

                      {/* Subtitle / Description */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-300">
                          সাব-টাইটেল বা বিবরণ
                        </label>
                        <input
                          type="text"
                          value={banner.subtitle || ''}
                          onChange={(e) => handleUpdateBannerItem(banner.id, { subtitle: e.target.value })}
                          placeholder="উদাঃ সহজে হিসাব রাখুন, এগিয়ে যান নির্ভুল খাতা নিয়ে"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                        <p className="text-[10px] text-slate-400">
                          ব্যানারের নিচে ছোট বিবরণ হিসেবে প্রদর্শিত হবে।
                        </p>
                      </div>

                      {/* Offer Link & CTA Button Settings */}
                      <div className="sm:col-span-2 p-3.5 bg-slate-900/80 rounded-2xl border border-teal-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                            <ExternalLink className="w-4 h-4" />
                            <span>অফার লিংক ও কল-টু-অ্যাকশন (CTA) বাটন কনফিগারেশন</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            কাস্টমার ব্যানারে ক্লিক করলে কোথায় যাবে
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Action Type */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">অ্যাকশন টাইপ</label>
                            <select
                              value={banner.actionType || 'none'}
                              onChange={(e) =>
                                handleUpdateBannerItem(banner.id, {
                                  actionType: e.target.value as BannerActionType,
                                })
                              }
                              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="none">কোনো লিংক বাটন নেই (সাধারণ ব্যানার)</option>
                              <option value="url">🌐 কাস্টম ওয়েব লিংক (ওয়েবসাইট / অফার পেজ)</option>
                              <option value="subscription">💳 সাবস্ক্রিপশন প্যাকেজ মডাল ওপেন</option>
                              <option value="sms">💬 এসএমএস রিচার্জ অপশন ওপেন</option>
                              <option value="support">🎧 কাস্টমার সাপোর্ট চ্যাট ওপেন</option>
                              <option value="tel">📞 সরাসরি ফোনে যোগাযোগ (Call)</option>
                            </select>
                          </div>

                          {/* Action Button Text */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">বাটন টেক্সট</label>
                            <input
                              type="text"
                              value={banner.actionText || ''}
                              onChange={(e) => handleUpdateBannerItem(banner.id, { actionText: e.target.value })}
                              placeholder="উদাঃ অফারটি দেখুন / প্রিমিয়াম নিন"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>

                          {/* Action URL */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300">
                              {banner.actionType === 'tel' ? 'ফোন নম্বর' : 'টার্গেট লিংক URL'}
                            </label>
                            <input
                              type={banner.actionType === 'tel' ? 'tel' : 'url'}
                              disabled={banner.actionType === 'none' || banner.actionType === 'subscription' || banner.actionType === 'sms' || banner.actionType === 'support'}
                              value={banner.actionUrl || ''}
                              onChange={(e) => handleUpdateBannerItem(banner.id, { actionUrl: e.target.value })}
                              placeholder={
                                banner.actionType === 'tel'
                                  ? 'tel:01306908115'
                                  : banner.actionType === 'url'
                                  ? 'https://...'
                                  : '(স্বয়ংক্রিয়ভাবে ইন-অ্যাপ স্ক্রিন খুলবে)'
                              }
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-40"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Image Source & Upload */}
                      <div className="sm:col-span-2 space-y-2.5 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-teal-400" />
                            <span>ব্যানারের ছবি পরিবর্তন (ডান পাশের ইলাস্ট্রেশন/ছবি)</span>
                          </label>
                          {banner.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBannerItem(banner.id, { imageUrl: '' })}
                              className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                            >
                              ডিফল্ট ছবিতে রিসেট করুন
                            </button>
                          )}
                        </div>

                        {/* File Upload & URL Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          {/* File input */}
                          <div>
                            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-teal-500 rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition">
                              <Upload className="w-4 h-4 text-teal-400" />
                              <span>ডিভাইস থেকে ছবি আপলোড করুন</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, banner.id)}
                              />
                            </label>
                          </div>

                          {/* URL input */}
                          <div>
                            <input
                              type="url"
                              value={banner.imageUrl || ''}
                              onChange={(e) => handleUpdateBannerItem(banner.id, { imageUrl: e.target.value })}
                              placeholder="অথবা সরাসরি ছবির URL পেস্ট করুন..."
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>

                        {/* Quick Presets Gallery */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-slate-400 block">
                            প্রিসেট গ্যালারি থেকে ১-ক্লিকে ছবি নির্বাচন করুন:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {PRESET_BANNER_IMAGES.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleUpdateBannerItem(banner.id, { imageUrl: preset.url === defaultHeroBannerImg ? '' : preset.url })}
                                className="p-1.5 rounded-xl border border-slate-700 hover:border-teal-400 bg-slate-800/80 flex flex-col items-center gap-1 cursor-pointer transition group"
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.title}
                                  className="w-full h-12 object-cover rounded-lg bg-slate-900"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[9.5px] font-bold text-slate-300 group-hover:text-teal-300 truncate w-full text-center">
                                  {preset.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Color Gradient Theme */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          ব্যানারের ব্যাকগ্রাউন্ড কালার থিম
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.keys(BANNER_GRADIENTS).map((colorKey) => {
                            const isSelected = (banner.bgGradient || 'teal') === colorKey;
                            const t = BANNER_GRADIENTS[colorKey];
                            return (
                              <button
                                key={colorKey}
                                type="button"
                                onClick={() =>
                                  handleUpdateBannerItem(banner.id, {
                                    bgGradient: colorKey as any,
                                  })
                                }
                                className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                                  isSelected
                                    ? 'border-teal-400 ring-2 ring-teal-400/30 bg-slate-800'
                                    : 'border-slate-700 hover:border-slate-600 bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-4 h-4 rounded-full ${t.bg} border ${t.border}`} />
                                  <span className="text-xs font-bold capitalize text-slate-200">
                                    {colorKey === 'teal'
                                      ? 'ক্লাসিক মিন্ট (ডিফল্ট)'
                                      : colorKey === 'emerald'
                                      ? 'এমেরাল্ড গ্রিন'
                                      : colorKey === 'amber'
                                      ? 'গোল্ডেন অ্যাম্বার'
                                      : colorKey === 'indigo'
                                      ? 'রয়্যাল ইন্ডিগো'
                                      : colorKey === 'rose'
                                      ? 'সফট রুবি রোজ'
                                      : colorKey === 'purple'
                                      ? 'পার্পল ভায়োলেট'
                                      : colorKey === 'cyan'
                                      ? 'স্কাই সায়ান'
                                      : 'সফট স্লেট'}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-teal-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Done Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBannerId(null);
                          handleSaveAll();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>পরিবর্তন সংরক্ষণ করুন</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
