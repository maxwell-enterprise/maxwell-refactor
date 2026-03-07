
import { IGamificationRepository } from '../contracts';
import { Badge, PointRule, UserGamificationProfile } from '../../types/gamification';
import { DevDatabase } from '../../utils/devDatabase';
import { MEMBER_DATA } from '../../constants';

// --- SEEDS MOVED FROM SERVICE ---
const SEED_BADGES: Badge[] = [
    {
        id: 'BG-001', code: 'EARLY_BIRD', name: 'Early Riser', description: 'Checked in 30 mins before start.',
        icon: 'Sunrise', rarity: 'COMMON', pointBonus: 50, autoTrigger: 'EVENT_EARLY_ARRIVAL'
    },
    {
        id: 'BG-002', code: 'STREAK_MASTER', name: 'Momentum Keeper', description: 'Attended 3 events in a row.',
        icon: 'Flame', rarity: 'RARE', pointBonus: 150, autoTrigger: 'STREAK_3_EVENTS'
    },
    {
        id: 'BG-003', code: 'TOP_SPENDER', name: 'Visionary Investor', description: 'Invested in growth (Large Transaction).',
        icon: 'Gem', rarity: 'EPIC', pointBonus: 500, autoTrigger: 'PURCHASE_COMPLETE', triggerThreshold: 10000000
    },
    {
        id: 'BG-004', code: 'CONNECTOR', name: 'Influence Builder', description: 'Referred a new member.',
        icon: 'Users', rarity: 'LEGENDARY', pointBonus: 200, autoTrigger: 'REFERRAL_SUCCESS'
    },
];

const SEED_RULES: PointRule[] = [
    { id: 'RULE-1', triggerType: 'EVENT_CHECK_IN', points: 100, description: 'Base points for attending any event', isActive: true },
    { id: 'RULE-2', triggerType: 'EVENT_EARLY_ARRIVAL', points: 50, description: 'Bonus for punctuality (On-time)', isActive: true },
    { id: 'RULE-3', triggerType: 'REFERRAL_SUCCESS', points: 200, description: 'Points per new member invited', isActive: true },
    { id: 'RULE-4', triggerType: 'PURCHASE_COMPLETE', points: 10, description: 'Points per transaction (scaled)', isActive: true },
];

export class MockGamificationRepository implements IGamificationRepository {

    private async ensureSeeded() {
        // Profiles
        if (await DevDatabase.isEmpty('gamification_profiles')) {
            const initialProfiles: UserGamificationProfile[] = MEMBER_DATA.map((m) => ({
                userId: m.id,
                userName: m.name,
                avatarUrl: `https://ui-avatars.com/api/?name=${m.name.replace(' ', '+')}&background=random`,
                totalPoints: 0,
                currentLevel: 'Bronze',
                badges: [],
                rank: 0,
                streakCount: 0
            }));
            await DevDatabase.bulkAdd('gamification_profiles', initialProfiles);
        }
        // Badges
        if (await DevDatabase.isEmpty('gamification_badges')) {
            await DevDatabase.bulkAdd('gamification_badges', SEED_BADGES);
        }
        // Rules
        if (await DevDatabase.isEmpty('gamification_rules')) {
            await DevDatabase.bulkAdd('gamification_rules', SEED_RULES);
        }
    }

    async getBadges(): Promise<Badge[]> {
        await this.ensureSeeded();
        return await DevDatabase.getAll<Badge>('gamification_badges');
    }

    async upsertBadge(badge: Badge): Promise<void> {
        await DevDatabase.add('gamification_badges', badge);
    }

    async getRules(): Promise<PointRule[]> {
        await this.ensureSeeded();
        return await DevDatabase.getAll<PointRule>('gamification_rules');
    }

    async upsertRule(rule: PointRule): Promise<void> {
        await DevDatabase.add('gamification_rules', rule);
    }

    async getProfile(userId: string): Promise<UserGamificationProfile | null> {
        await this.ensureSeeded();
        const all = await DevDatabase.getAll<UserGamificationProfile>('gamification_profiles');
        const found = all.find(p => p.userId === userId);
        if (found) {
            // Calculate Rank dynamically for consistency in Mock
            const sorted = all.sort((a, b) => b.totalPoints - a.totalPoints);
            const rank = sorted.findIndex(p => p.userId === userId) + 1;
            return { ...found, rank };
        }
        return null;
    }

    async getAllProfiles(): Promise<UserGamificationProfile[]> {
        await this.ensureSeeded();
        return await DevDatabase.getAll<UserGamificationProfile>('gamification_profiles');
    }

    async upsertProfile(profile: UserGamificationProfile): Promise<void> {
        await DevDatabase.add('gamification_profiles', profile);
    }
}
