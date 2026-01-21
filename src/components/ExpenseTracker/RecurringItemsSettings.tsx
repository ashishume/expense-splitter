import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings } from "lucide-react";
import FixedCostsManager from "./FixedCostsManager";
import SalaryManager from "./SalaryManager";
import InvestmentsManager from "./InvestmentsManager";

interface RecurringItemsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  month: string;
  onUpdate?: () => void;
}

type Tab = "fixed-costs" | "salary" | "investments";

const RecurringItemsSettings = ({
  isOpen,
  onClose,
  userId,
  month,
  onUpdate,
}: RecurringItemsSettingsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("fixed-costs");

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar for mobile */}
        <div className="sm:hidden flex justify-center pt-4 pb-2">
          <div className="w-14 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Recurring Items
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 -m-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("fixed-costs")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "fixed-costs"
                ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Fixed Costs
          </button>
          <button
            onClick={() => setActiveTab("salary")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "salary"
                ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Salary
          </button>
          <button
            onClick={() => setActiveTab("investments")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "investments"
                ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Investments
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "fixed-costs" && (
            <FixedCostsManager
              userId={userId}
              month={month}
              onUpdate={onUpdate}
            />
          )}
          {activeTab === "salary" && (
            <SalaryManager userId={userId} month={month} onUpdate={onUpdate} />
          )}
          {activeTab === "investments" && (
            <InvestmentsManager
              userId={userId}
              month={month}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecurringItemsSettings;
