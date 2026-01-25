/**
 * Database Adapter
 * 
 * Routes to Firebase or Supabase implementations based on configuration
 */

import { getDatabaseProvider } from "../../config/database";

// Re-export types for convenience
export type { Unsubscribe } from "firebase/firestore";

/**
 * Database adapter factory
 * Returns the appropriate storage service based on configuration
 */
export const getStorageService = <T>(firebaseService: T, supabaseService: T): T => {
  const provider = getDatabaseProvider();
  return provider === "supabase" ? supabaseService : firebaseService;
};

/**
 * Helper to create a dynamic import based on provider
 */
export const createDynamicAdapter = async <T>(
  firebaseModule: string,
  supabaseModule: string
): Promise<T> => {
  const provider = getDatabaseProvider();
  
  if (provider === "supabase") {
    const module = await import(supabaseModule);
    return module as T;
  } else {
    const module = await import(firebaseModule);
    return module as T;
  }
};
