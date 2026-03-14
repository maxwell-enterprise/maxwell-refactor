import { CreditTagMaster } from '../../types/access';
import { ICreditTagRepository } from '../contracts';
import { apiRequest } from './apiClient';

interface ApiCreditTag {
  id: string;
  code: string;
  name: string;
  description?: string;
  type?: 'UNLIMITED_ACCESS' | 'CONSUMABLE_CREDIT';
  usageType?: 'UNLIMITED' | 'CONSUMABLE';
  usageLimit?: number;
  isActive: boolean;
}

function toFrontendTag(tag: ApiCreditTag): CreditTagMaster {
  return {
    id: tag.id,
    code: tag.code,
    name: tag.name,
    description: tag.description || '',
    type: tag.type ?? (tag.usageType === 'CONSUMABLE' ? 'CONSUMABLE_CREDIT' : 'UNLIMITED_ACCESS'),
    usageLimit: tag.usageLimit ?? 0,
    isActive: tag.isActive
  };
}

export class ApiCreditTagRepository implements ICreditTagRepository {
  async getAll(): Promise<CreditTagMaster[]> {
    const data = await apiRequest<ApiCreditTag[]>('/access-tags');
    return data.map(toFrontendTag);
  }

  async upsert(tag: CreditTagMaster): Promise<void> {
    const existing = (await apiRequest<ApiCreditTag[]>('/access-tags')).find(
      (item) => item.id === tag.id || item.code === tag.code
    );

    const payload = JSON.stringify({
      code: tag.code,
      name: tag.name,
      description: tag.description,
      usageType: tag.type === 'CONSUMABLE_CREDIT' ? 'CONSUMABLE' : 'UNLIMITED',
      usageLimit: tag.usageLimit,
      isActive: tag.isActive
    });

    if (existing) {
      await apiRequest<ApiCreditTag>(`/access-tags/${encodeURIComponent(existing.id)}`, {
        method: 'PATCH',
        body: payload
      });
      return;
    }

    await apiRequest<ApiCreditTag>('/access-tags', {
      method: 'POST',
      body: payload
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/access-tags/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
}
