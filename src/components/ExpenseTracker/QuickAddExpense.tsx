import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type PersonalExpense,
} from "../../types/personalExpense";
import { createExpense } from "../../services/personalExpenseStorage";

interface QuickAddExpenseProps {
  onExpenseAdded: (expense: PersonalExpense) => void;
  userId: string;
}

const QuickAddExpense = ({ onExpenseAdded, userId }: QuickAddExpenseProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Focus amount input when modal opens
  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("food");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // if (!description.trim()) {
    //   toast.error("Please add a description");
    //   return;
    // }

    setIsSubmitting(true);
    try {
      const expense = await createExpense(
        {
          amount: numAmount,
          description: description.trim(),
          category,
          date: new Date(date).toISOString(),
        },
        userId
      );

      onExpenseAdded(expense);
      toast.success("Expense added!");
      resetForm();
      setIsOpen(false);
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.id === category);

  return (
    <>
      {/* Floating Add Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setIsOpen(false)}
          >
            {/* Modal Content - Slides up on mobile */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] sm:max-h-[75vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar for mobile */}
              <div className="sm:hidden flex justify-center pt-4 pb-2">
                <div className="w-14 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-2 sm:py-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">
                  Add Expense
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 -m-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                {/* Amount Input - Big and prominent */}
                <div className="text-center py-1 sm:py-1 bg-gradient-to-br rounded-2xl">
                  <label className="text-sm font-medium text-gray-500 mb-3 block uppercase tracking-wide">
                    Amount
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl sm:text-5xl font-bold text-indigo-400">
                      ₹
                    </span>
                    <input
                      ref={amountInputRef}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-5xl sm:text-6xl font-bold text-center w-48 sm:w-56 bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600 block">
                    Category*
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-3 px-1 py-1 rounded-xl text-sm font-medium transition-all ${
                          category === cat.id
                            ? "ring-2 ring-offset-2 shadow-md scale-[1.02]"
                            : "opacity-70 hover:opacity-100 hover:shadow-sm"
                        }`}
                        style={{
                          backgroundColor: cat.bgColor,
                          color: cat.color,
                          ...(category === cat.id && { ringColor: cat.color }),
                        }}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600 block">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                {/* Description */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-600 block">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you spend on?"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">
                        {selectedCategory?.emoji}
                      </span>
                      <span>Add Expense</span>
                    </>
                  )}
                </button>
              </form>

              {/* Safe area padding for iPhone */}
              <div className="h-8 sm:h-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuickAddExpense;
