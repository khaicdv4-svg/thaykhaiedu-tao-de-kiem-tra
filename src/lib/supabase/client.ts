/**
 * ThayKhaiEdu - Supabase Browser Client
 * Creates a singleton client for client-side components.
 */

import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig, isSupabaseConfigured } from './config';

export function createClient() {
  if (!isSupabaseConfigured()) {
    // Return null or placeholder if credentials are missing
    return null;
  }

  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
}
