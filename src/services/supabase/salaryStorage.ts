/**
 * Salary Income Storage Service - Supabase PostgreSQL
 * Manages salary income template and monthly instances
 */

import type { SalaryIncome, SalaryInstance } from "../../types/personalExpense";
import { supabase, toISOString } from "../../supabase";

const TEMPLATES_TABLE = "salary_income";
const INSTANCES_TABLE = "salary_instances";

interface SalaryIncomeRow {
  id: string;
  user_id: string;
  default_amount: number;
  created_at: string;
  updated_at: string;
}

interface SalaryInstanceRow {
  id: string;
  salary_id: string;
  user_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

const rowToSalaryIncome = (row: SalaryIncomeRow): SalaryIncome => ({
  id: row.id,
  userId: row.user_id,
  defaultAmount: row.default_amount,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

const rowToInstance = (row: SalaryInstanceRow): SalaryInstance => ({
  id: row.id,
  salaryId: row.salary_id,
  userId: row.user_id,
  month: row.month,
  amount: row.amount,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

// ============================================
// Template CRUD Operations
// ============================================

export const createOrUpdateSalaryIncome = async (
  defaultAmount: number,
  userId: string
): Promise<SalaryIncome> => {
  try {
    // Check if salary already exists
    const { data: existing } = await supabase
      .from(TEMPLATES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from(TEMPLATES_TABLE)
        .update({
          default_amount: defaultAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return rowToSalaryIncome(data as SalaryIncomeRow);
    }

    // Create new
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .insert({
        user_id: userId,
        default_amount: defaultAmount,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToSalaryIncome(data as SalaryIncomeRow);
  } catch (error) {
    console.error("Error creating/updating salary income:", error);
    throw error;
  }
};

export const getSalaryIncome = async (userId: string): Promise<SalaryIncome | null> => {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return rowToSalaryIncome(data as SalaryIncomeRow);
  } catch (error) {
    console.error("Error fetching salary income:", error);
    return null;
  }
};

// ============================================
// Instance CRUD Operations
// ============================================

export const getSalaryInstance = async (
  month: string,
  userId: string
): Promise<SalaryInstance | null> => {
  try {
    const { data, error } = await supabase
      .from(INSTANCES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("month", month)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return rowToInstance(data as SalaryInstanceRow);
  } catch (error) {
    console.error("Error fetching salary instance:", error);
    return null;
  }
};

export const getOrCreateSalaryInstance = async (
  salaryId: string,
  month: string,
  userId: string
): Promise<SalaryInstance> => {
  // Check if instance exists
  const existing = await getSalaryInstance(month, userId);
  if (existing) {
    return existing;
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("id", salaryId)
    .single();

  if (templateError || !template) {
    throw new Error("Salary template not found");
  }

  // Create new instance
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .insert({
      salary_id: salaryId,
      user_id: userId,
      month,
      amount: (template as SalaryIncomeRow).default_amount,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToInstance(data as SalaryInstanceRow);
};

export const updateSalaryInstance = async (
  id: string,
  amount: number,
  userId: string
): Promise<SalaryInstance | null> => {
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .update({
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInstance(data as SalaryInstanceRow);
};

export const ensureSalaryInstanceForMonth = async (
  month: string,
  userId: string
): Promise<SalaryInstance | null> => {
  const salaryTemplate = await getSalaryIncome(userId);
  if (!salaryTemplate) {
    return null;
  }

  return getOrCreateSalaryInstance(salaryTemplate.id, month, userId);
};
