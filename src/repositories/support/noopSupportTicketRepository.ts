import { SupportTicket } from '../../types/index';
import { ISupportTicketRepository } from './types';

const SUPPORT_BACKEND_ERROR =
  'Support ticket backend is not configured for this environment yet.';

export class NoopSupportTicketRepository implements ISupportTicketRepository {
  async getAll(): Promise<SupportTicket[]> {
    return [];
  }

  async create(): Promise<SupportTicket> {
    throw new Error(SUPPORT_BACKEND_ERROR);
  }

  async update(): Promise<void> {
    throw new Error(SUPPORT_BACKEND_ERROR);
  }

  async resolve(): Promise<void> {
    throw new Error(SUPPORT_BACKEND_ERROR);
  }
}
