import { useEffect, useRef } from 'react';
import { getNestRealtimeSocket } from '../lib/nestRealtimeClient';
import { VOUCHER_BROADCAST_EVENT } from '../constants/voucherRealtime';

/**
 * Voucher live refresh via Nest Socket.IO + polling fallback.
 * (Supabase postgres_changes / Broadcast removed for v2.)
 */
export function useVoucherRealtime(
  enabled: boolean,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const pollMs = 5_000;
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      onRefreshRef.current();
    };

    const intervalId = setInterval(tick, pollMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') onRefreshRef.current();
    };
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(intervalId);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getNestRealtimeSocket();
    const onEvent = () => onRefreshRef.current();
    socket.on(VOUCHER_BROADCAST_EVENT, onEvent);
    socket.on('connect', onEvent);

    return () => {
      socket.off(VOUCHER_BROADCAST_EVENT, onEvent);
      socket.off('connect', onEvent);
    };
  }, [enabled]);
}
