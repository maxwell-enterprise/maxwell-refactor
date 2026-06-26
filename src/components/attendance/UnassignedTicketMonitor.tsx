
import React, { useState, useEffect, useMemo } from 'react';
import { WalletItem, Event, UserProfile } from '../../types/index';
import { DataService } from '../../services/dataService';
import { EntitlementService } from '../../services/entitlementService';
import { PaymentService } from '../../services/paymentService';
import { UserService } from '../../services/userService';
import { WhatsAppService } from '../../services/whatsappService';
import {
    buildPaidBuyerEmailByUserId,
    normalizeEmail,
    resolveWalletOwnerIdentity,
} from './participantWalletBuyers';
import {
    buildWalletOwnerUserMap,
    collectWalletOwnerIds,
} from './walletOwnerUserMap';
import { Ticket, Send, RefreshCw, User, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface UnassignedGroupRow {
    groupId: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    eventId: string;
    eventName: string;
    quantity: number;
    ticketIds: string[];
}

type SortField = 'ownerName' | 'eventName' | 'quantity';
type SortOrder = 'asc' | 'desc';

const UnassignedTicketMonitor: React.FC = () => {
    const { showToast } = useToast();
    const [rows, setRows] = useState<UnassignedGroupRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterOwner, setFilterOwner] = useState('');
    const [filterEvent, setFilterEvent] = useState('');

    const [sortField, setSortField] = useState<SortField>('ownerName');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [allWallets, allMembers, allEvents, gifts, payments, internalUsers] =
            await Promise.all([
                EntitlementService.getAllWalletItems(),
                DataService.getMembers(),
                DataService.getEvents(),
                EntitlementService.getAllGifts().catch(() => []),
                PaymentService.getGatewayLogs().catch(() => []),
                UserService.getAllUsers().catch(() => [] as UserProfile[]),
            ]);

        const membersById = new Map(allMembers.map((member) => [member.id, member]));
        const membersByEmail = new Map(
            allMembers
                .filter((member) => normalizeEmail(member.email))
                .map((member) => [normalizeEmail(member.email), member]),
        );
        const userMap = await buildWalletOwnerUserMap(
            collectWalletOwnerIds(allWallets, gifts),
            internalUsers,
        );
        const paidBuyerEmailByUserId = buildPaidBuyerEmailByUserId(
            allWallets,
            gifts,
            payments,
            membersById,
        );

        const ownerTickets = new Map<string, WalletItem[]>();
        const unassigned = allWallets.filter(
            (wallet) =>
                wallet.type === 'TICKET' &&
                wallet.status === 'ACTIVE' &&
                wallet.isTransferable &&
                !wallet.meta?.recipientEmail &&
                !wallet.meta?.recipientName,
        );

        for (const ticket of unassigned) {
            const list = ownerTickets.get(ticket.userId) ?? [];
            list.push(ticket);
            ownerTickets.set(ticket.userId, list);
        }

        const groups: Record<string, UnassignedGroupRow> = {};

        unassigned.forEach((ticket) => {
            const ownerId = ticket.userId;
            const eventId = ticket.meta?.eventId || 'unknown';
            const groupKey = `${ownerId}_${eventId}`;

            if (!groups[groupKey]) {
                const event = allEvents.find((entry) => entry.id === eventId);
                const ticketsForOwner = ownerTickets.get(ownerId) ?? [ticket];
                const owner = resolveWalletOwnerIdentity(
                    ownerId,
                    ticketsForOwner,
                    {
                        userMap,
                        membersById,
                        membersByEmail,
                        gifts,
                        paidBuyerEmailByUserId,
                    },
                    'Unknown User',
                );

                groups[groupKey] = {
                    groupId: groupKey,
                    ownerId,
                    ownerName: owner.name,
                    ownerEmail: owner.email,
                    ownerPhone: owner.phone,
                    eventId,
                    eventName: event?.name || ticket.title || 'Unknown Event',
                    quantity: 0,
                    ticketIds: [],
                };
            }

            groups[groupKey].quantity += 1;
            groups[groupKey].ticketIds.push(ticket.id);
        });

        setRows(Object.values(groups));
        setLoading(false);
    };

    const handleRemind = (row: UnassignedGroupRow) => {
        if (!row.ownerPhone) {
            showToast(
                row.ownerEmail
                    ? `No phone on file. Email: ${row.ownerEmail}`
                    : 'No phone number for this user.',
                row.ownerEmail ? 'info' : 'error',
            );
            return;
        }

        const message = `Hi ${row.ownerName}, you still have ${row.quantity} "${row.eventName}" ticket(s) marked Unassigned (not used or sent yet). Please sign in and use My Wallet to assign or send them if they are for someone else. Thanks!`;
        const link = WhatsAppService.generateLink(row.ownerPhone, message);
        window.open(link, '_blank');
        showToast('WhatsApp opened.', 'success');
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const processedRows = useMemo(() => {
        let result = [...rows];

        if (filterOwner) {
            const q = filterOwner.toLowerCase();
            result = result.filter(
                (row) =>
                    row.ownerName.toLowerCase().includes(q) ||
                    row.ownerEmail.toLowerCase().includes(q),
            );
        }
        if (filterEvent) {
            result = result.filter((row) =>
                row.eventName.toLowerCase().includes(filterEvent.toLowerCase()),
            );
        }

        result.sort((a, b) => {
            let valA: string | number = a[sortField];
            let valB: string | number = b[sortField];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [rows, filterOwner, filterEvent, sortField, sortOrder]);

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <div className="h-4 w-4" />;
        return sortOrder === 'asc' ? (
            <ArrowUp size={14} className="ml-1" />
        ) : (
            <ArrowDown size={14} className="ml-1" />
        );
    };

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                <div>
                    <h3 className="flex items-center font-bold text-slate-800">
                        <Ticket size={18} className="mr-2 text-amber-500" /> Unassigned Tickets (Empty)
                    </h3>
                    <p className="text-xs text-slate-500">
                        Tickets purchased but currently holding no attendee data.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadData()}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-12 text-center text-sm text-slate-400">Scanning wallet database...</div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-400">
                        No unassigned tickets found. Good job!
                    </div>
                ) : (
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
                            <tr>
                                <th
                                    className="cursor-pointer p-3 transition-colors select-none hover:bg-slate-100"
                                    onClick={() => handleSort('ownerName')}
                                >
                                    <div className="flex items-center">
                                        Purchaser {renderSortIcon('ownerName')}
                                    </div>
                                </th>
                                <th
                                    className="cursor-pointer p-3 transition-colors select-none hover:bg-slate-100"
                                    onClick={() => handleSort('eventName')}
                                >
                                    <div className="flex items-center">
                                        Event {renderSortIcon('eventName')}
                                    </div>
                                </th>
                                <th
                                    className="w-24 cursor-pointer p-3 text-center transition-colors select-none hover:bg-slate-100"
                                    onClick={() => handleSort('quantity')}
                                >
                                    <div className="flex items-center justify-center">
                                        Qty {renderSortIcon('quantity')}
                                    </div>
                                </th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="p-2">
                                    <div className="relative">
                                        <Filter
                                            size={12}
                                            className="absolute top-1/2 left-2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Filter Owner..."
                                            className="w-full rounded border border-slate-200 py-1 pr-2 pl-7 text-xs font-normal outline-none focus:border-blue-500"
                                            value={filterOwner}
                                            onChange={(e) => setFilterOwner(e.target.value)}
                                        />
                                    </div>
                                </th>
                                <th className="p-2">
                                    <div className="relative">
                                        <Filter
                                            size={12}
                                            className="absolute top-1/2 left-2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Filter Event..."
                                            className="w-full rounded border border-slate-200 py-1 pr-2 pl-7 text-xs font-normal outline-none focus:border-blue-500"
                                            value={filterEvent}
                                            onChange={(e) => setFilterEvent(e.target.value)}
                                        />
                                    </div>
                                </th>
                                <th className="p-2" />
                                <th className="p-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedRows.map((row) => (
                                <tr key={row.groupId} className="transition-colors hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="flex items-center font-bold text-slate-900">
                                            <User size={14} className="mr-2 text-slate-400" />
                                            {row.ownerName}
                                        </div>
                                        {row.ownerEmail ? (
                                            <div className="ml-6 text-xs text-slate-500">{row.ownerEmail}</div>
                                        ) : null}
                                        {row.ownerPhone ? (
                                            <div className="ml-6 text-xs text-slate-400">{row.ownerPhone}</div>
                                        ) : null}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-800">{row.eventName}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                            {row.quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleRemind(row)}
                                            className="inline-flex items-center rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-200"
                                        >
                                            <Send size={12} className="mr-1.5" /> Remind User
                                        </button>
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

export default UnassignedTicketMonitor;
