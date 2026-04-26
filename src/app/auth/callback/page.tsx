'use client';

import { useEffect } from 'react';
import { setWorkspaceToken } from '../../../lib/workspaceAuthToken';
import { consumeOAuthReturnSearch } from '../../../lib/postAuthNavigation';
import { workspaceApiUrl } from '../../../lib/workspaceApi';

export default function AuthCallbackPage() {
  useEffect(() => {
    const getFirst = (params: URLSearchParams, keys: string[]): string | null => {
      for (const key of keys) {
        const value = params.get(key);
        if (value) return value;
      }
      return null;
    };

    const hash =
      typeof window !== 'undefined'
        ? window.location.hash.replace(/^#/, '')
        : '';
    const hashParams = new URLSearchParams(hash);
    const queryParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams('');

    const tokenKeys = ['token', 'tokenKey', 'tokenkey', 'access_token'];
    const token = getFirst(hashParams, tokenKeys) || getFirst(queryParams, tokenKeys);

    const error =
      hashParams.get('error') ||
      queryParams.get('error') ||
      queryParams.get('auth_error');

    const watchdog = window.setTimeout(() => {
      window.location.replace('/?auth_error=callback_timeout');
    }, 5000);

    const finalize = (workspaceToken: string) => {
      setWorkspaceToken(workspaceToken);
      window.clearTimeout(watchdog);
      const resume =
        queryParams.get('returnTo') || consumeOAuthReturnSearch();
      const qs = resume.startsWith('?')
        ? resume.slice(1)
        : resume.startsWith('&')
          ? resume
          : resume;
      const params = new URLSearchParams(qs || undefined);
      const hasProduct = Boolean(
        (params.get('product') || params.get('productId') || '').trim(),
      );
      if (hasProduct) {
        if (!params.get('view')) params.set('view', 'store');
        if (!params.get('checkout') && !params.get('autocheckout')) {
          params.set('checkout', '1');
        }
      }
      const search = params.toString();
      window.location.replace(`/dashboard${search ? `?${search}` : ''}`);
    };

    if (token) {
      const provider = queryParams.get('provider') || hashParams.get('provider');
      const shouldExchangeViaSupabase =
        provider === 'supabase' || hashParams.has('refresh_token');
      if (!shouldExchangeViaSupabase) {
        finalize(token);
        return;
      }
      void (async () => {
        try {
          const res = await fetch(workspaceApiUrl('/auth/supabase/exchange'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ accessToken: token }),
          });
          if (!res.ok) {
            let message = 'supabase_exchange_failed';
            try {
              const payload = (await res.json()) as { message?: string | string[] };
              if (typeof payload?.message === 'string') message = payload.message;
              else if (Array.isArray(payload?.message) && payload.message[0]) {
                message = String(payload.message[0]);
              }
            } catch {
              /* ignore */
            }
            window.clearTimeout(watchdog);
            window.location.replace(`/?auth_error=${encodeURIComponent(message)}`);
            return;
          }
          const payload = (await res.json()) as { token?: string };
          if (typeof payload.token !== 'string' || !payload.token.trim()) {
            window.clearTimeout(watchdog);
            window.location.replace('/?auth_error=supabase_exchange_missing_token');
            return;
          }
          finalize(payload.token.trim());
        } catch {
          window.clearTimeout(watchdog);
          window.location.replace('/?auth_error=supabase_exchange_network');
        }
      })();
      return;
    }
    if (error) {
      window.clearTimeout(watchdog);
      window.location.replace(`/?auth_error=${encodeURIComponent(error)}`);
      return;
    }
    // Fallback: never stay forever on callback screen.
    window.clearTimeout(watchdog);
    window.location.replace('/');
  }, []);

  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-50 text-slate-600'>
      Signing you in…
    </div>
  );
}
