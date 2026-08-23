import React, { useState, useMemo } from 'react';
import { Product, StoreProfile } from '../types';
import { formatMoney } from '../utils/storage';
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
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  store: StoreProfile;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  store,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('চাল ও ডাল');
  const [unit, setUnit] = useState('কেজি');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [minAlert, setMinAlert] = useState('10');

  const currency = store.currencySymbol || '৳';

  const categories = ['চাল ও ডাল', 'তেল ও ঘি', 'চিনি ও লবণ', 'চা ও বিস্কুট', 'সাবান ও প্রসাধন', 'অন্যান্য'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
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
    setCategory('চাল ও ডাল');
    setUnit('কেজি');
    setBuyPrice('');
    setSalePrice('');
    setStock('50');
    setMinAlert('10');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setBuyPrice(p.buyPrice.toString());
    setSalePrice(p.salePrice.toString());
    setStock(p.stock.toString());
    setMinAlert((p.minStockAlert || 10).toString());
    setIsModalOpen(true);
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

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        category,
        unit,
        buyPrice: Number(buyPrice || 0),
        salePrice: sPrice,
        stock: Number(stock || 0),
        minStockAlert: Number(minAlert || 10),
        updatedAt: Date.now(),
      });
      onShowToast(`'${name}' পণ্য আপডেট করা হয়েছে`);
    } else {
      const newProd: Product = {
        id: `prod_${Date.now()}`,
        name: name.trim(),
        category,
        unit,
        buyPrice: Number(buyPrice || 0),
        salePrice: sPrice,
        stock: Number(stock || 0),
        minStockAlert: Number(minAlert || 10),
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

          {/* Add Product Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-[#00695C] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন পণ্য যোগ</span>
          </button>
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

                  <h3 className="text-sm font-black text-slate-900 mt-2">{p.name}</h3>

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
