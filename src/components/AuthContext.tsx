import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    } else {
      // User exists, update last login time
      await setDoc(
        userRef,
        {
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
