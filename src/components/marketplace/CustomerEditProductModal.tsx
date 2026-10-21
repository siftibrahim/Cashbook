import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Tag,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { validateImageFiles, fileToBase64, marketplaceSocialService } from '../../services/marketplaceSocialService';
import { compressProductImage } from '../../utils/productImages';
import { CustomerProductItem } from '../../types/marketplaceSocial';

interface CustomerEditProductModalProps {
  isOpen: boolean;
  product: CustomerProductItem | null;
  onClose: () => void;
  onSuccess: (updated: CustomerProductItem) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES = [
  'ইলেকট্রনিক্স ও গ্যাজেট',
  'ফ্যাশন ও পোশাক',
  'মোবাইল ও এক্সেসরিজ',
  'ঘর সাজানো ও লাইফস্টাইল',
  'বই ও স্টেশনারি',
  'খাবার ও গ্রোসারি',
  'সৌন্দর্য ও রূপচর্চা',
  'অন্যান্য পণ্য',
];

export const CustomerEditProductModal: React.FC<CustomerEditProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [salePrice, setSalePrice] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used_good' | 'used_fair'>('new');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || CATEGORIES[0]);
      setSalePrice(product.salePrice ? String(product.salePrice) : '');
      setRegularPrice(product.regularPrice ? String(product.regularPrice) : '');
      setCondition(product.condition || 'new');
      setDescription(product.description || '');
      setImages(product.images && product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : []);
      setInStock(product.inStock !== false);
      setErrorMsg('');
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'শুধুমাত্র ছবি ফাইল নির্বাচন করুন।');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const base64List: string[] = [];
      for (const f of validation.imageFiles) {
        try {
          const compressed = await compressProductImage(f, 800, 800, 0.85);
          base64List.push(compressed);
        } catch {
          const raw = await fileToBase64(f);
          base64List.push(raw);
        }
      }
      setImages((prev) => [...prev, ...base64List].slice(0, 6));
    } catch (err: any) {
      setErrorMsg('ছবি প্রসেসিংয়ে সমস্যা হয়েছে।');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('পণ্যের নাম প্রদান করুন।');
      return;
    }

    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('সঠিক বিক্রয় মূল্য লিখুন (যেমন: ৳ ৫০০)।');
      return;
    }

    if (images.length === 0) {
      setErrorMsg('পণ্যের অন্তত একটি ছবি আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedItem: CustomerProductItem = {
        ...product,
        name: name.trim(),
        category,
        salePrice: priceNum,
        regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
        condition,
        description: description.trim(),
        images,
        imageUrl: images[0],
        inStock,
        updatedAt: new Date().toISOString(),
      };

      const result = marketplaceSocialService.updateCustomerProduct(updatedItem);
      setIsSubmitting(false);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  const handleDelete = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই পণ্যটি মুছে ফেলতে চান?')) {
      marketplaceSocialService.deleteCustomerProduct(product.id);
      onDelete?.(product.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#1877F2] to-blue-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base">পণ্য এডিট ও পাবলিক ফিডে আপডেট</h3>
                <p className="text-[11px] text-blue-100">
                  আপডেট করলে এটি স্বয়ংক্রিয়ভাবে পাবলিক ফিডে সব ব্যবহারকারীদের কাছে প্রদর্শিত হবে
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পণ্যের নাম / শিরোনাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: AirPods Pro 2nd Gen"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:border-[#1877F2] outline-hidden"
                required
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কন্ডিশন</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                >
                  <option value="new">নতুন (Brand New)</option>
                  <option value="like_new">নতুনের মতো (Like New)</option>
                  <option value="used_good">ব্যবহৃত - ভালো কন্ডিশন (Used - Good)</option>
                  <option value="used_fair">ব্যবহৃত - সাধারণ (Used - Fair)</option>
                </select>
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিক্রয় মূল্য (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="যেমন: ১৫০০"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-[#1877F2] focus:bg-white focus:border-[#1877F2] outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">আগের বা নিয়মিত মূল্য (৳)</label>
                <input
                  type="number"
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                  placeholder="ঐচ্ছিক (যেমন: ১৮০০)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 outline-hidden"
                />
              </div>
            </div>

            {/* In Stock Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-xs font-black text-slate-800">স্টক অবস্থা (In Stock)</div>
                <div className="text-[11px] text-slate-500">পণ্যটি স্টকে আছে কিনা নির্ধারণ করুন</div>
              </div>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="w-4 h-4 accent-[#1877F2] rounded cursor-pointer"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পণ্যের বিবরণ</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="পণ্যের বৈশিষ্ট্য, ওয়ারেন্টি বা ডেলিভারি তথ্য লিখুন..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#1877F2] outline-hidden resize-none"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পণ্যের ছবি (Image) <span className="text-rose-500">*</span>
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < 6 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#1877F2] rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1"
                >
                  <Upload className="w-5 h-5 text-[#1877F2]" />
                  <span className="text-xs font-bold text-slate-700">ছবি পরিবর্তন বা নতুন ছবি যোগ করুন</span>
                  <span className="text-[10px] text-slate-400">সর্বোচ্চ ৬টি ছবি আপলোড করতে পারবেন</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>পণ্য মুছুন</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'আপডেট হচ্ছে...' : 'আপডেট ও ফিডে পোস্ট করুন'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
