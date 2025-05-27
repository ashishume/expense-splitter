import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTNI0AHWWh5Q6Vx-mkdSMb7K2Ua7VDNpA",
  authDomain: "cycle-demo-client.firebaseapp.com",
  projectId: "cycle-demo-client",
  storageBucket: "cycle-demo-client.firebasestorage.app",
  messagingSenderId: "641959779564",
  appId: "1:641959779564:web:2546dba74b39eedf4099c9",
  measurementId: "G-B50G4LYHSH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock data for demonstration (replace with your Firebase implementation)
interface User {
  id: string;
  name: string;
  groups?: string[]; // Array of group IDs the user belongs to
}

interface Group {
  id: string;
  name: string;
  members: string[]; // Array of user IDs
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
  groupId?: string; // Optional group ID if the expense belongs to a group
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
  const [newUserName, setNewUserName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [newExpense, setNewExpense] = useState({
    paidBy: "",
    amount: "",
    description: "",
    splitWith: [] as string[],
    groupId: "",
  });
  const [settlements, setSettlements] = useState<Settlement[]>([]);

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

  const addUser = async () => {
    if (newUserName.trim() === "") return;

    const userExists = users.some(
      (user) => user.name.toLowerCase() === newUserName.toLowerCase()
    );

    if (userExists) {
      alert("This user already exists!");
      return;
    }

    try {
      await addDoc(collection(db, "users"), {
        name: newUserName,
        groups: [],
      });
      setNewUserName("");
    } catch (error) {
      console.error("Error adding user: ", error);
      alert("Error adding user. Please try again.");
    }
  };

  const addGroup = async () => {
    if (newGroupName.trim() === "") return;

    const groupExists = groups.some(
      (group) => group.name.toLowerCase() === newGroupName.toLowerCase()
    );

    if (groupExists) {
      alert("This group already exists!");
      return;
    }

    try {
      await addDoc(collection(db, "groups"), {
        name: newGroupName,
        members: [],
        createdAt: new Date().toISOString(),
      });
      setNewGroupName("");
    } catch (error) {
      console.error("Error adding group: ", error);
      alert("Error adding group. Please try again.");
    }
  };

  const addUserToGroup = async (userId: string, groupId: string) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      const group = groups.find((g) => g.id === groupId);

      if (!group) return;

      const updatedMembers = [...group.members, userId];
      await updateDoc(groupRef, { members: updatedMembers });

      // Update user's groups array
      const userRef = doc(db, "users", userId);
      const user = users.find((u) => u.id === userId);
      const updatedGroups = [...(user?.groups || []), groupId];
      await updateDoc(userRef, { groups: updatedGroups });
    } catch (error) {
      console.error("Error adding user to group: ", error);
      alert("Error adding user to group. Please try again.");
    }
  };

  const removeUserFromGroup = async (userId: string, groupId: string) => {
    try {
      const groupRef = doc(db, "groups", groupId);
      const group = groups.find((g) => g.id === groupId);

      if (!group) return;

      const updatedMembers = group.members.filter((id) => id !== userId);
      await updateDoc(groupRef, { members: updatedMembers });

      // Update user's groups array
      const userRef = doc(db, "users", userId);
      const user = users.find((u) => u.id === userId);
      const updatedGroups = (user?.groups || []).filter((id) => id !== groupId);
      await updateDoc(userRef, { groups: updatedGroups });
    } catch (error) {
      console.error("Error removing user from group: ", error);
      alert("Error removing user from group. Please try again.");
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, "groups", groupId));

      // Remove group from all users' groups array
      const batch = writeBatch(db);
      users.forEach((user) => {
        if (user.groups?.includes(groupId)) {
          const userRef = doc(db, "users", user.id);
          const updatedGroups = user.groups.filter((id) => id !== groupId);
          batch.update(userRef, { groups: updatedGroups });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error deleting group: ", error);
      alert("Error deleting group. Please try again.");
    }
  };

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
      alert(
        "Please fill in all fields and select at least one person to split with"
      );
      return;
    }

    const amount = parseFloat(newExpense.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const paidByUser = users.find((user) => user.id === newExpense.paidBy);
      if (!paidByUser) {
        throw new Error("Payer not found");
      }

      await addDoc(collection(db, "expenses"), {
        paidBy: newExpense.paidBy,
        paidByName: paidByUser.name,
        amount: amount,
        description: newExpense.description,
        splitWith: newExpense.splitWith,
        date: new Date().toISOString(),
        groupId: newExpense.groupId || null,
      });

      setNewExpense({
        paidBy: "",
        amount: "",
        description: "",
        splitWith: [],
        groupId: "",
      });
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("Error adding expense. Please try again.");
    }
  };

  const removeUser = async (userId: string) => {
    const userInExpenses = expenses.some(
      (expense) =>
        expense.paidBy === userId || expense.splitWith.includes(userId)
    );

    if (userInExpenses) {
      alert("Cannot remove user who is involved in expenses!");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (error) {
      console.error("Error removing user: ", error);
      alert("Error removing user. Please try again.");
    }
  };

  const removeExpense = async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, "expenses", expenseId));
    } catch (error) {
      console.error("Error removing expense: ", error);
      alert("Error removing expense. Please try again.");
    }
  };

  useEffect(() => {
    calculateSettlements(expenses);
  }, [expenses, users]);

  const individualBalances = calculateIndividualBalances(expenses);

  // Filter expenses based on selected group
  const filteredExpenses = expenses.filter((expense) => {
    if (!selectedGroup) return true;
    return expense.groupId === selectedGroup;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4 max-w-6xl mx-auto">
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
      >
        SplitEase
      </motion.h1>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
        <div className="space-y-4 sm:space-y-8">
          {/* Groups Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Groups
            </h2>

            <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-grow px-4 py-3 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter group name"
              />
              <button
                onClick={addGroup}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-md"
              >
                Create Group
              </button>
            </div>

            <div className="space-y-4">
              {groups.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">
                  No groups created yet
                </p>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium text-gray-800">
                        {group.name}
                      </h3>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete Group
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Members
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={group.members.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  addUserToGroup(user.id, group.id);
                                } else {
                                  removeUserFromGroup(user.id, group.id);
                                }
                              }}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">{user.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* User Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Group Members
            </h2>

            <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-grow px-4 py-3 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter name"
              />
              <button
                onClick={addUser}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md"
              >
                Add User
              </button>
            </div>

            <div>
              {users.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">
                  No users added yet
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  <AnimatePresence>
                    {users.map((user) => (
                      <motion.li
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="py-3 flex justify-between items-center group"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <span className="text-gray-700 font-medium text-sm sm:text-base">
                            {user.name}
                          </span>
                          <span
                            className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
                              individualBalances[user.id] > 0
                                ? "bg-green-100 text-green-800"
                                : individualBalances[user.id] < 0
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {individualBalances[user.id] > 0 ? "+" : ""}₹
                            {Math.abs(individualBalances[user.id]).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>

          {/* Add Expense Section */}
          {users.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Add Expense
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group (Optional)
                  </label>
                  <select
                    value={newExpense.groupId}
                    onChange={(e) =>
                      setNewExpense({ ...newExpense, groupId: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No Group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Split with
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          id={`split-${user.id}`}
                          checked={newExpense.splitWith.includes(user.id)}
                          onChange={() => toggleUserForExpense(user.id)}
                          disabled={user.id === newExpense.paidBy}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <label
                          htmlFor={`split-${user.id}`}
                          className="ml-2 text-sm sm:text-base text-gray-700"
                        >
                          {user.name}{" "}
                          {user.id === newExpense.paidBy ? (
                            <span className="text-green-600 text-xs sm:text-sm">
                              (Payer)
                            </span>
                          ) : null}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addExpense}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md"
                >
                  Add Expense
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-8">
          {/* Enhanced Settlements Section */}
          {settlements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Who Owes Whom
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {settlements.map((settlement, index) => (
                  <motion.div
                    key={settlement.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <span className="text-base sm:text-lg font-bold text-red-700">
                              {settlement.fromName}
                            </span>
                            <span className="text-gray-600">owes</span>
                            <span className="text-base sm:text-lg font-bold text-green-700">
                              {settlement.toName}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            Settlement required
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-red-600">
                          ₹{settlement.amount.toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          Amount owed
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-3 flex items-center justify-center">
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        <span>Pay directly to settle</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">
                  Settlement Summary
                </h3>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <div>
                    Total settlements needed:{" "}
                    <span className="font-medium">{settlements.length}</span>
                  </div>
                  <div>
                    Total amount to be settled:{" "}
                    <span className="font-medium">
                      ₹
                      {settlements
                        .reduce((sum, s) => sum + s.amount, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Individual Balances */}
          {users.length > 0 && expenses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Individual Balances
              </h2>

              <div className="space-y-3">
                {users.map((user) => {
                  const balance = individualBalances[user.id];
                  const isPositive = balance > 0;
                  const isNegative = balance < 0;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-lg border-2 ${
                        isPositive
                          ? "bg-green-50 border-green-200"
                          : isNegative
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isPositive
                                ? "bg-green-500"
                                : isNegative
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }`}
                          ></div>
                          <span className="font-medium text-gray-800">
                            {user.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xl font-bold ${
                              isPositive
                                ? "text-green-600"
                                : isNegative
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}₹
                            {Math.abs(balance).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {isPositive
                              ? "Gets back"
                              : isNegative
                              ? "Owes"
                              : "Even"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Expenses List */}
          {expenses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h2 className="text-2xl font-semibold mb-6 text-gray-800 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Recent Expenses
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Expenses</h3>
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">All Groups</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-gray-50 p-4 rounded-md flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium">
                            {expense.description}
                          </h3>
                          {expense.groupId && (
                            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                              {
                                groups.find((g) => g.id === expense.groupId)
                                  ?.name
                              }
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">
                          Paid by {expense.paidByName} - ₹{expense.amount}
                        </p>
                        <p className="text-sm text-gray-500">
                          Split with:{" "}
                          {expense.splitWith
                            .map(
                              (userId) =>
                                users.find((u) => u.id === userId)?.name ||
                                "Unknown"
                            )
                            .join(", ")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeExpense(expense.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseSplittingApp;
