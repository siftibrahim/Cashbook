import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';

export interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserName: string;
  onConfirmBlock: () => void;
}

export const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  isOpen,
  onClose,
  targetUserName,
  onConfirmBlock,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4"
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-black text-slate-900">
              {targetUserName}-কে ব্লক করতে চান?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              ব্লক করলে এই ব্যবহারকারী আপনার কোনো পোস্ট, পণ্য দেখতে পারবে না এবং কোনো মেসেজ পাঠাতে পারবে না।
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmBlock();
                onClose();
              }}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
            >
              হ্যাঁ, ব্লক করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BlockConfirmModal;
