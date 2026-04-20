import { APP_CONFIG } from './config';
import { getWorkspaceToken } from './workspaceAuthToken';

/**
 * Uploads an event banner image via Nest (same Supabase pipeline as product images).
 * Requires Operations / Marketing / Super Admin (store catalog manager guard on `/products/upload-image`).
 */
export async function uploadEventBannerImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const token = getWorkspaceToken();
  const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/products/upload-image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try {
      const j = JSON.parse(raw) as {
        message?: string | string[];
        errors?: { field?: string; message?: string }[];
      };
      const m = j.message;
      const top = Array.isArray(m) ? m.join(' ') : (m ?? '');
      const fieldMsgs =
        j.errors?.map((e) => `${e.field ?? '?'}: ${e.message ?? ''}`).join('; ') ??
        '';
      detail = [top, fieldMsgs].filter(Boolean).join(' — ') || raw;
    } catch {
      /* keep raw */
    }
    throw new Error(
      typeof detail === 'string' && detail.trim()
        ? detail
        : `Upload failed (${res.status})`,
    );
  }

  let payload: { url?: string };
  try {
    payload = JSON.parse(raw) as { url?: string };
  } catch {
    throw new Error('Upload failed: server returned non-JSON (check API base URL).');
  }
  if (!payload.url) {
    throw new Error('Upload failed: no image URL returned.');
  }
  return payload.url;
}
