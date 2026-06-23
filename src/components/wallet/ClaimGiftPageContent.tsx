'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle,
  Gift,
  Key,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EntitlementService } from '@/services/entitlementService';
import { useToast } from '@/context/ToastContext';
import { stashOAuthReturnPath } from '@/lib/postAuthNavigation';
import { ViewState } from '@/types/index';

type GiftPreview = {
  status: 'PENDING' | 'CLAIMED' | 'REVOKED' | 'EXPIRED';
  sourceUserName: string;
  itemName: string;
  recipientName?: string | null;
  expiresAt?: string | null;
};

const previewErrorMessage = (preview: GiftPreview | null): string => {
  if (!preview) return 'Invalid gift link.';
  if (preview.status === 'CLAIMED') return 'This gift link has already been claimed.';
  if (preview.status === 'REVOKED') return 'This gift link has been revoked by the sender.';
  if (preview.status === 'EXPIRED') return 'This gift link has expired.';
  return '';
};

export default function ClaimGiftPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token')?.trim() ?? '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');

  const returnPath = useMemo(
    () => (token ? `/claim?token=${encodeURIComponent(token)}` : '/claim'),
    [token],
  );

  const loadPreview = useCallback(async () => {
    if (!token) {
      setLoadError('Gift link is missing a token.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const data = await EntitlementService.previewGiftByToken(token);
      setPreview(data);
      const blocked = previewErrorMessage(data);
      if (blocked) {
        setLoadError(blocked);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load gift details.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const handlePrimaryAction = async () => {
    if (!token || !preview || preview.status !== 'PENDING') return;

    if (!isAuthenticated) {
      stashOAuthReturnPath(returnPath);
      const loginUrl = `/?login=1&returnTo=${encodeURIComponent(returnPath)}`;
      router.push(loginUrl);
      return;
    }

    setIsClaiming(true);
    setClaimError('');
    try {
      await EntitlementService.claimTicketGift(token);
      setSuccess(true);
      showToast('Ticket claimed successfully.', 'success');
    } catch (error) {
      setClaimError(
        error instanceof Error ? error.message : 'Failed to claim ticket.',
      );
    } finally {
      setIsClaiming(false);
    }
  };

  if (!token) {
    return (
      <CenteredShell>
        <StatusCard tone="error" title="Invalid link" message="This gift URL is incomplete." />
      </CenteredShell>
    );
  }

  if (loading || authLoading) {
    return (
      <CenteredShell>
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
          <p className="text-sm font-bold uppercase tracking-widest">Validating gift link...</p>
        </div>
      </CenteredShell>
    );
  }

  if (loadError && !preview) {
    return (
      <CenteredShell>
        <StatusCard
          tone="error"
          title="Unavailable"
          message={loadError}
          actionLabel="Go to home"
          onAction={() => router.push('/')}
        />
      </CenteredShell>
    );
  }

  if (success && preview) {
    return (
      <CenteredShell>
        <div className="w-full max-w-md rounded-3xl border-t-4 border-green-500 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-100 bg-green-50 text-green-500 shadow-sm">
            <CheckCircle size={40} />
          </div>
          <h2 className="mb-2 text-2xl font-black text-slate-900">Ticket claimed!</h2>
          <p className="mb-6 text-sm font-medium text-slate-500">
            You claimed <b>{preview.itemName}</b> from {preview.sourceUserName}. It is now in your
            wallet.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard?view=${encodeURIComponent(ViewState.WALLET)}`)
            }
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            Open my wallet
          </button>
        </div>
      </CenteredShell>
    );
  }

  const blockedMessage = preview ? previewErrorMessage(preview) : loadError;

  if (blockedMessage) {
    return (
      <CenteredShell>
        <StatusCard
          tone="error"
          title="Unavailable"
          message={blockedMessage}
          actionLabel="Go to home"
          onAction={() => router.push('/')}
        />
      </CenteredShell>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <CenteredShell>
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-100/50 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-24 w-24 rotate-3 items-center justify-center rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-xl shadow-indigo-200">
          <Gift size={48} />
        </div>

        <h1 className="mb-2 text-3xl font-black leading-tight text-slate-900">
          You received a gift!
        </h1>
        <p className="mb-8 font-medium text-slate-500">
          <b>{preview.sourceUserName}</b> sent you a special ticket.
        </p>

        <div className="mb-8 flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50 p-5 text-left">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              <Key size={10} />
              Ticket details
            </div>
            <div className="font-bold text-slate-900">{preview.itemName}</div>
            {preview.recipientName ? (
              <div className="mt-1 text-xs font-medium text-slate-500">
                Reserved for: {preview.recipientName}
              </div>
            ) : null}
          </div>
        </div>

        {claimError ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {claimError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handlePrimaryAction()}
          disabled={isClaiming}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 py-4 font-black text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50"
        >
          {isClaiming ? (
            <Loader2 size={20} className="animate-spin text-white/70" />
          ) : (
            <>
              Claim
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-4 w-full py-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
        >
          Decline
        </button>
      </div>

      <p className="relative z-10 mt-8 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
        Maxwell Leadership Enterprise
      </p>
    </CenteredShell>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4 font-sans">
      <div className="absolute right-[-5%] top-[-10%] h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] h-80 w-80 rounded-full bg-purple-100/50 blur-3xl" />
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </div>
  );
}

function StatusCard({
  tone,
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone: 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className={`w-full max-w-md rounded-3xl border-t-4 bg-white p-8 text-center shadow-xl ${
        tone === 'error' ? 'border-red-500' : ''
      }`}
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <X size={32} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-slate-900">{title}</h2>
      <p className="mb-8 text-sm text-slate-500">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="w-full rounded-xl bg-slate-100 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
