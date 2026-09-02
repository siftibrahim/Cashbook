import React, { useState, useEffect } from 'react';
import {
  Bell,
  HardDrive,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';

interface AppPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  isFirstInstall?: boolean;
}

export const AppPermissionsModal: React.FC<AppPermissionsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  isFirstInstall = false,
}) => {
  const [notificationAllowed, setNotificationAllowed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return localStorage.getItem('perm_notification_allowed') === 'true';
  });

  const [storageAllowed, setStorageAllowed] = useState<boolean>(() => {
    return localStorage.getItem('perm_storage_allowed') === 'true' || true;
  });

  const [galleryAllowed, setGalleryAllowed] = useState<boolean>(() => {
    return localStorage.getItem('perm_gallery_allowed') === 'true';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationAllowed(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Handle Notification Permission Request (Instant response)
  const handleAllowNotification = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Immediately update UI to Allowed
    setNotificationAllowed(true);
    localStorage.setItem('perm_notification_allowed', 'true');
    onShowToast('✅ নোটিফিকেশন পারমিশন সফলভাবে অনুমোদিত হয়েছে!');

    // Async request native browser permission in background without blocking UI
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              try {
                new Notification('TWING হিসাবি', {
                  body: 'জরুরি তাগাদা ও বকেয়া নোটিফিকেশন সক্রিয় করা হয়েছে।',
                  icon: '/icon-192.png',
                });
              } catch {}
            }
          }).catch(() => {});
        }
      }
    } catch {}
  };

  // 2. Handle Storage Permission Request
  const handleAllowStorage = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStorageAllowed(true);
    localStorage.setItem('perm_storage_allowed', 'true');
    onShowToast('✅ ডিভাইস স্টোরেজ ও অফলাইন ব্যাকআপ পারমিশন দেওয়া হয়েছে');

    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    } catch {}
  };

  // 3. Handle Gallery / Photos Permission Request
  const handleAllowGallery = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setGalleryAllowed(true);
    localStorage.setItem('perm_gallery_allowed', 'true');
    onShowToast('✅ ফোনের গ্যালারি ও ফটো আপলোড পারমিশন দেওয়া হয়েছে');
  };

  // Handle Allow All
  const handleAllowAll = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setNotificationAllowed(true);
    setStorageAllowed(true);
    setGalleryAllowed(true);

    localStorage.setItem('perm_notification_allowed', 'true');
    localStorage.setItem('perm_storage_allowed', 'true');
    localStorage.setItem('perm_gallery_allowed', 'true');
    localStorage.setItem('twing_permissions_accepted_v2', 'true');

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}

    onShowToast('✅ সকল পারমিশন সফলভাবে অনুমোদিত হয়েছে!');
    onClose();
  };

  const handleDone = () => {
    localStorage.setItem('twing_permissions_accepted_v2', 'true');
    onClose();
  };

  return (
    <div
      id="app-permissions-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="app-permissions-modal-container"
        className="bg-slate-900 border border-teal-500/30 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col my-auto"
      >
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-b from-teal-950/80 to-slate-900 border-b border-slate-800/80 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  অ্যাপ পারমিশন রিকুয়েস্ট
                </h3>
                <p className="text-xs text-teal-300/80 font-medium mt-0.5">
                  অ্যাপটি সঠিকভাবে ব্যবহারের জন্য অনুমতি দিন
                </p>
              </div>
            </div>

            <button
              onClick={handleDone}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission Cards Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* 1. Notification Permission */}
          <div 
            onClick={!notificationAllowed ? handleAllowNotification : undefined}
            className={`p-3.5 rounded-2xl bg-slate-800/60 border transition flex items-center justify-between gap-3 ${
              !notificationAllowed ? 'border-teal-500/40 cursor-pointer active:bg-slate-800/90' : 'border-slate-700/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  নোটিফিকেশন (Notifications)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  বকেয়া তাগাদা, দৈনিক বাকি অ্যালার্ট ও জরুরি বার্তার জন্য।
                </p>
              </div>
            </div>

            {notificationAllowed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Allowed</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAllowNotification}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-900/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                Allow
              </button>
            )}
          </div>

          {/* 2. Storage Permission */}
          <div 
            onClick={!storageAllowed ? handleAllowStorage : undefined}
            className={`p-3.5 rounded-2xl bg-slate-800/60 border transition flex items-center justify-between gap-3 ${
              !storageAllowed ? 'border-teal-500/40 cursor-pointer active:bg-slate-800/90' : 'border-slate-700/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  ডিভাইস স্টোরেজ (Storage)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  পিডিএফ ক্যাশমেমো ডাউনলোড ও অফলাইন খাতা সংরক্ষণে।
                </p>
              </div>
            </div>

            {storageAllowed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Allowed</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAllowStorage}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-900/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                Allow
              </button>
            )}
          </div>

          {/* 3. Gallery / Photos Permission */}
          <div 
            onClick={!galleryAllowed ? handleAllowGallery : undefined}
            className={`p-3.5 rounded-2xl bg-slate-800/60 border transition flex items-center justify-between gap-3 ${
              !galleryAllowed ? 'border-teal-500/40 cursor-pointer active:bg-slate-800/90' : 'border-slate-700/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  ফোনের গ্যালারি ও ফটো (Gallery)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  পণ্যের ছবি, ক্যাশমেমোর রসিদ ও ভাউচারের ছবি আপলোডে।
                </p>
              </div>
            </div>

            {galleryAllowed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Allowed</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAllowGallery}
                className="px-4 py-2 min-h-[38px] rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-900/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col gap-2">
          {(!notificationAllowed || !storageAllowed || !galleryAllowed) ? (
            <button
              type="button"
              onClick={handleAllowAll}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>সবগুলো এলাও (Allow) করুন ও এগিয়ে যান</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-200" />
              <span>সম্পন্ন হয়েছে! ড্যাশবোর্ডে যান</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDone}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 font-medium transition cursor-pointer text-center"
          >
            পরে অনুমতি দেব
          </button>
        </div>
      </div>
    </div>
  );
};

