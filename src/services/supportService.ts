import { SupportTicket, UserRole } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { MockSupportTicketRepository } from '../repositories/support/mockSupportTicketRepository';
import { SupabaseSupportTicketRepository } from '../repositories/support/supabaseSupportTicketRepository';
import { ApiSupportTicketRepository } from '../repositories/support/apiSupportTicketRepository';
import { NoopSupportTicketRepository } from '../repositories/support/noopSupportTicketRepository';
import { ISupportTicketRepository } from '../repositories/support/types';

type SupportBackendMode = 'MOCK' | 'SUPABASE' | 'API' | 'NONE';

let supportRepo: ISupportTicketRepository | null = null;

function getSupportBackendMode(): SupportBackendMode {
    const preferred = process.env.NEXT_PUBLIC_SUPPORT_BACKEND?.toUpperCase();

    if (preferred === 'API') return 'API';
    if (preferred === 'SUPABASE') return 'SUPABASE';
    if (preferred === 'MOCK') return 'MOCK';
    if (APP_CONFIG.USE_MOCK) return 'MOCK';
    if (APP_CONFIG.SUPABASE_URL && APP_CONFIG.SUPABASE_ANON_KEY && !APP_CONFIG.EXTERNAL_API_ONLY) {
        return 'SUPABASE';
    }

    return 'NONE';
}

function getSupportRepository(): ISupportTicketRepository {
    if (supportRepo) return supportRepo;

    const mode = getSupportBackendMode();

    if (mode === 'API') {
        supportRepo = new ApiSupportTicketRepository();
    } else if (mode === 'SUPABASE') {
        supportRepo = new SupabaseSupportTicketRepository();
    } else if (mode === 'MOCK') {
        supportRepo = new MockSupportTicketRepository();
    } else {
        supportRepo = new NoopSupportTicketRepository();
    }

    return supportRepo;
}

export const SupportService = {
    
    getTickets: async (): Promise<SupportTicket[]> => {
        return await getSupportRepository().getAll();
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

        return await getSupportRepository().create(newTicket);
    },

    updateTicket: async (id: string, updates: Partial<SupportTicket>): Promise<void> => {
        await getSupportRepository().update(id, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    resolveTicket: async (id: string, resolution: string): Promise<void> => {
        // In future, log resolution text to a separate table or notes field
        await SupportService.updateTicket(id, { status: 'RESOLVED' });
    }
};
