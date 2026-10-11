import React from 'react';

export const MarketplaceFooter: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 py-6 text-center text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-black text-[#1877F2] text-sm">TWING</span>
          <span>Central Marketplace &copy; {new Date().getFullYear()}</span>
        </div>
        <p className="text-slate-500 text-[11px]">সহজ ও বিশ্বস্ত মার্কেটপ্লেস নেটওয়ার্ক</p>
      </div>
    </footer>
  );
};

export default MarketplaceFooter;
