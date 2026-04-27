import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  VOUCHER_BROADCAST_CHANNEL,
  VOUCHER_BROADCAST_EVENT,
} from '../constants/voucherRealtime';

/**
 * Voucher admin live refresh:
 * - Primary: Supabase Realtime Broadcast (WebSocket) from Nest after successful redemption.
 * - Fallback: short polling so local/API-only environments still update quickly enough.
 */
export function useVoucherRealtime(
  enabled: boolean,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const pollMs = isSupabaseConfigured() ? 4000 : 2000;
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
    if (!enabled || !isSupabaseConfigured() || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(VOUCHER_BROADCAST_CHANNEL)
      .on('broadcast', { event: VOUCHER_BROADCAST_EVENT }, () => {
        onRefreshRef.current();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onRefreshRef.current();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled]);
}
