
import { CartItem } from '../types/index';
import { RepositoryFactory } from './repositories/index';

export interface ActiveCart {
    sessionId: string;
    userId?: string; 
    userEmail?: string;
    items: CartItem[];
    lastUpdated: string;
    totalValue: number;
    status: 'ACTIVE' | 'ABANDONED' | 'CONVERTED';
}

export const CartService = {
    syncCart: async (userId: string | undefined, items: CartItem[], totalValue: number) => {
        const sessionId = userId ? `sess_${userId}` : `sess_anon_guest`; 
        const entry: ActiveCart = {
            sessionId,
            userId,
            items,
            lastUpdated: new Date().toISOString(),
            totalValue,
            status: 'ACTIVE'
        };

        try {
            await RepositoryFactory.getCartRepository().syncCart(entry);
        } catch {
            /* Cart sync is best-effort; DB/network outages must not break the storefront UI. */
        }
    },

    getCarts: async (): Promise<ActiveCart[]> => {
        return await RepositoryFactory.getCartRepository().getCarts();
    },

    getActiveCart: async (userId?: string): Promise<ActiveCart | null> => {
        const sessionId = userId ? `sess_${userId}` : `sess_anon_guest`;
        return RepositoryFactory.getCartRepository().getCartBySession(sessionId);
    },
};
