
import React, { useState, useEffect } from 'react';
import { FinanceService } from '../../services/financeService';
import { FinancialLedgerEntry, EventProfitLoss } from '../../types/finance';
import { 
  Download, FileSpreadsheet, CheckCircle2, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Filter, Search, BarChart3, 
  Wallet, Landmark, Receipt, Tag, Clock, DollarSign
} from 'lucide-react';
import { ExcelHelper } from '../../utils/excelHelper';
import { useToast } from '../../context/ToastContext';

const SettlementHub: React.FC = () => {
  const { showToast } = useToast();
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([]);
  const [pnl, setPnl] = useState<EventProfitLoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'LEDGER' | 'PNL'>('LEDGER');
  
  const [settlingId, setSettlingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [l, p] = await Promise.all([
      FinanceService.getRawLedger(),
      FinanceService.calculateEventPnL()
    ]);
    setLedger(l);
    setPnl(p);
    setLoading(false);
  };

  const handleSettle = async (entry: FinancialLedgerEntry) => {
      if(!window.confirm(`Confirm payment/settlement for ${entry.description}? Amount: ${formatIDR(entry.amount)}`)) return;
      
      setSettlingId(entry.id);
      try {
          await FinanceService.settleLedgerEntry(entry.id, entry.referenceId, entry.category);
          showToast('Transaction settled successfully.', 'success');
          await loadData(); // Refresh list to show updated status
      } catch(e) {
          showToast('Failed to settle transaction.', 'error');
      } finally {
          setSettlingId(null);
      }
  };

  const handleExportAccounting = () => {
    // Format specifically for external tools
    const exportData = ledger.map(e => ({
      EntryDate: e.date,
      AccountingType: e.category, // AR or AP
      SubCategory: e.type,
      Reference: e.referenceId,
      Entity: e.entityName,
      Description: e.description,
      Amount: e.amount,
      Status: e.status,
      EventTag: e.eventId || 'NONE'
    }));
    
    ExcelHelper.exportToExcel(exportData, `Accounting_Import_Ledger_${new Date().toISOString().split('T')[0]}`);
    showToast('Ledger ready for Accounting Import', 'success');
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TREASURY HEADER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accounts Receivable (AR)</span>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><ArrowUpRight size={16}/></div>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatIDR(ledger.filter(e => e.category === 'AR').reduce((a, b) => a + b.amount, 0))}</p>
          <p className="text-[10px] text-slate-400 mt-1">Expected inflows from Members</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Accounts Payable (AP)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><ArrowDownRight size={16}/></div>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatIDR(ledger.filter(e => e.category === 'AP').reduce((a, b) => a + b.amount, 0))}</p>
          <p className="text-[10px] text-slate-400 mt-1">Pending commissions & Vendor dues</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl shadow-lg shadow-slate-900/20 text-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Net Position</span>
            <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg"><Landmark size={16}/></div>
          </div>
          <p className="text-xl font-bold">
            {formatIDR(ledger.filter(e=>e.category==='AR').reduce((a,b)=>a+b.amount,0) - ledger.filter(e=>e.category==='AP').reduce((a,b)=>a+b.amount,0))}
          </p>
          <button onClick={handleExportAccounting} className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-colors">
            <FileSpreadsheet size={12}/> EXPORT FOR ACCOUNTING
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setView('LEDGER')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'LEDGER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Raw Ledger</button>
          <button onClick={() => setView('PNL')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'PNL' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Event P&L Quick-View</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input type="text" placeholder="Search entries..." className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-48"/>
          </div>
        </div>
      </div>

      {/* 3. TABLE AREA */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {view === 'LEDGER' ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Entity & Description</th>
                <th className="p-4">Cost Center (Event)</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 text-xs font-mono text-slate-500">{entry.date}</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${entry.category === 'AR' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{entry.entityName}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-xs">{entry.description}</div>
                  </td>
                  <td className="p-4">
                      {entry.eventId ? (
                          <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 flex items-center w-fit">
                              <Tag size={10} className="mr-1"/> {entry.eventId}
                          </span>
                      ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                      )}
                  </td>
                  <td className={`p-4 text-right font-mono font-bold ${entry.category === 'AR' ? 'text-green-600' : 'text-slate-900'}`}>
                    {entry.category === 'AP' && '-'}{formatIDR(entry.amount)}
                  </td>
                  <td className="p-4 text-right">
                    {entry.status === 'SETTLED' ? (
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-green-600">
                            <CheckCircle2 size={14}/> Settled
                        </div>
                    ) : (
                        <button 
                            onClick={() => handleSettle(entry)}
                            disabled={settlingId === entry.id}
                            className={`flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold transition-all w-full ml-auto
                                ${entry.category === 'AP' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            {settlingId === entry.id ? 'Processing...' : (entry.category === 'AP' ? 'Pay Vendor' : 'Reconcile')}
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Event Bucket</th>
                <th className="p-4 text-right">Revenue (AR)</th>
                <th className="p-4 text-right">Expenses (AP)</th>
                <th className="p-4 text-right">Gross Margin</th>
                <th className="p-4 text-center">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pnl.map(p => (
                <tr key={p.eventId} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{p.eventName}</td>
                  <td className="p-4 text-right text-green-600 font-mono">{formatIDR(p.revenue)}</td>
                  <td className="p-4 text-right text-red-600 font-mono">-{formatIDR(p.expenses)}</td>
                  <td className={`p-4 text-right font-bold font-mono ${p.grossMargin >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{formatIDR(p.grossMargin)}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${p.marginPercentage > 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, Math.abs(p.marginPercentage))}%`}}></div>
                      </div>
                      <span className={`text-[10px] font-bold ${p.marginPercentage > 0 ? 'text-blue-600' : 'text-red-600'}`}>{p.marginPercentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {pnl.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No event buckets found. Use event tags in transactions.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SettlementHub;
