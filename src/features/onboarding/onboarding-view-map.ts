import { ViewState } from '@/types/index';
import { ONBOARDING_TOUR_IDS } from './onboarding-tour-ids';
import type { OnboardingTourId } from './onboarding-tour-ids';
import type { OnboardingContext, OnboardingTourConfig } from './onboarding-types';
import { profileSettingsOnboardingSteps } from './steps/profile-settings.steps';
import { memberSidebarOnboardingSteps } from './steps/member-sidebar.steps';
import { memberDashboardOnboardingSteps } from './steps/member-dashboard.steps';
import { memberWalletOnboardingSteps } from './steps/member-wallet.steps';

/** Sidebar intro only auto-starts here — not on Wallet or other destinations. */
const SIDEBAR_AUTO_START_VIEWS = new Set<ViewState>([
  ViewState.SETTINGS,
  ViewState.DASHBOARD,
]);

export const onboardingTourRegistry: Record<
  OnboardingTourId,
  OnboardingTourConfig
> = {
  [ONBOARDING_TOUR_IDS.PROFILE_SETTINGS]: {
    tourId: ONBOARDING_TOUR_IDS.PROFILE_SETTINGS,
    steps: profileSettingsOnboardingSteps,
    persistOnSkip: false,
    shouldAutoStart: (ctx) => !ctx.isProfileComplete,
  },
  [ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR]: {
    tourId: ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR,
    steps: memberSidebarOnboardingSteps,
    persistOnSkip: true,
    shouldAutoStart: (ctx) => ctx.isProfileComplete,
  },
  [ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD]: {
    tourId: ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD,
    steps: memberDashboardOnboardingSteps,
    persistOnSkip: true,
    shouldAutoStart: (ctx) =>
      ctx.isProfileComplete &&
      ctx.isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR),
  },
  [ONBOARDING_TOUR_IDS.MEMBER_WALLET]: {
    tourId: ONBOARDING_TOUR_IDS.MEMBER_WALLET,
    steps: memberWalletOnboardingSteps,
    persistOnSkip: true,
    shouldAutoStart: (ctx) =>
      ctx.isProfileComplete &&
      (ctx.isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR) ||
        ctx.view === ViewState.WALLET),
  },
};

/** View-specific tours for manual replay from the header help button. */
export const onboardingViewMap: Partial<
  Record<ViewState, OnboardingTourId>
> = {
  [ViewState.SETTINGS]: ONBOARDING_TOUR_IDS.PROFILE_SETTINGS,
  [ViewState.DASHBOARD]: ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD,
  [ViewState.WALLET]: ONBOARDING_TOUR_IDS.MEMBER_WALLET,
};

export function getTourConfigById(
  tourId: OnboardingTourId,
): OnboardingTourConfig | undefined {
  return onboardingTourRegistry[tourId];
}

export function resolveAutoStartTourId(
  ctx: OnboardingContext,
  options: { autoStartBlocked: boolean },
): OnboardingTourId | null {
  if (options.autoStartBlocked) return null;

  if (
    !ctx.isProfileComplete &&
    ctx.view === ViewState.SETTINGS &&
    !ctx.isTourCompleted(ONBOARDING_TOUR_IDS.PROFILE_SETTINGS)
  ) {
    return ONBOARDING_TOUR_IDS.PROFILE_SETTINGS;
  }

  if (
    ctx.isProfileComplete &&
    !ctx.isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR) &&
    SIDEBAR_AUTO_START_VIEWS.has(ctx.view)
  ) {
    return ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR;
  }

  if (
    ctx.view === ViewState.WALLET &&
    !ctx.isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_WALLET)
  ) {
    const config = onboardingTourRegistry[ONBOARDING_TOUR_IDS.MEMBER_WALLET];
    if (config.shouldAutoStart?.(ctx)) {
      return ONBOARDING_TOUR_IDS.MEMBER_WALLET;
    }
  }

  if (
    ctx.view === ViewState.DASHBOARD &&
    !ctx.isTourCompleted(ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD)
  ) {
    const config = onboardingTourRegistry[ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD];
    if (config.shouldAutoStart?.(ctx)) {
      return ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD;
    }
  }

  return null;
}

export function resolveManualTourId(
  ctx: OnboardingContext,
): OnboardingTourId | null {
  if (!ctx.isProfileComplete) {
    return ONBOARDING_TOUR_IDS.PROFILE_SETTINGS;
  }

  if (ctx.view === ViewState.DASHBOARD) {
    return ONBOARDING_TOUR_IDS.MEMBER_DASHBOARD;
  }
  if (ctx.view === ViewState.WALLET) {
    return ONBOARDING_TOUR_IDS.MEMBER_WALLET;
  }

  return ONBOARDING_TOUR_IDS.MEMBER_SIDEBAR;
}
