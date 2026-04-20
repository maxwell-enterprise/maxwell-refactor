
import React from 'react';
import { WalletItem } from '../../types/access';
import { X, Calendar, Clock, MapPin, Video, CheckCircle, ShieldCheck, Map, Ticket, ChevronRight, Layers, ArrowLeft, PlayCircle, Globe } from 'lucide-react';
import QRCodeDisplay from '../common/QRCodeDisplay';
import { useTicketLogic } from '../../hooks/useTicketLogic';

interface TicketDetailModalProps {
    item: WalletItem;
    onClose: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ item, onClose }) => {
    const { 
        eventData, 
        subEvents,
        selectedSession,
        isLoading, 
        mode, 
        activeTab, 
        setActiveTab, 
        availableTabs, 
        joinOnlineSession, 
        handleSelectSession,
        handleBackToSeries,
        openSecureLink,
        isJoining, 
        isAttended,
        displayDate,
        displayTime,
        displayLocation,
        displayTitle,
        locationMapLink
    } = useTicketLogic(item, onClose);

    const isContainer = eventData?.type === 'CONTAINER';

    // Helper to determine if we should show location details
    // Show if Offline OR Hybrid.
    const showLocationDetails = mode === 'OFFLINE' || mode === 'HYBRID';

    return (
        <div className="fixed inset-0 z-[130] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in flex flex-col relative max-h-[90vh]">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-5 right-5 z-20 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                    <X size={20} />
                </button>

                {/* Header & Title */}
                <div className="flex-none pt-10 pb-4 px-6 text-center bg-white z-10">
                    
                    {/* BADGES ROW */}
                    <div className="mb-4 flex justify-center gap-2 flex-wrap">
                         {/* Event Mode Badge */}
                         <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${
                            mode === 'ONLINE' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            mode === 'HYBRID' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                            {mode === 'ONLINE' && <Video size={12} />}
                            {mode === 'HYBRID' && <Globe size={12} />}
                            {mode === 'OFFLINE' && <MapPin size={12} />}
                            {mode} EVENT
                        </span>

                         {/* Status Badge */}
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${isAttended ? 'bg-green-50 text-green-600 border-green-100' : 'bg-white text-slate-500 border-slate-200'}`}>
                             {isAttended ? <CheckCircle size={12} /> : <Ticket size={12} />} 
                             {isContainer && !selectedSession ? 'SERIES BUNDLE' : (isAttended ? 'CHECKED IN' : 'VALID PASS')}
                        </span>
                    </div>
                    
                    {/* Dynamic Title with Back Support */}
                    <div className="relative min-h-[3rem] flex items-center justify-center">
                        {selectedSession && (
                            <button 
                                onClick={handleBackToSeries}
                                className="absolute left-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full"
                                title="Back to Series"
                            >
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <h2 className="text-xl font-black text-slate-900 leading-tight px-8 line-clamp-2">
                            {displayTitle}
                        </h2>
                    </div>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                        {selectedSession ? `Session Part of: ${eventData?.name}` : item.subtitle}
                    </p>
                </div>

                {/* Dynamic Tab Switcher */}
                {availableTabs.length > 1 && (
                    <div className="px-6 mb-4 shrink-0">
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full shadow-inner">
                            {availableTabs.map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <tab.icon size={12}/> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* SCROLLABLE CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 bg-white">
                    
                    {/* TAB: SESSIONS (LIST VIEW FOR CONTAINER) */}
                    {activeTab === 'SESSIONS' && (
                        <div className="space-y-3 animate-fade-in py-2">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-center">Included Events</p>
                            {subEvents.length === 0 ? (
                                <div className="text-center text-slate-400 py-8 text-sm">No sessions scheduled yet.</div>
                            ) : subEvents.map((session, idx) => {
                                const isPast = new Date(session.date) < new Date(new Date().setHours(0,0,0,0));
                                const isOnline = session.locationMode === 'ONLINE';

                                return (
                                    <div 
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${isPast ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-indigo-50 rounded-lg text-indigo-700 shrink-0">
                                                <span className="text-[10px] font-bold uppercase">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-sm font-black">{new Date(session.date).getDate()}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 truncate pr-2 group-hover:text-indigo-700 transition-colors">{session.name}</h4>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    {isOnline ? (
                                                        <span className="flex items-center text-blue-500"><Video size={10} className="mr-1"/> Online</span>
                                                    ) : (
                                                        <span className="flex items-center"><MapPin size={10} className="mr-1"/> Location</span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{session.recurringMeta?.time || 'TBA'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500"/>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* TAB: ACCESS (QR CODE) */}
                    {activeTab === 'ACCESS' && (
                         <div className="w-full flex flex-col items-center animate-fade-in py-4">
                             {!isAttended ? (
                                 <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-slate-200 relative group w-full max-w-[220px] mb-6 shadow-sm">
                                     {/* 
                                        QR Data Logic: 
                                        For sub-sessions, we ideally want a unique ID. 
                                        However, since the WalletItem is one ID, we use a composite string "TICKET:EVENT_ID:USER_ID:WALLET_ID".
                                        The Event ID changes based on selection, allowing the scanner to know which session is being accessed.
                                     */}
                                     <QRCodeDisplay
                                        data={
                                          item.qrData?.trim() ||
                                          `TICKET:${selectedSession?.id || eventData?.id || (typeof item.meta?.eventId === 'string' ? item.meta.eventId : '') || 'UNKNOWN'}:${item.userId}:${item.id}`
                                        }
                                        size={160}
                                        showLabel={false}
                                        className="opacity-90 transition-opacity group-hover:opacity-100"
                                     />
                                     <div className="mt-4 flex items-center justify-center text-green-600 text-[10px] font-bold uppercase tracking-wider bg-green-50 py-1.5 rounded-lg">
                                         <ShieldCheck size={12} className="mr-1.5"/> Valid Ticket
                                     </div>
                                 </div>
                             ) : (
                                <div className="bg-green-50 p-8 rounded-3xl border border-green-100 w-full mb-6">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <CheckCircle size={32} className="text-green-500" />
                                    </div>
                                    <h3 className="font-bold text-green-800 text-center">Already Scanned</h3>
                                    <p className="text-xs text-green-600 mt-1 text-center">Access granted.</p>
                                </div>
                             )}
                             <p className="text-xs text-slate-400 text-center px-4">
                                Show this QR code at the entrance gate for {displayTitle}.
                             </p>
                             
                             {/* Small Location Hint for Offline */}
                             {showLocationDetails && (
                                <div className="mt-6 flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full">
                                    <MapPin size={12} className="mr-1.5 text-red-500"/> 
                                    {displayLocation || 'Venue TBD'}
                                </div>
                             )}
                         </div>
                    )}

                    {/* TAB: VIRTUAL (ONLINE LINK) */}
                    {activeTab === 'VIRTUAL' && (
                        <div className="w-full space-y-6 animate-fade-in py-6 flex flex-col justify-center h-full">
                            {/* Visual Header */}
                            <div className="p-8 bg-indigo-50 rounded-full w-40 h-40 flex items-center justify-center mx-auto border-4 border-white shadow-xl mb-4">
                                <Video size={64} className="text-indigo-600" />
                            </div>

                            <div className="text-center space-y-2">
                                <h4 className="font-bold text-slate-800">Online Session</h4>
                                <p className="text-xs text-slate-500">
                                    Click the button below to join the live stream. Your attendance will be recorded automatically.
                                </p>
                            </div>

                            <button 
                                onClick={joinOnlineSession}
                                disabled={isJoining}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-pulse-slow"
                            >
                                {isJoining ? 'Connecting...' : (isAttended ? 'Re-Join Session' : 'Join Session Now')}
                                {!isJoining && <PlayCircle size={18}/>}
                            </button>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400">
                                    Link protected for: <b>{item.meta?.recipientName || 'You'}</b>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB: DETAILS (METADATA) */}
                    {activeTab === 'DETAILS' && (
                        <div className="w-full space-y-4 animate-fade-in py-2">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                {/* Date - Always Shown */}
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm"><Calendar size={16}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            {displayDate ? new Date(displayDate).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 'TBA'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Time - Always Shown */}
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm"><Clock size={16}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Time</p>
                                        <p className="text-sm font-bold text-slate-800">{displayTime || 'See Schedule'}</p>
                                    </div>
                                </div>

                                {/* Location - Only if Offline or Hybrid */}
                                {showLocationDetails && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm"><MapPin size={16}/></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                                            <p className="text-sm font-bold text-slate-800">{displayLocation || 'Online / TBD'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Map Button - Only if Offline/Hybrid AND link exists. Removed overly restrictive container checks. */}
                            {showLocationDetails && locationMapLink && (
                                <button 
                                    onClick={() => openSecureLink(locationMapLink)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                >
                                    <Map size={14} /> Open Venue in Maps
                                </button>
                            )}
                            
                             <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center">
                                <p className="text-xs text-slate-400">
                                    Ticket ID: <span className="font-mono text-slate-600">{item.id}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Branding */}
                <div className="p-4 border-t border-slate-100 bg-white z-10 text-center">
                     <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.25em]">Maxwell Leadership Enterprise</p>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailModal;
