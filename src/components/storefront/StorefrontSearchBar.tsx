import React, { useState, useEffect } from 'react';
import { Search, Mic, MicOff, X } from 'lucide-react';

interface StorefrontSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const StorefrontSearchBar: React.FC<StorefrontSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClear,
  placeholder = 'Search "Medicine, Skincare, Panjabi..."',
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
      // Fallback hint
      onSearchChange('Skincare');
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

  return (
    <div className="w-full px-3.5 sm:px-6 pt-3 pb-1">
      <div className="max-w-5xl mx-auto">
        <div
          className={`relative flex items-center bg-white border rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-2xs transition-all ${
            isListening
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-200 hover:border-slate-300 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/15'
          }`}
        >
          {/* Left: Search Glass Icon */}
          <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-400 shrink-0 mr-2.5" />

          {/* Input text */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isListening ? 'কথা বলুন, শুনছি...' : placeholder}
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />

          {/* Right Controls: Clear Button or Mic */}
          <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={onClear}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition cursor-pointer"
                title="মুছে ফেলুন"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleVoiceSearch}
              title={isListening ? 'ভয়েস ইনপুট বন্ধ করুন' : 'ভয়েস দিয়ে পণ্য খুঁজুন'}
              className={`p-1.5 rounded-full transition cursor-pointer active:scale-90 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-teal-700 hover:bg-slate-100'
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
