import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Product, Customer, StoreProfile } from '../../types';
import { formatMoney } from '../../utils/storage';
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Package,
  CreditCard,
  User,
  Sparkles,
  Share2,
  Tag,
  Grid,
  FileText,
} from 'lucide-react';

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  store: StoreProfile;
  initialProduct?: Product | null;
  initialCustomer?: Customer | null;
  onShowToast: (msg: string) => void;
}

export const QrGeneratorModal: React.FC<QrGeneratorModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  store,
  initialProduct = null,
  initialCustomer = null,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'product' | 'payment' | 'customer' | 'custom'>('product');

  // Product tab state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customProdName, setCustomProdName] = useState<string>('');
  const [customProdSku, setCustomProdSku] = useState<string>('');
  const [customProdPrice, setCustomProdPrice] = useState<string>('');
  const [productQrDataUrl, setProductQrDataUrl] = useState<string>('');
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);

  // Payment tab state
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank'>('bkash');
  const [payNumber, setPayNumber] = useState<string>('');
  const [payAccountType, setPayAccountType] = useState<'personal' | 'merchant'>('personal');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payQrDataUrl, setPayQrDataUrl] = useState<string>('');

  // Customer tab state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerQrDataUrl, setCustomerQrDataUrl] = useState<string>('');

  // Custom text tab state
  const [customText, setCustomText] = useState<string>('');
  const [customQrDataUrl, setCustomQrDataUrl] = useState<string>('');

  const [copied, setCopied] = useState(false);
  const printableLabelRef = useRef<HTMLDivElement>(null);

  // Initialize from props
  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        setActiveTab('product');
        setSelectedProductId(initialProduct.id);
        setCustomProdName(initialProduct.name);
        setCustomProdSku(initialProduct.sku || initialProduct.id);
        setCustomProdPrice(initialProduct.salePrice.toString());
      } else if (products.length > 0 && !selectedProductId) {
        const first = products[0];
        setSelectedProductId(first.id);
        setCustomProdName(first.name);
        setCustomProdSku(first.sku || first.id);
        setCustomProdPrice(first.salePrice.toString());
      }

      if (initialCustomer) {
        setActiveTab('customer');
        setSelectedCustomerId(initialCustomer.id);
      } else if (customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(customers[0].id);
      }

      // Initialize payment phone number from store
      const initialStorePayNum =
        store.bkashNumber || store.nagadNumber || store.rocketNumber || store.phone || '01619665875';
      setPayNumber(initialStorePayNum);
    }
  }, [isOpen, initialProduct, initialCustomer, products, customers, store]);

  // Generate Product QR Code
  useEffect(() => {
    const generateProductQr = async () => {
      const p = products.find((x) => x.id === selectedProductId);
      const sku = customProdSku || p?.sku || p?.id || 'PRD-' + Date.now();
      const payload = JSON.stringify({
        type: 'product',
        id: p?.id || sku,
        sku: sku,
        name: customProdName || p?.name || 'পণ্য',
        price: Number(customProdPrice || p?.salePrice || 0),
        store: store.name,
      });

      try {
        const url = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 1,
          color: { dark: '#042f2e', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setProductQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate product QR', err);
      }
    };

    if (activeTab === 'product') {
      generateProductQr();
    }
  }, [selectedProductId, customProdName, customProdSku, customProdPrice, activeTab, products, store.name]);

  // Generate Payment QR Code
  useEffect(() => {
    const generatePaymentQr = async () => {
      const num = payNumber.trim();
      if (!num) return;
      // Bengali MFS standard payload string
      const payload = JSON.stringify({
        service: payMethod,
        type: payAccountType,
        recipient: num,
        amount: payAmount ? Number(payAmount) : undefined,
        store: store.name,
      });

      try {
        const darkColor =
          payMethod === 'bkash' ? '#be185d' : payMethod === 'nagad' ? '#ea580c' : '#7e22ce';
        const url = await QRCode.toDataURL(payload, {
          width: 340,
          margin: 1,
          color: { dark: darkColor, light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        setPayQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate payment QR', err);
      }
    };

    if (activeTab === 'payment') {
      generatePaymentQr();
    }
  }, [payMethod, payNumber, payAccountType, payAmount, activeTab, store.name]);

  // Generate Customer QR Code
  useEffect(() => {
    const generateCustomerQr = async () => {
      const c = customers.find((x) => x.id === selectedCustomerId);
      if (!c) return;
      const payload = JSON.stringify({
        type: 'customer',
        id: c.id,
        name: c.name,
        phone: c.phone,
        balance: c.balance,
        store: store.name,
      });

      try {
        const url = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setCustomerQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate customer QR', err);
      }
    };

    if (activeTab === 'customer') {
      generateCustomerQr();
    }
  }, [selectedCustomerId, activeTab, customers, store.name]);

  // Generate Custom QR Code
  useEffect(() => {
    const generateCustomQr = async () => {
      const text = customText.trim() || 'https://example.com';
      try {
        const url = await QRCode.toDataURL(text, {
          width: 320,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setCustomQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate custom QR', err);
      }
    };

    if (activeTab === 'custom') {
      generateCustomQr();
    }
  }, [customText, activeTab]);

  if (!isOpen) return null;

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setCustomProdName(p.name);
      setCustomProdSku(p.sku || p.id);
      setCustomProdPrice(p.salePrice.toString());
    }
  };

  const handleDownloadQr = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast('✅ কিউআর কোড ইমেজ ডাউনলোড হয়েছে!');
  };

  const handlePrintLabel = () => {
    window.print();
  };

  const handleCopyData = (data: string) => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    onShowToast('কপি সম্পন্ন হয়েছে!');
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedProd = products.find((x) => x.id === selectedProductId);
  const selectedCust = customers.find((x) => x.id === selectedCustomerId);

  return (
    <div
      id="qr-generator-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="qr-generator-modal"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[95vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-950 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                কিউআর কোড ও বারকোড জেনারেটর
              </h3>
              <p className="text-xs text-teal-200">
                পণ্য স্টিকার, বিকাশ/নগদ পেমেন্ট স্ট্যান্ডি ও হিসাব রসিদ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-4 pt-2 gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('product')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'product'
                ? 'bg-white text-teal-900 border-t-2 border-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-teal-600" />
            <span>পণ্য কিউআর / স্টিকার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-white text-pink-900 border-t-2 border-pink-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-pink-600" />
            <span>পেমেন্ট কিউআর স্ট্যান্ডি</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white text-indigo-900 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>কাস্টমার বাকি কার্ড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-white text-slate-900 border-t-2 border-slate-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>কাস্টম কিউআর</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: PRODUCT QR & BARCODE */}
          {activeTab === 'product' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left Column: Form Controls */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ইনভেন্টরি থেকে পণ্য নির্বাচন করুন:
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="">-- নতুন বা কাস্টম পণ্য --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ৳{p.salePrice} (স্টক: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পণ্যের নাম:
                  </label>
                  <input
                    type="text"
                    value={customProdName}
                    onChange={(e) => setCustomProdName(e.target.value)}
                    placeholder="যেমন: মিনিকেট চাল ৫ কেজি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বারকোড / SKU কোড:
                    </label>
                    <input
                      type="text"
                      value={customProdSku}
                      onChange={(e) => setCustomProdSku(e.target.value)}
                      placeholder="PRD-101"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিক্রয় মূল্য (টাকা):
                    </label>
                    <input
                      type="number"
                      value={customProdPrice}
                      onChange={(e) => setCustomProdPrice(e.target.value)}
                      placeholder="৳ 0.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(productQrDataUrl, `QR_${customProdSku || 'product'}`)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>PNG ডাউনলোড</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintLabel}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>স্টিকার প্রিন্ট</span>
                    </button>
                  </div>

                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBulkPrintOpen(!isBulkPrintOpen)}
                      className="w-full py-2 px-3 rounded-xl border border-teal-300 bg-teal-50/70 hover:bg-teal-100 text-teal-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Grid className="w-3.5 h-3.5 text-teal-700" />
                      <span>সব পণ্যের কিউআর শিট (বাল্ক প্রিন্ট)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Sticker Preview Box */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100/70 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  প্রিন্ট ও স্ক্যান স্টিকার প্রিভিউ
                </span>

                {/* The printable sticker element */}
                <div
                  ref={printableLabelRef}
                  id="printable-product-label"
                  className="bg-white p-4 rounded-xl border-2 border-slate-900 shadow-md flex flex-col items-center text-center max-w-[240px] w-full"
                >
                  <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight border-b border-slate-200 pb-1 w-full truncate">
                    {store.name}
                  </div>
                  <div className="text-xs font-black text-slate-950 mt-1.5 line-clamp-2 px-1">
                    {customProdName || 'পণ্যের নাম'}
                  </div>

                  {/* QR Image */}
                  <div className="my-2 p-1 bg-white border border-slate-200 rounded-lg">
                    {productQrDataUrl ? (
                      <img
                        src={productQrDataUrl}
                        alt="Product QR"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                        লোডিং...
                      </div>
                    )}
                  </div>

                  {/* SKU & Barcode identifier */}
                  <div className="font-mono text-[11px] font-black text-slate-800 tracking-wider">
                    {customProdSku || 'PRD-0000'}
                  </div>

                  {/* Price Tag */}
                  <div className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-950 text-white text-xs font-black">
                    মূল্য: ৳{formatMoney(Number(customProdPrice || 0))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 mt-2.5 text-center">
                  এই কিউআর কোডটি দোকানের ক্যামেরা স্ক্যানার অথবা যেকোনো বারকোড রিডার দিয়ে স্ক্যান করা যাবে
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: STORE PAYMENT QR STAND (bKash/Nagad/Rocket) */}
          {activeTab === 'payment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    পেমেন্ট মাধ্যম বেছে নিন:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('bkash')}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition flex flex-col items-center gap-1 cursor-pointer ${
                        payMethod === 'bkash'
                          ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-pink-600 font-black">বিকাশ</span>
                      <span className="text-[10px]">bKash QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('nagad')}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition flex flex-col items-center gap-1 cursor-pointer ${
                        payMethod === 'nagad'
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-orange-600 font-black">নগদ</span>
                      <span className="text-[10px]">Nagad QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('rocket')}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition flex flex-col items-center gap-1 cursor-pointer ${
                        payMethod === 'rocket'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-purple-600 font-black">রকেট</span>
                      <span className="text-[10px]">Rocket QR</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দোকানের একাউন্ট নম্বর:
                  </label>
                  <input
                    type="tel"
                    value={payNumber}
                    onChange={(e) => setPayNumber(e.target.value)}
                    placeholder="০১xxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      একাউন্ট ধরণ:
                    </label>
                    <select
                      value={payAccountType}
                      onChange={(e) => setPayAccountType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="personal">পার্সোনাল (Personal)</option>
                      <option value="merchant">মার্চেন্ট (Merchant)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      নির্দিষ্ট টাকা (ঐচ্ছিক):
                    </label>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="খালি রাখলে গ্রাহক দেবে"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadQr(payQrDataUrl, `${payMethod}_payment_qr`)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>ইমেজ ডাউনলোড</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintLabel}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 hover:opacity-90 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>কাউন্টার স্ট্যান্ডি প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* Payment Counter Standee Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100/70 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  কাউন্টার পেমেন্ট স্ট্যান্ডি প্রিভিউ
                </span>

                <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-xl flex flex-col items-center text-center max-w-[260px] w-full">
                  <div className="text-sm font-black text-slate-950 uppercase tracking-tight">
                    {store.name}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                    ডিজিটাল পেমেন্ট কাউন্টার
                  </div>

                  <div
                    className={`mt-2 px-3 py-1 rounded-full text-xs font-black text-white ${
                      payMethod === 'bkash'
                        ? 'bg-pink-600'
                        : payMethod === 'nagad'
                        ? 'bg-orange-600'
                        : 'bg-purple-600'
                    }`}
                  >
                    {payMethod === 'bkash'
                      ? 'বিকাশ পেমেন্ট'
                      : payMethod === 'nagad'
                      ? 'নগদ পেমেন্ট'
                      : 'রকেট পেমেন্ট'}{' '}
                    ({payAccountType === 'personal' ? 'Send Money' : 'Payment'})
                  </div>

                  <div className="my-2.5 p-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-xs">
                    {payQrDataUrl ? (
                      <img src={payQrDataUrl} alt="Payment QR" className="w-36 h-36 object-contain" />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                        লোডিং...
                      </div>
                    )}
                  </div>

                  <div className="font-mono text-sm font-black text-slate-900 tracking-wider">
                    {payNumber || '01XXXXXXXXX'}
                  </div>

                  {payAmount && (
                    <div className="mt-1 text-xs font-black text-emerald-700">
                      নির্ধারিত টাকা: ৳{formatMoney(Number(payAmount))}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-1.5 border-t border-slate-100 pt-1.5 w-full">
                    অ্যাপ দিয়ে স্ক্যান করে সহজে পেমেন্ট করুন
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER DUE CARD QR */}
          {activeTab === 'customer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কাস্টমার নির্বাচন করুন:
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — বকেয়া: ৳{formatMoney(c.balance)} ({c.phone || 'নম্বর নেই'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCust && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">কাস্টমার নাম:</span>
                      <span className="text-slate-900">{selectedCust.name}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">মোবাইল:</span>
                      <span className="font-mono text-slate-900">{selectedCust.phone || 'নেই'}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">বর্তমান বকেয়া:</span>
                      <span className={`text-sm font-black ${selectedCust.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ৳{formatMoney(selectedCust.balance)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadQr(customerQrDataUrl, `Customer_${selectedCust?.name || 'card'}`)
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>ইমেজ ডাউনলোড</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintLabel}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>রসিদ কার্ড প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* Customer Due Card Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-100/70 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  কাস্টমার বাকি ডিজিটাল কার্ড
                </span>

                <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-md flex flex-col items-center text-center max-w-[240px] w-full">
                  <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                    {store.name}
                  </div>
                  <div className="text-xs font-black text-slate-950 mt-1">
                    {selectedCust?.name || 'কাস্টমার'}
                  </div>

                  <div className="my-2 p-1 bg-white border border-slate-200 rounded-lg">
                    {customerQrDataUrl ? (
                      <img
                        src={customerQrDataUrl}
                        alt="Customer QR"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-slate-400">
                        লোডিং...
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600">
                    বকেয়া বাকি:{' '}
                    <strong className="text-red-600 font-black">
                      ৳{formatMoney(selectedCust?.balance || 0)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM TEXT / URL QR */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  যেকোনো লেখা, ওয়েবসাইট লিঙ্ক বা ফোন নম্বর লিখুন:
                </label>
                <textarea
                  rows={3}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="https://example.com বা কোনো টেক্সট বার্তা..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {customQrDataUrl ? (
                    <img src={customQrDataUrl} alt="Custom QR" className="w-36 h-36 object-contain" />
                  ) : null}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs font-bold text-slate-800">
                    তৈরিকৃত কিউআর কোড সরাসরি ডাউনলোড বা কপি করুন
                  </p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(customQrDataUrl, 'custom_qr')}
                      className="py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>ডাউনলোড করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyData(customText)}
                      className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'কপি হয়েছে' : 'টেক্সট কপি'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BULK PRINT MODAL / VIEW (All products QR sheet) */}
          {isBulkPrintOpen && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    সব পণ্যের কিউআর স্টিকার শিট ({products.length} টি পণ্য)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    A4 বা স্টিকার পেপারে প্রিন্ট করে প্রতিটি পণ্যে লাগিয়ে দিন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintLabel}
                  className="px-3 py-1.5 rounded-xl bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>এখনই প্রিন্ট করুন</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 border border-slate-300 rounded-lg text-center flex flex-col items-center justify-between"
                  >
                    <span className="text-[9.5px] font-bold text-slate-800 truncate w-full">
                      {p.name}
                    </span>
                    <div className="w-16 h-16 bg-slate-100 flex items-center justify-center my-1 rounded">
                      <QrCode className="w-12 h-12 text-slate-800" />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-500">
                      {p.sku || p.id}
                    </span>
                    <span className="text-[10px] font-black text-slate-900">
                      ৳{formatMoney(p.salePrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
