
import { FinancialLedgerEntry } from '../types/finance';

/** Expense claims must be Approved before settlement; vendor PO can settle from Pending. */
export function canSettleLedgerEntry(entry: FinancialLedgerEntry): boolean {
  if (entry.status === 'SETTLED') return false;
  if (entry.txnType === 'Expense') {
    return entry.txnStatus === 'Approved';
  }
  return true;
}

export function isPendingExpenseClaim(entry: FinancialLedgerEntry): boolean {
  return (
    entry.category === 'AP' &&
    entry.txnType === 'Expense' &&
    entry.txnStatus === 'Pending'
  );
}

export function settlementBlockReason(entry: FinancialLedgerEntry): string | null {
  if (entry.status === 'SETTLED') return null;
  if (entry.txnType === 'Expense' && entry.txnStatus === 'Pending') {
    return 'Expense claim must be approved before payment.';
  }
  if (entry.txnType === 'Expense' && entry.txnStatus !== 'Approved') {
    return 'Only approved expense claims can be settled.';
  }
  return null;
}
