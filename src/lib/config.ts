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
const externalApiOnly = process.env.NEXT_PUBLIC_EXTERNAL_API_ONLY === 'true';

const hasSupabaseKeys = !!(supabaseUrl && supabaseAnonKey);

export type BackendMode = 'MOCK' | 'SUPABASE' | 'API';

/**
 * Per-domain data source. Override with `NEXT_PUBLIC_<NAME>_BACKEND=API|SUPABASE|MOCK`.
 * When unset: **`API`** — one door via `NEXT_PUBLIC_API_BASE_URL` (Nest `/fe` + path per feature).
 * Use explicit `SUPABASE` / `MOCK` only for hybrid (e.g. members still on Supabase).
 */
function resolveDomainMode(preferred: string | undefined): BackendMode {
  const normalized = preferred?.trim().toUpperCase();

  if (normalized === 'API') {
    return 'API';
  }

  if (normalized === 'SUPABASE') {
    return hasSupabaseKeys ? 'SUPABASE' : 'MOCK';
  }

  if (normalized === 'MOCK') {
    return 'MOCK';
  }

  return 'API';
}

export const APP_CONFIG = {
  // GLOBAL FORCE MOCK (Overrides everything else if true)
  USE_MOCK_GLOBAL: false, 
  EXTERNAL_API_ONLY: externalApiOnly,
  
  // Supabase Credentials
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  API_BASE_URL: apiBaseUrl,

  // DOMAIN ROUTING — unset → `API` (Nest at API_BASE_URL). Override per domain with NEXT_PUBLIC_*_BACKEND.
  DOMAINS: {
    AUTH:           (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    MEMBERS:        resolveDomainMode(process.env.NEXT_PUBLIC_MEMBERS_BACKEND),
    PRODUCTS:       resolveDomainMode(process.env.NEXT_PUBLIC_PRODUCTS_BACKEND),
    TRANSACTIONS:   resolveDomainMode(process.env.NEXT_PUBLIC_TRANSACTIONS_BACKEND), // manual PO/expense + ledger paths → Nest when API
    /** Gateway logs, AR settle, refunds → `ApiPaymentRepository` / Nest `/fe/store/payment-transactions/*` when API */
    PAYMENTS:       resolveDomainMode(process.env.NEXT_PUBLIC_PAYMENTS_BACKEND),
    EVENTS:         resolveDomainMode(process.env.NEXT_PUBLIC_EVENTS_BACKEND),
    OPS:            resolveDomainMode(process.env.NEXT_PUBLIC_OPS_BACKEND),
    GAMIFICATION:   (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode,
    COMMUNICATION:  resolveDomainMode(process.env.NEXT_PUBLIC_COMMUNICATION_BACKEND), // Email & WA
    CONTENT:        (hasSupabaseKeys ? 'SUPABASE' : 'MOCK') as BackendMode, // CMS
    COMMERCE:       resolveDomainMode(process.env.NEXT_PUBLIC_COMMERCE_BACKEND),
    /** Automations, security logs, AI usage, DB meta — Nest `/fe/system/*` when `API` */
    SYSTEM:         resolveDomainMode(process.env.NEXT_PUBLIC_SYSTEM_BACKEND),
    INVITATIONS:    resolveDomainMode(process.env.NEXT_PUBLIC_INVITATIONS_BACKEND),
    ENTITLEMENTS:   resolveDomainMode(process.env.NEXT_PUBLIC_ENTITLEMENTS_BACKEND),
    ATTENDANCE:     resolveDomainMode(process.env.NEXT_PUBLIC_ATTENDANCE_BACKEND),
    /** Contract Center: clause library, templates, instances → Nest `/fe/contracts/*` when API */
    CONTRACTS:      resolveDomainMode(process.env.NEXT_PUBLIC_CONTRACTS_BACKEND),
    /** Youth Impact dashboard → Nest `/fe/youth-impact/metrics` when API */
    YOUTH:          resolveDomainMode(process.env.NEXT_PUBLIC_YOUTH_BACKEND),
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
