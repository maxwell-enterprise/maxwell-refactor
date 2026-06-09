import { hasIndonesianPhoneNumber } from './indonesianPhone';
import type { UserProfile } from '../types/index';

export const REQUIRED_PROFILE_FIELD_LABELS = {
  fullName: 'Full Name',
  jobTitle: 'Position / Title',
  phone: 'Phone',
  email: 'Email Address',
  company: 'Company',
  domicile: 'Domicile',
} as const;

export type RequiredProfileField = keyof typeof REQUIRED_PROFILE_FIELD_LABELS;

export type ProfileCompletionInput = {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  domicile: string;
};

export function profileCompletionFromUser(
  user: UserProfile | null | undefined,
): ProfileCompletionInput {
  return {
    fullName: user?.fullName?.trim() ?? '',
    email: user?.email?.trim() ?? '',
    phone: user?.phone?.trim() ?? '',
    jobTitle: user?.jobTitle?.trim() ?? '',
    company: user?.company?.trim() ?? '',
    domicile: user?.domicile?.trim() ?? '',
  };
}

export function getProfileValidationError(
  data: ProfileCompletionInput,
): string | null {
  for (const key of Object.keys(REQUIRED_PROFILE_FIELD_LABELS) as RequiredProfileField[]) {
    if (!String(data[key] ?? '').trim()) {
      return `${REQUIRED_PROFILE_FIELD_LABELS[key]} wajib diisi.`;
    }
  }
  if (data.fullName.trim().length < 2) {
    return 'Full Name minimal 2 karakter.';
  }
  if (!data.email.trim().includes('@')) {
    return 'Email Address tidak valid.';
  }
  if (!hasIndonesianPhoneNumber(data.phone)) {
    return 'Phone wajib diisi dengan nomor valid (contoh: +62 812...).';
  }
  return null;
}

export function isProfileComplete(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return getProfileValidationError(profileCompletionFromUser(user)) === null;
}

export function getMissingProfileFieldLabels(
  user: UserProfile | null | undefined,
): string[] {
  const data = profileCompletionFromUser(user);
  const missing: string[] = [];

  for (const key of Object.keys(REQUIRED_PROFILE_FIELD_LABELS) as RequiredProfileField[]) {
    if (!String(data[key] ?? '').trim()) {
      missing.push(REQUIRED_PROFILE_FIELD_LABELS[key]);
      continue;
    }
  }

  if (data.fullName.trim() && data.fullName.trim().length < 2) {
    if (!missing.includes(REQUIRED_PROFILE_FIELD_LABELS.fullName)) {
      missing.push(REQUIRED_PROFILE_FIELD_LABELS.fullName);
    }
  }
  if (data.email.trim() && !data.email.trim().includes('@')) {
    if (!missing.includes(REQUIRED_PROFILE_FIELD_LABELS.email)) {
      missing.push(REQUIRED_PROFILE_FIELD_LABELS.email);
    }
  }
  if (data.phone.trim() && !hasIndonesianPhoneNumber(data.phone)) {
    if (!missing.includes(REQUIRED_PROFILE_FIELD_LABELS.phone)) {
      missing.push(REQUIRED_PROFILE_FIELD_LABELS.phone);
    }
  }

  return missing;
}
