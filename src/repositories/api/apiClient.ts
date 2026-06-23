import { APP_CONFIG } from '../../lib/config';
import {
  getWorkspaceToken,
  markBackendHealthy,
  registerBackendFailureAndMaybeLogout,
} from '../../lib/workspaceAuthToken';

function buildUrl(path: string): string {
  const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/** Nest / common JSON error bodies → single readable line (avoids throwing raw JSON in UI). */
async function parseHttpErrorBody(response: Response): Promise<string> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return response.statusText || `HTTP ${response.status}`;
  }
  try {
    const j = JSON.parse(trimmed) as {
      message?: string | string[];
      error?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
    if (Array.isArray(j.message)) {
      return j.message.join('; ');
    }
    if (Array.isArray(j.errors) && j.errors.length > 0) {
      const validationDetails = j.errors
        .map((entry) => {
          const field = typeof entry.field === 'string' ? entry.field : '';
          const message = typeof entry.message === 'string' ? entry.message : '';
          if (field && message) return `${field}: ${message}`;
          return field || message;
        })
        .filter(Boolean)
        .join('; ');
      if (validationDetails) {
        if (typeof j.message === 'string' && j.message) {
          return `${j.message} (${validationDetails})`;
        }
        return validationDetails;
      }
    }
    if (typeof j.message === 'string' && j.message) {
      return j.message;
    }
    if (typeof j.error === 'string' && j.error) {
      return j.error;
    }
  } catch {
    /* not JSON */
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

/** Same as `RequestInit` plus flags that must not be passed to `fetch`. */
export type ApiRequestOptions = RequestInit & {
  /**
   * When true, HTTP failures do not increment the global “backend down → logout” counter.
   * Use for best-effort calls (e.g. cart sync) so optional features do not evict the session.
   */
  skipBackendFailureTracking?: boolean;
};

export async function apiRequest<T>(
  path: string,
  init: ApiRequestOptions = {},
): Promise<T> {
  const { skipBackendFailureTracking, ...fetchInit } = init;
  const url = buildUrl(path);

  const buildHeaders = (token: string | null): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(fetchInit.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const doFetch = (token: string | null) =>
    fetch(url, {
      ...fetchInit,
      credentials: 'include',
      headers: buildHeaders(token),
      cache: 'no-store',
    });

  let token = getWorkspaceToken();
  let response: Response;
  try {
    response = await doFetch(token);
    if (response.status === 401 && token) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const retryToken = getWorkspaceToken();
      if (retryToken) {
        token = retryToken;
        response = await doFetch(retryToken);
      }
    }
    // 503 is often temporary (overload, upstream); do not clear JWT on a few 503s.
    if (
      !skipBackendFailureTracking &&
      token &&
      [500, 502, 504].includes(response.status)
    ) {
      registerBackendFailureAndMaybeLogout();
    } else {
      markBackendHealthy();
    }
  } catch (err) {
    if (!skipBackendFailureTracking && getWorkspaceToken()) {
      registerBackendFailureAndMaybeLogout();
    }
    const base = APP_CONFIG.API_BASE_URL;
    const hint =
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      (err as Error).message === 'Failed to fetch'
        ? `Network error: cannot reach ${url}. Is Nest running and reachable (API base: ${base})?`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new Error(hint);
  }

  if (!response.ok) {
    const detail = await parseHttpErrorBody(response);
    const label =
      response.status === 401
        ? 'Unauthorized'
        : response.status === 502 || response.status === 503 || response.status === 504
          ? 'Service unavailable'
          : response.status === 500
            ? 'Server error'
            : `Request failed (${response.status})`;
    const suffix =
      response.status === 401
        ? `${detail}. Try refreshing the page or signing in again.`
        : detail;
    throw new ApiRequestError(response.status, `${label}: ${suffix}`);
  }

  // DELETE often returns 204; Nest can also return 200 with an empty body for void handlers.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
