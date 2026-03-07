import { SupportTicket, UserRole } from '../types/index';
import { MOCK_TICKETS } from '../constants';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

export const SupportService = {
    
    getTickets: async (): Promise<SupportTicket[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                const isEmpty = await DevDatabase.isEmpty('support_tickets');
                if (isEmpty) {
                    await DevDatabase.bulkAdd('support_tickets', MOCK_TICKETS);
                    return MOCK_TICKETS;
                }
                const tickets = await DevDatabase.getAll<SupportTicket>('support_tickets');
                return tickets.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            } catch (e) {
                return MOCK_TICKETS;
            }
        }

        if (!supabase) return [];
        const { data, error } = await supabase.from('support_tickets').select('*').order('updatedAt', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    createTicket: async (ticket: Partial<SupportTicket>): Promise<SupportTicket> => {
        const newTicket: SupportTicket = {
            id: `TKT-${Date.now()}`,
            memberId: ticket.memberId || '',
            memberName: ticket.memberName || 'Unknown',
            subject: ticket.subject || 'No Subject',
            description: ticket.description || '',
            priority: ticket.priority || 'MEDIUM',
            status: 'NEW',
            assignedRole: ticket.assignedRole || UserRole.OPERATIONS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('support_tickets', newTicket);
            return newTicket;
        }

        if (!supabase) throw new Error("No DB");
        const { data, error } = await supabase.from('support_tickets').insert(newTicket).select().single();
        if (error) throw error;
        return data;
    },

    updateTicket: async (id: string, updates: Partial<SupportTicket>): Promise<void> => {
        updates.updatedAt = new Date().toISOString();
        
        if (APP_CONFIG.USE_MOCK) {
            const tickets = await SupportService.getTickets();
            const existing = tickets.find(t => t.id === id);
            if (existing) {
                const updated = { ...existing, ...updates };
                await DevDatabase.add('support_tickets', updated);
            }
            return;
        }

        if (!supabase) return;
        await supabase.from('support_tickets').update(updates).eq('id', id);
    },

    resolveTicket: async (id: string, resolution: string): Promise<void> => {
        // In future, log resolution text to a separate table or notes field
        await SupportService.updateTicket(id, { status: 'RESOLVED' });
    }
};