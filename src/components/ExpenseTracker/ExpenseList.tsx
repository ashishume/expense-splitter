import { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil, X, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { extractMonth } from "../../utils/dataCache";
import {
  EXPENSE_CATEGORIES,
  type PersonalExpense,
  type CategoryConfig,
} from "../../types/personalExpense";
import { useDeleteExpense } from "../../hooks/useExpenseMutations";
import ConfirmDialog from "../ui/ConfirmDialog";
import EditExpenseModal from "./EditExpenseModal";

interface ExpenseListProps {
  expenses: PersonalExpense[];
  onExpenseDeleted: () => void;
  onExpenseUpdated: () => void;
  userId: string;
  selectedCategory?: CategoryConfig | null;
  onClearCategory?: () => void;
  onCategorySelect?: (category: CategoryConfig | null) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
};

const ExpenseList = ({
  expenses,
  onExpenseDeleted,
  onExpenseUpdated,
  userId,
  selectedCategory,
  onClearCategory,
  onCategorySelect,
}: ExpenseListProps) => {
  const deleteExpenseMutation = useDeleteExpense();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    expenseId: string | null;
    expenseDescription: string;
  }>({
    isOpen: false,
    expenseId: null,
    expenseDescription: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(
    null
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      // Get expense first to know which month to invalidate
      const expense = expenses.find((e) => e.id === id);
      const expenseMonth = expense ? extractMonth(expense.date) : undefined;

      await deleteExpenseMutation.mutateAsync({
        id,
        userId,
        expenseMonth,
      });

      onExpenseDeleted();
      toast.success("Expense deleted");
      setDeleteConfirm({
        isOpen: false,
        expenseId: null,
        expenseDescription: "",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  }, [userId, expenses, onExpenseDeleted, deleteExpenseMutation]);

  const openDeleteConfirm = useCallback((expense: PersonalExpense) => {
    setDeleteConfirm({
      isOpen: true,
      expenseId: expense.id,
      expenseDescription: expense.description || expense.category,
    });
  }, []);

  const openEditModal = useCallback((expense: PersonalExpense) => {
    setEditingExpense(expense);
  }, []);

  // Filter expenses by category if selected
  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return expenses;
    return expenses.filter((expense) => expense.category === selectedCategory.id);
  }, [expenses, selectedCategory]);

  // Get categories that have expenses in the current list
  const availableCategories = useMemo(() => {
    const categoryMap = new Map<string, { category: CategoryConfig; count: number }>();

    expenses.forEach((expense) => {
      const category = EXPENSE_CATEGORIES.find((c) => c.id === expense.category);
      if (category) {
        const existing = categoryMap.get(category.id);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(category.id, { category, count: 1 });
        }
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count); // Sort by count (most expenses first)
  }, [expenses]);

  // Show top 2 most spent categories when collapsed, all when expanded
  const visibleCategories = useMemo(() => {
    if (isFiltersExpanded) {
      return availableCategories;
    }
    return availableCategories.slice(0, 2);
  }, [availableCategories, isFiltersExpanded]);

  const hasMoreCategories = availableCategories.length > 2;

  // Memoize grouped expenses calculation (expensive operation)
  const { groupedExpenses, dateKeys } = useMemo(() => {
    const grouped: { [date: string]: PersonalExpense[] } = {};
    filteredExpenses.forEach((expense) => {
      const dateKey = new Date(expense.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    // Sort expenses within each day by createdAt (latest first)
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeB - timeA; // Latest first
      });
    });

    const sortedDateKeys = Object.keys(grouped).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return { groupedExpenses: grouped, dateKeys: sortedDateKeys };
  }, [filteredExpenses]);

  const selectedCategoryInfo = selectedCategory
    ? EXPENSE_CATEGORIES.find((cat) => cat.id === selectedCategory.id)
    : null;

  if (filteredExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        {selectedCategory ? (
          <>
            <div className="text-6xl mb-4">{selectedCategoryInfo?.emoji || "📂"}</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No {selectedCategoryInfo?.label || "category"} expenses
            </h3>
            <p className="text-gray-500 mb-4">
              No expenses found for this category this month
            </p>
            {onClearCategory && (
              <button
                onClick={onClearCategory}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Show All Expenses
              </button>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No expenses yet
            </h3>
            <p className="text-gray-500">
              Tap the <span className="text-indigo-500 font-semibold">+</span>{" "}
              button to add your first expense
            </p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <>
      {/* Category Filter Bar */}
      {onCategorySelect && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* All Categories Button */}
            <button
              onClick={() => onCategorySelect(null)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${!selectedCategory
                ? "bg-indigo-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              All
            </button>

            {/* Category Buttons */}
            <AnimatePresence mode="popLayout">
              {visibleCategories.map(({ category, count }) => {
                const isSelected = selectedCategory?.id === category.id;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => onCategorySelect(category)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${isSelected
                      ? "bg-indigo-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    style={
                      isSelected
                        ? {}
                        : {
                          borderLeft: `3px solid ${category.color}`,
                        }
                    }
                  >
                    <span className="text-base">{category.emoji}</span>
                    <span>{category.label}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                        }`}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {/* Expand/Collapse Button */}
            {hasMoreCategories && (
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="px-3 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <span>{isFiltersExpanded ? "Show Less" : `+${availableCategories.length - 2} More`}</span>
                {isFiltersExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Selected Category Info */}
          {selectedCategory && selectedCategoryInfo && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: selectedCategoryInfo.color + "20" }}
                >
                  <span>{selectedCategoryInfo.emoji}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedCategoryInfo.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""} this month
                  </p>
                </div>
              </div>
              {onClearCategory && (
                <button
                  onClick={onClearCategory}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Clear filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-6">
        {dateKeys.map((dateKey) => (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="sticky top-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-2 z-10">
              <p className="text-sm font-semibold text-gray-500">
                {formatDate(groupedExpenses[dateKey][0].date)}
              </p>
            </div>

            {/* Expenses for this date */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {groupedExpenses[dateKey].map((expense) => {
                  const category = EXPENSE_CATEGORIES.find(
                    (c) => c.id === expense.category
                  );

                  return (
                    <motion.div
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="relative bg-white rounded-xl p-3 sm:p-4 shadow-sm flex items-center gap-2 sm:gap-4 group"
                    >
                      {/* Category Icon */}
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
                        style={{ backgroundColor: category?.bgColor }}
                      >
                        {category?.emoji}
                      </div>

                      {/* Description & Category */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-medium text-gray-800 truncate text-sm sm:text-base">
                          {expense.description || category?.label}
                        </p>
                        <p
                          className="text-xs sm:text-sm truncate"
                          style={{ color: category?.color }}
                        >
                          {category?.label}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-800 text-sm sm:text-base">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-0 sm:gap-1 flex-shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(expense);
                          }}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit expense"
                        >
                          <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteConfirm(expense);
                          }}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Expense Modal */}
      <EditExpenseModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onExpenseUpdated={onExpenseUpdated}
        userId={userId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteConfirm.expenseDescription}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => {
          if (deleteConfirm.expenseId) {
            handleDelete(deleteConfirm.expenseId);
          }
        }}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirm({
              isOpen: false,
              expenseId: null,
              expenseDescription: "",
            });
          }
        }}
      />
    </>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(ExpenseList);
