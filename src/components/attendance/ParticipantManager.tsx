import React, { useEffect, useMemo, useState } from 'react';
import { DataService } from '../../services/dataService';
import { AttendanceService } from '../../services/attendanceService';
import { EntitlementService } from '../../services/entitlementService';
import { Event, AttendanceRecord, WalletItem, Member, UserProfile } from '../../types/index';
import { Search, CheckCircle2, Circle, UserCog, Calendar, Filter } from 'lucide-react';
import MemberProfilingModal from '../crm/MemberProfilingModal';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';
import { UserService } from '../../services/userService';

type ParticipantStatus = 'REGISTERED' | 'CHECKED_IN' | 'MISSING';
type ParticipantStatusFilter = 'NAMED_ONLY' | 'ALL' | ParticipantStatus;

const UNNAMED_PARTICIPANT_LABEL = 'Unnamed Participant';
type AccessMethod = 'Ticket Scan' | 'Credit Deduction';

interface ParticipantRow {
    memberId: string;
    memberName: string;
    memberEmail: string;
    memberPhone: string;
    ticketId: string;
    ticketTier: string;
    gateLabel: string;
    operatorLabel: string;
    accessMethod: AccessMethod;
    status: ParticipantStatus;
    checkInTime?: string;
    sessionsAttended: string[];
    memberData: Member;
    socialVerified: boolean;
    socialFollowers: number;
    occupation: string;
    businessType: string;
    businessAccounts: string[];
    communities: string[];
    tags: string[];
}

const EMPTY_SOCIAL = {
    igVerified: false,
    igFollowers: 0,
    businessAccounts: [] as string[],
    occupation: '',
    businessType: '',
    communities: [] as string[],
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const toTitleFromEmail = (email?: string) => {
    const alias = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
    return alias
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const buildFallbackMember = (
    ticket: WalletItem,
    attendance?: AttendanceRecord,
): Member => {
    const recipientEmail = typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail.trim() : '';
    const recipientPhone = typeof ticket.meta?.recipientPhone === 'string' ? ticket.meta.recipientPhone.trim() : '';
    const recipientName = typeof ticket.meta?.recipientName === 'string' ? ticket.meta.recipientName.trim() : '';

    return {
        id: attendance?.memberId || ticket.userId,
        name:
            attendance?.memberName ||
            recipientName ||
            toTitleFromEmail(attendance?.memberEmail || recipientEmail) ||
            recipientPhone ||
            UNNAMED_PARTICIPANT_LABEL,
        email: attendance?.memberEmail || recipientEmail || '',
        phone: recipientPhone,
        category: 'Member',
        scholarship: false,
        joinMonth: '',
        program: '',
        mentorshipDuration: 0,
        nTagStatus: '',
        platform: 'Digital',
        regInUS: false,
        lifecycleStage: 'IDENTIFIED',
        tags: [],
        socialProfile: { ...EMPTY_SOCIAL },
        engagement: {
            lastActiveDate: '',
            eventsAttendedCount: 0,
            contentCompletionRate: 0,
            communityReputationScore: 0,
            leadScore: 0,
        },
    };
};

const ParticipantManager: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [displaySessions, setDisplaySessions] = useState<Event[]>([]);
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState('ALL');
    const [filterGate, setFilterGate] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState<ParticipantStatusFilter>('NAMED_ONLY');
    const [profilingMember, setProfilingMember] = useState<Member | null>(null);

    useEffect(() => {
        DataService.getEvents().then((data) => {
            const list = data
                .filter((event) => !event.parentEventId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEvents(list);
            if (list.length > 0) {
                setSelectedEventId(list[0].id);
            }
        });
    }, []);

    useEffect(() => {
        if (!selectedEventId) return;
        void loadParticipants(selectedEventId);
        DataService.getEvents().then((all) => {
            const children = all
                .filter((event) => event.parentEventId === selectedEventId)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setDisplaySessions(children);
        });
    }, [selectedEventId]);

    const loadParticipants = async (eventId: string) => {
        setLoading(true);
        try {
            const [internalUsers, walletItems, attendanceRows, crmMembers, eventRows] = await Promise.all([
                UserService.getAllUsers().catch(() => [] as UserProfile[]),
                EntitlementService.getAllWalletItems(),
                AttendanceService.getAttendance(),
                DataService.getMembers(),
                DataService.getEvents(),
            ]);

            const selectedEvent = eventRows.find((event) => event.id === eventId);
            const subEvents = eventRows.filter((event) => event.parentEventId === eventId);
            const relevantEventIds = [eventId, ...subEvents.map((event) => event.id)];
            const gateMap = new Map(
                (selectedEvent?.gates ?? []).map((gate) => [gate.id, gate.name]),
            );
            const userMap = new Map(internalUsers.map((user) => [user.id, user]));

            const membersById = new Map(crmMembers.map((member) => [member.id, member]));
            const membersByEmail = new Map(
                crmMembers
                    .filter((member) => normalizeEmail(member.email))
                    .map((member) => [normalizeEmail(member.email), member]),
            );

            const relevantAttendance = attendanceRows.filter((record) =>
                relevantEventIds.includes(record.eventId),
            );

            const tickets = walletItems.filter((wallet) =>
                wallet.type === 'TICKET' &&
                wallet.status !== 'EXPIRED' &&
                typeof wallet.meta?.eventId === 'string' &&
                relevantEventIds.includes(wallet.meta.eventId)
            );

            const buildParticipantRow = (
                ticket: WalletItem,
                ticketAttendance: AttendanceRecord[],
            ): ParticipantRow => {
                const recipientEmail = normalizeEmail(
                    typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail : '',
                );
                const memberFromWallet =
                    membersById.get(ticket.userId) ||
                    (recipientEmail ? membersByEmail.get(recipientEmail) : undefined);
                const primaryAttendance = ticketAttendance[0];
                const member =
                    memberFromWallet ||
                    (primaryAttendance ? membersById.get(primaryAttendance.memberId) : undefined) ||
                    (primaryAttendance?.memberEmail
                        ? membersByEmail.get(normalizeEmail(primaryAttendance.memberEmail))
                        : undefined);
                const fallbackMember = buildFallbackMember(ticket, primaryAttendance);
                const resolvedMember = member || fallbackMember;

                const hasAttended = ticketAttendance.length > 0;
                const eventDate = selectedEvent?.date ? new Date(selectedEvent.date) : null;
                if (eventDate) {
                    eventDate.setHours(23, 59, 59, 999);
                }
                const isMissing = !hasAttended && !!eventDate && eventDate.getTime() < Date.now();

                const accessMethod: AccessMethod =
                    ticket.meta?.admissionPolicy === 'ON_SITE_DEDUCTION' ||
                    typeof ticket.meta?.creditTag === 'string'
                        ? 'Credit Deduction'
                        : 'Ticket Scan';
                const matchedOperator = primaryAttendance?.scannedByUserId
                    ? userMap.get(primaryAttendance.scannedByUserId)
                    : undefined;
                const operatorLabel =
                    primaryAttendance?.method === 'SELF_SCAN'
                        ? 'Self Check-In'
                        : primaryAttendance?.method === 'LINK_CLICKED'
                            ? 'Online Join'
                            : primaryAttendance?.method === 'ADMIN_OVERRIDE'
                                ? 'Admin Override'
                                : matchedOperator?.fullName?.trim() ||
                                  primaryAttendance?.scannerDevice?.trim() ||
                                  (primaryAttendance?.scannedByUserId
                                      ? `Operator ${primaryAttendance.scannedByUserId.slice(-6)}`
                                      : hasAttended
                                          ? 'Unknown Operator'
                                          : '-');

                const gateLabel = primaryAttendance?.gateId
                    ? gateMap.get(primaryAttendance.gateId) || primaryAttendance.gateId
                    : primaryAttendance
                        ? 'Self Check-In'
                        : 'Not Arrived';

                const social = resolvedMember.socialProfile || EMPTY_SOCIAL;
                const tags = resolvedMember.tags || [];

                return {
                    memberId: primaryAttendance?.memberId || resolvedMember.id,
                    memberName: primaryAttendance?.memberName || resolvedMember.name,
                    memberEmail: primaryAttendance?.memberEmail || resolvedMember.email,
                    memberPhone: resolvedMember.phone || '',
                    ticketId: ticket.id,
                    ticketTier:
                        typeof ticket.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
                            ? ticket.meta.targetTier
                            : primaryAttendance?.ticketTier || 'General',
                    gateLabel,
                    operatorLabel,
                    accessMethod,
                    status: hasAttended ? 'CHECKED_IN' : isMissing ? 'MISSING' : 'REGISTERED',
                    checkInTime: primaryAttendance?.scannedAt,
                    sessionsAttended: ticketAttendance.map((record) => record.eventId),
                    memberData: resolvedMember,
                    socialVerified: social.igVerified,
                    socialFollowers: social.igFollowers,
                    occupation: social.occupation || resolvedMember.jobTitle || '',
                    businessType: social.businessType || resolvedMember.industry || '',
                    businessAccounts: social.businessAccounts || [],
                    communities: social.communities || [],
                    tags,
                };
            };

            const attendanceByTicketId = new Map<string, AttendanceRecord[]>();
            for (const record of relevantAttendance) {
                const ticketId = typeof record.ticketUniqueId === 'string' ? record.ticketUniqueId.trim() : '';
                if (!ticketId) continue;
                const bucket = attendanceByTicketId.get(ticketId) || [];
                bucket.push(record);
                attendanceByTicketId.set(ticketId, bucket);
            }

            const rowsFromAttendance: ParticipantRow[] = [];
            const consumedTicketIds = new Set<string>();

            for (const ticket of tickets) {
                const ticketAttendance = (attendanceByTicketId.get(ticket.id) || [])
                    .slice()
                    .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime());
                if (ticketAttendance.length === 0) continue;
                rowsFromAttendance.push(buildParticipantRow(ticket, ticketAttendance));
                consumedTicketIds.add(ticket.id);
            }

            const rowsFromTickets: ParticipantRow[] = tickets
                .filter((ticket) => !consumedTicketIds.has(ticket.id))
                .map((ticket) => {
                    const fallbackAttendance = relevantAttendance
                        .filter((record) =>
                            record.memberId === ticket.userId ||
                            normalizeEmail(record.memberEmail) === normalizeEmail(
                                typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail : '',
                            ),
                        )
                        .sort((a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime());
                    return buildParticipantRow(ticket, fallbackAttendance);
                });

            const rows = [...rowsFromAttendance, ...rowsFromTickets].sort((a, b) => {
                const aTime = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
                const bTime = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
                return bTime - aTime;
            });

            setParticipants(rows);
        } finally {
            setLoading(false);
        }
    };

    const selectedEvent = events.find((event) => event.id === selectedEventId);
    const tierOptions = useMemo(
        () => Array.from(new Set(participants.map((row) => row.ticketTier))).sort(),
        [participants],
    );
    const gateOptions = useMemo(
        () => Array.from(new Set(participants.map((row) => row.gateLabel))).sort(),
        [participants],
    );

    const filteredRows = useMemo(
        () =>
            participants.filter((row) => {
                const matchesNaming =
                    filterStatus !== 'NAMED_ONLY' ||
                    row.memberName.trim() !== UNNAMED_PARTICIPANT_LABEL;
                const matchesSearch =
                    row.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    row.memberEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    row.memberPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    row.operatorLabel.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesTier = filterTier === 'ALL' || row.ticketTier === filterTier;
                const matchesGate = filterGate === 'ALL' || row.gateLabel === filterGate;
                const matchesStatus =
                    filterStatus === 'ALL' ||
                    filterStatus === 'NAMED_ONLY' ||
                    row.status === filterStatus;
                return (
                    matchesNaming &&
                    matchesSearch &&
                    matchesTier &&
                    matchesGate &&
                    matchesStatus
                );
            }),
        [participants, searchTerm, filterTier, filterGate, filterStatus],
    );

    const formatStatus = (status: ParticipantStatus) => {
        if (status === 'CHECKED_IN') return 'Checked-In';
        if (status === 'MISSING') return 'Missing';
        return 'Registered';
    };

    const statusTone = (status: ParticipantStatus) => {
        if (status === 'CHECKED_IN') return 'bg-green-50 text-green-700 border-green-100';
        if (status === 'MISSING') return 'bg-red-50 text-red-700 border-red-100';
        return 'bg-slate-50 text-slate-600 border-slate-100';
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full items-center gap-3 lg:w-auto">
                        <Calendar size={20} className="text-slate-400" />
                        <select
                            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-bold outline-none lg:w-72"
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search participant..."
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold outline-none"
                            value={filterTier}
                            onChange={(e) => setFilterTier(e.target.value)}
                        >
                            <option value="ALL">All Tiers</option>
                            {tierOptions.map((tier) => (
                                <option key={tier} value={tier}>
                                    {tier}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold outline-none"
                            value={filterGate}
                            onChange={(e) => setFilterGate(e.target.value)}
                        >
                            <option value="ALL">All Gates</option>
                            {gateOptions.map((gate) => (
                                <option key={gate} value={gate}>
                                    {gate}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rounded-lg border border-slate-300 bg-white p-2 text-xs font-semibold outline-none"
                            value={filterStatus}
                            onChange={(e) =>
                                setFilterStatus(e.target.value as ParticipantStatusFilter)
                            }
                        >
                            <option value="NAMED_ONLY">Named Participants</option>
                            <option value="ALL">All Status</option>
                            <option value="REGISTERED">Registered</option>
                            <option value="CHECKED_IN">Checked-In</option>
                            <option value="MISSING">Missing</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold border border-slate-200">
                        <Filter size={12} /> {filteredRows.length} participants
                    </span>
                    {selectedEvent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold border border-slate-200">
                            Event Date: {selectedEvent.date}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-8 text-center text-sm text-slate-400">Loading participants...</div>
                ) : filteredRows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">No participants found.</div>
                ) : (
                    <table className="w-full min-w-[1500px] text-left text-xs">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 font-bold text-slate-500">
                            <tr>
                                <th className="p-3">Participant</th>
                                <th className="p-3">Tier</th>
                                <th className="p-3">Gate</th>
                                <th className="p-3">Operator</th>
                                <th className="p-3">Method</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Check-In Time</th>
                                {displaySessions.map((session, idx) => (
                                    <th key={session.id} className="p-3 text-center">
                                        S{idx + 1}
                                    </th>
                                ))}
                                <th className="p-3">Verified IG</th>
                                <th className="p-3">IG Followers</th>
                                <th className="p-3">Occupation</th>
                                <th className="p-3">Business Type</th>
                                <th className="p-3">Business Account</th>
                                <th className="p-3">Community</th>
                                <th className="p-3">Tags</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRows.map((row) => (
                                <tr key={row.ticketId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900">{row.memberName}</div>
                                        <div className="text-[10px] text-slate-500">{row.memberEmail || row.memberPhone || 'No contact info'}</div>
                                    </td>
                                    <td className="p-3">
                                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700">
                                            {row.ticketTier}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">{row.gateLabel}</td>
                                    <td className="p-3 text-slate-600">{row.operatorLabel}</td>
                                    <td className="p-3 text-slate-600">{row.accessMethod}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 font-bold ${statusTone(row.status)}`}>
                                            {formatStatus(row.status)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600">
                                        {row.checkInTime ? new Date(row.checkInTime).toLocaleString() : '-'}
                                    </td>
                                    {displaySessions.map((session) => {
                                        const attended = row.sessionsAttended.includes(session.id);
                                        return (
                                            <td key={session.id} className="p-3 text-center">
                                                {attended ? (
                                                    <CheckCircle2 size={14} className="mx-auto text-green-500" />
                                                ) : (
                                                    <Circle size={14} className="mx-auto text-slate-200" />
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3">
                                        {row.socialVerified ? (
                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">Verified</span>
                                        ) : (
                                            <span className="text-slate-400">No</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-slate-600">
                                        {row.socialFollowers > 0 ? row.socialFollowers.toLocaleString() : '-'}
                                    </td>
                                    <td className="p-3 text-slate-600">{row.occupation || '-'}</td>
                                    <td className="p-3 text-slate-600">{row.businessType || '-'}</td>
                                    <td className="p-3 text-slate-600">
                                        {row.businessAccounts.length > 0 ? row.businessAccounts.join(', ') : '-'}
                                    </td>
                                    <td className="p-3 text-slate-600">
                                        {row.communities.length > 0 ? row.communities.join(', ') : '-'}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {row.tags.length > 0 ? row.tags.map((tag) => (
                                                <span key={tag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                    {tag}
                                                </span>
                                            )) : <span className="text-slate-400">-</span>}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <WhatsAppQuickAction
                                                phone={row.memberPhone}
                                                name={row.memberName}
                                                context="EVENT_ATTENDANCE"
                                                variant="icon"
                                                compact
                                                contextData={{
                                                    member_name: row.memberName,
                                                    event_name: selectedEvent?.name || 'Event',
                                                }}
                                            />
                                            <button
                                                onClick={() => setProfilingMember(row.memberData)}
                                                className="inline-flex items-center rounded-lg px-3 py-1.5 text-indigo-600 transition-colors hover:bg-indigo-50"
                                            >
                                                <UserCog size={14} className="mr-1.5" /> Profile
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {profilingMember && (
                <MemberProfilingModal
                    member={profilingMember}
                    onClose={() => setProfilingMember(null)}
                    onSuccess={() => {
                        void loadParticipants(selectedEventId);
                    }}
                />
            )}
        </div>
    );
};

export default ParticipantManager;
