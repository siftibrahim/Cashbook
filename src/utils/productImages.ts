// Product image presets, compression utility, and category-based fallbacks

export interface ProductPreset {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  unit?: string;
}

export const PRODUCT_IMAGE_PRESETS: ProductPreset[] = [
  {
    id: 'preset_rice',
    name: 'চাল (Rice)',
    category: 'চাল ও ডাল',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    unit: 'কেজি',
  },
  {
    id: 'preset_oil',
    name: 'সয়াবিন তেল (Cooking Oil)',
    category: 'তেল ও ঘি',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    unit: 'বোতল',
  },
  {
    id: 'preset_dal',
    name: 'মসুর ডাল (Lentils)',
    category: 'চাল ও ডাল',
    imageUrl: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=500&auto=format&fit=crop&q=80',
    unit: 'কেজি',
  },
  {
    id: 'preset_sugar',
    name: 'সাদা চিনি (Sugar)',
    category: 'চিনি ও লবণ',
    imageUrl: 'https://images.unsplash.com/photo-1622484216805-4c070b435ee9?w=500&auto=format&fit=crop&q=80',
    unit: 'কেজি',
  },
  {
    id: 'preset_salt',
    name: 'লবণ (Salt)',
    category: 'চিনি ও লবণ',
    imageUrl: 'https://images.unsplash.com/photo-1626197031507-c17099753214?w=500&auto=format&fit=crop&q=80',
    unit: 'প্যাকেট',
  },
  {
    id: 'preset_tea',
    name: 'চা পাতা (Tea)',
    category: 'চা ও বিস্কুট',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    unit: 'প্যাকেট',
  },
  {
    id: 'preset_biscuits',
    name: 'বিস্কুট ও কুকিজ (Biscuits)',
    category: 'চা ও বিস্কুট',
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
    unit: 'প্যাকেট',
  },
  {
    id: 'preset_soap',
    name: 'সাবান ও হ্যান্ডওয়াশ (Soap)',
    category: 'সাবান ও প্রসাধন',
    imageUrl: 'https://images.unsplash.com/photo-1607006314144-88481358dbb7?w=500&auto=format&fit=crop&q=80',
    unit: 'টি',
  },
  {
    id: 'preset_spices',
    name: 'মসলা (Spices)',
    category: 'অন্যান্য',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
    unit: 'প্যাকেট',
  },
  {
    id: 'preset_flour',
    name: 'আটা ও ময়দা (Flour)',
    category: 'চাল ও ডাল',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    unit: 'প্যাকেট',
  },
  {
    id: 'preset_drinks',
    name: 'কোল্ড ড্রিংকস ও জুস (Beverages)',
    category: 'অন্যান্য',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
    unit: 'বোতল',
  },
  {
    id: 'preset_fashion',
    name: 'পোশাক ও ফ্যাশন (Apparel)',
    category: 'অন্যান্য',
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&auto=format&fit=crop&q=80',
    unit: 'পিস',
  },
];

export function getFallbackProductImage(name?: string, category?: string): string {
  return getCatalogStudioImage(name, category);
}

/**
 * Returns pristine official e-commerce studio catalog image on pure white background
 */
export function getCatalogStudioImage(name?: string, category?: string): string {
  const q = `${name || ''} ${category || ''}`.toLowerCase();

  // Calculator / Electronic office devices
  if (q.includes('ক্যালকুলেটর') || q.includes('calculator') || q.includes('হিসাব') || q.includes('citizen') || q.includes('casio')) {
    return 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=85';
  }

  // Milk / Condensed Milk / Dairy
  if (q.includes('দুধ') || q.includes('milk') || q.includes('ক্যান') || q.includes('ডেইরি') || q.includes('কনডেন্সড')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&auto=format&fit=crop&q=85';
  }

  // Face masks & protective supplies
  if (q.includes('মাস্ক') || q.includes('mask') || q.includes('সার্জিক্যাল')) {
    return 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=800&auto=format&fit=crop&q=85';
  }

  // Rice
  if (q.includes('চাল') || q.includes('rice') || q.includes('মিনিকেট') || q.includes('নাজিরশাইল')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=85';
  }

  // Cooking Oil & Ghee
  if (q.includes('তেল') || q.includes('oil') || q.includes('ঘি') || q.includes('সয়াবিন') || q.includes('সরিষা')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&auto=format&fit=crop&q=85';
  }

  // Dal / Lentils
  if (q.includes('ডাল') || q.includes('lentil') || q.includes('ছোলা') || q.includes('মসুর')) {
    return 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=800&auto=format&fit=crop&q=85';
  }

  // Sugar
  if (q.includes('চিনি') || q.includes('sugar') || q.includes('মিষ্টি')) {
    return 'https://images.unsplash.com/photo-1622484216805-4c070b435ee9?w=800&auto=format&fit=crop&q=85';
  }

  // Salt
  if (q.includes('লবণ') || q.includes('salt')) {
    return 'https://images.unsplash.com/photo-1626197031507-c17099753214?w=800&auto=format&fit=crop&q=85';
  }

  // Tea & Coffee
  if (q.includes('চা') || q.includes('tea') || q.includes('কফি') || q.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=85';
  }

  // Biscuits & Cookies
  if (q.includes('বিস্কুট') || q.includes('biscuit') || q.includes('কুকিজ') || q.includes('কেক') || q.includes('cookies')) {
    return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=85';
  }

  // Watches & Gadgets
  if (q.includes('ঘড়ি') || q.includes('watch') || q.includes('স্মার্টওয়াচ')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=85';
  }

  // Headphones & Audio
  if (q.includes('হেডফোন') || q.includes('headphone') || q.includes('ইয়ারফোন') || q.includes('airpods') || q.includes('sound')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=85';
  }

  // Stationery / Pen / Notebook
  if (q.includes('কলম') || q.includes('pen') || q.includes('খাতা') || q.includes('নোটবুক') || q.includes('স্টেশনারি')) {
    return 'https://images.unsplash.com/photo-1585336261026-70e28fdf818e?w=800&auto=format&fit=crop&q=85';
  }

  // Skincare & Cosmetics
  if (q.includes('সিরাম') || q.includes('serum') || q.includes('ফেসওয়াশ') || q.includes('cleanser') || q.includes('ordinary')) {
    return 'https://images.unsplash.com/photo-1608248597359-54d9c79e6e8e?w=800&auto=format&fit=crop&q=85';
  }

  // Soap & Shampoo
  if (q.includes('সাবান') || q.includes('soap') || q.includes('শ্যাম্পু') || q.includes('shampoo') || q.includes('প্রসাধন')) {
    return 'https://images.unsplash.com/photo-1607006314144-88481358dbb7?w=800&auto=format&fit=crop&q=85';
  }

  // Fashion & Apparel
  if (q.includes('পোশাক') || q.includes('শাড়ি') || q.includes('শার্ট') || q.includes('পাঞ্জাবি') || q.includes('panjabi') || q.includes('কাপড়')) {
    return 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&auto=format&fit=crop&q=85';
  }

  // Flour / Atta
  if (q.includes('আটা') || q.includes('ময়দা') || q.includes('সুজি')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=85';
  }

  // Drinks & Beverages
  if (q.includes('জুস') || q.includes('juice') || q.includes('কোল্ড ড্রিংক') || q.includes('beverage')) {
    return 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=85';
  }

  // Default clean studio packshot
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=85';
}

/**
 * Compresses an image file from input element using off-screen HTML5 Canvas
 * Produces a lightweight, crisp Base64 JPEG data URL (~25-45 KB)
 */
export function compressProductImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('দয়া করে একটি সঠিক ছবি নির্বাচন করুন'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
