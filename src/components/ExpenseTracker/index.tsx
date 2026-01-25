import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List,
  Clock,
  Cloud,
  Settings,
  Download,
} from "lucide-react";

import type {
  PersonalExpense,
  MonthlyStats,
  CategoryConfig,
} from "../../types/personalExpense";
import { api } from "../../services/apiService";
import { useAuth } from "../useAuth";
import { lazy, Suspense } from "react";
import QuickAddExpense from "./QuickAddExpense";
import ExpenseList from "./ExpenseList";
import type { Unsubscribe } from "firebase/firestore";
import SigninButton from "./SigninButton";
import { LoadingSpinner } from "../icons";
import CSVImport from "./CSVImport";
import { useExpenses, useMonthlyStats, usePreviousMonthStats } from "../../hooks/useExpenseQueries";
import { queryClient } from "../../providers/QueryProvider";

// Lazy load heavy components for better iPhone performance
const MonthlyStats = lazy(() => import("./MonthlyStats"));
const ActivityFeed = lazy(() => import("./ActivityFeed"));
const MonthPicker = lazy(() => import("./MonthPicker"));
const RecurringItemsSettings = lazy(() => import("./RecurringItemsSettings"));

type ViewMode = "stats" | "list" | "activity";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

const ExpenseTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() =>
    formatMonthString(new Date())
  );
  const [viewMode, setViewMode] = useState<ViewMode>("stats");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const userId = user?.uid || null;

  // Use React Query hooks for data fetching
  const expensesQuery = useExpenses(currentMonth, userId);
  const statsQuery = useMonthlyStats(currentMonth, userId);
  const previousStatsQuery = usePreviousMonthStats(currentMonth, userId);
  
  const expenses: PersonalExpense[] = (expensesQuery.data as PersonalExpense[] | undefined) || [];
  const stats: MonthlyStats | null = (statsQuery.data as MonthlyStats | undefined) || null;
  const previousStats: MonthlyStats | null = (previousStatsQuery.data as MonthlyStats | undefined) || null;
  const expensesLoading = expensesQuery.isLoading;
  const statsLoading = statsQuery.isLoading;
  
  const isLoading = expensesLoading || (viewMode === "stats" && statsLoading);

  // Format month for display
  const monthDisplay = useMemo(() => {
    const [year, month] = currentMonth.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    );
  }, [currentMonth]);

  // Get max allowed month (3 months in the future)
  const maxAllowedMonth = useMemo(() => {
    const now = new Date();
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    return formatMonthString(maxDate);
  }, []);

  // Check if current month is at the max allowed (3 months in future)
  const isMaxMonth = useMemo(() => {
    return currentMonth >= maxAllowedMonth;
  }, [currentMonth, maxAllowedMonth]);

  // Navigate months
  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const newDate = new Date(year, month - 2, 1);
    setCurrentMonth(formatMonthString(newDate));
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    const nextMonthStr = formatMonthString(newDate);

    // Only allow going up to max allowed month (3 months in future)
    if (nextMonthStr <= maxAllowedMonth) {
      setCurrentMonth(nextMonthStr);
    }
  };


  // Realtime subscription (optimized - only for list/stats views)
  useEffect(() => {
    if (!userId || viewMode === "activity") return;

    let unsubscribe: Unsubscribe | null = null;

    const setupSubscription = () => {
      unsubscribe = api.expenses.subscribe(userId, (payload) => {
        const { expense, oldExpense } = payload;

        // Check if the change affects current month
        const affectsCurrentMonth =
          expense?.date.startsWith(currentMonth) ||
          oldExpense?.date?.startsWith(currentMonth);

        if (affectsCurrentMonth) {
          // Invalidate React Query cache instead of manual state updates
          const month = expense?.date.substring(0, 7) || oldExpense?.date.substring(0, 7) || currentMonth;
          queryClient.invalidateQueries({ queryKey: ["expenses", month] });
          queryClient.invalidateQueries({ queryKey: ["stats", month] });
          
          // Also invalidate previous month stats (for savings calculation)
          const [year, monthNum] = month.split("-").map(Number);
          const prevDate = new Date(year, monthNum - 2, 1);
          const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
          queryClient.invalidateQueries({ queryKey: ["stats", prevMonth] });
        }
      });
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        api.expenses.unsubscribe(unsubscribe);
      }
    };
  }, [userId, currentMonth, viewMode]);

  // Handlers for child components (mutation hooks will handle cache invalidation)
  // These are kept for compatibility with child components but don't need to do anything
  // since React Query mutations handle cache invalidation automatically
  const handleExpenseAdded = useCallback(() => {
    // React Query mutations will handle cache invalidation
  }, []);

  const handleExpenseDeleted = useCallback(() => {
    // React Query mutations will handle cache invalidation
  }, []);

  const handleExpenseUpdated = useCallback(() => {
    // React Query mutations will handle cache invalidation
  }, []);

  const handleMonthSelect = (month: string) => {
    setCurrentMonth(month);
    setIsMonthPickerOpen(false);
  };


  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // Clear category filter when switching views
    if (mode !== "list") {
      setSelectedCategory(null);
    }
  }, []);

  // Handle category click - switch to list view and filter by category
  const handleCategoryClick = useCallback((category: CategoryConfig) => {
    setSelectedCategory(category);
    setViewMode("list");
  }, []);

  // Handle CSV export/download
  const handleExportCSV = useCallback(async () => {
    if (!userId) return;

    try {
      const csvContent = await api.expenses.exportAsCSV(userId, currentMonth);

      // Create blob and download
      const blob = new Blob([csvContent as string], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Generate filename with month
      const [year, month] = currentMonth.split("-");
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      );
      const filename = `expenses-${monthName.replace(/\s+/g, "-")}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${expenses.length} expense(s) to CSV`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export expenses");
    }
  }, [userId, currentMonth, expenses.length]);

  // Show sign in prompt if not logged in
  if (!userId) {
    return <SigninButton />

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={() => navigate("/")}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            {/* Title with sync status */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">My Expenses</h1>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
                title="Synced to cloud"
              >
                <Cloud className="w-3 h-3" />
              </div>
            </div>

            {/* View Toggle and Settings */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={isLoading || expenses.length === 0}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download expenses as CSV"
              >
                <Download className="w-5 h-5" />
              </button>
              <CSVImport
                userId={userId}
                onExpensesImported={() => {
                  // React Query will automatically refetch when mutations invalidate the cache
                  handleExpenseAdded();
                }}
              />
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Recurring Items Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange("stats")}
                  className={`p-2 rounded-md transition-all ${viewMode === "stats"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
                    }`}
                  title="Statistics"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleViewModeChange("list")}
                  className={`p-2 rounded-md transition-all ${viewMode === "list"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
                    }`}
                  title="Expense List"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleViewModeChange("activity")}
                  className={`p-2 rounded-md transition-all ${viewMode === "activity"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
                    }`}
                  title="Activity Feed"
                >
                  <Clock className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Month Selector */}
      <div className="sticky top-[57px] z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <motion.button
              key={currentMonth}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setIsMonthPickerOpen(true)}
              className="text-lg font-semibold text-gray-800 cursor-pointer bg-gray-100 rounded-lg px-4 py-2 border-none outline-none hover:bg-gray-200 transition-colors"
            >
              {monthDisplay}
            </motion.button>

            <button
              onClick={goToNextMonth}
              disabled={isMaxMonth}
              className={`p-2 rounded-lg transition-all ${isMaxMonth
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            key={`${currentMonth}-${viewMode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === "stats" && stats ? (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><LoadingSpinner /></div>}>
                <MonthlyStats
                  stats={stats}
                  previousStats={previousStats || undefined}
                  expenses={expenses}
                  onCategoryClick={handleCategoryClick}
                />
              </Suspense>
            ) : viewMode === "activity" ? (
              <Suspense fallback={<div className="flex items-center justify-center py-20"><LoadingSpinner /></div>}>
                <ActivityFeed userId={userId} />
              </Suspense>
            ) : (
              <ExpenseList
                expenses={expenses}
                onExpenseDeleted={handleExpenseDeleted}
                onExpenseUpdated={handleExpenseUpdated}
                userId={userId}
                selectedCategory={selectedCategory}
                onClearCategory={() => setSelectedCategory(null)}
                onCategorySelect={(category) => setSelectedCategory(category)}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Quick Add Button */}
      <QuickAddExpense
        onExpenseAdded={handleExpenseAdded}
        userId={userId}
        currentMonth={currentMonth}
      />

      {/* Month Picker Modal */}
      {isMonthPickerOpen && (
        <Suspense fallback={null}>
          <MonthPicker
            isOpen={isMonthPickerOpen}
            onClose={() => setIsMonthPickerOpen(false)}
            currentMonth={currentMonth}
            onMonthSelect={handleMonthSelect}
            maxMonth={maxAllowedMonth}
          />
        </Suspense>
      )}

      {/* Recurring Items Settings Modal */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <RecurringItemsSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            userId={userId}
            month={currentMonth}
            onUpdate={() => {
              // Invalidate React Query cache for current month when fixed costs, investments, or salary are updated
              queryClient.invalidateQueries({ queryKey: ["stats", currentMonth] });
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ExpenseTracker;
