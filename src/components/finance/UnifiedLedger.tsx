
import React, { useState, useEffect } from 'react';
import { FinanceService } from '../../services/financeService';
import { FinancialLedgerEntry } from '../../types/finance';
import { ArrowUpRight, ArrowDownLeft, Filter, Download, Search, FileText } from 'lucide-react';
import { ExcelHelper } from '../../utils/excelHelper';

const UnifiedLedger: React.FC = () => {
    const [entries, setEntries] = useState<FinancialLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<'ALL' | 'AR' | 'AP'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLedger();
    }, []);

    const loadLedger = async () => {
        setLoading(true);
        const data = await FinanceService.getRawLedger();
        setEntries(data);
        setLoading(false);
    };

    const handleExport = () => {
        ExcelHelper.exportToExcel(entries, `Ledger_Export_${new Date().toISOString().split('T')[0]}`);
    };

    const filteredEntries = entries.filter(e => 
        (filterCategory === 'ALL' || e.category === filterCategory) &&
        (e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.entityName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                    <FileText size={16} className="mr-2 text-slate-600"/> General Ledger
                </h3>
                <div className="flex gap-2">
                    <div className="relative w-48">
                         <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                         <input 
                            type="text" 
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                            placeholder="Search ledger..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                         />
                    </div>
                    <select 
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none font-bold text-slate-600"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value as any)}
                    >
                        <option value="ALL">All Flows</option>
                        <option value="AR">Money In (AR)</option>
                        <option value="AP">Money Out (AP)</option>
                    </select>
                    <button onClick={handleExport} className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-100 text-slate-500">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Entity</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading ledger...</td></tr> : 
                        filteredEntries.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">No entries found.</td></tr> :
                        filteredEntries.map(e => (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono text-slate-500">{e.date}</td>
                                <td className="p-3 font-mono text-slate-500">{e.referenceId}</td>
                                <td className="p-3 font-bold text-slate-700">{e.entityName}</td>
                                <td className="p-3 text-slate-600 truncate max-w-[200px]" title={e.description}>{e.description}</td>
                                <td className="p-3">
                                    <span className={`px-1.5 py-0.5 rounded border ${
                                        e.category === 'AR' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                        {e.type}
                                    </span>
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${e.category === 'AR' ? 'text-green-600' : 'text-red-600'}`}>
                                    {e.category === 'AP' && '-'}{formatIDR(e.amount)}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${e.status === 'SETTLED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {e.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UnifiedLedger;
