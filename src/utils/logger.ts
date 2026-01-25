import { getDatabaseProvider } from "../config/database";
import { createLog as createLogSupabase, cleanupOldLogs as cleanupOldLogsSupabase } from "../services/supabase/groupStorage";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";

export interface LogEntry {
  action: string;
  details: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  groupId?: string;
  changes?: {
    // For expense updates
    oldAmount?: number;
    newAmount?: number;
    oldDescription?: string;
    newDescription?: string;
    oldPaidBy?: string;
    oldPaidByName?: string;
    newPaidBy?: string;
    newPaidByName?: string;
    oldSplitWith?: string[];
    newSplitWith?: string[];
    // For expense deletes
    deletedAmount?: number;
    deletedDescription?: string;
    deletedPaidBy?: string;
    deletedPaidByName?: string;
    deletedSplitWith?: string[];
    // For member actions
    oldMemberCount?: number;
    newMemberCount?: number;
    addedMembers?: string[];
    removedMembers?: string[];
  };
}

export const logAction = async (entry: LogEntry) => {
  try {
    const provider = getDatabaseProvider();
    if (provider === "supabase") {
      await createLogSupabase(entry);
    } else {
      await addDoc(collection(db, "logs"), {
        ...entry,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error logging action:", error);
  }
};

export const logExpenseAction = async (
  action: "create" | "update" | "delete",
  _expenseId: string, // Kept for backward compatibility, not displayed to users
  details: string,
  userId?: string,
  userName?: string,
  groupId?: string,
  oldExpense?: {
    amount?: number;
    description?: string;
    paidBy?: string;
    paidByName?: string;
    splitWith?: string[];
  },
  newExpense?: {
    amount?: number;
    description?: string;
    paidBy?: string;
    paidByName?: string;
    splitWith?: string[];
  }
) => {
  let changes;
  if (action === "update" && oldExpense && newExpense) {
    changes = {
      oldAmount: oldExpense.amount,
      newAmount: newExpense.amount,
      oldDescription: oldExpense.description,
      newDescription: newExpense.description,
      oldPaidBy: oldExpense.paidBy,
      oldPaidByName: oldExpense.paidByName,
      newPaidBy: newExpense.paidBy,
      newPaidByName: newExpense.paidByName,
      oldSplitWith: oldExpense.splitWith,
      newSplitWith: newExpense.splitWith,
    };
  } else if (action === "delete" && oldExpense) {
    changes = {
      deletedAmount: oldExpense.amount,
      deletedDescription: oldExpense.description,
      deletedPaidBy: oldExpense.paidBy,
      deletedPaidByName: oldExpense.paidByName,
      deletedSplitWith: oldExpense.splitWith,
    };
  }

  await logAction({
    action: `EXPENSE_${action.toUpperCase()}`,
    details: details,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    groupId,
    changes,
  });
};

export const logMemberAction = async (
  action: "add" | "remove",
  memberName: string,
  userId?: string,
  userName?: string,
  groupId?: string,
  oldMemberCount?: number,
  newMemberCount?: number,
  addedMembers?: string[],
  removedMembers?: string[]
) => {
  const details =
    action === "add"
      ? `Added member: ${memberName}`
      : `Removed member: ${memberName}`;
  await logAction({
    action: `MEMBER_${action.toUpperCase()}`,
    details: details,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    groupId,
    changes: {
      oldMemberCount,
      newMemberCount,
      addedMembers,
      removedMembers,
    },
  });
};

/**
 * Clean up logs older than 2 months
 * Deletes logs that are older than 60 days from the current date
 * Processes deletions in batches to respect Firestore's 500 operation limit
 */
export const cleanupOldLogs = async (): Promise<number> => {
  try {
    const provider = getDatabaseProvider();
    if (provider === "supabase") {
      return await cleanupOldLogsSupabase();
    } else {
      // Firebase implementation
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const cutoffDateString = twoMonthsAgo.toISOString();
      const logsQuery = query(
        collection(db, "logs"),
        where("timestamp", "<", cutoffDateString)
      );

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

      console.log(`Cleaned up ${totalDeleted} log entries older than 2 months`);
      return totalDeleted;
    }
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
    return 0;
  }
};
