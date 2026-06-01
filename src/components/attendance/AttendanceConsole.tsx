
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceService } from '../../services/attendanceService';
import { DataService } from '../../services/dataService';
import { AttendanceRecord, Event, Member, UserProfile } from '../../types/index';
import { EventGateConfig } from '../../types/attendance';
import { 
    Calendar, Users, ArrowRight, BarChart3, Download, Search, 
    RefreshCw, UserX, MessageCircle, MapPin, Ticket, ClipboardList, Mail
} from 'lucide-react';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';
import UnassignedTicketMonitor from './UnassignedTicketMonitor';
import ParticipantManager from './ParticipantManager';
import SentInvitationsMonitor from './SentInvitationsMonitor'; // New Import
import { subscribeAttendanceUpdated } from '../../services/attendanceRealtime';
import { UserService } from '../../services/userService';

const getAttendanceMethodLabel = (method: AttendanceRecord['method']) => {
    switch (method) {
        case 'SELF_SCAN':
            return 'Self Check-In';
        case 'LINK_CLICKED':
            return 'Online Join';
        case 'ADMIN_OVERRIDE':
            return 'Admin Override';
        default:
            return 'Gate Scan';
    }
};

const getAttendanceChannelLabel = (record: AttendanceRecord) => {
    if (record.method === 'SELF_SCAN') return 'Self Check-In';
    if (record.method === 'LINK_CLICKED') return 'Online Session';
    if (record.method === 'ADMIN_OVERRIDE') return 'Admin Override';
    return record.gateId || 'Gate Scan';
};

const AttendanceConsole: React.FC = () => {
    // Top Level Tabs
    const [activeTab, setActiveTab] = useState<'LIVE_DASHBOARD' | 'PARTICIPANTS' | 'DISTRIBUTION' | 'INVITATIONS'>('LIVE_DASHBOARD');

    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]); // For missing list
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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

    useEffect(() => {
        if (activeTab !== 'LIVE_DASHBOARD') return;

        return subscribeAttendanceUpdated((payload) => {
            if (!selectedEventId) return;
            if (payload.eventId !== selectedEventId) return;
            void loadAttendance(selectedEventId);
        });
    }, [activeTab, selectedEventId]);

    const loadAttendance = async (eventId: string) => {
        setLoading(true);
        const [allEvents, attData, memData, userData] = await Promise.all([
            DataService.getEvents(),
            AttendanceService.getAttendance(),
            DataService.getMembers(),
            UserService.getAllUsers().catch(() => [])
        ]);
        const childEventIds = allEvents
            .filter((event) => event.parentEventId === eventId)
            .map((event) => event.id);
        const relevantEventIds = new Set([eventId, ...childEventIds]);
        const filteredAttendance = attData.filter((record) => relevantEventIds.has(record.eventId));
        setRecords(filteredAttendance);
        setAllMembers(memData);
        setAllUsers(userData);
        setLoading(false);
    };

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const visibleGates = useMemo<EventGateConfig[]>(() => {
        if (selectedEvent?.gates?.length) {
            return selectedEvent.gates.filter((gate) => gate.isActive);
        }
        return [];
    }, [selectedEvent]);

    const userLookup = useMemo(() => {
        const map = new Map<string, UserProfile>();
        allUsers.forEach(user => {
            map.set(user.id, user);
        });
        return map;
    }, [allUsers]);

    const getOperatorLabel = (record: AttendanceRecord) => {
        if (record.method === 'SELF_SCAN') {
            return 'Self Check-In';
        }

        if (record.method === 'LINK_CLICKED') {
            return 'Online Join';
        }

        if (record.method === 'ADMIN_OVERRIDE') {
            return 'Admin Override';
        }

        const matchedUser = record.scannedByUserId ? userLookup.get(record.scannedByUserId) : undefined;
        if (matchedUser?.fullName?.trim()) {
            return matchedUser.fullName.trim();
        }

        if (record.scannerDevice?.trim()) {
            return record.scannerDevice.trim();
        }

        if (record.scannedByUserId?.trim()) {
            const suffix = record.scannedByUserId.trim().slice(-6);
            return `Operator ${suffix}`;
        }

        return 'Unknown Operator';
    };

    // --- METRICS ---
    const totalPresent = records.length;
    const capacity = selectedEvent?.capacity || 0;
    const occupancy = capacity > 0 ? Math.round((totalPresent / capacity) * 100) : 0;

    // Breakdown by Gate
    const gateStats = useMemo(() => {
        const stats: Record<string, number> = {};
        records.forEach(r => {
            const g = getAttendanceChannelLabel(r);
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
        (
            r.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.verificationCode?.includes(searchTerm) ||
            getOperatorLabel(r).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="page-container flex flex-col animate-fade-in bg-slate-50 pb-8">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start mb-5 sm:mb-6 min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                        <BarChart3 className="shrink-0 text-blue-600" size={28} /> 
                        <span className="leading-tight">Attendance Command Center</span>
                    </h1>
                    <p className="text-slate-500 mt-1.5 text-sm sm:text-base">Real-time monitoring of event entry.</p>
                </div>
                
                {/* GLOBAL TAB SWITCHER — scroll on narrow screens, wrap on tablet */}
                <div className="flex w-full lg:w-auto overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:flex-wrap sm:gap-2 lg:gap-0 bg-white sm:bg-white p-1 rounded-xl border border-slate-200 shadow-sm lg:shadow-none">
                    <button 
                        onClick={() => setActiveTab('LIVE_DASHBOARD')}
                        className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'LIVE_DASHBOARD' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <BarChart3 size={16} className="inline mr-2 align-text-bottom"/> Live Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('PARTICIPANTS')}
                        className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'PARTICIPANTS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Users size={16} className="inline mr-2 align-text-bottom"/> Participants
                    </button>
                    <button 
                        onClick={() => setActiveTab('DISTRIBUTION')}
                        className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'DISTRIBUTION' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Ticket size={16} className="inline mr-2 align-text-bottom"/> Unassigned
                    </button>
                    <button 
                        onClick={() => setActiveTab('INVITATIONS')}
                        className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'INVITATIONS' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Mail size={16} className="inline mr-2 align-text-bottom"/> Sent Invites
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            
            {activeTab === 'PARTICIPANTS' && <ParticipantManager />}
            
            {activeTab === 'DISTRIBUTION' && <UnassignedTicketMonitor />}

            {activeTab === 'INVITATIONS' && <SentInvitationsMonitor />}

            {activeTab === 'LIVE_DASHBOARD' && (
                <>
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:items-center mb-5 sm:mb-6 min-w-0">
                         <select 
                            className="min-w-0 w-full sm:w-72 p-2.5 border border-slate-300 rounded-lg bg-white text-sm font-bold"
                            value={selectedEventId || ''}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            {events.map(e => <option key={e.id} value={e.id}>{e.date} - {e.name}</option>)}
                        </select>
                        <button type="button" onClick={() => selectedEventId && loadAttendance(selectedEventId)} className="shrink-0 p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 touch-target sm:min-h-0 sm:min-w-0 self-start sm:self-center">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
                        </button>
                    </div>

                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 min-w-0">
                        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg min-w-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Present</p>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-3xl sm:text-4xl font-bold tabular-nums">{totalPresent}</span>
                                <span className="text-sm text-slate-400 mb-1">/ {capacity}</span>
                            </div>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: `${occupancy}%`}}></div>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 min-w-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Gate Throughput</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                                {visibleGates.length === 0 ? (
                                    <div className="col-span-full bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-700">
                                        No gate is configured for this event yet. Configure gates in Event Operations.
                                    </div>
                                ) : (
                                    visibleGates.map(gate => (
                                        <div key={gate.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-0">
                                            <div className="text-xs sm:text-sm font-bold text-slate-600 leading-snug break-words line-clamp-3">{gate.name}</div>
                                            <div className="text-xl font-bold text-slate-800 mt-1 tabular-nums">{gateStats[gate.id] || 0}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Tier Breakdown</p>
                            <div className="space-y-2">
                                {Object.entries(tierStats).map(([tier, count]) => (
                                    <div key={tier} className="flex justify-between gap-2 text-sm min-w-0">
                                        <span className="font-medium text-slate-600 truncate">{tier}</span>
                                        <span className="font-bold text-slate-900 shrink-0 tabular-nums">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 min-w-0 xl:items-stretch">
                        {/* LEFT: PRESENCE LIST — scroll long lists inside card on xl; page scrolls on smaller */}
                        <div className="w-full xl:flex-1 min-w-0 min-h-[20rem] xl:min-h-[28rem] xl:max-h-[calc(100dvh-14rem)] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Live Feed</h3>
                                <div className="flex gap-2 min-w-0">
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        className="min-w-0 flex-1 pl-3 pr-2 py-2 text-sm border rounded-lg bg-white"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <button type="button" className="shrink-0 p-2 text-slate-500 hover:text-blue-600 touch-target sm:min-h-0 sm:min-w-0"><Download size={16}/></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto overflow-x-auto min-w-0">
                                <table className="w-full text-left text-sm min-w-[280px]">
                                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-100 sticky top-0 text-xs sm:text-sm">
                                        <tr>
                                            <th className="p-2 sm:p-3 whitespace-nowrap">Time</th>
                                            <th className="p-2 sm:p-3 min-w-[100px]">Attendee</th>
                                            <th className="p-2 sm:p-3">Channel</th>
                                            <th className="p-2 sm:p-3">Method</th>
                                            <th className="p-2 sm:p-3">Operator</th>
                                            <th className="p-2 sm:p-3">Tier</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredRecords.map(r => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="p-2 sm:p-3 font-mono text-slate-500 text-xs sm:text-sm whitespace-nowrap">{new Date(r.scannedAt).toLocaleTimeString()}</td>
                                                <td className="p-2 sm:p-3 font-medium break-words max-w-[140px] sm:max-w-none">{r.memberName}</td>
                                                <td className="p-2 sm:p-3 text-slate-600 break-words">{getAttendanceChannelLabel(r)}</td>
                                                <td className="p-2 sm:p-3">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-xs ${
                                                        r.method === 'GATE_SCAN'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : r.method === 'LINK_CLICKED'
                                                                ? 'bg-cyan-100 text-cyan-700'
                                                                : r.method === 'ADMIN_OVERRIDE'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {getAttendanceMethodLabel(r.method)}
                                                    </span>
                                                </td>
                                                <td className="p-2 sm:p-3 text-slate-600 break-words max-w-[180px] sm:max-w-none">
                                                    {getOperatorLabel(r)}
                                                </td>
                                                <td className="p-2 sm:p-3">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-xs ${r.ticketTier === 'VIP' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
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
                        <div className="w-full xl:w-80 shrink-0 min-w-0 xl:max-h-[calc(100dvh-14rem)] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm max-h-[min(50vh,24rem)]">
                             <div className="p-3 sm:p-4 border-b border-slate-100 bg-red-50 flex justify-between items-center">
                                <h3 className="font-bold text-red-800 text-sm sm:text-base flex items-center gap-2 min-w-0">
                                    <UserX size={18} className="shrink-0"/> <span className="truncate">Not Checked-In</span>
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 min-h-0">
                                {missingMembers.map(m => (
                                    <div key={m.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between gap-2 hover:border-red-200 group transition-all min-w-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm text-slate-700 break-words">{m.name}</div>
                                            <div className="text-xs text-slate-400 mt-0.5 break-all">{m.phone}</div>
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
