import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  User,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  fileToBase64,
  validateImageFiles,
} from '../../services/marketplaceSocialService';
import { UserAvatar } from './UserAvatar';

interface FacebookProfileSetupWizardModalProps {
  currentProfile: CustomerProfile;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (updatedProfile: CustomerProfile) => void;
  onShowToast?: (msg: string) => void;
}

const POPULAR_LOCATIONS = [
  'ঢাকা',
  'চট্টগ্রাম',
  'সিলেট',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'রংপুর',
  'ময়মনসিংহ',
  'কুমিল্লা',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
  'বগুড়া',
];

export const FacebookProfileSetupWizardModal: React.FC<FacebookProfileSetupWizardModalProps> = ({
  currentProfile,
  isOpen,
  onClose,
  onComplete,
  onShowToast,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [avatar, setAvatar] = useState<string>(currentProfile.avatar || '');
  const [coverPhoto, setCoverPhoto] = useState<string>(currentProfile.coverPhoto || '');
  const [bio, setBio] = useState<string>(currentProfile.bio || '');
  const [location, setLocation] = useState<string>(currentProfile.location || 'ঢাকা');
  const [profession, setProfession] = useState<string>(currentProfile.profession || '');
  const [address, setAddress] = useState<string>(currentProfile.address || '');
  const [isSaving, setIsSaving] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const avatarCameraRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const coverCameraRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Avatar Upload from Gallery/File
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { valid, error, imageFiles } = validateImageFiles(files);
    if (!valid || imageFiles.length === 0) {
      onShowToast?.(error || 'অনুগ্রহ করে সঠিক ছবির ফাইল নির্বাচন করুন।');
      return;
    }
    try {
      const base64 = await fileToBase64(imageFiles[0]);
      setAvatar(base64);
      onShowToast?.('প্রোফাইল ছবি সফলভাবে যুক্ত হয়েছে!');
    } catch (err) {
      onShowToast?.('ছবি লোড করতে সমস্যা হয়েছে');
    }
  };

  // Handle Cover Photo Upload
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { valid, error, imageFiles } = validateImageFiles(files);
    if (!valid || imageFiles.length === 0) {
      onShowToast?.(error || 'অনুগ্রহ করে সঠিক ছবির ফাইল নির্বাচন করুন।');
      return;
    }
    try {
      const base64 = await fileToBase64(imageFiles[0]);
      setCoverPhoto(base64);
      onShowToast?.('কভার ফটো সফলভাবে যুক্ত হয়েছে!');
    } catch (err) {
      onShowToast?.('কভার ফটো লোড করতে সমস্যা হয়েছে');
    }
  };

  // Final submit & save
  const handleFinishSetup = async () => {
    setIsSaving(true);
    try {
      const updatedPayload: Partial<CustomerProfile> = {
        avatar: avatar.trim(),
        coverPhoto: coverPhoto.trim(),
        bio: bio.trim(),
        location: location.trim(),
        profession: profession.trim(),
        address: address.trim(),
        isProfileSetupCompleted: true,
      };

      const updated = marketplaceSocialService.updateCurrentProfile(updatedPayload);
      onComplete(updated);
      onShowToast?.('🎉 প্রোফাইল সফলভাবে সম্পন্ন হয়েছে! কমিউনিটিতে স্বাগতম।');
      onClose();
    } catch (err: any) {
      onShowToast?.(err?.message || 'প্রোফাইল সংরক্ষণে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                প্রোফাইল সেটআপ উইজার্ড
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ফেসবুকের মতো ধাপে ধাপে আপনার আসল পরিচিতি সাজিয়ে নিন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              step === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200/60'
            }`}
          >
            <span>১. ছবি</span>
          </button>
          <span className="text-slate-300">→</span>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              step === 2 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200/60'
            }`}
          >
            <span>২. কভার</span>
          </button>
          <span className="text-slate-300">→</span>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              step === 3 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200/60'
            }`}
          >
            <span>৩. তথ্য</span>
          </button>
          <span className="text-slate-300">→</span>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              step === 4 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-200/60'
            }`}
          >
            <span>৪. সম্পন্ন</span>
          </button>
        </div>

        {/* Modal Body Step Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* ---------------- STEP 1: PROFILE PICTURE ---------------- */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  আপনার একটি আসল প্রোফাইল ছবি যোগ করুন
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  আমরা কোনো কাল্পনিক বা ফেক ডিফল্ট ছবি বসাই না। আপনার নিজের বা দোকানের আসল ছবি দিন যেন অন্য ব্যবহারকারীরা আপনাকে সহজে চিনতে পারে।
                </p>
              </div>

              {/* Avatar Preview Box */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative group">
                  <UserAvatar
                    src={avatar || null}
                    name={currentProfile.name}
                    size="2xl"
                    className="ring-4 ring-blue-100 shadow-xl"
                  />
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow hover:bg-rose-600 cursor-pointer transition"
                      title="ছবি মুছে ফেলুন"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-700 mt-2.5">
                  {currentProfile.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentProfile.phone}
                </span>
              </div>

              {/* Action Buttons: Camera & Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {/* Hidden Inputs */}
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleAvatarFile}
                  className="hidden"
                />
                <input
                  ref={avatarCameraRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleAvatarFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => avatarCameraRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>ক্যামেরা দিয়ে সেলফি / ছবি তুলুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer border border-slate-200"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>গ্যালারি / ডিভাইস থেকে বেছে নিন</span>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  আপাতত এড়িয়ে যান (Skip)
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: কভার ফটো</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STEP 2: COVER PHOTO ---------------- */}
          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  একটি সুন্দর কভার ফটো যুক্ত করুন
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  কভার ফটো আপনার প্রোফাইল বা ফেসবুক স্টাইল পেজকে আকর্ষণীয় করে তোলে। আপনার দোকান, প্রকৃতি বা পছন্দের যেকোনো ছবি দিতে পারেন।
                </p>
              </div>

              {/* Cover Preview Box */}
              <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-inner">
                {coverPhoto ? (
                  <>
                    <img
                      src={coverPhoto}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverPhoto('')}
                      className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 cursor-pointer transition shadow"
                      title="কভার সরান"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-white/80">
                    <ImageIcon className="w-8 h-8 opacity-70" />
                    <span className="text-xs font-bold">কোনো কভার ছবি নির্বাচন করা হয়নি</span>
                    <span className="text-[10px] text-white/60">
                      (ছবি না দিলে স্বয়ংক্রিয়ভাবে পরিচ্ছন্ন গ্রেডিয়েন্ট দেখানো হবে)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Camera & Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleCoverFile}
                  className="hidden"
                />
                <input
                  ref={coverCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCoverFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => coverCameraRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>ক্যামেরা দিয়ে ছবি তুলুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer border border-slate-200"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>গ্যালারি থেকে কভার বেছে নিন</span>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>আগের ধাপ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: ব্যক্তিগত তথ্য</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STEP 3: BIO & DETAILS ---------------- */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  আপনার সংক্ষিপ্ত পরিচিতি ও বিবরণ দিন
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  অন্যান্য ক্রেতা ও বিক্রেতারা আপনার প্রোফাইলে এই তথ্যগুলো দেখতে পারবেন।
                </p>
              </div>

              <div className="space-y-3.5 text-left">
                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>আপনার সম্পর্কে সংক্ষিপ্ত বায়ো (Bio)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="যেমন: অনলাইন শপিং ভালোবাসি / প্রিমিয়াম গ্যাজেট ও পোশাক বিক্রেতা / ঢাকা"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* Profession / Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>পেশা বা ব্যবসার ধরন (ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="যেমন: ব্যবসায়ী / চাকরিজীবী / ছাত্র / উদ্যোক্তা"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* Location / District */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>আপনার শহর বা এলাকা</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="যেমন: উত্তরা, ঢাকা / চট্টগ্রাম"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_LOCATIONS.slice(0, 6).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setLocation(loc)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            location === loc
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বিস্তারিত ডেলিভারি ঠিকানা (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাড়ি নং, রোড নং, এলাকার নাম"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>আগের ধাপ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <span>প্রিভিউ দেখুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ---------------- STEP 4: PREVIEW & COMPLETE ---------------- */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mb-1">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  আপনার ফেসবুক স্টাইল প্রোফাইল প্রস্তুত!
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  নিচে আপনার প্রোফাইলের চূড়ান্ত রূপ দেওয়া হলো। সবকিছু ১০০% আসল তথ্য দিয়ে গঠিত।
                </p>
              </div>

              {/* Profile Card Preview */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Cover Banner */}
                <div className="h-24 sm:h-28 w-full bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                  {coverPhoto && (
                    <img
                      src={coverPhoto}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Profile Header Bar */}
                <div className="px-4 pb-4">
                  <div className="flex items-end justify-between -mt-10 mb-2">
                    <UserAvatar
                      src={avatar || null}
                      name={currentProfile.name}
                      size="xl"
                      className="ring-4 ring-white shadow-md"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        সক্রিয় সদস্য
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                      <span>{currentProfile.name}</span>
                      {currentProfile.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      )}
                    </h5>
                    <p className="text-xs text-slate-500 font-mono">
                      {currentProfile.username || `@user_${currentProfile.phone.slice(-4)}`} • {currentProfile.phone}
                    </p>

                    {bio && (
                      <p className="text-xs text-slate-700 mt-2 font-medium bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                        "{bio}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>{location}</span>
                        </span>
                      )}
                      {profession && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{profession}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete and Enter */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleFinishSetup}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>প্রোফাইল সংরক্ষণ করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>প্রোফাইল সম্পন্ন করে সোশ্যাল ফিডে প্রবেশ করুন</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>তথ্য পরিবর্তন</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    পরে করব (বন্ধ করুন)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
