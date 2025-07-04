import { useState } from "react";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { User as FirebaseUser } from "firebase/auth";
import { logExpenseAction } from "../utils/logger";
import { formatTimestamp } from "../utils/dateUtils";
import toast from "react-hot-toast";
import {
  EditIcon,
  DeleteIcon,
  CurrencyIcon,
  LoadingSpinner,
} from "./icons/index";

import type { User } from "../types";

interface Group {
  id: string;
  name: string;
  members: string[];
}

interface Expense {
  id: string;
  paidBy: string;
  paidByName: string;
  amount: number;
  description: string;
  splitWith: string[];
  date: string;
  groupId?: string;
  isSettlement?: boolean;
}

interface ExpensesProps {
  users: User[];
  groups: Group[];
  expenses: Expense[];
  onExpenseUpdate: () => void;
  currentUser: FirebaseUser | null;
}

// Tab Navigation Component
interface TabNavigationProps {
  tabs: Array<{ id: string; name: string; count: number }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation = ({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) => (
  <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto pb-2">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`btn px-3 py-2 sm:px-4 sm:py-2 rounded-t-lg font-medium flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
          activeTab === tab.id ? "btn-success shadow-md" : "btn-secondary"
        }`}
      >
        <span className="truncate max-w-[100px] sm:max-w-none">{tab.name}</span>
        <span
          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full flex-shrink-0 ${
            activeTab === tab.id
              ? "bg-white text-success"
              : "bg-secondary text-secondary"
          }`}
        >
          {tab.count}
        </span>
      </button>
    ))}
  </div>
);

// Expense Item Component
interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  userGroups: Group[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeleting: boolean;
}

const ExpenseItem = ({
  expense,
  users,
  userGroups,
  onEdit,
  onDelete,
  isDeleting,
}: ExpenseItemProps) => {
  // Get user avatars/initials for split with
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      }}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        expense.isSettlement
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
          : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Background accent */}
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
            {/* Header with title and badges */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 break-words leading-tight">
                {expense.description}
              </h3>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {expense.isSettlement && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-200"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Settlement
                  </motion.span>
                )}
                {expense.groupId && !expense.isSettlement && (
                  <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2" />
                    {userGroups.find((g) => g.id === expense.groupId)?.name}
                  </span>
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

            {/* Split with info */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {expense.splitWith.slice(0, 3).map((userId, index) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <motion.div
                      key={userId}
                      initial={{ scale: 0, x: -10 }}
                      animate={{ scale: 1, x: 0 }}
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

          {/* Action buttons */}
          {!expense.isSettlement && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 flex-shrink-0"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
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

// Expenses List Component
interface ExpensesListProps {
  expenses: Expense[];
  users: User[];
  userGroups: Group[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeleting: string | null;
}

const ExpensesList = ({
  expenses,
  users,
  userGroups,
  activeTab,
  onTabChange,
  onEdit,
  onDelete,
  isDeleting,
}: ExpensesListProps) => {
  // Filter expenses to only show those for groups the user is a member of
  const userExpenses = expenses.filter((expense) => {
    if (!expense.groupId) return false; // Skip ungrouped expenses
    return userGroups.some((group) => group.id === expense.groupId);
  });

  const groupedExpenses = userExpenses.reduce((acc, expense) => {
    const groupId = expense.groupId || "no-group";
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const tabs = [
    { id: "all", name: "All Expenses", count: userExpenses.length },
    ...Object.entries(groupedExpenses).map(([groupId, groupExpenses]) => {
      const group = userGroups.find((g) => g.id === groupId);
      return {
        id: groupId,
        name: group ? group.name : "No Group",
        count: groupExpenses.length,
      };
    }),
  ];

  const displayExpenses =
    activeTab === "all" ? userExpenses : groupedExpenses[activeTab] || [];

  return (
    <div>
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {displayExpenses.map((expense) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            users={users}
            userGroups={userGroups}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting === expense.id}
          />
        ))}
      </motion.div>
    </div>
  );
};

const Expenses = ({
  users,
  groups,
  expenses,
  onExpenseUpdate,
  currentUser,
}: ExpensesProps) => {
  const [newExpense, setNewExpense] = useState({
    paidBy: "",
    amount: "",
    description: "",
    splitWith: [] as string[],
    groupId: "",
  });

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(
    null
  );

  // Filter groups to only show groups the current user is a member of
  const userGroups = groups.filter((group) =>
    group.members.includes(currentUser?.uid || "")
  );

  const toggleUserForExpense = (userId: string) => {
    const currentSelection = [...newExpense.splitWith];
    const index = currentSelection.indexOf(userId);

    if (index > -1) {
      currentSelection.splice(index, 1);
    } else {
      currentSelection.push(userId);
    }

    setNewExpense({
      ...newExpense,
      splitWith: currentSelection,
    });
  };

  const addExpense = async () => {
    if (
      !newExpense.paidBy ||
      !newExpense.amount ||
      !newExpense.description ||
      !newExpense.groupId ||
      newExpense.splitWith.length === 0
    ) {
      toast.error(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isAddingExpense) return; // Prevent duplicate submissions

    setIsAddingExpense(true);
    try {
      const paidByUser = users.find((user) => user.id === newExpense.paidBy);
      if (!paidByUser) {
        throw new Error("Payer not found");
      }

      const expenseRef = await addDoc(collection(db, "expenses"), {
        paidBy: newExpense.paidBy,
        paidByName: paidByUser.name,
        amount: amount,
        description: newExpense.description,
        splitWith: newExpense.splitWith,
        date: new Date().toISOString(),
        groupId: newExpense.groupId || null,
      });

      await logExpenseAction(
        "create",
        expenseRef.id,
        `Created expense: ${newExpense.description} - ₹${amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        newExpense.groupId || undefined
      );

      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
        groupId: "",
      });
      onExpenseUpdate();
      toast.success("Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense: ", error);
      toast.error("Error adding expense. Please try again.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (isDeletingExpense === expenseId) return; // Prevent duplicate submissions

    setIsDeletingExpense(expenseId);
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      await deleteDoc(doc(db, "expenses", expenseId));
      await logExpenseAction(
        "delete",
        expenseId,
        `Deleted expense: ${expense.description} - ₹${expense.amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        expense.groupId || undefined
      );
      onExpenseUpdate();
      toast.success("Expense removed successfully!");
    } catch (error) {
      console.error("Error removing expense: ", error);
      toast.error("Error removing expense. Please try again.");
    } finally {
      setIsDeletingExpense(null);
    }
  };

  const startEditing = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      paidBy: expense.paidBy,
      amount: expense.amount.toString(),
      description: expense.description,
      splitWith: expense.splitWith,
      groupId: expense.groupId || "",
    });
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setNewExpense({
      paidBy: "",
      amount: "",
      description: "",
      splitWith: [],
      groupId: "",
    });
  };

  const updateExpense = async () => {
    if (!editingExpense) return;

    if (
      !newExpense.paidBy ||
      !newExpense.amount ||
      !newExpense.description ||
      newExpense.splitWith.length === 0
    ) {
      toast.error(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isUpdatingExpense) return; // Prevent duplicate submissions

    setIsUpdatingExpense(true);
    try {
      const paidByUser = users.find((user) => user.id === newExpense.paidBy);
      if (!paidByUser) {
        throw new Error("Payer not found");
      }

      const expenseRef = doc(db, "expenses", editingExpense.id);
      await updateDoc(expenseRef, {
        paidBy: newExpense.paidBy,
        paidByName: paidByUser.name,
        amount: amount,
        description: newExpense.description,
        splitWith: newExpense.splitWith,
        groupId: newExpense.groupId || null,
      });

      await logExpenseAction(
        "update",
        editingExpense.id,
        `Updated expense: ${newExpense.description} - ₹${amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        newExpense.groupId || undefined
      );

      setEditingExpense(null);
      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
        groupId: "",
      });
      onExpenseUpdate();
      toast.success("Expense updated successfully!");
    } catch (error) {
      console.error("Error updating expense: ", error);
      toast.error("Error updating expense. Please try again.");
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
        {editingExpense ? "Edit Expense" : "Add Expense"}
      </h2>

      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group
          </label>
          <select
            value={newExpense.groupId}
            onChange={(e) => {
              const selectedGroupId = e.target.value;
              setNewExpense({
                ...newExpense,
                groupId: selectedGroupId,
                paidBy: "", // Reset paid by when group changes
                splitWith: [], // Reset split with when group changes
              });
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
          >
            <option value="">Select a group</option>
            {userGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

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
            disabled={!newExpense.groupId}
          >
            <option value="">
              {newExpense.groupId ? "Select a member" : "Select a group first"}
            </option>
            {newExpense.groupId
              ? (() => {
                  const selectedGroup = userGroups.find(
                    (g) => g.id === newExpense.groupId
                  );
                  if (selectedGroup) {
                    return users.filter((user) =>
                      selectedGroup.members.includes(user.id)
                    );
                  }
                  return [];
                })().map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.email ? ` (${user.email})` : ""}
                  </option>
                ))
              : null}
          </select>
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Split with
          </label>
          {newExpense.groupId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {(() => {
                const selectedGroup = userGroups.find(
                  (g) => g.id === newExpense.groupId
                );
                if (selectedGroup) {
                  return users.filter((user) =>
                    selectedGroup.members.includes(user.id)
                  );
                }
                return [];
              })().map((user) => {
                const isPayer = user.id === newExpense.paidBy;
                const isSelected = newExpense.splitWith.includes(user.id);
                const isDisabled = isPayer;

                return (
                  <div
                    key={user.id}
                    onClick={() => !isDisabled && toggleUserForExpense(user.id)}
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
                      onChange={() =>
                        !isDisabled && toggleUserForExpense(user.id)
                      }
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
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Select a group first to see members
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          {editingExpense ? (
            <>
              <button
                onClick={updateExpense}
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
                onClick={cancelEditing}
                className="btn btn-secondary px-4 py-3 text-sm sm:text-base"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={addExpense}
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

      {/* Expenses List */}
      {expenses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Recent Expenses</h3>
          <ExpensesList
            expenses={expenses}
            users={users}
            userGroups={userGroups}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onEdit={startEditing}
            onDelete={removeExpense}
            isDeleting={isDeletingExpense}
          />
        </div>
      )}
    </motion.div>
  );
};

export default Expenses;
