
export type CertificationLogic = 'REQUIRE_ALL' | 'REQUIRE_ANY' | 'MIN_COUNT';

// NEW: Global Registry for Done Tags
export interface MasterDoneTag {
    id: string;
    code: string; // The value stored in Event.doneTag (e.g., "DONE_SESSION_A1")
    label: string; // Human readable name (e.g., "Module A1 Completion")
    category: 'CORE' | 'ELECTIVE' | 'SPECIAL';
    description?: string;
}

export interface CertificationRule {
    id: string;
    name: string;
    description: string;
    badgeUrl?: string; // Icon for the certificate
    
    // Logic Configuration
    logic: CertificationLogic;
    requiredTags: string[]; // List of DoneTags required
    minCountValue?: number; // If logic is MIN_COUNT, how many tags are needed?
    tagWeights?: Record<string, number>; // Optional weighted score per required tag
    
    // Metadata
    isActive: boolean;
    validityPeriodMonths?: number; // 0 = Lifetime
}

export interface MemberAchievement {
    id: string; // Unique instance ID
    ruleId: string;
    name: string;
    issuedAt: string;
    expiryDate?: string;
    metadata?: any;
}
