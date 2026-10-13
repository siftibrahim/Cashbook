import React, { useState, useEffect } from 'react';
import { Menu, ShoppingCart, User, Search, ShoppingBag, X, Mic, MicOff } from 'lucide-react';

interface StorefrontHeaderProps {
  storeName?: string;
  logoUrl?: string;
  cartCount: number;
  notificationCount?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCart: () => void;
  onOpenMenu: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  onLogoClick?: () => void;
  onMerchantLogin?: () => void;
  onBackToDashboard?: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  storeName,
  logoUrl,
  cartCount,
  searchQuery,
  onSearchChange,
  onOpenCart,
  onOpenMenu,
  onOpenProfile,
  onLogoClick,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  const handleVoiceSearch = () => {
    if (!speechSupported) {
      onSearchChange('মধু');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onSearchChange(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const isDefaultOrBikroy =
    !storeName ||
    storeName === 'আমার দোকান' ||
    storeName.toLowerCase().includes('bikroy') ||
    storeName.toLowerCase().includes('twing');

  return (
    <div className="sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.04)] select-none">
      {/* ================= HEADER BAR (TOP) ================= */}
      <header className="bg-white border-b border-slate-100 px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Hamburger & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Hamburger Menu Icon */}
            <button
              type="button"
              onClick={onOpenMenu}
              id="storefront-hamburger-btn"
              className="p-1.5 -ml-1 rounded-xl text-slate-800 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              title="মেন্যু খুলুন"
              aria-label="মেন্যু"
            >
              <Menu className="w-6 h-6 stroke-[2.2]" />
            </button>

            {/* Logo & Store Brand */}
            <div
              onClick={onLogoClick}
              className="flex items-center gap-1.5 cursor-pointer select-none group"
              title="হোমপেজে যান"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName || 'Store Logo'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#FBBF24] text-slate-950 flex items-center justify-center shadow-xs shrink-0 border border-amber-400">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-slate-900 fill-slate-900/20 stroke-[2.2]" />
                </div>
              )}

              <div className="flex flex-col leading-tight min-w-0">
                <div className="flex items-baseline">
                  {isDefaultOrBikroy ? (
                    <span className="text-base sm:text-lg font-black tracking-tight">
                      <span className="text-slate-900">Bikroy</span>
                      <span className="text-[#F97316]">Hub</span>
                    </span>
                  ) : (
                    <span className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[140px] sm:max-w-[240px]">
                      {storeName}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate hidden xs:inline">
                  সবার জন্য সেরা পণ্য
                </span>
              </div>
            </div>
          </div>

          {/* Right: Cart & Profile (Clean e-commerce actions, no clutter) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cart Icon with Real Count Badge */}
            <button
              type="button"
              onClick={onOpenCart}
              id="storefront-header-cart"
              className="relative p-2 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              title="কার্ট দেখুন"
              aria-label="কার্ট"
            >
              <ShoppingCart className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2]" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile / Account Avatar Icon */}
            <button
              type="button"
              onClick={onOpenProfile}
              id="storefront-header-profile"
              className="p-1.5 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              title="গ্রাহক প্রোফাইল"
              aria-label="গ্রাহক প্রোফাইল"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ================= SEARCH BAR (BELOW THE HEADER) ================= */}
      <div className="w-full bg-[#F8FAFC] border-b border-slate-200/90 px-3 sm:px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div
            className={`relative flex items-center w-full bg-white border rounded-2xl px-3 py-1.5 sm:py-2 shadow-2xs transition-all ${
              isListening
                ? 'border-rose-500 ring-2 ring-rose-500/20'
                : 'border-slate-200/90 hover:border-slate-300 focus-within:border-[#00695C] focus-within:ring-2 focus-within:ring-[#00695C]/20'
            }`}
          >
            <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 shrink-0 mr-2.5 stroke-[2.2]" />
            <input
              type="text"
              id="storefront-header-search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isListening ? 'কথা বলুন, শুনছি...' : 'পণ্য বা ক্যাটাগরি খুঁজুন...'}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
            />
            <div className="flex items-center gap-1 shrink-0 ml-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleVoiceSearch}
                title={isListening ? 'ভয়েস ইনপুট বন্ধ করুন' : 'ভয়েস দিয়ে পণ্য খুঁজুন'}
                className={`p-1 rounded-full transition cursor-pointer active:scale-90 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-[#00695C] hover:bg-slate-100'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
