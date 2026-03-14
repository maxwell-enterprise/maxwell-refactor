import { Member } from '../../types/index';
import { IMemberRepository } from '../contracts';
import { apiRequest } from './apiClient';

export class ApiMemberRepository implements IMemberRepository {
  async getAll(): Promise<Member[]> {
    return apiRequest<Member[]>('/members');
  }

  async getById(id: string): Promise<Member | null> {
    try {
      return await apiRequest<Member>(`/members/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      throw error;
    }
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
