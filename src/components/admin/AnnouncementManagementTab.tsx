import React, { useState } from 'react';
import { Announcement } from '../../types/adminTypes';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AnnouncementManagementTabProps {
  announcements: Announcement[];
  onSaveAnnouncement: (ann: Announcement) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const AnnouncementManagementTab: React.FC<AnnouncementManagementTabProps> = ({
  announcements,
  onSaveAnnouncement,
  onDeleteAnnouncement,
  onShowToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>({});

  const openAdd = () => {
    setFormData({
      id: 'ann_' + Date.now(),
      title: '',
      message: '',
      priority: 'info',
      isActive: true,
      showAsPopup: false,
      createdAt: Date.now(),
      actionButtonText: 'ঠিক আছে',
    });
    setEditingAnn(null);
    setIsModalOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setFormData({ ...ann });
    setEditingAnn(ann);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      onShowToast('ঘোষণার শিরোনাম ও বার্তা আবশ্যক');
      return;
    }

    const finalAnn: Announcement = {
      id: formData.id || 'ann_' + Date.now(),
      title: formData.title || '',
      message: formData.message || '',
      priority: formData.priority || 'info',
      isActive: formData.isActive !== false,
      showAsPopup: formData.showAsPopup || false,
      createdAt: formData.createdAt || Date.now(),
      actionButtonText: formData.actionButtonText || 'ঠিক আছে',
      actionButtonUrl: formData.actionButtonUrl || '',
    };

    await onSaveAnnouncement(finalAnn);
    setIsModalOpen(false);
    onShowToast(`✅ নোটিশ/ঘোষণা সফলভাবে সংরক্ষিত হয়েছে!`);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header and Add button */}
      <div className="flex items-center justify-between bg-[#101A2D] p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">অ্যাপ ঘোষণা ও নোটিশ ব্যানার</h3>
            <p className="text-[11px] text-slate-400">
              হোম স্ক্রিনে গুরুত্বপূর্ণ নোটিশ, অফার বা জরুরি বার্তা প্রদর্শন করুন।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black rounded-2xl transition flex items-center gap-1.5 shadow-lg shadow-teal-600/30 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন নোটিশ যোগ</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-[#101A2D] rounded-3xl border border-dashed border-slate-800 text-slate-500 text-xs">
            <Megaphone className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
            <p>কোনো নোটিশ বা ঘোষণা তৈরি করা হয়নি।</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 rounded-3xl border shadow-xl transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                ann.isActive
                  ? 'bg-[#101A2D] border-slate-800 hover:border-teal-500/40'
                  : 'bg-slate-950/60 border-slate-900 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-md ${
                    ann.priority === 'alert'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : ann.priority === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : ann.priority === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  }`}
                >
                  <Megaphone className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-white">{ann.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ann.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {ann.isActive ? 'সক্রিয় (Active)' : 'বন্ধ (Inactive)'}
                    </span>
                    {ann.showAsPopup && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        পপআপ ডায়ালগ
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{ann.message}</p>

                  <div className="text-[10px] text-slate-400 pt-1">
                    প্রকাশের তারিখ: {new Date(ann.createdAt).toLocaleDateString('bn-BD')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveAnnouncement({ ...ann, isActive: !ann.isActive });
                    onShowToast(`নোটিশ ${!ann.isActive ? 'সক্রিয়' : 'বন্ধ'} করা হয়েছে`);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    ann.isActive
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {ann.isActive ? 'আনপাবলিশ' : 'পাবলিশ করুন'}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(ann)}
                  className="p-2 bg-slate-900 hover:bg-teal-950/60 text-teal-400 border border-slate-800 hover:border-teal-500/40 rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteAnnouncement(ann.id)}
                  title="নোটিশ মুছুন"
                  className="p-2 bg-slate-900 hover:bg-rose-950/60 text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0F172A] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingAnn ? 'ঘোষণা সম্পাদনা' : 'নতুন ঘোষণা তৈরি'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  শিরোনাম / হেডলাইন <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="যেমন: 📢 বিশেষ রমজান ডিসকাউন্ট অফার!"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  বিস্তারিত বার্তা <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="নোটিশের বিস্তারিত বিবরণ লিখুন..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">ভিউ স্টাইল</label>
                  <select
                    value={formData.priority || 'info'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:border-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="info">তথ্যমূলক (Info - নীল)</option>
                    <option value="success">সাফল্য (Success - সবুজ)</option>
                    <option value="warning">সতর্কবার্তা (Warning - হলুদ)</option>
                    <option value="alert">জরুরি অ্যালার্ট (Alert - লাল)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={formData.actionButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, actionButtonText: e.target.value })}
                    placeholder="যেমন: বিস্তারিত দেখুন / ঠিক আছে"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-sm"
                  />
                  <span className="font-bold text-slate-300">ঘোষণাটি অবিলম্বে হোমপেজে প্রকাশ করুন</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showAsPopup || false}
                    onChange={(e) => setFormData({ ...formData, showAsPopup: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-sm"
                  />
                  <span className="font-bold text-slate-300">লগইনের পর ফুল পপআপ ডায়ালগে দেখান</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
