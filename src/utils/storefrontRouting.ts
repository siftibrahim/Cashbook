/**
 * Storefront Multi-Tenant Routing & URL Helper
 * Handles dynamic shop slug, custom domain, and vendor ID routing
 */

export interface StorefrontParams {
  isStorefront: boolean;
  shopSlug?: string;
  vendorId?: string;
  domain?: string;
  isOwnerPreview?: boolean;
}

export function parseStorefrontUrl(): StorefrontParams {
  if (typeof window === 'undefined') {
    return { isStorefront: false };
  }

  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const search = window.location.search;
  const params = new URLSearchParams(search);

  const shopParam = params.get('shop')?.trim().toLowerCase();
  const storeParam = params.get('store')?.trim().toLowerCase();
  const storefrontParam = params.get('storefront')?.trim().toLowerCase();
  const vendorParam = params.get('vendor')?.trim() || params.get('vendor_id')?.trim();
  const isOwnerPreview = params.get('preview') === 'owner' || params.get('owner') === '1';

  // 1. Check path-based routing (e.g. /shop/myshop or /store/myshop)
  const pathMatch = pathname.match(/^\/(?:shop|store)\/([a-z0-9-_]+)/i);
  if (pathMatch && pathMatch[1]) {
    return {
      isStorefront: true,
      shopSlug: pathMatch[1].toLowerCase(),
      isOwnerPreview,
    };
  }

  // 2. Check query parameter: ?shop=slug or ?store=slug
  if (shopParam && shopParam !== '1' && shopParam !== 'true') {
    return {
      isStorefront: true,
      shopSlug: shopParam,
      vendorId: vendorParam || undefined,
      isOwnerPreview,
    };
  }

  if (storeParam && storeParam !== '1' && storeParam !== 'true') {
    return {
      isStorefront: true,
      shopSlug: storeParam,
      vendorId: vendorParam || undefined,
      isOwnerPreview,
    };
  }

  if (vendorParam) {
    return {
      isStorefront: true,
      vendorId: vendorParam,
      shopSlug: shopParam || storeParam || undefined,
      isOwnerPreview,
    };
  }

  // 3. Generic storefront param: ?storefront=1 or ?shop=1
  if (shopParam === '1' || storeParam === '1' || storefrontParam === '1') {
    return {
      isStorefront: true,
      isOwnerPreview,
    };
  }

  // 4. Subdomain check (e.g. myshop.twinghisabi.site or myshop.hisabi.com)
  if (hostname.endsWith('.twinghisabi.site')) {
    const sub = hostname.replace('.twinghisabi.site', '').trim();
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
      return {
        isStorefront: true,
        shopSlug: sub,
        domain: hostname,
        isOwnerPreview,
      };
    }
  }

  // 5. Custom domain check (e.g. www.myfashionbd.com)
  const isInternalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('.run.app') ||
    hostname.includes('webcontainer') ||
    hostname.includes('github.dev') ||
    hostname.includes('firebaseapp.com');

  if (!isInternalHost && hostname.includes('.')) {
    return {
      isStorefront: true,
      domain: hostname,
      isOwnerPreview,
    };
  }

  return { isStorefront: false };
}

/**
 * Returns formatted working URLs for a vendor store
 */
export function getStoreUrls(storeSlug?: string, customDomain?: string, vendorId?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://twinghisabi.site';
  const effectiveSlug = (storeSlug || vendorId || 'shop').toLowerCase().trim();

  // 1. Direct App URL (100% working immediately in all browsers without DNS wait)
  const directUrl = `${origin}/?shop=${encodeURIComponent(effectiveSlug)}`;

  // 2. Subdomain URL on twinghisabi.site
  const subdomainUrl = `https://${effectiveSlug}.twinghisabi.site`;

  // 3. Custom Domain URL (if merchant connected their domain)
  const cleanCustomDomain = customDomain ? customDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim() : '';
  const customDomainUrl = cleanCustomDomain ? `https://${cleanCustomDomain}` : '';

  // Primary share URL preference: customDomain > directUrl
  const primaryShareUrl = customDomainUrl || directUrl;

  return {
    directUrl,
    subdomainUrl,
    customDomainUrl,
    primaryShareUrl,
    effectiveSlug,
  };
}
