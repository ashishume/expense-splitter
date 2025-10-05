import { motion } from "framer-motion";
import { CurrencyIcon } from "../icons/index";
import type { User, Expense } from "../../types";

interface SpendingSummaryProps {
  expenses: Expense[];
  groupMembers: User[];
}

/**
 * SpendingSummary Component
 *
 * Displays group spending statistics and individual member balances.
 * Shows who owes money and who should receive money.
 */
const SpendingSummary = ({ expenses, groupMembers }: SpendingSummaryProps) => {
  // Calculate total group spend (excluding settlements)
  const totalSpend = expenses
    .filter((e) => !e.isSettlement)
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculate per person balances
  const balances: Record<string, number> = {};
  groupMembers.forEach((user) => {
    balances[user.id] = 0;
  });

  expenses.forEach((expense) => {
    if (expense.isSettlement) {
      // Handle settlement transactions
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += expense.amount;
      }
      if (
        expense.splitWith.length === 1 &&
        balances[expense.splitWith[0]] !== undefined
      ) {
        balances[expense.splitWith[0]] -= expense.amount;
      }
    } else {
      // Handle regular expenses
      const amountPerPerson = expense.amount / (expense.splitWith.length + 1);
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += expense.amount;
      }
      expense.splitWith.forEach((userId) => {
        if (balances[userId] !== undefined) {
          balances[userId] -= amountPerPerson;
        }
      });
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] -= amountPerPerson;
      }
    }
  });

  const totalExpenses = expenses.filter((e) => !e.isSettlement).length;
  const avgPerExpense = totalExpenses > 0 ? totalSpend / totalExpenses : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg mb-4 lg:mb-6 border border-indigo-100"
    >
      <h3 className="text-lg lg:text-2xl font-semibold mb-4 lg:mb-6 text-gray-800 flex items-center">
        <CurrencyIcon className="w-5 h-5 lg:w-6 lg:h-6 mr-2 lg:mr-3 text-indigo-600" />
        Group Spending Summary
      </h3>

      <div className="space-y-4 lg:space-y-6">
        {/* Top Stats - Total Spend, Expenses Count, Average */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-indigo-100">
            <p className="text-sm lg:text-base text-gray-600 mb-1 lg:mb-2">
              Total Group Spend
            </p>
            <p className="text-2xl lg:text-3xl font-bold text-indigo-600">
              ₹{totalSpend.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-purple-100">
            <p className="text-sm lg:text-base text-gray-600 mb-1 lg:mb-2">
              Total Expenses
            </p>
            <p className="text-2xl lg:text-3xl font-bold text-purple-600">
              {totalExpenses}
            </p>
          </div>
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-pink-100">
            <p className="text-sm lg:text-base text-gray-600 mb-1 lg:mb-2">
              Avg per Expense
            </p>
            <p className="text-2xl lg:text-3xl font-bold text-pink-600">
              ₹{avgPerExpense.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Per Person Balance Breakdown */}
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-indigo-100">
          <h4 className="text-sm lg:text-base font-semibold text-gray-700 mb-3 lg:mb-4">
            Member Balances
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {groupMembers.map((member) => {
              const balance = balances[member.id] || 0;
              const isPositive = balance > 0.01; // Gets money back
              const isNegative = balance < -0.01; // Owes money
              const isSettled = !isPositive && !isNegative; // All settled

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-lg border-2 ${
                    isPositive
                      ? "bg-green-50 border-green-200"
                      : isNegative
                      ? "bg-orange-50 border-orange-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPositive
                            ? "bg-green-500"
                            : isNegative
                            ? "bg-orange-500"
                            : "bg-gray-400"
                        }`}
                      >
                        <span className="text-white font-bold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isPositive
                            ? "Gets back"
                            : isNegative
                            ? "Owes"
                            : "All settled"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isPositive
                            ? "text-green-600"
                            : isNegative
                            ? "text-orange-600"
                            : "text-gray-600"
                        }`}
                      >
                        {isSettled ? "₹0" : `₹${Math.abs(balance).toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SpendingSummary;
