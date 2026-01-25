/**
 * Firebase Group Storage Service
 * Wraps Firebase operations for groups, users, expenses, and logs
 */

import { db } from "../../firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { User, Group, Expense } from "../../types";
import type { LogEntry } from "../../utils/logger";

// ============================================
// Users
// ============================================

export const getUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

export const subscribeToUsers = (callback: (users: User[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
};

// ============================================
// Groups
// ============================================

export const getGroups = async (): Promise<Group[]> => {
  const snapshot = await getDocs(collection(db, "groups"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Group[];
};

export const createGroup = async (group: Omit<Group, "id">): Promise<Group> => {
  const docRef = await addDoc(collection(db, "groups"), group);
  return {
    id: docRef.id,
    ...group,
  };
};

export const updateGroup = async (id: string, updates: Partial<Group>): Promise<Group | null> => {
  const docRef = doc(db, "groups", id);
  await updateDoc(docRef, updates);
  const updated = await getDocs(query(collection(db, "groups"), where("__name__", "==", id)));
  if (updated.empty) return null;
  return {
    id: updated.docs[0].id,
    ...updated.docs[0].data(),
  } as Group;
};

export const subscribeToGroups = (callback: (groups: Group[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, "groups"), (snapshot) => {
    const groups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[];
    callback(groups);
  });
};

// ============================================
// Group Expenses
// ============================================

export const getGroupExpenses = async (groupId: string, limitCount?: number): Promise<Expense[]> => {
  let q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("date", "desc"));
  if (limitCount) {
    q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("date", "desc"), limit(limitCount));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Expense[];
};

export const createGroupExpense = async (expense: Omit<Expense, "id">): Promise<Expense> => {
  const docRef = await addDoc(collection(db, "expenses"), expense);
  return {
    id: docRef.id,
    ...expense,
  };
};

export const updateGroupExpense = async (id: string, updates: Partial<Omit<Expense, "id">>): Promise<Expense | null> => {
  const docRef = doc(db, "expenses", id);
  await updateDoc(docRef, updates);
  const updated = await getDoc(docRef);
  if (!updated.exists()) return null;
  return {
    id: updated.id,
    ...updated.data(),
  } as Expense;
};

export const deleteGroupExpense = async (id: string): Promise<boolean> => {
  await deleteDoc(doc(db, "expenses", id));
  return true;
};

export const subscribeToGroupExpenses = (
  groupId: string,
  callback: (expenses: Expense[]) => void,
  limitCount?: number
): Unsubscribe => {
  let q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("date", "desc"));
  if (limitCount) {
    q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("date", "desc"), limit(limitCount));
  }
  return onSnapshot(
    q,
    (snapshot) => {
      const expenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];
      callback(expenses);
    },
    () => {
      // Fallback without orderBy
      const simpleQuery = query(collection(db, "expenses"), where("groupId", "==", groupId));
      return onSnapshot(simpleQuery, (snapshot) => {
        const expenses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (limitCount) {
          callback(expenses.slice(0, limitCount));
        } else {
          callback(expenses);
        }
      });
    }
  );
};

// ============================================
// Logs
// ============================================

export const getGroupLogs = async (groupId: string, limitCount?: number): Promise<(LogEntry & { id: string })[]> => {
  let q = query(collection(db, "logs"), where("groupId", "==", groupId), orderBy("timestamp", "desc"));
  if (limitCount) {
    q = query(collection(db, "logs"), where("groupId", "==", groupId), orderBy("timestamp", "desc"), limit(limitCount));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (LogEntry & { id: string })[];
};

export const createLog = async (entry: LogEntry): Promise<void> => {
  await addDoc(collection(db, "logs"), {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  });
};

export const subscribeToGroupLogs = (
  groupId: string,
  callback: (logs: (LogEntry & { id: string })[]) => void,
  limitCount?: number
): Unsubscribe => {
  let q = query(collection(db, "logs"), where("groupId", "==", groupId), orderBy("timestamp", "desc"));
  if (limitCount) {
    q = query(collection(db, "logs"), where("groupId", "==", groupId), orderBy("timestamp", "desc"), limit(limitCount));
  }
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (LogEntry & { id: string })[];
      callback(logs);
    },
    () => {
      // Fallback without orderBy
      const simpleQuery = query(collection(db, "logs"), where("groupId", "==", groupId));
      return onSnapshot(simpleQuery, (snapshot) => {
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (LogEntry & { id: string })[];
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (limitCount) {
          callback(logs.slice(0, limitCount));
        } else {
          callback(logs);
        }
      });
    }
  );
};

export const cleanupOldLogs = async (): Promise<number> => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const cutoffDateString = twoMonthsAgo.toISOString();

  const logsQuery = query(collection(db, "logs"), where("timestamp", "<", cutoffDateString));
  const snapshot = await getDocs(logsQuery);
  const logsToDelete = snapshot.docs;

  if (logsToDelete.length === 0) {
    return 0;
  }

  const BATCH_LIMIT = 500;
  let totalDeleted = 0;

  for (let i = 0; i < logsToDelete.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const batchLogs = logsToDelete.slice(i, i + BATCH_LIMIT);

    batchLogs.forEach((logDoc) => {
      const logRef = doc(db, "logs", logDoc.id);
      batch.delete(logRef);
    });

    await batch.commit();
    totalDeleted += batchLogs.length;
  }

  return totalDeleted;
};
