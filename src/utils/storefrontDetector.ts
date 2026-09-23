/**
 * Storefront Context Detection
 * Provides deterministic tenant extraction and routing for vendor public storefronts.
 * 
 * Hierarchy:
 * 1. Merchant Admin/Login Bypass (/admin, /login, ?admin=1)
 * 2. Wildcard Subdomain: https://[vendor-slug].twinghisabi.site (Canonical Public URL)
 * 3. Verified Custom Domain: https://[mybrand.com]
 * 4. Path-based route: /shop/[vendor-slug] or /store/[vendor-slug]
 * 5. Query Parameter Fallback (internal/dev only on root domain): ?shop=[vendor-slug]
 */

export const RESERVED_STORE_SUBDOMAINS = new Set([
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
  'root',
  'public',
  'dev',
  'staging',
  'test',
]);

export interface StoreContextResult {
  isPublicStore: boolean;
  storeIdentifier?: string;
  source?: 'subdomain' | 'custom_domain' | 'path' | 'query' | 'preview';
}

/**
 * Extracts vendor slug from a hostname if it represents a valid subdomain
 */
export function extractSubdomainFromHostname(
  hostname: string,
  baseDomain = 'twinghisabi.site'
): string | null {
  if (!hostname) return null;
  const host = hostname.toLowerCase().trim().replace(/:\d+$/, '');
  const base = baseDomain.toLowerCase().trim();

  // Root or www of base domain -> not a vendor subdomain
  if (host === base || host === `www.${base}`) {
    return null;
  }

  // Subdomain on base domain: e.g. tanjinhub.twinghisabi.site
  if (host.endsWith(`.${base}`)) {
    const subPart = host.slice(0, -(base.length + 1));
    const slug = subPart.split('.')[0];
    if (slug && !RESERVED_STORE_SUBDOMAINS.has(slug)) {
      return slug;
    }
    return null;
  }

  // Local development wildcard testing: e.g. tanjinhub.localhost or tanjinhub.lvh.me
  if (host.endsWith('.localhost') || host.endsWith('.lvh.me') || host.includes('.nip.io')) {
    const slug = host.split('.')[0];
    if (slug && !RESERVED_STORE_SUBDOMAINS.has(slug)) {
      return slug;
    }
  }

  return null;
}

export function detectPublicStoreContext(): StoreContextResult {
  if (typeof window === 'undefined') {
    return { isPublicStore: false };
  }

  const hostname = window.location.hostname.toLowerCase().replace(/:\d+$/, '');
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const pathname = window.location.pathname.toLowerCase();

  // 1. If merchant explicitly accesses admin/login portal, bypass public store view
  if (
    params.get('admin') === '1' ||
    params.get('login') === '1' ||
    pathname === '/admin' ||
    pathname === '/login' ||
    pathname.startsWith('/admin/')
  ) {
    return { isPublicStore: false };
  }

  // 2. PRIMARY CANONICAL RESOLUTION: Dynamic Wildcard Subdomain
  // e.g. https://tanjinhub.twinghisabi.site
  const subdomainSlug = extractSubdomainFromHostname(hostname);
  if (subdomainSlug) {
    // Tenant Isolation: on a vendor subdomain, query parameters CANNOT override the vendor!
    return {
      isPublicStore: true,
      storeIdentifier: subdomainSlug,
      source: 'subdomain',
    };
  }

  // 3. Custom Domain (e.g. www.myshopbd.com or myshopbd.com)
  const isPlatformHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('googleusercontent.com') ||
    hostname.endsWith('run.app') ||
    hostname.endsWith('onrender.com') ||
    hostname === 'twinghisabi.site' ||
    hostname === 'www.twinghisabi.site' ||
    hostname === 'app.twinghisabi.site';

  if (!isPlatformHost && hostname.includes('.')) {
    return {
      isPublicStore: true,
      storeIdentifier: hostname,
      source: 'custom_domain',
    };
  }

  // 4. Path-based routing: /shop/tanjinhub or /store/tanjinhub
  if (pathname.startsWith('/shop/') || pathname.startsWith('/store/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[1]) {
      return {
        isPublicStore: true,
        storeIdentifier: parts[1],
        source: 'path',
      };
    }
  }

  // 5. Query Parameter Fallback (internal/dev only on root domain or preview container)
  // e.g. https://twinghisabi.site/?shop=tanjinhub
  const queryTarget = params.get('shop') || params.get('store') || params.get('slug') || params.get('vendor');
  if (queryTarget && queryTarget !== '1' && queryTarget !== 'true' && queryTarget !== 'default') {
    return {
      isPublicStore: true,
      storeIdentifier: queryTarget,
      source: 'query',
    };
  }

  // 6. Explicit ?store=1 or ?storefront=1 flag (e.g. shared preview link)
  if (params.get('store') === '1' || params.get('storefront') === '1' || params.get('shop') === '1') {
    return {
      isPublicStore: true,
      storeIdentifier: undefined,
      source: 'preview',
    };
  }

  return { isPublicStore: false };
}

