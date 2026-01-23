import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List,
  Clock,
  Cloud,
  Settings,
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
import { lazy, Suspense } from "react";
import QuickAddExpense from "./QuickAddExpense";
import ExpenseList from "./ExpenseList";
import type { Unsubscribe } from "firebase/firestore";
import SigninButton from "./SigninButton";
import { LoadingSpinner } from "../icons";

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const userId = user?.uid || null;

  // Cache for expenses and stats to avoid redundant API calls
  const dataCache = useRef<Map<string, {
    expenses?: PersonalExpense[];
    stats?: MonthlyStatsType;
    timestamp: number;
  }>>(new Map());

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  const loadingRef = useRef<Set<string>>(new Set()); // Track ongoing requests to prevent duplicates

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

  // Get previous month string for comparison
  const getPreviousMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return formatMonthString(prevDate);
  };

  // Load data based on view mode (lazy loading)
  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const cacheKey = `${currentMonth}-${viewMode}`;
    const now = Date.now();

    // Check if we already have all required data in cache
    let needsExpenses = false;
    let needsStats = false;
    let needsPrevStats = false;

    // Check what we need to load
    if (viewMode === "list" || viewMode === "stats") {
      const expensesKey = `${currentMonth}-expenses`;
      const cachedExpenses = dataCache.current.get(expensesKey);
      if (!cachedExpenses?.expenses || (now - cachedExpenses.timestamp) >= CACHE_TTL) {
        needsExpenses = true;
      } else {
        // Use cached data immediately
        setExpenses(cachedExpenses.expenses);
      }
    }

    if (viewMode === "stats") {
      const statsKey = `${currentMonth}-stats`;
      const prevStatsKey = `${getPreviousMonthStr(currentMonth)}-stats`;

      const cachedStats = dataCache.current.get(statsKey);
      if (!cachedStats?.stats || (now - cachedStats.timestamp) >= CACHE_TTL) {
        needsStats = true;
      } else {
        setStats(cachedStats.stats);
      }

      const cachedPrevStats = dataCache.current.get(prevStatsKey);
      if (!cachedPrevStats?.stats || (now - cachedPrevStats.timestamp) >= CACHE_TTL) {
        needsPrevStats = true;
      } else {
        setPreviousStats(cachedPrevStats.stats);
      }
    }

    // If everything is cached, no need to show loading or make API calls
    if (!needsExpenses && !needsStats && !needsPrevStats) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate requests
    if (loadingRef.current.has(cacheKey)) {
      return;
    }
    loadingRef.current.add(cacheKey);
    setIsLoading(true);

    try {
      const promises: Promise<any>[] = [];

      // Only load expenses if needed
      if (needsExpenses) {
        const expensesKey = `${currentMonth}-expenses`;
        promises.push(
          getExpenses({ month: currentMonth }, userId).then((exp) => {
            setExpenses(exp);
            // Cache expenses
            dataCache.current.set(expensesKey, {
              expenses: exp,
              timestamp: now,
            });
          })
        );
      }

      // Only load stats if needed
      if (needsStats) {
        const statsKey = `${currentMonth}-stats`;
        promises.push(
          getMonthlyStats(currentMonth, userId).then((s) => {
            setStats(s);
            dataCache.current.set(statsKey, {
              stats: s,
              timestamp: now,
            });
          })
        );
      }

      // Only load previous stats if needed
      if (needsPrevStats) {
        const prevStatsKey = `${getPreviousMonthStr(currentMonth)}-stats`;
        promises.push(
          getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then((s) => {
            setPreviousStats(s);
            dataCache.current.set(prevStatsKey, {
              stats: s,
              timestamp: now,
            });
          })
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setIsLoading(false);
      loadingRef.current.delete(cacheKey);
    }
  }, [currentMonth, userId, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounce stats updates to reduce Firebase calls (iPhone optimization)
  const statsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedStatsUpdate = useCallback(() => {
    // Only update stats if in stats view
    if (viewMode !== "stats") return;

    if (statsUpdateTimeoutRef.current) {
      clearTimeout(statsUpdateTimeoutRef.current);
    }
    statsUpdateTimeoutRef.current = setTimeout(() => {
      if (userId) {
        const now = Date.now();
        const statsKey = `${currentMonth}-stats`;
        const prevStatsKey = `${getPreviousMonthStr(currentMonth)}-stats`;

        // Check if stats are already fresh (less than 30 seconds old)
        // Only reload if cache is stale to avoid unnecessary calls
        const cachedStats = dataCache.current.get(statsKey);
        const cachedPrevStats = dataCache.current.get(prevStatsKey);
        const FRESH_THRESHOLD = 30 * 1000; // 30 seconds

        const needsCurrentStats = !cachedStats?.stats || (now - cachedStats.timestamp) >= FRESH_THRESHOLD;
        const needsPrevStats = !cachedPrevStats?.stats || (now - cachedPrevStats.timestamp) >= FRESH_THRESHOLD;

        // Only make API calls if stats are stale
        if (needsCurrentStats || needsPrevStats) {
          const promises: Promise<any>[] = [];

          if (needsCurrentStats) {
            promises.push(
              getMonthlyStats(currentMonth, userId).then((s) => {
                setStats(s);
                dataCache.current.set(statsKey, { stats: s, timestamp: now });
              })
            );
          }

          if (needsPrevStats) {
            promises.push(
              getMonthlyStats(getPreviousMonthStr(currentMonth), userId).then((s) => {
                setPreviousStats(s);
                dataCache.current.set(prevStatsKey, { stats: s, timestamp: now });
              })
            );
          }

          Promise.all(promises);
        }
      }
    }, 500); // 500ms debounce (increased for better performance)
  }, [currentMonth, userId, viewMode]);

  // Realtime subscription (optimized - only for list/stats views)
  useEffect(() => {
    if (!userId || viewMode === "activity") return;

    let unsubscribe: Unsubscribe | null = null;

    const setupSubscription = () => {
      unsubscribe = subscribeToExpenses(userId, (payload) => {
        const { eventType, expense, oldExpense } = payload;

        // Check if the change affects current month
        const affectsCurrentMonth =
          expense?.date.startsWith(currentMonth) ||
          oldExpense?.date?.startsWith(currentMonth);

        if (affectsCurrentMonth) {
          // Invalidate cache for this month
          const expensesKey = `${currentMonth}-expenses`;
          dataCache.current.delete(expensesKey);

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

          // Only update stats if in stats view
          if (viewMode === "stats") {
            debouncedStatsUpdate();
          }
        }
      });
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribeFromExpenses(unsubscribe);
      }
      if (statsUpdateTimeoutRef.current) {
        clearTimeout(statsUpdateTimeoutRef.current);
      }
    };
  }, [userId, currentMonth, debouncedStatsUpdate, viewMode]);

  // Handle expense added (optimistic update already done by QuickAddExpense)
  const handleExpenseAdded = useCallback((expense: PersonalExpense) => {
    // Invalidate cache
    const expensesKey = `${currentMonth}-expenses`;
    dataCache.current.delete(expensesKey);

    // If expense is in current month, add to list (if not already there from realtime)
    if (expense.date.startsWith(currentMonth) && (viewMode === "list" || viewMode === "stats")) {
      setExpenses((prev) => {
        if (prev.some((e) => e.id === expense.id)) return prev;
        const updated = [expense, ...prev];
        updated.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return updated;
      });
    }
    // Only update stats if in stats view
    if (viewMode === "stats") {
      debouncedStatsUpdate();
    }
  }, [currentMonth, debouncedStatsUpdate, viewMode]);

  // Handle expense deleted (optimistic update)
  const handleExpenseDeleted = useCallback((id: string) => {
    // Invalidate cache
    const expensesKey = `${currentMonth}-expenses`;
    dataCache.current.delete(expensesKey);

    if (viewMode === "list" || viewMode === "stats") {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
    // Only update stats if in stats view
    if (viewMode === "stats") {
      debouncedStatsUpdate();
    }
  }, [currentMonth, debouncedStatsUpdate, viewMode]);

  // Handle expense updated
  const handleExpenseUpdated = useCallback((expense: PersonalExpense) => {
    // Invalidate cache
    const expensesKey = `${currentMonth}-expenses`;
    dataCache.current.delete(expensesKey);

    // Optimistically update the UI first
    if (viewMode === "list" || viewMode === "stats") {
      if (!expense.date.startsWith(currentMonth)) {
        // If date changed to a different month, remove from current view
        setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      } else {
        // Update the expense in place
        setExpenses((prev) =>
          prev.map((e) => (e.id === expense.id ? expense : e))
        );
      }
    }

    // Only update stats if in stats view
    if (viewMode === "stats") {
      debouncedStatsUpdate();
    }
  }, [currentMonth, debouncedStatsUpdate, viewMode]);

  const handleMonthSelect = (month: string) => {
    setCurrentMonth(month);
    setIsMonthPickerOpen(false);
  };

  // Cleanup cache periodically and on unmount
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      for (const [key, value] of dataCache.current.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          dataCache.current.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, CACHE_TTL);
    return () => {
      clearInterval(interval);
      // Clear cache on unmount
      dataCache.current.clear();
      loadingRef.current.clear();
    };
  }, []);

  // Handle view mode change - only reload if needed
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    // Don't reload immediately - let loadData handle it based on view mode
  }, []);

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
              // Reload data when settings are updated
              loadData();
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ExpenseTracker;
