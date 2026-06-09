/** Must stay in sync with server-maxwell campaigns.service SOURCE_CODE_REGEX */
export const CAMPAIGN_SOURCE_CODE_REGEX = /^[a-z0-9_]{2,120}$/;

export const CAMPAIGN_SOURCE_CODE_RULES_HINT =
  'Huruf kecil, angka, _ saja. Min. 2 karakter.';

export const CAMPAIGN_SOURCE_CODE_EXAMPLE = 'ig_ads_feb';

/** Normalize user input into a valid source tag shape (best-effort). */
export function sanitizeCampaignSourceCodeInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export type CampaignSourceCodeValidation = {
  valid: boolean;
  normalized: string;
  issues: string[];
  wasAutoFixed: boolean;
};

export function validateCampaignSourceCode(raw: string): CampaignSourceCodeValidation {
  const trimmed = raw.trim();
  const normalized = sanitizeCampaignSourceCodeInput(raw);
  const loose = trimmed.toLowerCase().replace(/\s+/g, '_');
  const wasAutoFixed = Boolean(trimmed && loose !== normalized);

  const issues: string[] = [];
  if (!trimmed) {
    issues.push('Wajib diisi.');
  } else if (!normalized) {
    issues.push('Tambahkan huruf atau angka.');
  } else if (normalized.length < 2) {
    issues.push('Min. 2 karakter.');
  } else if (normalized.length > 120) {
    issues.push('Maks. 120 karakter.');
  } else if (!CAMPAIGN_SOURCE_CODE_REGEX.test(normalized)) {
    issues.push(CAMPAIGN_SOURCE_CODE_RULES_HINT);
  }

  return {
    valid: issues.length === 0,
    normalized,
    issues,
    wasAutoFixed,
  };
}

export function mapCampaignSourceCodeApiError(message: string): string {
  const trimmed = message.trim();
  if (
    trimmed.includes('sourceCode must be lowercase alphanumeric') ||
    trimmed.includes('sourceCode')
  ) {
    return `Format tidak valid. ${CAMPAIGN_SOURCE_CODE_RULES_HINT} Contoh: ${CAMPAIGN_SOURCE_CODE_EXAMPLE}.`;
  }
  return trimmed;
}
