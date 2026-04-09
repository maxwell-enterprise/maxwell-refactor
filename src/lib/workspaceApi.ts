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

/** Authenticated fetch to Nest workspace routes (JWT from localStorage). */
export async function workspaceFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getWorkspaceToken();
  try {
    const response = await fetch(workspaceApiUrl(path), {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (token && [500, 502, 503, 504].includes(response.status)) {
      registerBackendFailureAndMaybeLogout();
    } else {
      markBackendHealthy();
    }

    return response;
  } catch (error) {
    if (token) {
      registerBackendFailureAndMaybeLogout();
    }
    throw error;
  }
}
