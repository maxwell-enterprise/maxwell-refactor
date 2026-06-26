export const GUEST_PHONE_MIN_LENGTH = 6;
export const GUEST_PHONE_MAX_LENGTH = 50;

export type GuestFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

export function validateGuestContact(input: {
  name: string;
  email: string;
  phone: string;
}): GuestFieldErrors {
  const errors: GuestFieldErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (!name) {
    errors.name = 'Nama lengkap wajib diisi.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (!phone) {
    errors.phone = 'Nomor WhatsApp wajib diisi.';
  } else if (phone.length < GUEST_PHONE_MIN_LENGTH) {
    errors.phone = `Nomor WhatsApp terlalu pendek. Minimal ${GUEST_PHONE_MIN_LENGTH} karakter (contoh: 08123456789).`;
  } else if (phone.length > GUEST_PHONE_MAX_LENGTH) {
    errors.phone = `Nomor WhatsApp terlalu panjang. Maksimal ${GUEST_PHONE_MAX_LENGTH} karakter.`;
  }

  return errors;
}

export function mapApiGuestContactErrors(message: string): GuestFieldErrors {
  const errors: GuestFieldErrors = {};
  const lower = message.toLowerCase();

  if (
    lower.includes('guestcontact.name') ||
    (lower.includes('name') && lower.includes('too_small'))
  ) {
    errors.name = 'Nama lengkap wajib diisi.';
  }

  if (
    lower.includes('guestcontact.email') ||
    (lower.includes('email') && (lower.includes('invalid') || lower.includes('email')))
  ) {
    errors.email = 'Format email tidak valid.';
  }

  if (
    lower.includes('guestcontact.phone') ||
    (lower.includes('phone') && lower.includes('too_small'))
  ) {
    errors.phone = `Nomor WhatsApp terlalu pendek. Minimal ${GUEST_PHONE_MIN_LENGTH} karakter (contoh: 08123456789).`;
  } else if (lower.includes('guestcontact.phone') && lower.includes('too_big')) {
    errors.phone = `Nomor WhatsApp terlalu panjang. Maksimal ${GUEST_PHONE_MAX_LENGTH} karakter.`;
  }

  return errors;
}
