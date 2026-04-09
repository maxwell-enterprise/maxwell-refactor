import { ContentPost } from '../../types/index';
import { apiRequest } from './apiClient';
import { IContentRepository } from '../contracts';

const BASE = '/content/posts';

export class ApiContentRepository implements IContentRepository {
  async getAll(): Promise<ContentPost[]> {
    return apiRequest<ContentPost[]>(BASE);
  }

  async create(post: ContentPost): Promise<ContentPost> {
    return apiRequest<ContentPost>(BASE, {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async update(
    id: string,
    updates: Partial<ContentPost>,
  ): Promise<ContentPost | null> {
    return apiRequest<ContentPost>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest<{ ok: boolean }>(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
