/**
 * Fixed Cost Storage Service - Firebase Firestore
 * Manages fixed cost templates and monthly instances
 */

import type { FixedCost, FixedCostInstance } from "../types/personalExpense";
import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

const TEMPLATES_COLLECTION = "fixed_costs";
const INSTANCES_COLLECTION = "fixed_cost_instances";

// Firebase document types
interface FixedCostDoc {
  userId: string;
  name: string;
  defaultAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FixedCostInstanceDoc {
  fixedCostId: string;
  userId: string;
  month: string;
  amount: number;
  isEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to FixedCost
const docToFixedCost = (docId: string, data: FixedCostDoc): FixedCost => ({
  id: docId,
  userId: data.userId,
  name: data.name,
  defaultAmount: data.defaultAmount,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// Convert Firestore document to FixedCostInstance
const docToInstance = (docId: string, data: FixedCostInstanceDoc): FixedCostInstance => ({
  id: docId,
  fixedCostId: data.fixedCostId,
  userId: data.userId,
  month: data.month,
  amount: data.amount,
  isEnabled: data.isEnabled,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// ============================================
// Template CRUD Operations
// ============================================

export const createFixedCost = async (
  fixedCost: Omit<FixedCost, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<FixedCost> => {
  try {
    const now = Timestamp.now();
    const docData: FixedCostDoc = {
      userId,
      name: fixedCost.name,
      defaultAmount: fixedCost.defaultAmount,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), docData);

    return {
      id: docRef.id,
      ...fixedCost,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  } catch (error) {
    console.error("Error creating fixed cost:", error);
    throw error;
  }
};

export const getFixedCosts = async (userId: string): Promise<FixedCost[]> => {
  try {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      docToFixedCost(doc.id, doc.data() as FixedCostDoc)
    );
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
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as FixedCostDoc;
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<FixedCostDoc> & { updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.defaultAmount !== undefined) updateData.defaultAmount = updates.defaultAmount;

  await updateDoc(docRef, updateData);

  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToFixedCost(updatedSnap.id, updatedSnap.data() as FixedCostDoc);
};

export const deleteFixedCost = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return false;
  }

  const data = docSnap.data() as FixedCostDoc;
  if (data.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Also delete all instances
  const instancesQuery = query(
    collection(db, INSTANCES_COLLECTION),
    where("fixedCostId", "==", id)
  );
  const instancesSnapshot = await getDocs(instancesQuery);
  await Promise.all(
    instancesSnapshot.docs.map((instanceDoc) => deleteDoc(instanceDoc.ref))
  );

  await deleteDoc(docRef);
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
    const q = query(
      collection(db, INSTANCES_COLLECTION),
      where("userId", "==", userId),
      where("month", "==", month)
    );

    const snapshot = await getDocs(q);
    const instances = snapshot.docs.map((doc) =>
      docToInstance(doc.id, doc.data() as FixedCostInstanceDoc)
    );
    
    // Deduplicate by fixedCostId (shouldn't be needed, but safety check)
    // If duplicates exist, keep the most recently updated one
    const instanceMap = new Map<string, FixedCostInstance>();
    for (const instance of instances) {
      const existing = instanceMap.get(instance.fixedCostId);
      if (!existing || new Date(instance.updatedAt) > new Date(existing.updatedAt)) {
        instanceMap.set(instance.fixedCostId, instance);
      } else if (existing && new Date(instance.updatedAt) === new Date(existing.updatedAt)) {
        // If same timestamp, keep the one with the later created date
        if (new Date(instance.createdAt) > new Date(existing.createdAt)) {
          instanceMap.set(instance.fixedCostId, instance);
        }
      }
    }
    
    // Log warning if duplicates were found
    if (instances.length > instanceMap.size) {
      console.warn(`Found ${instances.length - instanceMap.size} duplicate fixed cost instances for month ${month}. Deduplicated.`);
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
  // Check if instance exists for this month
  const q = query(
    collection(db, INSTANCES_COLLECTION),
    where("fixedCostId", "==", fixedCostId),
    where("userId", "==", userId),
    where("month", "==", month)
  );

  const snapshot = await getDocs(q);
  
  // If multiple instances exist (shouldn't happen, but handle it), use the first one
  if (!snapshot.empty) {
    // If there are multiple, log a warning but use the first one
    if (snapshot.docs.length > 1) {
      console.warn(`Multiple instances found for fixedCostId ${fixedCostId}, month ${month}. Using first one.`);
    }
    return docToInstance(snapshot.docs[0].id, snapshot.docs[0].data() as FixedCostInstanceDoc);
  }

  // Get template
  const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, fixedCostId));
  if (!templateDoc.exists()) {
    throw new Error("Fixed cost template not found");
  }

  const template = docToFixedCost(templateDoc.id, templateDoc.data() as FixedCostDoc);

  // Try to find the most recent previous month's instance to copy amount and enabled state
  // This ensures future months inherit the values from the previous month
  const allInstancesQuery = query(
    collection(db, INSTANCES_COLLECTION),
    where("fixedCostId", "==", fixedCostId),
    where("userId", "==", userId)
  );
  const allInstancesSnapshot = await getDocs(allInstancesQuery);
  
  let amountToUse = template.defaultAmount;
  let isEnabledToUse = true;
  
  if (!allInstancesSnapshot.empty) {
    // Find the most recent previous month's instance
    const instances = allInstancesSnapshot.docs
      .map((doc) => docToInstance(doc.id, doc.data() as FixedCostInstanceDoc))
      .filter((inst) => inst.month < month) // Only previous months
      .sort((a, b) => b.month.localeCompare(a.month)); // Sort descending (most recent first)
    
    if (instances.length > 0) {
      // Use the most recent previous month's values
      const previousInstance = instances[0];
      amountToUse = previousInstance.amount;
      isEnabledToUse = previousInstance.isEnabled;
    }
  }

  // Create new instance with inherited values
  const now = Timestamp.now();
  const docData: FixedCostInstanceDoc = {
    fixedCostId,
    userId,
    month,
    amount: amountToUse,
    isEnabled: isEnabledToUse,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INSTANCES_COLLECTION), docData);

  return {
    id: docRef.id,
    fixedCostId,
    userId,
    month,
    amount: amountToUse,
    isEnabled: isEnabledToUse,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
};

export const updateFixedCostInstance = async (
  id: string,
  updates: Partial<Omit<FixedCostInstance, "id" | "createdAt">>,
  userId: string
): Promise<FixedCostInstance | null> => {
  const docRef = doc(db, INSTANCES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as FixedCostInstanceDoc;
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<FixedCostInstanceDoc> & { updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;

  await updateDoc(docRef, updateData);

  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToInstance(updatedSnap.id, updatedSnap.data() as FixedCostInstanceDoc);
};

// Auto-generate instances for a month from all templates
// Optimized to fetch all existing instances first, then only create missing ones
export const ensureFixedCostInstancesForMonth = async (
  month: string,
  userId: string
): Promise<FixedCostInstance[]> => {
  const templates = await getFixedCosts(userId);
  
  // Fetch all existing instances for this month in one query
  const existingInstances = await getFixedCostInstances(month, userId);
  const existingInstancesMap = new Map<string, FixedCostInstance>();
  existingInstances.forEach(inst => {
    existingInstancesMap.set(inst.fixedCostId, inst);
  });

  const instances: FixedCostInstance[] = [];
  const instancesToCreate: Array<{ templateId: string }> = [];

  // Check which templates need instances created
  for (const template of templates) {
    const existing = existingInstancesMap.get(template.id);
    if (existing) {
      instances.push(existing);
    } else {
      instancesToCreate.push({ templateId: template.id });
    }
  }

  // Only create instances that don't exist (reduces POST calls)
  for (const { templateId } of instancesToCreate) {
    const instance = await getOrCreateFixedCostInstance(
      templateId,
      month,
      userId
    );
    instances.push(instance);
  }

  return instances;
};
