import React, { useState, useEffect } from 'react';
import { Customer, Transaction, StoreProfile } from '../types';
import {
  Download,
  Upload,
  Copy,
  Database,
  X,
  Check,
  Cloud,
  RefreshCw,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';
import {
  performFullCloudSync,
  subscribeSyncStatus,
  SyncStatus,
  getCurrentSyncStatus,
} from '../services/offlineSyncService';

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getCurrentSyncStatus());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeSyncStatus((s) => setSyncStatus(s));
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const exportPayload = {
    app: 'twing_hisabi_offline_ledger',
    version: '3.0',
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
    a.setAttribute('download', `twing_hisabi_backup_${new Date().toISOString().split('T')[0]}.json`);
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

  const handleTriggerCloudSync = async () => {
    setIsCloudSyncing(true);
    const res = await performFullCloudSync();
    setIsCloudSyncing(false);
    onShowToast(res.message);
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
              <h3 className="text-base font-bold text-slate-800">ডাটা ব্যাকআপ ও অফলাইন সিঙ্ক</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {store.name || 'TWING হিসাবি'} — ক্লাউড ও লোকাল ব্যাকআপ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-slate-600">
          {/* Cloud Auto-Sync Status Card */}
          <div className="bg-gradient-to-br from-teal-900 to-[#004D40] text-white p-4 rounded-xl shadow-md border border-teal-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Cloud className="w-4.5 h-4.5 text-teal-300" />
                <span>অফলাইন-ফার্স্ট ক্লাউড সিঙ্ক</span>
              </div>
              <div
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  syncStatus.isOnline
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}
              >
                {syncStatus.isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ইন্টারনেট সংযুক্ত</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-300" />
                    <span>অফলাইন মোড</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/20 p-2.5 rounded-lg border border-white/10">
              <div>
                <span className="text-teal-200/80 block">সিঙ্ক পেন্ডিং ডাটা:</span>
                <span className="font-bold text-amber-300 text-xs">
                  {syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount}টি অপারেশন বাকি` : 'সব ডাটা সিঙ্কড ✅'}
                </span>
              </div>
              <div>
                <span className="text-teal-200/80 block">লোকাল সেভ স্ট্যাটাস:</span>
                <span className="font-bold text-teal-100 text-xs">সুরক্ষিত ও কার্যকর</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerCloudSync}
              disabled={isCloudSyncing || syncStatus.isSyncing}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing || syncStatus.isSyncing ? 'ক্লাউডে সিঙ্ক হচ্ছে...' : 'এখনই ক্লাউডে সিঙ্ক ও ব্যাকআপ করুন'}</span>
            </button>
          </div>

          {/* Export JSON Data */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
              <Download className="w-4 h-4 text-[#00695C]" />
              <span>১. খাতার হিসাব এক্সপোর্ট ফাইল (.json)</span>
            </h4>
            <p className="text-slate-500">
              আপনার বর্তমান সব কাস্টমার ও বাকি-আদায়ের হিসাব একটি ফাইলে সংরক্ষণ করুন।
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadBackupJSON}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ডাটা ফাইল ডাউনলোড (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJSON}
                className="py-2.5 px-3 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
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
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
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
