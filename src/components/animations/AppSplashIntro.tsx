import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Sparkles, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AppSplashIntroProps {
  onFinish?: () => void;
  minDurationMs?: number;
  appName?: string;
  storeName?: string;
}

export const AppSplashIntro: React.FC<AppSplashIntroProps> = ({
  onFinish,
  minDurationMs = 1800,
  appName = 'TwingHisabi – টুইংহিসাবি',
  storeName,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(15);
  const [stepText, setStepText] = useState('ডিজিটাল হিসাব খাতা প্রস্তুত হচ্ছে...');

  useEffect(() => {
    // Dynamic progress bar & text sequencing
    const t1 = setTimeout(() => {
      setProgress(45);
      setStepText('দোকানের হিসাব ও স্টক যাচাই করা হচ্ছে...');
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStepText('অফলাইন ও ক্লাউড সিঙ্ক সক্রিয় করা হচ্ছে...');
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStepText('স্বাগতম! খাতা প্রস্তুত...');
    }, 1450);

    const t4 = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, minDurationMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [minDurationMs, onFinish]);

  const handleSkip = () => {
    setIsVisible(false);
    if (onFinish) onFinish();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-splash-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-[#002820] text-white overflow-hidden p-6 select-none"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          {/* Ambient Glowing Aurora Background Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.25, 0.45, 0.25],
                rotate: [0, 90, 180, 270, 360],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/10 blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
                rotate: [360, 270, 180, 90, 0],
              }}
              transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-gradient-to-tr from-teal-600/30 to-emerald-400/20 blur-3xl"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>

          {/* Top Skip Button */}
          <div className="w-full flex justify-end relative z-10">
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              type="button"
              onClick={handleSkip}
              className="text-xs font-bold text-teal-200/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full transition flex items-center gap-1 cursor-pointer border border-white/10 active:scale-95"
            >
              <span>স্কিপ করুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Main Centered Content */}
          <div className="w-full max-w-sm flex flex-col items-center justify-center text-center relative z-10 my-auto">
            {/* Pulsing Animated Brand Badge */}
            <div className="relative mb-6">
              {/* Outer Ripple Rings */}
              <motion.div
                animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-3xl bg-emerald-400/30 blur-xs"
              />
              <motion.div
                animate={{ scale: [1, 1.25, 1.5], opacity: [0.8, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 rounded-3xl bg-teal-300/30 blur-xs"
              />

              {/* Glowing Dark Teal Icon Container Matching User Logo */}
              <motion.div
                initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 18,
                  duration: 0.7,
                }}
                className="relative w-28 h-28 rounded-3xl bg-[#00382E] shadow-2xl shadow-teal-950/40 border-2 border-[#00796B] flex items-center justify-center overflow-hidden"
              >
                {/* Shimmer sweep */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2ee6ca]/25 to-transparent transform -skew-x-12 pointer-events-none z-10"
                />
                <img
                  src="/icon-192.png"
                  alt="TwingHisabi Logo"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            {/* Brand Title */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                Twing<span className="text-emerald-400">Hisabi</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-extrabold tracking-wide text-emerald-300/90 uppercase">
                  টুইংহিসাবি
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span className="text-xs text-teal-200/90 font-medium">সহজ হিসাব খাতা</span>
              </div>
            </motion.div>

            {/* Store Name Customization if available */}
            {storeName && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-3 px-3.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/40 text-emerald-200 text-xs font-semibold max-w-[260px] truncate"
              >
                🏪 {storeName}
              </motion.div>
            )}

            {/* Feature Pills Cascade */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-2 mt-5"
            >
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-teal-100 font-semibold">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>দ্রুত POS বিক্রি</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-teal-100 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>অফলাইন ব্যাকআপ</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-teal-100 font-semibold">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>ডিজিটাল মেমো</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Loading Progress & Footer */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full max-w-xs flex flex-col items-center gap-3 relative z-10"
          >
            {/* Progress Bar Container */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5 border border-white/15 backdrop-blur-md">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-emerald-300 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />
            </div>

            {/* Dynamic Status Text with fade switch */}
            <div className="flex items-center gap-2 text-xs font-medium text-teal-200/90 min-h-[20px]">
              {progress >= 100 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="truncate">{stepText}</span>
            </div>

            <p className="text-[10px] text-teal-300/60 font-medium tracking-wide">
              ভার্সন ২.৫ • সম্পূর্ণ সুরক্ষিত ও এনক্রিপ্টেড
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
