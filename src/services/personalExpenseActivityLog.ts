/**
 * Personal Expense Activity Log Service
 * Tracks all CRUD operations for personal expenses
 */

import { db } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, limit, Timestamp, type Unsubscribe } from "firebase/firestore";
import type { PersonalExpense } from "../types/personalExpense";

const COLLECTION_NAME = "personal_expense_activities";

export interface PersonalExpenseActivity {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  expenseId: string;
  details: string;
  timestamp: string;
  userId: string;
  expense?: {
    amount: number;
    description: string;
    category: string;
    date: string;
  };
  oldExpense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
  newExpense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
}

interface ActivityDoc {
  action: "CREATE" | "UPDATE" | "DELETE";
  expenseId: string;
  details: string;
  timestamp: Timestamp;
  userId: string;
  expense?: {
    amount: number;
    description: string;
    category: string;
    date: string;
  };
  oldExpense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
  newExpense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
}

const docToActivity = (docId: string, data: ActivityDoc): PersonalExpenseActivity => ({
  id: docId,
  action: data.action,
  expenseId: data.expenseId,
  details: data.details,
  timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
  userId: data.userId,
  expense: data.expense,
  oldExpense: data.oldExpense,
  newExpense: data.newExpense,
});

/**
 * Log a CREATE action
 */
export const logCreateActivity = async (
  expense: PersonalExpense,
  userId: string
): Promise<void> => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      action: "CREATE",
      expenseId: expense.id,
      details: `Added expense: ${expense.description || expense.category} - ₹${expense.amount}`,
      timestamp: Timestamp.now(),
      userId,
      expense: {
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: expense.date,
      },
    });
  } catch (error) {
    console.error("Error logging create activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
};

/**
 * Log an UPDATE action
 */
export const logUpdateActivity = async (
  expenseId: string,
  oldExpense: PersonalExpense,
  newExpense: PersonalExpense,
  userId: string
): Promise<void> => {
  try {
    const changes: string[] = [];
    
    if (oldExpense.amount !== newExpense.amount) {
      changes.push(`amount from ₹${oldExpense.amount} to ₹${newExpense.amount}`);
    }
    if (oldExpense.description !== newExpense.description) {
      changes.push(`description from "${oldExpense.description}" to "${newExpense.description}"`);
    }
    if (oldExpense.category !== newExpense.category) {
      changes.push(`category from ${oldExpense.category} to ${newExpense.category}`);
    }
    if (oldExpense.date !== newExpense.date) {
      changes.push(`date from ${oldExpense.date} to ${newExpense.date}`);
    }

    const details = changes.length > 0
      ? `Updated expense: ${changes.join(", ")}`
      : `Updated expense: ${newExpense.description || newExpense.category} - ₹${newExpense.amount}`;

    await addDoc(collection(db, COLLECTION_NAME), {
      action: "UPDATE",
      expenseId,
      details,
      timestamp: Timestamp.now(),
      userId,
      oldExpense: {
        amount: oldExpense.amount,
        description: oldExpense.description,
        category: oldExpense.category,
        date: oldExpense.date,
      },
      newExpense: {
        amount: newExpense.amount,
        description: newExpense.description,
        category: newExpense.category,
        date: newExpense.date,
      },
    });
  } catch (error) {
    console.error("Error logging update activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
};

/**
 * Log a DELETE action
 */
export const logDeleteActivity = async (
  expense: PersonalExpense,
  userId: string
): Promise<void> => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      action: "DELETE",
      expenseId: expense.id,
      details: `Deleted expense: ${expense.description || expense.category} - ₹${expense.amount}`,
      timestamp: Timestamp.now(),
      userId,
      expense: {
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: expense.date,
      },
    });
  } catch (error) {
    console.error("Error logging delete activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
};

/**
 * Subscribe to activity logs for a user
 */
export const subscribeToActivities = (
  userId: string,
  callback: (activities: PersonalExpenseActivity[]) => void,
  maxItems: number = 50
): Unsubscribe | null => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activities = snapshot.docs.map((doc) =>
          docToActivity(doc.id, doc.data() as ActivityDoc)
        );
        callback(activities);
      },
      (error) => {
        console.error("Error in activity subscription:", error);
        // Fallback: try without orderBy if index is missing
        if (error.code === "failed-precondition") {
          const simpleQuery = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            limit(maxItems)
          );
          return onSnapshot(simpleQuery, (snapshot) => {
            const activities = snapshot.docs.map((doc) =>
              docToActivity(doc.id, doc.data() as ActivityDoc)
            );
            // Sort manually by timestamp
            activities.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
            callback(activities);
          });
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up activity subscription:", error);
    return null;
  }
};
