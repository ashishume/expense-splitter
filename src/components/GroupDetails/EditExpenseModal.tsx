import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { CurrencyIcon, LoadingSpinner } from "../icons/index";
import type { User, Expense } from "../../types";

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  newExpense: {
    paidBy: string;
    amount: string;
    description: string;
    splitWith: string[];
  };
  setNewExpense: (expense: {
    paidBy: string;
    amount: string;
    description: string;
    splitWith: string[];
  }) => void;
  groupMembers: User[];
  isUpdatingExpense: boolean;
  onUpdateExpense: () => void;
  onToggleUser: (userId: string) => void;
  onSelectAll: () => void;
  onPayerChange?: (payerId: string) => void;
}

/**
 * EditExpenseModal Component
 *
 * A modal dialog for editing expenses that works well on both mobile and desktop.
 * On mobile, it appears as a bottom sheet. On desktop, it appears as a centered modal.
 */
const EditExpenseModal = ({
  isOpen,
  onClose,
  expense,
  newExpense,
  setNewExpense,
  groupMembers,
  isUpdatingExpense,
  onUpdateExpense,
  onToggleUser,
  onSelectAll,
  onPayerChange,
}: EditExpenseModalProps) => {
  if (!expense) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%", scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: "100%", scale: 0.95 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl sm:w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle indicator */}
              <div className="sm:hidden pt-3 pb-2 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="border-b border-gray-200 p-4 sm:p-6 relative flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={isUpdatingExpense}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md">
                    <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      Edit Expense
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {expense.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-5">
                  {/* Paid By Selection */}
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Paid By
                    </label>
                    <select
                      value={newExpense.paidBy}
                      onChange={(e) => {
                        const newPayerId = e.target.value;
                        if (onPayerChange) {
                          onPayerChange(newPayerId);
                        } else {
                          setNewExpense({ ...newExpense, paidBy: newPayerId });
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm sm:text-base"
                      disabled={isUpdatingExpense}
                    >
                      <option value="">Select a member</option>
                      {groupMembers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                          {user.email ? ` (${user.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500 text-sm sm:text-base">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            amount: e.target.value,
                          })
                        }
                        className="w-full pl-8 sm:pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm sm:text-base"
                        placeholder="Amount"
                        min="0"
                        step="0.01"
                        disabled={isUpdatingExpense}
                      />
                    </div>
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm sm:text-base"
                      placeholder="Description"
                      disabled={isUpdatingExpense}
                    />
                  </div>

                  {/* Split With Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex flex-col">
                        <label className="block text-sm sm:text-base font-medium text-gray-700">
                          Split with
                        </label>
                        {newExpense.paidBy && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            Select who should split this expense (payer can be
                            included)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={onSelectAll}
                        disabled={isUpdatingExpense || !newExpense.paidBy}
                        className="text-sm sm:text-base text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        {(() => {
                          const allSelected = groupMembers.every((user) =>
                            newExpense.splitWith.includes(user.id)
                          );
                          return allSelected ? "Deselect All" : "Select All";
                        })()}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {groupMembers.map((user) => {
                        const isPayer = user.id === newExpense.paidBy;
                        const isSelected = newExpense.splitWith.includes(
                          user.id
                        );
                        const isDisabled =
                          isUpdatingExpense || !newExpense.paidBy;

                        return (
                          <div
                            key={user.id}
                            onClick={() => !isDisabled && onToggleUser(user.id)}
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              isDisabled
                                ? "bg-gray-100 cursor-not-allowed opacity-60"
                                : isSelected
                                ? "bg-green-50 border border-green-200 hover:bg-green-100"
                                : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`edit-split-${user.id}`}
                              checked={isSelected}
                              onChange={() =>
                                !isDisabled && onToggleUser(user.id)
                              }
                              disabled={isDisabled}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <div className="ml-2 text-sm sm:text-base text-gray-700 flex-1">
                              <div className="flex flex-col">
                                <span
                                  className={`font-medium ${
                                    isSelected
                                      ? "text-green-800"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {user.name}
                                </span>
                                {user.email && (
                                  <span className="text-xs text-gray-500">
                                    {user.email}
                                  </span>
                                )}
                              </div>
                              {isPayer && (
                                <span className="text-blue-600 text-xs sm:text-sm font-medium">
                                  (Payer -{" "}
                                  {isSelected ? (
                                    <span className="text-green-600">
                                      included
                                    </span>
                                  ) : (
                                    <span className="text-red-600">
                                      not included
                                    </span>
                                  )}{" "}
                                  in split)
                                </span>
                              )}
                            </div>
                            {isSelected && !isDisabled && (
                              <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <button
                  onClick={onClose}
                  disabled={isUpdatingExpense}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={onUpdateExpense}
                  disabled={isUpdatingExpense}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center text-sm sm:text-base"
                >
                  {isUpdatingExpense ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    "Update Expense"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditExpenseModal;
