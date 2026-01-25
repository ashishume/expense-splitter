/**
 * Personal Expense Storage Service - Supabase PostgreSQL
 *
 * This service uses Supabase PostgreSQL for cloud storage with realtime sync.
 * Requires user to be signed in.
 */

import type {
  PersonalExpense,
  ExpenseCategory,
  MonthlyStats,
  ExpenseFilterOptions,
} from "../../types/personalExpense";
import { supabase, toISOString } from "../../supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
import {
  logCreateActivity,
  logUpdateActivity,
  logDeleteActivity,
} from "./personalExpenseActivityLog";

const TABLE_NAME = "personal_expenses";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

// Supabase row type
interface ExpenseRow {
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
const rowToExpense = (row: ExpenseRow): PersonalExpense => ({
  id: row.id,
  amount: row.amount,
  description: row.description,
  category: row.category as ExpenseCategory,
  date: row.date,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
  userId: row.user_id,
});

// Convert PersonalExpense to Supabase row
const expenseToRow = (
  expense: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">,
  userId: string
) => {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    date: expense.date,
    created_at: now,
    updated_at: now,
  };
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
  try {
    const rowData = expenseToRow(expense, userId);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(rowData)
      .select()
      .single();

    if (error) throw error;

    const createdExpense: PersonalExpense = {
      id: data.id,
      amount: data.amount,
      description: data.description,
      category: data.category as ExpenseCategory,
      date: data.date,
      createdAt: toISOString(data.created_at),
      updatedAt: toISOString(data.updated_at),
      userId: data.user_id,
    };

    // Log activity
    logCreateActivity(createdExpense, userId).catch((err) =>
      console.error("Failed to log create activity:", err)
    );

    return createdExpense;
  } catch (error) {
    console.error("Error creating expense in Supabase:", error);
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
    let query = supabase.from(TABLE_NAME).select("*").eq("user_id", userId);

    // Filter by month if provided
    if (options?.month) {
      const startDate = `${options.month}-01`;
      const [year, month] = options.month.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${options.month}-${lastDay.toString().padStart(2, "0")}T23:59:59.999Z`;
      
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    let expenses = (data || []).map((row) => rowToExpense(row as ExpenseRow));

    // Filter by category (client-side for consistency with Firebase)
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
    console.error("Error fetching expenses from Supabase:", error);
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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToExpense(data as ExpenseRow);
};

/**
 * Update an existing expense
 */
export const updateExpense = async (
  id: string,
  updates: Partial<Omit<PersonalExpense, "id" | "createdAt">>,
  userId: string
): Promise<PersonalExpense | null> => {
  // First, get existing expense
  const existing = await getExpenseById(id, userId);
  if (!existing) {
    return null;
  }

  const updateData: Partial<ExpenseRow> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.date !== undefined) updateData.date = updates.date;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Update failed");
  }

  const updatedExpense = rowToExpense(data as ExpenseRow);

  // Log activity
  logUpdateActivity(id, existing, updatedExpense, userId).catch(
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
  // Get expense before deleting for activity log
  const expenseToDelete = await getExpenseById(id, userId);
  if (!expenseToDelete) {
    return false;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  // Log activity
  logDeleteActivity(expenseToDelete, userId).catch((err) =>
    console.error("Failed to log delete activity:", err)
  );

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
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("date")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching available months:", error);
    return [];
  }

  const monthsSet = new Set<string>();

  (data || []).forEach((row: { date: string }) => {
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
 * Export expenses as CSV
 */
export const exportExpensesAsCSV = async (
  userId: string,
  month?: string
): Promise<string> => {
  const expenses = await getExpenses(month ? { month } : undefined, userId);

  if (expenses.length === 0) {
    return "amount,description,category,date\n";
  }

  // Create CSV header
  const header = "amount,description,category,date\n";

  // Convert expenses to CSV rows
  const rows = expenses.map((exp) => {
    // Escape description if it contains commas or quotes
    const escapedDescription = exp.description.includes(",") || exp.description.includes('"')
      ? `"${exp.description.replace(/"/g, '""')}"`
      : exp.description;

    // Format date as YYYY-MM-DD
    const dateStr = exp.date.split("T")[0];

    return `${exp.amount},${escapedDescription},${exp.category},${dateStr}`;
  });

  return header + rows.join("\n");
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
    const idsToDelete = existingExpenses.map((e) => e.id);
    
    if (idsToDelete.length > 0) {
      await supabase.from(TABLE_NAME).delete().in("id", idsToDelete);
    }
  }

  // Add imported expenses
  const rowsToInsert = imported.map((exp) => expenseToRow(exp, userId));
  
  // Process in batches of 1000 (Supabase limit)
  const batchSize = 1000;
  let count = 0;
  
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const chunk = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from(TABLE_NAME).insert(chunk);
    
    if (error) throw error;
    count += chunk.length;
  }

  return count;
};

/**
 * Batch create expenses from CSV import
 */
export const batchCreateExpenses = async (
  expenses: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">[],
  userId: string
): Promise<PersonalExpense[]> => {
  if (expenses.length === 0) {
    return [];
  }

  const rowsToInsert = expenses.map((exp) => expenseToRow(exp, userId));

  // Process in batches of 1000
  const batchSize = 1000;
  const createdExpenses: PersonalExpense[] = [];

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const chunk = rowsToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(chunk)
      .select();

    if (error) throw error;

    const expenses = (data || []).map((row) => rowToExpense(row as ExpenseRow));
    createdExpenses.push(...expenses);
  }

  // Log activities for all created expenses
  createdExpenses.forEach((expense) => {
    logCreateActivity(expense, userId).catch((err) =>
      console.error("Failed to log create activity:", err)
    );
  });

  return createdExpenses;
};

// ============================================
// Realtime Subscriptions
// ============================================

export type ExpenseChangeCallback = (payload: {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  expense: PersonalExpense | null;
  oldExpense?: PersonalExpense | null;
}) => void;

// Type for unsubscribe function (compatible with Firebase)
export type Unsubscribe = () => void;

/**
 * Subscribe to realtime expense changes for a user
 */
export const subscribeToExpenses = (
  userId: string,
  callback: ExpenseChangeCallback
): Unsubscribe | null => {
  try {
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
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const expense = rowToExpense(payload.new as ExpenseRow);
            callback({
              eventType: "INSERT",
              expense,
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const expense = rowToExpense(payload.new as ExpenseRow);
            callback({
              eventType: "UPDATE",
              expense,
            });
          } else if (payload.eventType === "DELETE" && payload.old) {
            const expense = rowToExpense(payload.old as ExpenseRow);
            callback({
              eventType: "DELETE",
              expense: null,
              oldExpense: expense,
            });
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel as RealtimeChannel);
    };
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
