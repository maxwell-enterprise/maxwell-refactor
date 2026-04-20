import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Campaign } from '../types/index';
import { CampaignService } from '../services/campaignService';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  CAMPAIGN_METRICS_BROADCAST_CHANNEL,
  CAMPAIGN_METRICS_BROADCAST_EVENT,
} from '../constants/campaignRealtime';

type MetricsBroadcastPayload = {
  campaignId?: string;
  sourceCode?: string;
  clicks?: number;
  conversions?: number;
  revenue?: number;
};

/**
 * Live campaign metrics:
 * - **Primary:** Supabase Realtime **Broadcast** on `campaign_metrics_hub` (WebSocket).
 *   Nest emits with service role after atomic DB updates; clients use anon key only.
 * - **Fallback:** HTTP polling when Supabase is not configured (local API-only) or if
 *   Broadcast is unavailable — keeps dashboards usable without Realtime.
 *
 * We intentionally do **not** use postgres_changes as the main fan-out path; see
 * https://supabase.com/docs/guides/realtime/broadcast
 */
export function useCampaignMetricsRealtime(
  enabled: boolean,
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>,
): void {
  useEffect(() => {
    if (!enabled) return;

    const pollMs = isSupabaseConfigured() ? 12_000 : 3500;

    let cancelled = false;
    const refresh = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const data = await CampaignService.getCampaigns();
        if (!cancelled) setCampaigns(data);
      } catch {
        // Silent — same as previous background refresh
      }
    };

    const intervalId = setInterval(() => {
      void refresh();
    }, pollMs);

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    void refresh();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(intervalId);
    };
  }, [enabled, setCampaigns]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return;

    const client = supabase;
    const channel = client
      .channel(CAMPAIGN_METRICS_BROADCAST_CHANNEL)
      .on(
        'broadcast',
        { event: CAMPAIGN_METRICS_BROADCAST_EVENT },
        (msg: { payload?: MetricsBroadcastPayload }) => {
          const p = msg.payload;
          if (!p?.campaignId) return;
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === p.campaignId
                ? {
                    ...c,
                    clicks: Number(p.clicks ?? c.clicks),
                    conversions: Number(p.conversions ?? c.conversions),
                    revenue: Number(p.revenue ?? c.revenue),
                  }
                : c,
            ),
          );
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void (async () => {
            try {
              const data = await CampaignService.getCampaigns();
              setCampaigns(data);
            } catch {
              /* same as polling path */
            }
          })();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, setCampaigns]);
}
