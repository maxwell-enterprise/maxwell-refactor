import { IInvitationRepository } from '../contracts';
import { EventInvitation } from '../../types/index';
import { apiRequest } from './apiClient';

export class ApiInvitationRepository implements IInvitationRepository {
  async getMemberInvitations(memberId: string): Promise<EventInvitation[]> {
    return apiRequest<EventInvitation[]>(
      `/invitations/member/${encodeURIComponent(memberId)}`,
    );
  }

  async createInvitations(invitations: EventInvitation[]): Promise<void> {
    await apiRequest<EventInvitation[]>('/invitations/bulk', {
      method: 'POST',
      body: JSON.stringify({ invitations }),
    });
  }

  async updateInvitation(invitation: EventInvitation): Promise<void> {
    await apiRequest<EventInvitation>(
      `/invitations/${encodeURIComponent(invitation.id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(invitation),
      },
    );
  }

  async getAll(): Promise<EventInvitation[]> {
    return apiRequest<EventInvitation[]>('/invitations');
  }
}
