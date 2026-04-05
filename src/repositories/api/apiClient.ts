import { APP_CONFIG } from '../../lib/config';

function buildUrl(path: string): string {
  const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
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
    const message = await response.text();
    throw new Error(message || `API request failed with status ${response.status}`);
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
