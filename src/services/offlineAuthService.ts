/**
 * Offline Authentication & Local Credentials Vault
 * Provides secure client-side PIN hashing and user session verification without storing plain text PINs.
 */

import { normalizePhoneNumber } from '../utils/storage';

interface OfflineCredentialRecord {
  userId: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  shopName: string;
  name: string;
  role: string;
  salt: string;
  pinHash: string; // SHA-256 salted hash
  userData: any;
  lastLoginAt: number;
}

const OFFLINE_CREDENTIALS_KEY = 'twing_offline_credentials_vault_v1';

/**
 * Generates a random cryptographic salt
 */
function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Computes a salted SHA-256 hash using the Web Crypto API with fallback
 */
export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const combined = `twing_salt_${salt}_pin_${pin.trim()}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }

  // Pure JS DJB2/FNV-1a 64-bit hash fallback if crypto.subtle is restricted in iframe/HTTP
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Retrieves all stored offline credentials
 */
export function getOfflineCredentialsList(): OfflineCredentialRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_CREDENTIALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading offline credentials:', e);
    return [];
  }
}

/**
 * Stores or updates a user's offline credential hash upon online login/registration
 */
export async function saveOfflineCredential(user: any, rawPin: string): Promise<void> {
  if (!user || !user.id || !rawPin) return;

  try {
    const cleanPhone = (user.phone || '').trim();
    const normPhone = normalizePhoneNumber(cleanPhone);
    const salt = generateSalt();
    const pinHash = await hashPinWithSalt(rawPin, salt);

    const record: OfflineCredentialRecord = {
      userId: user.id,
      phone: cleanPhone,
      normalizedPhone: normPhone,
      email: (user.email || '').trim().toLowerCase(),
      shopName: user.shopName || user.shop_name || 'আমার দোকান',
      name: user.name || 'দোকানদার',
      role: user.role || 'user',
      salt,
      pinHash,
      userData: {
        id: user.id,
        name: user.name,
        phone: cleanPhone,
        email: user.email,
        shopName: user.shopName || user.shop_name,
        role: user.role || 'user',
        subscriptionPlan: user.subscriptionPlan || 'ফ্রি ট্রায়াল (১৪ দিন)',
        subscriptionStatus: user.subscriptionStatus || 'trial',
        subscriptionExpiresAt: user.subscriptionExpiresAt || Date.now() + 14 * 86400000,
      },
      lastLoginAt: Date.now(),
    };

    const list = getOfflineCredentialsList();
    const existingIndex = list.findIndex(
      (c) =>
        c.userId === user.id ||
        (normPhone && c.normalizedPhone && normPhone === c.normalizedPhone) ||
        (user.email && c.email === user.email.toLowerCase())
    );

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }

    localStorage.setItem(OFFLINE_CREDENTIALS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save offline credential:', err);
  }
}

/**
 * Verifies offline login using Phone/Identifier + PIN
 */
export async function verifyOfflinePinLogin(
  identifier: string,
  rawPin: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  const cleanIdent = identifier.trim().toLowerCase();
  const normPhone = normalizePhoneNumber(cleanIdent);

  if (!cleanIdent || !rawPin) {
    return { success: false, error: 'মোবাইল নম্বর ও গোপন পিন দিন' };
  }

  const list = getOfflineCredentialsList();
  if (list.length === 0) {
    return {
      success: false,
      error: 'এই ডিভাইসে পূর্বে কোনো অ্যাকাউন্ট লগইন করা হয়নি। প্রথমবারের জন্য ইন্টারনেট সংযোগ দিয়ে লগইন করুন।',
    };
  }

  const matchedRecord = list.find((c) => {
    if (normPhone && c.normalizedPhone && normPhone.length >= 6 && c.normalizedPhone.endsWith(normPhone.slice(-10))) {
      return true;
    }
    if (c.email && c.email.toLowerCase() === cleanIdent) {
      return true;
    }
    if (c.userId === identifier.trim()) {
      return true;
    }
    return false;
  });

  if (!matchedRecord) {
    return {
      success: false,
      error: 'এই মোবাইল নম্বর দিয়ে এই ডিভাইসে কোনো সংরক্ষিত অফলাইন খাতা পাওয়া যায়নি।',
    };
  }

  const computedHash = await hashPinWithSalt(rawPin, matchedRecord.salt);
  if (computedHash !== matchedRecord.pinHash) {
    return {
      success: false,
      error: '❌ ভুল গোপন পিন কোড! সঠিক পিন প্রদান করুন।',
    };
  }

  // Update last login
  matchedRecord.lastLoginAt = Date.now();
  localStorage.setItem(OFFLINE_CREDENTIALS_KEY, JSON.stringify(list));

  return {
    success: true,
    user: matchedRecord.userData,
  };
}
