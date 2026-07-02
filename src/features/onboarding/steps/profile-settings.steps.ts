import type { OnboardingStep } from '../onboarding-types';

export const profileSettingsOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="profile-welcome"]',
    title: 'Welcome to My Zone',
    content:
      'Lengkapi profilmu dulu supaya kami bisa mengenalmu. Field bertanda * wajib diisi.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-full-name"]',
    title: 'Full Name',
    content: 'Masukkan nama lengkapmu (minimal 2 karakter).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-phone"]',
    title: 'Phone Number',
    content: 'Nomor WhatsApp/telepon aktif dengan format Indonesia, contoh: +62 812...',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-job-title"]',
    title: 'Position / Title',
    content: 'Jabatan atau peranmu saat ini, misalnya Student atau Manager.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-save-button"]',
    title: 'Save Changes',
    content:
      'Setelah semua field wajib terisi, klik Save Changes. Panduan My Zone lainnya akan lanjut setelah profil tersimpan.',
    placement: 'top',
  },
];
