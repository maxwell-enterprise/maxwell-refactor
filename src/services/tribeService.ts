
import { TribeMember, PayoutTransaction, TribeMentoringSession } from '../types/tribe';
import { EntitlementService } from './entitlementService';
import { EnablementService } from './enablementService';
import { DataService } from './dataService';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';
import {
  mapDownlineToTribeMember,
  mapSessionRowToTribeSession,
  type TribeDownlineApiRow,
  type TribeSessionApiRow,
} from '../lib/tribeMappers';

export interface CreateTribeMemberInput {
    memberName: string;
    phone: string;
    email: string;
    positionOccupation: string;
    company: string;
    domicile: string;
    instagram: string;
    linkedin: string;
    facilitatorName: string;
}

const SEED_SESSIONS: TribeMentoringSession[] = [
    { id: 'SES-001', facilitatorId: 'fac-1', title: 'March Review', description: 'Laws of Growth', date: '2025-03-15', time: '19:00 WIB', meetingLink: 'https://zoom.us/j/123', attendeeIds: ['M002', 'M003'], status: 'SCHEDULED' }
];

const SEED_PAYOUTS: PayoutTransaction[] = [
    { id: 'PAY-001', sourceTransactionId: 'TRX-9988', sourceMemberName: 'David Pratomo', productName: 'Full Access 2025', beneficiaryId: 'fac-1', amount: 2400000, ruleApplied: '10% Commission', status: 'PAID', createdAt: '2025-01-02T10:00:00Z', paidAt: '2025-02-01T10:00:00Z' },
    { id: 'PAY-002', sourceTransactionId: 'TRX-9999', sourceMemberName: 'Julia Tan', productName: 'Masterclass Ticket', beneficiaryId: 'fac-1', amount: 150000, ruleApplied: 'Fixed Bounty', status: 'PENDING', createdAt: '2025-03-01T10:00:00Z' }
];

function membersViaApi(): boolean {
  return !APP_CONFIG.USE_MOCK && APP_CONFIG.DOMAINS.MEMBERS === 'API';
}

async function fetchTribeDownlineFromApi(): Promise<TribeMember[]> {
  const rows = await apiRequest<TribeDownlineApiRow[]>(`/me/tribe/members`);
  return rows.map((row) => mapDownlineToTribeMember(row));
}

async function fetchTribeSessionsFromApi(): Promise<TribeMentoringSession[]> {
  const rows = await apiRequest<TribeSessionApiRow[]>(`/me/tribe/sessions`);
  return rows.map((row) => mapSessionRowToTribeSession(row));
}

export const TribeService = {
    getDataSourceMode: (): 'MOCK' | 'SUPABASE' | 'API' | 'UNWIRED' => {
        if (APP_CONFIG.USE_MOCK) return 'MOCK';
        if (membersViaApi()) return 'API';
        if (supabase) return 'SUPABASE';
        return 'UNWIRED';
    },
    
    getMyTribe: async (facilitatorId: string): Promise<TribeMember[]> => {
        const trimmedId = facilitatorId?.trim();
        if (!trimmedId) return [];

        if (membersViaApi()) {
            try {
                return await fetchTribeDownlineFromApi();
            } catch (error) {
                console.error('[TribeService] getMyTribe API failed:', error);
                return [];
            }
        }

        if (APP_CONFIG.USE_MOCK) {
            const allMembers = await DataService.getMembers();
            const myMembersRaw = allMembers.slice(0, 8);

            return new Promise(resolve => {
                setTimeout(async () => {
                    const enrichedPromises = myMembersRaw.map(async (m, idx) => {
                        const ent = await EntitlementService.getUserEntitlements(m.id);
                        const attempts = await EnablementService.getUserHistory(m.id);
                        const passedCount = attempts.filter(a => a.passed).length;
                        const quizScore = Math.min(100, (passedCount / 2) * 100); 
                        const attendanceCount = ent?.attributes.engagement.eventsAttendedCount || 0;
                        const attendanceScore = Math.min(100, (attendanceCount / 12) * 100);
                        return {
                            memberId: m.id, name: m.name, email: m.email, phone: m.phone, program: m.program, joinDate: m.joinMonth,
                            paymentStatus: idx === 3 ? 'OVERDUE' : (m.nTagStatus === 'Ordered' ? 'UNPAID' : 'PAID'),
                            lastInvoiceId: idx === 3 ? 'INV-LATE-99' : undefined,
                            nextEventName: 'Leadership Summit', nextEventDate: '2025-09-01', mentoringProgress: Math.round((quizScore * 0.5) + (attendanceScore * 0.3) + 16)
                        } as TribeMember;
                    });
                    const enriched = await Promise.all(enrichedPromises);
                    resolve(enriched);
                }, 300);
            });
        }
        
        if (!supabase) return [];

        const { data } = await supabase
            .from('members')
            .select('public_id, name, email, phone, program, joinMonth, lifecycleStage, tags, engagement')
            .eq('nTagStatus', trimmedId);
        if (!data?.length) return [];

        return data.map((row: Record<string, unknown>) =>
            mapDownlineToTribeMember({
                memberId: String(row.public_id ?? row.id ?? ''),
                name: String(row.name ?? ''),
                email: String(row.email ?? ''),
                phone: String(row.phone ?? ''),
                program: String(row.program ?? ''),
                joinDate: String(row.joinMonth ?? ''),
                lifecycleStage: String(row.lifecycleStage ?? 'MEMBER'),
                tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
                engagement:
                    row.engagement && typeof row.engagement === 'object'
                        ? (row.engagement as TribeDownlineApiRow['engagement'])
                        : null,
            }),
        );
    },

    getReferralLink: (facilitatorId: string): string => `${window.location.origin}/?ref=${encodeURIComponent(facilitatorId)}`,

    createMember: async (input: CreateTribeMemberInput): Promise<void> => {
        const now = new Date().toISOString().slice(0, 7);
        await apiRequest('/members', {
            method: 'POST',
            body: JSON.stringify({
                name: input.memberName.trim(),
                phone: input.phone.trim(),
                email: input.email.trim(),
                jobTitle: input.positionOccupation.trim(),
                company: input.company.trim(),
                domicile: input.domicile.trim(),
                instagram: input.instagram.trim(),
                linkedinUrl: input.linkedin.trim(),
                facilitatorName: input.facilitatorName.trim(),
                facilitatorType: 'REGISTER',
                joinMonth: now,
            }),
        });
    },

    getMyCommissions: async (facilitatorId: string): Promise<PayoutTransaction[]> => {
        if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
            const all = await apiRequest<PayoutTransaction[]>('/store/payout-transactions');
            if (facilitatorId === 'admin-1') return all;
            return all.filter((p) => p.beneficiaryId === facilitatorId);
        }
        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('payout_transactions')) await DevDatabase.bulkAdd('payout_transactions', SEED_PAYOUTS);
                const all = await DevDatabase.getAll<PayoutTransaction>('payout_transactions');
                return all.filter(p => p.beneficiaryId === facilitatorId || facilitatorId === 'admin-1');
            } catch(e) { return SEED_PAYOUTS; }
        }
        if (!supabase) return [];
        let query = supabase.from('payout_transactions').select('*');
        if (facilitatorId !== 'admin-1') query = query.eq('beneficiaryId', facilitatorId);
        const { data } = await query;
        return data || [];
    },

    getAllPayouts: async (): Promise<PayoutTransaction[]> => {
        if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
            return apiRequest<PayoutTransaction[]>('/store/payout-transactions');
        }
        if (APP_CONFIG.USE_MOCK) {
            if(await DevDatabase.isEmpty('payout_transactions')) await DevDatabase.bulkAdd('payout_transactions', SEED_PAYOUTS);
            return await DevDatabase.getAll<PayoutTransaction>('payout_transactions');
        }
        if (!supabase) return [];
        const { data } = await supabase.from('payout_transactions').select('*');
        return data || [];
    },

    markPayoutPaid: async (id: string): Promise<void> => {
        if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'API') {
            await apiRequest(`/store/payout-transactions/${encodeURIComponent(id)}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'PAID' }),
            });
            return;
        }
        if (APP_CONFIG.USE_MOCK) {
            const all = await DevDatabase.getAll<PayoutTransaction>('payout_transactions');
            const p = all.find((x) => x.id === id);
            if (p) {
                p.status = 'PAID';
                p.paidAt = new Date().toISOString();
                await DevDatabase.add('payout_transactions', p);
            }
            return;
        }
        if (!supabase) return;
        await supabase
            .from('payout_transactions')
            .update({ status: 'PAID', paidAt: new Date().toISOString() })
            .eq('id', id);
    },

    getMentoringSessions: async (facilitatorId: string): Promise<TribeMentoringSession[]> => {
        const trimmedId = facilitatorId?.trim();
        if (!trimmedId) return [];

        if (membersViaApi()) {
            try {
                return await fetchTribeSessionsFromApi();
            } catch (error) {
                console.error('[TribeService] getMentoringSessions API failed:', error);
                return [];
            }
        }

        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('tribe_mentoring_sessions')) await DevDatabase.bulkAdd('tribe_mentoring_sessions', SEED_SESSIONS);
                const all = await DevDatabase.getAll<TribeMentoringSession>('tribe_mentoring_sessions');
                return all.filter(s => s.facilitatorId === facilitatorId);
            } catch(e) { return SEED_SESSIONS; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('tribe_mentoring_sessions').select('*').eq('facilitatorId', facilitatorId);
        if (!data?.length) return [];
        return (data as TribeSessionApiRow[]).map((row) =>
            mapSessionRowToTribeSession({
                id: String(row.id),
                facilitatorId: String(row.facilitatorId),
                facilitatorName: String(row.facilitatorName ?? ''),
                eventName: String(row.eventName ?? ''),
                memberId: String(row.memberId ?? ''),
                memberName: String(row.memberName ?? ''),
                notes: String(row.notes ?? ''),
                createdAt: String(row.createdAt ?? new Date().toISOString()),
            }),
        );
    },

    createSession: async (session: Omit<TribeMentoringSession, 'id'>): Promise<TribeMentoringSession> => {
        const newSession = { ...session, id: `SES-${Date.now()}` };
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('tribe_mentoring_sessions', newSession);
            return newSession;
        }
        if (!supabase) throw new Error("No DB");
        const { data, error } = await supabase.from('tribe_mentoring_sessions').insert(newSession).select().single();
        if (error) throw error;
        return data;
    },

    generateWaLink: (phone: string, type: string, context: any) => {
        let text = '';
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        if (type === 'PAYMENT_REMINDER') text = `Hi ${context.name}, friendly reminder for invoice ${context.invoiceId}.`;
        else if (type === 'EVENT_INVITE') text = `Hi ${context.name}! Join us for ${context.eventName}?`;
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    }
};
