import { useEffect, useRef } from 'react';
import { getNestRealtimeSocket } from '../lib/nestRealtimeClient';
import { ACCOUNT_DELETION_BROADCAST_EVENT } from '../constants/accountDeletionRealtime';

/**
 * Account-deletion queue live updates via Nest Socket.IO + polling fallback.
 */
export function useAccountDeletionRealtime(
  enabled: boolean,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const pollMs = 12_000;
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      onRefreshRef.current();
    };
    const intervalId = setInterval(tick, pollMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') onRefreshRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    onRefreshRef.current();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(intervalId);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getNestRealtimeSocket();
    const onEvent = () => onRefreshRef.current();
    socket.on(ACCOUNT_DELETION_BROADCAST_EVENT, onEvent);
    socket.on('connect', onEvent);

    return () => {
      socket.off(ACCOUNT_DELETION_BROADCAST_EVENT, onEvent);
      socket.off('connect', onEvent);
    };
  }, [enabled]);
}
