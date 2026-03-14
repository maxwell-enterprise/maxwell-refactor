import { Event } from '../../types/index';
import { IEventRepository } from '../contracts';
import { apiRequest } from './apiClient';

export class ApiEventRepository implements IEventRepository {
  async getAll(): Promise<Event[]> {
    return apiRequest<Event[]>('/events');
  }

  async getById(id: string): Promise<Event | null> {
    try {
      return await apiRequest<Event>(`/events/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      throw error;
    }
  }

  async upsert(event: Event): Promise<void> {
    const payload = JSON.stringify(event);
    const existing = await this.getById(event.id);

    if (existing) {
      await apiRequest<Event>(`/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        body: payload,
      });
      return;
    }

    await apiRequest<Event>('/events', {
      method: 'POST',
      body: payload,
    });
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
