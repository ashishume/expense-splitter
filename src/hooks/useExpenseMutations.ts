import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/apiService";
import type { PersonalExpense } from "../types/personalExpense";

/**
 * Extract month from date string (YYYY-MM-DD -> YYYY-MM)
 */
const getMonthFromDate = (date: string): string => {
  return date.substring(0, 7);
};

/**
 * Mutation hook for creating an expense
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation<PersonalExpense, Error, {
    expense: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">;
    userId: string;
  }>({
    mutationFn: async ({
      expense,
      userId,
    }) => {
      return api.expenses.create(expense, userId) as Promise<PersonalExpense>;
    },
    onSuccess: (data) => {
      const month = getMonthFromDate(data.date);
      // Invalidate expenses and stats for the affected month
      queryClient.invalidateQueries({ queryKey: ["expenses", month] });
      queryClient.invalidateQueries({ queryKey: ["stats", month] });
      
      // Also invalidate previous month stats (for savings calculation)
      const [year, monthNum] = month.split("-").map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      queryClient.invalidateQueries({ queryKey: ["stats", prevMonth] });
    },
  });
};

/**
 * Mutation hook for updating an expense
 */
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation<PersonalExpense, Error, {
    id: string;
    updates: Partial<Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">>;
    userId: string;
  }>({
    mutationFn: async ({
      id,
      updates,
      userId,
    }) => {
      return api.expenses.update(id, updates, userId) as Promise<PersonalExpense>;
    },
    onSuccess: (data) => {
      const month = getMonthFromDate(data.date);
      // Invalidate expenses and stats for the affected month
      queryClient.invalidateQueries({ queryKey: ["expenses", month] });
      queryClient.invalidateQueries({ queryKey: ["stats", month] });
      
      // Also invalidate previous month stats
      const [year, monthNum] = month.split("-").map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      queryClient.invalidateQueries({ queryKey: ["stats", prevMonth] });
    },
  });
};

/**
 * Mutation hook for deleting an expense
 */
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, {
    id: string;
    userId: string;
    expenseMonth?: string;
  }>({
    mutationFn: async ({
      id,
      userId,
    }) => {
      await api.expenses.delete(id, userId);
    },
    onSuccess: (_data, variables) => {
      const month = variables.expenseMonth || new Date().toISOString().substring(0, 7);
      // Invalidate expenses and stats for the affected month
      queryClient.invalidateQueries({ queryKey: ["expenses", month] });
      queryClient.invalidateQueries({ queryKey: ["stats", month] });
      
      // Also invalidate previous month stats
      const [year, monthNum] = month.split("-").map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      queryClient.invalidateQueries({ queryKey: ["stats", prevMonth] });
    },
  });
};

/**
 * Mutation hook for batch creating expenses
 */
export const useBatchCreateExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation<PersonalExpense[], Error, {
    expenses: Omit<PersonalExpense, "id" | "createdAt" | "updatedAt">[];
    userId: string;
  }>({
    mutationFn: async ({
      expenses,
      userId,
    }) => {
      return api.expenses.batchCreate(expenses, userId) as Promise<PersonalExpense[]>;
    },
    onSuccess: (data) => {
      // Invalidate all months that were affected
      const months = new Set<string>();
      data.forEach((exp: PersonalExpense) => {
        months.add(getMonthFromDate(exp.date));
      });
      
      months.forEach((month) => {
        queryClient.invalidateQueries({ queryKey: ["expenses", month] });
        queryClient.invalidateQueries({ queryKey: ["stats", month] });
        
        // Also invalidate previous month stats for each affected month
        const [year, monthNum] = month.split("-").map(Number);
        const prevDate = new Date(year, monthNum - 2, 1);
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
        queryClient.invalidateQueries({ queryKey: ["stats", prevMonth] });
      });
    },
  });
};
