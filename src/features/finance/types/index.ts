export type LedgerCategory = 'AR' | 'AP'; // AR: Member Payments, AP: Vendor/Commissions
export type SettlementStatus = 'UNRECONCILED' | 'RECONCILED' | 'SETTLED';

export interface FinancialLedgerEntry {
  id: string;
  date: string;
  category: LedgerCategory;
  type: 'REVENUE' | 'COMMISSION' | 'OPERATIONAL_EXPENSE' | 'ROYALTY';
  referenceId: string; // OrderID or PO ID
  entityName: string; // Member Name or Vendor Name
  description: string;
  amount: number;
  eventId?: string; // Tagging per event for P&L
  status: SettlementStatus;
  paymentMethod?: string;
}

export interface EventProfitLoss {
  eventId: string;
  eventName: string;
  revenue: number; // Sum of AR
  expenses: number; // Sum of AP (Commissions + Ops)
  grossMargin: number;
  marginPercentage: number;
}
