/**
 * Group Service - Always uses Firebase for expense splitter functionality
 * 
 * Note: Group expenses (expense splitter) always use Firebase,
 * regardless of the database provider setting for personal expenses.
 * This allows personal expenses to use Supabase while keeping
 * group expenses on Firebase.
 */

import * as firebaseGroupStorage from "./firebase/groupStorage";

// Always export Firebase implementations for group operations
export const getUsers = firebaseGroupStorage.getUsers;
export const subscribeToUsers = firebaseGroupStorage.subscribeToUsers;
export const subscribeToGroups = firebaseGroupStorage.subscribeToGroups;
export const getGroups = firebaseGroupStorage.getGroups;
export const createGroup = firebaseGroupStorage.createGroup;
export const updateGroup = firebaseGroupStorage.updateGroup;
export const getGroupExpenses = firebaseGroupStorage.getGroupExpenses;
export const createGroupExpense = firebaseGroupStorage.createGroupExpense;
export const updateGroupExpense = firebaseGroupStorage.updateGroupExpense;
export const deleteGroupExpense = firebaseGroupStorage.deleteGroupExpense;
export const subscribeToGroupExpenses = firebaseGroupStorage.subscribeToGroupExpenses;
export const getGroupLogs = firebaseGroupStorage.getGroupLogs;
export const createLog = firebaseGroupStorage.createLog;
export const subscribeToGroupLogs = firebaseGroupStorage.subscribeToGroupLogs;
export const cleanupOldLogs = firebaseGroupStorage.cleanupOldLogs;
