/**
 * Must match `server-maxwell` `campaign-metrics.constants.ts`.
 * Dashboard subscribes with the **anon** key; Nest sends with **service role** only.
 */
export const CAMPAIGN_METRICS_BROADCAST_CHANNEL = 'campaign_metrics_hub';
export const CAMPAIGN_METRICS_BROADCAST_EVENT = 'metrics_updated';
