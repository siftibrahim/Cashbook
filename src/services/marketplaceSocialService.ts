import {
  CustomerProfile,
  SocialPost,
  SocialComment,
  SocialReactionType,
  CustomerProductItem,
  ChatMessage,
  ChatConversation,
  SocialNotification,
  FriendRequest,
  FriendRequestStatus,
  MarketplaceBoostRequest,
} from '../types/marketplaceSocial';

const PROFILE_KEY = 'mkt_fb_current_profile_v2';
const POSTS_KEY = 'mkt_fb_feed_posts_v2';
const PRODUCTS_KEY = 'mkt_fb_customer_products_v2';
const MESSAGES_KEY = 'mkt_fb_chat_messages_v2';
const NOTIFICATIONS_KEY = 'mkt_fb_notifications_v2';
const PROFILES_DIRECTORY_KEY = 'mkt_fb_profiles_directory_v2';
const FRIEND_REQUESTS_KEY = 'mkt_fb_friend_requests_v3';
const USER_FRIENDS_KEY = 'mkt_fb_user_friends_v3';
const BOOST_REQUESTS_KEY = 'mkt_fb_boost_requests_v1';

// Helper to validate NO video files
export function validateImageFiles(files: FileList | File[]): { valid: boolean; error?: string; imageFiles: File[] } {
  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|flv|wmv|3gp|m4v)$/i.test(file.name)) {
      return {
        valid: false,
        error: '⚠️ ভিডিও আপলোড করার অনুমতি নেই। শুধুমাত্র ছবি (PNG, JPG, WEBP) আপলোড করা যাবে।',
        imageFiles: [],
      };
    }
    // Accept standard images: if mime type starts with image/ OR extension matches common image extensions
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|avif|ico)$/i.test(file.name);
    if (!isImage) {
      return {
        valid: false,
        error: '⚠️ শুধুমাত্র ছবি ফাইল (Image: JPG, PNG, WEBP) নির্বাচন করুন।',
        imageFiles: [],
      };
    }
  }
  return { valid: true, imageFiles: fileArray };
}

// Helper to prune older cache items when localStorage quota is near full
export function pruneStorageOnQuota(): void {
  try {
    const postsRaw = localStorage.getItem(POSTS_KEY);
    if (postsRaw) {
      const posts = JSON.parse(postsRaw);
      if (Array.isArray(posts) && posts.length > 15) {
        localStorage.setItem(POSTS_KEY, JSON.stringify(posts.slice(0, 15)));
      }
    }
    const prodsRaw = localStorage.getItem(PRODUCTS_KEY);
    if (prodsRaw) {
      const prods = JSON.parse(prodsRaw);
      if (Array.isArray(prods) && prods.length > 20) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods.slice(0, 20)));
      }
    }
  } catch (e) {}
}

// Convert File to compressed base64 image (max 800px, jpeg quality 0.65) to prevent localStorage quota errors
export function fileToBase64(file: File, maxWidth = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// Default community profiles
const INITIAL_PROFILES: CustomerProfile[] = [
  {
    id: 'user_current',
    name: 'সিফাত রায়হান',
    username: '@sifat_raihan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1200&q=80',
    bio: 'সেন্ট্রাল মার্কেটপ্লেস ক্রেতা ও প্রযুক্তিপ্রেমী 🛍️ | নতুন গ্যাজেট ও অনলাইন শপিং ভালোবাসি।',
    phone: '01711223344',
    address: 'বাড়ি ১২, রোড ৭, সেক্টর ৪, উত্তরা',
    location: 'উত্তরা, ঢাকা',
    joinedDate: 'মার্চ ২০২৪',
    followersCount: 248,
    followingCount: 112,
    isVerified: true,
    rating: 4.9,
    totalSales: 18,
    totalOrders: 34,
    blockedUserIds: [],
  },
  {
    id: 'user_tanvir',
    name: 'তানভীর আহমেদ',
    username: '@tanvir_gadgets',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    bio: 'প্রিমিয়াম গ্যাজেট ও ইলেকট্রনিক্স ডিলার 💻✨ | বিশ্বস্ত কেনাকাটায় টুইংহিসাবি মার্কেটপ্লেস।',
    phone: '01812345678',
    address: 'দোকান ৪৫, লেভেল ৩, ইসিএস কম্পিউটার সিটি, মাল্টিপ্ল্যান',
    location: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
    joinedDate: 'জানুয়ারি ২০২৪',
    followersCount: 1250,
    followingCount: 89,
    isVerified: true,
    rating: 5.0,
    totalSales: 142,
    totalOrders: 12,
    blockedUserIds: [],
  },
  {
    id: 'user_nadia',
    name: 'নাদিয়া সুলতানা',
    username: '@nadia_crafts',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
    bio: 'হ্যান্ডমেড হোম ডেকর ও অর্গানিক কিচেন আইটেমস 🌿🏡 | সারা বাংলাদেশে হোম ডেলিভারি!',
    phone: '01998877665',
    address: 'ব্লক বি, লালমাটিয়া',
    location: 'মোহাম্মদপুর, ঢাকা',
    joinedDate: 'ফেব্রুয়ারি ২০২৪',
    followersCount: 890,
    followingCount: 310,
    isVerified: true,
    rating: 4.8,
    totalSales: 84,
    totalOrders: 45,
    blockedUserIds: [],
  },
  {
    id: 'user_shuvo',
    name: 'শুভ রহমান',
    username: '@shuvo_fashion',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    bio: 'প্রিমিয়াম ড্রপ শোল্ডার টি-শার্ট ও উইন্টার কালেকশন 👕🔥 | ক্যাশ অন ডেলিভারি সুবিধা।',
    phone: '01677889900',
    address: 'জিইসি মোড়, চট্টগ্রাম',
    location: 'চট্টগ্রাম',
    joinedDate: 'এপ্রিল ২০২৪',
    followersCount: 520,
    followingCount: 140,
    isVerified: false,
    rating: 4.7,
    totalSales: 39,
    totalOrders: 19,
    blockedUserIds: [],
  },
  {
    id: 'user_ayesha',
    name: 'আয়েশা খাতুন',
    username: '@ayesha_kitchen',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    bio: 'হোমমেড অর্গানিক মশলা ও পিউরিফাইড ঘি 🍯👩‍🍳 | পরিবারের সুস্বাস্থ্য আমাদের অঙ্গীকার।',
    phone: '01755667788',
    address: 'মিরপুর ১০, ঢাকা',
    location: 'মিরপুর, ঢাকা',
    joinedDate: 'মে ২০২৪',
    followersCount: 640,
    followingCount: 180,
    isVerified: true,
    rating: 4.9,
    totalSales: 65,
    totalOrders: 28,
    blockedUserIds: [],
  },
  {
    id: 'user_fahim',
    name: 'ফাহিম হাসান',
    username: '@fahim_tech',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    bio: 'টেক রিভিউয়ার ও স্মার্ট গ্যাজেট কালেক্টর 📱🎧 | সাশ্রয়ী কেনাকাটায় সবসময় পাশে।',
    phone: '01899112233',
    address: 'বনানী, ঢাকা',
    location: 'বনানী, ঢাকা',
    joinedDate: 'মার্চ ২০২৪',
    followersCount: 1100,
    followingCount: 220,
    isVerified: true,
    rating: 4.8,
    totalSales: 48,
    totalOrders: 51,
    blockedUserIds: [],
  },
];

// Seed Customer Products for Sale
const INITIAL_PRODUCTS: CustomerProductItem[] = [
  {
    id: 'cprod_1',
    sellerId: 'user_tanvir',
    sellerName: 'তানভীর আহমেদ',
    sellerUsername: '@tanvir_gadgets',
    sellerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    sellerPhone: '01812345678',
    sellerLocation: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
    name: 'Apple AirPods Pro 2nd Gen (Type-C) - একদম ফ্রেশ কন্ডিশন',
    description: 'সম্পূর্ণ নতুনের মতো, মাত্র ২ মাস হালকা ব্যবহার করা হয়েছে। বক্স, অরিজিনাল কেবল ও সব ইয়ারটিপস সাথে আছে। ব্যাটারি ব্যাকআপ অসাধারণ।',
    salePrice: 18500,
    regularPrice: 24500,
    category: 'ইলেকট্রনিক্স ও গ্যাজেট',
    condition: 'like_new',
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=800&q=80',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'cprod_2',
    sellerId: 'user_nadia',
    sellerName: 'নাদিয়া সুলতানা',
    sellerUsername: '@nadia_crafts',
    sellerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    sellerPhone: '01998877665',
    sellerLocation: 'মোহাম্মদপুর, ঢাকা',
    name: 'হাতে তৈরি কাঠের অ্যান্টিক টেবিল ল্যাম্প (Warm Ambient Light)',
    description: '১০০% প্রাকৃতিক মেহগনি কাঠে হাতে তৈরি নান্দনিক ল্যাম্প। স্টাডি টেবিল ও ড্রয়িংরুম সাজানোর জন্য উপযুক্ত। সাথে এডিGridView এনার্জি বাল্ব ফ্রি।',
    salePrice: 1450,
    regularPrice: 2200,
    category: 'ঘর সাজানো ও লাইফস্টাইল',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'cprod_3',
    sellerId: 'user_shuvo',
    sellerName: 'শুভ রহমান',
    sellerUsername: '@shuvo_fashion',
    sellerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    sellerPhone: '01677889900',
    sellerLocation: 'জিইসি মোড়, চট্টগ্রাম',
    name: 'হেভি কটন ড্রপ শোল্ডার ওভারসাইজড হুডি (Dark Charcoal, Size L/XL)',
    description: '৩৫০+ জিএসএম ১০০% অর্গানিক কটন ফ্লিস। শীতের জন্য অত্যন্ত আরামদায়ক ও ট্রেন্ডি লুক। মাত্র ৩ পিস স্টকে আছে।',
    salePrice: 990,
    regularPrice: 1650,
    category: 'ফ্যাশন ও পোশাক',
    condition: 'new',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'cprod_4',
    sellerId: 'user_tanvir',
    sellerName: 'তানভীর আহমেদ',
    sellerUsername: '@tanvir_gadgets',
    sellerAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    sellerPhone: '01812345678',
    sellerLocation: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
    name: 'Sony WH-1000XM4 Wireless Noise Cancelling হেডফোন',
    description: 'সাউন্ড কোয়ালিটি ও এএনসি অতুলনীয়। ফুল বক্স ও চার্জিং কেবল সাথে রয়েছে। যেকোনো টেস্ট করে নেওয়া যাবে।',
    salePrice: 21500,
    regularPrice: 28000,
    category: 'ইলেকট্রনিক্স ও গ্যাজেট',
    condition: 'used_good',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    ],
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    inStock: true,
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
];

// Seed Initial Feed Posts
const INITIAL_POSTS: SocialPost[] = [
  {
    id: 'post_1',
    authorId: 'user_tanvir',
    authorName: 'তানভীর আহমেদ',
    authorUsername: '@tanvir_gadgets',
    authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    authorVerified: true,
    content: 'আসসালামু আলাইকুম সবাইকে! আমার নতুন কেনা AirPods Pro 2nd Gen আপগ্রেডের কারণে সেল করে দিচ্ছি। যারা অথেনটিক অ্যাপল প্রোডাক্ট খুঁজছেন ইনবক্স করতে পারেন অথবা নিচে সরাসরি অর্ডার করতে পারেন। ক্যাশ অন ডেলিভারি সাপোর্ট আছে!',
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=800&q=80',
    ],
    feeling: { emoji: '🎧', label: 'নতুন গ্যাজেট এক্সপ্লোর করছি' },
    linkedProduct: {
      id: 'cprod_1',
      name: 'Apple AirPods Pro 2nd Gen (Type-C) - একদম ফ্রেশ কন্ডিশন',
      salePrice: 18500,
      regularPrice: 24500,
      imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
      category: 'ইলেকট্রনিক্স ও গ্যাজেট',
      condition: 'like_new',
      location: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: {
      like: 42,
      love: 28,
      care: 7,
      haha: 1,
      wow: 15,
      sad: 0,
      angry: 0,
    },
    userReactions: {},
    comments: [
      {
        id: 'comm_1',
        authorId: 'user_current',
        authorName: 'সিফাত রায়হান',
        authorUsername: '@sifat_raihan',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        content: 'ভাইয়া ব্যাটারি ব্যাকআপ একটানা কতক্ষণ পাওয়া যায়? ঢাকা উত্তরায় কি ক্যাশ অন ডেলিভারি হবে?',
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'comm_2',
        authorId: 'user_tanvir',
        authorName: 'তানভীর আহমেদ',
        authorUsername: '@tanvir_gadgets',
        authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
        content: '@sifat_raihan হ্যাঁ ভাইয়া! এএনসি অন রেখে একটানা ৬ ঘণ্টা+ এবং বক্সে ৩০ ঘণ্টা থাকে। উত্তরায় কালকেই ক্যাশ অন ডেলিভারি পাবেন। ইনবক্সে মেসেজ পাঠান প্লিজ।',
        createdAt: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      },
    ],
    sharesCount: 9,
  },
  {
    id: 'post_2',
    authorId: 'user_nadia',
    authorName: 'নাদিয়া সুলতানা',
    authorUsername: '@nadia_crafts',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    authorVerified: true,
    content: 'আজকের তৈরি নতুন হ্যান্ডক্রাফট মেহগনি কাঠের টেবিল ল্যাম্পগুলো কেমন হয়েছে বন্ধুরা? ড্রয়িংরুম বা পড়ার টেবিলে একটি দারুণ উষ্ণ আভা এনে দেবে। সেন্ট্রাল মার্কেটপ্লেসের বন্ধুদের জন্য বিশেষ ২৫% ডিসকাউন্ট চলছে! 🌿💡',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    ],
    feeling: { emoji: '✨', label: 'আনন্দিত ও ক্রিয়েটিভ মুডে আছি' },
    linkedProduct: {
      id: 'cprod_2',
      name: 'হাতে তৈরি কাঠের অ্যান্টিক টেবিল ল্যাম্প (Warm Ambient Light)',
      salePrice: 1450,
      regularPrice: 2200,
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      category: 'ঘর সাজানো ও লাইফস্টাইল',
      condition: 'new',
      location: 'মোহাম্মদপুর, ঢাকা',
    },
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    reactions: {
      like: 65,
      love: 54,
      care: 12,
      haha: 0,
      wow: 22,
      sad: 0,
      angry: 0,
    },
    userReactions: {},
    comments: [
      {
        id: 'comm_3',
        authorId: 'user_shuvo',
        authorName: 'শুভ রহমান',
        authorUsername: '@shuvo_fashion',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        content: 'অসাধারণ ফিনিশিং আপু! চিটাগং ডেলিভারি চার্জ কত হবে?',
        createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
      },
    ],
    sharesCount: 14,
  },
  {
    id: 'post_3',
    authorId: 'user_shuvo',
    authorName: 'শুভ রহমান',
    authorUsername: '@shuvo_fashion',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    authorVerified: false,
    content: 'উইন্টার সিজনের হট ফেভারিট ডার্ক চারকোল হুডিগুলো রিস্টক হয়েছে। প্রিমিয়াম জিএসএম কাপড়, ধোয়ার পর কালার বা সাইজ নষ্ট হবে না ইনশাআল্লাহ। সরাসরি মার্কেটপ্লেস থেকে অর্ডার করতে পারেন।',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    ],
    feeling: { emoji: '🔥', label: 'এক্সাইটেড নতুন স্টক নিয়ে' },
    linkedProduct: {
      id: 'cprod_3',
      name: 'হেভি কটন ড্রপ শোল্ডার ওভারসাইজড হুডি (Dark Charcoal)',
      salePrice: 990,
      regularPrice: 1650,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
      category: 'ফ্যাশন ও পোশাক',
      condition: 'new',
      location: 'চট্টগ্রাম',
    },
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    reactions: {
      like: 31,
      love: 18,
      care: 4,
      haha: 0,
      wow: 6,
      sad: 0,
      angry: 0,
    },
    userReactions: {},
    comments: [],
    sharesCount: 5,
  },
];

// Seed Chat Messages
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    senderId: 'user_tanvir',
    receiverId: 'user_current',
    text: 'আসসালামু আলাইকুম সিফাত ভাই! আপনার এয়ারপডস সংক্রান্ত প্রশ্নের উত্তর দিয়েছিলাম। আপনার লোকেশনে কালই ডেলিভারি দিতে পারি।',
    timestamp: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    productContext: {
      id: 'cprod_1',
      name: 'Apple AirPods Pro 2nd Gen',
      price: 18500,
      imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    },
    read: true,
  },
  {
    id: 'msg_2',
    senderId: 'user_current',
    receiverId: 'user_tanvir',
    text: 'ওয়ালাইকুমুস সালাম তানভীর ভাই। দারুণ, আমি সরাসরি সেন্ট্রাল মার্কেটপ্লেস থেকে অর্ডার কনফার্ম করে দিচ্ছি!',
    timestamp: new Date(Date.now() - 3600000 * 1.0).toISOString(),
    read: true,
  },
];

// Seed Notifications
const INITIAL_NOTIFICATIONS: SocialNotification[] = [
  {
    id: 'notif_freq_1',
    recipientId: 'user_current',
    senderId: 'user_tanvir',
    senderName: 'তানভীর আহমেদ',
    senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    type: 'friend_request',
    text: 'তানভীর আহমেদ আপনাকে একটি ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন।',
    targetId: 'freq_tanvir_current',
    createdAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    read: false,
  },
  {
    id: 'notif_1',
    recipientId: 'user_current',
    senderId: 'user_tanvir',
    senderName: 'তানভীর আহমেদ',
    senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    type: 'comment',
    text: 'তানভীর আহমেদ আপনার কমেন্টের উত্তর দিয়েছেন: "@sifat_raihan হ্যাঁ ভাইয়া! এএনসি অন রেখে..."',
    targetId: 'post_1',
    createdAt: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    read: false,
  },
  {
    id: 'notif_2',
    recipientId: 'user_current',
    senderId: 'user_nadia',
    senderName: 'নাদিয়া সুলতানা',
    senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    type: 'reaction',
    reactionType: 'love',
    text: 'নাদিয়া সুলতানা আপনার পোস্টে লাভ (❤️) রিয়েক্ট করেছেন।',
    targetId: 'post_1',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    read: false,
  },
  {
    id: 'notif_3',
    recipientId: 'user_current',
    senderId: 'user_tanvir',
    senderName: 'তানভীর আহমেদ',
    senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    type: 'message',
    text: 'তানভীর আহমেদ আপনাকে একটি নতুন মেসেজ পাঠিয়েছেন।',
    targetId: 'user_tanvir',
    createdAt: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    read: true,
  },
];

export const marketplaceSocialService = {
  // Profiles Directory
  getProfilesDirectory(): CustomerProfile[] {
    try {
      const stored = localStorage.getItem(PROFILES_DIRECTORY_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(INITIAL_PROFILES));
    return INITIAL_PROFILES;
  },

  getProfileById(id: string): CustomerProfile | null {
    const list = this.getProfilesDirectory();
    return list.find((p) => p.id === id) || null;
  },

  // -------------------------------------------------------------
  // User Authentication & Session Management (Facebook-style)
  // -------------------------------------------------------------
  isLoggedIn(): boolean {
    try {
      const loggedOut = localStorage.getItem('mkt_fb_logged_out_flag');
      if (loggedOut === 'true') return false;
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.phone) return true;
      }
      const verified = localStorage.getItem('twing_verified_customer_profile');
      if (verified) {
        const parsedV = JSON.parse(verified);
        if (parsedV && parsedV.phone) return true;
      }
    } catch (e) {}
    return false;
  },

  async login(
    loginIdentifier: string,
    password: string,
    twoFactorPin?: string
  ): Promise<{ success: boolean; user?: CustomerProfile; error?: string; needs2Fa?: boolean }> {
    try {
      const res = await fetch('/api/marketplace/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier, password, twoFactorPin }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.removeItem('mkt_fb_logged_out_flag');
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data.user));
        localStorage.setItem('mkt_fb_auth_token_v3', data.token || '');
        localStorage.setItem(
          'twing_verified_customer_profile',
          JSON.stringify({
            id: data.user.id,
            name: data.user.name,
            phone: data.user.phone,
            address: data.user.address,
            picture: data.user.avatar,
            isVerified: data.user.isVerified,
          })
        );
        const directory = this.getProfilesDirectory();
        const idx = directory.findIndex((p) => p.id === data.user.id);
        if (idx !== -1) directory[idx] = data.user;
        else directory.unshift(data.user);
        localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(directory));

        window.dispatchEvent(new CustomEvent('twing_profile_updated', { detail: data.user }));
        window.dispatchEvent(
          new CustomEvent('twing_social_auth_changed', { detail: { isLoggedIn: true, user: data.user } })
        );
        return { success: true, user: data.user };
      }
      if (data.needs2Fa) {
        return { success: false, needs2Fa: true, error: data.message };
      }
      return { success: false, error: data.error || 'লগইন ব্যর্থ হয়েছে।' };
    } catch (err: any) {
      return { success: false, error: err.message || 'সার্ভারে সংযোগ করা যায়নি।' };
    }
  },

  async sendRegisterOtp(
    phone: string
  ): Promise<{ success: boolean; message?: string; otp?: string; error?: string }> {
    try {
      const res = await fetch('/api/marketplace/auth/send-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message, otp: data.otp };
      }
      return { success: false, error: data.error || 'ওটিপি পাঠাতে সমস্যা হয়েছে।' };
    } catch (err: any) {
      return { success: false, error: err.message || 'সার্ভারে সংযোগ করা যায়নি।' };
    }
  },

  async register(payload: {
    name: string;
    username?: string;
    phone: string;
    password: string;
    address?: string;
    location?: string;
    role?: string;
    avatar?: string;
    otp?: string;
  }): Promise<{ success: boolean; user?: CustomerProfile; error?: string }> {
    try {
      const res = await fetch('/api/marketplace/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.removeItem('mkt_fb_logged_out_flag');
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data.user));
        localStorage.setItem('mkt_fb_auth_token_v3', data.token || '');
        localStorage.setItem(
          'twing_verified_customer_profile',
          JSON.stringify({
            id: data.user.id,
            name: data.user.name,
            phone: data.user.phone,
            address: data.user.address,
            picture: data.user.avatar,
            isVerified: data.user.isVerified,
          })
        );
        const directory = this.getProfilesDirectory();
        directory.unshift(data.user);
        localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(directory));

        window.dispatchEvent(new CustomEvent('twing_profile_updated', { detail: data.user }));
        window.dispatchEvent(
          new CustomEvent('twing_social_auth_changed', { detail: { isLoggedIn: true, user: data.user } })
        );
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' };
    } catch (err: any) {
      return { success: false, error: err.message || 'সার্ভারে সংযোগ করা যায়নি।' };
    }
  },

  async logout(): Promise<void> {
    const user = this.getCurrentProfile();
    try {
      await fetch('/api/marketplace/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    } catch (e) {}

    localStorage.setItem('mkt_fb_logged_out_flag', 'true');
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem('mkt_fb_auth_token_v3');
    localStorage.removeItem('twing_verified_customer_profile');
    localStorage.removeItem('twing_mkt_cust_name');
    localStorage.removeItem('twing_mkt_cust_phone');

    window.dispatchEvent(new CustomEvent('twing_profile_updated', { detail: null }));
    window.dispatchEvent(new CustomEvent('twing_social_auth_changed', { detail: { isLoggedIn: false } }));
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    const user = this.getCurrentProfile();
    try {
      const res = await fetch('/api/marketplace/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' };
    }
  },

  async submitIdVerification(data: {
    docType: string;
    docNumber?: string;
    fullName: string;
    dob?: string;
    docFront: string;
    docBack?: string;
    selfie: string;
    notes?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> {
    const user = this.getCurrentProfile();
    try {
      const res = await fetch('/api/marketplace/auth/verify-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        this.updateCurrentProfile({
          verificationStatus: 'pending',
          verificationData: {
            docType: data.docType,
            docNumber: data.docNumber,
            fullName: data.fullName,
            dob: data.dob,
            submittedAt: new Date().toISOString(),
            status: 'pending',
          },
        });
      }
      return json;
    } catch (err: any) {
      return { success: false, error: err.message || 'ভেরিফিকেশন জমা দিতে ব্যর্থ হয়েছে।' };
    }
  },

  async syncProfileToServer(updates: Partial<CustomerProfile>): Promise<void> {
    const current = this.getCurrentProfile();
    try {
      await fetch('/api/marketplace/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: current.id, updates }),
      });
    } catch (e) {
      console.warn('Failed to sync profile to server:', e);
    }
  },

  // Current Logged-in Customer Profile
  getCurrentProfile(): CustomerProfile {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.blockedUserIds) parsed.blockedUserIds = [];
        if (!parsed.avatar || parsed.avatar.includes('1535713875002-d1d0cf377fde')) {
          parsed.avatar = INITIAL_PROFILES[0].avatar;
          localStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {}
    // If not set, check twing_verified_customer_profile
    try {
      const verified = localStorage.getItem('twing_verified_customer_profile');
      if (verified) {
        const v = JSON.parse(verified);
        const merged: CustomerProfile = {
          ...INITIAL_PROFILES[0],
          name: v.name || INITIAL_PROFILES[0].name,
          phone: v.phone || INITIAL_PROFILES[0].phone,
          address: v.address || INITIAL_PROFILES[0].address,
          avatar: v.picture || INITIAL_PROFILES[0].avatar,
          blockedUserIds: [],
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {}

    const defaultProfile = INITIAL_PROFILES[0];
    return defaultProfile;
  },

  updateCurrentProfile(updates: Partial<CustomerProfile>): CustomerProfile {
    const current = this.getCurrentProfile();
    const updated: CustomerProfile = {
      ...current,
      ...updates,
      blockedUserIds: updates.blockedUserIds ?? current.blockedUserIds ?? [],
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Quota error setting PROFILE_KEY, pruning cache and retrying:', e);
      pruneStorageOnQuota();
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      } catch (secondErr) {
        console.error('Critical quota error on PROFILE_KEY:', secondErr);
      }
    }

    // 1. Update in profiles directory
    const directory = this.getProfilesDirectory();
    const idx = directory.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      directory[idx] = updated;
    } else {
      directory.unshift(updated);
    }
    try {
      localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(directory));
    } catch (e) {
      console.warn('Quota error setting PROFILES_DIRECTORY_KEY:', e);
      pruneStorageOnQuota();
      try {
        localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(directory));
      } catch (err2) {}
    }

    // 2. Cascade avatar & name updates across all POSTS & COMMENTS
    try {
      const postsRaw = localStorage.getItem(POSTS_KEY);
      if (postsRaw) {
        let posts: SocialPost[] = JSON.parse(postsRaw);
        let postsChanged = false;
        posts = posts.map((post) => {
          let postModified = false;
          let newAuthorAvatar = post.authorAvatar;
          let newAuthorName = post.authorName;
          let newAuthorUsername = post.authorUsername;

          if (post.authorId === updated.id) {
            if (updates.avatar && post.authorAvatar !== updates.avatar) {
              newAuthorAvatar = updates.avatar;
              postModified = true;
            }
            if (updates.name && post.authorName !== updates.name) {
              newAuthorName = updates.name;
              postModified = true;
            }
            if (updates.username && post.authorUsername !== updates.username) {
              newAuthorUsername = updates.username;
              postModified = true;
            }
          }

          const updatedComments = (post.comments || []).map((comm) => {
            if (comm.authorId === updated.id) {
              let commModified = false;
              let commAvatar = comm.authorAvatar;
              let commName = comm.authorName;
              if (updates.avatar && comm.authorAvatar !== updates.avatar) {
                commAvatar = updates.avatar;
                commModified = true;
              }
              if (updates.name && comm.authorName !== updates.name) {
                commName = updates.name;
                commModified = true;
              }
              if (commModified) {
                postModified = true;
                return { ...comm, authorAvatar: commAvatar, authorName: commName };
              }
            }
            return comm;
          });

          if (postModified) {
            postsChanged = true;
            return {
              ...post,
              authorAvatar: newAuthorAvatar,
              authorName: newAuthorName,
              authorUsername: newAuthorUsername,
              comments: updatedComments,
            };
          }
          return post;
        });

        if (postsChanged) {
          localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
        }
      }
    } catch (e) {
      console.warn('Failed to cascade profile update to posts:', e);
    }

    // 3. Cascade avatar & name to CUSTOMER PRODUCTS
    try {
      const prodsRaw = localStorage.getItem(PRODUCTS_KEY);
      if (prodsRaw) {
        let prods: CustomerProductItem[] = JSON.parse(prodsRaw);
        let prodsChanged = false;
        prods = prods.map((p) => {
          if (p.sellerId === updated.id) {
            let pMod = false;
            let sAvatar = p.sellerAvatar;
            let sName = p.sellerName;
            if (updates.avatar && p.sellerAvatar !== updates.avatar) {
              sAvatar = updates.avatar;
              pMod = true;
            }
            if (updates.name && p.sellerName !== updates.name) {
              sName = updates.name;
              pMod = true;
            }
            if (pMod) {
              prodsChanged = true;
              return { ...p, sellerAvatar: sAvatar, sellerName: sName };
            }
          }
          return p;
        });
        if (prodsChanged) {
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
        }
      }
    } catch (e) {
      console.warn('Failed to cascade profile update to products:', e);
    }

    // 4. Cascade avatar & name to CHAT MESSAGES
    try {
      const msgRaw = localStorage.getItem(MESSAGES_KEY);
      if (msgRaw) {
        let msgs: ChatMessage[] = JSON.parse(msgRaw);
        let msgsChanged = false;
        msgs = msgs.map((m) => {
          if (m.senderId === updated.id && updates.avatar && (m as any).senderAvatar !== updates.avatar) {
            msgsChanged = true;
            return { ...m, senderAvatar: updates.avatar };
          }
          return m;
        });
        if (msgsChanged) {
          localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
        }
      }
    } catch (e) {
      console.warn('Failed to cascade profile update to messages:', e);
    }

    // 5. Cascade avatar & name to NOTIFICATIONS
    try {
      const notifsRaw = localStorage.getItem(NOTIFICATIONS_KEY);
      if (notifsRaw) {
        let notifs: SocialNotification[] = JSON.parse(notifsRaw);
        let notifsChanged = false;
        notifs = notifs.map((n) => {
          if (n.senderId === updated.id) {
            let nMod = false;
            let sAvatar = n.senderAvatar;
            let sName = n.senderName;
            if (updates.avatar && n.senderAvatar !== updates.avatar) {
              sAvatar = updates.avatar;
              nMod = true;
            }
            if (updates.name && n.senderName !== updates.name) {
              sName = updates.name;
              nMod = true;
            }
            if (nMod) {
              notifsChanged = true;
              return { ...n, senderAvatar: sAvatar, senderName: sName };
            }
          }
          return n;
        });
        if (notifsChanged) {
          localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
        }
      }
    } catch (e) {
      console.warn('Failed to cascade profile update to notifications:', e);
    }

    // 6. Cascade avatar & name to FRIEND REQUESTS
    try {
      const reqRaw = localStorage.getItem(FRIEND_REQUESTS_KEY);
      if (reqRaw) {
        let reqs: FriendRequest[] = JSON.parse(reqRaw);
        let reqsChanged = false;
        reqs = reqs.map((r) => {
          if (r.senderId === updated.id) {
            let rMod = false;
            let sAvatar = r.senderAvatar;
            let sName = r.senderName;
            if (updates.avatar && r.senderAvatar !== updates.avatar) {
              sAvatar = updates.avatar;
              rMod = true;
            }
            if (updates.name && r.senderName !== updates.name) {
              sName = updates.name;
              rMod = true;
            }
            if (rMod) {
              reqsChanged = true;
              return { ...r, senderAvatar: sAvatar, senderName: sName };
            }
          }
          return r;
        });
        if (reqsChanged) {
          localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(reqs));
        }
      }
    } catch (e) {
      console.warn('Failed to cascade profile update to friend requests:', e);
    }

    // 7. Sync to Verified Customer Profile & legacy keys if present
    try {
      const vRaw = localStorage.getItem('twing_verified_customer_profile');
      if (vRaw) {
        const v = JSON.parse(vRaw);
        v.picture = updated.avatar || v.picture;
        v.name = updated.name || v.name;
        if (updated.phone) v.phone = updated.phone;
        if (updated.address) v.address = updated.address;
        localStorage.setItem('twing_verified_customer_profile', JSON.stringify(v));
      }
      if (updated.avatar) {
        localStorage.setItem('twing_mkt_cust_picture', updated.avatar);
      }
      if (updated.name) {
        localStorage.setItem('twing_mkt_cust_name', updated.name);
      }
    } catch (e) {}

    // 8. Dispatch global event so all mounted components update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_profile_updated', { detail: updated }));
    }

    // 9. Asynchronously persist to backend PostgreSQL / persistent DB
    try {
      fetch('/api/marketplace/social/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: updated.id, ...updated }),
      }).catch(() => {});
    } catch (e) {}

    return updated;
  },

  // Block / Unblock Customer
  blockUser(targetUserId: string): CustomerProfile {
    const profile = this.getCurrentProfile();
    const currentBlocked = profile.blockedUserIds || [];
    if (!currentBlocked.includes(targetUserId)) {
      currentBlocked.push(targetUserId);
    }
    return this.updateCurrentProfile({ blockedUserIds: currentBlocked });
  },

  unblockUser(targetUserId: string): CustomerProfile {
    const profile = this.getCurrentProfile();
    const currentBlocked = (profile.blockedUserIds || []).filter((id) => id !== targetUserId);
    return this.updateCurrentProfile({ blockedUserIds: currentBlocked });
  },

  isUserBlocked(targetUserId: string): boolean {
    const profile = this.getCurrentProfile();
    return (profile.blockedUserIds || []).includes(targetUserId);
  },

  // Feed Posts
  getPosts(): SocialPost[] {
    const currentProfile = this.getCurrentProfile();
    const blockedIds = new Set(currentProfile.blockedUserIds || []);
    const directory = this.getProfilesDirectory();
    const profileMap = new Map<string, CustomerProfile>(directory.map((p) => [p.id, p]));

    let posts: SocialPost[] = [];
    try {
      const stored = localStorage.getItem(POSTS_KEY);
      if (stored) {
        posts = JSON.parse(stored);
      } else {
        posts = INITIAL_POSTS;
        localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      }
    } catch (e) {
      posts = INITIAL_POSTS;
    }

    // Filter out posts from blocked users & dynamically sync latest author/commenter avatars
    return posts
      .filter((p) => !blockedIds.has(p.authorId))
      .map((p) => {
        const author = profileMap.get(p.authorId);
        const resolvedAuthorAvatar = author?.avatar || p.authorAvatar;
        const resolvedAuthorName = author?.name || p.authorName;
        const resolvedAuthorUsername = author?.username || p.authorUsername;

        const updatedComments = (p.comments || []).map((c) => {
          const cAuthor = profileMap.get(c.authorId);
          return {
            ...c,
            authorAvatar: cAuthor?.avatar || c.authorAvatar,
            authorName: cAuthor?.name || c.authorName,
          };
        });

        return {
          ...p,
          authorAvatar: resolvedAuthorAvatar,
          authorName: resolvedAuthorName,
          authorUsername: resolvedAuthorUsername,
          comments: updatedComments,
        };
      });
  },

  createPost(payload: {
    content: string;
    images?: string[];
    feeling?: { emoji: string; label: string };
    linkedProduct?: any;
  }): SocialPost {
    const profile = this.getCurrentProfile();
    const posts = this.getPosts();

    const newPost: SocialPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorId: profile.id,
      authorName: profile.name,
      authorUsername: profile.username,
      authorAvatar: profile.avatar,
      authorVerified: profile.isVerified,
      content: payload.content,
      images: payload.images || [],
      feeling: payload.feeling,
      linkedProduct: payload.linkedProduct,
      createdAt: new Date().toISOString(),
      reactions: {
        like: 0,
        love: 0,
        care: 0,
        haha: 0,
        wow: 0,
        sad: 0,
        angry: 0,
      },
      userReactions: {},
      comments: [],
      sharesCount: 0,
    };

    const updatedPosts = [newPost, ...posts];
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(updatedPosts));
    } catch (quotaErr) {
      console.warn('Quota exceeded on posts, trimming older items:', quotaErr);
      const pruned = updatedPosts.slice(0, 30).map((p, idx) => {
        if (idx > 5 && p.images && p.images.length > 1) {
          return { ...p, images: [p.images[0]] };
        }
        return p;
      });
      try {
        localStorage.setItem(POSTS_KEY, JSON.stringify(pruned));
      } catch (secondErr) {
        localStorage.setItem(POSTS_KEY, JSON.stringify(updatedPosts.slice(0, 15)));
      }
    }

    // Persist post to persistent database on server
    try {
      fetch('/api/marketplace/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      }).catch((e) => console.debug('Sync post note:', e));
    } catch (e) {}

    return newPost;
  },

  reactToPost(postId: string, reactionType: SocialReactionType): { post: SocialPost; previousReaction?: SocialReactionType } {
    const profile = this.getCurrentProfile();
    const posts = this.getPosts();
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) throw new Error('পোস্ট পাওয়া যায়নি');

    const post = posts[postIdx];
    const userPrevReaction = post.userReactions?.[profile.id];

    // Copy reactions
    const reactions = { ...post.reactions };
    const userReactions = { ...(post.userReactions || {}) };

    if (userPrevReaction === reactionType) {
      // Toggle off
      reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
      delete userReactions[profile.id];
    } else {
      if (userPrevReaction) {
        reactions[userPrevReaction] = Math.max(0, (reactions[userPrevReaction] || 0) - 1);
      }
      reactions[reactionType] = (reactions[reactionType] || 0) + 1;
      userReactions[profile.id] = reactionType;

      // Trigger notification for post author if not self
      if (post.authorId !== profile.id) {
        const reactionLabels: Record<SocialReactionType, string> = {
          like: 'লাইক (👍)',
          love: 'লাভ (❤️)',
          care: 'কেয়ার (🥰)',
          haha: 'হাহা (😆)',
          wow: 'ওয়াও (😮)',
          sad: 'স্যাড (😢)',
          angry: 'অ্যাংরি (😡)',
        };
        this.addNotification({
          recipientId: post.authorId,
          senderId: profile.id,
          senderName: profile.name,
          senderAvatar: profile.avatar,
          type: 'reaction',
          reactionType,
          text: `${profile.name} আপনার পোস্টে ${reactionLabels[reactionType]} রিয়েক্ট করেছেন।`,
          targetId: post.id,
        });
      }
    }

    const updatedPost: SocialPost = {
      ...post,
      reactions,
      userReactions,
    };

    posts[postIdx] = updatedPost;
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));

    // Persist reaction to backend DB
    try {
      fetch(`/api/marketplace/social/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, reactionType, userProfile: profile }),
      }).catch((e) => console.debug('Sync reaction note:', e));
    } catch (e) {}

    return { post: updatedPost, previousReaction: userPrevReaction };
  },

  addComment(postId: string, content: string): { post: SocialPost; newComment: SocialComment } {
    if (!content.trim()) throw new Error('মন্তব্য খালি রাখা যাবে না');
    const profile = this.getCurrentProfile();
    const posts = this.getPosts();
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) throw new Error('পোস্ট পাওয়া যায়নি');

    const post = posts[postIdx];
    const newComment: SocialComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorId: profile.id,
      authorName: profile.name,
      authorUsername: profile.username,
      authorAvatar: profile.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedPost: SocialPost = {
      ...post,
      comments: [...(post.comments || []), newComment],
    };

    posts[postIdx] = updatedPost;
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));

    // Send notification to post author if not self
    if (post.authorId !== profile.id) {
      this.addNotification({
        recipientId: post.authorId,
        senderId: profile.id,
        senderName: profile.name,
        senderAvatar: profile.avatar,
        type: 'comment',
        text: `${profile.name} আপনার পোস্টে মন্তব্য করেছেন: "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
        targetId: post.id,
      });
    }

    // Persist comment to backend DB
    try {
      fetch(`/api/marketplace/social/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      }).catch((e) => console.debug('Sync comment note:', e));
    } catch (e) {}

    return { post: updatedPost, newComment };
  },

  sharePost(postId: string): SocialPost {
    const posts = this.getPosts();
    const postIdx = posts.findIndex((p) => p.id === postId);
    if (postIdx === -1) throw new Error('পোস্ট পাওয়া যায়নি');

    const post = posts[postIdx];
    const updatedPost: SocialPost = {
      ...post,
      sharesCount: (post.sharesCount || 0) + 1,
    };
    posts[postIdx] = updatedPost;
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    return updatedPost;
  },

  // Share a post directly to current user's profile feed with optional thought/caption
  sharePostToProfile(postId: string, caption?: string): SocialPost {
    const post = this.sharePost(postId);
    const profile = this.getCurrentProfile();

    const sharedPost: SocialPost = {
      id: `post_shared_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorId: profile.id,
      authorName: profile.name,
      authorUsername: profile.username,
      authorAvatar: profile.avatar,
      authorVerified: profile.isVerified,
      content: caption && caption.trim() ? caption.trim() : `🔁 ${post.authorName}-এর একটি পোস্ট শেয়ার করেছেন`,
      images: [],
      sharedPost: post,
      linkedProduct: post.linkedProduct,
      isShared: true,
      sharedCaption: caption?.trim(),
      originalAuthorName: post.authorName,
      createdAt: new Date().toISOString(),
      reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      userReactions: {},
      comments: [],
      sharesCount: 0,
    };

    const currentPosts = this.getPosts();
    const updated = [sharedPost, ...currentPosts];
    localStorage.setItem(POSTS_KEY, JSON.stringify(updated));

    if (post.authorId !== profile.id) {
      this.addNotification({
        recipientId: post.authorId,
        senderId: profile.id,
        senderName: profile.name,
        senderAvatar: profile.avatar,
        type: 'share',
        text: `${profile.name} আপনার পোস্টটি নিজের ফিডে শেয়ার করেছেন!`,
        targetId: post.id,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_social_posts_updated'));
    }

    return sharedPost;
  },

  // Share a product to current user's profile feed with optional thought/caption
  shareProductToProfile(product: any, caption?: string): SocialPost {
    const profile = this.getCurrentProfile();

    const sharedPost: SocialPost = {
      id: `post_shared_prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorId: profile.id,
      authorName: profile.name,
      authorUsername: profile.username,
      authorAvatar: profile.avatar,
      authorVerified: profile.isVerified,
      content: caption && caption.trim()
        ? caption.trim()
        : `🛍️ সেন্ট্রাল মার্কেটপ্লেস থেকে এই অসাধারণ পণ্যটি শেয়ার করছি: "${product.name}"`,
      images: product.images && product.images.length > 0 ? [product.images[0]] : (product.imageUrl ? [product.imageUrl] : []),
      linkedProduct: {
        id: product.id,
        name: product.name,
        salePrice: Number(product.salePrice),
        regularPrice: product.regularPrice ? Number(product.regularPrice) : undefined,
        imageUrl: product.imageUrl || (product.images && product.images[0]) || '',
        category: product.category,
        condition: product.condition,
        location: product.sellerLocation || 'বাংলাদেশ',
      },
      isShared: true,
      sharedCaption: caption?.trim(),
      originalAuthorName: product.sellerName,
      createdAt: new Date().toISOString(),
      reactions: { like: 0, love: 0, care: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      userReactions: {},
      comments: [],
      sharesCount: 0,
    };

    const currentPosts = this.getPosts();
    const updated = [sharedPost, ...currentPosts];
    localStorage.setItem(POSTS_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_social_posts_updated'));
    }

    return sharedPost;
  },

  deletePost(postId: string): void {
    const profile = this.getCurrentProfile();
    const posts = this.getPosts();
    const filtered = posts.filter((p) => !(p.id === postId && p.authorId === profile.id));
    localStorage.setItem(POSTS_KEY, JSON.stringify(filtered));
  },

  // Customer Products
  getCustomerProducts(): CustomerProductItem[] {
    const profile = this.getCurrentProfile();
    const blockedIds = new Set(profile.blockedUserIds || []);
    const directory = this.getProfilesDirectory();
    const profileMap = new Map<string, CustomerProfile>(directory.map((p) => [p.id, p]));

    let items: CustomerProductItem[] = [];
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        items = JSON.parse(stored);
      } else {
        items = INITIAL_PRODUCTS;
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items));
      }
    } catch (e) {
      items = INITIAL_PRODUCTS;
    }

    const now = Date.now();
    let hasModifiedExpiry = false;

    // Check expiration of boosted products
    items = items.map((item) => {
      if (item.isPromoted && item.promotedUntil) {
        const expiry = new Date(item.promotedUntil).getTime();
        if (expiry < now) {
          hasModifiedExpiry = true;
          return {
            ...item,
            isPromoted: false,
            promotedBadge: undefined,
          };
        }
      }
      return item;
    });

    if (hasModifiedExpiry) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items));
    }

    return items
      .filter((item) => {
        if (blockedIds.has(item.sellerId)) return false;
        const seller = profileMap.get(item.sellerId);
        // Hide products of users blocked by Super Admin
        if (seller && seller.isBlocked) return false;
        return true;
      })
      .map((item) => {
        const seller = profileMap.get(item.sellerId);
        return {
          ...item,
          sellerAvatar: seller?.avatar || item.sellerAvatar,
          sellerName: seller?.name || item.sellerName,
        };
      })
      .sort((a, b) => {
        // Promoted products rank at the top
        if (a.isPromoted && !b.isPromoted) return -1;
        if (!a.isPromoted && b.isPromoted) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  },

  uploadCustomerProduct(payload: {
    name: string;
    description: string;
    salePrice: number;
    regularPrice?: number;
    category: string;
    condition: 'new' | 'like_new' | 'used_good' | 'used_fair';
    images: string[];
  }): CustomerProductItem {
    const profile = this.getCurrentProfile();
    const products = this.getCustomerProducts();

    const newProduct: CustomerProductItem = {
      id: `cprod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sellerId: profile.id,
      sellerName: profile.name,
      sellerUsername: profile.username,
      sellerAvatar: profile.avatar,
      sellerPhone: profile.phone,
      sellerLocation: profile.location || 'বাংলাদেশ',
      name: payload.name.trim(),
      description: payload.description.trim(),
      salePrice: Number(payload.salePrice),
      regularPrice: payload.regularPrice ? Number(payload.regularPrice) : undefined,
      category: payload.category,
      condition: payload.condition,
      images: payload.images,
      imageUrl: payload.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      inStock: true,
      sellerPaymentSettings: profile.sellerPaymentSettings || null,
      createdAt: new Date().toISOString(),
    };

    const updated = [newProduct, ...products];
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
    } catch (quotaErr) {
      console.warn('LocalStorage quota exceeded on products, trimming older items:', quotaErr);
      // Prune products or downsize image payloads to fit within quota
      const lightweightList = updated.slice(0, 30).map((p, idx) => {
        if (idx > 5 && p.images && p.images.length > 1) {
          return { ...p, images: [p.images[0]] };
        }
        return p;
      });
      try {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(lightweightList));
      } catch (secondErr) {
        // Fallback: keep top 15
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated.slice(0, 15)));
      }
    }

    // Persist user product to backend database
    try {
      fetch('/api/marketplace/social/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      }).catch((e) => console.debug('Sync product note:', e));
    } catch (e) {}

    // Also automatically publish an announcement post on Facebook Feed!
    try {
      this.createPost({
        content: `🛍️ সেন্ট্রাল মার্কেটপ্লেসে নতুন পণ্য আপলোড করেছি: "${newProduct.name}"। আগ্রহী ক্রেতারা সরাসরি মার্কেটপ্লেস থেকে অর্ডার করতে পারেন অথবা ইনবক্সে চ্যাট করতে পারেন! 📦✨`,
        images: newProduct.images?.slice(0, 1) || [],
        feeling: { emoji: '🏷️', label: 'নতুন পণ্য বিক্রি করছি' },
        linkedProduct: {
          id: newProduct.id,
          name: newProduct.name,
          salePrice: newProduct.salePrice,
          regularPrice: newProduct.regularPrice,
          imageUrl: newProduct.imageUrl,
          category: newProduct.category,
          condition: newProduct.condition,
          location: newProduct.sellerLocation,
        },
      });
    } catch (postErr) {
      console.warn('Auto post announcement note:', postErr);
    }

    // Update profile totalSales stats
    this.updateCurrentProfile({
      totalSales: (profile.totalSales || 0) + 1,
    });

    // Dispatch global events so products and feed components update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_products_updated', { detail: newProduct }));
      window.dispatchEvent(new CustomEvent('twing_posts_updated'));
    }

    return newProduct;
  },

  // Customer to Customer Purchase Order
  purchaseCustomerProduct(payload: {
    productId: string;
    buyerName: string;
    buyerPhone: string;
    buyerAddress: string;
    paymentMethod: string;
  }): { success: boolean; orderId: string; message: string } {
    const products = this.getCustomerProducts();
    const product = products.find((p) => p.id === payload.productId);
    if (!product) throw new Error('পণ্য পাওয়া যায়নি');

    const currentProfile = this.getCurrentProfile();
    const orderId = `ORD-FB-${Date.now().toString().slice(-6)}`;

    // Notify seller
    this.addNotification({
      recipientId: product.sellerId,
      senderId: currentProfile.id,
      senderName: payload.buyerName,
      senderAvatar: currentProfile.avatar,
      type: 'order',
      text: `🎉 আপনার "${product.name}" পণ্যটি ${payload.buyerName} (ফোন: ${payload.buyerPhone}) অর্ডার করেছেন! পেমেন্ট মেথড: ${payload.paymentMethod}। ডেলিভারি ঠিকানা: ${payload.buyerAddress}`,
      targetId: orderId,
    });

    // Update buyer's total orders count
    this.updateCurrentProfile({
      totalOrders: (currentProfile.totalOrders || 0) + 1,
    });

    return {
      success: true,
      orderId,
      message: `আপনার অর্ডার সফল হয়েছে! অর্ডার নম্বর: #${orderId}`,
    };
  },

  // Chat / Messages
  getAllMessages(): ChatMessage[] {
    try {
      const stored = localStorage.getItem(MESSAGES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
    return INITIAL_MESSAGES;
  },

  getMessagesWith(targetUserId: string): ChatMessage[] {
    const profile = this.getCurrentProfile();
    const all = this.getAllMessages();
    return all.filter(
      (m) =>
        (m.senderId === profile.id && m.receiverId === targetUserId) ||
        (m.senderId === targetUserId && m.receiverId === profile.id)
    );
  },

  sendMessage(payload: {
    receiverId: string;
    text: string;
    productContext?: { id: string; name: string; price: number; imageUrl?: string };
  }): ChatMessage {
    const profile = this.getCurrentProfile();
    if (this.isUserBlocked(payload.receiverId)) {
      throw new Error('এই ব্যবহারকারীকে আপনি ব্লক করেছেন। মেসেজ পাঠানোর জন্য প্রথমে আনব্লক করুন।');
    }

    const all = this.getAllMessages();
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: profile.id,
      receiverId: payload.receiverId,
      text: payload.text.trim(),
      timestamp: new Date().toISOString(),
      productContext: payload.productContext,
      read: false,
    };

    all.push(newMsg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));

    // Send notification to recipient
    this.addNotification({
      recipientId: payload.receiverId,
      senderId: profile.id,
      senderName: profile.name,
      senderAvatar: profile.avatar,
      type: 'message',
      text: `${profile.name} আপনাকে মেসেজ পাঠিয়েছেন: "${payload.text.slice(0, 35)}${payload.text.length > 35 ? '...' : ''}"`,
      targetId: profile.id,
    });

    // Persist chat message to backend DB
    try {
      fetch('/api/marketplace/social/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: profile.id,
          senderName: profile.name,
          senderAvatar: profile.avatar,
          receiverId: payload.receiverId,
          text: payload.text,
          productContext: payload.productContext,
        }),
      }).catch((e) => console.debug('Sync message note:', e));
    } catch (e) {}

    return newMsg;
  },

  getConversations(): ChatConversation[] {
    const profile = this.getCurrentProfile();
    const blockedIds = new Set(profile.blockedUserIds || []);
    const messages = this.getAllMessages();
    const directory = this.getProfilesDirectory();

    const conversationMap: Record<string, ChatConversation> = {};

    messages.forEach((msg) => {
      const otherId = msg.senderId === profile.id ? msg.receiverId : msg.senderId;
      if (blockedIds.has(otherId)) return;

      const otherProfile = directory.find((p) => p.id === otherId) || {
        id: otherId,
        name: otherId === 'user_tanvir' ? 'তানভীর আহমেদ' : otherId === 'user_nadia' ? 'নাদিয়া সুলতানা' : 'সেন্ট্রাল কাস্টমার',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        username: `@user_${otherId.slice(0, 6)}`,
      };

      const isUnread = !msg.read && msg.receiverId === profile.id;

      if (!conversationMap[otherId]) {
        conversationMap[otherId] = {
          id: otherId,
          participantId: otherId,
          participantName: otherProfile.name,
          participantAvatar: otherProfile.avatar,
          participantUsername: otherProfile.username,
          participantPhone: (otherProfile as any).phone,
          lastMessage: msg.text,
          lastMessageTime: msg.timestamp,
          unreadCount: isUnread ? 1 : 0,
        };
      } else {
        if (new Date(msg.timestamp) > new Date(conversationMap[otherId].lastMessageTime)) {
          conversationMap[otherId].lastMessage = msg.text;
          conversationMap[otherId].lastMessageTime = msg.timestamp;
        }
        if (isUnread) {
          conversationMap[otherId].unreadCount += 1;
        }
      }
    });

    return Object.values(conversationMap).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  },

  markConversationAsRead(targetUserId: string): void {
    const profile = this.getCurrentProfile();
    const messages = this.getAllMessages();
    let hasChanges = false;
    messages.forEach((m) => {
      if (m.senderId === targetUserId && m.receiverId === profile.id && !m.read) {
        m.read = true;
        hasChanges = true;
      }
    });
    if (hasChanges) {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    }
  },

  // Notifications
  getNotifications(): SocialNotification[] {
    const profile = this.getCurrentProfile();
    const directory = this.getProfilesDirectory();
    const profileMap = new Map<string, CustomerProfile>(directory.map((p) => [p.id, p]));

    let list: SocialNotification[] = [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        list = JSON.parse(stored);
      } else {
        list = INITIAL_NOTIFICATIONS;
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      }
    } catch (e) {
      list = INITIAL_NOTIFICATIONS;
    }
    return list
      .filter((n) => n.recipientId === profile.id)
      .map((n) => {
        const sender = profileMap.get(n.senderId);
        return {
          ...n,
          senderAvatar: sender?.avatar || n.senderAvatar,
          senderName: sender?.name || n.senderName,
        };
      });
  },

  addNotification(payload: Omit<SocialNotification, 'id' | 'createdAt' | 'read'>): SocialNotification {
    let all: SocialNotification[] = [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) all = JSON.parse(stored);
    } catch (e) {}

    const newNotif: SocialNotification = {
      ...payload,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    all.unshift(newNotif);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    return newNotif;
  },

  markNotificationAsRead(id: string): void {
    let all: SocialNotification[] = [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) all = JSON.parse(stored);
      all = all.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    } catch (e) {}
  },

  markAllNotificationsAsRead(): void {
    const profile = this.getCurrentProfile();
    let all: SocialNotification[] = [];
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) all = JSON.parse(stored);
      all = all.map((n) => (n.recipientId === profile.id ? { ...n, read: true } : n));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    } catch (e) {}
  },

  // Friend Management & Search
  getAllFriendRequests(): FriendRequest[] {
    try {
      const stored = localStorage.getItem(FRIEND_REQUESTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    const initialRequests: FriendRequest[] = [
      {
        id: 'freq_tanvir_current',
        senderId: 'user_tanvir',
        senderName: 'তানভীর আহমেদ',
        senderUsername: '@tanvir_gadgets',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
        senderLocation: 'নিউ এলিফ্যান্ট রোড, ঢাকা',
        receiverId: 'user_current',
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
      },
    ];
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(initialRequests));
    return initialRequests;
  },

  getPendingReceivedRequests(userId?: string): FriendRequest[] {
    const targetId = userId || this.getCurrentProfile().id;
    return this.getAllFriendRequests().filter(
      (r) => r.receiverId === targetId && r.status === 'pending'
    );
  },

  getPendingSentRequests(userId?: string): FriendRequest[] {
    const targetId = userId || this.getCurrentProfile().id;
    return this.getAllFriendRequests().filter(
      (r) => r.senderId === targetId && r.status === 'pending'
    );
  },

  getFriendIds(userId?: string): string[] {
    const profile = userId ? this.getProfileById(userId) : this.getCurrentProfile();
    try {
      const key = `${USER_FRIENDS_KEY}_${profile?.id || 'user_current'}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {}
    const defaultFriends = ['user_nadia', 'user_tanvir'];
    return defaultFriends;
  },

  getFriends(userId?: string): CustomerProfile[] {
    const friendIds = this.getFriendIds(userId);
    const directory = this.getProfilesDirectory();
    return directory.filter((p) => friendIds.includes(p.id));
  },

  getRelationshipStatus(targetUserId: string): 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none' {
    const profile = this.getCurrentProfile();
    if (profile.id === targetUserId) return 'self';
    const friends = this.getFriendIds();
    if (friends.includes(targetUserId)) return 'friends';
    const sent = this.getPendingSentRequests();
    if (sent.some((r) => r.receiverId === targetUserId)) return 'pending_sent';
    const received = this.getPendingReceivedRequests();
    if (received.some((r) => r.senderId === targetUserId)) return 'pending_received';
    return 'none';
  },

  sendFriendRequest(targetUserId: string): { success: boolean; message: string; request?: FriendRequest } {
    const profile = this.getCurrentProfile();
    if (profile.id === targetUserId) {
      return { success: false, message: 'নিজের আইডিতে ফ্রেন্ড রিকোয়েস্ট পাঠানো সম্ভব নয়।' };
    }
    if (this.isUserBlocked(targetUserId)) {
      return { success: false, message: 'এই ব্যবহারকারীকে আপনি ব্লক করেছেন।' };
    }
    const targetProfile = this.getProfileById(targetUserId);
    if (!targetProfile) {
      return { success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' };
    }
    const currentStatus = this.getRelationshipStatus(targetUserId);
    if (currentStatus === 'friends') {
      return { success: false, message: 'আপনারা ইতোমধ্যে বন্ধু!' };
    }
    if (currentStatus === 'pending_sent') {
      return { success: false, message: 'ইতোমধ্যে ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে।' };
    }

    const all = this.getAllFriendRequests();
    const newReq: FriendRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: profile.id,
      senderName: profile.name,
      senderUsername: profile.username,
      senderAvatar: profile.avatar,
      senderLocation: profile.location,
      receiverId: targetUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    all.push(newReq);
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(all));

    // Send notification to recipient
    this.addNotification({
      recipientId: targetUserId,
      senderId: profile.id,
      senderName: profile.name,
      senderAvatar: profile.avatar,
      type: 'friend_request',
      text: `${profile.name} আপনাকে একটি ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন।`,
      targetId: newReq.id,
    });

    // Persist to backend DB
    try {
      fetch('/api/marketplace/social/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderProfile: profile, receiverId: targetUserId }),
      }).catch((e) => console.debug('Sync friend request note:', e));
    } catch (e) {}

    return {
      success: true,
      message: `${targetProfile.name}-কে সফলভাবে ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!`,
      request: newReq,
    };
  },

  acceptFriendRequest(requestIdOrSenderId: string): { success: boolean; message: string } {
    const profile = this.getCurrentProfile();
    const all = this.getAllFriendRequests();
    const req = all.find(
      (r) =>
        (r.id === requestIdOrSenderId || r.senderId === requestIdOrSenderId) &&
        r.receiverId === profile.id &&
        r.status === 'pending'
    );

    if (!req) {
      return { success: false, message: 'ফ্রেন্ড রিকোয়েস্ট পাওয়া যায়নি।' };
    }

    req.status = 'accepted';
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(all));

    // Add to current user's friends list
    const myFriendsKey = `${USER_FRIENDS_KEY}_${profile.id}`;
    const myFriends = this.getFriendIds(profile.id);
    if (!myFriends.includes(req.senderId)) {
      myFriends.push(req.senderId);
      localStorage.setItem(myFriendsKey, JSON.stringify(myFriends));
    }

    // Add to sender's friends list
    const senderFriendsKey = `${USER_FRIENDS_KEY}_${req.senderId}`;
    try {
      const senderStored = localStorage.getItem(senderFriendsKey);
      const senderFriends = senderStored ? JSON.parse(senderStored) : [];
      if (!senderFriends.includes(profile.id)) {
        senderFriends.push(profile.id);
        localStorage.setItem(senderFriendsKey, JSON.stringify(senderFriends));
      }
    } catch (e) {}

    // Send notification to sender
    this.addNotification({
      recipientId: req.senderId,
      senderId: profile.id,
      senderName: profile.name,
      senderAvatar: profile.avatar,
      type: 'friend_accept',
      text: `${profile.name} আপনার ফ্রেন্ড রিকোয়েস্ট গ্রহণ করেছেন। আপনারা এখন বন্ধু!`,
      targetId: profile.id,
    });

    // Persist to backend DB
    try {
      fetch('/api/marketplace/social/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'accept', responderProfile: profile }),
      }).catch((e) => console.debug('Sync friend accept note:', e));
    } catch (e) {}

    return {
      success: true,
      message: `${req.senderName}-এর ফ্রেন্ড রিকোয়েস্ট গ্রহণ করা হয়েছে! আপনারা এখন বন্ধু।`,
    };
  },

  rejectFriendRequest(requestIdOrSenderId: string): { success: boolean; message: string } {
    const profile = this.getCurrentProfile();
    const all = this.getAllFriendRequests();
    const reqIndex = all.findIndex(
      (r) =>
        (r.id === requestIdOrSenderId || r.senderId === requestIdOrSenderId) &&
        r.receiverId === profile.id &&
        r.status === 'pending'
    );

    if (reqIndex === -1) {
      return { success: false, message: 'ফ্রেন্ড রিকোয়েস্ট পাওয়া যায়নি।' };
    }

    all[reqIndex].status = 'rejected';
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(all));

    return { success: true, message: 'ফ্রেন্ড রিকোয়েস্ট বাতিল করা হয়েছে।' };
  },

  cancelSentFriendRequest(targetUserId: string): { success: boolean; message: string } {
    const profile = this.getCurrentProfile();
    let all = this.getAllFriendRequests();
    all = all.filter(
      (r) => !(r.senderId === profile.id && r.receiverId === targetUserId && r.status === 'pending')
    );
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(all));
    return { success: true, message: 'ফ্রেন্ড রিকোয়েস্ট প্রত্যাহার করা হয়েছে।' };
  },

  unfriend(targetUserId: string): void {
    const profile = this.getCurrentProfile();
    const myFriendsKey = `${USER_FRIENDS_KEY}_${profile.id}`;
    const myFriends = this.getFriendIds(profile.id).filter((id) => id !== targetUserId);
    localStorage.setItem(myFriendsKey, JSON.stringify(myFriends));

    const targetKey = `${USER_FRIENDS_KEY}_${targetUserId}`;
    try {
      const stored = localStorage.getItem(targetKey);
      if (stored) {
        const friends = JSON.parse(stored).filter((id: string) => id !== profile.id);
        localStorage.setItem(targetKey, JSON.stringify(friends));
      }
    } catch (e) {}

    // Clean up any accepted or pending requests between them so clean relationship state is restored
    try {
      const allReqs = this.getAllFriendRequests().filter(
        (r) =>
          !(
            (r.senderId === profile.id && r.receiverId === targetUserId) ||
            (r.senderId === targetUserId && r.receiverId === profile.id)
          )
      );
      localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(allReqs));
    } catch (e) {}

    // Dispatch global events so UI updates everywhere
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_profile_updated'));
      window.dispatchEvent(new CustomEvent('twing_friends_updated'));
    }

    // Persist to backend
    try {
      fetch('/api/marketplace/social/friends/unfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, targetUserId }),
      }).catch(() => {});
    } catch (e) {}
  },

  getFriendSuggestions(limit = 10): CustomerProfile[] {
    const profile = this.getCurrentProfile();
    const directory = this.getProfilesDirectory();
    const blocked = new Set(profile.blockedUserIds || []);
    const friends = new Set(this.getFriendIds());
    const receivedReqs = new Set(this.getPendingReceivedRequests().map((r) => r.senderId));

    return directory
      .filter(
        (p) =>
          p.id !== profile.id &&
          !blocked.has(p.id) &&
          !friends.has(p.id) &&
          !receivedReqs.has(p.id)
      )
      .slice(0, limit);
  },

  searchUsers(query: string): CustomerProfile[] {
    if (!query.trim()) return [];
    const term = query.toLowerCase().trim();
    const directory = this.getProfilesDirectory();
    const currentProfile = this.getCurrentProfile();
    const blocked = new Set(currentProfile.blockedUserIds || []);

    return directory.filter((p) => {
      if (blocked.has(p.id)) return false;
      const name = (p.name || '').toLowerCase();
      const username = (p.username || '').toLowerCase();
      const location = (p.location || '').toLowerCase();
      const bio = (p.bio || '').toLowerCase();
      return (
        name.includes(term) ||
        username.includes(term) ||
        location.includes(term) ||
        bio.includes(term)
      );
    });
  },

  /**
   * Synchronizes all posts, products, users, friends, messages, and notifications
   * from the persistent server database into the local client state.
   */
  async syncWithCloud(): Promise<void> {
    try {
      const profile = this.getCurrentProfile();

      // 1. Sync Posts
      const postsRes = await fetch('/api/marketplace/social/posts');
      if (postsRes.ok) {
        const data = await postsRes.json();
        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          localStorage.setItem(POSTS_KEY, JSON.stringify(data.posts));
        }
      }

      // 2. Sync Products
      const prodRes = await fetch('/api/marketplace/social/products');
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data.products));
        }
      }

      // 3. Sync User Profiles Directory
      const usersRes = await fetch('/api/marketplace/social/users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(data.users));
          // If the current profile matches an updated user in the directory, sync its avatar/cover if set
          if (profile?.id) {
            const serverProfile = data.users.find((u: any) => u.id === profile.id);
            if (serverProfile) {
              const localRaw = localStorage.getItem(PROFILE_KEY);
              if (localRaw) {
                const localObj = JSON.parse(localRaw);
                // Only take server values if local doesn't have a fresher custom upload, or merge safely
                const mergedCurrent = {
                  ...serverProfile,
                  avatar: localObj.avatar || serverProfile.avatar,
                  coverPhoto: localObj.coverPhoto || serverProfile.coverPhoto,
                  bio: localObj.bio || serverProfile.bio,
                  name: localObj.name || serverProfile.name,
                };
                localStorage.setItem(PROFILE_KEY, JSON.stringify(mergedCurrent));
              }
            }
          }
        }
      }

      if (profile?.id) {
        // 4. Sync Notifications
        const notifRes = await fetch(`/api/marketplace/social/notifications/${profile.id}`);
        if (notifRes.ok) {
          const data = await notifRes.json();
          if (data.success && Array.isArray(data.notifications)) {
            localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data.notifications));
          }
        }

        // 5. Sync Friends & Friend Requests
        const friendsRes = await fetch(`/api/marketplace/social/friends/${profile.id}`);
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          if (data.success) {
            if (Array.isArray(data.friends)) {
              const friendIds = data.friends.map((f: any) => f.id);
              localStorage.setItem(`${USER_FRIENDS_KEY}_${profile.id}`, JSON.stringify(friendIds));
            }
            if (Array.isArray(data.receivedRequests) || Array.isArray(data.sentRequests)) {
              const allReqs = [...(data.receivedRequests || []), ...(data.sentRequests || [])];
              localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(allReqs));
            }
          }
        }

        // 6. Sync Messages
        const msgRes = await fetch(`/api/marketplace/social/messages/${profile.id}`);
        if (msgRes.ok) {
          const data = await msgRes.json();
          if (data.success && Array.isArray(data.messages)) {
            localStorage.setItem(MESSAGES_KEY, JSON.stringify(data.messages));
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('twing_social_synced'));
      }
    } catch (e) {
      console.debug('Background social sync note:', e);
    }
  },

  // ==========================================
  // Product Promotion & Boost System
  // ==========================================
  getBoostRequests(): MarketplaceBoostRequest[] {
    try {
      const stored = localStorage.getItem(BOOST_REQUESTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  },

  createBoostRequest(payload: {
    productId: string;
    productName: string;
    productImage: string;
    productPrice: number;
    packageId: 'boost_3d' | 'boost_7d' | 'boost_15d' | 'boost_30d';
    packageName: string;
    days: number;
    amount: number;
    paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'manual';
    senderNumber: string;
    trxId: string;
  }): MarketplaceBoostRequest {
    const profile = this.getCurrentProfile();
    const newReq: MarketplaceBoostRequest = {
      id: `boost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: payload.productId,
      productName: payload.productName,
      productImage: payload.productImage,
      productPrice: payload.productPrice,
      sellerId: profile.id,
      sellerName: profile.name,
      sellerPhone: profile.phone,
      sellerUsername: profile.username,
      packageId: payload.packageId,
      packageName: payload.packageName,
      days: payload.days,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      senderNumber: payload.senderNumber,
      trxId: payload.trxId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };

    const requests = this.getBoostRequests();
    const updated = [newReq, ...requests];
    localStorage.setItem(BOOST_REQUESTS_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_boost_requests_updated'));
    }

    return newReq;
  },

  approveBoostRequest(requestId: string, adminNotes?: string): void {
    const requests = this.getBoostRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('বুস্ট আবেদন পাওয়া যায়নি');

    const approvedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + req.days * 86400000).toISOString();

    req.status = 'approved';
    req.approvedAt = approvedAt;
    req.expiresAt = expiresAt;
    if (adminNotes) req.adminNotes = adminNotes;
    localStorage.setItem(BOOST_REQUESTS_KEY, JSON.stringify(requests));

    // Update product in customer products list
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        let products: CustomerProductItem[] = JSON.parse(stored);
        const pIdx = products.findIndex((p) => p.id === req.productId);
        if (pIdx !== -1) {
          products[pIdx] = {
            ...products[pIdx],
            isPromoted: true,
            promotedBadge: 'স্পনসরড',
            promotedAt: approvedAt,
            promotedUntil: expiresAt,
            boostPriority: 10,
          };
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        }
      }
    } catch (e) {}

    // Send notification to seller
    this.addNotification({
      recipientId: req.sellerId,
      senderId: 'super_admin',
      senderName: 'সেন্ট্রাল মার্কেটপ্লেস অ্যাডমিন',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      type: 'system',
      text: `🎉 অভিনন্দন! "${req.productName}" পণ্যের ${req.packageName} অনুমোদন হয়েছে। পণ্যটি এখন মার্কেটপ্লেসে স্পনসরড হিসেবে প্রদর্শিত হচ্ছে।`,
      targetId: req.productId,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_boost_requests_updated'));
      window.dispatchEvent(new CustomEvent('twing_products_updated'));
    }
  },

  rejectBoostRequest(requestId: string, reason?: string): void {
    const requests = this.getBoostRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('বুস্ট আবেদন পাওয়া যায়নি');

    req.status = 'rejected';
    req.adminNotes = reason || 'পেমেন্ট ট্রানজেকশন মেলেনি বা বাতিল করা হয়েছে';
    localStorage.setItem(BOOST_REQUESTS_KEY, JSON.stringify(requests));

    this.addNotification({
      recipientId: req.sellerId,
      senderId: 'super_admin',
      senderName: 'সেন্ট্রাল মার্কেটপ্লেস অ্যাডমিন',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      type: 'system',
      text: `⚠️ "${req.productName}" পণ্যের বুস্ট আবেদন বাতিল করা হয়েছে। কারণ: ${req.adminNotes}`,
      targetId: req.productId,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_boost_requests_updated'));
    }
  },

  directBoostProduct(productId: string, days: number = 7, packageName: string = 'সুপার এডমিন বুস্ট'): void {
    const approvedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        let products: CustomerProductItem[] = JSON.parse(stored);
        const pIdx = products.findIndex((p) => p.id === productId);
        if (pIdx !== -1) {
          products[pIdx] = {
            ...products[pIdx],
            isPromoted: true,
            promotedBadge: 'স্পনসরড',
            promotedAt: approvedAt,
            promotedUntil: expiresAt,
            boostPriority: 10,
          };
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_products_updated'));
      window.dispatchEvent(new CustomEvent('twing_boost_requests_updated'));
    }
  },

  unboostProduct(productId: string): void {
    try {
      const stored = localStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        let products: CustomerProductItem[] = JSON.parse(stored);
        const pIdx = products.findIndex((p) => p.id === productId);
        if (pIdx !== -1) {
          products[pIdx] = {
            ...products[pIdx],
            isPromoted: false,
            promotedBadge: undefined,
            promotedUntil: undefined,
          };
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        }
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_products_updated'));
    }
  },

  // ==========================================
  // Super Admin Central Marketplace User Controls
  // ==========================================
  getAllMarketplaceUsers(): CustomerProfile[] {
    const directory = this.getProfilesDirectory();
    const curr = this.getCurrentProfile();
    const map = new Map<string, CustomerProfile>();
    directory.forEach((u) => map.set(u.id, u));
    if (curr && curr.id) {
      map.set(curr.id, { ...map.get(curr.id), ...curr });
    }
    return Array.from(map.values());
  },

  adminBlockUser(userId: string, reason: string = 'সেন্ট্রাল মার্কেটপ্লেস অ্যাডমিন দ্বারা ব্লক করা হয়েছে'): void {
    const users = this.getAllMarketplaceUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          isBlocked: true,
          blockReason: reason,
          blockedAt: new Date().toISOString(),
        };
      }
      return u;
    });
    localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(updated));

    const current = this.getCurrentProfile();
    if (current.id === userId) {
      this.updateCurrentProfile({
        isBlocked: true,
        blockReason: reason,
        blockedAt: new Date().toISOString(),
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_marketplace_users_updated'));
    }
  },

  adminUnblockUser(userId: string): void {
    const users = this.getAllMarketplaceUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          isBlocked: false,
          blockReason: undefined,
          blockedAt: undefined,
        };
      }
      return u;
    });
    localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(updated));

    const current = this.getCurrentProfile();
    if (current.id === userId) {
      this.updateCurrentProfile({
        isBlocked: false,
        blockReason: undefined,
        blockedAt: undefined,
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_marketplace_users_updated'));
    }
  },

  adminDeleteUser(userId: string): void {
    const users = this.getAllMarketplaceUsers().filter((u) => u.id !== userId);
    localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(users));

    // Also remove their posts
    try {
      const posts = this.getPosts().filter((p) => p.authorId !== userId);
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    } catch (e) {}

    // Also remove their products
    try {
      const storedProds = localStorage.getItem(PRODUCTS_KEY);
      if (storedProds) {
        const prods: CustomerProductItem[] = JSON.parse(storedProds).filter((p: any) => p.sellerId !== userId);
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(prods));
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_marketplace_users_updated'));
      window.dispatchEvent(new CustomEvent('twing_social_posts_updated'));
      window.dispatchEvent(new CustomEvent('twing_products_updated'));
    }
  },

  adminUpdateUserPowers(userId: string, powers: Partial<CustomerProfile>): void {
    const users = this.getAllMarketplaceUsers();
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          ...powers,
        };
      }
      return u;
    });
    localStorage.setItem(PROFILES_DIRECTORY_KEY, JSON.stringify(updated));

    const current = this.getCurrentProfile();
    if (current.id === userId) {
      this.updateCurrentProfile(powers);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('twing_marketplace_users_updated'));
      window.dispatchEvent(new CustomEvent('twing_profile_updated', { detail: { ...current, ...powers } }));
    }
  },
};

// Automatically run cloud synchronization when running in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    marketplaceSocialService.syncWithCloud();
  }, 100);
}
