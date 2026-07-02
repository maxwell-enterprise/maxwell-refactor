
import { IMemberRepository } from '../contracts';
import { Member } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { MEMBER_DATA } from '../../constants';
import { DataUtils } from '../../utils/dataUtils';
import { normalizeLifecycleStageForStoredEmail } from '../../lib/memberLifecycleViews';

export class MockMemberRepository implements IMemberRepository {
    async getAll(): Promise<Member[]> {
        try {
            const dbMembers = await DevDatabase.getAll<Member>('members');
            // If explicit skip flag is set, return what's in DB (even if empty)
            // If flag is NOT set, use fallback to prevent broken UI during dev
            if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') {
                return dbMembers;
            }
            return dbMembers.length > 0 ? dbMembers : MEMBER_DATA;
        } catch (e) {
            console.error("Mock Repo Error", e);
            if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') return [];
            return MEMBER_DATA;
        }
    }

    async getById(id: string): Promise<Member | null> {
        const members = await this.getAll();
        return members.find(m => m.id === id) || null;
    }

    async searchForMemberLookup(query: string): Promise<Member[]> {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const members = await this.getAll();
        return members
            .filter((m) => {
                const em = (m.email ?? '').trim().toLowerCase();
                const nm = (m.name ?? '').trim().toLowerCase();
                return (
                    em === q ||
                    m.id === query.trim() ||
                    em.includes(q) ||
                    nm.includes(q)
                );
            })
            .slice(0, 50);
    }

    async getByWorkspaceUserId(workspaceUserId: string): Promise<Member | null> {
        const uid = workspaceUserId.trim();
        if (!uid) return null;
        const members = await this.getAll();
        return members.find((m) => m.userId === uid) ?? null;
    }

    async create(member: Member): Promise<void> {
        const newMember = { ...member };
        newMember.lifecycleStage = normalizeLifecycleStageForStoredEmail(
            newMember.lifecycleStage,
            newMember.email,
        );

        // Ensure ID is present (UUID preferred)
        if (!newMember.id) {
            newMember.id = DataUtils.generateID();
        }

        // Ensure Audit Timestamps (using any cast to bypass strict type check for now)
        const now = DataUtils.nowISO();
        (newMember as any).createdAt = now;
        (newMember as any).updatedAt = now;

        await DevDatabase.add('members', newMember);
    }

    async update(id: string, data: Partial<Member>): Promise<void> {
        const member = await this.getById(id);
        if (member) {
            const nextEmail = data.email !== undefined ? data.email : member.email;
            const nextStage =
                data.lifecycleStage !== undefined
                    ? data.lifecycleStage
                    : member.lifecycleStage;
            const updatedMember = {
                ...member,
                ...data,
                lifecycleStage: normalizeLifecycleStageForStoredEmail(
                    nextStage,
                    nextEmail,
                ),
                updatedAt: DataUtils.nowISO(),
            };
            await DevDatabase.add('members', updatedMember);
        }
    }
}
