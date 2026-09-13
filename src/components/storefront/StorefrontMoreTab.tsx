import React from 'react';
import { Store, ShieldCheck, Truck, Phone, MapPin, RefreshCw, CreditCard, ExternalLink, MessageCircle } from 'lucide-react';
import { OnlineStoreConfig } from '../../types';

interface StorefrontMoreTabProps {
  config: OnlineStoreConfig;
  totalProductsCount: number;
}

export const StorefrontMoreTab: React.FC<StorefrontMoreTabProps> = ({
  config,
  totalProductsCount,
}) => {
  const storeName = config.storeName || 'bikroyhub';
  const cleanPhone = (config.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Store Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#00695C] text-amber-300 flex items-center justify-center font-black text-xl shadow-xs shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black text-slate-900">{storeName}</h2>
              <span className="p-0.5 rounded-full bg-teal-50 text-teal-700">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xs text-slate-500">{config.tagline || 'সেরা মানের পণ্য, দ্রুত হোম ডেলিভারি ও সুলভ মূল্য'}</p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-teal-800 font-bold">
              <span>{totalProductsCount} টি সক্রিয় পণ্য</span>
              <span>•</span>
              <span>ভেরিফাইড মার্চেন্ট</span>
            </div>
          </div>
        </div>

        {config.address && (
          <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{config.address}</span>
          </div>
        )}
      </div>

      {/* Customer Service & Hotline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {config.phone && (
          <a
            href={`tel:${cleanPhone}`}
            className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3 transition shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold">গ্রাহক হেল্পলাইন</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 font-mono">{config.phone}</div>
            </div>
          </a>
        )}

        {config.whatsappPhone && (
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            className="bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3 transition shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold">হোয়াটসঅ্যাপ অর্ডার</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 font-mono">{config.whatsappPhone}</div>
            </div>
          </a>
        )}
      </div>

      {/* Delivery & Payment Information */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Truck className="w-4 h-4 text-teal-700" />
          <span>ডেলিভারি ও শিপিং চার্জ</span>
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-slate-500 font-medium">ঢাকা সিটির ভেতরে</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳ {config.deliveryInsideDhaka || 60}</div>
            <div className="text-[10px] text-teal-700 mt-1">সময়: ১২-২৪ ঘণ্টা</div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="text-slate-500 font-medium">ঢাকার বাইরে সারা দেশে</div>
            <div className="text-base font-black text-slate-900 mt-0.5">৳ {config.deliveryOutsideDhaka || 120}</div>
            <div className="text-[10px] text-teal-700 mt-1">সময়: ২৪-৪৮ ঘণ্টা</div>
          </div>
        </div>

        {config.freeDeliveryAbove && config.freeDeliveryAbove > 0 && (
          <div className="text-xs text-amber-900 bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-2xl font-bold flex items-center gap-1.5">
            <span>🎉 ৳{config.freeDeliveryAbove} বা তার বেশি অর্ডারে সম্পূর্ণ ফ্রি ডেলিভারি!</span>
          </div>
        )}
      </div>

      {/* Trust & Guarantee Policies */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-teal-700" />
          <span>রিটার্ন ও ওয়ারেন্টি পলিসি</span>
        </h3>

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <span>ডেলিভারিম্যানের সামনে পণ্য চেক করে রিসিভ করতে পারবেন। কোনো ত্রুটি পেলে তাৎক্ষণিক ফেরত দিতে পারবেন।</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <span>শতভাগ আসল ও ত্রুটিমুক্ত পণ্যের নিশ্চয়তা। প্রিমিয়াম প্যাকেজিং নিশ্চিত করা হয়।</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
            <span>ক্যাশ অন ডেলিভারি, বিকাশ ও নগদের মাধ্যমে নিরাপদ ও সহজ পেমেন্ট সুবিধা।</span>
          </div>
        </div>
      </div>
    </div>
  );
};
