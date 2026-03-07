
import { Member, JourneyEvent, Transaction } from '../types/index';
import { MemberPulse, NextBestAction } from '../types/intelligence';
import { ResearchResult } from '../types/research';

export const IntelligenceService = {
  /**
   * Analyzes all member data points to generate actionable suggestions
   */
  calculateMemberPulse: (
    member: Member, 
    journey: JourneyEvent[], 
    transactions: Transaction[],
    research?: ResearchResult
  ): MemberPulse => {
    const ltv = transactions.reduce((sum, t) => sum + t.amount, 0);
    const eventCount = journey.filter(e => e.category === 'ENGAGEMENT').length;
    
    // 1. Calculate Churn Risk (Logic: No activity in > 90 days = High Risk)
    const lastEvent = journey[0]?.date ? new Date(journey[0].date) : new Date(member.joinMonth);
    const daysSinceLastActivity = (Date.now() - lastEvent.getTime()) / (1000 * 60 * 60 * 24);
    const churnRisk = Math.min(100, Math.max(0, daysSinceLastActivity > 30 ? (daysSinceLastActivity - 30) * 1.5 : 0));

    // 2. Engagement Score
    const engagementScore = Math.min(100, (eventCount * 10) + (ltv > 0 ? 20 : 0));

    // 3. Generate Next Best Actions (The "Salesforce" logic)
    const nba: NextBestAction[] = [];

    // Rule A: Retention for High Churn
    if (churnRisk > 60) {
      nba.push({
        id: 'RET-01',
        category: 'RETENTION',
        title: 'Re-engagement Sequence',
        description: `Member inactive for ${Math.round(daysSinceLastActivity)} days. Send "We Miss You" gift voucher.`,
        impactScore: 40,
        priority: 'HIGH',
        ctaLabel: 'Send Retention Email',
        suggestedChannel: 'EMAIL'
      });
    }

    // Rule B: Upsell to Certification
    if (member.lifecycleStage === 'MEMBER' && ltv < 50000000) {
      nba.push({
        id: 'UP-01',
        category: 'UPSELL',
        title: 'Certification Path',
        description: 'High engagement in Masterclasses. Invite to MLCT Certification preview.',
        impactScore: 85,
        priority: 'MEDIUM',
        ctaLabel: 'Invite to MLCT',
        suggestedChannel: 'WHATSAPP'
      });
    }

    // Rule C: B2B Referral (Network Expansion)
    if (research?.personProfile?.companyScale === 'Enterprise' || (member.company && ltv > 100000000)) {
      nba.push({
        id: 'B2B-01',
        category: 'B2B_REFERRAL',
        title: 'Corporate Partnership',
        description: `Positioned at ${member.company}. Ask for referral to HR/L&D Director for corporate workshop.`,
        impactScore: 95,
        priority: 'CRITICAL',
        ctaLabel: 'Request B2B Intro',
        suggestedChannel: 'MEETING'
      });
    }

    // Rule D: Advocacy
    if (engagementScore > 80 && ltv > 20000000) {
      nba.push({
        id: 'ADV-01',
        category: 'NETWORK_GROWTH',
        title: 'Invite to Become Facilitator',
        description: 'Consistent high performer. High potential to lead their own Tribe.',
        impactScore: 70,
        priority: 'MEDIUM',
        ctaLabel: 'Offer Facilitator Role',
        suggestedChannel: 'WHATSAPP'
      });
    }

    let affinity: MemberPulse['affinityLevel'] = 'NEUTRAL';
    if (engagementScore > 75) affinity = 'EVANGELIST';
    else if (engagementScore > 40) affinity = 'HIGH';

    return {
      lifetimeValue: ltv,
      engagementScore,
      churnRisk,
      affinityLevel: affinity,
      nextBestActions: nba.sort((a,b) => b.impactScore - a.impactScore),
      growthPath: member.lifecycleStage === 'CERTIFIED' ? 'Leader to Mentor' : 'Learner to Leader'
    };
  }
};
