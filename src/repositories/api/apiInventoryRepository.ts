import { InventoryItem, InventoryTransaction } from '../../types/index';
import { IInventoryRepository } from '../contracts';
import { apiRequest } from './apiClient';

export class ApiInventoryRepository implements IInventoryRepository {
  async getAll(): Promise<InventoryItem[]> {
    return apiRequest<InventoryItem[]>('/store/inventory');
  }

  async upsert(item: InventoryItem): Promise<void> {
    await apiRequest(`/store/inventory/${encodeURIComponent(item.sku)}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async getTransactions(): Promise<InventoryTransaction[]> {
    return apiRequest<InventoryTransaction[]>(
      '/store/inventory-transactions',
    );
  }

  async logTransaction(tx: InventoryTransaction): Promise<void> {
    await apiRequest('/store/inventory-transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }
}
