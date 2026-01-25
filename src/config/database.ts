/**
 * Database Configuration
 * 
 * Controls which database provider to use (Firebase or Supabase)
 * Can be set via environment variable or localStorage
 */

export type DatabaseProvider = "firebase" | "supabase";

const DEFAULT_PROVIDER: DatabaseProvider = "firebase";

/**
 * Get the current database provider
 * Priority: localStorage > environment variable > default
 */
export const getDatabaseProvider = (): DatabaseProvider => {
  // Check localStorage first (for runtime switching)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("database_provider");
    if (stored === "firebase" || stored === "supabase") {
      return stored as DatabaseProvider;
    }
  }

  // Fall back to environment variable
  const envProvider = import.meta.env.VITE_DATABASE_PROVIDER;
  if (envProvider === "firebase" || envProvider === "supabase") {
    return envProvider as DatabaseProvider;
  }

  // Default to Firebase for backward compatibility
  return DEFAULT_PROVIDER;
};

/**
 * Set the database provider (stores in localStorage)
 */
export const setDatabaseProvider = (provider: DatabaseProvider): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("database_provider", provider);
    // Reload page to apply changes
    window.location.reload();
  }
};

/**
 * Check if currently using Supabase
 */
export const isUsingSupabase = (): boolean => {
  return getDatabaseProvider() === "supabase";
};

/**
 * Check if currently using Firebase
 */
export const isUsingFirebase = (): boolean => {
  return getDatabaseProvider() === "firebase";
};
