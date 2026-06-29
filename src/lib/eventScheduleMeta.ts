import type { Event } from '@/types/index';

export type EventSchedulePhase = 'PAST' | 'ONGOING' | 'UPCOMING';

export interface EventScheduleMeta {
  phase: EventSchedulePhase;
  displayDateLabel: string;
  isSeries: boolean;
  sessionCount: number;
  completedSessionCount: number;
  nextSession?: { name: string; date: string };
  dateRange?: { start: string; end: string };
  detailLine?: string;
}

function todayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

function formatShortDateDisplay(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getSeriesChildren(
  event: Event | undefined,
  allEvents: readonly Event[],
): Event[] {
  if (!event || event.type !== 'CONTAINER') return [];
  return allEvents
    .filter((entry) => entry.parentEventId === event.id)
    .sort((a, b) => compareYmd(a.date, b.date));
}

function resolveSoloPhase(
  startDate: string,
  endDate: string | undefined,
  referenceDate: string,
): EventSchedulePhase {
  const effectiveEnd =
    endDate && compareYmd(endDate, startDate) >= 0 ? endDate : startDate;

  if (compareYmd(effectiveEnd, referenceDate) < 0) return 'PAST';
  if (compareYmd(startDate, referenceDate) > 0) return 'UPCOMING';
  return 'ONGOING';
}

export function resolveEventScheduleMeta(
  event: Event | undefined,
  allEvents: readonly Event[],
  referenceDate = todayYmd(),
): EventScheduleMeta {
  if (!event) {
    return {
      phase: 'UPCOMING',
      displayDateLabel: 'Date TBD',
      isSeries: false,
      sessionCount: 0,
      completedSessionCount: 0,
    };
  }

  const children = getSeriesChildren(event, allEvents);
  const isSeries = event.type === 'CONTAINER' && children.length > 0;

  if (isSeries) {
    const dates = children.map((child) => child.date).filter(Boolean);
    const start = dates[0] || event.date;
    const end = dates[dates.length - 1] || event.endDate || start;
    const completedSessionCount = children.filter(
      (child) => compareYmd(child.date, referenceDate) < 0,
    ).length;
    const nextSession = children.find(
      (child) => compareYmd(child.date, referenceDate) >= 0,
    );

    let phase: EventSchedulePhase;
    if (compareYmd(end, referenceDate) < 0) {
      phase = 'PAST';
    } else if (compareYmd(start, referenceDate) > 0) {
      phase = 'UPCOMING';
    } else {
      phase = 'ONGOING';
    }

    const displayDateLabel =
      start === end
        ? formatShortDateDisplay(start)
        : `${formatShortDateDisplay(start)} – ${formatShortDateDisplay(end)}`;

    let detailLine: string | undefined;
    if (phase === 'ONGOING' && nextSession) {
      detailLine = `Next: Session ${completedSessionCount + 1}/${children.length} · ${nextSession.name} (${formatShortDateDisplay(nextSession.date)})`;
    } else if (phase === 'UPCOMING') {
      detailLine = `${children.length} sessions · starts ${formatShortDateDisplay(start)}`;
    } else if (phase === 'PAST') {
      detailLine = `All ${children.length} sessions completed`;
    }

    return {
      phase,
      displayDateLabel,
      isSeries: true,
      sessionCount: children.length,
      completedSessionCount,
      nextSession: nextSession
        ? { name: nextSession.name, date: nextSession.date }
        : undefined,
      dateRange: { start, end },
      detailLine,
    };
  }

  const phase = resolveSoloPhase(event.date, event.endDate, referenceDate);

  return {
    phase,
    displayDateLabel: event.date ? formatShortDateDisplay(event.date) : 'Date TBD',
    isSeries: false,
    sessionCount: 0,
    completedSessionCount: 0,
    detailLine: undefined,
  };
}

/** True when the event (or full series, for containers) is fully in the past. */
export function isEventExpiredForCatalog(
  event: Event | undefined,
  allEvents: readonly Event[],
  referenceDate = todayYmd(),
): boolean {
  if (!event) return false;
  return resolveEventScheduleMeta(event, allEvents, referenceDate).phase === 'PAST';
}

export function formatEventSchedulePhaseLabel(phase: EventSchedulePhase): string {
  switch (phase) {
    case 'PAST':
      return 'PAST';
    case 'ONGOING':
      return 'ONGOING';
    default:
      return 'UPCOMING';
  }
}

function formatLongDateEn(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatEventDateForMessage(
  schedule: Pick<EventScheduleMeta, 'displayDateLabel' | 'isSeries' | 'nextSession' | 'detailLine'>,
  fallbackDate?: string,
): string {
  if (schedule.isSeries && schedule.nextSession) {
    return `Next session: *${schedule.nextSession.name}* on *${formatLongDateEn(schedule.nextSession.date)}*`;
  }
  if (schedule.displayDateLabel && schedule.displayDateLabel !== 'Date TBD') {
    return schedule.isSeries
      ? `Series period: *${schedule.displayDateLabel}*`
      : `Date: *${formatLongDateEn(fallbackDate || schedule.displayDateLabel)}*`;
  }
  return '';
}
