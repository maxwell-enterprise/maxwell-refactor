
import React, { useState, useEffect } from 'react';
import { DataService } from '../../services/dataService';
import { InvitationService } from '../../services/invitationService';
import { Event, EventTierDefinition } from '../../types/index';
import { X, Send, Calendar, Users, CheckCircle, Mail, AlertCircle, Ticket } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

interface InviteMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedMemberIds: string[];
    onSuccess: () => void;
}

const InviteMembersModal: React.FC<InviteMembersModalProps> = ({ isOpen, onClose, selectedMemberIds, onSuccess }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedTierId, setSelectedTierId] = useState(''); // NEW
    const [validUntil, setValidUntil] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if(isOpen) {
            DataService.getEvents().then(all => {
                // Filter only future events and specifically Invited Only or Pre-Booked
                const validEvents = all.filter(e => 
                    (e.admissionPolicy === 'INVITED_ONLY' || e.admissionPolicy === 'PRE_BOOKED')
                ).filter(e => new Date(e.date) >= new Date());
                
                setEvents(validEvents.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                
                // Set default validity to 7 days from now
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setValidUntil(nextWeek.toISOString().slice(0, 10));
            });
        }
    }, [isOpen]);

    // Handle Event change to reset tier
    const handleEventChange = (evtId: string) => {
        setSelectedEventId(evtId);
        setSelectedTierId(''); // Reset Tier
    };

    const handleSend = async () => {
        if (!selectedEventId || !validUntil || !selectedTierId) {
            showToast('Please select event, ticket tier, and expiration date.', 'error');
            return;
        }

        setIsSending(true);
        try {
            await InvitationService.sendInvitations(
                selectedMemberIds, 
                selectedEventId, 
                selectedTierId, // NEW: Pass Tier ID
                validUntil, 
                user?.id || 'admin'
            );
            showToast(`Sent ${selectedMemberIds.length} invitations successfully.`, 'success');
            onSuccess();
            onClose();
        } catch (e) {
            showToast('Failed to send invitations.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const availableTiers = selectedEvent?.tiers || [];

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white text-purple-600 rounded-lg shadow-sm"><Mail size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-900">Send Event Invitations</h3>
                            <p className="text-xs text-purple-700 font-bold uppercase tracking-widest">
                                {selectedMemberIds.length} Recipients Selected
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Target Event</label>
                        <select 
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                            value={selectedEventId}
                            onChange={(e) => handleEventChange(e.target.value)}
                        >
                            <option value="">-- Choose Event --</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.admissionPolicy === 'INVITED_ONLY' ? '🔒 ' : ''}{e.name} ({new Date(e.date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                        {selectedEvent && (
                            <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-slate-400"/>
                                <span>Policy: <b>{selectedEvent.admissionPolicy.replace('_', ' ')}</b>. <br/>Recipients will see this in their "Event Catalogue".</span>
                            </div>
                        )}
                    </div>

                    {/* NEW: Tier Selection */}
                    {selectedEvent && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                <Ticket size={14} className="mr-1"/> Select Ticket Type to Issue
                            </label>
                            {availableTiers.length > 0 ? (
                                <select 
                                    className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={selectedTierId}
                                    onChange={(e) => setSelectedTierId(e.target.value)}
                                >
                                    <option value="">-- Choose Tier --</option>
                                    {availableTiers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} (Quota: {t.quota})</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs">
                                    Error: This event has no tiers configured. Please add a tier in Event Admin first.
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Invitation Valid Until</label>
                        <input 
                            type="date" 
                            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Invitation card will disappear from member dashboard after this date.</p>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl text-sm transition-colors">Cancel</button>
                    <button 
                        onClick={handleSend} 
                        disabled={isSending || !selectedEventId || !validUntil || !selectedTierId}
                        className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 flex items-center text-sm disabled:opacity-50 transition-all"
                    >
                        {isSending ? 'Sending...' : <><Send size={16} className="mr-2"/> Send Invites</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteMembersModal;
