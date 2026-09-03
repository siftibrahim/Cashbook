import React, { useState, useEffect } from 'react';
import { SystemAdSettings, CustomAdItem } from '../../types/adminTypes';
import { adminApi } from '../../services/apiService';
import {
  Megaphone,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Eye,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Layers,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

interface AdsManagementTabProps {
  onShowToast: (msg: string) => void;
}

const DEFAULT_AD_SETTINGS: SystemAdSettings = {
  isAdsEnabled: false,
  adProvider: 'custom',
  admobAppId: '',
  admobBannerUnitId: '',
  admobInterstitialUnitId: '',
  bannerAdEnabled: true,
  dashboardCardAdEnabled: true,
  footerBannerAdEnabled: false,
  customAds: [
    {
      id: 'ad_pos_printer',
      title: 'থার্মাল পিওএস প্রিন্টার ও বারকোড স্ক্যানার',
      description: 'দোকানের ক্যাশ মেমো দ্রুত প্রিন্ট করতে ৮৮মিমি ওয়াইফাই ও ব্লুটুথ থার্মাল প্রিন্টার নিন বিশেষ ছাড়ে।',
      badge: 'স্পন্সরড অফার',
      ctaText: 'অর্ডার করতে ক্লিক করুন',
      targetUrl: 'tel:01619665875',
      isActive: true,
    },
    {
      id: 'ad_barcode_rolls',
      title: 'পাইকারি মূল্যে ক্যাশ মেমো পেপার রোল',
      description: 'প্রিমিয়াম কোয়ালিটি রিসিট পেপার রোল সরাসরি সারা বাংলাদেশে হোম ডেলিভারি।',
      badge: 'সুপার ডিল',
      ctaText: 'বিস্তারিত জানুন',
      targetUrl: 'tel:01619665875',
      isActive: true,
    },
  ],
  updatedAt: Date.now(),
};

export const AdsManagementTab: React.FC<AdsManagementTabProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<SystemAdSettings>(DEFAULT_AD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'card' | 'banner'>('card');

  // New / Edit Custom Ad modal state
  const [isCustomAdModalOpen, setIsCustomAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<CustomAdItem | null>(null);
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adBadge, setAdBadge] = useState('স্পন্সরড');
  const [adCta, setAdCta] = useState('বিস্তারিত দেখুন');
  const [adUrl, setAdUrl] = useState('tel:01619665875');
  const [adActive, setAdActive] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getAdSettings();
      if (data) {
        setSettings({
          ...DEFAULT_AD_SETTINGS,
          ...data,
          customAds: data.customAds && data.customAds.length > 0 ? data.customAds : DEFAULT_AD_SETTINGS.customAds,
        });
      }
    } catch (err: any) {
      console.warn('Failed to load ad settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...settings,
        updatedAt: Date.now(),
      };
      await adminApi.saveAdSettings(payload);
      onShowToast('✅ বিজ্ঞাপন ও অ্যাড সেটিংস সফলভাবে ক্লাউডে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ সেভ ব্যর্থ হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddAd = () => {
    setEditingAd(null);
    setAdTitle('');
    setAdDescription('');
    setAdBadge('স্পন্সরড অফার');
    setAdCta('যোগাযোগ করুন');
    setAdUrl('tel:01619665875');
    setAdActive(true);
    setIsCustomAdModalOpen(true);
  };

  const handleOpenEditAd = (ad: CustomAdItem) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdDescription(ad.description);
    setAdBadge(ad.badge || 'বিজ্ঞাপন');
    setAdCta(ad.ctaText || 'বিস্তারিত');
    setAdUrl(ad.targetUrl || '');
    setAdActive(ad.isActive !== false);
    setIsCustomAdModalOpen(true);
  };

  const handleSaveCustomAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adDescription.trim()) {
      onShowToast('অনুগ্রহ করে বিজ্ঞাপনের শিরোনাম ও বিবরণ লিখুন');
      return;
    }

    const newAd: CustomAdItem = {
      id: editingAd ? editingAd.id : 'ad_' + Date.now().toString(36),
      title: adTitle.trim(),
      description: adDescription.trim(),
      badge: adBadge.trim() || 'স্পন্সরড',
      ctaText: adCta.trim() || 'বিস্তারিত দেখুন',
      targetUrl: adUrl.trim(),
      isActive: adActive,
    };

    if (editingAd) {
      setSettings((prev) => ({
        ...prev,
        customAds: prev.customAds.map((a) => (a.id === editingAd.id ? newAd : a)),
      }));
      onShowToast('✅ বিজ্ঞাপন আপডেট করা হয়েছে');
    } else {
      setSettings((prev) => ({
        ...prev,
        customAds: [newAd, ...prev.customAds],
      }));
      onShowToast('✅ নতুন বিজ্ঞাপন তালিকায় যুক্ত করা হয়েছে');
    }

    setIsCustomAdModalOpen(false);
  };

  const handleDeleteAd = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      customAds: prev.customAds.filter((a) => a.id !== id),
    }));
    onShowToast('🗑️ বিজ্ঞাপন মুছে ফেলা হয়েছে');
  };

  const handleToggleAdActive = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      customAds: prev.customAds.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#131E36] to-[#0F172A] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-0.5 shadow-lg flex items-center justify-center text-white shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>বিজ্ঞাপন ও অ্যাড ম্যানেজমেন্ট কন্ট্রোল</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                AdMob / Partner Ads
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              গুগল অ্যাডমব (Google AdMob) ও কাস্টম স্পন্সর বিজ্ঞাপন সম্পূর্ণ সুইচ আকারে নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>সংরক্ষণ হচ্ছে...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>অ্যাড সেটিংস সেভ করুন</span>
            </>
          )}
        </button>
      </div>

      {/* Master Ad Toggle Switch */}
      <div
        className={`p-5 rounded-3xl border transition-all duration-300 shadow-xl ${
          settings.isAdsEnabled
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-emerald-950/20'
            : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40 shadow-rose-950/20'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                settings.isAdsEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {settings.isAdsEnabled ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-black text-white">
                  মাস্টার বিজ্ঞাপন সুইচ (Global Ads Master Toggle)
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border shadow-sm ${
                    settings.isAdsEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {settings.isAdsEnabled ? '🟢 বিজ্ঞাপন চালু (ADS ON)' : '🔴 বিজ্ঞাপন বন্ধ (ADS OFF)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                {settings.isAdsEnabled ? (
                  <span>
                    <strong className="text-emerald-400">চালু অবস্থা:</strong> ইউজার ড্যাশবোর্ড ও অ্যাপে আপনার নির্ধারিত ব্যানার বা স্পন্সর বিজ্ঞাপন প্রদর্শিত হবে।
                  </span>
                ) : (
                  <span>
                    <strong className="text-rose-400">বন্ধ অবস্থা:</strong> অ্যাপের সকল বিজ্ঞাপন সম্পূর্ণ বন্ধ থাকবে। ইউজাররা কোনো বিজ্ঞাপন বা ব্যানার দেখতে পাবে না।
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !settings.isAdsEnabled;
              setSettings((prev) => ({ ...prev, isAdsEnabled: next }));
              onShowToast(
                next
                  ? '🟢 বিজ্ঞাপন সেবা সক্রিয় করা হয়েছে! মনে করে উপরের "অ্যাড সেটিংস সেভ করুন" বাটনে চাপুন।'
                  : '🔴 বিজ্ঞাপন সম্পূর্ণ বন্ধ রাখা হয়েছে।'
              );
            }}
            className={`w-full md:w-auto px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
              settings.isAdsEnabled
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-rose-950/40 border border-rose-400/30'
                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-950/40 border border-emerald-400/30'
            }`}
          >
            {settings.isAdsEnabled ? 'বিজ্ঞাপন বন্ধ করুন (Turn OFF)' : 'বিজ্ঞাপন চালু করুন (Turn ON)'}
          </button>
        </div>
      </div>

      {/* Grid: Placement Switches & Provider Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Placements Switches Card */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>বিজ্ঞাপন প্রদর্শনের স্থানভিত্তিক সুইচসমূহ (Placement Toggles)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">আলাদা আলাদা অন/অফ</span>
          </div>

          <div className="space-y-3">
            {/* 1. Dashboard Card Ad Switch */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-200">
                    ১) ড্যাশবোর্ড স্পন্সরড কার্ড বিজ্ঞাপন
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.dashboardCardAdEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.dashboardCardAdEnabled ? 'অন' : 'অফ'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ইউজার ড্যাশবোর্ডে হিসাব সারসংক্ষেপের নিচে আকর্ষণীয় স্পন্সরড কার্ড আকারে দেখাবে
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    dashboardCardAdEnabled: !prev.dashboardCardAdEnabled,
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.dashboardCardAdEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.dashboardCardAdEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 2. Top Banner Ad Switch */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-200">
                    ২) হেডার বা টপ ব্যানার বিজ্ঞাপন
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.bannerAdEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.bannerAdEnabled ? 'অন' : 'অফ'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ন্যাভবারের ঠিক নিচে স্লিম ব্যানার হিসেবে প্রদর্শিত হবে
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    bannerAdEnabled: !prev.bannerAdEnabled,
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.bannerAdEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.bannerAdEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* 3. Footer / Memo Bottom Ad Switch */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-200">
                    ৩) ফুটার ও বটম ব্যানার বিজ্ঞাপন
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.footerBannerAdEnabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {settings.footerBannerAdEnabled ? 'অন' : 'অফ'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  অ্যাপের নিচে বটম ন্যাভের উপরে স্থায়ী বা নন-ইনট্রুসিভ ব্যানার হিসেবে থাকবে
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    footerBannerAdEnabled: !prev.footerBannerAdEnabled,
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.footerBannerAdEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.footerBannerAdEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Provider Selector & AdMob Credentials */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>বিজ্ঞাপন প্রোভাইডার নির্বাচন</span>
            </h3>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 block">প্রোভাইডার টাইপ:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, adProvider: 'custom' }))}
                className={`p-3 rounded-xl border text-xs font-black transition cursor-pointer flex flex-col items-center gap-1 text-center ${
                  settings.adProvider === 'custom'
                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/60 ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>কাস্টম পার্টনার অ্যাড</span>
              </button>

              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, adProvider: 'admob' }))}
                className={`p-3 rounded-xl border text-xs font-black transition cursor-pointer flex flex-col items-center gap-1 text-center ${
                  settings.adProvider === 'admob'
                    ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Google AdMob</span>
              </button>
            </div>

            {settings.adProvider === 'admob' && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    AdMob App ID:
                  </label>
                  <input
                    type="text"
                    value={settings.admobAppId || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, admobAppId: e.target.value }))
                    }
                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Banner Ad Unit ID:
                  </label>
                  <input
                    type="text"
                    value={settings.admobBannerUnitId || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, admobBannerUnitId: e.target.value }))
                    }
                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Interstitial Unit ID (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    value={settings.admobInterstitialUnitId || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, admobInterstitialUnitId: e.target.value }))
                    }
                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Sponsor Ads Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>কাস্টম স্পন্সর বিজ্ঞাপন ও প্রমোশন ({settings.customAds.length}টি)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              দোকানের সরঞ্জাম, প্রিন্টার, বারকোড স্ক্যানার বা পার্টনারশিপ পণ্যের বিজ্ঞাপন যোগ করুন
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddAd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন বিজ্ঞাপন যোগ করুন</span>
          </button>
        </div>

        {/* Custom Ads List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.customAds.map((ad) => (
            <div
              key={ad.id}
              className={`p-4 rounded-2xl border transition-all ${
                ad.isActive !== false
                  ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/30 border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                    {ad.badge || 'স্পন্সরড'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      ad.isActive !== false
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {ad.isActive !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleAdActive(ad.id)}
                    title={ad.isActive !== false ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                  >
                    {ad.isActive !== false ? (
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditAd(ad)}
                    title="এডিট করুন"
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAd(ad.id)}
                    title="মুছে ফেলুন"
                    className="p-1.5 bg-slate-900 hover:bg-rose-950/80 text-rose-400 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="text-xs font-black text-white">{ad.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {ad.description}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[10px] truncate max-w-[150px]">
                  {ad.targetUrl || 'কোনো লিংক নেই'}
                </span>
                <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1">
                  <span>{ad.ctaText || 'বিস্তারিত'}</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}

          {settings.customAds.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              কোনো বিজ্ঞাপন নেই। "নতুন বিজ্ঞাপন যোগ করুন" বাটনে ক্লিক করে যোগ করুন।
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Simulator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-black text-white">লাইভ বিজ্ঞাপন প্রিভিউ (Live Ad Simulator)</h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewMode('card')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              কার্ড প্রিভিউ
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('banner')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewMode === 'banner' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ব্যানার প্রিভিউ
            </button>
          </div>
        </div>

        {/* The Mock Preview Canvas */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
          {!settings.isAdsEnabled ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              ⚠️ মাস্টার বিজ্ঞাপন সুইচ বর্তমানে <strong>বন্ধ (OFF)</strong> রয়েছে। অ্যাপে কোনো বিজ্ঞাপন প্রদর্শিত হবে না।
            </div>
          ) : previewMode === 'card' ? (
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/30 border border-amber-400/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-black uppercase">
                      {settings.customAds[0]?.badge || 'বিজ্ঞাপন'}
                    </span>
                    <h4 className="text-xs font-black text-white">
                      {settings.customAds[0]?.title || 'আপনার পণ্যের বিজ্ঞাপন'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {settings.customAds[0]?.description || 'দোকানদারদের জন্য বিশেষ অফার ও সরঞ্জাম'}
                  </p>
                </div>
              </div>

              <a
                href={settings.customAds[0]?.targetUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0"
              >
                <span>{settings.customAds[0]?.ctaText || 'অর্ডার করুন'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-bold border border-slate-700">
                  AD
                </span>
                <span className="font-bold text-white truncate max-w-sm">
                  {settings.customAds[0]?.title || 'সুপার ডিল: ক্যাশ পেপার রোল ও স্ক্যানার'}
                </span>
              </div>
              <span className="text-amber-400 font-bold text-[11px] shrink-0">
                {settings.customAds[0]?.ctaText || 'কল করুন'} →
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Custom Ad Modal */}
      {isCustomAdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                <span>{editingAd ? 'বিজ্ঞাপন সম্পাদনা' : 'নতুন বিজ্ঞাপন যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomAdModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomAd} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বিজ্ঞাপনের শিরোনাম:</label>
                <input
                  type="text"
                  required
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="যেমন: ব্লুটুথ থার্মাল প্রিন্টার অফার"
                  className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">বিস্তারিত বিবরণ:</label>
                <textarea
                  required
                  rows={3}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  placeholder="বিজ্ঞাপনের অফার বা বিস্তারিত বিবরণ লিখুন..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">ব্যাজ / ট্যাগ:</label>
                  <input
                    type="text"
                    value={adBadge}
                    onChange={(e) => setAdBadge(e.target.value)}
                    placeholder="স্পন্সরড অফার"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">বাটন টেক্সট (CTA):</label>
                  <input
                    type="text"
                    value={adCta}
                    onChange={(e) => setAdCta(e.target.value)}
                    placeholder="অর্ডার করুন / কল করুন"
                    className="w-full px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  টার্গেট ইউআরএল / ফোন লিংক:
                </label>
                <input
                  type="text"
                  value={adUrl}
                  onChange={(e) => setAdUrl(e.target.value)}
                  placeholder="https://... অথবা tel:01619665875"
                  className="w-full px-3.5 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ad-active-chk"
                  checked={adActive}
                  onChange={(e) => setAdActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="ad-active-chk" className="text-xs text-slate-300 font-bold cursor-pointer">
                  বিজ্ঞাপনটি সাথে সাথে সক্রিয় রাখুন
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomAdModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
