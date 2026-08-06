import type { Event } from '../../../types/index';
import type { WalletItem } from '../../../types/access';
import {
  classifyLivePhase,
  resolveSessionWindow,
} from './liveSessionWindow';

/** FE-derived event reminder for the My Zone (member) bell. */
export type MemberEventReminder = {
  id: string;
  eventId: string;
  eventName: string;
  description: string;
  phase: 'countdown' | 'live' | 'upcoming';
  createdAt: string;
};

/** Soft upcoming reminder window (beyond live-strip H-2). */
const UPCOMING_REMINDER_MS = 24 * 60 * 60 * 1000;

/**
 * Member-only event notices for My Zone bell.
 * No SYSTEM / OPS / SUPPORT — purely ticket + event schedule.
 */
export function buildMemberEventReminders(
  tickets: WalletItem[],
  events: Event[],
  nowMs = Date.now(),
): MemberEventReminder[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const reminders: MemberEventReminder[] = [];
  const seenEventIds = new Set<string>();

  for (const ticket of tickets) {
    if (ticket.type !== 'TICKET') continue;
    if (!['ACTIVE', 'USED', 'CLAIMED'].includes(ticket.status)) continue;
    const eventId = ticket.meta?.eventId ? String(ticket.meta.eventId) : '';
    if (!eventId) continue;

    const root = byId.get(eventId);
    if (!root) continue;

    const related =
      root.type === 'CONTAINER'
        ? events.filter((event) => event.parentEventId === root.id)
        : [root];
    const targets = related.length > 0 ? related : [root];

    for (const event of targets) {
      if (event.status === 'Cancelled') continue;
      if (seenEventIds.has(event.id)) continue;

      const window = resolveSessionWindow(event);
      if (!window) continue;
      if (nowMs > window.endsAt.getTime()) continue;

      const livePhase = classifyLivePhase(window.startsAt, window.endsAt, nowMs);
      let phase: MemberEventReminder['phase'] | null = livePhase;
      if (!phase) {
        const msUntil = window.startsAt.getTime() - nowMs;
        if (msUntil > 0 && msUntil <= UPCOMING_REMINDER_MS) {
          phase = 'upcoming';
        }
      }
      if (!phase) continue;

      seenEventIds.add(event.id);
      const startsLabel = window.startsAt.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      reminders.push({
        id: `evt-reminder-${event.id}`,
        eventId: event.id,
        eventName: event.name,
        description:
          phase === 'live'
            ? 'Your session is live · Tap to open wallet'
            : phase === 'countdown'
              ? `Starting soon · ${startsLabel}`
              : `Coming up · ${startsLabel}`,
        phase,
        createdAt: window.startsAt.toISOString(),
      });
    }
  }

  reminders.sort((a, b) => {
    const rank = (p: MemberEventReminder['phase']) =>
      p === 'live' ? 0 : p === 'countdown' ? 1 : 2;
    if (rank(a.phase) !== rank(b.phase)) return rank(a.phase) - rank(b.phase);
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return reminders;
}
