import { workspaceFetch } from '../lib/workspaceApi';

export type ActiveVoucher = {
  code: string;
  productId?: string;
  claimedAt: string;
};

export const UserVoucherService = {
  getMyVoucher: async (): Promise<ActiveVoucher | null> => {
    const res = await workspaceFetch('/me/voucher', { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json()) as { voucher?: ActiveVoucher | null };
    return data.voucher ?? null;
  },

  claimMyVoucher: async (code: string, productId?: string): Promise<void> => {
    await workspaceFetch('/me/voucher/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, productId }),
    });
  },
};

