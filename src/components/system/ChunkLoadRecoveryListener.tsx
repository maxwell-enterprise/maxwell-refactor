'use client';

import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { handleChunkLoadFailure, isChunkLoadError } from '@/lib/chunkLoadRecovery';

/**
 * Catches stale webpack chunk failures (post-deploy) and reloads once per cooldown window.
 */
export default function ChunkLoadRecoveryListener() {
  const { showToast } = useToast();

  useEffect(() => {
    const recover = (error: unknown) => {
      handleChunkLoadFailure(error, {
        onBeforeReload: () => {
          showToast('App updated. Refreshing...', 'info');
        },
        onBlocked: () => {
          showToast(
            'Could not load the latest version. Please refresh the page (Ctrl+Shift+R).',
            'error',
          );
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      recover(event.reason);
    };

    const onWindowError = (event: ErrorEvent) => {
      const candidate = event.error ?? event.message;
      if (!isChunkLoadError(candidate)) return;
      recover(candidate);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, [showToast]);

  return null;
}
