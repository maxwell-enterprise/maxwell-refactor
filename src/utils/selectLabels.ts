/** Keeps native <select> option lists from stretching past the mobile viewport. */
export function truncateSelectLabel(text: string, maxLength = 42): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function formatEventSelectLabel(
  event: { date: string; name: string },
  maxLength = 44,
): string {
  const parsed = new Date(event.date);
  const datePart = Number.isNaN(parsed.getTime())
    ? event.date
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return truncateSelectLabel(`${datePart} · ${event.name}`, maxLength);
}
