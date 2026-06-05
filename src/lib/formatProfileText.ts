/** Capitalize the first letter of each word (e.g. "panparci" → "Panparci"). */
export function capitalizeProfileWords(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export const PROFILE_CAPITALIZE_FIELDS = [
  'fullName',
  'jobTitle',
  'company',
  'domicile',
] as const;

export type ProfileCapitalizeField = (typeof PROFILE_CAPITALIZE_FIELDS)[number];
