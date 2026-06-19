import { ExcelHelper } from '../../utils/excelHelper';

export type InvitationImportRow = {
  name: string;
  email: string;
  phone: string;
};

export type InvitationImportResult = {
  rows: InvitationImportRow[];
  skippedEmpty: number;
  skippedInvalidEmail: number;
};

const NAME_KEYS = new Set([
  'name',
  'nama',
  'recipientname',
  'recipient_name',
  'fullname',
  'full_name',
  'guestname',
  'guest_name',
]);

const EMAIL_KEYS = new Set([
  'email',
  'e-mail',
  'mail',
  'emailaddress',
  'email_address',
]);

const PHONE_KEYS = new Set([
  'phone',
  'whatsapp',
  'wa',
  'telepon',
  'hp',
  'nohp',
  'no_hp',
  'nomorhp',
  'nomor_hp',
  'mobile',
  'phonenumber',
  'phone_number',
]);

const normalizeHeaderKey = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[._-]/g, '');

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * Preserve Excel/local formatting for WhatsApp (089..., +62..., etc.).
 * Does not apply the form's default +62 prefix.
 */
export const formatPhoneFromExcel = (value: unknown): string => {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  // Excel often stores Indonesian mobiles as numbers (leading 0 dropped).
  if (typeof value === 'number' && Number.isFinite(value)) {
    const digits = String(Math.trunc(value));
    if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 12) {
      return `0${digits}`;
    }
    return digits;
  }

  return raw;
};

const pickColumn = (
  row: Record<string, unknown>,
  keys: Set<string>,
): string => {
  for (const [header, value] of Object.entries(row)) {
    if (!keys.has(normalizeHeaderKey(header))) continue;
    const text = value == null ? '' : String(value).trim();
    if (text) return text;
  }
  return '';
};

const pickPhoneColumn = (row: Record<string, unknown>): string => {
  for (const [header, value] of Object.entries(row)) {
    if (!PHONE_KEYS.has(normalizeHeaderKey(header))) continue;
    return formatPhoneFromExcel(value);
  }
  return '';
};

const parseInvitationRow = (
  row: Record<string, unknown>,
): InvitationImportRow | null => {
  const name = pickColumn(row, NAME_KEYS);
  const email = pickColumn(row, EMAIL_KEYS);
  const phone = pickPhoneColumn(row);

  if (!name && !email && !phone) {
    return null;
  }

  return { name, email, phone };
};

export async function parseInvitationExcelFile(
  file: File,
): Promise<InvitationImportResult> {
  const raw = await ExcelHelper.importFromExcel<Record<string, unknown>>(file);

  const rows: InvitationImportRow[] = [];
  let skippedEmpty = 0;
  let skippedInvalidEmail = 0;

  for (const row of raw) {
    if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
      skippedEmpty += 1;
      continue;
    }

    const parsed = parseInvitationRow(row);
    if (!parsed) {
      skippedEmpty += 1;
      continue;
    }

    if (!parsed.email.trim() || !isValidEmail(parsed.email)) {
      skippedInvalidEmail += 1;
      continue;
    }

    rows.push({
      name: parsed.name.trim(),
      email: parsed.email.trim().toLowerCase(),
      phone: parsed.phone,
    });
  }

  return { rows, skippedEmpty, skippedInvalidEmail };
}

export function downloadInvitationImportTemplate(): void {
  ExcelHelper.exportToExcel(
    [
      {
        name: 'Budi Santoso',
        email: 'budi@example.com',
        phone: '08123456789',
      },
      {
        name: 'Siti Aminah',
        email: 'siti@example.com',
        phone: '08219876543',
      },
    ],
    'Invitation_Import_Template',
    'Invitations',
  );
}
