// Wishlist persistence utility for Storefront

const WISHLIST_STORAGE_KEY = 'twing_storefront_wishlist_v1';
export const WISHLIST_SYNC_EVENT = 'twing_wishlist_updated';

export function getWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading wishlist', e);
  }
  return [];
}

export function isInWishlist(productId: string): boolean {
  const list = getWishlist();
  return list.includes(productId);
}

export function toggleWishlist(productId: string): boolean {
  const current = getWishlist();
  let updated: string[];
  let isAdded = false;

  if (current.includes(productId)) {
    updated = current.filter((id) => id !== productId);
    isAdded = false;
  } else {
    updated = [...current, productId];
    isAdded = true;
  }

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(WISHLIST_SYNC_EVENT, { detail: { productId, isAdded, list: updated } }));
  } catch (e) {
    console.error('Error saving wishlist', e);
  }

  return isAdded;
}

export function removeFromWishlist(productId: string): void {
  const current = getWishlist();
  const updated = current.filter((id) => id !== productId);
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(WISHLIST_SYNC_EVENT, { detail: { productId, isAdded: false, list: updated } }));
  } catch (e) {
    console.error('Error saving wishlist', e);
  }
}
