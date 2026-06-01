import { AttendanceRecord } from '../types/attendance';
import { Member, Event } from '../types/index';
import { ScanValidationResult } from '../types/attendance';
import { apiRequest } from '../repositories/api/apiClient';
import { TicketTier } from '../types/attendance';
import { publishAttendanceUpdated } from './attendanceRealtime';

interface PaginatedAttendance {
  data: AttendanceRecord[];
  total: number;
}

interface ScannerDeviceApiResult {
  id: string;
  deviceId: string;
  deviceName: string;
  eventId?: string;
  gateId?: string;
  isActive: boolean;
  lastSyncAt?: string | null;
  registeredAt: string;
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

interface OfflineSyncApiResult {
  processed: number;
  failed: number;
  results: CheckinApiResult[];
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
    options?: { deviceId?: string },
  ): Promise<ScanValidationResult> => {
    const result = await apiRequest<CheckinApiResult>('/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({
        qrString,
        eventId,
        gateId,
        deviceId: options?.deviceId,
      }),
    });
    if (result.success) {
      publishAttendanceUpdated({
        eventId,
        method: 'GATE_SCAN',
        status: 'SUCCESS',
        memberId: result.user?.id,
        gateId,
        scannedAt: result.scannedAt,
      });
    }
    return mapScanResult(result);
  },

  registerScannerDevice: async (input: {
    deviceId: string;
    deviceName: string;
    eventId: string;
    gateId: string;
  }): Promise<ScannerDeviceApiResult> => {
    return apiRequest<ScannerDeviceApiResult>('/checkin/devices', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  syncOfflineCheckins: async (input: {
    deviceId: string;
    items: Array<{
      offlineId: string;
      qrString: string;
      eventId: string;
      gateId?: string;
      scannedAt: string;
    }>;
  }): Promise<OfflineSyncApiResult> => {
    return apiRequest<OfflineSyncApiResult>('/checkin/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: input.deviceId,
        items: input.items.map((item) => ({
          offlineId: item.offlineId,
          actionType: 'CHECKIN',
          qrString: item.qrString,
          eventId: item.eventId,
          gateId: item.gateId,
          timestamp: item.scannedAt,
        })),
      }),
    });
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
    options?: { venueQr?: string },
  ): Promise<AttendanceRecord> => {
    const targetPath = method === 'ADMIN_OVERRIDE' ? '/checkin/manual' : '/checkin/self';
    const payload =
      method === 'ADMIN_OVERRIDE'
        ? {
            memberId: member.id,
            eventId: event.id,
            method,
          }
        : {
            eventId: event.id,
            method,
            venueQr: options?.venueQr,
          };

    const result = await apiRequest<CheckinApiResult>(targetPath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      const message =
        result.status === 'WRONG_GATE' || result.status === 'WRONG_EVENT' || result.status === 'BLOCKED'
          ? `ACCESS_DENIED: ${result.message}`
          : result.message;
      throw new Error(message);
    }

    publishAttendanceUpdated({
      eventId: event.id,
      method,
      status: 'SUCCESS',
      memberId: member.id,
      scannedAt: result.scannedAt,
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
