import { Product } from '../../types/index';
import { IProductRepository } from '../contracts';
import { apiRequest } from './apiClient';

interface ProductListResponse {
  data: Product[];
  total: number;
}

export class ApiProductRepository implements IProductRepository {
  async getAll(): Promise<Product[]> {
    const response = await apiRequest<ProductListResponse>(
      '/products?limit=1000&sortBy=title&sortOrder=asc',
    );

    return response.data;
  }

  async getById(id: string): Promise<Product | null> {
    try {
      return await apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      throw error;
    }
  }

  async upsert(product: Product): Promise<void> {
    const payload = JSON.stringify(product);

    const existing = await this.getById(product.id);

    if (existing) {
      await apiRequest<Product>(`/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: payload,
      });
      return;
    }

    await apiRequest<Product>('/products', {
      method: 'POST',
      body: payload,
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
