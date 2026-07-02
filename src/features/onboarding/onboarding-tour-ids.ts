export const ONBOARDING_TOUR_IDS = {
  PROFILE_SETTINGS: 'profile-settings',
  MEMBER_SIDEBAR: 'member-sidebar',
  MEMBER_DASHBOARD: 'member-dashboard',
  MEMBER_WALLET: 'member-wallet',
} as const;

export type OnboardingTourId =
  (typeof ONBOARDING_TOUR_IDS)[keyof typeof ONBOARDING_TOUR_IDS];

/** Ordered My Zone journey after profile is complete. */
export const MY_ZONE_ONBOARDING_SEQUENCE = [
  ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR,
  ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD,
  ONBOARDING_TOUR_IDS.MEMBER_WALLET,
] as const;
