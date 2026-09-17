/**
 * Universal Safe Storage Wrapper for Smart TV & Legacy Browsers
 * Prevents SecurityError, QuotaExceededError, or private-mode crashes.
 * Automatically falls back to high-performance in-memory cache if localStorage is restricted.
 */

// In-memory fallback dictionary
const memoryStore: Record<string, string> = {};

let isStorageAvailable = false;

// Test storage accessibility safely
try {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    const testKey = '__twing_storage_probe__';
    window.localStorage.setItem(testKey, testKey);
    const retrieved = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    isStorageAvailable = retrieved === testKey;
  }
} catch {
  isStorageAvailable = false;
}

export const safeStorage = {
  isAvailable: () => isStorageAvailable,

  getItem(key: string): string | null {
    try {
      if (isStorageAvailable) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Fallback to memory
    }
    return memoryStore[key] ?? null;
  },

  setItem(key: string, value: string): boolean {
    memoryStore[key] = value;
    try {
      if (isStorageAvailable) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch {
      // Storage full or restricted (e.g. Smart TV private mode)
      // Value is safely saved in memoryStore
    }
    return true;
  },

  removeItem(key: string): void {
    delete memoryStore[key];
    try {
      if (isStorageAvailable) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },

  clear(): void {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    try {
      if (isStorageAvailable) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
  },

  getJSON<T>(key: string, defaultValue: T): T {
    const raw = this.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  setJSON(key: string, value: any): boolean {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};

// Polyfill window.localStorage if restricted or throwing
if (typeof window !== 'undefined') {
  try {
    const originalLS = window.localStorage;
    if (!originalLS) {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (k: string) => safeStorage.getItem(k),
          setItem: (k: string, v: string) => safeStorage.setItem(k, v),
          removeItem: (k: string) => safeStorage.removeItem(k),
          clear: () => safeStorage.clear(),
          key: (index: number) => Object.keys(memoryStore)[index] || null,
          get length() {
            return Object.keys(memoryStore).length;
          },
        },
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // ignore
  }
}
