import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";

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

// Function to add or update user in the database
const addUserToDatabase = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Check if user exists by email in the users collection
      let existingUserData = null;
      if (user.email) {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );
        const querySnapshot = await getDocs(usersQuery);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          existingUserData = {
            id: querySnapshot.docs[0].id,
            name: userData.name,
            email: userData.email,
            groups: userData.groups || [],
            createdAt: userData.createdAt,
          };
        }
      }

      if (existingUserData) {
        // User exists by email, update their data with Google info and migrate to new ID
        await setDoc(userRef, {
          name: user.displayName || existingUserData.name,
          email: user.email || existingUserData.email,
          groups: existingUserData.groups || [],
          createdAt: existingUserData.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });

        // Delete the old user document to avoid duplicates
        await deleteDoc(doc(db, "users", existingUserData.id));

        console.log(
          "Existing user migrated to Google account:",
          user.displayName
        );
        toast.success(
          `Welcome back ${
            user.displayName || "User"
          }! Your existing data has been linked to your Google account.`
        );
      } else {
        // User doesn't exist, create new user
        await setDoc(userRef, {
          name: user.displayName || "Unknown User",
          email: user.email || null,
          groups: [],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
        console.log("New user added to database:", user.displayName);
        toast.success(
          `Welcome ${
            user.displayName || "User"
          }! You've been added to the system.`
        );
      }
    } else {
      // User exists, update last login time and any new info from Google
      await setDoc(
        userRef,
        {
          name: user.displayName || userDoc.data().name,
          email: user.email || userDoc.data().email,
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log("Existing user login updated:", user.displayName);
    }
  } catch (error) {
    console.error("Error adding/updating user in database:", error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      setLoading(false);

      // Add user to database when they sign in
      if (user) {
        await addUserToDatabase(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // User will be automatically added to database via onAuthStateChanged
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
