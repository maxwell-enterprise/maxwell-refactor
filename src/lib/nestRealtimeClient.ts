import { io, type Socket } from 'socket.io-client';
import { APP_CONFIG } from './config';
import { getWorkspaceToken } from './workspaceAuthToken';

let shared: Socket | null = null;

/** Nest origin without `/fe` suffix (Socket.IO mounts on the HTTP server root). */
export function nestRealtimeOrigin(): string {
  const base = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  return base.replace(/\/fe$/i, '') || 'http://127.0.0.1:3002';
}

/**
 * Shared Socket.IO client for Nest realtime hubs.
 * Replaces Supabase Realtime Broadcast subscriptions.
 */
export function getNestRealtimeSocket(): Socket {
  if (shared) {
    const token = getWorkspaceToken();
    if (token) {
      shared.auth = { ...(shared.auth || {}), token };
    }
    if (!shared.connected) {
      shared.connect();
    }
    return shared;
  }

  const token = getWorkspaceToken();
  shared = io(nestRealtimeOrigin(), {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    auth: token ? { token } : {},
  });

  shared.on('connect', () => {
    shared?.emit('subscribe', {
      hubs: [
        'campaign_metrics_hub',
        'voucher_hub',
        'account_deletion_hub',
      ],
    });
  });

  return shared;
}

export function disconnectNestRealtimeSocket(): void {
  if (shared) {
    shared.removeAllListeners();
    shared.disconnect();
    shared = null;
  }
}
