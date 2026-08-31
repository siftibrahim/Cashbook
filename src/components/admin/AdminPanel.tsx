import React, { useState, useEffect } from 'react';
import {
  AdminTab,
  AppUser,
  PaymentRecord,
  SystemPaymentSettings,
  AdminNotification,
  Announcement,
  AppUpdateConfig,
  AdminActivityLog,
  SupportThread,
  UserStatus,
  StaffMember,
  AdminSession,
} from '../../types/adminTypes';
import {
  subscribeToAdminUsers,
  subscribeToAdminPayments,
  subscribeToPaymentSettings,
  savePaymentSettingsToCloud,
  processPaymentRefund,
  subscribeToAdminNotifications,
  subscribeToAnnouncements,
  subscribeToAppUpdateConfig,
  subscribeToActivityLogs,
  subscribeToAllSupportThreads,
  subscribeToStaffMembers,
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
  saveStaffMember,
  updateStaffStatus,
  updateStaffPermissions,
  deleteStaffMember,
  hasStaffPermission,
  ADMIN_EMAIL,
  INITIAL_PAYMENT_SETTINGS,
} from '../../services/adminService';
import { adminApi } from '../../services/apiService';
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
import { StaffManagementTab } from './StaffManagementTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { SmsGatewayTab } from './SmsGatewayTab';
import { SuperAdminSecurityTab } from './SuperAdminSecurityTab';
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
  Shield,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
  UserCog,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  Zap,
  Store,
  Smartphone,
  KeyRound,
  Sliders,
  Wallet,
  Database,
  Plug,
  AlertTriangle,
  ExternalLink,
  Link2,
  Lock,
} from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  onLogout?: () => void;
  currentUserEmail?: string;
  adminSession?: AdminSession;
}

interface TabNavItem {
  id: AdminTab;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
  isAllowed: boolean;
  isSuperOnly?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onClose,
  onLogout,
  currentUserEmail,
  adminSession,
}) => {
  const effectiveSession: AdminSession = adminSession || {
    role: 'super_admin',
    email: currentUserEmail || ADMIN_EMAIL,
  };
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isSuperAdmin = effectiveSession.role === 'super_admin';
  const staffData = effectiveSession.staffData;

  // Real-time State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings>(INITIAL_PAYMENT_SETTINGS);
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
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; provider: string; message: string; userCount?: number; databaseName?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbUrlInput, setDbUrlInput] = useState('');
  const [isSavingDbUrl, setIsSavingDbUrl] = useState(false);

  const checkDbAndRefresh = async () => {
    setIsRefreshing(true);
    try {
      const status = await adminApi.getDbStatus();
      setDbStatus(status);
      const latestUsers = await adminApi.getUsers();
      if (latestUsers && latestUsers.length > 0) {
        setUsers(latestUsers);
      }
      showToast(status.connected ? `✅ Neon PostgreSQL থেকে ${latestUsers.length} জন ইউজার লোড হয়েছে!` : '⚠️ ইন-মেমোরি মোড: DATABASE_URL কনফিগার করুন');
    } catch (err: any) {
      showToast('❌ ডাটাবেজ রিফ্রেশ করতে সমস্যা হয়েছে');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConnectDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrlInput.trim()) {
      showToast('অনুগ্রহ করে আপনার Neon Database Connection String দিন');
      return;
    }

    setIsSavingDbUrl(true);
    try {
      const res = await adminApi.setDatabaseUrl(dbUrlInput.trim());
      showToast(res.message || '✅ ডাটাবেজ সফলভাবে সংযুক্ত হয়েছে!');
      setIsDbModalOpen(false);
      setDbUrlInput('');
      await checkDbAndRefresh();
    } catch (err: any) {
      showToast(`❌ ডাটাবেজ কানেকশন ব্যর্থ: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSavingDbUrl(false);
    }
  };

  // Subscriptions
  useEffect(() => {
    adminApi.getDbStatus().then(setDbStatus).catch(() => {});
    const unsubUsers = subscribeToAdminUsers(setUsers);
    const unsubPayments = subscribeToAdminPayments(setPayments);
    const unsubPaymentSettings = subscribeToPaymentSettings(setPaymentSettings);
    const unsubNotifs = subscribeToAdminNotifications(setNotifications);
    const unsubAnn = subscribeToAnnouncements(setAnnouncements);
    const unsubConfig = subscribeToAppUpdateConfig((cfg) => {
      if (cfg) setAppConfig(cfg);
    });
    const unsubLogs = subscribeToActivityLogs(setLogs);
    const unsubSupport = subscribeToAllSupportThreads(setSupportThreads);
    const unsubStaff = isSuperAdmin ? subscribeToStaffMembers(setStaffList) : () => {};

    return () => {
      unsubUsers();
      unsubPayments();
      unsubPaymentSettings();
      unsubNotifs();
      unsubAnn();
      unsubConfig();
      unsubLogs();
      unsubSupport();
      unsubStaff();
    };
  }, [isSuperAdmin]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const clientUsers = users.filter(
    (u) =>
      u.role !== 'super_admin' &&
      u.id !== 'usr_super_admin' &&
      u.email !== 'siftibrahim@gmail.com' &&
      u.email !== 'admin@twing.com' &&
      u.shopName !== 'সুপার অ্যাডমিন ড্যাশবোর্ড'
  );

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const expiredCount = clientUsers.filter((u) => u.subscriptionExpiresAt <= Date.now() || u.status === 'expired').length;
  const unreadSupportCount = supportThreads.reduce((acc, t) => acc + (t.unreadAdminCount || 0), 0);

  // Horizontal Tab Bar Items
  const navTabs: TabNavItem[] = [
    {
      id: 'dashboard',
      label: 'সার্বিক ড্যাশবোর্ড',
      icon: LayoutDashboard,
      isAllowed: true,
    },
    {
      id: 'payment_settings',
      label: 'পেমেন্ট গেটওয়ে সেটিংস',
      icon: Wallet,
      isAllowed: isSuperAdmin,
      isSuperOnly: true,
    },
    {
      id: 'sms_gateway',
      label: 'এসএমএস ও ওটিপি গেটওয়ে',
      icon: Smartphone,
      isAllowed: isSuperAdmin,
      isSuperOnly: true,
    },
    {
      id: 'super_admin_security',
      label: 'অ্যাডমিন সিকিউরিটি ও জিমেইল',
      icon: KeyRound,
      isAllowed: isSuperAdmin,
      isSuperOnly: true,
    },
    {
      id: 'staff_management',
      label: `স্টাফ ম্যানেজমেন্ট (${staffList.length})`,
      icon: Shield,
      badge: staffList.length > 0 ? staffList.length : undefined,
      badgeColor: 'bg-rose-600 text-white',
      isAllowed: isSuperAdmin,
      isSuperOnly: true,
    },
    {
      id: 'users',
      label: 'ইউজার তালিকা',
      icon: Users,
      badge: clientUsers.length > 0 ? clientUsers.length : undefined,
      badgeColor: 'bg-indigo-600 text-white',
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'users_view'),
    },
    {
      id: 'payments',
      label: 'পেমেন্ট রিকোয়েস্ট',
      icon: Receipt,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-black animate-pulse',
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'payments_view'),
    },
    {
      id: 'expired',
      label: 'মেয়াদ মনিটরিং',
      icon: Clock,
      badge: expiredCount > 0 ? expiredCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'subscriptions_view'),
    },
    {
      id: 'subscriptions',
      label: 'সাবস্ক্রিপশন প্যাকেজ',
      icon: CreditCard,
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'subscriptions_view'),
    },
    {
      id: 'support',
      label: 'সাপোর্ট হেল্পডেস্ক',
      icon: Headphones,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
      badgeColor: 'bg-teal-500 text-slate-950 font-black',
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'support_view'),
    },
    {
      id: 'notifications',
      label: 'পুশ নোটিফিকেশন',
      icon: Bell,
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'notifications_manage'),
    },
    {
      id: 'announcements',
      label: 'নোটিশ ও ব্যানার',
      icon: Megaphone,
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'announcements_manage'),
    },
    {
      id: 'app_update',
      label: 'ভার্সন ও আপডেট',
      icon: DownloadCloud,
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'app_update_manage'),
    },
    {
      id: 'activity_logs',
      label: 'অডিট লগ',
      icon: History,
      isAllowed: isSuperAdmin || hasStaffPermission(effectiveSession, 'activity_logs_view'),
    },
  ];

  // If activeTab is forbidden for current staff, auto switch to dashboard
  useEffect(() => {
    const isCurrentTabAllowed = navTabs.find((item) => item.id === activeTab)?.isAllowed;
    if (!isCurrentTabAllowed) {
      setActiveTab('dashboard');
    }
  }, [activeTab, effectiveSession]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120] text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl border border-indigo-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 👑 Top Header Bar (Clean, elegant & fully responsive) */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 flex items-center justify-between bg-[#080D1A] border-b border-slate-800/90 shadow-md gap-2 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Gradient Shield Icon */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white leading-tight truncate">
              Twing Admin Master
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-0.5 truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
              সকল দোকান, স্টাফ, পেমেন্ট ও ব্যাকএন্ড প্রশাসন
            </p>
          </div>
        </div>

        {/* Right Section: Super Admin Gold Pill, Store Switch & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Neon DB Status & Connect/Refresh Button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsDbModalOpen(true)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 ${
                dbStatus?.connected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse'
              }`}
              title="Neon PostgreSQL ডাটাবেজ কনফিগারেশন"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">
                {dbStatus?.connected ? `Neon PG (${users.length})` : '🔌 ডাটাবেজ কানেক্ট'}
              </span>
            </button>

            <button
              type="button"
              onClick={checkDbAndRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer active:scale-95 shrink-0"
              title="ডাটাবেজ রিফ্রেশ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : 'text-slate-300'}`} />
            </button>
          </div>

          {isSuperAdmin ? (
            <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-600/15 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1 sm:gap-1.5 shadow-xs shrink-0">
              <span className="text-xs sm:text-sm">👑</span>
              <div className="flex flex-col text-left">
                <span className="text-[8px] sm:text-[9px] leading-none uppercase tracking-wider text-amber-300/80">Super</span>
                <span className="text-[10px] sm:text-[11px] leading-tight font-black text-amber-300">Admin</span>
              </div>
            </div>
          ) : (
            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-none">{staffData?.name || 'Staff'}</span>
            </div>
          )}

          {/* Red-accented Logout button */}
          <button
            type="button"
            onClick={onLogout || onClose}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600 active:scale-95 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1 sm:gap-1.5 transition cursor-pointer text-xs font-bold shadow-xs shrink-0"
            title="খাতা অ্যাপ থেকে সম্পূর্ণ লগআউট করুন"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline text-xs">লগআউট</span>
          </button>
        </div>
      </header>

      {/* 🧭 Horizontal Smooth Scrollable Tabs (Matching screenshot layout) */}
      <div className="bg-[#080D1A] border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 px-4">
          {navTabs
            .filter((tab) => tab.isAllowed)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        tab.badgeColor || (isActive ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-200')
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Dynamic Tab Content Workspace */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <AdminDashboardOverview
              users={clientUsers}
              payments={payments}
              notifications={notifications}
              announcements={announcements}
              logs={logs}
              staffList={staffList}
              supportThreads={supportThreads}
              isSuperAdmin={isSuperAdmin}
              onNavigateTab={(tab) => {
                const targetAllowed = navTabs.find((n) => n.id === tab)?.isAllowed;
                if (targetAllowed) {
                  setActiveTab(tab);
                } else {
                  showToast('⚠️ এই ফিচারটিতে আপনার স্টাফ অ্যাকাউন্ট থেকে অনুমতি নেই');
                }
              }}
              onApprovePayment={(id) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ পেমেন্ট অনুমোদনের পারমিশন আপনার অ্যাকাউন্টে নেই');
                  return;
                }
                approvePayment(id);
              }}
              onRejectPayment={(id) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ পেমেন্ট বাতিলের পারমিশন আপনার অ্যাকাউন্টে নেই');
                  return;
                }
                rejectPayment(id, 'টাকা জমা হয়নি');
              }}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementTab
              users={clientUsers}
              dbStatus={dbStatus}
              onOpenDbModal={() => setIsDbModalOpen(true)}
              onRefreshDb={checkDbAndRefresh}
              onSaveUser={saveAppUser}
              onUpdateStatus={updateUserStatus}
              onExtendSubscription={extendUserSubscription}
              onSendNotificationToUser={(uid, title, msg) =>
                sendAdminNotification({
                  id: 'notif_' + Date.now(),
                  title,
                  message: msg,
                  type: 'general',
                  target: 'specific',
                  targetUserId: uid,
                  priority: 'high',
                  createdAt: Date.now(),
                  isRead: false,
                })
              }
              onDeleteUser={deleteAppUser}
              onResetPassword={triggerUserPasswordReset}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionManagementTab
              users={clientUsers}
              onExtendSubscription={extendUserSubscription}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagementTab
              payments={payments}
              users={clientUsers}
              paymentSettings={paymentSettings}
              onApprovePayment={async (id, note) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ পেমেন্ট অনুমোদনের পারমিশন আপনার অ্যাকাউন্টে নেই');
                  return;
                }
                await approvePayment(id, note);
              }}
              onRejectPayment={async (id, reason) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ পেমেন্ট বাতিলের পারমিশন আপনার অ্যাকাউন্টে নেই');
                  return;
                }
                await rejectPayment(id, reason);
              }}
              onProcessRefund={async (id, status, reason, amount) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ রিফান্ড প্রসেস করার পারমিশন আপনার অ্যাকাউন্টে নেই');
                  return;
                }
                await processPaymentRefund(id, status, reason, amount);
              }}
              onAddManualPayment={async (payment) => {
                if (!isSuperAdmin && !hasStaffPermission(effectiveSession, 'payments_approve_reject')) {
                  showToast('⚠️ অফলাইন পেমেন্ট এন্ট্রি করার পারমিশন নেই');
                  return;
                }
                await savePaymentRecord(payment);
              }}
              onDeletePayment={async (id) => {
                if (!isSuperAdmin) {
                  showToast('⚠️ শুধুমাত্র সুপার অ্যাডমিন পেমেন্ট রেকর্ড মুছতে পারবেন');
                  return;
                }
                await deletePaymentRecord(id);
              }}
              onSavePaymentSettings={async (newSettings) => {
                if (!isSuperAdmin) {
                  showToast('⚠️ শুধুমাত্র সুপার অ্যাডমিন পেমেন্ট মেথড কনফিগার করতে পারবেন');
                  return;
                }
                await savePaymentSettingsToCloud(newSettings, effectiveSession.email || currentUserEmail);
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'expired' && (
            <ExpiredUsersTab
              users={clientUsers}
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
              currentUserEmail={effectiveSession.email || currentUserEmail}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationManagementTab
              notifications={notifications}
              users={clientUsers}
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

          {activeTab === 'payment_settings' && isSuperAdmin && (
            <PaymentSettingsTab
              settings={paymentSettings}
              onSaveSettings={async (newSettings) => {
                await savePaymentSettingsToCloud(newSettings, effectiveSession.email || currentUserEmail);
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'sms_gateway' && isSuperAdmin && (
            <SmsGatewayTab onShowToast={showToast} />
          )}

          {activeTab === 'super_admin_security' && isSuperAdmin && (
            <SuperAdminSecurityTab
              currentUserEmail={effectiveSession.email || currentUserEmail}
              onShowToast={showToast}
              onUpdateEmailSuccess={(newEmail) => {
                showToast(`✅ সুপার অ্যাডমিন জিমেইল আপডেট হয়েছে: ${newEmail}`);
              }}
            />
          )}

          {activeTab === 'staff_management' && isSuperAdmin && (
            <StaffManagementTab
              staffList={staffList}
              onSaveStaff={(staffData) => saveStaffMember(staffData, effectiveSession.email)}
              onUpdateStatus={(staffId, status) => updateStaffStatus(staffId, status, effectiveSession.email)}
              onUpdatePermissions={(staffId, perms) => updateStaffPermissions(staffId, perms, effectiveSession.email)}
              onDeleteStaff={(staffId) => deleteStaffMember(staffId, effectiveSession.email)}
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
        </div>
      </main>

      {/* 🔌 Neon PostgreSQL Database Connection Modal */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#101A2D] border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white leading-tight flex items-center gap-2">
                    Neon PostgreSQL ডাটাবেজ সেটিংস
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    আপনার আসল ইউজার ও লাইভ ডাটা লোড করার জন্য কানেক্ট করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDbModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Current Status Box */}
              <div
                className={`p-4 rounded-2xl border ${
                  dbStatus?.connected
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {dbStatus?.connected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>সফলভাবে সংযুক্ত (Connected)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>কানেক্টেড নয় (ইন-মেমোরি মোড)</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 font-semibold">
                    {dbStatus?.provider || 'In-Memory'}
                  </span>
                </div>
                <p className="text-xs mt-2 text-slate-300 leading-relaxed">
                  {dbStatus?.message}
                </p>
                {dbStatus?.databaseName && (
                  <div className="mt-2 text-xs flex gap-4 text-slate-400 pt-2 border-t border-slate-800">
                    <span>ডাটাবেজ: <strong className="text-white">{dbStatus.databaseName}</strong></span>
                    <span>ইউজার সংখ্যা: <strong className="text-emerald-400">{users.length} জন</strong></span>
                  </div>
                )}
              </div>

              {/* Instructions Box */}
              <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-300">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>কীভাবে Neon Connection String পাবেন?</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed">
                  <li>আপনার <strong className="text-indigo-300">console.neon.tech</strong> ড্যাশবোর্ডে যান।</li>
                  <li>আপনার প্রজেক্টের <strong className="text-white">Connection Details</strong> থেকে <strong className="text-white">Connection string</strong> কপি করুন।</li>
                  <li>নিচের বক্সে পেস্ট করে <strong className="text-emerald-400">"ডাটাবেজ কানেক্ট করুন"</strong> বাটনে চাপুন।</li>
                </ol>
              </div>

              {/* Input Form */}
              <form onSubmit={handleConnectDatabase} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Neon PostgreSQL Connection URL:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dbUrlInput}
                      onChange={(e) => setDbUrlInput(e.target.value)}
                      placeholder="postgresql://neondb_owner:password@ep-cold-bread-....neon.tech/neondb?sslmode=require"
                      className="w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-mono text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    নিরাপদ SSL এনক্রিপশনের মাধ্যমে এটি সংরক্ষণ হবে এবং সাথে সাথে ইউজার লোড করবে।
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDbModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDbUrl || !dbUrlInput.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
                  >
                    {isSavingDbUrl ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>কানেকশন চেক হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Plug className="w-4 h-4" />
                        <span>🔌 ডাটাবেজ কানেক্ট করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
