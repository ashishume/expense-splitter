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
  updateDoc,
  writeBatch,
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

/**
 * Migrate all references from old user ID to new user ID
 * This updates groups, expenses, and other references when a user logs in with Gmail
 * Handles Firestore batch limit of 500 operations by splitting into multiple batches
 */
const migrateUserReferences = async (
  oldUserId: string,
  newUserId: string,
  userName: string
) => {
  try {
    const BATCH_LIMIT = 500;
    let totalUpdateCount = 0;
    const updates: Array<{ ref: any; data: any }> = [];

    // 1. Collect all group updates
    const groupsQuery = query(collection(db, "groups"));
    const groupsSnapshot = await getDocs(groupsQuery);

    groupsSnapshot.forEach((groupDoc) => {
      const groupData = groupDoc.data();
      const members = groupData.members || [];
      const owner = groupData.owner;

      let needsUpdate = false;
      const updatedMembers = [...members];
      const updateData: any = {};

      // Update members array
      const memberIndex = updatedMembers.indexOf(oldUserId);
      if (memberIndex !== -1) {
        updatedMembers[memberIndex] = newUserId;
        updateData.members = updatedMembers;
        needsUpdate = true;
      }

      // Update owner if it's the old user ID
      if (owner === oldUserId) {
        updateData.owner = newUserId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.push({
          ref: doc(db, "groups", groupDoc.id),
          data: updateData,
        });
      }
    });

    // 2. Collect all expense updates
    const expensesQuery = query(collection(db, "expenses"));
    const expensesSnapshot = await getDocs(expensesQuery);

    expensesSnapshot.forEach((expenseDoc) => {
      const expenseData = expenseDoc.data();
      let needsUpdate = false;
      const updateData: any = {};

      // Update paidBy if it's the old user ID
      if (expenseData.paidBy === oldUserId) {
        updateData.paidBy = newUserId;
        updateData.paidByName = userName; // Update name as well
        needsUpdate = true;
      }

      // Update splitWith array
      const splitWith = expenseData.splitWith || [];
      const splitIndex = splitWith.indexOf(oldUserId);
      if (splitIndex !== -1) {
        const updatedSplitWith = [...splitWith];
        updatedSplitWith[splitIndex] = newUserId;
        updateData.splitWith = updatedSplitWith;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.push({
          ref: doc(db, "expenses", expenseDoc.id),
          data: updateData,
        });
      }
    });

    // 3. Collect all log updates
    const logsQuery = query(collection(db, "logs"));
    const logsSnapshot = await getDocs(logsQuery);

    logsSnapshot.forEach((logDoc) => {
      const logData = logDoc.data();

      if (logData.userId === oldUserId) {
        updates.push({
          ref: doc(db, "logs", logDoc.id),
          data: {
            userId: newUserId,
            userName: userName,
          },
        });
      }
    });

    // Process updates in batches to respect Firestore limit
    for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      const batchUpdates = updates.slice(i, i + BATCH_LIMIT);

      batchUpdates.forEach(({ ref, data }) => {
        batch.update(ref, data);
      });

      await batch.commit();
      totalUpdateCount += batchUpdates.length;
    }

    if (totalUpdateCount > 0) {
      console.log(
        `Migrated ${totalUpdateCount} references from ${oldUserId} to ${newUserId}`
      );
    }
  } catch (error) {
    console.error("Error migrating user references:", error);
    throw error;
  }
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
        const oldUserId = existingUserData.id;
        const newUserId = user.uid;
        const userName = user.displayName || existingUserData.name;

        // Migrate all references from old ID to new ID BEFORE deleting old user
        try {
          await migrateUserReferences(oldUserId, newUserId, userName);
        } catch (migrationError) {
          console.error("Migration error:", migrationError);
          toast.error(
            "Error migrating your data. Please contact support if issues persist."
          );
          // Continue with user creation even if migration fails partially
        }

        // User exists by email, update their data with Google info and migrate to new ID
        await setDoc(userRef, {
          name: userName,
          email: user.email || existingUserData.email,
          groups: existingUserData.groups || [],
          createdAt: existingUserData.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });

        // Delete the old user document to avoid duplicates (after migration)
        await deleteDoc(doc(db, "users", oldUserId));

        toast.success(
          `Welcome back ${userName}! Your existing data has been linked to your Google account.`
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

      if (user) {
        // User is authenticated - cancel One Tap and add to database
        googleAuthService.cancelOneTap();
        await addUserToDatabase(user);
        // Track successful login
        trackAuth("login");
      } else {
        // User is not authenticated - show One Tap prompt
        try {
          await googleAuthService.showOneTap();
        } catch (error) {
          console.error("Error showing One Tap prompt:", error);
        }
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
      // Only show One Tap if user is not already authenticated
      if (!user) {
        await googleAuthService.showOneTap();
      }
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
