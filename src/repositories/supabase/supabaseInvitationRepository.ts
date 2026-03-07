
import { IInvitationRepository } from '../contracts';
import { EventInvitation } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseInvitationRepository implements IInvitationRepository {
    async getMemberInvitations(memberId: string): Promise<EventInvitation[]> {
        if (!supabase) throw new Error("Supabase not initialized");
        const { data } = await supabase.from('event_invitations')
            .select('*')
            .eq('memberId', memberId)
            .order('sentAt', { ascending: false });
        return data as EventInvitation[] || [];
    }

    async createInvitations(invitations: EventInvitation[]): Promise<void> {
        if (!supabase) throw new Error("Supabase not initialized");
        const { error } = await supabase.from('event_invitations').insert(invitations);
        if (error) throw error;
    }

    async updateInvitation(invitation: EventInvitation): Promise<void> {
        if (!supabase) throw new Error("Supabase not initialized");
        const { error } = await supabase.from('event_invitations').upsert(invitation);
        if (error) throw error;
    }

    async getAll(): Promise<EventInvitation[]> {
        if (!supabase) throw new Error("Supabase not initialized");
        const { data } = await supabase.from('event_invitations').select('*');
        return data as EventInvitation[] || [];
    }
}
