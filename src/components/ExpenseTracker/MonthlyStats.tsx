import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, Lock, TrendingUp as TrendingUpIcon, Wallet, Eye, EyeOff } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  type MonthlyStats as MonthlyStatsType,
  type PersonalExpense,
} from "../../types/personalExpense";

interface MonthlyStatsProps {
  stats: MonthlyStatsType;
  previousStats?: MonthlyStatsType;
  expenses?: PersonalExpense[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const MonthlyStats = ({ stats, previousStats: _previousStats, expenses = [] }: MonthlyStatsProps) => {
  // Privacy: Hide salary by default
  const [isSalaryVisible, setIsSalaryVisible] = useState(() => {
    const saved = localStorage.getItem("salaryVisible");
    return saved === "true";
  });

  // Memoize toggle handler
  const toggleSalaryVisibility = useCallback(() => {
    setIsSalaryVisible((prev) => !prev);
  }, []);

  useEffect(() => {
    localStorage.setItem("salaryVisible", isSalaryVisible.toString());
  }, [isSalaryVisible]);

  // Backward compatibility: use total if variableExpensesTotal doesn't exist
  const variableExpensesTotal = stats.variableExpensesTotal ?? stats.total;
  const fixedCostsTotal = stats.fixedCostsTotal ?? 0;
  const income = stats.income ?? 0;
  const investmentsTotal = stats.investmentsTotal ?? 0;
  const savings = stats.savings ?? (income - variableExpensesTotal - fixedCostsTotal - investmentsTotal);

  // Get categories sorted by amount (highest first)
  const sortedCategories = useMemo(() => {
    return EXPENSE_CATEGORIES.filter(
      (cat) => stats.byCategory[cat.id] > 0
    ).sort((a, b) => stats.byCategory[b.id] - stats.byCategory[a.id]);
  }, [stats.byCategory]);

  // Calculate max for bar width normalization
  const maxCategoryAmount = useMemo(() => {
    return Math.max(...Object.values(stats.byCategory), 1);
  }, [stats.byCategory]);

  const monthName = useMemo(() => {
    const [year, month] = stats.month.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    );
  }, [stats.month]);

  // Find the biggest single expense
  const biggestExpense = useMemo(() => {
    if (expenses.length === 0) return null;
    return expenses.reduce((max, exp) => exp.amount > max.amount ? exp : max, expenses[0]);
  }, [expenses]);

  // Calculate daily average (based on days elapsed or days in month)
  const dailyAverage = useMemo(() => {
    const [year, month] = stats.month.split("-").map(Number);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    let daysToCount: number;
    if (isCurrentMonth) {
      // For current month, use days elapsed
      daysToCount = today.getDate();
    } else {
      // For past months, use total days in that month
      daysToCount = new Date(year, month, 0).getDate();
    }

    return variableExpensesTotal / Math.max(daysToCount, 1);
  }, [variableExpensesTotal, stats.month]);

  // Find the category for the biggest expense
  const biggestExpenseCategory = useMemo(() => {
    if (!biggestExpense) return null;
    return EXPENSE_CATEGORIES.find(c => c.id === biggestExpense.category);
  }, [biggestExpense]);

  return (
    <div className="space-y-6">
      {/* Savings Card - Most Prominent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-6 text-white shadow-xl ${savings >= 0
          ? "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500"
          : "bg-gradient-to-br from-red-500 via-rose-500 to-pink-500"
          }`}
      >
        <p className="text-white/80 text-sm font-medium mb-1">{monthName} Savings</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">
              {formatCurrency(Math.abs(savings))}
            </p>
            <p className="text-white/70 text-sm mt-1">
              {savings >= 0 ? "Saved" : "Overspent"}
            </p>
          </div>
          <Wallet className="w-12 h-12 text-white/30" />
        </div>
      </motion.div>

      {/* Income and Expenses Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Income Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-700">Income</h3>
            </div>
            <button
              onClick={toggleSalaryVisibility}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
              title={isSalaryVisible ? "Hide salary" : "Show salary"}
            >
              {isSalaryVisible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {isSalaryVisible ? formatCurrency(income) : "••••••"}
          </p>
          {!isSalaryVisible && (
            <p className="text-xs text-gray-500 mt-1">Click eye icon to reveal</p>
          )}
        </div>

        {/* Variable Expenses Card */}
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-700">Variable Expenses</h3>
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-700">
            {formatCurrency(variableExpensesTotal)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.count} transaction{stats.count !== 1 ? "s" : ""}
          </p>
        </div>
      </motion.div>

      {/* Fixed Costs and Investments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Fixed Costs Card */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-700">Fixed Costs</h3>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-700">
            {formatCurrency(fixedCostsTotal)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rent, Maid, etc.</p>
        </div>

        {/* Investments Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Investments</h3>
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(investmentsTotal)}
          </p>
          <p className="text-xs text-gray-500 mt-1">SIPs & Savings</p>
        </div>
      </motion.div>

      {/* Variable Expenses Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-5 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Variable Expenses by Category
        </h3>

        {sortedCategories.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No variable expenses this month yet
          </p>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map((cat, index) => {
              const amount = stats.byCategory[cat.id];
              const percentage = variableExpensesTotal > 0
                ? (amount / variableExpensesTotal) * 100
                : 0;
              const barWidth = maxCategoryAmount > 0
                ? (amount / maxCategoryAmount) * 100
                : 0;

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="font-medium text-gray-700">
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(amount)}
                      </span>
                      {variableExpensesTotal > 0 && (
                        <span className="text-gray-400 text-xs">
                          ({percentage.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        duration: 0.5,
                        delay: 0.1 * index,
                        ease: "easeOut",
                      }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        {/* Biggest expense */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-xs text-gray-500 mb-1">Biggest expense</p>
          {biggestExpense ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{biggestExpenseCategory?.emoji}</span>
              <span className="text-xl font-bold text-gray-800">
                {formatCurrency(biggestExpense.amount)}
              </span>
            </div>
          ) : (
            <p className="text-gray-400">-</p>
          )}
        </div>

        {/* Daily average */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-xs text-gray-500 mb-1">Daily average</p>
          <p className="text-xl font-bold text-gray-800">
            {stats.count > 0
              ? formatCurrency(dailyAverage)
              : "₹0.00"}
          </p>
        </div>

        {/* Top category */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-xs text-gray-500 mb-1">Top category</p>
          {sortedCategories[0] ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">{sortedCategories[0].emoji}</span>
              <span className="font-bold text-gray-800 truncate">
                {sortedCategories[0].label}
              </span>
            </div>
          ) : (
            <p className="text-gray-400">-</p>
          )}
        </div>

        {/* Total transactions */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-xs text-gray-500 mb-1">Transactions</p>
          <p className="text-xl font-bold text-gray-800">
            {stats.count}
            <span className="text-sm font-normal text-gray-500 ml-1">
              this month
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(MonthlyStats);
