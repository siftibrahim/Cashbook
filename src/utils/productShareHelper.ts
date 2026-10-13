import { Product, OnlineStoreConfig } from '../types';
import { formatMoney } from './storage';

/**
 * Builds a 100% clean, canonical product URL suitable for sharing on social media and live servers.
 * Never appends invalid characters, spaces, or raw text to the URL string.
 */
export function getCanonicalProductUrl(product: Product, config?: OnlineStoreConfig | null): string {
  if (typeof window === 'undefined') return '';

  const loc = window.location;
  const currentHost = loc.host.toLowerCase();
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1') || currentHost.includes('.run.app');

  // 1. If verified custom domain is available and not in local dev
  if (!isDev && config?.customDomain && config?.customDomainVerified) {
    const cleanCustom = config.customDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `https://${cleanCustom}/?product=${encodeURIComponent(product.id)}`;
  }

  // 2. If vendor subdomain is available (e.g. shop.twinghisabi.site or [slug].twinghisabi.site)
  if (!isDev && config?.storeSlug) {
    const baseDomain = 'twinghisabi.site';
    if (currentHost.endsWith(`.${baseDomain}`) || currentHost === `${config.storeSlug}.${baseDomain}`) {
      return `https://${currentHost}/?product=${encodeURIComponent(product.id)}`;
    }
    return `https://${config.storeSlug}.${baseDomain}/?product=${encodeURIComponent(product.id)}`;
  }

  // 3. Fallback to current window location with clean ?product parameter
  try {
    const url = new URL(loc.href);
    url.searchParams.set('product', product.id);
    // Remove unwanted temporary hashes or parameters
    url.hash = '';
    return url.toString();
  } catch {
    return `${loc.origin}/?product=${encodeURIComponent(product.id)}`;
  }
}

export function getProductShareMessage(product: Product, storeName?: string): string {
  const shopPart = storeName ? ` | ${storeName}` : '';
  const price = formatMoney(product.salePrice);
  return `${product.name} - মাত্র ৳${price} তে কিনুন${shopPart}!`;
}

export function getWhatsAppShareUrl(productUrl: string, product: Product, storeName?: string): string {
  const msg = `${product.name} - মাত্র ৳${formatMoney(product.salePrice)} তে কিনুন${storeName ? ` (${storeName})` : ''}!\nসরাসরি অর্ডার করতে লিংকটি ওপেন করুন:\n${productUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

export function getFacebookShareUrl(productUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
}

export function getTelegramShareUrl(productUrl: string, product: Product): string {
  const text = `${product.name} - মাত্র ৳${formatMoney(product.salePrice)} তে অর্ডার করুন!`;
  return `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
}

export async function copyProductLinkToClipboard(productUrl: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(productUrl);
      return true;
    }
  } catch {
    // Fallback to legacy execCommand
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = productUrl;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
