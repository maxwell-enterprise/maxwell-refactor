"use client";

import React from 'react';
import { UserCircle } from 'lucide-react';
import { ViewState } from '../../../types/index';
import { TicketIcon } from '../../../components/ui/ticket';
import TicketDetailModal from '../../../components/wallet/TicketDetailModal';
import MyZoneMobileBottomNav from './MyZoneMobileBottomNav';
import EventLiveStatusStrip from './EventLiveStatusStrip';
import { useLiveTicketedSession } from '../hooks/useLiveTicketedSession';

interface MyZoneMobileShellProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userName?: string | null;
  avatarUrl?: string | null;
  /** Pending gift tickets waiting to be claimed (drives wallet ticket alert). */
  pendingGiftCount?: number;
  /** Existing header bell + dropdown, reused verbatim from the dashboard layout. */
  notificationSlot?: React.ReactNode;
  /** Onboarding tour trigger, rendered next to the header actions. */
  onboardingSlot?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}

function formatViewTitle(view: ViewState): string {
  return String(view)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatGiftBadge(count: number): string {
  return count > 9 ? '9+' : String(count);
}

const MyZoneMobileShell: React.FC<MyZoneMobileShellProps> = ({
  currentView,
  onNavigate,
  userName,
  avatarUrl,
  pendingGiftCount = 0,
  notificationSlot,
  onboardingSlot,
  banner,
  children,
}) => {
  const [isAvatarBroken, setIsAvatarBroken] = React.useState(false);
  const [viewingLiveTicket, setViewingLiveTicket] = React.useState(false);
  const { session: liveSession, hasJoined, refresh: refreshLiveSession } =
    useLiveTicketedSession();
  const firstName = userName?.trim().split(' ')[0] ?? 'there';
  const isHome = currentView === ViewState.DASHBOARD;
  const hasClaimableGifts = pendingGiftCount > 0;

  React.useEffect(() => {
    setIsAvatarBroken(false);
  }, [avatarUrl]);

  const handleLiveStripActivate = () => {
    if (!liveSession) return;
    const mode = liveSession.locationMode;
    if (mode === 'ONLINE' || mode === 'HYBRID') {
      setViewingLiveTicket(true);
      return;
    }
    onNavigate(ViewState.MEMBER_ATTENDANCE);
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      {liveSession && (
        <EventLiveStatusStrip
          session={liveSession}
          hasJoined={hasJoined}
          onActivate={handleLiveStripActivate}
        />
      )}

      <header
        className={`sticky top-0 z-40 shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
          liveSession ? '' : 'safe-area-top'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate(ViewState.SETTINGS)}
              aria-label="Account settings"
              data-tour="myzone-nav-settings"
              className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-md ring-2 ring-white"
            >
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
                {avatarUrl && !isAvatarBroken ? (
                  <img
                    src={avatarUrl}
                    alt={userName ?? 'Profile'}
                    className="h-full w-full object-cover"
                    // Google CDN avatars 403 when Referer is sent from localhost / our domain.
                    referrerPolicy="no-referrer"
                    onError={() => setIsAvatarBroken(true)}
                  />
                ) : (
                  <UserCircle size={24} className="text-slate-400" aria-hidden />
                )}
              </span>
            </button>

            <div className="min-w-0">
              <p className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="mr-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-indigo-500" />
                My Zone
              </p>
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900">
                {isHome ? `Hi, ${firstName}!` : formatViewTitle(currentView)}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onboardingSlot}
            <button
              type="button"
              onClick={() => onNavigate(ViewState.WALLET)}
              aria-label={
                hasClaimableGifts
                  ? `My wallet, ${pendingGiftCount} gift${pendingGiftCount === 1 ? '' : 's'} to claim`
                  : 'My wallet'
              }
              data-tour="myzone-nav-wallet"
              className={`touch-target relative flex items-center justify-center rounded-full p-2 transition-colors ${
                hasClaimableGifts
                  ? 'bg-blue-50/90 text-blue-600 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <TicketIcon
                size={20}
                className="shrink-0"
                aria-hidden
                alertLoop={hasClaimableGifts}
              />
              {hasClaimableGifts && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
                  {formatGiftBadge(pendingGiftCount)}
                </span>
              )}
            </button>
            {notificationSlot}
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overscroll-y-contain bg-slate-50">
        {banner}
        {children}
      </main>

      <MyZoneMobileBottomNav currentView={currentView} onNavigate={onNavigate} />

      {viewingLiveTicket && liveSession && (
        <TicketDetailModal
          item={liveSession.ticket}
          onClose={() => {
            setViewingLiveTicket(false);
            refreshLiveSession();
          }}
        />
      )}
    </div>
  );
};

export default MyZoneMobileShell;
