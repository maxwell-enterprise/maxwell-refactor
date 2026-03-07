
import { JourneyEvent, Member } from '../types/index';
import { MEMBER_DATA } from '../constants';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

// Helper to generate initial seed data if DB is empty
const generateSeedLogs = (members: Member[]): JourneyEvent[] => {
    const events: JourneyEvent[] = [];
    members.forEach(member => {
        let joinDate = new Date();
        if (member.joinMonth.match(/^\d{4}-\d{2}$/)) joinDate = new Date(`${member.joinMonth}-01`);
        
        const idPrefix = member.id;
        events.push({
            id: `${idPrefix}-1`,
            date: new Date(joinDate.getTime() - 86400000 * 15).toISOString(),
            userId: member.id,
            category: 'ACQUISITION',
            title: 'Guest Visit',
            description: 'User visited Landing Page via campaign.',
            metadata: { campaignSource: 'organic' }
        });
        events.push({
            id: `${idPrefix}-4`,
            date: joinDate.toISOString(),
            userId: member.id,
            category: 'COMMERCE',
            title: 'Membership Purchased',
            description: `Purchased ${member.program}.`,
            metadata: { revenue: 24000000 }
        });
    });
    return events;
};

export const AuditService = {
    
    getAllLogs: async (): Promise<JourneyEvent[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                const isEmpty = await DevDatabase.isEmpty('member_activity_logs');
                if (isEmpty) {
                    const seed = generateSeedLogs(MEMBER_DATA);
                    await DevDatabase.bulkAdd('member_activity_logs', seed);
                    return seed;
                }
                return await DevDatabase.getAll<JourneyEvent>('member_activity_logs');
            } catch (e) {
                return [];
            }
        }

        if (!supabase) return [];
        const { data } = await supabase.from('member_activity_logs').select('*').order('date', { ascending: false });
        return data || [];
    },

    getUserJourney: async (member: Member): Promise<JourneyEvent[]> => {
        const allLogs = await AuditService.getAllLogs(); // This handles seed check
        return allLogs
            .filter(e => e.userId === member.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    logRealtimeEvent: async (event: Omit<JourneyEvent, 'id' | 'date'>): Promise<void> => {
        const newEvent: JourneyEvent = {
            id: `EVT-${Date.now()}`,
            date: new Date().toISOString(),
            ...event
        };
        
        console.log(`[AUDIT] ${event.category}: ${event.title}`);

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('member_activity_logs', newEvent);
            return;
        }

        if (supabase) {
            await supabase.from('member_activity_logs').insert(newEvent);
        }
    },

    analyzeUserBehavior: (events: JourneyEvent[]) => {
        const eventCount = events.filter(e => e.category === 'ENGAGEMENT').length;
        const totalSpent = events.reduce((sum, e) => sum + (e.metadata?.revenue || 0), 0);

        let label = 'Standard Member';
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
        let insight = 'Regular participation patterns detected.';

        if (totalSpent > 30000000) {
            label = 'High Value Member';
            sentiment = 'positive';
            insight = 'Top 5% spender. Recommend VIP upgrade for next cycle.';
        } else if (eventCount > 5) {
            label = 'Community Pillar';
            sentiment = 'positive';
            insight = 'Highly active in events. Good candidate for Facilitator role.';
        }

        return { label, sentiment, insight, totalSpent, eventCount };
    }
};