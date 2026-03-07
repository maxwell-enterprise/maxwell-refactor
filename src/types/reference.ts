
export interface MasterTier {
    id: string;   // e.g. "VIP", "REGULAR"
    name: string; // e.g. "VIP Access"
    category: 'PAID' | 'COMPLIMENTARY' | 'STAFF';
    defaultColor?: string; // Hex code for UI badges
}
