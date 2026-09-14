import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { OnlineStoreConfig } from '../../types';

interface StorefrontHeroCarouselProps {
  onExploreClick?: () => void;
  config?: OnlineStoreConfig;
}

export const StorefrontHeroCarousel: React.FC<StorefrontHeroCarouselProps> = ({
  onExploreClick,
  config,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<any>(null);

  // Active custom banners from config
  const customBanners = (config?.banners || []).filter((b) => b.active !== false && b.imageUrl);
  const hasCustomBanners = customBanners.length > 0;
  const totalSlides = hasCustomBanners ? customBanners.length : 3;

  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalSlides]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);
  };

  const isCustomImageBanner = config?.bannerStyle === 'image' && !!config?.bannerUrl;
  const neonTitle = config?.bannerTitle || 'BEST PICKS';
  const neonTag = config?.bannerTag || 'OF THE WEEK';
  const neonDiscount = config?.bannerDiscountText || 'UP TO 55%';
  const neonSubtitle = config?.bannerSubtitle || 'DISCOUNT';
  const bannerProductImage =
    config?.bannerUrl ||
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80';

  return (
    <div className="w-full px-3.5 sm:px-6 py-2 sm:py-3">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden shadow-xs border border-slate-200/60 bg-[#F5F1EB] select-none min-h-[190px] sm:min-h-[230px] md:min-h-[260px] flex items-center">
          <AnimatePresence mode="wait">
            {hasCustomBanners ? (
              /* Custom Banners Carousel */
              customBanners.map((banner, index) => {
                if (index !== currentSlide) return null;
                return (
                  <motion.div
                    key={`custom-banner-${banner.id || index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="w-full h-full"
                  >
                    <div className="relative w-full h-[190px] sm:h-[230px] md:h-[260px] flex items-center overflow-hidden">
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || 'Store Banner'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent flex items-center p-4 sm:p-8">
                        <div className="max-w-md space-y-2 text-white">
                          {banner.tag && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                              {banner.tag}
                            </span>
                          )}
                          {banner.title && (
                            <h2 className="text-lg sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-md">
                              {banner.title}
                            </h2>
                          )}
                          {banner.subtitle && (
                            <p className="text-xs sm:text-sm text-slate-200 drop-shadow-xs line-clamp-2">
                              {banner.subtitle}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (banner.linkUrl) {
                                window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
                              } else if (onExploreClick) {
                                onExploreClick();
                              }
                            }}
                            className="mt-1 px-4 py-1.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                          >
                            <span>এখনই অর্ডার করুন</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <>
                {/* Fallback Slide 1: Primary Banner (Custom Single Image or Glowing Neon Best Picks) */}
                {currentSlide === 0 && (
              <motion.div
                key="slide-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full"
              >
                {isCustomImageBanner ? (
                  /* Vendor's Custom Image Banner View */
                  <div className="relative w-full h-[190px] sm:h-[230px] md:h-[260px] flex items-center overflow-hidden">
                    <img
                      src={config.bannerUrl}
                      alt={config.bannerTitle || 'Store Banner'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent flex items-center p-4 sm:p-8">
                      <div className="max-w-md space-y-2 text-white">
                        {config.bannerTag && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                            {config.bannerTag}
                          </span>
                        )}
                        <h2 className="text-lg sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-md">
                          {config.bannerTitle || config.storeName}
                        </h2>
                        {config.bannerSubtitle && (
                          <p className="text-xs sm:text-sm text-slate-200 drop-shadow-xs line-clamp-2">
                            {config.bannerSubtitle}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={onExploreClick}
                          className="mt-1 px-4 py-1.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <span>এখনই অর্ডার করুন</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Glowing Neon Sign + Product Showcase Banner */
                  <div className="w-full h-full p-3 sm:p-5 md:p-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
                    {/* Left Side: Glowing Neon Marquee Sign */}
                    <div className="w-[46%] sm:w-[42%] max-w-[260px] shrink-0">
                      <div className="relative rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 bg-gradient-to-br from-[#120B06] via-[#1E1108] to-[#120B06] border-[3px] border-[#D97706] shadow-[0_0_20px_rgba(217,119,6,0.35)] flex flex-col items-center justify-center text-center overflow-hidden">
                        {/* Corner decorative bulb dots */}
                        <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]" />
                        <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]" />
                        <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]" />

                        {/* Glowing Neon Content */}
                        <div className="space-y-0.5 sm:space-y-1">
                          <div
                            className="text-xs sm:text-base md:text-lg font-black tracking-wider uppercase text-[#4ADE80] truncate max-w-full"
                            style={{
                              textShadow: '0 0 5px #22c55e, 0 0 10px #22c55e, 0 0 20px #16a34a',
                              fontFamily: 'system-ui, sans-serif',
                            }}
                          >
                            {neonTitle}
                          </div>

                          <div
                            className="text-[10px] sm:text-xs text-[#FDE047] tracking-widest"
                            style={{
                              textShadow: '0 0 5px #eab308, 0 0 10px #ca8a04',
                            }}
                          >
                            ☆ ☆ ☆
                          </div>

                          <div
                            className="text-[9px] sm:text-xs md:text-sm font-extrabold tracking-wide uppercase text-[#38BDF8] truncate max-w-full"
                            style={{
                              textShadow: '0 0 5px #0284c7, 0 0 10px #0369a1',
                            }}
                          >
                            {neonTag}
                          </div>

                          <div
                            className="text-xs sm:text-sm md:text-base font-black tracking-tight text-[#FACC15] uppercase pt-0.5"
                            style={{
                              textShadow: '0 0 5px #eab308, 0 0 12px #ca8a04, 0 0 20px #a16207',
                            }}
                          >
                            {neonDiscount}
                          </div>

                          <div
                            className="text-[10px] sm:text-xs md:text-sm font-black tracking-widest text-[#22D3EE] uppercase"
                            style={{
                              textShadow: '0 0 5px #06b6d4, 0 0 10px #0891b2',
                            }}
                          >
                            {neonSubtitle}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: High-res Aesthetic Lifestyle & Products Display */}
                    <div className="flex-1 flex items-center justify-end relative h-36 sm:h-48 md:h-56">
                      <img
                        src={bannerProductImage}
                        alt="Best Picks Essentials"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain object-right drop-shadow-md rounded-2xl"
                      />

                      {/* Floating mini offer badge */}
                      <div className="absolute -bottom-1 right-2 sm:right-6 hidden xs:flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full shadow-md border border-slate-200/80 text-[11px] font-black text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>১০০% অথেনটিক পণ্য</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Slide 2: Flash Mega Sale */}
            {currentSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full p-4 sm:p-6 flex flex-row items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-[#004D40] to-teal-800 text-white"
              >
                <div className="space-y-1.5 max-w-sm">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black">
                    <Zap className="w-3 h-3 text-slate-950 fill-slate-950" />
                    <span>মেগা ধামাকা অফার</span>
                  </div>
                  <h3 className="text-base sm:text-2xl font-black tracking-tight leading-tight">
                    {config?.announcement || 'সেরা পণ্যে আকর্ষণীয় ছাড় চলছে!'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-teal-100 line-clamp-2">
                    সরাসরি স্টক থেকে শতভাগ খাঁটি পণ্য নিয়ে সারা দেশে ক্যাশ অন ডেলিভারি সুবিধা।
                  </p>
                  <button
                    type="button"
                    onClick={onExploreClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-teal-950 text-xs font-black hover:bg-teal-50 transition active:scale-95 cursor-pointer shadow-sm mt-1"
                  >
                    <span>অফার দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="hidden sm:flex flex-1 justify-end h-40">
                  <img
                    src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80"
                    alt="Special Discount Collection"
                    referrerPolicy="no-referrer"
                    className="h-full object-contain rounded-2xl drop-shadow-xl"
                  />
                </div>
              </motion.div>
            )}

            {/* Slide 3: Fast Home Delivery Guarantee */}
            {currentSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className="w-full h-full p-4 sm:p-6 flex flex-row items-center justify-between gap-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white"
              >
                <div className="space-y-1.5 max-w-sm">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-amber-900 text-[10px] sm:text-xs font-black">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>দ্রুততম হোম ডেলিভারি</span>
                  </div>
                  <h3 className="text-base sm:text-2xl font-black tracking-tight leading-tight">
                    {config?.deliveryTimeEstimate ? `${config.deliveryTimeEstimate} সময়ে ডেলিভারি` : '১২-২৪ ঘণ্টায় হোম ডেলিভারি'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-amber-100 line-clamp-2">
                    ঢাকা সিটি ও সারা দেশে বিশ্বস্ত ডেলিভারি পার্টনারের মাধ্যমে দ্রুত পণ্য হাতে পেয়ে মূল্য দিন।
                  </p>
                  <button
                    type="button"
                    onClick={onExploreClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-950 text-white text-xs font-black hover:bg-slate-900 transition active:scale-95 cursor-pointer shadow-sm mt-1"
                  >
                    <span>কেনাকাটা শুরু করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="hidden sm:flex flex-1 justify-end h-40">
                  <img
                    src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80"
                    alt="Fast Gift Delivery"
                    referrerPolicy="no-referrer"
                    className="h-full object-contain rounded-2xl drop-shadow-xl"
                  />
                </div>
              </motion.div>
            )}
              </>
            )}
          </AnimatePresence>

          {/* Carousel Navigation Indicator Dots */}
          {totalSlides > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDotClick(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/70 hover:bg-white'
                  }`}
                  title={`স্লাইড ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
