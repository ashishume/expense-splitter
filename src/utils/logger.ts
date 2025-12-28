import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

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
    // For member actions
    oldMemberCount?: number;
    newMemberCount?: number;
    addedMembers?: string[];
    removedMembers?: string[];
  };
}

export const logAction = async (entry: LogEntry) => {
  try {
    await addDoc(collection(db, "logs"), {
      ...entry,
      timestamp: new Date().toISOString(),
    });
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
  const changes =
    action === "update" && oldExpense && newExpense
      ? {
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
        }
      : undefined;

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
