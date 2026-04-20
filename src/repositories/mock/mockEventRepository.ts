
import { IEventRepository } from '../contracts';
import { Event } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { EVENTS_DATA } from '../../constants';

export class MockEventRepository implements IEventRepository {
    async getAll(): Promise<Event[]> {
        try {
            const events = await DevDatabase.getAll<Event>('events');

            // SECURITY: If explicit skip flag is set (e.g. after a factory reset), respect the empty DB.
            if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') {
                return events;
            }

            // CRITICAL FIX: Do NOT fallback to EVENTS_DATA if the array is empty.
            // If the user deleted all events, the DB should remain empty until re-seeded by SeedService.
            // We only return the actual DB state.
            return events;
        } catch (e) {
            console.error("Mock Event Repo Error", e);
            return [];
        }
    }

    async getById(id: string): Promise<Event | null> {
        const events = await this.getAll();
        return events.find(e => e.id === id) || null;
    }

    async upsert(event: Event): Promise<Event> {
        await DevDatabase.add('events', event);
        return event;
    }

    async delete(id: string): Promise<void> {
        await DevDatabase.delete('events', id);
    }
}
