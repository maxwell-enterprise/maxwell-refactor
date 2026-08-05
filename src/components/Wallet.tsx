
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntitlementService } from '../services/entitlementService';
import { WALLET_REFRESH_EVENT } from '../services/paymentService';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../lib/walletSessionCache';
import { GiftAllocation, WalletItem, WalletMemberHub } from '../types/access';
import { ViewState } from '../types/index';
import { 
    QrCode, Ticket, Calendar, Zap, 
    ShieldCheck, Clock, Search, Share2, Package, ExternalLink, Gift, User
} from 'lucide-react';
import QRCodeDisplay from './common/QRCodeDisplay';
import { useToast } from '../context/ToastContext';
import WalletHistory from './wallet/WalletHistory';
import TicketDistributionModal from './wallet/TicketDistributionModal';
import TicketDetailModal from './wallet/TicketDetailModal'; // Use the full detail modal
import GiftClaimModal from './wallet/GiftClaimModal';
import CreateGiftLinkModal from './wallet/CreateGiftLinkModal';
import { Badge } from './ui/badge';
import EventCampaignOfferStack from './marketing/EventCampaignOfferStack';
import { useOnboardingOptional } from './onboarding/OnboardingProvider';
import { isProfileComplete as resolveProfileComplete } from '../lib/profileCompletion';
import PageBackButton from './common/PageBackButton';
import { WalletPageSkeleton } from './ui/page-skeletons';

interface WalletProps {
  /** Opens Event Catalogue so users can redeem program credits (Nest-backed events). */
  onNavigate?: (view: ViewState) => void;
}

type TicketBucket = 'SELF' | 'SHARING_POOL' | 'SHARING_SENT' | 'RECEIVED_GIFT';

function classifyWalletTicket(t: WalletItem): TicketBucket {
  if (t.sponsoredBy) return 'RECEIVED_GIFT';
  if (t.isTransferable === true) {
    const hasRecipient =
      (typeof t.meta?.recipientName === 'string' && t.meta.recipientName.trim().length > 0) ||
      (typeof t.meta?.recipientEmail === 'string' && t.meta.recipientEmail.trim().length > 0) ||
      (typeof t.meta?.recipientPhone === 'string' && t.meta.recipientPhone.trim().length > 0);
    if (t.status === 'PENDING_CLAIM' || t.status === 'GIFT_PENDING' || hasRecipient) {
      return 'SHARING_SENT';
    }
    if (t.status === 'ACTIVE') return 'SHARING_POOL';
  }
  return 'SELF';
}

function readTicketRecipientName(ticket: WalletItem, gift?: GiftAllocation): string {
  const fromGift = gift?.recipientName?.trim();
  if (fromGift) return fromGift;
  const fromMeta =
    typeof ticket.meta?.recipientName === 'string' ? ticket.meta.recipientName.trim() : '';
  if (fromMeta) return fromMeta;
  const fromEmail = gift?.targetEmail?.split('@')[0]?.trim();
  if (fromEmail) return fromEmail;
  return 'Guest';
}

function formatSentGuestRecipientLine(ticket: WalletItem, gift?: GiftAllocation): string {
  const name = readTicketRecipientName(ticket, gift);
  const email =
    gift?.targetEmail?.trim() ||
    (typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail.trim() : '');
  const phone =
    gift?.recipientPhone?.trim() ||
    (typeof ticket.meta?.recipientPhone === 'string' ? ticket.meta.recipientPhone.trim() : '');
  if (email) return `To: ${name} (${email})`;
  if (phone) return `To: ${name} (${phone})`;
  return `To: ${name}`;
}

function groupTicketsByBundleKey(tickets: WalletItem[]): WalletItem[][] {
  const groups: Record<string, WalletItem[]> = {};
  for (const t of tickets) {
    const key = `${t.meta?.eventId ?? 'no-event'}::${t.title}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return Object.values(groups);
}

function resolveEventGroupKey(t: WalletItem): string {
  const eventId =
    typeof t.meta?.eventId === 'string' ? t.meta.eventId.trim() : '';
  if (eventId) return eventId;
  const subtitle = t.subtitle?.trim();
  if (subtitle) return `subtitle:${subtitle}`;
  return `title:${t.title?.trim() || t.id}`;
}

function resolveEventGroupLabel(tickets: WalletItem[]): string {
  const first = tickets[0];
  if (!first) return 'Event';
  const subtitle = first.subtitle?.trim();
  if (subtitle) return subtitle;
  return first.title?.trim() || 'Event';
}

function groupTicketsByEvent(
  tickets: WalletItem[],
): Array<{ eventKey: string; label: string; tickets: WalletItem[] }> {
  const groups: Record<string, WalletItem[]> = {};
  for (const t of tickets) {
    const key = resolveEventGroupKey(t);
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return Object.entries(groups).map(([eventKey, list]) => ({
    eventKey,
    label: resolveEventGroupLabel(list),
    tickets: list,
  }));
}

const Wallet: React.FC<WalletProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const onboarding = useOnboardingOptional();
  const profileComplete = resolveProfileComplete(user);
  const [items, setItems] = useState<WalletItem[]>([]);
  const [pendingGifts, setPendingGifts] = useState<GiftAllocation[]>([]);
  const [sentGifts, setSentGifts] = useState<GiftAllocation[]>([]);
  const [memberHub, setMemberHub] = useState<WalletMemberHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TICKETS' | 'PHYSICAL' | 'HISTORY'>('TICKETS');

  // Replaced simple QR state with full item state
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);
  const [activePendingGift, setActivePendingGift] = useState<GiftAllocation | null>(null);
  
  // Distribution State
  const [distributionContext, setDistributionContext] = useState<WalletItem[] | null>(null);
  const [distributionInitialTab, setDistributionInitialTab] = useState<'ASSIGN' | 'GIFT_LINK' | 'HISTORY'>('ASSIGN');
  const [giftLinkContext, setGiftLinkContext] = useState<WalletItem | null>(null);

  const canOfferGiftLink = (ticket: WalletItem) =>
      ticket.type === 'TICKET' &&
      ticket.status === 'ACTIVE' &&
      ticket.isTransferable === true;

  /**
   * `full` = blocking load (spinner) for cold open or after payment.
   * `background` = silent revalidate; keeps last snapshot on screen (smooth A→B→A).
   */
  const loadWallet = useCallback(
    async (mode: 'full' | 'background' = 'full') => {
      if (!user) return;
      if (mode === 'full') {
        setLoading(true);
      }
      try {
        const [walletData, hub] = await Promise.all([
          EntitlementService.getMyWallet(user.id),
          EntitlementService.getWalletMemberHub(user.id),
        ]);
        setItems(walletData);
        setMemberHub(hub);
        writeWalletSessionCache(user.id, walletData, hub);
      } finally {
        if (mode === 'full') {
          setLoading(false);
        }
      }
    },
    [user],
  );

  const loadPendingGifts = useCallback(async () => {
    const email = user?.email?.trim();
    if (!email) {
      setPendingGifts([]);
      return;
    }
    const gifts = await EntitlementService.getGiftInbox(email);
    setPendingGifts(gifts.filter((gift) => gift.status === 'PENDING'));
  }, [user?.email]);

  const loadSentGifts = useCallback(async () => {
    try {
      const gifts = await EntitlementService.getSentGifts();
      setSentGifts(gifts.filter((gift) => gift.status === 'PENDING'));
    } catch {
      setSentGifts([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const snap = readWalletSessionCache(user.id);
    if (snap) {
      setItems(snap.items);
      setMemberHub(snap.memberHub);
      setLoading(false);
      void loadWallet('background');
      void loadPendingGifts();
      void loadSentGifts();
    } else {
      void loadWallet('full');
      void loadPendingGifts();
      void loadSentGifts();
    }
  }, [user, loadWallet, loadPendingGifts, loadSentGifts]);

  useEffect(() => {
    if (!user) return;
    const onRefresh = () => {
      void loadWallet('full');
      void loadPendingGifts();
      void loadSentGifts();
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
  }, [user, loadWallet, loadPendingGifts, loadSentGifts]);

  useEffect(() => {
    if (!loading) {
      onboarding?.markViewReady();
    }
  }, [loading, onboarding]);

  const ticketBuckets = useMemo(() => {
      const tickets = items.filter(
          (i) => i.type === 'TICKET' && i.status !== 'EXPIRED',
      );
      const buckets: Record<TicketBucket, WalletItem[]> = {
          SELF: [],
          SHARING_POOL: [],
          SHARING_SENT: [],
          RECEIVED_GIFT: [],
      };
      for (const t of tickets) {
          buckets[classifyWalletTicket(t)].push(t);
      }
      return buckets;
  }, [items]);

  const sentGiftByTicketId = useMemo(() => {
    const map = new Map<string, GiftAllocation>();
    for (const gift of sentGifts) {
      if (!map.has(gift.entitlementId)) {
        map.set(gift.entitlementId, gift);
      }
    }
    return map;
  }, [sentGifts]);

  const hasOwnedTickets =
      ticketBuckets.SELF.length > 0 ||
      ticketBuckets.SHARING_POOL.length > 0 ||
      ticketBuckets.SHARING_SENT.length > 0 ||
      ticketBuckets.RECEIVED_GIFT.length > 0;
  
  const creditPasses = useMemo(() => {
       return items.filter(i => i.type === 'CREDIT_PASS' && i.status === 'ACTIVE');
  }, [items]);

  const digitalItems = useMemo(() => {
      return items.filter(
          (i) => i.type === 'DIGITAL_CONTENT' && i.status === 'ACTIVE',
      );
  }, [items]);

  const physicalOrders = useMemo(() => {
      return items.filter((i) => i.type === 'PHYSICAL_ORDER');
  }, [items]);

  // DATE FORMATTER FOR BIG DISPLAY
  const formatEventDate = (dateStr?: string) => {
      if (!dateStr) return { day: '??', month: '???', full: 'Date TBA', weekday: '' };
      const date = new Date(dateStr);
      return {
          day: date.getDate().toString(),
          month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
          weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
          full: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      };
  };

  const openDistribution = (
      tickets: WalletItem[],
      initialTab: 'ASSIGN' | 'GIFT_LINK' | 'HISTORY' = 'ASSIGN',
  ) => {
      setDistributionInitialTab(initialTab);
      setDistributionContext(tickets);
  };

  const getEventDistributionTickets = (eventKey: string): WalletItem[] =>
      items.filter((item) => {
          if (item.type !== 'TICKET' || item.status === 'EXPIRED' || item.sponsoredBy) return false;
          if (item.isTransferable !== true) return false;
          const bucket = classifyWalletTicket(item);
          return (
              resolveEventGroupKey(item) === eventKey &&
              (bucket === 'SHARING_POOL' || bucket === 'SHARING_SENT')
          );
      });

  const renderPersonalTicketCard = (ticket: WalletItem, footerLabel = 'Self ticket') => {
      const ticketDate = formatEventDate(ticket.expiryDate);
      const isCheckedIn = ticket.status === 'USED' || ticket.status === 'CLAIMED';
      const giftFrom =
          ticket.sponsoredBy && typeof ticket.sponsoredBy === 'string'
              ? ticket.sponsoredBy
              : null;
      return (
          <div
              key={ticket.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewingTicket(ticket)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingTicket(ticket);
                  }
              }}
              className="group cursor-pointer overflow-visible rounded-[2.5rem] border border-slate-200 bg-white p-1 pb-2 shadow-sm transition-all hover:shadow-xl"
          >
              <div className="relative flex wallet-ticket-layout overflow-hidden rounded-[2rem] bg-slate-50 p-4 sm:p-5">
                  <div className="wallet-ticket-date border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ticketDate.weekday}</span>
                      <span className="text-3xl font-black leading-none text-slate-800 sm:text-4xl">{ticketDate.day}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-sm">{ticketDate.month}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center pr-14 sm:pr-16">
                      <h3 className="mb-1 truncate text-lg font-bold leading-tight text-slate-900">{ticket.title}</h3>
                      <p className="mb-2 truncate text-xs text-slate-500">{ticket.subtitle}</p>
                      <p className="flex items-center text-[10px] font-medium text-slate-400">
                          <Calendar size={10} className="mr-1.5" /> {ticketDate.full}
                      </p>
                      {giftFrom && (
                          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                              Gift from {giftFrom}
                          </span>
                      )}
                      {ticket.status === 'PENDING_CLAIM' && (
                          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                              Pending claim
                          </span>
                      )}
                  </div>
                  <div className="absolute bottom-0 right-0 flex h-14 w-14 translate-x-1 translate-y-1 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform group-hover:scale-110 sm:bottom-[-10px] sm:right-[-10px] sm:h-20 sm:w-20 sm:translate-x-0 sm:translate-y-0">
                      <QrCode size={20} className="sm:-translate-x-1 sm:-translate-y-1 sm:size-6" />
                  </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:px-6">
                  <span>{footerLabel}</span>
                  <span className={`flex items-center ${isCheckedIn ? 'text-amber-700' : 'text-green-600'}`}>
                      <ShieldCheck size={12} className="mr-1" /> {isCheckedIn ? 'Checked In' : 'Valid'}
                  </span>
              </div>
          </div>
      );
  };

  const renderSharingPoolCard = (pool: WalletItem[]) => {
      const anchor = pool[0];
      const dateInfo = formatEventDate(anchor.expiryDate);
      return (
          <div key={`pool-${anchor.id}`} className="relative group/bundle">
              <div className="absolute bottom-0 left-2 right-2 top-2 z-0 scale-[0.95] translate-y-2 transform rounded-[2.5rem] border border-slate-200 bg-white shadow-sm" />
              <div className="absolute bottom-0 left-4 right-4 top-4 z-0 scale-[0.9] translate-y-4 transform rounded-[2.5rem] border border-slate-200 bg-white shadow-sm" />
              <div className="relative z-10 overflow-visible rounded-[2.5rem] border border-indigo-200 bg-white p-1 pb-2 shadow-md">
                  <div className="relative wallet-ticket-layout overflow-hidden rounded-[2rem] bg-indigo-50 p-4 sm:p-5">
                      <div className="wallet-ticket-date border-indigo-200">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">{dateInfo.weekday}</span>
                          <span className="text-3xl font-black leading-none text-indigo-900 sm:text-4xl">{dateInfo.day}</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 sm:text-sm">{dateInfo.month}</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <div className="mb-1 flex items-center">
                              <span className="mr-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                  Assign recipients
                              </span>
                          </div>
                          <h3 className="mb-1 truncate text-lg font-bold leading-tight text-indigo-900">{anchor.title}</h3>
                          <p className="mb-1 truncate text-xs text-indigo-600">{anchor.subtitle}</p>
                          <p className="truncate text-xs text-indigo-600">
                              <span className="rounded bg-white px-1.5 font-black">{pool.length}</span>{' '}
                              {pool.length === 1 ? 'ticket ready to share' : 'tickets ready to share'}
                          </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 sm:items-center sm:pl-2 sm:pt-0">
                          {pool.length === 1 && canOfferGiftLink(anchor) ? (
                              <button
                                  type="button"
                                  onClick={() => setGiftLinkContext(anchor)}
                                  className="rounded-xl border border-indigo-200 bg-white p-4 text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 active:scale-95"
                                  aria-label="Create gift link"
                              >
                                  <Gift size={20} />
                              </button>
                          ) : null}
                          <button
                              type="button"
                              onClick={() => openDistribution(pool)}
                              className="rounded-xl bg-indigo-600 p-4 text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-95 group-hover/bundle:scale-105"
                              aria-label="Open ticket distribution"
                          >
                              <Share2 size={20} />
                          </button>
                      </div>
                  </div>
                  <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                      <span>Sharing ticket</span>
                      <span>Bulk assign</span>
                  </div>
              </div>
          </div>
      );
  };

  const renderSentToGuestsStack = (sentTickets: WalletItem[]) => {
      const anchor = sentTickets[0];
      if (!anchor) return null;
      const ticketDate = formatEventDate(anchor.expiryDate);
      const isStacked = sentTickets.length > 1;
      const gift = sentGiftByTicketId.get(anchor.id);
      const recipientLine = formatSentGuestRecipientLine(anchor, gift);
      const eventKey = resolveEventGroupKey(anchor);

      const openInvitedHistory = (event: React.MouseEvent) => {
          event.stopPropagation();
          openDistribution(getEventDistributionTickets(eventKey), 'HISTORY');
      };

      const cardBody = (
          <div className="relative z-10 overflow-visible rounded-[2.5rem] border border-violet-200 bg-white p-1 pb-2 shadow-md">
              <div className="relative wallet-ticket-layout overflow-hidden rounded-[2rem] bg-violet-50/70 p-4 sm:p-5">
                  <div className="wallet-ticket-date border-violet-200">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">{ticketDate.weekday}</span>
                      <span className="text-3xl font-black leading-none text-violet-900 sm:text-4xl">{ticketDate.day}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-400 sm:text-sm">{ticketDate.month}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <span className="mb-2 inline-flex w-fit items-center rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Awaiting acceptance
                      </span>
                      <h3 className="mb-1 truncate text-lg font-bold leading-tight text-slate-900">{anchor.title}</h3>
                      <p className="mb-1 truncate text-xs text-violet-700">{anchor.subtitle}</p>
                      {isStacked ? (
                          <p className="truncate text-xs text-violet-700">
                              <span className="rounded bg-white px-1.5 font-black">{sentTickets.length}</span>{' '}
                              {sentTickets.length === 1 ? 'ticket awaiting acceptance' : 'tickets awaiting acceptance'}
                          </p>
                      ) : (
                          <p className="truncate text-xs font-medium text-slate-600">{recipientLine}</p>
                      )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 sm:items-center sm:pl-2 sm:pt-0">
                      <button
                          type="button"
                          onClick={openInvitedHistory}
                          className="rounded-xl bg-violet-600 p-4 text-white shadow-lg transition-all hover:bg-violet-700 active:scale-95 group-hover/sent:scale-105"
                          aria-label="Open invited history"
                      >
                          <Share2 size={20} />
                      </button>
                  </div>
              </div>
              <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-violet-600">
                  <span>Sharing ticket</span>
                  <span>{isStacked ? 'View history' : 'Pending'}</span>
              </div>
          </div>
      );

      if (!isStacked) {
          return (
              <div
                  key={`sent-${anchor.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingTicket(anchor)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingTicket(anchor);
                      }
                  }}
                  className="group/sent cursor-pointer transition-all hover:shadow-xl"
              >
                  {cardBody}
              </div>
          );
      }

      return (
          <div
              key={`sent-stack-${eventKey}`}
              role="button"
              tabIndex={0}
              onClick={openInvitedHistory}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDistribution(getEventDistributionTickets(eventKey), 'HISTORY');
                  }
              }}
              className="group/sent relative mb-3 cursor-pointer overflow-visible pb-2"
          >
              <div className="absolute bottom-0 left-2 right-2 top-2 z-0 scale-[0.95] translate-y-2 transform rounded-[2.5rem] border border-violet-200 bg-white shadow-sm" />
              <div className="absolute bottom-0 left-4 right-4 top-4 z-0 scale-[0.9] translate-y-4 transform rounded-[2.5rem] border border-violet-200 bg-white shadow-sm" />
              {cardBody}
          </div>
      );
  };

  const renderEventGroupHeader = (label: string) => (
      <h4 className="ml-1 border-l-4 border-indigo-500 pl-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          {label}
      </h4>
  );

  const renderTicketsByEventGroup = (
      tickets: WalletItem[],
      renderTicket: (ticket: WalletItem) => React.ReactNode,
  ) =>
      groupTicketsByEvent(tickets).map((group) => (
          <div key={group.eventKey} className="space-y-3">
              {renderEventGroupHeader(group.label)}
              <div className="space-y-4">{group.tickets.map((ticket) => renderTicket(ticket))}</div>
          </div>
      ));

  const renderTicketSection = (
      icon: React.ReactNode,
      title: string,
      description: string,
      children: React.ReactNode,
  ) => (
      <section className="space-y-3">
          <div className="flex items-start gap-3 px-1">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  {icon}
              </div>
              <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">{title}</h3>
                  <p className="text-xs text-slate-500">{description}</p>
              </div>
          </div>
          <div className="space-y-4">{children}</div>
      </section>
  );

  const emptyShell =
    'rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:rounded-[2.5rem] sm:py-20';

  const pendingGiftCount = pendingGifts.length;

  if (loading) {
    return <WalletPageSkeleton />;
  }

  const handlePendingGiftAccepted = () => {
    setActivePendingGift(null);
    window.dispatchEvent(new CustomEvent(WALLET_REFRESH_EVENT));
    void loadWallet('full');
    void loadPendingGifts();
    void loadSentGifts();
  };

  return (
    <div className="relative w-full min-w-0 animate-fade-in bg-slate-50">
      <div className="page-container flex w-full flex-col gap-5 sm:gap-6">
        <div data-tour="member-wallet-header" className="space-y-4">
        {/* Mobile-only wallet chrome */}
        <div className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:hidden">
            <div className="flex min-w-0 items-center gap-3">
                <PageBackButton view={ViewState.WALLET} onNavigate={onNavigate} />
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
                    <QrCode size={24} />
                </div>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-slate-900">Wallet</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Secure ID: {user?.id.slice(-6).toUpperCase()}</p>
                </div>
            </div>
            {items.length > 0 && (
                <button type="button" onClick={() => setViewingTicket(items[0])} className="rounded-full bg-slate-100 p-3 text-slate-600 active:bg-slate-200">
                    <Search size={20} />
                </button>
            )}
        </div>

        <div className="hidden md:block">
          <div className="flex items-center gap-2 sm:gap-3">
            <PageBackButton view={ViewState.WALLET} onNavigate={onNavigate} />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
              <p className="mt-1 text-sm text-slate-500">
                Your tickets, membership, and digital assets.
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Digital membership card — entitlement hub (Nest GET /wallet/member-hub) */}
        {memberHub && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Digital membership
                </p>
                <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                  {memberHub.displayName || user?.fullName || 'Member'}
                </h2>
                <p className="truncate text-xs text-slate-500">{memberHub.email || user?.email}</p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                  {memberHub.memberPublicId && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono font-semibold">
                      Member ID: {memberHub.memberPublicId}
                    </span>
                  )}
                  {memberHub.membershipTier && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-800">
                      Tier: {memberHub.membershipTier}
                    </span>
                  )}
                  {memberHub.cardNumber && (
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-mono text-slate-700">
                      {memberHub.cardNumber}
                    </span>
                  )}
                </div>
                {memberHub.gamification && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Gamification:</span> Level{' '}
                    {memberHub.gamification.currentLevel} · {memberHub.gamification.totalPoints} pts
                    {memberHub.gamification.rank != null
                      ? ` · Rank #${memberHub.gamification.rank}`
                      : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 sm:min-w-[140px]">
                <p className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Gate scan
                </p>
                <div className="rounded-xl bg-white p-2 shadow-inner">
                  <QRCodeDisplay
                    data={memberHub.gateScanQrPayload}
                    size={112}
                    downloadFileName={`membership-${memberHub.cardNumber || memberHub.memberPublicId || memberHub.appUserId || 'gate-pass'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Centered pill tabs — matches reference */}
        <div className="flex w-full justify-center" data-tour="member-wallet-tabs">
          <div className="w-full max-w-xl overflow-x-scroll-touch rounded-2xl bg-slate-100 p-1 shadow-inner sm:max-w-2xl">
            <div className="flex min-w-0 gap-1">
              <button type="button" onClick={() => setActiveTab('TICKETS')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'TICKETS' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className="inline-flex items-center gap-2">
                  My Tickets
                  {pendingGiftCount > 0 && (
                    <Badge variant="warning" className="min-w-5 justify-center px-1.5 text-[10px] font-black">
                      {pendingGiftCount}
                    </Badge>
                  )}
                </span>
              </button>
              <button type="button" onClick={() => setActiveTab('ASSETS')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'ASSETS' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Credits & Digital</button>
              <button type="button" onClick={() => setActiveTab('PHYSICAL')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'PHYSICAL' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Orders</button>
              <button type="button" onClick={() => setActiveTab('HISTORY')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Activity</button>
            </div>
          </div>
        </div>

        <div className="w-full">
            {activeTab === 'HISTORY' && <WalletHistory />}

            {activeTab === 'ASSETS' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {creditPasses.length === 0 && digitalItems.length === 0 && (
                      <div className={`col-span-full ${emptyShell}`}>
                        <p className="text-base font-medium text-slate-600">No program credits or digital access yet.</p>
                      </div>
                    )}
                    {creditPasses.map((item) => (
                        <div key={item.id} className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all scale-150 rotate-12">
                                <ShieldCheck size={120} />
                             </div>
                             <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <Zap size={24} className="text-white" />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black">
                                            {item.meta?.isUnlimited ? '∞' : item.meta?.credits}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-blue-200">Available Credits</div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                                <p className="text-blue-100 text-xs mb-8">{item.subtitle}</p>
                                <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/20">
                                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center">
                                        <Clock size={12} className="mr-1.5"/> Exp: {item.expiryDate || 'Unlimited'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate?.(ViewState.EVENT_MARKETPLACE);
                                        }}
                                        className="text-xs font-black bg-white text-indigo-700 px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-50 transition-colors"
                                    >
                                        BOOK NOW
                                    </button>
                                </div>
                             </div>
                        </div>
                    ))}
                    {digitalItems.map((item) => {
                        const url = typeof item.meta?.url === 'string' ? item.meta.url.trim() : '';
                        const openDigital = () => {
                            if (!url) {
                                showToast('Access link is not available yet.', 'error');
                                return;
                            }
                            let href = url;
                            if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
                            window.open(href, '_blank', 'noopener,noreferrer');
                        };
                        return (
                            <div
                                key={item.id}
                                className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                        <ExternalLink size={22} />
                                    </div>
                                    {item.expiryDate && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Exp: {item.expiryDate}
                                        </span>
                                    )}
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-slate-900">{item.title}</h3>
                                <p className="mb-6 text-xs text-slate-500">{item.subtitle}</p>
                                <button
                                    type="button"
                                    onClick={openDigital}
                                    className="w-full rounded-xl bg-slate-900 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-slate-800"
                                >
                                    Open access
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'PHYSICAL' && (
                <div className="space-y-4">
                    {physicalOrders.length === 0 ? (
                        <div className={emptyShell}>
                            <Package size={44} strokeWidth={1.25} className="mx-auto mb-4 text-slate-300" />
                            <p className="font-bold text-slate-800">No merchandise orders</p>
                            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                                Physical items from checkout appear here with fulfillment status.
                            </p>
                        </div>
                    ) : (
                        physicalOrders.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                                    <Package size={26} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate font-bold text-slate-900">{item.title}</h3>
                                    <p className="truncate text-xs text-slate-500">
                                        {item.meta?.skuRef ? `SKU: ${item.meta.skuRef}` : item.subtitle}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                                        item.status === 'DELIVERED'
                                            ? 'bg-green-50 text-green-700'
                                            : item.status === 'SHIPPED'
                                              ? 'bg-blue-50 text-blue-700'
                                              : 'bg-amber-50 text-amber-800'
                                    }`}
                                >
                                    {item.status === 'PROCESSING' ? 'Preparing' : item.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'TICKETS' && (
                <div className="space-y-8" data-tour="member-wallet-tickets">
                    {pendingGifts.length > 0 &&
                        renderTicketSection(
                            <Gift size={18} />,
                            'Gift Tickets',
                            'Tickets sent to you — accept to add them to your wallet.',
                            <>
                                <div className="flex flex-col gap-3 rounded-[2rem] border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pending acceptance</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            You have {pendingGiftCount} ticket{pendingGiftCount > 1 ? 's' : ''} waiting.
                                        </p>
                                    </div>
                                    <Badge variant="warning" className="min-w-7 justify-center px-2 text-xs font-black">
                                        {pendingGiftCount}
                                    </Badge>
                                </div>
                                {pendingGifts.map((gift) => {
                                    const ticketDate = formatEventDate(gift.createdAt);
                                    return (
                                        <div
                                            key={gift.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setActivePendingGift(gift)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setActivePendingGift(gift);
                                                }
                                            }}
                                            className="group cursor-pointer overflow-visible rounded-[2.5rem] border border-amber-200 bg-white p-1 pb-2 shadow-sm transition-all hover:shadow-xl"
                                        >
                                            <div className="relative wallet-ticket-layout overflow-hidden rounded-[2rem] bg-amber-50/60 p-4 sm:p-5">
                                                <div className="wallet-ticket-date border-amber-200">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{ticketDate.weekday}</span>
                                                    <span className="text-3xl font-black leading-none text-amber-900 sm:text-4xl">{ticketDate.day}</span>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500 sm:text-sm">{ticketDate.month}</span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col justify-center pr-12 sm:pr-14">
                                                    <Badge variant="warning" className="mb-2 w-fit px-2 py-0.5 text-[9px] font-black uppercase tracking-wide">
                                                        Pending
                                                    </Badge>
                                                    <h3 className="mb-1 truncate text-lg font-bold leading-tight text-slate-900">{gift.itemName}</h3>
                                                    <p className="mb-2 truncate text-xs text-slate-600">From {gift.sourceUserName}</p>
                                                    <p className="flex items-center text-[10px] font-medium text-slate-500">
                                                        <Clock size={10} className="mr-1.5" /> Tap to review and accept
                                                    </p>
                                                </div>
                                                <div className="absolute bottom-[-10px] right-[-10px] flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-transform group-hover:scale-110">
                                                    <Ticket size={24} className="-translate-x-1 -translate-y-1" />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                                                <span>Gift ticket</span>
                                                <span>Pending</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>,
                        )}

                    {!hasOwnedTickets && pendingGifts.length === 0 ? (
                        <div className={emptyShell}>
                            <Ticket size={44} strokeWidth={1.25} className="mx-auto mb-4 text-slate-300" />
                            <p className="font-bold text-slate-800">Your Wallet is Empty</p>
                            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                                Acquired tickets will appear here for you to use or share.
                            </p>
                        </div>
                    ) : (
                        <>
                            {(ticketBuckets.SELF.length > 0 || ticketBuckets.RECEIVED_GIFT.length > 0) &&
                                renderTicketSection(
                                    <User size={18} />,
                                    'Self Tickets',
                                    'Personal admission — scan at the gate. These cannot be transferred.',
                                    renderTicketsByEventGroup(
                                        [...ticketBuckets.SELF, ...ticketBuckets.RECEIVED_GIFT],
                                        (ticket) =>
                                            renderPersonalTicketCard(
                                                ticket,
                                                classifyWalletTicket(ticket) === 'RECEIVED_GIFT'
                                                    ? 'Gift ticket (yours)'
                                                    : 'Self ticket',
                                            ),
                                    ),
                                )}

                            {ticketBuckets.SHARING_POOL.length > 0 &&
                                renderTicketSection(
                                    <Share2 size={18} />,
                                    'Sharing Tickets',
                                    'Giftable tickets — assign guests or send invitations in bulk.',
                                    groupTicketsByEvent(ticketBuckets.SHARING_POOL).map((group) => (
                                        <div key={group.eventKey} className="space-y-3">
                                            {renderEventGroupHeader(group.label)}
                                            <div className="space-y-4">
                                                {groupTicketsByBundleKey(group.tickets).map((pool) =>
                                                    renderSharingPoolCard(pool),
                                                )}
                                            </div>
                                        </div>
                                    )),
                                )}

                            {ticketBuckets.SHARING_SENT.length > 0 &&
                                renderTicketSection(
                                    <Share2 size={18} />,
                                    'Sent to Guests',
                                    'Tickets already assigned — waiting for recipients to accept.',
                                    groupTicketsByEvent(ticketBuckets.SHARING_SENT).map((group) => (
                                        <div key={group.eventKey} className="space-y-3">
                                            {renderEventGroupHeader(group.label)}
                                            <div className="space-y-4">
                                                {renderSentToGuestsStack(group.tickets)}
                                            </div>
                                        </div>
                                    )),
                                )}
                        </>
                    )}
                </div>
            )}
        </div>

        {/* REPLACED: Full Feature Detail Modal instead of simple QR */}
        {viewingTicket && (
            <TicketDetailModal
                item={viewingTicket}
                onClose={() => setViewingTicket(null)}
                showGiftLinkAction={canOfferGiftLink(viewingTicket)}
                onCreateGiftLink={() => {
                    setGiftLinkContext(viewingTicket);
                    setViewingTicket(null);
                }}
            />
        )}

        {activePendingGift && (
            <GiftClaimModal
                gift={activePendingGift}
                onClose={() => setActivePendingGift(null)}
                onClaimed={handlePendingGiftAccepted}
            />
        )}

        {/* Modals */}
        {distributionContext && user && (
            <TicketDistributionModal 
                donorId={user.id} donorName={user.fullName}
                selectedTickets={distributionContext}
                initialTab={distributionInitialTab}
                onClose={() => {
                    setDistributionContext(null);
                    setDistributionInitialTab('ASSIGN');
                }}
                onSuccess={() => {
                    setDistributionContext(null);
                    setDistributionInitialTab('ASSIGN');
                    void loadWallet('background');
                    void loadSentGifts();
                }}
            />
        )}

        {giftLinkContext && user && (
            <CreateGiftLinkModal
                donorName={user.fullName}
                selectedTicket={giftLinkContext}
                onClose={() => setGiftLinkContext(null)}
                onSuccess={() => {
                    void loadWallet('background');
                    void loadSentGifts();
                }}
            />
        )}
        <EventCampaignOfferStack
          enabled={profileComplete}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default Wallet;
