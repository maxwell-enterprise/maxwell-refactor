
import { FinancialLedgerEntry, EventProfitLoss } from '../types';
import { DataService } from '../../../services/dataService'; // Core service
import { TribeService } from '../../../services/tribeService';
import { PaymentService } from '../../../services/paymentService'; 
import { EVENTS_DATA } from '../../../constants';
import { PaymentTransaction } from '../../../core/types/index';
import { APP_CONFIG } from '../../../lib/config';
import { DevDatabase } from '../../../utils/devDatabase';
import { supabase } from '../../../lib/supabaseClient';

export const FinanceService = {
  getRawLedger: async (): Promise<FinancialLedgerEntry[]> => {
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
              entityName: tx.description.split('(')[0].replace('Store Sale: ','').trim(), 
              description: tx.description,
              amount: tx.amount,
              status: tx.status === 'Paid' ? 'SETTLED' : 'UNRECONCILED',
              eventId: tx.eventId 
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
              eventId: tx.eventId 
            });
        }
    }

    commissions.forEach(c => {
      ledger.push({
        id: `COMM-${c.id}`,
        date: c.createdAt.split('T')[0],
        category: 'AP',
        type: 'COMMISSION',
        referenceId: c.id, 
        entityName: c.beneficiaryId, 
        description: `Commission for ${c.productName} (Member: ${c.sourceMemberName})`,
        amount: c.amount,
        status: c.status === 'PAID' ? 'SETTLED' : 'UNRECONCILED'
      });
    });

    return ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  settleLedgerEntry: async (entryId: string, referenceId: string, category: 'AR' | 'AP'): Promise<void> => {
      if (entryId.startsWith('AP-PO-') || entryId.startsWith('AP-EXP-')) {
          await DataService.updateTransactionStatus(referenceId, 'Paid');
      } else if (entryId.startsWith('COMM-')) {
          const db = await import('../../../utils/devDatabase').then(m => m.DevDatabase);
          const payouts = await db.getAll<any>('payout_transactions');
          const payout = payouts.find(p => p.id === referenceId);
          if (payout) {
              payout.status = 'PAID';
              payout.paidAt = new Date().toISOString();
              await db.add('payout_transactions', payout);
          }
      } else if (entryId.startsWith('AR-')) {
          const db = await import('../../../utils/devDatabase').then(m => m.DevDatabase);
          const payments = await db.getAll<any>('payment_transactions');
          const payment = payments.find(p => p.id === referenceId);
          if (payment) {
              payment.status = 'PAID';
              payment.paidAmount = payment.totalAmount;
              payment.balanceDue = 0;
              await db.add('payment_transactions', payment);
          }
      }
  },

  calculateEventPnL: async (): Promise<EventProfitLoss[]> => {
    const ledger = await FinanceService.getRawLedger();
    const pnlMap: Record<string, EventProfitLoss> = {};

    ledger.forEach(entry => {
      if (!entry.eventId) return; 
      
      if (!pnlMap[entry.eventId]) {
        const eventName = EVENTS_DATA.find(e => e.id === entry.eventId)?.name || entry.eventId;
        pnlMap[entry.eventId] = { eventId: entry.eventId, eventName, revenue: 0, expenses: 0, grossMargin: 0, marginPercentage: 0 };
      }

      if (entry.category === 'AR') {
          pnlMap[entry.eventId].revenue += entry.amount;
      } else {
          pnlMap[entry.eventId].expenses += entry.amount;
      }
    });

    return Object.values(pnlMap).map(p => {
      const grossMargin = p.revenue - p.expenses;
      const marginPercentage = p.revenue > 0 ? (grossMargin / p.revenue) * 100 : 0;
      return { ...p, grossMargin, marginPercentage };
    });
  },
  
  getExceptions: async (): Promise<PaymentTransaction[]> => {
      const allPayments = await PaymentService.getGatewayLogs();
      return allPayments.filter(p => p.status === 'OVERPAID' || p.status === 'REFUNDED' || (p.refunds && p.refunds.length > 0));
  },

  processRefund: async (transactionId: string, amount: number, reason: string): Promise<void> => {
      const db = await import('../../../utils/devDatabase').then(m => m.DevDatabase);
      const payments = await db.getAll<PaymentTransaction>('payment_transactions');
      const payment = payments.find(p => p.id === transactionId);
      
      if (!payment) throw new Error("Transaction not found");

      if (!payment.refunds) payment.refunds = [];
      payment.refunds.push({
          id: `REF-${Date.now()}`,
          amount,
          reason,
          processedAt: new Date().toISOString(),
          status: 'PROCESSED'
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
  }
};
