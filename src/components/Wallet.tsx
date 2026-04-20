
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntitlementService } from '../services/entitlementService';
import { WALLET_REFRESH_EVENT } from '../services/paymentService';
import {
  readWalletSessionCache,
  writeWalletSessionCache,
} from '../lib/walletSessionCache';
import { WalletItem, WalletMemberHub } from '../types/access';
import { ViewState } from '../types/index';
import { 
    QrCode, Ticket, Calendar, Zap, 
    ShieldCheck, Clock, Search, Share2, Package, ExternalLink
} from 'lucide-react';
import QRCodeDisplay from './common/QRCodeDisplay';
import { useToast } from '../context/ToastContext';
import WalletHistory from './wallet/WalletHistory';
import TicketDistributionModal from './wallet/TicketDistributionModal';
import TicketDetailModal from './wallet/TicketDetailModal'; // Use the full detail modal

interface WalletProps {
  /** Opens Event Catalogue so users can redeem program credits (Nest-backed events). */
  onNavigate?: (view: ViewState) => void;
}

const Wallet: React.FC<WalletProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<WalletItem[]>([]);
  const [memberHub, setMemberHub] = useState<WalletMemberHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TICKETS' | 'PHYSICAL' | 'HISTORY'>('TICKETS');

  // Replaced simple QR state with full item state
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);
  
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

  useEffect(() => {
    if (!user) return;
    const snap = readWalletSessionCache(user.id);
    if (snap) {
      setItems(snap.items);
      setMemberHub(snap.memberHub);
      setLoading(false);
      void loadWallet('background');
    } else {
      void loadWallet('full');
    }
  }, [user, loadWallet]);

  useEffect(() => {
    if (!user) return;
    const onRefresh = () => {
      void loadWallet('full');
    };
    window.addEventListener(WALLET_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(WALLET_REFRESH_EVENT, onRefresh);
  }, [user, loadWallet]);

  /** Unassigned transferable tickets (Smart Redeem “Draft” + bulk) — same rules as Event Catalogue “Draft tickets”. */
  const isUnassignedTransferableTicket = useCallback((t: WalletItem) => {
      return (
          t.type === 'TICKET' &&
          t.status === 'ACTIVE' &&
          t.isTransferable === true &&
          !t.meta?.recipientEmail
      );
  }, []);

  // --- GROUPING LOGIC FOR TICKETS ---
  const groupedTickets = useMemo(() => {
      const tickets = items.filter(
          (i) => i.type === 'TICKET' && i.status !== 'EXPIRED' && i.status !== 'USED',
      );
      const groups: Record<string, WalletItem[]> = {};

      tickets.forEach((t) => {
          const key = t.meta?.eventId || t.id;
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
      });

      return Object.values(groups);
  }, [items]);
  
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

  const emptyShell =
    'rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:rounded-[2.5rem] sm:py-20';

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
                  <QRCodeDisplay data={memberHub.gateScanQrPayload} size={112} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Centered pill tabs — matches reference */}
        <div className="flex w-full justify-center">
          <div className="w-full max-w-xl overflow-x-scroll-touch rounded-2xl bg-slate-100 p-1 shadow-inner sm:max-w-2xl">
            <div className="flex min-w-0 gap-1">
              <button type="button" onClick={() => setActiveTab('TICKETS')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'TICKETS' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>My Tickets</button>
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
                <div className="space-y-6">
                    {groupedTickets.length === 0 ? (
                        <div className={emptyShell}>
                             <Ticket size={44} strokeWidth={1.25} className="mx-auto mb-4 text-slate-300"/>
                             <p className="font-bold text-slate-800">Your Wallet is Empty</p>
                             <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Acquired tickets will appear here for you to use or share.</p>
                        </div>
                    ) : groupedTickets.map((group, idx) => {
                        const pool = group.filter(isUnassignedTransferableTicket);
                        const personal = group.filter((t) => !pool.includes(t));
                        const anchor = group[0];
                        const dateInfo = formatEventDate(anchor.expiryDate);

                        return (
                            <div key={anchor.meta?.eventId ?? anchor.id ?? idx} className="space-y-4">
                                {groupedTickets.length > 1 && (
                                    <h3 className="ml-1 border-l-4 border-indigo-500 pl-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                                        {anchor.title}
                                    </h3>
                                )}

                                {personal.map((ticket) => {
                                    const ticketDate = formatEventDate(ticket.expiryDate);
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
                                            <span>Personal entry</span>
                                            <span className="flex items-center text-green-600">
                                                <ShieldCheck size={12} className="mr-1" /> Valid
                                            </span>
                                        </div>
                                    </div>
                                    );
                                })}

                                {pool.length > 0 && (
                                    <div className="relative group/bundle">
                                        <div className="absolute bottom-0 left-2 right-2 top-2 z-0 scale-[0.95] translate-y-2 transform rounded-[2.5rem] border border-slate-200 bg-white shadow-sm" />
                                        <div className="absolute bottom-0 left-4 right-4 top-4 z-0 scale-[0.9] translate-y-4 transform rounded-[2.5rem] border border-slate-200 bg-white shadow-sm" />
                                        <div className="relative z-10 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-1 shadow-md">
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
                                                    <p className="mb-2 truncate text-xs text-indigo-600">
                                                        <span className="rounded bg-white px-1.5 font-black">{pool.length}</span>{' '}
                                                        {pool.length === 1 ? 'ticket needs a guest' : 'tickets need guests'} (draft / bulk).
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
