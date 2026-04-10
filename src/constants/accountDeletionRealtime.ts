/**
 * Must match `server-maxwell` `account-deletion-broadcast.constants.ts`.
 * Clients subscribe with the Supabase **anon** key; Nest sends with the service role only.
 */
export const ACCOUNT_DELETION_BROADCAST_CHANNEL = 'account_deletion_hub';
export const ACCOUNT_DELETION_BROADCAST_EVENT = 'queue_changed';
