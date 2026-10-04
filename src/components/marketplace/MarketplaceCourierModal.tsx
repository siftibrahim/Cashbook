import React, { useState, useEffect } from 'react';
import {
  Truck,
  X,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Send,
  User,
  Phone,
  Barcode,
  AlertTriangle,
  Zap,
  Printer,
  Settings,
  Sparkles,
  Info,
  MapPin,
  FileText,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { userSmsApi, courierApi, CourierCredentials } from '../../services/apiService';
import { ShippingLabelModal, ShippingLabelData } from '../courier/ShippingLabelModal';
import { formatMoney } from '../../utils/storage';

interface MarketplaceCourierModalProps {
  order: any;
  smsBalance?: number;
  onClose: () => void;
  onSaveCourier: (data: {
    courierName: string;
    courierTrackingCode: string;
    deliveryManName?: string;
    deliveryManPhone?: string;
    autoShip?: boolean;
  }) => Promise<void>;
}

export const MarketplaceCourierModal: React.FC<MarketplaceCourierModalProps> = ({
  order,
  smsBalance,
  onClose,
  onSaveCourier,
}) => {
  const [activeTab, setActiveTab] = useState<'one_click' | 'manual' | 'settings'>('one_click');

  // One-click courier booking states
  const [selectedProvider, setSelectedProvider] = useState<'steadfast' | 'pathao'>('steadfast');
  const [recipientName, setRecipientName] = useState<string>(order.customerName || 'সম্মানিত গ্রাহক');
  const [recipientPhone, setRecipientPhone] = useState<string>(order.customerPhone || '');
  const [recipientAddress, setRecipientAddress] = useState<string>(order.customerAddress || '');
  const [codAmount, setCodAmount] = useState<number>(Number(order.totalAmount || order.payableAmount || 0));
  const [deliveryNote, setDeliveryNote] = useState<string>('হ্যান্ডেল উইথ কেয়ার - টুইং হিসাবি পার্সেল');
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState<any>(null);

  // Manual courier state
  const [manualCourierName, setManualCourierName] = useState<string>(order.courierName || 'Steadfast Courier');
  const [courierTrackingCode, setCourierTrackingCode] = useState<string>(order.courierTrackingCode || '');
  const [deliveryManName, setDeliveryManName] = useState<string>(order.deliveryManName || '');
  const [deliveryManPhone, setDeliveryManPhone] = useState<string>(order.deliveryManPhone || '');
  const [autoShip, setAutoShip] = useState<boolean>(order.overallStatus !== 'shipped' && order.overallStatus !== 'delivered');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // SMS Balance
  const [currentSmsBal, setCurrentSmsBal] = useState<number>(smsBalance !== undefined ? smsBalance : 0);

  // Shipping Label Print Modal
  const [shippingLabelData, setShippingLabelData] = useState<ShippingLabelData | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);

  // API Settings State
  const [creds, setCreds] = useState<CourierCredentials | null>(null);
  const [steadfastApiKey, setSteadfastApiKey] = useState<string>('');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState<string>('');
  const [pathaoClientId, setPathaoClientId] = useState<string>('');
  const [pathaoClientSecret, setPathaoClientSecret] = useState<string>('');
  const [pathaoUsername, setPathaoUsername] = useState<string>('');
  const [pathaoPassword, setPathaoPassword] = useState<string>('');
  const [pathaoStoreId, setPathaoStoreId] = useState<string>('');
  const [isSavingCreds, setIsSavingCreds] = useState<boolean>(false);
  const [credsSavedMsg, setCredsSavedMsg] = useState<string>('');
  const [isLoadingCreds, setIsLoadingCreds] = useState<boolean>(false);

  useEffect(() => {
    if (smsBalance === undefined) {
      userSmsApi.getBalance().then((res) => {
        setCurrentSmsBal(res?.balance ?? 0);
      }).catch(() => {});
    } else {
      setCurrentSmsBal(smsBalance);
    }
  }, [smsBalance]);

  // Load merchant's courier settings
  useEffect(() => {
    let isMounted = true;
    setIsLoadingCreds(true);
    courierApi.getSettings().then((res) => {
      if (!isMounted) return;
      setCreds(res);
      if (res?.provider) {
        setSelectedProvider(res.provider);
      }
      if (res?.pathaoStoreId) setPathaoStoreId(res.pathaoStoreId);
    }).catch(() => {}).finally(() => {
      if (isMounted) setIsLoadingCreds(false);
    });
    return () => { isMounted = false; };
  }, []);

  const handleOpenRecharge = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_open_sms_recharge', { detail: { tab: 'packages' } }));
    }
  };

  const manualCouriers = [
    { name: 'Steadfast Courier', label: 'স্টিডফাস্ট (Steadfast)', trackUrl: 'https://steadfast.com.bd/t/' },
    { name: 'Pathao Courier', label: 'পাঠাও (Pathao)', trackUrl: 'https://pathao.com/courier-tracking/' },
    { name: 'RedX Delivery', label: 'রেডএক্স (RedX)', trackUrl: 'https://redx.com.bd/track/' },
    { name: 'Paperfly', label: 'পেপারফ্লাই (Paperfly)', trackUrl: 'https://paperfly.com.bd/tracking' },
    { name: 'eCourier', label: 'ই-কুরিয়ার (eCourier)', trackUrl: 'https://ecourier.com.bd/track' },
    { name: 'Sundarban Courier', label: 'সুন্দরবন কুরিয়ার', trackUrl: '' },
    { name: 'Own Rider', label: 'দোকানের নিজস্ব রাইডার', trackUrl: '' },
  ];

  const currentManualObj = manualCouriers.find((c) => c.name === manualCourierName);
  const manualTrackUrl = currentManualObj?.trackUrl && courierTrackingCode
    ? `${currentManualObj.trackUrl}${courierTrackingCode}`
    : '';

  // 1-Click Courier Booking Execution
  const handleOneClickBook = async () => {
    if (currentSmsBal < 1) {
      handleOpenRecharge();
      return;
    }

    if (!recipientPhone.trim() || !recipientAddress.trim()) {
      alert('কাস্টমারের মোবাইল নম্বর ও পূর্ণ ঠিকানা আবশ্যক।');
      return;
    }

    setIsBooking(true);
    try {
      const res = await courierApi.bookCourier({
        orderId: order.id || order.orderNumber,
        provider: selectedProvider,
        recipientName: recipientName.trim() || 'সম্মানিত গ্রাহক',
        recipientPhone: recipientPhone.trim(),
        recipientAddress: recipientAddress.trim(),
        codAmount: Number(codAmount || 0),
        deliveryNote: deliveryNote.trim(),
        itemDescription: `Twing Order #${order.orderNumber || order.id}`,
      });

      if (res && res.success) {
        setBookingSuccessResult(res);
        // Sync with order status
        await onSaveCourier({
          courierName: res.booking.provider,
          courierTrackingCode: res.booking.trackingCode,
          autoShip: true,
        });
        // Prepare printable label
        if (res.printLabel) {
          setShippingLabelData({
            ...res.printLabel,
            storeName: order.storeName || order.vendorName || 'আমাদের শপ',
            storePhone: order.storePhone || '',
            note: deliveryNote,
          });
        }
      } else {
        alert(res?.message || 'কুরিয়ার বুকিং করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'কুরিয়ার বুকিং এরর!';
      if (err?.response?.data?.needsSmsRecharge || errMsg.includes('এসএমএস ব্যালেন্স নেই')) {
        handleOpenRecharge();
      } else {
        alert(errMsg);
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Manual Courier Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCourierName.trim()) return;

    if (currentSmsBal < 1) {
      handleOpenRecharge();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveCourier({
        courierName: manualCourierName.trim(),
        courierTrackingCode: courierTrackingCode.trim(),
        deliveryManName: deliveryManName.trim() || undefined,
        deliveryManPhone: deliveryManPhone.trim() || undefined,
        autoShip,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Merchant API Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCreds(true);
    setCredsSavedMsg('');
    try {
      const res = await courierApi.saveSettings({
        provider: selectedProvider,
        steadfastApiKey: steadfastApiKey.trim() || undefined,
        steadfastSecretKey: steadfastSecretKey.trim() || undefined,
        pathaoClientId: pathaoClientId.trim() || undefined,
        pathaoClientSecret: pathaoClientSecret.trim() || undefined,
        pathaoUsername: pathaoUsername.trim() || undefined,
        pathaoPassword: pathaoPassword.trim() || undefined,
        pathaoStoreId: pathaoStoreId.trim() || undefined,
      });
      setCredsSavedMsg(res?.message || '✅ এপিআই সেটিংস সংরক্ষিত হয়েছে!');
      setTimeout(() => setCredsSavedMsg(''), 4000);
    } catch (err: any) {
      alert(err?.message || 'সেটিংস সেভ করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleCopyCode = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
        <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base">১-ক্লিক কুরিয়ার বুকিং ও ট্র্যাকিং</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    currentSmsBal > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  }`}>
                    SMS: {currentSmsBal} টি
                  </span>
                </div>
                <p className="text-[11px] text-teal-200">
                  অর্ডার #{order.orderNumber || order.id} • কাস্টমার: {order.customerName || 'গ্রাহক'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="bg-slate-100 p-1.5 flex items-center gap-1 border-b border-slate-200 shrink-0 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('one_click')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'one_click'
                  ? 'bg-white text-teal-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>১-ক্লিক বুকিং (Steadfast / Pathao)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-teal-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>ম্যানুয়াল ট্র্যাকিং</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-teal-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="কুরিয়ার এপিআই সেটিংস"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Insufficient SMS Warning Banner */}
          {currentSmsBal < 1 && (
            <div className="m-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-xs shrink-0">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-amber-950 text-xs">
                    ⚠️ এসএমএস ব্যালেন্স নেই (০ টি)!
                  </h4>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed font-medium">
                    গ্রাহককে কুরিয়ার ট্র্যাকিং কোড ও ডেলিভারি আপডেট এসএমএস পাঠাতে অন্তত ১টি এসএমএস ব্যালেন্স থাকা প্রয়োজন।
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenRecharge}
                      className="px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-lg text-xs flex items-center gap-1 shadow-xs hover:brightness-105 transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>মেসেজ রিচার্জ করুন</span>
                    </button>
                    <span className="text-[10px] text-amber-700 font-bold">
                      (৫০টি SMS মাত্র ২৫৳)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ONE-CLICK BOOKING */}
          {activeTab === 'one_click' && (
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* If booking was already completed just now */}
              {bookingSuccessResult ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center gap-2.5 text-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm text-emerald-950">
                        {bookingSuccessResult.message}
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        কাস্টমারকে ট্র্যাকিং লিংক সহ স্বয়ংক্রিয় এসএমএস পাঠানো হয়েছে।
                      </p>
                    </div>
                  </div>

                  {/* Consignment Details */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-sans text-[11px]">কুরিয়ার:</span>
                      <strong className="text-slate-800">{bookingSuccessResult.booking.provider}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-sans text-[11px]">ট্র্যাকিং কোড:</span>
                      <div className="flex items-center gap-1.5 font-black text-emerald-700">
                        <span>{bookingSuccessResult.booking.trackingCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(bookingSuccessResult.booking.trackingCode)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 transition cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {bookingSuccessResult.booking.consignmentId && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans text-[11px]">কনসাইনমেন্ট আইডি:</span>
                        <span className="text-slate-700">{bookingSuccessResult.booking.consignmentId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-sans text-[11px]">COD কালেকশন:</span>
                      <strong className="text-rose-700">৳ {formatMoney(bookingSuccessResult.booking.codAmount)}</strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsLabelModalOpen(true)}
                      className="flex-1 py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>শিপিং লেবেল / পার্সেল স্লিপ প্রিন্ট করুন</span>
                    </button>
                    {bookingSuccessResult.booking.trackingUrl && (
                      <a
                        href={bookingSuccessResult.booking.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs flex items-center gap-1 transition"
                      >
                        <span>লাইভ ট্র্যাকিং</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Provider Selector Cards */}
                  <div>
                    <label className="font-black text-slate-800 block mb-1.5">
                      কুরিয়ার সার্ভিস নির্বাচন করুন:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Steadfast */}
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('steadfast')}
                        className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                          selectedProvider === 'steadfast'
                            ? 'bg-emerald-50 border-emerald-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">🚚 স্টিডফাস্ট (Steadfast)</span>
                          {selectedProvider === 'steadfast' && <Check className="w-4 h-4 text-emerald-700" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          দেশজুড়ে দ্রুত ক্যাশ-অন-ডেলিভারি (১% COD)। সবচেয়ে জনপ্রিয়।
                        </p>
                      </button>

                      {/* Pathao */}
                      <button
                        type="button"
                        onClick={() => setSelectedProvider('pathao')}
                        className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                          selectedProvider === 'pathao'
                            ? 'bg-rose-50 border-rose-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-slate-900 text-xs sm:text-sm">🛵 পাঠাও (Pathao)</span>
                          {selectedProvider === 'pathao' && <Check className="w-4 h-4 text-rose-700" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          ঢাকা ও প্রধান শহরে এক্সপ্রেস পার্সেল সার্ভিস।
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Customer Information Preview & Edit */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                      প্রাপক গ্রাহকের বিবরণ (স্বয়ংক্রিয় প্রাক-পূরণ):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">কাস্টমারের নাম</label>
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">মোবাইল নম্বর</label>
                        <input
                          type="text"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="017xxxxxxxx"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">ডেলিভারির পূর্ণ ঠিকানা</label>
                      <textarea
                        rows={2}
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="বাসা নং, রোড, থানা, জেলা..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* COD Collection & Delivery Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-800 block mb-0.5">
                        ক্যাশ অন ডেলিভারি (COD কালেকশন ৳):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={codAmount}
                          onChange={(e) => setCodAmount(Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-rose-700 font-mono focus:ring-2 focus:ring-teal-500"
                        />
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">৳</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 mt-0.5">
                        {codAmount > 0 ? 'কুরিয়ার কাস্টমার থেকে এই টাকা সংগ্রহ করবে' : 'পেইড পার্সেল (০৳ কালেকশন)'}
                      </p>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-slate-800 block mb-0.5">
                        ডেলিভারি নোট / নির্দেশ:
                      </label>
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="যেমন: ভঙ্গুর পণ্য / ডেলিভারির আগে কল দিন"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* One-Click Booking Trigger Button */}
                  <div className="pt-2">
                    {currentSmsBal < 1 ? (
                      <button
                        type="button"
                        onClick={handleOpenRecharge}
                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-2xl shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>১-ক্লিকে কুরিয়ার বুক করতে মেসেজ রিচার্জ করুন</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBooking}
                        onClick={handleOneClickBook}
                        className="w-full py-3 px-4 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm active:scale-98 disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 text-amber-300 fill-current" />
                        <span>
                          {isBooking
                            ? `${selectedProvider === 'pathao' ? 'পাঠাও' : 'স্টিডফাস্ট'}-এ পার্সেল বুক হচ্ছে...`
                            : `১-ক্লিকে ${selectedProvider === 'pathao' ? 'পাঠাও' : 'স্টিডফাস্ট'}-এ পার্সেল বুক করুন`}
                        </span>
                      </button>
                    )}
                    <p className="text-[10px] text-center text-slate-500 mt-1.5">
                      ⚡ বুকিংয়ের সাথে সাথে কুরিয়ারে কনসাইনমেন্ট এন্ট্রি হবে এবং কাস্টমার এসএমএসে ট্র্যাকিং লিংক পাবেন।
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL COURIER INPUT */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  কুরিয়ার সার্ভিস নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {manualCouriers.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setManualCourierName(c.name)}
                      className={`p-2.5 rounded-xl border text-left transition font-medium cursor-pointer ${
                        manualCourierName === c.name
                          ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{c.label}</span>
                        {manualCourierName === c.name && <Check className="w-3.5 h-3.5 text-teal-700" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  কুরিয়ার ট্র্যাকিং কোড (Consignment / Tracking ID):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={courierTrackingCode}
                    onChange={(e) => setCourierTrackingCode(e.target.value)}
                    placeholder="যেমন: STDF-890123 বা PT-8910"
                    className="w-full pl-8 pr-20 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
                  />
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  {courierTrackingCode && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(courierTrackingCode)}
                      className="absolute right-2 top-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
                    </button>
                  )}
                </div>
              </div>

              {manualTrackUrl && (
                <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
                  <div className="text-[11px] text-teal-900 font-medium truncate max-w-[260px]">
                    লাইভ লিংক: <span className="font-mono text-teal-700">{manualTrackUrl}</span>
                  </div>
                  <a
                    href={manualTrackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-teal-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-teal-900 shrink-0"
                  >
                    <span>ট্র্যাক দেখুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Own Rider Info */}
              {manualCourierName === 'Own Rider' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-800 block text-xs">
                    নিজস্ব রাইডার / ডেলিভারি বয়ের তথ্য (ঐচ্ছিক):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">রাইডারের নাম</label>
                      <input
                        type="text"
                        value={deliveryManName}
                        onChange={(e) => setDeliveryManName(e.target.value)}
                        placeholder="মোঃ সুমন"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">রাইডারের মোবাইল</label>
                      <input
                        type="text"
                        value={deliveryManPhone}
                        onChange={(e) => setDeliveryManPhone(e.target.value)}
                        placeholder="017xxxxxxxx"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Ship */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoShip}
                    onChange={(e) => setAutoShip(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-900 text-xs">
                    অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে "ডেলিভারিতে চলমান (Shipped)" করুন
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                {currentSmsBal < 1 ? (
                  <button
                    type="button"
                    onClick={handleOpenRecharge}
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>মেসেজ রিচার্জ করুন</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'কুরিয়ার তথ্য সংরক্ষণ করুন'}</span>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: API SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2 text-teal-950">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>মার্চেন্ট এপিআই সংযোগ:</strong> আপনার নিজস্ব স্টিডফাস্ট বা পাঠাও মার্চেন্ট প্যানেলের এপিআই তথ্য এখানে যুক্ত করলে পার্সেলগুলো সরাসরি আপনার কুরিয়ার ড্যাশবোর্ডে তালিকাভুক্ত হবে। খালি রাখলে টুইং সেন্ট্রাল গেটওয়ে স্বয়ংক্রিয়ভাবে সক্রিয় থাকবে।
                </p>
              </div>

              {credsSavedMsg && (
                <div className="p-2.5 bg-emerald-100 text-emerald-900 font-bold rounded-xl text-center border border-emerald-300">
                  {credsSavedMsg}
                </div>
              )}

              {/* Steadfast Section */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>স্টিডফাস্ট এপিআই (Steadfast Courier Credentials)</span>
                  </h4>
                  {creds?.steadfastApiKey && (
                    <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-full">
                      সক্রিয়
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Api-Key</label>
                  <input
                    type="password"
                    value={steadfastApiKey}
                    onChange={(e) => setSteadfastApiKey(e.target.value)}
                    placeholder={creds?.steadfastApiKey || 'স্টিডফাস্ট পোর্টাল থেকে Api-Key লিখুন'}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Secret-Key</label>
                  <input
                    type="password"
                    value={steadfastSecretKey}
                    onChange={(e) => setSteadfastSecretKey(e.target.value)}
                    placeholder={creds?.steadfastSecretKey || 'স্টিডফাস্ট Secret-Key লিখুন'}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Pathao Section */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                    <span>পাঠাও এপিআই (Pathao Merchant Credentials)</span>
                  </h4>
                  {creds?.pathaoClientId && (
                    <span className="text-[10px] text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded-full">
                      সক্রিয়
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Client ID</label>
                    <input
                      type="text"
                      value={pathaoClientId}
                      onChange={(e) => setPathaoClientId(e.target.value)}
                      placeholder={creds?.pathaoClientId || 'Pathao Client ID'}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Client Secret</label>
                    <input
                      type="password"
                      value={pathaoClientSecret}
                      onChange={(e) => setPathaoClientSecret(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Username / Email</label>
                    <input
                      type="text"
                      value={pathaoUsername}
                      onChange={(e) => setPathaoUsername(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Password</label>
                    <input
                      type="password"
                      value={pathaoPassword}
                      onChange={(e) => setPathaoPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Store ID</label>
                    <input
                      type="text"
                      value={pathaoStoreId}
                      onChange={(e) => setPathaoStoreId(e.target.value)}
                      placeholder="যেমন: 12345"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save Settings Button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSavingCreds}
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingCreds ? 'সংরক্ষণ হচ্ছে...' : 'এপিআই সেটিংস সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Shipping Label Print Modal */}
      <ShippingLabelModal
        isOpen={isLabelModalOpen}
        labelData={shippingLabelData}
        onClose={() => setIsLabelModalOpen(false)}
      />
    </>
  );
};
