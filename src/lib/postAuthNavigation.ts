/**
 * Preserve `/?product=…&discount=…` (campaign deep links) across Google OAuth.
 * Set immediately before redirecting to `/fe/auth/google`; consumed on `/auth/callback`.
 */
export const OAUTH_RETURN_SEARCH_KEY = 'maxwell_oauth_return_search';

/** Full path (e.g. `/claim?token=…`) to restore after OAuth. */
export const OAUTH_RETURN_PATH_KEY = 'maxwell_oauth_return_path';

export function stashOAuthReturnSearch(search: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(OAUTH_RETURN_SEARCH_KEY, search || '');
}

export function peekOAuthReturnSearch(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(OAUTH_RETURN_SEARCH_KEY) || '';
}

export function consumeOAuthReturnSearch(): string {
  if (typeof window === 'undefined') return '';
  const s = sessionStorage.getItem(OAUTH_RETURN_SEARCH_KEY) || '';
  sessionStorage.removeItem(OAUTH_RETURN_SEARCH_KEY);
  return s;
}

export function stashOAuthReturnPath(path: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return;
  sessionStorage.setItem(OAUTH_RETURN_PATH_KEY, trimmed);
}

export function consumeOAuthReturnPath(): string {
  if (typeof window === 'undefined') return '';
  const p = sessionStorage.getItem(OAUTH_RETURN_PATH_KEY) || '';
  sessionStorage.removeItem(OAUTH_RETURN_PATH_KEY);
  return p;
}
