
export type CommissionType = 'PERCENTAGE_ON_SALES' | 'FIXED_AMOUNT';
export type BeneficiaryBasis = 'DIRECT_REFERRER' | 'ASSIGNED_MENTOR' | 'SALES_AGENT' | 'MANUAL';

export interface CommissionRule {
    id: string;
    name: string;
    description?: string;
    targetProductId: string | 'ALL'; // Specific product or global rule
    beneficiaryRole: string | 'ALL'; // e.g. Only FACILITATOR gets this, or ANYONE
    beneficiaryBasis: BeneficiaryBasis; // NEW: The relationship logic
    type: CommissionType;
    value: number; // e.g. 10 (percent) or 500000 (IDR)
    isActive: boolean;
}

export interface CommissionCandidate {
    transactionId: string;
    buyerId: string;
    buyerName: string;
    amount: number;
    productName: string;
    date: string;
    suggestedBeneficiary?: {
        id: string;
        name: string;
        role: string;
        reason: string; // e.g. "Direct Referrer (Sponsor)"
    };
}
