import { SupportTicket } from '../../types/index';
import { apiRequest } from '../api/apiClient';
import { ISupportTicketRepository } from './types';

// Placeholder path for the future BE contract.
// When the backend endpoint is finalized, adjust SUPPORT_TICKETS_PATH only.
const SUPPORT_TICKETS_PATH = '/support/tickets';

export class ApiSupportTicketRepository implements ISupportTicketRepository {
  async getAll(): Promise<SupportTicket[]> {
    return apiRequest<SupportTicket[]>(SUPPORT_TICKETS_PATH);
  }

  async create(ticket: SupportTicket): Promise<SupportTicket> {
    return apiRequest<SupportTicket>(SUPPORT_TICKETS_PATH, {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async update(id: string, updates: Partial<SupportTicket>): Promise<void> {
    await apiRequest<void>(`${SUPPORT_TICKETS_PATH}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}
