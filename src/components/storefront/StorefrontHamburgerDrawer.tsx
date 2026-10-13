import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Home,
  LayoutGrid,
  ShoppingBag,
  Heart,
  MessageCircle,
  Truck,
  Phone,
  Store,
  ShieldCheck,
  LogIn,
  ChevronRight,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';

interface StorefrontHamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
  onSelectTab: (tab: 'home' | 'categories' | 'orders' | 'wishlist' | 'more') => void;
  onOpenSupport: () => void;
  onMerchantLogin?: () => void;
  wishlistCount: number;
}

export const StorefrontHamburgerDrawer: React.FC<StorefrontHamburgerDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onSelectTab,
  onOpenSupport,
  onMerchantLogin,
  wishlistCount,
}) => {
  if (!isOpen) return null;

  const storeName = config.storeName || 'BikroyHub';

  const menuItems = [
    {
      id: 'home',
      label: 'হোমপেজ',
      icon: Home,
      action: () => {
        onSelectTab('home');
        onClose();
      },
    },
    {
      id: 'categories',
      label: 'সকল ক্যাটাগরি',
      icon: LayoutGrid,
      action: () => {
        onSelectTab('categories');
        onClose();
      },
    },
    {
      id: 'orders',
      label: 'আমার অর্ডারসমূহ',
      icon: ShoppingBag,
      action: () => {
        onSelectTab('orders');
        onClose();
      },
    },
    {
      id: 'wishlist',
      label: 'পছন্দের তালিকা',
      icon: Heart,
      badge: wishlistCount > 0 ? wishlistCount : undefined,
      action: () => {
        onSelectTab('wishlist');
        onClose();
      },
    },
    {
      id: 'support',
      label: 'কাস্টমার সাপোর্ট চ্যাট',
      icon: MessageCircle,
      action: () => {
        onOpenSupport();
        onClose();
      },
    },
    {
      id: 'more',
      label: 'দোকানের তথ্য ও পলিসি',
      icon: Truck,
      action: () => {
        onSelectTab('more');
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto"
      >
        <div>
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#004D40] to-[#00695C] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white leading-tight">{storeName}</h3>
                <p className="text-[11px] text-teal-100 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-300" />
                  <span>ভেরিফাইড অনলাইন শপ</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-teal-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Notice */}
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-900 font-medium">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{config.announcement || 'সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা!'}</span>
          </div>

          {/* Menu Items */}
          <div className="py-2 px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 active:bg-slate-100 text-slate-800 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#004D40] text-slate-700 group-hover:text-white flex items-center justify-center transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Contact & Helpline Info */}
          {(config.phone || config.address) && (
            <div className="m-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
              {config.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span className="font-semibold text-slate-800 font-mono">{config.phone}</span>
                </div>
              )}
              {config.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-tight text-slate-600">{config.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Merchant Login */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          {onMerchantLogin && (
            <button
              type="button"
              onClick={() => {
                onMerchantLogin();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#00695C]" />
              <span>দোকানদার লগইন (Admin Login)</span>
            </button>
          )}
          <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
            Powered by TWING হিসাবি ই-কমার্স
          </p>
        </div>
      </motion.div>
    </div>
  );
};
