
import { ICreditTagRepository } from '../contracts';
import { CreditTagMaster } from '../../types/access';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseCreditTagRepository implements ICreditTagRepository {
    async getAll(): Promise<CreditTagMaster[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('credit_tags').select('*');
        return data as CreditTagMaster[] || [];
    }

    async upsert(tag: CreditTagMaster): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('credit_tags').upsert(tag);
        if (error) throw error;
    }

    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('credit_tags').delete().eq('id', id);
        if (error) throw error;
    }
}
