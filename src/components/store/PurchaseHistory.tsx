
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
        try {
            const all = await DataService.getTransactions();
            const userOrders = all.filter(
                (t) =>
                    t.type === 'PO' &&
                    t.description.includes('Store Sale') &&
                    (t.description.includes(user?.fullName || '') || t.description.includes(user?.id || '')),
            );
            setOrders(userOrders);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
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
        <div className="flex min-h-[min(60vh,480px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm min-w-0 sm:min-h-0 sm:h-full">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <h3 className="flex shrink-0 items-center text-sm font-bold text-slate-800">
                    <ShoppingBag size={16} className="mr-2 shrink-0 text-indigo-600"/> My Orders
                </h3>
                <div className="relative min-w-0 w-full sm:max-w-xs">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden/>
                    <input 
                        type="search" 
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Search orders…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        aria-label="Search orders"
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
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
                    <div key={order.id} className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md min-w-0">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <span className="inline-block max-w-full break-all rounded bg-slate-100 px-1.5 font-mono text-xs text-slate-500">{order.id}</span>
                                <div className="mt-1 whitespace-nowrap text-xs text-slate-400">{new Date(order.date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-1 sm:items-end sm:text-right">
                                <div className="font-bold tabular-nums text-slate-900">{formatIDR(order.amount)}</div>
                                <div>{getStatusBadge(order.status)}</div>
                            </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-slate-700 break-words">
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
