import { GiftAllocation, WalletItem } from '../../types/access';
import { UserProfile } from '../../types/index';
import { UserService } from '../../services/userService';

export function collectWalletOwnerIds(
  tickets: readonly WalletItem[],
  gifts: readonly GiftAllocation[] = [],
): string[] {
  const ids = new Set<string>();
  for (const ticket of tickets) {
    const userId = ticket.userId?.trim();
    if (userId) ids.add(userId);
  }
  for (const gift of gifts) {
    const sourceUserId = gift.sourceUserId?.trim();
    if (sourceUserId) ids.add(sourceUserId);
    const claimedByUserId = gift.claimedByUserId?.trim();
    if (claimedByUserId) ids.add(claimedByUserId);
  }
  return [...ids];
}

/** Merge internal staff map with Prisma `User` rows for wallet owner ids. */
export async function buildWalletOwnerUserMap(
  ownerIds: readonly string[],
  internalUsers: readonly UserProfile[],
): Promise<Map<string, UserProfile>> {
  const map = new Map(internalUsers.map((user) => [user.id, user]));
  const missing = [...new Set(ownerIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => !map.has(id),
  );
  if (missing.length === 0) {
    return map;
  }

  const lookedUp = await UserService.lookupWorkspaceUsers(missing).catch(() => []);
  for (const user of lookedUp) {
    map.set(user.id, user);
  }
  return map;
}
