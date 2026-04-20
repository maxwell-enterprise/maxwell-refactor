import { Event } from '../../types/index';
import { IEventRepository } from '../contracts';
import { apiRequest, ApiRequestError } from './apiClient';

export class ApiEventRepository implements IEventRepository {
  async getAll(): Promise<Event[]> {
    return apiRequest<Event[]>('/events');
  }

  /**
   * Resolve by public id / display id without `GET /events/:id` — that returns **404** when the
   * row is missing (noisy in DevTools; product `meta.eventId` may point at stale or demo IDs).
   * `GET /events?search=` always returns **200** with an array; we pick an exact `id` match.
   */
  async getById(id: string): Promise<Event | null> {
    const trimmed = id.trim();
    if (!trimmed) return null;
    try {
      const q = new URLSearchParams({ search: trimmed });
      const list = await apiRequest<Event[]>(`/events?${q.toString()}`);
      const lower = trimmed.toLowerCase();
      return list.find((e) => String(e.id).toLowerCase() === lower) ?? null;
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

  /**
   * Prefer PATCH-then-POST so we do not depend on GET /events/:id (avoids an extra round trip
   * and avoids failures when the existence probe misbehaves). POST runs only when PATCH returns 404.
   */
  async upsert(event: Event): Promise<Event> {
    const payload = JSON.stringify(event);
    const path = `/events/${encodeURIComponent(event.id)}`;
    try {
      return await apiRequest<Event>(path, {
        method: 'PATCH',
        body: payload,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return await apiRequest<Event>('/events', {
          method: 'POST',
          body: payload,
        });
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await apiRequest<void>(`/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
