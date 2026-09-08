import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'card' | 'auth' | 'floating';
  className?: string;
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, triggerInstallPrompt } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone mode
  if (isInstalled) {
    if (variant === 'drawer') {
      return (
        <div className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-300 block">
                TWING অ্যাপ ইনস্টলড
              </span>
              <span className="text-[10px] text-emerald-200/70 block">
                আপনি ফুল-স্ক্রিন অ্যাপ মোডে আছেন
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
            Active
          </span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const res = await triggerInstallPrompt();
      if (res.outcome === 'accepted') {
        if (onActionComplete) {
          onActionComplete();
        }
      } else if (res.outcome === 'unavailable') {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'drawer' && (
        <button
          type="button"
          onClick={handleClick}
          id="pwa-drawer-install-btn"
          className={`w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-emerald-500/10 hover:from-emerald-500/35 hover:to-teal-500/20 border-2 border-emerald-400/50 text-left flex items-center justify-between transition cursor-pointer group shadow-lg ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/30 text-emerald-300 shadow-inner group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5 text-emerald-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white block">
                  📱 অ্যাপ ডাউনলোড ও ইনস্টল
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400 text-[#033b31] font-black">
                  PWA
                </span>
              </div>
              <span className="text-[10.5px] text-emerald-200/90 block mt-0.5 font-medium">
                ক্লিক করলেই সরাসরি ফোনে ডাউনলোড হবে
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {variant === 'auth' && (
        <button
          type="button"
          onClick={handleClick}
          id="pwa-auth-install-btn"
          className={`w-full py-2.5 px-4 rounded-xl bg-[#033b31]/10 hover:bg-[#033b31]/15 active:scale-98 border border-[#033b31]/20 text-[#033b31] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${className}`}
        >
          <span className="text-base">📱</span>
          <span>TWING হিসাবি অ্যাপ ইনস্টল করুন (Home Screen)</span>
        </button>
      )}

      {variant === 'card' && (
        <div
          id="pwa-card-install-banner"
          className={`bg-gradient-to-r from-[#033b31] to-[#0a5245] rounded-2xl p-3.5 text-white shadow-md flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black truncate">📱 TWING হিসাবি মোবাইল অ্যাপ</h4>
              <p className="text-[10px] text-emerald-100/80 truncate">
                অ্যাড্রেস বার ছাড়াই সুপার ফাস্ট ব্যবহার করতে ইনস্টল করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-[#033b31] font-black text-xs shadow-sm transition shrink-0 cursor-pointer"
          >
            ইনস্টল করুন
          </button>
        </div>
      )}

      {/* Interactive Guidance Modal */}
      <PWAInstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};
