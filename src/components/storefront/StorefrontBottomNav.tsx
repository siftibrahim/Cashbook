import React from 'react';
import { Home, LayoutGrid, ShoppingBag, Heart, Menu } from 'lucide-react';

export type StorefrontTab = 'home' | 'categories' | 'orders' | 'wishlist' | 'more';

interface StorefrontBottomNavProps {
  activeTab: StorefrontTab;
  onTabChange: (tab: StorefrontTab) => void;
  wishlistCount?: number;
  orderCount?: number;
}

export const StorefrontBottomNav: React.FC<StorefrontBottomNavProps> = ({
  activeTab,
  onTabChange,
  wishlistCount = 0,
  orderCount = 0,
}) => {
  const tabs = [
    { id: 'home' as StorefrontTab, label: 'হোম', icon: Home },
    { id: 'categories' as StorefrontTab, label: 'ক্যাটাগরি', icon: LayoutGrid },
    { id: 'orders' as StorefrontTab, label: 'অর্ডার', icon: ShoppingBag, badge: orderCount > 0 ? orderCount : undefined },
    { id: 'wishlist' as StorefrontTab, label: 'পছন্দের তালিকা', icon: Heart, badge: wishlistCount > 0 ? wishlistCount : undefined },
    { id: 'more' as StorefrontTab, label: 'আরও', icon: Menu },
  ];

  return (
    <nav className="bg-white border-t border-slate-200/80 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shrink-0 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sticky bottom-0">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              id={`storefront-tab-${tab.id}`}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer relative active:scale-95 ${
                isActive
                  ? 'text-[#00695C] font-black'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-black' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
