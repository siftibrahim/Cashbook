import React, { useState, useEffect } from 'react';
import { publicAdApi } from '../../services/apiService';
import { SystemAdSettings, CustomAdItem } from '../../types/adminTypes';
import { Megaphone, ExternalLink, X } from 'lucide-react';

interface AdCardProps {
  className?: string;
}

export const AdCard: React.FC<AdCardProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState<SystemAdSettings | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    publicAdApi.getSettings()
      .then((data) => {
        if (isMounted && data) {
          setSettings(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (!settings || !settings.isAdsEnabled || !settings.dashboardCardAdEnabled || isDismissed) {
    return null;
  }

  const activeAds = settings.customAds?.filter((a) => a.isActive !== false) || [];
  if (activeAds.length === 0) return null;

  // Pick an ad (deterministic or first active)
  const ad = activeAds[0];

  return (
    <div
      className={`relative bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/20 border border-amber-400/30 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-800 dark:text-white transition-all ${className}`}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        title="বিজ্ঞাপন বন্ধ করুন"
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg text-xs"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9.5px] font-black uppercase tracking-wider">
              {ad.badge || 'স্পন্সরড'}
            </span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">
              {ad.title}
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            {ad.description}
          </p>
        </div>
      </div>

      <a
        href={ad.targetUrl || '#'}
        target="_blank"
        rel="noreferrer"
        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0 transition active:scale-95"
      >
        <span>{ad.ctaText || 'বিস্তারিত'}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
