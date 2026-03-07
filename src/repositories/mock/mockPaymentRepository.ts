
import { IPaymentRepository } from '../contracts';
import { PaymentTransaction } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';

// Helper for seed data if needed, though PaymentService usually handles logic
const SEED_PAYMENT_LOGS: PaymentTransaction[] = [
    {
        id: 'TRX-INIT-001',
        orderId: 'ORD-991',
        amount: 24000000,
        totalAmount: 24000105,
        paidAmount: 24000105,
        balanceDue: 0,
        method: 'BANK_TRANSFER',
        status: 'PAID',
        createdAt: '2025-01-01T10:00:00Z',
        expiryTime: '2025-01-02T10:00:00Z',
        customerEmail: 'customer@gmail.com',
        uniqueCode: 105,
        attributionSource: 'ig_launch'
    }
];

export class MockPaymentRepository implements IPaymentRepository {
    async getAll(): Promise<PaymentTransaction[]> {
        try {
            if (await DevDatabase.isEmpty('payment_transactions')) {
                await DevDatabase.bulkAdd('payment_transactions', SEED_PAYMENT_LOGS);
                return SEED_PAYMENT_LOGS;
            }
            return await DevDatabase.getAll<PaymentTransaction>('payment_transactions');
        } catch (e) {
            return SEED_PAYMENT_LOGS;
        }
    }

    async getById(id: string): Promise<PaymentTransaction | null> {
        const all = await this.getAll();
        return all.find(p => p.id === id) || null;
    }

    async create(transaction: PaymentTransaction): Promise<PaymentTransaction> {
        await DevDatabase.add('payment_transactions', transaction);
        return transaction;
    }

    async update(transaction: PaymentTransaction): Promise<void> {
        await DevDatabase.add('payment_transactions', transaction);
    }

    async updateStatus(id: string, status: string): Promise<void> {
        const tx = await this.getById(id);
        if (tx) {
            tx.status = status as any;
            await this.update(tx);
        }
    }
}
