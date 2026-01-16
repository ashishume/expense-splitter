import { createClient, RealtimeChannel } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Using localStorage fallback."
  );
}

// Create client without strict typing to avoid issues with dynamic table operations
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Realtime subscription helper
export type RealtimeSubscription = RealtimeChannel;
