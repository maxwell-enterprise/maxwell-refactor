const STORAGE_KEY = 'maxwell_workspace_jwt';
const TOKEN_CHANGED_EVENT = 'maxwell:workspace-token-changed';
const BACKEND_DOWN_REDIRECT_GUARD = 'maxwell:backend-down-redirected-at';
const BACKEND_FAILURE_COUNTER_KEY = 'maxwell:backend-failure-counter';
const BACKEND_FAILURE_WINDOW_START_KEY = 'maxwell:backend-failure-window-start';

export function getWorkspaceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setWorkspaceToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, token);
  }
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function getWorkspaceTokenChangedEventName(): string {
  return TOKEN_CHANGED_EVENT;
}

/**
 * Global safety valve for dashboard/API spam when backend is down:
 * clear local JWT session and force user back to login/root once.
 */
export function forceLogoutOnBackendDown(): void {
  if (typeof window === 'undefined') return;
  const token = getWorkspaceToken();
  if (!token) return;

  // avoid repeated hard redirects from many concurrent failing requests
  const now = Date.now();
  const last = Number(sessionStorage.getItem(BACKEND_DOWN_REDIRECT_GUARD) || '0');
  if (Number.isFinite(last) && now - last < 4000) {
    setWorkspaceToken(null);
    return;
  }

  sessionStorage.setItem(BACKEND_DOWN_REDIRECT_GUARD, String(now));
  setWorkspaceToken(null);
  window.location.replace('/?auth_error=backend_unreachable');
}

export function markBackendHealthy(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(BACKEND_FAILURE_COUNTER_KEY);
  sessionStorage.removeItem(BACKEND_FAILURE_WINDOW_START_KEY);
}

/**
 * Tolerate short local restarts (FE/BE stop-start), but logout if backend
 * is consistently unreachable.
 */
export function registerBackendFailureAndMaybeLogout(): void {
  if (typeof window === 'undefined') return;
  if (!getWorkspaceToken()) return;

  const now = Date.now();
  const windowMs = 12_000;
  const threshold = 3;

  const rawWindowStart = Number(
    sessionStorage.getItem(BACKEND_FAILURE_WINDOW_START_KEY) || '0',
  );
  const rawCounter = Number(
    sessionStorage.getItem(BACKEND_FAILURE_COUNTER_KEY) || '0',
  );

  const withinWindow =
    Number.isFinite(rawWindowStart) &&
    rawWindowStart > 0 &&
    now - rawWindowStart <= windowMs;

  const nextWindowStart = withinWindow ? rawWindowStart : now;
  const nextCounter = withinWindow ? rawCounter + 1 : 1;

  sessionStorage.setItem(
    BACKEND_FAILURE_WINDOW_START_KEY,
    String(nextWindowStart),
  );
  sessionStorage.setItem(BACKEND_FAILURE_COUNTER_KEY, String(nextCounter));

  if (nextCounter >= threshold) {
    forceLogoutOnBackendDown();
  }
}
