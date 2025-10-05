import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./components/useAuth";
import Groups from "./components/Groups";
import GroupDetails from "./components/GroupDetails";
import logo from "./assets/logo.jpg";
import { LogOut } from "lucide-react";

import type { User, Group } from "./types";

const ExpenseSplittingApp = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Set up real-time listeners for users and groups
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

    // Cleanup listeners on component unmount
    return () => {
      usersUnsubscribe();
      groupsUnsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 p-2 sm:p-4 lg:p-6">
      {/* Desktop Container Wrapper */}
      <div className="max-w-7xl mx-auto">
        <Routes>
          {/* Group Details Route */}
          <Route
            path="/group/:groupId"
            element={
              <GroupDetails users={users} groups={groups} currentUser={user} />
            }
          />

          {/* Main App Route */}
          <Route
            path="/"
            element={
              <>
                <div className="flex justify-between items-center mb-4 sm:mb-6 lg:mb-8 gap-3">
                  <motion.h1
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 flex items-center"
                  >
                    <img
                      src={logo}
                      alt="Axpo splitter"
                      className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white rounded-full brightness-110 contrast-125 saturate-150 transition-all duration-300"
                    />
                  </motion.h1>
                  <div className="flex items-end sm:items-center gap-2 sm:gap-4 w-auto">
                    <div className="text-right sm:text-left">
                      <div className="text-sm sm:text-base lg:text-lg text-gray-700 font-medium truncate max-w-[150px] sm:max-w-none">
                        {user?.displayName}
                      </div>
                      <div className="text-xs sm:text-sm lg:text-base text-gray-600 truncate max-w-[150px] sm:max-w-none">
                        {user?.email}
                      </div>
                    </div>

                    <button
                      onClick={logout}
                      className="px-2 py-1 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-red-200 text-black rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm lg:text-base w-auto justify-center"
                    >
                      <LogOut className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </button>
                  </div>
                </div>

                {/* Groups Page */}
                <Groups
                  users={users}
                  groups={groups}
                  onGroupUpdate={() => {}}
                  currentUser={user}
                />
              </>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default ExpenseSplittingApp;
