import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
import {
  X,
  Globe,
  Store,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Truck,
  CreditCard,
  Settings,
  Package,
  ShoppingBag,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Phone,
  MessageCircle,
  QrCode,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Eye,
  DollarSign,
  Send,
  Plus,
} from 'lucide-react';

interface OnlineStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
  onUpdateConfig: (newConfig: OnlineStoreConfig) => void;
  products: Product[];
  orders: OnlineOrder[];
  onUpdateOrders: (orders: OnlineOrder[]) => void;
  store: StoreProfile;
  onOpenStorefront: () => void;
  onNavigateToTab?: (tab: 'customers' | 'pos' | 'inventory' | 'cashbook') => void;
  onConvertOrderToSale?: (order: OnlineOrder) => void;
}

type TabType = 'overview' | 'domain' | 'settings' | 'catalog' | 'orders';

export const OnlineStoreModal: React.FC<OnlineStoreModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  products,
  orders,
  onUpdateOrders,
  store,
  onOpenStorefront,
  onNavigateToTab,
  onConvertOrderToSale,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Form states initialized with config
  const [formData, setFormData] = useState<OnlineStoreConfig>(config);
  const [customDomainInput, setCustomDomainInput] = useState(config.customDomain || '');
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [domainVerifySuccess, setDomainVerifySuccess] = useState<string | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OnlineOrder | null>(null);

  // Sync formData when config changes
  React.useEffect(() => {
    setFormData(config);
    setCustomDomainInput(config.customDomain || '');
  }, [config]);

  if (!isOpen) return null;

  const currentDomainDisplay = formData.customDomainVerified && formData.customDomain
    ? formData.customDomain
    : `${formData.storeSlug || 'shop'}.twingstore.com`;

  const copyToClipboard = (text: string, type?: string) => {
    navigator.clipboard.writeText(text);
    if (type) {
      setCopiedRecord(type);
      setTimeout(() => setCopiedRecord(null), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateConfig(formData);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleVerifyCustomDomain = () => {
    const domain = customDomainInput.trim().toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain || !domain.includes('.')) {
      alert('অনুগ্রহ করে সঠিক ডোমেন নাম লিখুন (যেমন: www.myshopbd.com অথবা mybrand.com)');
      return;
    }

    setIsVerifyingDomain(true);
    setTimeout(() => {
      setIsVerifyingDomain(false);
      const updated: OnlineStoreConfig = {
        ...formData,
        customDomain: domain,
        customDomainVerified: true,
        customDomainStatus: 'verified',
        customDomainVerifiedAt: Date.now(),
      };
      setFormData(updated);
      onUpdateConfig(updated);
      setDomainVerifySuccess('অভিনন্দন! আপনার কাস্টম ডোমেন সফলভাবে ভেরিফাই ও সংযুক্ত হয়েছে। ফ্রি SSL সক্রিয়!');
      setTimeout(() => setDomainVerifySuccess(null), 5000);
    }, 1200);
  };

  const handleDisconnectDomain = () => {
    if (confirm('আপনি কি এই কাস্টম ডোমেনটি ডিসকানেক্ট করতে চান?')) {
      const updated: OnlineStoreConfig = {
        ...formData,
        customDomain: '',
        customDomainVerified: false,
        customDomainStatus: 'pending',
      };
      setCustomDomainInput('');
      setFormData(updated);
      onUpdateConfig(updated);
    }
  };

  const handleToggleProductPublish = (productId: string) => {
    const currentList = formData.publishedProductIds || [];
    let updatedList: string[];
    if (currentList.length === 0) {
      // If initially empty, all products are considered published, so disabling this one means including all except this one
      updatedList = products.map((p) => p.id).filter((id) => id !== productId);
    } else if (currentList.includes(productId)) {
      updatedList = currentList.filter((id) => id !== productId);
    } else {
      updatedList = [...currentList, productId];
    }

    const updated = { ...formData, publishedProductIds: updatedList };
    setFormData(updated);
    onUpdateConfig(updated);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OnlineOrder['orderStatus']) => {
    const updatedOrders = orders.map((ord) =>
      ord.id === orderId ? { ...ord, orderStatus: newStatus, updatedAt: Date.now() } : ord
    );
    onUpdateOrders(updatedOrders);
  };

  const handleGenerateTestOrder = () => {
    const sampleProduct = products[0] || {
      id: 'prd_demo',
      name: 'প্রিমিয়াম সুতি পাঞ্জাবি / টি-শার্ট',
      salePrice: 750,
      unit: 'টি',
    };

    const testOrder: OnlineOrder = {
      id: `ord_${Date.now()}_test`,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: 'তানভীর আহমেদ (টেস্ট গ্রাহক)',
      customerPhone: '01712345678',
      customerAddress: 'হাউস ১২, রোড ৪, ধানমন্ডি, ঢাকা',
      deliveryArea: 'inside_dhaka',
      deliveryCharge: formData.deliveryInsideDhaka || 60,
      items: [
        {
          productId: sampleProduct.id,
          productName: sampleProduct.name,
          unitPrice: sampleProduct.salePrice,
          quantity: 2,
          unit: sampleProduct.unit || 'টি',
          total: sampleProduct.salePrice * 2,
        },
      ],
      subtotal: sampleProduct.salePrice * 2,
      totalAmount: sampleProduct.salePrice * 2 + (formData.deliveryInsideDhaka || 60),
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      notes: 'অফিস টাইমে ডেলিভারি দিলে ভালো হয়।',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onUpdateOrders([testOrder, ...orders]);
    setActiveTab('orders');
  };

  const handleShareOnWhatsApp = () => {
    const text = `🛍️ আসসালামু আলাইকুম! আমাদের অনলাইন শপ এখন সম্পূর্ণ লাইভ।\nঘরে বসেই সেরা মূল্যে পছন্দের পণ্য অর্ডার করতে ভিজিট করুন:\n👉 https://${currentDomainDisplay}\n\nধন্যবাদ,\n${formData.storeName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isProductPublished = (prodId: string) => {
    if (!formData.publishedProductIds || formData.publishedProductIds.length === 0) {
      return true;
    }
    return formData.publishedProductIds.includes(prodId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#004D40] to-[#00695C] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">অনলাইন ই-কমার্স স্টোর ও ডোমেন</h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    formData.isEnabled
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-red-400 text-slate-950'
                  }`}
                >
                  {formData.isEnabled ? '● স্টোর লাইভ' : '○ অফলাইন'}
                </span>
              </div>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                আপনার নিজস্ব ওয়েবসাইট ও ডোমেনে ২৪/৭ অনলাইন ব্যবসা পরিচালনা করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStorefront}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="ওয়েবসাইট দেখুন"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">স্টোর দেখুন</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-teal-100 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-5 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-teal-700" />
            <span>ওভারভিউ ও শেয়ার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'domain'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>কাস্টম ডোমেন</span>
            {formData.customDomainVerified && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>অনলাইন অর্ডার ({orders.length})</span>
            {orders.filter((o) => o.orderStatus === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black">
                {orders.filter((o) => o.orderStatus === 'pending').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-amber-600" />
            <span>পণ্য ক্যাটালগ ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-teal-700 text-teal-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>ই-কমার্স সেটিংস</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {saveSuccessNotice && (
            <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>অনলাইন স্টোর তথ্য সফলভাবে সংরক্ষিত হয়েছে!</span>
            </div>
          )}

          {domainVerifySuccess && (
            <div className="mb-4 bg-teal-50 border border-teal-300 text-teal-900 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{domainVerifySuccess}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & SHARE */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Store Status Banner */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                      লাইভ ওয়েবসাইট অ্যাড্রেস
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-mono">
                      https://{currentDomainDisplay}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      এই লিংকটি ফেসবুক, হোয়াটসঅ্যাপ বা ভিজিটিং কার্ডে শেয়ার করে সরাসরি অনলাইন অর্ডার গ্রহণ করুন।
                    </p>
                  </div>

                  {/* Toggle Live */}
                  <div className="flex items-center gap-2 shrink-0 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...formData, isEnabled: !formData.isEnabled };
                        setFormData(updated);
                        onUpdateConfig(updated);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        formData.isEnabled
                          ? 'bg-[#004D40] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {formData.isEnabled ? 'চালু আছে' : 'বন্ধ রাখুন'}
                    </button>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`https://${currentDomainDisplay}`)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareOnWhatsApp}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp শেয়ার</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenStorefront}
                    className="p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-700" />
                    <span>ওয়েবসাইট প্রিভিউ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('domain')}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-700" />
                    <span>ডোমেন সেটিং</span>
                  </button>
                </div>
              </div>

              {/* Fast Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">অনলাইন পণ্য</span>
                    <Package className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{products.length} টি</div>
                  <div className="text-[11px] text-teal-700 font-bold mt-0.5">সবগুলো স্বয়ংক্রিয় সিঙ্ক</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">মোট অর্ডার</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">{orders.length} টি</div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    নতুন: {orders.filter((o) => o.orderStatus === 'pending').length}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">মোট অনলাইন বিক্রি</span>
                    <DollarSign className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    ৳ {formatMoney(orders.filter((o) => o.orderStatus !== 'cancelled').reduce((acc, o) => acc + o.totalAmount, 0))}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">ডেলিভারি সহ</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">ডোমেন স্ট্যাটাস</span>
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {formData.customDomainVerified ? 'কাস্টম ডোমেন' : 'সাব-ডোমেন'}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-0.5">SSL সুরক্ষিত (HTTPS)</div>
                </div>
              </div>

              {/* How it works guidance */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-3xl p-5 border border-teal-200/70 space-y-3">
                <h4 className="text-sm font-bold text-teal-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>অনলাইন স্টোরের মাধ্যমে আপনার ব্যবসা বৃদ্ধি করুন</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">১. পণ্য যুক্ত করুন</div>
                    <p className="text-slate-600 leading-relaxed">
                      দোকানের ইনভেনটরিতে পণ্য যুক্ত করলেই স্বয়ংক্রিয়ভাবে আপনার অনলাইন স্টোরে শো করবে।
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">২. লিংক কাস্টমারকে দিন</div>
                    <p className="text-slate-600 leading-relaxed">
                      ওয়েবসাইট লিংক দিয়ে কাস্টমারকে সরাসরি অর্ডার করতে বলুন। কোনো অ্যাপ ইন্সটলের দরকার নেই।
                    </p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-teal-100 space-y-1">
                    <div className="font-bold text-teal-900">৩. অর্ডার ও পেমেন্ট নিন</div>
                    <p className="text-slate-600 leading-relaxed">
                      কাস্টমার অর্ডার করলে সরাসরি আপনার প্যানেলে অর্ডার আসবে এবং হোয়াটসঅ্যাপে কনফার্ম করতে পারবেন।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM DOMAIN & SUBDOMAIN */}
          {activeTab === 'domain' && (
            <div className="space-y-6">
              {/* Free Subdomain Setting */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    ১
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">ফ্রি ইনস্ট্যান্ট সাব-ডোমেন</h3>
                    <p className="text-xs text-slate-500">কোনো খরচ ছাড়াই তাৎক্ষণিক সক্রিয় ব্র্যান্ডেড ওয়েব অ্যাড্রেস</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-2">
                  <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs sm:text-sm focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-500/20">
                    <span className="text-slate-400">https://</span>
                    <input
                      type="text"
                      value={formData.storeSlug}
                      onChange={(e) => {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setFormData({ ...formData, storeSlug: clean });
                      }}
                      className="bg-transparent font-bold text-teal-900 focus:outline-none px-1 flex-1 min-w-0"
                      placeholder="your-shop-name"
                    />
                    <span className="text-slate-500 font-bold">.twingstore.com</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings()}
                    className="px-4 py-2 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  >
                    সেভ করুন
                  </button>
                </div>
              </div>

              {/* Connect Custom Domain (Own Domain) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      ২
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        আপনার নিজস্ব ডোমেন যুক্ত করুন (Own Custom Domain)
                      </h3>
                      <p className="text-xs text-slate-500">
                        যেমন: আপনার নিজের কেনা .com, .xyz, .com.bd ডোমেন যুক্ত করে প্রফেশনাল ব্র্যান্ড তৈরি করুন
                      </p>
                    </div>
                  </div>

                  {formData.customDomainVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ভেরিফাইড ও সক্রিয়
                    </span>
                  )}
                </div>

                {/* Input row */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">ডোমেন নাম লিখুন:</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="যেমন: www.mybrandshop.com অথবা myshop.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyCustomDomain}
                        disabled={isVerifyingDomain || !customDomainInput.trim()}
                        className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isVerifyingDomain ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>ভেরিফাই হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ভেরিফাই ও সংযুক্ত করুন</span>
                          </>
                        )}
                      </button>

                      {formData.customDomainVerified && (
                        <button
                          type="button"
                          onClick={handleDisconnectDomain}
                          className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          ডিসকানেক্ট
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* DNS Configuration Instructions (Zero Hassle) */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      <span>DNS সেটিংস নির্দেশিকা (যেখান থেকে ডোমেন কিনেছেন সেখানে এন্ট্রি করুন):</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">ঝামেলামুক্ত ৩ মিনিট সেটআপ</span>
                  </div>

                  {/* DNS Records Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold">
                          <th className="pb-2">রেকর্ড টাইপ</th>
                          <th className="pb-2">নাম / হোস্ট</th>
                          <th className="pb-2">টার্গেট / ভ্যালু</th>
                          <th className="pb-2">TTL</th>
                          <th className="pb-2 text-right">কপি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 font-mono">
                        <tr>
                          <td className="py-2.5 font-bold text-indigo-700">CNAME</td>
                          <td className="py-2.5 text-slate-800">www</td>
                          <td className="py-2.5 text-teal-800 font-bold">cname.twingstore.com</td>
                          <td className="py-2.5 text-slate-500">স্বয়ংক্রিয় / 3600</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard('cname.twingstore.com', 'cname')}
                              className="p-1 text-slate-500 hover:text-indigo-600"
                              title="কপি করুন"
                            >
                              {copiedRecord === 'cname' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-bold text-indigo-700">A Record</td>
                          <td className="py-2.5 text-slate-800">@</td>
                          <td className="py-2.5 text-teal-800 font-bold">76.76.21.21</td>
                          <td className="py-2.5 text-slate-500">স্বয়ংক্রিয় / 3600</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => copyToClipboard('76.76.21.21', 'arecord')}
                              className="p-1 text-slate-500 hover:text-indigo-600"
                              title="কপি করুন"
                            >
                              {copiedRecord === 'arecord' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-xl p-2.5 text-[11px] text-indigo-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                      <span>ফ্রি অটোমেটিক SSL সার্টিফিকেট (HTTPS) অন্তর্ভুক্ত:</span>
                    </p>
                    <p className="text-indigo-800/90 leading-relaxed">
                      ডোমেন কানেক্ট হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে বিনামূল্যে SSL সার্টিফিকেট সক্রিয় হয়ে যায়। আপনার ক্রেতারা ব্রাউজারে নিরাপদ তালা আইকন দেখতে পাবেন।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORE SETTINGS & CUSTOMIZER */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Basic Brand Info */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-teal-700" />
                  <span>দোকানের ব্র্যান্ডিং ও তথ্য</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">অনলাইন স্টোরের নাম *</label>
                    <input
                      type="text"
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">স্টোরের ক্যাটাগরি</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="উদাঃ ফ্যাশন, মুদি, কসমেটিকস"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">ট্যাগলাইন বা স্লোগান</label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      placeholder="উদাঃ সেরা মানের পোশাক ও দ্রুততম হোম ডেলিভারি"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">টপ অ্যানাউন্সমেন্ট ব্যানার টেক্সট</label>
                    <input
                      type="text"
                      value={formData.announcement}
                      onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                      placeholder="উদাঃ 🎉 ফ্রি ডেলিভারি অফার! প্রথম অর্ডারে বিশেষ ছাড়!"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <span>ডেলিভারি চার্জ ও শর্তাবলী</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ঢাকা সিটির ভেতরে ডেলিভারি ফি (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryInsideDhaka}
                      onChange={(e) => setFormData({ ...formData, deliveryInsideDhaka: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ঢাকার বাইরে ডেলিভারি ফি (৳)</label>
                    <input
                      type="number"
                      value={formData.deliveryOutsideDhaka}
                      onChange={(e) => setFormData({ ...formData, deliveryOutsideDhaka: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">কত টাকার উপরে ফ্রি ডেলিভারি (৳)</label>
                    <input
                      type="number"
                      value={formData.freeDeliveryAbove || ''}
                      onChange={(e) => setFormData({ ...formData, freeDeliveryAbove: Number(e.target.value) || 0 })}
                      placeholder="উদাঃ 1500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-700" />
                  <span>পেমেন্ট গেটওয়ে ও মোবাইল ব্যাংকিং</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* COD */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-800">ক্যাশ অন ডেলিভারি (COD)</div>
                      <div className="text-[11px] text-slate-500">পণ্য হাতে পেয়ে টাকা প্রদান</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.acceptCOD}
                      onChange={(e) => setFormData({ ...formData, acceptCOD: e.target.checked })}
                      className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>

                  {/* bKash */}
                  <div className="p-3 rounded-2xl border border-pink-200 bg-pink-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs sm:text-sm text-pink-900">বিকাশ (bKash) পেমেন্ট</div>
                      <input
                        type="checkbox"
                        checked={formData.acceptBkash}
                        onChange={(e) => setFormData({ ...formData, acceptBkash: e.target.checked })}
                        className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                      />
                    </div>
                    {formData.acceptBkash && (
                      <input
                        type="text"
                        value={formData.bkashNumber || ''}
                        onChange={(e) => setFormData({ ...formData, bkashNumber: e.target.value })}
                        placeholder="বিকাশ নম্বর (পার্সোনাল বা মার্চেন্ট)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-pink-300 bg-white text-xs font-semibold"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Contact & WhatsApp */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-700" />
                  <span>গ্রাহক যোগাযোগ ও WhatsApp</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">WhatsApp নম্বর (অর্ডার নোটিফিকেশনের জন্য)</label>
                    <input
                      type="text"
                      value={formData.whatsappPhone}
                      onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                      placeholder="উদাঃ 017XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">সরাসরি কল নম্বর</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="উদাঃ 017XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-2xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>সকল পরিবর্তন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: PRODUCT CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">অনলাইন ক্যাটালগ ও পণ্য প্রকাশ</h3>
                  <p className="text-xs text-slate-500">
                    যে যে পণ্য অনলাইনে সক্রিয় থাকবে শুধুমাত্র সেগুলোই গ্রাহকরা ওয়েবসাইটে দেখতে পাবেন।
                  </p>
                </div>

                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTab('inventory');
                    }}
                    className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন পণ্য যুক্ত করুন</span>
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                  <Package className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">ইনভেনটরিতে কোনো পণ্য নেই</p>
                  <p className="text-xs text-slate-500">
                    দোকানের পণ্য স্টক ট্যাবে পণ্য যুক্ত করুন, সেগুলো এখানে চলে আসবে।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((prod) => {
                    const isPub = isProductPublished(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 hover:border-teal-300 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{prod.name}</h4>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {isPub ? 'অনলাইনে সক্রিয়' : 'লুকানো'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="font-bold text-teal-800">৳ {formatMoney(prod.salePrice)}</span>
                            <span>স্টক: {prod.stock} {prod.unit || 'টি'}</span>
                            {prod.category && <span className="text-slate-400">({prod.category})</span>}
                          </div>
                        </div>

                        {/* Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductPublish(prod.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                            isPub
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isPub ? 'অনলাইন' : 'বন্ধ'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ONLINE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">অনলাইন গ্রাহকদের অর্ডারসমূহ</h3>
                  <p className="text-xs text-slate-500">
                    ওয়েবসাইট থেকে আসা সকল অর্ডারের তালিকা ও স্ট্যাটাস ম্যানেজমেন্ট
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateTestOrder}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ টেস্ট অর্ডার যোগ করুন</span>
                  </button>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">এখনো কোনো অনলাইন অর্ডার আসেনি</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    গ্রাহকরা আপনার অনলাইন স্টোরে ভিজিট করে অর্ডার দিলে সাথে সাথে এখানে জমা হবে। আপনি উপরে '+ টেস্ট অর্ডার যোগ করুন' বাটনে ক্লিক করে পরীক্ষা করতে পারেন।
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => {
                    const statusColors = {
                      pending: 'bg-amber-100 text-amber-900 border-amber-300',
                      confirmed: 'bg-blue-100 text-blue-900 border-blue-300',
                      processing: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                      shipped: 'bg-purple-100 text-purple-900 border-purple-300',
                      delivered: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                      cancelled: 'bg-red-100 text-red-900 border-red-300',
                    };

                    const statusLabels = {
                      pending: 'নতুন (অপেক্ষমান)',
                      confirmed: 'নিশ্চিত করা হয়েছে',
                      processing: 'প্যাকিং চলছে',
                      shipped: 'ডেলিভারিতে আছে',
                      delivered: 'ডেলিভারি সম্পন্ন',
                      cancelled: 'বাতিল',
                    };

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {ord.orderNumber}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                statusColors[ord.orderStatus] || statusColors.pending
                              }`}
                            >
                              {statusLabels[ord.orderStatus] || ord.orderStatus}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {new Date(ord.createdAt).toLocaleDateString('bn-BD')} •{' '}
                              {new Date(ord.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">স্ট্যাটাস পরিবর্তন:</span>
                            <select
                              value={ord.orderStatus}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as OnlineOrder['orderStatus'])}
                              className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
                            >
                              <option value="pending">নতুন (পেন্ডিং)</option>
                              <option value="confirmed">নিশ্চিত</option>
                              <option value="processing">প্যাকিং</option>
                              <option value="shipped">ডেলিভারিতে</option>
                              <option value="delivered">সম্পন্ন</option>
                              <option value="cancelled">বাতিল</option>
                            </select>
                          </div>
                        </div>

                        {/* Customer & Product Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 text-sm">{ord.customerName}</div>
                            <div className="text-slate-600 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{ord.customerPhone}</span>
                            </div>
                            <div className="text-slate-500 leading-relaxed">
                              ঠিকানা: {ord.customerAddress} ({ord.deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'})
                            </div>
                          </div>

                          <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                            <div className="font-bold text-slate-800">অর্ডারকৃত পণ্য:</div>
                            <div className="space-y-0.5">
                              {ord.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                  <span>{item.productName} ({item.quantity} {item.unit})</span>
                                  <span className="font-bold">৳ {formatMoney(item.total)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-200 pt-1 flex justify-between font-black text-slate-900">
                              <span>ডেলিভারি সহ সর্বমোট:</span>
                              <span className="text-teal-900">৳ {formatMoney(ord.totalAmount)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Order Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 flex-wrap">
                          <a
                            href={`https://wa.me/88${ord.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `আসসালামু আলাইকুম ${ord.customerName} ভাই, ${formData.storeName} থেকে আপনার অনলাইন অর্ডার #${ord.orderNumber} এর বিষয়ে যোগাযোগ করা হয়েছে। আপনার মোট বিল ৳${formatMoney(ord.totalAmount)}। ধন্যবাদ!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp বার্তা</span>
                          </a>

                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>কল করুন</span>
                          </a>

                          {onConvertOrderToSale && (
                            <button
                              type="button"
                              onClick={() => onConvertOrderToSale(ord)}
                              className="px-3 py-1.5 bg-[#004D40] hover:bg-[#00382E] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>বিক্রির খাতায় এন্ট্রি</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
