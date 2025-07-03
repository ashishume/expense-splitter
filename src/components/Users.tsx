// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   addDoc,
//   collection,
//   deleteDoc,
//   doc,
//   updateDoc,
// } from "firebase/firestore";
// import { db } from "../firebase";
// import toast from "react-hot-toast";
// import { UsersIcon, EditIcon, DeleteIcon, SaveIcon, CloseIcon } from "./icons";
// import type { User } from "../types";

// interface UsersProps {
//   users: User[];
//   individualBalances: Record<string, number>;
//   onUserUpdate: () => void;
// }

// const Users = ({ users, individualBalances, onUserUpdate }: UsersProps) => {
//   const [newUserName, setNewUserName] = useState("");
//   const [newUserEmail, setNewUserEmail] = useState("");
//   const [editingUserId, setEditingUserId] = useState<string | null>(null);
//   const [editingName, setEditingName] = useState("");
//   const [editingEmail, setEditingEmail] = useState("");

//   const addUser = async () => {
//     if (newUserName.trim() === "") return;

//     const userExists = users.some(
//       (user) => user.name.toLowerCase() === newUserName.toLowerCase()
//     );

//     if (userExists) {
//       toast.error("This user already exists!");
//       return;
//     }

//     try {
//       await addDoc(collection(db, "users"), {
//         name: newUserName,
//         email: newUserEmail.trim() || null,
//         groups: [],
//         createdAt: new Date().toISOString(),
//       });
//       setNewUserName("");
//       setNewUserEmail("");
//       onUserUpdate();
//       toast.success("User added successfully!");
//     } catch (error) {
//       console.error("Error adding user: ", error);
//       toast.error("Error adding user. Please try again.");
//     }
//   };

//   const removeUser = async (userId: string) => {
//     try {
//       await deleteDoc(doc(db, "users", userId));
//       onUserUpdate();
//       toast.success("User removed successfully!");
//     } catch (error) {
//       console.error("Error removing user: ", error);
//       toast.error("Error removing user. Please try again.");
//     }
//   };

//   const startEditing = (user: User) => {
//     setEditingUserId(user.id);
//     setEditingName(user.name);
//     setEditingEmail(user.email || "");
//   };

//   const cancelEditing = () => {
//     setEditingUserId(null);
//     setEditingName("");
//     setEditingEmail("");
//   };

//   const saveEdit = async (userId: string) => {
//     if (editingName.trim() === "") {
//       toast.error("Name cannot be empty!");
//       return;
//     }

//     const userExists = users.some(
//       (user) =>
//         user.id !== userId &&
//         user.name.toLowerCase() === editingName.toLowerCase()
//     );

//     if (userExists) {
//       toast.error("This name is already taken!");
//       return;
//     }

//     try {
//       await updateDoc(doc(db, "users", userId), {
//         name: editingName,
//         email: editingEmail.trim() || null,
//       });
//       setEditingUserId(null);
//       setEditingName("");
//       setEditingEmail("");
//       onUserUpdate();
//       toast.success("User updated successfully!");
//     } catch (error) {
//       console.error("Error updating user: ", error);
//       toast.error("Error updating user. Please try again.");
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="p-4 sm:p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
//     >
//       <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800 flex items-center">
//         <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
//         Group Members
//       </h2>

//       <div className="flex flex-col sm:flex-row mb-4 sm:mb-6 gap-2">
//         <input
//           type="text"
//           value={newUserName}
//           onChange={(e) => setNewUserName(e.target.value)}
//           className="flex-grow px-4 py-3 border border-gray-300 rounded-lg sm:rounded-l-lg sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           placeholder="Enter name"
//         />
//         <input
//           type="email"
//           value={newUserEmail}
//           onChange={(e) => setNewUserEmail(e.target.value)}
//           className="flex-grow px-4 py-3 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//           placeholder="Enter email (optional)"
//         />
//         <button
//           onClick={addUser}
//           className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md"
//         >
//           Add User
//         </button>
//       </div>

//       <div>
//         {users.length === 0 ? (
//           <p className="text-gray-500 italic text-center py-4">
//             No users added yet
//           </p>
//         ) : (
//           <ul className="divide-y divide-gray-200">
//             <AnimatePresence>
//               {users.map((user) => (
//                 <motion.li
//                   key={user.id}
//                   initial={{ opacity: 0, x: -20 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0, x: 20 }}
//                   className="py-3 flex justify-between items-center group"
//                 >
//                   <div className="flex items-center space-x-2 sm:space-x-4">
//                     {editingUserId === user.id ? (
//                       <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
//                         <div className="flex flex-col space-y-1">
//                           <label className="text-xs text-gray-500">Name:</label>
//                           <input
//                             type="text"
//                             value={editingName}
//                             onChange={(e) => setEditingName(e.target.value)}
//                             className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                             autoFocus
//                           />
//                         </div>
//                         <div className="flex flex-col space-y-1">
//                           <label className="text-xs text-gray-500">
//                             Email:
//                           </label>
//                           <input
//                             type="email"
//                             value={editingEmail}
//                             onChange={(e) => setEditingEmail(e.target.value)}
//                             className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
//                             placeholder="Optional"
//                           />
//                         </div>
//                         <div className="flex space-x-1">
//                           <button
//                             onClick={() => saveEdit(user.id)}
//                             className="text-green-600 hover:text-green-800"
//                           >
//                             <SaveIcon className="w-4 h-4" />
//                           </button>
//                           <button
//                             onClick={cancelEditing}
//                             className="text-gray-600 hover:text-gray-800"
//                           >
//                             <CloseIcon className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
//                         <div className="flex flex-col">
//                           <span className="text-gray-700 font-medium text-sm sm:text-base">
//                             {user.name}
//                           </span>
//                           {user.email && (
//                             <span className="text-gray-500 text-xs sm:text-sm">
//                               {user.email}
//                             </span>
//                           )}
//                           <div className="flex flex-col text-xs text-gray-400 mt-1">
//                             {user.createdAt && (
//                               <span>
//                                 Created:{" "}
//                                 {new Date(user.createdAt).toLocaleDateString()}
//                               </span>
//                             )}
//                             {user.lastLogin && (
//                               <span>
//                                 Last login:{" "}
//                                 {new Date(user.lastLogin).toLocaleDateString()}
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                         <span
//                           className={`text-xs sm:text-sm px-2 py-1 rounded-full ${
//                             individualBalances[user.id] > 0
//                               ? "bg-green-100 text-green-800"
//                               : individualBalances[user.id] < 0
//                               ? "bg-red-100 text-red-800"
//                               : "bg-gray-100 text-gray-800"
//                           }`}
//                         >
//                           {individualBalances[user.id] > 0 ? "+" : ""}₹
//                           {Math.abs(individualBalances[user.id]).toFixed(2)}
//                         </span>
//                       </div>
//                     )}
//                   </div>
//                   <div className="flex items-center space-x-2">
//                     {editingUserId !== user.id && (
//                       <button
//                         onClick={() => startEditing(user)}
//                         className="text-blue-500 hover:text-blue-700"
//                       >
//                         <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" />
//                       </button>
//                     )}
//                     <button
//                       onClick={() => removeUser(user.id)}
//                       className="text-red-500"
//                     >
//                       <DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
//                     </button>
//                   </div>
//                 </motion.li>
//               ))}
//             </AnimatePresence>
//           </ul>
//         )}
//       </div>
//     </motion.div>
//   );
// };

// export default Users;
