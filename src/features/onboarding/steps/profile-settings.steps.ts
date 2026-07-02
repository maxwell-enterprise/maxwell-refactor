import type { OnboardingStep } from '../onboarding-types';

export const profileSettingsOnboardingSteps: OnboardingStep[] = [
  {
    target: '[data-tour="profile-welcome"]',
    title: 'Welcome to My Zone',
    content:
      'Complete your profile so we can get to know you. Fields marked with * are required.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-full-name"]',
    title: 'Full Name',
    content: 'Enter your full name (at least 2 characters).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-phone"]',
    title: 'Phone Number',
    content: 'Active WhatsApp/phone number in Indonesian format, e.g. +62 812...',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-job-title"]',
    title: 'Position / Title',
    content: 'Your current role or title, e.g. Student or Manager.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-save-button"]',
    title: 'Save Changes',
    content:
      'Once all required fields are filled, click Save Changes. Other My Zone guides will continue after your profile is saved.',
    placement: 'top',
  },
];
