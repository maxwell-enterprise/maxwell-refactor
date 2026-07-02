import type { OnboardingStep } from '../onboarding-types';

export const memberWalletOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="member-wallet-header"]',
    title: 'Wallet',
    content: 'Halaman ini menyimpan tiket, membership, dan aset digitalmu.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-wallet-tabs"]',
    title: 'Kategori Aset',
    content:
      'Pindah tab untuk lihat tiket, kredit program, pesanan fisik, atau riwayat aktivitas.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="member-wallet-tickets"]',
    title: 'Tiket & Hadiah',
    content:
      'Tiket event dan hadiah yang masuk akan tampil di sini. Tap tiket untuk detail atau QR gate.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
];
