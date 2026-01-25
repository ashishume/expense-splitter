/**
 * Fixed Cost Storage Service - Supabase PostgreSQL
 * Manages fixed cost templates and monthly instances
 */

import type { FixedCost, FixedCostInstance } from "../../types/personalExpense";
import { supabase, toISOString } from "../../supabase";

const TEMPLATES_TABLE = "fixed_costs";
const INSTANCES_TABLE = "fixed_cost_instances";

interface FixedCostRow {
  id: string;
  user_id: string;
  name: string;
  default_amount: number;
  created_at: string;
  updated_at: string;
}

interface FixedCostInstanceRow {
  id: string;
  fixed_cost_id: string;
  user_id: string;
  month: string;
  amount: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const rowToFixedCost = (row: FixedCostRow): FixedCost => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  defaultAmount: row.default_amount,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

const rowToInstance = (row: FixedCostInstanceRow): FixedCostInstance => ({
  id: row.id,
  fixedCostId: row.fixed_cost_id,
  userId: row.user_id,
  month: row.month,
  amount: row.amount,
  isEnabled: row.is_enabled,
  createdAt: toISOString(row.created_at),
  updatedAt: toISOString(row.updated_at),
});

// ============================================
// Template CRUD Operations
// ============================================

export const createFixedCost = async (
  fixedCost: Omit<FixedCost, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<FixedCost> => {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .insert({
        user_id: userId,
        name: fixedCost.name,
        default_amount: fixedCost.defaultAmount,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToFixedCost(data as FixedCostRow);
  } catch (error) {
    console.error("Error creating fixed cost:", error);
    throw error;
  }
};

export const getFixedCosts = async (userId: string): Promise<FixedCost[]> => {
  try {
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((row) => rowToFixedCost(row as FixedCostRow));
  } catch (error) {
    console.error("Error fetching fixed costs:", error);
    throw error;
  }
};

export const updateFixedCost = async (
  id: string,
  updates: Partial<Omit<FixedCost, "id" | "createdAt">>,
  userId: string
): Promise<FixedCost | null> => {
  const updateData: Partial<FixedCostRow> = {
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

  return rowToFixedCost(data as FixedCostRow);
};

export const deleteFixedCost = async (
  id: string,
  userId: string
): Promise<boolean> => {
  // Delete all instances first
  await supabase.from(INSTANCES_TABLE).delete().eq("fixed_cost_id", id);

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

export const getFixedCostInstances = async (
  month: string,
  userId: string
): Promise<FixedCostInstance[]> => {
  try {
    const { data, error } = await supabase
      .from(INSTANCES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("month", month);

    if (error) throw error;

    const instances = (data || []).map((row) => rowToInstance(row as FixedCostInstanceRow));
    
    // Deduplicate by fixedCostId
    const instanceMap = new Map<string, FixedCostInstance>();
    for (const instance of instances) {
      const existing = instanceMap.get(instance.fixedCostId);
      if (!existing || new Date(instance.updatedAt) > new Date(existing.updatedAt)) {
        instanceMap.set(instance.fixedCostId, instance);
      }
    }
    
    return Array.from(instanceMap.values());
  } catch (error) {
    console.error("Error fetching fixed cost instances:", error);
    throw error;
  }
};

export const getOrCreateFixedCostInstance = async (
  fixedCostId: string,
  month: string,
  userId: string
): Promise<FixedCostInstance> => {
  // Check if instance exists
  const { data: existing } = await supabase
    .from(INSTANCES_TABLE)
    .select("*")
    .eq("fixed_cost_id", fixedCostId)
    .eq("user_id", userId)
    .eq("month", month)
    .limit(1)
    .single();

  if (existing) {
    return rowToInstance(existing as FixedCostInstanceRow);
  }

  // Get template
  const { data: template, error: templateError } = await supabase
    .from(TEMPLATES_TABLE)
    .select("*")
    .eq("id", fixedCostId)
    .single();

  if (templateError || !template) {
    throw new Error("Fixed cost template not found");
  }

  // Find most recent previous month's instance
  const { data: allInstances } = await supabase
    .from(INSTANCES_TABLE)
    .select("*")
    .eq("fixed_cost_id", fixedCostId)
    .eq("user_id", userId)
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1);

  let amountToUse = (template as FixedCostRow).default_amount;
  let isEnabledToUse = true;

  if (allInstances && allInstances.length > 0) {
    const previous = rowToInstance(allInstances[0] as FixedCostInstanceRow);
    amountToUse = previous.amount;
    isEnabledToUse = previous.isEnabled;
  }

  // Create new instance
  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .insert({
      fixed_cost_id: fixedCostId,
      user_id: userId,
      month,
      amount: amountToUse,
      is_enabled: isEnabledToUse,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToInstance(data as FixedCostInstanceRow);
};

export const updateFixedCostInstance = async (
  id: string,
  updates: Partial<Omit<FixedCostInstance, "id" | "createdAt">>,
  userId: string
): Promise<FixedCostInstance | null> => {
  const updateData: Partial<FixedCostInstanceRow> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.isEnabled !== undefined) updateData.is_enabled = updates.isEnabled;

  const { data, error } = await supabase
    .from(INSTANCES_TABLE)
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return rowToInstance(data as FixedCostInstanceRow);
};

export const ensureFixedCostInstancesForMonth = async (
  month: string,
  userId: string
): Promise<FixedCostInstance[]> => {
  const templates = await getFixedCosts(userId);
  const existingInstances = await getFixedCostInstances(month, userId);
  const existingInstancesMap = new Map<string, FixedCostInstance>();
  existingInstances.forEach((inst) => {
    existingInstancesMap.set(inst.fixedCostId, inst);
  });

  const instances: FixedCostInstance[] = [];
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
    const instance = await getOrCreateFixedCostInstance(templateId, month, userId);
    instances.push(instance);
  }

  return instances;
};
