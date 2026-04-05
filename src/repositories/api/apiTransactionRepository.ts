import { Transaction } from '../../types/index';
import { ITransactionRepository, TransactionQueryParams } from '../contracts';
import { apiRequest } from './apiClient';

function buildLedgerQuery(params?: TransactionQueryParams): string {
  const q = new URLSearchParams();
  if (params?.type) q.set('type', params.type);
  if (params?.status) q.set('status', params.status);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export class ApiTransactionRepository implements ITransactionRepository {
  async find(params?: TransactionQueryParams): Promise<Transaction[]> {
    return apiRequest<Transaction[]>(
      `/store/ledger-transactions${buildLedgerQuery(params)}`,
    );
  }

  async getAll(): Promise<Transaction[]> {
    return this.find();
  }

  async create(transaction: Transaction): Promise<void> {
    await apiRequest<{ id: string }>('/store/ledger-transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async updateStatus(
    id: string,
    status: 'Pending' | 'Approved' | 'Paid',
  ): Promise<void> {
    await apiRequest(
      `/store/ledger-transactions/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
  }
}
