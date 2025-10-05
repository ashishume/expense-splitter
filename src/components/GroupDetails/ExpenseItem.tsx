import { motion } from "framer-motion";
import { formatTimestamp } from "../../utils/dateUtils";
import { EditIcon, DeleteIcon, LoadingSpinner } from "../icons/index";
import type { User, Expense } from "../../types";

interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeleting: boolean;
}

/**
 * ExpenseItem Component
 *
 * Displays a single expense item with details like amount, payer, and split participants.
 * Supports editing and deleting non-settlement expenses.
 */
const ExpenseItem = ({
  expense,
  users,
  onEdit,
  onDelete,
  isDeleting,
}: ExpenseItemProps) => {
  /**
   * Formats the list of users who are splitting the expense
   * Shows up to 2 names, or first name + count for more
   */
  const getSplitWithDisplay = () => {
    const splitUsers = expense.splitWith
      .map((userId) => users.find((u) => u.id === userId))
      .filter(Boolean);

    if (splitUsers.length <= 2) {
      return splitUsers.map((user) => user?.name || "Unknown").join(" & ");
    } else {
      return `${splitUsers[0]?.name || "Unknown"} +${
        splitUsers.length - 1
      } others`;
    }
  };

  return (
    <motion.div
      // initial={{ opacity: 0, y: 20, scale: 0.95 }}
      // animate={{ opacity: 1, y: 0, scale: 1 }}
      // exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{
        // scale: 1.02,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      }}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        expense.isSettlement
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
          : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Left color indicator */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          expense.isSettlement
            ? "bg-gradient-to-b from-green-400 to-green-600"
            : "bg-gradient-to-b from-blue-400 to-blue-600"
        }`}
      />

      <div className="p-4 sm:p-5 ml-1">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title and settlement badge */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 break-words leading-tight">
                {expense.description}
              </h3>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {expense.isSettlement && (
                  <motion.span
                    // initial={{ scale: 0 }}
                    // animate={{ scale: 1 }}
                    // transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-200"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Settlement
                  </motion.span>
                )}
              </div>
            </div>

            {/* Amount and payer info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">₹</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    ₹{expense.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Paid by{" "}
                    <span className="font-medium text-gray-800">
                      {expense.paidByName}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Split with users */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {expense.splitWith.slice(0, 3).map((userId, index) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <motion.div
                      key={userId}
                      // initial={{ scale: 0, x: -10 }}
                      // animate={{ scale: 1, x: 0 }}
                      transition={{
                        delay: 0.1 * index,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center"
                      title={user?.name || "Unknown"}
                    >
                      <span className="text-xs font-bold text-white">
                        {(user?.name || "U").charAt(0).toUpperCase()}
                      </span>
                    </motion.div>
                  );
                })}
                {expense.splitWith.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                      +{expense.splitWith.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Split with{" "}
                <span className="font-medium">{getSplitWithDisplay()}</span>
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <p className="text-xs text-gray-500 font-medium">
                {formatTimestamp(expense.date)}
              </p>
            </div>
          </div>

          {/* Action buttons (only for non-settlement expenses) */}
          {!expense.isSettlement && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 flex-shrink-0"
            >
              <motion.button
                // whileHover={{ scale: 1.1 }}
                // whileTap={{ scale: 0.95 }}
                onClick={() => onEdit(expense)}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-200 border border-blue-200"
                title="Edit expense"
              >
                <EditIcon />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete(expense.id)}
                disabled={isDeleting}
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove expense"
              >
                {isDeleting ? (
                  <LoadingSpinner className="w-4 h-4" />
                ) : (
                  <DeleteIcon />
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ExpenseItem;
