import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { formatTimestamp } from "../../utils/dateUtils";
import { EditIcon, DeleteIcon, LoadingSpinner } from "../icons/index";
import ConfirmDialog from "../ui/ConfirmDialog";
import MembersModal from "./MembersModal";
import type { User, Expense } from "../../types";
import React from "react";

interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeleting: boolean;
  currentUserId?: string | null; // User ID of the current user
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
  currentUserId,
}: ExpenseItemProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Detect mobile for performance optimization
  const isMobile = useMemo(() => {
    return typeof window !== "undefined" && window.innerWidth < 768;
  }, []);

  /**
   * Check if current user can delete this expense
   * User can delete if they added it, or if addedBy is not set (backward compatibility)
   */
  const canDelete =
    !expense.isSettlement &&
    (!expense.addedBy || expense.addedBy === currentUserId);

  // Memoize split users to avoid recalculation
  const splitUsers = useMemo(() => {
    return expense.splitWith
      .map((userId) => users.find((u) => u.id === userId))
      .filter((user): user is User => Boolean(user));
  }, [expense.splitWith, users]);

  const splitWithDisplay = useMemo(() => {
    if (splitUsers.length <= 2) {
      return splitUsers.map((user) => user.name || "Unknown").join(" & ");
    } else {
      return `${splitUsers[0]?.name || "Unknown"} +${
        splitUsers.length - 1
      } others`;
    }
  }, [splitUsers]);

  // Use regular div on mobile, motion.div on desktop for better performance
  const Container = isMobile ? "div" : motion.div;
  const containerProps = isMobile
    ? {}
    : {
        transition: { duration: 0.2, ease: "easeOut" },
        whileHover: {
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
        },
      };

  return (
    <Container
      {...containerProps}
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
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-600">
                  Split with{" "}
                  <span className="font-medium">{splitWithDisplay}</span>
                </p>
                {expense.splitWith.length > 0 && !expense.isSettlement && (
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium underline ml-1 transition-colors"
                  >
                    (all)
                  </button>
                )}
              </div>
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
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(expense)}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-200 border border-blue-200"
                title="Edit expense"
              >
                <EditIcon />
              </button>
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove expense"
                >
                  {isDeleting ? (
                    <LoadingSpinner className="w-4 h-4" />
                  ) : (
                    <DeleteIcon />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(expense.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Expense?"
        message={`Are you sure you want to delete "${expense.description}" (₹${expense.amount})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Members Modal */}
      <MembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={splitUsers}
        title="Split With"
      />
    </Container>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpenseItem);
