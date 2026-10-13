import React, { useState } from 'react';
import { AppUpdateConfig } from '../types/adminTypes';
import { DownloadCloud, Sparkles, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface AppUpdateModalProps {
  config: AppUpdateConfig;
  currentAppVersion?: string;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  config,
  currentAppVersion = '2.4.0',
}) => {
  const [dismissed, setDismissed] = useState(false);

  // Check if update is needed
  if (!config || !config.versionName) return null;

  const isNewer = config.versionName !== currentAppVersion;
  if (!isNewer) return null;

  // If force update is true, cannot dismiss
  if (dismissed && !config.isForceUpdate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-[#004D40] border border-teal-200 flex items-center justify-center shadow-inner">
          <DownloadCloud className="w-8 h-8 text-teal-700 animate-bounce" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100/70 text-teal-900 rounded-full text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>নতুন ভার্সন {config.versionName} প্রস্তুত</span>
          </div>

          <h3 className="text-lg font-black text-slate-900">
            {config.updateTitle || 'খাতা অ্যাপের নতুন সংস্করণ এসেছে!'}
          </h3>

          {config.isForceUpdate && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>অ্যাপটি চালিয়ে যেতে এখনই আপডেট করা আবশ্যক</span>
            </div>
          )}

          {config.releaseNotes && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-1 max-h-40 overflow-y-auto">
              <span className="font-bold text-slate-900 block mb-1">নতুন যা থাকছে:</span>
              <p className="whitespace-pre-wrap leading-relaxed">{config.releaseNotes}</p>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          {config.downloadUrl ? (
            <a
              href={config.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>এখনই আপডেট করুন</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-6 py-3 bg-[#004D40] hover:bg-[#00382f] active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>রিফ্রেশ / আপডেট করুন</span>
            </button>
          )}

          {!config.isForceUpdate && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
            >
              পরে করবো
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
