import { useState } from "react";
import { motion } from "framer-motion";
import { formatTimestamp } from "../utils/dateUtils";
import {
  ArrowsIcon,
  UserProfileIcon,
  DeleteIcon,
  CheckCircleIcon,
  LoadingSpinner,
} from "./icons/index";
import { Handshake, ArrowRightLeft, Users } from "lucide-react";
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
  onDeleteSettledTransaction?: (expense: Expense) => void;
  individualBalances: Record<string, number>;
  currentUser: User | null;
}

const Settlements = ({
  settlements,
  groups,
  expenses,
  users,
  onSettle,
  onDeleteSettledTransaction,
  currentUser,
}: SettlementsProps) => {
  const [viewMode, setViewMode] = useState<"pending" | "settled">("pending");
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const [isDeletingSettledTransaction, setIsDeletingSettledTransaction] =
    useState<string | null>(null);

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

  // Check if user has any groups
  const hasGroups = userGroups.length > 0;

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

  // const handleDeleteSettlement = async (settlement: Settlement) => {
  //   if (isDeletingSettlement === settlement.id) return;
  //   setIsDeletingSettlement(settlement.id);
  //   try {
  //     await onDeleteSettlement?.(settlement);
  //   } finally {
  //     setIsDeletingSettlement(null);
  //   }
  // };

  const handleDeleteSettledTransaction = async (expense: Expense) => {
    if (isDeletingSettledTransaction === expense.id) return;
    setIsDeletingSettledTransaction(expense.id);
    try {
      await onDeleteSettledTransaction?.(expense);
    } finally {
      setIsDeletingSettledTransaction(null);
    }
  };

  // const handleResetAllSettlements = async () => {
  //   if (isResettingAllSettlements) return;
  //   setIsResettingAllSettlements(true);
  //   try {
  //     await onResetAllSettlements?.();
  //   } finally {
  //     setIsResettingAllSettlements(false);
  //   }
  // };

  // const handleResetAllSettledTransactions = async () => {
  //   if (isResettingAllSettledTransactions) return;
  //   setIsResettingAllSettledTransactions(true);
  //   try {
  //     await onResetAllSettledTransactions?.();
  //   } finally {
  //     setIsResettingAllSettledTransactions(false);
  //   }
  // };

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
            className={`btn flex-1 text-xs sm:text-sm font-medium ${
              viewMode === "pending" ? "btn-primary shadow-sm" : "btn-secondary"
            }`}
          >
            <span className="hidden sm:inline">Pending Settlements</span>
            <span className="sm:hidden">Pending</span>
            <span className="ml-1">({userSettlements.length})</span>
          </button>
          <button
            onClick={() => setViewMode("settled")}
            className={`btn flex-1 text-xs sm:text-sm font-medium ${
              viewMode === "settled" ? "btn-success shadow-sm" : "btn-secondary"
            }`}
          >
            <span className="hidden sm:inline">Settled Transactions</span>
            <span className="sm:hidden">Settled</span>
            <span className="ml-1">({userSettledTransactions.length})</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Empty State */}
        {!hasGroups ? (
          <div className="text-center py-12 text-gray-500">
            <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Groups Found</h3>
            <p className="text-sm mb-4">
              You need to be part of a group to see settlements.
            </p>
            <p className="text-xs text-gray-400">
              Create or join a group in the Groups tab to get started.
            </p>
          </div>
        ) : userSettlements.length === 0 &&
          userSettledTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Handshake className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">All Settled Up!</h3>
            <p className="text-sm mb-4">
              No pending settlements or settled transactions found.
            </p>
            <p className="text-xs text-gray-400">
              Add some expenses in the Expenses tab to see settlements here.
            </p>
          </div>
        ) : (
          <>
            {viewMode === "pending" && (
              <>
                {/* Pending Settlements List */}
                {Object.entries(settlementsByGroup).map(
                  ([groupId, groupSettlements]) => {
                    const group = groups.find((g) => g.id === groupId);
                    const groupTotal = calculateGroupTotal(groupId);
                    return (
                      <div key={groupId} className="space-y-3">
                        {group && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-gradient-to-r from-gray-50 to-slate-50"
                          >
                            {/* Background accent */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-indigo-600" />

                            <div className="p-4 sm:p-5 ml-1">
                              {/* Group header */}
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <span className="text-indigo-600 text-lg sm:text-xl font-bold">
                                    {group.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                                    {group.name}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-gray-500">
                                    {group.members.length} member
                                    {group.members.length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>

                              {/* Financial summary */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Total expenses */}
                                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-green-600 text-xs font-bold">
                                        ₹
                                      </span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-600">
                                      Total Expenses
                                    </span>
                                    <span className="text-xl sm:text-2xl font-bold text-green-600">
                                      ₹{groupTotal.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Average per person */}
                                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 text-xs font-bold">
                                        <Users className="w-3 h-3" />
                                      </span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-600">
                                      Per Person
                                    </span>
                                    <span className="text-xl sm:text-2xl font-bold text-blue-600">
                                      ₹
                                      {(
                                        groupTotal / (group.members.length || 1)
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Settlement status indicator */}
                              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs sm:text-sm font-medium text-amber-800">
                                    {groupSettlements.length} settlement
                                    {groupSettlements.length !== 1
                                      ? "s"
                                      : ""}{" "}
                                    pending
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div className="space-y-3 sm:space-y-4">
                          {groupSettlements.map((settlement, index) => (
                            <motion.div
                              key={settlement.id}
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{
                                delay: index * 0.1,
                                duration: 0.3,
                                ease: "easeOut",
                              }}
                              whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                              }}
                              className="relative overflow-hidden rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-red-50 to-orange-50"
                            >
                              {/* Background accent */}
                              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-red-600" />
                              <div className="p-3 sm:p-4 lg:p-5 ml-1">
                                {/* Main content - better mobile layout */}
                                <div className="flex flex-col gap-3 sm:gap-4">
                                  {/* Header with avatar and names */}
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <UserProfileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {/* Settlement status - more prominent on mobile */}
                                      <div className="text-sm sm:text-base font-semibold text-gray-800 mb-1">
                                        Settlement Required
                                      </div>
                                      {/* Payment flow - better mobile layout */}
                                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <span className="font-medium text-red-700 truncate">
                                          {settlement.fromName}
                                        </span>
                                        <span className="text-gray-500">→</span>
                                        <span className="font-medium text-green-700 truncate">
                                          {settlement.toName}
                                        </span>
                                      </div>
                                      {/* Amount owed - smaller and less prominent */}
                                      <div className="text-xs text-gray-400 mt-1">
                                        Amount owed
                                      </div>
                                    </div>
                                  </div>

                                  {/* Amount and action row */}
                                  <div className="flex items-center justify-between">
                                    {/* Amount display */}
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">
                                          ₹
                                        </span>
                                      </div>
                                      <div>
                                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                                          ₹{settlement.amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Pending
                                        </div>
                                      </div>
                                    </div>

                                    {/* Settle button */}
                                    {onSettle && (
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSettle(settlement)}
                                        disabled={isSettling === settlement.id}
                                        className="p-3 sm:p-2.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition-colors duration-200 border border-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center gap-2"
                                        title="Settle this amount"
                                      >
                                        {isSettling === settlement.id ? (
                                          <LoadingSpinner className="w-4 h-4 sm:w-5 sm:h-5" />
                                        ) : (
                                          <ArrowsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        )}
                                        <span className="text-sm font-medium">
                                          {isSettling === settlement.id
                                            ? "Settling..."
                                            : "Settle"}
                                        </span>
                                      </motion.button>
                                    )}
                                  </div>
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
                {/* {onResetAllSettledTransactions &&
                  userSettledTransactions.length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <button
                        onClick={handleResetAllSettledTransactions}
                        disabled={isResettingAllSettledTransactions}
                        className="btn btn-error px-4 py-2 text-sm font-medium flex items-center space-x-2"
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
                  )} */}
                {userSettledTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No settled transactions found.</p>
                  </div>
                ) : (
                  userSettledTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.3,
                        ease: "easeOut",
                      }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      }}
                      className="relative overflow-hidden rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-green-50 to-emerald-50"
                    >
                      {/* Background accent */}
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-green-600" />
                      <div className="p-3 sm:p-4 lg:p-5 ml-1">
                        {/* Main content - better mobile layout */}
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {/* Header with avatar and names */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <UserProfileIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Transaction description - more prominent on mobile */}
                              <div className="text-sm sm:text-base font-semibold text-gray-800 mb-1 break-words">
                                {transaction.description}
                              </div>
                              {/* Payment flow - better mobile layout */}
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                <span className="font-medium text-green-700 truncate">
                                  {transaction.paidByName}
                                </span>
                                <span className="text-gray-500">→</span>
                                <span className="font-medium text-blue-700 truncate">
                                  {users.find(
                                    (u) => u.id === transaction.splitWith[0]
                                  )?.name || "Unknown"}
                                </span>
                              </div>
                              {/* Date - smaller and less prominent */}
                              <div className="text-xs text-gray-400 mt-1">
                                {formatTimestamp(transaction.date)}
                              </div>
                            </div>
                          </div>

                          {/* Amount and action row */}
                          <div className="flex items-center justify-between">
                            {/* Amount display */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                  ₹
                                </span>
                              </div>
                              <div>
                                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
                                  ₹{transaction.amount.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Settled
                                </div>
                              </div>
                            </div>

                            {/* Delete button */}
                            {onDeleteSettledTransaction && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() =>
                                  handleDeleteSettledTransaction(transaction)
                                }
                                disabled={
                                  isDeletingSettledTransaction ===
                                  transaction.id
                                }
                                className="p-3 sm:p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                title="Delete transaction"
                              >
                                {isDeletingSettledTransaction ===
                                transaction.id ? (
                                  <LoadingSpinner className="w-4 h-4 sm:w-5 sm:h-5" />
                                ) : (
                                  <DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
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
