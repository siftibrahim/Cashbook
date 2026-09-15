import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle2,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
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

  // Custom banners from merchant config
  const customBanners = (config?.banners || []).filter((b) => b.active !== false && b.imageUrl);
  const hasCustomBanners = customBanners.length > 0;

  // Default grocery slides matching the reference image
  const defaultSlides = [
    {
      id: 'grocery_main',
      tag: '⚡ মেগা ধামাকা অফার',
      headline: 'আপনার প্রতিদিনের প্রয়োজনীয় সব পণ্য এখন এক জায়গায়!',
      subtitle: 'সরাসরি ফ্রেশ সোর্স থেকে খাঁটি পণ্য নিয়ে সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।',
      features: ['🚚 দ্রুত ডেলিভারি', '✔ নির্ভরযোগ্য পণ্য', '👍 সাশ্রয়ী দাম'],
      quote: 'তাজা পণ্য, সুস্থ জীবন, সুন্দর আগামী 💚',
      ctaText: 'এখনই অর্ডার করুন',
      bgGradient: 'from-[#004D40] via-[#005B4C] to-[#016554]',
      imageUrl:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'fresh_produce',
      tag: '🌱 শতভাগ খাঁটি ও ফ্রেশ',
      headline: 'তাজা শাকসবজি ও ফলমূল সরাসরি আপনার দোরগোড়ায়!',
      subtitle: 'প্রতিদিনের বাজার হবে ঝামেলামুক্ত ও স্বাস্থ্যকর সেরা দামে।',
      features: ['🥦 খাঁটি ও কীটনাশকমুক্ত', '⚡ ১২-২৪ ঘণ্টার মধ্যে ডেলিভারি', '💵 ক্যাশ অন ডেলিভারি'],
      quote: 'প্রতিদিনের সেরা বাজার 🌿',
      ctaText: 'বাজার শুরু করুন',
      bgGradient: 'from-[#065F46] via-[#047857] to-[#059669]',
      imageUrl:
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'essential_deals',
      tag: '🔥 বিশেষ ছাড় ও ক্যাশব্যাক',
      headline: 'চাল, ডাল, তেল ও মসলায় অবিশ্বাস্য মূল্যছাড়!',
      subtitle: 'WELCOME10 কুপন কোড ব্যবহার করে প্রথম অর্ডারে পান আকর্ষণীয় ছাড়।',
      features: ['🌾 প্রিমিয়াম চাল ও মসলা', '📦 নিরাপদ প্যাকেজিং', '🏷 সর্বোচ্চ সাশ্রয়'],
      quote: 'সেরা অফারে কেনাকাটা 🛒',
      ctaText: 'অফার দেখুন',
      bgGradient: 'from-[#0F766E] via-[#115E59] to-[#134E4A]',
      imageUrl:
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    },
  ];

  const totalSlides = hasCustomBanners ? customBanners.length : defaultSlides.length;

  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalSlides]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
    resetTimer();
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    resetTimer();
  };

  return (
    <div className="w-full px-2.5 sm:px-4 py-2 sm:py-3">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden shadow-md select-none min-h-[190px] sm:min-h-[240px] md:min-h-[270px] flex items-center">
          <AnimatePresence mode="wait">
            {hasCustomBanners ? (
              /* Custom Merchant Banners */
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
                    <div className="relative w-full h-[190px] sm:h-[240px] md:h-[270px] flex items-center overflow-hidden">
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
                            <h2 className="text-base sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-md">
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
              /* Default Grocery Banners (Exact match to Reference Screenshot) */
              defaultSlides.map((slide, index) => {
                if (index !== currentSlide) return null;
                return (
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, x: 25 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -25 }}
                    transition={{ duration: 0.35 }}
                    className="w-full h-full"
                  >
                    <div
                      className={`relative w-full h-[200px] sm:h-[240px] md:h-[280px] bg-gradient-to-r ${slide.bgGradient} flex items-center overflow-hidden p-3 sm:p-6 md:p-8`}
                    >
                      {/* Left: Promotional Content */}
                      <div className="z-10 w-full sm:w-3/5 md:w-1/2 space-y-2 text-white">
                        {/* Tag Pill */}
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBBF24] text-slate-950 text-[10px] sm:text-xs font-black shadow-xs">
                            <Sparkles className="w-3 h-3 text-slate-950" />
                            {slide.tag}
                          </span>
                        </div>

                        {/* Big Headline */}
                        <h2 className="text-sm sm:text-xl md:text-2xl font-black leading-tight drop-shadow-sm line-clamp-2">
                          {slide.headline}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-[11px] sm:text-xs text-emerald-100/90 line-clamp-2 hidden xs:block">
                          {slide.subtitle}
                        </p>

                        {/* Feature Badges Row (🚚 দ্রুত ডেলিভারি | ✔ নির্ভরযোগ্য পণ্য | 👍 সাশ্রয়ী দাম) */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 pt-0.5 text-[10px] sm:text-xs font-bold text-emerald-100">
                          {slide.features.map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-2xs border border-white/15"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={onExploreClick}
                            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 border border-emerald-400/40 cursor-pointer"
                          >
                            <span>{slide.ctaText}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Right: Fresh Grocery Basket / Vegetables Image */}
                      <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-1/2 md:w-1/2 flex items-center justify-end overflow-hidden pointer-events-none">
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={slide.imageUrl}
                            alt="Fresh Grocery Basket"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-center opacity-85 sm:opacity-95"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#004D40] via-transparent to-transparent hidden sm:block" />
                        </div>
                      </div>

                      {/* Floating Quote Tag (তাজা পণ্য, সুস্থ জীবন, সুন্দর আগামী 💚) */}
                      <div className="absolute right-3 sm:right-6 top-3 sm:top-5 z-10 hidden sm:block">
                        <span className="px-3 py-1 rounded-full bg-white/90 text-[#004D40] text-[11px] font-black shadow-md backdrop-blur-xs border border-white">
                          {slide.quote}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md flex items-center justify-center transition active:scale-90 z-20 cursor-pointer"
            title="আগের ব্যানার"
            aria-label="আগের ব্যানার"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md flex items-center justify-center transition active:scale-90 z-20 cursor-pointer"
            title="পরের ব্যানার"
            aria-label="পরের ব্যানার"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Pagination Dots (bottom-right / bottom-center) */}
          <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5">
            {Array.from({ length: totalSlides }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => {
                  setCurrentSlide(dotIdx);
                  resetTimer();
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  dotIdx === currentSlide
                    ? 'w-5 h-2 bg-[#FBBF24] shadow-xs'
                    : 'w-2 h-2 bg-white/60 hover:bg-white'
                }`}
                aria-label={`Slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
