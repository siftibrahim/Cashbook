/**
 * Security Service - Cryptographic utilities, rate limiting, and session security
 */

const RATE_LIMIT_STORAGE_KEY = 'ibrahim_security_login_attempts_v1';
const OTP_STORAGE_KEY = 'ibrahim_security_otp_records_v1';
const SALT = 'khata_app_secure_salt_2026_';

// Configuration
export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout
  OTP_VALIDITY_MS: 10 * 60 * 1000, // 10 minutes OTP validity
};

export interface LoginAttemptRecord {
  identifier: string;
  failedCount: number;
  lockedUntil?: number;
  lastAttemptAt: number;
}

export interface OtpRecord {
  id: string;
  emailOrPhone: string;
  token: string;
  expiresAt: number;
  isUsed: boolean;
  purpose: 'password_reset' | 'admin_verification';
}

/**
 * Hash a password using SHA-256 with salt via Web Crypto API
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(SALT + plainPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple deterministic hash if crypto.subtle is unavailable
    let hash = 0;
    const str = SALT + plainPassword;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

/**
 * Verify a plain password against a stored hash or legacy plain string
 */
export async function verifyPassword(plainPassword: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainPassword || !storedHashOrPlain) return false;
  
  // If stored value is already a hashed string
  const computedHash = await hashPassword(plainPassword);
  if (computedHash === storedHashOrPlain) {
    return true;
  }

  // Backwards compatibility for existing legacy plain text passwords
  if (plainPassword === storedHashOrPlain) {
    return true;
  }

  return false;
}

/**
 * Check if an identifier (email, phone, username) is currently locked out
 */
export function checkLoginRateLimit(identifier: string): { isLocked: boolean; remainingMinutes: number; remainingSeconds: number; attemptsLeft: number } {
  if (!identifier) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
  }

  const cleanId = identifier.trim().toLowerCase();
  const records = getAttemptRecords();
  const record = records[cleanId];

  if (!record) {
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
  }

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    return {
      isLocked: true,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
      remainingSeconds: Math.ceil(remainingMs / 1000),
      attemptsLeft: 0,
    };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    delete records[cleanId];
    saveAttemptRecords(records);
    return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0, attemptsLeft: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
  }

  const attemptsLeft = Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - record.failedCount);
  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    attemptsLeft,
  };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLoginAttempt(identifier: string): { isLockedNow: boolean; remainingMinutes: number; attemptsLeft: number } {
  const cleanId = identifier.trim().toLowerCase();
  const records = getAttemptRecords();
  const now = Date.now();

  const record: LoginAttemptRecord = records[cleanId] || {
    identifier: cleanId,
    failedCount: 0,
    lastAttemptAt: now,
  };

  record.failedCount += 1;
  record.lastAttemptAt = now;

  let isLockedNow = false;
  let remainingMinutes = 0;

  if (record.failedCount >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + SECURITY_CONFIG.LOCKOUT_DURATION_MS;
    isLockedNow = true;
    remainingMinutes = Math.ceil(SECURITY_CONFIG.LOCKOUT_DURATION_MS / (60 * 1000));
  }

  records[cleanId] = record;
  saveAttemptRecords(records);

  const attemptsLeft = Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - record.failedCount);
  return { isLockedNow, remainingMinutes, attemptsLeft };
}

/**
 * Clear login attempts upon successful authentication
 */
export function clearLoginAttempts(identifier: string): void {
  const cleanId = identifier.trim().toLowerCase();
  const records = getAttemptRecords();
  if (records[cleanId]) {
    delete records[cleanId];
    saveAttemptRecords(records);
  }
}

// Helpers for attempt storage
function getAttemptRecords(): Record<string, LoginAttemptRecord> {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveAttemptRecords(records: Record<string, LoginAttemptRecord>): void {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save rate limit records', e);
  }
}

/**
 * Generate a 6-digit secure OTP for password reset or phone verification
 */
export function generateSecureOtp(emailOrPhone: string, purpose: 'password_reset' | 'admin_verification' = 'password_reset'): { otp: string; expiresAt: number } {
  const cleanKey = emailOrPhone.trim().toLowerCase();
  // Generate cryptographically random 6 digits
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (100000 + (array[0] % 900000)).toString();
  const expiresAt = Date.now() + SECURITY_CONFIG.OTP_VALIDITY_MS;

  const records = getOtpRecords();
  records[cleanKey] = {
    id: 'otp_' + Date.now(),
    emailOrPhone: cleanKey,
    token: otp,
    expiresAt,
    isUsed: false,
    purpose,
  };
  saveOtpRecords(records);

  return { otp, expiresAt };
}

/**
 * Verify a submitted OTP
 */
export function verifySubmittedOtp(emailOrPhone: string, submittedOtp: string): { isValid: boolean; error?: string } {
  const cleanKey = emailOrPhone.trim().toLowerCase();
  const cleanOtp = submittedOtp.trim();

  const records = getOtpRecords();
  const record = records[cleanKey];

  if (!record) {
    return { isValid: false, error: 'কোনো ওটিপি কোড পাঠানো হয়নি বা মেয়াদোত্তীর্ণ হয়েছে।' };
  }

  if (record.isUsed) {
    return { isValid: false, error: 'এই ওটিপি কোডটি ইতিমধ্যে ব্যবহার করা হয়েছে।' };
  }

  if (Date.now() > record.expiresAt) {
    delete records[cleanKey];
    saveOtpRecords(records);
    return { isValid: false, error: 'ওটিপি কোডের মেয়াদ (১০ মিনিট) শেষ হয়েছে। নতুন কোড রিকোয়েস্ট করুন।' };
  }

  if (record.token !== cleanOtp) {
    return { isValid: false, error: 'ভুল ওটিপি কোড! অনুগ্রহ করে সঠিক ৬ ডিজিটের কোড দিন।' };
  }

  // Mark as used
  record.isUsed = true;
  records[cleanKey] = record;
  saveOtpRecords(records);

  return { isValid: true };
}

function getOtpRecords(): Record<string, OtpRecord> {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveOtpRecords(records: Record<string, OtpRecord>): void {
  try {
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save OTP records', e);
  }
}

/**
 * Sanitize strings to prevent XSS / malicious injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .trim();
}
