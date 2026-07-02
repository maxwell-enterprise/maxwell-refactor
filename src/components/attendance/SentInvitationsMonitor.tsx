
import React, { useState, useEffect } from 'react';
import { Member, Event } from '../../types/index';
import { GiftAllocation } from '../../types/access';
import { DataService } from '../../services/dataService';
import { InvitationService } from '../../services/invitationService';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import {
    formatEventDateForMessage,
    formatEventSchedulePhaseLabel,
    resolveEventScheduleMeta,
    type EventScheduleMeta,
    type EventSchedulePhase,
} from '../../lib/eventScheduleMeta';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, User, Calendar, Gift, MessageCircle, Layers } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// Unified Row for UI
interface UnifiedInviteRow {
    id: string;
    type: 'ADMIN_INVITE' | 'USER_GIFT';
    eventName: string;
    eventDate: string;
    eventSchedule: EventScheduleMeta;

    senderName: string;
    senderId: string;

    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    recipientLastLogin?: string;

    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLAIMED' | 'EXPIRED';
    sentAt: string;

    claimToken?: string;
    deliveryMethod?: GiftAllocation['deliveryMethod'];
}

const buildClaimUrl = (claimToken: string) => {
    if (typeof window === 'undefined') return `/claim?token=${claimToken}`;
    return `${window.location.origin}/claim?token=${encodeURIComponent(claimToken)}`;
};

const buildDashboardLoginUrl = () => {
    if (typeof window === 'undefined') return '/dashboard?view=WALLET';
    return `${window.location.origin}/dashboard?view=WALLET`;
};

const buildClaimInviteMessage = (row: UnifiedInviteRow): string => {
    const greeting = `Hi ${row.recipientName}!`;
    const eventLine = row.eventName ? ` for *${row.eventName}*` : '';

    if (row.type === 'ADMIN_INVITE') {
        const loginUrl = buildDashboardLoginUrl();
        return `${greeting}\n\nYou have received an official Maxwell Leadership invitation${eventLine}.\n\nPlease log in to the Maxwell dashboard and claim your ticket in My Wallet:\n${loginUrl}`;
    }

    if (row.deliveryMethod === 'LINK' && row.claimToken) {
        const claimUrl = buildClaimUrl(row.claimToken);
        return `${greeting}\n\n${row.senderName} has sent you a ticket${eventLine}.\n\nPlease log in and claim your ticket using this link:\n${claimUrl}`;
    }

    const loginUrl = buildDashboardLoginUrl();
    return `${greeting}\n\n${row.senderName} has sent you a ticket${eventLine}.\n\nPlease log in to the Maxwell dashboard and claim your ticket in My Wallet:\n${loginUrl}`;
};

const phaseBadgeClass = (phase: EventSchedulePhase): string => {
    switch (phase) {
        case 'PAST':
            return 'bg-slate-200 text-slate-600';
        case 'ONGOING':
            return 'bg-emerald-100 text-emerald-700';
        default:
            return 'bg-sky-100 text-sky-700';
    }
};

const buildInviteRowSchedule = (
    event: Event | undefined,
    events: Event[],
    referenceDate: string,
): EventScheduleMeta => resolveEventScheduleMeta(event, events, referenceDate);

const buildAttendanceReminderMessage = (row: UnifiedInviteRow): string => {
    const greeting = `Hi ${row.recipientName}!`;
    const eventLabel = row.eventName ? `*${row.eventName}*` : 'your event';
    const dateLine = formatEventDateForMessage(row.eventSchedule, row.eventDate);

    if (row.type === 'ADMIN_INVITE') {
        return `${greeting}\n\nReminder from Maxwell Leadership: please don't forget to attend ${eventLabel} with your invitation ticket.${dateLine ? `\n${dateLine}` : ''}\n\nWe look forward to seeing you there!`;
    }

    return `${greeting}\n\nReminder from Maxwell Leadership: please don't forget to attend ${eventLabel} with your ticket from ${row.senderName}.${dateLine ? `\n${dateLine}` : ''}\n\nWe look forward to seeing you there!`;
};

const isClaimedInviteStatus = (status: UnifiedInviteRow['status']): boolean =>
    status === 'ACCEPTED' || status === 'CLAIMED';

const buildWhatsAppMessage = (row: UnifiedInviteRow): string =>
    isClaimedInviteStatus(row.status)
        ? buildAttendanceReminderMessage(row)
        : buildClaimInviteMessage(row);

const SentInvitationsMonitor: React.FC = () => {
    const { showToast } = useToast();
    const [rows, setRows] = useState<UnifiedInviteRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [invitations, gifts, members, events, wallets] = await Promise.all([
            InvitationService.getAllInvitations(),
            EntitlementService.getAllGifts(),
            DataService.getMembers(),
            DataService.getEvents(),
            EntitlementService.getAllWalletItems(),
        ]);

        const today = new Date().toISOString().split('T')[0];

        const adminRows: UnifiedInviteRow[] = invitations.map(inv => {
            const sender = members.find(m => m.id === inv.sentBy) || { name: 'Admin', phone: '' };
            const recipient = members.find(m => m.id === inv.memberId);
            const event = events.find(e => e.id === inv.eventId);
            const eventSchedule = buildInviteRowSchedule(event, events, today);

            return {
                id: inv.id,
                type: 'ADMIN_INVITE',
                eventName: inv.eventName,
                eventDate: eventSchedule.dateRange?.start || event?.date || '',
                eventSchedule,
                senderName: sender.name,
                senderId: inv.sentBy,
                recipientName: inv.memberName || recipient?.name || 'Unknown',
                recipientEmail: recipient?.email || 'N/A',
                recipientPhone: recipient?.phone || '',
                recipientLastLogin: recipient?.engagement?.lastActiveDate,
                status: inv.status,
                sentAt: inv.sentAt,
            };
        });

        const validGifts = gifts.filter(g => g.status !== 'REVOKED');

        const giftRows: UnifiedInviteRow[] = validGifts.map(gift => {
            const sender = members.find(m => m.id === gift.sourceUserId);
            const recipient = members.find(
                m =>
                    m.email.toLowerCase() === gift.targetEmail?.toLowerCase() ||
                    m.id === gift.claimedByUserId,
            );
            const ticket = wallets.find(w => w.id === gift.entitlementId);
            const eventId = ticket?.meta?.eventId;
            const event = events.find(e => e.id === eventId);
            const eventSchedule = buildInviteRowSchedule(event, events, today);

            return {
                id: gift.id,
                type: 'USER_GIFT',
                eventName: event?.name || gift.itemName,
                eventDate: eventSchedule.dateRange?.start || event?.date || '',
                eventSchedule,
                senderName: sender?.name || gift.sourceUserName || 'Unknown User',
                senderId: gift.sourceUserId,
                recipientName:
                    gift.recipientName?.trim() ||
                    (gift.claimedByUserId || gift.status === 'CLAIMED'
                      ? recipient?.name?.trim()
                      : undefined) ||
                    recipient?.name ||
                    'Guest (By Email)',
                recipientEmail: gift.targetEmail || recipient?.email || '',
                recipientPhone:
                    gift.recipientPhone?.trim() ||
                    recipient?.phone ||
                    (typeof ticket?.meta?.recipientPhone === 'string'
                        ? ticket.meta.recipientPhone
                        : ''),
                recipientLastLogin: recipient?.engagement?.lastActiveDate,
                status: gift.status === 'CLAIMED' ? 'ACCEPTED' : 'PENDING',
                sentAt: gift.createdAt,
                claimToken: gift.claimToken,
                deliveryMethod: gift.deliveryMethod,
            };
        });

        const allRows = [...adminRows, ...giftRows].sort(
            (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        );

        setRows(allRows);
        setLoading(false);
    };

    const openWhatsAppInvite = (row: UnifiedInviteRow) => {
        const phone = row.recipientPhone?.trim();
        if (!phone) {
            showToast('Recipient WhatsApp number is not available.', 'error');
            return;
        }

        const message = buildWhatsAppMessage(row);
        const link = WhatsAppService.generateLink(phone, message);
        window.open(link, '_blank');
    };

    const showWhatsAppAction = (status: UnifiedInviteRow['status']) =>
        status === 'PENDING' || status === 'ACCEPTED' || status === 'CLAIMED';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Mail size={18} className="mr-2 text-purple-500"/> Global Invitation Monitor
                    </h3>
                    <p className="text-xs text-slate-500">Consolidated view of Admin Invites & User P2P Gifts.</p>
                </div>
                <button onClick={loadData} className="p-2 text-slate-500 hover:bg-white rounded-lg transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 text-sm">Loading invitations...</div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">No pending or active invitations found.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4">Recipient</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Event Details</th>
                                <th className="p-4">Sent By</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{row.recipientName}</div>
                                        <div className="text-[10px] text-slate-500">{row.recipientEmail || '-'}</div>
                                        {row.recipientPhone ? (
                                            <div className="text-[10px] text-slate-400">{row.recipientPhone}</div>
                                        ) : null}
                                    </td>
                                    <td className="p-4">
                                        {row.type === 'ADMIN_INVITE' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                OFFICIAL
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                                                <Gift size={10} className="mr-1"/> P2P GIFT
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-800">{row.eventName}</div>
                                        {row.eventSchedule.isSeries ? (
                                            <div className="mt-1 inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 border border-indigo-100">
                                                <Layers size={9} className="mr-1" />
                                                Series · {row.eventSchedule.sessionCount} sessions
                                            </div>
                                        ) : null}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
                                            <span className="inline-flex items-center">
                                                <Calendar size={10} className="mr-1 shrink-0" />
                                                {row.eventSchedule.displayDateLabel}
                                            </span>
                                            <span
                                                className={`px-1 rounded text-[9px] font-bold ${phaseBadgeClass(row.eventSchedule.phase)}`}
                                            >
                                                {formatEventSchedulePhaseLabel(row.eventSchedule.phase)}
                                            </span>
                                        </div>
                                        {row.eventSchedule.detailLine ? (
                                            <div className="mt-1 text-[10px] leading-snug text-slate-500">
                                                {row.eventSchedule.detailLine}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="p-4 text-slate-600 text-xs">
                                        <div className="flex items-center font-medium">
                                            <User size={12} className="mr-1"/> {row.senderName}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(row.sentAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        {row.status === 'ACCEPTED' || row.status === 'CLAIMED' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                                <CheckCircle size={10} className="mr-1"/> Claimed
                                            </span>
                                        ) : row.status === 'DECLINED' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                                <XCircle size={10} className="mr-1"/> Declined
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold animate-pulse">
                                                <Clock size={10} className="mr-1"/> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center justify-end gap-2">
                                            {showWhatsAppAction(row.status) && (
                                                <button
                                                    type="button"
                                                    onClick={() => openWhatsAppInvite(row)}
                                                    disabled={!row.recipientPhone?.trim()}
                                                    className="inline-flex items-center justify-center rounded-lg border border-green-200 bg-green-50 p-2 text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title={
                                                        !row.recipientPhone?.trim()
                                                            ? 'WhatsApp number not available'
                                                            : isClaimedInviteStatus(row.status)
                                                              ? 'Send attendance reminder via WhatsApp'
                                                              : 'Send claim invite via WhatsApp'
                                                    }
                                                    aria-label={
                                                        isClaimedInviteStatus(row.status)
                                                            ? 'Send attendance reminder via WhatsApp'
                                                            : 'Send claim invite via WhatsApp'
                                                    }
                                                >
                                                    <MessageCircle size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SentInvitationsMonitor;
