/**
 * Supabase Client Configuration
 * 
 * Initializes Supabase client with real-time support
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

// Create Supabase client with real-time enabled
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper to convert Supabase timestamp to ISO string
 */
export const toISOString = (date: string | Date | null | undefined): string => {
  if (!date) return new Date().toISOString();
  if (typeof date === "string") return date;
  if (date instanceof Date) return date.toISOString();
  return new Date().toISOString();
};

/**
 * Helper to convert ISO string to Date
 */
export const toDate = (date: string | Date | null | undefined): Date => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  return new Date(date);
};
