
import { ICommunicationRepository } from '../contracts';
import { EmailCampaign, EmailLog, EmailTemplate } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseCommunicationRepository implements ICommunicationRepository {
    async getTemplates(): Promise<EmailTemplate[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('email_templates').select('*');
        return data as EmailTemplate[] || [];
    }

    async getCampaigns(): Promise<EmailCampaign[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('email_campaigns').select('*').order('createdAt', { ascending: false });
        return data as EmailCampaign[] || [];
    }

    async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('email_campaigns').insert(campaign).select().single();
        if (error) throw error;
        return data as EmailCampaign;
    }

    async getLogs(): Promise<EmailLog[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('email_logs').select('*').order('sentAt', { ascending: false });
        return data as EmailLog[] || [];
    }

    async createLog(log: EmailLog): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('email_logs').insert(log);
        if (error) throw error;
    }
}
