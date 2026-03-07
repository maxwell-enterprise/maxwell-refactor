
import { UserRole } from './index';

// --- PAYOUT ENGINE TYPES (Shared Logic for Commission & Royalty) ---
export type PayoutType = 'COMMISSION_PERCENTAGE' | 'COMMISSION_FIXED' | 'ROYALTY_PERCENTAGE' | 'ROYALTY_FIXED';
export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface PayoutRule {
    id: string;
    beneficiaryId: string; // Facilitator ID or IP Owner ID
    beneficiaryRole: 'FACILITATOR' | 'PARTNER' | 'AUTHOR';
    targetProductId: string | 'ALL';
    type: PayoutType;
    value: number; // e.g. 10 (percent) or 500000 (fixed)
}

export interface PayoutTransaction {
    id: string;
    sourceTransactionId: string; // Link to Sales Transaction
    sourceMemberName: string; // The buyer
    productName: string;
    beneficiaryId: string;
    amount: number;
    ruleApplied: string; // Snapshot of logic
    status: PayoutStatus;
    createdAt: string;
    paidAt?: string;
}

// --- TRIBE OPS TYPES ---
export interface TribeMember {
    memberId: string;
    name: string;
    email: string;
    phone: string;
    program: string;
    joinDate: string;
    
    // Limited Operational Status
    paymentStatus: 'PAID' | 'UNPAID' | 'OVERDUE'; 
    lastInvoiceId?: string;
    nextEventDate?: string;
    nextEventName?: string;
    
    // Mentoring
    mentoringProgress: number; // 0-100%
}

export interface TribeMentoringSession {
    id: string;
    facilitatorId: string;
    title: string; // e.g., "Monthly Check-in"
    description: string;
    date: string; // ISO String
    time: string; // "19:00 WIB"
    meetingLink?: string; // Zoom/Google Meet
    attendeeIds: string[]; // List of Tribe Members
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}
