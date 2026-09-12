import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  Star,
  RefreshCw,
  AlertCircle,
  Eye,
  Copy,
  Lock,
  Smartphone,
  Info,
  X,
  Save,
} from 'lucide-react';
import { TagadaTemplate } from '../../types';
import { adminApi } from '../../services/apiService';

const SYSTEM_DEFAULT_TEMPLATES: TagadaTemplate[] = [
  {
    id: 'tpl_polite',
    title: 'বকেয়া তাগাদা (বিনম্র ও সাধারণ)',
    message: 'আসসালামু আলাইকুম {customer} ভাই, {store}-এ আপনার বর্তমান বকেয়া বাকি {currency} {amount}। সুবিধাজনক সময়ে পরিশোধ করার জন্য অনুরোধ রইল। ধন্যবাদ, {store}। যোগাযোগ: {phone}',
    category: 'regular',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'tpl_urgent',
    title: 'জরুরি বকেয়া তাগাদা',
    message: 'শ্রদ্ধেয় {customer}, {store}-এ আপনার বকেয়া হিসাব বাকি রয়েছে {currency} {amount} টাকা। অনুগ্রহ করে অতি দ্রুত বকেয়া পরিশোধ করে সহযোগিতা করুন। যোগাযোগ: {phone}',
    category: 'urgent',
    isDefault: false,
    isActive: true,
  },
  {
    id: 'tpl_short',
    title: 'সংক্ষিপ্ত তাগাদা',
    message: 'প্রিয় {customer}, আপনার অবগতির জন্য জানানো যাচ্ছে যে, {store}-এ আপনার বর্তমান জের {currency} {amount} টাকা। ধন্যবাদ, {store}',
    category: 'short',
    isDefault: false,
    isActive: true,
  },
  {
    id: 'tpl_reminder',
    title: 'হিসাব পরিশোধ রিমাইন্ডার',
    message: 'আসসালামু আলাইকুম {customer}, {store} থেকে আপনার বাকি বিল {currency} {amount} টাকা পরিশোধের অনুরোধ করা হচ্ছে। শুভেচ্ছান্তে: {store} ({phone})',
    category: 'reminder',
    isDefault: false,
    isActive: true,
  },
];

interface TagadaTemplatesTabProps {
  onShowToast: (msg: string) => void;
}

export const TagadaTemplatesTab: React.FC<TagadaTemplatesTabProps> = ({ onShowToast }) => {
  const [templates, setTemplates] = useState<TagadaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TagadaTemplate | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'regular' | 'urgent' | 'short' | 'reminder' | 'custom'>('regular');
  const [formMessage, setFormMessage] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getTagadaTemplates();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(SYSTEM_DEFAULT_TEMPLATES);
      }
    } catch (e) {
      console.warn('Could not load templates from server, using defaults:', e);
      setTemplates(SYSTEM_DEFAULT_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory('custom');
    setFormMessage('আসসালামু আলাইকুম {customer}, {store}-এ আপনার বকেয়া হিসাব {currency} {amount} টাকা। ধন্যবাদ, {store} ({phone})');
    setFormIsDefault(templates.length === 0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl: TagadaTemplate) => {
    setEditingTemplate(tpl);
    setFormTitle(tpl.title);
    setFormCategory(tpl.category || 'regular');
    setFormMessage(tpl.message);
    setFormIsDefault(Boolean(tpl.isDefault));
    setIsModalOpen(true);
  };

  const handleInsertTag = (tag: string) => {
    setFormMessage((prev) => prev + tag);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onShowToast('❌ অপশনের শিরোনাম বা নাম লিখুন');
      return;
    }
    if (!formMessage.trim()) {
      onShowToast('❌ মেসেজের বক্তব্য বা টেক্সট লিখুন');
      return;
    }

    setIsSaving(true);
    try {
      let updatedList: TagadaTemplate[] = [];

      if (editingTemplate) {
        // Edit existing
        updatedList = templates.map((t) => {
          if (t.id === editingTemplate.id) {
            return {
              ...t,
              title: formTitle.trim(),
              category: formCategory,
              message: formMessage.trim(),
              isDefault: formIsDefault,
              updatedAt: Date.now(),
            };
          }
          // If the edited template is made default, clear isDefault on others
          return formIsDefault ? { ...t, isDefault: false } : t;
        });
      } else {
        // Create new
        const newTemplate: TagadaTemplate = {
          id: 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
          title: formTitle.trim(),
          category: formCategory,
          message: formMessage.trim(),
          isDefault: formIsDefault,
          isActive: true,
          createdAt: Date.now(),
        };

        if (formIsDefault) {
          updatedList = templates.map((t) => ({ ...t, isDefault: false }));
          updatedList.unshift(newTemplate);
        } else {
          updatedList = [...templates, newTemplate];
        }
      }

      await adminApi.saveTagadaTemplates(updatedList);
      setTemplates(updatedList);
      setIsModalOpen(false);
      onShowToast(editingTemplate ? '✅ মেসেজ অপশন সফলভাবে এডিট হয়েছে!' : '✅ নতুন মেসেজ অপশন সফলভাবে তৈরি হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ সংরক্ষণ করা যায়নি: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (tplId: string) => {
    setIsSaving(true);
    try {
      const updatedList = templates.map((t) => ({
        ...t,
        isDefault: t.id === tplId,
      }));
      await adminApi.saveTagadaTemplates(updatedList);
      setTemplates(updatedList);
      onShowToast('⭐ ডিফল্ট মেসেজ অপশন সেট করা হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ ডিফল্ট সেট করা যায়নি: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tplId: string) => {
    if (templates.length <= 1) {
      onShowToast('⚠️ কমপক্ষে একটি মেসেজ অপশন রাখা আবশ্যক!');
      return;
    }
    if (!window.confirm('আপনি কি নিশ্চিত এই মেসেজ অপশনটি মুছে ফেলতে চান?')) {
      return;
    }

    setIsSaving(true);
    try {
      let updatedList = templates.filter((t) => t.id !== tplId);
      // If deleted template was default, make the first one default
      if (!updatedList.some((t) => t.isDefault)) {
        updatedList[0].isDefault = true;
      }
      await adminApi.saveTagadaTemplates(updatedList);
      setTemplates(updatedList);
      onShowToast('🗑️ মেসেজ অপশনটি মুছে ফেলা হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ মুছে ফেলা যায়নি: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('আপনি কি পূর্বনির্ধারিত ৪টি ডিফল্ট মেসেজ অপশন ফিরিয়ে আনতে চান?')) {
      return;
    }
    setIsSaving(true);
    try {
      await adminApi.saveTagadaTemplates(SYSTEM_DEFAULT_TEMPLATES);
      setTemplates(SYSTEM_DEFAULT_TEMPLATES);
      onShowToast('✅ পূর্বনির্ধারিত ডিফল্ট মেসেজগুলো রিস্টোর করা হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ রিস্টোর করা যায়নি: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Sample preview rendering
  const renderPreview = (text: string) => {
    return text
      .replace(/{customer}/g, 'রহিম শেখ')
      .replace(/{amount}/g, '১,৫০০')
      .replace(/{currency}/g, '৳')
      .replace(/{store}/g, 'ভাই ভাই স্টোর')
      .replace(/{phone}/g, '01712345678');
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">জরুরি</span>;
      case 'short':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">সংক্ষিপ্ত</span>;
      case 'reminder':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">রিমাইন্ডার</span>;
      case 'custom':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">কাস্টম</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-200">সাধারণ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-teal-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <MessageCircle className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">বাকি তাগাদা মেসেজ টেমপ্লেট ও অপশন</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                  সুপার অ্যাডমিন নিয়ন্ত্রণ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl leading-relaxed">
                এখানে তৈরি করা মেসেজ অপশনগুলোই ইউজাররা অ্যাপ থেকে দেখতে পাবেন। ইউজাররা কোনো মেসেজ এডিট করতে পারবেন না, শুধু আপনার নির্ধারিত অপশন বাছাই করে সরাসরি গ্রাহকের মোবাইলে তাগাদা পাঠাতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSaving}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="ডিফল্ট মেসেজগুলো ফিরিয়ে আনুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">ডিফল্ট রিস্টোর</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={isSaving}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন মেসেজ অপশন তৈরি করুন</span>
            </button>
          </div>
        </div>

        {/* Notice Box */}
        <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/15 flex items-center gap-2.5 text-xs text-teal-100">
          <Lock className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            <strong>নিরাপত্তা নীতি:</strong> মেসেজের মূল ফরম্যাট এবং নতুন অপশন তৈরির পূর্ণ নিয়ন্ত্রণ কেবল সুপার অ্যাডমিনের হাতে সুরক্ষিত। ইউজারদের জন্য এডিটিং বন্ধ রাখা হয়েছে।
          </span>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <span>উপলব্ধ তাগাদা মেসেজ অপশনসমূহ</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                {templates.length} টি
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              কাস্টমার ডিটেইলের মেসেজ আইকনে ক্লিক করলে ইউজাররা এই অপশনগুলো পাবেন।
            </p>
          </div>

          <button
            type="button"
            onClick={loadTemplates}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-bold text-slate-500">টেমপ্লেটগুলো লোড হচ্ছে...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-600">কোনো মেসেজ অপশন পাওয়া যায়নি!</p>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
            >
              ডিফল্ট ৪টি অপশন যোগ করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl, idx) => (
              <div
                key={tpl.id || idx}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  tpl.isDefault
                    ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-800">{tpl.title}</h4>
                      {getCategoryBadge(tpl.category)}
                      {tpl.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          ডিফল্ট অপশন
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Template Raw Text */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line shadow-inner">
                    {tpl.message}
                  </div>

                  {/* Sample Preview */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                      দৈর্ঘ্য: {tpl.message.length} অক্ষর
                    </span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-600">
                      {Math.ceil(tpl.message.length / 160)} SMS
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                  <div>
                    {!tpl.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(tpl.id)}
                        disabled={isSaving}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="ডিফল্ট হিসেবে সেট করুন"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>ডিফল্ট বানান</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(tpl)}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 active:scale-95 text-white transition flex items-center gap-1 cursor-pointer"
                      title="মেসেজ ও শিরোনাম এডিট করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>এডিট করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(tpl.id)}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guide on Available Dynamic Tags */}
      <div className="p-4 sm:p-5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
        <h4 className="font-bold flex items-center gap-1.5 text-amber-950 mb-2">
          <Info className="w-4 h-4 text-amber-700" />
          <span>মেসেজে ব্যবহারের জন্য উপলব্ধ ডায়নামিক ট্যাগসমূহ:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div className="p-2 bg-white rounded-xl border border-amber-200">
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{`{customer}`}</span>
            <p className="text-[11px] text-slate-600 mt-1">গ্রাহক বা কাস্টমারের নাম</p>
          </div>
          <div className="p-2 bg-white rounded-xl border border-amber-200">
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{`{amount}`}</span>
            <p className="text-[11px] text-slate-600 mt-1">গ্রাহকের বর্তমান বকেয়া টাকার অংক</p>
          </div>
          <div className="p-2 bg-white rounded-xl border border-amber-200">
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{`{store}`}</span>
            <p className="text-[11px] text-slate-600 mt-1">ইউজারের দোকান বা ব্যবসা প্রতিষ্ঠানের নাম</p>
          </div>
          <div className="p-2 bg-white rounded-xl border border-amber-200">
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{`{phone}`}</span>
            <p className="text-[11px] text-slate-600 mt-1">দোকানের মোবাইল ফোন নম্বর</p>
          </div>
          <div className="p-2 bg-white rounded-xl border border-amber-200">
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[11px]">{`{currency}`}</span>
            <p className="text-[11px] text-slate-600 mt-1">কারেন্সি প্রতীক (যেমন: ৳)</p>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingTemplate ? 'মেসেজ অপশন এডিট করুন' : 'নতুন মেসেজ অপশন তৈরি করুন'}
                  </h3>
                  <p className="text-[11px] text-teal-200 font-normal">
                    সুপার অ্যাডমিন হিসেবে বাকি তাগাদার টেক্সট কনফিগার করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অপশনের নাম / শিরোনাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="যেমন: জরুরি বকেয়া তাগাদা (চূড়ান্ত নোটিশ)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="regular">সাধারণ (Regular)</option>
                    <option value="urgent">জরুরি (Urgent)</option>
                    <option value="short">সংক্ষিপ্ত (Short)</option>
                    <option value="reminder">রিমাইন্ডার (Reminder)</option>
                    <option value="custom">কাস্টম (Custom)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Tag insertion buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>মেসেজ টেক্সট টেমপ্লেট</span>
                  <span className="text-[11px] text-teal-700 font-normal">ট্যাগ বাটনে ক্লিক করে ইনসার্ট করুন:</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => handleInsertTag(' {customer}')}
                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    + {`{customer}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag(' {amount}')}
                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    + {`{amount}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag(' {store}')}
                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    + {`{store}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag(' {phone}')}
                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    + {`{phone}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTag(' {currency}')}
                    className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer"
                  >
                    + {`{currency}`}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="মেসেজের ফরম্যাট লিখুন..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  required
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>অক্ষর সংখ্যা: {formMessage.length}</span>
                  <span>আনুমানিক SMS: {Math.ceil(formMessage.length / 160)} টি</span>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200">
                <span className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-teal-600" />
                  গ্রাহকের কাছে মেসেজটি যেমন দেখাবে (লাইভ প্রিভিউ):
                </span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-xs">
                  {renderPreview(formMessage)}
                </div>
              </div>

              {/* Default Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  এই অপশনটিকে অ্যাপে "ডিফল্ট অপশন" হিসেবে সেট করুন
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
