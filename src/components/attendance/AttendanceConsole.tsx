
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceService } from '../../services/attendanceService';
import { DataService } from '../../services/dataService';
import { AttendanceRecord, Event, Member } from '../../types/index';
import { EventGateConfig } from '../../types/attendance';
import { ATTENDANCE_TEST_GATES } from '../../seeds/attendance_testing';
import { 
    Calendar, Users, ArrowRight, BarChart3, Download, Search, 
    RefreshCw, UserX, MessageCircle, MapPin, Ticket, ClipboardList, Mail
} from 'lucide-react';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';
import UnassignedTicketMonitor from './UnassignedTicketMonitor';
import ParticipantManager from './ParticipantManager';
import SentInvitationsMonitor from './SentInvitationsMonitor'; // New Import

const AttendanceConsole: React.FC = () => {
    // Top Level Tabs
    const [activeTab, setActiveTab] = useState<'LIVE_DASHBOARD' | 'PARTICIPANTS' | 'DISTRIBUTION' | 'INVITATIONS'>('LIVE_DASHBOARD');

    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]); // For missing list
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState('ALL');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        const data = await DataService.getEvents();
        // Show active events first
        const sorted = data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(sorted);
        
        // Auto-select first active-looking event
        if(sorted.length > 0 && !selectedEventId) {
             // Prefer today or future closest
             const today = new Date().toISOString().split('T')[0];
             const active = sorted.find(e => e.date >= today) || sorted[0];
             setSelectedEventId(active.id);
        }
    };

    useEffect(() => {
        if (selectedEventId && activeTab === 'LIVE_DASHBOARD') {
            loadAttendance(selectedEventId);
        }
    }, [selectedEventId, activeTab]);

    const loadAttendance = async (eventId: string) => {
        setLoading(true);
        const [attData, memData] = await Promise.all([
            AttendanceService.getAttendance(eventId),
            DataService.getMembers()
        ]);
        setRecords(attData);
        setAllMembers(memData);
        setLoading(false);
    };

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const visibleGates = useMemo<EventGateConfig[]>(() => {
        if (selectedEvent?.gates?.length) {
            return selectedEvent.gates.filter((gate) => gate.isActive);
        }

        return ATTENDANCE_TEST_GATES.map((gate) => ({
            id: gate.id,
            name: gate.label,
            allowedTiers: gate.allowedTiers,
            assignedUserIds: [],
            isActive: true,
        }));
    }, [selectedEvent]);

    // --- METRICS ---
    const totalPresent = records.length;
    const capacity = selectedEvent?.capacity || 0;
    const occupancy = capacity > 0 ? Math.round((totalPresent / capacity) * 100) : 0;

    // Breakdown by Gate
    const gateStats = useMemo(() => {
        const stats: Record<string, number> = {};
        records.forEach(r => {
            const g = r.gateId || 'Unknown';
            stats[g] = (stats[g] || 0) + 1;
        });
        return stats;
    }, [records]);

    // Breakdown by Tier
    const tierStats = useMemo(() => {
        const stats: Record<string, number> = {};
        records.forEach(r => {
            const t = r.ticketTier || 'General';
            stats[t] = (stats[t] || 0) + 1;
        });
        return stats;
    }, [records]);

    // Missing List (Naive Logic: Everyone is invited? Or filter by eligibility?)
    // For this demo, we assume "Members" are invited. 
    // In real app, we check "Tickets Issued" table.
    // We'll filter members who haven't scanned in.
    const missingMembers = useMemo(() => {
        if (!selectedEvent) return [];
        const presentIds = new Set(records.map(r => r.memberId));
        return allMembers
            .filter(m => !presentIds.has(m.id) && m.lifecycleStage !== 'GUEST') // Filter out random guests
            .slice(0, 50); // Limit list
    }, [allMembers, records, selectedEvent]);

    const filteredRecords = records.filter(r => 
        (filterTier === 'ALL' || r.ticketTier === filterTier) &&
        (r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || r.verificationCode?.includes(searchTerm))
    );

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in bg-slate-50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <BarChart3 className="mr-3 text-blue-600" /> Attendance Command Center
                    </h1>
                    <p className="text-slate-500 mt-1">Real-time monitoring of event entry.</p>
                </div>
                
                {/* GLOBAL TAB SWITCHER */}
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('LIVE_DASHBOARD')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'LIVE_DASHBOARD' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <BarChart3 size={16} className="inline mr-2"/> Live Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('PARTICIPANTS')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'PARTICIPANTS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Users size={16} className="inline mr-2"/> Participants
                    </button>
                    <button 
                        onClick={() => setActiveTab('DISTRIBUTION')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'DISTRIBUTION' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Ticket size={16} className="inline mr-2"/> Unassigned
                    </button>
                    <button 
                        onClick={() => setActiveTab('INVITATIONS')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'INVITATIONS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Mail size={16} className="inline mr-2"/> Sent Invites
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            
            {activeTab === 'PARTICIPANTS' && <ParticipantManager />}
            
            {activeTab === 'DISTRIBUTION' && <UnassignedTicketMonitor />}

            {activeTab === 'INVITATIONS' && <SentInvitationsMonitor />}

            {activeTab === 'LIVE_DASHBOARD' && (
                <>
                    <div className="flex justify-end gap-4 items-center mb-6">
                         <select 
                            className="p-2 border border-slate-300 rounded-lg bg-white text-sm font-bold w-64"
                            value={selectedEventId || ''}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            {events.map(e => <option key={e.id} value={e.id}>{e.date} - {e.name}</option>)}
                        </select>
                        <button onClick={() => selectedEventId && loadAttendance(selectedEventId)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
                        </button>
                    </div>

                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Present</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-3xl font-bold">{totalPresent}</span>
                                <span className="text-sm text-slate-400 mb-1">/ {capacity}</span>
                            </div>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: `${occupancy}%`}}></div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Gate Throughput</p>
                            <div className="grid grid-cols-3 gap-2">
                                {visibleGates.map(gate => (
                                    <div key={gate.id} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-500 truncate">{gate.name}</div>
                                        <div className="text-xl font-bold text-slate-800">{gateStats[gate.id] || 0}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-3">Tier Breakdown</p>
                            <div className="space-y-2">
                                {Object.entries(tierStats).map(([tier, count]) => (
                                    <div key={tier} className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-600">{tier}</span>
                                        <span className="font-bold text-slate-900">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex gap-6 overflow-hidden">
                        {/* LEFT: PRESENCE LIST */}
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-sm">Live Feed</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        className="pl-3 pr-2 py-1 text-xs border rounded bg-white"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <button className="text-slate-500 hover:text-blue-600"><Download size={16}/></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                                        <tr>
                                            <th className="p-3">Time</th>
                                            <th className="p-3">Attendee</th>
                                            <th className="p-3">Gate</th>
                                            <th className="p-3">Tier</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredRecords.map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-slate-500">{new Date(r.scannedAt).toLocaleTimeString()}</td>
                                                <td className="p-3 font-medium">{r.memberName}</td>
                                                <td className="p-3 text-slate-600">{r.gateId || 'Self-Scan'}</td>
                                                <td className="p-3">
                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${r.ticketTier === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {r.ticketTier}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RIGHT: MISSING PERSONS (Actionable) */}
                        <div className="w-80 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                             <div className="p-4 border-b border-slate-100 bg-red-50 flex justify-between items-center">
                                <h3 className="font-bold text-red-800 text-sm flex items-center">
                                    <UserX size={16} className="mr-2"/> Not Checked-In
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {missingMembers.map(m => (
                                    <div key={m.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between hover:border-red-200 group transition-all">
                                        <div>
                                            <div className="font-bold text-sm text-slate-700">{m.name}</div>
                                            <div className="text-[10px] text-slate-400">{m.phone}</div>
                                        </div>
                                        <WhatsAppQuickAction 
                                            phone={m.phone} 
                                            name={m.name}
                                            context="EVENT_ATTENDANCE"
                                            variant="icon"
                                            compact
                                            contextData={{
                                                member_name: m.name,
                                                event_name: selectedEvent?.name || 'Event'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceConsole;
