'use client';

import { useEffect, useState } from 'react';
import { handleChunkLoadFailure, isChunkLoadError } from '@/lib/chunkLoadRecovery';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const chunkFailure = isChunkLoadError(error);
  const [autoReloadBlocked, setAutoReloadBlocked] = useState(false);

  useEffect(() => {
    if (!chunkFailure) return;

    const result = handleChunkLoadFailure(error, {
      onBlocked: () => setAutoReloadBlocked(true),
    });

    if (result === 'blocked') {
      setAutoReloadBlocked(true);
    }
  }, [chunkFailure, error]);

  if (chunkFailure && !autoReloadBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Loading latest version</h1>
          <p className="mt-2 text-sm text-slate-500">The app was updated. Refreshing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          {chunkFailure ? 'Could not load the latest version' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {chunkFailure
            ? 'Please hard-refresh the page to load the newest build.'
            : 'An unexpected error occurred. You can try again or return home.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh page
          </button>
          {!chunkFailure ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          ) : null}
          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
