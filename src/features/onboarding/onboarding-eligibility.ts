import { UserRole } from '@/types/index';

/** My Zone product tours: pure members only (not staff workspace roles). */
export function isMyZoneOnboardingEligible(
  userRole: UserRole,
  isPersonalZone: boolean,
): boolean {
  if (!isPersonalZone) return false;
  return userRole === UserRole.MEMBER;
}
