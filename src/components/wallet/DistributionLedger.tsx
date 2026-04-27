
import React, { useState, useEffect } from 'react';
import { GiftAllocation, WalletItem } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { Trash2, Edit2, CheckCircle, Clock, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DistributionLedgerProps {
    userId: string;
}

const DistributionLedger: React.FC<DistributionLedgerProps> = ({ userId }) => {
    const { showToast } = useToast();
    const [gifts, setGifts] = useState<GiftAllocation[]>([]);
    const [tickets, setTickets] = useState<Record<string, WalletItem>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        const [allGifts, allWallets] = await Promise.all([
            EntitlementService.getSentGifts(),
            EntitlementService.getAllWalletItems()
        ]);
        setGifts(allGifts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // Map tickets for easy status lookup
        const tMap: Record<string, WalletItem> = {};
        allWallets.forEach(w => tMap[w.id] = w);
        setTickets(tMap);
        
        setLoading(false);
    };

    const handleRevoke = async (gift: GiftAllocation) => {
        if (!confirm(`Are you sure you want to pull back this ticket from ${gift.targetEmail}?`)) return;
        
        try {
            await EntitlementService.revokeTicketGift(userId, gift.id);
            showToast("Ticket revoked and returned to your wallet.", "success");
            loadData();
        } catch (e: any) {
            showToast(e.message, "error");
        }
    };

    if (loading) return <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2"><RefreshCw className="animate-spin" size={20}/> Synchronizing distribution records...</div>;

    if (gifts.length === 0) return (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <AlertCircle size={40} className="mx-auto text-slate-300 mb-2"/>
            <p className="text-slate-500 font-medium">No tickets distributed yet.</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Buy multiple tickets to invite others</p>
        </div>
    );

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Recipient Info</th>
                            <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Ticket</th>
                            <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Status</th>
                            <th className="px-6 py-4 uppercase text-[10px] tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {gifts.map(gift => {
                            const ticket = tickets[gift.entitlementId];
                            // Logic: If ticket userId has changed or status is CLAIMED/ACTIVE, it's claimed
                            const isClaimed = ticket ? (ticket.status !== 'PENDING_CLAIM' && ticket.userId !== userId) : gift.status === 'CLAIMED';
                            
                            return (
                                <tr key={gift.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{ticket?.meta?.recipientName || 'Member'}</div>
                                        <div className="text-xs text-slate-400 font-mono">{gift.targetEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-700">{gift.itemName}</div>
                                        <div className="text-[10px] text-slate-400">Sent: {new Date(gift.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isClaimed ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200">
                                                <CheckCircle size={10} className="mr-1"/> CLAIMED
                                            </span>
                                        ) : gift.status === 'REVOKED' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                                                <RotateCcw size={10} className="mr-1"/> REVOKED
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 animate-pulse">
                                                <Clock size={10} className="mr-1"/> PENDING
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {!isClaimed && gift.status === 'PENDING' && (
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleRevoke(gift)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Revoke Ticket"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Edit Recipient"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                        {isClaimed && (
                                            <span className="text-[10px] text-slate-300 italic">No actions available</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DistributionLedger;
