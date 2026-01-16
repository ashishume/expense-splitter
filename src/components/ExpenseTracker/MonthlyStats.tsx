import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  type MonthlyStats as MonthlyStatsType,
} from "../../types/personalExpense";

interface MonthlyStatsProps {
  stats: MonthlyStatsType;
  previousStats?: MonthlyStatsType;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const MonthlyStats = ({ stats, previousStats }: MonthlyStatsProps) => {
  // Calculate percentage change from previous month
  const percentChange = useMemo(() => {
    if (!previousStats || previousStats.total === 0) return null;
    return ((stats.total - previousStats.total) / previousStats.total) * 100;
  }, [stats.total, previousStats]);

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

  return (
    <div className="space-y-6">
      {/* Total Spending Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl"
      >
        <p className="text-white/80 text-sm font-medium mb-1">{monthName}</p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight">
              {formatCurrency(stats.total)}
            </p>
            <p className="text-white/70 text-sm mt-1">
              {stats.count} expense{stats.count !== 1 ? "s" : ""}
            </p>
          </div>

          {percentChange !== null && (
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                percentChange > 0
                  ? "bg-red-400/30 text-white"
                  : percentChange < 0
                  ? "bg-green-400/30 text-white"
                  : "bg-white/20 text-white"
              }`}
            >
              {percentChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : percentChange < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Spending by Category
        </h3>

        {sortedCategories.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No expenses this month yet
          </p>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map((cat, index) => {
              const amount = stats.byCategory[cat.id];
              const percentage = (amount / stats.total) * 100;
              const barWidth = (amount / maxCategoryAmount) * 100;

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
                      <span className="text-gray-400 text-xs">
                        ({percentage.toFixed(0)}%)
                      </span>
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
        {/* Average per expense */}
        <div className="bg-white rounded-xl p-4 shadow-md">
          <p className="text-xs text-gray-500 mb-1">Avg per expense</p>
          <p className="text-xl font-bold text-gray-800">
            {stats.count > 0
              ? formatCurrency(stats.total / stats.count)
              : "INR 0.00"}
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
      </motion.div>
    </div>
  );
};

export default MonthlyStats;
