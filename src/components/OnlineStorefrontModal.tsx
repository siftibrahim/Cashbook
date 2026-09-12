import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, OnlineStoreConfig, OnlineOrder } from '../types';
import { formatMoney } from '../utils/storage';
import { getFallbackProductImage } from '../utils/productImages';
import {
  X,
  ShoppingCart,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Share2,
  Copy,
  Clock,
  ChevronRight,
  Store,
  BadgePercent,
  Check,
} from 'lucide-react';

interface OnlineStorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OnlineStoreConfig;
  products: Product[];
  onPlaceOrder: (order: OnlineOrder) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const OnlineStorefrontModal: React.FC<OnlineStorefrontModalProps> = ({
  isOpen,
  onClose,
  config,
  products,
  onPlaceOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);

  // Checkout form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OnlineOrder | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter published products
  const publishedProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isPublishedOnline === false) return false;
      if (config.publishedProductIds && config.publishedProductIds.length > 0) {
        return config.publishedProductIds.includes(p.id);
      }
      return true;
    });
  }, [products, config.publishedProductIds]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [publishedProducts]);

  // Filtered by search & category
  const filteredProducts = useMemo(() => {
    return publishedProducts.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [publishedProducts, selectedCategory, searchQuery]);

  // Cart calculations
  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const isFreeDeliveryEligible = config.freeDeliveryAbove && config.freeDeliveryAbove > 0 && subtotal >= config.freeDeliveryAbove;

  const deliveryCharge = isFreeDeliveryEligible
    ? 0
    : deliveryArea === 'inside_dhaka'
    ? config.deliveryInsideDhaka || 60
    : config.deliveryOutsideDhaka || 120;

  const totalAmount = subtotal + deliveryCharge;

  if (!isOpen) return null;

  // Cart actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      alert('দয়া করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন।');
      return;
    }
    if (cart.length === 0) {
      alert('আপনার কার্ট খালি। অনুগ্রহ করে পণ্য যোগ করুন।');
      return;
    }

    setIsSubmitting(true);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder: OnlineOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      deliveryArea,
      deliveryCharge,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        unitPrice: c.product.salePrice,
        quantity: c.quantity,
        unit: c.product.unit || 'টি',
        total: c.product.salePrice * c.quantity,
        sku: c.product.sku,
      })),
      subtotal,
      totalAmount,
      paymentMethod,
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      notes: orderNotes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTimeout(() => {
      onPlaceOrder(newOrder);
      setCompletedOrder(newOrder);
      setCart([]);
      setIsCheckoutStep(false);
      setIsSubmitting(false);
    }, 600);
  };

  const domainDisplay = config.customDomainVerified && config.customDomain
    ? config.customDomain
    : `${config.storeSlug || 'shop'}.twingstore.com`;

  const copyStoreLink = () => {
    navigator.clipboard.writeText(`https://${domainDisplay}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sendOrderToWhatsApp = (order: OnlineOrder) => {
    const phone = config.whatsappPhone || config.phone;
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const itemsText = order.items
      .map((it, i) => `${i + 1}. ${it.productName} x ${it.quantity} ${it.unit} = ৳${formatMoney(it.total)}`)
      .join('\n');

    const msg = `🛍️ *নতুন অনলাইন অর্ডার - ${order.orderNumber}*
দোকান: ${config.storeName}
--------------------------
গ্রাহকের নাম: ${order.customerName}
মোবাইল: ${order.customerPhone}
ঠিকানা: ${order.customerAddress}
এলাকা: ${order.deliveryArea === 'inside_dhaka' ? 'ঢাকা সিটির ভেতরে' : 'ঢাকার বাইরে'}
পেমেন্ট: ${order.paymentMethod.toUpperCase()}

*অর্ডারকৃত পণ্যসমূহ:*
${itemsText}
--------------------------
সাবটোটাল: ৳${formatMoney(order.subtotal)}
ডেলিভারি চার্জ: ৳${formatMoney(order.deliveryCharge)}
*মোট প্রদেয়: ৳${formatMoney(order.totalAmount)}*

অর্ডারটি দ্রুত নিশ্চিত ও ডেলিভারি করার জন্য ধন্যবাদ!`;

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col justify-center items-center overflow-hidden p-0 sm:p-2 md:p-4">
      <div className="w-full max-w-5xl h-full sm:h-[94vh] bg-slate-100 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 relative">
        {/* Top Merchant Control Bar */}
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2 shrink-0 z-30 text-xs sm:text-sm">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-slate-200">লাইভ ই-কমার্স স্টোরফ্রন্ট প্রিভিউ</span>
            <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-teal-300 font-mono">
              https://{domainDisplay}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={copyStoreLink}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
              title="প্রিভিউ বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* E-Commerce Storefront Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
          {/* Announcement Bar */}
          {config.announcement && (
            <div className="bg-[#004D40] text-white text-xs sm:text-sm font-semibold py-1.5 px-4 text-center tracking-wide shrink-0 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>{config.announcement}</span>
            </div>
          )}

          {/* Storefront Header */}
          <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 sm:py-4 sticky top-0 z-20 shadow-xs">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border-2 border-teal-600 text-teal-800 flex items-center justify-center font-black text-lg sm:text-xl shadow-xs shrink-0">
                  <Store className="w-5 h-5 sm:w-6 sm:h-6 text-teal-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-base sm:text-xl font-black text-slate-900 truncate tracking-tight">
                      {config.storeName}
                    </h1>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      ভেরিফাইড শপ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate font-medium mt-0.5">{config.tagline}</p>
                </div>
              </div>

              {/* Header Right Actions: WhatsApp, Call, Cart */}
              <div className="flex items-center gap-2 shrink-0">
                {config.whatsappPhone && (
                  <a
                    href={`https://wa.me/${config.whatsappPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 sm:px-3 sm:py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}

                {/* Cart Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsCheckoutStep(false);
                  }}
                  className="relative px-3.5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">কার্ট</span>
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* Hero Banner Section */}
          <div className="bg-gradient-to-r from-[#004D40] to-[#00695C] text-white py-6 sm:py-8 px-4 sm:px-8 shrink-0">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-xs border border-white/20">
                  <BadgePercent className="w-3.5 h-3.5 text-amber-300" />
                  <span>অনলাইন স্পেশাল অফার চলমান</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
                  ঘরে বসেই অর্ডার করুন আপনার পছন্দের পণ্য!
                </h2>
                <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
                  {config.address ? `লোকেশন: ${config.address} • ` : ''}সারা দেশে দ্রুত হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা।
                </p>
              </div>

              {/* Delivery info pills */}
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
                <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-center">
                  <div className="text-[11px] text-teal-200">ঢাকা ভেতরে</div>
                  <div className="font-bold text-sm">৳{config.deliveryInsideDhaka || 60}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 text-center">
                  <div className="text-[11px] text-teal-200">ঢাকার বাইরে</div>
                  <div className="font-bold text-sm">৳{config.deliveryOutsideDhaka || 120}</div>
                </div>
                {config.freeDeliveryAbove && (
                  <div className="bg-amber-400 text-slate-950 px-3 py-2 rounded-xl text-center font-bold">
                    <div className="text-[10px] text-slate-800 font-semibold">ফ্রি ডেলিভারি</div>
                    <div className="text-xs font-black">৳{formatMoney(config.freeDeliveryAbove)}+ অর্ডারে</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search & Category Filter Section */}
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-4 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পণ্য খুঁজুন (নাম বা কোড)..."
                  className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm font-semibold text-slate-800 shadow-2xs placeholder:text-slate-400"
                />
                <Search className="w-4.5 h-4.5 absolute left-3.5 top-3 sm:top-3.5 text-slate-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 sm:top-3 text-slate-400 hover:text-slate-600 font-bold text-sm p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#004D40] text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  সকল পণ্য ({publishedProducts.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#004D40] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Grid */}
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pb-12 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 my-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">কোনো পণ্য পাওয়া যায়নি</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {publishedProducts.length === 0
                    ? 'দোকানের ইনভেনটরি থেকে পণ্য যুক্ত করুন। পণ্য যুক্ত করলে স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।'
                    : 'আপনার অনুসন্ধানের সাথে মিল রেখে কোনো পণ্য পাওয়া যায়নি। অন্য কিছু লিখে খুঁজুন।'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const inCartItem = cart.find((c) => c.product.id === product.id);
                  const inStock = product.stock > 0;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col overflow-hidden group"
                    >
                      {/* Product Thumbnail / Image */}
                      <div className="h-36 sm:h-44 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative p-2 border-b border-slate-100 overflow-hidden">
                        <img
                          src={product.imageUrl || getFallbackProductImage(product.category, product.name)}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const fallback = getFallbackProductImage(product.category, product.name);
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />

                        {/* Stock Badge */}
                        <div className="absolute top-2 left-2">
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              inStock
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {inStock ? `স্টক: ${product.stock} ${product.unit || 'টি'}` : 'স্টক শেষ'}
                          </span>
                        </div>

                        {/* COD available mini tag */}
                        <div className="absolute top-2 right-2">
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded shadow-xs">
                            COD
                          </span>
                        </div>

                        {product.category && (
                          <div className="absolute bottom-2 right-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-white/90 backdrop-blur-xs rounded-md text-slate-600 border border-slate-200 shadow-2xs">
                              {product.category}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-[#004D40] transition">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          {product.sku && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">কোড: {product.sku}</p>
                          )}
                        </div>

                        {/* Price & Action Button */}
                        <div className="pt-1">
                          <div className="flex items-baseline justify-between gap-1 mb-2">
                            <span className="text-sm sm:text-base font-black text-teal-800">
                              ৳ {formatMoney(product.salePrice)}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                              প্রতি {product.unit || 'টি'}
                            </span>
                          </div>

                          {inCartItem ? (
                            <div className="flex items-center justify-between bg-teal-50 border border-teal-300 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, -1)}
                                className="w-7 h-7 bg-white text-teal-800 rounded-lg flex items-center justify-center font-bold hover:bg-teal-100 shadow-2xs transition active:scale-90"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-xs sm:text-sm text-teal-900 px-2">
                                {inCartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, 1)}
                                className="w-7 h-7 bg-[#004D40] text-white rounded-lg flex items-center justify-center font-bold hover:bg-[#00382E] shadow-2xs transition active:scale-90"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              disabled={!inStock}
                              className={`w-full py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer ${
                                inStock
                                  ? 'bg-[#004D40] hover:bg-[#00382E] text-white'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{inStock ? 'অর্ডার করুন' : 'মজুদ নেই'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Mobile Floating Cart Bar */}
          {cartItemCount > 0 && !isCartOpen && (
            <div className="sticky bottom-3 mx-4 sm:mx-8 z-20">
              <div className="bg-[#004D40] text-white p-3 sm:p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-teal-600/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                    {cartItemCount}
                  </div>
                  <div>
                    <div className="text-xs text-teal-200">মোট কার্ট মূল্য</div>
                    <div className="text-sm sm:text-base font-black">৳ {formatMoney(subtotal)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(true);
                    setIsCheckoutStep(true);
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  <span>অর্ডার সম্পন্ন করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sliding Cart & Checkout Drawer */}
        <AnimatePresence>
          {isCartOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-teal-800" />
                    <h3 className="font-bold text-base text-slate-900">
                      {isCheckoutStep ? 'ডেলিভারি ও চেকআউট' : `শপিং কার্ট (${cartItemCount})`}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">আপনার কার্ট খালি!</p>
                      <p className="text-xs text-slate-400">স্টোরফ্রন্ট থেকে পছন্দের পণ্য যোগ করুন।</p>
                    </div>
                  ) : !isCheckoutStep ? (
                    /* Step 1: Items List */
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {item.product.name}
                            </h4>
                            <div className="text-xs text-slate-500 mt-0.5">
                              ৳{formatMoney(item.product.salePrice)} x {item.quantity} ={' '}
                              <span className="font-bold text-teal-800">
                                ৳{formatMoney(item.product.salePrice * item.quantity)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Summary Box */}
                      <div className="bg-teal-50/70 rounded-2xl border border-teal-200/70 p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্য সাবটোটাল:</span>
                          <span className="font-bold text-slate-900">৳ {formatMoney(subtotal)}</span>
                        </div>
                        {isFreeDeliveryEligible && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>ফ্রি ডেলিভারি অফার:</span>
                            <span>ফ্রি (৳০)</span>
                          </div>
                        )}
                        <div className="border-t border-teal-200 pt-2 flex justify-between font-black text-sm text-teal-950">
                          <span>মোট পরিশোধযোগ্য:</span>
                          <span>৳ {formatMoney(subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Checkout Form */
                    <form id="store-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>অর্ডার নিশ্চিত করতে আপনার সঠিক ডেলিভারি ঠিকানা দিন।</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">আপনার নাম *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="উদাঃ মোঃ রাকিব হাসান"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">মোবাইল নম্বর *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="উদাঃ 017XXXXXXXX"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">সম্পূর্ণ ডেলিভারি ঠিকানা *</label>
                        <textarea
                          required
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা নং, রোড, এলাকা/থানা, জেলা"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">ডেলিভারি এলাকা নির্বাচন করুন</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryArea('inside_dhaka')}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                              deliveryArea === 'inside_dhaka'
                                ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>ঢাকা সিটির ভেতরে</div>
                            <div className="text-[11px] text-teal-700 font-black mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳${config.deliveryInsideDhaka || 60}`}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryArea('outside_dhaka')}
                            className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                              deliveryArea === 'outside_dhaka'
                                ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>ঢাকার বাইরে</div>
                            <div className="text-[11px] text-teal-700 font-black mt-0.5">
                              {isFreeDeliveryEligible ? 'ফ্রি ডেলিভারি' : `৳${config.deliveryOutsideDhaka || 120}`}
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">পেমেন্ট পদ্ধতি</label>
                        <div className="grid grid-cols-2 gap-2">
                          {config.acceptCOD && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('cod')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'cod'
                                  ? 'bg-teal-50 border-teal-600 text-teal-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>ক্যাশ অন ডেলিভারি</div>
                              <div className="text-[10px] text-slate-500 font-normal">পণ্য পেয়ে মূল্য দিন</div>
                            </button>
                          )}

                          {config.acceptBkash && (
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('bkash')}
                              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                                paymentMethod === 'bkash'
                                  ? 'bg-pink-50 border-pink-500 text-pink-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>বিকাশ (bKash)</div>
                              <div className="text-[10px] text-pink-700 font-semibold">{config.bkashNumber || 'মার্চেন্ট/পার্সোনাল'}</div>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Total Breakdown */}
                      <div className="bg-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>পণ্য মূল্য:</span>
                          <span>৳ {formatMoney(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>ডেলিভারি ফি:</span>
                          <span>{deliveryCharge === 0 ? 'ফ্রি (৳০)' : `৳ ${formatMoney(deliveryCharge)}`}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                          <span>সর্বমোট পরিশোধ:</span>
                          <span className="text-teal-900">৳ {formatMoney(totalAmount)}</span>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                {cart.length > 0 && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
                    {!isCheckoutStep ? (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutStep(true)}
                        className="w-full py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <span>এগিয়ে যান (চেকআউট)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCheckoutStep(false)}
                          className="px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition"
                        >
                          পেছনে
                        </button>
                        <button
                          type="submit"
                          form="store-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <span>অর্ডার প্রসেস হচ্ছে...</span>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>অর্ডার নিশ্চিত করুন (৳{formatMoney(totalAmount)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Order Success Modal */}
        <AnimatePresence>
          {completedOrder && (
            <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900">অর্ডার সফলভাবে সম্পন্ন হয়েছে!</h3>
                  <p className="text-xs text-slate-500">
                    অর্ডার ট্র্যাকিং আইডি: <span className="font-mono font-bold text-teal-800">{completedOrder.orderNumber}</span>
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">গ্রাহকের নাম:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মোবাইল:</span>
                    <span className="font-bold text-slate-800">{completedOrder.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">মোট বিল:</span>
                    <span className="font-black text-teal-900">৳ {formatMoney(completedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold uppercase text-slate-800">{completedOrder.paymentMethod}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => sendOrderToWhatsApp(completedOrder)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp এ অর্ডার কপি পাঠান</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCartOpen(false);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    ঠিক আছে, বন্ধ করুন
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
