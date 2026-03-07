import { UserEntitlements } from '../types/access';
import { ResearchResult } from '../types/research';
import { AIUsageLog } from '../types/index';
import { OpsTemplate } from '../types/ops';
import { UserGamificationProfile } from '../types/gamification';

// 1. AI USAGE LOGS
export const SEED_AI_LOGS: AIUsageLog[] = [
    {
        id: 'AI-TEST-001',
        timestamp: new Date().toISOString(),
        userId: 'admin-1',
        featureName: 'Schema Audit',
        model: 'gemini-3-pro-preview',
        prompt: 'Analyze schema...',
        response: '{"status":"ok"}',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        costUSD: 0.002,
        costIDR: 30
    }
];

// 2. GAMIFICATION PROFILES
export const SEED_GAME_PROFILES: UserGamificationProfile[] = [
    {
        userId: 'M0001',
        userName: 'David T',
        avatarUrl: '',
        totalPoints: 5000,
        currentLevel: 'Platinum',
        badges: ['EARLY_BIRD'],
        rank: 1,
        streakCount: 5
    }
];

// 3. OPS TEMPLATES
export const SEED_OPS_TEMPLATES: OpsTemplate[] = [
    {
        id: 'TPL-TEST-OPS',
        name: 'Test Workflow',
        triggerType: 'SYSTEM_EVENT',
        triggerEventId: 'PAYMENT_SUCCESS',
        items: [],
        isActive: true
    }
];

// 4. RESEARCH RESULTS
export const SEED_RESEARCH: ResearchResult[] = [
    {
        id: 'RES-001',
        memberId: 'M0001',
        timestamp: new Date().toISOString(),
        status: 'FOUND',
        personProfile: { currentRole: 'CEO', companyScale: 'Enterprise', location: 'Jakarta', professionalSummary: '', keyAchievements: [], digitalFootprint: '' },
        socialIntelligence: {
            instagramHandle: '',
            instagramFollowers: 0,
            isVerified: false,
            businessAccounts: [],
            primaryCommunity: ''
        },
        socialLinks: [],
        scoring: { willingnessToGrow: 10, abilityToPay: 10, accuracyScore: 100 },
        triage: { recommendedMaxwellProduct: '', salesStrategy: '', perceivedChallenges: [] }
    }
];

// 5. USER ENTITLEMENTS (Direct Table)
export const SEED_USER_ENTITLEMENTS: UserEntitlements[] = [
    {
        userId: 'M0001',
        permissions: ['CONTENT_LIBRARY_ACCESS'],
        attributes: {
            region: 'ID',
            joinDate: '2023-01-01',
            lifecycle: 'MEMBER',
            serviceLevel: 'VIP',
            tags: [],
            engagement: { lastActiveDate: '', eventsAttendedCount: 0, contentCompletionRate: 0, communityReputationScore: 0, leadScore: 0 },
            authority: { canSellPrograms: false, canCoachUsers: false, canVerifyCertifications: false, maxDiscountAuthority: 0 }
        },
        credits: 10
    }
];