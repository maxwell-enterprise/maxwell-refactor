/**
 * Safe post-auth redirect paths (same-origin only).
 * Blocks protocol-relative open redirects (`//evil.com`).
 */
export function sanitizeInternalReturnPath(
  raw: string | undefined | null,
): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.length > 1500) return null;
  if (value.startsWith('//') || value.includes('\\') || value.includes('\0')) {
    return null;
  }
  if (/[\r\n]/.test(value)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null;
  if (!value.startsWith('/')) return null;

  try {
    const parsed = new URL(value, 'https://maxwell.invalid');
    if (parsed.origin !== 'https://maxwell.invalid') return null;
    if (parsed.username || parsed.password) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
