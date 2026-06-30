
import React, { useState, useEffect, useMemo } from 'react';
import { FinanceService } from '../../services/financeService';
import { FinancialLedgerEntry, EventProfitLoss } from '../../types/finance';
import {
  canSettleLedgerEntry,
  settlementBlockReason,
} from '../../services/financeLedgerUtils';
import ExpenseApprovalPanel from './ExpenseApprovalPanel';
import {
  FileSpreadsheet, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Search,
  Landmark, Tag, Clock
} from 'lucide-react';
import { ExcelHelper } from '../../utils/excelHelper';
import { useToast } from '../../context/ToastContext';
import { useAccess } from '../../context/SecurityContext';

type Props = {
  refreshKey?: number;
};

const SettlementHub: React.FC<Props> = ({ refreshKey = 0 }) => {
  const { showToast } = useToast();
  const { can } = useAccess('fin_invoices');
  const [ledger, setLedger] = useState<FinancialLedgerEntry[]>([]);
  const [pnl, setPnl] = useState<EventProfitLoss[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'LEDGER' | 'PNL' | 'APPROVALS'>('LEDGER');
  const [searchTerm, setSearchTerm] = useState('');
  const [apOnly, setApOnly] = useState(true);

  const [settlingId, setSettlingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

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

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const arTotal = useMemo(() => ledger.filter(e => e.category === 'AR').reduce((a, b) => a + b.amount, 0), [ledger]);
  const apTotal = useMemo(() => ledger.filter(e => e.category === 'AP').reduce((a, b) => a + b.amount, 0), [ledger]);
  const netTotal = arTotal - apTotal;

  const filteredLedger = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let rows = ledger;
    if (apOnly) {
      rows = rows.filter((e) => e.category === 'AP');
    }
    if (!q) return rows;
    return rows.filter(e =>
      e.date.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.entityName || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.referenceId || '').toLowerCase().includes(q) ||
      (e.eventId || '').toLowerCase().includes(q)
    );
  }, [ledger, searchTerm, apOnly]);

  const filteredPnl = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return pnl;
    return pnl.filter(p =>
      (p.eventName || '').toLowerCase().includes(q) ||
      (p.eventId || '').toLowerCase().includes(q)
    );
  }, [pnl, searchTerm]);

  const handleSettle = async (entry: FinancialLedgerEntry) => {
      if (!can('WRITE')) {
          showToast('You do not have permission to settle transactions.', 'error');
          return;
      }
      const block = settlementBlockReason(entry);
      if (block) {
          showToast(block, 'error');
          return;
      }
      if(!window.confirm(`Confirm payment/settlement for ${entry.description}? Amount: ${formatIDR(entry.amount)}`)) return;
      
      setSettlingId(entry.id);
      try {
          await FinanceService.settleLedgerEntry(entry.id, entry.referenceId, entry.category);
          showToast('Transaction settled successfully.', 'success');
          await loadData();
      } catch(e) {
          showToast('Failed to settle transaction.', 'error');
      } finally {
          setSettlingId(null);
      }
  };

  const handleExportAccounting = () => {
    const exportData = ledger.map(e => ({
      EntryDate: e.date,
      AccountingType: e.category,
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in min-w-0">
      {/* KPI — stack clearly on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 min-w-0">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase leading-snug text-slate-400">Accounts Receivable (AR)</span>
            <div className="shrink-0 rounded-lg bg-green-50 p-1.5 text-green-600"><ArrowUpRight size={16}/></div>
          </div>
          <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl break-words">{formatIDR(arTotal)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Expected inflows from members</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase leading-snug text-slate-400">Accounts Payable (AP)</span>
            <div className="shrink-0 rounded-lg bg-amber-50 p-1.5 text-amber-600"><ArrowDownRight size={16}/></div>
          </div>
          <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl break-words">{formatIDR(apTotal)}</p>
          <p className="mt-1 text-[10px] text-slate-400">Pending commissions &amp; vendor dues</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-slate-900 p-4 text-white shadow-lg shadow-slate-900/20 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="text-[10px] font-bold uppercase leading-snug text-slate-400">Net position</span>
            <div className="shrink-0 rounded-lg bg-blue-500/20 p-1.5 text-blue-300"><Landmark size={16}/></div>
          </div>
          <p className="text-lg font-bold tabular-nums sm:text-xl break-words">{formatIDR(netTotal)}</p>
          <button type="button" onClick={handleExportAccounting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-[10px] font-bold transition-colors hover:bg-blue-500">
            <FileSpreadsheet size={12}/> Export for accounting
          </button>
        </div>
      </div>

      {/* Sub-tabs + search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 min-w-0">
        <div className="max-w-full overflow-x-scroll-touch rounded-lg bg-slate-100 p-1">
          <div className="inline-flex flex-nowrap gap-0.5">
            <button type="button" onClick={() => setView('LEDGER')} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-all sm:px-4 ${view === 'LEDGER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Settlement queue</button>
            <button type="button" onClick={() => setView('APPROVALS')} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-all sm:px-4 ${view === 'APPROVALS' ? 'bg-white shadow text-amber-700' : 'text-slate-500'}`}>Approvals</button>
            <button type="button" onClick={() => setView('PNL')} className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-all sm:px-4 ${view === 'PNL' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Event P&amp;L</button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {view === 'LEDGER' && (
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 whitespace-nowrap">
              <input
                type="checkbox"
                checked={apOnly}
                onChange={(e) => setApOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              AP only (vendor &amp; commissions)
            </label>
          )}
        <div className="relative w-full min-w-0 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search entries…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search ledger"
          />
        </div>
        </div>
      </div>

      {/* TABLE / CARDS */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {view === 'APPROVALS' ? (
          <ExpenseApprovalPanel refreshKey={refreshKey} onChanged={loadData} />
        ) : view === 'LEDGER' ? (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
              ) : filteredLedger.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No entries match your search.</div>
              ) : (
                filteredLedger.map(entry => (
                  <div key={entry.id} className="p-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <Clock size={12} className="shrink-0 opacity-60" />
                        {entry.date}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${entry.category === 'AR' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {entry.category}
                      </span>
                      {entry.status === 'SETTLED' && (
                        <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5"><CheckCircle2 size={12}/> Settled</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-[15px] leading-snug break-words">{entry.entityName}</p>
                    <p className="text-xs text-slate-500 mt-1 break-words leading-relaxed">{entry.description}</p>
                    {entry.eventId ? (
                      <p className="mt-2 inline-flex items-center gap-1 rounded border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 max-w-full break-all">
                        <Tag size={10} className="shrink-0"/> {entry.eventId}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className={`font-mono text-base font-bold tabular-nums ${entry.category === 'AR' ? 'text-green-600' : 'text-slate-900'}`}>
                        {entry.category === 'AP' && '−'}{formatIDR(entry.amount)}
                      </p>
                      {entry.status !== 'SETTLED' && canSettleLedgerEntry(entry) ? (
                        <button
                          type="button"
                          onClick={() => handleSettle(entry)}
                          disabled={settlingId === entry.id}
                          className={`w-full sm:w-auto rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${entry.category === 'AP' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                          {settlingId === entry.id ? 'Processing…' : (entry.category === 'AP' ? 'Pay vendor' : 'Reconcile')}
                        </button>
                      ) : entry.status !== 'SETTLED' && settlementBlockReason(entry) ? (
                        <span className="text-[10px] font-bold text-amber-600 text-right">
                          Awaiting approval
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block responsive-table-wrap">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="whitespace-nowrap p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 min-w-[200px]">Entity &amp; description</th>
                    <th className="p-4">Cost center</th>
                    <th className="p-4 text-right whitespace-nowrap">Amount</th>
                    <th className="p-4 text-right min-w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">Loading…</td></tr>
                  ) : filteredLedger.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">No entries match your search.</td></tr>
                  ) : filteredLedger.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="whitespace-nowrap p-4 text-xs font-mono text-slate-500">{entry.date}</td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${entry.category === 'AR' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {entry.category}
                        </span>
                      </td>
                      <td className="p-4 max-w-[280px]">
                        <div className="font-bold text-slate-900 break-words">{entry.entityName}</div>
                        <div className="text-[10px] text-slate-500 break-words leading-relaxed mt-0.5">{entry.description}</div>
                      </td>
                      <td className="p-4">
                          {entry.eventId ? (
                              <span className="inline-flex max-w-[12rem] items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 break-all">
                                  <Tag size={10} className="shrink-0"/> {entry.eventId}
                              </span>
                          ) : (
                              <span className="text-[10px] text-slate-300">—</span>
                          )}
                      </td>
                      <td className={`p-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${entry.category === 'AR' ? 'text-green-600' : 'text-slate-900'}`}>
                        {entry.category === 'AP' && '−'}{formatIDR(entry.amount)}
                      </td>
                      <td className="p-4 text-right">
                        {entry.status === 'SETTLED' ? (
                            <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-green-600">
                                <CheckCircle2 size={14}/> Settled
                            </div>
                        ) : canSettleLedgerEntry(entry) ? (
                            <button 
                                type="button"
                                onClick={() => handleSettle(entry)}
                                disabled={settlingId === entry.id}
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all max-w-full
                                    ${entry.category === 'AP' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}
                                `}
                            >
                                {settlingId === entry.id ? 'Processing…' : (entry.category === 'AP' ? 'Pay vendor' : 'Reconcile')}
                            </button>
                        ) : (
                            <span className="text-[10px] font-bold text-amber-600">Awaiting approval</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
              ) : filteredPnl.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 italic">No event buckets found. Use event tags in transactions.</div>
              ) : (
                filteredPnl.map(p => (
                  <div key={p.eventId} className="p-4 space-y-2 min-w-0">
                    <p className="font-bold text-slate-900 break-words">{p.eventName}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Revenue</span>
                        <span className="font-mono text-green-600 font-bold">{formatIDR(p.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Expenses</span>
                        <span className="font-mono text-red-600 font-bold">−{formatIDR(p.expenses)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross margin</span>
                        <span className={`font-mono font-bold ${p.grossMargin >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{formatIDR(p.grossMargin)}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full ${p.marginPercentage > 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, Math.abs(p.marginPercentage))}%`}}></div>
                        </div>
                        <span className={`text-[10px] font-bold ${p.marginPercentage > 0 ? 'text-blue-600' : 'text-red-600'}`}>{p.marginPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="hidden md:block responsive-table-wrap">
              <table className="w-full min-w-[720px] text-left text-sm">
                 <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-4">Event</th>
                    <th className="p-4 text-right whitespace-nowrap">Revenue (AR)</th>
                    <th className="p-4 text-right whitespace-nowrap">Expenses (AP)</th>
                    <th className="p-4 text-right whitespace-nowrap">Gross margin</th>
                    <th className="p-4 text-center">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPnl.map(p => (
                    <tr key={p.eventId} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900 max-w-xs break-words">{p.eventName}</td>
                      <td className="p-4 text-right font-mono text-green-600 tabular-nums whitespace-nowrap">{formatIDR(p.revenue)}</td>
                      <td className="p-4 text-right font-mono text-red-600 tabular-nums whitespace-nowrap">−{formatIDR(p.expenses)}</td>
                      <td className={`p-4 text-right font-bold font-mono tabular-nums whitespace-nowrap ${p.grossMargin >= 0 ? 'text-slate-900' : 'text-red-500'}`}>{formatIDR(p.grossMargin)}</td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1 mx-auto">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full ${p.marginPercentage > 0 ? 'bg-blue-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, Math.abs(p.marginPercentage))}%`}}></div>
                          </div>
                          <span className={`text-[10px] font-bold ${p.marginPercentage > 0 ? 'text-blue-600' : 'text-red-600'}`}>{p.marginPercentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPnl.length === 0 && !loading && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No event buckets found. Use event tags in transactions.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettlementHub;
