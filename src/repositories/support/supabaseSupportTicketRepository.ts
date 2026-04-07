import { SupportTicket } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';
import { ISupportTicketRepository } from './types';

export class SupabaseSupportTicketRepository implements ISupportTicketRepository {
  async getAll(): Promise<SupportTicket[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('updatedAt', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async create(ticket: SupportTicket): Promise<SupportTicket> {
    if (!supabase) {
      throw new Error('Supabase support ticket backend is not available.');
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticket)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async update(id: string, updates: Partial<SupportTicket>): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
    if (error) {
      throw error;
    }
  }
}
