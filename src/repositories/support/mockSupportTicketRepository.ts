import { SupportTicket } from '../../types/index';
import { MOCK_TICKETS } from '../../constants';
import { DevDatabase } from '../../utils/devDatabase';
import { ISupportTicketRepository } from './types';

export class MockSupportTicketRepository implements ISupportTicketRepository {
  async getAll(): Promise<SupportTicket[]> {
    try {
      const isEmpty = await DevDatabase.isEmpty('support_tickets');
      if (isEmpty) {
        await DevDatabase.bulkAdd('support_tickets', MOCK_TICKETS);
        return MOCK_TICKETS;
      }

      const tickets = await DevDatabase.getAll<SupportTicket>('support_tickets');
      return tickets.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch {
      return MOCK_TICKETS;
    }
  }

  async create(ticket: SupportTicket): Promise<SupportTicket> {
    await DevDatabase.add('support_tickets', ticket);
    return ticket;
  }

  async update(id: string, updates: Partial<SupportTicket>): Promise<void> {
    const tickets = await this.getAll();
    const existing = tickets.find((ticket) => ticket.id === id);
    if (!existing) return;

    await DevDatabase.add('support_tickets', { ...existing, ...updates });
  }
}
