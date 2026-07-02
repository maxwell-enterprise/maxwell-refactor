
import { IMemberRepository } from '../contracts';
import { Member } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';
import { normalizeLifecycleStageForStoredEmail } from '../../lib/memberLifecycleViews';

export class SupabaseMemberRepository implements IMemberRepository {
    async getAll(): Promise<Member[]> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('joinMonth', { ascending: false }); // Latest members first

        if (error) {
            console.error("Supabase Member Fetch Error:", error);
            // Fail gracefully by returning empty array rather than crashing app
            return [];
        }

        // Map any DB-specific field differences here if necessary
        return data as Member[];
    }

    async searchForMemberLookup(query: string): Promise<Member[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const q = query.trim();
        if (!q) return [];
        const esc = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .ilike('email', `%${esc}%`)
            .limit(50);
        if (error) {
            console.error('Supabase member lookup:', error);
            return [];
        }
        return (data ?? []) as Member[];
    }

    async getById(id: string): Promise<Member | null> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data as Member;
    }

    async getByWorkspaceUserId(workspaceUserId: string): Promise<Member | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const uid = workspaceUserId.trim();
        if (!uid) return null;
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', uid)
            .maybeSingle();
        if (error) return null;
        return (data as Member) ?? null;
    }

    async create(member: Member): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const row = {
            ...member,
            lifecycleStage: normalizeLifecycleStageForStoredEmail(
                member.lifecycleStage,
                member.email,
            ),
        };
        const { error } = await supabase.from('members').insert(row);

        if (error) {
            console.error("Supabase Create Member Error:", error);
            throw error;
        }
    }

    async update(id: string, data: Partial<Member>): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const current = await this.getById(id);
        const nextEmail =
            data.email !== undefined ? data.email : (current?.email ?? '');
        const nextStage =
            data.lifecycleStage !== undefined
                ? data.lifecycleStage
                : (current?.lifecycleStage ?? 'GUEST');
        const coercedLifecycle = normalizeLifecycleStageForStoredEmail(
            nextStage,
            nextEmail,
        );

        const { error } = await supabase
            .from('members')
            .update({
                ...data,
                lifecycleStage: coercedLifecycle,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error("Supabase Update Member Error:", error);
            throw error;
        }
    }
}
