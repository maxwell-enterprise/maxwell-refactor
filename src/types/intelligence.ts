
export type ActionCategory = 'RETENTION' | 'UPSELL' | 'B2B_REFERRAL' | 'NETWORK_GROWTH' | 'LOYALTY';

export interface NextBestAction {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  impactScore: number; // 1-100 (Potential Revenue/Impact)
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  ctaLabel: string;
  suggestedChannel: 'WHATSAPP' | 'EMAIL' | 'MEETING';
}

export interface MemberPulse {
  lifetimeValue: number;
  engagementScore: number; // 0-100
  churnRisk: number; // 0-100
  affinityLevel: 'LOW' | 'NEUTRAL' | 'HIGH' | 'EVANGELIST';
  nextBestActions: NextBestAction[];
  growthPath: string; // e.g., "From Participant to Certified Coach"
}
