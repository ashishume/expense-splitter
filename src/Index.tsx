import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "./components/useAuth";
import Groups from "./components/Groups";
import logo from "./assets/logo.jpg";
import { LogOut, Wallet } from "lucide-react";
import { cleanupOldLogs } from "./services/groupService";
import { LoadingSpinner } from "./components/icons";
import { subscribeToUsers, subscribeToGroups } from "./services/groupService";

import type { User, Group } from "./types";

// Lazy load GroupDetails for code splitting (mobile optimization)
const GroupDetails = lazy(() => import("./components/GroupDetails"));

// Lazy load ExpenseTracker for code splitting
const ExpenseTracker = lazy(() => import("./components/ExpenseTracker"));

const ExpenseSplittingApp = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Set up real-time listeners for users and groups
  useEffect(() => {
    // Listen for users collection changes
    const usersUnsubscribe = subscribeToUsers((usersData) => {
      setUsers(usersData);
    });

    // Listen for groups collection changes
    const groupsUnsubscribe = subscribeToGroups((groupsData) => {
      setGroups(groupsData);
    });

    // Cleanup listeners on component unmount
    return () => {
      usersUnsubscribe();
      groupsUnsubscribe();
    };
  }, []);

  // Clean up old logs (older than 2 months) on app startup and periodically
  useEffect(() => {
    if (!user) return; // Only run cleanup when user is authenticated

    // Run cleanup on app startup
    cleanupOldLogs().catch((error) => {
      console.error("Error during initial log cleanup:", error);
    });

    // Set up periodic cleanup (once per day)
    const cleanupInterval = setInterval(() => {
      cleanupOldLogs().catch((error) => {
        console.error("Error during periodic log cleanup:", error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 p-2 sm:p-4 lg:p-6">
      {/* Desktop Container Wrapper */}
      <div className="max-w-7xl mx-auto">
        <Routes>
          {/* Personal Expense Tracker Route */}
          <Route
            path="/tracker"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
                      <p className="text-gray-600">Loading expense tracker...</p>
                    </div>
                  </div>
                }
              >
                <ExpenseTracker />
              </Suspense>
            }
          />

          {/* Group Details Route - Lazy loaded for mobile optimization */}
          <Route
            path="/group/:groupId"
            element={
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
                      <p className="text-gray-600">Loading group details...</p>
                    </div>
                  </div>
                }
              >
                <GroupDetails users={users} groups={groups} currentUser={user} />
              </Suspense>
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
                      loading="lazy"
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

                {/* Personal Expense Tracker Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6"
                >
                  <button
                    onClick={() => navigate("/tracker")}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-lg sm:text-xl">
                          My Expenses
                        </h3>
                        <p className="text-white/80 text-sm sm:text-base">
                          Track your personal spending
                        </p>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                </motion.div>

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
