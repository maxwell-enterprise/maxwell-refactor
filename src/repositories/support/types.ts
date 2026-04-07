import { SupportTicket } from '../../types/index';

export interface ISupportTicketRepository {
  getAll(): Promise<SupportTicket[]>;
  create(ticket: SupportTicket): Promise<SupportTicket>;
  update(id: string, updates: Partial<SupportTicket>): Promise<void>;
}
