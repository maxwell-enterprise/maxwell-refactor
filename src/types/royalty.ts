
export interface RoyaltyContract {
    id: string;
    productId: string;
    beneficiaryId: string; // User ID of the partner/author
    beneficiaryRole: 'AUTHOR' | 'PARTNER' | 'REFERRER';
    percentage: number; // 0-100
    isActive: boolean;
    validFrom: string;
    validUntil?: string;
}
