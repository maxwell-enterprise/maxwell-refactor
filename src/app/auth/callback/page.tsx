'use client';

import { useEffect, useState } from 'react';
import { setWorkspaceToken } from '../../../lib/workspaceAuthToken';
import { consumeOAuthReturnSearch, consumeOAuthReturnPath } from '../../../lib/postAuthNavigation';
import { workspaceApiUrl } from '../../../lib/workspaceApi';

const MOBILE_APP_SCHEME = 'maxwellleadership';

function buildMobileAppDeepLink(workspaceToken: string): string {
  return `${MOBILE_APP_SCHEME}://auth/callback?token=${encodeURIComponent(workspaceToken)}`;
}

export default function AuthCallbackPage() {
  const [mobileHandoff, setMobileHandoff] = useState<{
    token: string;
    deepLink: string;
  } | null>(null);

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

    const isMobileClient = queryParams.get('client') === 'mobile';

    const tokenKeys = ['token', 'tokenKey', 'tokenkey', 'access_token'];
    const token = getFirst(hashParams, tokenKeys) || getFirst(queryParams, tokenKeys);

    const error =
      hashParams.get('error') ||
      queryParams.get('error') ||
      queryParams.get('auth_error');

    const watchdog = window.setTimeout(() => {
      // Mobile handoff keeps this page as a fallback UI; don't bounce away.
      if (isMobileClient) return;
      window.location.replace('/?auth_error=callback_timeout');
    }, 5000);

    const goToWebDashboard = (workspaceToken: string) => {
      setWorkspaceToken(workspaceToken);
      window.clearTimeout(watchdog);
      const returnTo = queryParams.get('returnTo')?.trim();
      const oauthPath = consumeOAuthReturnPath();
      if (returnTo?.startsWith('/')) {
        window.location.replace(returnTo);
        return;
      }
      if (oauthPath.startsWith('/')) {
        window.location.replace(oauthPath);
        return;
      }
      const resume = consumeOAuthReturnSearch();
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

    /** Default web path — unchanged when client is not mobile. */
    const finalize = (workspaceToken: string) => {
      if (isMobileClient) {
        setWorkspaceToken(workspaceToken);
        window.clearTimeout(watchdog);
        const deepLink = buildMobileAppDeepLink(workspaceToken);
        setMobileHandoff({ token: workspaceToken, deepLink });
        // Prefer opening the installed app; keep this page as fallback.
        window.location.href = deepLink;
        return;
      }
      goToWebDashboard(workspaceToken);
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

  if (mobileHandoff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-600">
        <p className="text-base font-semibold text-slate-800">Opening Maxwell app…</p>
        <p className="max-w-sm text-sm">
          If the app did not open automatically, tap the button below. You can also
          continue in the browser.
        </p>
        <a
          href={mobileHandoff.deepLink}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
        >
          Open Maxwell app
        </a>
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 underline"
          onClick={() => {
            setWorkspaceToken(mobileHandoff.token);
            window.location.replace('/dashboard');
          }}
        >
          Continue on web instead
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      Signing you in…
    </div>
  );
}
