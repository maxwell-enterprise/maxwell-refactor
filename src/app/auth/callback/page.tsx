'use client';

import { useEffect, useState } from 'react';
import { setWorkspaceToken } from '../../../lib/workspaceAuthToken';
import { consumeOAuthReturnSearch, consumeOAuthReturnPath } from '../../../lib/postAuthNavigation';
import { workspaceApiUrl } from '../../../lib/workspaceApi';
import { sanitizeInternalReturnPath } from '../../../lib/safeReturnPath';

const MOBILE_APP_SCHEME = 'maxwellleadership';

/** B1: deep link carries one-time code only — never workspace JWT. */
function buildMobileAppDeepLink(loginCode: string): string {
  return `${MOBILE_APP_SCHEME}://auth/callback?code=${encodeURIComponent(loginCode)}`;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await res.json()) as { message?: string | string[] };
    if (typeof payload?.message === 'string') return payload.message;
    if (Array.isArray(payload?.message) && payload.message[0]) {
      return String(payload.message[0]);
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

async function exchangeLoginCode(code: string): Promise<string> {
  const res = await fetch(workspaceApiUrl('/auth/login-code/exchange'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'login_code_exchange_failed'));
  }
  const payload = (await res.json()) as { token?: string };
  if (typeof payload.token !== 'string' || !payload.token.trim()) {
    throw new Error('login_code_exchange_missing_token');
  }
  return payload.token.trim();
}

async function mintLoginCodeFromJwt(workspaceToken: string): Promise<string> {
  const res = await fetch(workspaceApiUrl('/auth/login-code'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workspaceToken}`,
    },
    body: JSON.stringify({ token: workspaceToken }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, 'login_code_mint_failed'));
  }
  const payload = (await res.json()) as { code?: string };
  if (typeof payload.code !== 'string' || !payload.code.trim()) {
    throw new Error('login_code_mint_missing_code');
  }
  return payload.code.trim();
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

    // B1 preferred: opaque one-time code from Nest redirect
    const handoffCode =
      getFirst(queryParams, ['code']) || getFirst(hashParams, ['code']);

    // Legacy / Supabase: long-lived token may still appear (hash access_token, old clients)
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
    }, 8000);

    const fail = (message: string) => {
      window.clearTimeout(watchdog);
      window.location.replace(`/?auth_error=${encodeURIComponent(message)}`);
    };

    const goToWebDashboard = (workspaceToken: string) => {
      setWorkspaceToken(workspaceToken);
      window.clearTimeout(watchdog);
      const returnTo = sanitizeInternalReturnPath(queryParams.get('returnTo'));
      const oauthPath = consumeOAuthReturnPath();
      if (returnTo) {
        window.location.replace(returnTo);
        return;
      }
      if (oauthPath) {
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

    /** After we hold workspace JWT only in memory, open app via one-time code. */
    const finalize = async (workspaceToken: string) => {
      if (isMobileClient) {
        try {
          const loginCode = await mintLoginCodeFromJwt(workspaceToken);
          setWorkspaceToken(workspaceToken);
          window.clearTimeout(watchdog);
          const deepLink = buildMobileAppDeepLink(loginCode);
          setMobileHandoff({ token: workspaceToken, deepLink });
          window.location.href = deepLink;
        } catch (e) {
          fail(e instanceof Error ? e.message : 'mobile_handoff_failed');
        }
        return;
      }
      goToWebDashboard(workspaceToken);
    };

    if (handoffCode) {
      void (async () => {
        try {
          const workspaceToken = await exchangeLoginCode(handoffCode);
          await finalize(workspaceToken);
        } catch (e) {
          fail(e instanceof Error ? e.message : 'login_code_exchange_failed');
        }
      })();
      return;
    }

    if (token) {
      const provider = queryParams.get('provider') || hashParams.get('provider');
      const shouldExchangeViaSupabase =
        provider === 'supabase' || hashParams.has('refresh_token');
      if (!shouldExchangeViaSupabase) {
        // Legacy query JWT path — still complete session, strip from URL via replace navigation.
        void finalize(token);
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
            fail(await readErrorMessage(res, 'supabase_exchange_failed'));
            return;
          }
          const payload = (await res.json()) as { token?: string };
          if (typeof payload.token !== 'string' || !payload.token.trim()) {
            fail('supabase_exchange_missing_token');
            return;
          }
          await finalize(payload.token.trim());
        } catch {
          fail('supabase_exchange_network');
        }
      })();
      return;
    }
    if (error) {
      fail(error);
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
