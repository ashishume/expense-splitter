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
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        // initial={{ opacity: 0, y: 20 }}
        // animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
      >
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
          <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
          {editingExpense ? "Edit Expense" : "Add Expense"}
        </h2>

        <div className="space-y-3 sm:space-y-4">
          {/* Paid By Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid By
            </label>
            <select
              value={newExpense.paidBy}
              onChange={(e) =>
                setNewExpense({ ...newExpense, paidBy: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">₹</span>
              <input
                type="number"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, amount: e.target.value })
                }
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
                placeholder="Amount"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
              placeholder="Description"
            />
          </div>

          {/* Split With Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split with
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {groupMembers.map((user) => {
                const isPayer = user.id === newExpense.paidBy;
                const isSelected = newExpense.splitWith.includes(user.id);
                const isDisabled = isPayer;

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
                        <span className="text-green-600 text-xs sm:text-sm font-medium">
                          (Payer)
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
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            {editingExpense ? (
              <>
                <button
                  onClick={onUpdateExpense}
                  disabled={isUpdatingExpense}
                  className="btn btn-purple flex-1 text-sm sm:text-base"
                >
                  {isUpdatingExpense ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
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
                  className="btn btn-secondary px-4 py-3 text-sm sm:text-base"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onAddExpense}
                disabled={isAddingExpense}
                className="btn btn-rose w-full text-sm sm:text-base"
              >
                {isAddingExpense ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
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
