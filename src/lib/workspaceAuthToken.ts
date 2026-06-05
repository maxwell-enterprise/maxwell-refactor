const STORAGE_KEY = 'maxwell_workspace_jwt';
/** Cleared on login so default dashboard wins — see `clearDashboardNavigationSession`. */
import { clearDashboardNavigationSession } from './dashboardNavigation';
const TOKEN_CHANGED_EVENT = 'maxwell:workspace-token-changed';
const BACKEND_DOWN_REDIRECT_GUARD = 'maxwell:backend-down-redirected-at';
const BACKEND_FAILURE_COUNTER_KEY = 'maxwell:backend-failure-counter';
const BACKEND_FAILURE_WINDOW_START_KEY = 'maxwell:backend-failure-window-start';

/**
 * Many components may call this in the same synchronous turn when the API errors;
 * batch into one counter increment per macrotask tick.
 */
let failureBatchScheduled = false;

export function getWorkspaceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setWorkspaceToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  const prev = localStorage.getItem(STORAGE_KEY);
  const clearSavedDashboardView = () => {
    clearDashboardNavigationSession();
  };

  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
    clearSavedDashboardView();
  } else {
    if (prev !== token) {
      clearSavedDashboardView();
    }
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
 *
 * Tuned to avoid false logouts when opening heavy views (e.g. Security): parallel
 * requests or transient 503s must not clear JWT in a few seconds.
 */
function applyOneBackendFailureSignal(): void {
  const now = Date.now();
  const windowMs = 30_000;
  const threshold = 6;

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

export function registerBackendFailureAndMaybeLogout(): void {
  if (typeof window === 'undefined') return;
  if (!getWorkspaceToken()) return;

  if (failureBatchScheduled) return;
  failureBatchScheduled = true;
  queueMicrotask(() => {
    failureBatchScheduled = false;
    applyOneBackendFailureSignal();
  });
}
