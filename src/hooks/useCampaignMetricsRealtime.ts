import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Campaign } from '../types/index';
import { CampaignService } from '../services/campaignService';
import { getNestRealtimeSocket } from '../lib/nestRealtimeClient';
import {
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
 * Live campaign metrics via Nest Socket.IO (+ polling fallback).
 */
export function useCampaignMetricsRealtime(
  enabled: boolean,
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>,
): void {
  useEffect(() => {
    if (!enabled) return;

    const pollMs = 8_000;
    let cancelled = false;
    const refresh = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const data = await CampaignService.getCampaigns();
        if (!cancelled) setCampaigns(data);
      } catch {
        /* silent */
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
    if (!enabled) return;

    const socket = getNestRealtimeSocket();
    const onMetrics = (p: MetricsBroadcastPayload) => {
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
    };

    socket.on(CAMPAIGN_METRICS_BROADCAST_EVENT, onMetrics);
    const onConnect = () => {
      void CampaignService.getCampaigns()
        .then((data) => setCampaigns(data))
        .catch(() => undefined);
    };
    socket.on('connect', onConnect);

    return () => {
      socket.off(CAMPAIGN_METRICS_BROADCAST_EVENT, onMetrics);
      socket.off('connect', onConnect);
    };
  }, [enabled, setCampaigns]);
}
