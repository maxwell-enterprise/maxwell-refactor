
export type TicketTier = 'GENERAL' | 'VIP' | 'VVIP' | 'CREW' | 'SPEAKER';

export interface GateDefinition {
    id: string;
    label: string; // e.g. "Main Entrance A"
    allowedTiers: TicketTier[]; // e.g. ['GENERAL', 'VIP']
    location?: string;
}

// NEW: Per-Event Configuration
export interface EventGateConfig {
    id: string;
    name: string; // e.g., "North Gate", "VIP Lobby"
    allowedTiers: string[]; // ['VIP', 'VVIP']
    assignedUserIds: string[]; // List of User IDs authorized to scan here
    isActive: boolean;
}

export interface ActiveScanSession {
    scannerId: string; // Browser/Device ID
    eventId: string;
    gateId: string;
    startedAt: string;
    operatorName: string;
}

export interface ScanValidationResult {
    status: 'ALLOWED' | 'DENIED' | 'WRONG_GATE';
    message: string;
    member?: {
        id: string;
        name: string;
        tier: TicketTier;
    };
    suggestedGate?: string; // If WRONG_GATE
}

export interface AttendanceRecord {
    id: string;
    eventId: string;
    eventName: string;
    memberId: string;
    memberName: string;
    memberEmail: string;
    scannedAt: string;
    method: 'GATE_SCAN' | 'SELF_SCAN' | 'ADMIN_OVERRIDE' | 'LINK_CLICKED';
    verificationCode: string;
    eventColor: string;
    gateId?: string;
    sessionId?: string; // NEW: Tracks which specific session (Day 1, Morning, etc.) was attended
    ticketTier?: string;
    status?: 'SUCCESS' | 'DUPLICATE' | 'INVALID' | 'SYNC_PENDING'; // Optional for local ledger logic
    ticketUniqueId?: string; // Optional linkage
    scannerDevice?: string;
    scannedByUserId?: string | null;
}
