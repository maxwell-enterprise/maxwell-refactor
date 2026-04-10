import { ActiveCart } from '../../services/cartService';
import { ICartRepository } from '../contracts';
import { ApiRequestError, apiRequest } from './apiClient';

export class ApiCartRepository implements ICartRepository {
  async syncCart(cart: ActiveCart): Promise<void> {
    await apiRequest<void>('/carts/sync', {
      method: 'POST',
      body: JSON.stringify(cart),
      skipBackendFailureTracking: true,
    });
  }

  async getCarts(): Promise<ActiveCart[]> {
    return apiRequest<ActiveCart[]>('/carts');
  }

  async getCartBySession(sessionId: string): Promise<ActiveCart | null> {
    try {
      return await apiRequest<ActiveCart>(`/carts/${encodeURIComponent(sessionId)}`);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }
}
