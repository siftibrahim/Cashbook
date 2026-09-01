/**
 * Backend & Offline Sync Service
 * Seamlessly manages offline queue and PostgreSQL Backend APIs
 */

import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';
import { customerApi, transactionApi, expenseApi, storeApi } from './apiService';
import {
  enqueueAction,
  getPendingQueueCount,
  triggerBackgroundSync,
} from './offlineSyncService';

/**
 * Real-time / Polling listener for store profile
 */
export function subscribeToStoreProfile(
  onUpdate: (profile: StoreProfile) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;

  const fetchProfile = async () => {
    if (!navigator.onLine) {
      if (onError) onError(new Error('Offline'));
      return;
    }
    try {
      const profile = await storeApi.getProfile();
      if (isSubscribed && profile) {
        onUpdate(profile);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchProfile();
  const interval = setInterval(fetchProfile, 15000); // 15s refresh interval

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

/**
 * Save Store Profile to Cloud / Local Queue
 */
export async function saveStoreProfileToCloud(profile: StoreProfile): Promise<void> {
  enqueueAction('SAVE_STORE_PROFILE', profile);
  try {
    if (navigator.onLine) {
      await storeApi.saveProfile(profile);
    }
  } catch (err) {
    console.warn('Backend save store profile queued for offline sync:', err);
  }
}

/**
 * Real-time / Polling listener for customers
 */
export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;

  const fetchCust = async () => {
    if (!navigator.onLine) {
      if (onError) onError(new Error('Offline'));
      return;
    }
    try {
      // If there are pending un-synced customer operations, avoid clobbering local state
      if (getPendingQueueCount() > 0) return;
      const list = await customerApi.getAll();
      if (isSubscribed && Array.isArray(list)) {
        onUpdate(list);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchCust();
  const interval = setInterval(fetchCust, 12000); // 12s refresh

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

/**
 * Real-time / Polling listener for transactions
 */
export function subscribeToTransactions(
  onUpdate: (transactions: Record<string, Transaction[]>) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;

  const fetchTx = async () => {
    if (!navigator.onLine) {
      if (onError) onError(new Error('Offline'));
      return;
    }
    try {
      if (getPendingQueueCount() > 0) return;
      const { map } = await transactionApi.getAll();
      if (isSubscribed && map) {
        onUpdate(map);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchTx();
  const interval = setInterval(fetchTx, 12000);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

/**
 * Real-time / Polling listener for daily expenses
 */
export function subscribeToExpenses(
  onUpdate: (expenses: DailyExpense[]) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;

  const fetchExp = async () => {
    if (!navigator.onLine) {
      if (onError) onError(new Error('Offline'));
      return;
    }
    try {
      if (getPendingQueueCount() > 0) return;
      const list = await expenseApi.getAll();
      if (isSubscribed && Array.isArray(list)) {
        onUpdate(list);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchExp();
  const interval = setInterval(fetchExp, 15000);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

/**
 * Save or update single customer
 */
export async function saveCustomerToCloud(customer: Customer): Promise<void> {
  enqueueAction('SAVE_CUSTOMER', customer);
  try {
    if (navigator.onLine) {
      await customerApi.save(customer);
    }
  } catch (err) {
    console.warn('Backend save customer queued for offline sync:', err);
  }
}

/**
 * Delete customer and their associated transactions
 */
export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  enqueueAction('DELETE_CUSTOMER', { customerId });
  try {
    if (navigator.onLine) {
      await customerApi.delete(customerId);
    }
  } catch (err) {
    console.warn('Backend delete customer queued for offline sync:', err);
  }
}

/**
 * Save single transaction to cloud
 */
export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  enqueueAction('SAVE_TRANSACTION', tx);
  try {
    if (navigator.onLine) {
      await transactionApi.save(tx);
    }
  } catch (err) {
    console.warn('Backend save transaction queued for offline sync:', err);
  }
}

/**
 * Delete single transaction from cloud
 */
export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  enqueueAction('DELETE_TRANSACTION', { txId });
  try {
    if (navigator.onLine) {
      await transactionApi.delete(txId);
    }
  } catch (err) {
    console.warn('Backend delete transaction queued for offline sync:', err);
  }
}

/**
 * Save single expense to cloud
 */
export async function saveExpenseToCloud(expense: DailyExpense): Promise<void> {
  enqueueAction('SAVE_EXPENSE', expense);
  try {
    if (navigator.onLine) {
      await expenseApi.save(expense);
    }
  } catch (err) {
    console.warn('Backend save expense queued for offline sync:', err);
  }
}

/**
 * Delete single expense from cloud
 */
export async function deleteExpenseFromCloud(expenseId: string): Promise<void> {
  enqueueAction('DELETE_EXPENSE', { expenseId });
  try {
    if (navigator.onLine) {
      await expenseApi.delete(expenseId);
    }
  } catch (err) {
    console.warn('Backend delete expense queued for offline sync:', err);
  }
}

/**
 * Bulk upload / restore / seed entire ledger to backend
 */
export async function syncAllToCloud(
  store: StoreProfile,
  customers: Customer[],
  transactions: Record<string, Transaction[]>,
  expenses: DailyExpense[] = []
): Promise<void> {
  enqueueAction('SYNC_ALL', { store, customers, transactions, expenses });
  try {
    if (navigator.onLine) {
      await storeApi.syncAll(store, customers, transactions, expenses);
    }
  } catch (err) {
    console.warn('Backend sync-all queued for offline sync:', err);
  }
}
