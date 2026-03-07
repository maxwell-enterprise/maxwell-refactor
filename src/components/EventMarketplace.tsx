
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

    // Group Draft Tickets
    const draftTickets = useMemo(() => {
        return wallet.filter(w => w.type === 'TICKET' && w.status === 'ACTIVE' && w.isTransferable && !w.meta?.recipientEmail);
    }, [wallet]);

    // Check Eligibility Helper
    const checkEligibility = (event: Event) => {
        return wallet.find(w => 
            w.type === 'CREDIT_PASS' && 
            w.status === 'ACTIVE' && 
            (w.meta?.isUnlimited || w.meta?.credits > 0) && 
            event.creditTags.includes(w.meta?.tag)
        );
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
        const pass = checkEligibility(event);
        
        if (pass) {
            setSelectedEvent(event);
            setSelectedCreditPass(pass);
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
        if (!selectedEvent || !selectedCreditPass || !user) return;
        
        if (assignee.type === 'GUEST' && (!assignee.name || !assignee.email)) {
            showToast('Guest name and email are required.', 'error');
            return;
        }

        try {
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

            showToast('Redemption Successful!', 'success');
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

    if (loading) return <div className="p-12 text-center text-slate-400">Loading Catalogue...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
            
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                        <ShoppingBag className="mr-3 text-indigo-600" /> Event Catalogue
                    </h1>
                    <p className="text-slate-500 mt-2">Discover events and use your flexible credits to book spots.</p>
                </div>
                
                <div className="flex gap-4">
                     <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center">
                         <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm mr-3">
                             <Zap size={20} />
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-indigo-400 uppercase">Available Credits</p>
                             <p className="text-lg font-bold text-indigo-900">
                                 {wallet.filter(w => w.type === 'CREDIT_PASS').reduce((acc, w) => acc + (w.meta?.credits || 0), 0)}
                             </p>
                         </div>
                     </div>
                     
                     <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center">
                         <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm mr-3">
                             <Ticket size={20} />
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-amber-400 uppercase">Draft Tickets</p>
                             <p className="text-lg font-bold text-amber-900">{draftTickets.length}</p>
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
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveView('UPCOMING')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeView === 'UPCOMING' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Upcoming Events
                </button>
                <button 
                    onClick={() => setActiveView('PAST')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeView === 'PAST' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Past Events
                </button>
            </div>

            {/* Event Grid */}
            <div>
                {activeView === 'UPCOMING' && (
                    <>
                        {upcomingEvents.length === 0 ? (
                            <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                                <Calendar size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>No upcoming events scheduled at the moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcomingEvents.map(event => {
                                    // Special Handling: Hide INVITED_ONLY from grid, assuming accepted via banner
                                    if (event.admissionPolicy === 'INVITED_ONLY') return null;

                                    const eligiblePass = checkEligibility(event);
                                    const isEligible = !!eligiblePass;
                                    const isContainer = event.type === 'CONTAINER';

                                    return (
                                        <div key={event.id} className={`bg-white rounded-2xl border overflow-hidden transition-all group flex flex-col h-full ${isEligible || isContainer ? 'hover:shadow-lg border-slate-200' : 'border-slate-200 opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}>
                                            <div className="h-40 bg-slate-100 relative overflow-hidden">
                                                {event.banner_url ? (
                                                    <img src={event.banner_url} alt={event.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-300"><Calendar size={48}/></div>
                                                )}
                                                
                                                {/* Overlay Badges */}
                                                <div className="absolute top-3 right-3 flex gap-2">
                                                    {isContainer && (
                                                        <span className="bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center border border-slate-700">
                                                            <Layers size={10} className="mr-1.5"/> Series Bundle
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
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h4 className="font-bold text-lg text-slate-900 mb-2 leading-tight">{event.name}</h4>
                                                <div className="space-y-2 mb-6">
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <Clock size={12} className="mr-2 text-slate-400"/> {new Date(event.date).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <MapPin size={12} className="mr-2 text-slate-400"/> {event.location}
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
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
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${isEligible ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-100'}`}>
                                                                {isEligible ? '1 Credit' : 'Credit Required'}
                                                            </span>
                                                            
                                                            {isEligible ? (
                                                                <button 
                                                                    onClick={() => handleOpenRedeem(event)}
                                                                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center"
                                                                >
                                                                    Redeem <ChevronRight size={14} className="ml-1"/>
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
                                <div key={event.id} className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
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
            
            {/* ... Rest of the file (Modals) ... */}
        </div>
    );
};

export default EventMarketplace;
