import React, { useState, useMemo, useRef } from 'react';
import { Product, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
import {
  PRODUCT_IMAGE_PRESETS,
  compressProductImage,
  getFallbackProductImage,
} from '../utils/productImages';
import {
  Package,
  Search,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Tag,
  ArrowUpDown,
  Boxes,
  QrCode,
  Camera,
  Barcode,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Sparkles,
  X,
  Check,
  RefreshCw,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  store: StoreProfile;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onShowToast: (msg: string) => void;
  onOpenProductQr?: (product: Product) => void;
  onOpenScanner?: () => void;
  onOpenQrGenerator?: () => void;
  initialSku?: string | null;
  highlightedProductId?: string | null;
  onClearInitialSku?: () => void;
  onClearHighlightedProduct?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  store,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
  onOpenProductQr,
  onOpenScanner,
  onOpenQrGenerator,
  initialSku,
  highlightedProductId,
  onClearInitialSku,
  onClearHighlightedProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('চাল ও ডাল');
  const [unit, setUnit] = useState('কেজি');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [minAlert, setMinAlert] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // React to incoming initial SKU from scanner
  React.useEffect(() => {
    if (initialSku) {
      setEditingProduct(null);
      setName('');
      setSku(initialSku);
      setCategory('চাল ও ডাল');
      setUnit('কেজি');
      setBuyPrice('');
      setSalePrice('');
      setStock('10');
      setMinAlert('5');
      setImageUrl('');
      setDescription('');
      setShowPresetPicker(false);
      setShowUrlInput(false);
      setIsModalOpen(true);
      if (onClearInitialSku) onClearInitialSku();
    }
  }, [initialSku]);

  // React to highlighted product from barcode scan
  React.useEffect(() => {
    if (highlightedProductId) {
      const found = products.find((p) => p.id === highlightedProductId);
      if (found) {
        setEditingProduct(found);
        setName(found.name);
        setSku(found.sku || found.id);
        setCategory(found.category);
        setUnit(found.unit);
        setBuyPrice(found.buyPrice.toString());
        setSalePrice(found.salePrice.toString());
        setStock(found.stock.toString());
        setMinAlert((found.minStockAlert || 10).toString());
        setImageUrl(found.imageUrl || '');
        setDescription(found.description || '');
        setShowPresetPicker(false);
        setShowUrlInput(false);
        setIsModalOpen(true);
      }
      if (onClearHighlightedProduct) onClearHighlightedProduct();
    }
  }, [highlightedProductId, products]);

  const currency = store.currencySymbol || '৳';

  const categories = ['চাল ও ডাল', 'তেল ও ঘি', 'চিনি ও লবণ', 'চা ও বিস্কুট', 'সাবান ও প্রসাধন', 'অন্যান্য'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === 'all' || p.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCat]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.salePrice || 0) * Number(p.stock || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => Number(p.stock || 0) <= Number(p.minStockAlert || 10)).length;
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory('চাল ও ডাল');
    setUnit('কেজি');
    setBuyPrice('');
    setSalePrice('');
    setStock('50');
    setMinAlert('10');
    setImageUrl('');
    setDescription('');
    setShowPresetPicker(false);
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || p.id);
    setCategory(p.category);
    setUnit(p.unit);
    setBuyPrice(p.buyPrice.toString());
    setSalePrice(p.salePrice.toString());
    setStock(p.stock.toString());
    setMinAlert((p.minStockAlert || 10).toString());
    setImageUrl(p.imageUrl || '');
    setDescription(p.description || '');
    setShowPresetPicker(false);
    setShowUrlInput(false);
    setIsModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const compressed = await compressProductImage(file);
      setImageUrl(compressed);
      onShowToast('📸 পণ্যের ছবি সফলভাবে যুক্ত হয়েছে!');
    } catch (err) {
      onShowToast('ছবি প্রসেসিংয়ে সমস্যা হয়েছে। অন্য ছবি চেষ্টা করুন।');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('পণ্যের নাম লিখুন');
      return;
    }
    const sPrice = Number(salePrice || 0);
    if (sPrice <= 0) {
      onShowToast('বিক্রয় মূল্য প্রদান করুন');
      return;
    }

    const assignedSku = sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;
    const finalImageUrl = imageUrl.trim() || getFallbackProductImage(name.trim(), category);

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        sku: assignedSku,
        category,
        unit,
        buyPrice: Number(buyPrice || 0),
        salePrice: sPrice,
        stock: Number(stock || 0),
        minStockAlert: Number(minAlert || 10),
        imageUrl: finalImageUrl,
        description: description.trim(),
        updatedAt: Date.now(),
      });
      onShowToast(`'${name}' পণ্য আপডেট করা হয়েছে`);
    } else {
      const newProd: Product = {
        id: `prod_${Date.now()}`,
        name: name.trim(),
        sku: assignedSku,
        category,
        unit,
        buyPrice: Number(buyPrice || 0),
        salePrice: sPrice,
        stock: Number(stock || 0),
        minStockAlert: Number(minAlert || 10),
        imageUrl: finalImageUrl,
        description: description.trim(),
        updatedAt: Date.now(),
      };
      onAddProduct(newProd);
      onShowToast(`নতুন পণ্য '${name}' যুক্ত হয়েছে`);
    }
    setIsModalOpen(false);
  };

  const handleQuickAdjustStock = (prod: Product, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    onUpdateProduct({ ...prod, stock: newStock, updatedAt: Date.now() });
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pb-8">
      {/* Top Banner & Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#004D40] text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-teal-200 font-bold">মোট পণ্যের সংখ্যা</p>
            <h3 className="text-2xl font-black">{products.length} টি</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-teal-200" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">মোট স্টক মূল্য (বিক্রয় মূল্য)</p>
            <h3 className="text-2xl font-black text-slate-900">
              {currency} {formatMoney(totalStockValue)}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold">কম স্টক সতর্কতা</p>
            <h3
              className={`text-2xl font-black ${
                lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {lowStockCount} টি পণ্য
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Category, and Add button */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="পণ্য খুঁজুন (নাম বা ক্যাটাগরি)..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none bg-slate-50/50"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons: Scan, QR Generator, and Add Product */}
          <div className="flex items-center gap-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                title="ক্যামেরা দিয়ে পণ্য বারকোড বা কিউআর কোড স্ক্যান করুন"
                className="px-3 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Camera className="w-4 h-4 text-teal-700" />
                <span className="hidden sm:inline">স্ক্যান পণ্য</span>
              </button>
            )}

            {onOpenQrGenerator && (
              <button
                type="button"
                onClick={onOpenQrGenerator}
                title="পণ্যের কিউআর কোড স্টিকার প্রিন্ট করুন"
                className="px-3 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <QrCode className="w-4 h-4 text-teal-700" />
                <span className="hidden sm:inline">কিউআর জেনারেটর</span>
              </button>
            )}

            {/* Add Product Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ নতুন পণ্য</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-[#004D40] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            সব ক্যাটাগরি
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCat(c)}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer ${
                selectedCat === c
                  ? 'bg-[#004D40] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
            কোনো পণ্য পাওয়া যায়নি।
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLowStock = Number(p.stock || 0) <= Number(p.minStockAlert || 10);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between gap-3 hover:border-teal-400 transition"
              >
                <div>
                  <div className="flex gap-3 items-start">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center p-1 relative">
                      <img
                        src={p.imageUrl || getFallbackProductImage(p.name, p.category)}
                        alt={p.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getFallbackProductImage(p.name, p.category);
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                          {p.category}
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>কম স্টক</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 mt-1 truncate">{p.name}</h3>
                      {p.sku && <p className="text-[10px] text-slate-400 font-mono">কোড: {p.sku}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">বিক্রয় মূল্য:</span>
                      <span className="font-black text-teal-700">
                        {currency} {p.salePrice} / {p.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ক্রয় মূল্য:</span>
                      <span className="font-bold text-slate-600">
                        {currency} {p.buyPrice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">মজুদ:</span>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleQuickAdjustStock(p, -1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-l"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-black text-slate-800">
                        {p.stock} {p.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickAdjustStock(p, 1)}
                        className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-r"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onOpenProductQr && (
                      <button
                        type="button"
                        onClick={() => onOpenProductQr(p)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                        title="কিউআর স্টিকার ও বারকোড জেনারেট"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                      title="এডিট"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-sm sm:text-base font-black text-slate-900 mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-700" />
              <span>{editingProduct ? 'পণ্য তথ্য এডিট' : 'নতুন পণ্য যুক্ত করুন'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">পণ্যের নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মিনিকেট চাল"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">বারকোড / SKU কোড (কিউআর আইডি)</label>
                  <button
                    type="button"
                    onClick={() => setSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    স্বয়ংক্রিয় কোড দিন
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="PRD-101 বা প্যাকেজিং বারকোড..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  />
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ক্যাটাগরি</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">একক (Unit)</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="কেজি">কেজি (Kg)</option>
                    <option value="লিটার">লিটার (Ltr)</option>
                    <option value="প্যাকেট">প্যাকেট (Pkt)</option>
                    <option value="টি">টি / পিস (Pcs)</option>
                    <option value="বোতল">বোতল</option>
                    <option value="বস্তা">বস্তা</option>
                  </select>
                </div>
              </div>

              {/* Product Photo Upload Section */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-700" />
                    <span>পণ্যের ছবি (ই-কমার্স ও ইনভেনটরি)</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" />
                      <span>ছবি মুছুন</span>
                    </button>
                  )}
                </div>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                {imageUrl ? (
                  /* Active Image Preview */
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="Product"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getFallbackProductImage(name, category);
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>ছবি যুক্ত রয়েছে</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{isUploading ? 'প্রসেসিং...' : 'অন্য ছবি দিন'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPresetPicker(!showPresetPicker)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>রেডিমেড ছবি</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Upload Action Buttons */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl text-center flex flex-col items-center justify-center gap-1 text-slate-700 transition cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-teal-700" />
                        <span className="text-[10px] font-bold">
                          {isUploading ? 'লোড হচ্ছে...' : 'ছবি আপলোড'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 rounded-xl text-center flex flex-col items-center justify-center gap-1 text-slate-700 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-emerald-700" />
                        <span className="text-[10px] font-bold">ক্যামেরা দিয়ে তুলুন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPresetPicker(!showPresetPicker)}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          showPresetPicker
                            ? 'bg-[#004D40] text-white'
                            : 'bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-700'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-bold">রেডিমেড ছবি</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          showUrlInput
                            ? 'bg-[#004D40] text-white'
                            : 'bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-700'
                        }`}
                      >
                        <LinkIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold">ছবির লিংক</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-500 text-center">
                      মোবাইল বা কম্পিউটার থেকে যেকোনো ছবি আপলোড করুন অথবা রেডিমেড ছবি নির্বাচন করুন।
                    </p>
                  </div>
                )}

                {/* Preset Picker Drawer */}
                {showPresetPicker && (
                  <div className="bg-white p-2.5 rounded-xl border border-teal-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        জনপ্রিয় পণ্যের ছবি নির্বাচন করুন:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPresetPicker(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                      {PRODUCT_IMAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setImageUrl(preset.imageUrl);
                            setShowPresetPicker(false);
                            onShowToast(`📸 '${preset.name}' ছবি নির্বাচিত হয়েছে`);
                          }}
                          className="flex flex-col items-center p-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition cursor-pointer group"
                        >
                          <img
                            src={preset.imageUrl}
                            alt={preset.name}
                            className="w-10 h-10 object-contain rounded group-hover:scale-105 transition"
                          />
                          <span className="text-[9px] font-bold text-slate-700 truncate w-full text-center mt-1">
                            {preset.name.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* URL Input Box */}
                {showUrlInput && (
                  <div className="flex gap-1.5 animate-in fade-in">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="px-3 py-1.5 bg-teal-800 text-white text-xs font-bold rounded-xl"
                    >
                      ঠিক আছে
                    </button>
                  </div>
                )}
              </div>

              {/* Product Short Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  পণ্যের সংক্ষিপ্ত বিবরণ (অনলাইন স্টোরের জন্য ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: ১০০% খাঁটি মিনিকেট চাল, রান্নায় ঝরঝরে ও সুস্বাদু..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    বিক্রয় মূল্য ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="০"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none text-teal-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ক্রয় মূল্য ({currency})
                  </label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="০"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">বর্তমান স্টক</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="০"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">কম স্টক অ্যালার্ট</label>
                  <input
                    type="number"
                    value={minAlert}
                    onChange={(e) => setMinAlert(e.target.value)}
                    placeholder="১০"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#004D40] hover:bg-[#00382E] text-white text-xs font-black rounded-xl shadow-xs cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
