import { Member } from '../../types/index';
import { IMemberRepository } from '../contracts';
import { apiRequest, ApiRequestError } from './apiClient';

export class ApiMemberRepository implements IMemberRepository {
  async getAll(): Promise<Member[]> {
    return apiRequest<Member[]>('/members');
  }

  /**
   * Avoid `GET /members/:id` (404 in DevTools when id is a workspace User id, not CRM public_id).
   * `GET /members?search=` returns 200 with a list; pick an exact `id` or email match.
   */
  async getById(id: string): Promise<Member | null> {
    const trimmed = id.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    try {
      const sp = new URLSearchParams({ search: trimmed });
      const list = await apiRequest<Member[]>(`/members?${sp.toString()}`);
      return (
        list.find(
          (m) =>
            String(m.id).toLowerCase() === lower ||
            m.email.trim().toLowerCase() === lower,
        ) ?? null
      );
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

  async searchForMemberLookup(query: string): Promise<Member[]> {
    const q = query.trim();
    if (!q) return [];
    const sp = new URLSearchParams({ search: q });
    return apiRequest<Member[]>(`/members?${sp.toString()}`);
  }

  async create(member: Member): Promise<void> {
    await apiRequest<Member>('/members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  }

  async update(id: string, data: Partial<Member>): Promise<void> {
    await apiRequest<Member>(`/members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
