/**
 * Offline Sync Service & Queue Manager for TWING হিসাবি
 * Manages robust offline action queuing, automatic background sync, conflict resolution,
 * and real-time connectivity status.
 */

import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';
import {
  customerApi,
  transactionApi,
  expenseApi,
  storeApi,
  productApi,
  getStoredUser,
  getAuthToken,
} from './apiService';
import {
  getUserStorageKey,
  getActiveUserId,
  loadCustomers,
  loadTransactions,
  loadDailyExpenses,
  loadStoreProfile,
  saveCustomers,
  saveTransactions,
  saveDailyExpenses,
  saveStoreProfile,
} from '../utils/storage';

export type SyncActionType =
  | 'SAVE_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'SAVE_TRANSACTION'
  | 'DELETE_TRANSACTION'
  | 'SAVE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'SAVE_STORE_PROFILE'
  | 'SAVE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'SYNC_ALL';

export interface QueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
}

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();

let currentStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: Date.now(),
  lastError: null,
};

function notifyListeners() {
  currentStatus = {
    ...currentStatus,
    pendingCount: getPendingQueueCount(),
  };
  listeners.forEach((fn) => {
    try {
      fn({ ...currentStatus });
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
}

/**
 * Subscribe to live sync & online status
 */
export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentStatus, pendingCount: getPendingQueueCount() });
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentSyncStatus(): SyncStatus {
  return { ...currentStatus, pendingCount: getPendingQueueCount() };
}

/**
 * Get sync queue key for current user
 */
function getQueueStorageKey(userId?: string): string {
  const uid = userId || getActiveUserId();
  return getUserStorageKey('offline_sync_queue_v2', uid);
}

/**
 * Get pending sync queue items from LocalStorage
 */
export function getPendingQueue(userId?: string): QueueItem[] {
  try {
    const key = getQueueStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading sync queue:', e);
    return [];
  }
}

/**
 * Save pending sync queue to LocalStorage
 */
function savePendingQueue(queue: QueueItem[], userId?: string): void {
  try {
    const key = getQueueStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(queue));
    notifyListeners();
  } catch (e) {
    console.error('Error saving sync queue:', e);
  }
}

/**
 * Get count of pending items
 */
export function getPendingQueueCount(userId?: string): number {
  return getPendingQueue(userId).length;
}

/**
 * Enqueue an action to be synced with the server
 */
export function enqueueAction(action: SyncActionType, payload: any, userId?: string): void {
  const uid = userId || getActiveUserId();
  const queue = getPendingQueue(uid);
  const newItemId = 'sq_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Smart deduplication & compaction
  let updatedQueue = [...queue];

  if (action === 'SAVE_CUSTOMER' && payload?.id) {
    // If customer already has a pending SAVE, replace it with latest data
    const existingIdx = updatedQueue.findIndex(
      (item) => item.action === 'SAVE_CUSTOMER' && item.payload?.id === payload.id
    );
    if (existingIdx >= 0) {
      updatedQueue[existingIdx] = {
        ...updatedQueue[existingIdx],
        payload,
        createdAt: Date.now(),
      };
      savePendingQueue(updatedQueue, uid);
      triggerBackgroundSync(uid);
      return;
    }
  } else if (action === 'DELETE_CUSTOMER' && payload?.customerId) {
    // Remove any pending saves for this customer and keep delete
    updatedQueue = updatedQueue.filter(
      (item) => !(item.action === 'SAVE_CUSTOMER' && item.payload?.id === payload.customerId)
    );
  } else if (action === 'SAVE_TRANSACTION' && payload?.id) {
    const existingIdx = updatedQueue.findIndex(
      (item) => item.action === 'SAVE_TRANSACTION' && item.payload?.id === payload.id
    );
    if (existingIdx >= 0) {
      updatedQueue[existingIdx] = {
        ...updatedQueue[existingIdx],
        payload,
        createdAt: Date.now(),
      };
      savePendingQueue(updatedQueue, uid);
      triggerBackgroundSync(uid);
      return;
    }
  } else if (action === 'DELETE_TRANSACTION' && payload?.txId) {
    updatedQueue = updatedQueue.filter(
      (item) => !(item.action === 'SAVE_TRANSACTION' && item.payload?.id === payload.txId)
    );
  } else if (action === 'SAVE_STORE_PROFILE') {
    // Only keep latest profile save
    updatedQueue = updatedQueue.filter((item) => item.action !== 'SAVE_STORE_PROFILE');
  }

  updatedQueue.push({
    id: newItemId,
    action,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  });

  savePendingQueue(updatedQueue, uid);
  triggerBackgroundSync(uid);
}

/**
 * Process the entire pending queue sequentially
 */
export async function processSyncQueue(userId?: string): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  error?: string;
}> {
  const uid = userId || getActiveUserId();
  const token = getAuthToken();

  // If no user logged in or no network, skip
  if (!navigator.onLine || !token) {
    currentStatus.isOnline = navigator.onLine;
    notifyListeners();
    return {
      success: false,
      syncedCount: 0,
      remainingCount: getPendingQueueCount(uid),
      error: 'অফলাইন মোড অথবা লগইন করা নেই',
    };
  }

  if (currentStatus.isSyncing) {
    return {
      success: true,
      syncedCount: 0,
      remainingCount: getPendingQueueCount(uid),
    };
  }

  currentStatus.isSyncing = true;
  currentStatus.lastError = null;
  notifyListeners();

  const queue = getPendingQueue(uid);
  if (queue.length === 0) {
    currentStatus.isSyncing = false;
    currentStatus.lastSyncedAt = Date.now();
    notifyListeners();
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;
  const remainingQueue: QueueItem[] = [];

  for (const item of queue) {
    try {
      item.attempts = (item.attempts || 0) + 1;
      item.lastAttemptAt = Date.now();

      switch (item.action) {
        case 'SAVE_CUSTOMER':
          await customerApi.save(item.payload);
          break;
        case 'DELETE_CUSTOMER':
          await customerApi.delete(item.payload.customerId || item.payload.id);
          break;
        case 'SAVE_TRANSACTION':
          await transactionApi.save(item.payload);
          break;
        case 'DELETE_TRANSACTION':
          await transactionApi.delete(item.payload.txId || item.payload.id);
          break;
        case 'SAVE_EXPENSE':
          await expenseApi.save(item.payload);
          break;
        case 'DELETE_EXPENSE':
          await expenseApi.delete(item.payload.expenseId || item.payload.id);
          break;
        case 'SAVE_STORE_PROFILE':
          await storeApi.saveProfile(item.payload);
          break;
        case 'SAVE_PRODUCT':
          await productApi.save(item.payload);
          break;
        case 'DELETE_PRODUCT':
          await productApi.delete(item.payload.productId || item.payload.id);
          break;
        case 'SYNC_ALL':
          await storeApi.syncAll(
            item.payload.store,
            item.payload.customers,
            item.payload.transactions,
            item.payload.expenses
          );
          if (Array.isArray(item.payload.products) && item.payload.products.length > 0) {
            await productApi.batchSync(item.payload.products);
          }
          break;
      }
      syncedCount++;
    } catch (err: any) {
      console.warn(`Sync item failed for action ${item.action}:`, err);
      const rawError = (err?.message || '').trim();
      item.error = rawError || 'অপ্রত্যাশিত নেটওয়ার্ক বা সার্ভার ত্রুটি';

      const isFatalClientError = err?.status === 400 || err?.status === 404 || err?.status === 422;
      const hasExceededRetries = (item.attempts || 0) >= 5;

      // Keep item in queue only if transient failure and hasn't exceeded 5 retries
      if (!isFatalClientError && !hasExceededRetries) {
        remainingQueue.push(item);
      } else {
        console.warn(`Discarding non-recoverable sync item (${item.action}) after ${item.attempts} attempts:`, item.error);
      }

      // If network is completely dead, break and save remaining
      if (!navigator.onLine || err?.status === 0 || err?.message?.includes('Failed to fetch')) {
        currentStatus.isOnline = false;
        break;
      }
    }
  }

  savePendingQueue(remainingQueue, uid);
  currentStatus.isSyncing = false;
  currentStatus.lastSyncedAt = Date.now();
  currentStatus.lastError = remainingQueue.length > 0 ? remainingQueue[0].error || 'সিঙ্কে সমস্যা হয়েছে' : null;
  notifyListeners();

  return {
    success: remainingQueue.length === 0,
    syncedCount,
    remainingCount: remainingQueue.length,
    error: currentStatus.lastError || undefined,
  };
}

/**
 * Trigger background sync with debouncing
 */
let syncDebounceTimer: any = null;
export function triggerBackgroundSync(userId?: string): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      processSyncQueue(userId).catch(() => {});
    }
  }, 1200);
}

/**
 * Full Manual Sync: Flushes local queue and syncs current full ledger to cloud
 */
export async function performFullCloudSync(userId?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const uid = userId || getActiveUserId();

  if (!navigator.onLine) {
    return {
      success: false,
      message: '📶 ইন্টারনেট সংযোগ নেই। ডাটা আপনার ফোনে অফলাইনে সংরক্ষিত আছে।',
    };
  }

  try {
    currentStatus.isSyncing = true;
    notifyListeners();

    // 1. Process queued single actions first
    await processSyncQueue(uid);

    // 2. Perform whole ledger sync backup
    const store = loadStoreProfile(uid);
    const custs = loadCustomers(uid);
    const txs = loadTransactions(uid);
    const exps = loadDailyExpenses(uid);

    await storeApi.syncAll(store, custs, txs, exps);

    currentStatus.isSyncing = false;
    currentStatus.isOnline = true;
    currentStatus.lastSyncedAt = Date.now();
    currentStatus.lastError = null;
    savePendingQueue([], uid);
    notifyListeners();

    return {
      success: true,
      message: '☁️ আপনার সম্পূর্ণ খাতার হিসাব ক্লাউড ডাটাবেজে সফলভাবে ব্যাকআপ ও সিঙ্ক হয়েছে!',
    };
  } catch (err: any) {
    currentStatus.isSyncing = false;
    currentStatus.lastError = err?.message || 'সিঙ্ক ব্যর্থ হয়েছে';
    notifyListeners();
    return {
      success: false,
      message: `⚠️ সিঙ্ক ব্যর্থ হয়েছে: ${err?.message || 'সার্ভার সংযোগে ত্রুটি'}`,
    };
  }
}

// -------------------------------------------------------------
// Auto-initialize Global Online / Offline Event Listeners
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    currentStatus.isOnline = true;
    notifyListeners();
    triggerBackgroundSync();
  });

  window.addEventListener('offline', () => {
    currentStatus.isOnline = false;
    notifyListeners();
  });

  // Periodic heartbeat sync every 30 seconds
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && getPendingQueueCount() > 0) {
      processSyncQueue().catch(() => {});
    }
  }, 30000);
}
