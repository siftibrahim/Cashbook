/**
 * Domain & Subdomain Resolution Utility
 * Provides deterministic tenant extraction, wildcard subdomain routing,
 * and security validation for twinghisabi.site and custom domains.
 */

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'admin',
  'api',
  'dashboard',
  'mail',
  'cname',
  'ns1',
  'ns2',
  'smtp',
  'ftp',
  'status',
  'auth',
  'login',
  'billing',
  'cdn',
  'assets',
  'static',
  'cloud',
  'portal',
  'store',
  'shop',
  'root',
  'public',
  'dev',
  'staging',
  'test',
]);

export interface HostInfo {
  rawHost: string;
  cleanHost: string;
  isSubdomain: boolean;
  slug: string | null;
  isCustomDomain: boolean;
  isRootDomain: boolean;
  baseDomain: string;
}

/**
 * Strips protocol, port, and trailing path from a host or domain string
 */
export function cleanDomainString(domain: string): string {
  if (!domain) return '';
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, ''); // Remove port e.g. :3000
}

/**
 * Validates a store slug for format, length, and reserved keywords
 */
export function validateStoreSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'সাব-ডোমেন বা স্লাগ খালি রাখা যাবে না।' };
  }

  const clean = slug.toLowerCase().trim();

  if (clean.length < 3) {
    return { valid: false, error: 'সাব-ডোমেন নামটি কমপক্ষে ৩ অক্ষরের হতে হবে।' };
  }

  if (clean.length > 60) {
    return { valid: false, error: 'সাব-ডোমেন নামটি সর্বোচ্চ ৬০ অক্ষরের হতে পারে।' };
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(clean)) {
    return {
      valid: false,
      error: 'সাব-ডোমেনে শুধুমাত্র ছোট হাতের ইংরেজি অক্ষর (a-z), সংখ্যা (0-9) এবং হাইফেন (-) ব্যবহার করা যাবে। শুরু বা শেষে হাইফেন গ্রহণযোগ্য নয়।',
    };
  }

  if (RESERVED_SUBDOMAINS.has(clean)) {
    return {
      valid: false,
      error: `"${clean}" নামটি সিস্টেমের জন্য সংরক্ষিত। অনুগ্রহ করে অন্য একটি ইউনিক নাম দিন (যেমন: ${clean}-shop বা my-${clean})।`,
    };
  }

  return { valid: true };
}

/**
 * Extracts subdomain / tenant slug and classification from an incoming Host or X-Forwarded-Host
 */
export function extractSubdomainFromHost(
  rawHost: string,
  baseDomain = process.env.STORE_BASE_DOMAIN || 'twinghisabi.site'
): HostInfo {
  const cleanHost = cleanDomainString(rawHost);
  const normalizedBase = cleanDomainString(baseDomain).toLowerCase();

  if (!cleanHost) {
    return {
      rawHost,
      cleanHost: '',
      isSubdomain: false,
      slug: null,
      isCustomDomain: false,
      isRootDomain: true,
      baseDomain: normalizedBase,
    };
  }

  // 1. Direct root or www of base domain
  if (cleanHost === normalizedBase || cleanHost === `www.${normalizedBase}`) {
    return {
      rawHost,
      cleanHost,
      isSubdomain: false,
      slug: null,
      isCustomDomain: false,
      isRootDomain: true,
      baseDomain: normalizedBase,
    };
  }

  // 2. Wildcard subdomain on base domain: e.g. tanjinhub.twinghisabi.site
  if (cleanHost.endsWith(`.${normalizedBase}`)) {
    const subPart = cleanHost.slice(0, -(normalizedBase.length + 1)).toLowerCase();
    // In case of multi-level like foo.bar.twinghisabi.site, take the innermost segment
    const slug = subPart.split('.')[0];
    if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
      return {
        rawHost,
        cleanHost,
        isSubdomain: true,
        slug,
        isCustomDomain: false,
        isRootDomain: false,
        baseDomain: normalizedBase,
      };
    }
    // Reserved subdomain (e.g. app.twinghisabi.site, api.twinghisabi.site)
    return {
      rawHost,
      cleanHost,
      isSubdomain: false,
      slug: null,
      isCustomDomain: false,
      isRootDomain: true,
      baseDomain: normalizedBase,
    };
  }

  // 3. Localhost & development wildcard testing:
  // e.g. tanjinhub.localhost, tanjinhub.lvh.me, tanjinhub.127.0.0.1.nip.io
  const isDevHost =
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.lvh.me') ||
    cleanHost.includes('.nip.io');

  if (isDevHost) {
    const slug = cleanHost.split('.')[0].toLowerCase();
    if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
      return {
        rawHost,
        cleanHost,
        isSubdomain: true,
        slug,
        isCustomDomain: false,
        isRootDomain: false,
        baseDomain: normalizedBase,
      };
    }
  }

  // 4. Platform hosts (Google Cloud Run preview, Render base preview, localhost root)
  const isPlatformHost =
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost.endsWith('googleusercontent.com') ||
    cleanHost.endsWith('run.app') ||
    cleanHost.endsWith('onrender.com');

  if (isPlatformHost) {
    return {
      rawHost,
      cleanHost,
      isSubdomain: false,
      slug: null,
      isCustomDomain: false,
      isRootDomain: true,
      baseDomain: normalizedBase,
    };
  }

  // 5. External Custom Domain: e.g. myshopbd.com, fashionhouse.com
  if (cleanHost.includes('.')) {
    return {
      rawHost,
      cleanHost,
      isSubdomain: false,
      slug: null,
      isCustomDomain: true,
      isRootDomain: false,
      baseDomain: normalizedBase,
    };
  }

  return {
    rawHost,
    cleanHost,
    isSubdomain: false,
    slug: null,
    isCustomDomain: false,
    isRootDomain: true,
    baseDomain: normalizedBase,
  };
}
