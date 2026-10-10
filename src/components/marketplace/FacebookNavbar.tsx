import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Store,
  MessageCircle,
  Bell,
  Users,
  Search,
  X,
  UserPlus,
  UserCheck,
  Clock,
  ShieldCheck,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  Sparkles,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

export type FacebookNavTab = 'feed' | 'marketplace' | 'messenger' | 'notifications' | 'profile';

interface FacebookNavbarProps {
  currentTab: FacebookNavTab;
  onTabChange: (tab: FacebookNavTab) => void;
  currentProfile: CustomerProfile;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  pendingFriendRequestsCount?: number;
  onOpenFriendsModal?: () => void;
  onSelectUser?: (user: CustomerProfile) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenSellModal?: () => void;
  onBackToDashboard?: () => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
  isLoggedIn?: boolean;
  onOpenAuthModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenVerificationModal?: () => void;
  onLogout?: () => void;
  onShowToast?: (msg: string) => void;
}

export const FacebookNavbar: React.FC<FacebookNavbarProps> = ({
  currentTab,
  onTabChange,
  currentProfile,
  unreadMessagesCount,
  unreadNotificationsCount,
  pendingFriendRequestsCount = 0,
  onOpenFriendsModal,
  onSelectUser,
  searchQuery,
  onSearchChange,
  cartItemCount = 0,
  onOpenCart,
  onBackToDashboard,
  isLoggedIn = true,
  onOpenAuthModal,
  onOpenSettingsModal,
  onOpenVerificationModal,
  onLogout,
  onShowToast,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const [searchResults, setSearchResults] = useState<CustomerProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<CustomerProfile[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load suggestions
  useEffect(() => {
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(5));
  }, []);

  // Update search results on input change
  useEffect(() => {
    if (localSearch.trim()) {
      const found = marketplaceSocialService.searchUsers(localSearch);
      setSearchResults(found);
    } else {
      setSearchResults([]);
    }
    if (onSearchChange) {
      onSearchChange(localSearch);
    }
  }, [localSearch]);

  // Sync external search query
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== localSearch) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendFriendRequest = (e: React.MouseEvent, user: CustomerProfile) => {
    e.stopPropagation();
    const res = marketplaceSocialService.sendFriendRequest(user.id);
    onShowToast?.(res.message);
    if (localSearch.trim()) {
      setSearchResults(marketplaceSocialService.searchUsers(localSearch));
    }
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(5));
  };

  const handleAcceptFriendRequest = (e: React.MouseEvent, user: CustomerProfile) => {
    e.stopPropagation();
    const res = marketplaceSocialService.acceptFriendRequest(user.id);
    onShowToast?.(res.message);
    if (localSearch.trim()) {
      setSearchResults(marketplaceSocialService.searchUsers(localSearch));
    }
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(5));
  };

  const renderRelationshipAction = (user: CustomerProfile) => {
    const status = marketplaceSocialService.getRelationshipStatus(user.id);
    if (status === 'self') {
      return <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">আপনি</span>;
    }
    if (status === 'friends') {
      return (
        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
          <UserCheck className="w-3 h-3 text-emerald-600" /> বন্ধু
        </span>
      );
    }
    if (status === 'pending_sent') {
      return (
        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
          <Clock className="w-3 h-3 text-amber-600" /> অনুরোধ পাঠানো হয়েছে
        </span>
      );
    }
    if (status === 'pending_received') {
      return (
        <button
          type="button"
          onClick={(e) => handleAcceptFriendRequest(e, user)}
          className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-lg transition"
        >
          গ্রহণ করুন
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={(e) => handleSendFriendRequest(e, user)}
        className="text-[10px] bg-[#1877F2] hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
      >
        <UserPlus className="w-3 h-3" /> অ্যাড ফ্রেন্ড
      </button>
    );
  };

  const displaySearchResults = localSearch.trim() ? searchResults : suggestedUsers;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs w-full">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER SECTION: BRAND + 5 ORDERED NAV BUTTONS + PROFILE ACTIONS   */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ১ম অংশ: TWING এবং তার নিচে ছোট করে ইংরেজিতে সেন্ট্রাল মার্কেটপ্লেস */}
        <div
          onClick={() => onTabChange('feed')}
          className="flex flex-col select-none cursor-pointer group shrink-0"
          title="TWING Central Marketplace"
        >
          <span className="text-2xl sm:text-3xl font-black text-[#1877F2] tracking-tight leading-none group-hover:opacity-90 transition">
            TWING
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
            Central Marketplace
          </span>
        </div>

        {/* ========================================================================= */}
        {/* ৫টি বাটন ক্রমানুসারে (ORDERED NAVIGATION BUTTONS)                        */}
        {/* ২. হোম | ৩. মানুষ আইকন | ৪. মার্কেটপ্লেস ও নোটিফিকেশন | ৫. মেসেঞ্জার         */}
        {/* ========================================================================= */}
        <nav className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 h-full">
          {/* ২য় বাটন: হোম (Home) */}
          <button
            type="button"
            onClick={() => onTabChange('feed')}
            className={`h-16 px-2.5 sm:px-4 md:px-5 flex flex-col items-center justify-center relative cursor-pointer transition gap-0.5 ${
              currentTab === 'feed'
                ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="হোম ফিড"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-bold hidden md:inline">হোম</span>
          </button>

          {/* ৩য় বাটন: মানুষ আইকন (Users / Friends) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenFriendsModal) {
                onOpenFriendsModal();
              } else {
                onTabChange('profile');
              }
            }}
            className="h-16 px-2.5 sm:px-4 md:px-5 flex flex-col items-center justify-center relative cursor-pointer transition gap-0.5 text-slate-600 hover:text-[#1877F2] hover:bg-slate-50"
            title="মানুষ আইকন (বন্ধু ও ইউজার)"
          >
            <div className="relative">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              {pendingFriendRequestsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {pendingFriendRequestsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold hidden md:inline">ফ্রেন্ডস</span>
          </button>

          {/* ৪র্থ বাটন: মার্কেটপ্লেস এবং নোটিফিকেশন বাটন */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 h-full">
            {/* ৪ (ক). মার্কেটপ্লেস বাটন */}
            <button
              type="button"
              onClick={() => onTabChange('marketplace')}
              className={`h-16 px-2.5 sm:px-4 md:px-5 flex flex-col items-center justify-center relative cursor-pointer transition gap-0.5 ${
                currentTab === 'marketplace'
                  ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="মার্কেটপ্লেস"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] font-bold hidden md:inline">মার্কেটপ্লেস</span>
            </button>

            {/* ৪ (খ). নোটিফিকেশন বাটন */}
            <button
              type="button"
              onClick={() => onTabChange('notifications')}
              className={`h-16 px-2.5 sm:px-3 md:px-4 flex flex-col items-center justify-center relative cursor-pointer transition gap-0.5 ${
                currentTab === 'notifications'
                  ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="নোটিফিকেশন"
            >
              <div className="relative">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold hidden md:inline">নোটিফিকেশন</span>
            </button>
          </div>

          {/* ৫ম বাটন: মেসেঞ্জার */}
          <button
            type="button"
            onClick={() => onTabChange('messenger')}
            className={`h-16 px-2.5 sm:px-4 md:px-5 flex flex-col items-center justify-center relative cursor-pointer transition gap-0.5 ${
              currentTab === 'messenger'
                ? 'text-[#1877F2] after:content-[""] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-[#1877F2] after:rounded-t-full font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="মেসেঞ্জার"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold hidden md:inline">মেসেঞ্জার</span>
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* ডানদিকের একশন: কার্ট + ড্যাশবোর্ড + ইউজার প্রোফাইল মেনু                   */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 relative shrink-0" ref={menuRef}>
          {/* Dashboard Return Button */}
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition cursor-pointer"
              title="দোকানের ড্যাশবোর্ডে ফিরে যান"
            >
              <span>দোকান ড্যাশবোর্ড</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Marketplace Cart Button */}
          {currentTab === 'marketplace' && onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-2 sm:p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="শপিং কার্ট"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1877F2] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* User Account / Dropdown */}
          {isLoggedIn ? (
            <>
              {/* User Avatar with Status Indicator */}
              <div
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 cursor-pointer transition select-none"
                title="অ্যাকাউন্ট মেনু ও সেটিংস"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-slate-200 relative ring-2 ring-slate-100">
                  <img
                    src={currentProfile.avatar}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover"
                  />
                  {currentProfile.isVerified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-[#1877F2] text-white p-0.5 rounded-full ring-1 ring-white">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </div>

              {/* Facebook-style Account Dropdown */}
              {isMenuOpen && (
                <div className="absolute top-14 right-0 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in duration-150 space-y-1">
                  {/* User Profile Card */}
                  <div
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTabChange('profile');
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center gap-3 cursor-pointer transition"
                  >
                    <img
                      src={currentProfile.avatar}
                      alt={currentProfile.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-800 truncate">{currentProfile.name}</span>
                        {currentProfile.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">{currentProfile.username}</span>
                      <span className="text-[10px] text-[#1877F2] font-bold">প্রোফাইল দেখুন →</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Settings & Privacy Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettingsModal?.();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-100 flex items-center gap-3 text-xs font-bold text-slate-700 transition cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span>সেটিংস ও প্রাইভেসী</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        নিরাপত্তা, পাসওয়ার্ড ও অ্যাকাউন্ট সেটিংস
                      </span>
                    </div>
                  </button>

                  {/* ID Verification Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenVerificationModal?.();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-xs font-bold text-slate-700 transition cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-[#1877F2]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span>আইডি ভেরিফিকেশন</span>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                          {currentProfile.isVerified ? 'Verified' : 'Blue Badge'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        মেটা ব্লু টিক ভেরিফাইড ব্যাজ পান
                      </span>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  {/* LOGOUT OPTION */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-rose-50 flex items-center gap-3 text-xs font-black text-rose-600 transition cursor-pointer text-left"
                  >
                    <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <span>লগআউট (Log Out)</span>
                      <span className="text-[10px] text-rose-400 block font-normal">
                        সেশন সমাপ্ত করে প্রস্থান করুন
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Logged Out state: Show Login/Register Button */
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-[#1877F2] hover:bg-blue-600 active:scale-95 text-white text-xs font-black rounded-2xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন / সাইন আপ</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ২. এই সেকশনের নিচে সার্চ বার সেকশন (DEDICATED SEARCH BAR SECTION BELOW)   */}
      {/* ========================================================================= */}
      <div className="w-full bg-slate-50/90 border-t border-slate-200/70 py-2.5 px-3 sm:px-6 shadow-xs">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-center relative" ref={searchRef}>
          <div className="w-full max-w-2xl relative">
            <div className="flex items-center bg-white hover:border-slate-300 focus-within:border-[#1877F2] focus-within:ring-3 focus-within:ring-[#1877F2]/15 rounded-full px-4 py-2 border border-slate-200 shadow-xs transition duration-150">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="ইউজার, বন্ধু, শপ বা পণ্য খুঁজুন..."
                className="w-full bg-transparent text-xs sm:text-sm font-medium focus:outline-hidden text-slate-800 placeholder:text-slate-400"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition ml-1"
                  title="মুছে ফেলুন"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Dropdown Popover for Search / Suggested Users */}
            {searchFocused && (
              <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    {localSearch.trim() ? (
                      <>
                        <Search className="w-3.5 h-3.5 text-[#1877F2]" />
                        <span>অনুসন্ধান ফলাফল ({searchResults.length})</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>সাজেস্টেড নতুন বন্ধু ও ইউজার</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchFocused(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-200/50"
                  >
                    বন্ধ করুন ✕
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                  {displaySearchResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <p className="text-xs font-bold">কোনো ইউজার পাওয়া যায়নি</p>
                      <p className="text-[11px]">অন্য নাম বা ইউজারনেম লিখে চেষ্টা করুন</p>
                    </div>
                  ) : (
                    displaySearchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          onSelectUser?.(user);
                          setSearchFocused(false);
                        }}
                        className="p-2.5 hover:bg-blue-50/60 rounded-xl transition cursor-pointer flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{user.name}</span>
                              {user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-[#1877F2] shrink-0" />}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">{user.username}</span>
                          </div>
                        </div>

                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          {renderRelationshipAction(user)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

