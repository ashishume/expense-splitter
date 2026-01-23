import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, TrendingUp, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import type { OneTimeInvestment } from "../../types/personalExpense";
import { api } from "../../services/apiService";

interface OneTimeInvestmentsManagerProps {
  userId: string;
  month: string;
  onUpdate?: () => void;
}

const OneTimeInvestmentsManager = ({
  userId,
  month,
  onUpdate,
}: OneTimeInvestmentsManagerProps) => {
  const [investments, setInvestments] = useState<OneTimeInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadData();
  }, [userId, month]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.oneTimeInvestments.getAll(month, userId);
      setInvestments(data);
    } catch (error) {
      console.error("Error loading one-time investments:", error);
      toast.error("Failed to load investments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid description and amount");
      return;
    }

    try {
      await api.oneTimeInvestments.create(
        {
          userId,
          amount: numAmount,
          description: description.trim(),
          date: new Date(date).toISOString(),
        },
        userId
      );

      toast.success("Investment added!");
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setIsAdding(false);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast.error("Failed to add investment");
    }
  };

  const handleUpdate = async (id: string, newDescription: string, newAmount: number, newDate: string) => {
    try {
      await api.oneTimeInvestments.update(
        id,
        {
          description: newDescription,
          amount: newAmount,
          date: new Date(newDate).toISOString(),
        },
        userId
      );
      toast.success("Investment updated!");
      setEditingId(null);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating investment:", error);
      toast.error("Failed to update investment");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investment?")) {
      return;
    }

    try {
      await api.oneTimeInvestments.delete(id, userId);
      toast.success("Investment deleted!");
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast.error("Failed to delete investment");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      {/* Add New Investment */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          One-Time Investments
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-xl p-4 space-y-3"
          >
            <input
              type="text"
              placeholder="Description (e.g., AAPL Stock, Tesla Shares)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDescription("");
                  setAmount("");
                  setDate(new Date().toISOString().split("T")[0]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investments List */}
      {investments.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No one-time investments this month. Add US stocks or other investments here!
        </p>
      ) : (
        <div className="space-y-3">
          {investments.map((investment) => {
            const isEditing = editingId === investment.id;

            return (
              <motion.div
                key={investment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                {isEditing ? (
                  <EditForm
                    investment={investment}
                    onSave={(desc, amt, dt) =>
                      handleUpdate(investment.id, desc, amt, dt)
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">
                        {investment.description}
                      </h4>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatCurrency(investment.amount)}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(investment.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(investment.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(investment.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface EditFormProps {
  investment: OneTimeInvestment;
  onSave: (description: string, amount: number, date: string) => void;
  onCancel: () => void;
}

const EditForm = ({ investment, onSave, onCancel }: EditFormProps) => {
  const [description, setDescription] = useState(investment.description);
  const [amount, setAmount] = useState(investment.amount.toString());
  const [date, setDate] = useState(
    new Date(investment.date).toISOString().split("T")[0]
  );

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    onSave(description.trim(), numAmount, date);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Memoize to reduce re-renders on iPhone
export default memo(OneTimeInvestmentsManager);
