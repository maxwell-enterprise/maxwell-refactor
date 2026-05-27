import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  VOUCHER_BROADCAST_CHANNEL,
  VOUCHER_BROADCAST_EVENT,
} from '../constants/voucherRealtime';

/**
 * Voucher live refresh, three layers (in order of preference):
 *
 *   1. **Supabase `postgres_changes`** on `discounts` + `discount_redemption_logs`.
 *      Triggered by ANY path that mutates those rows — Nest service, DB trigger from migration 033,
 *      manual SQL, admin tools. This is the source of truth for "voucher was used somewhere".
 *
 *   2. **Broadcast channel `voucher_hub`** (legacy). Kept so existing Nest emits still flush refreshes
 *      while we transition. Will be safe to retire once trigger + postgres_changes are deployed
 *      everywhere.
 *
 *   3. **Polling fallback** (2-4s) for local/dev envs without Supabase keys.
 *
 * Latency budget under happy path: ~100-300ms (Postgres → Realtime → WebSocket).
 */
export function useVoucherRealtime(
  enabled: boolean,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Polling fallback (always on; cheap; serves envs without Supabase Realtime).
  useEffect(() => {
    if (!enabled) return;

    const pollMs = isSupabaseConfigured() ? 8000 : 2000;
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

  // Primary: postgres_changes on discounts + redemption logs.
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return;

    const client = supabase;
    const channel = client
      .channel('voucher_postgres_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'discounts' },
        () => onRefreshRef.current(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'discount_redemption_logs' },
        () => onRefreshRef.current(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onRefreshRef.current();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled]);

  // Legacy broadcast channel (still emitted by Nest VoucherBroadcastService).
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(VOUCHER_BROADCAST_CHANNEL)
      .on('broadcast', { event: VOUCHER_BROADCAST_EVENT }, () => {
        onRefreshRef.current();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled]);
}
