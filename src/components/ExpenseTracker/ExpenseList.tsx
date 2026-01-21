import { useState, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import {
  EXPENSE_CATEGORIES,
  type PersonalExpense,
} from "../../types/personalExpense";
import { deleteExpense } from "../../services/personalExpenseStorage";
import ConfirmDialog from "../ui/ConfirmDialog";
import EditExpenseModal from "./EditExpenseModal";

interface ExpenseListProps {
  expenses: PersonalExpense[];
  onExpenseDeleted: (id: string) => void;
  onExpenseUpdated: (expense: PersonalExpense) => void;
  userId: string;
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
}: ExpenseListProps) => {
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

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteExpense(id, userId);
      onExpenseDeleted(id);
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
  }, [userId, onExpenseDeleted]);

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

  // Memoize grouped expenses calculation (expensive operation)
  const { groupedExpenses, dateKeys } = useMemo(() => {
    const grouped: { [date: string]: PersonalExpense[] } = {};
    expenses.forEach((expense) => {
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
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="text-6xl mb-4">💸</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No expenses yet
        </h3>
        <p className="text-gray-500">
          Tap the <span className="text-indigo-500 font-semibold">+</span>{" "}
          button to add your first expense
        </p>
      </motion.div>
    );
  }

  return (
    <>
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
