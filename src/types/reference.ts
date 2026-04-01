
export interface MasterTier {
    id: string; // Business code, e.g. "VIP", "REGULAR"
    backendId?: string; // UUID row id from BE when available
    name: string; // e.g. "VIP Access"
    description?: string;
    basePriceIdr?: number;
    createdAt?: string;
    // Legacy presentation fields kept optional for mock-only UI compatibility.
    category?: 'PAID' | 'COMPLIMENTARY' | 'STAFF';
    defaultColor?: string;
}
