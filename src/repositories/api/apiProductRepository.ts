import { Product } from '../../types/index';
import {
  IProductRepository,
  ProductListQuery,
  ProductUpsertOptions,
} from '../contracts';
import { ApiRequestError, apiRequest } from './apiClient';

interface ProductListResponse {
  data: Product[];
  total: number;
}

function buildProductQueryString(query: ProductListQuery): string {
  const params = new URLSearchParams();
  params.set('sortBy', query.sortBy ?? 'title');
  params.set('sortOrder', query.sortOrder ?? 'asc');
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  const s = query.search?.trim();
  if (s) params.set('search', s);
  if (query.category) params.set('category', query.category);
  if (typeof query.isActive === 'boolean') {
    params.set('isActive', String(query.isActive));
  }
  return params.toString();
}

export class ApiProductRepository implements IProductRepository {
  async getAll(): Promise<Product[]> {
    const response = await apiRequest<ProductListResponse>(
      '/products?sortBy=title&sortOrder=asc',
    );

    return response.data;
  }

  async listProducts(
    query: ProductListQuery,
  ): Promise<{ data: Product[]; total: number }> {
    return apiRequest<ProductListResponse>(
      `/products?${buildProductQueryString(query)}`,
    );
  }

  async getById(id: string): Promise<Product | null> {
    try {
      return await apiRequest<Product>(`/products/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return null;
      }
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      throw error;
    }
  }

  async upsert(
    product: Product,
    options?: ProductUpsertOptions,
  ): Promise<Product> {
    const payload = JSON.stringify(product);
    const createOnly = options?.intent === 'create';

    if (createOnly) {
      return apiRequest<Product>('/products', {
        method: 'POST',
        body: payload,
      });
    }

    const existing = await this.getById(product.id);

    if (existing) {
      return apiRequest<Product>(
        `/products/${encodeURIComponent(product.id)}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );
    }

    return apiRequest<Product>('/products', {
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
