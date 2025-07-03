import { db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export interface LogEntry {
  action: string;
  details: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  groupId?: string;
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
  expenseId: string,
  details: string,
  userId?: string,
  userName?: string,
  groupId?: string
) => {
  await logAction({
    action: `EXPENSE_${action.toUpperCase()}`,
    details: `Expense ID: ${expenseId} - ${details}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    groupId,
  });
};
