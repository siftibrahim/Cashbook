import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Users,
  FileText,
  Shield,
  Sparkles,
  Lock,
  Globe,
  Camera,
} from 'lucide-react';
import { SocialGroup, SocialPage } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: SocialGroup) => void;
  onShowToast: (msg: string) => void;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [coverImage, setCoverImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('গ্রুপের নাম প্রদান করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const group = marketplaceSocialService.createGroup({
        name: name.trim(),
        description: description.trim(),
        privacy,
        coverImage: coverImage || undefined,
      });
      onGroupCreated(group);
      onShowToast(`'${group.name}' গ্রুপ সফলভাবে তৈরি হয়েছে!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'গ্রুপ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">নতুন গ্রুপ তৈরি করুন</h3>
              <p className="text-[10px] text-slate-500 font-semibold">কমিউনিটি ও গ্রাহকদের একত্রিত করুন</p>
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

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              গ্রুপের নাম *
            </label>
            <input
              type="text"
              placeholder="যেমন: ঢাকা স্মার্ট গ্যাজেট লাভার্স..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              গ্রুপের বিবরণ
            </label>
            <textarea
              placeholder="এই গ্রুপটি কী উদ্দেশ্যে তৈরি করা হয়েছে..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              প্রাইভেসি সেটিং
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  privacy === 'public'
                    ? 'border-[#1877F2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-4 h-4 text-[#1877F2] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-slate-900">পাবলিক (Public)</p>
                  <p className="text-[10px] text-slate-500 leading-tight">যে কেউ পোস্ট দেখতে ও যুক্ত হতে পারবে</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  privacy === 'private'
                    ? 'border-[#1877F2] bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-slate-900">প্রাইভেট (Private)</p>
                  <p className="text-[10px] text-slate-500 leading-tight">শুধু মেম্বাররা পোস্ট দেখতে পারবে</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              কভার ফটোর লিংক (ঐচ্ছিক)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2.5 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl font-black text-xs transition shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'তৈরি হচ্ছে...' : 'গ্রুপ তৈরি করুন'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface PageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPageCreated: (page: SocialPage) => void;
  onShowToast: (msg: string) => void;
}

export const PageCreateModal: React.FC<PageCreateModalProps> = ({
  isOpen,
  onClose,
  onPageCreated,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ব্যবসা ও শপিং');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('পেজের নাম প্রদান করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const page = marketplaceSocialService.createPage({
        name: name.trim(),
        category,
        bio: bio.trim(),
        avatar: avatar || undefined,
        coverImage: coverImage || undefined,
      });
      onPageCreated(page);
      onShowToast(`'${page.name}' পেজ সফলভাবে তৈরি হয়েছে!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'পেজ তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">নতুন পেজ তৈরি করুন</h3>
              <p className="text-[10px] text-slate-500 font-semibold">আপনার ব্র্যান্ড বা শপের অফিসিয়াল পেজ</p>
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

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              পেজের নাম *
            </label>
            <input
              type="text"
              placeholder="যেমন: আরিয়ান ক্লথিং, তানভীর গ্যাজেটস..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ক্যাটাগরি
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
            >
              <option value="ব্যবসা ও শপিং">ব্যবসা ও শপিং</option>
              <option value="ইলেকট্রনিক্স ও গ্যাজেট">ইলেকট্রনিক্স ও গ্যাজেট</option>
              <option value="ফ্যাশন ও ক্লথিং">ফ্যাশন ও ক্লথিং</option>
              <option value="খাদ্য ও রেস্টুরেন্ট">খাদ্য ও রেস্টুরেন্ট</option>
              <option value="স্বাস্থ্য ও রূপচর্চা">স্বাস্থ্য ও রূপচর্চা</option>
              <option value="কমিউনিটি ও সেবা">কমিউনিটি ও সেবা</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              বায়ো বা সংক্ষিপ্ত বিবরণ
            </label>
            <textarea
              placeholder="আপনার পেজ বা ব্র্যান্ড সম্পর্কে কিছু তথ্য লিখুন..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              লোগো / প্রোফাইল ছবির লিংক (ঐচ্ছিক)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'তৈরি হচ্ছে...' : 'পেজ তৈরি করুন'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
