import { useState } from "react";
import { motion } from "framer-motion";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { UsersIcon, LoadingSpinner } from "./icons/index";
import type { User } from "firebase/auth";
import GroupCard from "./GroupCard";
import { trackGroupAction } from "../config/googleAnalytics";

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
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

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

    console.log("currentUser", currentUser);
    console.log("groups", groups);
    const groupExists = groups.some(
      (group) =>
        group.name.toLowerCase() === newGroupName.toLowerCase() &&
        group.members.includes(currentUser?.uid || "")
    );

    if (groupExists) {
      toast.error("This group already exists!");
      return;
    }

    if (isCreatingGroup) return; // Prevent duplicate submissions

    setIsCreatingGroup(true);
    try {
      // Create group and automatically add the current user as a member and owner
      const groupRef = await addDoc(collection(db, "groups"), {
        name: newGroupName,
        members: [currentUser?.uid || ""],
        createdAt: new Date().toISOString(),
        owner: currentUser?.uid || "", // Set the creator as the owner
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

      // Track group creation
      trackGroupAction("create", newGroupName);
    } catch (error) {
      console.error("Error adding group: ", error);
      toast.error("Error adding group. Please try again.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6 lg:mb-8 text-gray-800 flex items-center">
        <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 mr-2 lg:mr-3 text-indigo-600" />
        My Groups
      </h2>

      <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 lg:mb-8 gap-2 lg:gap-3">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="flex-grow px-4 py-3 lg:px-5 lg:py-4 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base lg:text-lg safari-form-fix"
          placeholder="Enter group name"
        />
        <button
          onClick={addGroup}
          disabled={isCreatingGroup}
          className="btn btn-primary px-4 sm:px-6 lg:px-8 py-3 lg:py-4 sm:rounded-l-none sm:rounded-r-lg text-sm sm:text-base lg:text-lg"
        >
          {isCreatingGroup ? (
            <>
              <LoadingSpinner className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
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

      <div className="space-y-4 lg:space-y-6">
        {userGroups.length === 0 ? (
          <p className="text-gray-500 italic text-center py-4 lg:py-8 text-base lg:text-lg">
            You are not a member of any groups yet. Create a group to get
            started!
          </p>
        ) : (
          userGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              users={users}
              onGroupUpdate={onGroupUpdate}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Groups;
