
import { IWorkflowRepository } from '../contracts';
import { OpsTemplate, OpsChecklist } from '../../types/ops';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseWorkflowRepository implements IWorkflowRepository {
    // --- TEMPLATES ---
    async getTemplates(): Promise<OpsTemplate[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('ops_templates').select('*');
        if (error) {
            console.error("Supabase Template Fetch Error:", error);
            return [];
        }
        return data as OpsTemplate[];
    }

    async saveTemplate(template: OpsTemplate): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('ops_templates').upsert(template);
        if (error) throw error;
    }

    async deleteTemplate(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('ops_templates').delete().eq('id', id);
        if (error) throw error;
    }

    // --- CHECKLISTS ---
    async getChecklists(): Promise<OpsChecklist[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        // We fetch checklists. The 'tasks' field is JSONB in Supabase so it auto-maps to our types
        const { data, error } = await supabase.from('ops_checklists').select('*');
        if (error) {
            console.error("Supabase Checklist Fetch Error:", error);
            return [];
        }
        return data as OpsChecklist[];
    }

    async getChecklistById(id: string): Promise<OpsChecklist | undefined> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('ops_checklists').select('*').eq('id', id).single();
        if (error) return undefined;
        return data as OpsChecklist;
    }

    async saveChecklist(checklist: OpsChecklist): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('ops_checklists').upsert(checklist);
        if (error) throw error;
    }
}
