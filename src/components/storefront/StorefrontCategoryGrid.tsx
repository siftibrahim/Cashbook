import React from 'react';
import { Pill, Sparkles, Shirt, Utensils, Droplets, Coffee, Package, Check } from 'lucide-react';
import { Product } from '../../types';

interface StorefrontCategoryGridProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  products: Product[];
}

export const StorefrontCategoryGrid: React.FC<StorefrontCategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  products,
}) => {
  const getCategoryIcon = (cat: string) => {
    const q = cat.toLowerCase();
    if (q.includes('মেডিসিন') || q.includes('ঔষধ')) return Pill;
    if (q.includes('স্কিনকেয়ার') || q.includes('সৌন্দর্য') || q.includes('প্রসাধন')) return Sparkles;
    if (q.includes('পাঞ্জাবি') || q.includes('পোশাক') || q.includes('ফ্যাশন')) return Shirt;
    if (q.includes('চাল') || q.includes('ডাল') || q.includes('খাবার')) return Utensils;
    if (q.includes('তেল') || q.includes('ঘি')) return Droplets;
    if (q.includes('চা') || q.includes('কফি') || q.includes('বিস্কুট')) return Coffee;
    return Package;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg sm:text-xl font-black text-slate-900">সকল ক্যাটাগরি</h2>
        <p className="text-xs text-slate-500">আপনার প্রয়োজনীয় পণ্যের ক্যাটাগরি বেছে নিন</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {/* All Products Tile */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
            selectedCategory === 'all'
              ? 'bg-[#004D40] text-white border-teal-700 shadow-md scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-500/50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            {selectedCategory === 'all' && <Check className="w-4 h-4 text-amber-300" />}
          </div>
          <div>
            <div className="font-bold text-sm">সকল পণ্য</div>
            <div
              className={`text-[11px] ${
                selectedCategory === 'all' ? 'text-teal-200' : 'text-slate-400'
              }`}
            >
              {products.length} টি পণ্য
            </div>
          </div>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat);
          const isSelected = selectedCategory === cat;
          const count = products.filter((p) => p.category === cat).length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                isSelected
                  ? 'bg-[#004D40] text-white border-teal-700 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-teal-500/50 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-300" />}
              </div>
              <div>
                <div className="font-bold text-sm truncate">{cat}</div>
                <div className={`text-[11px] ${isSelected ? 'text-teal-200' : 'text-slate-400'}`}>
                  {count} টি পণ্য
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
