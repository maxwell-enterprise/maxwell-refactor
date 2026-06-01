import { DevDatabase } from '../utils/shared/devDatabase';
import { DataUtils } from '../utils/dataUtils';

const OFFLINE_QUEUE_STORE = 'offline_checkin_queue';
const DEVICE_STORAGE_KEY = 'maxwell_gate_scanner_device_id';

export interface OfflineCheckinQueueItem {
  id: string;
  offlineId: string;
  qrString: string;
  eventId: string;
  gateId: string;
  deviceId: string;
  scannedAt: string;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  error?: string;
  syncedAt?: string;
}

export const AttendanceOfflineService = {
  getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') {
      return `gate-device-${DataUtils.generateID()}`;
    }

    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)?.trim();
    if (existing) {
      return existing;
    }

    const next = `gate-device-${DataUtils.generateID()}`;
    window.localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  },

  async enqueueScan(input: {
    qrString: string;
    eventId: string;
    gateId: string;
    deviceId: string;
    scannedAt?: string;
  }): Promise<OfflineCheckinQueueItem> {
    const item: OfflineCheckinQueueItem = {
      id: `offline-checkin-${DataUtils.generateID()}`,
      offlineId: `offline-${DataUtils.generateID()}`,
      qrString: input.qrString,
      eventId: input.eventId,
      gateId: input.gateId,
      deviceId: input.deviceId,
      scannedAt: input.scannedAt || new Date().toISOString(),
      status: 'PENDING_SYNC',
    };

    await DevDatabase.add(OFFLINE_QUEUE_STORE, item);
    return item;
  },

  async listPending(): Promise<OfflineCheckinQueueItem[]> {
    const all =
      await DevDatabase.getAll<OfflineCheckinQueueItem>(OFFLINE_QUEUE_STORE);
    return all
      .filter((item) => item.status === 'PENDING_SYNC' || item.status === 'FAILED')
      .sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
  },

  async markSynced(id: string): Promise<void> {
    const all =
      await DevDatabase.getAll<OfflineCheckinQueueItem>(OFFLINE_QUEUE_STORE);
    const item = all.find((entry) => entry.id === id);
    if (!item) return;
    await DevDatabase.add(OFFLINE_QUEUE_STORE, {
      ...item,
      status: 'SYNCED',
      syncedAt: new Date().toISOString(),
      error: undefined,
    });
  },

  async markFailed(id: string, error: string): Promise<void> {
    const all =
      await DevDatabase.getAll<OfflineCheckinQueueItem>(OFFLINE_QUEUE_STORE);
    const item = all.find((entry) => entry.id === id);
    if (!item) return;
    await DevDatabase.add(OFFLINE_QUEUE_STORE, {
      ...item,
      status: 'FAILED',
      error,
    });
  },
};
