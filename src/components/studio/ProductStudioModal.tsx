import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Check,
  RefreshCw,
  Crop,
  Layers,
  ZoomIn,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  enhanceProductPhoto,
  autoGenerateStudioProductImage,
  CropBox,
  StudioBackdropStyle,
} from '../../utils/productStudioEnhancer';
import { getCatalogStudioImage } from '../../utils/productImages';
import { marketplaceApi } from '../../services/marketplaceService';
import { triggerConfettiCelebration, playSaleTone } from '../../utils/audio';

interface ProductStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; imageUrl?: string; category?: string };
  onSuccess?: (updatedImageUrl: string) => void;
  onShowToast?: (msg: string) => void;
}

export const ProductStudioModal: React.FC<ProductStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
  onShowToast,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<StudioBackdropStyle>('clean_white');
  const [heroScale, setHeroScale] = useState<number>(0.92);
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.12,
    y: 0.12,
    width: 0.76,
    height: 0.76,
  });

  const [visualMode, setVisualMode] = useState<'ai_studio' | 'catalog' | 'original'>('ai_studio');
  const [aiStudioUrl, setAiStudioUrl] = useState<string>('');
  const [catalogUrl, setCatalogUrl] = useState<string>('');
  const [activePreviewUrl, setActivePreviewUrl] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'crop'>('options');

  const rawImage = product.imageUrl || '';

  // AUTOMATIC EXECUTION on modal opening
  useEffect(() => {
    if (isOpen && rawImage) {
      runAutoStudioGeneration();
    }
  }, [isOpen, rawImage, product.name]);

  const runAutoStudioGeneration = async () => {
    setIsProcessing(true);
    try {
      // 1. Get official catalog packshot
      const catalog = getCatalogStudioImage(product.name, product.category);
      setCatalogUrl(catalog);

      // 2. Generate AI Studio photo with smart background matting and central hero scaling
      const res = await autoGenerateStudioProductImage(rawImage, product.name, product.category);
      setAiStudioUrl(res.enhancedImageUrl);
      setActivePreviewUrl(res.enhancedImageUrl);
      setVisualMode('ai_studio');

      if (onShowToast) {
        onShowToast('✨ এআই স্বয়ংক্রিয়ভাবে আকর্ষণীয় স্টুডিও ছবি তৈরি করেছে!');
      }
    } catch (err) {
      console.warn('Auto generation warning:', err);
      // Fallback
      setActivePreviewUrl(rawImage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualRegenerate = async (box: CropBox, style: StudioBackdropStyle = selectedStyle) => {
    if (!rawImage) return;
    setIsProcessing(true);
    try {
      const res = await enhanceProductPhoto(rawImage, {
        cropBox: box,
        productName: product.name,
        category: product.category,
        style,
        heroScalePercent: heroScale,
      });
      setAiStudioUrl(res.enhancedImageUrl);
      setActivePreviewUrl(res.enhancedImageUrl);
      setVisualMode('ai_studio');
    } catch (err) {
      console.warn('Regenerate error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectMode = (mode: 'ai_studio' | 'catalog' | 'original') => {
    setVisualMode(mode);
    if (mode === 'ai_studio') {
      setActivePreviewUrl(aiStudioUrl || rawImage);
    } else if (mode === 'catalog') {
      setActivePreviewUrl(catalogUrl || rawImage);
    } else {
      setActivePreviewUrl(rawImage);
    }
  };

  // Save the selected studio image
  const handleSave = async () => {
    const finalUrl = activePreviewUrl || aiStudioUrl || rawImage;
    if (!finalUrl) return;

    setIsSaving(true);
    try {
      if (product.id && product.id !== 'temp') {
        await marketplaceApi.updateProductImage(product.id, finalUrl);
      }
      playSaleTone();
      triggerConfettiCelebration();
      if (onShowToast) {
        onShowToast('🎉 আকর্ষণীয় স্টুডিও ছবি সফলভাবে সেভ ও লাইভ হয়েছে!');
      }
      onSuccess?.(finalUrl);
      onClose();
    } catch (err: any) {
      if (onShowToast) onShowToast('ছবি সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-amber-50/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                <Sparkles className="w-5 h-5 fill-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    স্বয়ংক্রিয় এআই স্টুডিও ফটো জেনারেটর
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    অটোমেটিক
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {product.name} • পেছনের বক্স ও দাগ মুছে দারাজ/অ্যামাজন স্ট্যান্ডার্ড ছবি
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 3 Visual Options Selector (One-Tap Switching) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
                <span>পছন্দের স্টুডিও ছবি নির্বাচন করুন:</span>
                <span className="text-[11px] text-teal-700 font-semibold">
                  (যেটিতে ট্যাপ করবেন সেটিই সেভ হবে)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Option 1: AI Enhanced Studio */}
                <button
                  type="button"
                  onClick={() => selectMode('ai_studio')}
                  className={`p-2 rounded-2xl border-2 transition text-left relative flex flex-col items-center cursor-pointer ${
                    visualMode === 'ai_studio'
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-full aspect-square rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center p-1.5 relative mb-1.5">
                    {aiStudioUrl ? (
                      <img
                        src={aiStudioUrl}
                        alt="AI Studio"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                    )}
                    {visualMode === 'ai_studio' && (
                      <div className="absolute top-1.5 right-1.5 bg-teal-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-black text-slate-900 text-center leading-tight">
                    ✨ এআই স্টুডিও
                  </span>
                  <span className="text-[10px] text-teal-800 font-bold">ব্যাকগ্রাউন্ড রিমুভড</span>
                </button>

                {/* Option 2: Official Catalog Studio */}
                <button
                  type="button"
                  onClick={() => selectMode('catalog')}
                  className={`p-2 rounded-2xl border-2 transition text-left relative flex flex-col items-center cursor-pointer ${
                    visualMode === 'catalog'
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-full aspect-square rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center p-1.5 relative mb-1.5">
                    {catalogUrl ? (
                      <img
                        src={catalogUrl}
                        alt="Catalog"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                    {visualMode === 'catalog' && (
                      <div className="absolute top-1.5 right-1.5 bg-teal-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-black text-slate-900 text-center leading-tight">
                    🌟 অফিসিয়াল ক্যাটালগ
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">পিওর হোয়াইট 4K</span>
                </button>

                {/* Option 3: Original Uploaded Photo */}
                <button
                  type="button"
                  onClick={() => selectMode('original')}
                  className={`p-2 rounded-2xl border-2 transition text-left relative flex flex-col items-center cursor-pointer ${
                    visualMode === 'original'
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-full aspect-square rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center p-1.5 relative mb-1.5 opacity-80">
                    <img
                      src={rawImage}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                    {visualMode === 'original' && (
                      <div className="absolute top-1.5 right-1.5 bg-teal-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-black text-slate-700 text-center leading-tight">
                    📷 আসল কাঁচা ছবি
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">আনএডিটেড</span>
                </button>
              </div>
            </div>

            {/* Main Stage: Large Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>লাইভ আউটপুট প্রিভিউ:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  ৮০০ × ৮০০ পিক্সেল • দারাজ/অ্যামাজন রেডি
                </span>
              </div>

              <div className="relative aspect-square w-full max-w-[420px] mx-auto rounded-3xl bg-white border-2 border-slate-200/80 overflow-hidden flex items-center justify-center p-4 shadow-md group">
                {activePreviewUrl ? (
                  <img
                    src={activePreviewUrl}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                    <span className="text-xs font-bold text-slate-600">এআই ছবি প্রস্তুত করছে...</span>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-300 mb-2" />
                    <span className="text-xs font-bold">এআই স্টুডিও প্রসেসিং চলছে...</span>
                    <span className="text-[10px] text-slate-300 mt-0.5">পেছনের বক্স মুছে ফেলা হচ্ছে</span>
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  <span>
                    {visualMode === 'ai_studio'
                      ? 'এআই স্টুডিও এনহ্যান্সড'
                      : visualMode === 'catalog'
                      ? 'অফিসিয়াল ক্যাটালগ কোয়ালিটি'
                      : 'আসল ছবি'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Framing Adjustment */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runAutoStudioGeneration()}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>পুনরায় এআই জেনারেট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Center hero box
                    const centerBox: CropBox = { x: 0.12, y: 0.10, width: 0.76, height: 0.80 };
                    setCropBox(centerBox);
                    handleManualRegenerate(centerBox);
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Crop className="w-3.5 h-3.5 text-teal-600" />
                  <span>🎯 মূল পণ্যে অটো ফোকাস</span>
                </button>
              </div>

              {/* Backdrop style options */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStyle('clean_white');
                    handleManualRegenerate(cropBox, 'clean_white');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                    selectedStyle === 'clean_white'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ⚪ পিওর হোয়াইট
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStyle('studio_soft');
                    handleManualRegenerate(cropBox, 'studio_soft');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                    selectedStyle === 'studio_soft'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🩶 সফট স্টুডিও
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isProcessing}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ছবি সেভ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>✅ এই আকর্ষণীয় ছবিটি সেভ করুন</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
