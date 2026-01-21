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
import {
  ensureFixedCostInstancesForMonth,
  getFixedCostInstances,
} from "./fixedCostStorage";
import {
  ensureSalaryInstanceForMonth,
  getSalaryInstance,
} from "./salaryStorage";
import {
  ensureInvestmentInstancesForMonth,
  getInvestmentInstances,
} from "./investmentStorage";
import {
  getOneTimeInvestments,
} from "./oneTimeInvestmentStorage";
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
  onSnapshot,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  logCreateActivity,
  logUpdateActivity,
  logDeleteActivity,
} from "./personalExpenseActivityLog";

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
const docToExpense = (docId: string, data: ExpenseDoc): PersonalExpense => ({
  id: docId,
  amount: data.amount,
  description: data.description,
  category: data.category as ExpenseCategory,
  date: data.date,
  createdAt:
    data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt:
    data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
  try {
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

    const createdExpense: PersonalExpense = {
      id: docRef.id,
      amount: expense.amount,
      description: expense.description,
      category: expense.category as ExpenseCategory,
      date: expense.date,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      userId,
    };

    // Log activity
    logCreateActivity(createdExpense, userId).catch((err) =>
      console.error("Failed to log create activity:", err)
    );

    return createdExpense;
  } catch (error) {
    console.error("Error creating expense in Firebase:", error);
    throw error;
  }
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

  try {
    // Simple query - just filter by userId, do date filtering client-side
    // This avoids needing complex composite indexes
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    let expenses = snapshot.docs.map((doc) =>
      docToExpense(doc.id, doc.data() as ExpenseDoc)
    );

    // Filter by month (client-side to avoid index requirements)
    if (options?.month) {
      const startDate = `${options.month}-01`;
      const [year, month] = options.month.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${options.month}-${lastDay
        .toString()
        .padStart(2, "0")}T23:59:59.999Z`;

      expenses = expenses.filter(
        (e) => e.date >= startDate && e.date <= endDate
      );
    }

    // Filter by category
    if (options?.category) {
      expenses = expenses.filter((e) => e.category === options.category);
    }

    // Filter by search query
    if (options?.searchQuery) {
      const searchLower = options.searchQuery.toLowerCase();
      expenses = expenses.filter((e) =>
        e.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date descending
    expenses.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return expenses;
  } catch (error) {
    console.error("Error fetching expenses from Firebase:", error);
    throw error;
  }
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
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.date !== undefined) updateData.date = updates.date;

  await updateDoc(docRef, updateData);

  // Fetch updated document
  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  const updatedExpense = docToExpense(updatedSnap.id, updatedSnap.data() as ExpenseDoc);
  const oldExpense = docToExpense(id, existingData);

  // Log activity
  logUpdateActivity(id, oldExpense, updatedExpense, userId).catch(
    (err) => console.error("Failed to log update activity:", err)
  );

  return updatedExpense;
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

  // Log activity before deleting
  const expenseToDelete = docToExpense(docRef.id, data);
  logDeleteActivity(expenseToDelete, userId).catch((err) =>
    console.error("Failed to log delete activity:", err)
  );

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
  if (!userId) {
    // Return empty stats if no user
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
      fuel: 0,
      electronics: 0,
      other: 0,
    };
    return {
      month,
      total: 0,
      variableExpensesTotal: 0,
      byCategory,
      count: 0,
      fixedCostsTotal: 0,
      income: 0,
      investmentsTotal: 0,
      savings: 0,
    };
  }

  // Ensure instances exist for the month (auto-generate from templates)
  await Promise.all([
    ensureFixedCostInstancesForMonth(month, userId),
    ensureSalaryInstanceForMonth(month, userId),
    ensureInvestmentInstancesForMonth(month, userId),
  ]);

  // Fetch all data in parallel
  const [expenses, fixedCostInstances, salaryInstance, investmentInstances, oneTimeInvestments] = await Promise.all([
    getExpenses({ month }, userId),
    getFixedCostInstances(month, userId),
    getSalaryInstance(month, userId),
    getInvestmentInstances(month, userId),
    getOneTimeInvestments(month, userId),
  ]);

  // Calculate variable expenses
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
    fuel: 0,
    electronics: 0,
    other: 0,
  };

  let variableExpensesTotal = 0;

  expenses.forEach((exp) => {
    byCategory[exp.category] += exp.amount;
    variableExpensesTotal += exp.amount;
  });

  // Calculate fixed costs total (only enabled instances)
  const fixedCostsTotal = fixedCostInstances
    .filter((instance) => instance.isEnabled)
    .reduce((sum, instance) => sum + instance.amount, 0);

  // Get income
  const income = salaryInstance?.amount || 0;

  // Calculate investments total (recurring + one-time)
  const recurringInvestmentsTotal = investmentInstances.reduce(
    (sum, instance) => sum + instance.amount,
    0
  );
  const oneTimeInvestmentsTotal = oneTimeInvestments.reduce(
    (sum, inv) => sum + inv.amount,
    0
  );
  const investmentsTotal = recurringInvestmentsTotal + oneTimeInvestmentsTotal;

  // Calculate savings
  const savings = income - variableExpensesTotal - fixedCostsTotal - investmentsTotal;

  return {
    month,
    total: variableExpensesTotal, // For backward compatibility
    variableExpensesTotal,
    byCategory,
    count: expenses.length,
    fixedCostsTotal,
    income,
    investmentsTotal,
    savings,
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
  try {
    // Simple query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
      },
      (error) => {
        console.error("Error in realtime subscription:", error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up realtime subscription:", error);
    return null;
  }
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
