import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

interface User {
  id: string;
  name: string;
  groups?: string[];
}

interface UsersProps {
  users: User[];
  individualBalances: Record<string, number>;
  onUserUpdate: () => void;
}

const Users = ({ users, individualBalances, onUserUpdate }: UsersProps) => {
  const [newUserName, setNewUserName] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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
      onUserUpdate();
    } catch (error) {
      console.error("Error adding user: ", error);
      alert("Error adding user. Please try again.");
    }
  };

  const removeUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      onUserUpdate();
    } catch (error) {
      console.error("Error removing user: ", error);
      alert("Error removing user. Please try again.");
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditingName(user.name);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingName("");
  };

  const saveEdit = async (userId: string) => {
    if (editingName.trim() === "") {
      alert("Name cannot be empty!");
      return;
    }

    const userExists = users.some(
      (user) =>
        user.id !== userId &&
        user.name.toLowerCase() === editingName.toLowerCase()
    );

    if (userExists) {
      alert("This name is already taken!");
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), {
        name: editingName,
      });
      setEditingUserId(null);
      setEditingName("");
      onUserUpdate();
    } catch (error) {
      console.error("Error updating user: ", error);
      alert("Error updating user. Please try again.");
    }
  };

  return (
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
                    {editingUserId === user.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(user.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {editingUserId !== user.id && (
                      <button
                        onClick={() => startEditing(user)}
                        className="text-blue-500 hover:text-blue-700"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => removeUser(user.id)}
                      className="text-red-500"
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
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default Users;
