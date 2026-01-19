import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List,
  Cloud,
} from "lucide-react";

import type {
  PersonalExpense,
  MonthlyStats as MonthlyStatsType,
} from "../../types/personalExpense";
import {
  getExpenses,
  getMonthlyStats,
  subscribeToExpenses,
  unsubscribeFromExpenses,
} from "../../services/personalExpenseStorage";
import { useAuth } from "../useAuth";
import QuickAddExpense from "./QuickAddExpense";
import MonthlyStats from "./MonthlyStats";
import ExpenseList from "./ExpenseList";
import type { Unsubscribe } from "firebase/firestore";
import SigninButton from "./SigninButton";
import MonthPicker from "./MonthPicker";

type ViewMode = "stats" | "list";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

const ExpenseTracker = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() =>
    formatMonthString(new Date())
  );
  const [stats, setStats] = useState<MonthlyStatsType | null>(null);
  const [previousStats, setPreviousStats] = useState<MonthlyStatsType | null>(
    null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("stats");
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const userId = user?.uid || null;

  // Format month for display
  const monthDisplay = useMemo(() => {
    const [year, month] = currentMonth.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    );
  }, [currentMonth]);

  // Check if current month is the latest
  const isCurrentMonth = useMemo(() => {
    const now = formatMonthString(new Date());
    return currentMonth === now;
  }, [currentMonth]);

  // Navigate months
  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const newDate = new Date(year, month - 2, 1);
    setCurrentMonth(formatMonthString(newDate));
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    setCurrentMonth(formatMonthString(newDate));
  };

  // Get previous month string for comparison
  const getPreviousMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return formatMonthString(prevDate);
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [monthExpenses, monthStats, prevStats] = await Promise.all([
        getExpenses({ month: currentMonth }, userId),
        getMonthlyStats(currentMonth, userId),
        getMonthlyStats(getPreviousMonthStr(currentMonth), userId),
      ]);

      setExpenses(monthExpenses);
      setStats(monthStats);
      setPreviousStats(prevStats);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    let unsubscribe: Unsubscribe | null = null;

    const setupSubscription = () => {
      unsubscribe = subscribeToExpenses(userId, (payload) => {
        const { eventType, expense, oldExpense } = payload;

        // Check if the change affects current month
        const affectsCurrentMonth =
          expense?.date.startsWith(currentMonth) ||
          oldExpense?.date?.startsWith(currentMonth);

        if (affectsCurrentMonth) {
          switch (eventType) {
            case "INSERT":
              if (expense && expense.date.startsWith(currentMonth)) {
                setExpenses((prev) => {
                  // Prevent duplicates
                  if (prev.some((e) => e.id === expense.id)) return prev;
                  // Insert in sorted order (newest first)
                  const updated = [...prev, expense];
                  updated.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                  return updated;
                });
              }
              break;

            case "UPDATE":
              if (expense) {
                setExpenses((prev) =>
                  prev.map((e) => (e.id === expense.id ? expense : e))
                );
              }
              break;

            case "DELETE":
              if (oldExpense) {
                setExpenses((prev) =>
                  prev.filter((e) => e.id !== oldExpense.id)
                );
              }
              break;
          }

          // Reload stats on any change
          getMonthlyStats(currentMonth, userId).then(setStats);
          getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then(
            setPreviousStats
          );
        }
      });
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribeFromExpenses(unsubscribe);
      }
    };
  }, [userId, currentMonth]);

  // Handle expense added (optimistic update already done by QuickAddExpense)
  const handleExpenseAdded = (expense: PersonalExpense) => {
    // If expense is in current month, add to list (if not already there from realtime)
    if (expense.date.startsWith(currentMonth)) {
      setExpenses((prev) => {
        if (prev.some((e) => e.id === expense.id)) return prev;
        const updated = [expense, ...prev];
        updated.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return updated;
      });
    }
    // Reload stats
    if (userId) {
      getMonthlyStats(currentMonth, userId).then(setStats);
      getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then(
        setPreviousStats
      );
    }
  };

  // Handle expense deleted (optimistic update)
  const handleExpenseDeleted = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // Reload stats
    if (userId) {
      getMonthlyStats(currentMonth, userId).then(setStats);
      getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then(
        setPreviousStats
      );
    }
  };

  // Handle expense updated
  const handleExpenseUpdated = (expense: PersonalExpense) => {
    // Optimistically update the UI first
    if (!expense.date.startsWith(currentMonth)) {
      // If date changed to a different month, remove from current view
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } else {
      // Update the expense in place
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? expense : e))
      );
    }

    // Reload data from server to ensure sync (without showing loading state)
    if (userId) {
      Promise.all([
        getExpenses({ month: currentMonth }, userId),
        getMonthlyStats(currentMonth, userId),
        getMonthlyStats(getPreviousMonthStr(currentMonth), userId),
      ]).then(([monthExpenses, monthStats, prevStats]) => {
        setExpenses(monthExpenses);
        setStats(monthStats);
        setPreviousStats(prevStats);
      });
    }
  };

  const handleMonthSelect = (month: string) => {
    setCurrentMonth(month);
    setIsMonthPickerOpen(false);
  };

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

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("stats")}
                className={`p-2 rounded-md transition-all ${viewMode === "stats"
                  ? "bg-white shadow text-indigo-600"
                  : "text-gray-500"
                  }`}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${viewMode === "list"
                  ? "bg-white shadow text-indigo-600"
                  : "text-gray-500"
                  }`}
              >
                <List className="w-5 h-5" />
              </button>
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
              disabled={isCurrentMonth}
              className={`p-2 rounded-lg transition-all ${isCurrentMonth
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
              <MonthlyStats
                stats={stats}
                previousStats={previousStats || undefined}
                expenses={expenses}
              />
            ) : (
              <ExpenseList
                expenses={expenses}
                onExpenseDeleted={handleExpenseDeleted}
                onExpenseUpdated={handleExpenseUpdated}
                userId={userId}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Quick Add Button */}
      <QuickAddExpense onExpenseAdded={handleExpenseAdded} userId={userId} />

      {/* Month Picker Modal */}
      {isMonthPickerOpen ? <MonthPicker
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        currentMonth={currentMonth}
        onMonthSelect={handleMonthSelect}
        maxMonth={formatMonthString(new Date())}
      /> : null}
    </div>
  );
};

export default ExpenseTracker;
