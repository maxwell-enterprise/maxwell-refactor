import type { Event } from '@/types/index';

type EventTimeSource = Pick<Event, 'time' | 'recurringMeta'> | {
  time?: string;
  recurringMeta?: Event['recurringMeta'];
};

/**
 * Admin edits `events.time`; legacy rows may still have stale `recurringMeta.time` (e.g. 09:00 default).
 * Prefer the canonical `time` column — same field ProductDetailModal uses.
 */
export function resolveEventDisplayTime(
  event?: EventTimeSource | null,
  fallback?: string,
): string | undefined {
  const fromColumn = event?.time?.trim();
  if (fromColumn) return fromColumn;

  const fromRecurring = event?.recurringMeta?.time?.trim();
  if (fromRecurring) return fromRecurring;

  const fromFallback = fallback?.trim();
  return fromFallback || undefined;
}

/** Keep recurringMeta.time aligned when ops saves the Time field. */
export function syncEventRecurringTime<T extends EventTimeSource>(event: T): T {
  const time = event.time?.trim();
  if (!time) return event;

  return {
    ...event,
    recurringMeta: {
      ...(event.recurringMeta ?? {
        frequency: 'WEEKLY',
        patternDescription: '',
        totalSessions: 1,
      }),
      time,
    },
  };
}
