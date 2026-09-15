import React from 'react';
import { motion } from 'motion/react';
import { X, Bell, Tag, Truck, Sparkles, Check, Copy } from 'lucide-react';
import { Coupon } from '../../types';

interface StorefrontNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  coupons?: Coupon[];
  onApplyCoupon?: (code: string) => void;
}

export const StorefrontNotificationDrawer: React.FC<StorefrontNotificationDrawerProps> = ({
  isOpen,
  onClose,
  coupons = [],
  onApplyCoupon,
}) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onApplyCoupon) onApplyCoupon(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const sampleNotifications = [
    {
      id: 'notif_welcome',
      title: '🎉 বিশেষ ছাড় অফার!',
      message: 'WELCOME10 কুপন কোড ব্যবহার করে প্রথম অর্ডারে পান ১০% ক্যাশব্যাক ছাড়।',
      code: 'WELCOME10',
      tag: 'কুপন',
      time: 'আজকের অফার',
    },
    {
      id: 'notif_save50',
      title: '⚡ মেগা সেভিংস কুপন',
      message: 'SAVE50 কোড ব্যবহার করে ৫০০ টাকার অর্ডারে নিশ্চিত ৫০ টাকা ছাড় পান!',
      code: 'SAVE50',
      tag: 'হট ডিল',
      time: 'সীমিত সময়',
    },
    {
      id: 'notif_delivery',
      title: '🚚 ক্যাশ অন ডেলিভারি সার্ভিস',
      message: 'ঢাকা সিটি সহ সমগ্র বাংলাদেশে দ্রুত ও নির্ভরযোগ্য ক্যাশ অন ডেলিভারি চালু রয়েছে।',
      tag: 'ডেলিভারি',
      time: 'সর্বদা সক্রিয়',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
      />

      {/* Popover / Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">বিজ্ঞপ্তি ও অফারসমূহ</h3>
              <p className="text-[11px] text-slate-500">চলমান ডিসকাউন্ট এবং আপডেট</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-3 space-y-2.5 overflow-y-auto">
          {sampleNotifications.map((notif) => (
            <div
              key={notif.id}
              className="p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-teal-500/40 transition shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {notif.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {notif.time}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
              {notif.code && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-xs font-mono font-black text-amber-900">
                    {notif.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(notif.code!)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#00695C] hover:underline cursor-pointer"
                  >
                    {copiedCode === notif.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
