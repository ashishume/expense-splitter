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

interface User {
  id: string;
  name: string;
  groups?: string[];
}

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
      alert(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

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
        currentUser?.displayName || undefined
      );

      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
        groupId: "",
      });
      onExpenseUpdate();
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("Error adding expense. Please try again.");
    }
  };

  const removeExpense = async (expenseId: string) => {
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      await deleteDoc(doc(db, "expenses", expenseId));
      await logExpenseAction(
        "delete",
        expenseId,
        `Deleted expense: ${expense.description} - ₹${expense.amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined
      );
      onExpenseUpdate();
    } catch (error) {
      console.error("Error removing expense: ", error);
      alert("Error removing expense. Please try again.");
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
      alert(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

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
        currentUser?.displayName || undefined
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
    } catch (error) {
      console.error("Error updating expense: ", error);
      alert("Error updating expense. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select a group</option>
            {groups.map((group) => (
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={!newExpense.groupId}
          >
            <option value="">
              {newExpense.groupId ? "Select a member" : "Select a group first"}
            </option>
            {newExpense.groupId
              ? (() => {
                  const selectedGroup = groups.find(
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
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                const selectedGroup = groups.find(
                  (g) => g.id === newExpense.groupId
                );
                if (selectedGroup) {
                  return users.filter((user) =>
                    selectedGroup.members.includes(user.id)
                  );
                }
                return [];
              })().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-lg"
                >
                  <input
                    type="checkbox"
                    id={`split-${user.id}`}
                    checked={newExpense.splitWith.includes(user.id)}
                    onChange={() => toggleUserForExpense(user.id)}
                    disabled={user.id === newExpense.paidBy}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor={`split-${user.id}`}
                    className="ml-2 text-sm sm:text-base text-gray-700"
                  >
                    {user.name}{" "}
                    {user.id === newExpense.paidBy ? (
                      <span className="text-green-600 text-xs sm:text-sm">
                        (Payer)
                      </span>
                    ) : null}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
              Select a group first to see members
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {editingExpense ? (
            <>
              <button
                onClick={updateExpense}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md"
              >
                Update Expense
              </button>
              <button
                onClick={cancelEditing}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={addExpense}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md"
            >
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Recent Expenses</h3>

          {/* Tabs */}
          {(() => {
            const groupedExpenses = expenses.reduce((acc, expense) => {
              const groupId = expense.groupId || "no-group";
              if (!acc[groupId]) {
                acc[groupId] = [];
              }
              acc[groupId].push(expense);
              return acc;
            }, {} as Record<string, Expense[]>);

            const tabs = [
              { id: "all", name: "All Expenses", count: expenses.length },
              ...Object.entries(groupedExpenses).map(
                ([groupId, groupExpenses]) => {
                  const group = groups.find((g) => g.id === groupId);
                  return {
                    id: groupId,
                    name: group ? group.name : "No Group",
                    count: groupExpenses.length,
                  };
                }
              ),
            ];

            return (
              <div>
                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-t-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? "bg-green-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <span>{tab.name}</span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          activeTab === tab.id
                            ? "bg-white text-green-600"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {activeTab === "all"
                    ? // Show all expenses
                      expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className={`p-4 rounded-md flex justify-between items-start ${
                            expense.isSettlement
                              ? "bg-green-50 border-l-4 border-green-400"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-medium">
                                {expense.description}
                              </h3>
                              {expense.isSettlement && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Settlement
                                </span>
                              )}
                              {expense.groupId && !expense.isSettlement && (
                                <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                  {
                                    groups.find((g) => g.id === expense.groupId)
                                      ?.name
                                  }
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">
                              Paid by {expense.paidByName} - ₹{expense.amount}
                            </p>
                            <p className="text-sm text-gray-500">
                              Split with:{" "}
                              {expense.splitWith
                                .map(
                                  (userId) =>
                                    users.find((u) => u.id === userId)?.name ||
                                    "Unknown"
                                )
                                .join(", ")}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          {!expense.isSettlement && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(expense)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors duration-200"
                                title="Edit expense"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => removeExpense(expense.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors duration-200"
                                title="Remove expense"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    : // Show expenses for specific group
                      groupedExpenses[activeTab]?.map((expense) => (
                        <div
                          key={expense.id}
                          className={`p-4 rounded-md flex justify-between items-start ${
                            expense.isSettlement
                              ? "bg-green-50 border-l-4 border-green-400"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-medium">
                                {expense.description}
                              </h3>
                              {expense.isSettlement && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Settlement
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">
                              Paid by {expense.paidByName} - ₹{expense.amount}
                            </p>
                            <p className="text-sm text-gray-500">
                              Split with:{" "}
                              {expense.splitWith
                                .map(
                                  (userId) =>
                                    users.find((u) => u.id === userId)?.name ||
                                    "Unknown"
                                )
                                .join(", ")}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          {!expense.isSettlement && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(expense)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors duration-200"
                                title="Edit expense"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => removeExpense(expense.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors duration-200"
                                title="Remove expense"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                </motion.div>
              </div>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
};

export default Expenses;
