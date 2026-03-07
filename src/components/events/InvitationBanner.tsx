
import React, { useState } from 'react';
import { EventInvitation, Event } from '../../types/index';
import { DataService } from '../../services/dataService';
import { MailOpen, ArrowRight, Clock, CheckCircle, Loader2 } from 'lucide-react';
import InvitationSelectionModal from './InvitationSelectionModal';

interface InvitationBannerProps {
    invitation: EventInvitation;
    onAccept: (invitationId: string, selectedSubIds?: string[]) => void;
    onDecline: (invitationId: string) => void;
}

const InvitationBanner: React.FC<InvitationBannerProps> = ({ invitation, onAccept, onDecline }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [containerEvent, setContainerEvent] = useState<Event | null>(null);

    // Calculate days left
    const diffTime = new Date(invitation.validUntil).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const handleAcceptClick = async () => {
        setIsProcessing(true);
        // Check event type
        const events = await DataService.getEvents();
        const event = events.find(e => e.id === invitation.eventId);
        
        if (event && event.type === 'CONTAINER' && event.selectionConfig?.mode === 'OPTION') {
            setContainerEvent(event);
            setShowSelectionModal(true);
            setIsProcessing(false);
        } else {
            // Direct Accept
            onAccept(invitation.id);
            setIsProcessing(false);
        }
    };

    const handleConfirmSelection = (ids: string[]) => {
        onAccept(invitation.id, ids);
        setShowSelectionModal(false);
    };

    return (
        <>
            <div className="bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 rounded-2xl p-1 shadow-xl mb-8 animate-fade-in-down relative overflow-hidden group">
                {/* Animated Border Effect */}
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-5 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full border border-purple-500/50 shadow-inner">
                            <MailOpen size={24} className="text-purple-300" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">You're Invited</span>
                                <span className="text-purple-300 text-xs flex items-center">
                                    <Clock size={10} className="mr-1"/> Expires in {diffDays} days
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white">{invitation.eventName}</h3>
                            <p className="text-slate-400 text-xs mt-1">Exclusive access granted by Admin. RSVP to secure your ticket.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => onDecline(invitation.id)}
                            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            disabled={isProcessing}
                        >
                            Decline
                        </button>
                        <button 
                            onClick={handleAcceptClick}
                            disabled={isProcessing}
                            className="px-6 py-2.5 bg-white text-purple-900 rounded-lg text-sm font-bold shadow-lg hover:bg-purple-50 hover:scale-105 transition-all flex items-center"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <>Accept & Register <ArrowRight size={16} className="ml-2"/></>}
                        </button>
                    </div>
                </div>
            </div>

            {showSelectionModal && containerEvent && (
                <InvitationSelectionModal 
                    invitation={invitation}
                    containerEvent={containerEvent}
                    onConfirm={handleConfirmSelection}
                    onClose={() => setShowSelectionModal(false)}
                />
            )}
        </>
    );
};

export default InvitationBanner;
