
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0';

/**
 * We access process.env. In some environments, these might be undefined.
 * We ensure we only initialize if we have valid strings to prevent the 
 * "supabaseUrl is required" error.
 */
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create the client if we have the configuration. 
// Otherwise, we export null and handle it in the App logic.
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Phone Pawn Manager: Supabase is not configured. Falling back to Local Storage mode. " +
    "To enable Cloud Sync, set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables."
  );
}
