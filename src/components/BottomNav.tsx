import React, { useState, useEffect } from 'react';
import { NavTab } from '../types';
import { LayoutGrid, Users, ShoppingBag, Package, Wallet, Headphones } from 'lucide-react';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  customerDueCount?: number;
  lowStockCount?: number;
  unreadSupportCount?: number;
  onOpenSupport?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  customerDueCount = 0,
  lowStockCount = 0,
  unreadSupportCount = 0,
  onOpenSupport,
}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        const inputType = (target as HTMLInputElement).type;
        if (
          inputType !== 'checkbox' &&
          inputType !== 'radio' &&
          inputType !== 'button' &&
          inputType !== 'submit'
        ) {
          setIsKeyboardVisible(true);
          document.body.classList.add('keyboard-open');
          document.documentElement.classList.add('keyboard-open');
        }
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            !active.isContentEditable)
        ) {
          setIsKeyboardVisible(false);
          document.body.classList.remove('keyboard-open');
          document.documentElement.classList.remove('keyboard-open');
        }
      }, 100);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.8;
        if (isShrunk) {
          setIsKeyboardVisible(true);
          document.body.classList.add('keyboard-open');
          document.documentElement.classList.add('keyboard-open');
        } else {
          const active = document.activeElement as HTMLElement;
          if (
            !active ||
            (active.tagName !== 'INPUT' &&
              active.tagName !== 'TEXTAREA' &&
              !active.isContentEditable)
          ) {
            setIsKeyboardVisible(false);
            document.body.classList.remove('keyboard-open');
            document.documentElement.classList.remove('keyboard-open');
          }
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
      document.documentElement.classList.remove('keyboard-open');
    };
  }, []);

  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'ড্যাশবোর্ড',
      icon: LayoutGrid,
    },
    {
      id: 'customers' as NavTab,
      label: 'কাস্টমার',
      icon: Users,
      badge: customerDueCount > 0 ? customerDueCount : undefined,
      badgeColor: 'bg-red-600',
    },
    {
      id: 'pos' as NavTab,
      label: 'দ্রুত বিক্রি',
      icon: ShoppingBag,
      isCenter: true,
    },
    {
      id: 'inventory' as NavTab,
      label: 'পণ্য স্টক',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'cashbook' as NavTab,
      label: 'ক্যাশবুক',
      icon: Wallet,
    },
    {
      id: 'support' as NavTab,
      label: 'সাপোর্ট',
      icon: Headphones,
      badge: unreadSupportCount > 0 ? unreadSupportCount : undefined,
      badgeColor: 'bg-teal-600',
      isAction: true,
    },
  ];

  if (isKeyboardVisible) {
    return null;
  }

  const handleTabClick = (tab: (typeof tabs)[0]) => {
    if (tab.id === 'support') {
      if (onOpenSupport) {
        onOpenSupport();
      } else {
        onTabChange('support');
      }
      return;
    }
    onTabChange(tab.id);
  };

  return (
    <nav
      id="bottom-navbar"
      className="w-full bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1 sm:px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:pb-1.5 flex items-center justify-around no-print shrink-0 relative z-30 select-none transition-all"
    >
      <div className="w-full max-w-6xl mx-auto grid grid-cols-6 items-center gap-0.5 sm:gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              id={`nav-tab-${tab.id}`}
              onClick={() => handleTabClick(tab)}
              className="w-full py-1 px-0.5 flex flex-col items-center justify-center relative rounded-xl transition-all duration-150 cursor-pointer active:scale-95 group focus:outline-none"
            >
              {/* Icon Container Pill */}
              <div
                className={`relative w-10 sm:w-12 h-7 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#004D40] text-white shadow-md shadow-teal-900/20 scale-105'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.4] text-emerald-200' : 'stroke-[1.8]'
                  }`}
                />

                {/* Badge Indicator */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 ${
                      tab.badgeColor || 'bg-red-600'
                    } text-white text-[8.5px] sm:text-[9px] font-black rounded-full px-1 min-w-[15px] h-[15px] flex items-center justify-center text-center shadow-xs ring-2 ring-white animate-pulse`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Text Label - Exactly same baseline across all 6 buttons */}
              <span
                className={`text-[10px] sm:text-[11px] mt-1 leading-tight tracking-tight whitespace-nowrap text-center transition-colors ${
                  isActive ? 'font-black text-[#004D40]' : 'font-semibold text-slate-500 group-hover:text-slate-800'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
