const STORAGE_KEY = 'maxwell_workspace_jwt';
const TOKEN_CHANGED_EVENT = 'maxwell:workspace-token-changed';

export function getWorkspaceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setWorkspaceToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, token);
  }
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function getWorkspaceTokenChangedEventName(): string {
  return TOKEN_CHANGED_EVENT;
}
