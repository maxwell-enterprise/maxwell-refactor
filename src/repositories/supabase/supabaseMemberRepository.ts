
import { IMemberRepository } from '../contracts';
import { Member } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

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

    async create(member: Member): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        // Ensure ID is present before insert, or let DB handle it?
        // Our DataUtils usually handles generation, so we pass it.
        const { error } = await supabase.from('members').insert(member);

        if (error) {
            console.error("Supabase Create Member Error:", error);
            throw error;
        }
    }

    async update(id: string, data: Partial<Member>): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { error } = await supabase
            .from('members')
            .update({
                ...data,
                updatedAt: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error("Supabase Update Member Error:", error);
            throw error;
        }
    }
}
