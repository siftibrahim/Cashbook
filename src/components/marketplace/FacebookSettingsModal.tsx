import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Lock,
  Eye,
  Bell,
  Palette,
  Store,
  UserX,
  LogOut,
  Smartphone,
  Save,
  Check,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Download,
  Trash2,
  Sparkles,
  Camera,
  Moon,
  Sun,
  Volume2,
  Truck,
  CreditCard,
  Plus,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Upload,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import {
  marketplaceSocialService,
  validateImageFiles,
  fileToBase64,
} from '../../services/marketplaceSocialService';
import { playPaymentChime } from '../../utils/audio';

interface FacebookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: CustomerProfile;
  onProfileUpdated: (updated: CustomerProfile) => void;
  onOpenVerificationModal?: () => void;
  onLogout: () => void;
}

type SettingsTab =
  | 'profile'
  | 'verification'
  | 'security'
  | 'privacy'
  | 'seller_payment'
  | 'blocking'
  | 'notifications'
  | 'marketplace'
  | 'appearance'
  | 'account';

const BD_CITIES = [
  'ঢাকা',
  'চট্টগ্রাম',
  'সিলেট',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'রংপুর',
  'ময়মনসিংহ',
  'কুমিল্লা',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
];

export const FacebookSettingsModal: React.FC<FacebookSettingsModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated,
  onOpenVerificationModal,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');

  // 1. Profile Form
  const [name, setName] = useState(currentProfile.name || '');
  const [username, setUsername] = useState(currentProfile.username || '');
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [phone, setPhone] = useState(currentProfile.phone || '');
  const [location, setLocation] = useState(currentProfile.location || 'ঢাকা');
  const [address, setAddress] = useState(currentProfile.address || '');
  const [avatar, setAvatar] = useState(currentProfile.avatar || '');
  const [coverPhoto, setCoverPhoto] = useState(currentProfile.coverPhoto || '');

  // 2. Verification state
  const [isVerifiedBadge, setIsVerifiedBadge] = useState(currentProfile.isVerified || false);
  const [docType, setDocType] = useState('nid');
  const [docNumber, setDocNumber] = useState('');
  const [docFrontPhoto, setDocFrontPhoto] = useState('');
  const [selfiePhoto, setSelfiePhoto] = useState('');

  // 3. Password & Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentProfile.twoFactorEnabled || false);
  const [twoFactorPin, setTwoFactorPin] = useState(currentProfile.twoFactorPin || '123456');
  const [activeSessions, setActiveSessions] = useState(currentProfile.activeSessions || [
    {
      id: 'sess_cur',
      deviceName: 'এই ব্রাউজার (Chrome / Windows)',
      ip: '103.114.98.22',
      loginAt: 'আজ, সক্রিয়',
      isCurrent: true,
    },
  ]);

  // 4. Privacy
  const [postVisibility, setPostVisibility] = useState<'public' | 'friends' | 'only_me'>(
    currentProfile.privacySettings?.postVisibility || 'public'
  );
  const [requestVisibility, setRequestVisibility] = useState<'everyone' | 'friends_of_friends'>(
    currentProfile.privacySettings?.requestVisibility || 'everyone'
  );
  const [showPhone, setShowPhone] = useState(currentProfile.privacySettings?.showPhone !== false);
  const [activeStatus, setActiveStatus] = useState(currentProfile.privacySettings?.activeStatus !== false);

  // 5. Blocking
  const [userToBlock, setUserToBlock] = useState('');

  // 6. Notifications
  const [messageSound, setMessageSound] = useState(
    currentProfile.notificationSettings?.messageSound !== false
  );
  const [commentAlerts, setCommentAlerts] = useState(
    currentProfile.notificationSettings?.comments !== false
  );
  const [orderAlerts, setOrderAlerts] = useState(
    currentProfile.notificationSettings?.orders !== false
  );
  const [soundVolume, setSoundVolume] = useState(
    currentProfile.notificationSettings?.soundVolume ?? 80
  );

  // 7. Marketplace & Commerce
  const [preferredPayment, setPreferredPayment] = useState<'cod' | 'bkash' | 'nagad' | 'rocket' | 'card'>(
    currentProfile.marketplaceSettings?.preferredPayment || 'cod'
  );
  const [defaultShippingAddress, setDefaultShippingAddress] = useState(
    currentProfile.marketplaceSettings?.defaultShippingAddress || currentProfile.address || ''
  );
  const [deliveryRegion, setDeliveryRegion] = useState<'dhaka_inside' | 'dhaka_outside' | 'nationwide'>(
    currentProfile.marketplaceSettings?.deliveryRegion || 'dhaka_inside'
  );
  const [smsTrackingAlerts, setSmsTrackingAlerts] = useState(
    currentProfile.marketplaceSettings?.smsTrackingAlerts !== false
  );
  const [oneClickBuy, setOneClickBuy] = useState(
    currentProfile.marketplaceSettings?.oneClickBuy ?? true
  );
  const [riderDeliveryNote, setRiderDeliveryNote] = useState(
    currentProfile.marketplaceSettings?.riderDeliveryNote || ''
  );

  // 7.1 Seller Product Payment Settings
  const [sellerPayments, setSellerPayments] = useState(
    currentProfile.sellerPaymentSettings || {
      acceptsBkash: true,
      bkashNumber: currentProfile.phone || '',
      bkashType: 'personal' as 'personal' | 'merchant',
      acceptsNagad: true,
      nagadNumber: currentProfile.phone || '',
      nagadType: 'personal' as 'personal' | 'merchant',
      acceptsRocket: false,
      rocketNumber: '',
      acceptsBank: false,
      bankName: '',
      bankBranch: '',
      bankAccountName: currentProfile.name || '',
      bankAccountNumber: '',
      acceptsCod: true,
      instructions: 'বিকাশ বা নগদে সেন্ড মানি করার পর রেফারেন্সে আপনার নাম বা মোবাইল নম্বর দিন।',
    }
  );

  // 8. Appearance & Theme
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'blue'>(() => {
    return (localStorage.getItem('twing_marketplace_theme') as any) || currentProfile.appearanceSettings?.theme || 'light';
  });
  const [fontSize, setFontSize] = useState<'normal' | 'medium' | 'large'>(
    currentProfile.appearanceSettings?.fontSize || 'normal'
  );
  const [appLanguage, setAppLanguage] = useState<'bn' | 'en'>(
    currentProfile.appearanceSettings?.language || (localStorage.getItem('twing_marketplace_lang') as any) || 'bn'
  );

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  // Modals inside settings
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const docFrontInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever currentProfile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(currentProfile.name || '');
      setUsername(currentProfile.username || '');
      setBio(currentProfile.bio || '');
      setPhone(currentProfile.phone || '');
      setLocation(currentProfile.location || 'ঢাকা');
      setAddress(currentProfile.address || '');
      setAvatar(currentProfile.avatar || '');
      setCoverPhoto(currentProfile.coverPhoto || '');

      setIsVerifiedBadge(currentProfile.isVerified || false);

      setTwoFactorEnabled(currentProfile.twoFactorEnabled || false);
      setTwoFactorPin(currentProfile.twoFactorPin || '123456');

      setPostVisibility(currentProfile.privacySettings?.postVisibility || 'public');
      setRequestVisibility(currentProfile.privacySettings?.requestVisibility || 'everyone');
      setShowPhone(currentProfile.privacySettings?.showPhone !== false);
      setActiveStatus(currentProfile.privacySettings?.activeStatus !== false);

      setMessageSound(currentProfile.notificationSettings?.messageSound !== false);
      setCommentAlerts(currentProfile.notificationSettings?.comments !== false);
      setOrderAlerts(currentProfile.notificationSettings?.orders !== false);
      setSoundVolume(currentProfile.notificationSettings?.soundVolume ?? 80);

      setPreferredPayment(currentProfile.marketplaceSettings?.preferredPayment || 'cod');
      setDefaultShippingAddress(currentProfile.marketplaceSettings?.defaultShippingAddress || currentProfile.address || '');
      setDeliveryRegion(currentProfile.marketplaceSettings?.deliveryRegion || 'dhaka_inside');
      setSmsTrackingAlerts(currentProfile.marketplaceSettings?.smsTrackingAlerts !== false);
      setOneClickBuy(currentProfile.marketplaceSettings?.oneClickBuy ?? true);
      setRiderDeliveryNote(currentProfile.marketplaceSettings?.riderDeliveryNote || '');

      const storedTheme = (localStorage.getItem('twing_marketplace_theme') as any) || currentProfile.appearanceSettings?.theme || 'light';
      setThemeMode(storedTheme);
      setFontSize(currentProfile.appearanceSettings?.fontSize || 'normal');
      setAppLanguage(currentProfile.appearanceSettings?.language || (localStorage.getItem('twing_marketplace_lang') as any) || 'bn');

      setFeedbackError('');
      setFeedbackSuccess('');
      setMobileView('menu');
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setFeedbackSuccess(msg);
    setFeedbackError('');
    playPaymentChime();
    setTimeout(() => setFeedbackSuccess(''), 4500);
  };

  const showError = (msg: string) => {
    setFeedbackError(msg);
    setFeedbackSuccess('');
  };

  // Avatar upload handler
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const b64 = await fileToBase64(files[0]);
      setAvatar(b64);
      showSuccess('✅ প্রোফাইল ছবি নির্বাচন করা হয়েছে! পরিবর্তন নিশ্চিত করতে সেভ বাটনে ক্লিক করুন।');
    } catch (err: any) {
      showError('ছবি প্রসেসিংয়ে সমস্যা হয়েছে।');
    }
  };

  // Cover photo upload handler
  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const b64 = await fileToBase64(files[0]);
      setCoverPhoto(b64);
      showSuccess('✅ কভার ছবি নির্বাচন করা হয়েছে!');
    } catch (err: any) {
      showError('কভার ছবি প্রসেসিংয়ে সমস্যা হয়েছে।');
    }
  };

  // 1. SAVE GENERAL PROFILE
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showError('পূর্ণ নাম লিখুন');
      return;
    }
    setIsSaving(true);
    try {
      let cleanU = username.trim();
      if (!cleanU.startsWith('@') && cleanU.length > 0) {
        cleanU = `@${cleanU}`;
      }

      const updated = marketplaceSocialService.updateCurrentProfile({
        name: name.trim(),
        username: cleanU || `@user_${Date.now().toString().slice(-4)}`,
        bio: bio.trim(),
        phone: phone.trim(),
        location: location.trim(),
        address: address.trim(),
        avatar: avatar || currentProfile.avatar,
        coverPhoto: coverPhoto || currentProfile.coverPhoto,
      });

      await marketplaceSocialService.syncProfileToServer({
        name: updated.name,
        username: updated.username,
        bio: updated.bio,
        phone: updated.phone,
        location: updated.location,
        address: updated.address,
        avatar: updated.avatar,
        coverPhoto: updated.coverPhoto,
      });

      onProfileUpdated(updated);
      showSuccess('✅ প্রোফাইল তথ্য এবং ছবি সফলভাবে সেভ হয়েছে!');
    } catch (err: any) {
      showError(err.message || 'সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. TOGGLE INSTANT BLUE BADGE VERIFICATION
  const handleToggleInstantBlueBadge = async (enable: boolean) => {
    setIsSaving(true);
    try {
      const updated = marketplaceSocialService.updateCurrentProfile({
        isVerified: enable,
        verificationStatus: enable ? 'verified' : 'unverified',
        verificationData: enable
          ? {
              docType: docType || 'National NID',
              docNumber: docNumber || '1998269123456789',
              fullName: name,
              verifiedAt: new Date().toISOString(),
              status: 'verified',
            }
          : undefined,
      });

      await marketplaceSocialService.syncProfileToServer({
        isVerified: enable,
        verificationStatus: enable ? 'verified' : 'unverified',
      });

      setIsVerifiedBadge(enable);
      onProfileUpdated(updated);

      if (enable) {
        showSuccess('🎉 অভিনন্দন! অফিসিয়াল মেটা ভেরিফাইড ব্লু ব্যাজ সফলভাবে সক্রিয় হয়েছে!');
      } else {
        showSuccess('ব্লু ব্যাজ নিষ্ক্রিয় করা হয়েছে।');
      }
    } catch (err: any) {
      showError(err.message || 'ভেরিফিকেশন আপডেট ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. CHANGE PASSWORD
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না!');
      return;
    }
    setIsSaving(true);
    try {
      const res = await marketplaceSocialService.changePassword(
        currentPassword || '123456',
        newPassword
      );
      if (res.success) {
        showSuccess('🔒 পাসওয়ার্ড সফলভাবে পরিবর্তিত ও সুরক্ষিত হয়েছে!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(res.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      showError(err.message || 'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. SAVE SECURITY & 2FA
  const handleSaveSecurity = async () => {
    if (twoFactorEnabled && (!twoFactorPin || twoFactorPin.length < 4)) {
      showError('২-ফ্যাক্টর সিক্রেট পিন কমপক্ষে ৪-৬ ডিজিটের হতে হবে!');
      return;
    }
    setIsSaving(true);
    try {
      const updated = marketplaceSocialService.updateCurrentProfile({
        twoFactorEnabled,
        twoFactorPin: twoFactorEnabled ? twoFactorPin : undefined,
      });
      await marketplaceSocialService.syncProfileToServer({
        twoFactorEnabled,
        twoFactorPin: twoFactorEnabled ? twoFactorPin : undefined,
      });
      onProfileUpdated(updated);
      showSuccess('🛡️ ২-ফ্যাক্টর নিরাপত্তা সেটিংস সফলভাবে আপডেট হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  // Terminate other sessions
  const handleTerminateOtherSessions = () => {
    const curSession = activeSessions.filter((s) => s.isCurrent);
    setActiveSessions(curSession.length ? curSession : [
      {
        id: 'sess_cur',
        deviceName: 'এই ব্রাউজার (Chrome / Windows)',
        ip: '103.114.98.22',
        loginAt: 'আজ, সক্রিয়',
        isCurrent: true,
      },
    ]);
    showSuccess('অন্যান্য সব ডিভাইস ও সেশন সফলভাবে লগআউট করা হয়েছে!');
  };

  // 5. SAVE PRIVACY
  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      const privacySettings = {
        postVisibility,
        requestVisibility,
        showPhone,
        activeStatus,
      };
      const updated = marketplaceSocialService.updateCurrentProfile({ privacySettings });
      await marketplaceSocialService.syncProfileToServer({ privacySettings });
      onProfileUpdated(updated);
      showSuccess('👁️ গোপনীয়তা সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. BLOCK / UNBLOCK USERS
  const handleUnblock = (targetUserId: string) => {
    const updated = marketplaceSocialService.unblockUser(targetUserId);
    onProfileUpdated(updated);
    showSuccess('ইউজারকে আনব্লক করা হয়েছে');
  };

  const handleBlockUser = () => {
    if (!userToBlock.trim()) {
      showError('ব্লক করার জন্য ইউজার নির্বাচন করুন');
      return;
    }
    const updated = marketplaceSocialService.blockUser(userToBlock.trim());
    onProfileUpdated(updated);
    setUserToBlock('');
    showSuccess('ইউজারকে ব্লকলিস্টে যুক্ত করা হয়েছে!');
  };

  // 7. SAVE NOTIFICATIONS & SOUND
  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const notificationSettings = {
        messageSound,
        comments: commentAlerts,
        orders: orderAlerts,
        soundVolume,
      };
      const updated = marketplaceSocialService.updateCurrentProfile({ notificationSettings });
      await marketplaceSocialService.syncProfileToServer({ notificationSettings });
      localStorage.setItem('twing_sound_enabled', messageSound ? 'true' : 'false');
      onProfileUpdated(updated);
      showSuccess('🔔 নোটিফিকেশন ও সাউন্ড প্রেফারেন্স সংরক্ষিত হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSound = () => {
    playPaymentChime();
    showSuccess('🔊 নোটিফিকেশন সাউন্ড বাজানো হলো!');
  };

  // 8. SAVE MARKETPLACE SETTINGS
  const handleSaveMarketplaceSettings = async () => {
    setIsSaving(true);
    try {
      const marketplaceSettings = {
        preferredPayment,
        defaultShippingAddress: defaultShippingAddress.trim() || address.trim(),
        deliveryRegion,
        smsTrackingAlerts,
        oneClickBuy,
        riderDeliveryNote: riderDeliveryNote.trim(),
      };
      const updated = marketplaceSocialService.updateCurrentProfile({ marketplaceSettings });
      await marketplaceSocialService.syncProfileToServer({ marketplaceSettings });

      localStorage.setItem(
        'twing_marketplace_buyer_settings',
        JSON.stringify(marketplaceSettings)
      );

      onProfileUpdated(updated);
      showSuccess('🛍️ মার্কেটপ্লেস ও ডেলিভারি সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  // 9. SAVE APPEARANCE & THEME
  const handleApplyTheme = (mode: 'light' | 'dark' | 'blue') => {
    setThemeMode(mode);
    localStorage.setItem('twing_marketplace_theme', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', mode);
    window.dispatchEvent(new CustomEvent('twing_theme_changed', { detail: mode }));
    showSuccess(`🎨 "${mode === 'light' ? 'লাইট' : mode === 'dark' ? 'ডার্ক' : 'ফেসবুক ব্লু'}" থিম সক্রিয় করা হয়েছে!`);
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('twing_marketplace_theme', themeMode);
      localStorage.setItem('twing_marketplace_lang', appLanguage);
      document.documentElement.setAttribute('data-font-size', fontSize);

      const appearanceSettings = {
        theme: themeMode,
        fontSize,
        language: appLanguage,
      };
      const updated = marketplaceSocialService.updateCurrentProfile({ appearanceSettings });
      await marketplaceSocialService.syncProfileToServer({ appearanceSettings });
      onProfileUpdated(updated);
      showSuccess('✨ থিম ও ডিসপ্লে সেটিংস সংরক্ষিত হয়েছে!');
    } finally {
      setIsSaving(false);
    }
  };

  // 9.1 SAVE SELLER PAYMENT SETTINGS
  const handleSaveSellerPayment = async () => {
    setIsSaving(true);
    try {
      const updated = marketplaceSocialService.updateCurrentProfile({
        sellerPaymentSettings: sellerPayments,
      });
      await marketplaceSocialService.syncProfileToServer({
        sellerPaymentSettings: sellerPayments,
      });
      onProfileUpdated(updated);
      playPaymentChime();
      showSuccess('🎉 পণ্য বিক্রয়ের পেমেন্ট মেথড সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err: any) {
      showError(err.message || 'পেমেন্ট মেথড সেভ ব্যর্থ হয়েছে');
    } finally {
      setIsSaving(false);
    }
  };

  // 10. DOWNLOAD DATA BACKUP
  const handleDownloadBackup = () => {
    const fullBackup = {
      profile: currentProfile,
      savedAt: new Date().toISOString(),
      app: 'TWING Central Marketplace',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `twing_profile_${currentProfile.username || 'user'}_backup.json`);
    dlAnchor.click();
    showSuccess('আপনার অ্যাকাউন্ট ডাটা JSON ফাইল হিসেবে ডাউনলোড হয়েছে!');
  };

  // 11. RESET CACHE
  const handleResetData = () => {
    localStorage.removeItem('twing_marketplace_cart');
    localStorage.removeItem('twing_marketplace_wishlist');
    setShowResetConfirm(false);
    showSuccess('মার্কেটপ্লেস ক্যাশ ও অস্থায়ী ডাটা সফলভাবে রিসেট হয়েছে!');
  };

  const navItems = [
    { id: 'profile', label: 'প্রোফাইল তথ্য ও ছবি', icon: User },
    {
      id: 'verification',
      label: 'আইডি ভেরিফিকেশন (Blue Badge)',
      icon: ShieldCheck,
      badge: isVerifiedBadge ? 'Active' : 'Get Badge',
    },
    { id: 'security', label: 'পাসওয়ার্ড ও নিরাপত্তা (2FA)', icon: Lock },
    { id: 'privacy', label: 'গোপনীয়তা সেটিংস', icon: Eye },
    {
      id: 'seller_payment',
      label: 'পণ্য বিক্রয় ও পেমেন্ট মেথড',
      icon: CreditCard,
      badge: 'পেমেন্ট গ্রহণ',
    },
    { id: 'marketplace', label: 'মার্কেটপ্লেস ও ডেলিভারি প্রেফারেন্স', icon: Store },
    { id: 'notifications', label: 'নোটিফিকেশন ও সাউন্ড', icon: Bell },
    { id: 'blocking', label: 'ব্লকলিস্ট', icon: UserX },
    { id: 'appearance', label: 'থিম ও ডিসপ্লে (Dark/Light)', icon: Palette },
    { id: 'account', label: 'লগআউট ও অ্যাকাউন্ট পরিচালনা', icon: LogOut, isDanger: true },
  ];

  const directory = marketplaceSocialService.getProfilesDirectory();
  const blockedProfiles = directory.filter((p) => (currentProfile.blockedUserIds || []).includes(p.id));
  const unblockedUsers = directory.filter(
    (p) => p.id !== currentProfile.id && !(currentProfile.blockedUserIds || []).includes(p.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row h-[90vh]">
        
        {/* ======================================================== */}
        {/* LEFT SETTINGS SIDEBAR                                    */}
        {/* ======================================================== */}
        <div className={`w-full md:w-72 bg-slate-50 border-r border-slate-200 flex-col shrink-0 ${
          mobileView === 'menu' ? 'flex flex-1' : 'hidden md:flex'
        }`}>
          
          {/* Header Brand: TWING Central Marketplace (No 'T' logo) */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex flex-col select-none">
              <span className="text-xl font-black text-[#1877F2] tracking-wider leading-none">
                TWING
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">
                Central Marketplace
              </span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                সেটিংস সেন্টার
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-2 space-y-1 overflow-y-auto flex-1 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setMobileView('content');
                    setFeedbackError('');
                    setFeedbackSuccess('');
                  }}
                  className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? item.isDanger
                        ? 'bg-rose-50 text-rose-700 font-black'
                        : 'bg-[#1877F2] text-white shadow-xs font-black'
                      : item.isDanger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                          isActive
                            ? 'bg-white text-blue-700'
                            : 'bg-blue-100 text-[#1877F2]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 md:hidden ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* User mini summary at bottom */}
          <div className="p-3 border-t border-slate-200 bg-white/70 flex items-center gap-2.5">
            <img
              src={avatar || currentProfile.avatar}
              alt={currentProfile.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800 truncate">{currentProfile.name}</span>
                {isVerifiedBadge && <ShieldCheck className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{currentProfile.phone}</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT SETTINGS PANEL CONTENT                             */}
        {/* ======================================================== */}
        <div className={`flex-1 flex-col bg-white overflow-hidden ${
          mobileView === 'content' ? 'flex w-full' : 'hidden md:flex'
        }`}>
          
          {/* Header */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileView('menu')}
                className="md:hidden px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-black shrink-0"
                title="তালিকায় ফিরে যান"
              >
                <ChevronLeft className="w-4 h-4 text-[#1877F2]" />
                <span className="text-[11px]">মেনু</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-black text-slate-800 truncate">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                  সেন্ট্রাল মার্কেটপ্লেস ও প্রোফাইল সেটিংস সক্রিয় করুন
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            
            {/* Feedback Alerts */}
            {feedbackSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{feedbackSuccess}</span>
              </div>
            )}
            {feedbackError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{feedbackError}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* 1. TAB: PROFILE & PHOTOS                                */}
            {/* ======================================================== */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                
                {/* Photo Upload Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">প্রোফাইল ও কভার ছবি</span>
                    <span className="text-[10px] text-slate-400">ক্লিক করে নতুন ছবি আপলোড করুন</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Avatar Preview & Upload */}
                    <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <img
                        src={avatar || currentProfile.avatar}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md group-hover:opacity-80 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                        <Camera className="w-5 h-5" />
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </div>

                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer mx-auto sm:mx-0"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>নতুন প্রোফাইল ছবি আপলোড</span>
                      </button>
                      <p className="text-[11px] text-slate-500">
                        সরাসরি মোবাইল বা কম্পিউটার থেকে যেকোনো ছবি সিলেক্ট করুন
                      </p>
                    </div>

                    {/* Cover Upload Button */}
                    <div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleCoverSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>কভার ছবি পরিবর্তন</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      ইউজারনেম (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">বায়ো / নিজের সম্পর্কে পরিচিতি</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="নিজের পছন্দ, শখ বা পেশা সম্পর্কে কিছু লিখুন..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">শহর / জেলা</label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                    >
                      {BD_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">ডেলিভারি ঠিকানা</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাসা নং, রোড নং, এলাকা..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-hidden focus:bg-white focus:border-[#1877F2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#1877F2] hover:bg-blue-600 active:scale-[0.99] text-white font-black text-xs rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল তথ্য সেভ করুন'}</span>
                </button>
              </form>
            )}

            {/* ======================================================== */}
            {/* 2. TAB: ID VERIFICATION (BLUE BADGE)                    */}
            {/* ======================================================== */}
            {activeTab === 'verification' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <span>অফিসিয়াল মেটা ভেরিফাইড ব্লু ব্যাজ</span>
                        {isVerifiedBadge && (
                          <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        সরকারি স্মার্ট এনআইডি অথবা পাসপোর্ট দিয়ে প্রোফাইল যাচাইকরণ
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-2xl border border-blue-100 text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>বর্তমান অবস্থা:</strong>{' '}
                      {isVerifiedBadge ? (
                        <span className="text-emerald-700 font-black">
                          ✅ ভেরিফাইড (অফিসিয়াল ব্লু ব্যাজ চালু আছে)
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold">
                          ⚠️ এখনো ভেরিফাইড করা হয়নি
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Immediate Toggle for Test / Real Badge */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleInstantBlueBadge(true)}
                      className="px-5 py-2.5 bg-[#1877F2] hover:bg-blue-600 text-white font-black text-xs rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>তাত্ক্ষণিক ব্লু ব্যাজ সক্রিয় করুন (Test Activate)</span>
                    </button>

                    {isVerifiedBadge && (
                      <button
                        type="button"
                        onClick={() => handleToggleInstantBlueBadge(false)}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
                      >
                        ব্যাজ বন্ধ করুন
                      </button>
                    )}
                  </div>
                </div>

                {/* Document submission details */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800">এনআইডি / ডকুমেন্ট জমা</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ডকুমেন্ট টাইপ</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="nid">জাতীয় পরিচয়পত্র (NID)</option>
                        <option value="passport">পাসপোর্ট (Passport)</option>
                        <option value="driving">ড্রাইভিং লাইসেন্স</option>
                        <option value="trade">ট্রেড লাইসেন্স</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">ডকুমেন্ট নম্বর</label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder="যেমন: 1990269123456"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 3. TAB: SECURITY & PASSWORD                             */}
            {/* ======================================================== */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                
                {/* Change Password */}
                <form onSubmit={handleChangePassword} className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-3xl">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#1877F2]" />
                    <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">বর্তমান পাসওয়ার্ড</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="বর্তমান পাসওয়ার্ড (ঐচ্ছিক)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        নতুন পাসওয়ার্ড <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        নিশ্চিত করুন <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="একই পাসওয়ার্ড লিখুন"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-hidden"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    পাসওয়ার্ড আপডেট করুন
                  </button>
                </form>

                {/* 2-Factor Authentication */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        <span>২-ফ্যাক্টর অথেনটিকেশন (2FA PIN কোড)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        লগইনের সময় ৬ ডিজিটের গোপন পিন কোড চাওয়া হবে
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                    />
                  </div>

                  {twoFactorEnabled && (
                    <div className="pt-2 flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700">সিক্রেট ৬ ডিজিট পিন:</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={twoFactorPin}
                        onChange={(e) => setTwoFactorPin(e.target.value.replace(/[^\d]/g, ''))}
                        className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-xs font-black tracking-widest outline-hidden"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveSecurity}
                    className="px-4 py-2 bg-[#1877F2] text-white text-xs font-black rounded-xl transition cursor-pointer"
                  >
                    নিরাপত্তা সেটিংস সেভ করুন
                  </button>
                </div>

                {/* Active Sessions */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>সক্রিয় লগইন সেশন ও ডিভাইস ({activeSessions.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleTerminateOtherSessions}
                      className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      অন্যান্য সেশন সমাপ্ত করুন
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {activeSessions.map((sess) => (
                      <div key={sess.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">{sess.deviceName}</span>
                          <span className="text-[10px] text-slate-500">আইপি: {sess.ip} • {sess.loginAt}</span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          অনলাইন
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 4. TAB: PRIVACY SETTINGS                                */}
            {/* ======================================================== */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      কে আপনার সামাজিক পোস্ট দেখতে পারবে?
                    </label>
                    <select
                      value={postVisibility}
                      onChange={(e) => setPostVisibility(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                    >
                      <option value="public">🌍 পাবলিক (মার্কেটপ্লেসের সবাই দেখতে পাবে)</option>
                      <option value="friends">👥 শুধুমাত্র বন্ধুরা (Friends Only)</option>
                      <option value="only_me">🔒 শুধুমাত্র আমি (Private)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      কে আপনাকে ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে?
                    </label>
                    <select
                      value={requestVisibility}
                      onChange={(e) => setRequestVisibility(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                    >
                      <option value="everyone">সবাই (Everyone)</option>
                      <option value="friends_of_friends">বন্ধুদের বন্ধুরা (Friends of Friends)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        প্রোফাইলে মোবাইল নম্বর প্রদর্শন
                      </span>
                      <span className="text-[11px] text-slate-500">
                        অন্যান্য ইউজাররা যাতে প্রয়োজনে যোগাযোগ করতে পারে
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPhone}
                      onChange={(e) => setShowPhone(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        অ্যাক্টিভ স্ট্যাটাস (Active Now সবুজ বাতি)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        বন্ধুরা দেখতে পাবে আপনি কখন অনলাইনে আছেন
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeStatus}
                      onChange={(e) => setActiveStatus(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSavePrivacy}
                  className="px-6 py-2.5 bg-[#1877F2] text-white font-black text-xs rounded-2xl shadow-sm transition cursor-pointer"
                >
                  গোপনীয়তা সেটিংস সেভ করুন
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* 4.1 TAB: SELLER PAYMENT METHODS (পণ্য বিক্রয় পেমেন্ট)    */}
            {/* ======================================================== */}
            {activeTab === 'seller_payment' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        পণ্য বিক্রয়ের পেমেন্ট মেথড সেটিংস
                      </h4>
                      <p className="text-xs text-slate-600">
                        সেন্ট্রাল মার্কেটপ্লেসে আপনার আপলোডকৃত পণ্যের টাকা ক্রেতার থেকে সরাসরি গ্রহণ করুন
                      </p>
                    </div>
                  </div>
                </div>

                {/* 1. বিকাশ (bKash) Settings */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-black text-xs">
                        বি
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 block">বিকাশ (bKash) পেমেন্ট</span>
                        <span className="text-[11px] text-slate-500">ক্রেতা সরাসরি আপনার বিকাশ নম্বরে টাকা পাঠাতে পারবে</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sellerPayments.acceptsBkash !== false}
                        onChange={(e) =>
                          setSellerPayments((prev: any) => ({ ...prev, acceptsBkash: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>

                  {sellerPayments.acceptsBkash !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          বিকাশ মোবাইল নম্বর *
                        </label>
                        <input
                          type="tel"
                          value={sellerPayments.bkashNumber || ''}
                          onChange={(e) =>
                            setSellerPayments((prev: any) => ({ ...prev, bkashNumber: e.target.value }))
                          }
                          placeholder="০১৭xxxxxxxx"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          অ্যাকাউন্টের ধরন
                        </label>
                        <select
                          value={sellerPayments.bkashType || 'personal'}
                          onChange={(e) =>
                            setSellerPayments((prev: any) => ({ ...prev, bkashType: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-pink-500 cursor-pointer"
                        >
                          <option value="personal">পার্সোনাল (Personal / Send Money)</option>
                          <option value="merchant">মার্চেন্ট (Merchant / Payment)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. নগদ (Nagad) Settings */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                        ন
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 block">নগদ (Nagad) পেমেন্ট</span>
                        <span className="text-[11px] text-slate-500">ক্রেতা আপনার নগদ অ্যাকাউন্টে টাকা পাঠাতে পারবে</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sellerPayments.acceptsNagad !== false}
                        onChange={(e) =>
                          setSellerPayments((prev: any) => ({ ...prev, acceptsNagad: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {sellerPayments.acceptsNagad !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          নগদ মোবাইল নম্বর *
                        </label>
                        <input
                          type="tel"
                          value={sellerPayments.nagadNumber || ''}
                          onChange={(e) =>
                            setSellerPayments((prev: any) => ({ ...prev, nagadNumber: e.target.value }))
                          }
                          placeholder="০১৮xxxxxxxx"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          অ্যাকাউন্টের ধরন
                        </label>
                        <select
                          value={sellerPayments.nagadType || 'personal'}
                          onChange={(e) =>
                            setSellerPayments((prev: any) => ({ ...prev, nagadType: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="personal">পার্সোনাল (Personal / Send Money)</option>
                          <option value="merchant">মার্চেন্ট (Merchant / Payment)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. রকেট (Rocket) Settings */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">
                        র
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 block">রকেট (Rocket) পেমেন্ট</span>
                        <span className="text-[11px] text-slate-500">ডাচ-বাংলা ব্যাংক রকেট ওয়ালেট নম্বর</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sellerPayments.acceptsRocket === true}
                        onChange={(e) =>
                          setSellerPayments((prev: any) => ({ ...prev, acceptsRocket: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {sellerPayments.acceptsRocket && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        রকেট ১২-ডিজিট নম্বর *
                      </label>
                      <input
                        type="tel"
                        value={sellerPayments.rocketNumber || ''}
                        onChange={(e) =>
                          setSellerPayments((prev: any) => ({ ...prev, rocketNumber: e.target.value }))
                        }
                        placeholder="০১৯xxxxxxxxx"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>

                {/* 4. ক্যাশ অন ডেলিভারি (Cash on Delivery) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 block">
                      ক্যাশ অন ডেলিভারি (Cash On Delivery)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ক্রেতা পণ্য হাতে পেয়ে কুরিয়ার বা আপনার কাছে সরাসরি নগদ টাকা দিতে পারবে
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sellerPayments.acceptsCod !== false}
                    onChange={(e) =>
                      setSellerPayments((prev: any) => ({ ...prev, acceptsCod: e.target.checked }))
                    }
                    className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                  />
                </div>

                {/* 5. ক্রেতাদের জন্য পেমেন্ট নির্দেশাবলী */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    ক্রেতাদের জন্য পেমেন্ট নির্দেশাবলী (Payment Instructions)
                  </label>
                  <textarea
                    rows={2}
                    value={sellerPayments.instructions || ''}
                    onChange={(e) =>
                      setSellerPayments((prev: any) => ({ ...prev, instructions: e.target.value }))
                    }
                    placeholder="যেমন: টাকা পাঠানোর পর লাস্ট ৪ ডিজিট মেসেঞ্জারে চ্যাট বক্সে লিখে পাঠান..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1877F2]"
                  />
                  <p className="text-[11px] text-slate-400">
                    এই নির্দেশাবলী আপনার আপলোডকৃত পণ্যের বিস্তারিত পেইজে ক্রেতারা দেখতে পাবেন।
                  </p>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveSellerPayment}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[#1877F2] hover:bg-blue-600 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'পেমেন্ট মেথড সেটিংস সেভ করুন'}</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* 5. TAB: MARKETPLACE & COMMERCE                          */}
            {/* ======================================================== */}
            {activeTab === 'marketplace' && (
              <div className="space-y-4">
                
                {/* Payment Method Selector */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>পছন্দের পেমেন্ট মেথড (Default Payment)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'cod', label: 'ক্যাশ অন ডেলিভারি', icon: '💵' },
                      { id: 'bkash', label: 'বিকাশ (bKash)', icon: '📱' },
                      { id: 'nagad', label: 'নগদ (Nagad)', icon: '⚡' },
                      { id: 'rocket', label: 'রকেট (Rocket)', icon: '🚀' },
                      { id: 'card', label: 'ভিসা/মাস্টারকার্ড', icon: '💳' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreferredPayment(p.id as any)}
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition cursor-pointer ${
                          preferredPayment === p.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span className="text-xs font-bold leading-tight">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shipping & Delivery Area */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>ডেলিভারি প্রেফারেন্স ও এরিয়া</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'dhaka_inside', label: 'ঢাকা সিটির ভেতরে (৳৬০)', sub: '১২-২৪ ঘণ্টা ডেলিভারি' },
                      { id: 'dhaka_outside', label: 'ঢাকা সিটির বাইরে (৳১২০)', sub: '২৪-৪৮ ঘণ্টা ডেলিভারি' },
                      { id: 'nationwide', label: 'সারা বাংলাদেশ (৳১২০)', sub: 'রেডএক্স / সুন্দরবন' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDeliveryRegion(r.id as any)}
                        className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                          deliveryRegion === r.id
                            ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-bold block">{r.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{r.sub}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ডিফল্ট ডেলিভারি পূর্ণ ঠিকানা:
                    </label>
                    <input
                      type="text"
                      value={defaultShippingAddress}
                      onChange={(e) => setDefaultShippingAddress(e.target.value)}
                      placeholder="যেমন: বাড়ি ১২, রোড ৫, সেক্টর ৩, উত্তরা, ঢাকা"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ডেলিভারি রাইডারের জন্য বিশেষ নির্দেশনা:
                    </label>
                    <input
                      type="text"
                      value={riderDeliveryNote}
                      onChange={(e) => setRiderDeliveryNote(e.target.value)}
                      placeholder="যেমন: গেটে এসে কল করবেন / সিকিউরিটির কাছে রাখবেন"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">১-ক্লিক এক্সপ্রেস বাই (1-Click Buy)</span>
                        <span className="text-[10px] text-slate-400">কার্ট ছাড়া সরাসরি এক ক্লিকে অর্ডার প্লেস করুন</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={oneClickBuy}
                        onChange={(e) => setOneClickBuy(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1877F2] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">অর্ডার লাইভ এসএমএস ট্র্যাকিং</span>
                        <span className="text-[10px] text-slate-400">প্রতিটি স্ট্যাটাস আপডেটে মোবাইলে ফ্রি এসএমএস পাবেন</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsTrackingAlerts}
                        onChange={(e) => setSmsTrackingAlerts(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1877F2] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveMarketplaceSettings}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>মার্কেটপ্লেস সেটিংস সেভ করুন</span>
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* 6. TAB: NOTIFICATIONS & SOUND                           */}
            {/* ======================================================== */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">মেসেঞ্জার চ্যাট সাউন্ড</span>
                      <span className="text-[11px] text-slate-500">নতুন মেসেজ এলে মিষ্টি সাউন্ড হবে</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestSound}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3 text-[#1877F2]" />
                        <span>টেস্ট করুন</span>
                      </button>
                      <input
                        type="checkbox"
                        checked={messageSound}
                        onChange={(e) => setMessageSound(e.target.checked)}
                        className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">কমেন্ট ও রিয়েকশন নোটিফিকেশন</span>
                      <span className="text-[11px] text-slate-500">আপনার পোস্টে কেউ রিয়েক্ট বা কমেন্ট করলে অ্যালার্ট</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={commentAlerts}
                      onChange={(e) => setCommentAlerts(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">মার্কেটপ্লেস অর্ডার ও ডিল অ্যালার্ট</span>
                      <span className="text-[11px] text-slate-500">আপনার পণ্যে অর্ডার বা ছাড়ের মেসেজ নোটিফিকেশন</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={orderAlerts}
                      onChange={(e) => setOrderAlerts(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1877F2] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">সাউন্ড ভলিউম</span>
                      <span className="text-xs font-bold text-slate-600">{soundVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="w-full accent-[#1877F2] cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="px-6 py-2.5 bg-[#1877F2] text-white font-black text-xs rounded-2xl shadow-sm transition cursor-pointer"
                >
                  নোটিফিকেশন প্রেফারেন্স সেভ করুন
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* 7. TAB: BLOCKLIST                                       */}
            {/* ======================================================== */}
            {activeTab === 'blocking' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium">
                  আপনি যেসকল ইউজারকে ব্লক করেছেন তাদের তালিকা নিচে দেওয়া হলো। ব্লক করা ব্যক্তি আপনার পোস্ট বা মেসেজ দেখতে পারবেন না।
                </p>

                {/* Quick block dropdown */}
                {unblockedUsers.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2">
                    <select
                      value={userToBlock}
                      onChange={(e) => setUserToBlock(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="">-- ইউজার বেছে নিয়ে ব্লক করুন --</option>
                      {unblockedUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleBlockUser}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      ব্লক করুন
                    </button>
                  </div>
                )}

                {blockedProfiles.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-bold">
                    কোনো ইউজার ব্লক করা নেই
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedProfiles.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{user.name}</span>
                            <span className="text-[10px] text-slate-400">{user.username}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblock(user.id)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl shadow-2xs cursor-pointer"
                        >
                          আনব্লক করুন
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* 8. TAB: APPEARANCE & THEME                              */}
            {/* ======================================================== */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">অ্যাপ্লিকেশন থিম</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light', label: 'ডিফল্ট লাইট মোড', icon: Sun },
                      { id: 'dark', label: 'ডার্ক মোড', icon: Moon },
                      { id: 'blue', label: 'ফেসবুক ক্লাসিক ব্লু', icon: Palette },
                    ].map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleApplyTheme(t.id as any)}
                          className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                            themeMode === t.id
                              ? 'bg-blue-50 border-[#1877F2] text-[#1877F2] ring-2 ring-[#1877F2]/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">ভাষা (Language)</label>
                    <select
                      value={appLanguage}
                      onChange={(e) => setAppLanguage(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                    >
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="en">English (ইংরেজি)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">ফন্ট সাইজ (Font Size)</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-hidden"
                    >
                      <option value="normal">সাধারণ (Default)</option>
                      <option value="medium">মাঝারি (Medium)</option>
                      <option value="large">বড় (Large)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAppearance}
                  className="px-6 py-2.5 bg-[#1877F2] text-white font-black text-xs rounded-2xl shadow-sm transition cursor-pointer"
                >
                  ডিসপ্লে প্রেফারেন্স সেভ করুন
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* 9. TAB: ACCOUNT & LOGOUT                                */}
            {/* ======================================================== */}
            {activeTab === 'account' && (
              <div className="space-y-5">
                
                {/* Logout Option */}
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-sm">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-rose-900">লগআউট (Log Out)</h4>
                      <p className="text-xs text-rose-700 font-medium">
                        আপনার বর্তমান সেশনটি নিরাপদভাবে সমাপ্ত করে প্রস্থান করুন
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-rose-600/90 font-medium">
                    লগআউট করলে আপনি পরবর্তীতে আপনার ১১ ডিজিটের মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সেন্ট্রাল মার্কেটপ্লেসে পুনরায় প্রবেশ করতে পারবেন।
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>অ্যাকাউন্ট থেকে লগআউট করুন</span>
                  </button>
                </div>

                {/* Download Backup */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>প্রোফাইল ডাটা ব্যাকআপ ডাউনলোড</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      আপনার প্রোফাইল, অর্ডার এবং তথ্যের JSON ব্যাকআপ সংগ্রহ করুন
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl shadow-2xs cursor-pointer"
                  >
                    ডাউনলোড
                  </button>
                </div>

                {/* Reset Cache & History */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-slate-500" />
                      <span>অস্থায়ী ক্যাশ ও কার্ট হিস্ট্রি রিসেট</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ব্রাউজারে জমে থাকা পুরনো শপিং ক্যাশ পরিষ্কার করুন
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    রিসেট
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Prompt Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">আপনি কি নিশ্চিত লগআউট করতে চান?</h3>
              <p className="text-xs text-slate-500 font-medium">
                পরবর্তীতে আপনার মোবাইল নম্বর <strong>{currentProfile.phone}</strong> ও পাসওয়ার্ড দিয়ে যেকোনো সময় লগইন করতে পারবেন।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-2xl shadow-sm transition cursor-pointer"
              >
                হ্যাঁ, লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Prompt Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">ক্যাশ রিসেট করতে চান?</h3>
              <p className="text-xs text-slate-500 font-medium">
                কার্ট ও উইশলিস্টের ক্যাশ ডাটা পরিষ্কার হবে। আপনার প্রোফাইল অ্যাকাউন্ট অক্ষত থাকবে।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-2xl shadow-sm transition cursor-pointer"
              >
                হ্যাঁ, রিসেট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
