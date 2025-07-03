import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowsIcon,
  UserProfileIcon,
  DeleteIcon,
  CheckCircleIcon,
  LoadingSpinner,
} from "./icons/index";
import type { User } from "firebase/auth";

import type { User as AppUser } from "../types";

interface Settlement {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  groupId?: string;
  date: string;
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

interface SettlementsProps {
  settlements: Settlement[];
  groups: Group[];
  expenses: Expense[];
  users: AppUser[];
  onSettle?: (settlement: Settlement) => void;
  onDeleteSettlement?: (settlement: Settlement) => void;
  onDeleteSettledTransaction?: (expense: Expense) => void;
  onResetAllSettlements?: () => void;
  onResetAllSettledTransactions?: () => void;
  individualBalances: Record<string, number>;
  currentUser: User | null;
}

const Settlements = ({
  settlements,
  groups,
  expenses,
  users,
  onSettle,
  onDeleteSettlement,
  onDeleteSettledTransaction,
  onResetAllSettlements,
  onResetAllSettledTransactions,
  individualBalances,
  currentUser,
}: SettlementsProps) => {
  const [viewMode, setViewMode] = useState<"pending" | "settled">("pending");
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const [isDeletingSettlement, setIsDeletingSettlement] = useState<
    string | null
  >(null);
  const [isDeletingSettledTransaction, setIsDeletingSettledTransaction] =
    useState<string | null>(null);
  const [isResettingAllSettlements, setIsResettingAllSettlements] =
    useState(false);
  const [
    isResettingAllSettledTransactions,
    setIsResettingAllSettledTransactions,
  ] = useState(false);

  // Get groups that the current user is a member of
  const userGroups = groups.filter((group) =>
    group.members.includes(currentUser?.uid || "")
  );

  // Filter settlements to only show those for groups the current user is a member of
  const userSettlements = settlements.filter((settlement) => {
    if (!settlement.groupId) return false; // Skip ungrouped settlements
    return userGroups.some((group) => group.id === settlement.groupId);
  });

  // Filter settled transactions to only show those for groups the current user is a member of
  const userSettledTransactions = expenses.filter((expense) => {
    if (!expense.isSettlement) return false;
    if (!expense.groupId) return false; // Skip ungrouped settlements
    return userGroups.some((group) => group.id === expense.groupId);
  });

  if (userSettlements.length === 0 && userSettledTransactions.length === 0)
    return null;

  // Group settlements by group
  const settlementsByGroup = userSettlements.reduce((acc, settlement) => {
    const groupId = settlement.groupId || "ungrouped";
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(settlement);
    return acc;
  }, {} as Record<string, Settlement[]>);

  // Calculate total expenses for a group, excluding settlements
  const calculateGroupTotal = (groupId: string) => {
    return expenses
      .filter((expense) => expense.groupId === groupId && !expense.isSettlement)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  // Wrapper functions with loading states
  const handleSettle = async (settlement: Settlement) => {
    if (isSettling === settlement.id) return;
    setIsSettling(settlement.id);
    try {
      await onSettle?.(settlement);
    } finally {
      setIsSettling(null);
    }
  };

  const handleDeleteSettlement = async (settlement: Settlement) => {
    if (isDeletingSettlement === settlement.id) return;
    setIsDeletingSettlement(settlement.id);
    try {
      await onDeleteSettlement?.(settlement);
    } finally {
      setIsDeletingSettlement(null);
    }
  };

  const handleDeleteSettledTransaction = async (expense: Expense) => {
    if (isDeletingSettledTransaction === expense.id) return;
    setIsDeletingSettledTransaction(expense.id);
    try {
      await onDeleteSettledTransaction?.(expense);
    } finally {
      setIsDeletingSettledTransaction(null);
    }
  };

  const handleResetAllSettlements = async () => {
    if (isResettingAllSettlements) return;
    setIsResettingAllSettlements(true);
    try {
      await onResetAllSettlements?.();
    } finally {
      setIsResettingAllSettlements(false);
    }
  };

  const handleResetAllSettledTransactions = async () => {
    if (isResettingAllSettledTransactions) return;
    setIsResettingAllSettledTransactions(true);
    try {
      await onResetAllSettledTransactions?.();
    } finally {
      setIsResettingAllSettledTransactions(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <ArrowsIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
        My Settlements
      </h2>

      {/* View Mode Toggle */}
      <div className="mb-4 sm:mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("pending")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "pending"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Pending Settlements ({userSettlements.length})
          </button>
          <button
            onClick={() => setViewMode("settled")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "settled"
                ? "bg-white text-green-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Settled Transactions ({userSettledTransactions.length})
          </button>
        </div>
      </div>

      {/* Reset All Button */}
      {viewMode === "pending" &&
        onResetAllSettlements &&
        userSettlements.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleResetAllSettlements}
              disabled={isResettingAllSettlements}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResettingAllSettlements ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <DeleteIcon className="w-4 h-4" />
              )}
              <span>
                {isResettingAllSettlements
                  ? "Resetting..."
                  : "Reset All Pending Settlements"}
              </span>
            </button>
          </div>
        )}

      {viewMode === "settled" &&
        onResetAllSettledTransactions &&
        userSettledTransactions.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleResetAllSettledTransactions}
              disabled={isResettingAllSettledTransactions}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResettingAllSettledTransactions ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <DeleteIcon className="w-4 h-4" />
              )}
              <span>
                {isResettingAllSettledTransactions
                  ? "Deleting..."
                  : "Delete All Settled Transactions"}
              </span>
            </button>
          </div>
        )}

      <div className="space-y-6">
        {viewMode === "pending" && (
          <>
            {Object.entries(settlementsByGroup).map(
              ([groupId, groupSettlements]) => {
                const group = groups.find((g) => g.id === groupId);
                const groupTotal = calculateGroupTotal(groupId);

                return (
                  <div key={groupId} className="space-y-3">
                    {group && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {group.name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            Total Group Expenses: ₹{groupTotal.toFixed(2)}
                          </div>
                          <div>
                            Average per person: ₹
                            {(groupTotal / (group.members.length || 1)).toFixed(
                              2
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="font-medium mb-1">
                              Individual Balances:
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {group.members.map((memberId) => {
                                const member = users.find(
                                  (u) => u.id === memberId
                                );
                                const spending =
                                  individualBalances[memberId] || 0;
                                return (
                                  <div
                                    key={memberId}
                                    className="flex justify-between items-center text-xs"
                                  >
                                    <span className="font-medium">
                                      {member?.name}
                                    </span>
                                    <span
                                      className={`${
                                        spending >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {spending >= 0 ? "+" : ""}
                                      {spending.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 sm:space-y-4">
                      {groupSettlements.map((settlement, index) => (
                        <motion.div
                          key={settlement.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <UserProfileIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <span className="text-base sm:text-lg font-bold text-red-700">
                                    {settlement.fromName}
                                  </span>
                                  <span className="text-gray-600">owes</span>
                                  <span className="text-base sm:text-lg font-bold text-green-700">
                                    {settlement.toName}
                                  </span>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                  Settlement required
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                                ₹{settlement.amount.toFixed(2)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Amount owed
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 sm:mt-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600"></div>
                            <div className="flex items-center space-x-2">
                              {onDeleteSettlement && (
                                <button
                                  onClick={() =>
                                    handleDeleteSettlement(settlement)
                                  }
                                  disabled={
                                    isDeletingSettlement === settlement.id
                                  }
                                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isDeletingSettlement === settlement.id ? (
                                    <LoadingSpinner className="w-3 h-3" />
                                  ) : (
                                    <DeleteIcon className="w-3 h-3" />
                                  )}
                                  <span>
                                    {isDeletingSettlement === settlement.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </span>
                                </button>
                              )}
                              {onSettle && (
                                <button
                                  onClick={() => handleSettle(settlement)}
                                  disabled={isSettling === settlement.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSettling === settlement.id ? (
                                    <LoadingSpinner className="w-4 h-4" />
                                  ) : (
                                    <ArrowsIcon className="w-4 h-4" />
                                  )}
                                  <span>
                                    {isSettling === settlement.id
                                      ? "Settling..."
                                      : "Settle"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </>
        )}

        {viewMode === "settled" && (
          <div className="space-y-4">
            {userSettledTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No settled transactions found.</p>
              </div>
            ) : (
              userSettledTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <UserProfileIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <span className="text-base sm:text-lg font-bold text-green-700">
                            {transaction.paidByName}
                          </span>
                          <span className="text-gray-600">paid</span>
                          <span className="text-base sm:text-lg font-bold text-blue-700">
                            {users.find(
                              (u) => u.id === transaction.splitWith[0]
                            )?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600">
                        ₹{transaction.amount.toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        Amount settled
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-center justify-end">
                    {onDeleteSettledTransaction && (
                      <button
                        onClick={() =>
                          handleDeleteSettledTransaction(transaction)
                        }
                        disabled={
                          isDeletingSettledTransaction === transaction.id
                        }
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeletingSettledTransaction === transaction.id ? (
                          <LoadingSpinner className="w-3 h-3" />
                        ) : (
                          <DeleteIcon className="w-3 h-3" />
                        )}
                        <span>
                          {isDeletingSettledTransaction === transaction.id
                            ? "Deleting..."
                            : "Delete Transaction"}
                        </span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">
          {viewMode === "pending"
            ? "Settlement Summary"
            : "Settled Transactions Summary"}
        </h3>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          {viewMode === "pending" ? (
            <>
              <div>
                Total settlements needed:{" "}
                <span className="font-medium">{userSettlements.length}</span>
              </div>
              <div>
                Total amount to be settled:{" "}
                <span className="font-medium">
                  ₹
                  {userSettlements
                    .reduce((sum, s) => sum + s.amount, 0)
                    .toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                Total settled transactions:{" "}
                <span className="font-medium">
                  {userSettledTransactions.length}
                </span>
              </div>
              <div>
                Total amount settled:{" "}
                <span className="font-medium">
                  ₹
                  {userSettledTransactions
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Settlements;
