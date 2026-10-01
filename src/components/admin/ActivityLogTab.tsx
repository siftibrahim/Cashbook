import React, { useState } from 'react';
import { AdminActivityLog } from '../../types/adminTypes';
import {
  Clock,
  Search,
  Trash2,
  Shield,
  Filter,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface ActivityLogTabProps {
  logs: AdminActivityLog[];
  onClearLogs: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  logs,
  onClearLogs,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.adminEmail && log.adminEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="অ্যাক্টিভিটি, অ্যাকশন বা বিবরণ দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>লগ ক্লিয়ার করুন</span>
          </button>
        )}
      </div>

      {showClearConfirm && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <p className="text-xs font-bold text-rose-900">
            ⚠️ আপনি কি নিশ্চিত যে সমস্ত অ্যাডমিন অ্যাক্টিভিটি লগ স্থায়ীভাবে মুছে ফেলতে চান?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={async () => {
                setShowClearConfirm(false);
                await onClearLogs();
                onShowToast('লগ হিস্ট্রি সফলভাবে ক্লিয়ার করা হয়েছে');
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              হ্যাঁ, মুছে ফেলুন
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            কোনো অ্যাক্টিভিটি লগ পাওয়া যায়নি
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-slate-500 text-[11px] font-mono">
                        {log.adminEmail || 'Admin'}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 text-[12px] leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 text-slate-400 text-[11px] font-mono">
                  <div>{new Date(log.timestamp).toLocaleDateString('bn-BD')}</div>
                  <div>
                    {new Date(log.timestamp).toLocaleTimeString('bn-BD', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
