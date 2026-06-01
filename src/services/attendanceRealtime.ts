export const ATTENDANCE_UPDATED_EVENT = 'maxwell-attendance-updated';

export type AttendanceRealtimePayload = {
  eventId: string;
  method: 'GATE_SCAN' | 'SELF_SCAN' | 'ADMIN_OVERRIDE' | 'LINK_CLICKED';
  status: 'SUCCESS';
  memberId?: string;
  gateId?: string;
  scannedAt?: string;
};

const CHANNEL_NAME = 'maxwell-attendance-events';

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

export function publishAttendanceUpdated(payload: AttendanceRealtimePayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AttendanceRealtimePayload>(ATTENDANCE_UPDATED_EVENT, { detail: payload }));
  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(payload);
  channel.close();
}

export function subscribeAttendanceUpdated(
  handler: (payload: AttendanceRealtimePayload) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onWindowEvent = (event: Event) => {
    const customEvent = event as CustomEvent<AttendanceRealtimePayload>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  window.addEventListener(ATTENDANCE_UPDATED_EVENT, onWindowEvent as EventListener);

  const channel = getChannel();
  if (!channel) {
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, onWindowEvent as EventListener);
    };
  }

  channel.onmessage = (event: MessageEvent<AttendanceRealtimePayload>) => {
    if (event.data) {
      handler(event.data);
    }
  };

  return () => {
    window.removeEventListener(ATTENDANCE_UPDATED_EVENT, onWindowEvent as EventListener);
    channel.close();
  };
}
