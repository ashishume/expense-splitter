/**
 * Centralized API Service - All Database Calls
 * 
 * This service acts as a single entry point for all database operations.
 * All DB calls go through here for easy debugging, logging, and monitoring.
 * 
 * Usage:
 *   import { api } from './services/apiService';
 *   const expenses = await api.expenses.getAll({ month: '2026-01' });
 */

import type {
  PersonalExpense,
  ExpenseCategory,
  MonthlyStats,
  ExpenseFilterOptions,
  FixedCost,
  FixedCostInstance,
  Investment,
  InvestmentInstance,
  SalaryIncome,
  SalaryInstance,
  OneTimeInvestment,
} from "../types/personalExpense";

// Import database adapter
import { getDatabaseProvider } from "../config/database";
import { dataCache, extractMonth } from "../utils/dataCache";

// Import both Firebase and Supabase services
import * as firebaseExpenseStorage from "./personalExpenseStorage";
import * as firebaseFixedCostStorage from "./fixedCostStorage";
import * as firebaseInvestmentStorage from "./investmentStorage";
import * as firebaseSalaryStorage from "./salaryStorage";
import * as firebaseOneTimeInvestmentStorage from "./oneTimeInvestmentStorage";

import * as supabaseExpenseStorage from "./supabase/personalExpenseStorage";
import * as supabaseFixedCostStorage from "./supabase/fixedCostStorage";
import * as supabaseInvestmentStorage from "./supabase/investmentStorage";
import * as supabaseSalaryStorage from "./supabase/salaryStorage";
import * as supabaseOneTimeInvestmentStorage from "./supabase/oneTimeInvestmentStorage";

// Select services based on provider
const provider = getDatabaseProvider();
const expenseStorage = provider === "supabase" ? supabaseExpenseStorage : firebaseExpenseStorage;
const fixedCostStorage = provider === "supabase" ? supabaseFixedCostStorage : firebaseFixedCostStorage;
const investmentStorage = provider === "supabase" ? supabaseInvestmentStorage : firebaseInvestmentStorage;
const salaryStorage = provider === "supabase" ? supabaseSalaryStorage : firebaseSalaryStorage;
const oneTimeInvestmentStorage = provider === "supabase" ? supabaseOneTimeInvestmentStorage : firebaseOneTimeInvestmentStorage;

// Debug mode - set to true to enable detailed logging
const DEBUG_MODE = process.env.NODE_ENV === "development" || false;

interface LogEntry {
  timestamp: string;
  service: string;
  operation: string;
  params?: string;
  success: boolean;
  error?: string;
  resultType?: string;
}

// Log all API calls for debugging
const logApiCall = (
  service: string,
  operation: string,
  params?: unknown,
  result?: unknown,
  error?: Error | unknown
) => {
  if (!DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    timestamp,
    service,
    operation,
    params: params ? JSON.stringify(params, null, 2) : undefined,
    success: !error,
    error: error && error instanceof Error ? error.message : String(error),
    resultType: result ? typeof result : undefined,
  };

  console.group(`🔵 API Call: ${service}.${operation}`);
  console.log("Timestamp:", timestamp);
  if (params) console.log("Params:", params);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", result ? "✓" : "No result");
    if (result && typeof result === "object" && !Array.isArray(result)) {
      console.log("Result keys:", Object.keys(result));
    } else if (Array.isArray(result)) {
      console.log("Result count:", result.length);
    }
  }
  console.groupEnd();

  // Store in window for debugging (only in dev)
  if (typeof window !== "undefined" && DEBUG_MODE) {
    interface WindowWithApiCalls extends Window {
      __apiCalls?: LogEntry[];
    }
    const win = window as WindowWithApiCalls;
    win.__apiCalls = win.__apiCalls || [];
    win.__apiCalls.push(logEntry);
    // Keep only last 100 calls
    if (win.__apiCalls.length > 100) {
      win.__apiCalls.shift();
    }
  }
};

// Wrapper function to add logging to any async function
const withLogging = <TArgs extends unknown[], TReturn>(
  service: string,
  operation: string,
  fn: (...args: TArgs) => Promise<TReturn>
): ((...args: TArgs) => Promise<TReturn>) => {
  return async (...args: TArgs): Promise<TReturn> => {
    const startTime = Date.now();
    try {
      logApiCall(service, operation, args[0], undefined, undefined);
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      logApiCall(service, operation, args[0], result, undefined);
      if (DEBUG_MODE) {
        console.log(`⏱️  Duration: ${duration}ms`);
      }
      return result;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      logApiCall(service, operation, args[0], undefined, error);
      if (DEBUG_MODE) {
        console.error(`❌ Failed after ${duration}ms:`, error);
      }
      throw error;
    }
  };
};

// Wrapper function to add cache invalidation for mutations
const withCacheInvalidation = <TArgs extends unknown[], TReturn>(
  service: string,
  operation: string,
  fn: (...args: TArgs) => Promise<TReturn>,
  getMonth?: (result: TReturn, args: TArgs) => string | null
): ((...args: TArgs) => Promise<TReturn>) => {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await fn(...args);
    
    // Invalidate cache based on service and operation
    if (service === "expenses") {
      if (operation === "create" && result) {
        const month = extractMonth((result as unknown as PersonalExpense).date);
        dataCache.invalidateExpenses(month);
      } else if (operation === "update" && result) {
        const month = extractMonth((result as unknown as PersonalExpense).date);
        dataCache.invalidateExpenses(month);
      } else if (operation === "batchCreate" && Array.isArray(result)) {
        // Invalidate all months that were affected
        const months = new Set<string>();
        (result as unknown as PersonalExpense[]).forEach((exp) => {
          months.add(extractMonth(exp.date));
        });
        months.forEach((month) => dataCache.invalidateExpenses(month));
      }
    } else if (service === "fixedCosts") {
      if (operation === "createTemplate" || operation === "updateTemplate" || operation === "deleteTemplate") {
        // Template changes affect all months - invalidate all months' stats
        // Since we don't know which month, we'll let components handle it via onUpdate callback
        // But we can still invalidate if month is provided
        if (getMonth) {
          const month = getMonth(result, args);
          if (month) {
            dataCache.invalidateFixedCosts(month);
          }
        }
      } else if (operation === "updateInstance" && getMonth) {
        const month = getMonth(result, args);
        if (month) dataCache.invalidateFixedCosts(month);
      }
    } else if (service === "investments") {
      if (operation === "createTemplate" || operation === "updateTemplate" || operation === "deleteTemplate") {
        if (getMonth) {
          const month = getMonth(result, args);
          if (month) {
            dataCache.invalidateInvestments(month);
          }
        }
      } else if (operation === "updateInstance" && getMonth) {
        const month = getMonth(result, args);
        if (month) dataCache.invalidateInvestments(month);
      }
    } else if (service === "salary") {
      if (operation === "createOrUpdateTemplate") {
        // Template changes affect all months
        if (getMonth) {
          const month = getMonth(result, args);
          if (month) {
            dataCache.invalidateSalary(month);
          }
        }
      } else if (operation === "updateInstance" && getMonth) {
        const month = getMonth(result, args);
        if (month) dataCache.invalidateSalary(month);
      }
    } else if (service === "oneTimeInvestments") {
      if (operation === "create" && result) {
        const month = extractMonth((result as unknown as OneTimeInvestment).date);
        dataCache.invalidateOneTimeInvestments(month);
      } else if (operation === "update" && result) {
        const month = extractMonth((result as unknown as OneTimeInvestment).date);
        dataCache.invalidateOneTimeInvestments(month);
      } else if (args.length > 0 && typeof args[0] === "string") {
        // For getAll, first arg is month
        dataCache.invalidateOneTimeInvestments(args[0]);
      }
    }
    
    return result;
  };
};

/**
 * Centralized API Service
 * All database operations go through this service
 */
export const api = {
  // ============================================
  // Expenses
  // ============================================
  expenses: {
    create: withCacheInvalidation(
      "expenses",
      "create",
      withLogging("expenses", "create", expenseStorage.createExpense),
      (result) => result ? extractMonth((result as PersonalExpense).date) : null
    ),
    getAll: withLogging("expenses", "getAll", expenseStorage.getExpenses),
    getById: withLogging(
      "expenses",
      "getById",
      expenseStorage.getExpenseById
    ),
    update: withCacheInvalidation(
      "expenses",
      "update",
      withLogging("expenses", "update", expenseStorage.updateExpense),
      (result) => result ? extractMonth((result as PersonalExpense).date) : null
    ),
    delete: withCacheInvalidation(
      "expenses",
      "delete",
      withLogging("expenses", "delete", expenseStorage.deleteExpense),
      () => {
        // For delete, components handle cache invalidation
        // since they have access to the expense before deletion
        return null;
      }
    ),
    subscribe: expenseStorage.subscribeToExpenses,
    unsubscribe: expenseStorage.unsubscribeFromExpenses,
    getMonthlyStats: withLogging(
      "expenses",
      "getMonthlyStats",
      expenseStorage.getMonthlyStats
    ),
    batchCreate: withCacheInvalidation(
      "expenses",
      "batchCreate",
      withLogging("expenses", "batchCreate", expenseStorage.batchCreateExpenses),
      (result) => {
        if (Array.isArray(result) && result.length > 0) {
          // Return first month - all months will be invalidated in the wrapper
          return extractMonth((result[0] as PersonalExpense).date);
        }
        return null;
      }
    ),
    exportAsCSV: withLogging(
      "expenses",
      "exportAsCSV",
      expenseStorage.exportExpensesAsCSV
    ),
  },

  // ============================================
  // Fixed Costs
  // ============================================
  fixedCosts: {
    // Templates
    createTemplate: withCacheInvalidation(
      "fixedCosts",
      "createTemplate",
      withLogging("fixedCosts", "createTemplate", fixedCostStorage.createFixedCost)
    ),
    getTemplates: withLogging(
      "fixedCosts",
      "getTemplates",
      fixedCostStorage.getFixedCosts
    ),
    updateTemplate: withCacheInvalidation(
      "fixedCosts",
      "updateTemplate",
      withLogging("fixedCosts", "updateTemplate", fixedCostStorage.updateFixedCost)
    ),
    deleteTemplate: withCacheInvalidation(
      "fixedCosts",
      "deleteTemplate",
      withLogging("fixedCosts", "deleteTemplate", fixedCostStorage.deleteFixedCost)
    ),

    // Instances
    getInstances: withLogging(
      "fixedCosts",
      "getInstances",
      fixedCostStorage.getFixedCostInstances
    ),
    getOrCreateInstance: withLogging(
      "fixedCosts",
      "getOrCreateInstance",
      fixedCostStorage.getOrCreateFixedCostInstance
    ),
    updateInstance: withCacheInvalidation(
      "fixedCosts",
      "updateInstance",
      withLogging("fixedCosts", "updateInstance", fixedCostStorage.updateFixedCostInstance),
      (result) => {
        // Result is FixedCostInstance which has month property
        return result ? (result as FixedCostInstance).month : null;
      }
    ),
    ensureInstancesForMonth: withLogging(
      "fixedCosts",
      "ensureInstancesForMonth",
      fixedCostStorage.ensureFixedCostInstancesForMonth
    ),
  },

  // ============================================
  // Investments
  // ============================================
  investments: {
    // Templates
    createTemplate: withCacheInvalidation(
      "investments",
      "createTemplate",
      withLogging("investments", "createTemplate", investmentStorage.createInvestment)
    ),
    getTemplates: withLogging(
      "investments",
      "getTemplates",
      investmentStorage.getInvestments
    ),
    updateTemplate: withCacheInvalidation(
      "investments",
      "updateTemplate",
      withLogging("investments", "updateTemplate", investmentStorage.updateInvestment)
    ),
    deleteTemplate: withCacheInvalidation(
      "investments",
      "deleteTemplate",
      withLogging("investments", "deleteTemplate", investmentStorage.deleteInvestment)
    ),

    // Instances
    getInstances: withLogging(
      "investments",
      "getInstances",
      investmentStorage.getInvestmentInstances
    ),
    getOrCreateInstance: withLogging(
      "investments",
      "getOrCreateInstance",
      investmentStorage.getOrCreateInvestmentInstance
    ),
    updateInstance: withCacheInvalidation(
      "investments",
      "updateInstance",
      withLogging("investments", "updateInstance", investmentStorage.updateInvestmentInstance),
      (result) => {
        // Result is InvestmentInstance which has month property
        return result ? (result as InvestmentInstance).month : null;
      }
    ),
    ensureInstancesForMonth: withLogging(
      "investments",
      "ensureInstancesForMonth",
      investmentStorage.ensureInvestmentInstancesForMonth
    ),
  },

  // ============================================
  // Salary
  // ============================================
  salary: {
    // Note: Salary uses createOrUpdate instead of separate create/update
    createOrUpdateTemplate: withCacheInvalidation(
      "salary",
      "createOrUpdateTemplate",
      withLogging("salary", "createOrUpdateTemplate", salaryStorage.createOrUpdateSalaryIncome)
    ),
    getTemplate: withLogging(
      "salary",
      "getTemplate",
      salaryStorage.getSalaryIncome
    ),
    // Note: No delete function for salary template (by design)
    getInstance: withLogging(
      "salary",
      "getInstance",
      salaryStorage.getSalaryInstance
    ),
    getOrCreateInstance: withLogging(
      "salary",
      "getOrCreateInstance",
      salaryStorage.getOrCreateSalaryInstance
    ),
    updateInstance: withCacheInvalidation(
      "salary",
      "updateInstance",
      withLogging("salary", "updateInstance", salaryStorage.updateSalaryInstance),
      (result) => {
        // Result is SalaryInstance which has month property
        return result ? (result as SalaryInstance).month : null;
      }
    ),
    ensureInstanceForMonth: withLogging(
      "salary",
      "ensureInstanceForMonth",
      salaryStorage.ensureSalaryInstanceForMonth
    ),
  },

  // ============================================
  // One-Time Investments
  // ============================================
  oneTimeInvestments: {
    create: withCacheInvalidation(
      "oneTimeInvestments",
      "create",
      withLogging("oneTimeInvestments", "create", oneTimeInvestmentStorage.createOneTimeInvestment),
      (result) => result ? extractMonth((result as OneTimeInvestment).date) : null
    ),
    getAll: withLogging(
      "oneTimeInvestments",
      "getAll",
      oneTimeInvestmentStorage.getOneTimeInvestments
    ),
    getById: withLogging(
      "oneTimeInvestments",
      "getById",
      oneTimeInvestmentStorage.getOneTimeInvestmentById
    ),
    update: withCacheInvalidation(
      "oneTimeInvestments",
      "update",
      withLogging("oneTimeInvestments", "update", oneTimeInvestmentStorage.updateOneTimeInvestment),
      (result) => result ? extractMonth((result as OneTimeInvestment).date) : null
    ),
    delete: withCacheInvalidation(
      "oneTimeInvestments",
      "delete",
      withLogging("oneTimeInvestments", "delete", oneTimeInvestmentStorage.deleteOneTimeInvestment)
    ),
  },
};

/**
 * Debug utilities
 * Access these in browser console: window.__apiDebug
 */
if (typeof window !== "undefined") {
  interface WindowWithApiDebug extends Window {
    __apiCalls?: LogEntry[];
    __apiDebug?: {
      getCalls: () => LogEntry[];
      clearCalls: () => void;
      getCallCount: () => number;
      getCallsByService: (service: string) => LogEntry[];
      getFailedCalls: () => LogEntry[];
    };
  }
  const win = window as WindowWithApiDebug;
  win.__apiDebug = {
    getCalls: () => win.__apiCalls || [],
    clearCalls: () => {
      win.__apiCalls = [];
    },
    getCallCount: () => (win.__apiCalls || []).length,
    getCallsByService: (service: string) => {
      return (win.__apiCalls || []).filter(
        (call) => call.service === service
      );
    },
    getFailedCalls: () => {
      return (win.__apiCalls || []).filter(
        (call) => !call.success
      );
    },
  };
}

// Export types for convenience
export type {
  PersonalExpense,
  ExpenseCategory,
  MonthlyStats,
  ExpenseFilterOptions,
  FixedCost,
  FixedCostInstance,
  Investment,
  InvestmentInstance,
  SalaryIncome,
  SalaryInstance,
  OneTimeInvestment,
};
