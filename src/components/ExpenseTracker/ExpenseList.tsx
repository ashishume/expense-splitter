import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  EXPENSE_CATEGORIES,
  type PersonalExpense,
} from "../../types/personalExpense";
import { deleteExpense } from "../../services/personalExpenseStorage";
import ConfirmDialog from "../ui/ConfirmDialog";

interface ExpenseListProps {
  expenses: PersonalExpense[];
  onExpenseDeleted: (id: string) => void;
  userId?: string;
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

  const handleDelete = async (id: string) => {
    if (!userId) {
      toast.error("Please sign in to delete expenses");
      return;
    }

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
  };

  const openDeleteConfirm = (expense: PersonalExpense) => {
    setDeleteConfirm({
      isOpen: true,
      expenseId: expense.id,
      expenseDescription: expense.description,
    });
  };

  // Group expenses by date
  const groupedExpenses: { [date: string]: PersonalExpense[] } = {};
  expenses.forEach((expense) => {
    const dateKey = new Date(expense.date).toDateString();
    if (!groupedExpenses[dateKey]) {
      groupedExpenses[dateKey] = [];
    }
    groupedExpenses[dateKey].push(expense);
  });

  const dateKeys = Object.keys(groupedExpenses).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

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
                      className="relative bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 group"
                    >
                      {/* Category Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: category?.bgColor }}
                      >
                        {category?.emoji}
                      </div>

                      {/* Description & Category */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {expense.description}
                        </p>
                        <p
                          className="text-sm truncate"
                          style={{ color: category?.color }}
                        >
                          {category?.label}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirm(expense);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                        title="Delete expense"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteConfirm.expenseDescription}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm.expenseId && !isDeleting) {
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

export default ExpenseList;
