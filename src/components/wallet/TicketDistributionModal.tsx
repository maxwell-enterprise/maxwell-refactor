
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GiftAllocation, WalletItem } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import {
    X,
    Send,
    CheckCircle,
    Info,
    MessageSquare,
    Mail,
    RotateCcw,
    Loader2,
    List,
    UserPlus,
    Upload,
    FileSpreadsheet,
    Gift,
    Link as LinkIcon,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { getWorkspaceToken } from '../../lib/workspaceAuthToken';
import {
    downloadInvitationImportTemplate,
    parseInvitationExcelFile,
    type InvitationImportRow,
} from './invitationExcelImport';

interface TicketDistributionModalProps {
    donorId: string;
    donorName: string;
    selectedTickets: WalletItem[];
    initialTab?: 'ASSIGN' | 'GIFT_LINK' | 'HISTORY';
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

const hasAnyInvitationInput = (row: {
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
}): boolean =>
    !!row.recipientName.trim() ||
    !!row.recipientEmail.trim() ||
    hasMeaningfulPhoneNumber(row.recipientPhone);

const isValidEmail = (email: string): boolean => {
    const trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const buildClaimUrl = (claimToken: string) => {
    if (typeof window === 'undefined') return `/claim?token=${claimToken}`;
    return `${window.location.origin}/claim?token=${encodeURIComponent(claimToken)}`;
};

const buildGiftLinkWaMessage = (
    recipientName: string,
    ticketTitle: string,
    donorName: string,
    claimUrl: string,
) =>
    `Hi ${recipientName}! 👋\n\nI have a special ticket for you: *${ticketTitle}* from ${donorName}.\n\nPlease claim your ticket using this link:\n${claimUrl}\n\nCan't wait to see you there!`;

const resolveGiftRecipientName = (
    gift: GiftAllocation,
    wallet?: WalletItem | null,
): string => {
    const fromGift = gift.recipientName?.trim();
    if (fromGift) return fromGift;
    const fromWallet =
        typeof wallet?.meta?.recipientName === 'string' ? wallet.meta.recipientName.trim() : '';
    if (fromWallet) return fromWallet;
    const fromEmail = gift.targetEmail?.split('@')[0]?.trim();
    if (fromEmail) return fromEmail;
    return 'Guest';
};

const TicketDistributionModal: React.FC<TicketDistributionModalProps> = ({ 
    donorId, donorName, selectedTickets, initialTab = 'ASSIGN', onClose, onSuccess 
}) => {
    const { showToast } = useToast();
    const { confirm } = useDialog();
    const { refreshSession } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'ASSIGN' | 'GIFT_LINK' | 'HISTORY'>(initialTab);
    const [isGiftLinkSubmitting, setIsGiftLinkSubmitting] = useState(false);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, selectedTickets]);
    
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
        deliveryMethod?: GiftAllocation['deliveryMethod'];
        claimToken?: string;
    };

    const [rows, setRows] = useState<RowData[]>([]);

    const ensureSessionForTicketSend = async (): Promise<boolean> => {
        await refreshSession({ silent: true });
        if (getWorkspaceToken()) return true;
        showToast('Session expired or not ready. Please refresh the page and sign in again.', 'error');
        return false;
    };

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
                    const recipientName = resolveGiftRecipientName(gift, wallet);

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
                        deliveryMethod: gift.deliveryMethod,
                        claimToken: gift.claimToken,
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
        const targetTicketId = assignableRows[idx].ticketId;
        const mainIndex = next.findIndex(r => r.ticketId === targetTicketId);
        
        if (mainIndex >= 0) {
            const fieldKey = field as 'recipientName' | 'recipientEmail' | 'recipientPhone';
            next[mainIndex] = { ...next[mainIndex], [fieldKey]: value };
            setRows(next);
        }
    };

    const applyImportedRows = (imported: InvitationImportRow[]) => {
        const slots = rows.filter((r) => r.status === 'AVAILABLE');
        const fillCount = Math.min(imported.length, slots.length);
        const next = [...rows];

        for (let i = 0; i < fillCount; i += 1) {
            const ticketId = slots[i].ticketId;
            const mainIndex = next.findIndex((r) => r.ticketId === ticketId);
            if (mainIndex < 0) continue;

            next[mainIndex] = {
                ...next[mainIndex],
                recipientName: imported[i].name,
                recipientEmail: imported[i].email,
                recipientPhone: imported[i].phone,
            };
        }

        setRows(next);
        return { fillCount, slotCount: slots.length };
    };

    const handleDownloadTemplate = () => {
        downloadInvitationImportTemplate();
        showToast('Template Excel diunduh.', 'info');
    };

    const handleImportClick = () => {
        if (assignableRows.length === 0) {
            showToast('No tickets available to assign.', 'error');
            return;
        }
        fileInputRef.current?.click();
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (event.target) {
            event.target.value = '';
        }
        if (!file) return;

        if (assignableRows.length === 0) {
            showToast('No tickets available to assign.', 'error');
            return;
        }

        const approved = await confirm({
            title: 'Import from Excel?',
            message:
                'Recipient data on all available ticket rows will be overwritten with the Excel file contents. Continue?',
            variant: 'warning',
            confirmLabel: 'Yes, Import',
            cancelLabel: 'Cancel',
            icon: <Upload size={24} />,
        });
        if (!approved) return;

        setIsImporting(true);
        try {
            const { rows: imported, skippedEmpty, skippedInvalidEmail } =
                await parseInvitationExcelFile(file);

            if (imported.length === 0) {
                showToast(
                    'No valid rows to import. Make sure the name, email, and phone columns are filled correctly.',
                    'error',
                );
                return;
            }

            const { fillCount, slotCount } = applyImportedRows(imported);

            const warnings: string[] = [];
            if (imported.length > slotCount) {
                warnings.push(
                    `${imported.length - slotCount} Excel row(s) skipped (not enough tickets).`,
                );
            }
            if (skippedInvalidEmail > 0) {
                warnings.push(
                    `${skippedInvalidEmail} row(s) skipped due to invalid email.`,
                );
            }
            if (skippedEmpty > 0) {
                warnings.push(`${skippedEmpty} empty row(s) skipped.`);
            }

            if (warnings.length > 0) {
                showToast(
                    `${fillCount} row(s) filled. ${warnings.join(' ')}`,
                    'info',
                );
            } else {
                showToast(`${fillCount} row(s) imported from Excel.`, 'success');
            }
        } catch (e) {
            console.error('[TicketDistributionModal] import failed:', e);
            showToast(
                e instanceof Error
                    ? e.message
                    : 'Failed to read Excel file. Use .xlsx or .xls format.',
                'error',
            );
        } finally {
            setIsImporting(false);
        }
    };

    const handleSaveDistribution = async () => {
        setIsSubmitting(true);
        try {
            if (!(await ensureSessionForTicketSend())) return;

            const rowsToDistribute = assignableRows.filter((row) =>
                hasAnyInvitationInput(row),
            );

            if (rowsToDistribute.length === 0) {
                showToast('Fill in at least 1 invitation row before sending.', 'error');
                return;
            }

            const incompleteRow = rowsToDistribute.find((row) => {
                if (!row.recipientName.trim()) return true;
                if (!row.recipientEmail.trim() || !isValidEmail(row.recipientEmail)) return true;
                if (!hasMeaningfulPhoneNumber(row.recipientPhone)) return true;
                return false;
            });

            if (incompleteRow) {
                showToast(
                    'Recipient name, email, and WhatsApp are required for each filled invitation row.',
                    'error'
                );
                return;
            }

            await EntitlementService.distributeTickets(donorId, donorName, rowsToDistribute.map(r => ({
                name: r.recipientName,
                email: r.recipientEmail,
                phone: normalizePhone(r.recipientPhone), // Normalize here before sending
                ticketId: r.ticketId
            })));

            showToast(`Successfully sent ${rowsToDistribute.length} tickets!`, "success");
            
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
        const phone = normalizePhone(row.recipientPhone);
        let message: string;
        if (row.deliveryMethod === 'LINK' && row.claimToken) {
            const url = buildClaimUrl(row.claimToken);
            message = `Hi ${row.recipientName}! 👋\n\n${donorName} sent you ticket *${row.originalTicket.title}*.\n\nPlease claim your ticket using this link:\n${url}`;
        } else {
            message = `Hi ${row.recipientName}! 👋 ${donorName} sent you ticket *${row.originalTicket.title}*${row.recipientEmail ? ` to ${row.recipientEmail}` : ''}. Please check your email and claim it.`;
        }
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

    const handleSaveGiftLinks = async () => {
        const rowsToGift = assignableRows.filter((row) => hasAnyInvitationInput(row));

        if (rowsToGift.length === 0) {
            showToast('Fill in at least 1 row before Send & Generate.', 'error');
            return;
        }

        const incompleteRow = rowsToGift.find((row) => {
            if (!row.recipientName.trim()) return true;
            if (row.recipientEmail.trim() && !isValidEmail(row.recipientEmail)) return true;
            if (!hasMeaningfulPhoneNumber(row.recipientPhone)) return true;
            return false;
        });

        if (incompleteRow) {
            showToast(
                'Name and WhatsApp are required for each filled row. Email is optional.',
                'error',
            );
            return;
        }

        const isSingleRecipient = rowsToGift.length === 1;
        const preOpenedWaWindow = isSingleRecipient
            ? window.open('about:blank', '_blank', 'noopener,noreferrer')
            : null;

        setIsGiftLinkSubmitting(true);
        try {
            if (!(await ensureSessionForTicketSend())) {
                preOpenedWaWindow?.close();
                return;
            }

            const giftsToSend: Array<{ phone: string; message: string; name: string }> = [];
            const claimTokens = new Set<string>();

            for (const row of rowsToGift) {
                const gift = await EntitlementService.createTicketGiftLink({
                    walletItemId: row.ticketId,
                    recipientName: row.recipientName.trim(),
                    recipientPhone: normalizePhone(row.recipientPhone),
                    recipientEmail: row.recipientEmail.trim() || undefined,
                    giftMessage: `Ticket shared by ${donorName}`,
                });

                if (claimTokens.has(gift.claimToken)) {
                    throw new Error('Duplicate gift link detected. Please try again.');
                }
                claimTokens.add(gift.claimToken);

                const claimUrl = buildClaimUrl(gift.claimToken);
                giftsToSend.push({
                    phone: normalizePhone(row.recipientPhone),
                    name: row.recipientName.trim(),
                    message: buildGiftLinkWaMessage(
                        row.recipientName.trim(),
                        row.originalTicket.title,
                        donorName,
                        claimUrl,
                    ),
                });
            }

            const openWhatsAppLink = (phone: string, message: string) => {
                window.open(
                    WhatsAppService.generateLink(phone, message),
                    '_blank',
                    'noopener,noreferrer',
                );
            };

            if (isSingleRecipient && giftsToSend[0]) {
                const waUrl = WhatsAppService.generateLink(
                    giftsToSend[0].phone,
                    giftsToSend[0].message,
                );
                if (preOpenedWaWindow && !preOpenedWaWindow.closed) {
                    preOpenedWaWindow.location.href = waUrl;
                } else {
                    openWhatsAppLink(giftsToSend[0].phone, giftsToSend[0].message);
                }
            } else if (giftsToSend.length > 1) {
                const approved = await confirm({
                    title: 'Send via WhatsApp?',
                    message: `Open WhatsApp for ${giftsToSend.length} recipient(s)? Each recipient gets a unique link.`,
                    variant: 'info',
                    confirmLabel: 'Yes, Send',
                    cancelLabel: 'Later',
                    icon: <MessageSquare size={24} />,
                });
                if (approved) {
                    for (const item of giftsToSend) {
                        openWhatsAppLink(item.phone, item.message);
                    }
                }
            }

            await loadAllocations();
            onSuccess();
            setActiveTab('HISTORY');

            showToast(
                `${giftsToSend.length} WA gift link(s) created${giftsToSend.length > 1 ? ' (unique link per ticket)' : ''}.`,
                'success',
            );
        } catch (error) {
            preOpenedWaWindow?.close();
            showToast(
                error instanceof Error ? error.message : 'Failed to create WA gift link.',
                'error',
            );
        } finally {
            setIsGiftLinkSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay z-[110]">
            <div className="modal-panel modal-panel-lg">
                
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:items-center sm:px-8 sm:py-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 sm:text-2xl">Manage Invitations</h2>
                        <p className="text-xs text-slate-500 sm:text-sm">You have <b>{assignableRows.length}</b> tickets available to share.</p>
                    </div>
                    <button onClick={onClose} className="touch-target shrink-0 rounded-full bg-white p-2 text-slate-400 shadow-sm transition-all hover:text-slate-900 hover:shadow" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs + Excel import (Assign New only) */}
                <div className="mx-4 mt-3 flex shrink-0 flex-col gap-3 sm:mx-8 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="overflow-x-scroll-touch">
                        <div className="flex w-max min-w-full rounded-xl border border-slate-200 bg-slate-100 p-1">
                        <button 
                            onClick={() => setActiveTab('ASSIGN')}
                            className={`flex shrink-0 items-center whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition-all sm:px-4 sm:text-sm ${activeTab === 'ASSIGN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <UserPlus size={16} className="mr-1.5 sm:mr-2"/> Assign New
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{assignableRows.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('GIFT_LINK')}
                            className={`flex shrink-0 items-center whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition-all sm:px-4 sm:text-sm ${activeTab === 'GIFT_LINK' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Gift size={16} className="mr-1.5 sm:mr-2"/> WA Gift link
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{assignableRows.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('HISTORY')}
                            className={`flex shrink-0 items-center whitespace-nowrap px-3 py-2 text-xs font-bold rounded-lg transition-all sm:px-4 sm:text-sm ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List size={16} className="mr-1.5 sm:mr-2"/> Invited History
                            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{historyRows.length}</span>
                        </button>
                        </div>
                    </div>

                    {activeTab === 'ASSIGN' && (
                        <div className="flex shrink-0 items-center gap-1 self-end rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:self-auto">
                            <input
                                ref={fileInputRef}
                                type="file"
                                hidden
                                accept=".xlsx,.xls"
                                onChange={handleImportFile}
                            />
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                disabled={isImporting}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50"
                                title="Download Excel template"
                                aria-label="Download invitation import template"
                            >
                                <FileSpreadsheet size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={handleImportClick}
                                disabled={isImporting || assignableRows.length === 0}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50"
                                title="Import from Excel"
                                aria-label="Import invitations from Excel"
                            >
                                {isImporting ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Upload size={18} />
                                )}
                            </button>
                        </div>
                    )}
                </div>

                <div className="min-h-0 flex-1 overflow-auto bg-slate-50/50 p-4 sm:p-8">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-slate-400">
                            <Loader2 className="mr-2 animate-spin" /> Loading ticket data...
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="responsive-table-wrap">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center">#</th>
                                        <th className="px-6 py-4 w-1/4">Recipient Name</th>
                                        <th className="px-6 py-4 w-1/4">
                                            {activeTab === 'GIFT_LINK' ? 'Email (optional)' : 'Email'}
                                        </th>
                                        <th className="px-6 py-4 w-1/5">WhatsApp (Ex: +62812...)</th>
                                        {activeTab === 'HISTORY' && <th className="px-6 py-4 w-32 text-center">Status</th>}
                                        {activeTab === 'HISTORY' && <th className="px-6 py-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(activeTab === 'HISTORY' ? historyRows : assignableRows).map((row, idx) => {
                                        const isLocked = activeTab === 'HISTORY';
                                        const isGiftLinkTab = activeTab === 'GIFT_LINK';
                                        const rowHasInput = hasAnyInvitationInput(row);
                                        const nameInvalid = rowHasInput && !row.recipientName.trim();
                                        const emailInvalid = isGiftLinkTab
                                            ? rowHasInput &&
                                              !!row.recipientEmail.trim() &&
                                              !isValidEmail(row.recipientEmail)
                                            : rowHasInput &&
                                              (!row.recipientEmail.trim() || !isValidEmail(row.recipientEmail));
                                        const phoneInvalid =
                                            rowHasInput && !hasMeaningfulPhoneNumber(row.recipientPhone);
                                         
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
                                                        <span className="text-slate-500 font-mono text-xs">{row.recipientEmail || '-'}</span>
                                                    ) : (
                                                        <input 
                                                            type="email" placeholder={isGiftLinkTab ? 'Email (optional)' : 'Email *'} className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${emailInvalid ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}
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
                                                                        {row.recipientEmail && (
                                                                            <button onClick={() => handleRemindEmail(row)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Remind via Email">
                                                                                <Mail size={16}/>
                                                                            </button>
                                                                        )}
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
                                    {(activeTab === 'HISTORY' ? historyRows : assignableRows).length === 0 && (
                                        <tr>
                                            <td colSpan={activeTab === 'HISTORY' ? 6 : 4} className="p-8 text-center text-slate-400 text-sm">
                                                {activeTab === 'HISTORY'
                                                    ? 'No invitation history found.'
                                                    : activeTab === 'GIFT_LINK'
                                                      ? 'No tickets available for WA gift link.'
                                                      : 'No tickets available to assign.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'GIFT_LINK' && (
                    <div className="safe-area-bottom flex shrink-0 flex-col gap-4 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                        <div className="flex max-w-md items-start text-xs text-slate-500">
                            <Info size={14} className="mr-2 mt-0.5 shrink-0 text-indigo-500"/>
                            One unique claim link per row. After generation, WhatsApp will open automatically. Email is optional.
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-4">
                            <button onClick={onClose} className="min-h-11 rounded-xl px-6 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:min-h-0">
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveGiftLinks()}
                                disabled={isGiftLinkSubmitting || assignableRows.length === 0}
                                className="flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-50 sm:min-h-0 sm:px-8"
                            >
                                {isGiftLinkSubmitting ? (
                                    <Loader2 className="animate-spin mr-2" />
                                ) : (
                                    <LinkIcon size={16} className="mr-2" />
                                )}
                                Send & Generate
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'ASSIGN' && (
                    <div className="safe-area-bottom flex shrink-0 flex-col gap-4 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
                        <div className="flex items-start text-xs text-slate-500">
                            <Info size={14} className="mr-2 mt-0.5 shrink-0 text-indigo-500"/>
                            We will send instructions via Email & WhatsApp.
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-4">
                            <button onClick={onClose} className="min-h-11 rounded-xl px-6 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:min-h-0">
                                Close
                            </button>
                            <button 
                                onClick={handleSaveDistribution}
                                disabled={isSubmitting || assignableRows.length === 0}
                                className="flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 disabled:opacity-50 sm:min-h-0 sm:px-8"
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
