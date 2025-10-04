import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { UsersIcon, LoadingSpinner, DeleteIcon } from "./icons/index";
import type { User } from "firebase/auth";

import type { User as AppUser } from "../types";

interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface GroupsProps {
  users: AppUser[];
  groups: Group[];
  onGroupUpdate: () => void;
  currentUser: User | null;
}

const Groups = ({ users, groups, onGroupUpdate, currentUser }: GroupsProps) => {
  const navigate = useNavigate();
  const [newGroupName, setNewGroupName] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [showUserForm] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState<string | null>(null);
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);

  // Filter groups to only show groups the current user is a member of
  const userGroups = groups
    .filter((group) => group.members.includes(currentUser?.uid || ""))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // Get current user's app data
  const currentAppUser = users.find((user) => user.id === currentUser?.uid);

  const addGroup = async () => {
    if (newGroupName.trim() === "") return;

    const groupExists = groups.some(
      (group) => group.name.toLowerCase() === newGroupName.toLowerCase()
    );

    if (groupExists) {
      toast.error("This group already exists!");
      return;
    }

    if (isCreatingGroup) return; // Prevent duplicate submissions

    setIsCreatingGroup(true);
    try {
      // Create group and automatically add the current user as a member
      const groupRef = await addDoc(collection(db, "groups"), {
        name: newGroupName,
        members: [currentUser?.uid || ""],
        createdAt: new Date().toISOString(),
      });

      // Update current user's groups array
      if (currentUser?.uid) {
        const userRef = doc(db, "users", currentUser.uid);
        const updatedGroups = [...(currentAppUser?.groups || []), groupRef.id];
        await updateDoc(userRef, { groups: updatedGroups });
      }

      setNewGroupName("");
      onGroupUpdate();
      toast.success("Group created successfully!");
    } catch (error) {
      console.error("Error adding group: ", error);
      toast.error("Error adding group. Please try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const addUser = async (groupId?: string) => {
    if (newUserName.trim() === "" || newUserEmail.trim() === "") return;

    if (isAddingUser) return; // Prevent duplicate submissions

    setIsAddingUser(true);
    try {
      // Check if user already exists by email
      let existingUser: AppUser | null = null;
      if (newUserEmail.trim()) {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", newUserEmail.trim())
        );
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          existingUser = {
            id: querySnapshot.docs[0].id,
            name: userData.name,
            email: userData.email,
            groups: userData.groups || [],
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin,
          } as AppUser;
        }
      }

      let userId: string;

      if (existingUser) {
        // Use existing user
        userId = existingUser.id;
        toast.success(`Using existing user: ${existingUser.name}`);
      } else {
        // Create new user
        const userExists = users.some(
          (user) => user.name.toLowerCase() === newUserName.toLowerCase()
        );

        if (userExists) {
          toast.error("This user already exists!");
          return;
        }

        const userRef = await addDoc(collection(db, "users"), {
          name: newUserName,
          email: newUserEmail.trim() || null,
          groups: [],
          createdAt: new Date().toISOString(),
        });
        userId = userRef.id;
        toast.success("User added successfully!");
      }

      // Add user to the specified group
      if (groupId) {
        await addUserToGroup(userId, groupId);
      }

      setNewUserName("");
      setNewUserEmail("");
      // setShowUserForm(false);
      onGroupUpdate();
    } catch (error) {
      console.error("Error adding user: ", error);
      toast.error("Error adding user. Please try again.");
    } finally {
      setIsAddingUser(false);
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
      onGroupUpdate();
      toast.success("User added to group successfully!");
    } catch (error) {
      console.error("Error adding user to group: ", error);
      toast.error("Error adding user to group. Please try again.");
    }
  };

  const removeUserFromGroup = async (userId: string, groupId: string) => {
    const operationKey = `${userId}-${groupId}`;
    if (isRemovingUser === operationKey) return; // Prevent duplicate submissions

    setIsRemovingUser(operationKey);
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
      onGroupUpdate();
      toast.success("User removed from group successfully!");
    } catch (error) {
      console.error("Error removing user from group: ", error);
      toast.error("Error removing user from group. Please try again.");
    } finally {
      setIsRemovingUser(null);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (isDeletingGroup === groupId) return; // Prevent duplicate submissions

    setIsDeletingGroup(groupId);
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
      onGroupUpdate();
      toast.success("Group deleted successfully!");
    } catch (error) {
      console.error("Error deleting group: ", error);
      toast.error("Error deleting group. Please try again.");
    } finally {
      setIsDeletingGroup(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
        <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
        My Groups
      </h2>

      <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="flex-grow px-4 py-3 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base safari-form-fix"
          placeholder="Enter group name"
        />
        <button
          onClick={addGroup}
          disabled={isCreatingGroup}
          className="btn btn-primary px-4 sm:px-6 py-3 sm:rounded-l-none sm:rounded-r-lg text-sm sm:text-base"
        >
          {isCreatingGroup ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Creating...</span>
              <span className="sm:hidden">Create...</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Create Group</span>
              <span className="sm:hidden">Create</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {userGroups.length === 0 ? (
          <p className="text-gray-500 italic text-center py-4">
            You are not a member of any groups yet. Create a group to get
            started!
          </p>
        ) : (
          userGroups.map((group) => {
            // Get only the members that are actually in this group
            const groupMembers = users.filter((user) =>
              group.members.includes(user.id)
            );

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                }}
                className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-r from-gray-50 to-slate-50"
              >
                {/* Background accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
                <div className="p-4 ml-1">
                  <div className="flex justify-between items-start">
                    <h3
                      className="pt-2 text-base sm:text-lg font-medium text-gray-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => navigate(`/group/${group.id}`)}
                    >
                      {group.name}
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                      }}
                      disabled={isDeletingGroup === group.id}
                      className="p-2.5 mb-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete group"
                    >
                      {isDeletingGroup === group.id ? (
                        <LoadingSpinner className="w-4 h-4" />
                      ) : (
                        <DeleteIcon />
                      )}
                    </motion.button>
                  </div>

                  {showUserForm && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                          <input
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm safari-form-fix"
                            placeholder="Enter name"
                          />
                          <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm safari-form-fix"
                            placeholder="Enter email"
                          />
                          <button
                            onClick={() => addUser(group.id)}
                            disabled={isAddingUser}
                            className="btn btn-teal text-sm flex items-center justify-center"
                          >
                            {isAddingUser ? (
                              <>
                                <LoadingSpinner className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">
                                  Adding...
                                </span>
                                <span className="sm:hidden">Add...</span>
                              </>
                            ) : (
                              <>
                                <span className="hidden sm:inline">
                                  Add User
                                </span>
                                <span className="sm:hidden">Add</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          If email exists, will use existing user. Otherwise
                          creates new user.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Members ({groupMembers.length})
                    </h4>
                    {groupMembers.length === 0 ? (
                      <p className="text-gray-500 italic text-sm">
                        No members in this group yet. Add users to get started!
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-w-full">
                        {groupMembers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between gap-2 p-2 rounded border bg-indigo-50 border-indigo-200 min-w-0 w-full overflow-hidden group-member-card"
                          >
                            <div className="flex flex-col min-w-0 flex-1 overflow-hidden text-container">
                              <span className="text-sm font-medium truncate w-full">
                                {user.name}
                              </span>
                              {user.email && (
                                <span className="text-xs text-gray-500 truncate w-full">
                                  {user.email}
                                </span>
                              )}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUserFromGroup(user.id, group.id);
                              }}
                              disabled={
                                isRemovingUser === `${user.id}-${group.id}`
                              }
                              className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-2"
                              title="Remove user from group"
                            >
                              {isRemovingUser === `${user.id}-${group.id}` ? (
                                <LoadingSpinner className="w-3 h-3" />
                              ) : (
                                <DeleteIcon className="w-3 h-3" />
                              )}
                            </motion.button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View Group Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
                    >
                      View Group & Add Expenses
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default Groups;
