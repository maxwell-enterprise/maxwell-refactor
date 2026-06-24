
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';
import { EntitlementService } from '../services/entitlementService';
import { InvitationService } from '../services/invitationService'; 
import { Event, EventInvitation } from '../types/index';
import { WalletItem } from '../types/access';
import { 
    Calendar, MapPin, Clock, Ticket, Zap, UserPlus, 
    CheckCircle, ArrowRight, User, AlertCircle, ShoppingBag, 
    Gift, CreditCard, ChevronRight, X, Lock, Layers, List
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import InvitationBanner from './events/InvitationBanner'; 

interface AssigneeForm {
    type: 'MYSELF' | 'GUEST' | 'DRAFT';
    name: string;
    email: string;
    phone: string;
}

const EventMarketplace: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [wallet, setWallet] = useState<WalletItem[]>([]);
    const [invitations, setInvitations] = useState<EventInvitation[]>([]); 
    const [loading, setLoading] = useState(true);
    
    // View Control
    const [activeView, setActiveView] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
    
    // Modal State
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedCreditPass, setSelectedCreditPass] = useState<WalletItem | null>(null);
    const [viewingSeries, setViewingSeries] = useState<Event | null>(null); // NEW: To view series details

    const [assignee, setAssignee] = useState<AssigneeForm>({
        type: 'MYSELF',
        name: user?.fullName || '',
        email: user?.email || '',
        phone: ''
    });

    useEffect(() => {
        if(user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const [evts, items, invites] = await Promise.all([
            DataService.getEvents(),
            EntitlementService.getMyWallet(user!.id),
            InvitationService.getMyInvitations(user!.id)
        ]);
        
        // Sorting by Date
        const sortedEvents = evts.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setEvents(sortedEvents);
        setWallet(items);
        setInvitations(invites);
        setLoading(false);
    };

    // Filter Events by Time
    // Includes CONTAINERS now
    const upcomingEvents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return events.filter(e => {
            // Include Containers or Solos/Sessions that have no parent
            // If it's a child session, it should only appear inside the container modal, unless it's orphaned.
            const isTopLevel = !e.parentEventId;
            const isVisible = e.isVisibleInCatalog !== false; // Hide if explicitly false
            return e.date >= today && isTopLevel && isVisible;
        });
    }, [events]);

    const pastEvents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return events.filter(e => {
             const isVisible = e.isVisibleInCatalog !== false;
             return e.date < today && isVisible;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [events]);

    /** Unassigned / draft tickets: redeemed or bulk-issued, transferable, no recipient yet (Entitlement → Wallet pipeline). */
    const draftTickets = useMemo(() => {
        return wallet.filter(
            (w) =>
                w.type === 'TICKET' &&
                w.status === 'ACTIVE' &&
                w.isTransferable &&
                !w.meta?.recipientEmail,
        );
    }, [wallet]);

    /** Consumable flex credits on active passes; unlimited is tracked separately (no punch balance). */
    const { flexCreditsTotal, hasUnlimitedPass } = useMemo(() => {
        const passes = wallet.filter((w) => w.type === 'CREDIT_PASS' && w.status === 'ACTIVE');
        let flex = 0;
        let unlimited = false;
        for (const w of passes) {
            if (w.meta?.isUnlimited) unlimited = true;
            else flex += w.meta?.credits || 0;
        }
        return { flexCreditsTotal: flex, hasUnlimitedPass: unlimited };
    }, [wallet]);

    const passMatchesEventTags = (w: WalletItem, event: Event) => {
        const tag = w.meta?.creditTag ?? w.meta?.tag;
        return typeof tag === 'string' && event.creditTags.includes(tag);
    };

    // Check Eligibility Helper
    const checkEligibility = (event: Event) => {
        return wallet.find(w => 
            w.type === 'CREDIT_PASS' && 
            w.status === 'ACTIVE' && 
            (w.meta?.isUnlimited || w.meta?.credits > 0) && 
            passMatchesEventTags(w, event)
        );
    };

    // Determine access type based on admission policy
    const getEventAccess = (event: Event): { accessible: boolean; label: string; type: 'CREDIT' | 'FREE' | 'GATE' | 'LOCKED' } => {
        const policy = event.admissionPolicy;
        
        // Open events - anyone can register
        if (policy === 'OPEN_MEMBER' || policy === 'OPEN_PUBLIC') {
            return { accessible: true, label: 'Free', type: 'FREE' };
        }
        
        // On-site deduction - can register but pay at gate
        if (policy === 'ON_SITE_DEDUCTION') {
            return { accessible: true, label: 'Pay at Gate', type: 'GATE' };
        }
        
        // Pre-booked - needs credit pass
        const pass = checkEligibility(event);
        if (pass) {
            return { accessible: true, label: '1 Credit', type: 'CREDIT' };
        }
        
        return { accessible: false, label: 'Credit Required', type: 'LOCKED' };
    };

    // --- INVITATION HANDLERS ---
    // FIXED: Now accepts second argument for Option Selections
    const handleAcceptInvite = async (invId: string, selectedSubIds?: string[]) => {
        if(!user) return;
        try {
            await InvitationService.acceptInvitation(invId, user.id, selectedSubIds);
            showToast('Invitation accepted! Ticket added to wallet.', 'success');
            loadData();
        } catch(e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDeclineInvite = async (invId: string) => {
        if(!user) return;
        if(confirm('Are you sure you want to decline?')) {
            await InvitationService.declineInvitation(invId, user.id);
            showToast('Invitation declined.', 'info');
            loadData();
        }
    };

    const handleOpenRedeem = (event: Event) => {
        const access = getEventAccess(event);
        
        if (access.type === 'FREE' || access.type === 'GATE') {
            // Open/gate events - go directly to assignee form without requiring credit pass
            setSelectedEvent(event);
            setSelectedCreditPass(null); // No pass needed
            setAssignee({
                type: 'MYSELF',
                name: user?.fullName || '',
                email: user?.email || '',
                phone: ''
            });
        } else if (access.type === 'CREDIT') {
            const pass = checkEligibility(event);
            setSelectedEvent(event);
            setSelectedCreditPass(pass!);
            setAssignee({
                type: 'MYSELF',
                name: user?.fullName || '',
                email: user?.email || '',
                phone: ''
            });
        } else {
            showToast('You need a valid Credit Pass to book this event.', 'error');
        }
    };

    const handleConfirmRedeem = async () => {
        if (!selectedEvent || !user) return;
        
        if (assignee.type === 'GUEST' && (!assignee.name || !assignee.email)) {
            showToast('Guest name and email are required.', 'error');
            return;
        }

        const access = getEventAccess(selectedEvent);

        try {
            if (access.type === 'FREE' || access.type === 'GATE') {
                // Free registration - no credit consumption
                await EntitlementService.registerFreeEvent(
                    user.id,
                    selectedEvent.id,
                    {
                        type: assignee.type,
                        name: assignee.name,
                        email: assignee.email,
                        phone: assignee.phone
                    }
                );
            } else {
                // Credit-based redemption
                if (!selectedCreditPass) {
                    showToast('No valid credit pass found.', 'error');
                    return;
                }
                await EntitlementService.redeemAndAssign(
                    user.id,
                    selectedCreditPass.id,
                    selectedEvent.id,
                    {
                        type: assignee.type,
                        name: assignee.name,
                        email: assignee.email,
                        phone: assignee.phone
                    }
                );
            }

            showToast(access.type === 'FREE' ? 'Registration Successful!' : access.type === 'GATE' ? 'Registered! Pay at gate on event day.' : 'Redemption Successful!', 'success');
            setSelectedEvent(null);
            setViewingSeries(null); // Close series modal if open
            loadData(); // Refresh wallet and lists
        } catch (e: any) {
            showToast(e.message || 'Redemption Failed', 'error');
        }
    };

    const getDaysLeft = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };
    
    // --- SERIES UTILS ---
    const getSeriesChildren = (parentId: string) => {
        return events.filter(e => e.parentEventId === parentId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    if (loading) {
        return (
            <div className="relative w-full min-w-0 bg-slate-50">
                <div className="page-container py-16 text-center text-slate-400">Loading catalogue…</div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-w-0 animate-fade-in bg-slate-50">
            <div className="page-container flex w-full flex-col gap-6 sm:gap-8">
            
            {/* Header / Stats */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                <div className="min-w-0">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <ShoppingBag className="h-6 w-6" strokeWidth={2} aria-hidden />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                                Event Catalogue
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                Discover events and use your flexible credits to book spots.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto lg:shrink-0">
                     <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 shadow-sm">
                         <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                             <Zap size={20} aria-hidden />
                         </div>
                         <div className="min-w-0">
                             <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Available credits</p>
                             <p className="text-xl font-bold tabular-nums text-indigo-950 sm:text-2xl">
                                 {hasUnlimitedPass && flexCreditsTotal === 0 ? '∞' : flexCreditsTotal}
                             </p>
                             {hasUnlimitedPass && flexCreditsTotal > 0 && (
                                 <p className="mt-0.5 text-[10px] font-semibold leading-tight text-indigo-600">
                                     + unlimited pass
                                 </p>
                             )}
                             {hasUnlimitedPass && flexCreditsTotal === 0 && (
                                 <p className="mt-0.5 text-[10px] font-medium leading-tight text-indigo-600">
                                     Unlimited access (no punch balance)
                                 </p>
                             )}
                         </div>
                     </div>
                     
                     <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 shadow-sm">
                         <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                             <Ticket size={20} aria-hidden />
                         </div>
                         <div className="min-w-0">
                             <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Draft tickets</p>
                             <p className="text-xl font-bold tabular-nums text-amber-950 sm:text-2xl">{draftTickets.length}</p>
                         </div>
                     </div>
                </div>
            </div>

            {/* INVITATION BANNERS */}
            {invitations.length > 0 && (
                <div className="space-y-4">
                    {invitations.map(inv => (
                        <InvitationBanner 
                            key={inv.id} 
                            invitation={inv} 
                            onAccept={handleAcceptInvite}
                            onDecline={handleDeclineInvite}
                        />
                    ))}
                </div>
            )}

            {/* View Switcher */}
            <div className="flex gap-1 border-b border-slate-300">
                <button 
                    type="button"
                    onClick={() => setActiveView('UPCOMING')}
                    className={`px-4 py-3 text-sm font-bold transition-colors sm:px-6 ${activeView === 'UPCOMING' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Upcoming Events
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveView('PAST')}
                    className={`px-4 py-3 text-sm font-bold transition-colors sm:px-6 ${activeView === 'PAST' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Past Events
                </button>
            </div>

            {/* Event Grid */}
            <div>
                {activeView === 'UPCOMING' && (
                    <>
                        {upcomingEvents.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center text-slate-400">
                                <Calendar size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>No upcoming events scheduled at the moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                                {upcomingEvents.map(event => {
                                    // Special Handling: Hide INVITED_ONLY from grid, assuming accepted via banner
                                    if (event.admissionPolicy === 'INVITED_ONLY') return null;

                                    const access = getEventAccess(event);
                                    const isEligible = access.accessible;
                                    const isContainer = event.type === 'CONTAINER';

                                    return (
                                        <div
                                            key={event.id}
                                            className={`group flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition-all ${isEligible || isContainer ? 'hover:shadow-md' : 'opacity-[0.88] grayscale hover:opacity-100 hover:grayscale-0'}`}
                                        >
                                            {/* Image: isolate + overflow so hover scale never bleeds past card */}
                                            <div className="relative isolate h-44 shrink-0 overflow-hidden bg-slate-100">
                                                {event.banner_url ? (
                                                    <img
                                                        src={event.banner_url}
                                                        alt=""
                                                        className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.02]"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-slate-300" aria-hidden>
                                                        <Calendar size={48} />
                                                    </div>
                                                )}
                                                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" aria-hidden />
                                                
                                                {/* Overlay Badges */}
                                                <div className="absolute right-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2">
                                                    {isContainer && (
                                                        <span className="bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center border border-slate-700">
                                                            <Layers size={10} className="mr-1.5"/> Series Bundle
                                                        </span>
                                                    )}
                                                    {access.type === 'FREE' && (
                                                        <span className="bg-emerald-600/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center">
                                                            <CheckCircle size={10} className="mr-1.5"/> Open
                                                        </span>
                                                    )}
                                                    {access.type === 'GATE' && (
                                                        <span className="bg-amber-600/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center">
                                                            <CreditCard size={10} className="mr-1.5"/> Pay at Gate
                                                        </span>
                                                    )}
                                                    {!isEligible && !isContainer && (
                                                        <span className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center">
                                                            <Lock size={10} className="mr-1.5"/> Restricted
                                                        </span>
                                                    )}
                                                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">
                                                        {getDaysLeft(event.date)} days left
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex min-h-0 flex-1 flex-col p-5">
                                                <h4 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900">{event.name}</h4>
                                                <div className="space-y-2 mb-6">
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <Clock size={12} className="mr-2 text-slate-400"/> {new Date(event.date).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <MapPin size={12} className="mr-2 text-slate-400"/> {event.location}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                                                    {isContainer ? (
                                                        <>
                                                            <span className="text-xs text-slate-500">
                                                                {getSeriesChildren(event.id).length} Sessions Included
                                                            </span>
                                                            <button 
                                                                onClick={() => setViewingSeries(event)}
                                                                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center"
                                                            >
                                                                View Series <List size={14} className="ml-1"/>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                                access.type === 'FREE' ? 'text-emerald-600 bg-emerald-50' :
                                                                access.type === 'GATE' ? 'text-amber-600 bg-amber-50' :
                                                                isEligible ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-100'
                                                            }`}>
                                                                {access.label}
                                                            </span>
                                                            
                                                            {isEligible ? (
                                                                <button 
                                                                    onClick={() => handleOpenRedeem(event)}
                                                                    className={`text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg flex items-center ${
                                                                        access.type === 'FREE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                                                        access.type === 'GATE' ? 'bg-amber-600 hover:bg-amber-700' :
                                                                        'bg-slate-900 hover:bg-slate-800'
                                                                    }`}
                                                                >
                                                                    {access.type === 'FREE' ? 'Register' : access.type === 'GATE' ? 'Register' : 'Redeem'} <ChevronRight size={14} className="ml-1"/>
                                                                </button>
                                                            ) : (
                                                                <button disabled className="text-slate-400 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 cursor-not-allowed">
                                                                    Pass Needed
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {activeView === 'PAST' && (
                    <div className="space-y-4">
                        {pastEvents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-sm">No past events recorded.</div>
                        ) : (
                            pastEvents.map(event => (
                                <div key={event.id} className="flex items-center rounded-xl border border-slate-300 bg-white p-4 opacity-90 shadow-sm transition-opacity hover:opacity-100">
                                    <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs mr-4 shrink-0">
                                        {new Date(event.date).getDate()}
                                        <br/>
                                        {new Date(event.date).toLocaleString('default', { month: 'short' })}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-700">{event.name}</h4>
                                        <p className="text-xs text-slate-500">{event.location} • {event.attendees} Attendees</p>
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded border border-slate-200">
                                        Completed
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            
            {/* REDEMPTION / REGISTRATION MODAL */}
            {selectedEvent && (
                <div className="modal-overlay z-50">
                    <div className="modal-panel sm:max-w-lg sm:h-auto sm:max-h-[90dvh]">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedEvent.name}</h3>
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(selectedEvent.date).toLocaleDateString()}</span>
                                    <span className="flex items-center"><MapPin size={12} className="mr-1"/> {selectedEvent.location}</span>
                                </div>
                                {(() => {
                                    const access = getEventAccess(selectedEvent);
                                    return (
                                        <span className={`inline-block mt-2 text-xs font-bold px-2 py-1 rounded ${
                                            access.type === 'FREE' ? 'text-emerald-700 bg-emerald-50' :
                                            access.type === 'GATE' ? 'text-amber-700 bg-amber-50' :
                                            'text-indigo-700 bg-indigo-50'
                                        }`}>
                                            {access.type === 'FREE' ? '🎉 Free Registration' : access.type === 'GATE' ? '💳 Pay at Gate' : '⚡ 1 Credit Redemption'}
                                        </span>
                                    );
                                })()}
                            </div>
                            <button onClick={() => { setSelectedEvent(null); setSelectedCreditPass(null); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-400"/>
                            </button>
                        </div>

                        {/* Assignee Form */}
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Register For</label>
                                <div className="flex flex-wrap gap-2">
                                    {(['MYSELF', 'GUEST', 'DRAFT'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setAssignee(prev => ({ 
                                                ...prev, 
                                                type,
                                                name: type === 'MYSELF' ? (user?.fullName || '') : '',
                                                email: type === 'MYSELF' ? (user?.email || '') : '',
                                                phone: ''
                                            }))}
                                            className={`min-h-11 min-w-[calc(33.333%-0.5rem)] flex-1 rounded-lg border-2 p-3 text-xs font-bold transition-all sm:min-h-0 sm:min-w-0 ${
                                                assignee.type === type 
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            {type === 'MYSELF' && <><User size={14} className="inline mr-1"/> Myself</>}
                                            {type === 'GUEST' && <><UserPlus size={14} className="inline mr-1"/> Guest</>}
                                            {type === 'DRAFT' && <><Ticket size={14} className="inline mr-1"/> Draft</>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {assignee.type === 'GUEST' && (
                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Guest Name *</label>
                                        <input 
                                            type="text" value={assignee.name} 
                                            onChange={e => setAssignee(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                            placeholder="Full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Guest Email *</label>
                                        <input 
                                            type="email" value={assignee.email} 
                                            onChange={e => setAssignee(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone (Optional)</label>
                                        <input 
                                            type="tel" value={assignee.phone} 
                                            onChange={e => setAssignee(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                            placeholder="+62..."
                                        />
                                    </div>
                                </div>
                            )}

                            {assignee.type === 'DRAFT' && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-700">
                                    <AlertCircle size={14} className="inline mr-1"/> A draft ticket will be created in your wallet. You can assign it to someone later.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                onClick={() => { setSelectedEvent(null); setSelectedCreditPass(null); }}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmRedeem}
                                className={`px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-colors shadow-lg flex items-center ${
                                    getEventAccess(selectedEvent).type === 'FREE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    getEventAccess(selectedEvent).type === 'GATE' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                <CheckCircle size={16} className="mr-2"/>
                                {getEventAccess(selectedEvent).type === 'FREE' ? 'Confirm Registration' : 
                                 getEventAccess(selectedEvent).type === 'GATE' ? 'Confirm Registration' : 
                                 'Confirm Redemption'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SERIES VIEWING MODAL */}
            {viewingSeries && (
                <div className="modal-overlay z-50">
                    <div className="modal-panel sm:max-w-2xl sm:h-auto sm:max-h-[85dvh]">
                        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <Layers size={20} className="mr-2 text-indigo-600"/> {viewingSeries.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Series Bundle • {getSeriesChildren(viewingSeries.id).length} sessions</p>
                            </div>
                            <button onClick={() => setViewingSeries(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={20} className="text-slate-400"/>
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                            {getSeriesChildren(viewingSeries.id).length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">No sessions in this series yet.</p>
                            ) : (
                                getSeriesChildren(viewingSeries.id).map(child => {
                                    const childAccess = getEventAccess(child);
                                    return (
                                        <div key={child.id} className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                            childAccess.accessible ? 'border-slate-200 bg-white hover:shadow-md' : 'border-slate-200 bg-slate-50 opacity-70'
                                        }`}>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-sm text-slate-800">{child.name}</h4>
                                                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                                                    <span className="flex items-center"><Calendar size={10} className="mr-1"/> {new Date(child.date).toLocaleDateString()}</span>
                                                    <span className="flex items-center"><MapPin size={10} className="mr-1"/> {child.location}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 sm:ml-4">
                                                {childAccess.accessible ? (
                                                    <button 
                                                        onClick={() => handleOpenRedeem(child)}
                                                        className={`flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-xs font-bold text-white shadow transition-colors sm:w-auto sm:py-2 ${
                                                            childAccess.type === 'FREE' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                                            childAccess.type === 'GATE' ? 'bg-amber-600 hover:bg-amber-700' :
                                                            'bg-slate-900 hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {childAccess.type === 'FREE' ? 'Register' : childAccess.type === 'GATE' ? 'Register' : 'Redeem'}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-bold px-3 py-2 border border-slate-200 rounded-lg">Pass Needed</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default EventMarketplace;
