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
  LogIn,
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
  const { user, signInWithGoogle } = useAuth();
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
    setExpenses((prev) =>
      prev.map((e) => (e.id === expense.id ? expense : e))
    );
    // Reload stats
    if (userId) {
      getMonthlyStats(currentMonth, userId).then(setStats);
      getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then(
        setPreviousStats
      );
    }
  };

  // Show sign in prompt if not logged in
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold text-gray-800">My Expenses</h1>
              <div className="w-10" />
            </div>
          </div>
        </header>

        {/* Sign In Prompt */}
        <main className="max-w-2xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Sign in to continue
            </h2>
            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
              Sign in with your Google account to track and manage your personal
              expenses securely in the cloud.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </motion.div>
        </main>
      </div>
    );
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
                onExpenseUpdated={handleExpenseUpdated}
                userId={userId}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Quick Add Button */}
      <QuickAddExpense onExpenseAdded={handleExpenseAdded} userId={userId} />
    </div>
  );
};

export default ExpenseTracker;
