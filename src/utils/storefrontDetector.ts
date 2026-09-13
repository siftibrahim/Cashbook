/**
 * Storefront Context Detection
 * Detects whether the current browser session is a customer visiting a public online storefront
 * via subdomain (e.g. tanjina.twinghisabi.site), custom domain (e.g. mybrand.com), or ?shop= query param.
 */

export interface StoreContextResult {
  isPublicStore: boolean;
  storeIdentifier?: string;
}

export function detectPublicStoreContext(): StoreContextResult {
  if (typeof window === 'undefined') {
    return { isPublicStore: false };
  }

  const hostname = window.location.hostname.toLowerCase();
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const pathname = window.location.pathname.toLowerCase();

  // If user explicitly asks for merchant admin/login portal, bypass public store view
  if (
    params.get('admin') === '1' ||
    params.get('login') === '1' ||
    pathname === '/admin' ||
    pathname === '/login' ||
    pathname.startsWith('/admin/')
  ) {
    return { isPublicStore: false };
  }

  // 1. Explicit query param: ?shop=tanjina, ?store=tanjina, ?slug=tanjina, ?vendor=tanjina
  const explicitTarget = params.get('shop') || params.get('store') || params.get('slug') || params.get('vendor');
  if (explicitTarget && explicitTarget !== '1' && explicitTarget !== 'true' && explicitTarget !== 'default') {
    return { isPublicStore: true, storeIdentifier: explicitTarget };
  }

  // 2. Path-based routing: /shop/tanjina or /store/tanjina
  if (pathname.startsWith('/shop/') || pathname.startsWith('/store/')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[1]) {
      return { isPublicStore: true, storeIdentifier: parts[1] };
    }
  }

  // 3. Subdomain on twinghisabi.site (e.g. tanjina.twinghisabi.site)
  if (hostname.includes('.twinghisabi.site')) {
    const sub = hostname.split('.twinghisabi.site')[0];
    if (sub && sub !== 'www' && sub !== 'app' && sub !== 'admin' && sub !== 'api') {
      return { isPublicStore: true, storeIdentifier: sub };
    }
  }

  // 4. Custom domain (e.g. www.myshop.com or myshop.com)
  const isInternalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('googleusercontent.com') ||
    hostname.endsWith('run.app') ||
    hostname === 'twinghisabi.site' ||
    hostname === 'www.twinghisabi.site' ||
    hostname === 'app.twinghisabi.site';

  if (!isInternalHost && hostname.includes('.')) {
    return { isPublicStore: true, storeIdentifier: hostname };
  }

  // 5. Explicit ?store=1 or ?storefront=1 flag (e.g. shared preview link)
  if (params.get('store') === '1' || params.get('storefront') === '1' || params.get('shop') === '1') {
    return { isPublicStore: true, storeIdentifier: undefined };
  }

  return { isPublicStore: false };
}
