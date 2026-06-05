const ID_PHONE_PREFIX = '+62';

/** Strip country code / leading zero; keep local digits only. */
export function extractIndonesianLocalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

/** Format user input as `+62 …` while typing. */
export function formatIndonesianPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const localDigits = extractIndonesianLocalDigits(trimmed);
  if (!localDigits) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly === '62' || trimmed === ID_PHONE_PREFIX || trimmed === `${ID_PHONE_PREFIX} `) {
      return `${ID_PHONE_PREFIX} `;
    }
    return '';
  }

  return `${ID_PHONE_PREFIX} ${localDigits}`;
}

export function hasIndonesianPhoneNumber(phone: string): boolean {
  return extractIndonesianLocalDigits(phone).length >= 8;
}
