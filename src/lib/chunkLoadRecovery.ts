const RELOAD_GUARD_KEY = 'maxwell:chunk-auto-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;
const RELOAD_DELAY_MS = 450;

let reloadScheduled = false;

export type ChunkRecoveryResult = 'reloading' | 'blocked' | 'skipped';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error ?? '');
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

/** True when webpack/Next failed to fetch a stale code-split chunk (typical after deploy). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  const name = errorName(error);
  const message = errorMessage(error);

  if (name === 'ChunkLoadError') return true;
  if (/loading chunk \d+ failed/i.test(message) && /_next\/static\/chunks/i.test(message)) {
    return true;
  }
  if (/failed to fetch dynamically imported module/i.test(message)) {
    return true;
  }

  return false;
}

export type ChunkRecoveryOptions = {
  onBeforeReload?: () => void;
  onBlocked?: () => void;
};

/**
 * Schedule a single guarded full-page reload so the browser picks up the latest build.
 * Returns `blocked` when auto-reload already ran recently (prevents reload loops).
 */
export function handleChunkLoadFailure(
  error: unknown,
  options?: ChunkRecoveryOptions,
): ChunkRecoveryResult {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) {
    return 'skipped';
  }

  if (reloadScheduled) {
    return 'reloading';
  }

  const now = Date.now();
  const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
  if (Number.isFinite(lastReloadAt) && now - lastReloadAt < RELOAD_COOLDOWN_MS) {
    options?.onBlocked?.();
    return 'blocked';
  }

  reloadScheduled = true;
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  options?.onBeforeReload?.();

  window.setTimeout(() => {
    window.location.reload();
  }, RELOAD_DELAY_MS);

  return 'reloading';
}

/** Wrap dynamic import() so dashboard menu chunks trigger recovery before React crashes. */
export function withChunkLoadRecovery<T>(importer: () => Promise<T>): () => Promise<T> {
  return () =>
    importer().catch((error: unknown) => {
      handleChunkLoadFailure(error);
      throw error;
    });
}
