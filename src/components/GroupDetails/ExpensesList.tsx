import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Search } from "lucide-react";
import ExpenseItem from "./ExpenseItem";
import type { User, Expense } from "../../types";

interface ExpensesListProps {
  expenses: Expense[];
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeletingExpense: string | null;
  currentUserId?: string | null; // User ID of the current user
}

type SettlementFilter = "all" | "expenses" | "settlements";

/**
 * ExpensesList Component
 *
 * Displays a list of all expenses in the group with filtering options.
 * Shows a message when no expenses exist.
 */
const ExpensesList = ({
  expenses,
  users,
  onEdit,
  onDelete,
  isDeletingExpense,
  currentUserId,
}: ExpensesListProps) => {
  const [selectedPayer, setSelectedPayer] = useState<string>("all");
  const [settlementFilter, setSettlementFilter] =
    useState<SettlementFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  /**
   * Filter expenses based on selected criteria
   */
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      // Filter by payer
      if (selectedPayer !== "all" && expense.paidBy !== selectedPayer) {
        return false;
      }

      // Filter by settlement type
      if (settlementFilter === "expenses" && expense.isSettlement) {
        return false;
      }
      if (settlementFilter === "settlements" && !expense.isSettlement) {
        return false;
      }

      // Filter by search query (description)
      if (
        searchQuery.trim() &&
        !expense.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim())
      ) {
        return false;
      }

      return true;
    });
  }, [expenses, selectedPayer, settlementFilter, searchQuery]);

  /**
   * Get unique payers from expenses
   */
  const uniquePayers = useMemo(() => {
    const payerIds = new Set(expenses.map((e) => e.paidBy));
    return users.filter((user) => payerIds.has(user.id));
  }, [expenses, users]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters =
    selectedPayer !== "all" ||
    settlementFilter !== "all" ||
    searchQuery.trim() !== "";

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSelectedPayer("all");
    setSettlementFilter("all");
    setSearchQuery("");
  };

  /**
   * Close filter modal
   */
  const closeFilters = () => {
    setShowFilters(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFilters]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showFilters) {
        closeFilters();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showFilters]);

  if (typeof window === "undefined") return null;

  const filterModalContent = (
    <AnimatePresence>
      {showFilters && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFilters}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
          />

          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle indicator */}
              <div className="sm:hidden pt-3 pb-2 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="border-b border-gray-200 p-4 sm:p-6 relative flex-shrink-0">
                <button
                  onClick={closeFilters}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
                    <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      Filter Expenses
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {hasActiveFilters
                        ? `${filteredExpenses.length} of ${expenses.length} expenses`
                        : `${expenses.length} total expenses`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-6">
                  {/* Search Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Description
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search expenses by description..."
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        // autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payer Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Payer
                    </label>
                    <select
                      value={selectedPayer}
                      onChange={(e) => setSelectedPayer(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="all">All Payers</option>
                      {uniquePayers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Settlement Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expense Type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(
                        [
                          { value: "all", label: "All" },
                          { value: "expenses", label: "Regular Expenses" },
                          { value: "settlements", label: "Settlements" },
                        ] as { value: SettlementFilter; label: string }[]
                      ).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSettlementFilter(option.value)}
                          className={`px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
                            settlementFilter === option.value
                              ? "bg-blue-600 text-white shadow-md"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-lg"
      >
        {/* Header with title and filter toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
          <h3 className="text-xl lg:text-2xl font-semibold text-gray-800">
            Expenses ({filteredExpenses.length}
            {hasActiveFilters && (
              <span className="text-base text-gray-500 font-normal">
                {" "}
                of {expenses.length}
              </span>
            )}
            )
          </h3>
          <button
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              hasActiveFilters
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {[
                  selectedPayer !== "all" && 1,
                  settlementFilter !== "all" && 1,
                  searchQuery.trim() && 1,
                ]
                  .filter(Boolean)
                  .reduce((a, b) => (a || 0) + (b || 0), 0)}
              </span>
            )}
          </button>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8 lg:py-12 text-base lg:text-lg">
            {hasActiveFilters
              ? "No expenses match your filters. Try adjusting your search criteria."
              : "No expenses yet. Add your first expense above!"}
          </p>
        ) : (
          <div className="space-y-4 lg:space-y-5">
            {filteredExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                users={users}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeletingExpense === expense.id}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Filter Modal */}
      {createPortal(filterModalContent, document.body)}
    </>
  );
};

export default ExpensesList;
