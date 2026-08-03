"use client";

import React from 'react';
import type { LiveTicketedSession } from '../logic/liveSessionWindow';
import { formatCountdown } from '../logic/liveSessionWindow';

interface EventLiveStatusStripProps {
  session: LiveTicketedSession;
  hasJoined: boolean;
  onActivate: () => void;
}

/**
 * Top status strip for My Zone phone when the user holds a ticket for a
 * soon-starting (H-2) or currently running session.
 */
const EventLiveStatusStrip: React.FC<EventLiveStatusStripProps> = ({
  session,
  hasJoined,
  onActivate,
}) => {
  const isLive = session.phase === 'live';
  const isOnline =
    session.locationMode === 'ONLINE' || session.locationMode === 'HYBRID';

  const ctaLabel = isLive
    ? hasJoined
      ? isOnline
        ? 'Tap to return to session'
        : 'Tap to return to check-in'
      : isOnline
        ? 'Join session now'
        : 'Scan attendance now'
    : isOnline
      ? 'Get ready to join'
      : 'Get ready to scan';

  return (
    <button
      type="button"
      onClick={onActivate}
      className={`safe-area-top relative z-50 flex w-full shrink-0 items-center gap-2 px-3 py-2 text-left text-white shadow-sm ${
        isLive ? 'bg-emerald-600' : 'bg-amber-500'
      }`}
      aria-label={`${ctaLabel}. ${session.event.name}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[12px] leading-tight">
        <span className="inline-flex min-w-0 items-center gap-1.5 animate-[myzone-breathe_1.6s_ease-in-out_infinite]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.35)]" />
          <span className="shrink-0 font-bold whitespace-nowrap">{ctaLabel}</span>
        </span>

        <span className="shrink-0 text-white/70" aria-hidden>
          –
        </span>

        <span className="min-w-0 truncate font-medium text-white/90">
          {session.event.name}
        </span>

        {!isLive && (
          <span className="ml-auto shrink-0 rounded-md bg-black/15 px-1.5 py-0.5 font-mono text-[11px] font-black tabular-nums tracking-wide">
            {formatCountdown(session.msUntilStart)}
          </span>
        )}
      </span>
    </button>
  );
};

export default EventLiveStatusStrip;
