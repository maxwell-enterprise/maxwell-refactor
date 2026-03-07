import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from './config';

// Create a single supabase client for interacting with your database
const supabaseUrl = APP_CONFIG.SUPABASE_URL;
const supabaseAnonKey = APP_CONFIG.SUPABASE_ANON_KEY;

// Only initialize if keys are present to prevent runtime errors in Mock mode
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helper to check connection readiness
export const isSupabaseConfigured = () => {
  return !!supabase;
};