import React, { useState, useEffect } from 'react';
import {
  AdminTab,
  AppUser,
  PaymentRecord,
  AdminNotification,
  Announcement,
  AppUpdateConfig,
  AdminActivityLog,
  SupportThread,
  UserStatus,
} from '../../types/adminTypes';
import {
  subscribeToAdminUsers,
  subscribeToAdminPayments,
  subscribeToAdminNotifications,
  subscribeToAnnouncements,
  subscribeToAppUpdateConfig,
  subscribeToActivityLogs,
  subscribeToAllSupportThreads,
  saveAppUser,
  updateUserStatus,
  extendUserSubscription,
  deleteAppUser,
  approvePayment,
  rejectPayment,
  savePaymentRecord,
  deletePaymentRecord,
  sendAdminNotification,
  deleteNotification,
  saveAnnouncement,
  deleteAnnouncement,
  saveAppUpdateConfigToCloud,
  clearAllActivityLogs,
  triggerUserPasswordReset,
  ADMIN_EMAIL,
} from '../../services/adminService';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { UserManagementTab } from './UserManagementTab';
import { SubscriptionManagementTab } from './SubscriptionManagementTab';
import { PaymentManagementTab } from './PaymentManagementTab';
import { ExpiredUsersTab } from './ExpiredUsersTab';
import { SupportManagementTab } from './SupportManagementTab';
import { NotificationManagementTab } from './NotificationManagementTab';
import { AnnouncementManagementTab } from './AnnouncementManagementTab';
import { AppUpdateManagementTab } from './AppUpdateManagementTab';
import { ActivityLogTab } from './ActivityLogTab';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Clock,
  Bell,
  Megaphone,
  DownloadCloud,
  History,
  Headphones,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  currentUserEmail?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, currentUserEmail }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [appConfig, setAppConfig] = useState<AppUpdateConfig>({
    id: 'app_update',
    versionName: '2.4.0',
    versionCode: 24,
    minRequiredVersion: '2.0.0',
    isForceUpdate: false,
    updateTitle: 'খাতা অ্যাপের নতুন সংস্করণ উপলব্ধ!',
    releaseNotes: '• নতুন অ্যাডমিন কন্ট্রোল প্যানেল\n• গতি ও নিরাপত্তা বৃদ্ধি',
    downloadUrl: '',
    updatedAt: Date.now(),
  });
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);

  // Subscriptions
  useEffect(() => {
    const unsubUsers = subscribeToAdminUsers(setUsers);
    const unsubPayments = subscribeToAdminPayments(setPayments);
    const unsubNotifs = subscribeToAdminNotifications(setNotifications);
    const unsubAnn = subscribeToAnnouncements(setAnnouncements);
    const unsubConfig = subscribeToAppUpdateConfig((cfg) => {
      if (cfg) setAppConfig(cfg);
    });
    const unsubLogs = subscribeToActivityLogs(setLogs);
    const unsubSupport = subscribeToAllSupportThreads(setSupportThreads);

    return () => {
      unsubUsers();
      unsubPayments();
      unsubNotifs();
      unsubAnn();
      unsubConfig();
      unsubLogs();
      unsubSupport();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const expiredCount = users.filter((u) => u.subscriptionExpiresAt <= Date.now() || u.status === 'expired').length;
  const unreadSupportCount = supportThreads.reduce((acc, t) => acc + (t.unreadAdminCount || 0), 0);

  const navItems: { id: AdminTab; label: string; icon: any; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'users', label: 'ইউজার ম্যানেজমেন্ট', icon: Users, badge: users.length },
    { id: 'subscriptions', label: 'সাবস্ক্রিপশন প্ল্যান', icon: CreditCard },
    {
      id: 'payments',
      label: 'পেমেন্ট ভেরিফিকেশন',
      icon: Receipt,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'expired',
      label: 'মেয়াদ মনিটরিং',
      icon: Clock,
      badge: expiredCount > 0 ? expiredCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'support',
      label: 'সাপোর্ট ও মেসেজ',
      icon: Headphones,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
      badgeColor: 'bg-teal-600 text-white',
    },
    { id: 'notifications', label: 'নোটিফিকেশন', icon: Bell },
    { id: 'announcements', label: 'ঘোষণা ও ব্যানার', icon: Megaphone },
    { id: 'app_update', label: 'ভার্সন ও আপডেট', icon: DownloadCloud },
    { id: 'activity_logs', label: 'অডিট লগ', icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-[#004D40] text-white px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between shadow-md border-b border-teal-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">মূল অ্যাপে ফিরুন</span>
          </button>

          <div className="h-5 w-[1px] bg-teal-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center font-black text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black leading-tight flex items-center gap-1.5">
                <span>অ্যাডমিন ম্যানেজমেন্ট কনসোল</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-teal-950">
                  SUPER ADMIN
                </span>
              </h1>
              <p className="text-[11px] text-teal-200 hidden sm:block">
                অ্যাডমিন: {currentUserEmail || ADMIN_EMAIL}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => showToast('ডাটা রিলোড ও সিঙ্ক সম্পন্ন')}
            className="p-2 hover:bg-white/10 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">প্রস্থান</span>
          </button>
        </div>
      </header>

      {/* Main Admin Body: Sidebar Nav + Content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 shrink-0 overflow-x-auto md:overflow-y-auto p-2 sm:p-3 flex md:flex-col gap-1 shadow-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 md:shrink ${
                  isActive
                    ? 'bg-[#004D40] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-200' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      item.badgeColor || (isActive ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Dynamic Tab Workspace */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {activeTab === 'dashboard' && (
            <AdminDashboardOverview
              users={users}
              payments={payments}
              notifications={notifications}
              announcements={announcements}
              logs={logs}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onApprovePayment={(id) => approvePayment(id)}
              onRejectPayment={(id) => rejectPayment(id, 'টাকা জমা হয়নি')}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementTab
              users={users}
              onSaveUser={saveAppUser}
              onUpdateStatus={updateUserStatus}
              onExtendSubscription={extendUserSubscription}
              onDeleteUser={deleteAppUser}
              onResetPassword={triggerUserPasswordReset}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionManagementTab
              users={users}
              onExtendSubscription={extendUserSubscription}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagementTab
              payments={payments}
              users={users}
              onApprovePayment={approvePayment}
              onRejectPayment={rejectPayment}
              onAddManualPayment={savePaymentRecord}
              onDeletePayment={deletePaymentRecord}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'expired' && (
            <ExpiredUsersTab
              users={users}
              onExtendSubscription={extendUserSubscription}
              onSendNotificationToUser={(uid, title, msg) =>
                sendAdminNotification({
                  id: 'notif_' + Date.now(),
                  title,
                  message: msg,
                  type: 'subscription_expired',
                  target: 'specific',
                  targetUserId: uid,
                  priority: 'high',
                  createdAt: Date.now(),
                  isRead: false,
                })
              }
              onShowToast={showToast}
            />
          )}

          {activeTab === 'support' && (
            <SupportManagementTab
              currentUserEmail={currentUserEmail}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationManagementTab
              notifications={notifications}
              users={users}
              onSendNotification={sendAdminNotification}
              onDeleteNotification={deleteNotification}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementManagementTab
              announcements={announcements}
              onSaveAnnouncement={saveAnnouncement}
              onDeleteAnnouncement={deleteAnnouncement}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'app_update' && (
            <AppUpdateManagementTab
              config={appConfig}
              onSaveConfig={saveAppUpdateConfigToCloud}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'activity_logs' && (
            <ActivityLogTab
              logs={logs}
              onClearLogs={clearAllActivityLogs}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
};
