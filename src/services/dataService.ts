
import { Member, Event, Transaction, Product } from '../types/index';
import { PaymentService } from './paymentService';
import { RepositoryFactory } from './repositories/index';
import { DataUtils } from '../utils/dataUtils';
import { APP_CONFIG } from '../lib/config';
import { apiRequest } from '../repositories/api/apiClient';
import {
  TransactionQueryParams,
  ProductListQuery,
  ProductUpsertOptions,
} from './repositories/types';

/**
 * INTELLIGENT DATA SERVICE
 * Now strictly delegates to specific Repositories via the Factory.
 * No direct Supabase or IndexedDB calls allowed here.
 */

export const DataService = {
  
  // --- MEMBERS ---
  getMembers: async (): Promise<Member[]> => {
    return await RepositoryFactory.getMemberRepository().getAll();
  },

  getMemberById: async (id: string): Promise<Member | null> => {
    return await RepositoryFactory.getMemberRepository().getById(id);
  },

  /**
   * Single CRM row for the signed-in user (My Zone / lifecycle). Avoids `getAll()` at scale.
   */
  resolveMeCrmMember: async (user: {
    id: string;
    email?: string | null;
  }): Promise<Member | null> => {
    const repo = RepositoryFactory.getMemberRepository();
    const userId = String(user.id ?? '').trim();
    if (userId) {
      const byUserId = await repo.getByWorkspaceUserId(userId);
      if (byUserId) return byUserId;
    }
    const emailLc = user.email?.trim().toLowerCase();
    if (emailLc) {
      const hits = await repo.searchForMemberLookup(emailLc);
      const byEmail =
        hits.find((m) => m.email.trim().toLowerCase() === emailLc) ?? null;
      if (byEmail) return byEmail;
    }
    return null;
  },

  updateMember: async (id: string, updates: Partial<Member & { notes?: string }>): Promise<void> => {
    return await RepositoryFactory.getMemberRepository().update(id, updates);
  },

  addMember: async (member: Member): Promise<void> => {
    return await RepositoryFactory.getMemberRepository().create(member);
  },
  
  // --- PRODUCTS ---
  getProducts: async (): Promise<Product[]> => {
      return await RepositoryFactory.getProductRepository().getAll();
  },

  listProducts: async (
      query: ProductListQuery,
  ): Promise<{ data: Product[]; total: number }> => {
      return await RepositoryFactory.getProductRepository().listProducts(query);
  },

  getProductById: async (id: string): Promise<Product | null> => {
      return await RepositoryFactory.getProductRepository().getById(id);
  },

  upsertProduct: async (
      product: Product,
      options?: ProductUpsertOptions,
  ): Promise<Product> => {
      return await RepositoryFactory.getProductRepository().upsert(
          product,
          options,
      );
  },

  deleteProduct: async (id: string): Promise<void> => {
      return await RepositoryFactory.getProductRepository().delete(id);
  },
  
  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
      return await RepositoryFactory.getEventRepository().getAll();
  },

  getEventById: async (id: string): Promise<Event | null> => {
      return await RepositoryFactory.getEventRepository().getById(id);
  },

  upsertEvent: async (event: Event): Promise<Event> => {
      return await RepositoryFactory.getEventRepository().upsert(event);
  },

  deleteEvent: async (id: string): Promise<void> => {
      return await RepositoryFactory.getEventRepository().delete(id);
  },

  // NEW: Smart Delete for Series
  deleteSeries: async (seriesId: string, strategy: 'CASCADE' | 'ORPHAN'): Promise<void> => {
      const repo = RepositoryFactory.getEventRepository();
      const allEvents = await repo.getAll();
      const children = allEvents.filter(e => e.parentEventId === seriesId);

      if (strategy === 'CASCADE') {
          // Delete children first
          for (const child of children) {
              await repo.delete(child.id);
          }
      } else {
          // ORPHAN: Convert children to SOLO and remove parent link
          for (const child of children) {
              await repo.upsert({
                  ...child,
                  type: 'SOLO',
                  parentEventId: undefined
              });
          }
      }

      // Finally delete the parent container
      await repo.delete(seriesId);
  },

  // --- TRANSACTIONS ---
  
  /**
   * Fetches the unified ledger.
   * UPDATED: Now supports optional filters for SQL Optimization.
   */
  getTransactions: async (filters?: TransactionQueryParams): Promise<Transaction[]> => {
    // 1. Get Manual Transactions (PO/Expenses) using new efficient Repository
    const manualTransactions = await RepositoryFactory.getTransactionRepository().find(filters);

    // 2. Get Automated Payment Logs (Gateway)
    // NOTE: In a full refactor, PaymentRepo should also support 'find(params)'
    // For now, we still fetch all and filter in memory for payments, but Core Transactions are optimized.
    const paymentLogs = await PaymentService.getGatewayLogs();
    
    let automatedRevenue: Transaction[] = paymentLogs
        .filter(log => log.status === 'PAID')
        .map(log => ({
            id: log.id,
            legacy_id: undefined,
            date: log.createdAt.split('T')[0],
            type: 'PO', 
            description: `Store Sale: ${log.orderId} (${log.method})`,
            amount: log.totalAmount,
            status: 'Paid',
            eventId: undefined, 
            createdAt: log.createdAt,
            updatedAt: log.createdAt
        }));

    // Apply filters to automated revenue manually (until PaymentRepo is refactored)
    if (filters) {
        if (filters.type && filters.type !== 'PO') automatedRevenue = [];
        if (filters.status && filters.status !== 'Paid') automatedRevenue = [];
        if (filters.startDate) automatedRevenue = automatedRevenue.filter(t => t.date >= filters.startDate!);
        if (filters.endDate) automatedRevenue = automatedRevenue.filter(t => t.date <= filters.endDate!);
    }

    const combinedLedger = [...manualTransactions, ...automatedRevenue];
    return combinedLedger.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addTransaction: async (tx: Omit<Transaction, 'id'> & { id?: string }): Promise<string | undefined> => {
      const newTx: Transaction = {
          id: tx.id ?? '',
          ...tx,
          createdAt: tx.createdAt || DataUtils.nowISO(),
          updatedAt: DataUtils.nowISO(),
          date: DataUtils.toISO(tx.date).split('T')[0]
      };

      if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
          const { id: _omit, ...body } = newTx;
          const res = await apiRequest<{ id: string }>('/store/ledger-transactions', {
              method: 'POST',
              body: JSON.stringify(body),
          });
          return res.id;
      }

      await RepositoryFactory.getTransactionRepository().create(newTx);
      return newTx.id || undefined;
  },

  updateTransactionStatus: async (id: string, status: 'Pending' | 'Approved' | 'Paid'): Promise<void> => {
      try {
        await RepositoryFactory.getTransactionRepository().updateStatus(id, status);
      } catch (e) {
        console.warn(`Could not update transaction ${id} in manual ledger. It might be a payment gateway log.`);
      }
  },

  getMemberStats: async () => {
     const members = await DataService.getMembers();
     return {
       total: members.length,
       scholarship: members.filter(m => m.scholarship).length,
     };
  }
};
