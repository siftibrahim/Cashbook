import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  User,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { marketplaceSocialService, validateImageFiles, fileToBase64 } from '../../services/marketplaceSocialService';
import { playPaymentChime, triggerConfettiCelebration } from '../../utils/audio';

interface FacebookVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: CustomerProfile;
  onProfileUpdated?: (updated: CustomerProfile) => void;
}

export const FacebookVerificationModal: React.FC<FacebookVerificationModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
}) => {
  const [docType, setDocType] = useState<'nid' | 'passport' | 'driving_license' | 'trade_license'>('nid');
  const [fullName, setFullName] = useState(currentProfile.name || '');
  const [docNumber, setDocNumber] = useState('');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');

  const [docFront, setDocFront] = useState('');
  const [docBack, setDocBack] = useState('');
  const [selfie, setSelfie] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (b64: string) => void
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'শুধুমাত্র ছবি ফাইল নির্বাচন করুন');
      return;
    }
    try {
      const b64 = await fileToBase64(validation.imageFiles[0]);
      setter(b64);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage('ছবি আপলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setErrorMessage('আইডি অনুযায়ী পূর্ণ নাম লিখুন।');
      return;
    }
    if (!docNumber.trim()) {
      setErrorMessage('আইডি বা ডকুমেন্টের নম্বর লিখুন।');
      return;
    }
    if (!docFront) {
      setErrorMessage('ডকুমেন্টের সামনের ছবি আপলোড করুন।');
      return;
    }
    if (!selfie) {
      setErrorMessage('আপনার স্পষ্ট লাইভ ফেস সেলফি ছবি আপলোড করুন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await marketplaceSocialService.submitIdVerification({
        docType,
        docNumber: docNumber.trim(),
        fullName: fullName.trim(),
        dob,
        docFront,
        docBack,
        selfie,
        notes,
      });

      if (res.success) {
        setSuccessMessage('🎉 আপনার ভেরিফিকেশন আবেদন সফলভাবে জমা হয়েছে! শীঘ্রই মেটা ব্লু ব্যাজ প্রদান করা হবে।');
        playPaymentChime();
        triggerConfettiCelebration();
        const updated = marketplaceSocialService.getCurrentProfile();
        onProfileUpdated?.(updated);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(res.error || 'আবেদন জমা দিতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভারে সংযোগ দিতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyVerified = currentProfile.isVerified || currentProfile.verificationStatus === 'verified';
  const isPending = currentProfile.verificationStatus === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1877F2] to-indigo-700 p-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-[#1877F2] flex items-center justify-center font-black shadow-lg">
              <ShieldCheck className="w-7 h-7 text-[#1877F2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">উন্নত মেটা আইডি ভেরিফিকেশন</h2>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Blue Badge
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                অফিসিয়াল সরকারি পরিচয়পত্র দিয়ে ভেরিফাইড ব্লু টিক পান
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Status Banners */}
          {isAlreadyVerified ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-900">
                  আপনার অ্যাকাউন্ট ইতিমধ্যে ভেরিফাইড (Verified)
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  আপনার প্রোফাইল, ফেসবুক পোস্ট, মেসেঞ্জার ও মার্কেটপ্লেস প্রডাক্টে অফিসিয়াল মেটা ব্লু ব্যাজ সক্রিয় আছে।
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-900">
                  ভেরিফিকেশন পর্যালোচনাধীন (Under Review)
                </h4>
                <p className="text-xs text-amber-700 font-medium">
                  আপনার আবেদনের কাগজপত্র সুপার অ্যাডমিন টিম পর্যালোচনা করছেন। সাধারণত ১-২ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়।
                </p>
              </div>
            </div>
          ) : (
            /* Benefits banner */
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
              <h4 className="text-xs font-black text-blue-900 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>ব্লু ভেরিফাইড ব্যাজের সুবিধাসমূহ:</span>
              </h4>
              <ul className="text-[11px] text-blue-800 space-y-1 font-medium list-disc list-inside">
                <li>নামের পাশে আকর্ষণীয় ফেসবুক ব্লু টিক (🛡️) মার্কেটপ্লেস ও ফিডে দৃশ্যমান হবে।</li>
                <li>ক্রেতা ও বন্ধুদের কাছে সর্বোচ্চ বিশ্বাসযোগ্যতা ও নিরাপত্তা নিশ্চিত হবে।</li>
                <li>মার্কেটপ্লেসে প্রডাক্ট বিক্রি ও চ্যাটে গ্রাহকদের অগ্রাধিকার পাবেন।</li>
              </ul>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!isAlreadyVerified && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document Type Selector */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  পরিচয়পত্রের ধরন নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'nid', label: 'জাতীয় পরিচয়পত্র (NID)', icon: CreditCard },
                    { id: 'passport', label: 'পাসপোর্ট', icon: FileText },
                    { id: 'driving_license', label: 'ড্রাইভিং লাইসেন্স', icon: CreditCard },
                    { id: 'trade_license', label: 'ট্রেড লাইসেন্স (ব্যবসায়ী)', icon: FileText },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDocType(item.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          docType === item.id
                            ? 'bg-blue-50 border-[#1877F2] text-[#1877F2] font-black ring-1 ring-[#1877F2]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legal Name & Doc Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    আইডি অনুযায়ী পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    ডকুমেন্ট / NID নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="১০ বা ১৭ ডিজিটের এনআইডি নম্বর"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                    required
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  জন্ম তারিখ (ঐচ্ছিক)
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                />
              </div>

              {/* Uploads Grid */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Front Side */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      ১. ডকুমেন্টের সামনের ছবি <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="file"
                      ref={frontInputRef}
                      accept="image/*"
                      onChange={(e) => handleImagePick(e, setDocFront)}
                      className="hidden"
                    />
                    <div
                      onClick={() => frontInputRef.current?.click()}
                      className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer transition relative overflow-hidden ${
                        docFront ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300 hover:border-[#1877F2] bg-slate-50'
                      }`}
                    >
                      {docFront ? (
                        <img src={docFront} alt="Doc Front" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                          <span className="text-[11px] font-bold text-slate-600 block">
                            সামনের ছবি আপলোড করুন
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Back Side */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      ২. ডকুমেন্টের পেছনের ছবি (প্রযোজ্য ক্ষেত্রে)
                    </label>
                    <input
                      type="file"
                      ref={backInputRef}
                      accept="image/*"
                      onChange={(e) => handleImagePick(e, setDocBack)}
                      className="hidden"
                    />
                    <div
                      onClick={() => backInputRef.current?.click()}
                      className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer transition relative overflow-hidden ${
                        docBack ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300 hover:border-[#1877F2] bg-slate-50'
                      }`}
                    >
                      {docBack ? (
                        <img src={docBack} alt="Doc Back" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                          <span className="text-[11px] font-bold text-slate-600 block">
                            পেছনের ছবি আপলোড করুন
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Selfie */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    ৩. লাইভ ফেস সেলফি (স্পষ্ট মুখের ছবি) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    ref={selfieInputRef}
                    accept="image/*"
                    onChange={(e) => handleImagePick(e, setSelfie)}
                    className="hidden"
                  />
                  <div
                    onClick={() => selfieInputRef.current?.click()}
                    className={`h-28 border-2 border-dashed rounded-2xl flex items-center justify-center p-2 cursor-pointer transition relative overflow-hidden ${
                      selfie ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300 hover:border-[#1877F2] bg-slate-50'
                    }`}
                  >
                    {selfie ? (
                      <div className="flex items-center gap-3">
                        <img src={selfie} alt="Selfie" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                        <span className="text-xs font-bold text-emerald-800">
                          ✅ সেলফি ছবি যুক্ত হয়েছে (পরিবর্তন করতে ক্লিক করুন)
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Camera className="w-6 h-6 text-[#1877F2] mx-auto" />
                        <span className="text-xs font-bold text-slate-700 block">
                          ক্যামেরা বা গ্যালারি থেকে সেলফি আপলোড করুন
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (মুখমণ্ডল স্পষ্ট ও আলোর নিচে রাখুন)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>জমা হচ্ছে...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>ভেরিফিকেশন জমা দিন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
