import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBanglaNumber = (str: string | number): string => {
  return String(str).replace(/[0-9]/g, (digit) => banglaDigits[Number(digit)]);
};

export const BangladeshClock: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [ampm, setAmpm] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Format in Asia/Dhaka timezone
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const parts = timeFormatter.formatToParts(now);
      const hour = parts.find((p) => p.type === 'hour')?.value || '00';
      const min = parts.find((p) => p.type === 'minute')?.value || '00';
      const sec = parts.find((p) => p.type === 'second')?.value || '00';
      const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value?.toUpperCase() || '';

      const banglaTime = `${toBanglaNumber(hour)}:${toBanglaNumber(min)}:${toBanglaNumber(sec)}`;
      const banglaPeriod = dayPeriod === 'AM' ? 'সকাল/পূর্বাহ্ন' : 'বিকাল/অপরাহ্ন';

      const dateFormatter = new Intl.DateTimeFormat('bn-BD', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'short',
      });

      setTimeStr(banglaTime);
      setAmpm(dayPeriod);
      setDateStr(dateFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/70 border border-emerald-400/40 rounded-full text-[11px] text-emerald-200 font-mono tracking-tight shadow-xs">
        <Clock className="w-3 h-3 text-emerald-300 animate-pulse" />
        <span className="font-bold">{timeStr || '০০:০০:০০'}</span>
        <span className="text-[9px] bg-emerald-800/80 px-1 py-0.2 rounded text-emerald-100 font-semibold">{ampm}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-teal-100/90 font-medium">
      <div className="inline-flex items-center gap-1 bg-emerald-950/60 border border-emerald-400/30 px-2 py-0.5 rounded-lg text-emerald-200 font-mono text-[11px] shadow-xs">
        <Clock className="w-3 h-3 text-emerald-300 animate-pulse shrink-0" />
        <span className="font-bold tracking-wider">{timeStr || '০০:০০:০০'}</span>
        <span className="text-[10px] text-teal-200 font-bold ml-0.5">{ampm}</span>
        <span className="text-[9px] text-emerald-400 ml-1 opacity-80 hidden sm:inline">(বাংলাদেশ সময়)</span>
      </div>
      <span className="text-[11px] text-teal-200/80 hidden md:inline">• {dateStr}</span>
    </div>
  );
};
