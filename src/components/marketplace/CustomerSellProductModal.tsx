import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { validateImageFiles, fileToBase64, marketplaceSocialService } from '../../services/marketplaceSocialService';
import { CustomerProductItem } from '../../types/marketplaceSocial';

interface CustomerSellProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: CustomerProductItem) => void;
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

export const CustomerSellProductModal: React.FC<CustomerSellProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [salePrice, setSalePrice] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'used_good' | 'used_fair'>('new');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Strict video check: no videos allowed
    const validation = validateImageFiles(files);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'ভিডিও আপলোড করার অনুমতি নেই! শুধুমাত্র ছবি আপলোড করুন।');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const base64List: string[] = [];
      for (const f of validation.imageFiles) {
        const b64 = await fileToBase64(f, 800, 0.72);
        base64List.push(b64);
      }
      setImages((prev) => [...prev, ...base64List].slice(0, 4));
    } catch (err: any) {
      setErrorMsg('ছবি প্রসেসিংয়ে সমস্যা হয়েছে। অন্য ছবি দিয়ে চেষ্টা করুন।');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectSample = (sampleUrl: string) => {
    setErrorMsg('');
    setImages((prev) => {
      if (prev.includes(sampleUrl)) return prev;
      return [...prev, sampleUrl].slice(0, 4);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('অনুগ্রহ করে পণ্যের নাম বা শিরোনাম লিখুন।');
      return;
    }

    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('সঠিক বিক্রয় মূল্য লিখুন (যেমন: ৳ ৫০০)।');
      return;
    }

    const finalImages = images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
    ];

    setIsSubmitting(true);
    try {
      const product = marketplaceSocialService.uploadCustomerProduct({
        name: name.trim(),
        category,
        salePrice: priceNum,
        regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
        condition,
        description: description.trim(),
        images: finalImages,
      });

      setIsSubmitting(false);
      onSuccess(product);
      onClose();
    } catch (err: any) {
      console.error('Upload product failure:', err);
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'পণ্য আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
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
                <h3 className="font-black text-sm sm:text-base">সেন্ট্রাল মার্কেটপ্লেসে পণ্য বিক্রি করুন</h3>
                <p className="text-[11px] text-blue-100">আপনার পণ্য আপলোড করুন, অন্য কাস্টমাররা সরাসরি কিনতে পারবেন</p>
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
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Video Disallowed Notice */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-center gap-2">
              <span className="font-black text-blue-700">📌 নিয়ম:</span>
              <span>শুধুমাত্র পণ্যের ছবি (Images) আপলোড করা যাবে। ভিডিও ফাইল আপলোড করা যাবে না।</span>
            </div>

            {/* Product Title */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                পণ্যের নাম বা শিরোনাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="যেমন: Apple AirPods Pro 2nd Gen বা নতুন শীতের হুডি..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                required
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  ক্যাটাগরি
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  কন্ডিশন / অবস্থা
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                >
                  <option value="new">সম্পূর্ণ নতুন (Brand New)</option>
                  <option value="like_new">একদম নতুনের মতো (Like New)</option>
                  <option value="used_good">ব্যবহৃত ভালো কন্ডিশন (Used - Good)</option>
                  <option value="used_fair">সাধারণ ব্যবহৃত (Used - Fair)</option>
                </select>
              </div>
            </div>

            {/* Price Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  বিক্রয় মূল্য (৳) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">৳</span>
                  <input
                    type="number"
                    placeholder="৫০০"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#1877F2] focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  আগের / সাধারণ মূল্য (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">৳</span>
                  <input
                    type="number"
                    placeholder="৭৫০ (ঐচ্ছিক)"
                    value={regularPrice}
                    onChange={(e) => setRegularPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                পণ্যের বিবরণ ও স্পেসিফিকেশন
              </label>
              <textarea
                rows={3}
                placeholder="পণ্যের গুণমান, ব্যবহারের সময়কাল, সাথে কী কী থাকবে ইত্যাদি লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1877F2] focus:outline-hidden"
              />
            </div>

            {/* Image Upload Area (Strictly image only, NO videos) */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                পণ্যের ছবি (সর্বোচ্চ ৪টি) <span className="text-rose-500">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*, image/png, image/jpeg, image/jpg, image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 border-2 border-dashed border-blue-300 hover:border-[#1877F2] bg-blue-50/50 hover:bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1877F2]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-[#1877F2]">
                    গ্যালারি বা ক্যামেরা থেকে ছবি আপলোড করুন
                  </span>
                  <span className="text-[10px] text-slate-400">
                    JPG, PNG বা WEBP ছবি গ্রহণযোগ্য (ভিডিও গ্রহণযোগ্য নয়)
                  </span>
                </button>

                {/* Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-2xs group">
                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
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

                {/* Sample quick picks if no image uploaded */}
                {images.length === 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5">অথবা নমুনা ছবি থেকে বেছে নিন:</p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {[
                        { label: 'স্মার্ট ঘড়ি', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80' },
                        { label: 'হেডফোন', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80' },
                        { label: 'ক্যামেরা', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80' },
                        { label: 'পোশাক', url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80' },
                      ].map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSample(s.url)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[11px] font-bold rounded-lg transition border border-slate-200 shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <span>+ {s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  if (e) handleSubmit(e);
                }}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-black text-white bg-[#1877F2] hover:bg-blue-700 active:scale-95 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'আপলোড হচ্ছে...' : 'পণ্য আপলোড / পোস্ট করুন'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
