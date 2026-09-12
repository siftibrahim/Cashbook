import React, { useState } from 'react';
import { Customer, CustomerFilter, CustomerCategory } from '../types';
import { formatMoney, getCategoryLabel } from '../utils/storage';
import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  ChevronRight,
  Users,
  MessageCircle,
  Settings,
  FileText,
  AlertTriangle,
  BarChart3,
  Wallet,
  ArrowUpDown,
  Tag,
  Sparkles,
} from 'lucide-react';

interface CustomerListProps {
  customers: Customer[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filter: CustomerFilter;
  onFilterChange: (f: CustomerFilter) => void;
  onSelectCustomer: (id: string) => void;
  onOpenNewCustomer: () => void;
  onQuickTagada: (e: React.MouseEvent, c: Customer) => void;
  onOpenSettings?: () => void;
  onOpenReport?: () => void;
  onOpenAnalytics?: () => void;
  onOpenCashbook?: () => void;
  highDueLimit?: number;
}

type SortOption = 'due_desc' | 'due_asc' | 'name_asc' | 'recent';

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  onSelectCustomer,
  onOpenNewCustomer,
  onQuickTagada,
  onOpenSettings,
  onOpenReport,
  onOpenAnalytics,
  onOpenCashbook,
  highDueLimit = 5000,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_desc');

  // Filter out system counter cash entry if present
  const displayCustomers = (customers || []).filter((c) => c && c.id !== 'cust_counter_cash');

  const filtered = displayCustomers
    .filter((c) => {
      if (!c) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const nameStr = (c.name || '').toLowerCase();
      const phoneStr = c.phone || '';
      const addressStr = (c.address || '').toLowerCase();

      const match =
        !q ||
        nameStr.includes(q) ||
        phoneStr.includes(q) ||
        addressStr.includes(q);

      if (!match) return false;

      if (filter === 'due') {
        if (Number(c.balance || 0) <= 0) return false;
      }
      if (filter === 'paid') {
        if (Number(c.balance || 0) > 0) return false;
      }

      if (selectedCategory !== 'all') {
        if (c.category !== selectedCategory) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const balA = Number(a.balance || 0);
      const balB = Number(b.balance || 0);

      if (sortBy === 'due_desc') return balB - balA;
      if (sortBy === 'due_asc') return balA - balB;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'bn');
      if (sortBy === 'recent') return (b.updatedAt || 0) - (a.updatedAt || 0);
      return 0;
    });

  return (
    <section className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col no-print relative overflow-hidden">
      {/* Persistent Sticky Sub-Header: Search, Actions, & Filter Controls */}
      <div className="sticky top-0 z-20 bg-slate-50/98 backdrop-blur-md border-b border-slate-200/80 p-3.5 sm:p-4 space-y-3 shrink-0 rounded-t-2xl shadow-xs transition-shadow">
        {/* Search & Actions Row (Row 1) */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              id="customer-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="কাস্টমার খুঁজুন (নাম, মোবাইল নম্বর বা এলাকা)..."
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm sm:text-base text-slate-800 shadow-2xs font-semibold placeholder:text-slate-400"
            />
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2.5 sm:top-3 text-slate-400 hover:text-slate-600 font-bold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Quick Launch Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {onOpenAnalytics && (
                <button
                  type="button"
                  id="open-analytics-btn"
                  onClick={onOpenAnalytics}
                  title="অ্যানালিটিক্স ও চার্ট"
                  className="p-2.5 sm:px-3 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">অ্যানালিটিক্স</span>
                </button>
              )}

              {onOpenCashbook && (
                <button
                  type="button"
                  id="open-cashbook-btn"
                  onClick={onOpenCashbook}
                  title="দৈনিক ক্যাশ ও খরচ খাতা"
                  className="p-2.5 sm:px-3 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden md:inline">ক্যাশ খাতা</span>
                </button>
              )}

              {onOpenReport && (
                <button
                  type="button"
                  id="open-report-btn"
                  onClick={onOpenReport}
                  title="সামগ্রিক বাকি খাতা রিপোর্ট ও প্রিন্ট"
                  className="p-2.5 sm:px-3 sm:py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden md:inline">রিপোর্ট</span>
                </button>
              )}
            </div>

            {/* Main Add Customer Button */}
            <button
              type="button"
              id="add-new-customer-btn"
              onClick={onOpenNewCustomer}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-3 bg-[#00695C] hover:bg-[#004D40] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition border border-teal-700 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ কাস্টমার</span>
            </button>
          </div>
        </div>

        {/* Status Filter Segmented Control (Row 2) */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1.5 rounded-xl shadow-inner">
          <button
            type="button"
            id="filter-all-btn"
            onClick={() => onFilterChange('all')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              filter === 'all'
                ? 'bg-[#004D40] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-transparent'
            }`}
          >
            <span>সবাই</span>
            <span
              className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-black ${
                filter === 'all'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-300/80 text-slate-700'
              }`}
            >
              {displayCustomers.length}
            </span>
          </button>

          <button
            type="button"
            id="filter-due-btn"
            onClick={() => onFilterChange('due')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              filter === 'due'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-transparent'
            }`}
          >
            <span>বাকি আছে</span>
            <span
              className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-black ${
                filter === 'due'
                  ? 'bg-white/25 text-white'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {displayCustomers.filter((c) => Number(c.balance || 0) > 0).length}
            </span>
          </button>

          <button
            type="button"
            id="filter-paid-btn"
            onClick={() => onFilterChange('paid')}
            className={`py-2 px-1 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              filter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 bg-transparent'
            }`}
          >
            <span>পরিশোধিত</span>
            <span
              className={`text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-black ${
                filter === 'paid'
                  ? 'bg-white/25 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {displayCustomers.filter((c) => Number(c.balance || 0) <= 0).length}
            </span>
          </button>
        </div>

        {/* Category & Sorting Row in a 2-Column Symmetric Grid (Row 3) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Category Filter */}
          <div className="relative flex items-center">
            <Tag className="w-3.5 h-3.5 absolute left-2.5 text-teal-700 pointer-events-none" />
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold pl-7 pr-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-teal-500 shadow-2xs cursor-pointer truncate"
            >
              <option value="all">সকল শ্রেণি</option>
              <option value="regular">নিয়মিত</option>
              <option value="vip">ভিআইপি (VIP)</option>
              <option value="wholesale">পাইকারি</option>
              <option value="retail">খুচরা</option>
            </select>
          </div>

          {/* Sorting Filter */}
          <div className="relative flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 text-teal-700 pointer-events-none" />
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full text-xs sm:text-sm font-bold pl-7 pr-3 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-teal-500 shadow-2xs cursor-pointer truncate"
            >
              <option value="due_desc">বাকি বেশি থেকে কম</option>
              <option value="due_asc">বাকি কম থেকে বেশি</option>
              <option value="name_asc">নাম অনুযায়ী (অ-ঔ)</option>
              <option value="recent">সম্প্রতি লেনদেন</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List Items */}
      <div className="divide-y divide-slate-100 overflow-y-visible">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#00695C] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Users className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">কোনো কাস্টমার পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `"${searchQuery}" এর সাথে মিলে এমন কোনো কাস্টমার নেই।`
                : 'নতুন কাস্টমার যোগ করতে উপরের "+ কাস্টমার" বাটনে ক্লিক করুন।'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onOpenNewCustomer}
                className="mt-4 px-4 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                + প্রথম কাস্টমার যোগ করুন
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map((customer) => {
              const balance = Number(customer.balance || 0);
              const isDue = balance > 0;
              const isHighDue = balance >= highDueLimit;

              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className="p-3.5 sm:p-4 hover:bg-teal-50/50 active:bg-teal-100/60 transition cursor-pointer flex items-center justify-between group gap-3.5 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div
                      className={`w-11.5 h-11.5 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                        isHighDue
                          ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                          : isDue
                          ? 'bg-red-50 text-red-700 border-2 border-red-200'
                          : balance < 0
                          ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200'
                      }`}
                    >
                      {customer.name ? customer.name.slice(0, 1) : 'ক'}
                    </div>

                    {/* Customer Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate group-hover:text-[#004D40] transition leading-snug">
                          {customer.name}
                        </h4>
                        {isHighDue && (
                          <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            উচ্চ বাকি
                          </span>
                        )}
                        {customer.category && customer.category !== 'regular' && (
                          <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold border border-slate-200 shadow-2xs">
                            {getCategoryLabel(customer.category)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600 font-medium mt-1">
                        {customer.phone ? (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{customer.phone}</span>
                          </span>
                        ) : null}
                        {customer.address && (
                          <span className="hidden sm:flex items-center gap-1 truncate max-w-[170px] text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Balance & Action */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-black text-sm sm:text-base md:text-lg tracking-tight ${
                          isDue
                            ? 'text-red-600'
                            : balance < 0
                            ? 'text-blue-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        ৳ {formatMoney(Math.abs(balance))}
                      </div>
                      <div
                        className={`text-[11px] sm:text-xs font-bold mt-0.5 ${
                          isDue
                            ? 'text-red-500'
                            : balance < 0
                            ? 'text-blue-500'
                            : 'text-emerald-600'
                        }`}
                      >
                        {isDue ? 'বাকি বকেয়া' : balance < 0 ? 'অগ্রিম জমা' : 'পরিশোধিত'}
                      </div>
                    </div>

                    {/* Quick Tagada WhatsApp trigger button */}
                    {isDue && (
                      <button
                        type="button"
                        onClick={(e) => onQuickTagada(e, customer)}
                        title="হোয়াটসঅ্যাপ বা এসএমএস তাগাদা পাঠান"
                        className="w-9.5 h-9.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition active:scale-90 border border-emerald-200 shadow-2xs cursor-pointer flex items-center justify-center"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    <ChevronRight className="w-4.5 h-4.5 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}

            {/* Bottom Complete End Indicator & Safe Scrolling Spacing */}
            {(() => {
              const totalDue = filtered.reduce((acc, c) => acc + (Number(c.balance || 0) > 0 ? Number(c.balance || 0) : 0), 0);
              return (
                <div className="p-3.5 sm:p-4 bg-slate-50/90 text-center border-t border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-center gap-2 flex-wrap text-xs sm:text-sm font-bold text-slate-700">
                    <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-teal-600 inline-block animate-pulse" />
                      <span>সর্বমোট {filtered.length} জন কাস্টমার</span>
                    </span>
                    {totalDue > 0 && (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200/80 shadow-2xs">
                        <span>মোট বাকি:</span>
                        <span className="font-black">৳ {formatMoney(totalDue)}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium">সব কাস্টমার শেষ হয়েছে</p>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </section>
  );
};
