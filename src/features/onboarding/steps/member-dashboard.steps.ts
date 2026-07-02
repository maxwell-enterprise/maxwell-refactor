import type { OnboardingStep } from '../onboarding-types';

export const memberDashboardOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="member-dashboard-header"]',
    title: 'My Zone Home',
    content: 'This is your personal home — see a summary of your journey and activity here.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-journey"]',
    title: 'Evolution Journey',
    content:
      'Track your journey stage: from Guest to Facilitator. The more active you are, the further you progress.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-next-event"]',
    title: 'Next Event',
    content:
      'Your nearest event or masterclass appears here. Click the card to open Wallet.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-wallet"]',
    title: 'Wallet Summary',
    content:
      'A summary of your tickets and digital assets. Tap Wallet in the sidebar for full details.',
    placement: 'left',
    mobilePlacement: 'bottom',
  },
];
