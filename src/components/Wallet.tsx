
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntitlementService } from '../services/entitlementService';
import { WalletItem } from '../types/access';
import { ViewState } from '../types/index';
import { 
    QrCode, Ticket, Calendar, Zap, 
    X, ShieldCheck, Clock, Search, Share2, Users, Layers
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'TICKETS' | 'HISTORY'>('TICKETS');

  // Replaced simple QR state with full item state
  const [viewingTicket, setViewingTicket] = useState<WalletItem | null>(null);
  
  // Distribution State
  const [distributionContext, setDistributionContext] = useState<WalletItem[] | null>(null);

  useEffect(() => {
    if (user) {
        loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
      setLoading(true);
      if(user) {
          const walletData = await EntitlementService.getMyWallet(user.id);
          setItems(walletData);
          setLoading(false);
      }
  };

  // --- GROUPING LOGIC FOR TICKETS ---
  const groupedTickets = useMemo(() => {
      const tickets = items.filter(i => i.type === 'TICKET' && i.status !== 'EXPIRED' && i.status !== 'USED'); // Show Active + Gift Pending
      const groups: Record<string, WalletItem[]> = {};

      tickets.forEach(t => {
          // Group by Event ID. If no event ID, fallback to ID (singles)
          const key = t.meta?.eventId || t.id;
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
      });

      return Object.values(groups);
  }, [items]);
  
  const creditPasses = useMemo(() => {
       return items.filter(i => i.type === 'CREDIT_PASS' && i.status === 'ACTIVE');
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

        {/* Centered pill tabs — matches reference */}
        <div className="flex w-full justify-center">
          <div className="w-full max-w-xl overflow-x-scroll-touch rounded-2xl bg-slate-100 p-1 shadow-inner sm:max-w-2xl">
            <div className="flex min-w-0 gap-1">
              <button type="button" onClick={() => setActiveTab('TICKETS')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'TICKETS' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>My Tickets</button>
              <button type="button" onClick={() => setActiveTab('ASSETS')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'ASSETS' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Program Credits</button>
              <button type="button" onClick={() => setActiveTab('HISTORY')} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}>Activity</button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
            {activeTab === 'HISTORY' && <WalletHistory />}

            {activeTab === 'ASSETS' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {creditPasses.length === 0 && (
                      <div className={`col-span-full ${emptyShell}`}>
                        <p className="text-base font-medium text-slate-600">No active program credits.</p>
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
                                        <div className="text-4xl font-black">{item.meta?.credits}</div>
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
                        // 1. Regular Ticket (The first one, assumed for Self)
                        const selfTicket = group[0];
                        const dateInfo = formatEventDate(selfTicket.expiryDate);
                        
                        // 2. Shared Bundle (The rest)
                        const bundleTickets = group.slice(1);
                        
                        return (
                            <div key={idx} className="space-y-4">
                                {/* HEADER FOR GROUP (Optional, if multiple events) */}
                                {groupedTickets.length > 1 && (
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2 border-l-4 border-indigo-500 ml-1">
                                        {selfTicket.title}
                                    </h3>
                                )}

                                {/* CARD 1: REGULAR TICKET (SELF) - OPENS MODAL ON CLICK */}
                                <div 
                                    onClick={() => setViewingTicket(selfTicket)}
                                    className="bg-white rounded-[2.5rem] p-1 shadow-sm border border-slate-200 cursor-pointer hover:shadow-xl transition-all group overflow-hidden"
                                >
                                    <div className="bg-slate-50 rounded-[2rem] p-5 flex items-stretch relative overflow-hidden">
                                        {/* Left: Date */}
                                        <div className="flex flex-col items-center justify-center pr-5 border-r-2 border-dashed border-slate-200 mr-5 min-w-[90px]">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{dateInfo.weekday}</span>
                                            <span className="text-4xl font-black text-slate-800 leading-none">{dateInfo.day}</span>
                                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{dateInfo.month}</span>
                                        </div>
                                        
                                        {/* Right: Info */}
                                        <div className="flex-1 flex flex-col justify-center min-w-0">
                                            <h3 className="font-bold text-lg text-slate-900 truncate leading-tight mb-1">{selfTicket.title}</h3>
                                            <p className="text-xs text-slate-500 mb-2 truncate">{selfTicket.subtitle}</p>
                                            <p className="text-[10px] text-slate-400 flex items-center font-medium">
                                                <Calendar size={10} className="mr-1.5"/> {dateInfo.full}
                                            </p>
                                        </div>

                                        {/* Absolute QR Icon */}
                                        <div className="absolute right-[-10px] bottom-[-10px] bg-slate-900 text-white w-20 h-20 flex items-center justify-center rounded-full shadow-lg group-hover:scale-110 transition-transform">
                                            <QrCode size={24} className="-translate-x-1 -translate-y-1"/>
                                        </div>
                                    </div>
                                    
                                    {/* Footer Strip */}
                                    <div className="px-6 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <span>Personal Entry Pass</span>
                                        <span className="text-green-600 flex items-center"><ShieldCheck size={12} className="mr-1"/> Valid</span>
                                    </div>
                                </div>

                                {/* CARD 2: SHARED TICKET (BUNDLE) - Only if > 1 ticket */}
                                {bundleTickets.length > 0 && (
                                    <div className="relative group/bundle">
                                        {/* Stack Effect Layers */}
                                        <div className="absolute top-2 left-2 right-2 bottom-0 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm transform scale-[0.95] translate-y-2 z-0"></div>
                                        <div className="absolute top-4 left-4 right-4 bottom-0 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm transform scale-[0.9] translate-y-4 z-0"></div>

                                        <div className="bg-white rounded-[2.5rem] p-1 shadow-md border border-slate-200 relative z-10 overflow-hidden">
                                             <div className="bg-indigo-50 rounded-[2rem] p-5 flex items-stretch relative overflow-hidden">
                                                {/* Left: Date (Same visual style but indigo theme) */}
                                                <div className="flex flex-col items-center justify-center pr-5 border-r-2 border-dashed border-indigo-200 mr-5 min-w-[90px]">
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{dateInfo.weekday}</span>
                                                    <span className="text-4xl font-black text-indigo-900 leading-none">{dateInfo.day}</span>
                                                    <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider mt-1">{dateInfo.month}</span>
                                                </div>

                                                {/* Right: Info */}
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    <div className="flex items-center mb-1">
                                                        <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mr-2">Distribution Pack</span>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-indigo-900 truncate leading-tight mb-1">{selfTicket.title}</h3>
                                                    <p className="text-xs text-indigo-600 mb-2 truncate">You have <span className="font-black bg-white px-1.5 rounded">{bundleTickets.length}</span> unassigned tickets.</p>
                                                </div>

                                                {/* Action Button (Replacing QR) */}
                                                <div className="flex items-center pl-2">
                                                    <button 
                                                        type="button"
                                                        onClick={() => openDistribution(bundleTickets)}
                                                        className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 group-hover/bundle:scale-105"
                                                    >
                                                        <Share2 size={20}/>
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
