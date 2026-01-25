import { useQuery } from "@tanstack/react-query";
import { api } from "../services/apiService";
import type { PersonalExpense, MonthlyStats } from "../types/personalExpense";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

// Helper to get previous month string
const getPreviousMonthStr = (monthStr: string): string => {
  const [year, month] = monthStr.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return formatMonthString(prevDate);
};

/**
 * Query hook for fetching expenses for a specific month
 */
export const useExpenses = (month: string, userId: string | null) => {
  return useQuery<PersonalExpense[]>({
    queryKey: ["expenses", month, userId],
    queryFn: async (): Promise<PersonalExpense[]> => {
      if (!userId) return [];
      return api.expenses.getAll({ month }, userId) as Promise<PersonalExpense[]>;
    },
    enabled: !!userId && !!month,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Query hook for fetching monthly stats
 */
export const useMonthlyStats = (month: string, userId: string | null) => {
  return useQuery<MonthlyStats>({
    queryKey: ["stats", month, userId],
    queryFn: async (): Promise<MonthlyStats> => {
      if (!userId) {
        // Return empty stats if no user
        const byCategory = {
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
        } as const;
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
      return api.expenses.getMonthlyStats(month, userId) as Promise<MonthlyStats>;
    },
    enabled: !!userId && !!month,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Query hook for fetching previous month stats (for comparison)
 */
export const usePreviousMonthStats = (currentMonth: string, userId: string | null) => {
  const prevMonth = getPreviousMonthStr(currentMonth);
  
  return useQuery<MonthlyStats>({
    queryKey: ["stats", prevMonth, userId],
    queryFn: async (): Promise<MonthlyStats> => {
      if (!userId) {
        const byCategory = {
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
        } as const;
        return {
          month: prevMonth,
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
      return api.expenses.getMonthlyStats(prevMonth, userId) as Promise<MonthlyStats>;
    },
    enabled: !!userId && !!currentMonth,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
