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
    return snapshot.docs.map((doc) =>
      docToInstance(doc.id, doc.data() as InvestmentInstanceDoc)
    );
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
  const q = query(
    collection(db, INSTANCES_COLLECTION),
    where("investmentId", "==", investmentId),
    where("userId", "==", userId),
    where("month", "==", month)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return docToInstance(snapshot.docs[0].id, snapshot.docs[0].data() as InvestmentInstanceDoc);
  }

  // Get template to use default amount
  const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, investmentId));
  if (!templateDoc.exists()) {
    throw new Error("Investment template not found");
  }

  const template = docToInvestment(templateDoc.id, templateDoc.data() as InvestmentDoc);

  // Create new instance
  const now = Timestamp.now();
  const docData: InvestmentInstanceDoc = {
    investmentId,
    userId,
    month,
    amount: template.defaultAmount,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INSTANCES_COLLECTION), docData);

  return {
    id: docRef.id,
    investmentId,
    userId,
    month,
    amount: template.defaultAmount,
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
export const ensureInvestmentInstancesForMonth = async (
  month: string,
  userId: string
): Promise<InvestmentInstance[]> => {
  const templates = await getInvestments(userId);
  const instances: InvestmentInstance[] = [];

  for (const template of templates) {
    const instance = await getOrCreateInvestmentInstance(
      template.id,
      month,
      userId
    );
    instances.push(instance);
  }

  return instances;
};
