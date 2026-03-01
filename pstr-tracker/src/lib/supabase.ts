// =============================================================================
// PSTR Tracker — Supabase Client
// Initializes the Supabase client using Vite environment variables.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

/** Singleton Supabase client instance. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the current auth session, or null if the user is not authenticated.
 * This is a convenience wrapper around supabase.auth.getSession().
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to get session:', error.message);
    }
    return null;
  }
  return data.session;
}
