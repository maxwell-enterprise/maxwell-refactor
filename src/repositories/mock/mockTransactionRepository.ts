
import { ITransactionRepository, TransactionQueryParams } from '../contracts';
import { Transaction } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { TRANSACTIONS_DATA } from '../../constants';
import { DataUtils } from '../../utils/dataUtils';

export class MockTransactionRepository implements ITransactionRepository {

    // Legacy support
    async getAll(): Promise<Transaction[]> {
        return this.find();
    }

    // Smart Find - Simulates SQL WHERE clauses in memory
    async find(params?: TransactionQueryParams): Promise<Transaction[]> {
        try {
            let txs = await DevDatabase.getAll<Transaction>('transactions');

            // Seed if empty
            if (txs.length === 0 && !localStorage.getItem('MAXWELL_SKIP_SEED')) {
                await DevDatabase.bulkAdd('transactions', TRANSACTIONS_DATA);
                txs = TRANSACTIONS_DATA;
            }

            // --- FILTERING ENGINE (Mimics SQL) ---
            if (params) {
                txs = txs.filter(t => {
                    let matches = true;
                    if (params.type && t.type !== params.type) matches = false;
                    if (params.status && t.status !== params.status) matches = false;

                    if (params.startDate) {
                        if (new Date(t.date) < new Date(params.startDate)) matches = false;
                    }
                    if (params.endDate) {
                        if (new Date(t.date) > new Date(params.endDate)) matches = false;
                    }
                    return matches;
                });
            }

            // Sorting (Default DESC date)
            txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Pagination (Mimics SQL LIMIT/OFFSET)
            if (params?.offset !== undefined || params?.limit !== undefined) {
                const start = params.offset || 0;
                const end = params.limit ? start + params.limit : undefined;
                txs = txs.slice(start, end);
            }

            return txs;
        } catch (e) {
            console.error("Mock Repo Error", e);
            return [];
        }
    }

    async create(transaction: Transaction): Promise<void> {
        // REFACTOR: ID Generation moved to Repository Layer (Infrastructure concern)
        const newTx = { ...transaction };
        if (!newTx.id) {
            newTx.id = DataUtils.generateID(); // Server-side ID gen simulation
        }
        if (!newTx.createdAt) {
            newTx.createdAt = DataUtils.nowISO();
        }
        newTx.updatedAt = DataUtils.nowISO();

        await DevDatabase.add('transactions', newTx);
    }

    async updateStatus(id: string, status: 'Pending' | 'Approved' | 'Paid'): Promise<void> {
        const all = await this.getAll();
        const tx = all.find(t => t.id === id);
        if (tx) {
            tx.status = status;
            tx.updatedAt = DataUtils.nowISO();
            await DevDatabase.add('transactions', tx);
        }
    }
}
