import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Filter, X, Search } from "lucide-react";
import ExpenseItem from "./ExpenseItem";
import type { User, Expense } from "../../types";

interface ExpensesListProps {
  expenses: Expense[];
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeletingExpense: string | null;
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

  return (
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
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
            showFilters || hasActiveFilters
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

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4"
        >
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
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
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    settlementFilter === option.value
                      ? "bg-blue-600 text-white"
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
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </motion.div>
      )}

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
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ExpensesList;
