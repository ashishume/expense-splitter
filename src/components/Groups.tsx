import { useState } from "react";
import { motion } from "framer-motion";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email?: string;
  groups?: string[];
}

interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface GroupsProps {
  users: User[];
  groups: Group[];
  onGroupUpdate: () => void;
}

const Groups = ({ users, groups, onGroupUpdate }: GroupsProps) => {
  const [newGroupName, setNewGroupName] = useState("");

  const addGroup = async () => {
    if (newGroupName.trim() === "") return;

    const groupExists = groups.some(
      (group) => group.name.toLowerCase() === newGroupName.toLowerCase()
    );

    if (groupExists) {
      toast.error("This group already exists!");
      return;
    }

    try {
      await addDoc(collection(db, "groups"), {
        name: newGroupName,
        members: [],
        createdAt: new Date().toISOString(),
      });
      setNewGroupName("");
      onGroupUpdate();
      toast.success("Group created successfully!");
    } catch (error) {
      console.error("Error adding group: ", error);
      toast.error("Error adding group. Please try again.");
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
      onGroupUpdate();
      toast.success("Group deleted successfully!");
    } catch (error) {
      console.error("Error deleting group: ", error);
      toast.error("Error deleting group. Please try again.");
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
                <h4 className="text-sm font-medium text-gray-700">Members</h4>
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
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-gray-500">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Groups;
