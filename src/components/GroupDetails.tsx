import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { User as FirebaseUser } from "firebase/auth";
import { logExpenseAction } from "../utils/logger";
import { formatTimestamp } from "../utils/dateUtils";
import toast from "react-hot-toast";
import {
  EditIcon,
  DeleteIcon,
  CurrencyIcon,
  LoadingSpinner,
  ArrowLeftIcon,
  ArrowsIcon,
  CheckCircleIcon,
} from "./icons/index";
import { DollarSign, ArrowRightLeft } from "lucide-react";

import type { User, Group, Expense, Settlement } from "../types";

interface GroupDetailsProps {
  users: User[];
  groups: Group[];
  currentUser: FirebaseUser | null;
}

// Expense Item Component
interface ExpenseItemProps {
  expense: Expense;
  users: User[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  isDeleting: boolean;
}

const ExpenseItem = ({
  expense,
  users,
  onEdit,
  onDelete,
  isDeleting,
}: ExpenseItemProps) => {
  const getSplitWithDisplay = () => {
    const splitUsers = expense.splitWith
      .map((userId) => users.find((u) => u.id === userId))
      .filter(Boolean);

    if (splitUsers.length <= 2) {
      return splitUsers.map((user) => user?.name || "Unknown").join(" & ");
    } else {
      return `${splitUsers[0]?.name || "Unknown"} +${
        splitUsers.length - 1
      } others`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
      }}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        expense.isSettlement
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
          : "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 shadow-sm hover:shadow-md"
      }`}
    >
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          expense.isSettlement
            ? "bg-gradient-to-b from-green-400 to-green-600"
            : "bg-gradient-to-b from-blue-400 to-blue-600"
        }`}
      />

      <div className="p-4 sm:p-5 ml-1">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 break-words leading-tight">
                {expense.description}
              </h3>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {expense.isSettlement && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full border border-green-200"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Settlement
                  </motion.span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">₹</span>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    ₹{expense.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Paid by{" "}
                    <span className="font-medium text-gray-800">
                      {expense.paidByName}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {expense.splitWith.slice(0, 3).map((userId, index) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <motion.div
                      key={userId}
                      initial={{ scale: 0, x: -10 }}
                      animate={{ scale: 1, x: 0 }}
                      transition={{
                        delay: 0.1 * index,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center"
                      title={user?.name || "Unknown"}
                    >
                      <span className="text-xs font-bold text-white">
                        {(user?.name || "U").charAt(0).toUpperCase()}
                      </span>
                    </motion.div>
                  );
                })}
                {expense.splitWith.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                      +{expense.splitWith.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Split with{" "}
                <span className="font-medium">{getSplitWithDisplay()}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <p className="text-xs text-gray-500 font-medium">
                {formatTimestamp(expense.date)}
              </p>
            </div>
          </div>

          {!expense.isSettlement && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 flex-shrink-0"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit(expense)}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-200 border border-blue-200"
                title="Edit expense"
              >
                <EditIcon />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete(expense.id)}
                disabled={isDeleting}
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove expense"
              >
                {isDeleting ? (
                  <LoadingSpinner className="w-4 h-4" />
                ) : (
                  <DeleteIcon />
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const GroupDetails = ({ users, groups, currentUser }: GroupDetailsProps) => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "settlements">(
    "expenses"
  );
  const [newExpense, setNewExpense] = useState({
    paidBy: "",
    amount: "",
    description: "",
    splitWith: [] as string[],
  });

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(
    null
  );
  const [isSettling, setIsSettling] = useState<string | null>(null);

  // Find the current group
  const group = groups.find((g) => g.id === groupId);

  // Check if user has access to this group
  useEffect(() => {
    // Wait for groups to load before checking access
    if (groups.length === 0) {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (!group) {
      toast.error("Group not found");
      navigate("/");
      return;
    }

    if (!group.members.includes(currentUser?.uid || "")) {
      toast.error("You don't have access to this group");
      navigate("/");
      return;
    }
  }, [group, currentUser, navigate, groups.length]);

  // Set up real-time listener for expenses in this group
  useEffect(() => {
    if (!groupId || isLoading || !group) return;

    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];
        console.log(
          `Loaded ${expensesData.length} expenses for group ${groupId}`
        );
        setExpenses(expensesData);
      },
      (error) => {
        console.error("Error listening to expenses:", error);
        // If there's an index error, try without orderBy
        if (error.code === "failed-precondition") {
          console.log("Retrying without orderBy due to missing index");
          const simpleQuery = query(
            collection(db, "expenses"),
            where("groupId", "==", groupId)
          );
          return onSnapshot(simpleQuery, (snapshot) => {
            const expensesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Expense[];
            // Sort manually
            expensesData.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            console.log(`Loaded ${expensesData.length} expenses (manual sort)`);
            setExpenses(expensesData);
          });
        }
      }
    );

    return () => unsubscribe();
  }, [groupId, isLoading, group]);

  // Get group members - memoized to prevent infinite loops in useCallback dependencies
  const groupMembers = useMemo(() => {
    if (!group) return [];
    return users.filter((user) => group.members.includes(user.id));
  }, [group, users]);

  // Calculate settlements for this group - MUST be before early return (Rules of Hooks)
  const calculateSettlements = useCallback(() => {
    if (!group || groupMembers.length === 0) {
      setSettlements([]);
      return;
    }

    const groupBalances: Record<string, number> = {};
    const roundTo2Decimals = (num: number) => Math.round(num * 100) / 100;

    // Initialize balances
    groupMembers.forEach((user) => {
      groupBalances[user.id] = 0;
    });

    // Calculate balances
    expenses.forEach((expense) => {
      if (expense.isSettlement) {
        if (groupBalances[expense.paidBy] !== undefined) {
          groupBalances[expense.paidBy] += expense.amount;
        }
        if (
          expense.splitWith.length === 1 &&
          groupBalances[expense.splitWith[0]] !== undefined
        ) {
          groupBalances[expense.splitWith[0]] -= expense.amount;
        }
      } else {
        const paidBy = expense.paidBy;
        const totalAmount = expense.amount;
        const splitWith = expense.splitWith;
        const amountPerPerson = totalAmount / (splitWith.length + 1);

        if (groupBalances[paidBy] !== undefined) {
          groupBalances[paidBy] += totalAmount;
        }

        splitWith.forEach((userId) => {
          if (groupBalances[userId] !== undefined) {
            groupBalances[userId] -= amountPerPerson;
          }
        });
        if (groupBalances[paidBy] !== undefined) {
          groupBalances[paidBy] -= amountPerPerson;
        }
      }
    });

    // Create settlements
    const newSettlements: Settlement[] = [];
    const creditors = groupMembers.filter(
      (user) => groupBalances[user.id] > 0.01
    );
    const debtors = groupMembers.filter(
      (user) => groupBalances[user.id] < -0.01
    );

    debtors.forEach((debtor) => {
      creditors.forEach((creditor) => {
        if (
          groupBalances[creditor.id] > 0.01 &&
          groupBalances[debtor.id] < -0.01
        ) {
          const amountToSettle = Math.min(
            Math.abs(groupBalances[debtor.id]),
            groupBalances[creditor.id]
          );

          if (amountToSettle > 0.01) {
            newSettlements.push({
              id: `${debtor.id}-${creditor.id}-${groupId}-${Date.now()}`,
              from: debtor.id,
              fromName: debtor.name,
              to: creditor.id,
              toName: creditor.name,
              amount: roundTo2Decimals(amountToSettle),
              groupId: groupId,
              date: new Date().toISOString(),
            });

            groupBalances[debtor.id] += amountToSettle;
            groupBalances[creditor.id] -= amountToSettle;
          }
        }
      });
    });

    setSettlements(newSettlements);
  }, [expenses, group, groupId, groupMembers]);

  useEffect(() => {
    calculateSettlements();
  }, [calculateSettlements]);

  // Show loading state while groups are being fetched
  if (isLoading || !group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  const toggleUserForExpense = (userId: string) => {
    const currentSelection = [...newExpense.splitWith];
    const index = currentSelection.indexOf(userId);

    if (index > -1) {
      currentSelection.splice(index, 1);
    } else {
      currentSelection.push(userId);
    }

    setNewExpense({
      ...newExpense,
      splitWith: currentSelection,
    });
  };

  const addExpense = async () => {
    if (
      !newExpense.paidBy ||
      !newExpense.amount ||
      !newExpense.description ||
      newExpense.splitWith.length === 0
    ) {
      toast.error(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isAddingExpense) return;

    setIsAddingExpense(true);
    try {
      const paidByUser = users.find((user) => user.id === newExpense.paidBy);
      if (!paidByUser) {
        throw new Error("Payer not found");
      }

      const expenseData = {
        paidBy: newExpense.paidBy,
        paidByName: paidByUser.name,
        amount: amount,
        description: newExpense.description,
        splitWith: newExpense.splitWith,
        date: new Date().toISOString(),
        groupId: groupId,
      };

      console.log("Adding expense with data:", expenseData);
      const expenseRef = await addDoc(collection(db, "expenses"), expenseData);
      console.log("Expense added with ID:", expenseRef.id);

      await logExpenseAction(
        "create",
        expenseRef.id,
        `Created expense: ${newExpense.description} - ₹${amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId
      );

      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
      });
      toast.success("Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense: ", error);
      toast.error("Error adding expense. Please try again.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (isDeletingExpense === expenseId) return;

    setIsDeletingExpense(expenseId);
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      await deleteDoc(doc(db, "expenses", expenseId));
      await logExpenseAction(
        "delete",
        expenseId,
        `Deleted expense: ${expense.description} - ₹${expense.amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId
      );
      toast.success("Expense removed successfully!");
    } catch (error) {
      console.error("Error removing expense: ", error);
      toast.error("Error removing expense. Please try again.");
    } finally {
      setIsDeletingExpense(null);
    }
  };

  const startEditing = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      paidBy: expense.paidBy,
      amount: expense.amount.toString(),
      description: expense.description,
      splitWith: expense.splitWith,
    });
  };

  const cancelEditing = () => {
    setEditingExpense(null);
    setNewExpense({
      paidBy: "",
      amount: "",
      description: "",
      splitWith: [],
    });
  };

  const updateExpense = async () => {
    if (!editingExpense) return;

    if (
      !newExpense.paidBy ||
      !newExpense.amount ||
      !newExpense.description ||
      newExpense.splitWith.length === 0
    ) {
      toast.error(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isUpdatingExpense) return;

    setIsUpdatingExpense(true);
    try {
      const paidByUser = users.find((user) => user.id === newExpense.paidBy);
      if (!paidByUser) {
        throw new Error("Payer not found");
      }

      const expenseRef = doc(db, "expenses", editingExpense.id);
      await updateDoc(expenseRef, {
        paidBy: newExpense.paidBy,
        paidByName: paidByUser.name,
        amount: amount,
        description: newExpense.description,
        splitWith: newExpense.splitWith,
        groupId: groupId,
      });

      await logExpenseAction(
        "update",
        editingExpense.id,
        `Updated expense: ${newExpense.description} - ₹${amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId
      );

      setEditingExpense(null);
      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
      });
      toast.success("Expense updated successfully!");
    } catch (error) {
      console.error("Error updating expense: ", error);
      toast.error("Error updating expense. Please try again.");
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleSettle = async (settlement: Settlement) => {
    if (isSettling === settlement.id) return;

    setIsSettling(settlement.id);
    try {
      const settlementExpense = {
        paidBy: settlement.from,
        paidByName: settlement.fromName,
        amount: settlement.amount,
        description: `Settlement: ${settlement.fromName} paid ${settlement.toName}`,
        splitWith: [settlement.to],
        date: new Date().toISOString(),
        groupId: groupId,
        isSettlement: true,
      };

      const expenseRef = await addDoc(
        collection(db, "expenses"),
        settlementExpense
      );

      await logExpenseAction(
        "create",
        expenseRef.id,
        `Settled payment: ${settlement.fromName} paid ₹${settlement.amount} to ${settlement.toName}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId
      );

      toast.success(
        `Settlement completed! ${settlement.fromName} has paid ₹${settlement.amount} to ${settlement.toName}`
      );
    } catch (error) {
      console.error("Error settling payment: ", error);
      toast.error("Error settling payment. Please try again.");
    } finally {
      setIsSettling(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button and group info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-xl shadow-lg"
      >
        <button
          onClick={() => navigate("/")}
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 truncate">
            {group.name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </motion.div>

      {/* Tabs - Sticky */}
      <div className="sticky top-4 z-10 bg-gray-50 backdrop-blur-sm bg-opacity-95 py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "expenses"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("settlements")}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "settlements"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Settlements
          </button>
        </div>
      </div>

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <>
          {/* Add Expense Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
              <CurrencyIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600" />
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid By
                </label>
                <select
                  value={newExpense.paidBy}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, paidBy: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
                >
                  <option value="">Select a member</option>
                  {groupMembers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.email ? ` (${user.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, amount: e.target.value })
                    }
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 safari-form-fix"
                  placeholder="Description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split with
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {groupMembers.map((user) => {
                    const isPayer = user.id === newExpense.paidBy;
                    const isSelected = newExpense.splitWith.includes(user.id);
                    const isDisabled = isPayer;

                    return (
                      <div
                        key={user.id}
                        onClick={() =>
                          !isDisabled && toggleUserForExpense(user.id)
                        }
                        className={`flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          isDisabled
                            ? "bg-gray-100 cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-green-50 border border-green-200 hover:bg-green-100"
                            : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`split-${user.id}`}
                          checked={isSelected}
                          onChange={() =>
                            !isDisabled && toggleUserForExpense(user.id)
                          }
                          disabled={isDisabled}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                        />
                        <div className="ml-2 text-sm sm:text-base text-gray-700 flex-1">
                          <div className="flex flex-col">
                            <span
                              className={`font-medium ${
                                isSelected ? "text-green-800" : "text-gray-800"
                              }`}
                            >
                              {user.name}
                            </span>
                            {user.email && (
                              <span className="text-xs text-gray-500">
                                {user.email}
                              </span>
                            )}
                          </div>
                          {isPayer && (
                            <span className="text-green-600 text-xs sm:text-sm font-medium">
                              (Payer)
                            </span>
                          )}
                        </div>
                        {isSelected && !isDisabled && (
                          <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {editingExpense ? (
                  <>
                    <button
                      onClick={updateExpense}
                      disabled={isUpdatingExpense}
                      className="btn btn-purple flex-1 text-sm sm:text-base"
                    >
                      {isUpdatingExpense ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Updating...</span>
                          <span className="sm:hidden">Update...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">
                            Update Expense
                          </span>
                          <span className="sm:hidden">Update</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="btn btn-secondary px-4 py-3 text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={addExpense}
                    disabled={isAddingExpense}
                    className="btn btn-rose w-full text-sm sm:text-base"
                  >
                    {isAddingExpense ? (
                      <>
                        <LoadingSpinner className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Adding...</span>
                        <span className="sm:hidden">Add...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Add Expense</span>
                        <span className="sm:hidden">Add</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Expenses List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 bg-white rounded-xl shadow-lg"
          >
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Expenses ({expenses.length})
            </h3>
            {expenses.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8">
                No expenses yet. Add your first expense above!
              </p>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    users={users}
                    onEdit={startEditing}
                    onDelete={removeExpense}
                    isDeleting={isDeletingExpense === expense.id}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Settlements Tab */}
      {activeTab === "settlements" && (
        <>
          {/* Group Spending Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg mb-4 border border-indigo-100"
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <CurrencyIcon className="w-5 h-5 mr-2 text-indigo-600" />
              Group Spending Summary
            </h3>

            {(() => {
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
                  const amountPerPerson =
                    expense.amount / (expense.splitWith.length + 1);
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

              const totalExpenses = expenses.filter(
                (e) => !e.isSettlement
              ).length;
              const avgPerExpense =
                totalExpenses > 0 ? totalSpend / totalExpenses : 0;

              return (
                <div className="space-y-4">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Total Group Spend
                      </p>
                      <p className="text-2xl font-bold text-indigo-600">
                        ₹{totalSpend.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Total Expenses
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {totalExpenses}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-pink-100">
                      <p className="text-sm text-gray-600 mb-1">
                        Avg per Expense
                      </p>
                      <p className="text-2xl font-bold text-pink-600">
                        ₹{avgPerExpense.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  {/* Per Person Breakdown */}
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Member Balances
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupMembers.map((member) => {
                        const balance = balances[member.id] || 0;
                        const isPositive = balance > 0.01;
                        const isNegative = balance < -0.01;
                        const isSettled = !isPositive && !isNegative;

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
                                  {isSettled
                                    ? "₹0"
                                    : `₹${Math.abs(balance).toFixed(2)}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Settlements List */}
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

            {settlements.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  All Settled Up!
                </p>
                <p className="text-gray-500">
                  No pending settlements in this group.
                </p>
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

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSettle(settlement)}
                          disabled={isSettling === settlement.id}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                        >
                          {isSettling === settlement.id ? (
                            <>
                              <LoadingSpinner className="w-4 h-4" />
                              <span className="hidden sm:inline">
                                Settling...
                              </span>
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

            {/* Settled Transactions */}
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
        </>
      )}
    </div>
  );
};

export default GroupDetails;
