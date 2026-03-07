
import React, { useState, useEffect } from 'react';
import { GiftAllocation, WalletItem } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Gift, Search, RefreshCw, RotateCcw, CheckCircle, Clock, Trash2, Edit2, AlertCircle, Info, MessageSquare, ExternalLink, Loader2, User, Mail } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface GiftManagementModalProps {
    userId: string;
    userName: string;
    onClose: () => void;
}

const GiftManagementModal: React.FC<GiftManagementModalProps> = ({ userId, userName, onClose }) => {
    const { showToast } = useToast();
    const [gifts, setGifts] = useState<GiftAllocation[]>([]);
    const [tickets, setTickets] = useState<Record<string, WalletItem>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allGifts, allWallets] = await Promise.all([
                EntitlementService.getAllGifts(),
                EntitlementService.getAllWalletItems()
            ]);
            
            const myGifts = allGifts.filter(g => g.sourceUserId === userId);
            setGifts(myGifts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

            const tMap: Record<string, WalletItem> = {};
            allWallets.forEach(w => tMap[w.id] = w);
            setTickets(tMap);
        } catch (e) {
            showToast("Failed to load records.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (gift: GiftAllocation) => {
        if (!confirm(`Are you sure you want to revoke this ticket from ${gift.targetEmail}? It will return to your wallet as ACTIVE.`)) return;
        
        try {
            await EntitlementService.revokeTicketGift(userId, gift.id);
            showToast("Ticket revoked successfully.", "success");
            loadData();
        } catch (e: any) {
            showToast(e.message || "Failed to revoke.", "error");
        }
    };

    const generateWALink = (gift: GiftAllocation) => {
        const ticket = tickets[gift.entitlementId];
        const message = `Halo! 👋 Saya (${userName}) ingin mengingatkan bahwa ada tiket *${gift.itemName}* di Wallet Anda.\n\nLogin ke Portal Maxwell (${window.location.origin}) dengan email: ${gift.targetEmail}\nOTP: 12345`;
        return WhatsAppService.generateLink("", message);
    };

    const filteredGifts = gifts.filter(g => 
        g.targetEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                            <Gift size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Gift Distribution Hub</h2>
                            <p className="text-sm text-slate-500">Monitor and manage tickets you've shared with partners.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search recipient or ticket..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 size={40} className="animate-spin text-indigo-600" />
                            <p className="font-medium">Fetching distribution ledger...</p>
                        </div>
                    ) : filteredGifts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
                            <div className="p-6 bg-slate-50 rounded-full border-2 border-dashed border-slate-200 text-slate-300">
                                <Gift size={64} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">No History Found</h3>
                                <p className="text-sm text-slate-500">Distributed tickets will appear here for you to manage.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-5 text-xs uppercase tracking-widest">Recipient</th>
                                        <th className="px-6 py-5 text-xs uppercase tracking-widest">Ticket Information</th>
                                        <th className="px-6 py-5 text-xs uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-5 text-xs uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredGifts.map(gift => {
                                        const ticket = tickets[gift.entitlementId];
                                        const isClaimed = ticket ? (ticket.status !== 'PENDING_CLAIM' && ticket.userId !== userId) : gift.status === 'CLAIMED';
                                        const isRevoked = gift.status === 'REVOKED';

                                        return (
                                            <tr key={gift.id} className={`hover:bg-slate-50/50 transition-colors ${isRevoked ? 'opacity-60 grayscale' : ''}`}>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isClaimed ? 'bg-green-500 shadow-lg shadow-green-100' : 'bg-slate-300'}`}>
                                                            <User size={18}/>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{ticket?.meta?.recipientName || 'Member'}</div>
                                                            <div className="text-xs text-slate-500 font-mono">{gift.targetEmail}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-sm text-slate-800">{gift.itemName}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-400">Sent: {new Date(gift.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        {isClaimed ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black border border-green-200">
                                                                <CheckCircle size={12} className="mr-1.5"/> CLAIMED
                                                            </span>
                                                        ) : isRevoked ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200">
                                                                <RotateCcw size={12} className="mr-1.5"/> REVOKED
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black border border-amber-200 animate-pulse">
                                                                <Clock size={12} className="mr-1.5"/> PENDING CLAIM
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {!isClaimed && !isRevoked && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleRevoke(gift)}
                                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200"
                                                                    title="Revoke Access"
                                                                >
                                                                    <RotateCcw size={18} />
                                                                </button>
                                                                <a 
                                                                    href={generateWALink(gift)}
                                                                    target="_blank"
                                                                    className="p-2.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all shadow-sm bg-white border border-slate-200"
                                                                    title="Reminder via WA"
                                                                >
                                                                    <MessageSquare size={18} />
                                                                </a>
                                                            </>
                                                        )}
                                                        {isClaimed && (
                                                            <span className="text-[10px] text-slate-400 italic">Fully Managed</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                    <Info size={18} className="text-indigo-600 shrink-0"/>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                        <b>Policy:</b> Tickets can only be revoked if the recipient has not yet "Claimed" the gift in their own wallet. Once claimed, ownership is legally and technically transferred to the recipient.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GiftManagementModal;
