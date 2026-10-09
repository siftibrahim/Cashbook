import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  UserCheck,
  UserPlus,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CustomerProfile } from '../../types/marketplaceSocial';
import { marketplaceSocialService } from '../../services/marketplaceSocialService';

interface UserSearchBarProps {
  onSelectUser: (user: CustomerProfile) => void;
  onRequestSentToast?: (message: string) => void;
}

export const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onSelectUser,
  onRequestSentToast,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<CustomerProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<CustomerProfile[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(6));
  }, []);

  useEffect(() => {
    const handleProfileSync = () => {
      setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(6));
      if (query.trim()) {
        setResults(marketplaceSocialService.searchUsers(query));
      }
    };
    window.addEventListener('twing_profile_updated', handleProfileSync);
    return () => window.removeEventListener('twing_profile_updated', handleProfileSync);
  }, [query]);

  useEffect(() => {
    if (query.trim()) {
      const found = marketplaceSocialService.searchUsers(query);
      setResults(found);
    } else {
      setResults([]);
    }
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendRequest = (e: React.MouseEvent, targetUser: CustomerProfile) => {
    e.stopPropagation();
    const res = marketplaceSocialService.sendFriendRequest(targetUser.id);
    if (onRequestSentToast) {
      onRequestSentToast(res.message);
    }
    // Refresh lists
    if (query.trim()) {
      setResults(marketplaceSocialService.searchUsers(query));
    }
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(6));
  };

  const handleAcceptRequest = (e: React.MouseEvent, targetUser: CustomerProfile) => {
    e.stopPropagation();
    const res = marketplaceSocialService.acceptFriendRequest(targetUser.id);
    if (onRequestSentToast) {
      onRequestSentToast(res.message);
    }
    if (query.trim()) {
      setResults(marketplaceSocialService.searchUsers(query));
    }
    setSuggestedUsers(marketplaceSocialService.getFriendSuggestions(6));
  };

  const renderRelationshipBadge = (user: CustomerProfile) => {
    const status = marketplaceSocialService.getRelationshipStatus(user.id);

    if (status === 'self') {
      return (
        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100">
          আপনি
        </span>
      );
    }

    if (status === 'friends') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          বন্ধু
        </span>
      );
    }

    if (status === 'pending_sent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          অনুরোধ পাঠানো হয়েছে
        </span>
      );
    }

    if (status === 'pending_received') {
      return (
        <button
          type="button"
          onClick={(e) => handleAcceptRequest(e, user)}
          className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-xl shadow-2xs transition cursor-pointer"
        >
          <UserCheck className="w-3 h-3" />
          একসেপ্ট
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => handleSendRequest(e, user)}
        className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-[#1877F2] hover:bg-blue-700 px-2.5 py-1 rounded-xl shadow-2xs transition cursor-pointer"
        title="ফ্রেন্ড রিকোয়েস্ট পাঠান"
      >
        <UserPlus className="w-3 h-3" />
        অ্যাড ফ্রেন্ড
      </button>
    );
  };

  const showDropdown = isFocused;
  const displayList = query.trim() ? results : suggestedUsers;

  return (
    <div
      ref={containerRef}
      className="relative z-30 w-full bg-white border-b border-slate-200/90 shadow-2xs"
    >
      <div className="max-w-xl md:max-w-2xl mx-auto px-3 sm:px-4 py-2">
        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="🔍 ইউজার বা বন্ধু খুঁজুন (নাম, ইউজারনেম দিয়ে)..."
            className="w-full pl-10 pr-9 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs sm:text-sm font-medium border border-transparent focus:border-blue-500 rounded-full focus:outline-hidden transition placeholder:text-slate-400 shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Results / Suggestions Dropdown */}
        {showDropdown && (
          <div className="absolute left-3 right-3 sm:left-4 sm:right-4 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[75vh] flex flex-col z-50">
            {/* Header label */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                {query.trim() ? (
                  <>
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    খোঁজার ফলাফল ({results.length} জন পাওয়া গেছে)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    সাজেস্টেড ইউজার ও নতুন বন্ধু
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsFocused(false)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
              >
                বন্ধ করুন ✕
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-slate-100 p-1">
              {displayList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="font-bold text-xs">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                  <p className="text-[11px]">অন্য কোনো নাম বা ইউজারনেম দিয়ে চেষ্টা করুন</p>
                </div>
              ) : (
                displayList.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setIsFocused(false);
                    }}
                    className="p-2.5 sm:p-3 hover:bg-blue-50/60 rounded-xl transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">
                            {user.name}
                          </h4>
                          {user.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 block truncate">
                          {user.username}
                        </span>
                        {user.location && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-0.5 truncate mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {user.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderRelationshipBadge(user)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(user);
                          setIsFocused(false);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="প্রোফাইল দেখুন"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
