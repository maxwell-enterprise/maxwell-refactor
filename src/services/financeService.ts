
import { FinancialLedgerEntry, EventProfitLoss } from '../types/finance';
import { DataService } from './dataService';
import { TribeService } from './tribeService';
import { PaymentService } from './paymentService';
import { PaymentTransaction } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

export type FinanceVendor = {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
};

function mapApiLedgerRow(row: Record<string, unknown>): FinancialLedgerEntry {
  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),
    category: row.category as FinancialLedgerEntry['category'],
    type: row.type as FinancialLedgerEntry['type'],
    referenceId: String(row.referenceId ?? ''),
    entityName: String(row.entityName ?? ''),
    description: String(row.description ?? ''),
    amount: Number(row.amount ?? 0),
    eventId: row.eventId != null ? String(row.eventId) : undefined,
    status: row.status as FinancialLedgerEntry['status'],
    txnType: row.txnType as FinancialLedgerEntry['txnType'],
    txnStatus: row.txnStatus as FinancialLedgerEntry['txnStatus'],
  };
}

async function buildClientLedger(): Promise<FinancialLedgerEntry[]> {
  const transactions = await DataService.getTransactions();
  const commissions = await TribeService.getAllPayouts();
  const ledger: FinancialLedgerEntry[] = [];

  for (const tx of transactions) {
    if (tx.type === 'PO' && tx.description.includes('Store Sale')) {
      ledger.push({
        id: `AR-${tx.id}`,
        date: tx.date,
        category: 'AR',
        type: 'REVENUE',
        referenceId: tx.id,
        entityName: tx.description.split('(')[0].replace('Store Sale: ', '').trim(),
        description: tx.description,
        amount: tx.amount,
        status: tx.status === 'Paid' ? 'SETTLED' : 'UNRECONCILED',
        eventId: tx.eventId,
        txnType: 'PO',
        txnStatus: tx.status,
      });
    } else if (tx.type === 'PO' || tx.type === 'Expense') {
      ledger.push({
        id: `AP-${tx.id}`,
        date: tx.date,
        category: 'AP',
        type: 'OPERATIONAL_EXPENSE',
        referenceId: tx.id,
        entityName: tx.description.split(':')[0] || 'Vendor',
        description: tx.description,
        amount: tx.amount,
        status: tx.status === 'Paid' ? 'SETTLED' : 'UNRECONCILED',
        eventId: tx.eventId,
        txnType: tx.type,
        txnStatus: tx.status,
      });
    }
  }

  commissions.forEach((c) => {
    ledger.push({
      id: `COMM-${c.id}`,
      date: c.createdAt.split('T')[0],
      category: 'AP',
      type: 'COMMISSION',
      referenceId: c.id,
      entityName: c.beneficiaryId,
      description: `Commission for ${c.productName} (Member: ${c.sourceMemberName})`,
      amount: c.amount,
      status: c.status === 'PAID' ? 'SETTLED' : 'UNRECONCILED',
    });
  });

  return ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const FinanceService = {
  getRawLedger: async (): Promise<FinancialLedgerEntry[]> => {
    if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
      const rows = await apiRequest<Record<string, unknown>[]>('/store/unified-ledger');
      return rows.map(mapApiLedgerRow);
    }
    return buildClientLedger();
  },

  settleLedgerEntry: async (
    entryId: string,
    referenceId: string,
    _category: 'AR' | 'AP',
  ): Promise<void> => {
    if (entryId.startsWith('AP-')) {
      await DataService.updateTransactionStatus(referenceId, 'Paid');
    } else if (entryId.startsWith('COMM-')) {
      if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
        await apiRequest(
          `/store/payout-transactions/${encodeURIComponent(referenceId)}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: 'PAID' }),
          },
        );
      } else {
        const db = await import('../utils/devDatabase').then((m) => m.DevDatabase);
        const payouts = await db.getAll<{ id: string; status: string; paidAt?: string }>(
          'payout_transactions',
        );
        const payout = payouts.find((p) => p.id === referenceId);
        if (payout) {
          payout.status = 'PAID';
          payout.paidAt = new Date().toISOString();
          await db.add('payout_transactions', payout as never);
        }
      }
    } else if (entryId.startsWith('AR-')) {
      if (APP_CONFIG.DOMAINS.PAYMENTS === 'API') {
        await apiRequest(
          `/store/payment-transactions/${encodeURIComponent(referenceId)}/settle`,
          { method: 'PATCH' },
        );
      } else {
        const db = await import('../utils/devDatabase').then((m) => m.DevDatabase);
        const payments = await db.getAll<PaymentTransaction>('payment_transactions');
        const payment = payments.find((p) => p.id === referenceId);
        if (payment) {
          payment.status = 'PAID';
          payment.paidAmount = payment.totalAmount;
          payment.balanceDue = 0;
          await db.add('payment_transactions', payment as never);
        }
      }
    }
  },

  approveExpenseClaim: async (referenceId: string): Promise<void> => {
    await DataService.updateTransactionStatus(referenceId, 'Approved');
  },

  listFinanceVendors: async (): Promise<FinanceVendor[]> => {
    if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
      try {
        return await apiRequest<FinanceVendor[]>('/store/finance-vendors');
      } catch {
        return [];
      }
    }
    return [];
  },

  ensureFinanceVendor: async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed || APP_CONFIG.DOMAINS.TRANSACTIONS !== 'API') return;
    await apiRequest('/store/finance-vendors', {
      method: 'POST',
      body: JSON.stringify({ name: trimmed }),
    });
  },

  calculateEventPnL: async (): Promise<EventProfitLoss[]> => {
    const ledger = await FinanceService.getRawLedger();
    const events = await DataService.getEvents();
    const pnlMap: Record<string, EventProfitLoss> = {};

    ledger.forEach((entry) => {
      if (!entry.eventId) return;

      if (!pnlMap[entry.eventId]) {
        const eventName =
          events.find((e) => e.id === entry.eventId)?.name || entry.eventId;
        pnlMap[entry.eventId] = {
          eventId: entry.eventId,
          eventName,
          revenue: 0,
          expenses: 0,
          grossMargin: 0,
          marginPercentage: 0,
        };
      }

      if (entry.category === 'AR') {
        pnlMap[entry.eventId].revenue += entry.amount;
      } else {
        pnlMap[entry.eventId].expenses += entry.amount;
      }
    });

    return Object.values(pnlMap).map((p) => {
      const grossMargin = p.revenue - p.expenses;
      const marginPercentage = p.revenue > 0 ? (grossMargin / p.revenue) * 100 : 0;
      return { ...p, grossMargin, marginPercentage };
    });
  },

  getExceptions: async (): Promise<PaymentTransaction[]> => {
    if (APP_CONFIG.DOMAINS.PAYMENTS === 'API') {
      const rows = await apiRequest<PaymentTransaction[]>('/store/payment-transactions');
      return rows.filter(
        (p) =>
          p.status === 'OVERPAID' ||
          p.status === 'REFUNDED' ||
          (p.refunds && p.refunds.length > 0),
      );
    }
    const allPayments = await PaymentService.getGatewayLogs();
    return allPayments.filter(
      (p) =>
        p.status === 'OVERPAID' ||
        p.status === 'REFUNDED' ||
        (p.refunds && p.refunds.length > 0),
    );
  },

  processRefund: async (
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<void> => {
    if (APP_CONFIG.DOMAINS.PAYMENTS === 'API') {
      await apiRequest(
        `/store/payment-transactions/${encodeURIComponent(transactionId)}/refund`,
        {
          method: 'POST',
          body: JSON.stringify({ amount, reason }),
        },
      );
      return;
    }

    const db = await import('../utils/devDatabase').then((m) => m.DevDatabase);
    const payments = await db.getAll<PaymentTransaction>('payment_transactions');
    const payment = payments.find((p) => p.id === transactionId);

    if (!payment) throw new Error('Transaction not found');

    if (!payment.refunds) payment.refunds = [];
    payment.refunds.push({
      id: `REF-${Date.now()}`,
      amount,
      reason,
      processedAt: new Date().toISOString(),
      status: 'PROCESSED',
    });

    if (payment.status === 'OVERPAID') {
      const overage = payment.paidAmount - payment.totalAmount;
      if (amount >= overage) {
        payment.status = 'PAID';
      }
    } else {
      payment.status = 'REFUNDED';
    }

    if (APP_CONFIG.USE_MOCK) {
      await db.add('payment_transactions', payment);
    } else if (supabase) {
      await supabase.from('payment_transactions').upsert(payment);
    }
  },
};
