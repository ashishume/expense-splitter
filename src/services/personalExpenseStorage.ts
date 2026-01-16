/**
 * Personal Expense Storage Service - Supabase Only
 *
 * This service uses Supabase for cloud storage with realtime sync.
 * Requires user to be signed in.
 */

import type {
  PersonalExpense,
  ExpenseCategory,
  MonthlyStats,
  ExpenseFilterOptions,
} from "../types/personalExpense";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

const TABLE_NAME = "personal_expenses";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

// Supabase row type
interface PersonalExpenseRow {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

// Convert Supabase row to PersonalExpense
const rowToExpense = (row: PersonalExpenseRow): PersonalExpense => ({
  id: row.id,
  amount: row.amount,
  description: row.description,
  category: row.category as ExpenseCategory,
  date: row.date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

// Helper to check if service is ready
const ensureConfigured = () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Please check your environment variables."
    );
  }
};

// ============================================
// Supabase CRUD Operations
// ============================================

/**
 * Create a new expense
 * @returns The created expense with generated ID
 */
export const createExpense = async (
  expense: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<PersonalExpense> => {
  ensureConfigured();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: userId,
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating expense in Supabase:", error);
    throw new Error(error.message);
  }

  return rowToExpense(data as PersonalExpenseRow);
};

/**
 * Get all expenses with optional filtering
 */
export const getExpenses = async (
  options?: ExpenseFilterOptions,
  userId?: string
): Promise<PersonalExpense[]> => {
  ensureConfigured();

  if (!userId) {
    return [];
  }

  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  // Filter by month (date starts with YYYY-MM)
  if (options?.month) {
    const startDate = `${options.month}-01`;
    const [year, month] = options.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${options.month}-${lastDay.toString().padStart(2, "0")}`;

    query = query
      .gte("date", startDate)
      .lte("date", endDate + "T23:59:59.999Z");
  }

  // Filter by category
  if (options?.category) {
    query = query.eq("category", options.category);
  }

  // Filter by search query
  if (options?.searchQuery) {
    query = query.ilike("description", `%${options.searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expenses from Supabase:", error);
    throw new Error(error.message);
  }

  return ((data || []) as PersonalExpenseRow[]).map(rowToExpense);
};

/**
 * Get a single expense by ID
 */
export const getExpenseById = async (
  id: string,
  userId: string
): Promise<PersonalExpense | null> => {
  ensureConfigured();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching expense from Supabase:", error);
    return null;
  }

  return data ? rowToExpense(data as PersonalExpenseRow) : null;
};

/**
 * Update an existing expense
 */
export const updateExpense = async (
  id: string,
  updates: Partial<Omit<PersonalExpense, "id" | "createdAt">>,
  userId: string
): Promise<PersonalExpense | null> => {
  ensureConfigured();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.date !== undefined) updateData.date = updates.date;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating expense in Supabase:", error);
    throw new Error(error.message);
  }

  return data ? rowToExpense(data as PersonalExpenseRow) : null;
};

/**
 * Delete an expense
 */
export const deleteExpense = async (
  id: string,
  userId: string
): Promise<boolean> => {
  ensureConfigured();

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting expense from Supabase:", error);
    throw new Error(error.message);
  }

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
  ensureConfigured();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("date")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching months from Supabase:", error);
    throw new Error(error.message);
  }

  const monthsSet = new Set<string>();
  ((data || []) as { date: string }[]).forEach((row) => {
    const month = row.date.substring(0, 7);
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
  ensureConfigured();

  try {
    const imported: PersonalExpense[] = JSON.parse(data);

    if (!Array.isArray(imported)) {
      throw new Error("Invalid data format");
    }

    const rows = imported.map((exp) => ({
      user_id: userId,
      amount: exp.amount,
      description: exp.description,
      category: exp.category,
      date: exp.date,
    }));

    if (!merge) {
      // Delete existing expenses first
      await supabase.from(TABLE_NAME).delete().eq("user_id", userId);
    }

    const { error } = await supabase.from(TABLE_NAME).insert(rows);

    if (error) {
      console.error("Error importing expenses to Supabase:", error);
      throw new Error(error.message);
    }

    return rows.length;
  } catch (error) {
    console.error("Error importing expenses:", error);
    throw error;
  }
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
): RealtimeChannel | null => {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured, realtime subscriptions disabled");
    return null;
  }

  const channel = supabase
    .channel(`personal_expenses:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE_NAME,
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<PersonalExpenseRow>) => {
        const eventType = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
        const newRow = payload.new as
          | PersonalExpenseRow
          | Record<string, never>;
        const oldRow = payload.old as
          | PersonalExpenseRow
          | Record<string, never>;

        callback({
          eventType,
          expense:
            newRow && Object.keys(newRow).length > 0
              ? rowToExpense(newRow as PersonalExpenseRow)
              : null,
          oldExpense:
            oldRow && Object.keys(oldRow).length > 0
              ? rowToExpense(oldRow as PersonalExpenseRow)
              : null,
        });
      }
    )
    .subscribe();

  return channel;
};

/**
 * Unsubscribe from realtime expense changes
 */
export const unsubscribeFromExpenses = async (
  channel: RealtimeChannel | null
): Promise<void> => {
  if (channel) {
    await supabase.removeChannel(channel);
  }
};
