import { APP_CONFIG } from './config';
import { getWorkspaceToken } from './workspaceAuthToken';

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
  return fetch(workspaceApiUrl(path), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
