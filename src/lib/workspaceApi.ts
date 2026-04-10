import { APP_CONFIG } from './config';
import {
  getWorkspaceToken,
  markBackendHealthy,
  registerBackendFailureAndMaybeLogout,
} from './workspaceAuthToken';

/** Nest `/fe` base (e.g. `http://localhost:3000/fe` with dev rewrite). */
export function workspaceApiUrl(path: string): string {
  const base = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export type WorkspaceFetchInit = RequestInit & {
  /**
   * When true, failures do not count toward “backend down” forced logout.
   * Use for `/auth/session` and other health checks so transient errors do not clear JWT.
   */
  skipBackendFailureTracking?: boolean;
};

/** HTTP statuses that suggest the API process is broken (not a single overloaded route). Omit 503 — often transient. */
const BACKEND_DOWN_HTTP = new Set([500, 502, 504]);

/**
 * Account-deletion routes are optional (migration-gated). Their failures must not increment
 * the global “backend down → logout” counter so Security/dashboard behave like before this feature.
 */
function isAccountDeletionIsolationPath(path: string): boolean {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.includes('account-deletion-requests')) return true;
  if (p === '/me/account/deletion-status') return true;
  if (p === '/me/account/deletion-request') return true;
  return false;
}

/** Authenticated fetch to Nest workspace routes (JWT from localStorage). */
export async function workspaceFetch(
  path: string,
  init: WorkspaceFetchInit = {},
): Promise<Response> {
  const { skipBackendFailureTracking, ...fetchInit } = init;
  const skipTracking =
    skipBackendFailureTracking === true ||
    isAccountDeletionIsolationPath(path);
  const token = getWorkspaceToken();
  try {
    const response = await fetch(workspaceApiUrl(path), {
      ...fetchInit,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(fetchInit.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!skipTracking && token && BACKEND_DOWN_HTTP.has(response.status)) {
      registerBackendFailureAndMaybeLogout();
    } else {
      markBackendHealthy();
    }

    return response;
  } catch (error) {
    if (token && !skipTracking) {
      registerBackendFailureAndMaybeLogout();
    }
    throw error;
  }
}
