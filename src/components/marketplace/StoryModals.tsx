import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { SocialStory, CustomerProfile } from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  validateMediaFiles,
  fileToBase64,
} from '../../services/marketplaceSocialService';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (story: SocialStory) => void;
  onShowToast: (msg: string) => void;
}

export const StoryCreateModal: React.FC<StoryCreateModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
  onShowToast,
}) => {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validation = validateMediaFiles(files);
    if (!validation.valid || validation.mediaFiles.length === 0) {
      setError(validation.error || 'সঠিক ছবি বা ভিডিও ফাইল নির্বাচন করুন');
      return;
    }

    const item = validation.mediaFiles[0];
    try {
      const b64 = await fileToBase64(item.file);
      setMediaUrl(b64);
      setMediaType(item.type === 'video' ? 'video' : 'image');
    } catch (err) {
      setError('ফাইল লোড করতে সমস্যা হয়েছে');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) {
      setError('একটি ছবি বা ভিডিও নির্বাচন করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const story = marketplaceSocialService.createStory({
        mediaUrl,
        mediaType,
        caption: caption.trim(),
      });
      onStoryCreated(story);
      onShowToast('স্টোরি সফলভাবে প্রকাশিত হয়েছে! (২৪ ঘণ্টা লাইভ থাকবে)');
      onClose();
    } catch (err: any) {
      setError(err.message || 'স্টোরি তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">নতুন স্টোরি দিন</h3>
              <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>২৪ ঘণ্টা পর স্বয়ংক্রিয়ভাবে মুছে যাবে</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          {/* Media preview area */}
          <div className="relative aspect-[4/5] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
            {mediaUrl ? (
              <>
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="text-center p-6 text-slate-400 space-y-2 cursor-pointer hover:text-white transition"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-black text-xs text-slate-200">ছবি বা ভিডিও আপলোড করুন</p>
                <p className="text-[11px] text-slate-400">ক্লিক করে আপনার গ্যালারি থেকে নির্বাচন করুন</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ক্যাপশন (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="আপনার স্টোরির জন্য কিছু লিখুন..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!mediaUrl || isSubmitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#1877F2] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-black text-xs transition shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'আপলোড হচ্ছে...' : 'স্টোরি শেয়ার করুন'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: SocialStory[];
  initialIndex?: number;
  currentUserId: string;
  onDeleteStory?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  stories,
  initialIndex = 0,
  currentUserId,
  onDeleteStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!isOpen || stories.length === 0) return;
    setProgress(0);
    const stepMs = 50;
    const totalDuration = 5000; // 5 seconds per story
    const stepPct = (stepMs / totalDuration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            clearInterval(interval);
            onClose();
            return 100;
          }
        }
        return prev + stepPct;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isOpen, currentIndex, stories.length]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  if (!currentStory) return null;

  const isOwnStory = currentStory.authorId === currentUserId;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev button */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {currentIndex < stories.length - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-2.5 bg-white/20 hover:bg-white/40 text-white rounded-full transition cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="relative w-full max-w-sm h-[85vh] max-h-[700px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        {/* Story progress bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {stories.map((st, i) => (
            <div key={st.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    i < currentIndex
                      ? '100%'
                      : i === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story author header */}
        <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <img
              src={currentStory.authorAvatar}
              alt=""
              className="w-10 h-10 rounded-full object-cover border-2 border-white ring-1 ring-blue-500"
            />
            <div>
              <p className="font-black text-xs leading-tight">{currentStory.authorName}</p>
              <p className="text-[10px] text-white/80 font-semibold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>• ২৪ ঘণ্টার স্টোরি</span>
              </p>
            </div>
          </div>

          {isOwnStory && onDeleteStory && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('এই স্টোরিটি মুছে ফেলতে চান?')) {
                  onDeleteStory(currentStory.id);
                  onClose();
                }
              }}
              className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
              title="স্টোরি মুছুন"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Media content */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          {currentStory.mediaType === 'video' ? (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              controls
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Caption overlay at bottom */}
        {currentStory.caption && (
          <div className="absolute bottom-4 inset-x-4 z-30 p-3 bg-black/60 backdrop-blur-xs rounded-2xl text-center text-white text-xs font-bold shadow-lg">
            {currentStory.caption}
          </div>
        )}
      </div>
    </div>
  );
};
