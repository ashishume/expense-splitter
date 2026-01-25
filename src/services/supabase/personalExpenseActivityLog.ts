/**
 * Personal Expense Activity Log Service - Supabase
 * Tracks all CRUD operations for personal expenses
 */

import { supabase, toISOString } from "../../supabase";
import type { PersonalExpense } from "../../types/personalExpense";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TABLE_NAME = "personal_expense_activities";

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

interface ActivityRow {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  expense_id: string;
  details: string;
  timestamp: string;
  user_id: string;
  expense?: {
    amount: number;
    description: string;
    category: string;
    date: string;
  };
  old_expense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
  new_expense?: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
  };
}

const rowToActivity = (row: ActivityRow): PersonalExpenseActivity => ({
  id: row.id,
  action: row.action,
  expenseId: row.expense_id,
  details: row.details,
  timestamp: toISOString(row.timestamp),
  userId: row.user_id,
  expense: row.expense,
  oldExpense: row.old_expense,
  newExpense: row.new_expense,
});

/**
 * Log a CREATE action
 */
export const logCreateActivity = async (
  expense: PersonalExpense,
  userId: string
): Promise<void> => {
  try {
    await supabase.from(TABLE_NAME).insert({
      action: "CREATE",
      expense_id: expense.id,
      details: `Added expense: ${expense.description || expense.category} - ₹${expense.amount}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      expense: {
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: expense.date,
      },
    });
  } catch (error) {
    console.error("Error logging create activity:", error);
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

    await supabase.from(TABLE_NAME).insert({
      action: "UPDATE",
      expense_id: expenseId,
      details,
      timestamp: new Date().toISOString(),
      user_id: userId,
      old_expense: {
        amount: oldExpense.amount,
        description: oldExpense.description,
        category: oldExpense.category,
        date: oldExpense.date,
      },
      new_expense: {
        amount: newExpense.amount,
        description: newExpense.description,
        category: newExpense.category,
        date: newExpense.date,
      },
    });
  } catch (error) {
    console.error("Error logging update activity:", error);
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
    await supabase.from(TABLE_NAME).insert({
      action: "DELETE",
      expense_id: expense.id,
      details: `Deleted expense: ${expense.description || expense.category} - ₹${expense.amount}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      expense: {
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: expense.date,
      },
    });
  } catch (error) {
    console.error("Error logging delete activity:", error);
  }
};

export interface PaginatedActivitiesResult {
  activities: PersonalExpenseActivity[];
  lastDoc: { id: string; timestamp: string } | null;
  hasMore: boolean;
}

/**
 * Get activities with pagination support
 */
export const getActivitiesPaginated = async (
  userId: string,
  pageSize: number = 20,
  lastDoc: { id: string; timestamp: string } | null = null
): Promise<PaginatedActivitiesResult> => {
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(pageSize + 1);

    if (lastDoc) {
      query = query.lt("timestamp", lastDoc.timestamp);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data || []) as ActivityRow[];
    const hasMore = rows.length > pageSize;
    const activitiesToReturn = hasMore ? rows.slice(0, pageSize) : rows;
    
    const activities = activitiesToReturn.map((row) => rowToActivity(row));

    return {
      activities,
      lastDoc: activitiesToReturn.length > 0
        ? { id: activitiesToReturn[activitiesToReturn.length - 1].id, timestamp: activitiesToReturn[activitiesToReturn.length - 1].timestamp }
        : null,
      hasMore,
    };
  } catch (error) {
    console.error("Error fetching paginated activities:", error);
    return { activities: [], lastDoc: null, hasMore: false };
  }
};

export type Unsubscribe = () => void;

/**
 * Subscribe to activity logs for a user (real-time updates for initial page only)
 */
export const subscribeToActivities = (
  userId: string,
  callback: (activities: PersonalExpenseActivity[]) => void,
  maxItems: number = 20
): Unsubscribe | null => {
  try {
    const channel = supabase
      .channel(`activities:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE_NAME,
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // Fetch latest activities when change occurs
          const result = await getActivitiesPaginated(userId, maxItems);
          callback(result.activities);
        }
      )
      .subscribe();

    // Initial fetch
    getActivitiesPaginated(userId, maxItems).then((result) => {
      callback(result.activities);
    });

    return () => {
      supabase.removeChannel(channel as RealtimeChannel);
    };
  } catch (error) {
    console.error("Error setting up activity subscription:", error);
    return null;
  }
};
