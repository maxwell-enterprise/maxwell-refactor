import { useEffect, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  ACCOUNT_DELETION_BROADCAST_CHANNEL,
  ACCOUNT_DELETION_BROADCAST_EVENT,
} from '../constants/accountDeletionRealtime';

/**
 * Live updates for the account-deletion queue (Super Admin) and `/me/account/deletion-status`
 * (requester). Primary path: Supabase Realtime **Broadcast** (WebSocket). Fallback: polling
 * when Realtime is unavailable or Supabase is not configured.
 *
 * `onRefresh` is kept in a ref so parent re-renders (new inline callbacks) do not tear down
 * the interval / Supabase channel every frame — that used to spam duplicate network requests.
 */
export function useAccountDeletionRealtime(
  enabled: boolean,
  onRefresh: () => void,
): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const pollMs = isSupabaseConfigured() ? 25_000 : 8000;
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
    if (!enabled || !isSupabaseConfigured() || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(ACCOUNT_DELETION_BROADCAST_CHANNEL)
      .on(
        'broadcast',
        { event: ACCOUNT_DELETION_BROADCAST_EVENT },
        () => {
          onRefreshRef.current();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled]);
}
