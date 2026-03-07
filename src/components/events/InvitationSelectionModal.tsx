
import React, { useState, useEffect } from 'react';
import { Event, EventInvitation } from '../../types/index';
import { DataService } from '../../services/dataService';
import { X, Calendar, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface InvitationSelectionModalProps {
    invitation: EventInvitation;
    containerEvent: Event;
    onConfirm: (selectedIds: string[]) => void;
    onClose: () => void;
}

const InvitationSelectionModal: React.FC<InvitationSelectionModalProps> = ({ invitation, containerEvent, onConfirm, onClose }) => {
    const { showToast } = useToast();
    const [subEvents, setSubEvents] = useState<Event[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const config = containerEvent.selectionConfig || { mode: 'OPTION', minSelect: 1, maxSelect: 1 };

    useEffect(() => {
        loadSubEvents();
    }, [containerEvent.id]);

    const loadSubEvents = async () => {
        setLoading(true);
        const allEvents = await DataService.getEvents();
        // Get children of this container
        const children = allEvents.filter(e => e.parentEventId === containerEvent.id);
        setSubEvents(children.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setLoading(false);
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            if (selectedIds.length >= config.maxSelect) {
                showToast(`Maximum selection is ${config.maxSelect}`, 'error');
                return;
            }
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSubmit = () => {
        if (selectedIds.length < config.minSelect) {
            showToast(`Please select at least ${config.minSelect} event(s).`, 'error');
            return;
        }
        onConfirm(selectedIds);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">Select Your Sessions</h3>
                        <p className="text-xs text-indigo-700 font-bold uppercase tracking-widest mt-1">
                            {containerEvent.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={24}/></button>
                </div>

                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
                    <div className="flex items-center gap-2 text-sm text-indigo-800">
                        <AlertCircle size={16} />
                        <span>Please choose <b>{config.minSelect} to {config.maxSelect}</b> sessions from the list below.</span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-500">
                        Selected: <span className={selectedIds.length >= config.minSelect ? 'text-green-600' : 'text-slate-900'}>{selectedIds.length}</span> / {config.maxSelect}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {loading ? <div className="text-center py-8 text-slate-400">Loading options...</div> :
                     subEvents.map(event => {
                         const isSelected = selectedIds.includes(event.id);
                         return (
                             <div 
                                key={event.id}
                                onClick={() => toggleSelection(event.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                    isSelected 
                                    ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                             >
                                 <div>
                                     <h4 className="font-bold text-slate-900 text-sm">{event.name}</h4>
                                     <div className="flex items-center text-xs text-slate-500 mt-1">
                                         <Calendar size={12} className="mr-1"/> {new Date(event.date).toLocaleDateString()}
                                     </div>
                                 </div>
                                 <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                     {isSelected && <Check size={12} className="text-white"/>}
                                 </div>
                             </div>
                         );
                     })}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white">
                    <button 
                        onClick={handleSubmit}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all"
                    >
                        Confirm Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvitationSelectionModal;
