import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { LoadingSpinner, DeleteIcon } from "./icons/index";
import type { User as AppUser, Group } from "../types";

interface GroupCardProps {
  group: Group;
  users: AppUser[];
  onGroupUpdate: () => void;
}

const GroupCard = ({ group, users, onGroupUpdate }: GroupCardProps) => {
  const navigate = useNavigate();
  const [showMembers, setShowMembers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isRemovingUser, setIsRemovingUser] = useState<string | null>(null);

  // Get only the members that are actually in this group
  const groupMembers = users.filter((user) => group.members.includes(user.id));

  const handleCardClick = () => {
    navigate(`/group/${group.id}`);
  };

  const addUser = async () => {
    if (newUserName.trim() === "" || newUserEmail.trim() === "") return;

    if (isAddingUser) return;

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
        // Check if user is already in the group
        if (group.members.includes(existingUser.id)) {
          toast.error("User is already a member of this group!");
          setIsAddingUser(false);
          return;
        }
        userId = existingUser.id;
        toast.success(`Using existing user: ${existingUser.name}`);
      } else {
        // Create new user
        const userExists = users.some(
          (user) => user.name.toLowerCase() === newUserName.toLowerCase()
        );

        if (userExists) {
          toast.error("This user already exists!");
          setIsAddingUser(false);
          return;
        }

        const userRef = await addDoc(collection(db, "users"), {
          name: newUserName,
          email: newUserEmail.trim() || null,
          groups: [],
          createdAt: new Date().toISOString(),
        });
        userId = userRef.id;
        toast.success("User created successfully!");
      }

      // Add user to the group
      const groupRef = doc(db, "groups", group.id);
      const updatedMembers = [...group.members, userId];
      await updateDoc(groupRef, { members: updatedMembers });

      // Update user's groups array
      const userRef = doc(db, "users", userId);
      const user = users.find((u) => u.id === userId);
      const updatedGroups = [...(user?.groups || []), group.id];
      await updateDoc(userRef, { groups: updatedGroups });

      setNewUserName("");
      setNewUserEmail("");
      setShowAddUser(false);
      onGroupUpdate();
      toast.success("User added to group successfully!");
    } catch (error) {
      console.error("Error adding user: ", error);
      toast.error("Error adding user. Please try again.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const removeUserFromGroup = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRemovingUser === userId) return;

    setIsRemovingUser(userId);
    try {
      const groupRef = doc(db, "groups", group.id);
      const updatedMembers = group.members.filter((id) => id !== userId);
      await updateDoc(groupRef, { members: updatedMembers });

      // Update user's groups array
      const userRef = doc(db, "users", userId);
      const user = users.find((u) => u.id === userId);
      const updatedGroups = (user?.groups || []).filter(
        (id) => id !== group.id
      );
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

  const deleteGroup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeletingGroup) return;

    setIsDeletingGroup(true);
    try {
      await deleteDoc(doc(db, "groups", group.id));

      // Remove group from all users' groups array
      const batch = writeBatch(db);
      users.forEach((user) => {
        if (user.groups?.includes(group.id)) {
          const userRef = doc(db, "users", user.id);
          const updatedGroups = user.groups.filter((id) => id !== group.id);
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
      setIsDeletingGroup(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white"
    >
      {/* Clickable main card area */}
      <div onClick={handleCardClick} className="cursor-pointer group">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Main content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors truncate">
                {group.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {groupMembers.length}{" "}
                {groupMembers.length === 1 ? "member" : "members"}
              </p>
            </div>

            {/* Delete button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={deleteGroup}
              disabled={isDeletingGroup}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-3"
              title="Delete group"
            >
              {isDeletingGroup ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <DeleteIcon className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Primary action hint */}
          <div className="flex items-center text-sm text-indigo-600 font-medium mt-4">
            <svg
              className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform"
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
            Click to view expenses and settlements
          </div>
        </div>
      </div>

      {/* Secondary actions - Low priority section */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="px-6 py-3">
          <div className="flex flex-wrap gap-2">
            {/* Toggle Members */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMembers(!showMembers);
                setShowAddUser(false);
              }}
              className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              {showMembers ? "Hide" : "View"} Members ({groupMembers.length})
            </button>

            {/* Toggle Add User */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddUser(!showAddUser);
                setShowMembers(false);
              }}
              className="text-xs px-3 py-1.5 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors text-indigo-700 font-medium"
            >
              {showAddUser ? "Cancel" : "Add Member"}
            </button>
          </div>
        </div>

        {/* Expandable Members List */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                {groupMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No members yet</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {groupMembers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-white border-gray-200 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium truncate text-gray-800">
                            {user.name}
                          </span>
                          {user.email && (
                            <span className="text-xs text-gray-500 truncate">
                              {user.email}
                            </span>
                          )}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => removeUserFromGroup(user.id, e)}
                          disabled={isRemovingUser === user.id}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title="Remove user"
                        >
                          {isRemovingUser === user.id ? (
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable Add User Form */}
        <AnimatePresence>
          {showAddUser && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-4">
                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm safari-form-fix"
                      placeholder="Enter name"
                    />
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm safari-form-fix"
                      placeholder="Enter email"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addUser();
                      }}
                      disabled={isAddingUser}
                      className="w-full btn btn-primary text-sm"
                    >
                      {isAddingUser ? (
                        <>
                          <LoadingSpinner className="w-4 h-4 mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Add User to Group"
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      If email exists, will use existing user
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GroupCard;
