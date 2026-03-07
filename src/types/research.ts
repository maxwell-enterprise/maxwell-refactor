
export interface SocialLink {
  platform: 'LinkedIn' | 'Instagram' | 'Facebook' | 'Website' | 'Twitter' | 'Other';
  url: string;
  confidence: number;
  snippet?: string;
}

export interface ResearchResult {
  id: string;
  memberId: string;
  timestamp: string;
  status: 'FOUND' | 'AMBIGUOUS' | 'NOT_FOUND';
  
  personProfile: {
    currentRole: string;
    companyScale: string;
    location: string;
    professionalSummary: string;
    keyAchievements: string[];
    digitalFootprint: string;
  };

  // NEW: Dedicated Social Intelligence for Mapping
  socialIntelligence: {
    instagramHandle: string;
    instagramFollowers: number; // Estimate from snippets
    isVerified: boolean;
    businessAccounts: string[]; // Associated brands found in bio
    primaryCommunity: string; // e.g. HIPMI, JCI
  };
  
  socialLinks: SocialLink[];
  
  scoring: {
    willingnessToGrow: number;
    abilityToPay: number;
    accuracyScore: number;
  };
  
  triage: {
    recommendedMaxwellProduct: string;
    salesStrategy: string;
    perceivedChallenges: string[];
  };

  alternativeMatches?: Array<{
    title: string;
    description: string;
    links: string[];
  }>;
  
  groundingLinks?: { title: string; uri: string }[];
}

export interface ResearchContext {
  fullName: string;
  email?: string;
  company?: string;
  city?: string;
  targetMemberId?: string;
  userId?: string;
  featureName?: string;
}
