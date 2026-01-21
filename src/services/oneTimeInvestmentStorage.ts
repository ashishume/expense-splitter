/**
 * One-Time Investment Storage Service - Firebase Firestore
 * Manages one-time investments (e.g., US stocks, occasional purchases)
 */

import type { OneTimeInvestment } from "../types/personalExpense";
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

const COLLECTION_NAME = "one_time_investments";

// Firebase document type
interface OneTimeInvestmentDoc {
  userId: string;
  amount: number;
  description: string;
  date: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to OneTimeInvestment
const docToInvestment = (docId: string, data: OneTimeInvestmentDoc): OneTimeInvestment => ({
  id: docId,
  userId: data.userId,
  amount: data.amount,
  description: data.description,
  date: data.date,
  createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
});

// ============================================
// CRUD Operations
// ============================================

export const createOneTimeInvestment = async (
  investment: Omit<OneTimeInvestment, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<OneTimeInvestment> => {
  try {
    const now = Timestamp.now();
    const docData: OneTimeInvestmentDoc = {
      userId,
      amount: investment.amount,
      description: investment.description,
      date: investment.date,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

    return {
      id: docRef.id,
      ...investment,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
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
    // Get all investments for the user
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    let investments = snapshot.docs.map((doc) =>
      docToInvestment(doc.id, doc.data() as OneTimeInvestmentDoc)
    );

    // Filter by month (client-side to avoid index requirements)
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${lastDay.toString().padStart(2, "0")}T23:59:59.999Z`;

    investments = investments.filter(
      (inv) => inv.date >= startDate && inv.date <= endDate
    );

    // Sort by date descending
    investments.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

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
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data() as OneTimeInvestmentDoc;
  if (data.userId !== userId) {
    return null;
  }

  return docToInvestment(docSnap.id, data);
};

export const updateOneTimeInvestment = async (
  id: string,
  updates: Partial<Omit<OneTimeInvestment, "id" | "createdAt">>,
  userId: string
): Promise<OneTimeInvestment | null> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const existingData = docSnap.data() as OneTimeInvestmentDoc;
  if (existingData.userId !== userId) {
    throw new Error("Unauthorized");
  }

  const updateData: Partial<OneTimeInvestmentDoc> & { updatedAt: Timestamp } = {
    updatedAt: Timestamp.now(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.date !== undefined) updateData.date = updates.date;

  await updateDoc(docRef, updateData);

  const updatedSnap = await getDoc(docRef);
  if (!updatedSnap.exists()) {
    return null;
  }

  return docToInvestment(updatedSnap.id, updatedSnap.data() as OneTimeInvestmentDoc);
};

export const deleteOneTimeInvestment = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return false;
  }

  const data = docSnap.data() as OneTimeInvestmentDoc;
  if (data.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await deleteDoc(docRef);
  return true;
};
