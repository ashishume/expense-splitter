import { motion } from "framer-motion";
import { ArrowRightLeft } from "lucide-react";
import { formatTimestamp } from "../../utils/dateUtils";
import { ArrowsIcon, CheckCircleIcon, LoadingSpinner } from "../icons/index";
import type { Settlement, Expense } from "../../types";

interface SettlementsListProps {
  settlements: Settlement[];
  expenses: Expense[];
  isSettling: string | null;
  onSettle: (settlement: Settlement) => void;
}

/**
 * SettlementsList Component
 *
 * Displays pending settlements and completed settlement transactions.
 * Allows users to mark settlements as completed.
 */
const SettlementsList = ({
  settlements,
  expenses,
  isSettling,
  onSettle,
}: SettlementsListProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
        <ArrowsIcon className="w-5 h-5 mr-2 text-indigo-600" />
        Pending Settlements
      </h3>

      {/* Pending Settlements */}
      {settlements.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            All Settled Up!
          </p>
          <p className="text-gray-500">No pending settlements in this group.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            {settlements.length} pending settlement
            {settlements.length !== 1 ? "s" : ""}
          </p>
          {settlements.map((settlement) => (
            <motion.div
              key={settlement.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
              }}
              className="relative overflow-hidden rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-amber-50 to-orange-50"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-400 to-orange-600" />
              <div className="p-4 sm:p-5 ml-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* User avatars */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-white font-bold text-sm">
                            {settlement.fromName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <ArrowRightLeft className="w-5 h-5 text-gray-400" />
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-white font-bold text-sm">
                            {settlement.toName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Settlement details */}
                    <div>
                      <p className="text-base sm:text-lg font-semibold text-gray-800">
                        <span className="text-orange-600">
                          {settlement.fromName}
                        </span>
                        {" owes "}
                        <span className="text-green-600">
                          {settlement.toName}
                        </span>
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ₹{settlement.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Settle button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSettle(settlement)}
                    disabled={isSettling === settlement.id}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    {isSettling === settlement.id ? (
                      <>
                        <LoadingSpinner className="w-4 h-4" />
                        <span className="hidden sm:inline">Settling...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">
                          Mark as Settled
                        </span>
                        <span className="sm:hidden">Settle</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Settled Transactions History */}
      {expenses.filter((e) => e.isSettlement).length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold mb-4 text-gray-800">
            Settled Transactions
          </h4>
          <div className="space-y-3">
            {expenses
              .filter((e) => e.isSettlement)
              .map((expense) => (
                <div
                  key={expense.id}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(expense.date)}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      ₹{expense.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SettlementsList;
