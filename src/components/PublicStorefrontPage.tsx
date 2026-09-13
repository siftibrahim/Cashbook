import React, { useState, useEffect, useCallback } from 'react';
import { publicStoreApi } from '../services/apiService';
import { OnlineStoreConfig, Product, OnlineOrder } from '../types';
import { OnlineStorefrontModal } from './OnlineStorefrontModal';
import { Store, AlertCircle, RefreshCw, LogIn, ArrowRight } from 'lucide-react';

interface PublicStorefrontPageProps {
  identifier?: string;
  onMerchantLogin: () => void;
}

export const PublicStorefrontPage: React.FC<PublicStorefrontPageProps> = ({
  identifier,
  onMerchantLogin,
}) => {
  const [config, setConfig] = useState<OnlineStoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorefrontData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Resolve store configuration by slug/domain or host
      const res = await publicStoreApi.resolveStore(identifier || undefined);
      if (!res || !res.found || !res.store) {
        setError('এই অনলাইন স্টোরটি খুঁজে পাওয়া যায়নি বা স্টোরটি সাময়িকভাবে বন্ধ রয়েছে।');
        setIsLoading(false);
        return;
      }

      setConfig(res.store);

      // 2. Fetch published products for this store
      const targetSlug = res.store.storeSlug || res.vendorId || identifier || '';
      const productList = await publicStoreApi.getProducts(targetSlug);
      setProducts(productList || []);
    } catch (err: any) {
      console.error('Error loading public storefront:', err);
      setError('স্টোর লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগ চেক করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    loadStorefrontData();
  }, [loadStorefrontData]);

  const handlePlaceOrder = async (order: OnlineOrder) => {
    const target = identifier || config?.storeSlug || 'default';
    try {
      await publicStoreApi.placeOrder(target, order);
    } catch (err) {
      console.error('Error placing public order:', err);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-700 animate-pulse">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-800">অনলাইন স্টোর লোড হচ্ছে...</h3>
            <p className="text-xs text-slate-500">দোকানের পণ্য ও তথ্য লোড করা হচ্ছে</p>
          </div>
          <div className="w-24 h-1 bg-slate-100 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-teal-600 rounded-full animate-progress origin-left" />
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found Screen
  if (error || !config) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">স্টোর খুঁজে পাওয়া যায়নি</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error || 'অনুরোধকৃত অনলাইন স্টোর বা সাব-ডোমেনটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে লিংকটি সঠিক কিনা যাচাই করুন।'}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={loadStorefrontData}
              className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>

            <button
              type="button"
              onClick={onMerchantLogin}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>দোকানদার হিসেবে লগইন করুন</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Standalone Storefront
  return (
    <OnlineStorefrontModal
      isOpen={true}
      onClose={() => {}}
      config={config}
      products={products}
      onPlaceOrder={handlePlaceOrder}
      isStandalone={true}
      onMerchantLogin={onMerchantLogin}
    />
  );
};
