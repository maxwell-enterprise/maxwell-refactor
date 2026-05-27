import { workspaceFetch } from '../lib/workspaceApi';

export type ActiveVoucher = {
  code: string;
  productId?: string;
  claimedAt: string;
};

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `Request failed with status ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      const msg = Array.isArray(parsed?.message)
        ? parsed.message.join(', ')
        : parsed?.message;
      if (msg && typeof msg === 'string') return msg;
    } catch {
      /* fall through to raw text */
    }
    return text;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export const UserVoucherService = {
  /**
   * Server returns the user's sticky voucher (or null). 404 / 401 are treated as "no voucher" so
   * unauthenticated tabs do not flood logs; real failures (500+) surface to the caller.
   */
  getMyVoucher: async (): Promise<ActiveVoucher | null> => {
    const res = await workspaceFetch('/me/voucher', { method: 'GET' });
    if (res.status === 401 || res.status === 403 || res.status === 404) return null;
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const data = (await res.json()) as { voucher?: ActiveVoucher | null };
    return data.voucher ?? null;
  },

  /**
   * Persists a sticky voucher for the signed-in user. Throws on non-2xx so callers can surface
   * the precise reason (expired, code not found, etc.) via toast.
   */
  claimMyVoucher: async (code: string, productId?: string): Promise<void> => {
    const res = await workspaceFetch('/me/voucher/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, productId }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
  },

  /** Whether this account may still redeem the code (1x per user per voucher). */
  checkVoucherEligibility: async (
    code: string,
  ): Promise<{ eligible: boolean; reason?: string }> => {
    const trimmed = code.trim();
    if (!trimmed) {
      return { eligible: false, reason: 'Kode voucher wajib diisi.' };
    }
    const res = await workspaceFetch(
      `/me/voucher/eligibility?code=${encodeURIComponent(trimmed)}`,
      { method: 'GET' },
    );
    if (res.status === 401 || res.status === 403) {
      return { eligible: true };
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const data = (await res.json()) as { eligible?: boolean; reason?: string };
    return {
      eligible: data.eligible !== false,
      reason: data.reason,
    };
  },
};
