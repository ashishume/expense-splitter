/**
 * Investment Storage Service - Firebase Firestore
 * Manages investment templates (SIPs) and monthly instances
 */

import type { Investment, InvestmentInstance } from "../types/personalExpense";
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

const TEMPLATES_COLLECTION = "investments";
const INSTANCES_COLLECTION = "investment_instances";


// Firebase document types
interface InvestmentDoc {
  userId: string;
  name: string;
  defaultAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface InvestmentInstanceDoc {
  investmentId: string;
  userId: string;
  month: string; // YYYY-MM format
  amount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to Investment
const docToInvestment = (docId: string, data: InvestmentDoc): Investment => ({
  id: docId,
  userId: data.userId,
  name: data.name,
  defaultAmount: data.defaultAmount,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// Convert Firestore document to InvestmentInstance
const docToInstance = (docId: string, data: InvestmentInstanceDoc): InvestmentInstance => ({
  id: docId,
  investmentId: data.investmentId,
  userId: data.userId,
  month: data.month,
  amount: data.amount,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// ============================================
// Template CRUD Operations
// ============================================

export const createInvestment = async (
  investment: Omit<Investment, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Investment> => {
  try {
    const now = Timestamp.now();
    const docData: InvestmentDoc = {
      userId,
      name: investment.name,
      defaultAmount: investment.defaultAmount,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), docData);

    return {
      id: docRef.id,
      ...investment,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  } catch (error) {
    console.error("Error creating investment:", error);
    throw error;
  }
};

export const getInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      docToInvestment(doc.id, doc.data() as InvestmentDoc)
    );
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
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as InvestmentDoc;
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<InvestmentDoc> & { updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.defaultAmount !== undefined) updateData.defaultAmount = updates.defaultAmount;

  await updateDoc(docRef, updateData);

  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToInvestment(updatedSnap.id, updatedSnap.data() as InvestmentDoc);
};

export const deleteInvestment = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const docRef = doc(db, TEMPLATES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return false;
  }

  const data = docSnap.data() as InvestmentDoc;
  if (data.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Also delete all instances
  const instancesQuery = query(
    collection(db, INSTANCES_COLLECTION),
    where("investmentId", "==", id)
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

export const getInvestmentInstances = async (
  month: string,
  userId: string
): Promise<InvestmentInstance[]> => {
  try {
    const q = query(
      collection(db, INSTANCES_COLLECTION),
      where("userId", "==", userId),
      where("month", "==", month)
    );

    const snapshot = await getDocs(q);
    const instances = snapshot.docs.map((doc) =>
      docToInstance(doc.id, doc.data() as InvestmentInstanceDoc)
    );
    
    // Deduplicate by investmentId (shouldn't be needed, but safety check)
    // If duplicates exist, keep the most recently updated one
    const instanceMap = new Map<string, InvestmentInstance>();
    for (const instance of instances) {
      const existing = instanceMap.get(instance.investmentId);
      if (!existing || new Date(instance.updatedAt) > new Date(existing.updatedAt)) {
        instanceMap.set(instance.investmentId, instance);
      } else if (existing && new Date(instance.updatedAt) === new Date(existing.updatedAt)) {
        // If same timestamp, keep the one with the later created date
        if (new Date(instance.createdAt) > new Date(existing.createdAt)) {
          instanceMap.set(instance.investmentId, instance);
        }
      }
    }
    
    // Log warning if duplicates were found
    if (instances.length > instanceMap.size) {
      console.warn(`Found ${instances.length - instanceMap.size} duplicate investment instances for month ${month}. Deduplicated.`);
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
  // Check if instance exists for this month
  const q = query(
    collection(db, INSTANCES_COLLECTION),
    where("investmentId", "==", investmentId),
    where("userId", "==", userId),
    where("month", "==", month)
  );

  const snapshot = await getDocs(q);
  
  // If multiple instances exist (shouldn't happen, but handle it), use the first one
  if (!snapshot.empty) {
    // If there are multiple, log a warning but use the first one
    if (snapshot.docs.length > 1) {
      console.warn(`Multiple instances found for investmentId ${investmentId}, month ${month}. Using first one.`);
    }
    return docToInstance(snapshot.docs[0].id, snapshot.docs[0].data() as InvestmentInstanceDoc);
  }

  // Get template
  const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, investmentId));
  if (!templateDoc.exists()) {
    throw new Error("Investment template not found");
  }

  const template = docToInvestment(templateDoc.id, templateDoc.data() as InvestmentDoc);

  // Try to find the most recent previous month's instance to copy amount
  // This ensures future months inherit the values from the previous month (like fixed costs)
  const allInstancesQuery = query(
    collection(db, INSTANCES_COLLECTION),
    where("investmentId", "==", investmentId),
    where("userId", "==", userId)
  );
  const allInstancesSnapshot = await getDocs(allInstancesQuery);
  
  let amountToUse = template.defaultAmount;
  
  if (!allInstancesSnapshot.empty) {
    // Find the most recent previous month's instance
    const instances = allInstancesSnapshot.docs
      .map((doc) => docToInstance(doc.id, doc.data() as InvestmentInstanceDoc))
      .filter((inst) => inst.month < month) // Only previous months
      .sort((a, b) => b.month.localeCompare(a.month)); // Sort descending (most recent first)
    
    if (instances.length > 0) {
      // Use the most recent previous month's amount
      const previousInstance = instances[0];
      amountToUse = previousInstance.amount;
    }
  }

  // Create new instance with inherited values
  const now = Timestamp.now();
  const docData: InvestmentInstanceDoc = {
    investmentId,
    userId,
    month,
    amount: amountToUse,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INSTANCES_COLLECTION), docData);

  return {
    id: docRef.id,
    investmentId,
    userId,
    month,
    amount: amountToUse,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
};

export const updateInvestmentInstance = async (
  id: string,
  amount: number,
  userId: string
): Promise<InvestmentInstance | null> => {
  const docRef = doc(db, INSTANCES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as InvestmentInstanceDoc;
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await updateDoc(docRef, {
    amount,
    updatedAt: Timestamp.now(),
  });

  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToInstance(updatedSnap.id, updatedSnap.data() as InvestmentInstanceDoc);
};

// Auto-generate instances for a month from all templates
// For all months (including future), auto-create instances by copying from previous month
// This ensures SIPs are inherited from previous months like fixed costs
// Optimized to fetch all existing instances first, then only create missing ones
export const ensureInvestmentInstancesForMonth = async (
  month: string,
  userId: string
): Promise<InvestmentInstance[]> => {
  const templates = await getInvestments(userId);
  
  // Fetch all existing instances for this month in one query
  const existingInstances = await getInvestmentInstances(month, userId);
  const existingInstancesMap = new Map<string, InvestmentInstance>();
  existingInstances.forEach(inst => {
    existingInstancesMap.set(inst.investmentId, inst);
  });

  const instances: InvestmentInstance[] = [];
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
  // getOrCreateInvestmentInstance will copy from previous month if available
  for (const { templateId } of instancesToCreate) {
    const instance = await getOrCreateInvestmentInstance(
      templateId,
      month,
      userId
    );
    instances.push(instance);
  }

  return instances;
};
