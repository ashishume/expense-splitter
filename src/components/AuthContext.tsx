import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user && user.email) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          // Check if there's already a user with this email (manually added)
          const emailQuery = query(
            collection(db, "users"),
            where("email", "==", user.email)
          );
          const emailSnapshot = await getDocs(emailQuery);

          if (!emailSnapshot.empty) {
            // Found a duplicate user with the same email
            const duplicateUser = emailSnapshot.docs[0];
            const duplicateData = duplicateUser.data();

            // Merge the duplicate user data into the new Google user
            await setDoc(userRef, {
              name: user.displayName || duplicateData.name || "Unknown User",
              email: user.email,
              groups: duplicateData.groups || [],
              addedBy: duplicateData.addedBy || null,
              createdAt: duplicateData.createdAt || new Date().toISOString(),
              mergedFrom: duplicateUser.id, // Track the merge
              lastLogin: new Date().toISOString(),
            });

            // Delete the duplicate user
            await deleteDoc(doc(db, "users", duplicateUser.id));

            // Update all references to the old user ID in groups
            const groupsQuery = query(collection(db, "groups"));
            const groupsSnapshot = await getDocs(groupsQuery);
            const batch = writeBatch(db);

            groupsSnapshot.docs.forEach((groupDoc) => {
              const groupData = groupDoc.data();
              if (
                groupData.members &&
                groupData.members.includes(duplicateUser.id)
              ) {
                const updatedMembers = groupData.members.map(
                  (memberId: string) =>
                    memberId === duplicateUser.id ? user.uid : memberId
                );
                batch.update(doc(db, "groups", groupDoc.id), {
                  members: updatedMembers,
                });
              }
            });

            // Update all references to the old user ID in expenses
            const expensesQuery = query(collection(db, "expenses"));
            const expensesSnapshot = await getDocs(expensesQuery);

            expensesSnapshot.docs.forEach((expenseDoc) => {
              const expenseData = expenseDoc.data();
              let needsUpdate = false;
              const updates: any = {};

              if (expenseData.paidBy === duplicateUser.id) {
                updates.paidBy = user.uid;
                needsUpdate = true;
              }

              if (
                expenseData.splitWith &&
                expenseData.splitWith.includes(duplicateUser.id)
              ) {
                updates.splitWith = expenseData.splitWith.map(
                  (userId: string) =>
                    userId === duplicateUser.id ? user.uid : userId
                );
                needsUpdate = true;
              }

              if (needsUpdate) {
                batch.update(doc(db, "expenses", expenseDoc.id), updates);
              }
            });

            await batch.commit();
          } else {
            // No duplicate found, create new user
            await setDoc(userRef, {
              name: user.displayName || "Unknown User",
              email: user.email,
              groups: [],
              addedBy: null,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          // Update existing user document with latest info
          await setDoc(
            userRef,
            {
              name: user.displayName || "Unknown User",
              email: user.email,
              lastLogin: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
