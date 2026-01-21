/**
 * Salary Income Storage Service - Firebase Firestore
 * Manages salary income template and monthly instances
 */

import type { SalaryIncome, SalaryInstance } from "../types/personalExpense";
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

const TEMPLATES_COLLECTION = "salary_income";
const INSTANCES_COLLECTION = "salary_instances";

// Firebase document types
interface SalaryIncomeDoc {
  userId: string;
  defaultAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SalaryInstanceDoc {
  salaryId: string;
  userId: string;
  month: string; // YYYY-MM format
  amount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to SalaryIncome
const docToSalaryIncome = (docId: string, data: SalaryIncomeDoc): SalaryIncome => ({
  id: docId,
  userId: data.userId,
  defaultAmount: data.defaultAmount,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// Convert Firestore document to SalaryInstance
const docToInstance = (docId: string, data: SalaryInstanceDoc): SalaryInstance => ({
  id: docId,
  salaryId: data.salaryId,
  userId: data.userId,
  month: data.month,
  amount: data.amount,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update existing
      const existingDoc = snapshot.docs[0];
      const docRef = doc(db, TEMPLATES_COLLECTION, existingDoc.id);
      
      await updateDoc(docRef, {
        defaultAmount,
        updatedAt: Timestamp.now(),
      });

      const updatedSnap = await getDoc(docRef);
      return docToSalaryIncome(updatedSnap.id, updatedSnap.data() as SalaryIncomeDoc);
    }

    // Create new
    const now = Timestamp.now();
    const docData: SalaryIncomeDoc = {
      userId,
      defaultAmount,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), docData);

    return {
      id: docRef.id,
      userId,
      defaultAmount,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  } catch (error) {
    console.error("Error creating/updating salary income:", error);
    throw error;
  }
};

export const getSalaryIncome = async (userId: string): Promise<SalaryIncome | null> => {
  try {
    const q = query(
      collection(db, TEMPLATES_COLLECTION),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToSalaryIncome(snapshot.docs[0].id, snapshot.docs[0].data() as SalaryIncomeDoc);
  } catch (error) {
    console.error("Error fetching salary income:", error);
    throw error;
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
    const q = query(
      collection(db, INSTANCES_COLLECTION),
      where("userId", "==", userId),
      where("month", "==", month)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToInstance(snapshot.docs[0].id, snapshot.docs[0].data() as SalaryInstanceDoc);
  } catch (error) {
    console.error("Error fetching salary instance:", error);
    throw error;
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

  // Get template to use default amount
  const templateDoc = await getDoc(doc(db, TEMPLATES_COLLECTION, salaryId));
  if (!templateDoc.exists()) {
    throw new Error("Salary template not found");
  }

  const template = docToSalaryIncome(templateDoc.id, templateDoc.data() as SalaryIncomeDoc);

  // Create new instance
  const now = Timestamp.now();
  const docData: SalaryInstanceDoc = {
    salaryId,
    userId,
    month,
    amount: template.defaultAmount,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INSTANCES_COLLECTION), docData);

  return {
    id: docRef.id,
    salaryId,
    userId,
    month,
    amount: template.defaultAmount,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  };
};

export const updateSalaryInstance = async (
  id: string,
  amount: number,
  userId: string
): Promise<SalaryInstance | null> => {
  const docRef = doc(db, INSTANCES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as SalaryInstanceDoc;
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

  return docToInstance(updatedSnap.id, updatedSnap.data() as SalaryInstanceDoc);
};

// Ensure salary instance exists for a month
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
