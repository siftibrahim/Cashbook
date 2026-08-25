import React, { useState } from 'react';
import { Announcement } from '../types/adminTypes';
import { Megaphone, X, ExternalLink, AlertTriangle, CheckCircle, Info, BellRing } from 'lucide-react';

interface AnnouncementDisplayProps {
  announcements: Announcement[];
}

export const AnnouncementDisplay: React.FC<AnnouncementDisplayProps> = ({ announcements }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    } catch {
      return [];
    }
  });

  const [dismissedPopups, setDismissedPopups] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('dismissed_popup_announcements') || '[]');
    } catch {
      return [];
    }
  });

  const activeAnnouncements = announcements.filter(
    (a) => a.isActive && !dismissedIds.includes(a.id)
  );

  const activePopup = activeAnnouncements.find(
    (a) => a.showAsPopup && !dismissedPopups.includes(a.id)
  );

  const handleDismissBanner = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
    } catch {}
  };

  const handleDismissPopup = (id: string) => {
    const updated = [...dismissedPopups, id];
    setDismissedPopups(updated);
    try {
      sessionStorage.setItem('dismissed_popup_announcements', JSON.stringify(updated));
    } catch {}
  };

  const bannerAnnouncements = activeAnnouncements.filter((a) => !a.showAsPopup);

  return (
    <>
      {/* Top Banners */}
      {bannerAnnouncements.length > 0 && (
        <div className="space-y-1 z-20 no-print">
          {bannerAnnouncements.map((ann) => {
            const isAlert = ann.priority === 'alert';
            const isWarning = ann.priority === 'warning';
            const isSuccess = ann.priority === 'success';

            const bgClass = isAlert
              ? 'bg-rose-600 text-white'
              : isWarning
              ? 'bg-amber-500 text-slate-950'
              : isSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-teal-700 text-white';

            return (
              <div
                key={ann.id}
                className={`px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 ${bgClass}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 truncate">
                    <span className="font-black">{ann.title}:</span>
                    <span className="font-medium opacity-95">{ann.message}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ann.actionButtonUrl && (
                    <a
                      href={ann.actionButtonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <span>{ann.actionButtonText || 'দেখুন'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismissBanner(ann.id)}
                    className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer"
                    title="বন্ধ করুন"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Popup Dialog */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
              <Megaphone className="w-7 h-7 text-teal-700" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {activePopup.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                {activePopup.message}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              {activePopup.actionButtonUrl ? (
                <a
                  href={activePopup.actionButtonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleDismissPopup(activePopup.id)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#004D40] hover:bg-[#00382f] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{activePopup.actionButtonText || 'বিস্তারিত দেখুন'}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => handleDismissPopup(activePopup.id)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {activePopup.actionButtonText || 'বুঝেছি / ঠিক আছে'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
