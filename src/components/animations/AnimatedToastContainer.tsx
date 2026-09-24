import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Package,
  ShoppingCart,
  Cloud,
  X,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
}

interface AnimatedToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const AnimatedToastContainer: React.FC<AnimatedToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  const getToastIcon = (msg: string) => {
    if (msg.includes('✅') || msg.includes('সফল') || msg.includes('সংরক্ষিত') || msg.includes('যুক্ত')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (msg.includes('⚠️') || msg.includes('সতর্ক') || msg.includes('সীমা')) {
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (msg.includes('❌') || msg.includes('ব্যর্থ') || msg.includes('মুছে')) {
      return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (msg.includes('📦') || msg.includes('পণ্য') || msg.includes('ইনভেন্টরি')) {
      return <Package className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (msg.includes('🛍️') || msg.includes('🛒') || msg.includes('অর্ডার') || msg.includes('কার্ট')) {
      return <ShoppingBag className="w-4 h-4 text-emerald-300 shrink-0" />;
    }
    if (msg.includes('☁️') || msg.includes('সিঙ্ক')) {
      return <Cloud className="w-4 h-4 text-teal-300 shrink-0" />;
    }
    return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
  };

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-11/12 max-w-md pointer-events-none flex flex-col gap-2.5 no-print items-center"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const cleanMessage = toast.message
            .replace(/^[✅⚠️❌📦🛍️🛒☁️👋⏳]+\s*/, '')
            .trim();

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.92, transition: { duration: 0.2 } }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 26,
              }}
              onClick={() => onDismiss(toast.id)}
              className="pointer-events-auto cursor-pointer w-full bg-slate-900/95 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-3 group relative overflow-hidden active:scale-98"
            >
              {/* Subtle top edge glow */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  {getToastIcon(toast.message)}
                </div>
                <span className="text-xs font-bold text-slate-100 leading-snug line-clamp-2">
                  {cleanMessage || toast.message}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(toast.id);
                }}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center shrink-0 text-xs transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
