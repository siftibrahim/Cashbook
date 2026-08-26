import React, { useState } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import { Download, Upload, Copy, Database, X, Check } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  customers: Customer[];
  transactions: Record<string, Transaction[]>;
  store: StoreProfile;
  onClose: () => void;
  onRestoreData: (customers: Customer[], transactions: Record<string, Transaction[]>) => void;
  onShowToast: (msg: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  customers,
  transactions,
  store,
  onClose,
  onRestoreData,
  onShowToast,
}) => {
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportPayload = {
    app: 'ibrahim_general_store_khata',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    store,
    customers,
    transactions,
  };

  const handleDownloadBackupJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `ibrahim_khata_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    onShowToast('ডাটা ব্যাকআপ ফাইল ডাউনলোড হয়েছে!');
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
    onShowToast('ব্যাকআপ ডাটা কপি হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.customers && parsed.transactions) {
          onRestoreData(parsed.customers, parsed.transactions);
          onShowToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
          onClose();
        } else {
          alert('অবৈধ ব্যাকআপ ফাইল! সঠিক ফাইল নির্বাচন করুন।');
        }
      } catch {
        alert('ফাইলটি সঠিক JSON ফরম্যাটে নেই।');
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    if (!importText.trim()) return;
    try {
      const parsed = JSON.parse(importText);
      if (parsed.customers && parsed.transactions) {
        onRestoreData(parsed.customers, parsed.transactions);
        onShowToast('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!');
        onClose();
      } else {
        alert('ডাটা ফরম্যাট সঠিক নয়!');
      }
    } catch {
      alert('সঠিক JSON কোড পেস্ট করুন!');
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white w-full max-w-lg my-1 sm:my-auto max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 pb-24 sm:pb-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#00695C] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">ডাটা ব্যাকআপ ও রিস্টোর</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {store.name || 'TWING হিসাবি'} — কাস্টমার বাকি ও লেনদেন ব্যাকআপ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-slate-600">
          {/* Export JSON Data */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Download className="w-4 h-4 text-[#00695C]" />
              <span>১. খাতার হিসাব ব্যাকআপ (JSON Backup)</span>
            </h4>
            <p className="text-slate-500">
              আপনার বর্তমান সব কাস্টমার ও বাকি-আদায়ের হিসাব একটি ফাইলে সংরক্ষণ করুন।
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadBackupJSON}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>ডাটা ফাইল ডাউনলোড (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJSON}
                className="py-2.5 px-3 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'কপি হয়েছে' : 'কোড কপি'}</span>
              </button>
            </div>
          </div>

          {/* Import Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>২. সংরক্ষিত হিসাব রিস্টোর (Import)</span>
            </h4>
            <p className="text-slate-500">পূর্বের সংরক্ষিত JSON ব্যাকআপ ফাইল নির্বাচন করুন:</p>

            <label className="block w-full cursor-pointer py-2.5 px-3 bg-white border border-dashed border-slate-300 hover:border-teal-500 rounded-xl text-center font-bold text-slate-700 hover:bg-teal-50/30 transition">
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              📁 ব্যাকআপ ফাইল বাছুন (.json)
            </label>

            <div className="pt-1">
              <textarea
                rows={2}
                value={importText}
                onFocus={handleInputFocus}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="অথবা ব্যাকআপ কোড পেস্ট করুন..."
                className="w-full p-2.5 text-[11px] font-mono border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {importText.trim() && (
                <button
                  type="button"
                  onClick={handleTextImport}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  রিস্টোর করুন
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
