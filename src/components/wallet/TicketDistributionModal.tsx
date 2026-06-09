
import React, { useState, useEffect, useMemo } from 'react';
import { WalletItem, GiftAllocation } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Send, Trash2, CheckCircle, Info, MessageSquare, Mail, RotateCcw, User, Loader2, List, UserPlus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';

interface TicketDistributionModalProps {
    donorId: string;
    donorName: string;
    selectedTickets: WalletItem[];
    onClose: () => void;
    onSuccess: () => void;
}

const DEFAULT_WHATSAPP_PREFIX = '+62';

// Helper to normalize phone to ID format (62) if starts with 08
const normalizePhone = (phone: string): string => {
    let clean = phone.replace(/\D/g, ''); // Remove non-digits
    if (clean.startsWith('08')) {
        return '62' + clean.slice(1);
    }
    return clean; // Assume user typed correct country code otherwise (e.g. 628..., 31...)
};

const getInitialWhatsappValue = (phone: string): string => {
    return phone.trim() ? phone : DEFAULT_WHATSAPP_PREFIX;
};

const hasMeaningfulPhoneNumber = (phone: string): boolean => {
    const normalized = normalizePhone(phone);
    return normalized.length > 2;
};

const isValidEmail = (email: string): boolean => {
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const TicketDistributionModal: React.FC<TicketDistributionModalProps> = ({ 
    donorId, donorName, selectedTickets, onClose, onSuccess 
}) => {
    const { showToast } = useToast();
    const { confirm } = useDialog();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'ASSIGN' | 'HISTORY'>('ASSIGN');
    
    // Unified Row Data Structure
    type RowData = {
        ticketId: string;
        allocationId?: string; // If already gifted
        status: 'AVAILABLE' | 'PENDING' | 'CLAIMED' | 'REVOKED';
        recipientName: string;
        recipientEmail: string;
        recipientPhone: string;
        originalTicket: WalletItem;
        sentAt?: string;
    };

    const [rows, setRows] = useState<RowData[]>([]);

    useEffect(() => {
        loadAllocations();
    }, [selectedTickets]);

    const loadAllocations = async () => {
        setLoading(true);
        try {
            // Get existing gifts to populate rows
            const [allGifts, allWalletItems] = await Promise.all([
                EntitlementService.getSentGifts(),
                EntitlementService.getAllWalletItems(),
            ]);
            const walletMap = new Map(allWalletItems.map((item) => [item.id, item]));
            const selectedMap = new Map(selectedTickets.map((ticket) => [ticket.id, ticket]));

            const assignRows: RowData[] = selectedTickets
                .filter((ticket) => !allGifts.some((gift) => gift.entitlementId === ticket.id && gift.status === 'PENDING'))
                .map((ticket) => ({
                    ticketId: ticket.id,
                    status: 'AVAILABLE',
                    recipientName: typeof ticket.meta?.recipientName === 'string' ? ticket.meta.recipientName : '',
                    recipientEmail: typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail : '',
                    recipientPhone: getInitialWhatsappValue(
                        typeof ticket.meta?.recipientPhone === 'string' ? ticket.meta.recipientPhone : ''
                    ),
                    originalTicket: ticket,
                }));

            const historyRows: RowData[] = allGifts
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((gift) => {
                    const wallet = walletMap.get(gift.entitlementId) || selectedMap.get(gift.entitlementId);
                    const recipientName =
                        typeof wallet?.meta?.recipientName === 'string' && wallet.meta.recipientName.trim()
                            ? wallet.meta.recipientName.trim()
                            : gift.targetEmail?.split('@')[0] || 'Guest';

                    const fallbackTicket: WalletItem = wallet || {
                        id: gift.entitlementId,
                        userId: donorId,
                        type: 'TICKET',
                        title: gift.itemName,
                        subtitle: '',
                        status: gift.status === 'PENDING' ? 'PENDING_CLAIM' : 'ACTIVE',
                        isTransferable: true,
                        meta: {},
                    };

                    return {
                        ticketId: gift.entitlementId,
                        allocationId: gift.id,
                        status: gift.status,
                        recipientName,
                        recipientEmail: gift.targetEmail || '',
                        recipientPhone: gift.recipientPhone || '',
                        originalTicket: fallbackTicket,
                        sentAt: gift.createdAt,
                    };
                });

            setRows([...assignRows, ...historyRows]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateRow = (idx: number, field: string, value: string) => {
        const next = [...rows];
        // We only allow editing rows that are in the filtered view, but state holds ALL rows.
        // We need to find the correct index in the main 'rows' array corresponding to the view.
        // Simplified: The UI maps directly if we pass the correct object reference, but here we use index of filtered.
        // Safer approach: update by ticketId
        const targetTicketId = assignableRows[idx].ticketId;
        const mainIndex = rows.findIndex(r => r.ticketId === targetTicketId);
        
        if (mainIndex >= 0) {
            (next[mainIndex] as any)[field] = value;
            setRows(next);
        }
    };

    const handleSaveDistribution = async () => {
        setIsSubmitting(true);
        try {
            const incompleteRow = assignableRows.find((row) => {
                if (!row.recipientName.trim()) return true;
                if (!row.recipientEmail.trim() || !isValidEmail(row.recipientEmail)) return true;
                if (!hasMeaningfulPhoneNumber(row.recipientPhone)) return true;
                return false;
            });

            if (incompleteRow) {
                showToast(
                    'Recipient name, email, and WhatsApp are required for every invitation before sending.',
                    'error'
                );
                return;
            }

            const toDistribute = rows.filter((r) => r.status === 'AVAILABLE');

            if (toDistribute.length === 0) {
                onSuccess(); // Triggers reload in parent
                return;
            }

            await EntitlementService.distributeTickets(donorId, donorName, toDistribute.map(r => ({
                name: r.recipientName,
                email: r.recipientEmail,
                phone: normalizePhone(r.recipientPhone), // Normalize here before sending
                ticketId: r.ticketId
            })));

            showToast(`Successfully sent ${toDistribute.length} tickets!`, "success");
            
            // Reload local data to move items to History tab
            await loadAllocations(); 
            setActiveTab('HISTORY');
        } catch (e) {
            showToast("Distribution failed.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async (allocationId: string) => {
        const approved = await confirm({
            title: 'Revoke ticket invitation?',
            message: 'This will cancel the delivery and return the ticket to your available pool.',
            variant: 'warning',
            confirmLabel: 'Yes, Revoke',
            cancelLabel: 'No',
            confirmIcon: <CheckCircle size={16} />,
            cancelIcon: <X size={16} />,
            icon: <RotateCcw size={24} />,
        });
        if (!approved) return;
        
        try {
            await EntitlementService.revokeTicketGift(donorId, allocationId);
            showToast("Ticket revoked.", "success");
            await loadAllocations(); // Refresh to move back to Assign tab
        } catch (e) {
            showToast("Revoke failed.", "error");
        }
    };

    const handleRemindWA = (row: RowData) => {
        const message = `Hi ${row.recipientName}! 👋 ${donorName} sent you ticket *${row.originalTicket.title}* to ${row.recipientEmail}. Please check your email and claim it.`;
        // Ensure phone is normalized (in case it wasn't during save or legacy data)
        const phone = normalizePhone(row.recipientPhone);
        const url = WhatsAppService.generateLink(phone, message);
        window.open(url, '_blank');
    };

    const handleRemindEmail = (row: RowData) => {
        const subject = `Ticket Reminder: ${row.originalTicket.title}`;
        const body = `Hi ${row.recipientName}, just a reminder to accept your ticket.`;
        window.open(`mailto:${row.recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    // Derived Lists for Tabs
    const assignableRows = useMemo(() => rows.filter(r => r.status === 'AVAILABLE'), [rows]);
    const historyRows = useMemo(() => rows.filter(r => r.status !== 'AVAILABLE'), [rows]);

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Manage Invitations</h2>
                        <p className="text-sm text-slate-500">You have <b>{assignableRows.length}</b> tickets available to share.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-900 rounded-full shadow-sm hover:shadow transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 mx-8 mt-4 rounded-xl border border-slate-200 w-fit">
                    <button 
                        onClick={() => setActiveTab('ASSIGN')}
                        className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'ASSIGN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <UserPlus size={16} className="mr-2"/> Assign New
                        <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{assignableRows.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List size={16} className="mr-2"/> Invited History
                        <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{historyRows.length}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50/50 p-8">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin mr-2" /> Loading ticket data...
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">#</th>
                                        <th className="px-6 py-4 w-1/4">Recipient Name</th>
                                        <th className="px-6 py-4 w-1/4">Email</th>
                                        <th className="px-6 py-4 w-1/5">WhatsApp (Ex: +62812...)</th>
                                        {activeTab === 'HISTORY' && <th className="px-6 py-4 w-32 text-center">Status</th>}
                                        {activeTab === 'HISTORY' && <th className="px-6 py-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(activeTab === 'ASSIGN' ? assignableRows : historyRows).map((row, idx) => {
                                        const isLocked = activeTab === 'HISTORY';
                                        const nameInvalid = !row.recipientName.trim();
                                        const emailInvalid = !row.recipientEmail.trim() || !isValidEmail(row.recipientEmail);
                                        const phoneInvalid = !hasMeaningfulPhoneNumber(row.recipientPhone);
                                         
                                        return (
                                            <tr key={row.allocationId || row.ticketId} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                                                    {idx + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isLocked ? (
                                                        <span className="font-bold text-slate-700">{row.recipientName}</span>
                                                    ) : (
                                                        <input 
                                                            type="text" placeholder="Name *" className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${nameInvalid ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
                                                            value={row.recipientName}
                                                            onChange={(e) => updateRow(idx, 'recipientName', e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isLocked ? (
                                                        <span className="text-slate-500 font-mono text-xs">{row.recipientEmail}</span>
                                                    ) : (
                                                        <input 
                                                            type="email" placeholder="Email *" className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${emailInvalid ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
                                                            value={row.recipientEmail}
                                                            onChange={(e) => updateRow(idx, 'recipientEmail', e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                         {isLocked ? (
                                                        <span className="text-slate-500 text-xs font-mono">{row.recipientPhone || '-'}</span>
                                                    ) : (
                                                        <input 
                                                            type="tel" placeholder="WhatsApp *" className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${phoneInvalid ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
                                                            value={row.recipientPhone}
                                                            onChange={(e) => updateRow(idx, 'recipientPhone', e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                                {activeTab === 'HISTORY' && (
                                                    <>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                                row.status === 'CLAIMED' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                row.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {row.status === 'PENDING' && (
                                                                    <>
                                                                        <button onClick={() => handleRemindWA(row)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100" title="Remind via WA">
                                                                            <MessageSquare size={16}/>
                                                                        </button>
                                                                        <button onClick={() => handleRemindEmail(row)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Remind via Email">
                                                                            <Mail size={16}/>
                                                                        </button>
                                                                        <button onClick={() => handleRevoke(row.allocationId!)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Revoke Ticket">
                                                                            <RotateCcw size={16}/>
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {row.status === 'CLAIMED' && (
                                                                    <div className="flex items-center text-xs text-green-600 font-medium">
                                                                        <CheckCircle size={14} className="mr-1"/> Accepted
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {(activeTab === 'ASSIGN' ? assignableRows : historyRows).length === 0 && (
                                        <tr>
                                            <td colSpan={activeTab === 'ASSIGN' ? 4 : 6} className="p-8 text-center text-slate-400 text-sm">
                                                {activeTab === 'ASSIGN' ? 'No tickets available to assign.' : 'No invitation history found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {activeTab === 'ASSIGN' && (
                    <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between items-center">
                        <div className="text-xs text-slate-500 flex items-center">
                            <Info size={14} className="mr-2 text-indigo-500"/>
                            We will send instructions via Email & WhatsApp.
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                Close
                            </button>
                            <button 
                                onClick={handleSaveDistribution}
                                disabled={isSubmitting || assignableRows.length === 0}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send size={16} className="mr-2"/>}
                                Send Invitations
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketDistributionModal;
