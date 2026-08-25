/**
 * Backend Sync Service
 * Replaces direct Firebase Firestore listener/sync with PostgreSQL Backend APIs
 */

import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';
import { customerApi, transactionApi, expenseApi, storeApi } from './apiService';

/**
 * Real-time / Polling listener for store profile
 */
export function subscribeToStoreProfile(
  onUpdate: (profile: StoreProfile) => void,
  onError?: (err: Error) => void
) {
  let isSubscribed = true;

  const fetchProfile = async () => {
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
 * Save Store Profile to Cloud
 */
export async function saveStoreProfileToCloud(profile: StoreProfile): Promise<void> {
  try {
    await storeApi.saveProfile(profile);
  } catch (err) {
    console.error('Failed to save store profile to Backend:', err);
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
    try {
      const list = await customerApi.getAll();
      if (isSubscribed) {
        onUpdate(list);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchCust();
  const interval = setInterval(fetchCust, 10000); // 10s refresh

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
    try {
      const { map } = await transactionApi.getAll();
      if (isSubscribed) {
        onUpdate(map);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchTx();
  const interval = setInterval(fetchTx, 10000); // 10s refresh

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
    try {
      const list = await expenseApi.getAll();
      if (isSubscribed) {
        onUpdate(list);
      }
    } catch (err: any) {
      if (onError) onError(err);
    }
  };

  fetchExp();
  const interval = setInterval(fetchExp, 12000);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
}

/**
 * Save or update single customer
 */
export async function saveCustomerToCloud(customer: Customer): Promise<void> {
  try {
    await customerApi.save(customer);
  } catch (err) {
    console.error('Failed to save customer to Backend:', err);
  }
}

/**
 * Delete customer and their associated transactions
 */
export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  try {
    await customerApi.delete(customerId);
  } catch (err) {
    console.error('Failed to delete customer from Backend:', err);
  }
}

/**
 * Save single transaction to cloud
 */
export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  try {
    await transactionApi.save(tx);
  } catch (err) {
    console.error('Failed to save transaction to Backend:', err);
  }
}

/**
 * Delete single transaction from cloud
 */
export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  try {
    await transactionApi.delete(txId);
  } catch (err) {
    console.error('Failed to delete transaction from Backend:', err);
  }
}

/**
 * Save single expense to cloud
 */
export async function saveExpenseToCloud(expense: DailyExpense): Promise<void> {
  try {
    await expenseApi.save(expense);
  } catch (err) {
    console.error('Failed to save expense to Backend:', err);
  }
}

/**
 * Delete single expense from cloud
 */
export async function deleteExpenseFromCloud(expenseId: string): Promise<void> {
  try {
    await expenseApi.delete(expenseId);
  } catch (err) {
    console.error('Failed to delete expense from Backend:', err);
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
  try {
    await storeApi.syncAll(store, customers, transactions, expenses);
  } catch (err) {
    console.error('Failed to sync all to Backend:', err);
  }
}
