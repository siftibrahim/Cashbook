import React from 'react';

// 1. টপ আপ (Top Up) - Blue mobile illustration with screen and circular b badge
export const TopUpIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Phone Body */}
    <rect x="14" y="6" width="28" height="44" rx="8" fill="#38BDF8" />
    {/* Darker edge highlight */}
    <rect x="16" y="8" width="24" height="40" rx="6" fill="#0284C7" />
    {/* Speaker slot */}
    <rect x="23" y="10" width="10" height="2" rx="1" fill="#BAE6FD" />
    {/* Screen / Card */}
    <rect x="17" y="14" width="22" height="30" rx="4" fill="#38BDF8" />
    {/* Central circle badge */}
    <circle cx="28" cy="28" r="9" fill="#1E3A8A" />
    {/* Stylized 'b' or symbol */}
    <text x="28" y="32" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
      b
    </text>
    {/* Bottom home bar */}
    <rect x="24" y="45" width="8" height="2" rx="1" fill="#BAE6FD" />
  </svg>
);

// 2. বাকির খাতা (Due Book) - Coral/rose document with folded corner and lines
export const DueBookIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Shadow / Back page */}
    <rect x="14" y="10" width="28" height="36" rx="4" fill="#FDA4AF" opacity="0.5" />
    {/* Main Page */}
    <path
      d="M16 9C16 7.34315 17.3431 6 19 6H33L40 13V46C40 47.6569 38.6569 49 37 49H19C17.3431 49 16 47.6569 16 46V9Z"
      fill="#F43F5E"
    />
    {/* Folded corner */}
    <path d="M33 6V13H40L33 6Z" fill="#FDA4AF" />
    {/* Document content lines */}
    <rect x="21" y="18" width="14" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.9" />
    <rect x="21" y="24" width="14" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.9" />
    <rect x="21" y="30" width="10" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.9" />
    <rect x="21" y="36" width="12" height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

// 3. ক্যাশবুক / বুক (Cashbook / Wallet) - Warm brown folder/bag with green money notes
export const CashBookIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Banknote peeking out */}
    <rect x="19" y="10" width="18" height="12" rx="2" fill="#34D399" />
    <rect x="21" y="12" width="14" height="8" rx="1.5" fill="#10B981" />
    <circle cx="28" cy="16" r="2" fill="#D1FAE5" />
    {/* Brown Wallet / Folder Body */}
    <rect x="12" y="16" width="32" height="28" rx="5" fill="#D97706" />
    {/* Flap */}
    <path
      d="M12 21C12 18.2386 14.2386 16 17 16H39C41.7614 16 44 18.2386 44 21V23L28 29L12 23V21Z"
      fill="#B45309"
    />
    {/* Clasp / Lock button */}
    <rect x="24" y="27" width="8" height="5" rx="2.5" fill="#78350F" />
    {/* White tag indicator */}
    <rect x="36" y="32" width="4" height="3" rx="1" fill="#FDE68A" />
  </svg>
);

// 4. হিসাব খাতা (Accounts / Ledger) - Emerald green document with dark calculator
export const AccountsBookIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Green document sheet */}
    <path
      d="M15 8C15 6.34315 16.3431 5 18 5H33L40 12V45C40 46.6569 38.6569 48 37 48H18C16.3431 48 15 46.6569 15 45V8Z"
      fill="#10B981"
    />
    {/* Fold corner */}
    <path d="M33 5V12H40L33 5Z" fill="#A7F3D0" />
    {/* Document lines */}
    <rect x="20" y="16" width="12" height="2.5" rx="1" fill="#ECFDF5" opacity="0.9" />
    <rect x="20" y="22" width="8" height="2.5" rx="1" fill="#ECFDF5" opacity="0.9" />
    {/* Mini calculator in bottom right corner */}
    <rect x="25" y="27" width="17" height="22" rx="3" fill="#047857" stroke="#ECFDF5" strokeWidth="1.5" />
    {/* Calculator screen */}
    <rect x="27.5" y="30" width="12" height="5" rx="1.5" fill="#A7F3D0" />
    {/* Calculator buttons */}
    <circle cx="29.5" cy="38" r="1.2" fill="#ECFDF5" />
    <circle cx="33.5" cy="38" r="1.2" fill="#ECFDF5" />
    <circle cx="37.5" cy="38" r="1.2" fill="#ECFDF5" />
    <circle cx="29.5" cy="42" r="1.2" fill="#ECFDF5" />
    <circle cx="33.5" cy="42" r="1.2" fill="#ECFDF5" />
    <circle cx="37.5" cy="42" r="1.2" fill="#ECFDF5" />
  </svg>
);

// 5. বিল পে (Bill Pay) - Teal curled paper/receipt scroll with 'b' badge
export const BillPayIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Curled Top */}
    <path
      d="M17 12C17 9.79086 18.7909 8 21 8H36C38.2091 8 40 9.79086 40 12C40 14.2091 38.2091 16 36 16H21C18.7909 16 17 14.2091 17 12Z"
      fill="#0D9488"
    />
    {/* Main Scroll Body */}
    <rect x="18" y="12" width="21" height="32" fill="#14B8A6" />
    {/* Curled Bottom */}
    <path
      d="M17 44C17 41.7909 18.7909 40 21 40H36C38.2091 40 40 41.7909 40 44C40 46.2091 38.2091 48 36 48H21C18.7909 48 17 46.2091 17 44Z"
      fill="#0F766E"
    />
    {/* 'b' logo badge on scroll */}
    <circle cx="28.5" cy="22" r="4.5" fill="#CCFBF1" />
    <text x="28.5" y="25" textAnchor="middle" fill="#0F766E" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
      b
    </text>
    {/* Receipt text lines */}
    <rect x="23" y="30" width="11" height="2" rx="1" fill="#CCFBF1" />
    <rect x="23" y="34" width="11" height="2" rx="1" fill="#CCFBF1" />
  </svg>
);

// 6. অনলাইন স্টোর (Online Store) - Blue register/shop with red counter badge "5"
export const OnlineStoreIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Store / Wallet Box Body */}
    <rect x="12" y="18" width="32" height="24" rx="4" fill="#38BDF8" />
    {/* Top flap / stripe */}
    <path d="M12 22C12 19.7909 13.7909 18 16 18H40C42.2091 18 44 19.7909 44 22V25H12V22Z" fill="#0284C7" />
    {/* Front slot */}
    <rect x="16" y="29" width="24" height="2.5" rx="1.25" fill="#E0F2FE" />
    {/* Base shadow */}
    <rect x="15" y="37" width="26" height="2" rx="1" fill="#0369A1" />
    {/* Red Notification Badge with "5" */}
    <circle cx="39" cy="20" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
    <text x="39" y="23" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
      5
    </text>
  </svg>
);

// 7. বেচা-বিক্রি (Sale / POS) - Hand holding golden & teal coins with ৳ symbol
export const SaleCoinsIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Big floating coin (teal) */}
    <circle cx="21" cy="18" r="7.5" fill="#14B8A6" />
    <circle cx="21" cy="18" r="5.5" fill="#0D9488" />
    <text x="21" y="21.5" textAnchor="middle" fill="#CCFBF1" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
      ৳
    </text>
    {/* Smaller floating coin (gold/teal) */}
    <circle cx="33" cy="22" r="6" fill="#0EA5E9" />
    <circle cx="33" cy="22" r="4.5" fill="#0284C7" />
    <text x="33" y="25" textAnchor="middle" fill="#E0F2FE" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
      ৳
    </text>
    {/* Red balance minus dot */}
    <rect x="39" y="19" width="5" height="2" rx="1" fill="#EF4444" />
    {/* Receiving hand below */}
    <path
      d="M17 38C17 38 21 37 25 35C29 33 34 33 38 35L42 37C42 37 40 40 37 41C34 42 27 43 23 42L17 38Z"
      fill="#FCD34D"
    />
    <path d="M14 36L18 39L16 43L12 40L14 36Z" fill="#F59E0B" />
  </svg>
);

// 8. বিক্রির খাতা (Sales Printer / Receipts) - POS receipt printer printing bill slip
export const SalesPrinterIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Thermal paper receipt coming out */}
    <path d="M22 10H34V22H22V10Z" fill="#BAE6FD" />
    <rect x="24" y="13" width="8" height="1.5" rx="0.75" fill="#0369A1" />
    <rect x="24" y="16" width="6" height="1.5" rx="0.75" fill="#0369A1" />
    {/* Printer Body */}
    <rect x="14" y="20" width="28" height="24" rx="5" fill="#0284C7" />
    {/* Printer top slot */}
    <rect x="19" y="21" width="18" height="3" rx="1.5" fill="#0C4A6E" />
    {/* Front panel / screen */}
    <rect x="18" y="28" width="12" height="7" rx="2" fill="#E0F2FE" />
    <rect x="20" y="30" width="8" height="3" rx="1" fill="#38BDF8" />
    {/* Feed buttons */}
    <circle cx="34" cy="30" r="1.5" fill="#FDE047" />
    <circle cx="34" cy="34" r="1.5" fill="#4ADE80" />
    {/* Base shadow */}
    <rect x="17" y="41" width="22" height="2" rx="1" fill="#075985" />
  </svg>
);

// 9. গ্রাহক তালিকা (Customer Directory) - Avatar profile in front of contacts table
export const CustomerDirectoryIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Contacts spreadsheet table in background */}
    <rect x="24" y="10" width="20" height="22" rx="3" fill="#0284C7" />
    <rect x="27" y="13" width="6" height="4" rx="1" fill="#BAE6FD" />
    <rect x="35" y="13" width="6" height="4" rx="1" fill="#BAE6FD" />
    <rect x="27" y="19" width="6" height="4" rx="1" fill="#BAE6FD" />
    <rect x="35" y="19" width="6" height="4" rx="1" fill="#BAE6FD" />
    <rect x="27" y="25" width="14" height="3" rx="1" fill="#BAE6FD" />
    {/* Customer Avatar Head */}
    <circle cx="21" cy="20" r="6.5" fill="#FBBF24" />
    {/* Hair / cap */}
    <path d="M15 19C15 15.5 17.5 14 21 14C24.5 14 27 15.5 27 19H15Z" fill="#D97706" />
    {/* Avatar Body / Shirt */}
    <path d="M11 39C11 32 15 30 21 30C27 30 31 32 31 39V42H11V39Z" fill="#38BDF8" />
    <path d="M18 30L21 35L24 30H18Z" fill="#FDE68A" />
  </svg>
);

// 10. স্টকের হিসাব (Stock Calculation) - 3D cardboard box with inventory badge
export const StockCalculationIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* 3D Box Top */}
    <path d="M28 8L41 15L28 22L15 15L28 8Z" fill="#C084FC" />
    {/* Left Face */}
    <path d="M15 15L28 22V39L15 32V15Z" fill="#9333EA" />
    {/* Right Face */}
    <path d="M28 22L41 15V32L28 39V22Z" fill="#A855F7" />
    {/* Tape seal */}
    <path d="M25 10L31 13.5L25 17L19 13.5L25 10Z" fill="#DDD6FE" />
    {/* Plus badge on corner */}
    <circle cx="39" cy="35" r="6.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
    <path d="M39 31V39M35 35H43" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 11. ইনভেনটরি রিপোর্ট (Inventory Reports) - Multi-colored analytics chart
export const ReportAnalyticsIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Graph Base */}
    <rect x="12" y="10" width="32" height="34" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
    {/* Bar 1 */}
    <rect x="16" y="28" width="5" height="12" rx="2" fill="#38BDF8" />
    {/* Bar 2 */}
    <rect x="24" y="20" width="5" height="20" rx="2" fill="#10B981" />
    {/* Bar 3 */}
    <rect x="32" y="14" width="5" height="26" rx="2" fill="#F59E0B" />
    {/* Upward Trend Line */}
    <path d="M16 26L26 18L35 13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    <path d="M31 13H35V17" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 12. দোকান সেটিংস (Shop Settings) - Modern emerald gear with slider tools
export const ShopSettingsIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Circular backdrop */}
    <rect x="12" y="12" width="32" height="32" rx="8" fill="#F1F5F9" />
    {/* Outer Gear */}
    <circle cx="28" cy="28" r="9" fill="#0F766E" />
    <circle cx="28" cy="28" r="4.5" fill="#F1F5F9" />
    {/* Gear teeth */}
    <rect x="26.5" y="16" width="3" height="4" rx="1" fill="#0F766E" />
    <rect x="26.5" y="36" width="3" height="4" rx="1" fill="#0F766E" />
    <rect x="16" y="26.5" width="4" height="3" rx="1" fill="#0F766E" />
    <rect x="36" y="26.5" width="4" height="3" rx="1" fill="#0F766E" />
    {/* Accent badge */}
    <circle cx="38" cy="18" r="4" fill="#14B8A6" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);
