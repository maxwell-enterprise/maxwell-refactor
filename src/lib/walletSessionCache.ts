import type { WalletItem, WalletMemberHub } from '../types/access';

/** How long re-open Wallet can show cached data before requiring a blocking fetch again. */
const WALLET_SESSION_STALE_MS = 60_000;

type WalletSessionEntry = {
  userId: string;
  items: WalletItem[];
  memberHub: WalletMemberHub | null;
  fetchedAt: number;
};

let entry: WalletSessionEntry | null = null;

export function readWalletSessionCache(userId: string): WalletSessionEntry | null {
  const uid = userId.trim();
  if (!uid || !entry || entry.userId !== uid) return null;
  if (Date.now() - entry.fetchedAt > WALLET_SESSION_STALE_MS) return null;
  return entry;
}

export function writeWalletSessionCache(
  userId: string,
  items: WalletItem[],
  memberHub: WalletMemberHub | null,
): void {
  const uid = userId.trim();
  if (!uid) return;
  entry = { userId: uid, items, memberHub, fetchedAt: Date.now() };
}

export function invalidateWalletSessionCache(): void {
  entry = null;
}
