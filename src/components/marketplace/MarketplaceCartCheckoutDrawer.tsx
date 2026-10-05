import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Phone,
  MapPin,
  User,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  Package,
} from 'lucide-react';
import { MarketplaceCartItem, MarketplaceProduct, MarketplaceMasterOrder } from '../../types';
import { formatMoney } from '../../utils/storage';
import { marketplaceApi } from '../../services/marketplaceService';
import { getStoredCustomer, saveStoredCustomer, getCustomerDeviceTokenKey, getCustomerOrdersStorageKey, VerifiedCustomer } from './CustomerAccountView';

interface MarketplaceCartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: MarketplaceCartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  deliveryFeeDhaka?: number;
  deliveryFeeOutside?: number;
  onOrderSuccess: (order: MarketplaceMasterOrder) => void;
  onOpenTracking: (orderNumber: string) => void;
  paymentSettings?: any;
}

export const MarketplaceCartCheckoutDrawer: React.FC<MarketplaceCartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  deliveryFeeDhaka = 70,
  deliveryFeeOutside = 130,
  onOrderSuccess,
  onOpenTracking,
  paymentSettings,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const storedCust = getStoredCustomer();
  const [customerName, setCustomerName] = useState(() => storedCust?.name || localStorage.getItem('twing_mkt_cust_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => storedCust?.phone || localStorage.getItem('twing_mkt_cust_phone') || '');
  const [customerAddress, setCustomerAddress] = useState(() => storedCust?.address || localStorage.getItem('twing_mkt_cust_address') || '');
  const [deliveryCity, setDeliveryCity] = useState<'dhaka' | 'outside'>(() => (storedCust?.city as 'dhaka' | 'outside') || 'dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket' | 'online_paymently'>('cod');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Device-level OTP Verification state
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(() => Boolean(getStoredCustomer()?.isVerified));
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<MarketplaceMasterOrder | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Sync stored customer profile whenever checkout drawer opens
  useEffect(() => {
    if (isOpen) {
      const cust = getStoredCustomer();
      if (cust) {
        if (cust.name) setCustomerName(cust.name);
        if (cust.phone) setCustomerPhone(cust.phone);
        if (cust.address) setCustomerAddress(cust.address);
        if (cust.city) setDeliveryCity((cust.city as 'dhaka' | 'outside') || 'dhaka');
        setIsPhoneVerified(Boolean(cust.isVerified));
      }
    }
  }, [isOpen]);

  // Group cart items automatically BY VENDOR
  const vendorGroups = useMemo(() => {
    const map = new Map<string, {
      vendorId: string;
      vendorShopName: string;
      vendorAddress: string;
      vendorPhone: string;
      items: MarketplaceCartItem[];
      subtotal: number;
    }>();

    cart.forEach((item) => {
      const vId = item.product.vendorId || (item.product as any).userId || 'vendor_official';
      const vName = item.product.vendorShopName || 'টুইং হিসাবি ভেরিফাইড মার্চেন্ট';
      const vAddress = item.product.vendorAddress || 'বাংলাদেশ';
      const vPhone = item.product.vendorPhone || '';

      if (!map.has(vId)) {
        map.set(vId, {
          vendorId: vId,
          vendorShopName: vName,
          vendorAddress: vAddress,
          vendorPhone: vPhone,
          items: [],
          subtotal: 0,
        });
      }

      const group = map.get(vId)!;
      group.items.push(item);
      group.subtotal += item.product.salePrice * item.quantity;
    });

    return Array.from(map.values());
  }, [cart]);

  // Calculations
  const totalProductsAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const deliveryRate = deliveryCity === 'dhaka' ? deliveryFeeDhaka : deliveryFeeOutside;
  // Delivery fee per vendor as each vendor ships from their warehouse
  const totalDeliveryCharge = useMemo(() => {
    return vendorGroups.length * deliveryRate;
  }, [vendorGroups.length, deliveryRate]);

  const grandTotal = totalProductsAmount + totalDeliveryCharge;

  const executeOrderPlacement = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const cleanPhone = customerPhone.replace(/[^\d+]/g, '').trim();
      const standardPhone = cleanPhone.startsWith('+88')
        ? cleanPhone.slice(3)
        : cleanPhone.startsWith('88')
        ? cleanPhone.slice(2)
        : cleanPhone;

      const deviceToken = localStorage.getItem('twing_customer_device_token') || 'dev_' + Date.now().toString(36);
      localStorage.setItem('twing_customer_device_token', deviceToken);

      // Save customer verified record to device permanently
      saveStoredCustomer({
        id: 'cust_' + standardPhone,
        name: customerName.trim(),
        phone: standardPhone,
        address: customerAddress.trim(),
        city: deliveryCity,
        deviceToken,
        isVerified: true,
        verifiedAt: new Date().toISOString(),
      });

      const payload = {
        customerName: customerName.trim(),
        customerPhone: standardPhone,
        customerAddress: customerAddress.trim(),
        deliveryCity,
        paymentMethod,
        paymentTrxId: paymentTrxId.trim(),
        senderPhone: senderPhone.trim() || standardPhone,
        notes: notes.trim(),
        isPhoneVerified: true,
        items: cart.map((item) => ({
          productId: item.product.id,
          vendorId: item.product.vendorId || (item.product as any).userId || 'vendor_official',
          name: item.product.name,
          salePrice: item.product.salePrice,
          quantity: item.quantity,
          unit: item.product.unit,
          imageUrl: item.product.imageUrl || '',
        })),
      };

      const res = await marketplaceApi.checkout(payload);

      if (res?.success && res.masterOrder) {
        setConfirmedOrder(res.masterOrder);
        onOrderSuccess(res.masterOrder);
        onClearCart();
        setStep('success');
      } else {
        setSubmitError(res?.error || 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'অর্ডারে ত্রুটি হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setSubmitError('অনুগ্রহ করে নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা প্রদান করুন।');
      return;
    }

    const cleanPhone = customerPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88')
      ? cleanPhone.slice(3)
      : cleanPhone.startsWith('88')
      ? cleanPhone.slice(2)
      : cleanPhone;

    if (standardPhone.length !== 11 || !standardPhone.startsWith('01')) {
      setSubmitError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
      return;
    }

    if (cart.length === 0) {
      setSubmitError('আপনার কার্ট খালি।');
      return;
    }

    if (paymentMethod !== 'cod' && paymentMethod !== 'online_paymently' && !paymentTrxId.trim()) {
      setSubmitError('অনুগ্রহ করে পেমেন্ট ট্রানজেকশন আইডি (TrxID) লিখুন।');
      return;
    }

    // Check if phone or device is verified
    if (!isPhoneVerified) {
      // Send OTP and open OTP confirmation box
      setIsSendingOtp(true);
      setSubmitError('');
      try {
        const deviceToken = localStorage.getItem('twing_customer_device_token') || 'dev_' + Date.now().toString(36);
        localStorage.setItem('twing_customer_device_token', deviceToken);

        const res = await marketplaceApi.sendOtp(standardPhone, deviceToken);
        if (res.alreadyVerified || res.verified) {
          setIsPhoneVerified(true);
          await executeOrderPlacement();
          return;
        }

        setShowOtpBox(true);
        setOtpSuccessMessage(res.message || 'মোবাইলে পাঠানো ওটিপি কোডটি লিখুন');
      } catch (err: any) {
        setSubmitError(err.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      } finally {
        setIsSendingOtp(false);
      }
      return;
    }

    // Already verified on this device! Directly place order
    await executeOrderPlacement();
  };

  const handleVerifyOtpAndPlaceOrder = async () => {
    if (!otpCode.trim()) {
      setSubmitError('ওটিপি কোডটি লিখুন');
      return;
    }

    const cleanPhone = customerPhone.replace(/[^\d+]/g, '').trim();
    const standardPhone = cleanPhone.startsWith('+88')
      ? cleanPhone.slice(3)
      : cleanPhone.startsWith('88')
      ? cleanPhone.slice(2)
      : cleanPhone;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const deviceToken = localStorage.getItem('twing_customer_device_token') || 'dev_' + Date.now().toString(36);
      const res = await marketplaceApi.verifyOtp(standardPhone, otpCode.trim(), deviceToken);

      if (res.success && res.verified) {
        setIsPhoneVerified(true);
        setShowOtpBox(false);
        await executeOrderPlacement();
      } else {
        setSubmitError(res.error || 'ভুল ওটিপি কোড! অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'ভুল ওটিপি কোড! সঠিক কোডটি দিন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOrderNumber = () => {
    if (!confirmedOrder) return;
    navigator.clipboard.writeText(confirmedOrder.orderNumber || confirmedOrder.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#0b63e5]/30 text-[#0b63e5] flex items-center justify-center font-bold shadow-2xs">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {step === 'cart' && `শপিং কার্ট (${cart.reduce((s, i) => s + i.quantity, 0)} পণ্য)`}
                  {step === 'checkout' && 'চেকআউট ও ডেলিভারি তথ্য'}
                  {step === 'success' && 'অর্ডার নিশ্চিত হয়েছে 🎉'}
                </h2>
                <p className="text-xs text-slate-500">
                  {step === 'cart' && `${vendorGroups.length} টি টুইং হিসাবি ভেরিফাইড শপ থেকে পণ্য`}
                  {step === 'checkout' && 'ভেন্ডরভিত্তিক পৃথক অটোমেটিক অর্ডার প্রস্তুত করা হবে'}
                  {step === 'success' && 'সরাসরি ভেন্ডর ওয়্যারহাউসে অর্ডার পাঠানো হয়েছে'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* STEP 1: CART (GROUPED BY VENDOR) */}
            {step === 'cart' && (
              <>
                {cart.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-[#0b63e5]/30 text-[#0b63e5] mx-auto flex items-center justify-center shadow-2xs">
                      <Store className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">আপনার কার্ট খালি</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      মার্কেটপ্লেস ব্রাউজ করে আপনার পছন্দের পণ্য কার্টে যোগ করুন।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Notice about multi-vendor delivery */}
                    {vendorGroups.length > 1 && (
                      <div className="p-3 bg-white rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2 shadow-2xs">
                        <Truck className="w-4 h-4 text-[#0b63e5] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">মাল্টি-ভেন্ডর চেকআউট সক্রিয়:</p>
                          <p className="text-[11px] text-blue-700">
                            আপনি {vendorGroups.length} টি পৃথক ভেন্ডর থেকে পণ্য কিনেছেন। প্রতিটি ভেন্ডর সরাসরি তাদের নিজস্ব দোকান থেকে নিজস্ব প্যাকিং ও কুরিয়ারে পণ্য সরবরাহ করবে।
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Grouped Vendor Sections */}
                    {vendorGroups.map((group) => (
                      <div
                        key={group.vendorId}
                        className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-2xs"
                      >
                        {/* Vendor Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-[#0b63e5] flex items-center justify-center font-bold text-xs">
                              <Store className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900">
                                {group.vendorShopName}
                              </span>
                              <span className="ml-1.5 bg-[#0b63e5] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                ✓ ভেরিফাইড
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            ডেলিভারি চার্জ: ৳{deliveryRate}
                          </span>
                        </div>

                        {/* Items under this vendor */}
                        <div className="space-y-2.5">
                          {group.items.map((item) => (
                            <div
                              key={item.product.id}
                              className="bg-white rounded-xl p-2.5 border border-slate-100 flex items-center gap-3 shadow-2xs"
                            >
                              <div className="w-14 h-14 rounded-lg bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                <img
                                  src={item.product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=80'}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                                  {item.product.name}
                                </h4>
                                <div className="text-xs font-black text-[#0b63e5] mt-0.5">
                                  ৳ {formatMoney(item.product.salePrice)}
                                </div>
                              </div>

                              {/* Qty controls */}
                              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-1.5 py-0.5 bg-white shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, -1)}
                                  className="text-slate-500 hover:text-slate-800 font-bold px-1"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-slate-800 w-5 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.product.id, 1)}
                                  className="text-slate-500 hover:text-slate-800 font-bold px-1"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveFromCart(item.product.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Vendor Subtotal */}
                        <div className="pt-2 border-t border-slate-200/70 flex justify-between text-xs font-bold text-slate-700">
                          <span>ভেন্ডর সাবটোটাল ({group.items.reduce((s, i) => s + i.quantity, 0)} পণ্য):</span>
                          <span className="text-slate-900 font-black">৳ {formatMoney(group.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* STEP 2: CHECKOUT FORM */}
            {step === 'checkout' && (
              <form id="marketplace-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Delivery Information Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0b63e5]" />
                    <span>১. গ্রাহকের ডেলিভারি ঠিকানা</span>
                  </h3>

                  {/* Device Verification Status Banner */}
                  {isPhoneVerified ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-extrabold">ভেরিফাইড কাস্টমার একাউন্ট</span>
                          <p className="text-[10px] text-emerald-700">এই ডিভাইসে পূর্বে ভেরিফাই করা হয়েছে — আর ওটিপি কোড লাগবে না!</p>
                        </div>
                      </div>
                      <span className="bg-emerald-200/90 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                        ✓ সুরক্ষিত
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldCheck className="w-4 h-4 text-[#0b63e5] shrink-0" />
                        <span>প্রথমবার অর্ডারে একাউন্ট তৈরি ও ভেরিফিকেশন</span>
                      </div>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        অর্ডার করার সময় আপনার মোবাইল নম্বরটি একবার ভেরিফাই করলেই আপনার একাউন্ট স্থায়ীভাবে তৈরি হয়ে যাবে। ভবিষ্যতে এই ডিভাইসে আর ভেরিফাই করতে হবে না।
                      </p>
                    </div>
                  )}

                  {/* Inline OTP Verification Box */}
                  {showOtpBox && (
                    <div className="p-4 bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-700" />
                          <span className="text-xs font-black text-emerald-950">
                            মোবাইল নম্বর যাচাই কোড ({customerPhone})
                          </span>
                        </div>
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-md">
                          টেস্ট কোড: 123456
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        {otpSuccessMessage || 'আপনার নম্বরে পাঠানো কোডটি লিখুন (একটি ডিভাইসে একবার ভেরিফাই করলেই যথেষ্ট):'}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-36 text-center font-mono font-black text-base px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtpAndPlaceOrder}
                          disabled={isSubmitting || !otpCode.trim()}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>যাচাই হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>যাচাই ও অর্ডার দিন</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        আপনার পুরো নাম *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: মো: রফিকুল ইসলাম"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0b63e5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        সচল মোবাইল নম্বর (১১ ডিজিট) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="০১৭xxxxxxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0b63e5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        ডেলিভারি এরিয়া *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryCity('dhaka')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            deliveryCity === 'dhaka'
                              ? 'bg-blue-50 border-[#0b63e5] text-[#0b63e5]'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>ঢাকার ভিতরে</span>
                          <span className="text-[11px]">৳{deliveryFeeDhaka}/ভেন্ডর</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryCity('outside')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            deliveryCity === 'outside'
                              ? 'bg-blue-50 border-[#0b63e5] text-[#0b63e5]'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>ঢাকার বাইরে</span>
                          <span className="text-[11px]">৳{deliveryFeeOutside}/ভেন্ডর</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        সম্পূর্ণ ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা/উপজেলা) *
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="বাড়ি নং, রোড নং, এলাকা বা গ্রামের নাম লিখুন..."
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0b63e5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#0b63e5]" />
                    <span>২. পেমেন্ট পদ্ধতি নির্বাচন</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                        paymentMethod === 'cod'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>ক্যাশ অন ডেলিভারি</div>
                        <div className="text-[10px] text-slate-400">পণ্য হাতে পেয়ে টাকা দিন</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bkash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                        paymentMethod === 'bkash'
                          ? 'bg-pink-50 border-pink-500 text-pink-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <div>
                        <div>বিকাশ (bKash)</div>
                        <div className="text-[10px] text-slate-400">সেন্ড মানি বা পেমেন্ট</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('nagad')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                        paymentMethod === 'nagad'
                          ? 'bg-orange-50 border-orange-500 text-orange-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">🟠</span>
                      <div>
                        <div>নগদ (Nagad)</div>
                        <div className="text-[10px] text-slate-400">সেন্ড মানি পেমেন্ট</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online_paymently')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-2 ${
                        paymentMethod === 'online_paymently'
                          ? 'bg-blue-50 border-[#0b63e5] text-[#0b63e5]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-[#0b63e5] shrink-0" />
                      <div>
                        <div>কার্ড / ইন্টারনেট</div>
                        <div className="text-[10px] text-slate-400">অনলাইন অটোমেটেড গেটওয়ে</div>
                      </div>
                    </button>
                  </div>

                  {/* Manual MFS details if bKash/Nagad selected */}
                  {(paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'rocket') && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-bold">
                          {paymentMethod === 'bkash' ? 'বিকাশ পার্সোনাল নম্বর:' : 'নগদ পার্সোনাল নম্বর:'}
                        </span>
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {paymentSettings?.bkash?.personal?.number || paymentSettings?.nagad?.personal?.number || '01306908115'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        উক্ত নম্বরে মোট ৳{formatMoney(grandTotal)} টাকা সেন্ড মানি করে নিচের বক্সে TrxID লিখুন।
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          required
                          placeholder="TrxID (যেমন: 9J382K)"
                          value={paymentTrxId}
                          onChange={(e) => setPaymentTrxId(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                        <input
                          type="tel"
                          placeholder="প্রেরক মোবাইল নম্বর"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS CONFIRMATION */}
            {step === 'success' && confirmedOrder && (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">অর্ডার সফলভাবে জমা হয়েছে!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    আপনার সেন্ট্রাল মার্কেটপ্লেস অর্ডারটি যাচাই করা হয়েছে এবং সংশ্লিষ্ট ভেন্ডরদের কাছে পাঠানো হয়েছে।
                  </p>
                </div>

                {/* Master Order ID Card */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-left space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">মাস্টার অর্ডার নম্বর:</span>
                    <button
                      type="button"
                      onClick={handleCopyOrderNumber}
                      className="flex items-center gap-1 text-xs font-bold text-[#0b63e5] hover:underline"
                    >
                      <span className="font-mono font-black">{confirmedOrder.orderNumber || confirmedOrder.id}</span>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isCopied && <div className="text-[10px] text-emerald-600 font-bold text-right">কপি করা হয়েছে!</div>}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">মোট পরিশোধযোগ্য:</span>
                    <span className="font-black text-slate-900">৳ {formatMoney(confirmedOrder.grandTotal)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">পেমেন্ট পদ্ধতি:</span>
                    <span className="font-bold text-slate-800">
                      {confirmedOrder.paymentMethod === 'cod' ? 'ক্যাশ অন ডেলিভারি' : confirmedOrder.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Vendor Sub-orders overview */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-slate-700 text-left space-y-1 shadow-2xs">
                  <p className="font-bold text-[#0b63e5]">📦 ভেন্ডরভিত্তিক সাব-অর্ডার:</p>
                  <p className="text-[11px] text-slate-600">
                    প্রতিটি ভেন্ডর তাদের প্যানেল থেকে আপনার ডেলিভারি দেখতে পাচ্ছেন এবং অবিলম্বে প্যাকিং শুরু করছেন।
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTracking(confirmedOrder.orderNumber || confirmedOrder.id);
                    }}
                    className="w-full py-3 bg-[#0b63e5] hover:bg-[#094ec2] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>অর্ডার লাইভ ট্র্যাক করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer shadow-2xs"
                  >
                    শপিং চালিয়ে যান
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar (Subtotal & Step Actions) */}
          {step !== 'success' && cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 space-y-3">
              {/* Order breakdown summary */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>পণ্যের মোট মূল্য:</span>
                  <span className="font-bold text-slate-900">৳ {formatMoney(totalProductsAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>মোট ডেলিভারি চার্জ ({vendorGroups.length} ভেন্ডর):</span>
                  <span className="font-bold text-slate-900">৳ {formatMoney(totalDeliveryCharge)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                  <span>সর্বমোট বিল:</span>
                  <span className="text-[#0b63e5]">৳ {formatMoney(grandTotal)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {step === 'cart' ? (
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-3.5 bg-[#0b63e5] hover:bg-[#094ec2] text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>চেকআউট করুন (৳ {formatMoney(grandTotal)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer"
                  >
                    ← কার্টে ফিরুন
                  </button>
                  <button
                    type="submit"
                    form="marketplace-checkout-form"
                    disabled={isSubmitting}
                    className="py-3 bg-[#0b63e5] hover:bg-[#094ec2] text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>প্রক্রিয়া চলছে...</span>
                      </>
                    ) : (
                      <>
                        <span>{isPhoneVerified ? 'অর্ডার নিশ্চিত করুন' : 'ডিভাইস ভেরিফাই ও অর্ডার দিন'}</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
