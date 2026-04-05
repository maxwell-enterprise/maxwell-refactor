
import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types/index';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import type { LucideIcon } from 'lucide-react';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle, Search, UserCircle } from 'lucide-react';
import { EmptyStatePlaceholder } from './EmptyStatePlaceholder';

const PurchaseHistory: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            void loadOrders();
        } else {
            setOrders([]);
            setLoading(false);
        }
    }, [user]);

    const loadOrders = async () => {
        setLoading(true);
        // Fetch all transactions (optimized in real backend to only fetch user's)
        const all = await DataService.getTransactions();
        
        // Filter by user context logic:
        // Since transaction table uses 'payee' name in description or we assume we query by user context in real SQL,
        // here we filter by matching name for the Mock.
        const userOrders = all.filter(t => 
            t.type === 'PO' && 
            t.description.includes('Store Sale') && 
            (t.description.includes(user?.fullName || '') || t.description.includes(user?.id || ''))
        );
        
        setOrders(userOrders);
        setLoading(false);
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Paid': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center"><CheckCircle size={10} className="mr-1"/> PAID</span>;
            case 'Pending': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center"><Clock size={10} className="mr-1"/> PENDING</span>;
            default: return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center"><AlertTriangle size={10} className="mr-1"/> {status.toUpperCase()}</span>;
        }
    };

    const filtered = orders.filter(o => o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const emptyState: { icon: LucideIcon; message: string } | null =
        !user
            ? { icon: UserCircle, message: 'Sign in to view your orders.' }
            : loading
              ? null
              : filtered.length === 0
                ? orders.length === 0
                    ? { icon: ShoppingBag, message: 'No orders yet.' }
                    : { icon: Search, message: 'No orders match your search.' }
                : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center text-sm">
                    <ShoppingBag size={16} className="mr-2 text-indigo-600"/> My Orders
                </h3>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white"
                        placeholder="Search order..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex min-h-[120px] items-center justify-center py-12 text-center text-sm text-slate-400">
                        Loading orders…
                    </div>
                ) : emptyState ? (
                    <EmptyStatePlaceholder
                        icon={emptyState.icon}
                        message={emptyState.message}
                        minHeightClass="min-h-[120px]"
                    />
                ) : (
                 filtered.map(order => (
                    <div key={order.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 rounded">{order.id}</span>
                                <div className="text-xs text-slate-400 mt-1">{new Date(order.date).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-900">{formatIDR(order.amount)}</div>
                                <div className="mt-1">{getStatusBadge(order.status)}</div>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-700 line-clamp-2">
                            {order.description.replace(/Store Sale:.*? - /, '')}
                        </p>
                    </div>
                ))
                )}
            </div>
        </div>
    );
};

export default PurchaseHistory;
