import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signInWithCredential, signOut } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db } from "../firebase";
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
import { googleAuthService } from "../services/googleAuth";
import { trackAuth } from "../config/googleAnalytics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

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
    }
  } catch (error) {
    console.error("Error adding/updating user in database:", error);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Google Auth service
    const initializeAuth = async () => {
      try {
        await googleAuthService.initialize();

        // Set up event listeners for Google OAuth
        const handleGoogleAuthSuccess = async (event: CustomEvent) => {
          const { credential } = event.detail;
          await handleGoogleSignIn(credential);
        };

        const handleGoogleAuthError = (event: CustomEvent) => {
          console.error("Google Auth Error:", event.detail.error);
          toast.error("Authentication failed. Please try again.");
        };

        window.addEventListener(
          "googleAuthSuccess",
          handleGoogleAuthSuccess as any
        );
        window.addEventListener(
          "googleAuthError",
          handleGoogleAuthError as EventListener
        );

        // Show One Tap prompt
        await googleAuthService.showOneTap();

        return () => {
          window.removeEventListener(
            "googleAuthSuccess",
            handleGoogleAuthSuccess as any
          );
          window.removeEventListener(
            "googleAuthError",
            handleGoogleAuthError as EventListener
          );
        };
      } catch (error) {
        console.error("Error initializing Google Auth:", error);
        setLoading(false);
      }
    };

    // Set up Firebase auth state listener
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      setLoading(false);

      // Add user to database when they sign in
      if (user) {
        await addUserToDatabase(user);
        // Track successful login
        trackAuth("login");
      }
    });

    // Initialize Google Auth
    initializeAuth();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async (
    credential: string
    // googleUser?: GoogleUser
  ) => {
    try {
      // Create Firebase credential from Google OAuth token
      const googleCredential = GoogleAuthProvider.credential(credential);

      // Sign in to Firebase with the Google credential
      await signInWithCredential(auth, googleCredential);
    } catch (error) {
      console.error("Error signing in with Google OAuth:", error);
      toast.error("Authentication failed. Please try again.");
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Show One Tap prompt if not already shown
      await googleAuthService.showOneTap();
    } catch (error) {
      console.error("Error showing One Tap prompt:", error);
      toast.error("Failed to show sign-in prompt. Please try again.");
    }
  };

  const logout = async () => {
    try {
      // Track logout before signing out
      trackAuth("logout");
      await signOut(auth);
      googleAuthService.signOut();
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
