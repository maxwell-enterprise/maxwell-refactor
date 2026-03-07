
import { IEventRepository } from '../contracts';
import { Event } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseEventRepository implements IEventRepository {
    async getAll(): Promise<Event[]> {
        if (!supabase) throw new Error("Supabase client not initialized");

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error("Supabase Event Fetch Error:", error);
            return [];
        }
        return data as Event[];
    }

    async getById(id: string): Promise<Event | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
        if (error) return null;
        return data as Event;
    }

    async upsert(event: Event): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('events').upsert(event);
        if (error) throw error;
    }

    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
    }
}
