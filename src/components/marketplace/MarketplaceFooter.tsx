import React, { useState } from 'react';
import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Send,
  CheckCircle2,
  ExternalLink,
  X,
  FileText,
  Shield,
  HelpCircle,
  Briefcase,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface MarketplaceFooterProps {
  onNavigateHome: () => void;
  onNavigateVendors: () => void;
  onNavigateOrders: () => void;
  onOpenSupport: () => void;
  onMerchantLogin?: () => void;
  showToast: (msg: string) => void;
  onScrollToSection?: (id: string) => void;
}

type PolicyKey = 'return' | 'privacy' | 'terms' | 'about' | 'careers' | 'blog';

interface PolicyData {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: {
    heading: string;
    points: string[];
  }[];
}

const POLICY_DETAILS: Record<PolicyKey, PolicyData> = {
  return: {
    title: 'রিটার্ন ও রিফান্ড পলিসি',
    subtitle: 'গ্রাহকের সন্তুষ্টি আমাদের শীর্ষ অগ্রাধিকার। সহজ ও ঝামেলামুক্ত রিটার্ন প্রক্রিয়া।',
    icon: <RotateCcw className="w-5 h-5 text-emerald-600" />,
    content: [
      {
        heading: '১. ৭ দিনের সহজ রিটার্ন সুবিধা',
        points: [
          'পণ্য গ্রহণের পর থেকে সর্বোচ্চ ৭ দিনের মধ্যে রিটার্ন বা রিপ্লেসমেন্টের আবেদন করা যাবে।',
          'পণ্যটি আসল প্যাকেজিং, ট্যাগ এবং আনুষঙ্গিক সমস্ত এক্সেসরিজসহ অক্ষত অবস্থায় থাকতে হবে।',
        ],
      },
      {
        heading: '২. যে সব ক্ষেত্রে রিটার্ন প্রযোজ্য',
        points: [
          'ভুল বা ভিন্ন পণ্য ডেলিভারি হলে।',
          'ত্রুটিপূর্ণ, ক্ষতিগ্রস্ত বা নষ্ট পণ্য পেলে।',
          'বর্ণিত স্পেসিফিকেশনের সাথে পণ্যের অমিল থাকলে।',
        ],
      },
      {
        heading: '৩. দ্রুত রিফান্ড প্রদান',
        points: [
          'পণ্য ভেন্ডরের কাছে ফেরত পৌঁছানোর পর ৩ থেকে ৫ কার্যদিবসের মধ্যে বিকাশ/নগদ/ব্যাংক অ্যাকাউন্টে টাকা রিফান্ড করা হয়।',
          'ক্যাশ অন ডেলিভারির ক্ষেত্রে গ্রাহকের মনোনীত একাউন্টে সরাসরি টাকা পাঠানো হয়।',
        ],
      },
    ],
  },
  privacy: {
    title: 'প্রাইভেসি ও ডেটা পলিসি',
    subtitle: 'আপনার ব্যক্তিগত ও লেনদেনের তথ্যের শতভাগ সুরক্ষা নিশ্চিত করা আমাদের অঙ্গীকার।',
    icon: <Shield className="w-5 h-5 text-blue-600" />,
    content: [
      {
        heading: '১. তথ্য সংগ্রহ ও ব্যবহার',
        points: [
          'অর্ডার ডেলিভারির সুবিধার্থে শুধুমাত্র প্রয়োজনীয় তথ্য (নাম, মোবাইল নম্বর, ঠিকানা) সংগ্রহ করা হয়।',
          'আমরা কখনোই গ্রাহকদের ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রয় বা হস্তান্তর করি না।',
        ],
      },
      {
        heading: '২. নিরাপদ পেমেন্ট প্রসেসিং',
        points: [
          'সকল অনলাইন পেমেন্ট SSL এনক্রিপশনের মাধ্যমে সরাসরি বাংলাদেশ ব্যাংকের অনুমোদিত গেটওয়ে দ্বারা পরিচালিত হয়।',
          'আপনার কার্ড নম্বর বা পিন কোড আমাদের সার্ভারে সংরক্ষিত হয় না।',
        ],
      },
      {
        heading: '৩. আপনার নিয়ন্ত্রণ',
        points: [
          'যেকোনো সময় আপনি আপনার অ্যাকাউন্ট ও যোগাযোগের তথ্য হালনাগাদ বা মুছে ফেলার অনুরোধ জানাতে পারেন।',
        ],
      },
    ],
  },
  terms: {
    title: 'ব্যবহারের নিয়ম ও শর্তাবলী',
    subtitle: 'TWING Marketplace ব্যবহারকারী ও ভেন্ডরদের জন্য প্রযোজ্য নীতিমালা।',
    icon: <FileText className="w-5 h-5 text-amber-600" />,
    content: [
      {
        heading: '১. অ্যাকাউন্ট ও সঠিক তথ্য',
        points: [
          'অর্ডার প্রদান ও লেনদেনের জন্য সঠিক যোগাযোগের ঠিকানা ও ফোন নম্বর প্রদান করতে হবে।',
          'ভুল তথ্যের কারণে ডেলিভারি বিলম্বিত হলে গ্রাহককে ডেলিভারি চার্জের জন্য দায়ী থাকতে হতে পারে।',
        ],
      },
      {
        heading: '২. পণ্যের মূল্য ও প্রাপ্যতা',
        points: [
          'মার্কেটপ্লেসে প্রদর্শিত সকল পণ্যের মূল্য ভেন্ডর কর্তৃক নির্ধারিত এবং নিয়মিত যাচাই করা হয়।',
          'স্টক স্বল্পতার কারণে কোনো অর্ডার সম্পন্ন করা সম্ভব না হলে তাৎক্ষণিক অবগত করে রিফান্ড কার্যকর করা হবে।',
        ],
      },
      {
        heading: '৩. ডেলিভারি ও রিসিভ',
        points: [
          'ডেলিভারি ম্যানের উপস্থিতিতে পার্সেল চেক করে বুঝে নেওয়ার অনুরোধ করা হচ্ছে। কোনো অসংগতি থাকলে তখনই কাস্টমার কেয়ারে যোগাযোগ করুন।',
        ],
      },
    ],
  },
  about: {
    title: 'আমাদের সম্পর্কে',
    subtitle: 'বাংলাদেশের শীর্ষস্থানীয় ডিজিটাল ব্যবসা ও মার্কেটপ্লেস ইকোসিস্টেম।',
    icon: <ShoppingBag className="w-5 h-5 text-[#0052cc]" />,
    content: [
      {
        heading: 'আমাদের গল্প ও লক্ষ্য',
        points: [
          'TWING Marketplace হলো TwingHisabi পরিবারের একটি আধুনিক ডিজিটাল শপিং প্ল্যাটফর্ম।',
          'আমাদের লক্ষ্য সারা বাংলাদেশের প্রান্তিক উদ্যোক্তা ও ভেরিফাইড ভেন্ডরদের সাথে সরাসরি সাধারণ ক্রেতাদের সংযুক্ত করা।',
        ],
      },
      {
        heading: 'কেন আমরা অনন্য',
        points: [
          'প্রত্যেক ভেন্ডরের বৈধ ট্রেড লাইসেন্স ও পণ্যের গুণমান যাচাইয়ের পর অনুমোদন দেওয়া হয়।',
          'হিসাব ব্যবস্থাপনা ও সেন্ট্রাল মার্কেটপ্লেস সরাসরি সংযুক্ত থাকায় স্টকের নির্ভুল নিশ্চয়তা পাওয়া যায়।',
          'সহজ ক্যাশ অন ডেলিভারি এবং দ্রুততম কুরিয়ার পার্টনার নেটওয়ার্ক।',
        ],
      },
    ],
  },
  careers: {
    title: 'ক্যারিয়ার ও সুযোগ',
    subtitle: 'স্মার্ট ও উদ্যমী টিমের সাথে ভবিষ্যতের ডিজিটাল কমার্স গড়তে যোগ দিন।',
    icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
    content: [
      {
        heading: 'আমাদের কাজের পরিবেশ',
        points: [
          'ইনোভেশন-ফার্স্ট কর্মক্ষেত্র যেখানে নতুন আইডিয়া ও উদ্যোগকে সর্বোচ্চ মূল্যায়ন করা হয়।',
          'পারফরম্যান্স বোনাস, শিক্ষণীয় প্রজেক্ট ও দ্রুত ক্যারিয়ার গ্রোথের অনন্য সুযোগ।',
        ],
      },
      {
        heading: 'চলমান নিয়োগ ক্ষেত্রসমূহ',
        points: [
          'কাস্টমার সাকসেস ও সাপোর্ট স্পেশালিস্ট (ঢাকা/রিমোট)।',
          'ভেন্ডর অনবোর্ডিং ও মার্চেন্ট রিলেশন অফিসার।',
          'ডিজিটাল মার্কেটিং ও কন্টেন্ট ক্রিয়েটর।',
        ],
      },
      {
        heading: 'আবেদন করার উপায়',
        points: [
          'আপনার সিভি ও সংক্ষিপ্ত পরিচিতি ইমেইল করুন: careers@twinghisabi.site',
        ],
      },
    ],
  },
  blog: {
    title: 'টুইং ব্লগ ও আপডেট',
    subtitle: 'স্মার্ট কেনাকাটা, ব্যবসা বৃদ্ধির টিপস ও নতুন ফিচার সম্পর্কিত প্রতিবেদন।',
    icon: <BookOpen className="w-5 h-5 text-teal-600" />,
    content: [
      {
        heading: 'সাম্প্রতিক জনপ্রিয় প্রতিবেদনসমূহ',
        points: [
          '📌 অনলাইন শপিংয়ে সঠিক সাইজ ও আসল প্রোডাক্ট চেনার সহজ ৫টি উপায়।',
          '📌 ক্যাশ অন ডেলিভারিতে কেনাকাটা করার সময় যে বিষয়গুলো অবশ্যই খেয়াল রাখবেন।',
          '📌 ক্ষুদ্র ব্যবসায়ীদের জন্য ফ্রিতে অনলাইন স্টোর খোলার সহজ গাইড ২০২৫।',
        ],
      },
      {
        heading: 'নতুন আপডেট নোটিফিকেশন',
        points: [
          'প্রতি সপ্তাহে প্রকাশিত নতুন আর্টিকেল পেতে নিচের নিউজলেটার বক্সে ইমেইল যুক্ত করুন।',
        ],
      },
    ],
  },
};

export const MarketplaceFooter: React.FC<MarketplaceFooterProps> = ({
  onNavigateHome,
  onNavigateVendors,
  onNavigateOrders,
  onOpenSupport,
  onMerchantLogin,
  showToast,
  onScrollToSection,
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyKey | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      showToast('⚠️ অনুগ্রহ করে একটি সঠিক ইমেইল এড্রেস লিখুন');
      return;
    }

    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setNewsletterEmail('');
      showToast('🎉 ধন্যবাদ! TWING Marketplace নিউজলেটারে সফলভাবে সাবস্ক্রাইব হয়েছে।');
    }, 700);
  };

  return (
    <>
      <footer className="bg-slate-50 border-t border-slate-200/90 text-slate-700 pt-8 sm:pt-10 pb-28 sm:pb-10 text-xs mt-10 shadow-2xs relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          {/* ========================================================================= */}
          {/* 1. TOP TRUST BADGES STRIP */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 pb-6 sm:pb-8 border-b border-slate-200">
            {/* Card 1: Fast Delivery */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">দ্রুত ডেলিভারি</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">সারা বাংলাদেশে হোম ডেলিভারি</div>
              </div>
            </div>

            {/* Card 2: 100% Genuine */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-100 text-[#0052cc] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">১০০% আসল পণ্য</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">যাচাইকৃত বিশ্বস্ত ভেন্ডর</div>
              </div>
            </div>

            {/* Card 3: Easy Return */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">৭ দিনে সহজ রিটার্ন</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">নিশ্চিত রিফান্ড ও রিপ্লেসমেন্ট</div>
              </div>
            </div>

            {/* Card 4: 24/7 Helpline */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 truncate">সার্বক্ষণিক সাপোর্ট</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">লাইভ চ্যাট ও ফোন কল</div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MAIN FOOTER CONTENT (Structured Multi-Column Grid) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8">
            {/* ---------------- Col 1: Brand & Contact Info (lg:col-span-4) ---------------- */}
            <div className="sm:col-span-2 lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0052cc] text-white flex items-center justify-center font-black shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight text-[#0052cc] leading-none">TWING</div>
                    <div className="text-[11px] font-black text-orange-600 tracking-wide">Marketplace</div>
                  </div>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed max-w-sm">
                  সবাইয়ের জন্য, সবার পছন্দ। বাংলাদেশের শীর্ষস্থানীয় বিশ্বস্ত ভেন্ডর ও উদ্যোক্তাদের শতভাগ খাঁটি পণ্য সরাসরি আপনার দোরগোড়ায়।
                </p>
              </div>

              {/* Direct Helpline Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 space-y-2 max-w-sm shadow-2xs">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <Headphones className="w-3.5 h-3.5 text-[#0052cc]" />
                  <span>কাস্টমার হেল্পলাইন</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <a
                    href="tel:01700000000"
                    className="flex items-center gap-2 text-slate-800 font-bold hover:text-[#0052cc] transition"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span>০১৭০০-০০০০০০ (সরাসরি ফোন করুন)</span>
                  </a>

                  <a
                    href="mailto:support@twinghisabi.site"
                    className="flex items-center gap-2 text-slate-600 hover:text-[#0052cc] transition"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">support@twinghisabi.site</span>
                  </a>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span>প্রতিদিন সকাল ৯:০০ টা – রাত ১০:০০ টা</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- Col 2: Navigation Links (lg:col-span-2) ---------------- */}
            <div className="space-y-3">
              <h4 className="text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <span className="w-1.5 h-3 bg-[#0052cc] rounded-full inline-block"></span>
                <span>দ্রুত লিংক</span>
              </h4>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>হোম পেজ</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onNavigateVendors}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>সকল ভেন্ডর ও শপ</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onNavigateOrders}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>আমার অর্ডারসমূহ</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (onScrollToSection) onScrollToSection('marketplace-flash-sale');
                    }}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>আজকের ফ্ল্যাশ সেল</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>সাহায্য কেন্দ্র (Help Center)</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* ---------------- Col 3: Customer Care & Policies (lg:col-span-3) ---------------- */}
            <div className="space-y-3">
              <h4 className="text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                <span className="w-1.5 h-3 bg-emerald-600 rounded-full inline-block"></span>
                <span>কাস্টমার সাপোর্ট</span>
              </h4>
              <ul className="space-y-2 text-slate-600 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>সরাসরি যোগাযোগ করুন</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('return')}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>রিটার্ন ও রিফান্ড পলিসি</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('privacy')}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>প্রাইভেসি ও ডেটা পলিসি</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('terms')}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>ব্যবহারের নিয়ম ও শর্তাবলী</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onNavigateOrders}
                    className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span>অর্ডার লাইভ ট্র্যাকিং</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* ---------------- Col 4: About & Newsletter (lg:col-span-3) ---------------- */}
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span className="w-1.5 h-3 bg-orange-600 rounded-full inline-block"></span>
                  <span>আমাদের সম্পর্কে</span>
                </h4>
                <ul className="space-y-2 text-slate-600 text-xs">
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy('about')}
                      className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span>TWING Marketplace সম্পর্কে</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={onMerchantLogin}
                      className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer font-bold text-[#0052cc]"
                    >
                      <ChevronRight className="w-3 h-3 text-[#0052cc]" />
                      <span>ভেন্ডর হিসেবে যোগ দিন →</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy('careers')}
                      className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span>ক্যারিয়ার ও সুযোগ</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => setActivePolicy('blog')}
                      className="hover:text-[#0052cc] hover:translate-x-0.5 transition flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span>টুইং ব্লগ ও টিপস</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* Newsletter Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>নিউজলেটার সাবস্ক্রাইব</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    সেরা অফার ও ডিসকাউন্ট ভাউচার কোড সবার আগে পেতে ইমেইল লিখুন।
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="আপনার ইমেইল অ্যাড্রেস লিখুন"
                      disabled={isSubscribing}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white text-slate-800 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc] transition"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="w-full py-2 bg-[#0052cc] hover:bg-blue-700 active:scale-[0.99] text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {isSubscribing ? (
                      <span>সাবস্ক্রাইব হচ্ছে...</span>
                    ) : (
                      <>
                        <span>সাবস্ক্রাইব করুন</span>
                        <Send className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Social Media Links */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-700">সোশ্যাল মিডিয়ায় যুক্ত থাকুন:</div>
                <div className="flex items-center gap-2">
                  {/* Facebook */}
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xs"
                    title="Facebook"
                    aria-label="Facebook"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>

                  {/* YouTube */}
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-[#FF0000] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xs"
                    title="YouTube"
                    aria-label="YouTube"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xs"
                    title="Instagram"
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  {/* TikTok */}
                  <a
                    href="https://tiktok.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xs"
                    title="TikTok"
                    aria-label="TikTok"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.11V9.4a6.33 6.33 0 0 0-.86-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.05a8.28 8.28 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
                    </svg>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/8801700000000"
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-2xs"
                    title="WhatsApp"
                    aria-label="WhatsApp"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. ACCEPTED PAYMENT PARTNERS & SECURITY */}
          {/* ========================================================================= */}
          <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <span className="text-slate-600 font-bold text-xs shrink-0">নিরাপদ পেমেন্ট মেথড:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* bKash */}
                <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs font-bold text-[11px] text-[#E2136E]">
                  <span className="w-2 h-2 rounded-full bg-[#E2136E]"></span>
                  <span>বিকাশ (bKash)</span>
                </div>

                {/* Nagad */}
                <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs font-bold text-[11px] text-[#F7941D]">
                  <span className="w-2 h-2 rounded-full bg-[#F7941D]"></span>
                  <span>নগদ (Nagad)</span>
                </div>

                {/* Rocket */}
                <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs font-bold text-[11px] text-[#8C3494]">
                  <span className="w-2 h-2 rounded-full bg-[#8C3494]"></span>
                  <span>রকেট (Rocket)</span>
                </div>

                {/* Visa & MasterCard */}
                <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-2xs font-bold text-[11px] text-[#0052cc]">
                  <span>VISA</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-amber-600">MasterCard</span>
                </div>

                {/* Cash on Delivery */}
                <div className="px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 flex items-center gap-1.5 shadow-2xs font-bold text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ক্যাশ অন ডেলিভারি (COD)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SSL 256-Bit ব্যাংক-গ্রেড এনক্রিপ্টেড পেমেন্ট</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. COPYRIGHT & ATTRIBUTION BAR */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-slate-500 text-[11px] text-center sm:text-left">
            <div>
              © ২০২৫ <strong className="text-slate-700">TWING Marketplace</strong>. সর্বস্বত্ব সংরক্ষিত। একটি TwingHisabi উদ্যোগ।
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span>Made with</span>
              <span className="text-rose-500">❤️</span>
              <span>for Bangladesh 🇧🇩</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE POLICY / ABOUT MODAL */}
      {/* ========================================================================= */}
      {activePolicy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActivePolicy(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {POLICY_DETAILS[activePolicy].icon}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {POLICY_DETAILS[activePolicy].title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {POLICY_DETAILS[activePolicy].subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              {POLICY_DETAILS[activePolicy].content.map((sec, idx) => (
                <div key={idx} className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                    {sec.heading}
                  </h4>
                  <ul className="space-y-1 text-slate-600 text-xs list-disc pl-4">
                    {sec.points.map((pt, pIdx) => (
                      <li key={pIdx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                TWING Marketplace অফিসিয়াল পলিসি
              </div>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="px-4 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                বুঝেছি / বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketplaceFooter;
