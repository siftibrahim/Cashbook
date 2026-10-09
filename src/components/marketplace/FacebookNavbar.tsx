import React from 'react';
import {
  Store,
  MessageCircle,
  Bell,
  User,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';

export type FacebookNavTab = 'feed' | 'marketplace' | 'messenger' | 'notifications' | 'profile';

interface FacebookNavbarProps {
  currentTab: FacebookNavTab;
  onTabChange: (tab: FacebookNavTab) => void;
  currentProfile: CustomerProfile;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  pendingFriendRequestsCount?: number;
  onOpenFriendsModal?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenSellModal?: () => void;
  onBackToDashboard?: () => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
}

export const FacebookNavbar: React.FC<FacebookNavbarProps> = ({
  currentTab,
  onTabChange,
  currentProfile,
  unreadMessagesCount,
  unreadNotificationsCount,
  pendingFriendRequestsCount = 0,
  onOpenFriendsModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs w-full">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* 1. Logo Icon with 'T' (replacing 'f') */}
        <div
          onClick={() => onTabChange('feed')}
          className="w-10 h-10 rounded-full bg-[#1877F2] hover:bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-xs cursor-pointer select-none shrink-0"
          title="Twing Feed"
        >
          T
        </div>

        {/* 2. Store / Marketplace Tab */}
        <button
          type="button"
          onClick={() => onTabChange('marketplace')}
          className={`h-14 px-2 sm:px-5 flex items-center justify-center relative cursor-pointer transition ${
            currentTab === 'marketplace'
              ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="মার্কেটপ্লেস"
        >
          <Store className="w-6 h-6" />
        </button>

        {/* 3. Messenger Tab */}
        <button
          type="button"
          onClick={() => onTabChange('messenger')}
          className={`h-14 px-2 sm:px-5 flex items-center justify-center relative cursor-pointer transition ${
            currentTab === 'messenger'
              ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="মেসেঞ্জার"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadMessagesCount}
              </span>
            )}
          </div>
        </button>

        {/* 4. Notifications Tab with badge */}
        <button
          type="button"
          onClick={() => onTabChange('notifications')}
          className={`h-14 px-2 sm:px-5 flex items-center justify-center relative cursor-pointer transition ${
            currentTab === 'notifications'
              ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-1 after:right-1 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="নোটিফিকেশন"
        >
          <div className="relative">
            <Bell className="w-6 h-6" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        </button>

        {/* 5. Friend Suggestions & Requests (মানুষ বাটন) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenFriendsModal) {
              onOpenFriendsModal();
            } else {
              onTabChange('profile');
            }
          }}
          className={`h-14 px-2 sm:px-5 flex items-center justify-center relative cursor-pointer transition text-slate-600 hover:text-[#1877F2]`}
          title="ফ্রেন্ড সাজেস্ট ও বন্ধু অনুরোধ"
        >
          <div className="relative">
            <User className="w-6 h-6" />
            {pendingFriendRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {pendingFriendRequestsCount}
              </span>
            )}
          </div>
        </button>

        {/* 6. Profile Avatar */}
        <div
          onClick={() => onTabChange('profile')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-200 cursor-pointer shrink-0 hover:ring-2 hover:ring-[#1877F2] transition"
          title={currentProfile.name}
        >
          <img
            src={currentProfile.avatar}
            alt={currentProfile.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
