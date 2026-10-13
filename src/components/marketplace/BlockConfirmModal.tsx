import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface BlockConfirmModalProps {
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
          className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-black text-sm">ব্যবহারকারীকে ব্লক করবেন?</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                আপনি <strong>{targetUserName}</strong>-কে ব্লক করতে চলেছেন। ব্লক করার পর:
              </p>
            </div>

            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
              <li>তার কোনো পোস্ট বা বিক্রির পণ্য আপনার ফিডে প্রদর্শিত হবে না।</li>
              <li>সে আপনাকে সেন্ট্রাল চ্যাট বা মেসেঞ্জারে মেসেজ পাঠাতে পারবে না।</li>
              <li>আপনি প্রোফাইলের &quot;ব্লক লিস্ট&quot; ট্যাব থেকে যেকোনো সময় তাকে আনব্লক করতে পারবেন।</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmBlock();
                onClose();
              }}
              className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              হ্যাঁ, ব্লক করুন
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
