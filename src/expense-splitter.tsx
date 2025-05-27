import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import Users from "./components/Users";
import Groups from "./components/Groups";
import Expenses from "./components/Expenses";
import Settlements from "./components/Settlements";

interface User {
  id: string;
  name: string;
  groups?: string[];
}

interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface Expense {
  id: string;
  paidBy: string;
  paidByName: string;
  amount: number;
  description: string;
  splitWith: string[];
  date: string;
  groupId?: string;
}

interface Settlement {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

const ExpenseSplittingApp = () => {
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

  // Calculate settlements
  const calculateSettlements = (currentExpenses: Expense[]) => {
    const balances: Record<string, number> = {};
    users.forEach((user) => {
      balances[user.id] = 0;
    });

    currentExpenses.forEach((expense) => {
      const paidBy = expense.paidBy;
      const totalAmount = expense.amount;
      const splitWith = expense.splitWith;
      const amountPerPerson = totalAmount / (splitWith.length + 1);

      balances[paidBy] += totalAmount;

      splitWith.forEach((userId) => {
        balances[userId] -= amountPerPerson;
      });

      balances[paidBy] -= amountPerPerson;
    });

    const newSettlements: Settlement[] = [];
    const roundTo2Decimals = (num: number) => Math.round(num * 100) / 100;

    users.forEach((debtor) => {
      if (balances[debtor.id] < -0.01) {
        users.forEach((creditor) => {
          if (balances[creditor.id] > 0.01 && balances[debtor.id] < -0.01) {
            const amountToSettle = Math.min(
              Math.abs(balances[debtor.id]),
              balances[creditor.id]
            );

            if (amountToSettle > 0.01) {
              newSettlements.push({
                id: `${debtor.id}-${creditor.id}-${Date.now()}`,
                from: debtor.id,
                fromName: debtor.name,
                to: creditor.id,
                toName: creditor.name,
                amount: roundTo2Decimals(amountToSettle),
              });

              balances[debtor.id] += amountToSettle;
              balances[creditor.id] -= amountToSettle;
            }
          }
        });
      }
    });

    setSettlements(newSettlements);
    return balances;
  };

  // Calculate individual balances for display
  const calculateIndividualBalances = (currentExpenses: Expense[]) => {
    const balances: Record<string, number> = {};
    users.forEach((user) => {
      balances[user.id] = 0;
    });

    currentExpenses.forEach((expense) => {
      const paidBy = expense.paidBy;
      const totalAmount = expense.amount;
      const splitWith = expense.splitWith;
      const amountPerPerson = totalAmount / (splitWith.length + 1);

      balances[paidBy] += totalAmount;

      splitWith.forEach((userId) => {
        balances[userId] -= amountPerPerson;
      });

      balances[paidBy] -= amountPerPerson;
    });

    return balances;
  };

  useEffect(() => {
    calculateSettlements(expenses);
  }, [expenses, users]);

  const individualBalances = calculateIndividualBalances(expenses);

  const tabs = [
    { id: "expenses", label: "Expenses", icon: "💰" },
    { id: "settlements", label: "Settlements", icon: "💸" },
    { id: "groups", label: "Groups", icon: "👥" },
    { id: "users", label: "Users", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 max-w-6xl mx-auto">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
      >
        SplitEase
      </motion.h1>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "expenses" && (
          <Expenses
            users={users}
            groups={groups}
            expenses={expenses}
            onExpenseUpdate={() => {}}
          />
        )}

        {activeTab === "settlements" && (
          <Settlements settlements={settlements} />
        )}

        {activeTab === "groups" && (
          <Groups users={users} groups={groups} onGroupUpdate={() => {}} />
        )}

        {activeTab === "users" && (
          <Users
            users={users}
            individualBalances={individualBalances}
            onUserUpdate={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default ExpenseSplittingApp;
