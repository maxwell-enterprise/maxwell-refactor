import type { OnboardingTourId } from './onboarding-tour-ids';

const PREFIX = 'onboarding';

export function onboardingStorageKey(
  tourId: OnboardingTourId,
  userId?: string,
): string {
  return userId
    ? `${PREFIX}:${tourId}:completed:${userId}`
    : `${PREFIX}:${tourId}:completed`;
}

export function isOnboardingCompleted(
  tourId: OnboardingTourId,
  userId?: string,
): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(onboardingStorageKey(tourId, userId)) === 'true';
}

export function setOnboardingCompleted(
  tourId: OnboardingTourId,
  userId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(onboardingStorageKey(tourId, userId), 'true');
}

export function resetOnboardingCompleted(
  tourId: OnboardingTourId,
  userId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(onboardingStorageKey(tourId, userId));
}
