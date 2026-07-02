import type { OnboardingStep } from '../onboarding-types';

export const memberWalletOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="member-wallet-header"]',
    title: 'Wallet',
    content: 'This page holds your tickets, membership, and digital assets.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-wallet-tabs"]',
    title: 'Asset Categories',
    content:
      'Switch tabs to view tickets, program credits, physical orders, or activity history.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-wallet-tickets"]',
    title: 'Tickets & Gifts',
    content:
      'Event tickets and incoming gifts appear here. Tap a ticket for details or gate QR.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
];
