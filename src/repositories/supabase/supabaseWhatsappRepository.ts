
import { IWhatsappRepository } from '../contracts';
import { WhatsAppTask, WhatsAppTemplate } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseWhatsappRepository implements IWhatsappRepository {
    async getQueue(): Promise<WhatsAppTask[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('whatsapp_task_queue').select('*').order('createdAt', { ascending: false });
        return data as WhatsAppTask[] || [];
    }

    async addTask(task: WhatsAppTask): Promise<WhatsAppTask> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('whatsapp_task_queue').insert(task).select().single();
        if (error) throw error;
        return data as WhatsAppTask;
    }

    async updateTask(task: WhatsAppTask): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('whatsapp_task_queue').upsert(task);
        if (error) throw error;
    }

    async deleteTask(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('whatsapp_task_queue').delete().eq('id', id);
        if (error) throw error;
    }

    async getTemplates(): Promise<WhatsAppTemplate[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('whatsapp_templates').select('*');
        return data as WhatsAppTemplate[] || [];
    }

    async saveTemplate(template: WhatsAppTemplate): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('whatsapp_templates').upsert(template);
        if (error) throw error;
    }

    async resetTemplates(defaults: WhatsAppTemplate[]): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        // This is a dangerous operation in Prod. We clear custom templates and restore defaults.
        // For Supabase, we might just upsert defaults.
        const { error } = await supabase.from('whatsapp_templates').upsert(defaults);
        if (error) throw error;
    }
}
