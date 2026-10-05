import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sliders,
  Crop,
  Layers,
  ArrowRight,
  ZoomIn,
} from 'lucide-react';
import { Product } from '../../types';
import {
  enhanceProductPhoto,
  CropBox,
  StudioBackdropStyle,
} from '../../utils/productStudioEnhancer';
import { marketplaceApi } from '../../services/marketplaceService';
import { triggerConfettiCelebration } from '../../utils/audio';

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
  const [heroScale, setHeroScale] = useState<number>(0.92); // 92% hero presence
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0.15,
    y: 0.28,
    width: 0.70,
    height: 0.65,
  });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'crop' | 'preview'>('preview');

  const rawImage = product.imageUrl || '';

  // Generate initial preview on modal open
  useEffect(() => {
    if (isOpen && rawImage) {
      // Smart detection for products like condensed milk / can
      const isCanOrBottle = product.name.includes('দুধ') || product.name.includes('ক্যান') || product.name.includes('মিল্ক');
      const initialCrop: CropBox = isCanOrBottle
        ? { x: 0.20, y: 0.40, width: 0.60, height: 0.58 } // Focus directly on the can in the lower portion!
        : { x: 0.12, y: 0.15, width: 0.76, height: 0.72 };

      setCropBox(initialCrop);
      generatePreview(initialCrop, selectedStyle, heroScale);
    }
  }, [isOpen, rawImage, product.name]);

  const generatePreview = async (
    box: CropBox,
    style: StudioBackdropStyle = selectedStyle,
    scale: number = heroScale
  ) => {
    if (!rawImage) return;
    setIsProcessing(true);
    try {
      const res = await enhanceProductPhoto(rawImage, {
        cropBox: box,
        style,
        heroScalePercent: scale,
      });
      setPreviewUrl(res.enhancedImageUrl);
    } catch (err) {
      console.warn('Preview error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Call Gemini AI on backend to detect exact bounding box
  const handleGeminiDetect = async () => {
    if (!rawImage) return;
    setIsAiDetecting(true);
    if (onShowToast) onShowToast('🤖 জেমিনি এআই দিয়ে মূল পণ্য খোঁজা হচ্ছে...');

    try {
      const res = await fetch('/api/products/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: rawImage,
          productName: product.name,
        }),
      });

      const data = await res.json();
      if (data.detectedBox) {
        const { xmin, ymin, xmax, ymax } = data.detectedBox;
        const newBox: CropBox = {
          x: Math.max(0, xmin - 0.03),
          y: Math.max(0, ymin - 0.03),
          width: Math.min(1 - xmin, (xmax - xmin) + 0.06),
          height: Math.min(1 - ymin, (ymax - ymin) + 0.06),
        };
        setCropBox(newBox);
        await generatePreview(newBox);
        if (onShowToast) onShowToast(data.message || '✨ এআই মূল পণ্য শনাক্ত করেছে!');
      } else {
        // Smart fallback
        handlePresetMilkCan();
      }
    } catch (err) {
      handlePresetMilkCan();
    } finally {
      setIsAiDetecting(false);
    }
  };

  // Preset: Focus on lower-middle product (e.g. Milk Can in front of boxes)
  const handlePresetMilkCan = () => {
    const box: CropBox = { x: 0.22, y: 0.42, width: 0.56, height: 0.56 };
    setCropBox(box);
    generatePreview(box);
    if (onShowToast) onShowToast('🥛 মূল ক্যানে ফোকাস করা হয়েছে (পেছনের বক্স বাদ)');
  };

  // Preset: Standard Center Hero
  const handlePresetCenter = () => {
    const box: CropBox = { x: 0.10, y: 0.15, width: 0.80, height: 0.72 };
    setCropBox(box);
    generatePreview(box);
  };

  // Preset: Full Image
  const handlePresetFull = () => {
    const box: CropBox = { x: 0.02, y: 0.02, width: 0.96, height: 0.96 };
    setCropBox(box);
    generatePreview(box);
  };

  // Save the studio image
  const handleSave = async () => {
    if (!previewUrl) return;
    setIsSaving(true);
    try {
      await marketplaceApi.updateProductImage(product.id, previewUrl);
      triggerConfettiCelebration();
      if (onShowToast) onShowToast('🎉 এআই স্টুডিও ছবি সফলভাবে সেভ ও লাইভ হয়েছে!');
      onSuccess?.(previewUrl);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate">
                  স্মার্ট এআই স্টুডিও এডিটর
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {product.name} • পেছনের অপ্রয়োজনীয় বক্স মুছে মানসম্মত বড় ছবি তৈরি করুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-amber-50 via-teal-50 to-emerald-50 rounded-2xl border border-amber-200/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleGeminiDetect}
                  disabled={isAiDetecting}
                  className="px-3 py-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isAiDetecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>জেমিনি এআই ফোকাস</span>
                </button>

                <button
                  type="button"
                  onClick={handlePresetMilkCan}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-100/60 text-slate-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  title="পেছনের মাস্কের বক্স বাদ দিয়ে শুধু সামনের দুধের ক্যান ফোকাস করুন"
                >
                  <span>🥛 মূল ক্যান ফোকাস</span>
                </button>

                <button
                  type="button"
                  onClick={handlePresetCenter}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  🎯 সেন্টার
                </button>

                <button
                  type="button"
                  onClick={handlePresetFull}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  📐 সম্পূর্ণ
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  স্টুডিও আউটপুট
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    activeTab === 'crop'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ক্রপ বক্স অ্যাডজাস্ট
                </button>
              </div>
            </div>

            {/* Main Stage Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Box 1: Interactive Crop Selection / Original */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Crop className="w-3.5 h-3.5 text-slate-500" />
                  <span>মূল ছবি ও ফোকাস বক্স:</span>
                </span>
                <div className="relative aspect-square w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={rawImage}
                    alt="Original"
                    className="w-full h-full object-contain select-none"
                  />
                  {/* Visual Highlight Overlay for Crop Area */}
                  <div
                    className="absolute border-2 border-amber-400 bg-amber-400/20 rounded-xl shadow-lg pointer-events-none transition-all duration-200 flex flex-col justify-between p-1"
                    style={{
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                    }}
                  >
                    <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-xs w-max">
                      মূল পণ্য ফোকাস
                    </span>
                    <span className="self-end bg-slate-900/80 text-white font-mono text-[8px] px-1 rounded">
                      {Math.round(cropBox.width * 100)}% × {Math.round(cropBox.height * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Enhanced Studio Hero Output */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ই-কমার্স মানসম্মত হিরো লুক (৯২% সাইজ):</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    বড় ও ক্লিয়ার
                  </span>
                </span>

                <div className="relative aspect-square w-full rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-2 shadow-sm">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Studio Output"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>তৈরি হচ্ছে...</span>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center text-slate-800 text-xs font-bold">
                      <RefreshCw className="w-5 h-5 animate-spin text-teal-700 mb-1" />
                      <span>স্টুডিও প্রস্তুত হচ্ছে...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fine Tuning Controls */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  স্টুডিও ব্যাকগ্রাউন্ড ও লাইটিং:
                </span>
                <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStyle('clean_white');
                      generatePreview(cropBox, 'clean_white');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      selectedStyle === 'clean_white'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>⚪</span>
                    <span>হোয়াইট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStyle('studio_soft');
                      generatePreview(cropBox, 'studio_soft');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      selectedStyle === 'studio_soft'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>🩶</span>
                    <span>সফট গ্রে</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStyle('wooden_table');
                      generatePreview(cropBox, 'wooden_table');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      selectedStyle === 'wooden_table'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>🪵</span>
                    <span>উডেন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStyle('minimalist_gradient');
                      generatePreview(cropBox, 'minimalist_gradient');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      selectedStyle === 'minimalist_gradient'
                        ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>✨</span>
                    <span>মিনিমাল</span>
                  </button>
                </div>
              </div>

              {/* Product Size Scale Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    পণ্যের আকার (Hero Scale):
                  </span>
                  <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {Math.round(heroScale * 100)}% (বড় ও আকর্ষণীয়)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="0.96"
                  step="0.02"
                  value={heroScale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setHeroScale(val);
                    generatePreview(cropBox, selectedStyle, val);
                  }}
                  className="w-full accent-teal-700 cursor-pointer"
                />
              </div>

              {/* Manual Crop Adjustment Handles (if in crop tab) */}
              {activeTab === 'crop' && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    ক্রপ এরিয়া অ্যাডজাস্ট করুন:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">টপ পজিশন (Y)</label>
                      <input
                        type="range"
                        min="0"
                        max="0.6"
                        step="0.02"
                        value={cropBox.y}
                        onChange={(e) => {
                          const newY = parseFloat(e.target.value);
                          const newBox = { ...cropBox, y: newY };
                          setCropBox(newBox);
                          generatePreview(newBox);
                        }}
                        className="w-full accent-amber-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">উচ্চতা (Height)</label>
                      <input
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.02"
                        value={cropBox.height}
                        onChange={(e) => {
                          const newH = parseFloat(e.target.value);
                          const newBox = { ...cropBox, height: newH };
                          setCropBox(newBox);
                          generatePreview(newBox);
                        }}
                        className="w-full accent-amber-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !previewUrl}
              className="px-5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>সেভ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>স্টুডিও ছবি সেভ করুন</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
