
import React, { useState } from 'react';
import { OperationalSession } from '../../../types/index';
import { Plus, Trash2, Clock, CalendarDays, Timer } from 'lucide-react';

interface SessionLogisticsManagerProps {
    sessions: OperationalSession[];
    onChange: (sessions: OperationalSession[]) => void;
    baseDate: string; // To auto-fill dates
}

const SessionLogisticsManager: React.FC<SessionLogisticsManagerProps> = ({ sessions, onChange, baseDate }) => {
    const [newSessionName, setNewSessionName] = useState('');

    const handleAdd = () => {
        if (!newSessionName.trim()) return;
        
        const newSession: OperationalSession = {
            id: `SES-${Date.now()}`,
            name: newSessionName,
            startTime: `${baseDate}T09:00`,
            endTime: `${baseDate}T17:00`
        };
        
        onChange([...sessions, newSession]);
        setNewSessionName('');
    };

    const handleRemove = (idx: number) => {
        const updated = [...sessions];
        updated.splice(idx, 1);
        onChange(updated);
    };

    const handleUpdate = (idx: number, field: keyof OperationalSession, value: string) => {
        const updated = [...sessions];
        updated[idx] = { ...updated[idx], [field]: value };
        onChange(updated);
    };

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center">
                        <Timer size={12} className="mr-1"/> Operational Sessions
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Define distinct entry times (e.g. Day 1, Day 2). Purely for access control, not credit.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {sessions.map((session, idx) => (
                    <div key={session.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 rounded text-slate-500">
                                <CalendarDays size={14}/>
                            </div>
                            <input 
                                type="text" 
                                className="flex-1 text-sm font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none"
                                value={session.name}
                                onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                                placeholder="Session Name"
                            />
                            <button onClick={() => handleRemove(idx)} className="text-slate-400 hover:text-red-500 p-1">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Start Time</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                                    value={session.startTime}
                                    onChange={(e) => handleUpdate(idx, 'startTime', e.target.value)}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-slate-400 uppercase font-bold">End Time</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full text-xs p-1.5 border border-slate-200 rounded"
                                    value={session.endTime}
                                    onChange={(e) => handleUpdate(idx, 'endTime', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* ADDER */}
                <div className="flex gap-2 mt-2">
                    <input 
                        type="text" 
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="New Session Name (e.g. Day 2 Entry)"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newSessionName.trim()}
                        className="bg-slate-700 text-white px-3 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    >
                        <Plus size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionLogisticsManager;
