
import React, { useState, useEffect } from 'react';
import { WalletTransactionHistory } from '../../types/access';
import { EntitlementService } from '../../services/entitlementService';
import { History, ArrowUpRight, ArrowDownLeft, Gift, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const WalletHistory: React.FC = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState<WalletTransactionHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user]);

    const loadHistory = async () => {
        setLoading(true);
        if (user) {
            const data = await EntitlementService.getHistory(user.id);
            setHistory(data);
        }
        setLoading(false);
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'PURCHASE': return <ArrowDownLeft size={16} className="text-green-600"/>;
            case 'REDEMPTION': return <ArrowUpRight size={16} className="text-blue-600"/>;
            case 'USAGE': return <ArrowUpRight size={16} className="text-indigo-600"/>;
            case 'TRANSFER_OUT': return <Gift size={16} className="text-purple-600"/>;
            case 'TRANSFER_IN': return <Gift size={16} className="text-green-600"/>;
            case 'EXPIRY': return <Clock size={16} className="text-slate-400"/>;
            default: return <AlertCircle size={16} className="text-amber-600"/>;
        }
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'PURCHASE': return 'bg-green-50 border-green-100';
            case 'REDEMPTION': return 'bg-blue-50 border-blue-100';
            case 'USAGE': return 'bg-indigo-50 border-indigo-100';
            case 'TRANSFER_OUT': return 'bg-purple-50 border-purple-100';
            case 'TRANSFER_IN': return 'bg-green-50 border-green-100';
            case 'EXPIRY': return 'bg-slate-50 border-slate-100 opacity-60';
            default: return 'bg-amber-50 border-amber-100';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400 text-xs">Loading history...</div>;

    if (history.length === 0) return (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <History size={32} className="mx-auto mb-2 text-slate-300"/>
            <p className="text-sm text-slate-500 font-medium">No activity recorded yet.</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {history.map(item => (
                <div key={item.id} className={`p-3 rounded-lg border flex items-center justify-between ${getTypeColor(item.transactionType)}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                            {getIcon(item.transactionType)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800">{item.referenceName || item.transactionType}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{new Date(item.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div className={`text-sm font-mono font-bold ${item.amountChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.amountChange > 0 ? '+' : ''}{item.amountChange}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WalletHistory;