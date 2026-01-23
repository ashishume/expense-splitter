import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Calendar, Mic, MicOff, Check } from "lucide-react";
import toast from "react-hot-toast";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type PersonalExpense,
} from "../../types/personalExpense";
import { createExpense } from "../../services/personalExpenseStorage";
import { parseExpenseSpeech, type ParsedExpense } from "../../utils/speechParser";

interface QuickAddExpenseProps {
  onExpenseAdded: (expense: PersonalExpense) => void;
  userId: string;
  currentMonth?: string; // Format: "YYYY-MM" - the month being viewed
}

const QuickAddExpense = ({ onExpenseAdded, userId, currentMonth }: QuickAddExpenseProps) => {
  // Helper to get default date based on current month being viewed
  const getDefaultDate = useCallback(() => {
    if (!currentMonth) {
      return new Date().toISOString().split("T")[0];
    }
    
    const [year, month] = currentMonth.split("-").map(Number);
    const today = new Date();
    const currentMonthDate = new Date(year, month - 1, 1);
    
    // If viewing current month, default to today
    // If viewing future month, default to first day of that month
    // If viewing past month, default to first day of that month
    if (
      currentMonthDate.getFullYear() === today.getFullYear() &&
      currentMonthDate.getMonth() === today.getMonth()
    ) {
      return today.toISOString().split("T")[0];
    } else {
      return currentMonthDate.toISOString().split("T")[0];
    }
  }, [currentMonth]);

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  
  // Initialize date - use a function that calculates it
  const getInitialDate = () => {
    if (!currentMonth) {
      return new Date().toISOString().split("T")[0];
    }
    const [year, month] = currentMonth.split("-").map(Number);
    const today = new Date();
    const currentMonthDate = new Date(year, month - 1, 1);
    if (
      currentMonthDate.getFullYear() === today.getFullYear() &&
      currentMonthDate.getMonth() === today.getMonth()
    ) {
      return today.toISOString().split("T")[0];
    } else {
      return currentMonthDate.toISOString().split("T")[0];
    }
  };
  
  const [date, setDate] = useState(() => getInitialDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechPreview, setSpeechPreview] = useState<{
    transcript: string;
    parsed: ParsedExpense;
  } | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Handle speech recognition result
  const handleSpeechResult = useCallback((transcript: string) => {
    const parsed: ParsedExpense = parseExpenseSpeech(transcript);

    // Check if we got at least amount
    if (parsed.amount === null) {
      toast.error(
        `Couldn't understand the amount. Try saying something like: "Today I spent 200 rupees in groceries"`,
        { duration: 10000 }
      );
      return;
    }

    // Show preview card with parsed data
    setSpeechPreview({
      transcript,
      parsed,
    });
  }, []);

  // Focus amount input when modal opens - instant focus
  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      // Use requestAnimationFrame for instant focus
      requestAnimationFrame(() => {
        amountInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechPreview(null); // Clear previous preview
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        handleSpeechResult(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone permission denied. Please enable it in browser settings.");
        } else if (event.error === "no-speech") {
          toast.error("No speech detected. Please try again.");
        } else {
          toast.error("Speech recognition error. Please try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handleSpeechResult]);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      toast.error("Could not start speech recognition. Please try again.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("food");
    setDate(getDefaultDate());
  };

  // Update date when modal opens or currentMonth changes
  useEffect(() => {
    if (isOpen) {
      setDate(getDefaultDate());
    }
  }, [isOpen, getDefaultDate]);

  // Directly add expense from speech preview
  const handleAddFromSpeech = async () => {
    if (!speechPreview) {
      return;
    }

    const { parsed } = speechPreview;

    // Validate amount
    if (parsed.amount === null) {
      toast.error("Amount is required");
      return;
    }

    const finalCategory = parsed.category || "other";
    const finalDate = parsed.date || new Date().toISOString().split("T")[0];
    const finalDescription = parsed.description || "";

    setIsSubmitting(true);
    try {
      const expense = await createExpense(
        {
          amount: parsed.amount,
          description: finalDescription,
          category: finalCategory,
          date: new Date(finalDate).toISOString(),
        },
        userId
      );

      onExpenseAdded(expense);
      toast.success("Expense added!");
      setSpeechPreview(null);
    } catch {
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

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
  const previewCategory = speechPreview
    ? EXPENSE_CATEGORIES.find((c) => c.id === (speechPreview.parsed.category || "other"))
    : null;

  const isSpeechSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <>
      {/* Floating Action Buttons - Bottom Right and Left */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-4">
        {/* Speech Recognition Button - Bottom Left */}
        {isSpeechSupported && (
          <motion.button
            onClick={isListening ? stopListening : startListening}
            className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all ${isListening
              ? "bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse"
              : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
              }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </motion.button>
        )}

        {/* Add Expense Button - Bottom Right */}
        <motion.button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg flex items-center justify-center hover:shadow-xl active:scale-95 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </div>

      {/* Speech Preview Card */}
      <AnimatePresence>
        {speechPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-24 sm:w-96 z-50 bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-600" />
                  Voice Input
                </h3>
                <button
                  onClick={() => setSpeechPreview(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transcript */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-2">You said:</p>
                <p className="text-base text-gray-800 italic">"{speechPreview.transcript}"</p>
              </div>

              {/* Parsed Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-lg font-bold text-indigo-600">
                    ₹{speechPreview.parsed.amount}
                  </span>
                </div>

                {speechPreview.parsed.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Category:</span>
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: previewCategory?.bgColor,
                        color: previewCategory?.color,
                      }}
                    >
                      <span>{previewCategory?.emoji}</span>
                      <span>{previewCategory?.label}</span>
                    </span>
                  </div>
                )}

                {speechPreview.parsed.date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm text-gray-800">
                      {
                        new Date(speechPreview.parsed.date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        ).replace(/^\w/, (c) => c.toUpperCase())
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddFromSpeech}
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-base font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Add Expense</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && !speechPreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-6 right-6 sm:left-auto sm:right-24 sm:w-80 z-50 bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3 shadow-lg"
          >
            <div className="relative">
              <Mic className="w-6 h-6 text-red-600" />
              <motion.div
                className="absolute inset-0 bg-red-400 rounded-full -z-10"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </div>
            <div>
              <p className="font-semibold text-red-900">Listening...</p>
              <p className="text-sm text-red-700">Speak your expense details like "Today I spent 200 rupees in groceries"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[75vh] flex flex-col"
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

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
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
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${category === cat.id
                            ? "ring-2 ring-offset-2 shadow-xl scale-[1.02]"
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
                </div>

                {/* Sticky Submit Button */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 sm:px-8 py-4 pb-8 sm:pb-6">
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
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(QuickAddExpense);
