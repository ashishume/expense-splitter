import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./components/AuthContext";
import Groups from "./components/Groups";
import Expenses from "./components/Expenses";
import Settlements from "./components/Settlements";
import Logs from "./components/Logs";
import logo from "./assets/logo.jpg";
import { logExpenseAction } from "./utils/logger";
import toast from "react-hot-toast";
import {
  DollarSign,
  ArrowRightLeft,
  Users,
  FileText,
  LogOut,
} from "lucide-react";

import type { User, Group, Expense, Settlement } from "./types";

const ExpenseSplittingApp = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activeTab, setActiveTab] = useState("expenses");

  // Set up real-time listeners for users, groups, and expenses
  useEffect(() => {
    // Listen for users collection changes
    const usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(usersData);
    });

    // Listen for groups collection changes
    const groupsUnsubscribe = onSnapshot(
      collection(db, "groups"),
      (snapshot) => {
        const groupsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Group[];
        setGroups(groupsData);
      }
    );

    // Listen for expenses collection changes
    const expensesQuery = query(
      collection(db, "expenses"),
      orderBy("date", "desc")
    );
    const expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];
      setExpenses(expensesData);
    });

    // Cleanup listeners on component unmount
    return () => {
      usersUnsubscribe();
      groupsUnsubscribe();
      expensesUnsubscribe();
    };
  }, []);

  // Fixed calculateSettlements function for ExpenseSplittingApp.tsx
  const calculateSettlements = useCallback(
    (currentExpenses: Expense[]) => {
      const newSettlements: Settlement[] = [];
      const roundTo2Decimals = (num: number) => Math.round(num * 100) / 100;

      // Group expenses by groupId to calculate group-specific settlements
      const expensesByGroup = currentExpenses.reduce((acc, expense) => {
        const groupId = expense.groupId || "ungrouped";
        if (!acc[groupId]) {
          acc[groupId] = [];
        }
        acc[groupId].push(expense);
        return acc;
      }, {} as Record<string, Expense[]>);

      // Calculate settlements for each group
      Object.entries(expensesByGroup).forEach(([groupId, groupExpenses]) => {
        if (groupExpenses.length === 0) return;

        const groupBalances: Record<string, number> = {};

        // Initialize balances for users who are involved in this group's expenses
        const involvedUsers = new Set<string>();
        groupExpenses.forEach((expense) => {
          involvedUsers.add(expense.paidBy);
          expense.splitWith.forEach((userId) => involvedUsers.add(userId));
        });

        involvedUsers.forEach((userId) => {
          groupBalances[userId] = 0;
        });

        // Calculate balances for this group only
        groupExpenses.forEach((expense) => {
          if (expense.isSettlement) {
            // This is a settlement transaction - it represents money actually transferred
            // The person who "paid" (from) is reducing their debt
            // The person in splitWith (to) is reducing what they're owed
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
            // This is a regular shared expense
            const paidBy = expense.paidBy;
            const totalAmount = expense.amount;
            const splitWith = expense.splitWith;
            const amountPerPerson = totalAmount / (splitWith.length + 1);

            // The person who paid gets credited the full amount
            if (groupBalances[paidBy] !== undefined) {
              groupBalances[paidBy] += totalAmount;
            }

            // Everyone (including the payer) owes their share
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

        // Create settlements only for balances that are significant (> 0.01)
        // and only between users who actually have outstanding balances
        const creditors = Array.from(involvedUsers).filter(
          (userId) => groupBalances[userId] > 0.01
        );
        const debtors = Array.from(involvedUsers).filter(
          (userId) => groupBalances[userId] < -0.01
        );

        // Match debtors with creditors to minimize number of transactions
        debtors.forEach((debtorId) => {
          creditors.forEach((creditorId) => {
            if (
              groupBalances[creditorId] > 0.01 &&
              groupBalances[debtorId] < -0.01
            ) {
              const amountToSettle = Math.min(
                Math.abs(groupBalances[debtorId]),
                groupBalances[creditorId]
              );

              if (amountToSettle > 0.01) {
                const debtor = users.find((u) => u.id === debtorId);
                const creditor = users.find((u) => u.id === creditorId);

                if (debtor && creditor) {
                  newSettlements.push({
                    id: `${debtorId}-${creditorId}-${groupId}-${Date.now()}`,
                    from: debtorId,
                    fromName: debtor.name,
                    to: creditorId,
                    toName: creditor.name,
                    amount: roundTo2Decimals(amountToSettle),
                    groupId: groupId === "ungrouped" ? undefined : groupId,
                    date: new Date().toISOString(),
                  });

                  // Update balances to reflect this settlement
                  groupBalances[debtorId] += amountToSettle;
                  groupBalances[creditorId] -= amountToSettle;
                }
              }
            }
          });
        });
      });

      setSettlements(newSettlements);
    },
    [users]
  );

  // Calculate individual balances for display
  const calculateIndividualBalances = (currentExpenses: Expense[]) => {
    const balances: Record<string, number> = {};
    users.forEach((user) => {
      balances[user.id] = 0;
    });

    currentExpenses.forEach((expense) => {
      if (expense.isSettlement) {
        // This is a direct transfer.
        // The payer's balance increases (debt is reduced).
        if (balances[expense.paidBy] !== undefined) {
          balances[expense.paidBy] += expense.amount;
        }
        // The recipient's balance decreases (credit is reduced).
        if (
          expense.splitWith.length === 1 &&
          balances[expense.splitWith[0]] !== undefined
        ) {
          balances[expense.splitWith[0]] -= expense.amount;
        }
      } else {
        // This is a regular shared expense.
        const paidBy = expense.paidBy;
        const totalAmount = expense.amount;
        const splitWith = expense.splitWith;
        const amountPerPerson = totalAmount / (splitWith.length + 1);

        // The person who paid gets credited the full amount
        if (balances[paidBy] !== undefined) {
          balances[paidBy] += totalAmount;
        }

        // Everyone (including the payer) owes their share
        splitWith.forEach((userId) => {
          if (balances[userId] !== undefined) {
            balances[userId] -= amountPerPerson;
          }
        });
        if (balances[paidBy] !== undefined) {
          balances[paidBy] -= amountPerPerson;
        }
      }
    });

    return balances;
  };

  useEffect(() => {
    calculateSettlements(expenses);
  }, [expenses, calculateSettlements]);

  const individualBalances = calculateIndividualBalances(expenses);
  // Also update the handleSettle function to be more explicit
  const handleSettle = async (settlement: Settlement) => {
    try {
      // Create a settlement transaction that represents actual money transfer
      const settlementExpense = {
        paidBy: settlement.from, // The debtor is "paying"
        paidByName: settlement.fromName,
        amount: settlement.amount,
        description: `Settlement: ${settlement.fromName} paid ${settlement.toName}`,
        splitWith: [settlement.to], // The creditor receives the payment
        date: new Date().toISOString(),
        groupId: settlement.groupId || null,
        isSettlement: true, // Mark as settlement transaction
      };

      // Add the settlement transaction to Firestore
      const expenseRef = await addDoc(
        collection(db, "expenses"),
        settlementExpense
      );

      // Log the settlement action
      await logExpenseAction(
        "create",
        expenseRef.id,
        `Settled payment: ${settlement.fromName} paid ₹${settlement.amount} to ${settlement.toName}`,
        user?.uid,
        user?.displayName || undefined,
        settlement.groupId || undefined
      );

      toast.success(
        `Settlement completed! ${settlement.fromName} has paid ₹${settlement.amount} to ${settlement.toName}`
      );

      // The UI will automatically update when the new expense triggers the real-time listener
    } catch (error) {
      console.error("Error settling payment: ", error);
      toast.error("Error settling payment. Please try again.");
    }
  };

  // Handle deleting a settlement transaction
  const handleDeleteSettlement = async (settlement: Settlement) => {
    try {
      // Find the settlement expense in the expenses array
      const settlementExpense = expenses.find(
        (expense) =>
          expense.isSettlement &&
          expense.paidBy === settlement.from &&
          expense.splitWith.includes(settlement.to) &&
          expense.amount === settlement.amount &&
          expense.groupId === settlement.groupId
      );

      if (!settlementExpense) {
        toast.error(
          "Settlement transaction not found. It may have already been deleted."
        );
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete the settlement between ${settlement.fromName} and ${settlement.toName} for ₹${settlement.amount}?`
      );

      if (!confirmed) return;

      // Delete the settlement expense from Firestore
      await deleteDoc(doc(db, "expenses", settlementExpense.id));

      // Log the deletion action
      await logExpenseAction(
        "delete",
        settlementExpense.id,
        `Deleted settlement: ${settlement.fromName} to ${settlement.toName} for ₹${settlement.amount}`,
        user?.uid,
        user?.displayName || undefined,
        settlement.groupId || undefined
      );

      toast.success("Settlement deleted successfully!");
    } catch (error) {
      console.error("Error deleting settlement: ", error);
      toast.error("Error deleting settlement. Please try again.");
    }
  };

  // Handle resetting all settlements
  const handleResetAllSettlements = async () => {
    try {
      // Find all settlement expenses
      const settlementExpenses = expenses.filter(
        (expense) => expense.isSettlement
      );

      if (settlementExpenses.length === 0) {
        toast.error("No settlements to reset.");
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete all ${settlementExpenses.length} settlement transactions? This action cannot be undone.`
      );

      if (!confirmed) return;

      // Delete all settlement expenses
      const deletePromises = settlementExpenses.map(async (expense) => {
        await deleteDoc(doc(db, "expenses", expense.id));
        return expense;
      });

      await Promise.all(deletePromises);

      // Log the bulk deletion action
      await logExpenseAction(
        "delete",
        "bulk",
        `Reset all settlements: deleted ${settlementExpenses.length} settlement transactions`,
        user?.uid,
        user?.displayName || undefined,
        undefined // No specific group for bulk operations
      );

      toast.success(
        `Successfully reset all ${settlementExpenses.length} settlements!`
      );
    } catch (error) {
      console.error("Error resetting settlements: ", error);
      toast.error("Error resetting settlements. Please try again.");
    }
  };

  // Handle deleting a settled transaction
  const handleDeleteSettledTransaction = async (expense: Expense) => {
    try {
      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete the settled transaction: ${expense.description} for ₹${expense.amount}?`
      );

      if (!confirmed) return;

      // Delete the settled transaction from Firestore
      await deleteDoc(doc(db, "expenses", expense.id));

      // Log the deletion action
      await logExpenseAction(
        "delete",
        expense.id,
        `Deleted settled transaction: ${expense.description} for ₹${expense.amount}`,
        user?.uid,
        user?.displayName || undefined,
        expense.groupId || undefined
      );

      toast.success("Settled transaction deleted successfully!");
    } catch (error) {
      console.error("Error deleting settled transaction: ", error);
      toast.error("Error deleting settled transaction. Please try again.");
    }
  };

  // Handle resetting all settled transactions
  const handleResetAllSettledTransactions = async () => {
    try {
      // Find all settlement expenses
      const settlementExpenses = expenses.filter(
        (expense) => expense.isSettlement
      );

      if (settlementExpenses.length === 0) {
        toast.error("No settled transactions to delete.");
        return;
      }

      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete all ${settlementExpenses.length} settled transactions? This action cannot be undone.`
      );

      if (!confirmed) return;

      // Delete all settlement expenses
      const deletePromises = settlementExpenses.map(async (expense) => {
        await deleteDoc(doc(db, "expenses", expense.id));
        return expense;
      });

      await Promise.all(deletePromises);

      // Log the bulk deletion action
      await logExpenseAction(
        "delete",
        "bulk",
        `Deleted all settled transactions: ${settlementExpenses.length} transactions`,
        user?.uid,
        user?.displayName || undefined,
        undefined // No specific group for bulk operations
      );

      toast.success(
        `Successfully deleted all ${settlementExpenses.length} settled transactions!`
      );
    } catch (error) {
      console.error("Error deleting settled transactions: ", error);
      toast.error("Error deleting settled transactions. Please try again.");
    }
  };

  const tabs = [
    { id: "expenses", label: "Expenses", icon: DollarSign },
    { id: "settlements", label: "Settlements", icon: ArrowRightLeft },
    { id: "groups", label: "Groups", icon: Users },
    { id: "logs", label: "Activity", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 flex items-center"
        >
          <img
            src={logo}
            alt="Axpo splitter"
            className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white rounded-full brightness-110 contrast-125 saturate-150 transition-all duration-300"
          />
        </motion.h1>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="text-center sm:text-left">
            <div className="text-sm sm:text-base text-gray-700 font-medium truncate max-w-[200px] sm:max-w-none">
              {user?.displayName}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 sm:space-x-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:bg-white/50"
              }`}
            >
              <IconComponent className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "expenses" && (
          <Expenses
            users={users}
            groups={groups}
            expenses={expenses}
            onExpenseUpdate={() => {}}
            currentUser={user}
          />
        )}

        {activeTab === "settlements" && (
          <Settlements
            settlements={settlements}
            groups={groups}
            expenses={expenses}
            users={users}
            onSettle={handleSettle}
            onDeleteSettlement={handleDeleteSettlement}
            onDeleteSettledTransaction={handleDeleteSettledTransaction}
            onResetAllSettlements={handleResetAllSettlements}
            onResetAllSettledTransactions={handleResetAllSettledTransactions}
            individualBalances={individualBalances}
            currentUser={user}
          />
        )}

        {activeTab === "groups" && (
          <Groups
            users={users}
            groups={groups}
            onGroupUpdate={() => {}}
            currentUser={user}
          />
        )}

        {activeTab === "logs" && <Logs currentUser={user} groups={groups} />}
      </div>
    </div>
  );
};

export default ExpenseSplittingApp;
