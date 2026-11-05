/**
 * ThayKhaiEdu - Supabase Configuration & Environment Helper
 * Safely handles env validation and explicit data mode separation.
 * NEVER hardcode secret keys or API keys in source files.
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

/**
 * Checks whether Supabase environment variables are properly configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseConfig.url) &&
    Boolean(supabaseConfig.anonKey) &&
    !supabaseConfig.url.includes('YOUR_SUPABASE_URL') &&
    !supabaseConfig.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

export type AppDataMode = 'REAL_DATA' | 'DEMO_MODE';

/**
 * Returns the current application data mode.
 * - REAL_DATA: Supabase is configured; all data comes directly from PostgreSQL.
 * - DEMO_MODE: Supabase is unconfigured; displays strictly labeled sample data.
 */
export function getAppDataMode(): AppDataMode {
  return isSupabaseConfigured() ? 'REAL_DATA' : 'DEMO_MODE';
}
