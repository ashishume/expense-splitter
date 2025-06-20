import { motion } from "framer-motion";

interface User {
  id: string;
  name: string;
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
}

interface SettlementsProps {
  settlements: Settlement[];
  groups: Group[];
  expenses: Expense[];
  users: User[];
  onSettle?: (settlement: Settlement) => void;
}

const Settlements = ({
  settlements,
  groups,
  expenses,
  users,
  onSettle,
}: SettlementsProps) => {
  if (settlements.length === 0) return null;

  // Group settlements by group
  const settlementsByGroup = settlements.reduce((acc, settlement) => {
    const groupId = settlement.groupId || "ungrouped";
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(settlement);
    return acc;
  }, {} as Record<string, Settlement[]>);

  // Calculate total expenses for a group
  const calculateGroupTotal = (groupId: string) => {
    return expenses
      .filter((expense) => expense.groupId === groupId)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  // Calculate individual spending in a group
  const calculateIndividualSpending = (groupId: string, userId: string) => {
    const groupExpenses = expenses.filter(
      (expense) => expense.groupId === groupId
    );
    let total = 0;

    groupExpenses.forEach((expense) => {
      if (expense.paidBy === userId) {
        total += expense.amount;
      }
      if (expense.splitWith.includes(userId)) {
        total -= expense.amount / (expense.splitWith.length + 1);
      }
    });

    return total;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        Who Owes Whom
      </h2>

      <div className="space-y-6">
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
                      <div>Total Group Expenses: ₹{groupTotal.toFixed(2)}</div>
                      <div>
                        Average per person: ₹
                        {(groupTotal / (group.members.length || 1)).toFixed(2)}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="font-medium mb-1">
                          Individual Balances:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.members.map((memberId) => {
                            const member = users.find((u) => u.id === memberId);
                            const spending = calculateIndividualSpending(
                              groupId,
                              memberId
                            );
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
                              <svg
                                className="w-4 h-4 sm:w-5 sm:h-5 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
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
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7l5 5m0 0l-5 5m5-5H6"
                            />
                          </svg>
                          <span>Pay directly to settle</span>
                        </div>
                        {onSettle && (
                          <button
                            onClick={() => onSettle(settlement)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2 text-sm font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>Settle</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">
          Settlement Summary
        </h3>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <div>
            Total settlements needed:{" "}
            <span className="font-medium">{settlements.length}</span>
          </div>
          <div>
            Total amount to be settled:{" "}
            <span className="font-medium">
              ₹{settlements.reduce((sum, s) => sum + s.amount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Settlements;
