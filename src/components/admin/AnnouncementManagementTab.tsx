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
    <div className="space-y-4">
      {/* Header and Add button */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">অ্যাপ ঘোষণা ও নোটিশ ব্যানার</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            হোম স্ক্রিনে গুরুত্বপূর্ণ নোটিশ, অফার বা জরুরি বার্তা প্রদর্শন করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="px-3.5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন নোটিশ যোগ</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            কোনো নোটিশ বা ঘোষণা তৈরি করা হয়নি।
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-2xl border shadow-xs transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                ann.isActive
                  ? 'bg-white border-teal-200 ring-1 ring-teal-100'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                    ann.priority === 'alert'
                      ? 'bg-rose-100 text-rose-700'
                      : ann.priority === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : ann.priority === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  <Megaphone className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        ann.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ann.isActive ? 'সক্রিয় (Active)' : 'বন্ধ (Inactive)'}
                    </span>
                    {ann.showAsPopup && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        পপআপ ডায়ালগ
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.message}</p>

                  <div className="text-[10px] text-slate-400 mt-1.5">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    ann.isActive
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {ann.isActive ? 'আনপাবলিশ' : 'পাবলিশ করুন'}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(ann)}
                  className="p-2 bg-slate-100 hover:bg-teal-100 text-teal-800 rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteAnnouncement(ann.id)}
                  title="নোটিশ মুছুন"
                  className="p-2 bg-slate-100 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                {editingAnn ? 'ঘোষণা সম্পাদনা' : 'নতুন ঘোষণা তৈরি'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  শিরোনাম / হেডলাইন <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="যেমন: 📢 বিশেষ রমজান ডিসকাউন্ট অফার!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  বিস্তারিত বার্তা <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="নোটিশের বিস্তারিত বিবরণ লিখুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ভিউ স্টাইল</label>
                  <select
                    value={formData.priority || 'info'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="info">তথ্যমূলক (Info - নীল)</option>
                    <option value="success">সাফল্য (Success - সবুজ)</option>
                    <option value="warning">সতর্কবার্তা (Warning - হলুদ)</option>
                    <option value="alert">জরুরি অ্যালার্ট (Alert - লাল)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={formData.actionButtonText || ''}
                    onChange={(e) => setFormData({ ...formData, actionButtonText: e.target.value })}
                    placeholder="যেমন: বিস্তারিত দেখুন / ঠিক আছে"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                  <span className="font-bold text-slate-700">ঘোষণাটি অবিলম্বে হোমপেজে প্রকাশ করুন</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showAsPopup || false}
                    onChange={(e) => setFormData({ ...formData, showAsPopup: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded-sm"
                  />
                  <span className="font-bold text-slate-700">লগইনের পর ফুল পপআপ ডায়ালগে দেখান</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl font-bold shadow-md cursor-pointer"
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
