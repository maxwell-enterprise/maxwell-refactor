
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
import { Badge } from './ui/badge';

interface WalletProps {
  /** Opens Event Catalogue so users can redeem program credits (Nest-backed events). */
  onNavigate?: (view: ViewState) => void;
}

type TicketBucket = 'SELF' | 'SHARING_POOL' | 'SHARING_SENT' | 'RECEIVED_GIFT';

function classifyWalletTicket(t: WalletItem): TicketBucket {
  if (t.sponsoredBy) return 'RECEIVED_GIFT';
  if (t.isTransferable === true) {
    const hasRecipient =
      typeof t.meta?.recipientEmail === 'string' && t.meta.recipientEmail.trim().length > 0;
    if (t.status === 'PENDING_CLAIM' || t.status === 'GIFT_PENDING' || hasRecipient) {
      return 'SHARING_SENT';
    }
    if (t.status === 'ACTIVE') return 'SHARING_POOL';
  }
  return 'SELF';
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
  const [items, setItems] = useState<WalletItem[]>([]);
  const [pendingGifts, setPendingGifts] = useState<GiftAllocation[]>([]);
  const [memberHub, setMemberHub] = useState<WalletMemberHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TICKETS' | 'PHYSICAL' | 'HISTORY'>('TICKETS');

  // Replaced simple QR state with full item state
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);
  const [activePendingGift, setActivePendingGift] = useState<GiftAllocation | null>(null);
  
  // Distribution State
  const [distributionContext, setDistributionContext] = useState<WalletItem[] | null>(null);

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

  useEffect(() => {
    if (!user) return;
    const snap = readWalletSessionCache(user.id);
    if (snap) {
      setItems(snap.items);
      setMemberHub(snap.memberHub);
      setLoading(false);
      void loadWallet('background');
      void loadPendingGifts();
    } else {
      void loadWallet('full');
      void loadPendingGifts();
    }
  }, [user, loadWallet, loadPendingGifts]);

  useEffect(() => {
    if (!user) return;
    const onRefresh = () => {
      void loadWallet('full');
      void loadPendingGifts();
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
  }, [user, loadWallet, loadPendingGifts]);

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

  const hasOwnedTickets =
      ticketBuckets.SELF.length > 0 ||
      ticketBuckets.SHARING_POOL.length > 0 ||
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

  const openDistribution = (tickets: WalletItem[]) => {
      setDistributionContext(tickets);
  };

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
              className="group cursor-pointer overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-1 shadow-sm transition-all hover:shadow-xl"
          >
              <div className="relative flex items-stretch overflow-hidden rounded-[2rem] bg-slate-50 p-5">
                  <div className="mr-5 flex min-w-[90px] flex-col items-center justify-center border-r-2 border-dashed border-slate-200 pr-5">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{ticketDate.weekday}</span>
                      <span className="text-4xl font-black leading-none text-slate-800">{ticketDate.day}</span>
                      <span className="mt-1 text-sm font-bold uppercase tracking-wider text-slate-400">{ticketDate.month}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
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
                  <div className="absolute bottom-[-10px] right-[-10px] flex h-20 w-20 translate-y-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform group-hover:scale-110">
                      <QrCode size={24} className="-translate-x-1 -translate-y-1" />
                  </div>
              </div>
              <div className="flex items-center justify-between px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
              <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-indigo-200 bg-white p-1 shadow-md">
                  <div className="relative flex items-stretch overflow-hidden rounded-[2rem] bg-indigo-50 p-5">
                      <div className="mr-5 flex min-w-[90px] flex-col items-center justify-center border-r-2 border-dashed border-indigo-200 pr-5">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400">{dateInfo.weekday}</span>
                          <span className="text-4xl font-black leading-none text-indigo-900">{dateInfo.day}</span>
                          <span className="mt-1 text-sm font-bold uppercase tracking-wider text-indigo-400">{dateInfo.month}</span>
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
                      <div className="flex items-center pl-2">
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

  const handlePendingGiftAccepted = () => {
    setActivePendingGift(null);
    window.dispatchEvent(new CustomEvent(WALLET_REFRESH_EVENT));
    void loadWallet('full');
    void loadPendingGifts();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-fade-in bg-slate-50">
      {/* Title lives in DashboardLayout (Personal Zone / WALLET) — no duplicate heading here */}
      <div className="page-container flex min-h-0 flex-1 flex-col gap-5 py-4 sm:gap-6 sm:py-6">
        {/* Mobile-only wallet chrome */}
        <div className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:hidden">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
                    <QrCode size={24} />
                </div>
                <div>
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
        <div className="flex w-full justify-center">
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

        <div className="min-h-0 flex-1">
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
                <div className="space-y-8">
                    {pendingGifts.length > 0 &&
                        renderTicketSection(
                            <Gift size={18} />,
                            'Gift Tickets',
                            'Tickets sent to you — accept to add them to your wallet.',
                            <>
                                <div className="flex items-center justify-between rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-4">
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
                                            className="group cursor-pointer overflow-hidden rounded-[2.5rem] border border-amber-200 bg-white p-1 shadow-sm transition-all hover:shadow-xl"
                                        >
                                            <div className="relative flex items-stretch overflow-hidden rounded-[2rem] bg-amber-50/60 p-5">
                                                <div className="mr-5 flex min-w-[90px] flex-col items-center justify-center border-r-2 border-dashed border-amber-200 pr-5">
                                                    <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">{ticketDate.weekday}</span>
                                                    <span className="text-4xl font-black leading-none text-amber-900">{ticketDate.day}</span>
                                                    <span className="mt-1 text-sm font-bold uppercase tracking-wider text-amber-500">{ticketDate.month}</span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col justify-center">
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
                onClose={() => setDistributionContext(null)}
                onSuccess={() => { setDistributionContext(null); loadWallet(); }}
            />
        )}
      </div>
    </div>
  );
};

export default Wallet;
