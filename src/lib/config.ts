const PRODUCTION_API_BASE_URL =
  'https://server-maxwell-production.up.railway.app/fe';
const LOCAL_API_BASE_URL = 'http://localhost:3002/fe';

/**
 * Resolves the Nest API base (global prefix `/fe`).
 * Vercel builds often set NEXT_PUBLIC_API_BASE_URL to localhost by mistake; in
 * production we never call localhost from the browser.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production'
      ? PRODUCTION_API_BASE_URL
      : LOCAL_API_BASE_URL;
  }
  const looksLocal =
    /localhost|127\.0\.0\.1/i.test(raw) ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(raw);
  if (looksLocal && process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_BASE_URL;
  }
  return raw;
}

// ENVIRONMENT VARIABLES (Next.js uses process.env.NEXT_PUBLIC_* for client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const apiBaseUrl = resolveApiBaseUrl();
const externalApiOnly = process.env.NEXT_PUBLIC_EXTERNAL_API_ONLY === 'true';

const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export type BackendMode = 'MOCK' | 'SUPABASE' | 'API';

function resolveDomainMode(preferred: string | undefined): BackendMode {
  const normalized = preferred?.toUpperCase();

  if (normalized === 'API') {
    return 'API';
  }

  if (normalized === 'SUPABASE') {
    return hasSupabaseKeys ? 'SUPABASE' : 'MOCK';
  }

  if (normalized === 'MOCK') {
    return 'MOCK';
  }

  return hasSupabaseKeys ? 'SUPABASE' : 'MOCK';
}

export const APP_CONFIG = {
  // GLOBAL FORCE MOCK (Overrides everything else if true)
  USE_MOCK_GLOBAL: false, 
  EXTERNAL_API_ONLY: externalApiOnly,
  
  // Supabase Credentials
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  API_BASE_URL: apiBaseUrl,

  // DOMAIN ROUTING CONFIGURATION
  // Determines the data source for each specific business domain.
  // If keys are missing, these automatically fallback to 'MOCK'.
  DOMAINS: {
    AUTH:           (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    MEMBERS:        resolveDomainMode(process.env.NEXT_PUBLIC_MEMBERS_BACKEND),
    PRODUCTS:       resolveDomainMode(process.env.NEXT_PUBLIC_PRODUCTS_BACKEND),
    TRANSACTIONS:   (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Finance Ledger
    PAYMENTS:       (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Payment Gateway
    EVENTS:         resolveDomainMode(process.env.NEXT_PUBLIC_EVENTS_BACKEND),
    OPS:            resolveDomainMode(process.env.NEXT_PUBLIC_OPS_BACKEND),
    GAMIFICATION:   (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    COMMUNICATION:  resolveDomainMode(process.env.NEXT_PUBLIC_COMMUNICATION_BACKEND), // Email & WA
    CONTENT:        (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // CMS
    COMMERCE:       resolveDomainMode(process.env.NEXT_PUBLIC_COMMERCE_BACKEND),
    SYSTEM:         (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Logs, Settings, Queue
    INVITATIONS:    resolveDomainMode(process.env.NEXT_PUBLIC_INVITATIONS_BACKEND),
    ENTITLEMENTS:   resolveDomainMode(process.env.NEXT_PUBLIC_ENTITLEMENTS_BACKEND),
    ATTENDANCE:     resolveDomainMode(process.env.NEXT_PUBLIC_ATTENDANCE_BACKEND)
  },

  // FEATURE FLAGS
  FEATURES: {
    AUTH: hasSupabaseKeys && !externalApiOnly,
  },

  // Legacy compatibility getter
  get USE_MOCK() {
    if (this.EXTERNAL_API_ONLY) return false;
    return this.USE_MOCK_GLOBAL || !hasSupabaseKeys;
  }
};

export function assertExternalApiMode(feature: string, mode: BackendMode): void {
  if (externalApiOnly && mode !== 'API') {
    throw new Error(
      `[External API Only] ${feature} is not allowed to use ${mode}. Configure an API backend before testing this feature.`,
    );
  }
}
