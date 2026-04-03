const PRODUCTION_API_BASE_URL =
  'https://server-maxwell-production.up.railway.app/fe';
const LOCAL_API_BASE_URL = 'http://localhost:3002/fe';

function isLocalHostname(hostname: string): boolean {
  return /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/i.test(
    hostname.trim(),
  );
}

function isLikelyProductionRuntime(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return (vercelEnv ?? '').toLowerCase() === 'production';
}

function looksLikeLocalApiUrl(url: string): boolean {
  return (
    /localhost|127\.0\.0\.1/i.test(url) ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(url)
  );
}

/** Hosted Railway / production URL in env — ignored during `next dev` unless forced. */
function looksLikeHostedProductionApi(url: string): boolean {
  return /server-maxwell-production|\.up\.railway\.app/i.test(url);
}

/**
 * Resolves the Nest API base (global prefix `/fe`).
 * - `next dev`: uses local Nest by default (see `.env.development`). Hosted URLs
 *   in `.env` / `.env.local` are ignored unless `NEXT_PUBLIC_USE_PRODUCTION_API=true`.
 * - `next build` / Vercel: uses `NEXT_PUBLIC_API_BASE_URL` from `.env.production` or the dashboard.
 * - If a production build would call localhost from a deployed origin, we swap to production.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const browserHost =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const browserOnRemoteHost = browserHost !== '' && !isLocalHostname(browserHost);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    const forceProd =
      process.env.NEXT_PUBLIC_USE_PRODUCTION_API === 'true' ||
      process.env.NEXT_PUBLIC_USE_PRODUCTION_API === '1';
    if (forceProd) {
      if (raw && !looksLikeLocalApiUrl(raw)) return raw;
      return PRODUCTION_API_BASE_URL;
    }
    if (raw && raw.length > 0 && !looksLikeHostedProductionApi(raw)) {
      return raw;
    }
    return LOCAL_API_BASE_URL;
  }

  if (!raw) {
    return browserOnRemoteHost || isLikelyProductionRuntime()
      ? PRODUCTION_API_BASE_URL
      : LOCAL_API_BASE_URL;
  }
  const looksLocal = looksLikeLocalApiUrl(raw);
  if (looksLocal && (browserOnRemoteHost || isLikelyProductionRuntime())) {
    return PRODUCTION_API_BASE_URL;
  }
  return raw;
}

// ENVIRONMENT VARIABLES (Next.js uses process.env.NEXT_PUBLIC_* for client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const apiBaseUrl = resolveApiBaseUrl();

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
    COMMUNICATION:  (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Email & WA
    CONTENT:        (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // CMS
    COMMERCE:       resolveDomainMode(process.env.NEXT_PUBLIC_COMMERCE_BACKEND),
    SYSTEM:         (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // Logs, Settings, Queue
    INVITATIONS:    resolveDomainMode(process.env.NEXT_PUBLIC_INVITATIONS_BACKEND),
    ENTITLEMENTS:   resolveDomainMode(process.env.NEXT_PUBLIC_ENTITLEMENTS_BACKEND),
    ATTENDANCE:     resolveDomainMode(process.env.NEXT_PUBLIC_ATTENDANCE_BACKEND)
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
