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
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";

const TEMPLATES_COLLECTION = "fixed_costs";
const INSTANCES_COLLECTION = "fixed_cost_instances";

// Helper to format date as YYYY-MM using local timezone
const formatMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

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
    return snapshot.docs.map((doc) =>
      docToInstance(doc.id, doc.data() as FixedCostInstanceDoc)
    );
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
  const q = query(
    collection(db, INSTANCES_COLLECTION),
    where("fixedCostId", "==", fixedCostId),
    where("userId", "==", userId),
    where("month", "==", month)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return docToInstance(snapshot.docs[0].id, snapshot.docs[0].data() as FixedCostInstanceDoc);
  }

  // Get template to use default amount
  const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, fixedCostId));
  if (!templateDoc.exists()) {
    throw new Error("Fixed cost template not found");
  }

  const template = docToFixedCost(templateDoc.id, templateDoc.data() as FixedCostDoc);

  // Create new instance
  const now = Timestamp.now();
  const docData: FixedCostInstanceDoc = {
    fixedCostId,
    userId,
    month,
    amount: template.defaultAmount,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INSTANCES_COLLECTION), docData);

  return {
    id: docRef.id,
    fixedCostId,
    userId,
    month,
    amount: template.defaultAmount,
    isEnabled: true,
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
export const ensureFixedCostInstancesForMonth = async (
  month: string,
  userId: string
): Promise<FixedCostInstance[]> => {
  const templates = await getFixedCosts(userId);
  const instances: FixedCostInstance[] = [];

  for (const template of templates) {
    const instance = await getOrCreateFixedCostInstance(
      template.id,
      month,
      userId
    );
    instances.push(instance);
  }

  return instances;
};
