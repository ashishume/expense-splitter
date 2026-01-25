/**
 * Investment Storage Service - Supabase PostgreSQL
 * Manages investment templates (SIPs) and monthly instances
 */

import type { Investment, InvestmentInstance } from "../../types/personalExpense";
import { supabase, toISOString } from "../../supabase";

const TEMPLATES_TABLE = "investments";
const INSTANCES_TABLE = "investment_instances";

interface InvestmentRow {
  id: string;
  user_id: string;
  name: string;
  default_amount: number;
  created_at: string;
  updated_at: string;
}

interface InvestmentInstanceRow {
  id: string;
  investment_id: string;
  user_id: string;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

const rowToInvestment = (row: InvestmentRow): Investment => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  defaultAmount: row.default_amount,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

const rowToInstance = (row: InvestmentInstanceRow): InvestmentInstance => ({
  id: row.id,
  investmentId: row.investment_id,
  userId: row.user_id,
  month: row.month,
  amount: row.amount,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

// ============================================
// Template CRUD Operations
// ============================================

export const createInvestment = async (
  investment: Omit<Investment, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Investment> => {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .insert({
        user_id: userId,
        name: investment.name,
        default_amount: investment.defaultAmount,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToInvestment(data as InvestmentRow);
  } catch (error) {
    console.error("Error creating investment:", error);
    throw error;
  }
};

export const getInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((row) => rowToInvestment(row as InvestmentRow));
  } catch (error) {
    console.error("Error fetching investments:", error);
    throw error;
  }
};

export const updateInvestment = async (
  id: string,
  updates: Partial<Omit<Investment, "id" | "createdAt">>,
  userId: string
): Promise<Investment | null> => {
  const updateData: Partial<InvestmentRow> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.defaultAmount !== undefined) updateData.default_amount = updates.defaultAmount;

  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInvestment(data as InvestmentRow);
};

export const deleteInvestment = async (
  id: string,
  userId: string
): Promise<boolean> => {
  // Delete all instances first
  await supabase.from(INSTANCES_TABLE).delete().eq("investment_id", id);

  const { error } = await supabase
    .from(TEMPLATES_TABLE)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
};

// ============================================
// Instance CRUD Operations
// ============================================

export const getInvestmentInstances = async (
  month: string,
  userId: string
): Promise<InvestmentInstance[]> => {
  try {
    const { data, error } = await supabase
      .from(INSTANCES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("month", month);

    if (error) throw error;

    const instances = (data || []).map((row) => rowToInstance(row as InvestmentInstanceRow));
    
    // Deduplicate by investmentId
    const instanceMap = new Map<string, InvestmentInstance>();
    for (const instance of instances) {
      const existing = instanceMap.get(instance.investmentId);
      if (!existing || new Date(instance.updatedAt) > new Date(existing.updatedAt)) {
        instanceMap.set(instance.investmentId, instance);
      }
    }
    
    return Array.from(instanceMap.values());
  } catch (error) {
    console.error("Error fetching investment instances:", error);
    throw error;
  }
};

export const getOrCreateInvestmentInstance = async (
  investmentId: string,
  month: string,
  userId: string
): Promise<InvestmentInstance> => {
  // Check if instance exists
  const { data: existing } = await supabase
    .from(INSTANCES_TABLE)
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", userId)
    .eq("month", month)
    .limit(1)
    .single();

  if (existing) {
    return rowToInstance(existing as InvestmentInstanceRow);
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("id", investmentId)
    .single();

  if (templateError || !template) {
    throw new Error("Investment template not found");
  }

  // Find most recent previous month's instance
  const { data: allInstances } = await supabase
    .from(INSTANCES_TABLE)
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", userId)
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1);

  let amountToUse = (template as InvestmentRow).default_amount;

  if (allInstances && allInstances.length > 0) {
    const previous = rowToInstance(allInstances[0] as InvestmentInstanceRow);
    amountToUse = previous.amount;
  }

  // Create new instance
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .insert({
      investment_id: investmentId,
      user_id: userId,
      month,
      amount: amountToUse,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToInstance(data as InvestmentInstanceRow);
};

export const updateInvestmentInstance = async (
  id: string,
  amount: number,
  userId: string
): Promise<InvestmentInstance | null> => {
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

  return rowToInstance(data as InvestmentInstanceRow);
};

export const ensureInvestmentInstancesForMonth = async (
  month: string,
  userId: string
): Promise<InvestmentInstance[]> => {
  const templates = await getInvestments(userId);
  const existingInstances = await getInvestmentInstances(month, userId);
  const existingInstancesMap = new Map<string, InvestmentInstance>();
  existingInstances.forEach((inst) => {
    existingInstancesMap.set(inst.investmentId, inst);
  });

  const instances: InvestmentInstance[] = [];
  const instancesToCreate: Array<{ templateId: string }> = [];

  for (const template of templates) {
    const existing = existingInstancesMap.get(template.id);
    if (existing) {
      instances.push(existing);
    } else {
      instancesToCreate.push({ templateId: template.id });
    }
  }

  for (const { templateId } of instancesToCreate) {
    const instance = await getOrCreateInvestmentInstance(templateId, month, userId);
    instances.push(instance);
  }

  return instances;
};
