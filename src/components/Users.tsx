import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { UsersIcon, EditIcon, DeleteIcon, SaveIcon, CloseIcon } from "./icons";
import { mergeDuplicateUsers } from "../utils/userMerge";

interface User {
  id: string;
  name: string;
  email?: string;
  groups?: string[];
  addedBy?: string | null;
  createdAt?: string;
  mergedFrom?: string;
  lastLogin?: string;
  connections?: string[]; // Track all connected user IDs
}

interface Group {
  id: string;
  name: string;
  members: string[];
}

interface UsersProps {
  users: User[];
  individualBalances: Record<string, number>;
  onUserUpdate: () => void;
  currentUserData: User | null;
  groups: Group[];
}

const Users = ({
  users,
  individualBalances,
  onUserUpdate,
  currentUserData,
  groups,
}: UsersProps) => {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEmail, setEditingEmail] = useState("");

  const addUser = async () => {
    if (newUserName.trim() === "") return;

    const userExists = users.some(
      (user) => user.name.toLowerCase() === newUserName.toLowerCase()
    );

    if (userExists) {
      toast.error("This user already exists!");
      return;
    }

    if (!currentUserData) {
      toast.error("You must be logged in to add users!");
      return;
    }

    try {
      const newUserRef = await addDoc(collection(db, "users"), {
        name: newUserName,
        email: newUserEmail.trim() || null,
        groups: [],
        addedBy: currentUserData.id, // Track who added this user
        createdAt: new Date().toISOString(),
        connections: [currentUserData.id], // Connect to the user who added them
      });

      // Update current user's connections to include the new user
      const currentUserRef = doc(db, "users", currentUserData.id);
      const currentUserConnections = currentUserData.connections || [];
      if (!currentUserConnections.includes(newUserRef.id)) {
        await updateDoc(currentUserRef, {
          connections: [...currentUserConnections, newUserRef.id],
        });
      }

      setNewUserName("");
      setNewUserEmail("");
      onUserUpdate();
      toast.success("User added successfully!");
    } catch (error) {
      console.error("Error adding user: ", error);
      toast.error("Error adding user. Please try again.");
    }
  };

  const removeUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, "users", userId));
      onUserUpdate();
      toast.success("User removed successfully!");
    } catch (error) {
      console.error("Error removing user: ", error);
      toast.error("Error removing user. Please try again.");
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditingName(user.name);
    setEditingEmail(user.email || "");
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingName("");
    setEditingEmail("");
  };

  const saveEdit = async (userId: string) => {
    if (editingName.trim() === "") {
      toast.error("Name cannot be empty!");
      return;
    }

    const userExists = users.some(
      (user) =>
        user.id !== userId &&
        user.name.toLowerCase() === editingName.toLowerCase()
    );

    if (userExists) {
      toast.error("This name is already taken!");
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), {
        name: editingName,
        email: editingEmail.trim() || null,
      });
      setEditingUserId(null);
      setEditingName("");
      setEditingEmail("");
      onUserUpdate();
      toast.success("User updated successfully!");
    } catch (error) {
      console.error("Error updating user: ", error);
      toast.error("Error updating user. Please try again.");
    }
  };

  const handleMergeDuplicates = async () => {
    try {
      toast.loading("Merging duplicate users...");
      const result = await mergeDuplicateUsers();

      if (result.success) {
        toast.dismiss();
        if (result.mergeCount && result.mergeCount > 0) {
          toast.success(
            `Successfully merged ${result.mergeCount} sets of duplicate users!`
          );
        } else {
          toast.success("No duplicate users found!");
        }
        onUserUpdate(); // Refresh the user list
      } else {
        toast.dismiss();
        toast.error("Failed to merge duplicate users. Please try again.");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error merging duplicates:", error);
      toast.error("Error merging duplicate users. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center">
          <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
          Connected Users
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleMergeDuplicates}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            Merge Duplicates
          </button>
          <button
            onClick={async () => {
              if (!currentUserData) return;
              console.log("Current user data:", currentUserData);
              console.log("All users:", users);
              // Manually establish connections for testing
              const currentUserRef = doc(db, "users", currentUserData.id);
              const allUserIds = users
                .map((u) => u.id)
                .filter((id) => id !== currentUserData.id);
              await updateDoc(currentUserRef, {
                connections: allUserIds,
              });
              toast.success("Connections established for testing!");
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
          >
            Test Connections
          </button>
          <button
            onClick={async () => {
              if (!currentUserData) return;
              console.log("=== DEBUGGING CONNECTIONS ===");
              console.log("Current user:", currentUserData);
              console.log("All users with connections:");
              users.forEach((user) => {
                console.log(`${user.name} (${user.id}):`, {
                  addedBy: user.addedBy,
                  connections: user.connections || [],
                });
              });

              // Check if any users are missing connections
              const usersWithoutConnections = users.filter(
                (u) => !u.connections || u.connections.length === 0
              );
              console.log(
                "Users without connections:",
                usersWithoutConnections.map((u) => u.name)
              );

              toast.success("Connection debug info logged to console!");
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Debug Connections
          </button>
          <button
            onClick={async () => {
              if (!currentUserData) return;

              // Find users who don't have connections with current user
              const usersToConnect = users.filter(
                (user) =>
                  user.id !== currentUserData.id &&
                  (!currentUserData.connections ||
                    !currentUserData.connections.includes(user.id))
              );

              if (usersToConnect.length === 0) {
                toast.success("All users are already connected!");
                return;
              }

              console.log(
                "Establishing connections with:",
                usersToConnect.map((u) => u.name)
              );

              // Establish bidirectional connections
              const batch = writeBatch(db);

              // Update current user's connections
              const currentUserRef = doc(db, "users", currentUserData.id);
              const currentUserConnections = currentUserData.connections || [];
              const newCurrentUserConnections = [
                ...currentUserConnections,
                ...usersToConnect.map((u) => u.id),
              ];
              batch.update(currentUserRef, {
                connections: newCurrentUserConnections,
              });

              // Update other users' connections
              usersToConnect.forEach((user) => {
                const userRef = doc(db, "users", user.id);
                const userConnections = user.connections || [];
                const newUserConnections = [
                  ...userConnections,
                  currentUserData.id,
                ];
                batch.update(userRef, { connections: newUserConnections });
              });

              await batch.commit();
              toast.success(`Connected with ${usersToConnect.length} users!`);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            Connect All
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 gap-2">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          className="flex-grow px-4 py-3 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter name"
        />
        <input
          type="email"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
          className="flex-grow px-4 py-3 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter email (optional)"
        />
        <button
          onClick={addUser}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md"
        >
          Add User
        </button>
      </div>

      <div>
        {(() => {
          // Filter users to show connected users using both old and new logic
          const filteredUsers = currentUserData
            ? users.filter((user) => {
                // Show current user
                if (user.id === currentUserData.id) return true;

                // Show users added by current user (old logic)
                if (user.addedBy === currentUserData.id) return true;

                // Show users who added the current user (old logic)
                if (currentUserData.addedBy === user.id) return true;

                // Show users who were added by the same person who added the current user (siblings - old logic)
                if (
                  currentUserData.addedBy &&
                  user.addedBy === currentUserData.addedBy &&
                  user.id !== currentUserData.id
                )
                  return true;

                // Show users connected through the new connections field
                if (
                  currentUserData.connections?.includes(user.id) ||
                  user.connections?.includes(currentUserData.id)
                )
                  return true;

                return false;
              })
            : users;

          return filteredUsers.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4">
              No connected users yet. Add users or get added by someone to see
              them here.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.li
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="py-3 flex justify-between items-center group"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {editingUserId === user.id ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <div className="flex flex-col space-y-1">
                            <label className="text-xs text-gray-500">
                              Name:
                            </label>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <label className="text-xs text-gray-500">
                              Email:
                            </label>
                            <input
                              type="email"
                              value={editingEmail}
                              onChange={(e) => setEditingEmail(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => saveEdit(user.id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <SaveIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                          <div className="flex flex-col">
                            <span className="text-gray-700 font-medium text-sm sm:text-base">
                              {user.name}
                            </span>
                            {user.email && (
                              <span className="text-gray-500 text-xs sm:text-sm">
                                {user.email}
                              </span>
                            )}
                            {user.addedBy && (
                              <span className="text-blue-500 text-xs">
                                {user.addedBy === currentUserData?.id
                                  ? "Added by you"
                                  : currentUserData?.addedBy === user.addedBy
                                  ? `Sibling (added by ${
                                      users.find((u) => u.id === user.addedBy)
                                        ?.name || "Unknown"
                                    })`
                                  : `Added by ${
                                      users.find((u) => u.id === user.addedBy)
                                        ?.name || "Unknown"
                                    }`}
                              </span>
                            )}
                            {!user.addedBy &&
                              user.id !== currentUserData?.id && (
                                <span className="text-green-500 text-xs">
                                  Added you
                                </span>
                              )}
                          </div>
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
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingUserId !== user.id && (
                        <button
                          onClick={() => startEditing(user)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeUser(user.id)}
                        className="text-red-500"
                      >
                        <DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          );
        })()}
      </div>
    </motion.div>
  );
};

export default Users;
