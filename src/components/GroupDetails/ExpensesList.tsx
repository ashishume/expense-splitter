import { motion } from "framer-motion";
import ExpenseItem from "./ExpenseItem";
import type { User, Expense } from "../../types";

interface ExpensesListProps {
  expenses: Expense[];
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeletingExpense: string | null;
}

/**
 * ExpensesList Component
 *
 * Displays a list of all expenses in the group.
 * Shows a message when no expenses exist.
 */
const ExpensesList = ({
  expenses,
  users,
  onEdit,
  onDelete,
  isDeletingExpense,
}: ExpensesListProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Expenses ({expenses.length})
      </h3>
      {expenses.length === 0 ? (
        <p className="text-gray-500 italic text-center py-8">
          No expenses yet. Add your first expense above!
        </p>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
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
