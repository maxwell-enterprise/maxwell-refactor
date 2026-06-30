
import React, { useEffect, useState } from 'react';
import { FinanceService } from '../../services/financeService';
import { FinancialLedgerEntry } from '../../types/finance';
import { isPendingExpenseClaim } from '../../services/financeLedgerUtils';
import { useAccess } from '../../context/SecurityContext';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
};

const ExpenseApprovalPanel: React.FC<Props> = ({ refreshKey = 0, onChanged }) => {
  const { can, limit } = useAccess('fin_expenses');
  const { showToast } = useToast();
  const [claims, setClaims] = useState<FinancialLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const formatIDR = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);

  const loadClaims = async () => {
    setLoading(true);
    const ledger = await FinanceService.getRawLedger();
    setClaims(ledger.filter(isPendingExpenseClaim));
    setLoading(false);
  };

  useEffect(() => {
    void loadClaims();
  }, [refreshKey]);

  const handleApprove = async (entry: FinancialLedgerEntry) => {
    if (!can('WRITE')) {
      showToast('You do not have permission to approve expense claims.', 'error');
      return;
    }
    if (limit > 0 && entry.amount > limit) {
      showToast(
        `Amount exceeds your approval limit (${formatIDR(limit)}). Escalate to a higher role.`,
        'error',
      );
      return;
    }
    if (
      !window.confirm(
        `Approve expense claim for ${formatIDR(entry.amount)}?\n${entry.description}`,
      )
    ) {
      return;
    }

    setApprovingId(entry.referenceId);
    try {
      await FinanceService.approveExpenseClaim(entry.referenceId);
      showToast('Expense claim approved.', 'success');
      await loadClaims();
      onChanged?.();
    } catch {
      showToast('Failed to approve claim.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  if (!can('READ')) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Expense approval requires <code className="text-xs">fin_expenses</code> access.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-amber-50 px-4 py-3 sm:px-6">
        <h3 className="font-bold text-slate-900">Expense claim approvals</h3>
        <p className="text-xs text-amber-800 mt-0.5">
          Staff claims must be approved before they appear in the settlement queue.
          {limit > 0 && (
            <span className="ml-1 font-medium">Your limit: {formatIDR(limit)}.</span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading pending claims…</div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-slate-400">
          <CheckCircle2 size={40} className="mb-2 text-green-200" />
          <p className="text-sm font-bold text-slate-600">No pending expense claims</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {claims.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100">
                    <Clock size={10} /> Pending approval
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{entry.date}</span>
                </div>
                <p className="font-bold text-slate-900 break-words">{entry.entityName}</p>
                <p className="text-xs text-slate-500 mt-0.5 break-words">{entry.description}</p>
                {entry.eventId && (
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Event: {entry.eventId}</p>
                )}
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end shrink-0">
                <p className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatIDR(entry.amount)}
                </p>
                {limit > 0 && entry.amount > limit ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                    <ShieldAlert size={12} /> Over authority limit
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!can('WRITE') || approvingId === entry.referenceId}
                    onClick={() => void handleApprove(entry)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {approvingId === entry.referenceId ? 'Approving…' : 'Approve claim'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseApprovalPanel;
