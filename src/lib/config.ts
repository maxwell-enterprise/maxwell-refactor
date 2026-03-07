
// ENVIRONMENT VARIABLES
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export type BackendMode = 'MOCK' | 'SUPABASE';

export const APP_CONFIG = {
  // GLOBAL FORCE MOCK (Overrides everything else if true)
  USE_MOCK_GLOBAL: false, 
  
  // Supabase Credentials
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,

  // DOMAIN ROUTING CONFIGURATION
  // Determines the data source for each specific business domain.
  // If keys are missing, these automatically fallback to 'MOCK'.
  DOMAINS: {
    AUTH:           (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    MEMBERS:        (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    PRODUCTS:       (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    TRANSACTIONS:   (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Finance Ledger
    PAYMENTS:       (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Payment Gateway
    EVENTS:         (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    OPS:            (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Inventory & Workflows
    GAMIFICATION:   (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    COMMUNICATION:  (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Email & WA
    CONTENT:        (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // CMS
    COMMERCE:       (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Shopping Carts
    SYSTEM:         (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode  // Logs, Settings, Queue
  },

  // FEATURE FLAGS
  FEATURES: {
    AUTH: hasSupabaseKeys
  },

  // Legacy compatibility getter
  get USE_MOCK() {
    return this.USE_MOCK_GLOBAL || !hasSupabaseKeys;
  }
};
