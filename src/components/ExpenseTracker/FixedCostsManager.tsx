import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import type { FixedCost, FixedCostInstance } from "../../types/personalExpense";
import { api } from "../../services/apiService";

interface FixedCostsManagerProps {
  userId: string;
  month: string;
  onUpdate?: () => void;
}

const FixedCostsManager = ({
  userId,
  month,
  onUpdate,
}: FixedCostsManagerProps) => {
  const [templates, setTemplates] = useState<FixedCost[]>([]);
  const [instances, setInstances] = useState<FixedCostInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    loadData();
  }, [userId, month]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Ensure instances exist for the month
      await api.fixedCosts.ensureInstancesForMonth(month, userId);

      const [templatesData, instancesData] = await Promise.all([
        api.fixedCosts.getTemplates(userId),
        api.fixedCosts.getInstances(month, userId),
      ]);

      setTemplates(templatesData);
      setInstances(instancesData);
    } catch (error) {
      console.error("Error loading fixed costs:", error);
      toast.error("Failed to load fixed costs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid name and amount");
      return;
    }

    try {
      await api.fixedCosts.createTemplate(
        {
          userId,
          name: newName.trim(),
          defaultAmount: amount,
        },
        userId
      );

      toast.success("Fixed cost added!");
      setNewName("");
      setNewAmount("");
      setIsAdding(false);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error adding fixed cost:", error);
      toast.error("Failed to add fixed cost");
    }
  };

  const handleUpdateTemplate = async (id: string, name: string, amount: number) => {
    try {
      await api.fixedCosts.updateTemplate(id, { name, defaultAmount: amount }, userId);
      toast.success("Fixed cost updated!");
      setEditingId(null);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating fixed cost:", error);
      toast.error("Failed to update fixed cost");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fixed cost?")) {
      return;
    }

    try {
      await api.fixedCosts.deleteTemplate(id, userId);
      toast.success("Fixed cost deleted!");
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting fixed cost:", error);
      toast.error("Failed to delete fixed cost");
    }
  };

  const handleToggleInstance = async (instance: FixedCostInstance) => {
    try {
      await api.fixedCosts.updateInstance(
        instance.id,
        { isEnabled: !instance.isEnabled },
        userId
      );
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error toggling fixed cost instance:", error);
      toast.error("Failed to update fixed cost");
    }
  };

  const handleUpdateInstanceAmount = async (
    instance: FixedCostInstance,
    amount: number
  ) => {
    try {
      await api.fixedCosts.updateInstance(instance.id, { amount }, userId);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error("Error updating fixed cost instance:", error);
      toast.error("Failed to update amount");
    }
  };

  const getInstanceForTemplate = (templateId: string) => {
    return instances.find((inst) => inst.fixedCostId === templateId);
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
      {/* Add New Fixed Cost */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Fixed Costs</h3>
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
              placeholder="Name (e.g., Rent, Maid)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                  setNewAmount("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Costs List */}
      {templates.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          No fixed costs yet. Add one to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const instance = getInstanceForTemplate(template.id);
            const isEditing = editingId === template.id;

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 border border-gray-200"
              >
                {isEditing ? (
                  <EditTemplateForm
                    template={template}
                    instance={instance}
                    onSave={(name, amount) =>
                      handleUpdateTemplate(template.id, name, amount)
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-800">
                          {template.name}
                        </h4>
                        {instance && (
                          <button
                            onClick={() =>
                              handleToggleInstance(instance)
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {instance.isEnabled ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-300" />
                            )}
                          </button>
                        )}
                      </div>
                      {instance ? (
                        <div className="mt-1 flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            This month: {formatCurrency(instance.amount)}
                          </span>
                          <button
                            onClick={() => {
                              const newAmount = prompt(
                                "Enter new amount:",
                                instance.amount.toString()
                              );
                              if (newAmount) {
                                const amount = parseFloat(newAmount);
                                if (!isNaN(amount) && amount > 0) {
                                  handleUpdateInstanceAmount(instance, amount);
                                }
                              }
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            Edit amount
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Default: {formatCurrency(template.defaultAmount)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(template.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
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

interface EditTemplateFormProps {
  template: FixedCost;
  instance: FixedCostInstance | undefined;
  onSave: (name: string, amount: number) => void;
  onCancel: () => void;
}

const EditTemplateForm = ({
  template,
  instance,
  onSave,
  onCancel,
}: EditTemplateFormProps) => {
  const [name, setName] = useState(template.name);
  const [amount, setAmount] = useState(
    instance?.amount.toString() || template.defaultAmount.toString()
  );

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!name.trim() || isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    onSave(name.trim(), numAmount);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
export default memo(FixedCostsManager);
