import { workspaceFetch } from './workspaceApi';

/** Mark an RBAC inbox row read (Nest JWT). */
export async function markRbacInboxRead(inboxId: string): Promise<boolean> {
  const res = await workspaceFetch(
    `/me/inbox/${encodeURIComponent(inboxId)}/read`,
    { method: 'PATCH' },
  );
  return res.ok;
}
