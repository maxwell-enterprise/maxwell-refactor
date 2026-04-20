import { AttendanceRecord } from '../types/attendance';
import { Member, Event } from '../types/index';
import { ScanValidationResult } from '../types/attendance';
import { apiRequest } from '../repositories/api/apiClient';
import { TicketTier } from '../types/attendance';

interface PaginatedAttendance {
  data: AttendanceRecord[];
  total: number;
}

interface CheckinApiResult {
  success: boolean;
  status: string;
  message: string;
  checkinId?: string;
  verificationCode?: string;
  eventColor?: string;
  scannedAt?: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    membershipTier?: string;
  };
  ticket?: {
    tagName: string;
    tierName: string | null;
    remainingBalance: number;
  };
  suggestedGate?: string;
}

const VALID_TIERS: TicketTier[] = ['GENERAL', 'VIP', 'VVIP', 'CREW', 'SPEAKER'];

function normalizeTier(value?: string | null): TicketTier {
  const normalized = value?.trim().toUpperCase();
  return VALID_TIERS.find((tier) => tier === normalized) ?? 'GENERAL';
}

function mapScanResult(result: CheckinApiResult): ScanValidationResult {
  const mappedStatus: ScanValidationResult['status'] =
    result.status === 'SUCCESS'
      ? 'ALLOWED'
      : result.status === 'WRONG_GATE'
        ? 'WRONG_GATE'
        : 'DENIED';

  const tier = normalizeTier(result.user?.membershipTier ?? result.ticket?.tierName);

  return {
    status: mappedStatus,
    message: result.message,
    suggestedGate: result.suggestedGate,
    member: result.user
      ? {
          id: result.user.id,
          name: result.user.fullName,
          tier,
        }
      : undefined,
  };
}

export const ApiAttendanceService = {
  validateGateEntry: async (
    qrString: string,
    eventId: string,
    gateId?: string,
  ): Promise<ScanValidationResult> => {
    const result = await apiRequest<CheckinApiResult>('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrString, eventId, gateId }),
    });
    return mapScanResult(result);
  },

  getAttendance: async (eventId?: string): Promise<AttendanceRecord[]> => {
    const params = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    const response = await apiRequest<PaginatedAttendance>(`/checkin${params}`);
    return response.data;
  },

  recordAttendance: async (
    member: Member,
    event: Event,
    method: 'SELF_SCAN' | 'ADMIN_OVERRIDE' | 'LINK_CLICKED',
  ): Promise<AttendanceRecord> => {
    const apiMethod = method === 'LINK_CLICKED' ? 'SELF_SCAN' : method;
    const result = await apiRequest<CheckinApiResult>('/checkin/manual', {
      method: 'POST',
      body: JSON.stringify({
        memberId: member.id,
        eventId: event.id,
        method: apiMethod,
      }),
    });
    return {
      id: result.checkinId || `ATT-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      scannedAt: result.scannedAt || new Date().toISOString(),
      method,
      verificationCode: result.verificationCode || result.checkinId || '',
      eventColor: result.eventColor || '#4F46E5',
      status: result.success ? 'SUCCESS' : 'INVALID',
      ticketTier: result.ticket?.tierName ?? result.user?.membershipTier ?? 'GENERAL',
    };
  },
};
