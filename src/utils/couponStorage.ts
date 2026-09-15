import { Coupon } from '../types';

export const DEFAULT_STORE_COUPONS: Coupon[] = [
  {
    id: 'cpn_welcome10',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 300,
    maxDiscount: 100,
    isActive: true,
  },
  {
    id: 'cpn_save50',
    code: 'SAVE50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 500,
    isActive: true,
  },
  {
    id: 'cpn_eid2026',
    code: 'EID2026',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 800,
    maxDiscount: 200,
    isActive: true,
  },
];

export interface CouponValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  coupon?: Coupon;
}

export function validateAndApplyCoupon(
  code: string,
  orderSubtotal: number,
  customCoupons: Coupon[] = []
): CouponValidationResult {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { isValid: false, message: 'কুপন কোড লিখুন', discountAmount: 0 };
  }

  const allCoupons = [...customCoupons, ...DEFAULT_STORE_COUPONS];
  const matched = allCoupons.find(
    (c) => c.code.toUpperCase() === cleanCode && c.isActive !== false
  );

  if (!matched) {
    return {
      isValid: false,
      message: 'ভুল বা মেয়াদোত্তীর্ণ কুপন কোড। অনুগ্রহ করে সঠিক কোড দিন।',
      discountAmount: 0,
    };
  }

  if (matched.minOrderAmount && orderSubtotal < matched.minOrderAmount) {
    return {
      isValid: false,
      message: `এই কুপনটি ব্যবহার করতে সর্বনিম্ন ৳ ${matched.minOrderAmount} এর অর্ডার করতে হবে।`,
      discountAmount: 0,
    };
  }

  let discount = 0;
  if (matched.discountType === 'percentage') {
    discount = Math.round((orderSubtotal * matched.discountValue) / 100);
    if (matched.maxDiscount && discount > matched.maxDiscount) {
      discount = matched.maxDiscount;
    }
  } else {
    discount = matched.discountValue;
  }

  // Discount cannot exceed subtotal
  discount = Math.min(discount, orderSubtotal);

  return {
    isValid: true,
    message: `অভিনন্দন! কুপন "${matched.code}" সফলভাবে যুক্ত হয়েছে। ৳ ${discount} ছাড় পাওয়া গেছে!`,
    discountAmount: discount,
    coupon: matched,
  };
}
