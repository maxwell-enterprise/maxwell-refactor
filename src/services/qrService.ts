
import { QRData, ScanResult, QRType } from '../types/qr';
import { AttendanceRecord } from '../types/index';
import { EVENTS_DATA, MEMBER_DATA } from '../constants';
import { OpsService } from './opsService';
import { EntitlementService } from './entitlementService'; 
import { GamificationService } from './gamificationService'; 
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

// --- ATTENDANCE LEDGER (Local Cache) ---
// In a real app, this is synced periodically with the server in the background
let ATTENDANCE_LEDGER: AttendanceRecord[] = [
    { 
        id: 'SCAN-001', 
        eventId: 'EVT-2024-X00', 
        eventName: 'Developing Leaders', 
        memberId: 'M001',
        memberName: 'System User',
        memberEmail: 'system@example.com', 
        scannedAt: '2024-09-21T09:00:00Z', 
        method: 'GATE_SCAN',
        verificationCode: 'LEGACY',
        eventColor: '#4F46E5',
        ticketUniqueId: 'EVT-2024-X00_M001',
        scannerDevice: 'Gate-A', 
        status: 'SUCCESS' 
    }
];

export const QRService = {

  generateQRString: (data: QRData): string => {
    return `${data.type}:${data.id}:${data.subId || ''}`;
  },

  parseQRString: (raw: string): QRData | null => {
    try {
      const parts = raw.split(':');
      if (parts.length < 2) return null;
      return {
        type: parts[0] as QRType,
        id: parts[1],
        subId: parts[2] || undefined
      };
    } catch (e) {
      return null;
    }
  },

  /**
   * HYBRID SCAN PROCESSOR
   * 1. Checks Local Cache first (Instant rejection if known duplicate).
   * 2. Attempts Server Verification with short timeout (800ms).
   * 3. Falls back to allowing entry if server is slow (Priority: Queue Speed).
   */
  processScan: async (rawString: string): Promise<ScanResult> => {
    const data = QRService.parseQRString(rawString);
    if (!data) {
      return { success: false, message: 'Invalid QR Format', timestamp: new Date().toISOString() };
    }

    switch (data.type) {
      case 'TICKET':
        return handleTicketScan(data);
      case 'MEMBER':
        return handleMemberScan(data);
      default:
        return { success: false, message: 'Unknown QR Type', timestamp: new Date().toISOString() };
    }
  },

  getAttendanceLog: async (): Promise<AttendanceRecord[]> => {
      // In real scenario, this merges Local Storage + Server Data
      return new Promise(resolve => setTimeout(() => resolve(ATTENDANCE_LEDGER), 200));
  }
};

// --- INTERNAL HANDLERS ---

const handleTicketScan = async (data: QRData): Promise<ScanResult> => {
  const eventId = data.id;
  const userId = data.subId;
  const ticketUniqueId = `${eventId}_${userId}`;

  // 1. LOCAL CHECK (Instant)
  // Check if WE (this device) scanned it recently
  const localDuplicate = ATTENDANCE_LEDGER.find(r => r.ticketUniqueId === ticketUniqueId && r.status === 'SUCCESS');
  if (localDuplicate) {
    return { success: false, message: 'Double Entry Detected (Local)', timestamp: new Date().toISOString() };
  }

  // 2. SERVER CHECK (Optimistic with Timeout)
  // We try to ask the server "Has anyone else scanned this?"
  let serverCheckPassed = true;
  
  if (!APP_CONFIG.USE_MOCK && supabase) {
      try {
          // Create a promise that rejects after 800ms
          const timeout = new Promise((_, reject) => setTimeout(() => reject('TIMEOUT'), 800));
          
          // Actual DB Check
          const dbCheck = supabase
            .from('event_attendance_ledger')
            .select('id')
            .eq('ticketUniqueId', ticketUniqueId)
            .single();

          const result: any = await Promise.race([dbCheck, timeout]);
          
          if (result && result.data) {
              // Found in DB -> Duplicate from another gate!
              return { success: false, message: 'Ticket Used at Another Gate', timestamp: new Date().toISOString() };
          }
      } catch (e) {
          // If timeout or network error, we proceed with "Offline Acceptance"
          // We prioritize queue speed over strict global consistency.
          console.warn("[QR] Server check skipped/timed-out. Proceeding in Offline Mode.");
      }
  }

  // 3. VALIDATE EVENT
  const event = EVENTS_DATA.find(e => e.id === eventId || e.classId === eventId);
  if (!event) {
    return { success: false, message: 'Event not found', timestamp: new Date().toISOString() };
  }

  // Fetch Member Details for record
  const member = MEMBER_DATA.find(m => m.id === userId);

  // 4. COMMIT SCAN
  const record: AttendanceRecord = {
      id: `SCAN-${Date.now()}`,
      ticketUniqueId,
      eventId: event.id,
      eventName: event.name,
      memberId: userId || 'unknown',
      memberName: member?.name || 'Guest User',
      memberEmail: member?.email || 'N/A',
      scannedAt: new Date().toISOString(),
      method: 'GATE_SCAN',
      verificationCode: userId ? userId.substring(0, 6).toUpperCase() : 'GUEST',
      eventColor: '#4F46E5', // Default
      scannerDevice: 'Web-Scanner', // ID of this device
      status: 'SUCCESS'
  };
  
  // Write to local ledger immediately
  ATTENDANCE_LEDGER.unshift(record);

  // 5. ASYNC SYNC (Fire and forget)
  if (!APP_CONFIG.USE_MOCK && supabase) {
      supabase.from('event_attendance_ledger').insert(record).then(({ error }) => {
          if (error) console.error("Background sync failed", error);
      });
  }

  // 6. BUSINESS LOGIC (Trigger Automation)
  if (userId) {
      OpsService.handleSystemTrigger('EVENT_CHECK_IN', { memberId: userId });
      EntitlementService.recordEventAttendance(userId);
      GamificationService.processTrigger(userId, 'EVENT_CHECK_IN', { eventId: event.id, timestamp: record.scannedAt });
      
      // Early Bird Check
      try {
          const eventTimeStr = event.recurringMeta?.time || "09:00"; 
          const eventStart = new Date(`${event.date}T${eventTimeStr.split(' ')[0]}:00`); 
          const scanTime = new Date();
          const diffMinutes = (eventStart.getTime() - scanTime.getTime()) / 60000;

          if (diffMinutes >= 30) {
              GamificationService.processTrigger(userId, 'EVENT_EARLY_ARRIVAL');
          }
      } catch (e) {}
  }

  return { 
    success: true, 
    message: `Access Granted: ${event.name}`, 
    data: event,
    timestamp: new Date().toISOString() 
  };
};

const handleMemberScan = async (data: QRData): Promise<ScanResult> => {
  const memberId = data.id;
  const member = MEMBER_DATA.find(m => m.id === memberId);

  if (!member) {
    return { success: false, message: 'Member not found', timestamp: new Date().toISOString() };
  }

  return { 
    success: true, 
    message: `Verified: ${member.name} (${member.category})`, 
    data: member,
    timestamp: new Date().toISOString() 
  };
};
