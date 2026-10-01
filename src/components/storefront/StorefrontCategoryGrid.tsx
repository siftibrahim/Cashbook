import React, { useState } from 'react';
import { LayoutGrid, ArrowRight, Check, Package, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { STOREFRONT_CATEGORIES, StorefrontCategoryItem } from '../../data/storefrontCategories';

interface StorefrontCategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  products: Product[];
  onViewAll?: () => void;
}

export const StorefrontCategoryGrid: React.FC<StorefrontCategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
  products,
  onViewAll,
}) => {
  const [showAllExpanded, setShowAllExpanded] = useState(false);

  // In standard view show 8 (2 rows of 4 on mobile, 1 row of 8 on desktop); expanded shows all 24
  const displayCategories = showAllExpanded
    ? STOREFRONT_CATEGORIES
    : STOREFRONT_CATEGORIES.slice(0, 8);

  const getProductCountForCategory = (catName: string) => {
    return products.filter((p) => {
      if (!p.category) return false;
      return (
        p.category.toLowerCase().includes(catName.toLowerCase()) ||
        catName.toLowerCase().includes(p.category.toLowerCase())
      );
    }).length;
  };

  return (
    <div className="w-full px-2.5 sm:px-4 py-2">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Section Header Matching Screenshot: 💠 সকল ক্যাটাগরি ... সব দেখুন ➔ */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-[#00695C] stroke-[2.5]" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              সকল ক্যাটাগরি
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Sideways Scroll Buttons */}
            <div className="flex sm:hidden items-center gap-0.5">
              <button
                type="button"
                onClick={() => document.getElementById('storefront-categories-container')?.scrollBy({ left: -160, behavior: 'smooth' })}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[10px]"
                title="বামে স্ক্রল"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('storefront-categories-container')?.scrollBy({ left: 160, behavior: 'smooth' })}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-[10px]"
                title="ডানে স্ক্রল"
              >
                ▶
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onViewAll) onViewAll();
                setShowAllExpanded(!showAllExpanded);
              }}
              className="flex items-center gap-1 text-xs font-bold text-[#00695C] hover:text-[#004D40] hover:underline transition cursor-pointer"
            >
              <span>{showAllExpanded ? 'কম দেখুন' : 'সব দেখুন'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Row / Grid (Supports smooth sideways horizontal scrolling on mobile) */}
        <div
          id="storefront-categories-container"
          className={`${
            showAllExpanded
              ? 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
              : 'flex sm:grid sm:grid-cols-6 md:grid-cols-8 overflow-x-auto touch-pan-x scrollbar-thin'
          } gap-2 sm:gap-2.5 pb-1`}
        >
          {displayCategories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const count = getProductCountForCategory(cat.name);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelectCategory('all');
                  } else {
                    onSelectCategory(cat.name);
                  }
                }}
                className={`group p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex flex-col items-center justify-center text-center relative active:scale-95 ${
                  showAllExpanded ? 'w-full' : 'shrink-0 w-[76px] sm:w-auto'
                } ${cat.bgColor} ${cat.borderColor} ${
                  isSelected
                    ? 'ring-2 ring-[#00695C] shadow-md scale-105'
                    : 'hover:shadow-xs hover:border-teal-500/50'
                }`}
              >
                {/* Category Image / Illustration */}
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl overflow-hidden bg-white/70 p-1 mb-1.5 flex items-center justify-center shadow-2xs border border-white/80 group-hover:scale-105 transition-transform duration-200">
                  {cat.iconImage ? (
                    <img
                      src={cat.iconImage}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-slate-400 font-bold text-lg">...</div>
                  )}
                </div>

                {/* Category Name */}
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight group-hover:text-[#00695C] transition">
                  {cat.name}
                </span>

                {/* Selected Check Indicator */}
                {isSelected && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#00695C] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
