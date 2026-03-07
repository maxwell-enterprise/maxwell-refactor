
import React, { useState, useEffect } from 'react';
import { FinanceService } from '../../services/financeService';
import { PaymentTransaction } from '../../types/index';
import { AlertTriangle, CheckCircle, RefreshCcw, ArrowRight, DollarSign } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const RefundManager: React.FC = () => {
    const { showToast } = useToast();
    const [exceptions, setExceptions] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await FinanceService.getExceptions();
        setExceptions(data);
        setLoading(false);
    };

    const handleRefund = async (tx: PaymentTransaction) => {
        const overage = tx.paidAmount - tx.totalAmount;
        if (overage <= 0) return;

        if (confirm(`Process refund of ${formatIDR(overage)} to ${tx.customerEmail}?`)) {
            await FinanceService.processRefund(tx.id, overage, 'Overpayment Return');
            showToast('Refund processed successfully', 'success');
            loadData();
        }
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white text-rose-600 rounded-lg shadow-sm">
                        <AlertTriangle size={20}/>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Financial Exceptions</h3>
                        <p className="text-xs text-rose-700 font-medium">Overpayments needing refund & disputes.</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading exceptions...</div>
                ) : exceptions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle size={48} className="text-green-200 mb-3"/>
                        <p className="text-sm font-bold text-slate-600">No discrepancies found.</p>
                        <p className="text-xs">All transactions are balanced.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">Transaction Ref</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4 text-right">Bill Amount</th>
                                <th className="p-4 text-right">Paid Amount</th>
                                <th className="p-4 text-right">Diff</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {exceptions.map(tx => {
                                const diff = tx.paidAmount - tx.totalAmount;
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-xs">{tx.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{tx.customerEmail}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-600">{formatIDR(tx.totalAmount)}</td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-900">{formatIDR(tx.paidAmount)}</td>
                                        <td className={`p-4 text-right font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {diff > 0 ? '+' : ''}{formatIDR(diff)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.status === 'OVERPAID' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {tx.status === 'OVERPAID' && diff > 0 && (
                                                <button 
                                                    onClick={() => handleRefund(tx)}
                                                    className="flex items-center ml-auto px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-sm transition-all"
                                                >
                                                    <RefreshCcw size={12} className="mr-1.5"/> Refund {formatIDR(diff)}
                                                </button>
                                            )}
                                            {tx.status === 'REFUNDED' && (
                                                <span className="text-xs text-slate-400 italic">Resolved</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RefundManager;
