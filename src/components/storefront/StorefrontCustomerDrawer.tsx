import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, User, Phone, MapPin, Package, Heart, Check, Save } from 'lucide-react';
import { OnlineOrder } from '../../types';

interface StorefrontCustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerOrders: OnlineOrder[];
  onSelectTab: (tab: 'home' | 'categories' | 'orders' | 'wishlist' | 'more') => void;
  defaultName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  onSaveProfile?: (info: { name: string; phone: string; address: string }) => void;
}

export const StorefrontCustomerDrawer: React.FC<StorefrontCustomerDrawerProps> = ({
  isOpen,
  onClose,
  customerOrders,
  onSelectTab,
  defaultName = '',
  defaultPhone = '',
  defaultAddress = '',
  onSaveProfile,
}) => {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState(defaultAddress);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    setName(defaultName);
    setPhone(defaultPhone);
    setAddress(defaultAddress);
  }, [defaultName, defaultPhone, defaultAddress]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveProfile) {
      onSaveProfile({ name, phone, address });
    }
    setSavedSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
      />

      {/* Drawer */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.2 }}
        className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#004D40] to-[#00695C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-black">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">{name || 'সম্মানিত গ্রাহক'}</h3>
              <p className="text-[11px] text-teal-100">{phone || 'আপনার প্রোফাইল তথ্য'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-teal-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              type="button"
              onClick={() => {
                onSelectTab('orders');
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer text-left"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <Package className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-black text-slate-900">{customerOrders.length}</span>
              </div>
              <div className="text-xs font-bold text-slate-800">আমার অর্ডারসমূহ</div>
              <div className="text-[10px] text-slate-500">অর্ডার হিস্টোরি ও ট্র্যাকিং</div>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('wishlist');
                onClose();
              }}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer text-left"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xs font-bold text-slate-800">পছন্দের তালিকা</div>
              <div className="text-[10px] text-slate-500">সেভ করা পণ্যসমূহ</div>
            </button>
          </div>

          {/* Customer Delivery Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">ডেলিভারি ঠিকানা ও তথ্য</span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] font-bold text-[#00695C] hover:underline cursor-pointer"
              >
                {isEditing ? 'বাতিল' : 'পরিবর্তন করুন'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">আপনার নাম</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="আপনার পুরো নাম"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="০১XXXXXXXXX"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">সম্পূর্ণ ঠিকানা</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="বাসা/রোড/এলাকা/জেলা"
                    rows={2}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#004D40] text-white rounded-xl text-xs font-bold hover:bg-[#00382E] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold">{name || 'নাম সেট করা নেই'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{phone || 'নম্বর সেট করা নেই'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-600">{address || 'ঠিকানা সেট করা নেই'}</span>
                </div>
              </div>
            )}

            {savedSuccess && (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>তথ্য সফলভাবে সংরক্ষিত হয়েছে!</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
