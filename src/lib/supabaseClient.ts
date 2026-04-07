import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG } from './config';

// Create a single supabase client for interacting with your database
const supabaseUrl = APP_CONFIG.SUPABASE_URL;
const supabaseAnonKey = APP_CONFIG.SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

// Avoid a server-side hard dependency on @supabase/supabase-js for routes that
// never use Supabase at runtime, such as public landing pages with external API mode.
if (
  typeof window !== 'undefined' &&
  !APP_CONFIG.EXTERNAL_API_ONLY &&
  supabaseUrl &&
  supabaseAnonKey
) {
  try {
    const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    supabaseClient = null;
  }
}

export const supabase = supabaseClient;

// Helper to check connection readiness
export const isSupabaseConfigured = () => {
  return !!supabase;
};
