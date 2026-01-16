/**
 * Personal Expense Storage Service - Firebase Firestore
 *
 * This service uses Firebase Firestore for cloud storage with realtime sync.
 * Requires user to be signed in.
 */

import type {
  PersonalExpense,
  ExpenseCategory,
  MonthlyStats,
  ExpenseFilterOptions,
} from "../types/personalExpense";
import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

const COLLECTION_NAME = "personal_expenses";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

// Firebase document type
interface ExpenseDoc {
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to PersonalExpense
const docToExpense = (
  docId: string,
  data: ExpenseDoc
): PersonalExpense => ({
  id: docId,
  amount: data.amount,
  description: data.description,
  category: data.category as ExpenseCategory,
  date: data.date,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  userId: data.userId,
});

// ============================================
// Firebase CRUD Operations
// ============================================

/**
 * Create a new expense
 * @returns The created expense with generated ID
 */
export const createExpense = async (
  expense: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<PersonalExpense> => {
  const now = Timestamp.now();
  
  const docData: ExpenseDoc = {
    userId,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    date: expense.date,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

  return {
    id: docRef.id,
    amount: expense.amount,
    description: expense.description,
    category: expense.category as ExpenseCategory,
    date: expense.date,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
    userId,
  };
};

/**
 * Get all expenses with optional filtering
 */
export const getExpenses = async (
  options?: ExpenseFilterOptions,
  userId?: string
): Promise<PersonalExpense[]> => {
  if (!userId) {
    return [];
  }

  let q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );

  // Filter by month (date starts with YYYY-MM)
  if (options?.month) {
    const startDate = `${options.month}-01`;
    const [year, month] = options.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${options.month}-${lastDay.toString().padStart(2, "0")}T23:59:59.999Z`;

    q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
  }

  const snapshot = await getDocs(q);
  let expenses = snapshot.docs.map((doc) =>
    docToExpense(doc.id, doc.data() as ExpenseDoc)
  );

  // Filter by category (client-side since Firestore has limitations on compound queries)
  if (options?.category) {
    expenses = expenses.filter((e) => e.category === options.category);
  }

  // Filter by search query (client-side)
  if (options?.searchQuery) {
    const searchLower = options.searchQuery.toLowerCase();
    expenses = expenses.filter((e) =>
      e.description.toLowerCase().includes(searchLower)
    );
  }

  return expenses;
};

/**
 * Get a single expense by ID
 */
export const getExpenseById = async (
  id: string,
  userId: string
): Promise<PersonalExpense | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data() as ExpenseDoc;
  
  // Verify ownership
  if (data.userId !== userId) {
    return null;
  }

  return docToExpense(docSnap.id, data);
};

/**
 * Update an existing expense
 */
export const updateExpense = async (
  id: string,
  updates: Partial<Omit<PersonalExpense, "id" | "createdAt">>,
  userId: string
): Promise<PersonalExpense | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as ExpenseDoc;
  
  // Verify ownership
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<ExpenseDoc> & { updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.date !== undefined) updateData.date = updates.date;

  await updateDoc(docRef, updateData);

  // Fetch updated document
  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToExpense(updatedSnap.id, updatedSnap.data() as ExpenseDoc);
};

/**
 * Delete an expense
 */
export const deleteExpense = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return false;
  }

  const data = docSnap.data() as ExpenseDoc;
  
  // Verify ownership
  if (data.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await deleteDoc(docRef);
  return true;
};

/**
 * Get monthly statistics
 */
export const getMonthlyStats = async (
  month: string,
  userId?: string
): Promise<MonthlyStats> => {
  const expenses = await getExpenses({ month }, userId);

  const byCategory: Record<ExpenseCategory, number> = {
    food: 0,
    transport: 0,
    shopping: 0,
    entertainment: 0,
    utilities: 0,
    health: 0,
    travel: 0,
    subscriptions: 0,
    groceries: 0,
    other: 0,
  };

  let total = 0;

  expenses.forEach((exp) => {
    byCategory[exp.category] += exp.amount;
    total += exp.amount;
  });

  return {
    month,
    total,
    byCategory,
    count: expenses.length,
  };
};

/**
 * Get available months (for month picker)
 */
export const getAvailableMonths = async (userId: string): Promise<string[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);
  const monthsSet = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ExpenseDoc;
    const month = data.date.substring(0, 7);
    monthsSet.add(month);
  });

  // Always include current month (using local timezone)
  const currentMonth = formatMonthString(new Date());
  monthsSet.add(currentMonth);

  return Array.from(monthsSet).sort().reverse();
};

/**
 * Export all expenses (for backup)
 */
export const exportExpenses = async (userId: string): Promise<string> => {
  const expenses = await getExpenses(undefined, userId);
  return JSON.stringify(expenses, null, 2);
};

/**
 * Import expenses (for restore)
 */
export const importExpenses = async (
  data: string,
  merge = false,
  userId: string
): Promise<number> => {
  const imported: PersonalExpense[] = JSON.parse(data);

  if (!Array.isArray(imported)) {
    throw new Error("Invalid data format");
  }

  // If not merging, delete existing expenses first
  if (!merge) {
    const existingExpenses = await getExpenses(undefined, userId);
    const batch = writeBatch(db);
    
    existingExpenses.forEach((exp) => {
      const docRef = doc(db, COLLECTION_NAME, exp.id);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }

  // Add imported expenses
  const now = Timestamp.now();
  let count = 0;

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500;
  for (let i = 0; i < imported.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = imported.slice(i, i + batchSize);

    chunk.forEach((exp) => {
      const docRef = doc(collection(db, COLLECTION_NAME));
      batch.set(docRef, {
        userId,
        amount: exp.amount,
        description: exp.description,
        category: exp.category,
        date: exp.date,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    });

    await batch.commit();
  }

  return count;
};

// ============================================
// Realtime Subscriptions
// ============================================

export type ExpenseChangeCallback = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  expense: PersonalExpense | null;
  oldExpense?: PersonalExpense | null;
}) => void;

/**
 * Subscribe to realtime expense changes for a user
 */
export const subscribeToExpenses = (
  userId: string,
  callback: ExpenseChangeCallback
): Unsubscribe | null => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("date", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data() as ExpenseDoc;
      const expense = docToExpense(change.doc.id, data);

      if (change.type === "added") {
        callback({
          eventType: "INSERT",
          expense,
        });
      } else if (change.type === "modified") {
        callback({
          eventType: "UPDATE",
          expense,
        });
      } else if (change.type === "removed") {
        callback({
          eventType: "DELETE",
          expense: null,
          oldExpense: expense,
        });
      }
    });
  });

  return unsubscribe;
};

/**
 * Unsubscribe from realtime expense changes
 */
export const unsubscribeFromExpenses = async (
  unsubscribe: Unsubscribe | null
): Promise<void> => {
  if (unsubscribe) {
    unsubscribe();
  }
};
