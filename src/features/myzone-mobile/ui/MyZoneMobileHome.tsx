"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Coins,
  MapPin,
  PlayCircle,
  QrCode,
  Search,
  Sparkles,
  Ticket,
  Video,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { DataService } from '../../../services/dataService';
import { ContentService } from '../../../services/contentService';
import { EntitlementService } from '../../../services/entitlementService';
import { WALLET_REFRESH_EVENT } from '../../../services/paymentService';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../../../lib/walletSessionCache';
import type { ContentPost, Event, LocationMode } from '../../../types/index';
import { ViewState } from '../../../types/index';
import type { WalletItem } from '../../../types/access';
import { useOnboardingOptional } from '../../../components/onboarding/OnboardingProvider';
import { resolveEventDisplayTime } from '../../../lib/eventDisplayTime';
import TicketDetailModal from '../../../components/wallet/TicketDetailModal';
import {
  MY_ZONE_MOBILE_SHORTCUTS,
  MY_ZONE_MOBILE_SHORTCUT_TONES,
} from '../logic/myZoneMobileNav';
import { pickNextUpcomingTicket, resolveUpcomingTicketWindow, resolveSessionWindow } from '../logic/liveSessionWindow';
import MyZoneMobileMoreSheet from './MyZoneMobileMoreSheet';
import { SOON_AVAILABLE_FEATURE_KEY } from './SoonAvailablePage';
import ContentHubHeroCarousel from './ContentHubHeroCarousel';
import { MyZoneHomeSkeleton } from '../../../components/ui/page-skeletons';

interface MyZoneMobileHomeProps {
  onNavigate: (view: ViewState) => void;
}

/** Same join-window rule as desktop ticket modal (`useTicketLogic`): 1 hour before start. */
const ONLINE_JOIN_WINDOW_MS = 60 * 60 * 1000;

/** `Event.date` is stored as `YYYY-MM-DD`, so plain string compare is enough. */
function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatEventDate(date?: string): string {
  if (!date) return 'Date TBD';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(date?: string): { day: string; month: string } {
  if (!date) return { day: '--', month: '' };
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return { day: '--', month: '' };
  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: parsed.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

function parseTicketStart(ticket: WalletItem): Date | null {
  const dateValue = ticket.expiryDate;
  if (!dateValue) return null;
  const baseDate = new Date(dateValue);
  if (Number.isNaN(baseDate.getTime())) return null;

  const timeValue = resolveEventDisplayTime(
    {
      time: typeof ticket.meta?.time === 'string' ? ticket.meta.time : undefined,
    },
    typeof ticket.meta?.time === 'string' ? ticket.meta.time : undefined,
  );
  const timeMatch = timeValue?.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return baseDate;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return baseDate;

  const start = new Date(baseDate);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

function readTicketLocationMode(ticket: WalletItem): LocationMode {
  const mode = ticket.meta?.locationMode;
  if (mode === 'ONLINE' || mode === 'OFFLINE' || mode === 'HYBRID') return mode;
  return 'OFFLINE';
}

function resolveEventBannerUrl(event?: Event | null): string | undefined {
  const url = event?.banner_url?.trim();
  return url || undefined;
}

/** Prefer the next open child session banner for container tickets. */
function resolveTicketBannerUrl(ticket: WalletItem, events: Event[]): string | undefined {
  const eventId = ticket.meta?.eventId ? String(ticket.meta.eventId) : '';
  if (!eventId) return undefined;
  const root = events.find((event) => event.id === eventId);
  if (!root) return undefined;

  if (root.type === 'CONTAINER') {
    const nowMs = Date.now();
    const openChildren = events
      .filter((event) => event.parentEventId === root.id)
      .map((child) => ({ child, window: resolveSessionWindow(child) }))
      .filter(
        (row): row is { child: Event; window: { startsAt: Date; endsAt: Date } } =>
          Boolean(row.window) && nowMs <= row.window!.endsAt.getTime(),
      )
      .sort((a, b) => a.window.startsAt.getTime() - b.window.startsAt.getTime());

    for (const row of openChildren) {
      const banner = resolveEventBannerUrl(row.child);
      if (banner) return banner;
    }
  }

  return resolveEventBannerUrl(root);
}

const SectionHeading: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, actionLabel, onAction }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="flex items-center gap-0.5 text-xs font-bold text-blue-600 transition-colors active:text-blue-700"
      >
        {actionLabel}
        <ChevronRight size={14} aria-hidden />
      </button>
    )}
  </div>
);

const EventCatalogCard: React.FC<{
  event: Event;
  onOpen: () => void;
}> = ({ event, onOpen }) => {
  const { day, month } = formatShortDate(event.date);
  const bannerUrl = resolveEventBannerUrl(event);
  const isOnline = event.locationMode === 'ONLINE';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition-colors active:bg-slate-50"
    >
      <span className="relative block h-28 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" aria-hidden className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <CalendarDays size={28} className="text-slate-300" aria-hidden />
          </span>
        )}
        <span className="absolute left-2 top-2 flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-white/95 text-blue-700 shadow-sm ring-1 ring-black/5">
          <span className="text-sm font-black leading-none">{day}</span>
          <span className="text-[8px] font-bold tracking-wider">{month}</span>
        </span>
        {isOnline && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
            <Video size={10} aria-hidden />
            Online
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
          {event.name}
        </span>
        <span className="mt-auto flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin size={11} className="shrink-0" aria-hidden />
          <span className="truncate">{event.location || 'TBD'}</span>
        </span>
        {event.time && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock size={11} className="shrink-0" aria-hidden />
            <span className="truncate">{event.time}</span>
          </span>
        )}
      </span>
    </button>
  );
};

const MyZoneMobileHome: React.FC<MyZoneMobileHomeProps> = ({ onNavigate }) => {
  const { user, isProfileComplete } = useAuth();
  const onboarding = useOnboardingOptional();
  const profileLocked = !isProfileComplete;

  const [walletItems, setWalletItems] = useState<WalletItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [articles, setArticles] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);

  const guardedNavigate = useCallback(
    (view: ViewState) => {
      onNavigate(profileLocked && view !== ViewState.SETTINGS ? ViewState.SETTINGS : view);
    },
    [profileLocked, onNavigate],
  );

  const loadHome = useCallback(async () => {
    if (!user) return;
    const walletSnapshot = readWalletSessionCache(user.id);
    const walletPromise = walletSnapshot
      ? Promise.resolve(walletSnapshot.items)
      : Promise.all([
          EntitlementService.getMyWallet(user.id),
          EntitlementService.getWalletMemberHub(user.id),
        ]).then(([items, hub]) => {
          writeWalletSessionCache(user.id, items, hub);
          return items;
        });

    const [items, allEvents, publishedContent] = await Promise.all([
      walletPromise,
      DataService.getEvents(),
      ContentService.getPublishedContent(),
    ]);

    setWalletItems(items);
    setEvents(allEvents);
    setArticles(publishedContent);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadHome()
      .catch((error) => {
        if (cancelled) return;
        console.error('[MyZoneMobileHome] load failed', error);
        setWalletItems([]);
        setEvents([]);
        setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loadHome]);

  useEffect(() => {
    if (!user) return;
    const onWalletRefresh = () => {
      void loadHome().catch((error) =>
        console.error('[MyZoneMobileHome] refresh failed', error),
      );
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onWalletRefresh);
  }, [user, loadHome]);

  useEffect(() => {
    if (!loading) onboarding?.markViewReady();
  }, [loading, onboarding]);

  const upcomingEvents = useMemo(() => {
    const today = todayIso();
    return events
      .filter(
        (event) =>
          event.date >= today &&
          !event.parentEventId &&
          event.isVisibleInCatalog !== false &&
          event.status !== 'Cancelled' &&
          event.status !== 'Completed',
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  /** All active catalog events (online + offline + hybrid). */
  const catalogEvents = useMemo(() => upcomingEvents.slice(0, 8), [upcomingEvents]);

  const onsiteEvents = useMemo(
    () => upcomingEvents.filter((event) => event.locationMode !== 'ONLINE').slice(0, 6),
    [upcomingEvents],
  );

  const nextTicket = useMemo(
    () => pickNextUpcomingTicket(walletItems, events),
    [walletItems, events],
  );

  const nextTicketBannerUrl = useMemo(
    () => (nextTicket ? resolveTicketBannerUrl(nextTicket, events) : undefined),
    [nextTicket, events],
  );

  const nextTicketMode = nextTicket ? readTicketLocationMode(nextTicket) : null;
  const nextTicketIsOnline = nextTicketMode === 'ONLINE';

  const nextTicketJoinWindowStart = useMemo(() => {
    if (!nextTicket || !nextTicketIsOnline) return null;
    const window = resolveUpcomingTicketWindow(nextTicket, events);
    if (window) return new Date(window.startsAt.getTime() - ONLINE_JOIN_WINDOW_MS);
    const start = parseTicketStart(nextTicket);
    if (!start) return null;
    return new Date(start.getTime() - ONLINE_JOIN_WINDOW_MS);
  }, [nextTicket, nextTicketIsOnline, events]);

  const canJoinNextOnlineSession = useMemo(() => {
    if (!nextTicketIsOnline) return false;
    if (!nextTicketJoinWindowStart) return true;
    return Date.now() >= nextTicketJoinWindowStart.getTime();
  }, [nextTicketIsOnline, nextTicketJoinWindowStart]);

  const activeTicketCount = useMemo(
    () =>
      walletItems.filter((item) => item.type === 'TICKET' && item.status === 'ACTIVE')
        .length,
    [walletItems],
  );

  const flexCredits = useMemo(
    () =>
      walletItems
        .filter((item) => item.type === 'CREDIT_PASS' && item.status === 'ACTIVE')
        .reduce(
          (total, item) =>
            item.meta?.isUnlimited ? total : total + (item.meta?.credits || 0),
          0,
        ),
    [walletItems],
  );

  const hasUnlimitedPass = useMemo(
    () =>
      walletItems.some(
        (item) =>
          item.type === 'CREDIT_PASS' &&
          item.status === 'ACTIVE' &&
          item.meta?.isUnlimited,
      ),
    [walletItems],
  );

  const publishedArticles = useMemo(
    () => articles.filter((post) => post.type !== 'ADVERTISEMENT').slice(0, 6),
    [articles],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return {
      events: upcomingEvents
        .filter(
          (event) =>
            event.name.toLowerCase().includes(trimmedQuery) ||
            event.location?.toLowerCase().includes(trimmedQuery),
        )
        .slice(0, 5),
      articles: articles
        .filter((post) => post.title.toLowerCase().includes(trimmedQuery))
        .slice(0, 5),
    };
  }, [trimmedQuery, upcomingEvents, articles]);

  if (loading) {
    return <MyZoneHomeSkeleton />;
  }

  return (
    <div className="w-full min-w-0 animate-fade-in">
      <div
        className="flex w-full min-w-0 flex-col gap-6 px-4 pt-3"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Hero + floating search (search overlaps banner bottom like the reference) */}
        <div className="relative pb-5">
          <ContentHubHeroCarousel posts={articles} />

          <div className="absolute inset-x-3 bottom-0 z-20">
            <div className="relative">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find events, classes & other features"
                aria-label="Search events or articles"
                className="w-full rounded-full border border-slate-200/90 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)] outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {searchResults ? (
          <section>
            <SectionHeading title="Search results" />
            {searchResults.events.length === 0 && searchResults.articles.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
                Nothing matched “{query.trim()}”.
              </p>
            ) : (
              <ul className="space-y-2">
                {searchResults.events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => guardedNavigate(ViewState.EVENT_MARKETPLACE)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <CalendarDays size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {event.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {formatEventDate(event.date)} · {event.location || 'TBD'}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                    </button>
                  </li>
                ))}
                {searchResults.articles.map((post) => (
                  <li key={post.id}>
                    <a
                      href={`/articles/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors active:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Sparkles size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">
                          {post.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {post.author} · {formatEventDate(post.publishDate)}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            {/* Shortcut grid */}
            <section>
              <ul className="grid grid-cols-4 gap-2">
                {MY_ZONE_MOBILE_SHORTCUTS.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <li key={shortcut.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (shortcut.opensMore) {
                            setIsMoreOpen(true);
                            return;
                          }
                          if (!shortcut.view) return;
                          if (shortcut.view === ViewState.SOON_AVAILABLE) {
                            try {
                              sessionStorage.setItem(
                                SOON_AVAILABLE_FEATURE_KEY,
                                shortcut.label,
                              );
                            } catch {
                              /* ignore */
                            }
                          }
                          guardedNavigate(shortcut.view);
                        }}
                        className="flex w-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-1 py-3 shadow-sm transition-colors active:bg-slate-50"
                      >
                        <span
                          className={`relative flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${
                            MY_ZONE_MOBILE_SHORTCUT_TONES[shortcut.tone]
                          }`}
                        >
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="text-center text-[10px] font-bold leading-tight text-slate-700">
                          {shortcut.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* My next ticket */}
            <section data-tour="member-dashboard-next-event">
              <SectionHeading
                title="Your next session"
                actionLabel="Wallet"
                onAction={() => guardedNavigate(ViewState.WALLET)}
              />
              {nextTicket ? (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  {nextTicketBannerUrl && (
                    <div className="h-32 w-full overflow-hidden bg-slate-100">
                      <img
                        src={nextTicketBannerUrl}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {!nextTicketBannerUrl && (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                          <Ticket size={20} aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {nextTicket.title}
                        </h3>
                        <p className="truncate text-xs text-slate-500">{nextTicket.subtitle}</p>
                      </div>
                      {nextTicketIsOnline && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 ring-1 ring-indigo-100">
                          <Video size={10} aria-hidden />
                          Online
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Date
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                          {formatEventDate(nextTicket.expiryDate)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {nextTicketIsOnline ? 'Mode' : 'Venue'}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                          {nextTicketIsOnline
                            ? 'Online session'
                            : nextTicket.meta?.location || 'TBD'}
                        </p>
                      </div>
                    </div>
                    {nextTicketIsOnline ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewingTicket(nextTicket)}
                          disabled={!canJoinNextOnlineSession}
                          className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
                            canJoinNextOnlineSession
                              ? 'bg-indigo-600 text-white active:bg-indigo-700'
                              : 'cursor-not-allowed bg-slate-200 text-slate-500'
                          }`}
                        >
                          <PlayCircle size={14} aria-hidden />
                          Join session
                        </button>
                        {!canJoinNextOnlineSession && nextTicketJoinWindowStart && (
                          <p className="mt-2 text-center text-[11px] text-amber-600">
                            Join opens {nextTicketJoinWindowStart.toLocaleString()} (1 hour before
                            start)
                          </p>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => guardedNavigate(ViewState.MEMBER_ATTENDANCE)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors active:bg-slate-800"
                      >
                        <QrCode size={14} aria-hidden />
                        Scan attendance
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => guardedNavigate(ViewState.STORE_CATALOG)}
                  className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-left transition-colors active:bg-slate-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Ticket size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">
                      No upcoming session
                    </span>
                    <span className="block text-xs text-slate-500">
                      You don&apos;t have any sessions to attend next. Browse the
                      store when you&apos;re ready.
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                </button>
              )}
            </section>

            {/* All upcoming events */}
            {catalogEvents.length > 0 && (
              <section>
                <SectionHeading
                  title="Events"
                  actionLabel="See all"
                  onAction={() => guardedNavigate(ViewState.EVENT_MARKETPLACE)}
                />
                <div className="-mx-4 overflow-x-scroll-touch px-4">
                  <ul className="flex w-max gap-3 pb-1">
                    {catalogEvents.map((event) => (
                      <li key={event.id} className="w-[220px] shrink-0">
                        <EventCatalogCard
                          event={event}
                          onOpen={() => guardedNavigate(ViewState.EVENT_MARKETPLACE)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Onsite events */}
            {onsiteEvents.length > 0 && (
              <section>
                <SectionHeading
                  title="Onsite events"
                  actionLabel="See all"
                  onAction={() => guardedNavigate(ViewState.EVENT_MARKETPLACE)}
                />
                <div className="-mx-4 overflow-x-scroll-touch px-4">
                  <ul className="flex w-max gap-3 pb-1">
                    {onsiteEvents.map((event) => (
                      <li key={event.id} className="w-[220px] shrink-0">
                        <EventCatalogCard
                          event={event}
                          onOpen={() => guardedNavigate(ViewState.EVENT_MARKETPLACE)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Wallet snapshot */}
            <section data-tour="member-dashboard-wallet">
              <SectionHeading
                title="Wallet snapshot"
                actionLabel="Open wallet"
                onAction={() => guardedNavigate(ViewState.WALLET)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                    <Coins size={18} aria-hidden />
                  </span>
                  <p className="mt-3 text-2xl font-bold leading-none text-slate-900">
                    {hasUnlimitedPass && flexCredits === 0 ? '∞' : flexCredits}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Flex credits
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Ticket size={18} aria-hidden />
                  </span>
                  <p className="mt-3 text-2xl font-bold leading-none text-slate-900">
                    {activeTicketCount}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active tickets
                  </p>
                </div>
              </div>
            </section>

            {/* Articles */}
            {publishedArticles.length > 0 && (
              <section>
                <SectionHeading title="Articles for you" />
                <div className="-mx-4 overflow-x-scroll-touch px-4">
                  <ul className="flex w-max gap-3 pb-1">
                    {publishedArticles.map((post) => (
                      <li key={post.id} className="w-[220px] shrink-0">
                        <a
                          href={`/articles/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors active:bg-slate-50"
                        >
                          <span className="block h-28 w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                            {post.imageUrl && (
                              <img
                                src={post.imageUrl}
                                alt=""
                                aria-hidden
                                className="h-full w-full object-cover"
                              />
                            )}
                          </span>
                          <span className="flex flex-1 flex-col p-3">
                            <span className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                              {post.title}
                            </span>
                            <span className="mt-2 text-[11px] text-slate-500">
                              {formatEventDate(post.publishDate)}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {isMoreOpen && (
        <MyZoneMobileMoreSheet
          onClose={() => setIsMoreOpen(false)}
          onNavigate={guardedNavigate}
        />
      )}

      {viewingTicket && (
        <TicketDetailModal
          item={viewingTicket}
          onClose={() => setViewingTicket(null)}
        />
      )}
    </div>
  );
};

export default MyZoneMobileHome;
