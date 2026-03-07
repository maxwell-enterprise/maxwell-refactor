
import { IInvitationRepository } from '../contracts';
import { EventInvitation } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { SEED_INVITATIONS } from '../../seeds/invitation_test';

export class MockInvitationRepository implements IInvitationRepository {
    private async ensureSeeded() {
        if (await DevDatabase.isEmpty('event_invitations')) {
            await DevDatabase.bulkAdd('event_invitations', SEED_INVITATIONS);
        }
    }

    async getMemberInvitations(memberId: string): Promise<EventInvitation[]> {
        await this.ensureSeeded();
        const all = await DevDatabase.getAll<EventInvitation>('event_invitations');
        return all.filter(i => i.memberId === memberId).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }

    async createInvitations(invitations: EventInvitation[]): Promise<void> {
        await DevDatabase.bulkAdd('event_invitations', invitations);
    }

    async updateInvitation(invitation: EventInvitation): Promise<void> {
        await DevDatabase.add('event_invitations', invitation);
    }

    async getAll(): Promise<EventInvitation[]> {
        await this.ensureSeeded();
        return await DevDatabase.getAll<EventInvitation>('event_invitations');
    }
}
