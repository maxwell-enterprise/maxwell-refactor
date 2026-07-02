import type { ViewState } from '@/types/index';
import type { OnboardingTourId } from './onboarding-tour-ids';

export type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';

export type OnboardingStep = {
  target: string;
  title: string;
  content: string;
  placement?: OnboardingPlacement;
  /** Placement when viewport is mobile (sidebar open, narrow width). */
  mobilePlacement?: OnboardingPlacement;
  /** Runs before this step is highlighted (e.g. open mobile sidebar). */
  beforeShow?: () => void;
};

export type OnboardingContext = {
  view: ViewState;
  userId?: string;
  isPersonalZone: boolean;
  isProfileComplete: boolean;
  isTourCompleted: (tourId: OnboardingTourId) => boolean;
};

export type OnboardingTourConfig = {
  tourId: OnboardingTourId;
  steps: OnboardingStep[];
  /** When false, closing/skipping does not write localStorage (profile tour until complete). */
  persistOnSkip: boolean;
  shouldAutoStart?: (ctx: OnboardingContext) => boolean;
};

export type OnboardingEndReason = 'finish' | 'skip';
