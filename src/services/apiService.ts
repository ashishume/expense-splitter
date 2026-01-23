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

// Import all storage services
import * as expenseStorage from "./personalExpenseStorage";
import * as fixedCostStorage from "./fixedCostStorage";
import * as investmentStorage from "./investmentStorage";
import * as salaryStorage from "./salaryStorage";
import * as oneTimeInvestmentStorage from "./oneTimeInvestmentStorage";

// Debug mode - set to true to enable detailed logging
const DEBUG_MODE = process.env.NODE_ENV === "development" || false;

// Log all API calls for debugging
const logApiCall = (
  service: string,
  operation: string,
  params?: any,
  result?: any,
  error?: any
) => {
  if (!DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service,
    operation,
    params: params ? JSON.stringify(params, null, 2) : undefined,
    success: !error,
    error: error ? error.message : undefined,
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
    (window as any).__apiCalls = (window as any).__apiCalls || [];
    (window as any).__apiCalls.push(logEntry);
    // Keep only last 100 calls
    if ((window as any).__apiCalls.length > 100) {
      (window as any).__apiCalls.shift();
    }
  }
};

// Wrapper function to add logging to any async function
const withLogging = <T extends (...args: any[]) => Promise<any>>(
  service: string,
  operation: string,
  fn: T
): T => {
  return (async (...args: Parameters<T>) => {
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
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logApiCall(service, operation, args[0], undefined, error);
      if (DEBUG_MODE) {
        console.error(`❌ Failed after ${duration}ms:`, error);
      }
      throw error;
    }
  }) as T;
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
    create: withLogging(
      "expenses",
      "create",
      expenseStorage.createExpense
    ),
    getAll: withLogging("expenses", "getAll", expenseStorage.getExpenses),
    getById: withLogging(
      "expenses",
      "getById",
      expenseStorage.getExpenseById
    ),
    update: withLogging("expenses", "update", expenseStorage.updateExpense),
    delete: withLogging("expenses", "delete", expenseStorage.deleteExpense),
    subscribe: expenseStorage.subscribeToExpenses,
    unsubscribe: expenseStorage.unsubscribeFromExpenses,
    getMonthlyStats: withLogging(
      "expenses",
      "getMonthlyStats",
      expenseStorage.getMonthlyStats
    ),
  },

  // ============================================
  // Fixed Costs
  // ============================================
  fixedCosts: {
    // Templates
    createTemplate: withLogging(
      "fixedCosts",
      "createTemplate",
      fixedCostStorage.createFixedCost
    ),
    getTemplates: withLogging(
      "fixedCosts",
      "getTemplates",
      fixedCostStorage.getFixedCosts
    ),
    updateTemplate: withLogging(
      "fixedCosts",
      "updateTemplate",
      fixedCostStorage.updateFixedCost
    ),
    deleteTemplate: withLogging(
      "fixedCosts",
      "deleteTemplate",
      fixedCostStorage.deleteFixedCost
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
    updateInstance: withLogging(
      "fixedCosts",
      "updateInstance",
      fixedCostStorage.updateFixedCostInstance
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
    createTemplate: withLogging(
      "investments",
      "createTemplate",
      investmentStorage.createInvestment
    ),
    getTemplates: withLogging(
      "investments",
      "getTemplates",
      investmentStorage.getInvestments
    ),
    updateTemplate: withLogging(
      "investments",
      "updateTemplate",
      investmentStorage.updateInvestment
    ),
    deleteTemplate: withLogging(
      "investments",
      "deleteTemplate",
      investmentStorage.deleteInvestment
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
    updateInstance: withLogging(
      "investments",
      "updateInstance",
      investmentStorage.updateInvestmentInstance
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
    createOrUpdateTemplate: withLogging(
      "salary",
      "createOrUpdateTemplate",
      salaryStorage.createOrUpdateSalaryIncome
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
    updateInstance: withLogging(
      "salary",
      "updateInstance",
      salaryStorage.updateSalaryInstance
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
    create: withLogging(
      "oneTimeInvestments",
      "create",
      oneTimeInvestmentStorage.createOneTimeInvestment
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
    update: withLogging(
      "oneTimeInvestments",
      "update",
      oneTimeInvestmentStorage.updateOneTimeInvestment
    ),
    delete: withLogging(
      "oneTimeInvestments",
      "delete",
      oneTimeInvestmentStorage.deleteOneTimeInvestment
    ),
  },
};

/**
 * Debug utilities
 * Access these in browser console: window.__apiDebug
 */
if (typeof window !== "undefined") {
  (window as any).__apiDebug = {
    getCalls: () => (window as any).__apiCalls || [],
    clearCalls: () => {
      (window as any).__apiCalls = [];
    },
    getCallCount: () => ((window as any).__apiCalls || []).length,
    getCallsByService: (service: string) => {
      return ((window as any).__apiCalls || []).filter(
        (call: any) => call.service === service
      );
    },
    getFailedCalls: () => {
      return ((window as any).__apiCalls || []).filter(
        (call: any) => !call.success
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
