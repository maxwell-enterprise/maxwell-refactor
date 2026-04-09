import { APP_CONFIG } from '../../lib/config';
import { getWorkspaceToken } from '../../lib/workspaceAuthToken';

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
    };
    if (Array.isArray(j.message)) {
      return j.message.join('; ');
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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);
  let response: Response;
  try {
    const token = getWorkspaceToken();
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
  } catch (err) {
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
      response.status === 502 || response.status === 503 || response.status === 504
        ? 'Service unavailable'
        : response.status === 500
          ? 'Server error'
          : `Request failed (${response.status})`;
    throw new ApiRequestError(response.status, `${label}: ${detail}`);
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
