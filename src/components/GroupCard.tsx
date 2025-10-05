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
import ConfirmDialog from "./ui/ConfirmDialog";
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
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showRemoveUserConfirm, setShowRemoveUserConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<AppUser | null>(null);

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

  const handleRemoveUserClick = (user: AppUser, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserToRemove(user);
    setShowRemoveUserConfirm(true);
  };

  const removeUserFromGroup = async () => {
    if (!userToRemove || isRemovingUser === userToRemove.id) return;

    setIsRemovingUser(userToRemove.id);
    try {
      const groupRef = doc(db, "groups", group.id);
      const updatedMembers = group.members.filter(
        (id) => id !== userToRemove.id
      );
      await updateDoc(groupRef, { members: updatedMembers });

      // Update user's groups array
      const userRef = doc(db, "users", userToRemove.id);
      const user = users.find((u) => u.id === userToRemove.id);
      const updatedGroups = (user?.groups || []).filter(
        (id) => id !== group.id
      );
      await updateDoc(userRef, { groups: updatedGroups });
      onGroupUpdate();
      toast.success("User removed from group successfully!");
      setShowRemoveUserConfirm(false);
      setUserToRemove(null);
    } catch (error) {
      console.error("Error removing user from group: ", error);
      toast.error("Error removing user from group. Please try again.");
    } finally {
      setIsRemovingUser(null);
    }
  };

  const handleDeleteGroupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteGroupConfirm(true);
  };

  const deleteGroup = async () => {
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
      setShowDeleteGroupConfirm(false);
    } catch (error) {
      console.error("Error deleting group: ", error);
      toast.error("Error deleting group. Please try again.");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate color for avatar based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-gradient-to-br from-indigo-500 to-purple-600",
      "bg-gradient-to-br from-pink-500 to-rose-600",
      "bg-gradient-to-br from-teal-500 to-cyan-600",
      "bg-gradient-to-br from-orange-500 to-amber-600",
      "bg-gradient-to-br from-emerald-500 to-green-600",
      "bg-gradient-to-br from-violet-500 to-purple-600",
      "bg-gradient-to-br from-blue-500 to-indigo-600",
      "bg-gradient-to-br from-fuchsia-500 to-pink-600",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  return (
    <motion.div
      // initial={{ opacity: 0, y: 20, scale: 0.95 }}
      // animate={{ opacity: 1, y: 0, scale: 1 }}
      // exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white group/card"
    >
      {/* Animated gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

      {/* Clickable main card area */}
      <div onClick={handleCardClick} className="cursor-pointer relative">
        {/* Top accent bar with animation */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 group-hover/card:h-2 transition-all duration-300" />

        {/* Main content */}
        <div className="p-7 pt-8">
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              {/* Group name with icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md group-hover/card:shadow-lg group-hover/card:scale-110 transition-all duration-300">
                  <svg
                    className="w-5 h-5 text-white"
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
                </div>
                <h3 className="text-2xl font-bold text-gray-800 group-hover/card:text-indigo-600 transition-colors truncate">
                  {group.name}
                </h3>
              </div>

              {/* Member count and avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {groupMembers.slice(0, 3).map((member, index) => (
                    <div
                      key={member.id}
                      className={`w-8 h-8 rounded-full ${getAvatarColor(
                        member.name
                      )} flex items-center justify-center text-white text-xs font-semibold border-2 border-white shadow-md transition-transform hover:scale-110 hover:z-10`}
                      style={{ zIndex: 3 - index }}
                      title={member.name}
                    >
                      {getInitials(member.name)}
                    </div>
                  ))}
                  {groupMembers.length > 3 && (
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white shadow-md"
                      style={{ zIndex: 0 }}
                    >
                      +{groupMembers.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700">
                    {groupMembers.length}{" "}
                    {groupMembers.length === 1 ? "Member" : "Members"}
                  </span>
                  <span className="text-xs text-gray-500">Active group</span>
                </div>
              </div>
            </div>

            {/* Delete button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleDeleteGroupClick}
              disabled={isDeletingGroup}
              className="p-2.5 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 rounded-xl transition-all duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-4 shadow-sm hover:shadow-md"
              title="Delete group"
            >
              {isDeletingGroup ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <DeleteIcon className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Primary action hint with enhanced styling */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 group-hover/card:border-indigo-200 group-hover/card:shadow-md transition-all duration-300">
            <div className="flex items-center text-sm text-indigo-700 font-semibold">
              <svg
                className="w-5 h-5 mr-2 group-hover/card:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              View expenses & settlements
            </div>
            <svg
              className="w-5 h-5 text-indigo-400 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Secondary actions - Low priority section */}
      <div className="border-t border-gray-200/60 bg-gradient-to-br from-gray-50 to-gray-100/50 relative">
        <div className="px-7 py-4">
          <div className="flex flex-wrap gap-3">
            {/* Toggle Members */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowMembers(!showMembers);
                setShowAddUser(false);
              }}
              className="flex items-center gap-2 text-sm px-4 py-2.5 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-gray-700 font-semibold shadow-sm hover:shadow-md"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  showMembers ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              {showMembers ? "Hide" : "View"} Members ({groupMembers.length})
            </motion.button>

            {/* Toggle Add User */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowAddUser(!showAddUser);
                setShowMembers(false);
              }}
              className="flex items-center gap-2 text-sm px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border border-indigo-600 rounded-xl transition-all duration-200 text-white font-semibold shadow-md hover:shadow-lg"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  showAddUser ? "rotate-45" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {showAddUser ? "Cancel" : "Add Member"}
            </motion.button>
          </div>
        </div>

        {/* Expandable Members List */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-7 pb-5">
                {groupMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mb-3">
                      <svg
                        className="w-8 h-8 text-gray-400"
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
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                      No members yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add members to get started
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {groupMembers.map((user) => (
                      <motion.div
                        key={user.id}
                        // initial={{ opacity: 0, x: -20 }}
                        // animate={{ opacity: 1, x: 0 }}
                        // transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group/member"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-full ${getAvatarColor(
                              user.name
                            )} flex items-center justify-center text-white text-sm font-bold shadow-md group-hover/member:scale-110 transition-transform duration-200`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-semibold truncate text-gray-800">
                              {user.name}
                            </span>
                            {user.email && (
                              <span className="text-xs text-gray-500 truncate">
                                {user.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleRemoveUserClick(user, e)}
                          disabled={isRemovingUser === user.id}
                          className="p-2 bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-600 rounded-lg transition-all duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md"
                          title="Remove user"
                        >
                          {isRemovingUser === user.id ? (
                            <LoadingSpinner className="w-4 h-4" />
                          ) : (
                            <DeleteIcon className="w-4 h-4" />
                          )}
                        </motion.button>
                      </motion.div>
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
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-7 pb-5">
                <div className="bg-gradient-to-br from-white to-indigo-50/30 p-6 rounded-2xl border-2 border-indigo-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-800">
                        Add New Member
                      </h4>
                      <p className="text-xs text-gray-500">
                        Enter member details below
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
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
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all duration-200 safari-form-fix"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                            />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all duration-200 safari-form-fix"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addUser();
                      }}
                      disabled={isAddingUser}
                      className="w-full btn btn-primary text-sm py-3.5 rounded-xl shadow-lg hover:shadow-xl"
                    >
                      {isAddingUser ? (
                        <>
                          <LoadingSpinner className="w-5 h-5 mr-2" />
                          Adding Member...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add Member to Group
                        </>
                      )}
                    </motion.button>

                    <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <svg
                        className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-xs text-indigo-700 font-medium">
                        If the email already exists, we'll add the existing user
                        to this group
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Group Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteGroupConfirm}
        onClose={() => setShowDeleteGroupConfirm(false)}
        onConfirm={deleteGroup}
        title="Delete Group?"
        message={`Are you sure you want to delete "${group.name}"? This will remove all expenses and data associated with this group. This action cannot be undone.`}
        confirmText="Delete Group"
        cancelText="Cancel"
        isLoading={isDeletingGroup}
        variant="danger"
      />

      {/* Remove User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveUserConfirm}
        onClose={() => {
          setShowRemoveUserConfirm(false);
          setUserToRemove(null);
        }}
        onConfirm={removeUserFromGroup}
        title="Remove Member?"
        message={
          userToRemove
            ? `Are you sure you want to remove ${userToRemove.name} from "${group.name}"? They will lose access to this group.`
            : ""
        }
        confirmText="Remove Member"
        cancelText="Cancel"
        isLoading={isRemovingUser === userToRemove?.id}
        variant="warning"
      />
    </motion.div>
  );
};

export default GroupCard;
