import { SupportTicket } from '../../types/index';
import { apiRequest } from '../api/apiClient';
import { ISupportTicketRepository } from './types';

const SUPPORT_TICKETS_PATH = '/store/support-tickets';

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

  async resolve(id: string, resolution: string): Promise<void> {
    await apiRequest<void>(
      `${SUPPORT_TICKETS_PATH}/${encodeURIComponent(id)}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ resolution }),
      },
    );
  }
}
