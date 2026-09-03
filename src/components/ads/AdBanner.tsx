import React, { useState, useEffect } from 'react';
import { publicAdApi } from '../../services/apiService';
import { SystemAdSettings } from '../../types/adminTypes';
import { Megaphone, ExternalLink, X } from 'lucide-react';

export const AdBanner: React.FC = () => {
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

  if (!settings || !settings.isAdsEnabled || !settings.bannerAdEnabled || isDismissed) {
    return null;
  }

  const activeAds = settings.customAds?.filter((a) => a.isActive !== false) || [];
  if (activeAds.length === 0) return null;

  const ad = activeAds[0];

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 py-1.5 text-xs flex items-center justify-between gap-2 shadow-sm z-30 transition-all">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="px-1.5 py-0.5 rounded bg-black/30 text-[9px] font-black uppercase tracking-wider shrink-0">
          বিজ্ঞাপন
        </span>
        <span className="truncate font-semibold text-[11px] sm:text-xs">
          {ad.title} — {ad.description}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={ad.targetUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition active:scale-95"
        >
          <span>{ad.ctaText || 'দেখুন'}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          title="বন্ধ করুন"
          className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
