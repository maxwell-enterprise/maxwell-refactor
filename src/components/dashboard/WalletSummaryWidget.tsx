
import React, { useMemo } from 'react';
import { WalletItem } from '../../types/access';
import { ViewState } from '../../types/index';
import { Wallet, Ticket, Zap, ChevronRight, AlertCircle, Share2, Clock } from 'lucide-react';

interface WalletSummaryWidgetProps {
    walletItems: WalletItem[];
    onNavigate: (view: ViewState) => void;
}

const WalletSummaryWidget: React.FC<WalletSummaryWidgetProps> = ({ walletItems, onNavigate }) => {
    
    const credits = useMemo(() => {
        return walletItems
            .filter(i => i.type === 'CREDIT_PASS' && i.status === 'ACTIVE')
            .reduce((acc, curr) => acc + (curr.meta?.credits || 0), 0);
    }, [walletItems]);

    const activeTickets = useMemo(() => {
        return walletItems.filter(i => i.type === 'TICKET' && i.status === 'ACTIVE').length;
    }, [walletItems]);

    const transferableTickets = useMemo(() => {
        return walletItems.filter(i => 
            i.type === 'TICKET' && 
            i.status === 'ACTIVE' && 
            i.isTransferable && 
            !i.meta?.recipientEmail // Not yet assigned/gifted (though status usually changes to GIFT_PENDING)
        );
    }, [walletItems]);

    // Check for expiring items (next 30 days)
    const expiringCount = useMemo(() => {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(now.getDate() + 30);
        
        return walletItems.filter(i => {
            if (i.status !== 'ACTIVE') return false;
            if (!i.expiryDate) return false;
            const exp = new Date(i.expiryDate);
            return exp > now && exp < nextMonth;
        }).length;
    }, [walletItems]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                        <Wallet size={24} className="text-blue-300" />
                    </div>
                    <button 
                        onClick={() => onNavigate(ViewState.WALLET)}
                        className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center"
                    >
                        OPEN WALLET <ChevronRight size={10} className="ml-1"/>
                    </button>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold">{credits}</h3>
                        <span className="text-sm font-medium text-slate-300">Flex Credits</span>
                    </div>
                </div>
            </div>

            {/* Actions & Alerts */}
            <div className="flex-1 p-6 space-y-4 bg-slate-50">
                
                {/* Transferable Alert */}
                {transferableTickets.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate(ViewState.WALLET)}>
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Share2 size={64} className="text-indigo-600"/>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-1 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                                <Zap size={12} className="fill-indigo-600"/> Distribution Needed
                            </div>
                            <p className="text-indigo-900 text-sm font-bold leading-tight mb-2">
                                You have {transferableTickets.length} tickets ready to share.
                            </p>
                            <span className="text-[10px] bg-white text-indigo-600 px-2 py-1 rounded border border-indigo-200 font-bold shadow-sm">
                                Share Now
                            </span>
                        </div>
                    </div>
                )}

                {/* Expiry Alert */}
                {expiringCount > 0 && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                        <Clock size={20} className="text-amber-600 shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-xs font-bold text-amber-800 uppercase mb-1">Expiring Soon</p>
                            <p className="text-xs text-amber-700">
                                {expiringCount} items in your wallet will expire within 30 days. Use them soon!
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <Ticket size={20} className="text-slate-400 mb-2"/>
                        <span className="text-xl font-bold text-slate-800">{activeTickets}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Active Tickets</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                        <AlertCircle size={20} className="text-slate-400 mb-2"/>
                        <span className="text-xl font-bold text-slate-800">0</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Issues</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletSummaryWidget;
