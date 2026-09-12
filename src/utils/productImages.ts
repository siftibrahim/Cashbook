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
  const q = `${name || ''} ${category || ''}`.toLowerCase();
  if (q.includes('চাল') || q.includes('rice')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('তেল') || q.includes('oil') || q.includes('ঘি')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('ডাল') || q.includes('lentil') || q.includes('ছোলা')) {
    return 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('চিনি') || q.includes('sugar') || q.includes('মিষ্টি')) {
    return 'https://images.unsplash.com/photo-1622484216805-4c070b435ee9?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('লবণ') || q.includes('salt')) {
    return 'https://images.unsplash.com/photo-1626197031507-c17099753214?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('চা') || q.includes('tea') || q.includes('কফি')) {
    return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('বিস্কুট') || q.includes('biscuit') || q.includes('কুকিজ') || q.includes('কেক')) {
    return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('সাবান') || q.includes('soap') || q.includes('শ্যাম্পু') || q.includes('প্রসাধন')) {
    return 'https://images.unsplash.com/photo-1607006314144-88481358dbb7?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('আটা') || q.includes('ময়দা') || q.includes('সুজি')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80';
  }
  if (q.includes('পোশাক') || q.includes('শাড়ি') || q.includes('শার্ট') || q.includes('পাঞ্জাবি') || q.includes('কাপড়')) {
    return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&auto=format&fit=crop&q=80';
  }
  // Default crisp product pack image
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
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
