import type { Event, LocationMode } from '../../../types/index';
import type { WalletItem } from '../../../types/access';
import { resolveEventDisplayTime } from '../../../lib/eventDisplayTime';

/** Countdown strip opens 2 hours before session start. */
export const LIVE_COUNTDOWN_WINDOW_MS = 2 * 60 * 60 * 1000;

export type LiveSessionPhase = 'countdown' | 'live';

export type LiveTicketedSession = {
  ticket: WalletItem;
  event: Event;
  phase: LiveSessionPhase;
  locationMode: LocationMode;
  startsAt: Date;
  endsAt: Date;
  /** Milliseconds until start (countdown) or 0 when live. */
  msUntilStart: number;
};

function parseClock(fragment: string): { hours: number; minutes: number } | null {
  const match = fragment.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function applyClock(base: Date, clock: { hours: number; minutes: number }): Date {
  const next = new Date(base);
  next.setHours(clock.hours, clock.minutes, 0, 0);
  return next;
}

function endOfDay(base: Date): Date {
  const next = new Date(base);
  next.setHours(23, 59, 59, 999);
  return next;
}

/**
 * Resolve session start/end from event fields.
 * End prefers: time range end → endDate EOD → start-day EOD.
 */
export function resolveSessionWindow(event: Event): { startsAt: Date; endsAt: Date } | null {
  const dateValue = event.date?.trim();
  if (!dateValue) return null;

  const startDay = new Date(dateValue);
  if (Number.isNaN(startDay.getTime())) return null;

  const displayTime = resolveEventDisplayTime(event);
  const rangeParts = displayTime
    ? displayTime.split(/\s*[-–—]\s*|\s+to\s+/i).map((part) => part.trim()).filter(Boolean)
    : [];

  const startClock = rangeParts[0] ? parseClock(rangeParts[0]) : null;
  const endClock = rangeParts[1] ? parseClock(rangeParts[1]) : null;

  const startsAt = startClock ? applyClock(startDay, startClock) : new Date(startDay);
  if (!startClock) startsAt.setHours(0, 0, 0, 0);

  let endsAt: Date;
  if (event.endDate?.trim()) {
    const endDay = new Date(event.endDate.trim());
    if (!Number.isNaN(endDay.getTime())) {
      endsAt = endClock ? applyClock(endDay, endClock) : endOfDay(endDay);
    } else {
      endsAt = endClock ? applyClock(startDay, endClock) : endOfDay(startDay);
    }
  } else if (endClock) {
    endsAt = applyClock(startDay, endClock);
    if (endsAt.getTime() <= startsAt.getTime()) {
      // Overnight session — roll end to next calendar day.
      endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
    }
  } else {
    endsAt = endOfDay(startDay);
  }

  return { startsAt, endsAt };
}

export function classifyLivePhase(
  startsAt: Date,
  endsAt: Date,
  nowMs = Date.now(),
): LiveSessionPhase | null {
  if (nowMs > endsAt.getTime()) return null;
  if (nowMs >= startsAt.getTime()) return 'live';
  if (nowMs >= startsAt.getTime() - LIVE_COUNTDOWN_WINDOW_MS) return 'countdown';
  return null;
}

export function formatCountdown(msUntilStart: number): string {
  const clamped = Math.max(0, msUntilStart);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const TICKET_STATUSES = new Set(['ACTIVE', 'USED', 'CLAIMED']);

export function isEligibleLiveTicket(ticket: WalletItem): boolean {
  return ticket.type === 'TICKET' && TICKET_STATUSES.has(ticket.status) && Boolean(ticket.meta?.eventId);
}

export function resolveTicketLocationMode(
  ticket: WalletItem,
  event: Event,
): LocationMode {
  const fromTicket = ticket.meta?.locationMode;
  if (fromTicket === 'ONLINE' || fromTicket === 'OFFLINE' || fromTicket === 'HYBRID') {
    return fromTicket;
  }
  return event.locationMode || 'OFFLINE';
}

/**
 * Next still-relevant session window for a wallet ticket.
 * Past / finished sessions (and fully completed containers) return null.
 */
export function resolveUpcomingTicketWindow(
  ticket: WalletItem,
  events: Event[],
  nowMs = Date.now(),
): { startsAt: Date; endsAt: Date } | null {
  const eventId = ticket.meta?.eventId ? String(ticket.meta.eventId) : '';
  const byId = new Map(events.map((event) => [event.id, event]));
  const root = eventId ? byId.get(eventId) : undefined;

  if (root) {
    const related: Event[] =
      root.type === 'CONTAINER'
        ? events.filter((event) => event.parentEventId === root.id)
        : [root];
    const targets = related.length > 0 ? related : [root];

    let best: { startsAt: Date; endsAt: Date } | null = null;
    for (const event of targets) {
      if (event.status === 'Cancelled') continue;
      const window = resolveSessionWindow(event);
      if (!window) continue;
      if (nowMs > window.endsAt.getTime()) continue;
      if (!best || window.startsAt.getTime() < best.startsAt.getTime()) {
        best = window;
      }
    }
    return best;
  }

  // No linked event — fall back to ticket expiry calendar day.
  if (!ticket.expiryDate) return null;
  const day = new Date(ticket.expiryDate);
  if (Number.isNaN(day.getTime())) return null;
  const endsAt = endOfDay(day);
  if (nowMs > endsAt.getTime()) return null;
  const startsAt = new Date(day);
  startsAt.setHours(0, 0, 0, 0);
  return { startsAt, endsAt };
}

/** Soonest ACTIVE ticket that still has a session to attend (not finished). */
export function pickNextUpcomingTicket(
  tickets: WalletItem[],
  events: Event[],
  nowMs = Date.now(),
): WalletItem | null {
  const candidates: { ticket: WalletItem; startsAt: Date }[] = [];

  for (const ticket of tickets) {
    if (ticket.type !== 'TICKET' || ticket.status !== 'ACTIVE') continue;
    const window = resolveUpcomingTicketWindow(ticket, events, nowMs);
    if (!window) continue;
    candidates.push({ ticket, startsAt: window.startsAt });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return candidates[0]?.ticket ?? null;
}

/**
 * Pick the best ticketed session for the live strip:
 * live sessions first, then soonest countdown; only events the user holds a ticket for.
 */
export function pickLiveTicketedSession(
  tickets: WalletItem[],
  events: Event[],
  nowMs = Date.now(),
): LiveTicketedSession | null {
  const byId = new Map(events.map((event) => [event.id, event]));
  const candidates: LiveTicketedSession[] = [];

  for (const ticket of tickets) {
    if (!isEligibleLiveTicket(ticket)) continue;
    const eventId = String(ticket.meta.eventId);
    const root = byId.get(eventId);
    if (!root) continue;

    const related: Event[] =
      root.type === 'CONTAINER'
        ? events.filter((event) => event.parentEventId === root.id)
        : [root];

    // Container with no listed children — fall back to the parent window.
    const targets = related.length > 0 ? related : [root];

    for (const event of targets) {
      if (event.status === 'Cancelled') continue;
      const window = resolveSessionWindow(event);
      if (!window) continue;
      const phase = classifyLivePhase(window.startsAt, window.endsAt, nowMs);
      if (!phase) continue;

      candidates.push({
        ticket,
        event,
        phase,
        locationMode: resolveTicketLocationMode(ticket, event),
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        msUntilStart: Math.max(0, window.startsAt.getTime() - nowMs),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === 'live' ? -1 : 1;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });

  return candidates[0] ?? null;
}
