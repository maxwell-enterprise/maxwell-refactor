"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataService } from '../../../services/dataService';
import { EntitlementService } from '../../../services/entitlementService';
import { AttendanceService } from '../../../services/attendanceService';
import { WALLET_REFRESH_EVENT } from '../../../services/paymentService';
import { subscribeAttendanceUpdated } from '../../../services/attendanceRealtime';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../../../lib/walletSessionCache';
import type { Event } from '../../../types/index';
import type { WalletItem } from '../../../types/access';
import type { LocationMode } from '../../../types/index';
import type { LiveTicketedSession } from '../logic/liveSessionWindow';
import {
  classifyLivePhase,
  pickLiveTicketedSession,
} from '../logic/liveSessionWindow';

type LiveSessionAnchor = {
  ticket: WalletItem;
  event: Event;
  locationMode: LocationMode;
  startsAt: Date;
  endsAt: Date;
};

function attendanceMatchesTicket(
  record: { memberId?: string; memberEmail?: string; ticketUniqueId?: string },
  ticket: WalletItem,
  userId: string,
  userEmail?: string | null,
): boolean {
  if (record.ticketUniqueId && record.ticketUniqueId === ticket.id) return true;
  if (record.memberId && (record.memberId === ticket.userId || record.memberId === userId)) {
    return true;
  }
  const emails = [
    typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail : '',
    userEmail ?? '',
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (record.memberEmail && emails.includes(record.memberEmail.trim().toLowerCase())) {
    return true;
  }
  return false;
}

/**
 * Finds a ticketed session in the H-2 countdown or live window for the signed-in user.
 * Users without a matching ticket never get a strip.
 */
export function useLiveTicketedSession(): {
  session: LiveTicketedSession | null;
  hasJoined: boolean;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<LiveSessionAnchor | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setAnchor(null);
      setHasJoined(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const walletSnap = readWalletSessionCache(user.id);
        const ticketsPromise = walletSnap
          ? Promise.resolve(walletSnap.items)
          : Promise.all([
              EntitlementService.getMyWallet(user.id),
              EntitlementService.getWalletMemberHub(user.id),
            ]).then(([items, hub]) => {
              writeWalletSessionCache(user.id, items, hub);
              return items;
            });

        const [tickets, events] = await Promise.all([
          ticketsPromise,
          DataService.getEvents(),
        ]);
        if (cancelled) return;

        const next = pickLiveTicketedSession(tickets, events, Date.now());
        if (!next) {
          setAnchor(null);
          setHasJoined(false);
          return;
        }

        setAnchor({
          ticket: next.ticket,
          event: next.event,
          locationMode: next.locationMode,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
        });

        try {
          const records = await AttendanceService.getAttendance(next.event.id);
          if (cancelled) return;
          setHasJoined(
            records.some((record) =>
              attendanceMatchesTicket(record, next.ticket, user.id, user.email),
            ),
          );
        } catch {
          if (!cancelled) setHasJoined(false);
        }
      } catch {
        if (!cancelled) {
          setAnchor(null);
          setHasJoined(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, tick]);

  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    const unsubscribe = subscribeAttendanceUpdated(() => refresh());
    return () => {
      window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
      unsubscribe();
    };
  }, [refresh]);

  const session = useMemo((): LiveTicketedSession | null => {
    if (!anchor) return null;
    const phase = classifyLivePhase(anchor.startsAt, anchor.endsAt, nowMs);
    if (!phase) return null;
    return {
      ticket: anchor.ticket,
      event: anchor.event,
      phase,
      locationMode: anchor.locationMode,
      startsAt: anchor.startsAt,
      endsAt: anchor.endsAt,
      msUntilStart: Math.max(0, anchor.startsAt.getTime() - nowMs),
    };
  }, [anchor, nowMs]);

  // When the local clock leaves the window, refetch so another ticket can take over.
  useEffect(() => {
    if (anchor && !session) {
      refresh();
    }
  }, [anchor, session, refresh]);

  return { session, hasJoined, refresh };
}
