import React from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  Share2,
  MoreVertical,
  PlusSquare,
  Sparkles,
  Zap,
  WifiOff,
  ShieldCheck,
  ArrowRight,
  Download
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, triggerInstallPrompt } = usePWAInstall();

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const res = await triggerInstallPrompt();
    if (res.outcome === 'accepted') {
      onClose();
    }
  };

  return (
    <div
      id="pwa-install-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="pwa-install-modal-content"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-br from-[#033b31] via-[#054d40] to-[#0b6354] p-5 text-white relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-12 top-2 w-16 h-16 rounded-full bg-emerald-400/10 pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Icon + Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shrink-0 border-2 border-emerald-300 flex items-center justify-center overflow-hidden">
              <img
                src="/icon-192.png"
                alt="TWING Hisabi App Icon"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-bold border border-emerald-300/30 mb-0.5">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>অফিসিয়াল প্রগ্রেসিভ ওয়েব অ্যাপ</span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                TWING হিসাবি অ্যাপ
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                হোম স্ক্রিনে সরাসরি ইনস্টল করুন
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* If already running in standalone */}
          {isInstalled ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-900 text-sm">
                TWING হিসাবি সফলভাবে ইনস্টল করা আছে!
              </h4>
              <p className="text-xs text-emerald-700">
                আপনি বর্তমানে ফুল-স্ক্রিন অ্যাপ মোডে আছেন। ব্রাউজার ছাড়াই সরাসরি হোম স্ক্রিন থেকে এই অ্যাপ ব্যবহার করতে পারবেন।
              </p>
            </div>
          ) : (
            <>
              {/* Direct Native Install Button (if browser beforeinstallprompt is ready) */}
              {isInstallable && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400/60 rounded-2xl p-3.5 text-center shadow-xs">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    আপনার ব্রাউজার সরাসরি এক-ক্লিকে ইনস্টল সমর্থন করে:
                  </p>
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    className="w-full py-3 px-4 rounded-xl bg-[#033b31] hover:bg-[#054d40] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-300" />
                    <span>📱 সরাসরি এক ক্লিকে ইনস্টল করুন</span>
                  </button>
                </div>
              )}

              {/* Benefits Highlights Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-600 mb-1" />
                  <span className="text-[10.5px] font-bold text-slate-800 leading-tight">দ্রুত চালু হয়</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">অ্যাড্রেস বার ছাড়া</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center">
                  <WifiOff className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-[10.5px] font-bold text-slate-800 leading-tight">অফলাইন সুবিধা</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">নেট ছাড়াও চলে</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 mb-1" />
                  <span className="text-[10.5px] font-bold text-slate-800 leading-tight">কোনো APK নেই</span>
                  <span className="text-[9px] text-slate-500 mt-0.5">১০০% নিরাপদ</span>
                </div>
              </div>

              {/* Step-by-Step Guidance */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#033b31]" />
                  <h4 className="text-xs font-black text-slate-800">
                    {isIOS ? 'iPhone / Safari-তে ইনস্টল করার নিয়ম:' : 'Android Chrome-এ ইনস্টল করার সহজ ৩ ধাপ:'}
                  </h4>
                </div>

                {isIOS ? (
                  /* iOS Safari Step-by-step */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ১
                      </div>
                      <div className="leading-snug">
                        Safari ব্রাউজারের নিচের টুলবারের <strong className="text-emerald-800">Share (শেয়ার)</strong> আইকনে <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> চাপ দিন।
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ২
                      </div>
                      <div className="leading-snug">
                        একটু নিচে স্ক্রোল করে <strong className="text-emerald-800">"Add to Home Screen"</strong> (হোম স্ক্রিনে যোগ করুন) <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> অপশনে চাপ দিন।
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ৩
                      </div>
                      <div className="leading-snug">
                        উপরে ডানদিকের <strong className="text-emerald-800">"Add"</strong> বাটনে চাপ দিন। আপনার হোম স্ক্রিনে TWING হিসাবি অ্যাপ আইকন যুক্ত হয়ে যাবে!
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Android Chrome Step-by-step */
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#033b31] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ১
                      </div>
                      <div className="leading-snug">
                        মোবাইলে Chrome ব্রাউজারের উপরে ডানদিকের <strong className="text-slate-900">থ্রি-ডট মেনু (⋮)</strong> <MoreVertical className="w-3.5 h-3.5 inline text-slate-800" /> আইকনে চাপুন।
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#033b31] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ২
                      </div>
                      <div className="leading-snug">
                        মেনু থেকে <strong className="text-emerald-800">"Install App" (অ্যাপ ইনস্টল করুন)</strong> অথবা <strong className="text-emerald-800">"Add to Home Screen" (হোম স্ক্রিনে যোগ করুন)</strong> অপশনে চাপ দিন।
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#033b31] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        ৩
                      </div>
                      <div className="leading-snug">
                        স্ক্রিনে <strong className="text-slate-900">"Install"</strong> বাটনে ক্লিক করলেই মুহূর্তের মধ্যে TWING হিসাবি আপনার ফোনে ইনস্টল হয়ে যাবে!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-98 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            ঠিক আছে, বুঝতে পেরেছি
          </button>
        </div>
      </div>
    </div>
  );
};
