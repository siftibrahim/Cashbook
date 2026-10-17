import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  X,
  AlertTriangle,
  CheckCircle2,
  Send,
  Flag,
  FileText,
  User,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

interface MarketplaceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'post' | 'product' | 'comment';
  targetId: string;
  targetName: string;
  targetUserId?: string;
  targetUserName?: string;
  onSuccess?: () => void;
  onShowToast?: (msg: string) => void;
}

const REPORT_REASONS = [
  { id: 'scam', label: 'প্রতারণা বা আর্থিক স্ক্যাম (Fraud / Scam)', icon: '🚨' },
  { id: 'fake_product', label: 'ভুয়া বা নকল পণ্য (Fake / Counterfeit)', icon: '📦' },
  { id: 'inappropriate', label: 'অশ্লীল বা আক্রমণাত্মক কনটেন্ট (Inappropriate)', icon: '🔞' },
  { id: 'spam', label: 'স্প্যাম বা বিভ্রান্তিকর তথ্য (Spam / Misleading)', icon: '⚠️' },
  { id: 'harassment', label: 'হয়রানি, হুমকি বা অপমানজনক আচরণ (Harassment)', icon: '🛑' },
  { id: 'other', label: 'অন্যান্য গুরুতর অভিযোগ (Other Violations)', icon: '📝' },
];

export const MarketplaceReportModal: React.FC<MarketplaceReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetUserId,
  targetUserName,
  onSuccess,
  onShowToast,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0].label);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await marketplaceSocialService.createReport({
        targetType,
        targetId,
        targetName,
        targetUserId,
        targetUserName,
        reason: selectedReason,
        details: details.trim(),
      });

      setSubmitted(true);
      if (onShowToast) {
        onShowToast('✅ আপনার রিপোর্টটি সুপার এডমিন টিমের কাছে পাঠানো হয়েছে');
      }
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitted(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch {
      setIsSubmitting(false);
      onClose();
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'user':
        return 'ব্যবহারকারী';
      case 'product':
        return 'পণ্য';
      case 'post':
        return 'পোস্ট';
      case 'comment':
        return 'মন্তব্য';
      default:
        return 'কনটেন্ট';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Flag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base">
                  {getTargetTypeLabel()}র বিরুদ্ধে রিপোর্ট করুন
                </h3>
                <p className="text-[11px] text-rose-100">
                  ফেসবুক স্ট্যান্ডার্ড কমিউনিটি পলিসি ও সুরক্ষা
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-base text-slate-800">
                রিপোর্ট সফলভাবে জমা হয়েছে
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ধন্যবাদ। টুইং হিসাবি সেন্ট্রাল মার্কেটপ্লেসের সুপার এডমিন টিম দ্রুত অভিযোগটি যাচাই করে প্রয়োজনীয় ব্যবস্থা গ্রহণ করবে।
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              {/* Target Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  {targetType === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : targetType === 'product' ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    রিপোর্ট করা হচ্ছে ({getTargetTypeLabel()})
                  </div>
                  <div className="text-xs font-black text-slate-800 truncate">
                    {targetName || targetUserName || targetId}
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>রিপোর্টের কারণ নির্বাচন করুন:</span>
                </label>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => {
                    const isSelected = selectedReason === r.label;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedReason(r.label)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{r.icon}</span>
                          <span>{r.label}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-rose-600 bg-rose-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>বিস্তারিত বিবরণ বা প্রমাণ (ঐচ্ছিক):</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="অভিযোগ সম্পর্কিত অতিরিক্ত তথ্য লিখুন (যেমন: পেমেন্ট নিয়ে পণ্য দেয়নি, মিথ্যা বিবরণ দিয়েছে ইত্যাদি)..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'রিপোর্ট পাঠানো হচ্ছে...' : 'রিপোর্ট জমা দিন'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
