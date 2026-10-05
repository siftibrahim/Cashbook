import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Check, RefreshCw, User, Sparkles } from 'lucide-react';
import { storeApi } from '../../services/apiService';
import { playSaleTone } from '../../utils/audio';

interface ProfilePictureUploaderProps {
  currentPhotoUrl?: string;
  vendorName?: string;
  shopName?: string;
  onPhotoUpdated: (newPhotoUrl: string) => void;
  onShowToast?: (msg: string) => void;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentPhotoUrl,
  vendorName,
  shopName,
  onPhotoUpdated,
  onShowToast,
  size = 'md',
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync when prop changes
  React.useEffect(() => {
    if (currentPhotoUrl) {
      setPreviewUrl(currentPhotoUrl);
    }
  }, [currentPhotoUrl]);

  // Size dimensions
  const sizeClasses = {
    sm: 'w-16 h-16 text-xl',
    md: 'w-24 h-24 sm:w-28 sm:h-28 text-2xl',
    lg: 'w-32 h-32 text-3xl',
  }[size];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onShowToast) onShowToast('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন');
      return;
    }

    setIsUploading(true);
    if (onShowToast) onShowToast('📸 প্রোফাইল ছবি প্রসেস করা হচ্ছে...');

    try {
      const compressedDataUrl = await compressProfileImage(file, 400);
      setPreviewUrl(compressedDataUrl);

      // Save to server & local storage
      const savedUrl = await storeApi.updateProfilePicture(compressedDataUrl);
      playSaleTone();
      onPhotoUpdated(savedUrl || compressedDataUrl);
      if (onShowToast) onShowToast('✅ প্রোফাইল ছবি সফলভাবে সংরক্ষণ হয়েছে!');
    } catch (err: any) {
      console.error('Profile image error:', err);
      if (onShowToast) onShowToast('ছবি আপলোড করতে সমস্যা হয়েছে');
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      await storeApi.updateProfilePicture('');
      setPreviewUrl('');
      onPhotoUpdated('');
      if (onShowToast) onShowToast('প্রোফাইল ছবি সরানো হয়েছে');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex ${compact ? 'flex-row items-center gap-3.5' : 'flex-col sm:flex-row items-center gap-4 sm:gap-6'} p-4 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 rounded-2xl border border-teal-100 shadow-2xs`}>
      {/* Hidden File & Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Avatar Frame */}
      <div className="relative shrink-0 group">
        <div
          className={`${sizeClasses} rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-teal-500/30 bg-gradient-to-tr from-[#00382E] to-[#004D40] text-white shadow-md flex items-center justify-center font-black relative`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={vendorName || shopName || 'Vendor'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-teal-200">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-teal-300 mb-0.5" />
              <span className="text-[10px] font-bold text-teal-200">
                {vendorName ? vendorName.slice(0, 1) : 'ছবি দিন'}
              </span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center text-white">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Quick Camera Badge on Avatar */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 p-2 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl shadow-md border-2 border-white transition active:scale-95 cursor-pointer"
          title="নতুন ছবি আপলোড করুন"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info & Action Buttons */}
      <div className="flex-1 text-center sm:text-left min-w-0">
        <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
          <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">
            {vendorName || shopName || 'ভেন্ডার প্রোফাইল ছবি'}
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
            ভেরিফাইড ভেন্ডার
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          এই ছবিটি আপনার অ্যাপ হেডার, ইনভয়েস রসিদ এবং কাস্টমারদের কাছে আপনার পরিচয় হিসেবে প্রদর্শিত হবে।
        </p>

        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-teal-200" />
            <span>গ্যালারি থেকে ছবি</span>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>ক্যামেরা</span>
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={isUploading}
              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              title="ছবি মুছে ফেলুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>মুছুন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Resizes and compresses user profile photo to square dimension with max width
 */
function compressProfileImage(file: File, maxDim: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Make it square crop from center
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        const targetSide = Math.min(minSide, maxDim);
        canvas.width = targetSide;
        canvas.height = targetSide;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(
          img,
          startX, startY, minSide, minSide,
          0, 0, targetSide, targetSide
        );

        // Quality 0.88 JPG for crisp small file (<50KB)
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
