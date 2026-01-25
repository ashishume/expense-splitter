/**
 * One-Time Investment Storage Service - Supabase PostgreSQL
 * Manages one-time investments (e.g., US stocks, occasional purchases)
 */

import type { OneTimeInvestment } from "../../types/personalExpense";
import { supabase, toISOString } from "../../supabase";

const TABLE_NAME = "one_time_investments";

interface OneTimeInvestmentRow {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

const rowToInvestment = (row: OneTimeInvestmentRow): OneTimeInvestment => ({
  id: row.id,
  userId: row.user_id,
  amount: row.amount,
  description: row.description,
  date: row.date,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

// ============================================
// CRUD Operations
// ============================================

export const createOneTimeInvestment = async (
  investment: Omit<OneTimeInvestment, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<OneTimeInvestment> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: userId,
        amount: investment.amount,
        description: investment.description,
        date: investment.date,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToInvestment(data as OneTimeInvestmentRow);
  } catch (error) {
    console.error("Error creating one-time investment:", error);
    throw error;
  }
};

export const getOneTimeInvestments = async (
  month: string,
  userId: string
): Promise<OneTimeInvestment[]> => {
  try {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, "0")}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;

    const investments = (data || []).map((row) => rowToInvestment(row as OneTimeInvestmentRow));
    return investments;
  } catch (error) {
    console.error("Error fetching one-time investments:", error);
    throw error;
  }
};

export const getOneTimeInvestmentById = async (
  id: string,
  userId: string
): Promise<OneTimeInvestment | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInvestment(data as OneTimeInvestmentRow);
};

export const updateOneTimeInvestment = async (
  id: string,
  updates: Partial<Omit<OneTimeInvestment, "id" | "createdAt">>,
  userId: string
): Promise<OneTimeInvestment | null> => {
  const updateData: Partial<OneTimeInvestmentRow> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.date !== undefined) updateData.date = updates.date;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInvestment(data as OneTimeInvestmentRow);
};

export const deleteOneTimeInvestment = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
};
