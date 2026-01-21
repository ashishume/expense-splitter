// Personal Expense Tracker Types

export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "entertainment"
  | "utilities"
  | "health"
  | "travel"
  | "subscriptions"
  | "groceries"
  | "fuel"
  | "electronics"
  | "other";

export interface PersonalExpense {
  id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId?: string;
}

export interface CategoryConfig {
  id: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const EXPENSE_CATEGORIES: CategoryConfig[] = [
  {
    id: "food",
    label: "Food & Dining",
    emoji: "🍔",
    color: "#f97316",
    bgColor: "#fff7ed",
  },
  {
    id: "transport",
    label: "Transport",
    emoji: "🚗",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    id: "shopping",
    label: "Shopping",
    emoji: "🛍️",
    color: "#ec4899",
    bgColor: "#fdf2f8",
  },
  {
    id: "entertainment",
    label: "Entertainment",
    emoji: "🎬",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    id: "groceries",
    label: "Groceries",
    emoji: "🛒",
    color: "#eab308",
    bgColor: "#fefce8",
  },
  // { id: "health", label: "Health", emoji: "💊", color: "#10b981", bgColor: "#ecfdf5" },
  {
    id: "travel",
    label: "Travel",
    emoji: "✈️",
    color: "#06b6d4",
    bgColor: "#ecfeff",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    emoji: "📱",
    color: "#6366f1",
    bgColor: "#eef2ff",
  },
  {
    id: "fuel",
    label: "Fuel",
    emoji: "⛽",
    color: "#f59e0b",
    bgColor: "#fef3c7",
  },
  {
    id: "electronics",
    label: "Electronics",
    emoji: "💻",
    color: "#06b6d4",
    bgColor: "#cffafe",
  },
  {
    id: "other",
    label: "Other",
    emoji: "📦",
    color: "#64748b",
    bgColor: "#f8fafc",
  },
];

export interface MonthlyStats {
  month: string; // YYYY-MM format
  total: number; // Variable expenses total (for backward compatibility)
  variableExpensesTotal: number; // Variable expenses total
  byCategory: Record<ExpenseCategory, number>;
  count: number;
  fixedCostsTotal: number;
  income: number;
  investmentsTotal: number;
  savings: number;
}

export interface ExpenseFilterOptions {
  month?: string; // YYYY-MM format
  category?: ExpenseCategory;
  searchQuery?: string;
}

// Fixed Costs
export interface FixedCost {
  id: string;
  userId: string;
  name: string;
  defaultAmount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface FixedCostInstance {
  id: string;
  fixedCostId: string;
  userId: string;
  month: string; // YYYY-MM format
  amount: number;
  isEnabled: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Salary Income
export interface SalaryIncome {
  id: string;
  userId: string;
  defaultAmount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface SalaryInstance {
  id: string;
  salaryId: string;
  userId: string;
  month: string; // YYYY-MM format
  amount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Investments
export interface Investment {
  id: string;
  userId: string;
  name: string;
  defaultAmount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface InvestmentInstance {
  id: string;
  investmentId: string;
  userId: string;
  month: string; // YYYY-MM format
  amount: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// One-time investments (e.g., US stocks, one-time purchases)
export interface OneTimeInvestment {
  id: string;
  userId: string;
  amount: number;
  description: string; // e.g., "AAPL Stock", "Tesla Shares"
  date: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
