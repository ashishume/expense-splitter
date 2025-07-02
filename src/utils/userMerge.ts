import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export const mergeDuplicateUsers = async () => {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{
      id: string;
      name: string;
      email?: string;
      groups?: string[];
      addedBy?: string | null;
      createdAt?: string;
      mergedFrom?: string;
      lastLogin?: string;
    }>;

    // Group users by email
    const emailGroups: { [email: string]: typeof users } = {};
    users.forEach((user) => {
      if (user.email) {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = [];
        }
        emailGroups[user.email].push(user);
      }
    });

    // Find duplicates and merge them
    const batch = writeBatch(db);
    let mergeCount = 0;

    for (const [email, userGroup] of Object.entries(emailGroups)) {
      if (userGroup.length > 1) {
        // Sort by creation date, keep the oldest one
        userGroup.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA.getTime() - dateB.getTime();
        });

        const primaryUser = userGroup[0]; // Keep the oldest
        const duplicateUsers = userGroup.slice(1); // Delete the rest

        // Merge data from duplicates into primary user
        let mergedGroups = [...(primaryUser.groups || [])];
        let mergedAddedBy = primaryUser.addedBy;

        duplicateUsers.forEach((duplicate) => {
          // Merge groups
          if (duplicate.groups) {
            mergedGroups = [...new Set([...mergedGroups, ...duplicate.groups])];
          }

          // If primary user has no addedBy but duplicate does, use duplicate's
          if (!mergedAddedBy && duplicate.addedBy) {
            mergedAddedBy = duplicate.addedBy;
          }

          // Delete the duplicate user
          batch.delete(doc(db, "users", duplicate.id));
        });

        // Update primary user with merged data
        batch.update(doc(db, "users", primaryUser.id), {
          groups: mergedGroups,
          addedBy: mergedAddedBy,
          mergedFrom: duplicateUsers.map((u) => u.id).join(","),
          lastMerge: new Date().toISOString(),
        });

        // Update all references in groups
        const groupsSnapshot = await getDocs(collection(db, "groups"));
        groupsSnapshot.docs.forEach((groupDoc) => {
          const groupData = groupDoc.data();
          if (groupData.members) {
            let needsUpdate = false;
            const updatedMembers = [...groupData.members];

            duplicateUsers.forEach((duplicate) => {
              const index = updatedMembers.indexOf(duplicate.id);
              if (index !== -1) {
                updatedMembers[index] = primaryUser.id;
                needsUpdate = true;
              }
            });

            if (needsUpdate) {
              batch.update(doc(db, "groups", groupDoc.id), {
                members: [...new Set(updatedMembers)],
              });
            }
          }
        });

        // Update all references in expenses
        const expensesSnapshot = await getDocs(collection(db, "expenses"));
        expensesSnapshot.docs.forEach((expenseDoc) => {
          const expenseData = expenseDoc.data();
          let needsUpdate = false;
          const updates: any = {};

          // Update paidBy
          if (
            duplicateUsers.some(
              (duplicate) => duplicate.id === expenseData.paidBy
            )
          ) {
            updates.paidBy = primaryUser.id;
            needsUpdate = true;
          }

          // Update splitWith
          if (expenseData.splitWith) {
            let updatedSplitWith = [...expenseData.splitWith];
            duplicateUsers.forEach((duplicate) => {
              const index = updatedSplitWith.indexOf(duplicate.id);
              if (index !== -1) {
                updatedSplitWith[index] = primaryUser.id;
                needsUpdate = true;
              }
            });
            if (needsUpdate) {
              updates.splitWith = [...new Set(updatedSplitWith)];
            }
          }

          if (needsUpdate) {
            batch.update(doc(db, "expenses", expenseDoc.id), updates);
          }
        });

        mergeCount++;
      }
    }

    if (mergeCount > 0) {
      await batch.commit();
      return { success: true, mergeCount };
    } else {
      return { success: true, mergeCount: 0 };
    }
  } catch (error) {
    console.error("Error merging duplicate users:", error);
    return { success: false, error };
  }
};
