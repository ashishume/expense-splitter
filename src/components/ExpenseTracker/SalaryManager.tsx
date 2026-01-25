import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Edit2, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import type { SalaryIncome, SalaryInstance } from "../../types/personalExpense";
import { api } from "../../services/apiService";
import { dataCache } from "../../utils/dataCache";

interface SalaryManagerProps {
  userId: string;
  month: string;
  onUpdate?: () => void;
}

const SalaryManager = ({ userId, month, onUpdate }: SalaryManagerProps) => {
  const [template, setTemplate] = useState<SalaryIncome | null>(null);
  const [instance, setInstance] = useState<SalaryInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, month]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Ensure instance exists for the month
      await api.salary.ensureInstanceForMonth(month, userId);

      const [templateData, instanceData] = await Promise.all([
        api.salary.getTemplate(userId),
        api.salary.getInstance(month, userId),
      ]);

      setTemplate(templateData as SalaryIncome | null);
      setInstance(instanceData as SalaryInstance | null);
      if (instanceData) {
        setAmount((instanceData as SalaryInstance).amount.toString());
      } else if (templateData) {
        setAmount((templateData as SalaryIncome).defaultAmount.toString());
      }
    } catch (error) {
      console.error("Error loading salary:", error);
      toast.error("Failed to load salary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      if (template) {
        // Update template (affects future months)
        await api.salary.createOrUpdateTemplate(numAmount, userId);
      } else {
        // Create new template
        await api.salary.createOrUpdateTemplate(numAmount, userId);
      }

      // Update current month instance
      if (instance) {
        await api.salary.updateInstance(instance.id, numAmount, userId);
      }

      toast.success("Salary updated!");
      setIsEditing(false);
      // Invalidate cache for current month
      dataCache.invalidateSalary(month);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating salary:", error);
      toast.error("Failed to update salary");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Salary Income
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-xl p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Salary
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-gray-600">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter salary amount"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This will update the template and current month
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                if (instance) {
                  setAmount(instance.amount.toString());
                } else if (template) {
                  setAmount(template.defaultAmount.toString());
                }
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200"
        >
          {instance || template ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">This Month</p>
              <p className="text-3xl font-bold text-green-700">
                {formatCurrency(instance?.amount || template?.defaultAmount || 0)}
              </p>
              {template && (
                <p className="text-xs text-gray-500 mt-2">
                  Default: {formatCurrency(template.defaultAmount)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-3">No salary configured</p>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Add Salary
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// Memoize to reduce re-renders on iPhone
export default memo(SalaryManager);
