import React, { useState, useEffect } from 'react';
import { adminApi, googleDriveApi } from '../../services/apiService';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getGoogleDriveStatus,
  uploadBackupToGoogleDrive,
  restoreBackupFromGoogleDrive,
  TARGET_GOOGLE_EMAIL,
} from '../../services/googleDriveService';
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
  Info,
  Cloud,
  CloudDownload,
  CloudUpload,
  Key,
  ShieldCheck,
  Clock,
  Sparkles,
  Settings,
  FolderGit2
} from 'lucide-react';

interface DataManagementTabProps {
  onShowToast: (msg: string) => void;
  onRefreshAll?: () => void;
  onNavigateToLiveDb?: () => void;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({
  onShowToast,
  onRefreshAll,
  onNavigateToLiveDb,
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

  // Google Drive Cloud Persistence States
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [restoringDrive, setRestoringDrive] = useState(false);
  const [showDriveConfig, setShowDriveConfig] = useState(false);
  const [driveEmailInput, setDriveEmailInput] = useState('twinginfobd@gmail.com');
  const [folderNameInput, setFolderNameInput] = useState('TWING_HISABI_DATABASE');
  const [serviceAccountKeyInput, setServiceAccountKeyInput] = useState('');
  const [autoSyncMinutesInput, setAutoSyncMinutesInput] = useState(10);
  const [savingDriveConfig, setSavingDriveConfig] = useState(false);

  // Client-side 1-click Google Drive connection state
  const [clientDrive, setClientDrive] = useState(getGoogleDriveStatus());
  const [connectingDrive, setConnectingDrive] = useState(false);

  const loadDriveStatus = async () => {
    setLoadingDrive(true);
    try {
      const res = await googleDriveApi.getStatus();
      setDriveStatus(res);
      if (res.driveEmail) setDriveEmailInput(res.driveEmail);
      if (res.folderName) setFolderNameInput(res.folderName);
      if (res.autoSyncMinutes) setAutoSyncMinutesInput(res.autoSyncMinutes);
      setClientDrive(getGoogleDriveStatus());
    } catch (err: any) {
      console.warn('Could not load drive status:', err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setConnectingDrive(true);
    try {
      onShowToast('গুগল অ্যাকাউন্ট যাচাইকরণ উইন্ডো ওপেন হচ্ছে...');
      const res = await connectGoogleDrive(TARGET_GOOGLE_EMAIL);
      if (res.success) {
        onShowToast(`✅ গুগল ড্রাইভ (${res.email || TARGET_GOOGLE_EMAIL}) সফলভাবে যুক্ত হয়েছে!`);
        setClientDrive(getGoogleDriveStatus());
        await loadSummary();
      }
    } catch (err: any) {
      onShowToast(`❌ গুগল কানেক্ট ত্রুটি: ${err?.message || 'কানেক্ট করা যায়নি'}`);
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleDisconnectGoogleDrive = () => {
    disconnectGoogleDrive();
    setClientDrive(getGoogleDriveStatus());
    onShowToast('গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করা হয়েছে');
  };

  const handleSyncToDrive = async () => {
    setSyncingDrive(true);
    try {
      // 1. If 1-click client-side is connected, upload directly to Google Drive
      if (clientDrive.isConnected) {
        const res = await uploadBackupToGoogleDrive();
        onShowToast(res.message);
        setClientDrive(getGoogleDriveStatus());
        await loadSummary();
        return;
      }

      // 2. If server has Service Account credentials configured
      if (driveStatus?.hasCredentials) {
        const res = await googleDriveApi.syncNow();
        if (res.success) {
          onShowToast(res.message || '✅ গুগল ড্রাইভে ডাটাবেজ সফলভাবে সেভ হয়েছে!');
          setLastResult({ message: res.message, imported: res.counts });
        } else {
          onShowToast(`❌ ড্রাইভ সিঙ্ক ব্যর্থ: ${res.error || 'অজানা ত্রুটি'}`);
        }
        await loadDriveStatus();
        await loadSummary();
        return;
      }

      // 3. If neither is connected, effortlessly trigger 1-click Google connect!
      onShowToast('আপনার গুগল একাউন্ট (twinginfobd@gmail.com) কানেক্ট করা হচ্ছে...');
      const conn = await connectGoogleDrive(TARGET_GOOGLE_EMAIL);
      if (conn.success) {
        setClientDrive(getGoogleDriveStatus());
        const res = await uploadBackupToGoogleDrive();
        onShowToast(res.message);
        setClientDrive(getGoogleDriveStatus());
        await loadSummary();
      }
    } catch (err: any) {
      onShowToast(`❌ ড্রাইভ সিঙ্ক ত্রুটি: ${err?.message || 'সার্ভার সংযোগ বিচ্ছিন্ন'}`);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!window.confirm('গুগল ড্রাইভ থেকে সর্বশেষ ডাটাবেজ ব্যাকআপ রিস্টোর করতে চান? এটি আপনার সিস্টেমের সকল টেবিল নিরাপদে আপডেট করবে।')) {
      return;
    }
    setRestoringDrive(true);
    try {
      // 1. If 1-click client-side is connected, restore directly from Google Drive
      if (clientDrive.isConnected) {
        const res = await restoreBackupFromGoogleDrive();
        onShowToast(res.message);
        setLastResult({ message: res.message, imported: res.imported });
        setClientDrive(getGoogleDriveStatus());
        await loadSummary();
        if (onRefreshAll) onRefreshAll();
        return;
      }

      // 2. If server has credentials
      if (driveStatus?.hasCredentials) {
        const res = await googleDriveApi.restoreNow();
        if (res.success) {
          onShowToast(res.message || '🎉 গুগল ড্রাইভ থেকে ডাটাবেজ সফলভাবে রিস্টোর হয়েছে!');
          setLastResult({ message: res.message, imported: res.restored });
          if (onRefreshAll) onRefreshAll();
        } else {
          onShowToast(`❌ ড্রাইভ রিস্টোর ব্যর্থ: ${res.error || 'অজানা ত্রুটি'}`);
        }
        await loadDriveStatus();
        await loadSummary();
        return;
      }

      // 3. Prompt 1-click Google connect
      onShowToast('ড্রাইভ থেকে ডাটা আনতে গুগল একাউন্ট কানেক্ট করুন...');
      const conn = await connectGoogleDrive(TARGET_GOOGLE_EMAIL);
      if (conn.success) {
        setClientDrive(getGoogleDriveStatus());
        const res = await restoreBackupFromGoogleDrive();
        onShowToast(res.message);
        setLastResult({ message: res.message, imported: res.imported });
        setClientDrive(getGoogleDriveStatus());
        await loadSummary();
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err: any) {
      onShowToast(`❌ ড্রাইভ রিস্টোর ত্রুটি: ${err?.message || 'সার্ভার সংযোগ বিচ্ছিন্ন'}`);
    } finally {
      setRestoringDrive(false);
    }
  };

  const handleSaveDriveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDriveConfig(true);
    try {
      const res = await googleDriveApi.saveConfig({
        driveEmail: driveEmailInput.trim(),
        folderName: folderNameInput.trim(),
        autoSyncMinutes: Number(autoSyncMinutesInput) || 10,
        serviceAccountKeyJson: serviceAccountKeyInput.trim() ? serviceAccountKeyInput.trim() : undefined,
      });
      onShowToast(res.message || '✅ গুগল ড্রাইভ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      setShowDriveConfig(false);
      setServiceAccountKeyInput('');
      await loadDriveStatus();
    } catch (err: any) {
      onShowToast(`❌ সেটিংস সংরক্ষণ ব্যর্থ: ${err?.message || 'ত্রুটি'}`);
    } finally {
      setSavingDriveConfig(false);
    }
  };

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
    loadDriveStatus();
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
              {summary?.databaseConnected ? 'CockroachDB লাইভ' : 'ক্লাউড সুরক্ষিত'}
            </div>
          </div>
        </div>

        {/* Live DB Viewer Callout Banner */}
        {onNavigateToLiveDb && (
          <div className="mt-4 p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-teal-950">
                  সরাসরি ডাটাবেজ রেকর্ড দেখতে চান? (Live DB Viewer)
                </h4>
                <p className="text-[11px] text-teal-700">
                  CockroachDB-এর ২৫টি টেবিল, সকল ইউজার ও ট্রানজেকশন রো বাই রো দেখতে লাইভ ভিউয়ার ব্যবহার করুন।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToLiveDb}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <span>লাইভ ভিউয়ার খুলুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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

      {/* 🚀 GOOGLE DRIVE PERSISTENT CLOUD DATABASE & AUTO-SYNC ENGINE */}
      <div className="bg-gradient-to-br from-emerald-900/25 via-teal-900/20 to-blue-900/25 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Header & Status Indicator */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-emerald-500/20 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0 shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  গুগল ড্রাইভ ক্লাউড ডাটাবেজ ও পার্মানেন্ট অটো-সিঙ্ক
                </h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  clientDrive.isConnected || driveStatus?.hasCredentials
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/40'
                }`}>
                  {clientDrive.isConnected || driveStatus?.hasCredentials ? '🟢 ড্রাইভ ক্লাউড সক্রিয়' : '🔵 ১-ক্লিক কানেক্ট প্রস্তুত'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  ১৫ জিবি আজীবন ফ্রি (No Limit Expire)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                লক্ষ্য ইমেইল: <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">twinginfobd@gmail.com</span> — রেন্ডার (Render) স্লিপ বা রিস্টার্ট হলেও গুগল ড্রাইভ থেকে স্বয়ংক্রিয়ভাবে ডাটাবেজ রিস্টোর হয়ে যাবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              id="btn-toggle-drive-config"
              onClick={() => setShowDriveConfig(!showDriveConfig)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition border border-gray-200 dark:border-gray-700 cursor-pointer shadow-xs"
            >
              <Settings className="w-4 h-4" />
              {showDriveConfig ? 'সেটিংস লুকান' : 'উন্নত সেটিংস'}
            </button>
            <button
              type="button"
              id="btn-refresh-drive-status"
              onClick={loadDriveStatus}
              disabled={loadingDrive}
              className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition border border-gray-200 dark:border-gray-700 cursor-pointer"
              title="স্ট্যাটাস রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDrive ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1-Click Connect Banner */}
        <div className="my-3 p-3.5 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              clientDrive.isConnected || driveStatus?.hasCredentials
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-blue-500/20 text-blue-500'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {clientDrive.isConnected ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    গুগল ড্রাইভ সরাসরি যুক্ত ({clientDrive.email || TARGET_GOOGLE_EMAIL})
                  </span>
                ) : (
                  <span>১-ট্যাপে গুগল ড্রাইভ কানেক্ট করুন (twinginfobd@gmail.com)</span>
                )}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {clientDrive.isConnected
                  ? 'আপনার গুগল ড্রাইভে "TWING_Hisabi_Backups" ফোল্ডারে সমস্ত ডাটাবেজ ব্যাকআপ হচ্ছে।'
                  : 'কোনো কোডিং বা সার্ভিস অ্যাকাউন্ট চাবি ছাড়াই সরাসরি আপনার গুগল ড্রাইভ কানেক্ট করুন।'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!clientDrive.isConnected ? (
              <button
                type="button"
                id="btn-quick-connect-gdrive"
                onClick={handleConnectGoogleDrive}
                disabled={connectingDrive}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Cloud className="w-4 h-4" />
                {connectingDrive ? 'কানেক্ট হচ্ছে...' : 'Google দিয়ে কানেক্ট করুন'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectGoogleDrive}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                ডিসকানেক্ট
              </button>
            )}
          </div>
        </div>

        {/* Live Status Info Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-4 relative z-10">
          <div className="p-3 bg-white/70 dark:bg-gray-900/60 rounded-xl border border-emerald-500/20 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-500" />
              টার্গেট ফোল্ডার
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100 font-mono truncate">
              TWING_Hisabi_Backups
            </div>
          </div>

          <div className="p-3 bg-white/70 dark:bg-gray-900/60 rounded-xl border border-emerald-500/20 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              স্বয়ংক্রিয় ব্যাকআপ সময়
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              প্রতি ১০ মিনিট পর পর
            </div>
          </div>

          <div className="p-3 bg-white/70 dark:bg-gray-900/60 rounded-xl border border-emerald-500/20 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              সর্বশেষ ব্যাকআপ
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {clientDrive.lastSyncTime || driveStatus?.lastSyncTime
                ? new Date(clientDrive.lastSyncTime || driveStatus.lastSyncTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'এখনো হয়নি'}
            </div>
          </div>

          <div className="p-3 bg-white/70 dark:bg-gray-900/60 rounded-xl border border-emerald-500/20 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
              ক্লাউড স্থিতি
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
              {clientDrive.isConnected ? 'গুগল ড্রাইভে সরাসরি কানেক্টেড' : driveStatus?.lastSyncMessage || 'কানেক্ট করার জন্য প্রস্তুত'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 relative z-10">
          <button
            type="button"
            id="btn-sync-to-google-drive"
            onClick={handleSyncToDrive}
            disabled={syncingDrive}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CloudUpload className={`w-4 h-4 ${syncingDrive ? 'animate-bounce' : ''}`} />
            {syncingDrive ? 'গুগল ড্রাইভে সেভ হচ্ছে...' : '☁️ গুগল ড্রাইভে এখনই সেভ করুন (Sync Now)'}
          </button>

          <button
            type="button"
            id="btn-restore-from-google-drive"
            onClick={handleRestoreFromDrive}
            disabled={restoringDrive}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-teal-700 to-blue-700 hover:from-teal-600 hover:to-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <CloudDownload className={`w-4 h-4 ${restoringDrive ? 'animate-spin' : ''}`} />
            {restoringDrive ? 'ড্রাইভ থেকে আনা হচ্ছে...' : '📥 গুগল ড্রাইভ থেকে ডাটা আনুন (Restore Now)'}
          </button>
        </div>

        {/* Collapsible Drive Configuration Form */}
        {showDriveConfig && (
          <form onSubmit={handleSaveDriveConfig} className="mt-5 p-4 sm:p-5 bg-white/90 dark:bg-gray-900/90 rounded-xl border border-emerald-500/30 space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-500" />
                গুগল ড্রাইভ কানেকশন ও সার্ভিস অ্যাকাউন্ট কি (Credentials)
              </h4>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Google Cloud Service Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  গুগল ড্রাইভ একাউন্ট ইমেইল:
                </label>
                <input
                  type="email"
                  value={driveEmailInput}
                  onChange={(e) => setDriveEmailInput(e.target.value)}
                  placeholder="twinginfobd@gmail.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ড্রাইভ ব্যাকআপ ফোল্ডারের নাম:
                </label>
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="TWING_HISABI_DATABASE"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  অটো-সিঙ্ক ফ্রিকোয়েন্সি (মিনিট):
                </label>
                <select
                  value={autoSyncMinutesInput}
                  onChange={(e) => setAutoSyncMinutesInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={5}>প্রতি ৫ মিনিট পর পর</option>
                  <option value={10}>প্রতি ১০ মিনিট পর পর (প্রস্তাবিত)</option>
                  <option value={15}>প্রতি ১৫ মিনিট পর পর</option>
                  <option value={30}>প্রতি ৩০ মিনিট পর পর</option>
                  <option value={60}>প্রতি ১ ঘণ্টা পর পর</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Google Service Account Key JSON (নতুন কি দিতে চাইলে পেস্ট করুন):
                </label>
                {driveStatus?.hasCredentials && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> পূর্বে সংরক্ষিত কি বিদ্যমান
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={serviceAccountKeyInput}
                onChange={(e) => setServiceAccountKeyInput(e.target.value)}
                placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                💡 গুগল ক্লাউড কনসোল থেকে তৈরি করা Service Account JSON Key এখানে পেস্ট করলে সরাসরি twinginfobd@gmail.com ড্রাইভে ফাইল তৈরি হবে।
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDriveConfig(false)}
                className="px-4 py-2 bg-gray-150 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                id="btn-save-drive-config"
                disabled={savingDriveConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {savingDriveConfig ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        )}
      </div>

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
