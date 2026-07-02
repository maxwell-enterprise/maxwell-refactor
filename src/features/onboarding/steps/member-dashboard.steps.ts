import type { OnboardingStep } from '../onboarding-types';

export const memberDashboardOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="member-dashboard-header"]',
    title: 'My Zone Home',
    content: 'Ini beranda pribadimu — lihat ringkasan perjalanan dan aktivitasmu di sini.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-journey"]',
    title: 'Evolution Journey',
    content:
      'Lacak tahap perjalananmu: dari Guest hingga Facilitator. Semakin aktif, semakin maju.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-next-event"]',
    title: 'Next Event',
    content:
      'Event atau masterclass terdekat tampil di sini. Klik kartu untuk buka Wallet.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
  {
    target: '[data-tour="member-dashboard-wallet"]',
    title: 'Wallet Summary',
    content:
      'Ringkasan tiket dan aset digitalmu. Tap menu Wallet di sidebar untuk detail lengkap.',
    placement: 'left',
    mobilePlacement: 'bottom',
  },
];
