import type { WalletItem, UserEntitlements } from '../types/access';
import type { LifecycleStage } from '../types/index';
import type { ContractInstance } from '../types/contract';

const MEMBER_ZONE_STALE_MS = 45_000;

export type MemberZoneSessionSnapshot = {
  userId: string;
  walletItems: WalletItem[];
  entitlements: UserEntitlements | null;
  pendingContract: ContractInstance | null;
  journeyLifecycle: LifecycleStage;
  fetchedAt: number;
};

let entry: MemberZoneSessionSnapshot | null = null;

export function readMemberZoneSessionCache(
  userId: string,
): MemberZoneSessionSnapshot | null {
  const uid = userId.trim();
  if (!uid || !entry || entry.userId !== uid) return null;
  if (Date.now() - entry.fetchedAt > MEMBER_ZONE_STALE_MS) return null;
  return entry;
}

export function writeMemberZoneSessionCache(s: MemberZoneSessionSnapshot): void {
  if (!s.userId.trim()) return;
  entry = { ...s, fetchedAt: Date.now() };
}

export function invalidateMemberZoneSessionCache(): void {
  entry = null;
}
