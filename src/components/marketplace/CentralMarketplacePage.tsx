import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Package,
  Flame,
  Star,
  CheckCircle2,
  ArrowRight,
  Truck,
  ShieldCheck,
  X,
  Plus,
  Minus,
  Trash2,
  Copy,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  MapPin,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  QrCode,
  Building2,
  Check,
  Search,
  ChevronRight,
  ChevronLeft,
  Store,
  Share2,
  User,
  Heart,
  Bell,
  Menu,
  Headphones,
  Lock,
  Gift,
  CheckCircle,
  Eye,
  ShoppingCart,
  Zap,
  TrendingUp,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  MarketplaceProduct,
  MarketplaceCartItem,
  MarketplaceMasterOrder,
  Product,
  OnlineStoreConfig,
} from '../../types';
import { marketplaceApi } from '../../services/marketplaceService';
import { formatMoney } from '../../utils/storage';
import { getStoredUser } from '../../services/apiService';
import { subscribeToPaymentSettings, INITIAL_PAYMENT_SETTINGS } from '../../services/adminService';
import { SystemPaymentSettings } from '../../types/adminTypes';

import { MarketplaceProductDetailModal } from './MarketplaceProductDetailModal';
import { MarketplaceVendorStoreModal } from './MarketplaceVendorStoreModal';
import { MarketplaceCartCheckoutDrawer } from './MarketplaceCartCheckoutDrawer';
import { MarketplaceLiveTrackingMap } from './MarketplaceLiveTrackingMap';
import { StorefrontSupportDrawer } from '../storefront/StorefrontSupportDrawer';
import { StorefrontNotificationDrawer } from '../storefront/StorefrontNotificationDrawer';

// Storage keys
const MKT_WISHLIST_KEY = 'twing_marketplace_wishlist';
const MKT_CART_KEY = 'twing_marketplace_cart';
const MKT_CUSTOMER_ORDERS_KEY = 'twing_marketplace_customer_orders_v1';

// 12 Exact Categories for Left Sidebar matching screenshot
const SIDEBAR_CATEGORIES = [
  { id: 'cat_mobile', nameBn: 'মোবাইল ও এক্সেসরিজ', icon: '📱', color: 'text-blue-500' },
  { id: 'cat_gadget', nameBn: 'কম্পিউটার ও গ্যাজেট', icon: '💻', color: 'text-sky-500' },
  { id: 'cat_elec', nameBn: 'ইলেকট্রনিক্স', icon: '🔌', color: 'text-teal-500' },
  { id: 'cat_home', nameBn: 'গৃহস্থালী পণ্য', icon: '🏠', color: 'text-amber-500' },
  { id: 'cat_fashion', nameBn: 'ফ্যাশন ও পোশাক', icon: '👕', color: 'text-purple-500' },
  { id: 'cat_beauty', nameBn: 'বিউটি ও পার্সোনাল কেয়ার', icon: '🧴', color: 'text-pink-500' },
  { id: 'cat_baby', nameBn: 'খেলনা ও বেবি প্রোডাক্ট', icon: '🧸', color: 'text-orange-500' },
  { id: 'cat_kitchen', nameBn: 'কিচেন ও ডাইনিং', icon: '🍳', color: 'text-emerald-500' },
  { id: 'cat_health', nameBn: 'স্বাস্থ্য ও ফার্মেসি', icon: '➕', color: 'text-rose-500' },
  { id: 'cat_sports', nameBn: 'ক্রীড়া ও আউটডোর', icon: '⚽', color: 'text-indigo-500' },
  { id: 'cat_books', nameBn: 'বই ও স্টেশনারি', icon: '📚', color: 'text-blue-600' },
  { id: 'cat_others', nameBn: 'অন্যান্য পণ্য', icon: '🔲', color: 'text-slate-500' },
];

// 10 Exact Circular Categories below Hero Banner (Exact Marketplace Styling)
const CIRCULAR_CATEGORIES = [
  { id: 'circ_mobile', nameBn: 'মোবাইল', icon: '📱', match: 'মোবাইল ও এক্সেসরিজ', bg: 'bg-blue-50 border border-blue-100/80 text-[#0052cc] shadow-2xs', text: 'text-[#0052cc]' },
  { id: 'circ_laptop', nameBn: 'ল্যাপটপ', icon: '💻', match: 'কম্পিউটার ও গ্যাজেট', bg: 'bg-sky-50 border border-sky-100/80 text-sky-600 shadow-2xs', text: 'text-sky-600' },
  { id: 'circ_fashion', nameBn: 'ফ্যাশন', icon: '👕', match: 'ফ্যাশন ও পোশাক', bg: 'bg-amber-50 border border-amber-100/80 text-amber-600 shadow-2xs', text: 'text-amber-600' },
  { id: 'circ_home', nameBn: 'গৃহস্থালী', icon: '🛋️', match: 'গৃহস্থালী পণ্য', bg: 'bg-indigo-50 border border-indigo-100/80 text-indigo-600 shadow-2xs', text: 'text-indigo-600' },
  { id: 'circ_beauty', nameBn: 'বিউটি', icon: '🧴', match: 'বিউটি ও পার্সোনাল কেয়ার', bg: 'bg-pink-50 border border-pink-100/80 text-pink-600 shadow-2xs', text: 'text-pink-600' },
  { id: 'circ_kitchen', nameBn: 'কিচেন', icon: '🍲', match: 'কিচেন ও ডাইনিং', bg: 'bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs', text: 'text-slate-700' },
  { id: 'circ_toys', nameBn: 'খেলনা', icon: '🧸', match: 'খেলনা ও বেবি প্রোডাক্ট', bg: 'bg-orange-50 border border-orange-100/80 text-orange-600 shadow-2xs', text: 'text-orange-600' },
  { id: 'circ_books', nameBn: 'বই', icon: '📖', match: 'বই ও স্টেশনারি', bg: 'bg-blue-50 border border-blue-100/80 text-blue-600 shadow-2xs', text: 'text-blue-600' },
  { id: 'circ_health', nameBn: 'হেলথ', icon: '➕', match: 'স্বাস্থ্য ও ফার্মেসি', bg: 'bg-emerald-50 border border-emerald-100/80 text-emerald-600 shadow-2xs', text: 'text-emerald-600' },
  { id: 'circ_others', nameBn: 'অন্যান্য', icon: '🔲', match: 'অন্যান্য পণ্য', bg: 'bg-slate-100 border border-slate-200 text-slate-600 shadow-2xs', text: 'text-[#6b7280]' },
];

// Exact Popular Vendors
const POPULAR_VENDORS_EXACT = [
  {
    id: 'usr_galaxy_store',
    name: 'Galaxy Store',
    category: 'মোবাইল ও এক্সেসরিজ',
    rating: 4.8,
    reviews: '১.২k',
    productCount: '১৪+ পণ্য',
    verified: true,
    logoLetter: 'G',
    bg: 'bg-white border border-[#0052cc] text-[#0052cc]',
    iconType: 'letter',
  },
  {
    id: 'usr_tech_world',
    name: 'Tech World',
    category: 'কম্পিউটার ও গ্যাজেট',
    rating: 4.7,
    reviews: '৮৪৭',
    productCount: '১৮+ পণ্য',
    verified: true,
    icon: '💻',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
  {
    id: 'usr_style_zone',
    name: 'Style Zone',
    category: 'ফ্যাশন ও পোশাক',
    rating: 4.6,
    reviews: '৭৯৭',
    productCount: '২৫+ পণ্য',
    verified: true,
    icon: '👗',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
  {
    id: 'usr_home_appliance',
    name: 'Home Appliance BD',
    category: 'গৃহস্থালী পণ্য',
    rating: 4.5,
    reviews: '৬৪২',
    productCount: '১৯+ পণ্য',
    verified: true,
    icon: '🏠',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
  {
    id: 'usr_beauty_care',
    name: 'Beauty Care',
    category: 'বিউটি ও পার্সোনাল কেয়ার',
    rating: 4.6,
    reviews: '৫২০',
    productCount: '১১+ পণ্য',
    verified: true,
    icon: '🪷',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
  {
    id: 'usr_organic_food',
    name: 'Organic Food BD',
    category: 'স্বাস্থ্য ও খাদ্য',
    rating: 4.9,
    reviews: '৯৩০',
    productCount: '১৬+ পণ্য',
    verified: true,
    icon: '🍃',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
  {
    id: 'usr_kids_wonder',
    name: 'Kids Wonder World',
    category: 'খেলনা ও বেবি প্রোডাক্ট',
    rating: 4.7,
    reviews: '৪১০',
    productCount: '১২+ পণ্য',
    verified: true,
    icon: '🧸',
    bg: 'bg-white border border-slate-200 shadow-2xs',
    iconType: 'icon',
  },
];

// Rich Showcase Products Catalogue (Includes Exact Arogga Screenshot Products)
const EXACT_SHOWCASE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod_vaseline_blueseal',
    name: 'Vaseline Blueseal Pure Petroleum Jelly Original (100ml)',
    category: 'বিউটি ও পার্সোনাল কেয়ার',
    unit: 'জার',
    buyPrice: 380,
    salePrice: 670,
    originalPrice: 1500,
    discountPercent: 55,
    rating: 0,
    reviewCount: 0,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_beauty_care',
    vendorShopName: 'Arogga Health & Beauty',
    vendorAddress: 'গুলশান, ঢাকা',
    vendorSlug: 'arogga-health-beauty',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_sheglam_blush',
    name: 'SHEGLAM Color Bloom Liquid Blush Matte Finish',
    category: 'বিউটি ও পার্সোনাল কেয়ার',
    unit: 'পিস',
    buyPrice: 500,
    salePrice: 880,
    originalPrice: 1260,
    discountPercent: 30,
    rating: 0,
    reviewCount: 0,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_beauty_care',
    vendorShopName: 'Glamour Point',
    vendorAddress: 'ধানমন্ডি, ঢাকা',
    vendorSlug: 'glamour-point',
    updatedAt: Date.now() - 500,
  },
  {
    id: 'prod_neutrogena_sunscreen',
    name: 'Neutrogena Ultra Sheer Dry-Touch Sunscreen SPF 45',
    category: 'বিউটি ও পার্সোনাল কেয়ার',
    unit: 'টিউব',
    buyPrice: 1100,
    salePrice: 1600,
    originalPrice: 2000,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 34,
    stock: 28,
    imageUrl: 'https://images.unsplash.com/photo-1556228722-d9b3be6477e0?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_beauty_care',
    vendorShopName: 'Skin Care Official',
    vendorAddress: 'বনানী, ঢাকা',
    vendorSlug: 'skin-care-official',
    updatedAt: Date.now() - 800,
  },
  {
    id: 'prod_haisenpet_catfood',
    name: 'Haisenpet Premium Cat Food Chicken, Tuna (1.2KG)',
    category: 'পোষা প্রাণী ও পেট কেয়ার',
    unit: 'প্যাকেট',
    buyPrice: 550,
    salePrice: 750,
    originalPrice: 900,
    discountPercent: 17,
    rating: 0,
    reviewCount: 0,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_organic_food',
    vendorShopName: 'Paws & Claws BD',
    vendorAddress: 'উত্তরা, ঢাকা',
    vendorSlug: 'paws-claws-bd',
    updatedAt: Date.now() - 1000,
  },
  {
    id: 'prod_jungle_catfood',
    name: 'Jungle Adult Cat Food Chicken & Fish 500g',
    category: 'পোষা প্রাণী ও পেট কেয়ার',
    unit: 'প্যাকেট',
    buyPrice: 380,
    salePrice: 520,
    originalPrice: 680,
    discountPercent: 23,
    rating: 0,
    reviewCount: 0,
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_organic_food',
    vendorShopName: 'Paws & Claws BD',
    vendorAddress: 'উত্তরা, ঢাকা',
    vendorSlug: 'paws-claws-bd',
    updatedAt: Date.now() - 1200,
  },
  {
    id: 'prod_bengal_shampoo',
    name: 'Bengal Antiseptic Antifungal Medicated Shampoo for Pets',
    category: 'পোষা প্রাণী ও পেট কেয়ার',
    unit: 'বোতল',
    buyPrice: 320,
    salePrice: 450,
    originalPrice: 495,
    discountPercent: 9,
    rating: 0,
    reviewCount: 0,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-54877dc8d93e?w=500&auto=format&fit=crop&q=80',
    vendorId: 'usr_organic_food',
    vendorShopName: 'Paws & Claws BD',
    vendorAddress: 'উত্তরা, ঢাকা',
    vendorSlug: 'paws-claws-bd',
    updatedAt: Date.now() - 1500,
  },
  {
    id: 'prod_galaxy_a15',
    name: 'Samsung Galaxy A15 (6GB+128GB)',
    category: 'মোবাইল ও এক্সেসরিজ',
    unit: 'পিস',
    buyPrice: 15000,
    salePrice: 16990,
    originalPrice: 19990,
    discountPercent: 15,
    rating: 4.8,
    reviewCount: 89,
    stock: 25,
    imageUrl: '/src/assets/images/mkt_samsung_galaxy_a15_1791136754600.jpg',
    vendorId: 'usr_galaxy_store',
    vendorShopName: 'Galaxy Store',
    vendorAddress: 'মিরপুর-১০, ঢাকা',
    vendorSlug: 'galaxy-store',
    updatedAt: Date.now(),
  },
  {
    id: 'prod_tws_earbuds',
    name: 'TWS Bluetooth Earbuds (Noise Cancellation)',
    category: 'কম্পিউটার ও গ্যাজেট',
    unit: 'পিস',
    buyPrice: 1100,
    salePrice: 1590,
    originalPrice: 1990,
    discountPercent: 20,
    rating: 4.6,
    reviewCount: 45,
    stock: 38,
    imageUrl: '/src/assets/images/mkt_tws_earbuds_1791136771381.jpg',
    vendorId: 'usr_tech_world',
    vendorShopName: 'Tech World',
    vendorAddress: 'আইডিবি ভবন, ঢাকা',
    vendorSlug: 'tech-world',
    updatedAt: Date.now() - 1000,
  },
  {
    id: 'prod_mens_casual_shirt',
    name: "Men's Casual Shirt (Cotton)",
    category: 'ফ্যাশন ও পোশাক',
    unit: 'পিস',
    buyPrice: 280,
    salePrice: 449,
    originalPrice: 599,
    discountPercent: 25,
    rating: 4.5,
    reviewCount: 42,
    stock: 50,
    imageUrl: '/src/assets/images/mkt_casual_shirt_1791136785929.jpg',
    vendorId: 'usr_style_zone',
    vendorShopName: 'Style Zone',
    vendorAddress: 'উত্তরা, ঢাকা',
    vendorSlug: 'style-zone',
    updatedAt: Date.now() - 2000,
  },
  {
    id: 'prod_miyako_rice_cooker',
    name: 'Miyako Rice Cooker (1.8L)',
    category: 'গৃহস্থালী পণ্য',
    unit: 'পিস',
    buyPrice: 2800,
    salePrice: 3450,
    originalPrice: 4200,
    discountPercent: 18,
    rating: 4.7,
    reviewCount: 44,
    stock: 18,
    imageUrl: '/src/assets/images/mkt_rice_cooker_1791136800299.jpg',
    vendorId: 'usr_home_appliance',
    vendorShopName: 'Home Appliance BD',
    vendorAddress: 'নিউ মার্কেট, ঢাকা',
    vendorSlug: 'home-appliance-bd',
    updatedAt: Date.now() - 3000,
  },
  {
    id: 'prod_ladies_handbag',
    name: 'Ladies Handbag (Imported)',
    category: 'ফ্যাশন ও পোশাক',
    unit: 'পিস',
    buyPrice: 900,
    salePrice: 1290,
    originalPrice: 1650,
    discountPercent: 22,
    rating: 4.8,
    reviewCount: 47,
    stock: 22,
    imageUrl: '/src/assets/images/mkt_ladies_handbag_1791136814680.jpg',
    vendorId: 'usr_beauty_care',
    vendorShopName: 'Fashion House',
    vendorAddress: 'ধানমন্ডি, ঢাকা',
    vendorSlug: 'fashion-house',
    updatedAt: Date.now() - 4000,
  },
  {
    id: 'prod_smart_watch',
    name: 'Smart Fitness Watch (Waterproof)',
    category: 'কম্পিউটার ও গ্যাজেট',
    unit: 'পিস',
    buyPrice: 1600,
    salePrice: 2150,
    originalPrice: 2790,
    discountPercent: 23,
    rating: 4.7,
    reviewCount: 65,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_tech_world',
    vendorShopName: 'Tech World',
    vendorAddress: 'আইডিবি ভবন, ঢাকা',
    vendorSlug: 'tech-world',
    updatedAt: Date.now() - 5000,
  },
  {
    id: 'prod_artisan_ghee',
    name: 'Artisan Pure Cow Ghee (গাওয়া ঘি ৫০০ গ্রাম)',
    category: 'গৃহস্থালী পণ্য',
    unit: 'জার',
    buyPrice: 750,
    salePrice: 950,
    originalPrice: 1150,
    discountPercent: 17,
    rating: 4.9,
    reviewCount: 92,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_home_appliance',
    vendorShopName: 'Home Appliance BD',
    vendorAddress: 'নিউ মার্কেট, ঢাকা',
    vendorSlug: 'home-appliance-bd',
    updatedAt: Date.now() - 6000,
  },
  {
    id: 'prod_sundarban_honey',
    name: 'Natural Sundarban Honey (সুন্দরবনের প্রাকৃতিক মধু ৫০০ গ্রাম)',
    category: 'স্বাস্থ্য ও ফার্মেসি',
    unit: 'বোতল',
    buyPrice: 480,
    salePrice: 650,
    originalPrice: 800,
    discountPercent: 18,
    rating: 4.9,
    reviewCount: 78,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_galaxy_store',
    vendorShopName: 'Galaxy Store',
    vendorAddress: 'মিরপুর-১০, ঢাকা',
    vendorSlug: 'galaxy-store',
    updatedAt: Date.now() - 7000,
  },
  {
    id: 'prod_aloe_vera_gel',
    name: 'Organic Aloe Vera Soothing Gel (৩০০ মিলি)',
    category: 'বিউটি ও পার্সোনাল কেয়ার',
    unit: 'জার',
    buyPrice: 220,
    salePrice: 380,
    originalPrice: 500,
    discountPercent: 24,
    rating: 4.8,
    reviewCount: 54,
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_beauty_care',
    vendorShopName: 'Beauty Care',
    vendorAddress: 'ধানমন্ডি, ঢাকা',
    vendorSlug: 'beauty-care',
    updatedAt: Date.now() - 8000,
  },
  {
    id: 'prod_anker_charger',
    name: 'Anker 20W Fast Charger USB-C (PowerPort III)',
    category: 'মোবাইল ও এক্সেসরিজ',
    unit: 'পিস',
    buyPrice: 850,
    salePrice: 1190,
    originalPrice: 1450,
    discountPercent: 18,
    rating: 4.9,
    reviewCount: 112,
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_galaxy_store',
    vendorShopName: 'Galaxy Store',
    vendorAddress: 'মিরপুর-১০, ঢাকা',
    vendorSlug: 'galaxy-store',
    updatedAt: Date.now() - 9000,
  },
  {
    id: 'prod_denim_jeans',
    name: 'Slim-Fit Stretch Denim Jeans for Men',
    category: 'ফ্যাশন ও পোশাক',
    unit: 'পিস',
    buyPrice: 620,
    salePrice: 990,
    originalPrice: 1350,
    discountPercent: 27,
    rating: 4.7,
    reviewCount: 88,
    stock: 32,
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_style_zone',
    vendorShopName: 'Style Zone',
    vendorAddress: 'উত্তরা, ঢাকা',
    vendorSlug: 'style-zone',
    updatedAt: Date.now() - 10000,
  },
  {
    id: 'prod_steel_blender',
    name: '3-in-1 Stainless Steel Blender & Grinder',
    category: 'কিচেন ও ডাইনিং',
    unit: 'সেট',
    buyPrice: 1800,
    salePrice: 2350,
    originalPrice: 2950,
    discountPercent: 20,
    rating: 4.6,
    reviewCount: 39,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80',
    vendorId: 'usr_home_appliance',
    vendorShopName: 'Home Appliance BD',
    vendorAddress: 'নিউ মার্কেট, ঢাকা',
    vendorSlug: 'home-appliance-bd',
    updatedAt: Date.now() - 11000,
  },
];

// Reusable High-Fidelity Product Card Component matching exact Arogga/Marketplace layout
interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  onAddToCart: (p: MarketplaceProduct, e: React.MouseEvent) => void;
  onClick: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
  badgeText?: string;
  badgeBg?: string;
  showSaveAmount?: boolean;
  cartQuantity?: number;
  onUpdateQuantity?: (id: string, delta: number, e: React.MouseEvent) => void;
}

const MarketplaceProductCard: React.FC<MarketplaceProductCardProps> = ({
  product,
  onAddToCart,
  onClick,
  isWishlisted,
  onToggleWishlist,
  badgeText,
  badgeBg = 'bg-[#009b77]',
  cartQuantity = 0,
  onUpdateQuantity,
}) => {
  const discount = product.discountPercent || 0;
  // If discount >= 20% show red lightning tag; if < 20% show blue tag (matches screenshot)
  const isRedTag = discount >= 20 || badgeText?.includes('ফ্ল্যাশ') || badgeText?.includes('অফার');

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition duration-200 cursor-pointer relative group h-full select-none"
    >
      <div>
        {/* Image Container with Top Hanging Discount Ribbon Badge */}
        <div className="relative aspect-square w-full rounded-xl bg-white overflow-hidden mb-2 flex items-center justify-center p-2.5">
          {/* Top Hanging Badge matching screenshot */}
          {discount > 0 ? (
            isRedTag ? (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-[#e62e2d] text-white font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-b-lg inline-flex items-center gap-0.5 shadow-2xs tracking-tight">
                  <span className="text-[10px]">⚡</span> {discount}% OFF
                </span>
              </div>
            ) : (
              <div className="absolute top-0 left-2 z-10">
                <span className="bg-[#0284c7] text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-b-md shadow-2xs leading-tight">
                  {discount}% OFF
                </span>
              </div>
            )
          ) : badgeText ? (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <span className={`text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-b-lg inline-flex items-center gap-0.5 shadow-2xs ${badgeBg}`}>
                {badgeText}
              </span>
            </div>
          ) : null}

          {/* Top-Right Wishlist Heart */}
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product.id, e)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-2xs transition cursor-pointer z-10"
            title={isWishlisted ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় যুক্ত করুন'}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-rose-500'
              }`}
            />
          </button>

          {/* Product Image */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>

        {/* 12-24 Hours Delivery Pill matching screenshot */}
        <div className="mb-1 flex items-center">
          <span className="inline-flex items-center gap-1 bg-slate-100/90 text-slate-700 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md">
            <span className="text-xs">🚀</span>
            <span>12-24 HOURS</span>
          </span>
        </div>

        {/* Product Title (2-line clamped) */}
        <h3 className="text-xs sm:text-[13px] font-medium text-slate-900 line-clamp-2 leading-snug min-h-[34px] sm:min-h-[38px] group-hover:text-[#009b77] transition">
          {product.name}
        </h3>

        {/* Rating Stars & Count (e.g. ★ ★ ★ ★ ★ (0)) */}
        <div className="flex items-center gap-1 text-[11px] pt-1">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => {
              const isFilled = (product.rating || 0) >= i + 1;
              return (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-200 text-slate-200'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            ({product.reviewCount || 0})
          </span>
        </div>
      </div>

      {/* Bottom Row: Price & ADD Button matching screenshot */}
      <div className="flex items-end justify-between gap-2 pt-2 mt-auto">
        {/* Price Column */}
        <div className="flex flex-col">
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            ৳{product.salePrice}
          </div>
          {product.originalPrice && product.originalPrice > product.salePrice && (
            <div className="text-xs text-slate-400 line-through leading-tight">
              ৳{product.originalPrice}
            </div>
          )}
        </div>

        {/* ADD Button or Quantity Stepper */}
        {cartQuantity > 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center border border-[#009b77] rounded-xl overflow-hidden bg-[#009b77]/5"
          >
            <button
              type="button"
              onClick={(e) => onUpdateQuantity && onUpdateQuantity(product.id, -1, e)}
              className="px-2.5 py-1 text-[#009b77] hover:bg-[#009b77] hover:text-white font-black text-xs transition cursor-pointer"
            >
              −
            </button>
            <span className="px-2 text-xs font-bold text-[#009b77]">
              {cartQuantity}
            </span>
            <button
              type="button"
              onClick={(e) => onUpdateQuantity && onUpdateQuantity(product.id, 1, e)}
              className="px-2.5 py-1 text-[#009b77] hover:bg-[#009b77] hover:text-white font-black text-xs transition cursor-pointer"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="border-[1.5px] border-[#009b77] hover:bg-[#009b77] text-[#009b77] hover:text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl transition duration-150 cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center min-w-[64px]"
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
};

interface CentralMarketplacePageProps {
  onMerchantLogin?: () => void;
  onBackToDashboard?: () => void;
}

export const CentralMarketplacePage: React.FC<CentralMarketplacePageProps> = ({
  onMerchantLogin,
  onBackToDashboard,
}) => {
  // Navigation & View state
  const [navTab, setNavTab] = useState<'home' | 'vendors' | 'offers' | 'bestselling' | 'new' | 'orders' | 'support'>('home');
  const [mobileBottomTab, setMobileBottomTab] = useState<'home' | 'categories' | 'cart' | 'orders' | 'account'>('home');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Products
  const [products, setProducts] = useState<MarketplaceProduct[]>(EXACT_SHOWCASE_PRODUCTS);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Drawers state
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [selectedVendorStore, setSelectedVendorStore] = useState<{ id: string; name: string } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Cart state - initialized with 2 demo items so header badge displays "2" exactly matching screenshot
  const [cart, setCart] = useState<MarketplaceCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_CART_KEY);
      if (saved) return JSON.parse(saved);
      return [
        { product: EXACT_SHOWCASE_PRODUCTS[0], quantity: 1 },
        { product: EXACT_SHOWCASE_PRODUCTS[1], quantity: 1 },
      ];
    } catch {
      return [
        { product: EXACT_SHOWCASE_PRODUCTS[0], quantity: 1 },
        { product: EXACT_SHOWCASE_PRODUCTS[1], quantity: 1 },
      ];
    }
  });

  // Wishlist state
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer Orders state
  const [customerOrders, setCustomerOrders] = useState<MarketplaceMasterOrder[]>(() => {
    try {
      const saved = localStorage.getItem(MKT_CUSTOMER_ORDERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tracking query state
  const [trackingSearchQuery, setTrackingSearchQuery] = useState('');
  const [queriedOrder, setQueriedOrder] = useState<MarketplaceMasterOrder | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Hero Slider
  const [currentSlide, setCurrentSlide] = useState(0);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2800);
  };

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings>(INITIAL_PAYMENT_SETTINGS);

  // Current logged in user
  const currentUser = getStoredUser();

  // Save Cart to storage
  useEffect(() => {
    try {
      localStorage.setItem(MKT_CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Save Wishlist to storage
  useEffect(() => {
    try {
      localStorage.setItem(MKT_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds]);

  // Load feed from server with fallback to exact showcase catalog
  useEffect(() => {
    let isMounted = true;
    async function loadFeed() {
      try {
        const res = await marketplaceApi.getFeed({
          search: searchQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        });
        if (isMounted && res?.success && Array.isArray(res.products) && res.products.length > 0) {
          setProducts(res.products);
        } else if (isMounted && !searchQuery.trim() && selectedCategory === 'all') {
          setProducts(EXACT_SHOWCASE_PRODUCTS);
        }
      } catch (e) {
        if (isMounted) setProducts(EXACT_SHOWCASE_PRODUCTS);
      }
    }
    loadFeed();
    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedCategory]);

  // Subscribe to Unified Payment Settings
  useEffect(() => {
    const unsub = subscribeToPaymentSettings((data) => {
      if (data) setPaymentSettings(data);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Ensure entire document and browser status bar have pure white background
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.backgroundColor = '#ffffff';

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const prevThemeColor = themeColorMeta?.getAttribute('content') || '#033b31';
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#ffffff');
    }

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', prevThemeColor);
      }
    };
  }, []);

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    const mktProd = product as MarketplaceProduct;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { product: mktProd, quantity }];
    });
    showToast(`🛍️ '${product.name}' কার্টে যুক্ত হয়েছে!`);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as MarketplaceCartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
    showToast('পণ্যটি কার্ট থেকে সরানো হয়েছে');
  };

  const handleBuyNow = (product: Product, quantity = 1) => {
    addToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(exists ? 'পছন্দের তালিকা থেকে বাদ দেওয়া হয়েছে' : '❤️ পছন্দের তালিকায় যুক্ত হয়েছে!');
      return next;
    });
  };

  // Track order submit
  const handleTrackOrder = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const query = (customTarget || trackingSearchQuery).trim();
    if (!query) return;

    setIsTrackingLoading(true);
    setTrackingError('');
    try {
      const res = await marketplaceApi.trackOrder(query);
      if (res?.success && res.order) {
        setQueriedOrder(res.order);
      } else {
        setQueriedOrder(null);
        setTrackingError('অর্ডার পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর বা মোবাইল নম্বর দিন।');
      }
    } catch (err: any) {
      setTrackingError(err.message || 'অর্ডার ট্র্যাক করতে সমস্যা হয়েছে');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Support config
  const supportConfig: OnlineStoreConfig = useMemo(() => ({
    isEnabled: true,
    storeSlug: 'central-marketplace',
    storeName: 'TWING Marketplace',
    tagline: 'সবার জন্য, সবার পছন্দ',
    category: 'সকল ক্যাটাগরি',
    announcement: '',
    phone: paymentSettings?.bkash?.personal?.number || '01306908115',
    whatsappPhone: paymentSettings?.bkash?.personal?.number || '01306908115',
    address: 'ঢাকা, বাংলাদেশ',
    deliveryInsideDhaka: 70,
    deliveryOutsideDhaka: 130,
    logoUrl: '',
    themeColor: 'indigo',
    acceptCOD: true,
    acceptBkash: true,
    acceptNagad: true,
    acceptRocket: true,
    acceptUpay: true,
    acceptBank: true,
  }), [paymentSettings]);

  // 1. Flash Sale Countdown Timer (Hours : Minutes : Seconds ticking every second)
  const [flashSaleCountdown, setFlashSaleCountdown] = useState({
    hours: 7,
    minutes: 28,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setFlashSaleCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59, hours: Math.max(0, prev.hours - 1) };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Horizontal scroll refs for popular vendors and trending products
  const vendorScrollRef = useRef<HTMLDivElement>(null);
  const trendingScrollRef = useRef<HTMLDivElement>(null);

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const delta = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  // Section 8: All Products (Quick Category filter & Load More)
  const [allProductsVisibleCount, setAllProductsVisibleCount] = useState(8);
  const [allProductsCategory, setAllProductsCategory] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setAllProductsVisibleCount((c) => c + 4);
      setIsLoadingMore(false);
    }, 350);
  };

  // Memoized product subsets for the 8 marketplace sections
  const flashSaleProducts = useMemo(() => {
    const discounted = products.filter((p) => (p.discountPercent || 0) >= 15);
    return discounted.length >= 4 ? discounted.slice(0, 4) : products.slice(0, 4);
  }, [products]);

  const popularProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
  }, [products]);

  const trendingProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  }, [products]);

  const recommendedProducts = useMemo(() => {
    if (products.length >= 8) {
      return [products[4], products[5], products[6], products[7]].filter(Boolean);
    }
    return products.slice(0, 4);
  }, [products]);

  const newArrivalProducts = useMemo(() => {
    if (products.length >= 12) {
      return [products[8], products[9], products[10], products[11]].filter(Boolean);
    }
    return [...products].reverse().slice(0, 4);
  }, [products]);

  const filteredAllProducts = useMemo(() => {
    if (allProductsCategory === 'all') return products;
    return products.filter(
      (p) => p.category.includes(allProductsCategory) || allProductsCategory.includes(p.category)
    );
  }, [products, allProductsCategory]);

  const displayedAllProducts = useMemo(() => {
    return filteredAllProducts.slice(0, allProductsVisibleCount);
  }, [filteredAllProducts, allProductsVisibleCount]);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans text-slate-800 antialiased selection:bg-[#0052cc] selection:text-white">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 text-white rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 backdrop-blur-xs"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER (EXACT PIXEL-MATCH TO SCREENSHOT) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo & Tagline Container */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Logo */}
            <div
              onClick={() => {
                setNavTab('home');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              {/* Blue shopping bag with stylized curved gradient handle */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0052cc] to-[#0284c7] text-white flex items-center justify-center shadow-sm relative overflow-hidden">
                <ShoppingBag className="w-5 h-5 text-white" />
                <div className="absolute top-1 w-3 h-2 border-2 border-amber-300 rounded-t-full" />
              </div>

              <div className="flex flex-col -space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0052cc]">TWING</span>
                </div>
                <span className="text-xs font-black tracking-wide text-[#ea580c]">Marketplace</span>
              </div>
            </div>

            {/* Tagline beside logo */}
            <div className="hidden xl:block text-xs font-medium text-slate-500 pl-3 border-l border-slate-200">
              সবাইয়ের জন্য, সবার পছন্দ
            </div>
          </div>

          {/* Large Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="relative w-full flex items-center">
              <input
                type="text"
                placeholder="পণ্য, ব্র্যান্ড বা ভেন্ডরের নাম খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:border-[#0052cc] focus:bg-white transition shadow-2xs placeholder:text-slate-400"
              />
              <button
                type="button"
                className="absolute right-1 p-2 bg-[#0052cc] hover:bg-blue-700 text-white rounded-lg transition cursor-pointer flex items-center justify-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-slate-700">
            {/* Login / Registration */}
            <button
              type="button"
              onClick={onMerchantLogin || onBackToDashboard}
              className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0052cc] transition cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">লগইন / রেজিস্টার</span>
            </button>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => showToast(`পছন্দের তালিকায় ${wishlistIds.length} টি পণ্য রয়েছে`)}
              className="flex items-center gap-1.5 text-xs font-bold hover:text-[#0052cc] transition cursor-pointer"
            >
              <Heart className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">পছন্দের তালিকা</span>
            </button>

            {/* Notification with red badge 3 */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-1 hover:text-[#0052cc] transition cursor-pointer"
              title="নোটিফিকেশন"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Shopping Cart with red badge 2 */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-1.5 hover:text-[#0052cc] transition cursor-pointer relative"
              title="কার্ট"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-700" />
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cartItemCount || 2}
                </span>
              </div>
              <span className="hidden sm:inline text-xs font-bold">কার্ট</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden px-4 pb-2.5 pt-0.5">
          <div className="relative w-full flex items-center">
            <input
              type="text"
              placeholder="পণ্য, ব্র্যান্ড বা ভেন্ডরের নাম খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="button"
              className="absolute right-1 p-1.5 bg-[#0052cc] text-white rounded-md"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN HORIZONTAL NAVIGATION BAR (DESKTOP) */}
      {/* ========================================================================= */}
      <nav className="hidden md:block bg-white border-b border-slate-200 text-xs sm:text-sm font-bold shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center">
          {/* Blue "সব ক্যাটাগরি" Button on Left */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-[#0052cc] hover:bg-blue-700 text-white font-black tracking-wide rounded-t-lg transition cursor-pointer shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span>সব ক্যাটাগরি</span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 ml-6 py-2">
            {[
              { id: 'home', label: 'হোম' },
              { id: 'vendors', label: 'সকল ভেন্ডর' },
              { id: 'offers', label: 'অফার' },
              { id: 'bestselling', label: 'বেস্ট সেলিং' },
              { id: 'new', label: 'নতুন পণ্য' },
              { id: 'orders', label: 'আমার অর্ডার' },
              { id: 'support', label: 'সাহায্য কেন্দ্র' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'support') {
                    setIsSupportOpen(true);
                  } else {
                    setNavTab(tab.id as any);
                    if (tab.id === 'home') {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }
                  }
                }}
                className={`py-1 cursor-pointer transition relative whitespace-nowrap ${
                  navTab === tab.id
                    ? 'text-[#0052cc] font-black after:content-[""] after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] after:bg-[#0052cc]'
                    : 'text-slate-700 hover:text-[#0052cc]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard link if available */}
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <span>দোকানের ড্যাশবোর্ড</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: 3-COLUMN LAYOUT EXACT MATCH */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-5 space-y-6">
        {navTab === 'orders' ? (
          /* Order Tracking View */
          <div className="max-w-4xl mx-auto w-full space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#0052cc]/30 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    সেন্ট্রাল অর্ডার ট্র্যাকিং ও ডেলিভারি স্ট্যাটাস
                  </h2>
                  <p className="text-xs text-slate-500">আপনার অর্ডার নম্বর দিয়ে ট্র্যাক করুন</p>
                </div>
              </div>

              <form onSubmit={handleTrackOrder} className="flex gap-2">
                <input
                  type="text"
                  placeholder="অর্ডার নম্বর (যেমন: MKT-123456)..."
                  value={trackingSearchQuery}
                  onChange={(e) => setTrackingSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]"
                />
                <button
                  type="submit"
                  disabled={isTrackingLoading || !trackingSearchQuery.trim()}
                  className="px-5 py-2 bg-[#0052cc] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isTrackingLoading ? 'লোড হচ্ছে...' : 'ট্র্যাক করুন'}
                </button>
              </form>

              {trackingError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {trackingError}
                </div>
              )}
            </div>

            {queriedOrder && (
              <MarketplaceLiveTrackingMap
                order={queriedOrder}
                isLiveUpdating={false}
                onRefresh={() => handleTrackOrder(undefined, queriedOrder.orderNumber || queriedOrder.id)}
                onCopyText={(txt) => {
                  navigator.clipboard.writeText(txt);
                  showToast('কপি করা হয়েছে!');
                }}
              />
            )}
          </div>
        ) : (
          <>
            {/* TOP 3-COLUMN HERO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* ------------------------------------------------------------- */}
              {/* LEFT COLUMN: 12 Categories List (~20% width = 3/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {SIDEBAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.nameBn)}
                      className={`w-full px-3.5 py-2 text-left text-xs font-medium transition flex items-center justify-between cursor-pointer group ${
                        selectedCategory === cat.nameBn
                          ? 'bg-white text-[#0052cc] font-black border-l-3 border-[#0052cc] shadow-2xs'
                          : 'bg-white text-slate-700 hover:text-[#0052cc]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="truncate">{cat.nameBn}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0052cc] transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CENTER COLUMN: Hero Slider Banner & 10 Circular Categories (6/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="col-span-1 lg:col-span-6 space-y-3.5">
                {/* Hero Banner Container */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#edf5ff] via-[#f1f7ff] to-[#e8f1fc] border border-blue-200/80 p-5 sm:p-7 flex flex-col justify-between min-h-[290px] shadow-2xs">
                  <div className="relative z-10 max-w-[280px] sm:max-w-xs space-y-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      আপনার প্রয়োজনীয় সব পণ্য এখন
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0052cc] leading-tight">
                      একই প্ল্যাটফর্মে
                    </h1>
                    <p className="text-xs font-medium text-slate-600">
                      বহু ভেন্ডরের হাজারো পণ্য, সেরা দামে!
                    </p>

                    {/* 3 Trust Badges in a row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-bold text-slate-700">
                      <span className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>নিরাপদ লেনদেন</span>
                      </span>
                      <span className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-[#0052cc]" />
                        <span>বিশ্বস্ত ভেন্ডর</span>
                      </span>
                      <span className="flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                        <Truck className="w-3 h-3 text-teal-600" />
                        <span>দ্রুত ডেলিভারি</span>
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('marketplace-flash-sale');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-5 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>এখনই শপিং করুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right side Gadgets Product Showcase Image */}
                  <div className="absolute right-0 bottom-0 top-0 w-1/2 flex items-center justify-end pointer-events-none p-2 sm:p-4">
                    <img
                      src="/src/assets/images/marketplace_hero_gadgets_1791135706091.jpg"
                      alt="Gadgets & Shopping Cart"
                      className="max-h-[260px] w-auto object-contain drop-shadow-xl"
                    />
                  </div>

                  {/* Slider Controls */}
                  <div className="flex items-center justify-between pt-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => setCurrentSlide((c) => (c > 0 ? c - 1 : 3))}
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-2xs border border-blue-200/60 cursor-pointer"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    {/* Pagination Dots */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          onClick={() => setCurrentSlide(dot)}
                          className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${
                            currentSlide === dot ? 'w-4 bg-[#0052cc]' : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentSlide((c) => (c < 3 ? c + 1 : 0))}
                      className="p-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 shadow-2xs border border-slate-200 cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 10 Circular Categories Row */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center">
                    {CIRCULAR_CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.match)}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg transition group-hover:scale-105 shadow-2xs ${cat.bg}`}
                        >
                          {cat.icon}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#0052cc] line-clamp-1">
                          {cat.nameBn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* RIGHT COLUMN: User Card, Promo Box, 4 Service Cards & Vendor CTA (3/12 cols) */}
              {/* ------------------------------------------------------------- */}
              <div className="hidden lg:block lg:col-span-3 space-y-3">
                {/* 1. User / Guest Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-900">স্বাগতম</div>
                      <div className="text-[11px] text-slate-500">
                        {currentUser?.name || 'অতিথি ব্যবহারকারী'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onMerchantLogin || onBackToDashboard}
                    className="w-full py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {currentUser ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'লগইন করুন'}
                  </button>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-bold">
                    <div
                      onClick={() => setNavTab('orders')}
                      className="flex items-center gap-2 hover:text-[#0052cc] cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>আমার অর্ডার</span>
                    </div>
                    <div
                      onClick={() => showToast(`পছন্দের তালিকায় ${wishlistIds.length} টি পণ্য রয়েছে`)}
                      className="flex items-center gap-2 hover:text-[#0052cc] cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                      <span>আমার পছন্দের তালিকা</span>
                    </div>
                    <div
                      onClick={onMerchantLogin || onBackToDashboard}
                      className="flex items-center gap-2 hover:text-[#0052cc] cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>আমার অ্যাকাউন্ট</span>
                    </div>
                  </div>
                </div>

                {/* 2. New User Registration Promo Box (Clean White) */}
                <div className="rounded-2xl p-3 bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 text-purple-600 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    🎁
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-900">নতুন ব্যবহারকারী?</div>
                    <button
                      type="button"
                      onClick={onMerchantLogin || onBackToDashboard}
                      className="px-2.5 py-0.5 bg-[#0052cc] text-white text-[10px] font-black rounded-md shadow-2xs hover:bg-blue-700 cursor-pointer"
                    >
                      রেজিস্ট্রেশন করুন
                    </button>
                    <div className="text-[9px] text-slate-500">এবং পান বিশেষ ডিসকাউন্ট!</div>
                  </div>
                </div>

                {/* 3. Four Service Cards (Clean White) */}
                <div className="space-y-1.5">
                  {/* Card 1: দ্রুত ডেলিভারি */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">দ্রুত ডেলিভারি</div>
                        <div className="text-[9px] text-slate-500">সারা বাংলাদেশে</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 2: 100% নিরাপদ লেনদেন */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">100% নিরাপদ লেনদেন</div>
                        <div className="text-[9px] text-slate-500">বিশ্বস্ত পেমেন্ট সিস্টেম</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 3: বিশ্বস্ত ভেন্ডর */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#0052cc] text-white flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">বিশ্বস্ত ভেন্ডর</div>
                        <div className="text-[9px] text-slate-500">প্রত্যেক ভেন্ডর যাচাই করা</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>

                  {/* Card 4: ২৪/৭ সাপোর্ট */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                        <Headphones className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">২৪/৭ সাপোর্ট</div>
                        <div className="text-[9px] text-slate-500">সাহায্য সবসময়</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs">
                      →
                    </div>
                  </div>
                </div>

                {/* 4. Vendor CTA Card (Clean White) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 relative overflow-hidden shadow-2xs">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      আপনি কি ভেন্ডর হতে চান?
                    </h4>
                    <p className="text-[10px] text-slate-600 leading-snug">
                      আপনার দোকান বা ব্র্যান্ড নিয়ে আসুন TWING Marketplace-এ আর পৌঁছে যান লাখো গ্রাহকের কাছে।
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onMerchantLogin || onBackToDashboard}
                      className="px-3 py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      এখনই রেজিস্ট্রেশন করুন →
                    </button>
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                      <img
                        src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                        alt="TWING Courier"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 1. 🔥 আজকের অফার / Flash Sale */}
            {/* ========================================================================= */}
            <section id="marketplace-flash-sale" className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-orange-200 text-orange-600 flex items-center justify-center font-bold shadow-2xs">
                    <Flame className="w-4 h-4 fill-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        আজকের অফার / Flash Sale
                      </h2>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider animate-pulse">
                        হট ডিল
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      সীমিত সময়ের জন্য বিশেষ মূল্যছাড় ও সাশ্রয়ী ডিল
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="flex items-center gap-1.5 bg-white border border-rose-200 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-700 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="text-[11px] hidden xs:inline font-medium">শেষ হতে বাকি:</span>
                    <div className="flex items-center gap-1 font-mono font-black text-xs">
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.hours).padStart(2, '0')}
                      </span>
                      <span className="text-rose-600 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-rose-600 font-bold">:</span>
                      <span className="bg-rose-600 text-white px-1.5 py-0.5 rounded-md min-w-[22px] text-center shadow-2xs">
                        {String(flashSaleCountdown.seconds).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('marketplace-all-products');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                  >
                    <span>সব দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2-Column Product Grid (Responsive: 2 cols on mobile, 4 on desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {flashSaleProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="🔥 ফ্ল্যাশ সেল"
                    badgeBg="bg-rose-600"
                    showSaveAmount={true}
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 2. 🛍️ জনপ্রিয় পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      জনপ্রিয় পণ্য
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      গ্রাহকদের সবচেয়ে পছন্দের ও সেরা রেটেড পণ্যসমূহ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid (Responsive) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {popularProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="⭐ টপ রেটেড"
                    badgeBg="bg-amber-600"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 3. 🏪 জনপ্রিয় ভেন্ডার / শপ */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      জনপ্রিয় ভেন্ডার / শপ
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      যাচাইকৃত শীর্ষস্থানীয় অনলাইন শপসমূহ থেকে সরাসরি কিনুন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Desktop scroll arrows */}
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(vendorScrollRef, 'left')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                      title="আগেরগুলো"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollHorizontally(vendorScrollRef, 'right')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                      title="পরেরগুলো"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNavTab('vendors')}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>সকল ভেন্ডর</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scroll Layout */}
              <div
                ref={vendorScrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth"
              >
                {POPULAR_VENDORS_EXACT.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="w-44 sm:w-52 shrink-0 bg-white rounded-2xl border border-slate-200/90 p-4 text-center flex flex-col items-center justify-between hover:shadow-md hover:border-blue-400 transition shadow-2xs group"
                  >
                    {/* Logo with verified badge */}
                    <div className="relative mb-2.5">
                      {vendor.iconType === 'letter' ? (
                        <div className="w-14 h-14 rounded-full bg-[#0052cc] text-white flex items-center justify-center text-xl font-black shadow-xs">
                          {vendor.logoLetter}
                        </div>
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-2xs ${vendor.bg}`}
                        >
                          {vendor.icon}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Shop Info */}
                    <div className="space-y-1 w-full">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {vendor.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">{vendor.category}</p>

                      <div className="flex items-center justify-center gap-1 text-[10px] text-amber-500 pt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-700">{vendor.rating}</span>
                        <span className="text-slate-400">({vendor.reviews})</span>
                      </div>

                      {/* Product count */}
                      <div className="pt-1">
                        <span className="inline-block text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                          📦 {vendor.productCount}
                        </span>
                      </div>
                    </div>

                    {/* Visit Shop Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedVendorStore({ id: vendor.id, name: vendor.name })
                      }
                      className="mt-3 w-full py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center justify-center gap-1 group-hover:bg-blue-700"
                    >
                      <span>শপ দেখুন</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 4. 📈 ট্রেন্ডিং পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-purple-200 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        ট্রেন্ডিং পণ্য
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-purple-200 text-purple-700 hidden xs:inline shadow-2xs">
                        বেশি বিক্রিত
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      এই মুহূর্তে সবচেয়ে বেশি বিক্রি ও অনুসন্ধানে থাকা পণ্যসমূহ
                    </p>
                  </div>
                </div>

                {/* Desktop scroll arrows */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollHorizontally(trendingScrollRef, 'left')}
                    className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                    title="আগেরগুলো"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollHorizontally(trendingScrollRef, 'right')}
                    className="hidden sm:inline-flex p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
                    title="পরেরগুলো"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('marketplace-all-products');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <span>সব দেখুন</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrolling Product Cards */}
              <div
                ref={trendingScrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 pt-0.5 scroll-smooth"
              >
                {trendingProducts.map((prod, idx) => (
                  <div key={prod.id} className="w-44 sm:w-52 shrink-0">
                    <MarketplaceProductCard
                      product={prod}
                      onAddToCart={(p, e) => {
                        e.stopPropagation();
                        addToCart(p, 1);
                      }}
                      onClick={() => setSelectedProduct(prod)}
                      isWishlisted={wishlistIds.includes(prod.id)}
                      onToggleWishlist={(id, e) => {
                        e.stopPropagation();
                        handleToggleWishlist(id);
                      }}
                      badgeText={`#${idx + 1} ট্রেন্ডিং`}
                      badgeBg="bg-purple-600"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. 🎁 বিশেষ অফার (Promotional Banner) */}
            {/* ========================================================================= */}
            <section className="pt-2">
              <div className="relative rounded-2xl overflow-hidden bg-white text-slate-800 p-5 sm:p-7 shadow-xs border-2 border-[#0052cc]/30 flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="relative z-10 space-y-2 max-w-xl text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[11px] font-black tracking-wide border border-amber-300 text-amber-700 shadow-2xs">
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>বিশেষ মেগা অফার ২০২৫</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight tracking-tight text-[#0052cc]">
                    সারা বাংলাদেশে ফ্রি ডেলিভারি + সর্বোচ্চ ৩০% ছাড়!
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    TWING Marketplace-এ কেনাকাটা করুন নিশ্চিন্তে। প্রথম অর্ডারে কুপন কোড ব্যবহার করে উপভোগ করুন বিশেষ ছাড়।
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {/* Copyable Coupon Badge */}
                    <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-dashed border-[#0052cc] shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">ভাউচার কোড:</span>
                      <span className="font-mono font-black text-xs text-[#0052cc] tracking-wider">
                        TWINGFREE
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('TWINGFREE');
                          showToast('🎉 কুপন কোড TWINGFREE কপি করা হয়েছে!');
                        }}
                        className="p-1 hover:bg-slate-100 rounded-md transition text-slate-600"
                        title="কপি করুন"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('marketplace-all-products');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-5 py-2 bg-[#0052cc] hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>এখনই অফার উপভোগ করুন</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right Illustration */}
                <div className="relative z-10 shrink-0 w-32 sm:w-44 md:w-52 flex items-center justify-center">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white flex items-center justify-center p-1">
                    <img
                      src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                      alt="TWING Mega Offer"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 6. ⭐ আপনার জন্য নির্বাচিত */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        আপনার জন্য নির্বাচিত
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-800 hidden xs:inline shadow-2xs">
                        স্মার্ট রিকমেন্ডেশন
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      আপনার ব্রাউজিং ও পছন্দের ওপর ভিত্তি করে সেরা বাছাই
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {recommendedProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="⭐ রিকমেন্ডেড"
                    badgeBg="bg-[#0052cc]"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 7. 🆕 নতুন পণ্য */}
            {/* ========================================================================= */}
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-teal-200 text-teal-700 flex items-center justify-center font-bold shadow-2xs">
                    <Zap className="w-4 h-4 fill-teal-600 text-teal-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        নতুন পণ্য
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-teal-200 text-teal-800 hidden xs:inline shadow-2xs">
                        সদ্য যুক্ত
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      মার্কেটপ্লেসে সদ্য পাবলিশ হওয়া নতুন ও আধুনিক পণ্যসমূহ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('marketplace-all-products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold text-[#0052cc] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Column Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {newArrivalProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                    badgeText="🆕 নতুন"
                    badgeBg="bg-teal-600"
                  />
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* 8. 🛒 সব পণ্য (2-column responsive grid with Load More) */}
            {/* ========================================================================= */}
            <section id="marketplace-all-products" className="space-y-3.5 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      সব পণ্য
                    </h2>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      মার্কেটপ্লেসের সমস্ত ক্যাটাগরি ও শীর্ষ ভেন্ডরদের পূর্ণাঙ্গ কালেকশন
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  মোট {filteredAllProducts.length} টি পণ্য পাওয়া গেছে
                </div>
              </div>

              {/* Category Quick Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: 'সব পণ্য' },
                  { id: 'মোবাইল ও এক্সেসরিজ', label: 'মোবাইল' },
                  { id: 'কম্পিউটার ও গ্যাজেট', label: 'গ্যাজেট' },
                  { id: 'ফ্যাশন ও পোশাক', label: 'ফ্যাশন' },
                  { id: 'গৃহস্থালী পণ্য', label: 'গৃহস্থালী' },
                  { id: 'বিউটি ও পার্সোনাল কেয়ার', label: 'বিউটি' },
                  { id: 'স্বাস্থ্য ও ফার্মেসি', label: 'স্বাস্থ্য' },
                  { id: 'কিচেন ও ডাইনিং', label: 'কিচেন' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setAllProductsCategory(chip.id);
                      setAllProductsVisibleCount(8);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                      allProductsCategory === chip.id
                        ? 'bg-[#0052cc] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* 2-Column Responsive Product Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {displayedAllProducts.map((prod) => (
                  <MarketplaceProductCard
                    key={prod.id}
                    product={prod}
                    onAddToCart={(p, e) => {
                      e.stopPropagation();
                      addToCart(p, 1);
                    }}
                    onClick={() => setSelectedProduct(prod)}
                    isWishlisted={wishlistIds.includes(prod.id)}
                    onToggleWishlist={(id, e) => {
                      e.stopPropagation();
                      handleToggleWishlist(id);
                    }}
                  />
                ))}
              </div>

              {/* Load More Button */}
              <div className="pt-4 flex flex-col items-center justify-center gap-2">
                {displayedAllProducts.length < filteredAllProducts.length ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 bg-white hover:bg-slate-50 text-[#0052cc] border border-blue-200 hover:border-[#0052cc] font-black text-xs sm:text-sm rounded-2xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
                    <span>
                      {isLoadingMore
                        ? 'লোড হচ্ছে...'
                        : `আরও পণ্য দেখুন / Load More (${displayedAllProducts.length}/${filteredAllProducts.length})`}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-2xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>সব পণ্য প্রদর্শিত হয়েছে ({filteredAllProducts.length} টি পণ্য)</span>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile-Only Trust & Service Cards + Vendor CTA after Section 8 */}
            <div className="lg:hidden pt-4 space-y-3">
              {/* Trust Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">দ্রুত ডেলিভারি</div>
                    <div className="text-[9px] text-slate-500">সারা বাংলাদেশে</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">নিরাপদ লেনদেন</div>
                    <div className="text-[9px] text-slate-500">১০০% ক্যাশ অন ডেলিভারি</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0052cc] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">বিশ্বস্ত ভেন্ডর</div>
                    <div className="text-[9px] text-slate-500">যাচাইকৃত আসল পণ্য</div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">২৪/৭ সাপোর্ট</div>
                    <div className="text-[9px] text-slate-500">সহায়তায় সবসময়</div>
                  </div>
                </div>
              </div>

              {/* Vendor Registration Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    আপনিও কি ভেন্ডর হতে চান?
                  </h4>
                  <p className="text-[10px] text-slate-600">
                    আপনার পণ্য TWING Marketplace-এ প্রকাশ করুন ও ব্যবসা বৃদ্ধি করুন।
                  </p>
                  <button
                    type="button"
                    onClick={onMerchantLogin || onBackToDashboard}
                    className="mt-1 px-3 py-1 bg-[#0052cc] hover:bg-blue-700 text-white text-[11px] font-black rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>ভেন্ডার হিসেবে যোগ দিন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                  <img
                    src="/src/assets/images/marketplace_courier_vendor_1791135724375.jpg"
                    alt="TWING Courier"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 6. PROFESSIONAL WHITE FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white text-slate-700 pt-10 pb-20 sm:pb-6 border-t border-slate-200 text-xs mt-8 shadow-2xs">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-8">
            {/* Col 1: Brand */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#0052cc] flex items-center justify-center font-black shadow-2xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base font-black text-[#0052cc]">TWING</div>
                  <div className="text-[10px] font-black text-orange-600 -mt-1">Marketplace</div>
                </div>
              </div>
              <p className="text-slate-500 text-xs">সবাইয়ের জন্য, সবার পছন্দ</p>
            </div>

            {/* Col 2: দ্রুত লিংক */}
            <div className="space-y-2">
              <h4 className="text-slate-900 font-bold text-xs">দ্রুত লিংক</h4>
              <ul className="space-y-1.5 text-slate-600 text-xs">
                <li className="hover:text-[#0052cc] cursor-pointer" onClick={() => setNavTab('home')}>হোম</li>
                <li className="hover:text-[#0052cc] cursor-pointer" onClick={() => setNavTab('vendors')}>সকল ভেন্ডর</li>
                <li className="hover:text-[#0052cc] cursor-pointer" onClick={() => setNavTab('orders')}>আমার অর্ডার</li>
                <li className="hover:text-[#0052cc] cursor-pointer" onClick={() => setIsSupportOpen(true)}>সাহায্য কেন্দ্র</li>
              </ul>
            </div>

            {/* Col 3: কাস্টমার সাপোর্ট */}
            <div className="space-y-2">
              <h4 className="text-slate-900 font-bold text-xs">কাস্টমার সাপোর্ট</h4>
              <ul className="space-y-1.5 text-slate-600 text-xs">
                <li className="hover:text-[#0052cc] cursor-pointer" onClick={() => setIsSupportOpen(true)}>যোগাযোগ</li>
                <li className="hover:text-[#0052cc] cursor-pointer">রিটার্ন পলিসি</li>
                <li className="hover:text-[#0052cc] cursor-pointer">প্রাইভেসি পলিসি</li>
                <li className="hover:text-[#0052cc] cursor-pointer">ব্যবহার শর্তাবলী</li>
              </ul>
            </div>

            {/* Col 4: আমাদের সম্পর্কে */}
            <div className="space-y-2">
              <h4 className="text-slate-900 font-bold text-xs">আমাদের সম্পর্কে</h4>
              <ul className="space-y-1.5 text-slate-600 text-xs">
                <li className="hover:text-[#0052cc] cursor-pointer">আমাদের সম্পর্কে</li>
                <li className="hover:text-[#0052cc] cursor-pointer">ক্যারিয়ার</li>
                <li className="hover:text-[#0052cc] cursor-pointer">ব্লগ</li>
                <li className="hover:text-[#0052cc] cursor-pointer">যোগাযোগ</li>
              </ul>
            </div>

            {/* Col 5: সোশ্যাল মিডিয়া ও নিউজলেটার */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <h4 className="text-slate-900 font-bold text-xs">সোশ্যাল মিডিয়া</h4>
                <div className="flex items-center gap-2">
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#1877f2] text-white flex items-center justify-center font-bold text-xs">
                    f
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#ff0000] text-white flex items-center justify-center font-bold text-xs">
                    ▶
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    d
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#e1306c] text-white flex items-center justify-center font-bold text-xs">
                    📷
                  </a>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-600 font-medium">নিউজলেটার সাবস্ক্রাইব</label>
                <div className="flex gap-1">
                  <input
                    type="email"
                    placeholder="আপনার ইমেইল লিখুন"
                    className="w-full px-2.5 py-1.5 bg-white text-slate-800 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-[#0052cc]"
                  />
                  <button
                    type="button"
                    onClick={() => showToast('ধন্যবাদ! নিউজলেটার সাবস্ক্রিপশন সম্পন্ন হয়েছে।')}
                    className="px-3 py-1.5 bg-[#0052cc] hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div>© ২০২৫ TWING Marketplace. সর্বস্বত্ব সংরক্ষিত।</div>
            <div>Made with ❤️ in Bangladesh 🇧🇩</div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 7. FIXED MOBILE BOTTOM NAVIGATION */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('home');
            setNavTab('home');
            setSelectedCategory('all');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition ${
            mobileBottomTab === 'home' && navTab === 'home' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px]">হোম</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('categories');
            const el = document.getElementById('marketplace-offers-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition ${
            mobileBottomTab === 'categories' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">📂</span>
          <span className="text-[10px]">ক্যাটাগরি</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-xl text-slate-500 relative"
        >
          <span className="text-lg">🛒</span>
          <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
            {cartItemCount || 2}
          </span>
          <span className="text-[10px]">কার্ট</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileBottomTab('orders');
            setNavTab('orders');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition ${
            navTab === 'orders' ? 'text-[#0052cc] font-black' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px]">আমার অর্ডার</span>
        </button>

        <button
          type="button"
          onClick={onMerchantLogin || onBackToDashboard}
          className="flex flex-col items-center gap-0.5 p-1 rounded-xl text-slate-500"
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px]">আমার অ্যাকাউন্ট</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 8. MODALS & DRAWERS */}
      {/* ========================================================================= */}
      {/* Product Details Modal */}
      <MarketplaceProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        onBuyNow={handleBuyNow}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onVisitVendor={(vId, vName) => {
          setSelectedProduct(null);
          setSelectedVendorStore({ id: vId, name: vName });
        }}
        relatedProducts={EXACT_SHOWCASE_PRODUCTS.filter((p) => p.id !== selectedProduct?.id)}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Vendor Store Modal */}
      <MarketplaceVendorStoreModal
        vendorId={selectedVendorStore?.id || null}
        vendorName={selectedVendorStore?.name || ''}
        isOpen={Boolean(selectedVendorStore)}
        onClose={() => setSelectedVendorStore(null)}
        products={EXACT_SHOWCASE_PRODUCTS}
        onAddToCart={addToCart}
        onViewProduct={(p) => setSelectedProduct(p)}
        wishlistIds={wishlistIds}
        onToggleWishlist={handleToggleWishlist}
      />

      {/* Multi-Vendor Cart & Checkout Drawer */}
      <MarketplaceCartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveFromCart={removeFromCart}
        onClearCart={() => setCart([])}
        onOrderSuccess={(ord) => {
          setCustomerOrders((prev) => [ord, ...prev]);
        }}
        onOpenTracking={(ordNum) => {
          setNavTab('orders');
          setTrackingSearchQuery(ordNum);
          handleTrackOrder(undefined, ordNum);
        }}
        paymentSettings={paymentSettings}
      />

      {/* Notifications Drawer */}
      <StorefrontNotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Support Drawer */}
      <StorefrontSupportDrawer
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        config={supportConfig}
      />
    </div>
  );
};
export default CentralMarketplacePage;
