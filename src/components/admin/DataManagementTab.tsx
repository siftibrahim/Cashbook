import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/apiService';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Users,
  CreditCard,
  Package,
  Layers,
  FileText,
  Check,
  Server,
  ArrowRight,
  Info
} from 'lucide-react';

interface DataManagementTabProps {
  onShowToast: (msg: string) => void;
  onRefreshAll?: () => void;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({
  onShowToast,
  onRefreshAll,
}) => {
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Master Export & Import States
  const [isExporting, setIsExporting] = useState(false);
  const [masterText, setMasterText] = useState('');
  const [masterMode, setMasterMode] = useState<'merge' | 'replace'>('merge');
  const [isImportingMaster, setIsImportingMaster] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Table Import States (e.g. from Neon Table export)
  const [selectedTable, setSelectedTable] = useState<string>('auto');
  const [tableText, setTableText] = useState('');
  const [tableMode, setTableMode] = useState<'merge' | 'replace'>('merge');
  const [isImportingTable, setIsImportingTable] = useState(false);

  // Last Result
  const [lastResult, setLastResult] = useState<any>(null);

  // Direct Remote Neon / PostgreSQL Migration
  const [remoteNeonUrl, setRemoteNeonUrl] = useState('');
  const [isMigratingRemote, setIsMigratingRemote] = useState(false);

  const handleRemoteMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteNeonUrl.trim()) {
      onShowToast('অনুগ্রহ করে আপনার আগের Neon Connection URL দিন');
      return;
    }

    setIsMigratingRemote(true);
    try {
      const res = await adminApi.migrateRemoteDatabase(remoteNeonUrl.trim());
      onShowToast(res.message || '✅ মাইগ্রেশন সফল হয়েছে!');
      setLastResult({
        message: res.message,
        imported: res.summary,
      });
      setRemoteNeonUrl('');
      await loadSummary();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      onShowToast(`❌ মাইগ্রেশন ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsMigratingRemote(false);
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await adminApi.getDataSummary();
      setSummary(res);
    } catch (err: any) {
      console.warn('Could not load data summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  // 1. Export Master Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await adminApi.exportMasterBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `twing-hisabi-master-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('✅ সম্পূর্ণ সিস্টেম ডাটা ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!');
    } catch (err: any) {
      onShowToast(`❌ ব্যাকআপ ডাউনলোড ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. File Upload Reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setMasterText(content);
        onShowToast(`📄 ফাইল "${file.name}" সফলভাবে লোড হয়েছে! এবার 'ইমপোর্ট' চাপুন।`);
      }
    };
    reader.readAsText(file);
  };

  // 3. Import Master Backup
  const handleImportMaster = async () => {
    if (!masterText.trim()) {
      onShowToast('অনুগ্রহ করে ব্যাকআপ ফাইল আপলোড করুন অথবা JSON কোড পেস্ট করুন');
      return;
    }

    let parsedData: any = null;
    try {
      parsedData = JSON.parse(masterText.trim());
    } catch (e: any) {
      onShowToast('❌ ইনপুট করা ডাটা সঠিক JSON ফরম্যাটে নেই। ব্র্যাকেট বা কোটেশন চেক করুন।');
      return;
    }

    setIsImportingMaster(true);
    setLastResult(null);
    try {
      const res = await adminApi.importMasterBackup(parsedData, masterMode);
      setLastResult(res);
      onShowToast('🎉 ' + res.message);
      setMasterText('');
      setSelectedFileName(null);
      await loadSummary();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      onShowToast(`❌ ডাটা ইমপোর্ট ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsImportingMaster(false);
    }
  };

  // 4. Import Specific Table (e.g. from Neon SQL Editor)
  const handleImportTable = async () => {
    if (!tableText.trim()) {
      onShowToast('অনুগ্রহ করে টেবিলের ডাটা (JSON Array) পেস্ট করুন');
      return;
    }

    let parsedRows: any = null;
    try {
      const parsed = JSON.parse(tableText.trim());
      if (Array.isArray(parsed)) {
        parsedRows = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // In case they pasted { rows: [...] } or single object
        if (Array.isArray(parsed.rows)) parsedRows = parsed.rows;
        else if (Array.isArray(parsed.data)) parsedRows = parsed.data;
        else parsedRows = [parsed];
      } else {
        throw new Error('ডাটা অ্যারে হতে হবে');
      }
    } catch (e: any) {
      onShowToast('❌ টেবিল ডাটা সঠিক JSON অ্যারে হতে হবে: [{"id": 1, ...}]');
      return;
    }

    setIsImportingTable(true);
    setLastResult(null);
    try {
      const res = await adminApi.importSpecificTable(selectedTable, parsedRows, tableMode);
      setLastResult(res);
      onShowToast(`🎉 টেবিল ডাটা সফলভাবে ইমপোর্ট হয়েছে! মোট ${parsedRows.length} টি রেকর্ড প্রসেস করা হয়েছে।`);
      setTableText('');
      await loadSummary();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      onShowToast(`❌ টেবিল ইমপোর্ট ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsImportingTable(false);
    }
  };

  const active = summary?.activeCounts || {};

  return (
    <div id="super-admin-data-management" className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                সিস্টেম ডাটা ম্যানেজমেন্ট ও মাস্টার ইমপোর্ট/এক্সপোর্ট
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                সুপার অ্যাডমিন প্যানেল থেকে সমস্ত কাস্টমার, লেনদেন, পণ্য ও দোকানের ডাটা ইমপোর্ট বা ব্যাকআপ নিন
              </p>
            </div>
          </div>
          <button
            id="btn-refresh-data-summary"
            onClick={loadSummary}
            disabled={loadingSummary}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            ডাটা রিফ্রেশ
          </button>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              কাস্টমার
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {(active.customers || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              লেনদেন
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {(active.transactions || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
              <Package className="w-3.5 h-3.5 text-purple-500" />
              পণ্য (Products)
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {(active.products || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              ইউজার/দোকান
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {(active.users || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              দৈনিক খরচ
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {(active.expenses || 0).toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-1">
              <Server className="w-3.5 h-3.5" />
              স্টোরেজ মোড
            </div>
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
              {summary?.databaseConnected ? 'PostgreSQL Active' : 'স্থানীয় ডিস্ক সুরক্ষিত'}
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Card */}
      {lastResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                ইমপোর্ট প্রক্রিয়া সফল হয়েছে!
              </h4>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm mt-1">
                {lastResult.message}
              </p>
              {lastResult.imported && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  <span>👥 কাস্টমার: {lastResult.imported.customers || 0}</span>
                  <span>💸 লেনদেন: {lastResult.imported.transactions || 0}</span>
                  <span>📦 পণ্য: {lastResult.imported.products || 0}</span>
                  <span>👤 ইউজার: {lastResult.imported.users || 0}</span>
                  <span>📉 খরচ: {lastResult.imported.expenses || 0}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct 1-Click Neon to CockroachDB Migration Box */}
      <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Neon থেকে ১-ক্লিকে সরাসরি ডাটা মাইগ্রেশন
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold">
                  স্বয়ংক্রিয়
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                আপনার পূর্বের Neon Database Connection URL পেস্ট করে সরাসরি সব ইউজার, কাস্টমার ও হিসাব CockroachDB-তে নিয়ে আসুন।
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleRemoteMigration} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              id="input-neon-migration-url"
              value={remoteNeonUrl}
              onChange={(e) => setRemoteNeonUrl(e.target.value)}
              placeholder="postgresql://user:password@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-mono outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              id="btn-run-neon-migration"
              disabled={isMigratingRemote || !remoteNeonUrl.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isMigratingRemote ? 'animate-spin' : ''}`} />
              {isMigratingRemote ? 'মাইগ্রেশন হচ্ছে...' : 'Neon ডাটা ট্রান্সফার করুন'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-400">
            💡 এটি আপনার Neon ডাটাবেজ থেকে টেবিলগুলো পড়ে এনে কোনো ডাটা নষ্ট না করে নতুন ডাটাবেজের সাথে মার্জ করে দেবে।
          </p>
        </form>
      </div>

      {/* Two Columns: 1. Full Master Backup & Import, 2. Neon / SQL Table Importer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box 1: Master Backup Export & Full Import */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileJson className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                মাস্টার ব্যাকআপ (সম্পূর্ণ সিস্টেম ডাটা)
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              পুরো অ্যাপ্লিকেশনের সব দোকানের সব তথ্য একসাথে ডাউনলোড করুন অথবা পূর্বে সংরক্ষিত ফাইল থেকে এক ক্লিকে রিস্টোর করুন।
            </p>

            {/* Export Button */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200/70 dark:border-gray-700 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    সম্পূর্ণ মাস্টার ব্যাকআপ ডাউনলোড
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    সমস্ত গ্রাহক, বাকি ও লেনদেন সহ JSON ফাইল সংরক্ষণ
                  </div>
                </div>
                <button
                  id="btn-export-master-backup"
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  {isExporting ? 'তৈরি হচ্ছে...' : 'ডাউনলোড (JSON)'}
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <div className="font-semibold text-gray-900 dark:text-white text-sm flex items-center justify-between">
                <span>মাস্টার ব্যাকআপ ফাইল বা কোড আপলোড</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">JSON ফরম্যাট</span>
              </div>

              {/* File Input */}
              <label className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/50">
                <Upload className="w-7 h-7 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {selectedFileName ? `নির্বাচিত: ${selectedFileName}` : 'কম্পিউটার/ফোন থেকে ব্যাকআপ (.json) ফাইল নির্বাচন করুন'}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">ক্লিক করে ফাইল সিলেক্ট করুন</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Text Area for pasting */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  অথবা সরাসরি মাস্টার ব্যাকআপ JSON কোড পেস্ট করুন:
                </label>
                <textarea
                  id="input-master-json"
                  rows={4}
                  value={masterText}
                  onChange={(e) => setMasterText(e.target.value)}
                  placeholder='{"users": [...], "customers": [...], "transactions": [...]}'
                  className="w-full font-mono text-xs p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300">ইমপোর্ট মোড:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="masterMode"
                    value="merge"
                    checked={masterMode === 'merge'}
                    onChange={() => setMasterMode('merge')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>মার্জ / আপডেট (প্রস্তাবিত)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="masterMode"
                    value="replace"
                    checked={masterMode === 'replace'}
                    onChange={() => setMasterMode('replace')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-600 dark:text-rose-400">ক্লিন প্রতিস্থাপন</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              id="btn-import-master-backup"
              onClick={handleImportMaster}
              disabled={isImportingMaster || !masterText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isImportingMaster ? 'ইমপোর্ট হচ্ছে...' : 'মাস্টার ডাটা ইমপোর্ট করুন'}
            </button>
          </div>
        </div>

        {/* Box 2: Neon / SQL Specific Table Importer */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Neon / SQL টেবিল ভিত্তিক সরাসরি ইমপোর্ট
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Neon কনসোল বা SQL কোয়েরি থেকে কোনো নির্দিষ্ট টেবিলের ডাটা কপি করে এনে এখানে সরাসরি পেস্ট করে ইমপোর্ট করতে পারবেন।
            </p>

            <div className="space-y-4">
              {/* Target Table Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  টার্গেট টেবিল নির্বাচন করুন:
                </label>
                <select
                  id="select-target-table"
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="auto">🔍 স্বয়ংক্রিয় শনাক্তকরণ (Auto-Detect)</option>
                  <option value="customers">👥 কাস্টমার তালিকা ও বাকি (customers)</option>
                  <option value="transactions">💸 দেনা-পাওনা ও লেনদেন (transactions)</option>
                  <option value="products">📦 পণ্য ও স্টক (products)</option>
                  <option value="expenses">📉 দৈনিক খরচ (expenses)</option>
                  <option value="users">👤 ইউজার / দোকানদার (users)</option>
                </select>
              </div>

              {/* Table Data Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    টেবিল ডাটা পেস্ট করুন (JSON Array):
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">[{"{"}"id": ...{"}"}]</span>
                </div>
                <textarea
                  id="input-table-json"
                  rows={8}
                  value={tableText}
                  onChange={(e) => setTableText(e.target.value)}
                  placeholder={`[
  {
    "name": "করিম ভাই",
    "phone": "01711223344",
    "balance": 1500,
    "address": "ঢাকা"
  }
]`}
                  className="w-full font-mono text-xs p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-300">ইমপোর্ট মোড:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tableMode"
                    value="merge"
                    checked={tableMode === 'merge'}
                    onChange={() => setTableMode('merge')}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>মার্জ / আপডেট (প্রস্তাবিত)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tableMode"
                    value="replace"
                    checked={tableMode === 'replace'}
                    onChange={() => setTableMode('replace')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-rose-600 dark:text-rose-400">পুরনো ডাটা প্রতিস্থাপন</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              id="btn-import-table-data"
              onClick={handleImportTable}
              disabled={isImportingTable || !tableText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              {isImportingTable ? 'ইমপোর্ট হচ্ছে...' : 'টেবিল ডাটা সিস্টেমে যুক্ত করুন'}
            </button>
          </div>
        </div>

      </div>

      {/* Helper Guideline Box */}
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1 leading-relaxed">
          <span className="font-bold">Neon কনসোল থেকে ডাটা নেওয়ার সহজ নিয়ম:</span>
          <p>
            ১. আপনার <b>console.neon.tech</b>-এ যান এবং <b>SQL Editor</b> ওপেন করুন।<br />
            ২. যেমন সব কাস্টমার নিতে কোয়েরি চালান: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">SELECT json_agg(c) FROM customers c;</code><br />
            ৩. প্রাপ্ত JSON ফলাফলটি কপি করে এনে ডানপাশের বক্সে পেস্ট করে <b>"টেবিল ডাটা সিস্টেমে যুক্ত করুন"</b> চাপলেই সমস্ত কাস্টমার স্বয়ংক্রিয়ভাবে আপনার সিস্টেমে চলে আসবে!
          </p>
        </div>
      </div>
    </div>
  );
};
