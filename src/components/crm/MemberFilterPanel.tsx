
import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar, CheckCircle, RotateCcw } from 'lucide-react';
import { DataService } from '../../services/dataService';
import { Event } from '../../types/index';
import type { FilterCriteria } from '../../features/crm/types';

export type { FilterCriteria } from '../../features/crm/types';

interface MemberFilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterCriteria) => void;
}

const MemberFilterPanel: React.FC<MemberFilterPanelProps> = ({ isOpen, onClose, onApply }) => {
    const [events, setEvents] = useState<Event[]>([]);
    
    // Internal state to hold changes before applying
    const [localCriteria, setLocalCriteria] = useState<FilterCriteria>({});
    
    useEffect(() => {
        if(isOpen) {
            DataService.getEvents().then(setEvents);
        }
    }, [isOpen]);

    const handleApply = () => {
        onApply(localCriteria);
        onClose();
    };

    const handleClear = () => {
        const empty = {};
        setLocalCriteria(empty);
        onApply(empty);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-12 right-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 animate-scale-in origin-top-right overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                    <Filter size={14} className="mr-2 text-blue-600"/> Advanced Filters
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                </button>
            </div>
            
            <div className="p-5 space-y-5">
                
                {/* Event Attendance Filter */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Participation</label>
                    <select 
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        value={localCriteria.attendedEventId || ''}
                        onChange={(e) => setLocalCriteria({...localCriteria, attendedEventId: e.target.value})}
                    >
                        <option value="">-- All / No Specific Event --</option>
                        {events.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>

                {/* Lifecycle */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lifecycle Stage</label>
                    <select 
                        className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                        value={localCriteria.lifecycleStage || ''}
                        onChange={(e) => setLocalCriteria({...localCriteria, lifecycleStage: e.target.value})}
                    >
                        <option value="">-- All Stages --</option>
                        <option value="GUEST">Guest</option>
                        <option value="IDENTIFIED">Identified</option>
                        <option value="PARTICIPANT">Participant</option>
                        <option value="MEMBER">Member</option>
                        <option value="CERTIFIED">Certified</option>
                        <option value="FACILITATOR">Facilitator</option>
                    </select>
                </div>

                {/* Join Date Range */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Join Date (Range)</label>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] w-8 text-slate-400 font-medium">From</span>
                            <input 
                                type="month" 
                                className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={localCriteria.joinDateStart || ''}
                                onChange={e => setLocalCriteria({...localCriteria, joinDateStart: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] w-8 text-slate-400 font-medium">To</span>
                            <input 
                                type="month" 
                                className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={localCriteria.joinDateEnd || ''}
                                onChange={e => setLocalCriteria({...localCriteria, joinDateEnd: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-2 border-t border-slate-50">
                    <button 
                        onClick={handleClear} 
                        className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={14}/> Reset
                    </button>
                    <button 
                        onClick={handleApply} 
                        className="flex-[2] py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={14}/> Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberFilterPanel;
