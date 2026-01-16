import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List,
  CloudOff,
  Cloud,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  PersonalExpense,
  MonthlyStats as MonthlyStatsType,
} from "../../types/personalExpense";
import {
  getExpenses,
  getMonthlyStats,
  subscribeToExpenses,
  unsubscribeFromExpenses,
  migrateLocalToSupabase,
} from "../../services/personalExpenseStorage";
import { isSupabaseConfigured } from "../../config/supabase";
import { useAuth } from "../useAuth";
import QuickAddExpense from "./QuickAddExpense";
import MonthlyStats from "./MonthlyStats";
import ExpenseList from "./ExpenseList";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());
  const [hasMigrated, setHasMigrated] = useState(false);

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
    // month is 1-indexed (1=Jan), so month-1 gives 0-indexed, then -1 for previous
    const newDate = new Date(year, month - 2, 1);
    setCurrentMonth(formatMonthString(newDate));
  };

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    // month is 1-indexed, so month gives next month in 0-indexed
    const newDate = new Date(year, month, 1);
    setCurrentMonth(formatMonthString(newDate));
  };

  // Get previous month string for comparison
  const getPreviousMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return formatMonthString(prevDate);
  };

  // Migrate localStorage data to Supabase on first load
  useEffect(() => {
    const migrateData = async () => {
      if (isSupabaseConfigured() && userId && !hasMigrated) {
        try {
          const localData = localStorage.getItem("personal_expenses");
          if (localData) {
            const count = await migrateLocalToSupabase(userId);
            if (count > 0) {
              toast.success(`Migrated ${count} expenses to cloud storage!`);
            }
          }
          setHasMigrated(true);
        } catch (error) {
          console.error("Migration error:", error);
          // Don't show error to user, just continue with local storage
        }
      }
    };

    migrateData();
  }, [userId, hasMigrated]);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monthExpenses, monthStats, prevStats] = await Promise.all([
        getExpenses({ month: currentMonth }, userId || undefined),
        getMonthlyStats(currentMonth, userId || undefined),
        getMonthlyStats(getPreviousMonthStr(currentMonth), userId || undefined),
      ]);

      setExpenses(monthExpenses);
      setStats(monthStats);
      setPreviousStats(prevStats);
      setIsOnline(isSupabaseConfigured() && !!userId);
    } catch (error) {
      console.error("Error loading expenses:", error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      channel = subscribeToExpenses(userId, (payload) => {
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
      if (channel) {
        unsubscribeFromExpenses(channel);
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
    } else {
      loadData();
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
    } else {
      loadData();
    }
  };

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
              {isSupabaseConfigured() && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    isOnline
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  title={isOnline ? "Synced to cloud" : "Local only"}
                >
                  {isOnline ? (
                    <Cloud className="w-3 h-3" />
                  ) : (
                    <CloudOff className="w-3 h-3" />
                  )}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("stats")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "stats"
                    ? "bg-white shadow text-indigo-600"
                    : "text-gray-500"
                }`}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "list"
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

            <motion.h2
              key={currentMonth}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold text-gray-800"
            >
              {monthDisplay}
            </motion.h2>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={`p-2 rounded-lg transition-all ${
                isCurrentMonth
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
              />
            ) : (
              <ExpenseList
                expenses={expenses}
                onExpenseDeleted={handleExpenseDeleted}
                userId={userId || undefined}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Quick Add Button */}
      <QuickAddExpense
        onExpenseAdded={handleExpenseAdded}
        userId={userId || undefined}
      />
    </div>
  );
};

export default ExpenseTracker;
