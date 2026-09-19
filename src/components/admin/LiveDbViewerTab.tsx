import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../services/apiService';
import {
  Database,
  RefreshCw,
  Search,
  Table as TableIcon,
  Terminal,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  X,
  Copy,
  Check,
  Layers,
  Activity,
  Server,
  Cpu,
  Clock,
  Zap,
  Filter,
  ArrowUpDown,
  Sparkles,
  Lock,
  Code
} from 'lucide-react';

interface TableMeta {
  name: string;
  rowCount: number;
  columnCount: number;
  error?: string;
}

interface ColumnMeta {
  name: string;
  type: string;
  isNullable: boolean;
  defaultVal?: any;
}

interface DbOverview {
  connected: boolean;
  storageType?: string;
  database: string;
  cluster?: string;
  host?: string;
  port?: number;
  region?: string;
  ssl?: string;
  latencyMs: number;
  dbEngine: string;
  versionSummary?: string;
  tables: TableMeta[];
  totalRows: number;
  timestamp: number;
  error?: string;
}

interface LiveDbViewerTabProps {
  onShowToast: (msg: string) => void;
}

export const LiveDbViewerTab: React.FC<LiveDbViewerTabProps> = ({ onShowToast }) => {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'query' | 'health'>('tables');

  // Table Browser State
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingTable, setLoadingTable] = useState<boolean>(false);
  const [showSchema, setShowSchema] = useState<boolean>(false);
  const [tableFilterQuery, setTableFilterQuery] = useState<string>('');

  // Row Inspector Modal
  const [inspectingRow, setInspectingRow] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Query Console State
  const [customSql, setCustomSql] = useState<string>('SELECT id, name, phone, role, created_at FROM users ORDER BY registered_at DESC LIMIT 10;');
  const [queryRunning, setQueryRunning] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
    error?: string;
  } | null>(null);

  // Load Overview
  const loadOverview = useCallback(async (showToastMsg = false) => {
    setLoadingOverview(true);
    try {
      const res = await adminApi.getLiveDbOverview();
      setOverview(res);
      if (showToastMsg) {
        onShowToast(`🟢 ডাটাবেজ লাইভ স্টেট রিফ্রেশ সম্পন্ন (${res.latencyMs}ms)`);
      }
    } catch (err: any) {
      console.error('Error loading DB overview:', err);
      onShowToast(`❌ ডাটাবেজ ওভারভিউ লোড ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setLoadingOverview(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadOverview(false);
      if (activeSubTab === 'tables' && selectedTable) {
        loadTableData(selectedTable, page, limit, tableSearch);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeSubTab, selectedTable, page, limit, tableSearch, loadOverview]);

  // Load Table Data
  const loadTableData = async (
    tblName: string,
    pageNum: number,
    pageLimit: number,
    searchTerm: string
  ) => {
    setLoadingTable(true);
    try {
      const res = await adminApi.getLiveDbTable(tblName, {
        page: pageNum,
        limit: pageLimit,
        search: searchTerm,
      });
      setColumns(res.columns || []);
      setRows(res.rows || []);
      setTotalCount(res.totalCount || 0);
      setPage(res.page || 1);
      setLimit(res.limit || 25);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Error loading table rows:', err);
      onShowToast(`❌ টেবিল '${tblName}' ডাটা লোড ব্যর্থ: ${err.message || 'ত্রুটি'}`);
      setRows([]);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      loadTableData(selectedTable, 1, limit, tableSearch);
    }
  }, [selectedTable, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTableData(selectedTable, 1, limit, tableSearch);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadTableData(selectedTable, newPage, limit, tableSearch);
  };

  // Run SQL Query
  const handleRunQuery = async () => {
    if (!customSql.trim()) {
      onShowToast('এসকিউএল কুয়েরি লিখুন');
      return;
    }
    setQueryRunning(true);
    setQueryResult(null);
    try {
      const res = await adminApi.runLiveDbQuery(customSql);
      setQueryResult(res);
      onShowToast(`✅ কুয়েরি সম্পন্ন: ${res.rowCount} টি রেকর্ড পাওয়া গেছে (${res.executionTimeMs}ms)`);
    } catch (err: any) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message || 'কুয়েরি ব্যর্থ',
      });
      onShowToast(`❌ কুয়েরি ত্রুটি: ${err.message}`);
    } finally {
      setQueryRunning(false);
    }
  };

  // Export Table Data to JSON
  const handleExportTableJson = () => {
    if (!rows.length) {
      onShowToast('ডাউনলোড করার মতো কোনো ডাটা নেই');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${selectedTable}_live_db_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast(`✅ '${selectedTable}' ডাটা JSON ফাইল হিসেবে ডাউনলোড সম্পন্ন`);
  };

  // Export Table Data to CSV
  const handleExportTableCsv = () => {
    if (!rows.length || !columns.length) {
      onShowToast('ডাউনলোড করার মতো কোনো ডাটা নেই');
      return;
    }
    const headers = columns.map(c => `"${c.name}"`).join(',');
    const csvRows = rows.map(r => {
      return columns.map(c => {
        let val = r[c.name];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers, ...csvRows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `${selectedTable}_live_db_export_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast(`✅ '${selectedTable}' ডাটা CSV ফাইল হিসেবে ডাউনলোড সম্পন্ন`);
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredTables = useMemo(() => {
    if (!overview?.tables) return [];
    if (!tableFilterQuery.trim()) return overview.tables;
    return overview.tables.filter(t => t.name.toLowerCase().includes(tableFilterQuery.toLowerCase()));
  }, [overview?.tables, tableFilterQuery]);

  // Pre-configured Queries
  const presetQueries = [
    {
      title: 'সর্বশেষ ১০ জন ইউজার',
      sql: 'SELECT id, name, phone, email, role, shop_name, registered_at FROM users ORDER BY registered_at DESC LIMIT 10;',
    },
    {
      title: 'সর্বশেষ ২০ টি লেনদেন',
      sql: 'SELECT id, user_id, customer_id, type, amount, date, time, description FROM transactions ORDER BY created_at DESC LIMIT 20;',
    },
    {
      title: 'সকল কাস্টমার তালিকা',
      sql: 'SELECT id, user_id, name, phone, balance, credit_limit, created_at FROM customers ORDER BY created_at DESC LIMIT 25;',
    },
    {
      title: 'টেবিল অনুযায়ী মোট রো সংখ্যা',
      sql: `SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT table_name, 
         query_to_xml(format('select count(*) as cnt from %I', table_name), false, true, '') as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
) t ORDER BY row_count DESC;`,
    },
    {
      title: 'সুপার অ্যাডমিন সিকিউরিটি ও কনফিগ',
      sql: 'SELECT id, data, updated_at, updated_by FROM system_config ORDER BY updated_at DESC;',
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header & Live Connection Indicator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 shadow-inner">
              <Database className="w-6 h-6 text-teal-700 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  লাইভ ডাটাবেজ ভিউয়ার (Live Database Viewer)
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  CockroachDB Cloud লাইভ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  TLS Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ক্লাউড ডাটাবেজ (AWS ap-southeast-3) রিয়েল-টাইম টেবিল রেকর্ড, লাইভ স্কিমা ও নিরাপদ এসকিউএল ইন্সপেক্টর
              </p>
            </div>
          </div>

          {/* Connection Stats & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-500">লেটেন্সি:</span>
              <span className="font-bold text-slate-800">{overview?.latencyMs || 0} ms</span>
            </div>

            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                autoRefresh
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoRefresh ? 'fill-white' : ''}`} />
              <span>{autoRefresh ? 'অটো-সিঙ্ক চালু (১৫ সে.)' : 'অটো-সিঙ্ক বন্ধ'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadOverview(true)}
              disabled={loadingOverview}
              className="px-3.5 py-1.5 bg-[#004D40] hover:bg-[#00382f] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* 2. Top Summary Bento Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">ডাটাবেজের মোট টেবিল</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {overview?.tables?.length || 25} টি
            </span>
            <span className="text-[10px] text-slate-400">public স্কিমায় বিদ্যমান</span>
          </div>

          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
            <span className="text-[11px] font-bold text-teal-800 block">মোট লাইভ রেকর্ডস (Rows)</span>
            <span className="text-lg font-black text-teal-900 mt-0.5 block">
              {overview?.totalRows?.toLocaleString() || 0} টি
            </span>
            <span className="text-[10px] text-teal-600">সবগুলো টেবিলে সংগৃহীত</span>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-800 block">রেজিস্টার্ড ইউজার (Users)</span>
            <span className="text-lg font-black text-indigo-900 mt-0.5 block">
              {overview?.tables?.find(t => t.name === 'users')?.rowCount || 0} জন
            </span>
            <span className="text-[10px] text-indigo-600">আসল ডাটাবেজে সংরক্ষিত</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold text-amber-800 block">মোট কাস্টমার ও লেনদেন</span>
            <span className="text-lg font-black text-amber-900 mt-0.5 block">
              {(overview?.tables?.find(t => t.name === 'customers')?.rowCount || 0) + (overview?.tables?.find(t => t.name === 'transactions')?.rowCount || 0)} টি
            </span>
            <span className="text-[10px] text-amber-600">কাস্টমার ও ট্রানজেকশন</span>
          </div>
        </div>

        {/* 3. Sub-Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('tables')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'tables'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>টেবিল ব্রাউজার (Table Browser)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('query')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'query'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>কুয়েরি কনসোল (SQL Query)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('health')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'health'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>ডাটাবেজ কানেকশন ইনফো</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: TABLE BROWSER                                              */}
      {/* ===================================================================== */}
      {activeSubTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left Table Sidebar */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                ডাটাবেজ টেবিলসমূহ
              </span>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {filteredTables.length} টি
              </span>
            </div>

            {/* Filter Tables Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={tableFilterQuery}
                onChange={(e) => setTableFilterQuery(e.target.value)}
                placeholder="টেবিল খুঁজুন..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
              />
            </div>

            {/* Table List */}
            <div className="max-h-[520px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredTables.map((tbl) => {
                const isSelected = selectedTable === tbl.name;
                return (
                  <button
                    key={tbl.name}
                    type="button"
                    onClick={() => {
                      setSelectedTable(tbl.name);
                      setTableSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white font-bold shadow-sm'
                        : 'hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TableIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-200' : 'text-slate-400'}`} />
                      <span className="truncate">{tbl.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        isSelected
                          ? 'bg-teal-800 text-teal-100'
                          : tbl.rowCount > 0
                          ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {tbl.rowCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Table Data View */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
            {/* Table Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                  {selectedTable}
                </h3>
                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                  মোট {totalCount} টি রেকর্ড
                </span>
                <button
                  type="button"
                  onClick={() => setShowSchema(!showSchema)}
                  className="text-xs text-teal-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showSchema ? 'স্কিমা লুকান' : 'কলাম স্কিমা দেখুন'}</span>
                </button>
              </div>

              {/* Action Buttons: Export & Rows per page */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value={10}>১০ টি প্রতি পেজে</option>
                  <option value={25}>২৫ টি প্রতি পেজে</option>
                  <option value={50}>৫০ টি প্রতি পেজে</option>
                  <option value={100}>১০০ টি প্রতি পেজে</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportTableCsv}
                  title="CSV এক্সপোর্ট"
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-600" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTableJson}
                  title="JSON এক্সপোর্ট"
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-slate-600" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Schema Inspector Collapse */}
            {showSchema && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-black text-slate-800 block">
                  টেবিল স্কিমা ও কলাম লিস্ট ({columns.length} টি কলাম):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {columns.map((c) => (
                    <div key={c.name} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-slate-900 truncate" title={c.name}>
                        {c.name}
                      </div>
                      <div className="text-teal-700 font-mono text-[10px] truncate">{c.type}</div>
                      <div className="text-slate-400 text-[9px] mt-0.5">
                        {c.isNullable ? 'Nullable' : 'Not Null'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Filter for selected table */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={`'${selectedTable}' টেবিলে যে কোনো টেক্সট বা আইডি দিয়ে সার্চ করুন...`}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                সার্চ
              </button>
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setTableSearch('');
                    loadTableData(selectedTable, 1, limit, '');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ক্লিয়ার
                </button>
              )}
            </form>

            {/* Live Data Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto max-h-[500px]">
                {loadingTable ? (
                  <div className="p-12 text-center text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-teal-700 mx-auto" />
                    <p className="text-xs font-bold">CockroachDB থেকে ডাটা ফেচ হচ্ছে...</p>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-1">
                    <TableIcon className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">এই টেবিলে কোনো রেকর্ড পাওয়া যায়নি</p>
                    <p className="text-[11px] text-slate-400">টেবিলটি খালি অথবা সার্চ কুয়েরির সাথে মিল পাওয়া যায়নি।</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap text-[11px] uppercase tracking-wider text-slate-500 w-12 text-center">
                          #
                        </th>
                        <th className="py-2.5 px-3 whitespace-nowrap text-[11px] uppercase tracking-wider text-slate-500 w-16 text-center">
                          ভিউ
                        </th>
                        {columns.map((c) => (
                          <th key={c.name} className="py-2.5 px-3 whitespace-nowrap text-[11px] font-mono">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => (
                        <tr
                          key={row.id || idx}
                          className="hover:bg-teal-50/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-[11px] font-mono text-slate-400 text-center">
                            {(page - 1) * limit + idx + 1}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setInspectingRow(row)}
                              className="p-1 text-teal-700 hover:bg-teal-100 rounded transition cursor-pointer"
                              title="রো ডিটেলস ও JSON দেখুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          {columns.map((c) => {
                            const val = row[c.name];
                            let displayVal = '-';
                            if (val !== null && val !== undefined) {
                              if (typeof val === 'object') {
                                displayVal = JSON.stringify(val);
                              } else {
                                displayVal = String(val);
                              }
                            }

                            // Format timestamp if detected
                            const isTimestamp = (c.name.includes('_at') || c.name === 'createdAt' || c.name === 'updatedAt') && typeof val === 'number' && val > 1000000000000;
                            if (isTimestamp) {
                              displayVal = new Date(val).toLocaleString('bn-BD', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                            }

                            return (
                              <td
                                key={c.name}
                                className="py-2 px-3 font-mono text-[11px] text-slate-800 max-w-[220px] truncate"
                                title={typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                              >
                                {c.name === 'id' ? (
                                  <span className="font-bold text-teal-800">{displayVal}</span>
                                ) : c.name === 'status' || c.name === 'role' ? (
                                  <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                                    {displayVal}
                                  </span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">
                  পৃষ্ঠা {page} / {totalPages} (মোট {totalCount} টি রেকর্ড)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                    {page}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: SAFE SQL QUERY CONSOLE                                     */}
      {/* ===================================================================== */}
      {activeSubTab === 'query' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-700" />
                <span>রিড-অনলি এসকিউএল কুয়েরি কনসোল (Safe SELECT Runner)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                সরাসরি CockroachDB ডাটাবেজে যে কোনো পাঠযোগ্য (SELECT) কুয়েরি রান করে লাইভ ফলাফল যাচাই করুন।
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start">
              <Lock className="w-3.5 h-3.5" />
              নিরাপত্তা রক্ষিত (Read-Only)
            </span>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-600 block">কুইক প্রি-সেট কুয়েরিসমূহ:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {presetQueries.map((pq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCustomSql(pq.sql)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition cursor-pointer"
                >
                  ⚡ {pq.title}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Editor Box */}
          <div className="space-y-2">
            <textarea
              rows={4}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              placeholder="SELECT * FROM users WHERE role = 'user' LIMIT 20;"
              className="w-full p-3 font-mono text-xs bg-slate-900 text-teal-300 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                সর্বোচ্চ ১০০ টি রো প্রদর্শিত হবে। কোনো ডাটা পরিবর্তন নিষিদ্ধ।
              </span>
              <button
                type="button"
                onClick={handleRunQuery}
                disabled={queryRunning}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
              >
                {queryRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>রান হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>কুয়েরি এক্সিকিউট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Query Results */}
          {queryResult && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  কুয়েরি ফলাফল: {queryResult.rowCount} টি রেকর্ড পাওয়া গেছে
                </span>
                <span className="text-xs font-mono text-slate-500">
                  সময় লেগেছে: {queryResult.executionTimeMs} ms
                </span>
              </div>

              {queryResult.error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {queryResult.error}
                </div>
              ) : queryResult.rows.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  কোনো রো ফেরত আসেনি
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-96 overflow-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2 px-3 text-[10px] text-slate-400 w-10">#</th>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="py-2 px-3 whitespace-nowrap text-[11px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {queryResult.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 text-[10px] text-slate-400">{idx + 1}</td>
                          {queryResult.columns.map((col) => {
                            const val = row[col];
                            return (
                              <td
                                key={col}
                                className="py-1.5 px-3 text-[11px] text-slate-800 max-w-[200px] truncate"
                                title={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              >
                                {val === null || val === undefined
                                  ? '-'
                                  : typeof val === 'object'
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: DATABASE HEALTH & SPECS                                    */}
      {/* ===================================================================== */}
      {activeSubTab === 'health' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-700" />
            <span>CockroachDB ক্লাউড আর্কিটেকচার ও কানেকশন স্পেসিফিকেশন</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="text-xs font-black text-slate-800 block">হোস্টিং ও ক্লাস্টার ইনফরমেশন</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">ডাটাবেজ সার্ভিস:</span>
                  <span className="font-bold text-slate-800">CockroachDB Serverless</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">ক্লাস্টার নাম:</span>
                  <span className="font-mono font-bold text-slate-800">{overview?.cluster || 'twinghisabi-32789'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">রিজিয়ন (Region):</span>
                  <span className="font-bold text-emerald-700">{overview?.region || 'AWS ap-southeast-3 (Jakarta)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">ডাটাবেজ নাম:</span>
                  <span className="font-mono font-bold text-slate-800">{overview?.database || 'defaultdb'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">পোর্ট:</span>
                  <span className="font-mono font-bold text-slate-800">26257 (PostgreSQL Wire Compatible)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">নিরাপত্তা (SSL/TLS):</span>
                  <span className="font-bold text-blue-700">TLS v1.3 Verified (End-to-End Encrypted)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2.5">
              <span className="text-xs font-black text-teal-900 block">ডাটা সুরক্ষা ও সার্ভারলেস নির্ভরযোগ্যতা</span>
              <ul className="space-y-2 text-xs text-teal-950">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>মাস্টার সার্ভারবিহীন ড্রপ-প্রুফ আর্কিটেকচার:</strong> CockroachDB ডাটা ৩টি আলাদা অ্যাভেইলেবিলিটি জোনে স্বয়ংক্রিয়ভাবে প্রতিলিপি (Replicate) করে রাখে।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>শূন্য ডাউনটাইম:</strong> সার্ভার বা কনটেইনার রিস্টার্ট হলেও আপনার সম্পূর্ণ ডাটাবেজ এক সেকেন্ডের জন্যও অফলাইন হয় না।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>কোনো ব্যাকডোর বা ডিফল্ট পিন নেই:</strong> সিস্টেম ও ডাটাবেজ শুধুমাত্র Bcrypt এনক্রিপ্টেড পাসওয়ার্ড ও 2FA ওটিপির মাধ্যমে নিয়ন্ত্রিত।
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ROW INSPECTOR MODAL                                                   */}
      {/* ===================================================================== */}
      {inspectingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-teal-700" />
                <h4 className="text-sm font-black text-slate-900 font-mono">
                  {selectedTable} → রেকর্ড বিবরণ (ID: {inspectingRow.id || 'N/A'})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Key-Value Inspection */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">কলাম ও ফিল্ড মানসমূহ:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(inspectingRow, null, 2), 'all_json')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedKey === 'all_json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'all_json' ? 'কপিকৃত!' : 'সম্পূর্ণ JSON কপি করুন'}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {Object.entries(inspectingRow).map(([key, val]) => (
                  <div key={key} className="p-2.5 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-1 hover:bg-slate-50">
                    <span className="font-mono font-bold text-slate-600 text-[11px] shrink-0 sm:w-1/3">
                      {key}
                    </span>
                    <div className="sm:w-2/3 flex items-start justify-between gap-2">
                      <span className="font-mono text-slate-900 break-all text-[11px]">
                        {val === null || val === undefined
                          ? '<null>'
                          : typeof val === 'object'
                          ? JSON.stringify(val, null, 2)
                          : String(val)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(typeof val === 'object' ? JSON.stringify(val) : String(val), key)}
                        className="text-slate-400 hover:text-teal-700 p-0.5 cursor-pointer shrink-0"
                        title="মান কপি করুন"
                      >
                        {copiedKey === key ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingRow(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
