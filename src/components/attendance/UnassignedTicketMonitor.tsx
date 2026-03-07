
import React, { useState, useEffect, useMemo } from 'react';
import { WalletItem, Member, Event } from '../../types/index';
import { DataService } from '../../services/dataService';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import { Ticket, Send, RefreshCw, User, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface UnassignedGroupRow {
    groupId: string; // Composite key
    ownerId: string;
    ownerName: string;
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
    
    // Filter State
    const [filterOwner, setFilterOwner] = useState('');
    const [filterEvent, setFilterEvent] = useState('');
    
    // Sort State
    const [sortField, setSortField] = useState<SortField>('ownerName');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [allWallets, allMembers, allEvents] = await Promise.all([
            EntitlementService.getAllWalletItems(),
            DataService.getMembers(),
            DataService.getEvents()
        ]);

        // STRICT FILTER LOGIC:
        // 1. Must be TICKET
        // 2. Must be ACTIVE (Not USED, EXPIRED, or REVOKED)
        // 3. Must NOT be GIFT_PENDING (This means it's in the 'Sent Invites' bucket)
        // 4. Must NOT have a recipientEmail in metadata (Draft state)
        const unassigned = allWallets.filter(w => 
            w.type === 'TICKET' && 
            w.status === 'ACTIVE' && 
            w.isTransferable && 
            !w.meta?.recipientEmail && 
            !w.meta?.recipientName
        );

        // Grouping Logic
        const groups: Record<string, UnassignedGroupRow> = {};
        
        unassigned.forEach(ticket => {
            const ownerId = ticket.userId;
            const eventId = ticket.meta?.eventId || 'unknown';
            const groupKey = `${ownerId}_${eventId}`;
            
            if (!groups[groupKey]) {
                const owner = allMembers.find(m => m.id === ownerId);
                const event = allEvents.find(e => e.id === eventId);
                
                groups[groupKey] = {
                    groupId: groupKey,
                    ownerId,
                    ownerName: owner?.name || 'Unknown User',
                    ownerPhone: owner?.phone || '',
                    eventId,
                    eventName: event?.name || ticket.title || 'Unknown Event',
                    quantity: 0,
                    ticketIds: []
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
            showToast('No phone number for this user.', 'error');
            return;
        }

        const message = `Hi ${row.ownerName}, kami melihat Anda memiliki ${row.quantity} tiket "${row.eventName}" yang masih "Unassigned" (belum dipakai/dikirim). Mohon login ke aplikasi dan gunakan fitur "My Wallet" jika tiket ini untuk kerabat. Terima kasih!`;
        const link = WhatsAppService.generateLink(row.ownerPhone, message);
        window.open(link, '_blank');
        showToast('WhatsApp opened.', 'success');
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const processedRows = useMemo(() => {
        let result = [...rows];

        // 1. Filtering
        if (filterOwner) {
            result = result.filter(r => r.ownerName.toLowerCase().includes(filterOwner.toLowerCase()));
        }
        if (filterEvent) {
            result = result.filter(r => r.eventName.toLowerCase().includes(filterEvent.toLowerCase()));
        }

        // 2. Sorting
        result.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [rows, filterOwner, filterEvent, sortField, sortOrder]);

    // Render Sort Icon Helper
    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <div className="w-4 h-4" />; // Spacer
        return sortOrder === 'asc' ? <ArrowUp size={14} className="ml-1"/> : <ArrowDown size={14} className="ml-1"/>;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center">
                        <Ticket size={18} className="mr-2 text-amber-500"/> Unassigned Tickets (Empty)
                    </h3>
                    <p className="text-xs text-slate-500">Tickets purchased but currently holding no attendee data.</p>
                </div>
                <button onClick={loadData} className="p-2 text-slate-500 hover:bg-white rounded-lg transition-colors">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 text-sm">Scanning wallet database...</div>
                ) : rows.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">No unassigned tickets found. Good job!</div>
                ) : (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th 
                                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                    onClick={() => handleSort('ownerName')}
                                >
                                    <div className="flex items-center">Purchaser {renderSortIcon('ownerName')}</div>
                                </th>
                                <th 
                                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                    onClick={() => handleSort('eventName')}
                                >
                                    <div className="flex items-center">Event {renderSortIcon('eventName')}</div>
                                </th>
                                <th 
                                    className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none w-24"
                                    onClick={() => handleSort('quantity')}
                                >
                                    <div className="flex items-center justify-center">Qty {renderSortIcon('quantity')}</div>
                                </th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                            <tr className="bg-white border-b border-slate-200">
                                <th className="p-2">
                                    <div className="relative">
                                        <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="Filter Owner..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 font-normal"
                                            value={filterOwner}
                                            onChange={e => setFilterOwner(e.target.value)}
                                        />
                                    </div>
                                </th>
                                <th className="p-2">
                                    <div className="relative">
                                        <Filter size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="Filter Event..." 
                                            className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 font-normal"
                                            value={filterEvent}
                                            onChange={e => setFilterEvent(e.target.value)}
                                        />
                                    </div>
                                </th>
                                <th className="p-2"></th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedRows.map((row) => (
                                <tr key={row.groupId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 flex items-center">
                                            <User size={14} className="mr-2 text-slate-400"/>
                                            {row.ownerName}
                                        </div>
                                        <div className="text-xs text-slate-500 ml-6">{row.ownerPhone}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-800 font-medium">{row.eventName}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs">
                                            {row.quantity}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => handleRemind(row)}
                                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors"
                                        >
                                            <Send size={12} className="mr-1.5"/> Remind User
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
