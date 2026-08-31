import React, { useState, useEffect } from 'react';
import { AppUpdateConfig } from '../../types/adminTypes';
import {
  DownloadCloud,
  ShieldAlert,
  Save,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface AppUpdateManagementTabProps {
  config: AppUpdateConfig;
  onSaveConfig: (config: AppUpdateConfig) => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const AppUpdateManagementTab: React.FC<AppUpdateManagementTabProps> = ({
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [versionName, setVersionName] = useState(config.versionName || '2.4.0');
  const [versionCode, setVersionCode] = useState(config.versionCode || 24);
  const [minRequiredVersion, setMinRequiredVersion] = useState(config.minRequiredVersion || '2.0.0');
  const [isForceUpdate, setIsForceUpdate] = useState(config.isForceUpdate || false);
  const [updateTitle, setUpdateTitle] = useState(config.updateTitle || 'খাতা অ্যাপের নতুন সংস্করণ উপলব্ধ!');
  const [releaseNotes, setReleaseNotes] = useState(
    config.releaseNotes ||
      '• নতুন অ্যাডমিন ম্যানেজমেন্ট কনসোল ও রিয়েলটাইম মনিটরিং\n• অফলাইন ও অনলাইন অটোমেটিক ডাটা সিঙ্ক\n• দ্রুত ইনভয়েস প্রিন্টিং ও পিওএস সেলস\n• পারফরম্যান্স ও সিকিউরিটি বৃদ্ধি'
  );
  const [downloadUrl, setDownloadUrl] = useState(
    config.downloadUrl || 'https://ibrahim-general-store.web.app'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setVersionName(config.versionName || '2.4.0');
      setVersionCode(config.versionCode || 24);
      setMinRequiredVersion(config.minRequiredVersion || '2.0.0');
      setIsForceUpdate(config.isForceUpdate || false);
      setUpdateTitle(config.updateTitle || 'খাতা অ্যাপের নতুন সংস্করণ উপলব্ধ!');
      setReleaseNotes(config.releaseNotes || '');
      setDownloadUrl(config.downloadUrl || '');
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated: AppUpdateConfig = {
      id: 'app_update',
      versionName: versionName.trim(),
      versionCode: Number(versionCode),
      minRequiredVersion: minRequiredVersion.trim(),
      isForceUpdate,
      updateTitle: updateTitle.trim(),
      releaseNotes: releaseNotes.trim(),
      downloadUrl: downloadUrl.trim(),
      updatedAt: Date.now(),
    };

    await onSaveConfig(updated);
    setSaving(false);
    onShowToast('✅ অ্যাপ ভার্সন ও আপডেট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
  };

  return (
    <div className="max-w-3xl mx-auto bg-[#101A2D] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-6 font-sans">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
          <DownloadCloud className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-white">
            অ্যাপ ভার্সন কন্ট্রোল ও ফোর্স আপডেট কনফিগ
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            নতুন ভার্সন রিলিজ, রিলিজ নোটস এবং ফোর্স আপডেটের মাধ্যমে সকল ইউজারের অ্যাপ আপডেট নিয়ন্ত্রণ করুন।
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Force Update Danger Box */}
        <div
          className={`p-4 rounded-2xl border transition ${
            isForceUpdate
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isForceUpdate}
              onChange={(e) => setIsForceUpdate(e.target.checked)}
              className="w-5 h-5 text-rose-600 rounded-md focus:ring-rose-500 mt-0.5"
            />
            <div>
              <span className="font-black text-sm text-white block">
                বাধ্যতামূলক আপডেট (Force Update) চালু করুন
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                যদি এটি সক্রিয় থাকে, তবে পুরাতন ভার্সনের কোনো ইউজার অ্যাপ ব্যবহার করতে পারবে না এবং আপডেট না করা পর্যন্ত স্ক্রিন লক থাকবে।
              </p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              লেটেস্ট ভার্সন নাম <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="e.g. 2.4.0"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl font-mono text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              ভার্সন কোড (Integer) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              value={versionCode}
              onChange={(e) => setVersionCode(Number(e.target.value))}
              placeholder="e.g. 24"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl font-mono text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              নূন্যতম আবশ্যক ভার্সন
            </label>
            <input
              type="text"
              value={minRequiredVersion}
              onChange={(e) => setMinRequiredVersion(e.target.value)}
              placeholder="e.g. 2.0.0"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl font-mono text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1">
            আপডেট ডায়ালগ শিরোনাম <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={updateTitle}
            onChange={(e) => setUpdateTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1">
            নতুন ফিচারের বিবরণ / রিলিজ নোটস <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            placeholder="• নতুন কী কী ফিচার বা সমাধান যুক্ত হয়েছে..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none leading-relaxed"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-300 mb-1">
            আপডেট ডাউনলোড / প্লেস্টোর লিঙ্ক <span className="text-rose-400">*</span>
          </label>
          <input
            type="url"
            required
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/..."
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-teal-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট রিলিজ কনফিগ সেভ করুন'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
