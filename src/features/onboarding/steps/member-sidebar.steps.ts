import type { OnboardingStep } from '../onboarding-types';
import { openSidebarForOnboarding } from '../onboarding-sidebar-events';

export const memberSidebarOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="mobile-menu-toggle"]',
    title: 'Menu Navigasi',
    content:
      'Di layar kecil, tap ikon menu ini untuk membuka sidebar dan berpindah halaman.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="myzone-sidebar-nav"]',
    title: 'Sidebar My Zone',
    content:
      'Semua menu utama My Zone ada di sini — Dashboard, Event, Wallet, Store, dan lainnya.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-wallet"]',
    title: 'My Wallet',
    content: 'Buka Wallet untuk lihat tiket, voucher, dan hadiah yang kamu miliki.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-store"]',
    title: 'Store',
    content: 'Jelajahi dan beli program, event, atau produk digital di Store.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
  {
    target: '[data-tour="myzone-nav-settings"]',
    title: 'Settings',
    content: 'Atur profil, keamanan akun, dan preferensi notifikasi di sini.',
    placement: 'right',
    mobilePlacement: 'bottom',
    beforeShow: openSidebarForOnboarding,
  },
];
