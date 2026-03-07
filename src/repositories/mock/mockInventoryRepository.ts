
import { IInventoryRepository } from '../contracts';
import { InventoryItem, InventoryTransaction } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { INVENTORY_DATA } from '../../constants';

export class MockInventoryRepository implements IInventoryRepository {
    async getAll(): Promise<InventoryItem[]> {
        try {
            if (await DevDatabase.isEmpty('inventory')) {
                await DevDatabase.bulkAdd('inventory', INVENTORY_DATA);
                return INVENTORY_DATA;
            }
            return await DevDatabase.getAll<InventoryItem>('inventory');
        } catch (e) {
            return INVENTORY_DATA;
        }
    }

    async upsert(item: InventoryItem): Promise<void> {
        await DevDatabase.add('inventory', item);
    }

    async getTransactions(): Promise<InventoryTransaction[]> {
        try {
            return await DevDatabase.getAll<InventoryTransaction>('inventory_transactions');
        } catch (e) {
            return [];
        }
    }

    async logTransaction(tx: InventoryTransaction): Promise<void> {
        await DevDatabase.add('inventory_transactions', tx);
    }
}
