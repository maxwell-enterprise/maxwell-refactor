
import React, { useState, useEffect } from 'react';
import { EventInvitation, Member, Event } from '../../types/index';
import { DataService } from '../../services/dataService';
import { InvitationService } from '../../services/invitationService';
import { EntitlementService } from '../../services/entitlementService'; // Import Entitlement for Gifts
import { WhatsAppService } from '../../services/whatsappService';
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Send, User, Calendar, Gift } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// Unified Row for UI
interface UnifiedInviteRow {
    id: string; // Invite ID or GiftAllocation ID
    type: 'ADMIN_INVITE' | 'USER_GIFT';
    eventName: string;
    eventDate: string;
    eventStatus: 'PAST' | 'UPCOMING';
    
    senderName: string;
    senderId: string;
    
    recipientName: string; // Might be "Unknown" if only email is known
    recipientEmail: string;
    recipientPhone: string;
    recipientLastLogin?: string;
    
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLAIMED' | 'EXPIRED';
    sentAt: string;
}

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
            EntitlementService.getAllWalletItems() // To resolve Event ID for Gifts
        ]);

        const today = new Date().toISOString().split('T')[0];

        // 1. Process Admin Invitations
        const adminRows: UnifiedInviteRow[] = invitations.map(inv => {
            const sender = members.find(m => m.id === inv.sentBy) || { name: 'Admin', phone: '' };
            const recipient = members.find(m => m.id === inv.memberId);
            const event = events.find(e => e.id === inv.eventId);
            
            return {
                id: inv.id,
                type: 'ADMIN_INVITE',
                eventName: inv.eventName,
                eventDate: event?.date || '',
                eventStatus: (event?.date || '') < today ? 'PAST' : 'UPCOMING',
                senderName: sender.name,
                senderId: inv.sentBy,
                recipientName: inv.memberName || recipient?.name || 'Unknown',
                recipientEmail: recipient?.email || 'N/A', // Invite object might not have email directly
                recipientPhone: recipient?.phone || '',
                recipientLastLogin: recipient?.engagement?.lastActiveDate,
                status: inv.status,
                sentAt: inv.sentAt
            };
        });

        // 2. Process User Gifts (Peer-to-Peer)
        // Filter out Revoked
        const validGifts = gifts.filter(g => g.status !== 'REVOKED');
        
        const giftRows: UnifiedInviteRow[] = validGifts.map(gift => {
            // Sender
            const sender = members.find(m => m.id === gift.sourceUserId);
            
            // Recipient (Try to resolve if they are a member)
            const recipient = members.find(m => m.email.toLowerCase() === gift.targetEmail?.toLowerCase() || m.id === gift.claimedByUserId);
            
            // Resolve Event via Wallet Item
            const ticket = wallets.find(w => w.id === gift.entitlementId);
            const eventId = ticket?.meta?.eventId;
            const event = events.find(e => e.id === eventId);

            return {
                id: gift.id,
                type: 'USER_GIFT',
                eventName: gift.itemName, // Fallback to item name if event not found
                eventDate: event?.date || '',
                eventStatus: (event?.date || '') < today ? 'PAST' : 'UPCOMING',
                senderName: sender?.name || gift.sourceUserName || 'Unknown User',
                senderId: gift.sourceUserId,
                recipientName: recipient?.name || 'Guest (By Email)',
                recipientEmail: gift.targetEmail || '',
                recipientPhone: recipient?.phone || '', // Need phone for WA
                recipientLastLogin: recipient?.engagement?.lastActiveDate,
                status: gift.status === 'CLAIMED' ? 'ACCEPTED' : 'PENDING',
                sentAt: gift.createdAt
            };
        });

        // 3. Merge & Sort
        const allRows = [...adminRows, ...giftRows].sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        
        setRows(allRows);
        setLoading(false);
    };

    const handleRemind = (row: UnifiedInviteRow) => {
        if (!row.recipientPhone && !row.recipientEmail) {
            showToast("No contact info (phone/email) available.", "error");
            return;
        }

        // Days left calculation
        const daysLeft = row.eventDate ? Math.ceil((new Date(row.eventDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : '?';
        
        let message = '';
        const actionType = row.status === 'ACCEPTED' ? 'claimed' : 'received';
        
        if (row.type === 'ADMIN_INVITE') {
             message = `Hi ${row.recipientName}, reminder from Maxwell Leadership regarding your invitation to ${row.eventName}. Event is ${daysLeft} days away. Please check your app.`;
        } else {
             message = `Hi ${row.recipientName}, ${row.senderName} has sent you a ticket for ${row.eventName}! Event is in ${daysLeft} days. Please login to claim it if you haven't yet.`;
        }
        
        if (row.recipientPhone) {
            const link = WhatsAppService.generateLink(row.recipientPhone, message);
            window.open(link, '_blank');
        } else {
            showToast(`Phone missing. Send email to: ${row.recipientEmail}`, 'info');
            // In real app, trigger email service here
        }
    };

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
                                        <div className="text-[10px] text-slate-500">{row.recipientEmail}</div>
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
                                        <div className="flex items-center text-xs text-slate-500 mt-1">
                                            <Calendar size={10} className="mr-1"/> {row.eventDate || 'Date TBD'}
                                            {row.eventStatus === 'PAST' && <span className="ml-2 bg-slate-200 text-slate-600 px-1 rounded text-[9px] font-bold">PAST</span>}
                                        </div>
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
                                        {row.eventStatus === 'UPCOMING' && (
                                            <button 
                                                onClick={() => handleRemind(row)}
                                                className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors shadow-sm"
                                            >
                                                <Send size={12} className="mr-1.5"/> Reminder
                                            </button>
                                        )}
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
