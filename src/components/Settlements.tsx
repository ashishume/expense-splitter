import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowsIcon,
  UserProfileIcon,
  DeleteIcon,
  CheckCircleIcon,
} from "./icons";

interface User {
  id: string;
  name: string;
  email?: string;
  groups?: string[];
}

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
  users: User[];
  onSettle?: (settlement: Settlement) => void;
  onDeleteSettlement?: (settlement: Settlement) => void;
  onDeleteSettledTransaction?: (expense: Expense) => void;
  onResetAllSettlements?: () => void;
  onResetAllSettledTransactions?: () => void;
  individualBalances: Record<string, number>;
  currentUserData: User | null;
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
  currentUserData,
}: SettlementsProps) => {
  const [viewMode, setViewMode] = useState<"pending" | "settled">("pending");

  // Filter settlements and expenses to only show those where current user is involved
  const filteredSettlements = currentUserData
    ? settlements.filter(
        (settlement) =>
          settlement.from === currentUserData.id ||
          settlement.to === currentUserData.id
      )
    : [];

  const filteredExpenses = currentUserData
    ? expenses.filter(
        (expense) =>
          expense.paidBy === currentUserData.id ||
          expense.splitWith.includes(currentUserData.id)
      )
    : [];

  // Get settled transactions (expenses with isSettlement: true)
  const settledTransactions = filteredExpenses.filter(
    (expense) => expense.isSettlement
  );

  // Check if there are any settlements or settled transactions to show
  const hasAnySettlements =
    filteredSettlements.length > 0 || settledTransactions.length > 0;

  // Group settlements by group
  const settlementsByGroup = filteredSettlements.reduce((acc, settlement) => {
    const groupId = settlement.groupId || "ungrouped";
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(settlement);
    return acc;
  }, {} as Record<string, Settlement[]>);

  // Calculate total expenses for a group, excluding settlements
  const calculateGroupTotal = (groupId: string) => {
    return filteredExpenses
      .filter((expense) => expense.groupId === groupId && !expense.isSettlement)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <ArrowsIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
        Who Owes Whom
      </h2>

      {/* General Empty State - when no settlements exist at all */}
      {!hasAnySettlements && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowsIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-3">
            No Settlements Yet
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            You don't have any pending settlements or settled transactions at
            the moment. This usually means all expenses are balanced or you
            haven't added any expenses yet.
          </p>
          <div className="text-sm text-gray-400">
            💡 Tip: Add some expenses to your groups to see settlements here
          </div>
        </div>
      )}

      {/* Only show the rest if there are settlements */}
      {hasAnySettlements && (
        <>
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
                Pending Settlements ({filteredSettlements.length})
              </button>
              <button
                onClick={() => setViewMode("settled")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "settled"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Settled Transactions ({settledTransactions.length})
              </button>
            </div>
          </div>

          {/* Reset All Button */}
          {viewMode === "pending" &&
            onResetAllSettlements &&
            filteredSettlements.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={onResetAllSettlements}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                >
                  <DeleteIcon className="w-4 h-4" />
                  <span>Reset All Pending Settlements</span>
                </button>
              </div>
            )}

          {viewMode === "settled" &&
            onResetAllSettledTransactions &&
            settledTransactions.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={onResetAllSettledTransactions}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                >
                  <DeleteIcon className="w-4 h-4" />
                  <span>Delete All Settled Transactions</span>
                </button>
              </div>
            )}

          <div className="space-y-6">
            {viewMode === "pending" && (
              <>
                {filteredSettlements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowsIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Pending Settlements
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Great! You're all caught up. There are no pending
                      settlements for you at the moment.
                    </p>
                  </div>
                ) : (
                  Object.entries(settlementsByGroup).map(
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
                                  {(
                                    groupTotal / (group.members.length || 1)
                                  ).toFixed(2)}
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
                                        <span className="text-gray-600">
                                          owes
                                        </span>
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
                                          onDeleteSettlement(settlement)
                                        }
                                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-1 text-sm font-medium"
                                      >
                                        <DeleteIcon className="w-3 h-3" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                    {onSettle && (
                                      <button
                                        onClick={() => onSettle(settlement)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                                      >
                                        <ArrowsIcon className="w-4 h-4" />
                                        <span>Settle</span>
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
                  )
                )}
              </>
            )}

            {viewMode === "settled" && (
              <div className="space-y-4">
                {settledTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No settled transactions found.</p>
                  </div>
                ) : (
                  settledTransactions.map((transaction, index) => (
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
                              onDeleteSettledTransaction(transaction)
                            }
                            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center space-x-1 text-sm font-medium"
                          >
                            <DeleteIcon className="w-3 h-3" />
                            <span>Delete Transaction</span>
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
          {hasAnySettlements && (
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
                      <span className="font-medium">{settlements.length}</span>
                    </div>
                    <div>
                      Total amount to be settled:{" "}
                      <span className="font-medium">
                        ₹
                        {settlements
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
                        {settledTransactions.length}
                      </span>
                    </div>
                    <div>
                      Total amount settled:{" "}
                      <span className="font-medium">
                        ₹
                        {settledTransactions
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Settlements;
