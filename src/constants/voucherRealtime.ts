/**
 * Must match `server-maxwell` `voucher-realtime.constants.ts`.
 * Clients subscribe with the **anon** key; Nest sends with **service role** only.
 */
export const VOUCHER_BROADCAST_CHANNEL = 'voucher_hub';
export const VOUCHER_BROADCAST_EVENT = 'voucher_updated';
