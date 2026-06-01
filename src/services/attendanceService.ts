
import { 
    AttendanceRecord, Member, Event 
} from '../types/index';
import { ScanValidationResult } from '../types/attendance';
import { QRService } from './qrService';
import { DataService } from './dataService';
import { EntitlementService } from './entitlementService';
import { APP_CONFIG } from '../lib/config';
import { ExcelHelper } from '../utils/excelHelper';
import { ApiAttendanceService } from './apiAttendanceService';

// TIER MAPPING for simple checks if not in DB
const TIER_MAPPING: Record<string, 'GENERAL' | 'VIP' | 'VVIP'> = {
    'GALA_VIP': 'VIP',
    'GALA_GENERAL': 'GENERAL',
    'IMC_VIP_ACCESS': 'VIP',
    'IMC_GENERAL_ACCESS': 'GENERAL'
};

const useApiAttendance = () => !APP_CONFIG.USE_MOCK_GLOBAL && APP_CONFIG.DOMAINS.ATTENDANCE === 'API';

export const AttendanceService = {
    
    // --- CORE: Validate Scan at Gate ---
    validateGateEntry: async (
        qrString: string, 
        eventId: string, 
        gateId?: string,
        options?: { deviceId?: string },
    ): Promise<ScanValidationResult> => {
        if (useApiAttendance()) {
            return ApiAttendanceService.validateGateEntry(qrString, eventId, gateId, options);
        }
        
        // 1. Parse QR
        const qrData = QRService.parseQRString(qrString);
        if (!qrData) throw new Error("Invalid QR Format");

        // 2. Fetch Context (Event & Gate)
        const allEvents = await DataService.getEvents();
        const event = allEvents.find(e => e.id === eventId);
        if (!event) throw new Error("Event not found");

        // --- PARENT INHERITANCE LOGIC ---
        // If this event is a Child, we also need to respect the Parent's tags.
        // We simulate this by temporarily expanding the event's valid creditTags list.
        let validAccessTags = [...event.creditTags];
        if (event.parentEventId) {
            const parent = allEvents.find(e => e.id === event.parentEventId);
            if (parent && parent.creditTags) {
                // Add parent's tags (e.g. SERIES_2026_FULL) to the allowed list for this session
                validAccessTags = [...validAccessTags, ...parent.creditTags];
            }
        }

        // Gate Logic: If gateId is dynamic, find it in event.gates
        const gateConfig = event.gates?.find(g => g.id === gateId);
        // If not found, check if it's a legacy test gate, else default to strict (fail) or open (allow all)
        const allowedTiers = gateConfig?.allowedTiers || ['GENERAL', 'VIP', 'VVIP']; 

        let memberId = '';
        let ticketTier = 'GENERAL';
        let memberName = 'Guest';

        // 3. Resolve Ticket/Member
        if (qrData.type === 'TICKET') {
            // TICKET:EVENT_ID:USER_ID:ITEM_ID
            // Logic: Is this ticket for THIS event OR the PARENT event?
            // Note: ticket metadata stores 'eventId'.
            
            // Resolve actual wallet item for validation
            const parts = qrString.split(':');
            const itemId = parts.length > 3 ? parts[3] : undefined;
            
            if (itemId) {
                const item = await EntitlementService.getWalletItemById(itemId);
                if (!item) return { status: 'DENIED', message: 'Ticket invalid or revoked.' };
                if (item.status === 'USED') return { status: 'DENIED', message: 'Ticket already used.' };
                if (item.status !== 'ACTIVE') return { status: 'DENIED', message: `Ticket status: ${item.status}` };
                
                // Validate if Ticket matches Event or Parent
                const ticketEventId = item.meta?.eventId;
                const isDirectMatch = ticketEventId === eventId;
                const isParentMatch = event.parentEventId && ticketEventId === event.parentEventId;
                
                if (!isDirectMatch && !isParentMatch) {
                     return { status: 'DENIED', message: 'Ticket is for a different event series.' };
                }

                memberId = item.userId;
                ticketTier = item.meta?.targetTier || 'GENERAL';
                
                // Fetch member name
                const member = await DataService.getMembers().then(ms => ms.find(m => m.id === memberId));
                if (member) memberName = member.name;
                
            } else {
               // Fallback logic for old QRs
               memberId = parts[2];
            }

        } else if (qrData.type === 'MEMBER') {
            // MEMBER:ID
            memberId = qrData.id;
            const member = await DataService.getMembers().then(ms => ms.find(m => m.id === memberId));
            if (!member) return { status: 'DENIED', message: 'Member not found' };
            memberName = member.name;
            
            // Check entitlement for 'ON_SITE_DEDUCTION' or 'OPEN_MEMBER'
            if (event.admissionPolicy === 'OPEN_MEMBER') {
                 ticketTier = 'GENERAL'; // Allowed
            } else if (event.admissionPolicy === 'ON_SITE_DEDUCTION') {
                 // Check if member has credits matching ANY valid tag (Child or Parent)
                 const wallet = await EntitlementService.getWalletItems(memberId);
                 const passTag = (w: { meta?: { creditTag?: string; tag?: string } }) =>
                     w.meta?.creditTag ?? w.meta?.tag;
                 const pass = wallet.find((w) => {
                     const tag = passTag(w);
                     return (
                         w.type === 'CREDIT_PASS' &&
                         w.status === 'ACTIVE' &&
                         typeof tag === 'string' &&
                         validAccessTags.includes(tag) &&
                         (w.meta?.isUnlimited || (w.meta?.credits ?? 0) > 0)
                     );
                 });
                 
                 if (!pass) return { status: 'DENIED', message: 'No valid credits found.' };
                 
                 // --- ATOMIC DEDUCTION LOGIC ---
                 const deductionSuccessful = await EntitlementService.consumePassUsage(pass.id, 1, event.id);
                 
                 if (!deductionSuccessful) {
                     return { status: 'DENIED', message: 'Deduction failed (Balance low).' };
                 }

                 ticketTier = 'GENERAL';
            } else {
                 return { status: 'DENIED', message: 'Ticket required for this event.' };
            }
        } else {
            return { status: 'DENIED', message: 'Unsupported QR Type' };
        }

        // 4. Validate Tier against Gate
        // Rule: If ticket uses a Tier Name/ID, does the Gate allow it?
        // Note: We perform a loose check. Ideally, we map UUIDs.
        const isAllowed = allowedTiers.some(t => 
            t.toUpperCase() === ticketTier.toUpperCase() || 
            // Also allow if Gate says "VIP" and ticket says "VIP_EARLY_BIRD" (partial match heuristic for legacy)
            ticketTier.toUpperCase().includes(t.toUpperCase())
        );
        
        if (!isAllowed) {
            // Suggest correct gate
            const correctGate = event.gates?.find(g => g.allowedTiers.includes(ticketTier));
            return { 
                status: 'WRONG_GATE', 
                message: `This ticket (${ticketTier}) is not allowed at this gate.`,
                suggestedGate: correctGate?.name || 'Another Entrance',
                member: { id: memberId, name: memberName, tier: ticketTier as any }
            };
        }

        // 5. Success - Record Attendance
        await QRService.processScan(qrString); // Records to ledger

        return { 
            status: 'ALLOWED', 
            message: 'Entry Authorized',
            member: { id: memberId, name: memberName, tier: ticketTier as any }
        };
    },

    getAttendance: async (eventId?: string): Promise<AttendanceRecord[]> => {
        if (useApiAttendance()) {
            return ApiAttendanceService.getAttendance(eventId);
        }
        const records = await QRService.getAttendanceLog();
        if (eventId) {
            return records.filter(r => r.eventId === eventId);
        }
        return records;
    },

    exportAttendanceToCSV: (data: AttendanceRecord[], filename: string) => {
        ExcelHelper.exportToExcel(data, filename, 'Attendance');
    },

    recordAttendance: async (
        member: Member,
        event: Event,
        method: 'SELF_SCAN' | 'ADMIN_OVERRIDE' | 'LINK_CLICKED',
        options?: { venueQr?: string },
    ): Promise<AttendanceRecord> => {
        if (useApiAttendance()) {
            return ApiAttendanceService.recordAttendance(member, event, method, options);
        }

        if (method === 'SELF_SCAN' || method === 'LINK_CLICKED') {
            const wallet = await EntitlementService.getWalletItems(member.id);
            const ticket = wallet.find(w => w.type === 'TICKET' && w.meta?.eventId === event.id && w.status === 'ACTIVE');
            
            if (!ticket && event.admissionPolicy === 'PRE_BOOKED') {
                 throw new Error("ACCESS_DENIED: No valid ticket found.");
            }
        }

        const record: AttendanceRecord = {
            id: `ATT-${Date.now()}`,
            eventId: event.id,
            eventName: event.name,
            memberId: member.id,
            memberName: member.name,
            memberEmail: member.email,
            scannedAt: new Date().toISOString(),
            method: method,
            verificationCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
            eventColor: '#4F46E5', // Default
            status: 'SUCCESS'
        };
        
        return record;
    }
};
