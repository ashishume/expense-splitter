import { forwardRef } from "react";
import { motion } from "framer-motion";
import { CurrencyIcon, LoadingSpinner } from "../icons/index";
import type { User, Expense } from "../../types";

interface ExpenseFormProps {
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
  editingExpense: Expense | null;
  isAddingExpense: boolean;
  isUpdatingExpense: boolean;
  onAddExpense: () => void;
  onUpdateExpense: () => void;
  onCancelEditing: () => void;
  onToggleUser: (userId: string) => void;
  onSelectAll: () => void;
  onPayerChange?: (payerId: string) => void;
}

/**
 * ExpenseForm Component
 *
 * Form for adding new expenses or editing existing ones.
 * Handles payer selection, amount input, description, and split selection.
 */
const ExpenseForm = forwardRef<HTMLDivElement, ExpenseFormProps>(
  (
    {
      newExpense,
      setNewExpense,
      groupMembers,
      editingExpense,
      isAddingExpense,
      isUpdatingExpense,
      onAddExpense,
      onUpdateExpense,
      onCancelEditing,
      onToggleUser,
      onSelectAll,
      onPayerChange,
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        // initial={{ opacity: 0, y: 20 }}
        // animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 lg:mb-8 text-gray-800 flex items-center">
          <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 lg:mr-3 text-green-600" />
          {editingExpense ? "Edit Expense" : "Add Expense"}
        </h2>

        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          {/* Paid By Selection */}
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1 lg:mb-2">
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
              className="w-full px-4 py-3 lg:px-5 lg:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm lg:text-base"
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
            <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1 lg:mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 lg:left-5 top-3 lg:top-4 text-gray-500 text-sm lg:text-base">
                ₹
              </span>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, amount: e.target.value })
                }
                className="w-full pl-8 lg:pl-10 pr-4 lg:pr-5 py-3 lg:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm lg:text-base"
                placeholder="Amount"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm lg:text-base font-medium text-gray-700 mb-1 lg:mb-2">
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
              className="w-full px-4 py-3 lg:px-5 lg:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix text-sm lg:text-base"
              placeholder="Description"
            />
          </div>

          {/* Split With Selection */}
          <div>
            <div className="flex items-center justify-between mb-2 lg:mb-3">
              <div className="flex flex-col">
                <label className="block text-sm lg:text-base font-medium text-gray-700">
                  Split with
                </label>
                {newExpense.paidBy && (
                  <span className="text-xs text-gray-500 mt-0.5">
                    Select who should split this expense (payer can be included)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onSelectAll}
                disabled={!newExpense.paidBy}
                className="text-sm lg:text-base text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {(() => {
                  const allSelected = groupMembers.every((user) =>
                    newExpense.splitWith.includes(user.id)
                  );
                  return allSelected ? "Deselect All" : "Select All";
                })()}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              {groupMembers.map((user) => {
                const isPayer = user.id === newExpense.paidBy;
                const isSelected = newExpense.splitWith.includes(user.id);
                const isDisabled = !newExpense.paidBy;

                return (
                  <div
                    key={user.id}
                    onClick={() => !isDisabled && onToggleUser(user.id)}
                    className={`flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isDisabled
                        ? "bg-gray-100 cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-green-50 border border-green-200 hover:bg-green-100"
                        : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`split-${user.id}`}
                      checked={isSelected}
                      onChange={() => !isDisabled && onToggleUser(user.id)}
                      disabled={isDisabled}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                    />
                    <div className="ml-2 text-sm sm:text-base text-gray-700 flex-1">
                      <div className="flex flex-col">
                        <span
                          className={`font-medium ${
                            isSelected ? "text-green-800" : "text-gray-800"
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
                            <span className="text-green-600">included</span>
                          ) : (
                            <span className="text-red-600">not included</span>
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 mt-4 lg:mt-6">
            {editingExpense ? (
              <>
                <button
                  onClick={onUpdateExpense}
                  disabled={isUpdatingExpense}
                  className="btn btn-purple flex-1 text-sm sm:text-base lg:text-lg lg:py-4"
                >
                  {isUpdatingExpense ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                      <span className="hidden sm:inline">Updating...</span>
                      <span className="sm:hidden">Update...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Update Expense</span>
                      <span className="sm:hidden">Update</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onCancelEditing}
                  className="btn btn-secondary px-4 py-3 lg:px-6 lg:py-4 text-sm sm:text-base lg:text-lg"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onAddExpense}
                disabled={isAddingExpense}
                className="btn btn-rose w-full text-sm sm:text-base lg:text-lg lg:py-4"
              >
                {isAddingExpense ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                    <span className="hidden sm:inline">Adding...</span>
                    <span className="sm:hidden">Add...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Add Expense</span>
                    <span className="sm:hidden">Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

ExpenseForm.displayName = "ExpenseForm";

export default ExpenseForm;
