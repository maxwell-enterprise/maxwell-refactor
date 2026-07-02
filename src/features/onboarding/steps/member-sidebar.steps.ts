import type { OnboardingStep } from '../onboarding-types';
import { openSidebarForOnboarding } from '../onboarding-sidebar-events';

export const memberSidebarOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="mobile-menu-toggle"]',
    title: 'Navigation Menu',
    content:
      'On smaller screens, tap this menu icon to open the sidebar and switch pages.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="myzone-sidebar-nav"]',
    title: 'My Zone Sidebar',
    content:
      'All main My Zone menus are here — Dashboard, Event, Wallet, Store, and more.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-wallet"]',
    title: 'My Wallet',
    content: 'Open Wallet to view your tickets, vouchers, and gifts.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-store"]',
    title: 'Store',
    content: 'Browse and purchase programs, events, or digital products in the Store.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-settings"]',
    title: 'Settings',
    content: 'Manage your profile, account security, and notification preferences here.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
];
