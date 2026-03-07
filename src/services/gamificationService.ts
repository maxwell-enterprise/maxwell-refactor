
import { Badge, PointRule, UserGamificationProfile, PointTriggerType } from '../types/gamification';
import { RepositoryFactory } from './repositories/index';

// SEED DATA moved to MockRepository to keep Service clean and data agnostic

export const GamificationService = {
    
    // Init logic is now handled implicitly by the Repository (ensureSeeded)
    // We keep this for backward compatibility if needed, but it effectively does nothing now in this layer
    init: async () => {},

    getBadges: async (): Promise<Badge[]> => {
        return await RepositoryFactory.getGamificationRepository().getBadges();
    },

    getRules: async (): Promise<PointRule[]> => {
        return await RepositoryFactory.getGamificationRepository().getRules();
    },

    updateRules: async (newRules: PointRule[]) => { 
        const repo = RepositoryFactory.getGamificationRepository();
        for (const rule of newRules) {
            await repo.upsertRule(rule);
        }
    },

    updateBadges: async (newBadges: Badge[]) => { 
        const repo = RepositoryFactory.getGamificationRepository();
        for (const badge of newBadges) {
            await repo.upsertBadge(badge);
        }
    },

    getUserProfile: async (userId: string): Promise<UserGamificationProfile | null> => {
        return await RepositoryFactory.getGamificationRepository().getProfile(userId);
    },

    getAllProfiles: async (): Promise<UserGamificationProfile[]> => {
        return await RepositoryFactory.getGamificationRepository().getAllProfiles();
    },

    getLeaderboard: async (): Promise<UserGamificationProfile[]> => {
        const repo = RepositoryFactory.getGamificationRepository();
        const profiles = await repo.getAllProfiles();
        
        // Sorting logic kept here to ensure consistency regardless of DB source
        const sorted = profiles.sort((a,b) => b.totalPoints - a.totalPoints);
        
        return sorted.map((p, idx) => {
            let level = 'Bronze';
            if (p.totalPoints > 3000) level = 'Platinum';
            else if (p.totalPoints > 1500) level = 'Gold';
            else if (p.totalPoints > 500) level = 'Silver';

            return { ...p, rank: idx + 1, currentLevel: level };
        });
    },

    /**
     * CORE LOGIC: Calculates points and badges based on events.
     * This logic is DB-agnostic and relies on the Repository only for reading/saving state.
     */
    processTrigger: async (userId: string, trigger: PointTriggerType, context?: any) => {
        const repo = RepositoryFactory.getGamificationRepository();
        
        // 1. FETCH PROFILE
        let profile = await repo.getProfile(userId);

        if (!profile) {
            profile = {
                userId,
                userName: context?.userName || 'Member',
                totalPoints: 0,
                currentLevel: 'Bronze',
                badges: [],
                rank: 0,
                streakCount: 0,
                avatarUrl: ''
            };
        }

        let pointsAwarded = 0;

        // 2. CALCULATE POINTS
        const rules = await repo.getRules();
        const rule = rules.find(r => r.triggerType === trigger && r.isActive);
        if (rule) {
            let pts = rule.points;
            if (trigger === 'PURCHASE_COMPLETE' && context?.amount) {
                pts = Math.floor(context.amount / 100000) * rule.points; 
            }
            pointsAwarded += pts;
        }

        // 3. HANDLE STREAK
        if (trigger === 'EVENT_CHECK_IN') {
            profile.streakCount += 1;
            if (profile.streakCount % 3 === 0) {
                console.log(`[GAMIFICATION] Streak of ${profile.streakCount} hit!`);
                // Recursive call for streak bonus
                await GamificationService.processTrigger(userId, 'STREAK_3_EVENTS');
            }
        }

        // 4. CHECK BADGES
        const allBadges = await repo.getBadges();
        const potentialBadges = allBadges.filter(b => b.autoTrigger === trigger && !profile?.badges.includes(b.id));
        
        potentialBadges.forEach(badge => {
            let thresholdMet = true;
            if (badge.triggerThreshold) {
                if (trigger === 'PURCHASE_COMPLETE' && (!context?.amount || context.amount < badge.triggerThreshold)) {
                    thresholdMet = false;
                }
            }

            if (thresholdMet) {
                profile?.badges.push(badge.id);
                pointsAwarded += badge.pointBonus;
                // We could log badge award here
            }
        });

        // 5. COMMIT UPDATES
        profile.totalPoints += pointsAwarded;
        
        // Recalculate Level
        if (profile.totalPoints > 3000) profile.currentLevel = 'Platinum';
        else if (profile.totalPoints > 1500) profile.currentLevel = 'Gold';
        else if (profile.totalPoints > 500) profile.currentLevel = 'Silver';
        
        await repo.upsertProfile(profile);
    }
};
