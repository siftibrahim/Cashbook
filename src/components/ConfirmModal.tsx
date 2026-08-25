import React from 'react';
import { AlertTriangle, LogOut, Trash2, RefreshCw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'বাতিল',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              type === 'danger'
                ? 'bg-red-100 text-red-600'
                : type === 'warning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-teal-100 text-[#00695C]'
            }`}
          >
            {title.includes('লগআউট') ? (
              <LogOut className="w-5 h-5" />
            ) : title.includes('রিসেট') ? (
              <RefreshCw className="w-5 h-5" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 leading-tight">{title}</h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed font-medium">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`py-2.5 px-4 rounded-xl text-white font-bold text-xs active:scale-95 shadow-sm transition ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#00695C] hover:bg-[#004D40]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
