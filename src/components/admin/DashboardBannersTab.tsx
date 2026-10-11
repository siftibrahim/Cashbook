import React, { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
  Save,
} from "lucide-react";

export interface DashboardBannersTabProps {
  onShowToast?: (msg: string) => void;
  currentUserEmail?: string;
}

interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
}

const STORAGE_KEY = "twing_dashboard_promo_banners_v1";

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: "banner_1",
    title: "স্পেশাল ডিসকাউন্ট অফার!",
    subtitle: "সেন্ট্রাল মার্কেটপ্লেসে নতুন পণ্য কেনার আকর্ষণীয় সুযোগ",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80",
    isActive: true,
    order: 1,
  },
  {
    id: "banner_2",
    title: "সহজ হিসাব ও অনলাইন বেচাকেনা",
    subtitle: "আপনার ব্যবসাকে ডিজিটাল করার সবচেয়ে সহজ মাধ্যম",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80",
    isActive: true,
    order: 2,
  },
];

export const DashboardBannersTab: React.FC<DashboardBannersTabProps> = ({
  onShowToast,
  currentUserEmail,
}) => {
  const [banners, setBanners] = useState<BannerItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_BANNERS;
  });

  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(banners));
    } catch {}
  }, [banners]);

  const handleToggleActive = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
    onShowToast?.("ব্যানারের স্ট্যাটাস পরিবর্তন করা হয়েছে");
  };

  const handleDelete = (id: string) => {
    if (confirm("আপনি কি এই ব্যানারটি মুছে ফেলতে চান?")) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
      onShowToast?.("ব্যানার সফলভাবে মুছে ফেলা হয়েছে");
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner?.title || !editingBanner?.imageUrl) {
      onShowToast?.("শিরোনাম ও ছবির লিঙ্ক দেওয়া আবশ্যক");
      return;
    }

    setBanners((prev) => {
      const exists = prev.some((b) => b.id === editingBanner.id);
      if (exists) {
        return prev.map((b) => (b.id === editingBanner.id ? editingBanner : b));
      }
      return [editingBanner, ...prev];
    });

    onShowToast?.("ব্যানার সফলভাবে সেভ হয়েছে!");
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0052cc]" />
            <span>ড্যাশবোর্ড প্রোমো ব্যানার ম্যানেজমেন্ট</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ইউজার ড্যাশবোর্ডে প্রদর্শিত অফার ও প্রমোশনাল ব্যানার নিয়ন্ত্রণ করুন
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingBanner({
              id: "banner_" + Date.now(),
              title: "",
              subtitle: "",
              imageUrl: "",
              linkUrl: "",
              isActive: true,
              order: banners.length + 1,
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ব্যানার যুক্ত করুন</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between"
          >
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <span
                className={
                  "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs " +
                  (banner.isActive
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-200")
                }
              >
                {banner.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-xs text-slate-500 mt-1">{banner.subtitle}</p>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(banner.id)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {banner.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBanner(banner);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="এডিট"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              {editingBanner.title ? "ব্যানার সম্পাদনা" : "নতুন ব্যানার তৈরি"}
            </h3>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যানারের শিরোনাম *
                </label>
                <input
                  type="text"
                  value={editingBanner.title}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]"
                  placeholder="যেমন: শীতকালীন স্পেশাল ছাড়"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সাব-টাইটেল / বিবরণ
                </label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ""}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]"
                  placeholder="যেমন: সীমিত সময়ের জন্য"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ছবির URL *
                </label>
                <input
                  type="url"
                  value={editingBanner.imageUrl}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]"
                  placeholder="https://example.com/banner.jpg"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="banner_active"
                  checked={editingBanner.isActive}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, isActive: e.target.checked })
                  }
                  className="rounded text-[#0052cc]"
                />
                <label htmlFor="banner_active" className="text-xs font-bold text-slate-700">
                  ব্যানারটি সক্রিয় রাখুন
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBanner(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer"
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

export default DashboardBannersTab;
