import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, Transaction, StoreProfile, DailyExpense } from '../types';

const STORE_DOC_ID = 'ibrahim_general_store';

/**
 * Real-time listener for store profile
 */
export function subscribeToStoreProfile(
  onUpdate: (profile: StoreProfile) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'stores', STORE_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as StoreProfile);
      }
    },
    (err) => {
      console.warn('Firestore store profile listener:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Store Profile to Firestore
 */
export async function saveStoreProfileToCloud(profile: StoreProfile): Promise<void> {
  try {
    const docRef = doc(db, 'stores', STORE_DOC_ID);
    await setDoc(docRef, profile, { merge: true });
  } catch (err) {
    console.error('Failed to save store profile to Firestore:', err);
  }
}

/**
 * Real-time listener for customers
 */
export function subscribeToCustomers(
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'customers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Customer, 'id'>) });
      });
      // Sort newest first
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore customers listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for transactions
 */
export function subscribeToTransactions(
  onUpdate: (transactions: Record<string, Transaction[]>) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const map: Record<string, Transaction[]> = {};
      snapshot.forEach((docSnap) => {
        const tx = { id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) };
        if (!map[tx.customerId]) {
          map[tx.customerId] = [];
        }
        map[tx.customerId].push(tx);
      });

      // Sort transactions by createdAt descending for each customer
      Object.keys(map).forEach((cid) => {
        map[cid].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      });

      onUpdate(map);
    },
    (err) => {
      console.warn('Firestore transactions listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for daily expenses
 */
export function subscribeToExpenses(
  onUpdate: (expenses: DailyExpense[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'expenses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DailyExpense[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<DailyExpense, 'id'>) });
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore expenses listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update single customer
 */
export async function saveCustomerToCloud(customer: Customer): Promise<void> {
  try {
    const docRef = doc(db, 'customers', customer.id);
    await setDoc(docRef, customer, { merge: true });
  } catch (err) {
    console.error('Failed to save customer to Firestore:', err);
  }
}

/**
 * Delete customer and their associated transactions from cloud
 */
export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  try {
    const docRef = doc(db, 'customers', customerId);
    await deleteDoc(docRef);

    // Delete associated transactions
    const colRef = collection(db, 'transactions');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.customerId === customerId) {
        batch.delete(docSnap.ref);
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to delete customer from Firestore:', err);
  }
}

/**
 * Save single transaction to cloud
 */
export async function saveTransactionToCloud(tx: Transaction): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', tx.id);
    await setDoc(docRef, tx, { merge: true });
  } catch (err) {
    console.error('Failed to save transaction to Firestore:', err);
  }
}

/**
 * Delete single transaction from cloud
 */
export async function deleteTransactionFromCloud(txId: string): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', txId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete transaction from Firestore:', err);
  }
}

/**
 * Save single expense to cloud
 */
export async function saveExpenseToCloud(expense: DailyExpense): Promise<void> {
  try {
    const docRef = doc(db, 'expenses', expense.id);
    await setDoc(docRef, expense, { merge: true });
  } catch (err) {
    console.error('Failed to save expense to Firestore:', err);
  }
}

/**
 * Delete single expense from cloud
 */
export async function deleteExpenseFromCloud(expenseId: string): Promise<void> {
  try {
    const docRef = doc(db, 'expenses', expenseId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete expense from Firestore:', err);
  }
}

/**
 * Bulk upload / restore / seed entire ledger to Firestore
 */
export async function syncAllToCloud(
  store: StoreProfile,
  customers: Customer[],
  transactions: Record<string, Transaction[]>,
  expenses: DailyExpense[] = []
): Promise<void> {
  try {
    // 1. Save store
    await saveStoreProfileToCloud(store);

    // 2. Batch save customers
    const batch = writeBatch(db);
    customers.forEach((c) => {
      const docRef = doc(db, 'customers', c.id);
      batch.set(docRef, c, { merge: true });
    });

    // 3. Batch save transactions
    Object.values(transactions).forEach((txList) => {
      txList.forEach((tx) => {
        const docRef = doc(db, 'transactions', tx.id);
        batch.set(docRef, tx, { merge: true });
      });
    });

    // 4. Batch save expenses
    expenses.forEach((exp) => {
      const docRef = doc(db, 'expenses', exp.id);
      batch.set(docRef, exp, { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Failed to sync all to Firestore:', err);
  }
}
