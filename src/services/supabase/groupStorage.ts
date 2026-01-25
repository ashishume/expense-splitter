/**
 * Group Storage Service - Supabase PostgreSQL
 * Manages users, groups, group expenses, and activity logs
 */

import { supabase } from "../../supabase";
import type { User, Group, Expense } from "../../types";
import type { LogEntry } from "../../utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const USERS_TABLE = "users";
const GROUPS_TABLE = "groups";
const EXPENSES_TABLE = "expenses";
const LOGS_TABLE = "logs";

// ============================================
// Users
// ============================================

interface UserRow {
  id: string;
  name: string;
  email?: string | null;
  groups?: string[] | null;
  created_at?: string | null;
  last_login?: string | null;
}

const rowToUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email || undefined,
  groups: row.groups || undefined,
  createdAt: row.created_at || undefined,
  lastLogin: row.last_login || undefined,
});

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from(USERS_TABLE).select("*");
  if (error) throw error;
  return (data || []).map((row) => rowToUser(row as UserRow));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("*")
    .eq("email", email)
    .limit(1)
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
};

export const createUser = async (user: Omit<User, "id">): Promise<User> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      name: user.name,
      email: user.email || null,
      groups: user.groups || [],
      created_at: user.createdAt || new Date().toISOString(),
      last_login: user.lastLogin || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return rowToUser(data as UserRow);
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User | null> => {
  const updateData: Partial<UserRow> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.groups !== undefined) updateData.groups = updates.groups;
  if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin;

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToUser(data as UserRow);
};

export type Unsubscribe = () => void;

export const subscribeToUsers = (callback: (users: User[]) => void): Unsubscribe => {
  const channel = supabase
    .channel("users")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: USERS_TABLE },
      async () => {
        const users = await getUsers();
        callback(users);
      }
    )
    .subscribe();

  // Initial fetch
  getUsers().then(callback);

  return () => {
    supabase.removeChannel(channel as RealtimeChannel);
  };
};

// ============================================
// Groups
// ============================================

interface GroupRow {
  id: string;
  name: string;
  members: string[];
  created_at: string;
  owner?: string | null;
}

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  members: row.members,
  createdAt: row.created_at,
  owner: row.owner || undefined,
});

export const getGroups = async (): Promise<Group[]> => {
  const { data, error } = await supabase.from(GROUPS_TABLE).select("*");
  if (error) throw error;
  return (data || []).map((row) => rowToGroup(row as GroupRow));
};

export const createGroup = async (group: Omit<Group, "id">): Promise<Group> => {
  const { data, error } = await supabase
    .from(GROUPS_TABLE)
    .insert({
      name: group.name,
      members: group.members,
      created_at: group.createdAt,
      owner: group.owner || null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToGroup(data as GroupRow);
};

export const updateGroup = async (id: string, updates: Partial<Group>): Promise<Group | null> => {
  const updateData: Partial<GroupRow> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.members !== undefined) updateData.members = updates.members;
  if (updates.owner !== undefined) updateData.owner = updates.owner || null;

  const { data, error } = await supabase
    .from(GROUPS_TABLE)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToGroup(data as GroupRow);
};

export const subscribeToGroups = (callback: (groups: Group[]) => void): Unsubscribe => {
  const channel = supabase
    .channel("groups")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: GROUPS_TABLE },
      async () => {
        const groups = await getGroups();
        callback(groups);
      }
    )
    .subscribe();

  // Initial fetch
  getGroups().then(callback);

  return () => {
    supabase.removeChannel(channel as RealtimeChannel);
  };
};

// ============================================
// Group Expenses
// ============================================

interface ExpenseRow {
  id: string;
  paid_by: string;
  paid_by_name: string;
  amount: number;
  description: string;
  split_with: string[];
  date: string;
  group_id?: string | null;
  is_settlement?: boolean | null;
  added_by?: string | null;
}

const rowToExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  paidBy: row.paid_by,
  paidByName: row.paid_by_name,
  amount: row.amount,
  description: row.description,
  splitWith: row.split_with,
  date: row.date,
  groupId: row.group_id || undefined,
  isSettlement: row.is_settlement || undefined,
  addedBy: row.added_by || undefined,
});

export const getGroupExpenses = async (groupId: string, limitCount?: number): Promise<Expense[]> => {
  let query = supabase
    .from(EXPENSES_TABLE)
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false });

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => rowToExpense(row as ExpenseRow));
};

export const createGroupExpense = async (expense: Omit<Expense, "id">): Promise<Expense> => {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .insert({
      paid_by: expense.paidBy,
      paid_by_name: expense.paidByName,
      amount: expense.amount,
      description: expense.description,
      split_with: expense.splitWith,
      date: expense.date,
      group_id: expense.groupId || null,
      is_settlement: expense.isSettlement || false,
      added_by: expense.addedBy || null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToExpense(data as ExpenseRow);
};

export const updateGroupExpense = async (
  id: string,
  updates: Partial<Omit<Expense, "id">>
): Promise<Expense | null> => {
  const updateData: Partial<ExpenseRow> = {};
  if (updates.paidBy !== undefined) updateData.paid_by = updates.paidBy;
  if (updates.paidByName !== undefined) updateData.paid_by_name = updates.paidByName;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.splitWith !== undefined) updateData.split_with = updates.splitWith;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.isSettlement !== undefined) updateData.is_settlement = updates.isSettlement;

  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return null;
  return rowToExpense(data as ExpenseRow);
};

export const deleteGroupExpense = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from(EXPENSES_TABLE).delete().eq("id", id);
  if (error) throw error;
  return true;
};

export const subscribeToGroupExpenses = (
  groupId: string,
  callback: (expenses: Expense[]) => void,
  limitCount?: number
): Unsubscribe => {
  const channel = supabase
    .channel(`expenses:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: EXPENSES_TABLE,
        filter: `group_id=eq.${groupId}`,
      },
      async () => {
        const expenses = await getGroupExpenses(groupId, limitCount);
        callback(expenses);
      }
    )
    .subscribe();

  // Initial fetch
  getGroupExpenses(groupId, limitCount).then(callback);

  return () => {
    supabase.removeChannel(channel as RealtimeChannel);
  };
};

// ============================================
// Logs
// ============================================

interface LogRow {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user_id?: string | null;
  user_name?: string | null;
  group_id?: string | null;
  changes?: Record<string, unknown> | null;
}

const rowToLog = (row: LogRow): LogEntry & { id: string } => ({
  id: row.id,
  action: row.action,
  details: row.details,
  timestamp: row.timestamp,
  userId: row.user_id || undefined,
  userName: row.user_name || undefined,
  groupId: row.group_id || undefined,
  changes: row.changes || undefined,
});

export const getGroupLogs = async (groupId: string, limitCount?: number): Promise<(LogEntry & { id: string })[]> => {
  let query = supabase
    .from(LOGS_TABLE)
    .select("*")
    .eq("group_id", groupId)
    .order("timestamp", { ascending: false });

  if (limitCount) {
    query = query.limit(limitCount);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => rowToLog(row as LogRow));
};

export const createLog = async (entry: LogEntry): Promise<void> => {
  await supabase.from(LOGS_TABLE).insert({
    action: entry.action,
    details: entry.details,
    timestamp: entry.timestamp || new Date().toISOString(),
    user_id: entry.userId || null,
    user_name: entry.userName || null,
    group_id: entry.groupId || null,
    changes: entry.changes || null,
  });
};

export const subscribeToGroupLogs = (
  groupId: string,
  callback: (logs: (LogEntry & { id: string })[]) => void,
  limitCount?: number
): Unsubscribe => {
  const channel = supabase
    .channel(`logs:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: LOGS_TABLE,
        filter: `group_id=eq.${groupId}`,
      },
      async () => {
        const logs = await getGroupLogs(groupId, limitCount);
        callback(logs);
      }
    )
    .subscribe();

  // Initial fetch
  getGroupLogs(groupId, limitCount).then(callback);

  return () => {
    supabase.removeChannel(channel as RealtimeChannel);
  };
};

export const cleanupOldLogs = async (): Promise<number> => {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const cutoffDateString = twoMonthsAgo.toISOString();

    const { data, error } = await supabase
      .from(LOGS_TABLE)
      .select("id")
      .lt("timestamp", cutoffDateString);

    if (error) throw error;

    const logsToDelete = data || [];
    if (logsToDelete.length === 0) {
      return 0;
    }

    const idsToDelete = logsToDelete.map((log) => log.id);
    
    // Delete in batches of 1000
    const batchSize = 1000;
    let totalDeleted = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from(LOGS_TABLE)
        .delete()
        .in("id", batch);

      if (deleteError) throw deleteError;
      totalDeleted += batch.length;
    }

    console.log(`Cleaned up ${totalDeleted} log entries older than 2 months`);
    return totalDeleted;
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
    return 0;
  }
};
