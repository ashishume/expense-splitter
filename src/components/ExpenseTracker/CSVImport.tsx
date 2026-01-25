import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader } from "lucide-react";
import toast from "react-hot-toast";
import type { PersonalExpense } from "../../types/personalExpense";
import { useBatchCreateExpenses } from "../../hooks/useExpenseMutations";
import { parseCSV, csvExpensesToPersonalExpenses, type CSVParseResult } from "../../utils/csvParser";

interface CSVImportProps {
  userId: string;
  onExpensesImported: (expenses: PersonalExpense[]) => void;
}

const CSVImport = ({ userId, onExpensesImported }: CSVImportProps) => {
  const batchCreateMutation = useBatchCreateExpenses();
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".csv") && !file.type.includes("csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }

      // Parse CSV
      const result = parseCSV(text);
      setParseResult(result);

      if (result.errors.length > 0 && result.expenses.length === 0) {
        // Only errors, no valid expenses
        toast.error(`CSV parsing failed. Please check the file format.`);
        return;
      }

      if (result.expenses.length === 0) {
        toast.error("No valid expenses found in CSV file");
        return;
      }

      // Show preview with errors if any
      if (result.errors.length > 0) {
        toast.error(
          `Found ${result.errors.length} error(s) in CSV. ${result.expenses.length} valid expense(s) will be imported.`,
          { duration: 5000 }
        );
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.expenses.length === 0) {
      return;
    }

    setIsImporting(true);
    try {
      // Convert CSV expenses to PersonalExpense format
      const expensesToImport = csvExpensesToPersonalExpenses(parseResult.expenses);

      // Batch create expenses using mutation hook
      const createdExpenses = await batchCreateMutation.mutateAsync({
        expenses: expensesToImport,
        userId,
      }) as PersonalExpense[];

      toast.success(
        `Successfully imported ${createdExpenses.length} expense(s)!`,
        { duration: 3000 }
      );

      // Notify parent component
      onExpensesImported(createdExpenses);

      // Reset and close
      setParseResult(null);
      setIsOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error importing expenses:", error);
      toast.error(
        `Failed to import expenses: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setParseResult(null);
      setIsOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    // Trigger file input click
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const totalExpenses = parseResult?.expenses.length || 0;
  const totalErrors = parseResult?.errors.length || 0;

  return (
    <>
      {/* Import Button */}
      <button
        onClick={handleOpen}
        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="Import expenses from CSV"
      >
        <Upload className="w-5 h-5" />
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Import Expenses from CSV
                    </h2>
                    <p className="text-sm text-gray-500">
                      Upload a CSV file with your expense data
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isImporting}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    CSV Format Requirements
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>
                      Required columns: <strong>amount</strong>, <strong>description</strong>,{" "}
                      <strong>category</strong>, <strong>date</strong>
                    </li>
                    <li>
                      Date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, or DD-MM-YYYY
                    </li>
                    <li>
                      Valid categories: food, transport, shopping, entertainment, groceries,
                      travel, subscriptions, fuel, electronics, other
                    </li>
                    <li>First row should contain column headers</li>
                  </ul>
                </div>

                {/* File Input Area */}
                {!parseResult && (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Click to select a CSV file or drag and drop
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Select CSV File
                    </button>
                  </div>
                )}

                {/* Parse Results */}
                {parseResult && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">
                            Valid Expenses
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          {totalExpenses}
                        </p>
                      </div>
                      {totalErrors > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="font-semibold text-red-900">Errors</span>
                          </div>
                          <p className="text-2xl font-bold text-red-700">
                            {totalErrors}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Preview of Valid Expenses */}
                    {totalExpenses > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">
                          Preview (first 5 expenses)
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {parseResult.expenses.slice(0, 5).map((exp, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {exp.description}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {exp.category} •{" "}
                                  {new Date(exp.date).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="font-bold text-indigo-600">
                                ₹{exp.amount.toFixed(2)}
                              </p>
                            </div>
                          ))}
                          {totalExpenses > 5 && (
                            <p className="text-sm text-gray-500 text-center">
                              ... and {totalExpenses - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Details */}
                    {totalErrors > 0 && (
                      <div>
                        <h3 className="font-semibold text-red-800 mb-3">
                          Errors (first 10)
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {parseResult.errors.slice(0, 10).map((error, idx) => (
                            <div
                              key={idx}
                              className="bg-red-50 border border-red-200 rounded-lg p-3"
                            >
                              <p className="text-sm font-medium text-red-900">
                                Row {error.row}: {error.message}
                              </p>
                            </div>
                          ))}
                          {totalErrors > 10 && (
                            <p className="text-sm text-gray-500 text-center">
                              ... and {totalErrors - 10} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={isImporting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                {parseResult && totalExpenses > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Import {totalExpenses} Expense(s)</span>
                      </>
                    )}
                  </button>
                )}
                {!parseResult && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Select File
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CSVImport;
