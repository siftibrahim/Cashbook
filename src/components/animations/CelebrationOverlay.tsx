import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { formatMoney } from '../../utils/storage';

export interface CelebrationData {
  isOpen: boolean;
  type: 'sale' | 'payment' | 'due_clear';
  title: string;
  amount?: number;
  subtitle?: string;
}

interface CelebrationOverlayProps {
  data: CelebrationData | null;
  onClose: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ data, onClose }) => {
  if (!data || !data.isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer no-print"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100 max-w-sm w-full text-center relative overflow-hidden flex flex-col items-center"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />

          {/* Animated Checkmark Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#004D40] to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 mb-4 relative"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl bg-emerald-400/40"
            />
            <CheckCircle2 className="w-10 h-10 text-white stroke-[2.5]" />
          </motion.div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {data.title}
          </h3>

          {data.amount !== undefined && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="mt-2 text-2xl sm:text-3xl font-black text-[#004D40]"
            >
              ৳{formatMoney(data.amount)}
            </motion.div>
          )}

          {data.subtitle && (
            <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              {data.subtitle}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-2xl bg-[#004D40] hover:bg-[#00382E] text-white text-xs sm:text-sm font-black shadow-lg shadow-teal-950/20 transition cursor-pointer"
          >
            ঠিক আছে
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
