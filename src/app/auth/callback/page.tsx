'use client';

import { useEffect } from 'react';
import { setWorkspaceToken } from '../../../lib/workspaceAuthToken';

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

    if (token) {
      setWorkspaceToken(token);
      window.clearTimeout(watchdog);
      window.location.replace('/dashboard');
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
