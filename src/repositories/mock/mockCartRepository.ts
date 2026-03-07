
import { ICartRepository } from '../contracts';
import { ActiveCart } from '../../services/cartService';
import { DevDatabase } from '../../utils/devDatabase';

const SEED_CARTS: ActiveCart[] = [
    {
        sessionId: 'sess_abc123',
        userId: 'M002',
        items: [{ productId: 'PKG-2025-FULL', quantity: 1 }],
        lastUpdated: new Date(Date.now() - 3600000).toISOString(),
        totalValue: 24000000,
        status: 'ABANDONED'
    }
];

export class MockCartRepository implements ICartRepository {
    async syncCart(cart: ActiveCart): Promise<void> {
        await DevDatabase.add('active_shopping_carts', cart);
    }

    async getCarts(): Promise<ActiveCart[]> {
        try {
            if (await DevDatabase.isEmpty('active_shopping_carts')) {
                await DevDatabase.bulkAdd('active_shopping_carts', SEED_CARTS);
                return SEED_CARTS;
            }
            return await DevDatabase.getAll<ActiveCart>('active_shopping_carts');
        } catch (e) {
            return SEED_CARTS;
        }
    }

    async getCartBySession(sessionId: string): Promise<ActiveCart | null> {
        const carts = await this.getCarts();
        return carts.find(c => c.sessionId === sessionId) || null;
    }
}
