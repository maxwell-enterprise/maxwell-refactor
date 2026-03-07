
import React, { useState, useEffect, useMemo } from 'react';
import { DataService } from '../../services/dataService';
import { AttendanceService } from '../../services/attendanceService';
import { EntitlementService } from '../../services/entitlementService';
import { Event, AttendanceRecord, WalletItem, Member } from '../../types/index';
import { Search, Filter, CheckCircle2, Circle, UserCog, CalendarDays, Calendar } from 'lucide-react';
import MemberProfilingModal from '../crm/MemberProfilingModal';

interface ParticipantRow {
    memberId: string;
    memberName: string;
    memberEmail: string;
    ticketId: string;
    ticketTier: string;
    status: 'REGISTERED' | 'ATTENDED';
    checkInTime?: string;
    sessionsAttended: string[]; // IDs of sessions attended
    memberData: Member; // Full object for profiling
}

const ParticipantManager: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Profiling State
    const [profilingMember, setProfilingMember] = useState<Member | null>(null);

    useEffect(() => {
        DataService.getEvents().then(data => {
            // Only show SOLO or CONTAINER events (Top level)
            const list = data.filter(e => !e.parentEventId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEvents(list);
            if(list.length > 0) setSelectedEventId(list[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedEventId) loadParticipants(selectedEventId);
    }, [selectedEventId]);

    const loadParticipants = async (eventId: string) => {
        setLoading(true);
        const [allWallets, allAttendance, allMembers, allEvents] = await Promise.all([
            EntitlementService.getAllWalletItems(),
            AttendanceService.getAttendance(),
            DataService.getMembers(),
            DataService.getEvents()
        ]);

        // 1. Find all sub-events (Sessions) if container
        const subEvents = allEvents.filter(e => e.parentEventId === eventId);
        const relevantEventIds = [eventId, ...subEvents.map(e => e.id)];

        // 2. Find Tickets for this event context
        // Matches if wallet item eventId is the selected event or one of its children
        const tickets = allWallets.filter(w => 
            w.type === 'TICKET' && 
            w.status !== 'EXPIRED' && 
            w.meta?.eventId && relevantEventIds.includes(w.meta.eventId)
        );

        // 3. Build Rows
        const rows: ParticipantRow[] = tickets.map(t => {
            const member = allMembers.find(m => m.id === t.userId);
            // Find specific attendance records for this member within relevant events
            const memberAttendance = allAttendance.filter(a => 
                a.memberId === t.userId && relevantEventIds.includes(a.eventId)
            );

            const isAttended = memberAttendance.length > 0;
            
            return {
                memberId: t.userId,
                memberName: member?.name || t.meta?.recipientName || 'Unknown',
                memberEmail: member?.email || t.meta?.recipientEmail || '',
                ticketId: t.id,
                ticketTier: t.meta?.targetTier || 'General',
                status: isAttended ? 'ATTENDED' : 'REGISTERED',
                checkInTime: isAttended ? memberAttendance[0].scannedAt : undefined, // First checkin
                sessionsAttended: memberAttendance.map(a => a.eventId),
                memberData: member || { id: t.userId, name: t.meta?.recipientName || 'Guest' } as any
            };
        });

        // Deduplicate by Member ID (A member might have multiple tickets if they bought for others but haven't distributed yet, 
        // but typically wallet items are 1 per user. If user bought multiple, they are separate items. 
        // We show all tickets.)
        
        setParticipants(rows);
        setLoading(false);
    };

    const filteredRows = participants.filter(p => 
        p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.memberEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const subSessions = selectedEvent?.type === 'CONTAINER' ? events.filter(e => e.parentEventId === selectedEvent.id) : []; // This needs full event list access, simplified here: we assume 'events' state has everything? No, 'events' state filters top level. 
    // Fix: We need to fetch children for column headers.
    const [displaySessions, setDisplaySessions] = useState<Event[]>([]);
    
    useEffect(() => {
        if(selectedEventId) {
             DataService.getEvents().then(all => {
                 const children = all.filter(e => e.parentEventId === selectedEventId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                 setDisplaySessions(children);
             });
        }
    }, [selectedEventId]);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Calendar size={20} className="text-slate-400"/>
                    <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none w-full md:w-64"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                    >
                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Search participants..." 
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto">
                {loading ? <div className="p-8 text-center text-slate-400 text-sm">Loading participants...</div> :
                 filteredRows.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No participants found.</div> :
                 (
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-3">Participant</th>
                                <th className="p-3">Ticket</th>
                                <th className="p-3 text-center">Status</th>
                                {displaySessions.map((s, idx) => (
                                    <th key={s.id} className="p-3 text-center w-24">S{idx+1}</th>
                                ))}
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRows.map(row => (
                                <tr key={row.ticketId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900">{row.memberName}</div>
                                        <div className="text-[10px] text-slate-500">{row.memberEmail}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{row.ticketTier}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {row.status === 'ATTENDED' ? (
                                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold border border-green-100">Present</span>
                                        ) : (
                                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Registered</span>
                                        )}
                                    </td>
                                    
                                    {/* Session Columns */}
                                    {displaySessions.map(s => {
                                        const attended = row.sessionsAttended.includes(s.id);
                                        return (
                                            <td key={s.id} className="p-3 text-center border-l border-slate-50">
                                                {attended ? <CheckCircle2 size={14} className="text-green-500 mx-auto"/> : <Circle size={14} className="text-slate-200 mx-auto"/>}
                                            </td>
                                        )
                                    })}

                                    <td className="p-3 text-right">
                                        <button 
                                            onClick={() => setProfilingMember(row.memberData)}
                                            className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded flex items-center justify-end ml-auto transition-colors"
                                        >
                                            <UserCog size={14} className="mr-1.5"/> Profile
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )
                }
            </div>

            {profilingMember && (
                <MemberProfilingModal 
                    member={profilingMember} 
                    onClose={() => setProfilingMember(null)}
                    onSuccess={() => {
                        // Refresh logic if needed, usually data update reflects in UI automatically or reload
                        loadParticipants(selectedEventId);
                    }} 
                />
            )}
        </div>
    );
};

export default ParticipantManager;