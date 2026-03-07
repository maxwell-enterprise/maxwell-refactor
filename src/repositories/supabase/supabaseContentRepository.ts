
import { IContentRepository } from '../contracts';
import { ContentPost } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseContentRepository implements IContentRepository {
    async getAll(): Promise<ContentPost[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('cms_content').select('*');
        if (error) throw error;
        return data as ContentPost[];
    }

    async create(post: ContentPost): Promise<ContentPost> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('cms_content').insert(post).select().single();
        if (error) throw error;
        return data as ContentPost;
    }

    async update(id: string, updates: Partial<ContentPost>): Promise<ContentPost | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('cms_content').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as ContentPost;
    }

    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('cms_content').delete().eq('id', id);
        if (error) throw error;
    }
}
