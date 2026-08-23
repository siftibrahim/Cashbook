import React, { useState, useEffect } from 'react';
import { NavTab } from '../types';
import { LayoutGrid, Users, ShoppingBag, Package, Wallet } from 'lucide-react';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  customerDueCount?: number;
  lowStockCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  customerDueCount = 0,
  lowStockCount = 0,
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
      label: 'কাস্টমার ও বাকি',
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
  ];

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <nav
      id="bottom-navbar"
      className="w-full bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-1 sm:px-3 py-1.5 flex items-center justify-around no-print shrink-0 relative z-30 transition-all duration-150 select-none"
    >
      <div className="w-full max-w-4xl mx-auto flex items-center justify-around gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                type="button"
                id={`nav-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className="flex-1 -mt-4 py-1 px-1 flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer active:scale-90 select-none group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-[#004D40] to-[#00796B] text-white ring-4 ring-teal-100 scale-105'
                      : 'bg-gradient-to-tr from-[#00695C] to-[#00897B] text-white hover:brightness-110'
                  }`}
                >
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] mt-1 font-bold whitespace-nowrap tracking-tight ${
                    isActive ? 'text-[#004D40]' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              id={`nav-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-1.5 px-0.5 flex flex-col items-center justify-center gap-1 relative transition-all duration-150 rounded-xl cursor-pointer active:scale-95 select-none ${
                isActive
                  ? 'bg-teal-50/90 text-[#004D40] font-black'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-[#004D40] rounded-full shadow-xs animate-in fade-in" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5] text-[#004D40]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 ${
                      tab.badgeColor || 'bg-red-600'
                    } text-white text-[9px] font-black rounded-full px-1.5 py-0.2 min-w-[16px] text-center shadow-xs`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10.5px] sm:text-xs leading-tight tracking-tight whitespace-nowrap text-center ${
                  isActive ? 'font-black text-[#004D40]' : 'font-semibold text-slate-600'
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
