
import { TribeMember, PayoutTransaction, TribeMentoringSession, PayoutRule } from '../types/tribe';
import { MEMBER_DATA } from '../constants';
import { EntitlementService } from './entitlementService';
import { EnablementService } from './enablementService';
import { DataService } from './dataService'; // Import DataService
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

const SEED_SESSIONS: TribeMentoringSession[] = [
    { id: 'SES-001', facilitatorId: 'fac-1', title: 'March Review', description: 'Laws of Growth', date: '2025-03-15', time: '19:00 WIB', meetingLink: 'https://zoom.us/j/123', attendeeIds: ['M002', 'M003'], status: 'SCHEDULED' }
];

const SEED_PAYOUTS: PayoutTransaction[] = [
    { id: 'PAY-001', sourceTransactionId: 'TRX-9988', sourceMemberName: 'David Pratomo', productName: 'Full Access 2025', beneficiaryId: 'fac-1', amount: 2400000, ruleApplied: '10% Commission', status: 'PAID', createdAt: '2025-01-02T10:00:00Z', paidAt: '2025-02-01T10:00:00Z' },
    { id: 'PAY-002', sourceTransactionId: 'TRX-9999', sourceMemberName: 'Julia Tan', productName: 'Masterclass Ticket', beneficiaryId: 'fac-1', amount: 150000, ruleApplied: 'Fixed Bounty', status: 'PENDING', createdAt: '2025-03-01T10:00:00Z' }
];

export const TribeService = {
    
    getMyTribe: async (facilitatorId: string): Promise<TribeMember[]> => {
        if (APP_CONFIG.USE_MOCK) {
            // FETCH REAL PERSISTENT DATA instead of static seed
            const allMembers = await DataService.getMembers();
            // In a real app, filtering would be by 'assignedFacilitatorId'
            // For mock, we simply take a slice to simulate the facilitator's group
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
        return []; 
    },

    getReferralLink: (facilitatorId: string): string => `${window.location.origin}/register?ref=${facilitatorId}`,

    getMyCommissions: async (facilitatorId: string): Promise<PayoutTransaction[]> => {
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
        if (APP_CONFIG.USE_MOCK) {
            if(await DevDatabase.isEmpty('payout_transactions')) await DevDatabase.bulkAdd('payout_transactions', SEED_PAYOUTS);
            return await DevDatabase.getAll<PayoutTransaction>('payout_transactions');
        }
        if (!supabase) return [];
        const { data } = await supabase.from('payout_transactions').select('*');
        return data || [];
    },

    getMentoringSessions: async (facilitatorId: string): Promise<TribeMentoringSession[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('tribe_mentoring_sessions')) await DevDatabase.bulkAdd('tribe_mentoring_sessions', SEED_SESSIONS);
                const all = await DevDatabase.getAll<TribeMentoringSession>('tribe_mentoring_sessions');
                return all.filter(s => s.facilitatorId === facilitatorId);
            } catch(e) { return SEED_SESSIONS; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('tribe_mentoring_sessions').select('*').eq('facilitatorId', facilitatorId);
        return data || [];
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
