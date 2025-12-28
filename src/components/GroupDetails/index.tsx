import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { db } from "../../firebase";
import type { User as FirebaseUser } from "firebase/auth";
import { logExpenseAction } from "../../utils/logger";
import {
  calculateGroupBalances,
  generateSettlements,
} from "../../utils/expenseCalculations";
import toast from "react-hot-toast";
import { DollarSign, ArrowRightLeft, FileText, Share2 } from "lucide-react";
import { LoadingSpinner, ArrowLeftIcon } from "../icons/index";
import { trackExpenseAction } from "../../config/googleAnalytics";

// Import modular components
import ExpenseForm from "./ExpenseForm";
import ExpensesList from "./ExpensesList";
import SpendingSummary from "./SpendingSummary";
import SettlementsList from "./SettlementsList";
import ActivityLog from "./ActivityLog";
import EditExpenseModal from "./EditExpenseModal";

import type { User, Group, Expense, Settlement } from "../../types";
import type { LogEntry } from "../../utils/logger";

interface GroupDetailsProps {
  users: User[];
  groups: Group[];
  currentUser: FirebaseUser | null;
}

interface ExtendedLogEntry extends LogEntry {
  id: string;
}

/**
 * GroupDetails Component
 *
 * Main component for displaying and managing group details.
 * Handles three main sections:
 * 1. Expenses - Add, edit, delete expenses
 * 2. Settlements - View balances and settle payments
 * 3. Activity - View group activity logs
 */
const GroupDetails = ({ users, groups, currentUser }: GroupDetailsProps) => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const expenseFormRef = useRef<HTMLDivElement>(null);

  // State management
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [logs, setLogs] = useState<ExtendedLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "settlements" | "logs"
  >("expenses");
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

  /**
   * Check if user has access to this group
   * Redirects to home if group not found or user doesn't have access
   */
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

  /**
   * Set up real-time listener for expenses in this group
   * Automatically updates when expenses are added/modified/deleted
   */
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

        setExpenses(expensesData);
      },
      (error) => {
        console.error("Error listening to expenses:", error);
        // Fallback: try without orderBy if index is missing
        if (error.code === "failed-precondition") {
          const simpleQuery = query(
            collection(db, "expenses"),
            where("groupId", "==", groupId)
          );
          return onSnapshot(simpleQuery, (snapshot) => {
            const expensesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Expense[];
            // Sort manually by date
            expensesData.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setExpenses(expensesData);
          });
        }
      }
    );

    return () => unsubscribe();
  }, [groupId, isLoading, group]);

  /**
   * Set up real-time listener for logs in this group
   * Automatically updates activity feed
   */
  useEffect(() => {
    if (!groupId || isLoading || !group) return;

    const logsQuery = query(
      collection(db, "logs"),
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExtendedLogEntry[];
        setLogs(logsData);
      },
      (error) => {
        console.error("Error listening to logs:", error);
        // Fallback: try without orderBy if index is missing
        if (error.code === "failed-precondition") {
          const simpleQuery = query(
            collection(db, "logs"),
            where("groupId", "==", groupId)
          );
          return onSnapshot(simpleQuery, (snapshot) => {
            const logsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as ExtendedLogEntry[];
            // Sort manually by timestamp
            logsData.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
            setLogs(logsData);
          });
        }
      }
    );

    return () => unsubscribe();
  }, [groupId, isLoading, group]);

  // Get group members (memoized to prevent infinite loops)
  const groupMembers = useMemo(() => {
    if (!group) return [];
    return users.filter((user) => group.members.includes(user.id));
  }, [group, users]);

  /**
   * Calculate pending settlements for this group
   * Determines who owes money to whom
   */
  const calculateSettlements = useCallback(() => {
    if (!group || groupMembers.length === 0) {
      setSettlements([]);
      return;
    }

    // Calculate balances for all group members
    const memberIds = groupMembers.map((user) => user.id);
    const groupBalances = calculateGroupBalances(expenses, memberIds);

    // Generate settlement suggestions based on balances
    const newSettlements = generateSettlements(
      groupBalances,
      groupMembers,
      groupId || ""
    );

    setSettlements(newSettlements);
  }, [expenses, group, groupId, groupMembers]);

  // Recalculate settlements whenever expenses change
  useEffect(() => {
    calculateSettlements();
  }, [calculateSettlements]);

  /**
   * Handle payer change - keep existing splitWith selection
   */
  const handlePayerChange = (newPayerId: string) => {
    setNewExpense({
      ...newExpense,
      paidBy: newPayerId,
      // Keep splitWith as is - payer can be included or excluded
    });
  };

  /**
   * Toggle user selection for expense splitting
   */
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

  /**
   * Select or deselect all members (including payer if they want to be included)
   */
  const toggleSelectAll = () => {
    // Check if all members are selected
    const allSelected = groupMembers.every((user) =>
      newExpense.splitWith.includes(user.id)
    );

    if (allSelected) {
      // Deselect all members
      setNewExpense({
        ...newExpense,
        splitWith: [],
      });
    } else {
      // Select all members
      const allMemberIds = groupMembers.map((user) => user.id);
      setNewExpense({
        ...newExpense,
        splitWith: allMemberIds,
      });
    }
  };

  /**
   * Add a new expense to the group
   */
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
        addedBy: currentUser?.uid || null,
      };

      const expenseRef = await addDoc(collection(db, "expenses"), expenseData);

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

      // Track expense creation
      trackExpenseAction("create", `${newExpense.description} - ₹${amount}`);
    } catch (error) {
      console.error("Error adding expense: ", error);
      toast.error("Error adding expense. Please try again.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  /**
   * Delete an expense from the group
   * Only the person who added the expense can delete it
   */
  const removeExpense = async (expenseId: string) => {
    if (isDeletingExpense === expenseId) return;

    setIsDeletingExpense(expenseId);
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      // Check if current user is the one who added this expense
      // For backward compatibility, if addedBy is not set, allow deletion (old expenses)
      if (expense.addedBy && expense.addedBy !== currentUser?.uid) {
        toast.error("You can only delete expenses that you added");
        setIsDeletingExpense(null);
        return;
      }

      await deleteDoc(doc(db, "expenses", expenseId));
      await logExpenseAction(
        "delete",
        expenseId,
        `Deleted expense: ${expense.description} - ₹${expense.amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId,
        {
          amount: expense.amount,
          description: expense.description,
          paidBy: expense.paidBy,
          paidByName: expense.paidByName,
          splitWith: expense.splitWith,
        }
      );
      toast.success("Expense removed successfully!");

      // Track expense deletion
      trackExpenseAction(
        "delete",
        `${expense.description} - ₹${expense.amount}`
      );
    } catch (error) {
      console.error("Error removing expense: ", error);
      toast.error("Error removing expense. Please try again.");
    } finally {
      setIsDeletingExpense(null);
    }
  };

  /**
   * Start editing an expense
   */
  const startEditing = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      paidBy: expense.paidBy,
      amount: expense.amount.toString(),
      description: expense.description,
      splitWith: expense.splitWith,
    });
    // No scrolling - modal will handle the UX
  };

  /**
   * Cancel editing an expense
   */
  const cancelEditing = () => {
    setEditingExpense(null);
    setNewExpense({
      paidBy: "",
      amount: "",
      description: "",
      splitWith: [],
    });
  };

  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    if (!isUpdatingExpense) {
      cancelEditing();
    }
  };

  /**
   * Update an existing expense
   */
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

      // Get old paid by user name
      users.find((user) => user.id === editingExpense.paidBy);

      await logExpenseAction(
        "update",
        editingExpense.id,
        `Updated expense: ${newExpense.description} - ₹${amount}`,
        currentUser?.uid,
        currentUser?.displayName || undefined,
        groupId,
        {
          amount: editingExpense.amount,
          description: editingExpense.description,
          paidBy: editingExpense.paidBy,
          paidByName: editingExpense.paidByName,
          splitWith: editingExpense.splitWith,
        },
        {
          amount: amount,
          description: newExpense.description,
          paidBy: newExpense.paidBy,
          paidByName: paidByUser.name,
          splitWith: newExpense.splitWith,
        }
      );

      setEditingExpense(null);
      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
      });
      toast.success("Expense updated successfully!");

      // Track expense update
      trackExpenseAction("update", `${newExpense.description} - ₹${amount}`);
    } catch (error) {
      console.error("Error updating expense: ", error);
      toast.error("Error updating expense. Please try again.");
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  /**
   * Share the group link
   * Copies the current URL to clipboard or uses Web Share API if available
   */
  const handleShare = async () => {
    const groupUrl = window.location.href;

    // Try Web Share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group?.name} on Axpo Expense`,
          text: `Check out this expense group: ${group?.name}`,
          url: groupUrl,
        });
        toast.success("Link shared successfully!");
        return;
      } catch (error: any) {
        // User cancelled or error occurred, fall back to clipboard
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(groupUrl);
      toast.success("Group link copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy link. Please try again.");
    }
  };

  /**
   * Mark a settlement as completed
   * Creates a settlement transaction in the expenses
   */
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
        addedBy: currentUser?.uid || null,
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

      // Track settlement completion
      trackExpenseAction(
        "settle",
        `${settlement.fromName} paid ₹${settlement.amount} to ${settlement.toName}`
      );
    } catch (error) {
      console.error("Error settling payment: ", error);
      toast.error("Error settling payment. Please try again.");
    } finally {
      setIsSettling(null);
    }
  };

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

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header: Back button and group info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 bg-white rounded-xl shadow-lg"
      >
        <button
          onClick={() => navigate("/")}
          className="p-1.5 sm:p-2 lg:p-3 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 truncate">
            {group.name}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">
            {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="p-2 sm:p-2.5 lg:p-3 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 group"
          title="Share group link"
        >
          <Share2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-gray-600 group-hover:text-blue-600 transition-colors" />
        </button>
      </motion.div>

      {/* Sticky Tabs Navigation */}
      <div className="sticky top-0 sm:top-4 z-10 -mx-2 sm:mx-0 mb-4 lg:mb-6">
        <div className="bg-white/95 backdrop-blur-md shadow-sm sm:shadow-none border-b sm:border-b-0 border-gray-200 sm:bg-transparent sm:backdrop-blur-none">
          <div className="px-4 py-3 sm:p-0 lg:py-1">
            <div className="flex gap-2 lg:gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`flex items-center px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-sm lg:text-base ${
                  activeTab === "expenses"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Expenses
              </button>
              <button
                onClick={() => setActiveTab("settlements")}
                className={`flex items-center px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-sm lg:text-base ${
                  activeTab === "settlements"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Settlements
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex items-center px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap text-sm lg:text-base ${
                  activeTab === "logs"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <FileText className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Activity
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Tab Content */}
      {activeTab === "expenses" && (
        <>
          <ExpenseForm
            ref={expenseFormRef}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
            groupMembers={groupMembers}
            editingExpense={null}
            onPayerChange={handlePayerChange}
            isAddingExpense={isAddingExpense}
            isUpdatingExpense={false}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onCancelEditing={cancelEditing}
            onToggleUser={toggleUserForExpense}
            onSelectAll={toggleSelectAll}
          />
          <ExpensesList
            expenses={expenses}
            users={users}
            onEdit={startEditing}
            onDelete={removeExpense}
            isDeletingExpense={isDeletingExpense}
            currentUserId={currentUser?.uid}
          />
          {/* Edit Expense Modal */}
          <EditExpenseModal
            isOpen={editingExpense !== null}
            onClose={handleModalClose}
            expense={editingExpense}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
            groupMembers={groupMembers}
            isUpdatingExpense={isUpdatingExpense}
            onUpdateExpense={updateExpense}
            onToggleUser={toggleUserForExpense}
            onSelectAll={toggleSelectAll}
            onPayerChange={handlePayerChange}
          />
        </>
      )}

      {/* Settlements Tab Content */}
      {activeTab === "settlements" && (
        <>
          <SpendingSummary expenses={expenses} groupMembers={groupMembers} />
          <SettlementsList
            settlements={settlements}
            expenses={expenses}
            isSettling={isSettling}
            onSettle={handleSettle}
          />
        </>
      )}

      {/* Activity Log Tab Content */}
      {activeTab === "logs" && <ActivityLog logs={logs} users={users} />}
    </div>
  );
};

export default GroupDetails;
